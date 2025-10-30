/**
 * Notification Queue Service
 * 
 * Manages notification queuing, scheduling, and delivery
 */

import { redisClient } from './RedisClient';
import {
  ArtisanNotification,
  NotificationQueueItem,
  NotificationStatus,
} from '@/lib/types/artisan-buddy-notifications';

export class NotificationQueue {
  private static instance: NotificationQueue;
  private readonly QUEUE_KEY = 'artisan_buddy:notification_queue';
  private readonly SCHEDULED_KEY = 'artisan_buddy:scheduled_notifications';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): NotificationQueue {
    if (!NotificationQueue.instance) {
      NotificationQueue.instance = new NotificationQueue();
    }
    return NotificationQueue.instance;
  }

  /**
   * Add notification to queue
   */
  async enqueue(notification: ArtisanNotification): Promise<void> {
    try {
      const queueItem: NotificationQueueItem = {
        notification,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        addedAt: new Date(),
      };

      // If scheduled for future, add to scheduled set
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        await this.scheduleNotification(notification);
      } else {
        // Add to immediate queue
        await redisClient.pushToList(
          this.QUEUE_KEY,
          JSON.stringify(queueItem)
        );
      }

      console.log(`Notification ${notification.id} enqueued`);
    } catch (error) {
      console.error('Error enqueueing notification:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(notification: ArtisanNotification): Promise<void> {
    try {
      if (!notification.scheduledFor) {
        throw new Error('scheduledFor is required for scheduling');
      }

      const score = notification.scheduledFor.getTime();
      await redisClient.addToSortedSet(
        this.SCHEDULED_KEY,
        JSON.stringify(notification),
        score
      );

      console.log(`Notification ${notification.id} scheduled for ${notification.scheduledFor}`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Dequeue next notification
   */
  async dequeue(): Promise<NotificationQueueItem | null> {
    try {
      const item = await redisClient.popFromList(this.QUEUE_KEY);
      if (!item) return null;

      return JSON.parse(item) as NotificationQueueItem;
    } catch (error) {
      console.error('Error dequeuing notification:', error);
      return null;
    }
  }

  /**
   * Get due scheduled notifications
   */
  async getDueNotifications(): Promise<ArtisanNotification[]> {
    try {
      const now = Date.now();
      const items = await redisClient.getRangeFromSortedSet(
        this.SCHEDULED_KEY,
        0,
        now
      );

      if (!items || items.length === 0) return [];

      // Remove from scheduled set
      await redisClient.removeRangeFromSortedSet(
        this.SCHEDULED_KEY,
        0,
        now
      );

      return items.map(item => JSON.parse(item) as ArtisanNotification);
    } catch (error) {
      console.error('Error getting due notifications:', error);
      return [];
    }
  }

  /**
   * Retry failed notification
   */
  async retry(queueItem: NotificationQueueItem): Promise<void> {
    try {
      if (queueItem.retryCount >= queueItem.maxRetries) {
        console.log(`Max retries reached for notification ${queueItem.notification.id}`);
        await this.markAsFailed(queueItem.notification.id);
        return;
      }

      queueItem.retryCount++;
      queueItem.nextRetryAt = new Date(Date.now() + this.RETRY_DELAY);

      // Add back to queue
      await redisClient.pushToList(
        this.QUEUE_KEY,
        JSON.stringify(queueItem)
      );

      console.log(`Notification ${queueItem.notification.id} scheduled for retry ${queueItem.retryCount}`);
    } catch (error) {
      console.error('Error retrying notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(notificationId: string): Promise<void> {
    try {
      const key = `notification:${notificationId}`;
      const notification = await redisClient.getCachedJSON<ArtisanNotification>(key);
      
      if (notification) {
        notification.status = 'failed';
        await redisClient.cacheJSON(key, notification, 86400); // 24 hours
      }

      console.log(`Notification ${notificationId} marked as failed`);
    } catch (error) {
      console.error('Error marking notification as failed:', error);
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduled(notificationId: string): Promise<boolean> {
    try {
      // Get all scheduled notifications
      const items = await redisClient.getRangeFromSortedSet(
        this.SCHEDULED_KEY,
        0,
        -1
      );

      if (!items) return false;

      // Find and remove the notification
      for (const item of items) {
        const notification = JSON.parse(item) as ArtisanNotification;
        if (notification.id === notificationId) {
          await redisClient.removeFromSortedSet(this.SCHEDULED_KEY, item);
          notification.status = 'cancelled';
          await this.saveNotification(notification);
          console.log(`Notification ${notificationId} cancelled`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    try {
      return await redisClient.getListLength(this.QUEUE_KEY);
    } catch (error) {
      console.error('Error getting queue size:', error);
      return 0;
    }
  }

  /**
   * Get scheduled count
   */
  async getScheduledCount(): Promise<number> {
    try {
      return await redisClient.getSortedSetSize(this.SCHEDULED_KEY);
    } catch (error) {
      console.error('Error getting scheduled count:', error);
      return 0;
    }
  }

  /**
   * Save notification to cache
   */
  async saveNotification(notification: ArtisanNotification): Promise<void> {
    try {
      const key = `notification:${notification.id}`;
      await redisClient.cacheJSON(key, notification, 86400); // 24 hours
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<ArtisanNotification | null> {
    try {
      const key = `notification:${notificationId}`;
      return await redisClient.getCachedJSON<ArtisanNotification>(key);
    } catch (error) {
      console.error('Error getting notification:', error);
      return null;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    status?: NotificationStatus
  ): Promise<ArtisanNotification[]> {
    try {
      const key = `user_notifications:${userId}`;
      const notifications = await redisClient.getCachedJSON<ArtisanNotification[]>(key) || [];

      let filtered = notifications;
      if (status) {
        filtered = notifications.filter(n => n.status === status);
      }

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Clear expired notifications
   */
  async clearExpired(): Promise<number> {
    try {
      const now = new Date();
      let cleared = 0;

      // Get all scheduled notifications
      const items = await redisClient.getRangeFromSortedSet(
        this.SCHEDULED_KEY,
        0,
        -1
      );

      if (!items) return 0;

      for (const item of items) {
        const notification = JSON.parse(item) as ArtisanNotification;
        if (notification.expiresAt && notification.expiresAt < now) {
          await redisClient.removeFromSortedSet(this.SCHEDULED_KEY, item);
          notification.status = 'expired';
          await this.saveNotification(notification);
          cleared++;
        }
      }

      console.log(`Cleared ${cleared} expired notifications`);
      return cleared;
    } catch (error) {
      console.error('Error clearing expired notifications:', error);
      return 0;
    }
  }
}

export const notificationQueue = NotificationQueue.getInstance();
