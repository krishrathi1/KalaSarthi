/**
 * Notification Timing Optimizer
 * ML-powered delivery timing based on user patterns and deadline management
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { 
  SmartNotification,
  SCHEME_SAHAYAK_COLLECTIONS 
} from '../../types/scheme-sahayak';
import { db } from '../../config/scheme-sahayak-firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';

/**
 * User engagement pattern for timing optimization
 */
interface UserEngagementPattern {
  userId: string;
  hourlyEngagement: Record<number, number>; // hour -> engagement score
  dailyEngagement: Record<number, number>; // day of week -> engagement score
  averageResponseTime: number; // minutes
  preferredTimeWindow: [number, number]; // [start hour, end hour]
  lastUpdated: Date;
}

/**
 * Deadline reminder configuration
 */
interface DeadlineReminder {
  id: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  deadline: Date;
  reminders: {
    thirtyDays: boolean;
    sevenDays: boolean;
    oneDay: boolean;
  };
  sent: {
    thirtyDays?: Date;
    sevenDays?: Date;
    oneDay?: Date;
  };
  status: 'active' | 'completed' | 'cancelled';
}

/**
 * Notification consolidation group
 */
interface NotificationGroup {
  userId: string;
  type: string;
  notifications: SmartNotification[];
  consolidatedMessage: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor: Date;
}

/**
 * Notification Timing Optimizer Implementation
 */
export class NotificationTimingOptimizer {
  private readonly ENGAGEMENT_WINDOW_DAYS = 30;
  private readonly MIN_DATA_POINTS = 5;
  private readonly DEFAULT_OPTIMAL_HOUR = 10; // 10 AM
  private readonly DEFAULT_OPTIMAL_DAY = 2; // Tuesday

  /**
   * Calculate optimal delivery time for a user based on engagement patterns
   * Requirements: 4.1, 4.2
   */
  async calculateOptimalTime(userId: string): Promise<Date> {
    try {
      const pattern = await this.getUserEngagementPattern(userId);
      
      if (!pattern) {
        return this.getDefaultOptimalTime();
      }

      // Find hour with highest engagement
      const optimalHour = this.findOptimalHour(pattern.hourlyEngagement);
      
      // Find day with highest engagement
      const optimalDay = this.findOptimalDay(pattern.dailyEngagement);
      
      // Calculate next occurrence of optimal time
      const now = new Date();
      const nextOptimalTime = new Date();
      
      // Set to optimal hour
      nextOptimalTime.setHours(optimalHour, 0, 0, 0);
      
      // If optimal time has passed today, move to next day
      if (nextOptimalTime <= now) {
        nextOptimalTime.setDate(nextOptimalTime.getDate() + 1);
      }
      
      // Adjust to optimal day of week if needed
      const currentDay = nextOptimalTime.getDay();
      const daysUntilOptimal = (optimalDay - currentDay + 7) % 7;
      if (daysUntilOptimal > 0) {
        nextOptimalTime.setDate(nextOptimalTime.getDate() + daysUntilOptimal);
      }
      
      return nextOptimalTime;
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Calculate optimal time failed:', error);
      return this.getDefaultOptimalTime();
    }
  }

