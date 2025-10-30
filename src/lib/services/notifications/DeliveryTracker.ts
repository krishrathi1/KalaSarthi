/**
 * Delivery Tracking System for WhatsApp Messages
 * Tracks message delivery status, handles webhooks, and provides analytics
 */

import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import { 
  GupshupError, 
  GupshupErrorCode,
  handleGupshupError,
  ErrorCategory 
} from './GupshupErrorHandler';
import { 
  getGupshupLogger, 
  createPerformanceTimer,
  GupshupLogger 
} from './GupshupLogger';

export interface DeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
  channel: 'whatsapp' | 'sms';
  userId?: string;
  phoneNumber?: string;
  retryCount?: number;
}

export interface DeliveryReport {
  totalMessages: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  successRate: number;
  averageDeliveryTime: number;
  channelBreakdown: {
    whatsapp: ChannelStats;
    sms: ChannelStats;
  };
  errorBreakdown: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ChannelStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  averageDeliveryTime: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GupshupWebhook {
  messageId: string;
  status: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  channel?: string;
  destination?: string;
  eventType?: string;
  [key: string]: any;
}

export interface DeliveryAnalytics {
  hourlyStats: Record<string, number>;
  dailyStats: Record<string, number>;
  errorTrends: Record<string, number[]>;
  performanceMetrics: {
    p50DeliveryTime: number;
    p95DeliveryTime: number;
    p99DeliveryTime: number;
  };
}

export interface UserNotificationHistory {
  userId: string;
  notifications: DeliveryStatus[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  lastNotificationAt?: Date;
  preferredChannel?: 'whatsapp' | 'sms';
}

export interface DeliveryTimeline {
  messageId: string;
  events: DeliveryEvent[];
}

export interface DeliveryEvent {
  status: DeliveryStatus['status'];
  timestamp: Date;
  channel: 'whatsapp' | 'sms';
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface RealTimeStatusUpdate {
  messageId: string;
  userId: string;
  status: DeliveryStatus['status'];
  timestamp: Date;
  channel: 'whatsapp' | 'sms';
  previousStatus?: DeliveryStatus['status'];
  deliveryTime?: number;
  errorInfo?: {
    code: string;
    message: string;
  };
}

/**
 * In-memory storage for delivery tracking
 * In production, this would be replaced with a database
 */
class DeliveryStorage {
  private deliveries = new Map<string, DeliveryStatus>();
  private deliveryHistory: DeliveryStatus[] = [];
  private userNotifications = new Map<string, DeliveryStatus[]>();
  private deliveryTimelines = new Map<string, DeliveryEvent[]>();
  private maxHistorySize = 10000;
  private maxUserHistorySize = 1000;

  set(messageId: string, status: DeliveryStatus): void {
    this.deliveries.set(messageId, status);
    
    // Add to history
    this.deliveryHistory.unshift(status);
    
    // Trim history if too large
    if (this.deliveryHistory.length > this.maxHistorySize) {
      this.deliveryHistory = this.deliveryHistory.slice(0, this.maxHistorySize);
    }

    // Add to user notification history
    if (status.userId) {
      this.addToUserHistory(status.userId, status);
    }

    // Add to delivery timeline
    this.addToTimeline(messageId, {
      status: status.status,
      timestamp: status.timestamp,
      channel: status.channel,
      errorCode: status.errorCode,
      errorMessage: status.errorMessage,
    });
  }

  get(messageId: string): DeliveryStatus | null {
    return this.deliveries.get(messageId) || null;
  }

  getAll(): DeliveryStatus[] {
    return Array.from(this.deliveries.values());
  }

  getHistory(limit?: number): DeliveryStatus[] {
    return limit ? this.deliveryHistory.slice(0, limit) : this.deliveryHistory.slice();
  }

  getByDateRange(start: Date, end: Date): DeliveryStatus[] {
    return this.deliveryHistory.filter(
      delivery => delivery.timestamp >= start && delivery.timestamp <= end
    );
  }

