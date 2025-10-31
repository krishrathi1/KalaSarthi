/**
 * Enhanced Rate Limiting and Quota Management for Gupshup Notification System
 * 
 * Provides comprehensive rate limiting, daily quota tracking, intelligent scheduling,
 * and alerts for WhatsApp and SMS APIs
 */

import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import { getGupshupLogger } from './GupshupLogger';
import { GupshupError, GupshupErrorCode, handleGupshupError } from './GupshupErrorHandler';

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
  quotaUsed: number;
  quotaRemaining: number;
  dailyQuotaUsed: number;
  dailyQuotaRemaining: number;
}

export interface QuotaAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  channel: 'whatsapp' | 'sms' | 'daily';
  threshold: number;
  currentUsage: number;
  maxQuota: number;
  timestamp: Date;
  message: string;
}

export interface QuotaUsageStats {
  whatsapp: {
    perSecondUsed: number;
    perSecondLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    utilizationPercentage: number;
  };
  sms: {
    perSecondUsed: number;
    perSecondLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    utilizationPercentage: number;
  };
  daily: {
    totalUsed: number;
    totalLimit: number;
    utilizationPercentage: number;
  };
  lastResetAt: Date;
  nextResetAt: Date;
}

export interface SchedulingRecommendation {
  shouldSchedule: boolean;
  recommendedDelay: number;
  reason: string;
  priority: 'immediate' | 'delayed' | 'scheduled';
  estimatedDeliveryTime: Date;
}

/**
 * Enhanced Rate Limiter with quota management and intelligent scheduling
 */
export class RateLimitManager {
  private config: GupshupConfig;
  private logger = getGupshupLogger();

  // Rate limiting tokens
  private whatsappTokens: number;
  private smsTokens: number;
  private lastWhatsappRefill: Date;
  private lastSmsRefill: Date;

  // Daily quota tracking
  private dailyQuotaUsage = {
    whatsapp: 0,
    sms: 0,
    total: 0,
    date: new Date().toDateString(),
  };

  // Quota alerts
  private quotaAlerts: QuotaAlert[] = [];
  private alertThresholds = {
    warning: 0.75,   // 75%
    critical: 0.90,  // 90%
    exceeded: 1.0,   // 100%
  };

  // Scheduling optimization
  private messageScheduleQueue: Array<{
    messageId: string;
    channel: 'whatsapp' | 'sms';
    scheduledFor: Date;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    rateLimitHits: 0,
    quotaExceeded: 0,
    averageWaitTime: 0,
    lastOptimizationAt: new Date(),
  };

  constructor(config?: GupshupConfig) {
    this.config = config || getGupshupConfig();
    this.whatsappTokens = this.config.rateLimit.whatsappPerSecond;
    this.smsTokens = this.config.rateLimit.smsPerSecond;
    this.lastWhatsappRefill = new Date();
    this.lastSmsRefill = new Date();

    // Initialize daily quota tracking
    this.initializeDailyQuota();

    // Start periodic tasks
    this.startPeriodicTasks();

    this.logger.info('rate_limit_manager_init', 'Rate limit manager initialized', {
      whatsappPerSecond: this.config.rateLimit.whatsappPerSecond,
      smsPerSecond: this.config.rateLimit.smsPerSecond,
      dailyLimit: this.config.rateLimit.dailyLimit,
      alertThresholds: this.alertThresholds,
    });
  }

