/**
 * Notification Preferences Service
 * 
 * Manages user notification preferences
 */

import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  ChannelPreferences,
  TypePreferences,
  TimingPreferences,
  FrequencyPreferences,
} from '@/lib/types/artisan-buddy-notifications';
import { redisClient } from './RedisClient';
import { firestoreRepository } from './FirestoreRepository';

export class NotificationPreferencesService {
  private static instance: NotificationPreferencesService;
  private readonly CACHE_TTL = 3600; // 1 hour

  private constructor() {}

  public static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance = new NotificationPreferencesService();
    }
    return NotificationPreferencesService.instance;
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Try cache first
      const cacheKey = `notification_preferences:${userId}`;
      const cached = await redisClient.getCachedJSON<NotificationPreferences>(cacheKey);

      if (cached) {
        return cached;
      }

      // Try Firestore
      const preferences = await this.loadFromFirestore(userId);

      if (preferences) {
        // Cache it
        await redisClient.cacheJSON(cacheKey, preferences, this.CACHE_TTL);
        return preferences;
      }

      // Return defaults
      return this.getDefaultPreferences(userId);
    } catch (error) {
      console.error('Error getting preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      
      const updated: NotificationPreferences = {
        ...current,
        ...updates,
        userId,
        updatedAt: new Date(),
      };

      // Save to Firestore
      await this.saveToFirestore(updated);

      // Update cache
      const cacheKey = `notification_preferences:${userId}`;
      await redisClient.cacheJSON(cacheKey, updated, this.CACHE_TTL);

      console.log(`Preferences updated for user ${userId}`);
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Update channel preferences
   */
  async updateChannelPreferences(
    userId: string,
    channels: Partial<ChannelPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      return await this.updatePreferences(userId, {
        channels: { ...current.channels, ...channels },
      });
    } catch (error) {
      console.error('Error updating channel preferences:', error);
      throw error;
    }
  }

  /**
   * Update type preferences
   */
  async updateTypePreferences(
    userId: string,
    types: Partial<TypePreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      return await this.updatePreferences(userId, {
        types: { ...current.types, ...types },
      });
    } catch (error) {
      console.error('Error updating type preferences:', error);
      throw error;
    }
  }

  /**
   * Update timing preferences
   */
  async updateTimingPreferences(
    userId: string,
    timing: Partial<TimingPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      return await this.updatePreferences(userId, {
        timing: { ...current.timing, ...timing },
      });
    } catch (error) {
      console.error('Error updating timing preferences:', error);
      throw error;
    }
  }

  /**
   * Update frequency preferences
   */
  async updateFrequencyPreferences(
    userId: string,
    frequency: Partial<FrequencyPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      return await this.updatePreferences(userId, {
        frequency: { ...current.frequency, ...frequency },
      });
    } catch (error) {
      console.error('Error updating frequency preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user should receive notification
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: keyof TypePreferences,
    channel: keyof ChannelPreferences
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      // Check if type is enabled
      if (!preferences.types[notificationType]) {
        return false;
      }

      // Check if channel is enabled
      if (!preferences.channels[channel]) {
        return false;
      }

      // Check quiet hours
      if (this.isQuietHours(preferences.timing)) {
        return false;
      }

      // Check frequency limits
      if (await this.exceedsFrequencyLimit(userId, preferences.frequency)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking if should receive notification:', error);
      return false;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(timing: TimingPreferences): boolean {
    const now = new Date();
    const hour = now.getHours();

    if (timing.quietHoursStart === undefined || timing.quietHoursEnd === undefined) {
      return false;
    }

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (timing.quietHoursStart > timing.quietHoursEnd) {
      return hour >= timing.quietHoursStart || hour < timing.quietHoursEnd;
    }

    // Handle same-day quiet hours (e.g., 13:00 to 15:00)
    return hour >= timing.quietHoursStart && hour < timing.quietHoursEnd;
  }

  /**
   * Check if frequency limit is exceeded
   */
  private async exceedsFrequencyLimit(
    userId: string,
    frequency: FrequencyPreferences
  ): Promise<boolean> {
    try {
      const now = new Date();
      const todayKey = `notification_count:${userId}:${now.toISOString().split('T')[0]}`;
      const weekKey = `notification_count:${userId}:week:${this.getWeekNumber(now)}`;

      const todayCount = await redisClient.getCachedJSON<number>(todayKey) || 0;
      const weekCount = await redisClient.getCachedJSON<number>(weekKey) || 0;

      return todayCount >= frequency.maxPerDay || weekCount >= frequency.maxPerWeek;
    } catch (error) {
      console.error('Error checking frequency limit:', error);
      return false;
    }
  }

  /**
   * Increment notification count
   */
  async incrementNotificationCount(userId: string): Promise<void> {
    try {
      const now = new Date();
      const todayKey = `notification_count:${userId}:${now.toISOString().split('T')[0]}`;
      const weekKey = `notification_count:${userId}:week:${this.getWeekNumber(now)}`;

      const todayCount = await redisClient.getCachedJSON<number>(todayKey) || 0;
      const weekCount = await redisClient.getCachedJSON<number>(weekKey) || 0;

      await redisClient.cacheJSON(todayKey, todayCount + 1, 86400); // 24 hours
      await redisClient.cacheJSON(weekKey, weekCount + 1, 604800); // 7 days
    } catch (error) {
      console.error('Error incrementing notification count:', error);
    }
  }

  /**
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      updatedAt: new Date(),
    };
  }

  /**
   * Load preferences from Firestore
   */
  private async loadFromFirestore(userId: string): Promise<NotificationPreferences | null> {
    try {
      // This would be implemented in FirestoreRepository
      // For now, return null to use defaults
      return null;
    } catch (error) {
      console.error('Error loading from Firestore:', error);
      return null;
    }
  }

  /**
   * Save preferences to Firestore
   */
  private async saveToFirestore(preferences: NotificationPreferences): Promise<void> {
    try {
      // This would be implemented in FirestoreRepository
      // For now, just log
      console.log('Saving preferences to Firestore:', preferences.userId);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaults = this.getDefaultPreferences(userId);
      await this.saveToFirestore(defaults);

      const cacheKey = `notification_preferences:${userId}`;
      await redisClient.deleteCached(cacheKey);

      return defaults;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }
}

export const notificationPreferencesService = NotificationPreferencesService.getInstance();