  getByChannel(channel: 'whatsapp' | 'sms'): DeliveryStatus[] {
    return this.deliveryHistory.filter(delivery => delivery.channel === channel);
  }

  getByStatus(status: DeliveryStatus['status']): DeliveryStatus[] {
    return this.deliveryHistory.filter(delivery => delivery.status === status);
  }

  getUserNotificationHistory(userId: string): UserNotificationHistory {
    const notifications = this.userNotifications.get(userId) || [];
    const successCount = notifications.filter(n => n.status === 'delivered' || n.status === 'read').length;
    const failureCount = notifications.filter(n => n.status === 'failed').length;
    const lastNotification = notifications[0];
    
    // Determine preferred channel based on success rate
    const whatsappNotifications = notifications.filter(n => n.channel === 'whatsapp');
    const smsNotifications = notifications.filter(n => n.channel === 'sms');
    const whatsappSuccessRate = whatsappNotifications.length > 0 
      ? whatsappNotifications.filter(n => n.status === 'delivered' || n.status === 'read').length / whatsappNotifications.length 
      : 0;
    const smsSuccessRate = smsNotifications.length > 0 
      ? smsNotifications.filter(n => n.status === 'delivered' || n.status === 'read').length / smsNotifications.length 
      : 0;

    return {
      userId,
      notifications,
      totalCount: notifications.length,
      successCount,
      failureCount,
      lastNotificationAt: lastNotification?.timestamp,
      preferredChannel: whatsappSuccessRate >= smsSuccessRate ? 'whatsapp' : 'sms',
    };
  }

  getDeliveryTimeline(messageId: string): DeliveryTimeline {
    const events = this.deliveryTimelines.get(messageId) || [];
    return {
      messageId,
      events: events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }

  getAllUserNotificationHistories(): Map<string, UserNotificationHistory> {
    const histories = new Map<string, UserNotificationHistory>();
    for (const userId of this.userNotifications.keys()) {
      histories.set(userId, this.getUserNotificationHistory(userId));
    }
    return histories;
  }

  private addToUserHistory(userId: string, status: DeliveryStatus): void {
    if (!this.userNotifications.has(userId)) {
      this.userNotifications.set(userId, []);
    }
    
    const userHistory = this.userNotifications.get(userId)!;
    userHistory.unshift(status);
    
    // Trim user history if too large
    if (userHistory.length > this.maxUserHistorySize) {
      userHistory.splice(this.maxUserHistorySize);
    }
  }

  private addToTimeline(messageId: string, event: DeliveryEvent): void {
    if (!this.deliveryTimelines.has(messageId)) {
      this.deliveryTimelines.set(messageId, []);
    }
    
    const timeline = this.deliveryTimelines.get(messageId)!;
    timeline.push(event);
  }

  clear(): void {
    this.deliveries.clear();
    this.deliveryHistory = [];
    this.userNotifications.clear();
    this.deliveryTimelines.clear();
  }

  size(): number {
    return this.deliveries.size;
  }
}

/**
 * Delivery Tracker for WhatsApp and SMS messages
 */
export class DeliveryTracker {
  private config: GupshupConfig;
  private logger: GupshupLogger;
  private storage: DeliveryStorage;
  private webhookSecret: string;
  private realTimeListeners: Set<(update: RealTimeStatusUpdate) => void>;

  constructor(config?: GupshupConfig) {
    this.config = config || getGupshupConfig();
    this.logger = getGupshupLogger();
    this.storage = new DeliveryStorage();
    this.webhookSecret = this.config.webhook.secret;
    this.realTimeListeners = new Set();

    this.logger.info('delivery_tracker_init', 'Delivery Tracker initialized', {
      webhookSecretConfigured: !!this.webhookSecret,
      storageType: 'in-memory',
      realTimeEnabled: true,
    });
  }

