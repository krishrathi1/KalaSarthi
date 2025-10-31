/**
 * Rate Limiting and Quota Management for Gupshup Notification System
 * 
 * Provides comprehensive rate limiting for WhatsApp and SMS APIs,
 * daily quota tracking with alerts, and intelligent message scheduling
 */

import { getGupshupLogger } from './GupshupLogger';
import { GupshupError, GupshupErrorCode, handleGupshupError } from './GupshupErrorHandler';
import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';

export interface RateLimitConfig {
  whatsappPerSecond: number;
  whatsappPerMinute: number;
  whatsappPerHour: number;
  whatsappPerDay: number;
  smsPerSecond: number;
  smsPerMinute: number;
  smsPerHour: number;
  smsPerDay: number;
  burstAllowance: number;
  quotaWarningThreshold: number; // Percentage (e.g., 80 for 80%)
  quotaCriticalThreshold: number; // Percentage (e.g., 95 for 95%)
}

export interface RateLimitStatus {
  channel: 'whatsapp' | 'sms';
  isLimited: boolean;
  remaining: {
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  resetTimes: {
    perSecond: Date;
    perMinute: Date;
    perHour: Date;
    perDay: Date;
  };
  quotaUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  nextAvailableSlot?: Date;
}

export interface QuotaAlert {
  channel: 'whatsapp' | 'sms';
  alertType: 'warning' | 'critical' | 'exceeded';
  currentUsage: number;
  totalQuota: number;
  percentage: number;
  timestamp: Date;
  estimatedTimeToReset: number; // milliseconds
}

export interface SchedulingRecommendation {
  canSendNow: boolean;
  recommendedDelay: number; // milliseconds
  reason: string;
  alternativeChannel?: 'whatsapp' | 'sms';
  estimatedQueueTime: number;
}

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: Date;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private readonly refillInterval: number; // milliseconds

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = 1000; // 1 second
    this.tokens = capacity;
    this.lastRefill = new Date();
  }

  /**
   * Try to consume tokens from bucket
   */
  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available
   */
  getTimeUntilNextToken(): number {
    this.refill();
    
    if (this.tokens > 0) {
      return 0;
    }
    
    // Calculate time for next refill
    const timeSinceLastRefill = Date.now() - this.lastRefill.getTime();
    const nextRefillIn = this.refillInterval - (timeSinceLastRefill % this.refillInterval);
    
    return nextRefillIn;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = new Date();
    const timeSinceLastRefill = now.getTime() - this.lastRefill.getTime();
    
    if (timeSinceLastRefill >= this.refillInterval) {
      const intervalsElapsed = Math.floor(timeSinceLastRefill / this.refillInterval);
      const tokensToAdd = intervalsElapsed * (this.refillRate * this.refillInterval / 1000);
      
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = new Date(this.lastRefill.getTime() + (intervalsElapsed * this.refillInterval));
    }
  }

  /**
   * Reset bucket to full capacity
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = new Date();
  }
}

/**
 * Quota tracker for daily/hourly limits
 */
class QuotaTracker {
  private usage: Map<string, number> = new Map(); // period -> count
  private resetTimes: Map<string, Date> = new Map(); // period -> reset time

  /**
   * Record usage for a time period
   */
  recordUsage(period: string, count: number = 1): void {
    const currentUsage = this.usage.get(period) || 0;
    this.usage.set(period, currentUsage + count);
  }

  /**
   * Get current usage for a period
   */
  getUsage(period: string): number {
    this.cleanupExpiredPeriods();
    return this.usage.get(period) || 0;
  }