  /**
   * Schedule deadline reminders at 30, 7, and 1 day intervals
   * Requirements: 4.2
   */
  async scheduleDeadlineReminders(
    userId: string,
    schemeId: string,
    schemeName: string,
    deadline: Date
  ): Promise<string> {
    try {
      const reminderId = `reminder_${userId}_${schemeId}_${Date.now()}`;
      const now = new Date();
      
      // Calculate reminder dates
      const thirtyDaysBefore = new Date(deadline);
      thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);
      
      const sevenDaysBefore = new Date(deadline);
      sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
      
      const oneDayBefore = new Date(deadline);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      
      // Create reminder configuration
      const reminderConfig: DeadlineReminder = {
        id: reminderId,
        userId,
        schemeId,
        schemeName,
        deadline,
        reminders: {
          thirtyDays: thirtyDaysBefore > now,
          sevenDays: sevenDaysBefore > now,
          oneDay: oneDayBefore > now
        },
        sent: {},
        status: 'active'
      };
      
      // Store reminder configuration
      const reminderRef = doc(db, 'deadline_reminders', reminderId);
      await setDoc(reminderRef, {
        ...reminderConfig,
        deadline: Timestamp.fromDate(deadline),
        createdAt: Timestamp.now()
      });
      
      // Schedule individual reminders
      if (reminderConfig.reminders.thirtyDays) {
        await this.scheduleReminder(userId, schemeId, schemeName, thirtyDaysBefore, 30);
      }
      if (reminderConfig.reminders.sevenDays) {
        await this.scheduleReminder(userId, schemeId, schemeName, sevenDaysBefore, 7);
      }
      if (reminderConfig.reminders.oneDay) {
        await this.scheduleReminder(userId, schemeId, schemeName, oneDayBefore, 1);
      }
      
      console.log(`[NotificationTimingOptimizer] Deadline reminders scheduled for scheme ${schemeId}`);
      return reminderId;
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Schedule deadline reminders failed:', error);
      throw error;
    }
  }

  /**
   * Consolidate multiple notifications to reduce notification fatigue
   * Requirements: 4.4
   */
  async consolidateNotifications(userId: string): Promise<NotificationGroup[]> {
    try {
      // Get pending notifications for user
      const pendingNotifications = await this.getPendingNotifications(userId);
      
      if (pendingNotifications.length === 0) {
        return [];
      }

      // Group notifications by type
      const groups = new Map<string, SmartNotification[]>();
      
      for (const notification of pendingNotifications) {
        const type = notification.type;
        if (!groups.has(type)) {
          groups.set(type, []);
        }
        groups.get(type)!.push(notification);
      }

      // Create consolidated groups
      const consolidatedGroups: NotificationGroup[] = [];
      
      for (const [type, notifications] of groups.entries()) {
        if (notifications.length > 1) {
          const group = await this.createConsolidatedGroup(userId, type, notifications);
          consolidatedGroups.push(group);
        }
      }
      
      return consolidatedGroups;
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Consolidate notifications failed:', error);
      return [];
    }
  }

  /**
   * Deduplicate notifications to prevent sending duplicates
   * Requirements: 4.4
   */
  async deduplicateNotifications(
    userId: string,
    notification: SmartNotification
  ): Promise<boolean> {
    try {
      // Check for similar notifications sent in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentNotificationsQuery = query(
        collection(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', userId),
        where('type', '==', notification.type),
        where('sentAt', '>', Timestamp.fromDate(oneDayAgo))
      );
      
      const snapshot = await getDocs(recentNotificationsQuery);
      
      // Check for duplicates based on content similarity
      for (const doc of snapshot.docs) {
        const existingNotification = doc.data() as SmartNotification;
        
        if (this.isSimilarNotification(notification, existingNotification)) {
          console.log(`[NotificationTimingOptimizer] Duplicate notification detected, skipping`);
          return true; // Is duplicate
        }
      }
      
      return false; // Not duplicate
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Deduplicate failed:', error);
      return false;
    }
  }

  /**
   * Update user engagement pattern based on notification interactions
   */
  async updateEngagementPattern(
    userId: string,
    notificationId: string,
    action: 'opened' | 'clicked' | 'ignored',
    timestamp: Date
  ): Promise<void> {
    try {
      const pattern = await this.getUserEngagementPattern(userId) || this.createDefaultPattern(userId);
      
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      
      // Update hourly engagement
      if (!pattern.hourlyEngagement[hour]) {
        pattern.hourlyEngagement[hour] = 0;
      }
      
      // Increase engagement score for positive actions
      if (action === 'opened') {
        pattern.hourlyEngagement[hour] += 1;
      } else if (action === 'clicked') {
        pattern.hourlyEngagement[hour] += 2;
      } else if (action === 'ignored') {
        pattern.hourlyEngagement[hour] = Math.max(0, pattern.hourlyEngagement[hour] - 0.5);
      }
      
      // Update daily engagement
      if (!pattern.dailyEngagement[dayOfWeek]) {
        pattern.dailyEngagement[dayOfWeek] = 0;
      }
      
      if (action === 'opened') {
        pattern.dailyEngagement[dayOfWeek] += 1;
      } else if (action === 'clicked') {
        pattern.dailyEngagement[dayOfWeek] += 2;
      }
      
      pattern.lastUpdated = new Date();
      
      // Save updated pattern
      const patternRef = doc(db, 'user_engagement_patterns', userId);
      await setDoc(patternRef, {
        ...pattern,
        lastUpdated: Timestamp.now()
      });
      
      console.log(`[NotificationTimingOptimizer] Engagement pattern updated for user ${userId}`);
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Update engagement pattern failed:', error);
    }
  }

  /**
   * Get active deadline reminders for a user
   */
  async getActiveReminders(userId: string): Promise<DeadlineReminder[]> {
    try {
      const remindersQuery = query(
        collection(db, 'deadline_reminders'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(remindersQuery);
      return snapshot.docs.map(doc => doc.data() as DeadlineReminder);
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Get active reminders failed:', error);
      return [];
    }
  }

  /**
   * Cancel deadline reminders for a scheme
   */
  async cancelDeadlineReminders(userId: string, schemeId: string): Promise<void> {
    try {
      const remindersQuery = query(
        collection(db, 'deadline_reminders'),
        where('userId', '==', userId),
        where('schemeId', '==', schemeId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(remindersQuery);
      
      for (const docSnapshot of snapshot.docs) {
        await setDoc(doc(db, 'deadline_reminders', docSnapshot.id), {
          status: 'cancelled',
          cancelledAt: Timestamp.now()
        }, { merge: true });
      }
      
      console.log(`[NotificationTimingOptimizer] Reminders cancelled for scheme ${schemeId}`);
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Cancel reminders failed:', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get user engagement pattern from database
   */
  private async getUserEngagementPattern(userId: string): Promise<UserEngagementPattern | null> {
    try {
      const patternRef = doc(db, 'user_engagement_patterns', userId);
      const patternDoc = await getDoc(patternRef);
      
      if (!patternDoc.exists()) {
        return null;
      }
      
      return patternDoc.data() as UserEngagementPattern;
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Get engagement pattern failed:', error);
      return null;
    }
  }

  /**
   * Create default engagement pattern
   */
  private createDefaultPattern(userId: string): UserEngagementPattern {
    return {
      userId,
      hourlyEngagement: {
        9: 1, 10: 2, 11: 1.5, 14: 1, 15: 1.5, 16: 1, 17: 1
      },
      dailyEngagement: {
        1: 1.5, 2: 2, 3: 1.5, 4: 1.5, 5: 1
      },
      averageResponseTime: 120, // 2 hours
      preferredTimeWindow: [9, 18],
      lastUpdated: new Date()
    };
  }

  /**
   * Find optimal hour from engagement data
   */
  private findOptimalHour(hourlyEngagement: Record<number, number>): number {
    let maxEngagement = 0;
    let optimalHour = this.DEFAULT_OPTIMAL_HOUR;
    
    for (const [hour, engagement] of Object.entries(hourlyEngagement)) {
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        optimalHour = parseInt(hour);
      }
    }
    
    return optimalHour;
  }

  /**
   * Find optimal day from engagement data
   */
  private findOptimalDay(dailyEngagement: Record<number, number>): number {
    let maxEngagement = 0;
    let optimalDay = this.DEFAULT_OPTIMAL_DAY;
    
    for (const [day, engagement] of Object.entries(dailyEngagement)) {
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        optimalDay = parseInt(day);
      }
    }
    
    return optimalDay;
  }

  /**
   * Get default optimal time (10 AM next business day)
   */
  private getDefaultOptimalTime(): Date {
    const now = new Date();
    const optimalTime = new Date();
    optimalTime.setHours(this.DEFAULT_OPTIMAL_HOUR, 0, 0, 0);
    
    // If it's past 10 AM, schedule for tomorrow
    if (optimalTime <= now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }
    
    // Skip weekends
    const dayOfWeek = optimalTime.getDay();
    if (dayOfWeek === 0) { // Sunday
      optimalTime.setDate(optimalTime.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday
      optimalTime.setDate(optimalTime.getDate() + 2);
    }
    
    return optimalTime;
  }

  /**
   * Schedule individual reminder
   */
  private async scheduleReminder(
    userId: string,
    schemeId: string,
    schemeName: string,
    scheduledFor: Date,
    daysBeforeDeadline: number
  ): Promise<void> {
    try {
      const notification: SmartNotification = {
        id: `reminder_${userId}_${schemeId}_${daysBeforeDeadline}d`,
        userId,
        title: `Scheme Deadline Reminder: ${schemeName}`,
        message: `The deadline for "${schemeName}" is in ${daysBeforeDeadline} day${daysBeforeDeadline > 1 ? 's' : ''}. Don't miss this opportunity!`,
        type: 'deadline_reminder',
        priority: daysBeforeDeadline === 1 ? 'urgent' : daysBeforeDeadline === 7 ? 'high' : 'medium',
        channels: [],
        personalizedContent: true,
        actionUrl: `/schemes/${schemeId}`,
        metadata: {
          schemeId,
          daysBeforeDeadline
        },
        customization: {}
      };
      
      // Store scheduled notification
      const notificationRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS, notification.id);
      await setDoc(notificationRef, {
        ...notification,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        status: 'scheduled',
        createdAt: Timestamp.now()
      });
      
      console.log(`[NotificationTimingOptimizer] Reminder scheduled for ${scheduledFor.toISOString()}`);
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Schedule reminder failed:', error);
    }
  }

  /**
   * Get pending notifications for user
   */
  private async getPendingNotifications(userId: string): Promise<SmartNotification[]> {
    try {
      const notificationsQuery = query(
        collection(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(50)
      );
      
      const snapshot = await getDocs(notificationsQuery);
      return snapshot.docs.map(doc => doc.data() as SmartNotification);
    } catch (error) {
      console.error('[NotificationTimingOptimizer] Get pending notifications failed:', error);
      return [];
    }
  }

  /**
   * Create consolidated notification group
   */
  private async createConsolidatedGroup(
    userId: string,
    type: string,
    notifications: SmartNotification[]
  ): Promise<NotificationGroup> {
    const count = notifications.length;
    const highestPriority = this.getHighestPriority(notifications);
    
    let consolidatedMessage = '';
    
    switch (type) {
      case 'new_scheme':
        consolidatedMessage = `${count} new schemes match your profile! Check them out now.`;
        break;
      case 'status_update':
        consolidatedMessage = `You have ${count} application status updates waiting for you.`;
        break;
      case 'deadline_reminder':
        consolidatedMessage = `${count} scheme deadlines are approaching. Take action now!`;
        break;
      default:
        consolidatedMessage = `You have ${count} new notifications.`;
    }
    
    const optimalTime = await this.calculateOptimalTime(userId);
    
    return {
      userId,
      type,
      notifications,
      consolidatedMessage,
      priority: highestPriority,
      scheduledFor: optimalTime
    };
  }

  /**
   * Get highest priority from notifications
   */
  private getHighestPriority(notifications: SmartNotification[]): 'low' | 'medium' | 'high' | 'urgent' {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    let highest = 'low';
    
    for (const notification of notifications) {
      if (priorities.indexOf(notification.priority) > priorities.indexOf(highest)) {
        highest = notification.priority;
      }
    }
    
    return highest as 'low' | 'medium' | 'high' | 'urgent';
  }

  /**
   * Check if two notifications are similar (potential duplicates)
   */
  private isSimilarNotification(
    notification1: SmartNotification,
    notification2: SmartNotification
  ): boolean {
    // Same type and similar content
    if (notification1.type !== notification2.type) {
      return false;
    }
    
    // Check metadata similarity (e.g., same scheme ID)
    if (notification1.metadata?.schemeId && notification2.metadata?.schemeId) {
      return notification1.metadata.schemeId === notification2.metadata.schemeId;
    }
    
    // Check title similarity (simple string comparison)
    const similarity = this.calculateStringSimilarity(notification1.title, notification2.title);
    return similarity > 0.8;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const notificationTimingOptimizer = new NotificationTimingOptimizer();