  /**
   * Track a new message
   */
  async trackMessage(
    messageId: string, 
    userId: string, 
    channel: 'whatsapp' | 'sms',
    phoneNumber?: string
  ): Promise<void> {
    const timer = createPerformanceTimer('track_message');
    
    try {
      const deliveryStatus: DeliveryStatus = {
        messageId,
        status: 'sent',
        timestamp: new Date(),
        channel,
        userId,
        phoneNumber,
        retryCount: 0,
      };

      this.storage.set(messageId, deliveryStatus);
      
      const duration = timer.end(true, null, { messageId, channel, userId });
      
      this.logger.info('message_tracked', 'Message tracking started', {
        messageId,
        channel,
        userId,
        phoneNumber: phoneNumber ? this.maskPhoneNumber(phoneNumber) : undefined,
      });

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { messageId, userId, channel });
      this.logger.error('track_message_error', 'Failed to track message', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Update message delivery status
   */
  async updateStatus(messageId: string, status: DeliveryStatus['status'], errorInfo?: { code?: string; message?: string }): Promise<void> {
    const timer = createPerformanceTimer('update_delivery_status');
    
    try {
      const existingStatus = this.storage.get(messageId);
      const previousStatus = existingStatus?.status;
      let deliveryTime: number | undefined;
      
      if (!existingStatus) {
        this.logger.warn('status_update_orphaned', 'Received status update for unknown message', {
          messageId,
          status,
          errorInfo,
        });
        
        // Create a new entry for orphaned status update
        const deliveryStatus: DeliveryStatus = {
          messageId,
          status,
          timestamp: new Date(),
          channel: 'whatsapp', // Default assumption
          errorCode: errorInfo?.code,
          errorMessage: errorInfo?.message,
        };
        
        this.storage.set(messageId, deliveryStatus);
      } else {
        // Calculate delivery time for successful deliveries
        if ((status === 'delivered' || status === 'read') && existingStatus.status === 'sent') {
          deliveryTime = Date.now() - existingStatus.timestamp.getTime();
        }

        // Update existing status
        const updatedStatus: DeliveryStatus = {
          ...existingStatus,
          status,
          timestamp: new Date(),
          errorCode: errorInfo?.code,
          errorMessage: errorInfo?.message,
        };
        
        this.storage.set(messageId, updatedStatus);
      }

      // Emit real-time status update
      if (existingStatus?.userId) {
        const realTimeUpdate: RealTimeStatusUpdate = {
          messageId,
          userId: existingStatus.userId,
          status,
          timestamp: new Date(),
          channel: existingStatus.channel,
          previousStatus,
          deliveryTime,
          errorInfo: errorInfo ? {
            code: errorInfo.code || 'unknown',
            message: errorInfo.message || 'Unknown error',
          } : undefined,
        };
        
        this.emitRealTimeUpdate(realTimeUpdate);
      }

      const duration = timer.end(true, null, { messageId, status });
      
      this.logger.info('delivery_status_updated', 'Message delivery status updated', {
        messageId,
        status,
        previousStatus,
        errorCode: errorInfo?.code,
        channel: existingStatus?.channel,
        deliveryTime,
      });

      // Log delivery completion for successful deliveries
      if (status === 'delivered' || status === 'read') {
        this.logDeliverySuccess(messageId, existingStatus);
      } else if (status === 'failed') {
        this.logDeliveryFailure(messageId, existingStatus, errorInfo);
      }

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { messageId, status, errorInfo });
      this.logger.error('update_status_error', 'Failed to update delivery status', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Get delivery report for a date range
   */
  async getDeliveryReport(dateRange: DateRange): Promise<DeliveryReport> {
    const timer = createPerformanceTimer('generate_delivery_report');
    
    try {
      const deliveries = this.storage.getByDateRange(dateRange.start, dateRange.end);
      
      const report: DeliveryReport = {
        totalMessages: deliveries.length,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        channelBreakdown: {
          whatsapp: this.initChannelStats(),
          sms: this.initChannelStats(),
        },
        errorBreakdown: {},
        timeRange: dateRange,
      };

      const deliveryTimes: number[] = [];
      
      // Process each delivery
      for (const delivery of deliveries) {
        // Count by status
        switch (delivery.status) {
          case 'delivered':
          case 'read':
            report.successfulDeliveries++;
            break;
          case 'failed':
            report.failedDeliveries++;
            break;
          case 'sent':
            report.pendingDeliveries++;
            break;
        }

        // Update channel breakdown
        const channelStats = report.channelBreakdown[delivery.channel];
        channelStats.total++;
        
        switch (delivery.status) {
          case 'delivered':
          case 'read':
            channelStats.successful++;
            break;
          case 'failed':
            channelStats.failed++;
            break;
          case 'sent':
            channelStats.pending++;
            break;
        }

        // Track error codes
        if (delivery.errorCode) {
          report.errorBreakdown[delivery.errorCode] = (report.errorBreakdown[delivery.errorCode] || 0) + 1;
        }

        // Calculate delivery time (mock calculation)
        if (delivery.status === 'delivered' || delivery.status === 'read') {
          // In real implementation, this would be calculated from sent time to delivered time
          const mockDeliveryTime = Math.random() * 30000 + 5000; // 5-35 seconds
          deliveryTimes.push(mockDeliveryTime);
        }
      }

      // Calculate success rate
      report.successRate = report.totalMessages > 0 
        ? (report.successfulDeliveries / report.totalMessages) * 100 
        : 0;

      // Calculate average delivery time
      report.averageDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0;

      // Calculate channel success rates
      for (const channel of ['whatsapp', 'sms'] as const) {
        const stats = report.channelBreakdown[channel];
        stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
        
        // Mock average delivery time per channel
        stats.averageDeliveryTime = channel === 'whatsapp' 
          ? Math.random() * 20000 + 10000  // 10-30 seconds for WhatsApp
          : Math.random() * 10000 + 5000;   // 5-15 seconds for SMS
      }

      const duration = timer.end(true, null, { 
        totalMessages: report.totalMessages,
        successRate: report.successRate 
      });
      
      this.logger.info('delivery_report_generated', 'Delivery report generated', {
        dateRange,
        totalMessages: report.totalMessages,
        successRate: report.successRate,
        generationTime: duration,
      });

      return report;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { dateRange });
      this.logger.error('delivery_report_error', 'Failed to generate delivery report', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Process incoming webhook from Gupshup
   */
  async processWebhook(payload: GupshupWebhook): Promise<void> {
    const timer = createPerformanceTimer('process_webhook');
    
    try {
      // Validate webhook payload
      if (!payload.messageId || !payload.status) {
        throw new GupshupError(
          GupshupErrorCode.INVALID_PARAMETERS,
          'Webhook payload missing required fields (messageId, status)',
          { category: ErrorCategory.VALIDATION }
        );
      }

      // Validate webhook signature (in production)
      // This would involve HMAC validation using the webhook secret
      if (this.webhookSecret && !this.validateWebhookSignature(payload)) {
        throw new GupshupError(
          GupshupErrorCode.UNAUTHORIZED,
          'Invalid webhook signature',
          { category: ErrorCategory.AUTHENTICATION }
        );
      }

      // Map Gupshup status to our standard status
      const mappedStatus = this.mapGupshupStatus(payload.status);
      
      // Extract error information if present
      const errorInfo = payload.errorCode || payload.errorMessage ? {
        code: payload.errorCode,
        message: payload.errorMessage,
      } : undefined;

      // Update delivery status
      await this.updateStatus(payload.messageId, mappedStatus, errorInfo);

      const duration = timer.end(true, null, { 
        messageId: payload.messageId,
        status: mappedStatus 
      });
      
      this.logger.info('webhook_processed', 'Webhook processed successfully', {
        messageId: payload.messageId,
        originalStatus: payload.status,
        mappedStatus,
        eventType: payload.eventType,
        processingTime: duration,
      });

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { webhook: payload });
      this.logger.error('webhook_processing_error', 'Failed to process webhook', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(dateRange: DateRange): Promise<DeliveryAnalytics> {
    const deliveries = this.storage.getByDateRange(dateRange.start, dateRange.end);
    
    const analytics: DeliveryAnalytics = {
      hourlyStats: {},
      dailyStats: {},
      errorTrends: {},
      performanceMetrics: {
        p50DeliveryTime: 0,
        p95DeliveryTime: 0,
        p99DeliveryTime: 0,
      },
    };

    // Generate hourly and daily stats
    for (const delivery of deliveries) {
      const hour = delivery.timestamp.getHours();
      const day = delivery.timestamp.toISOString().split('T')[0];
      
      analytics.hourlyStats[hour] = (analytics.hourlyStats[hour] || 0) + 1;
      analytics.dailyStats[day] = (analytics.dailyStats[day] || 0) + 1;
      
      if (delivery.errorCode) {
        if (!analytics.errorTrends[delivery.errorCode]) {
          analytics.errorTrends[delivery.errorCode] = [];
        }
        analytics.errorTrends[delivery.errorCode].push(delivery.timestamp.getTime());
      }
    }

    // Mock performance metrics (in real implementation, calculate from actual delivery times)
    analytics.performanceMetrics = {
      p50DeliveryTime: 15000, // 15 seconds
      p95DeliveryTime: 45000, // 45 seconds
      p99DeliveryTime: 90000, // 90 seconds
    };

    return analytics;
  }

  /**
   * Get current delivery statistics
   */
  getDeliveryStats(): { total: number; byStatus: Record<string, number>; byChannel: Record<string, number> } {
    const allDeliveries = this.storage.getAll();
    
    const stats = {
      total: allDeliveries.length,
      byStatus: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
    };

    for (const delivery of allDeliveries) {
      stats.byStatus[delivery.status] = (stats.byStatus[delivery.status] || 0) + 1;
      stats.byChannel[delivery.channel] = (stats.byChannel[delivery.channel] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get user notification history
   */
  async getUserNotificationHistory(userId: string, limit?: number): Promise<UserNotificationHistory> {
    const timer = createPerformanceTimer('get_user_notification_history');
    
    try {
      const history = this.storage.getUserNotificationHistory(userId);
      
      // Apply limit if specified
      if (limit && history.notifications.length > limit) {
        history.notifications = history.notifications.slice(0, limit);
      }

      const duration = timer.end(true, null, { userId, totalCount: history.totalCount });
      
      this.logger.info('user_history_retrieved', 'User notification history retrieved', {
        userId,
        totalCount: history.totalCount,
        successCount: history.successCount,
        failureCount: history.failureCount,
        preferredChannel: history.preferredChannel,
      });

      return history;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { userId });
      this.logger.error('user_history_error', 'Failed to retrieve user notification history', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Get delivery timeline for a specific message
   */
  async getDeliveryTimeline(messageId: string): Promise<DeliveryTimeline> {
    const timer = createPerformanceTimer('get_delivery_timeline');
    
    try {
      const timeline = this.storage.getDeliveryTimeline(messageId);

      const duration = timer.end(true, null, { messageId, eventCount: timeline.events.length });
      
      this.logger.info('delivery_timeline_retrieved', 'Delivery timeline retrieved', {
        messageId,
        eventCount: timeline.events.length,
      });

      return timeline;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { messageId });
      this.logger.error('delivery_timeline_error', 'Failed to retrieve delivery timeline', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Subscribe to real-time status updates
   */
  subscribeToRealTimeUpdates(listener: (update: RealTimeStatusUpdate) => void): () => void {
    this.realTimeListeners.add(listener);
    
    this.logger.info('realtime_subscription_added', 'Real-time update listener added', {
      totalListeners: this.realTimeListeners.size,
    });

    // Return unsubscribe function
    return () => {
      this.realTimeListeners.delete(listener);
      this.logger.info('realtime_subscription_removed', 'Real-time update listener removed', {
        totalListeners: this.realTimeListeners.size,
      });
    };
  }

  /**
   * Get all user notification histories (for admin/analytics)
   */
  async getAllUserNotificationHistories(): Promise<Map<string, UserNotificationHistory>> {
    const timer = createPerformanceTimer('get_all_user_histories');
    
    try {
      const histories = this.storage.getAllUserNotificationHistories();

      const duration = timer.end(true, null, { userCount: histories.size });
      
      this.logger.info('all_user_histories_retrieved', 'All user notification histories retrieved', {
        userCount: histories.size,
      });

      return histories;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error);
      this.logger.error('all_user_histories_error', 'Failed to retrieve all user notification histories', gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Clear delivery tracking data
   */
  clearDeliveryData(): void {
    this.storage.clear();
    this.realTimeListeners.clear();
    this.logger.info('delivery_data_cleared', 'All delivery tracking data cleared');
  }

  /**
   * Initialize channel statistics
   */
  private initChannelStats(): ChannelStats {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      averageDeliveryTime: 0,
    };
  }

  /**
   * Map Gupshup status to standard status
   */
  private mapGupshupStatus(gupshupStatus: string): DeliveryStatus['status'] {
    switch (gupshupStatus.toLowerCase()) {
      case 'sent':
      case 'submitted':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
      case 'rejected':
      case 'error':
        return 'failed';
      default:
        this.logger.warn('unknown_status', 'Unknown Gupshup status received', { status: gupshupStatus });
        return 'sent'; // Default to sent for unknown statuses
    }
  }

  /**
   * Validate webhook signature (placeholder implementation)
   */
  private validateWebhookSignature(payload: GupshupWebhook): boolean {
    // In production, this would validate HMAC signature
    // For now, just return true if webhook secret is configured
    return !!this.webhookSecret;
  }

  /**
   * Mask phone number for logging privacy
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    const middle = '*'.repeat(phoneNumber.length - 5);
    return `${start}${middle}${end}`;
  }

  /**
   * Log successful delivery
   */
  private logDeliverySuccess(messageId: string, delivery?: DeliveryStatus): void {
    if (delivery) {
      const deliveryTime = Date.now() - delivery.timestamp.getTime();
      this.logger.info('delivery_success', 'Message delivered successfully', {
        messageId,
        channel: delivery.channel,
        userId: delivery.userId,
        deliveryTime,
      });
    }
  }

  /**
   * Log delivery failure
   */
  private logDeliveryFailure(messageId: string, delivery?: DeliveryStatus, errorInfo?: { code?: string; message?: string }): void {
    this.logger.warn('delivery_failure', 'Message delivery failed', {
      messageId,
      channel: delivery?.channel,
      userId: delivery?.userId,
      errorCode: errorInfo?.code,
      errorMessage: errorInfo?.message,
      retryCount: delivery?.retryCount,
    });
  }

  /**
   * Emit real-time status update to all listeners
   */
  private emitRealTimeUpdate(update: RealTimeStatusUpdate): void {
    try {
      for (const listener of this.realTimeListeners) {
        try {
          listener(update);
        } catch (error) {
          this.logger.error('realtime_listener_error', 'Error in real-time update listener', {
            messageId: update.messageId,
            userId: update.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.debug('realtime_update_emitted', 'Real-time update emitted', {
        messageId: update.messageId,
        userId: update.userId,
        status: update.status,
        listenerCount: this.realTimeListeners.size,
      });

    } catch (error) {
      this.logger.error('realtime_emit_error', 'Failed to emit real-time update', {
        messageId: update.messageId,
        userId: update.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Singleton instance for global use
 */
let deliveryTrackerInstance: DeliveryTracker | null = null;

export function getDeliveryTracker(): DeliveryTracker {
  if (!deliveryTrackerInstance) {
    deliveryTrackerInstance = new DeliveryTracker();
  }
  return deliveryTrackerInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearDeliveryTrackerInstance(): void {
  deliveryTrackerInstance = null;
}