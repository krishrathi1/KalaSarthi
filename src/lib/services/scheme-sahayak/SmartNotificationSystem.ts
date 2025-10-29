/**
 * Smart Notification System
 * Handles intelligent, multi-channel notification delivery with engagement tracking
 * 
 * Requirements: 4.3, 4.5
 */

import { 
  SmartNotification, 
  NotificationResult, 
  NotificationPreferences, 
  NotificationAnalytics,
  ChannelDeliveryResult,
  SCHEME_SAHAYAK_COLLECTIONS 
} from '../../types/scheme-sahayak';
import { ISmartNotificationSystem } from './interfaces';
import { db } from '../../config/scheme-sahayak-firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

/**
 * Channel delivery providers interface
 */
interface IChannelProvider {
  send(notification: SmartNotification, recipient: string): Promise<ChannelDeliveryResult>;
  validateConfig(): boolean;
}

/**
 * SMS Channel Provider (Twilio)
 */
class SMSChannelProvider implements IChannelProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  validateConfig(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  async send(notification: SmartNotification, recipient: string): Promise<ChannelDeliveryResult> {
    const startTime = Date.now();
    
    try {
      if (!this.validateConfig()) {
        throw new Error('SMS provider not configured');
      }

      // Truncate message for SMS (160 characters)
      const smsMessage = `${notification.title}\n${notification.message}`.substring(0, 160);
      
      // In production, use Twilio SDK
      // const client = require('twilio')(this.accountSid, this.authToken);
      // const message = await client.messages.create({
      //   body: smsMessage,
      //   from: this.fromNumber,
      //   to: recipient
      // });

      // Mock implementation for development
      console.log(`[SMS] Sending to ${recipient}: ${smsMessage}`);
      
      return {
        channel: 'sms',
        success: true,
        deliveredAt: new Date(),
        messageId: `sms_${Date.now()}`,
        cost: 0.01 // Mock cost
      };
    } catch (error) {
      console.error('[SMS] Delivery failed:', error);
      return {
        channel: 'sms',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Email Channel Provider
 */
class EmailChannelProvider implements IChannelProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@schemesahayak.gov.in';
  }

  validateConfig(): boolean {
    return !!(this.apiKey && this.fromEmail);
  }

  async send(notification: SmartNotification, recipient: string): Promise<ChannelDeliveryResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Email provider not configured');
      }

      // In production, use SendGrid or similar
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.apiKey);
      // const msg = {
      //   to: recipient,
      //   from: this.fromEmail,
      //   subject: notification.title,
      //   text: notification.message,
      //   html: this.generateEmailHTML(notification)
      // };
      // await sgMail.send(msg);

      // Mock implementation for development
      console.log(`[EMAIL] Sending to ${recipient}: ${notification.title}`);
      
      return {
        channel: 'email',
        success: true,
        deliveredAt: new Date(),
        messageId: `email_${Date.now()}`,
        cost: 0.001
      };
    } catch (error) {
      console.error('[EMAIL] Delivery failed:', error);
      return {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateEmailHTML(notification: SmartNotification): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">Take Action</a>` : ''}
            </div>
            <div class="footer">
              <p>Scheme Sahayak - Government of India</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

/**
 * Push Notification Channel Provider
 */
class PushChannelProvider implements IChannelProvider {
  private vapidKey: string;

  constructor() {
    this.vapidKey = process.env.VAPID_PUBLIC_KEY || '';
  }

  validateConfig(): boolean {
    return !!this.vapidKey;
  }

  async send(notification: SmartNotification, recipient: string): Promise<ChannelDeliveryResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Push notification provider not configured');
      }

      // In production, use web-push or Firebase Cloud Messaging
      // const webpush = require('web-push');
      // await webpush.sendNotification(subscription, JSON.stringify({
      //   title: notification.title,
      //   body: notification.message,
      //   icon: '/icon-192x192.svg',
      //   badge: '/icon-192x192.svg',
      //   data: { url: notification.actionUrl }
      // }));

      // Mock implementation for development
      console.log(`[PUSH] Sending to ${recipient}: ${notification.title}`);
      
      return {
        channel: 'push',
        success: true,
        deliveredAt: new Date(),
        messageId: `push_${Date.now()}`,
        cost: 0
      };
    } catch (error) {
      console.error('[PUSH] Delivery failed:', error);
      return {
        channel: 'push',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * WhatsApp Channel Provider
 */
class WhatsAppChannelProvider implements IChannelProvider {
  private apiKey: string;
  private phoneNumberId: string;

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  validateConfig(): boolean {
    return !!(this.apiKey && this.phoneNumberId);
  }

  async send(notification: SmartNotification, recipient: string): Promise<ChannelDeliveryResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('WhatsApp provider not configured');
      }

      // In production, use WhatsApp Business API
      // const response = await fetch(`https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     messaging_product: 'whatsapp',
      //     to: recipient,
      //     type: 'text',
      //     text: { body: `${notification.title}\n\n${notification.message}` }
      //   })
      // });

      // Mock implementation for development
      console.log(`[WHATSAPP] Sending to ${recipient}: ${notification.title}`);
      
      return {
        channel: 'whatsapp',
        success: true,
        deliveredAt: new Date(),
        messageId: `whatsapp_${Date.now()}`,
        cost: 0.005
      };
    } catch (error) {
      console.error('[WHATSAPP] Delivery failed:', error);
      return {
        channel: 'whatsapp',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Smart Notification System Implementation
 */
export class SmartNotificationSystem implements ISmartNotificationSystem {
  private channelProviders: Map<string, IChannelProvider>;

  constructor() {
    this.channelProviders = new Map([
      ['sms', new SMSChannelProvider()],
      ['email', new EmailChannelProvider()],
      ['push', new PushChannelProvider()],
      ['whatsapp', new WhatsAppChannelProvider()]
    ]);
  }

  /**
   * Send notification through optimal channels based on urgency and preferences
   * Requirements: 4.3, 4.5
   */
  async sendNotification(notification: SmartNotification): Promise<NotificationResult> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(notification.userId);
      
      // Select channels based on urgency and preferences
      const selectedChannels = this.selectChannels(notification, preferences);
      
      // Get user contact information
      const userContact = await this.getUserContactInfo(notification.userId);
      
      // Send through selected channels
      const deliveryResults: ChannelDeliveryResult[] = [];
      
      for (const channelConfig of selectedChannels) {
        const provider = this.channelProviders.get(channelConfig.type);
        if (!provider) {
          console.warn(`Channel provider not found: ${channelConfig.type}`);
          continue;
        }

        const recipient = this.getRecipientForChannel(channelConfig.type, userContact);
        if (!recipient) {
          console.warn(`No recipient found for channel: ${channelConfig.type}`);
          continue;
        }

        let result = await provider.send(notification, recipient);
        
        // Retry logic
        if (!result.success && channelConfig.retryAttempts > 0) {
          for (let i = 0; i < channelConfig.retryAttempts; i++) {
            await this.delay(channelConfig.fallbackDelay);
            result = await provider.send(notification, recipient);
            if (result.success) break;
          }
        }
        
        deliveryResults.push(result);
      }
      
      // Store notification in database
      await this.storeNotification(notification, deliveryResults);
      
      // Track analytics
      await this.trackDelivery(notification.userId, deliveryResults);
      
      const overallSuccess = deliveryResults.some(r => r.success);
      
      return {
        notificationId: notification.id,
        deliveryResults,
        overallSuccess,
        userEngagement: {
          opened: false,
          clicked: false,
          actionTaken: false
        }
      };
    } catch (error) {
      console.error('[SmartNotificationSystem] Send failed:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for future delivery
   */
  async scheduleNotification(
    notification: SmartNotification, 
    scheduledFor: Date
  ): Promise<string> {
    try {
      const scheduledNotification = {
        ...notification,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        status: 'scheduled',
        createdAt: Timestamp.now()
      };

      const notificationRef = doc(collection(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS), notification.id);
      await setDoc(notificationRef, scheduledNotification);

      console.log(`[SmartNotificationSystem] Notification scheduled for ${scheduledFor.toISOString()}`);
      
      return notification.id;
    } catch (error) {
      console.error('[SmartNotificationSystem] Schedule failed:', error);
      throw error;
    }
  }

  /**
   * Optimize delivery timing based on user engagement patterns
   */
  async optimizeDeliveryTiming(userId: string): Promise<string> {
    try {
      const analytics = await this.getDeliveryAnalytics(userId);
      
      const optimalHour = analytics.optimalTiming.hour;
      const optimalDay = analytics.optimalTiming.dayOfWeek;
      
      return `Optimal delivery time: ${optimalHour}:00 on ${this.getDayName(optimalDay)}`;
    } catch (error) {
      console.error('[SmartNotificationSystem] Timing optimization failed:', error);
      return 'Default timing: 10:00 AM on weekdays';
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const preferencesRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.USER_PREFERENCES, userId);
      await setDoc(preferencesRef, {
        ...preferences,
        updatedAt: Timestamp.now()
      }, { merge: true });

      console.log(`[SmartNotificationSystem] Preferences updated for user ${userId}`);
    } catch (error) {
      console.error('[SmartNotificationSystem] Update preferences failed:', error);
      throw error;
    }
  }

  /**
   * Get notification delivery analytics
   */
  async getDeliveryAnalytics(userId: string): Promise<NotificationAnalytics> {
    try {
      const analyticsRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS, `notifications_${userId}`);
      const analyticsDoc = await getDoc(analyticsRef);

      if (!analyticsDoc.exists()) {
        return this.getDefaultAnalytics(userId);
      }

      return analyticsDoc.data() as NotificationAnalytics;
    } catch (error) {
      console.error('[SmartNotificationSystem] Get analytics failed:', error);
      return this.getDefaultAnalytics(userId);
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(notificationRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });

      console.log(`[SmartNotificationSystem] Notification ${notificationId} cancelled`);
    } catch (error) {
      console.error('[SmartNotificationSystem] Cancel failed:', error);
      throw error;
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string,
    limitCount: number = 50
  ): Promise<SmartNotification[]> {
    try {
      const notificationsQuery = query(
        collection(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(notificationsQuery);
      return snapshot.docs.map(doc => doc.data() as SmartNotification);
    } catch (error) {
      console.error('[SmartNotificationSystem] Get history failed:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      });

      // Update engagement analytics
      await this.trackEngagement(userId, 'opened');
      
      console.log(`[SmartNotificationSystem] Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('[SmartNotificationSystem] Mark as read failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Select appropriate channels based on urgency and preferences
   */
  private selectChannels(
    notification: SmartNotification,
    preferences: NotificationPreferences
  ): typeof notification.channels {
    const selectedChannels = [];

    // For urgent notifications, use all available channels
    if (notification.priority === 'urgent') {
      if (preferences.channels.sms) {
        selectedChannels.push({
          type: 'sms' as const,
          fallbackDelay: 0,
          retryAttempts: 3,
          fallbackToManual: true,
          userNotification: true
        });
      }
      if (preferences.channels.whatsapp) {
        selectedChannels.push({
          type: 'whatsapp' as const,
          fallbackDelay: 1000,
          retryAttempts: 2,
          fallbackToManual: false,
          userNotification: true
        });
      }
      if (preferences.channels.push) {
        selectedChannels.push({
          type: 'push' as const,
          fallbackDelay: 0,
          retryAttempts: 1,
          fallbackToManual: false,
          userNotification: true
        });
      }
    } else if (notification.priority === 'high') {
      // High priority: SMS + one other channel
      if (preferences.channels.sms) {
        selectedChannels.push({
          type: 'sms' as const,
          fallbackDelay: 0,
          retryAttempts: 2,
          fallbackToManual: false,
          userNotification: true
        });
      }
      if (preferences.channels.email) {
        selectedChannels.push({
          type: 'email' as const,
          fallbackDelay: 2000,
          retryAttempts: 1,
          fallbackToManual: false,
          userNotification: true
        });
      }
    } else {
      // Medium/Low priority: Use preferred channels
      if (preferences.channels.email) {
        selectedChannels.push({
          type: 'email' as const,
          fallbackDelay: 5000,
          retryAttempts: 1,
          fallbackToManual: false,
          userNotification: true
        });
      }
      if (preferences.channels.push) {
        selectedChannels.push({
          type: 'push' as const,
          fallbackDelay: 0,
          retryAttempts: 1,
          fallbackToManual: false,
          userNotification: true
        });
      }
    }

    return selectedChannels.length > 0 ? selectedChannels : notification.channels;
  }

  /**
   * Get user preferences with defaults
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferencesRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.USER_PREFERENCES, userId);
      const preferencesDoc = await getDoc(preferencesRef);

      if (preferencesDoc.exists()) {
        return preferencesDoc.data() as NotificationPreferences;
      }

      // Return default preferences
      return {
        channels: {
          sms: true,
          email: true,
          push: true,
          whatsapp: false
        },
        timing: {
          preferredHours: [9, 18],
          timezone: 'Asia/Kolkata',
          frequency: 'immediate'
        },
        types: {
          newSchemes: true,
          deadlineReminders: true,
          statusUpdates: true,
          documentRequests: true,
          rejectionNotices: true
        }
      };
    } catch (error) {
      console.error('[SmartNotificationSystem] Get preferences failed:', error);
      throw error;
    }
  }

  /**
   * Get user contact information
   */
  private async getUserContactInfo(userId: string): Promise<{
    phone?: string;
    email?: string;
    pushToken?: string;
  }> {
    try {
      const userRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      return {
        phone: userData.personalInfo?.phone,
        email: userData.personalInfo?.email,
        pushToken: userData.pushToken
      };
    } catch (error) {
      console.error('[SmartNotificationSystem] Get contact info failed:', error);
      throw error;
    }
  }

  /**
   * Get recipient address for specific channel
   */
  private getRecipientForChannel(
    channelType: string,
    userContact: { phone?: string; email?: string; pushToken?: string }
  ): string | undefined {
    switch (channelType) {
      case 'sms':
      case 'whatsapp':
        return userContact.phone;
      case 'email':
        return userContact.email;
      case 'push':
        return userContact.pushToken || userContact.email;
      default:
        return undefined;
    }
  }

  /**
   * Store notification in database
   */
  private async storeNotification(
    notification: SmartNotification,
    deliveryResults: ChannelDeliveryResult[]
  ): Promise<void> {
    try {
      const notificationRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS, notification.id);
      await setDoc(notificationRef, {
        ...notification,
        deliveryResults,
        status: 'sent',
        sentAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        read: false
      });
    } catch (error) {
      console.error('[SmartNotificationSystem] Store notification failed:', error);
    }
  }

  /**
   * Track delivery analytics
   */
  private async trackDelivery(
    userId: string,
    deliveryResults: ChannelDeliveryResult[]
  ): Promise<void> {
    try {
      const analyticsRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS, `notifications_${userId}`);
      const analyticsDoc = await getDoc(analyticsRef);

      const currentData = analyticsDoc.exists() ? analyticsDoc.data() : this.getDefaultAnalytics(userId);

      // Update analytics
      const updatedAnalytics = {
        ...currentData,
        sent: (currentData.sent || 0) + 1,
        delivered: (currentData.delivered || 0) + deliveryResults.filter(r => r.success).length,
        deliveryRate: ((currentData.delivered || 0) + deliveryResults.filter(r => r.success).length) / ((currentData.sent || 0) + 1),
        channelPerformance: this.updateChannelPerformance(currentData.channelPerformance || {}, deliveryResults)
      };

      await setDoc(analyticsRef, updatedAnalytics, { merge: true });
    } catch (error) {
      console.error('[SmartNotificationSystem] Track delivery failed:', error);
    }
  }

  /**
   * Track user engagement
   */
  private async trackEngagement(userId: string, action: 'opened' | 'clicked' | 'actionTaken'): Promise<void> {
    try {
      const analyticsRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS, `notifications_${userId}`);
      const analyticsDoc = await getDoc(analyticsRef);

      if (!analyticsDoc.exists()) return;

      const currentData = analyticsDoc.data();
      const updates: any = {};

      if (action === 'opened') {
        updates.opened = (currentData.opened || 0) + 1;
      } else if (action === 'clicked') {
        updates.clicked = (currentData.clicked || 0) + 1;
      }

      updates.engagementRate = (updates.opened || currentData.opened || 0) / (currentData.sent || 1);

      await updateDoc(analyticsRef, updates);
    } catch (error) {
      console.error('[SmartNotificationSystem] Track engagement failed:', error);
    }
  }

  /**
   * Update channel performance metrics
   */
  private updateChannelPerformance(
    current: Record<string, any>,
    results: ChannelDeliveryResult[]
  ): Record<string, any> {
    const updated = { ...current };

    for (const result of results) {
      if (!updated[result.channel]) {
        updated[result.channel] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
      }

      updated[result.channel].sent += 1;
      if (result.success) {
        updated[result.channel].delivered += 1;
      }
    }

    return updated;
  }

  /**
   * Get default analytics structure
   */
  private getDefaultAnalytics(userId: string): NotificationAnalytics {
    return {
      userId,
      period: {
        start: new Date(),
        end: new Date()
      },
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: 0,
      engagementRate: 0,
      channelPerformance: {},
      optimalTiming: {
        hour: 10,
        dayOfWeek: 2,
        confidence: 0.5
      }
    };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get day name from day number
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Monday';
  }
}

// Export singleton instance
export const smartNotificationSystem = new SmartNotificationSystem();