  /**
   * Check if quota is available
   */
  hasQuota(period: string, limit: number, requested: number = 1): boolean {
    const currentUsage = this.getUsage(period);
    return (currentUsage + requested) <= limit;
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota(period: string, limit: number): number {
    const currentUsage = this.getUsage(period);
    return Math.max(0, limit - currentUsage);
  }

  /**
   * Get quota usage percentage
   */
  getUsagePercentage(period: string, limit: number): number {
    const currentUsage = this.getUsage(period);
    return limit > 0 ? (currentUsage / limit) * 100 : 0;
  }

  /**
   * Set reset time for a period
   */
  setResetTime(period: string, resetTime: Date): void {
    this.resetTimes.set(period, resetTime);
  }

  /**
   * Get reset time for a period
   */
  getResetTime(period: string): Date | undefined {
    return this.resetTimes.get(period);
  }

  /**
   * Reset quota for a period
   */
  resetQuota(period: string): void {
    this.usage.delete(period);
    this.resetTimes.delete(period);
  }

  /**
   * Clean up expired periods
   */
  private cleanupExpiredPeriods(): void {
    const now = new Date();
    
    for (const [period, resetTime] of this.resetTimes.entries()) {
      if (resetTime <= now) {
        this.usage.delete(period);
        this.resetTimes.delete(period);
      }
    }
  }
}

/**
 * Comprehensive rate limiting and quota management system
 */
export class RateLimitManager {
  private config: RateLimitConfig;
  private gupshupConfig: GupshupConfig;
  private logger = getGupshupLogger();

  // Token buckets for different time windows
  private whatsappSecondBucket: TokenBucket;
  private whatsappMinuteBucket: TokenBucket;
  private smsSecondBucket: TokenBucket;
  private smsMinuteBucket: TokenBucket;

  // Quota trackers
  private whatsappQuotaTracker = new QuotaTracker();
  private smsQuotaTracker = new QuotaTracker();

  // Alert tracking
  private lastAlerts: Map<string, Date> = new Map();
  private readonly alertCooldown = 300000; // 5 minutes

  constructor(config?: RateLimitConfig) {
    this.gupshupConfig = getGupshupConfig();
    
    // Set default rate limit configuration
    this.config = config || {
      whatsappPerSecond: this.gupshupConfig.rateLimit.whatsappPerSecond || 10,
      whatsappPerMinute: 600, // 10 per second * 60
      whatsappPerHour: 36000, // 10 per second * 3600
      whatsappPerDay: this.gupshupConfig.rateLimit.dailyLimit || 100000,
      smsPerSecond: this.gupshupConfig.rateLimit.smsPerSecond || 20,
      smsPerMinute: 1200, // 20 per second * 60
      smsPerHour: 72000, // 20 per second * 3600
      smsPerDay: this.gupshupConfig.rateLimit.dailyLimit || 200000,
      burstAllowance: 5,
      quotaWarningThreshold: 80,
      quotaCriticalThreshold: 95,
    };

    // Initialize token buckets
    this.whatsappSecondBucket = new TokenBucket(
      this.config.whatsappPerSecond + this.config.burstAllowance,
      this.config.whatsappPerSecond
    );
    
    this.whatsappMinuteBucket = new TokenBucket(
      this.config.whatsappPerMinute,
      this.config.whatsappPerMinute / 60
    );

    this.smsSecondBucket = new TokenBucket(
      this.config.smsPerSecond + this.config.burstAllowance,
      this.config.smsPerSecond
    );
    
    this.smsMinuteBucket = new TokenBucket(
      this.config.smsPerMinute,
      this.config.smsPerMinute / 60
    );

    // Initialize quota reset times
    this.initializeQuotaResetTimes();

    this.logger.info('rate_limit_manager_init', 'Rate limit manager initialized', {
      whatsappPerSecond: this.config.whatsappPerSecond,
      whatsappPerDay: this.config.whatsappPerDay,
      smsPerSecond: this.config.smsPerSecond,
      smsPerDay: this.config.smsPerDay,
      burstAllowance: this.config.burstAllowance,
    });
  }

  /**
   * Check if message can be sent immediately
   */
  canSendMessage(channel: 'whatsapp' | 'sms', count: number = 1): boolean {
    const status = this.getRateLimitStatus(channel);
    
    // Check all rate limits
    return !status.isLimited && 
           status.remaining.perSecond >= count &&
           status.remaining.perMinute >= count &&
           status.remaining.perHour >= count &&
           status.remaining.perDay >= count;
  }

