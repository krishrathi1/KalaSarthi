/**
 * Notification System
 * 
 * Main service for managing notifications, triggers, and delivery
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ArtisanNotification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  ChannelType,
  NOTIFICATION_EXPIRY_DAYS,
} from '@/lib/types/artisan-buddy-notifications';
import { notificationQueue } from './NotificationQueue';
import { notificationTemplates } from './NotificationTemplates';
import { notificationPreferencesService } from './NotificationPreferences';
import { notificationTriggers } from './NotificationTriggers';

export class NotificationSystem {
  private static instance: NotificationSystem;

  private constructor() {}

  public static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }

  /**
   * Create and send notification
   */
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    templateId: string;
    variables: Record<string, string>;
    metadata?: Record<string, any>;
    scheduledFor?: Date;
  }): Promise<ArtisanNotification> {
    try {
      const { userId, type, priority, templateId, variables, metadata, scheduledFor } = params;

      // Render template
      const rendered = notificationTemplates.renderTemplate(templateId, variables);
      if (!rendered) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Get user preferences
      const preferences = await notificationPreferencesService.getPreferences(userId);

      // Determine channels based on priority and preferences
      const channels = this.determineChannels(priority, preferences.channels);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + NOTIFICATION_EXPIRY_DAYS[type]);

      // Create notification
      const notification: ArtisanNotification = {
        id: uuidv4(),
        userId,
        type,
        priority,
        title: rendered.title,
        message: rendered.message,
        actionUrl: rendered.actionUrl,
        actionLabel: rendered.actionLabel,
        metadata: {
          source: 'artisan_buddy',
          ...metadata,
        },
        channels,
        status: scheduledFor ? 'scheduled' : 'pending',
        createdAt: new Date(),
        scheduledFor,
        expiresAt,
      };

      // Enqueue notification
      await notificationQueue.enqueue(notification);

      // Increment notification count
      await notificationPreferencesService.incrementNotificationCount(userId);

      console.log(`Notification ${notification.id} created for user ${userId}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send notification immediately
   */
  async sendNotification(notification: ArtisanNotification): Promise<{
    success: boolean;
    deliveredChannels: ChannelType[];
    failedChannels: ChannelType[];
  }> {
    try {
      const deliveredChannels: ChannelType[] = [];
      const failedChannels: ChannelType[] = [];

      // Check user preferences for each channel
      for (const channel of notification.channels) {
        const shouldReceive = await notificationPreferencesService.shouldReceiveNotification(
          notification.userId,
          notification.type,
          channel.type
        );

        if (!shouldReceive) {
          console.log(`Skipping ${channel.type} for user ${notification.userId} due to preferences`);
          continue;
        }

        // Deliver to channel
        const delivered = await this.deliverToChannel(notification, channel);
        
        if (delivered) {
          deliveredChannels.push(channel.type);
          channel.deliveryStatus = 'delivered';
          channel.deliveredAt = new Date();
        } else {
          failedChannels.push(channel.type);
          channel.deliveryStatus = 'failed';
        }
      }

      // Update notification status
      notification.status = deliveredChannels.length > 0 ? 'delivered' : 'failed';
      notification.deliveredAt = new Date();

      // Save notification
      await notificationQueue.saveNotification(notification);

      return {
        success: deliveredChannels.length > 0,
        deliveredChannels,
        failedChannels,
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        deliveredChannels: [],
        failedChannels: notification.channels.map(c => c.type),
      };
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverToChannel(
    notification: ArtisanNotification,
    channel: NotificationChannel
  ): Promise<boolean> {
    try {
      switch (channel.type) {
        case 'in_app':
          return await this.deliverInApp(notification);
        case 'push':
          return await this.deliverPush(notification);
        case 'email':
          return await this.deliverEmail(notification);
        case 'sms':
          return await this.deliverSMS(notification);
        case 'whatsapp':
          return await this.deliverWhatsApp(notification);
        default:
          console.warn(`Unknown channel type: ${channel.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error delivering to ${channel.type}:`, error);
      return false;
    }
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInApp(notification: ArtisanNotification): Promise<boolean> {
    try {
      // Store in user's notification list
      const key = `user_notifications:${notification.userId}`;
      const notifications = await notificationQueue.getUserNotifications(notification.userId);
      notifications.unshift(notification);

      // Keep only last 100 notifications
      const trimmed = notifications.slice(0, 100);
      
      // This would be saved to Firestore in production
      console.log(`In-app notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error delivering in-app notification:', error);
      return false;
    }
  }

  /**
   * Deliver push notification
   */
  private async deliverPush(notification: ArtisanNotification): Promise<boolean> {
    try {
      // This would integrate with Firebase Cloud Messaging or similar
      console.log(`Push notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error delivering push notification:', error);
      return false;
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(notification: ArtisanNotification): Promise<boolean> {
    try {
      // This would integrate with SendGrid or similar
      console.log(`Email notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error delivering email notification:', error);
      return false;
    }
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(notification: ArtisanNotification): Promise<boolean> {
    try {
      // This would integrate with Twilio or similar
      console.log(`SMS notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error delivering SMS notification:', error);
      return false;
    }
  }

  /**
   * Deliver WhatsApp notification
   */
  private async deliverWhatsApp(notification: ArtisanNotification): Promise<boolean> {
    try {
      // This would integrate with WhatsApp Business API
      console.log(`WhatsApp notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      console.error('Error delivering WhatsApp notification:', error);
      return false;
    }
  }

  /**
   * Determine channels based on priority and preferences
   */
  private determineChannels(
    priority: NotificationPriority,
    channelPreferences: Record<ChannelType, boolean>
  ): NotificationChannel[] {
    const defaultChannels = notificationTemplates.getDefaultChannels(priority);
    
    return defaultChannels
      .filter(type => channelPreferences[type])
      .map(type => ({
        type,
        enabled: true,
      }));
  }

  /**
   * Process notification queue
   */
  async processQueue(): Promise<void> {
    try {
      // Process immediate notifications
      let queueItem = await notificationQueue.dequeue();
      while (queueItem) {
        const result = await this.sendNotification(queueItem.notification);
        
        if (!result.success && queueItem.retryCount < queueItem.maxRetries) {
          await notificationQueue.retry(queueItem);
        }

        queueItem = await notificationQueue.dequeue();
      }

      // Process scheduled notifications
      const dueNotifications = await notificationQueue.getDueNotifications();
      for (const notification of dueNotifications) {
        await this.sendNotification(notification);
      }

      // Clear expired notifications
      await notificationQueue.clearExpired();
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = await notificationQueue.getNotification(notificationId);
      if (notification) {
        notification.status = 'read';
        notification.readAt = new Date();
        await notificationQueue.saveNotification(notification);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<ArtisanNotification[]> {
    try {
      return await notificationQueue.getUserNotifications(userId, limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await notificationQueue.getUserNotifications(userId);
      return notifications.filter(n => n.status !== 'read').length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      return await notificationQueue.cancelScheduled(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }
}

export const notificationSystem = NotificationSystem.getInstance();