  /**
   * Check if WhatsApp API call is allowed with quota validation
   */
  async canSendWhatsApp(): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo; recommendation?: SchedulingRecommendation }> {
    this.refillTokens();
    this.performanceMetrics.totalRequests++;

    // Check daily quota first
    const dailyQuotaCheck = this.checkDailyQuota('whatsapp');
    if (!dailyQuotaCheck.allowed) {
      this.performanceMetrics.quotaExceeded++;
      return {
        allowed: false,
        rateLimitInfo: this.getWhatsAppRateLimit(),
        recommendation: {
          shouldSchedule: true,
          recommendedDelay: this.getTimeUntilQuotaReset(),
          reason: 'Daily quota exceeded',
          priority: 'scheduled',
          estimatedDeliveryTime: this.getNextQuotaResetTime(),
        },
      };
    }

    // Check rate limit
    const hasTokens = this.whatsappTokens > 0;
    if (!hasTokens) {
      this.performanceMetrics.rateLimitHits++;
      const waitTime = this.getTimeUntilTokenRefill('whatsapp');
      
      return {
        allowed: false,
        rateLimitInfo: this.getWhatsAppRateLimit(),
        recommendation: {
          shouldSchedule: true,
          recommendedDelay: waitTime,
          reason: 'Rate limit exceeded',
          priority: 'delayed',
          estimatedDeliveryTime: new Date(Date.now() + waitTime),
        },
      };
    }

    return {
      allowed: true,
      rateLimitInfo: this.getWhatsAppRateLimit(),
    };
  }

  /**
   * Check if SMS API call is allowed with quota validation
   */
  async canSendSMS(): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo; recommendation?: SchedulingRecommendation }> {
    this.refillTokens();
    this.performanceMetrics.totalRequests++;

    // Check daily quota first
    const dailyQuotaCheck = this.checkDailyQuota('sms');
    if (!dailyQuotaCheck.allowed) {
      this.performanceMetrics.quotaExceeded++;
      return {
        allowed: false,
        rateLimitInfo: this.getSMSRateLimit(),
        recommendation: {
          shouldSchedule: true,
          recommendedDelay: this.getTimeUntilQuotaReset(),
          reason: 'Daily quota exceeded',
          priority: 'scheduled',
          estimatedDeliveryTime: this.getNextQuotaResetTime(),
        },
      };
    }

    // Check rate limit
    const hasTokens = this.smsTokens > 0;
    if (!hasTokens) {
      this.performanceMetrics.rateLimitHits++;
      const waitTime = this.getTimeUntilTokenRefill('sms');
      
      return {
        allowed: false,
        rateLimitInfo: this.getSMSRateLimit(),
        recommendation: {
          shouldSchedule: true,
          recommendedDelay: waitTime,
          reason: 'Rate limit exceeded',
          priority: 'delayed',
          estimatedDeliveryTime: new Date(Date.now() + waitTime),
        },
      };
    }

    return {
      allowed: true,
      rateLimitInfo: this.getSMSRateLimit(),
    };
  }

  /**
   * Consume a WhatsApp token and update quota
   */
  async consumeWhatsAppToken(): Promise<boolean> {
    const check = await this.canSendWhatsApp();
    if (!check.allowed) {
      return false;
    }

    this.whatsappTokens--;
    this.dailyQuotaUsage.whatsapp++;
    this.dailyQuotaUsage.total++;

    // Check for quota alerts
    await this.checkAndTriggerQuotaAlerts();

    this.logger.debug('whatsapp_token_consumed', 'WhatsApp token consumed', {
      remainingTokens: this.whatsappTokens,
      dailyUsage: this.dailyQuotaUsage.whatsapp,
      totalDailyUsage: this.dailyQuotaUsage.total,
    });

    return true;
  }

  /**
   * Consume an SMS token and update quota
   */
  async consumeSMSToken(): Promise<boolean> {
    const check = await this.canSendSMS();
    if (!check.allowed) {
      return false;
    }

    this.smsTokens--;
    this.dailyQuotaUsage.sms++;
    this.dailyQuotaUsage.total++;

    // Check for quota alerts
    await this.checkAndTriggerQuotaAlerts();

    this.logger.debug('sms_token_consumed', 'SMS token consumed', {
      remainingTokens: this.smsTokens,
      dailyUsage: this.dailyQuotaUsage.sms,
      totalDailyUsage: this.dailyQuotaUsage.total,
    });

    return true;
  }

  /**
   * Get intelligent scheduling recommendation for message delivery
   */
  async getSchedulingRecommendation(
    channel: 'whatsapp' | 'sms',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<SchedulingRecommendation> {
    // Validate parameters
    if (!channel || !['whatsapp', 'sms'].includes(channel)) {
      throw handleGupshupError(
        new Error('Invalid channel. Must be "whatsapp" or "sms"'),
        { channel, priority }
      );
    }

    if (!priority || !['high', 'medium', 'low'].includes(priority)) {
      throw handleGupshupError(
        new Error('Invalid priority. Must be "high", "medium", or "low"'),
        { channel, priority }
      );
    }
    const canSend = channel === 'whatsapp' 
      ? await this.canSendWhatsApp()
      : await this.canSendSMS();

    if (canSend.allowed) {
      return {
        shouldSchedule: false,
        recommendedDelay: 0,
        reason: 'Can send immediately',
        priority: 'immediate',
        estimatedDeliveryTime: new Date(),
      };
    }

    // If we have a recommendation from the rate limit check, use it
    if (canSend.recommendation) {
      return canSend.recommendation;
    }

    // Calculate optimal scheduling based on current load and priority
    const optimalDelay = this.calculateOptimalDelay(channel, priority);
    
    return {
      shouldSchedule: true,
      recommendedDelay: optimalDelay,
      reason: 'Optimizing for better delivery success rate',
      priority: priority === 'high' ? 'delayed' : 'scheduled',
      estimatedDeliveryTime: new Date(Date.now() + optimalDelay),
    };
  }

  /**
   * Schedule message for optimal delivery time
   */
  async scheduleMessage(
    messageId: string,
    channel: 'whatsapp' | 'sms',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{ scheduled: boolean; scheduledFor: Date; reason: string }> {
    const recommendation = await this.getSchedulingRecommendation(channel, priority);
    
    if (!recommendation.shouldSchedule) {
      return {
        scheduled: false,
        scheduledFor: new Date(),
        reason: 'Can send immediately',
      };
    }

    // Add to schedule queue
    this.messageScheduleQueue.push({
      messageId,
      channel,
      scheduledFor: recommendation.estimatedDeliveryTime,
      priority,
    });

    // Sort by scheduled time and priority
    this.messageScheduleQueue.sort((a, b) => {
      const timeDiff = a.scheduledFor.getTime() - b.scheduledFor.getTime();
      if (timeDiff !== 0) return timeDiff;
      
      // If same time, prioritize by message priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.logger.info('message_scheduled', 'Message scheduled for optimal delivery', {
      messageId,
      channel,
      priority,
      scheduledFor: recommendation.estimatedDeliveryTime,
      delay: recommendation.recommendedDelay,
      reason: recommendation.reason,
    });

    return {
      scheduled: true,
      scheduledFor: recommendation.estimatedDeliveryTime,
      reason: recommendation.reason,
    };
  }

  /**
   * Get messages ready for delivery
   */
  getReadyMessages(): Array<{
    messageId: string;
    channel: 'whatsapp' | 'sms';
    priority: 'high' | 'medium' | 'low';
  }> {
    const now = new Date();
    const readyMessages = this.messageScheduleQueue.filter(msg => msg.scheduledFor <= now);
    
    // Remove ready messages from queue
    this.messageScheduleQueue = this.messageScheduleQueue.filter(msg => msg.scheduledFor > now);
    
    return readyMessages.map(msg => ({
      messageId: msg.messageId,
      channel: msg.channel,
      priority: msg.priority,
    }));
  }

  /**
   * Get comprehensive quota usage statistics
   */
  getQuotaUsageStats(): QuotaUsageStats {
    const whatsappUtilization = (this.dailyQuotaUsage.whatsapp / this.config.rateLimit.dailyLimit) * 100;
    const smsUtilization = (this.dailyQuotaUsage.sms / this.config.rateLimit.dailyLimit) * 100;
    const totalUtilization = (this.dailyQuotaUsage.total / this.config.rateLimit.dailyLimit) * 100;

    return {
      whatsapp: {
        perSecondUsed: this.config.rateLimit.whatsappPerSecond - this.whatsappTokens,
        perSecondLimit: this.config.rateLimit.whatsappPerSecond,
        dailyUsed: this.dailyQuotaUsage.whatsapp,
        dailyLimit: this.config.rateLimit.dailyLimit,
        utilizationPercentage: whatsappUtilization,
      },
      sms: {
        perSecondUsed: this.config.rateLimit.smsPerSecond - this.smsTokens,
        perSecondLimit: this.config.rateLimit.smsPerSecond,
        dailyUsed: this.dailyQuotaUsage.sms,
        dailyLimit: this.config.rateLimit.dailyLimit,
        utilizationPercentage: smsUtilization,
      },
      daily: {
        totalUsed: this.dailyQuotaUsage.total,
        totalLimit: this.config.rateLimit.dailyLimit,
        utilizationPercentage: totalUtilization,
      },
      lastResetAt: new Date(this.dailyQuotaUsage.date),
      nextResetAt: this.getNextQuotaResetTime(),
    };
  }

  /**
   * Get current quota alerts
   */
  getQuotaAlerts(): QuotaAlert[] {
    return [...this.quotaAlerts];
  }

  /**
   * Clear quota alerts
   */
  clearQuotaAlerts(): void {
    this.quotaAlerts = [];
    this.logger.info('quota_alerts_cleared', 'All quota alerts cleared');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      rateLimitHitRate: this.performanceMetrics.totalRequests > 0 
        ? this.performanceMetrics.rateLimitHits / this.performanceMetrics.totalRequests 
        : 0,
      quotaExceededRate: this.performanceMetrics.totalRequests > 0 
        ? this.performanceMetrics.quotaExceeded / this.performanceMetrics.totalRequests 
        : 0,
    };
  }

  /**
   * Get WhatsApp rate limit information
   */
  getWhatsAppRateLimit(): RateLimitInfo {
    this.refillTokens();
    const dailyRemaining = this.config.rateLimit.dailyLimit - this.dailyQuotaUsage.total;
    
    return {
      remaining: this.whatsappTokens,
      resetTime: new Date(this.lastWhatsappRefill.getTime() + 1000),
      isLimited: this.whatsappTokens === 0,
      quotaUsed: this.dailyQuotaUsage.whatsapp,
      quotaRemaining: Math.max(0, dailyRemaining),
      dailyQuotaUsed: this.dailyQuotaUsage.total,
      dailyQuotaRemaining: Math.max(0, dailyRemaining),
    };
  }

  /**
   * Get SMS rate limit information
   */
  getSMSRateLimit(): RateLimitInfo {
    this.refillTokens();
    const dailyRemaining = this.config.rateLimit.dailyLimit - this.dailyQuotaUsage.total;
    
    return {
      remaining: this.smsTokens,
      resetTime: new Date(this.lastSmsRefill.getTime() + 1000),
      isLimited: this.smsTokens === 0,
      quotaUsed: this.dailyQuotaUsage.sms,
      quotaRemaining: Math.max(0, dailyRemaining),
      dailyQuotaUsed: this.dailyQuotaUsage.total,
      dailyQuotaRemaining: Math.max(0, dailyRemaining),
    };
  }

  /**
   * Reset daily quota (called at midnight)
   */
  resetDailyQuota(): void {
    const previousUsage = { ...this.dailyQuotaUsage };
    
    this.dailyQuotaUsage = {
      whatsapp: 0,
      sms: 0,
      total: 0,
      date: new Date().toDateString(),
    };

    // Clear quota alerts
    this.quotaAlerts = [];

    this.logger.info('daily_quota_reset', 'Daily quota reset completed', {
      previousUsage,
      newDate: this.dailyQuotaUsage.date,
    });
  }

  /**
   * Initialize daily quota tracking
   */
  private initializeDailyQuota(): void {
    const today = new Date().toDateString();
    if (this.dailyQuotaUsage.date !== today) {
      this.resetDailyQuota();
    }
  }

  /**
   * Check daily quota for specific channel
   */
  private checkDailyQuota(channel: 'whatsapp' | 'sms'): { allowed: boolean; remaining: number } {
    const totalRemaining = this.config.rateLimit.dailyLimit - this.dailyQuotaUsage.total;
    return {
      allowed: totalRemaining > 0,
      remaining: Math.max(0, totalRemaining),
    };
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = new Date();
    
    // Refill WhatsApp tokens
    const whatsappElapsed = now.getTime() - this.lastWhatsappRefill.getTime();
    if (whatsappElapsed >= 1000) {
      this.whatsappTokens = this.config.rateLimit.whatsappPerSecond;
      this.lastWhatsappRefill = now;
    }

    // Refill SMS tokens
    const smsElapsed = now.getTime() - this.lastSmsRefill.getTime();
    if (smsElapsed >= 1000) {
      this.smsTokens = this.config.rateLimit.smsPerSecond;
      this.lastSmsRefill = now;
    }
  }

  /**
   * Get time until token refill
   */
  private getTimeUntilTokenRefill(channel: 'whatsapp' | 'sms'): number {
    const now = Date.now();
    const lastRefill = channel === 'whatsapp' ? this.lastWhatsappRefill : this.lastSmsRefill;
    const nextRefill = lastRefill.getTime() + 1000;
    return Math.max(0, nextRefill - now);
  }

  /**
   * Get time until daily quota reset
   */
  private getTimeUntilQuotaReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Get next quota reset time
   */
  private getNextQuotaResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Calculate optimal delay for message delivery
   */
  private calculateOptimalDelay(channel: 'whatsapp' | 'sms', priority: 'high' | 'medium' | 'low'): number {
    const baseDelay = channel === 'whatsapp' ? 1000 : 100; // WhatsApp is more restrictive
    const priorityMultiplier = { high: 0.5, medium: 1, low: 2 };
    
    // Consider current queue length
    const queueLength = this.messageScheduleQueue.length;
    const queueDelay = queueLength * 100; // 100ms per queued message
    
    return baseDelay * priorityMultiplier[priority] + queueDelay;
  }

  /**
   * Check and trigger quota alerts
   */
  private async checkAndTriggerQuotaAlerts(): Promise<void> {
    const stats = this.getQuotaUsageStats();
    const alerts: QuotaAlert[] = [];

    // Check WhatsApp quota
    if (stats.whatsapp.utilizationPercentage >= this.alertThresholds.exceeded * 100) {
      alerts.push(this.createQuotaAlert('exceeded', 'whatsapp', stats.whatsapp.utilizationPercentage, 100));
    } else if (stats.whatsapp.utilizationPercentage >= this.alertThresholds.critical * 100) {
      alerts.push(this.createQuotaAlert('critical', 'whatsapp', stats.whatsapp.utilizationPercentage, 100));
    } else if (stats.whatsapp.utilizationPercentage >= this.alertThresholds.warning * 100) {
      alerts.push(this.createQuotaAlert('warning', 'whatsapp', stats.whatsapp.utilizationPercentage, 100));
    }

    // Check SMS quota
    if (stats.sms.utilizationPercentage >= this.alertThresholds.exceeded * 100) {
      alerts.push(this.createQuotaAlert('exceeded', 'sms', stats.sms.utilizationPercentage, 100));
    } else if (stats.sms.utilizationPercentage >= this.alertThresholds.critical * 100) {
      alerts.push(this.createQuotaAlert('critical', 'sms', stats.sms.utilizationPercentage, 100));
    } else if (stats.sms.utilizationPercentage >= this.alertThresholds.warning * 100) {
      alerts.push(this.createQuotaAlert('warning', 'sms', stats.sms.utilizationPercentage, 100));
    }

    // Check daily total quota
    if (stats.daily.utilizationPercentage >= this.alertThresholds.exceeded * 100) {
      alerts.push(this.createQuotaAlert('exceeded', 'daily', stats.daily.utilizationPercentage, 100));
    } else if (stats.daily.utilizationPercentage >= this.alertThresholds.critical * 100) {
      alerts.push(this.createQuotaAlert('critical', 'daily', stats.daily.utilizationPercentage, 100));
    } else if (stats.daily.utilizationPercentage >= this.alertThresholds.warning * 100) {
      alerts.push(this.createQuotaAlert('warning', 'daily', stats.daily.utilizationPercentage, 100));
    }

    // Add new alerts (avoid duplicates)
    for (const alert of alerts) {
      const existingAlert = this.quotaAlerts.find(
        a => a.type === alert.type && a.channel === alert.channel
      );
      
      if (!existingAlert) {
        this.quotaAlerts.push(alert);
        this.logger.warn('quota_alert_triggered', 'Quota alert triggered', {
          type: alert.type,
          channel: alert.channel,
          usage: alert.currentUsage,
          threshold: alert.threshold,
          message: alert.message,
        });
      }
    }
  }

  /**
   * Create quota alert
   */
  private createQuotaAlert(
    type: 'warning' | 'critical' | 'exceeded',
    channel: 'whatsapp' | 'sms' | 'daily',
    currentUsage: number,
    maxQuota: number
  ): QuotaAlert {
    const threshold = this.alertThresholds[type] * 100;
    
    let message: string;
    switch (type) {
      case 'warning':
        message = `${channel.toUpperCase()} quota usage is at ${currentUsage.toFixed(1)}% (warning threshold: ${threshold}%)`;
        break;
      case 'critical':
        message = `${channel.toUpperCase()} quota usage is at ${currentUsage.toFixed(1)}% (critical threshold: ${threshold}%)`;
        break;
      case 'exceeded':
        message = `${channel.toUpperCase()} quota has been exceeded (${currentUsage.toFixed(1)}%)`;
        break;
    }

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      channel,
      threshold,
      currentUsage,
      maxQuota,
      timestamp: new Date(),
      message,
    };
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Check for daily quota reset every hour
    setInterval(() => {
      this.initializeDailyQuota();
    }, 3600000); // 1 hour

    // Performance optimization every 5 minutes
    setInterval(() => {
      this.optimizePerformance();
    }, 300000); // 5 minutes

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // 1 hour
  }

  /**
   * Optimize performance based on usage patterns
   */
  private optimizePerformance(): void {
    const stats = this.getQuotaUsageStats();
    
    // Adjust alert thresholds based on usage patterns
    if (stats.daily.utilizationPercentage > 80) {
      // More aggressive throttling when approaching limits
      this.alertThresholds.warning = 0.65;
      this.alertThresholds.critical = 0.80;
    } else {
      // Normal thresholds
      this.alertThresholds.warning = 0.75;
      this.alertThresholds.critical = 0.90;
    }

    this.performanceMetrics.lastOptimizationAt = new Date();
    
    this.logger.debug('performance_optimization', 'Performance optimization completed', {
      dailyUtilization: stats.daily.utilizationPercentage,
      adjustedThresholds: this.alertThresholds,
      queueLength: this.messageScheduleQueue.length,
    });
  }

  /**
   * Clean up old alerts (older than 24 hours)
   */
  private cleanupOldAlerts(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialCount = this.quotaAlerts.length;
    
    this.quotaAlerts = this.quotaAlerts.filter(alert => alert.timestamp > oneDayAgo);
    
    const removedCount = initialCount - this.quotaAlerts.length;
    if (removedCount > 0) {
      this.logger.debug('quota_alerts_cleanup', 'Old quota alerts cleaned up', {
        removedCount,
        remainingCount: this.quotaAlerts.length,
      });
    }
  }
}

/**
 * Singleton instance for global use
 */
let rateLimitManagerInstance: RateLimitManager | null = null;

export function getRateLimitManager(): RateLimitManager {
  if (!rateLimitManagerInstance) {
    rateLimitManagerInstance = new RateLimitManager();
  }
  return rateLimitManagerInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearRateLimitManagerInstance(): void {
  rateLimitManagerInstance = null;
}