  /**
   * Consume rate limit tokens for a message
   */
  consumeRateLimit(channel: 'whatsapp' | 'sms', count: number = 1): boolean {
    try {
      if (!this.canSendMessage(channel, count)) {
        return false;
      }

      // Consume tokens from buckets
      if (channel === 'whatsapp') {
        if (!this.whatsappSecondBucket.consume(count) || 
            !this.whatsappMinuteBucket.consume(count)) {
          return false;
        }
      } else {
        if (!this.smsSecondBucket.consume(count) || 
            !this.smsMinuteBucket.consume(count)) {
          return false;
        }
      }

      // Record quota usage
      const now = new Date();
      const hourPeriod = this.getHourPeriod(now);
      const dayPeriod = this.getDayPeriod(now);

      if (channel === 'whatsapp') {
        this.whatsappQuotaTracker.recordUsage(hourPeriod, count);
        this.whatsappQuotaTracker.recordUsage(dayPeriod, count);
      } else {
        this.smsQuotaTracker.recordUsage(hourPeriod, count);
        this.smsQuotaTracker.recordUsage(dayPeriod, count);
      }

      // Check for quota alerts
      this.checkQuotaAlerts(channel);

      this.logger.debug('rate_limit_consumed', 'Rate limit tokens consumed', {
        channel,
        count,
        remaining: this.getRateLimitStatus(channel).remaining,
      });

      return true;

    } catch (error) {
      this.logger.error('rate_limit_consume_failed', 'Failed to consume rate limit', {
        channel,
        count,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get current rate limit status for a channel
   */
  getRateLimitStatus(channel: 'whatsapp' | 'sms'): RateLimitStatus {
    const now = new Date();
    const hourPeriod = this.getHourPeriod(now);
    const dayPeriod = this.getDayPeriod(now);

    let secondTokens: number;
    let minuteTokens: number;
    let nextSecondReset: Date;
    let nextMinuteReset: Date;
    let quotaTracker: QuotaTracker;
    let hourlyLimit: number;
    let dailyLimit: number;

    if (channel === 'whatsapp') {
      secondTokens = this.whatsappSecondBucket.getTokens();
      minuteTokens = this.whatsappMinuteBucket.getTokens();
      nextSecondReset = new Date(now.getTime() + this.whatsappSecondBucket.getTimeUntilNextToken());
      nextMinuteReset = new Date(now.getTime() + this.whatsappMinuteBucket.getTimeUntilNextToken());
      quotaTracker = this.whatsappQuotaTracker;
      hourlyLimit = this.config.whatsappPerHour;
      dailyLimit = this.config.whatsappPerDay;
    } else {
      secondTokens = this.smsSecondBucket.getTokens();
      minuteTokens = this.smsMinuteBucket.getTokens();
      nextSecondReset = new Date(now.getTime() + this.smsSecondBucket.getTimeUntilNextToken());
      nextMinuteReset = new Date(now.getTime() + this.smsMinuteBucket.getTimeUntilNextToken());
      quotaTracker = this.smsQuotaTracker;
      hourlyLimit = this.config.smsPerHour;
      dailyLimit = this.config.smsPerDay;
    }

    const hourlyUsage = quotaTracker.getUsage(hourPeriod);
    const dailyUsage = quotaTracker.getUsage(dayPeriod);

    const remaining = {
      perSecond: Math.floor(secondTokens),
      perMinute: Math.floor(minuteTokens),
      perHour: Math.max(0, hourlyLimit - hourlyUsage),
      perDay: Math.max(0, dailyLimit - dailyUsage),
    };

    const isLimited = remaining.perSecond <= 0 || 
                     remaining.perMinute <= 0 || 
                     remaining.perHour <= 0 || 
                     remaining.perDay <= 0;

    // Calculate next available slot
    let nextAvailableSlot: Date | undefined;
    if (isLimited) {
      const delays = [];
      if (remaining.perSecond <= 0) delays.push(nextSecondReset.getTime() - now.getTime());
      if (remaining.perMinute <= 0) delays.push(nextMinuteReset.getTime() - now.getTime());
      if (remaining.perHour <= 0) delays.push(this.getNextHourReset(now).getTime() - now.getTime());
      if (remaining.perDay <= 0) delays.push(this.getNextDayReset(now).getTime() - now.getTime());
      
      const minDelay = Math.min(...delays);
      nextAvailableSlot = new Date(now.getTime() + minDelay);
    }

    return {
      channel,
      isLimited,
      remaining,
      resetTimes: {
        perSecond: nextSecondReset,
        perMinute: nextMinuteReset,
        perHour: this.getNextHourReset(now),
        perDay: this.getNextDayReset(now),
      },
      quotaUsage: {
        used: dailyUsage,
        total: dailyLimit,
        percentage: quotaTracker.getUsagePercentage(dayPeriod, dailyLimit),
      },
      nextAvailableSlot,
    };
  }

  /**
   * Get intelligent scheduling recommendation
   */
  getSchedulingRecommendation(
    channel: 'whatsapp' | 'sms',
    messageCount: number = 1
  ): SchedulingRecommendation {
    const status = this.getRateLimitStatus(channel);
    const alternativeChannel = channel === 'whatsapp' ? 'sms' : 'whatsapp';
    const alternativeStatus = this.getRateLimitStatus(alternativeChannel);

    // Can send immediately
    if (this.canSendMessage(channel, messageCount)) {
      return {
        canSendNow: true,
        recommendedDelay: 0,
        reason: 'Rate limits allow immediate sending',
        estimatedQueueTime: 0,
      };
    }

    // Calculate recommended delay
    let recommendedDelay = 0;
    let reason = '';

    if (status.nextAvailableSlot) {
      recommendedDelay = status.nextAvailableSlot.getTime() - Date.now();
      reason = `Rate limit exceeded. Next available slot in ${Math.ceil(recommendedDelay / 1000)} seconds`;
    }

    // Check if alternative channel is better
    if (this.canSendMessage(alternativeChannel, messageCount)) {
      return {
        canSendNow: false,
        recommendedDelay,
        reason,
        alternativeChannel,
        estimatedQueueTime: 0,
      };
    }

    // Estimate queue time based on current usage
    const estimatedQueueTime = this.estimateQueueTime(channel, messageCount);

    return {
      canSendNow: false,
      recommendedDelay,
      reason,
      estimatedQueueTime,
    };
  }

  /**
   * Check and trigger quota alerts
   */
  private checkQuotaAlerts(channel: 'whatsapp' | 'sms'): void {
    const status = this.getRateLimitStatus(channel);
    const percentage = status.quotaUsage.percentage;

    let alertType: 'warning' | 'critical' | 'exceeded' | null = null;

    if (percentage >= 100) {
      alertType = 'exceeded';
    } else if (percentage >= this.config.quotaCriticalThreshold) {
      alertType = 'critical';
    } else if (percentage >= this.config.quotaWarningThreshold) {
      alertType = 'warning';
    }

    if (alertType) {
      const alertKey = `${channel}_${alertType}`;
      const lastAlert = this.lastAlerts.get(alertKey);
      const now = new Date();

      // Check cooldown period
      if (!lastAlert || (now.getTime() - lastAlert.getTime()) > this.alertCooldown) {
        this.triggerQuotaAlert({
          channel,
          alertType,
          currentUsage: status.quotaUsage.used,
          totalQuota: status.quotaUsage.total,
          percentage,
          timestamp: now,
          estimatedTimeToReset: status.resetTimes.perDay.getTime() - now.getTime(),
        });

        this.lastAlerts.set(alertKey, now);
      }
    }
  }

  /**
   * Trigger quota alert
   */
  private triggerQuotaAlert(alert: QuotaAlert): void {
    this.logger.warn('quota_alert_triggered', 'Quota alert triggered', {
      channel: alert.channel,
      alertType: alert.alertType,
      percentage: alert.percentage.toFixed(1),
      currentUsage: alert.currentUsage,
      totalQuota: alert.totalQuota,
      timeToReset: Math.ceil(alert.estimatedTimeToReset / 1000 / 60), // minutes
    });

    // TODO: Integrate with external alerting system (email, Slack, etc.)
    // This could be extended to send notifications to administrators
  }

  /**
   * Estimate queue time for messages
   */
  private estimateQueueTime(channel: 'whatsapp' | 'sms', messageCount: number): number {
    const status = this.getRateLimitStatus(channel);
    
    // Simple estimation based on rate limits
    const ratePerSecond = channel === 'whatsapp' 
      ? this.config.whatsappPerSecond 
      : this.config.smsPerSecond;

    // If we have remaining capacity, estimate based on that
    if (status.remaining.perSecond > 0) {
      return Math.ceil(messageCount / Math.min(status.remaining.perSecond, ratePerSecond)) * 1000;
    }

    // Otherwise, wait for next reset plus processing time
    const nextReset = status.nextAvailableSlot?.getTime() || Date.now();
    const processingTime = Math.ceil(messageCount / ratePerSecond) * 1000;
    
    return (nextReset - Date.now()) + processingTime;
  }

  /**
   * Initialize quota reset times
   */
  private initializeQuotaResetTimes(): void {
    const now = new Date();
    
    // Set hourly reset times
    const nextHour = this.getNextHourReset(now);
    this.whatsappQuotaTracker.setResetTime(this.getHourPeriod(now), nextHour);
    this.smsQuotaTracker.setResetTime(this.getHourPeriod(now), nextHour);
    
    // Set daily reset times
    const nextDay = this.getNextDayReset(now);
    this.whatsappQuotaTracker.setResetTime(this.getDayPeriod(now), nextDay);
    this.smsQuotaTracker.setResetTime(this.getDayPeriod(now), nextDay);
  }

  /**
   * Get hour period key
   */
  private getHourPeriod(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  /**
   * Get day period key
   */
  private getDayPeriod(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  /**
   * Get next hour reset time
   */
  private getNextHourReset(date: Date): Date {
    const nextHour = new Date(date);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * Get next day reset time
   */
  private getNextDayReset(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  }

  /**
   * Reset all rate limits (for testing/maintenance)
   */
  resetAllLimits(): void {
    this.whatsappSecondBucket.reset();
    this.whatsappMinuteBucket.reset();
    this.smsSecondBucket.reset();
    this.smsMinuteBucket.reset();
    
    // Clear quota trackers
    this.whatsappQuotaTracker = new QuotaTracker();
    this.smsQuotaTracker = new QuotaTracker();
    
    // Reinitialize reset times
    this.initializeQuotaResetTimes();
    
    this.logger.info('rate_limits_reset', 'All rate limits have been reset');
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate token buckets with new limits
    this.whatsappSecondBucket = new TokenBucket(
      this.config.whatsappPerSecond + this.config.burstAllowance,
      this.config.whatsappPerSecond
    );
    
    this.whatsappMinuteBucket = new TokenBucket(
      this.config.whatsappPerMinute,
      this.config.whatsappPerMinute / 60
    );

    this.smsSecondBucket = new TokenBucket(
      this.config.smsPerSecond + this.config.burstAllowance,
      this.config.smsPerSecond
    );
    
    this.smsMinuteBucket = new TokenBucket(
      this.config.smsPerMinute,
      this.config.smsPerMinute / 60
    );

    this.logger.info('rate_limit_config_updated', 'Rate limit configuration updated', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Get comprehensive rate limit statistics
   */
  getStatistics(): {
    whatsapp: RateLimitStatus;
    sms: RateLimitStatus;
    config: RateLimitConfig;
    alerts: { channel: string; lastAlert: Date }[];
  } {
    const alerts = Array.from(this.lastAlerts.entries()).map(([key, date]) => ({
      channel: key,
      lastAlert: date,
    }));

    return {
      whatsapp: this.getRateLimitStatus('whatsapp'),
      sms: this.getRateLimitStatus('sms'),
      config: this.getConfig(),
      alerts,
    };
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