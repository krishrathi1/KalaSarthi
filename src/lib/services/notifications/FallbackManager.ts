/**
 * Intelligent Fallback Manager for Gupshup Notifications
 * Handles automatic WhatsApp to SMS fallback logic with decision engine
 */

import { GupshupError, GupshupErrorCode, ErrorCategory, RetryAction } from './GupshupErrorHandler';
import { getGupshupLogger, GupshupLogger } from './GupshupLogger';

export interface FallbackDecision {
  shouldFallback: boolean;
  reason: string;
  fallbackChannel: 'sms' | 'none';
  delay?: number;
}

export interface FallbackAttempt {
  originalChannel: 'whatsapp' | 'sms';
  fallbackChannel: 'sms' | 'none';
  originalError: GupshupError;
  timestamp: Date;
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

export interface FallbackStats {
  totalAttempts: number;
  successfulFallbacks: number;
  failedFallbacks: number;
  fallbackRate: number;
  commonFailureReasons: Record<string, number>;
  averageSuccessRate: number;
}

export interface FallbackConfig {
  enableAutoFallback: boolean;
  maxFallbackAttempts: number;
  fallbackDelay: number;
  whatsappToSmsEnabled: boolean;
  trackingEnabled: boolean;
  fallbackRules: FallbackRule[];
}

export interface FallbackRule {
  errorCode: GupshupErrorCode;
  errorCategory: ErrorCategory;
  shouldFallback: boolean;
  fallbackChannel: 'sms' | 'none';
  delay?: number;
  maxAttempts?: number;
}

/**
 * Default fallback rules for different error scenarios
 */
export const DEFAULT_FALLBACK_RULES: FallbackRule[] = [
  // WhatsApp user errors - fallback to SMS
  {
    errorCode: GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN,
    errorCategory: ErrorCategory.USER_ERROR,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 0,
  },
  {
    errorCode: GupshupErrorCode.WHATSAPP_USER_BLOCKED,
    errorCategory: ErrorCategory.USER_ERROR,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 0,
  },
  
  // WhatsApp service errors - fallback to SMS
  {
    errorCode: GupshupErrorCode.WHATSAPP_BUSINESS_ACCOUNT_RESTRICTED,
    errorCategory: ErrorCategory.CONFIGURATION,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 1000,
  },
  
  // Rate limiting - delay and fallback
  {
    errorCode: GupshupErrorCode.RATE_LIMIT_EXCEEDED,
    errorCategory: ErrorCategory.RATE_LIMITING,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 5000,
  },
  
  // Network/service errors - retry first, then fallback
  {
    errorCode: GupshupErrorCode.NETWORK_ERROR,
    errorCategory: ErrorCategory.NETWORK,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 2000,
    maxAttempts: 1,
  },
  {
    errorCode: GupshupErrorCode.SERVICE_UNAVAILABLE,
    errorCategory: ErrorCategory.SERVICE,
    shouldFallback: true,
    fallbackChannel: 'sms',
    delay: 3000,
    maxAttempts: 1,
  },
  
  // Template errors - no fallback (need to fix template)
  {
    errorCode: GupshupErrorCode.INVALID_TEMPLATE,
    errorCategory: ErrorCategory.VALIDATION,
    shouldFallback: false,
    fallbackChannel: 'none',
  },
  {
    errorCode: GupshupErrorCode.TEMPLATE_NOT_APPROVED,
    errorCategory: ErrorCategory.VALIDATION,
    shouldFallback: false,
    fallbackChannel: 'none',
  },
  
  // Authentication errors - no fallback (need to fix config)
  {
    errorCode: GupshupErrorCode.UNAUTHORIZED,
    errorCategory: ErrorCategory.AUTHENTICATION,
    shouldFallback: false,
    fallbackChannel: 'none',
  },
  {
    errorCode: GupshupErrorCode.FORBIDDEN,
    errorCategory: ErrorCategory.AUTHENTICATION,
    shouldFallback: false,
    fallbackChannel: 'none',
  },
  
  // SMS DND - no fallback possible
  {
    errorCode: GupshupErrorCode.SMS_DND_NUMBER,
    errorCategory: ErrorCategory.USER_ERROR,
    shouldFallback: false,
    fallbackChannel: 'none',
  },
];

/**
 * Fallback Manager class
 */
export class FallbackManager {
  private config: FallbackConfig;
  private logger: GupshupLogger;
  private fallbackAttempts: FallbackAttempt[] = [];
  private maxStoredAttempts = 1000;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = {
      enableAutoFallback: true,
      maxFallbackAttempts: 2,
      fallbackDelay: 1000,
      whatsappToSmsEnabled: true,
      trackingEnabled: true,
      fallbackRules: DEFAULT_FALLBACK_RULES,
      ...config,
    };
    
    this.logger = getGupshupLogger();
    
    this.logger.info('fallback_manager_init', 'Fallback manager initialized', {
      autoFallbackEnabled: this.config.enableAutoFallback,
      maxAttempts: this.config.maxFallbackAttempts,
      rulesCount: this.config.fallbackRules.length,
    });
  }

  /**
   * Determine if and how to fallback based on error
   */
  decideFallback(
    error: GupshupError,
    originalChannel: 'whatsapp' | 'sms',
    attemptCount: number = 0
  ): FallbackDecision {
    // Check if auto fallback is enabled
    if (!this.config.enableAutoFallback) {
      return {
        shouldFallback: false,
        reason: 'Auto fallback is disabled',
        fallbackChannel: 'none',
      };
    }

    // Check if we've exceeded max attempts
    if (attemptCount >= this.config.maxFallbackAttempts) {
      return {
        shouldFallback: false,
        reason: `Maximum fallback attempts (${this.config.maxFallbackAttempts}) exceeded`,
        fallbackChannel: 'none',
      };
    }

    // SMS cannot fallback further
    if (originalChannel === 'sms') {
      return {
        shouldFallback: false,
        reason: 'SMS is the final fallback channel',
        fallbackChannel: 'none',
      };
    }

    // Find matching fallback rule
    const rule = this.findFallbackRule(error);
    if (!rule) {
      // Default fallback behavior for unknown errors
      if (error.category === ErrorCategory.USER_ERROR || 
          error.category === ErrorCategory.NETWORK ||
          error.category === ErrorCategory.SERVICE) {
        return {
          shouldFallback: true,
          reason: 'Default fallback for user/network/service errors',
          fallbackChannel: 'sms',
          delay: this.config.fallbackDelay,
        };
      }

      return {
        shouldFallback: false,
        reason: 'No fallback rule found and error category not eligible for default fallback',
        fallbackChannel: 'none',
      };
    }

    // Check rule-specific attempt limits
    if (rule.maxAttempts && attemptCount >= rule.maxAttempts) {
      return {
        shouldFallback: false,
        reason: `Rule-specific max attempts (${rule.maxAttempts}) exceeded`,
        fallbackChannel: 'none',
      };
    }

    return {
      shouldFallback: rule.shouldFallback,
      reason: `Matched rule for ${error.code}`,
      fallbackChannel: rule.fallbackChannel,
      delay: rule.delay !== undefined ? rule.delay : this.config.fallbackDelay,
    };
  }

  /**
   * Record a fallback attempt for tracking and analytics
   */
  recordFallbackAttempt(attempt: Omit<FallbackAttempt, 'timestamp'>): void {
    if (!this.config.trackingEnabled) {
      return;
    }

    const fullAttempt: FallbackAttempt = {
      ...attempt,
      timestamp: new Date(),
    };

    this.fallbackAttempts.unshift(fullAttempt);
    
    // Limit stored attempts
    if (this.fallbackAttempts.length > this.maxStoredAttempts) {
      this.fallbackAttempts = this.fallbackAttempts.slice(0, this.maxStoredAttempts);
    }

    this.logger.info('fallback_attempt_recorded', 'Fallback attempt recorded', {
      originalChannel: attempt.originalChannel,
      fallbackChannel: attempt.fallbackChannel,
      success: attempt.success,
      errorCode: attempt.originalError.code,
      messageId: attempt.messageId,
    });
  }

  /**
   * Get fallback statistics and success rates
   */
  getFallbackStats(timeRange?: { start: Date; end: Date }): FallbackStats {
    let attempts = this.fallbackAttempts;

    // Filter by time range if provided
    if (timeRange) {
      attempts = attempts.filter(
        attempt => attempt.timestamp >= timeRange.start && attempt.timestamp <= timeRange.end
      );
    }

    const totalAttempts = attempts.length;
    const successfulFallbacks = attempts.filter(a => a.success).length;
    const failedFallbacks = totalAttempts - successfulFallbacks;
    const fallbackRate = totalAttempts > 0 ? (successfulFallbacks / totalAttempts) * 100 : 0;

    // Count common failure reasons
    const commonFailureReasons: Record<string, number> = {};
    attempts.forEach(attempt => {
      const reason = attempt.originalError.code;
      commonFailureReasons[reason] = (commonFailureReasons[reason] || 0) + 1;
    });

    return {
      totalAttempts,
      successfulFallbacks,
      failedFallbacks,
      fallbackRate,
      commonFailureReasons,
      averageSuccessRate: fallbackRate,
    };
  }

  /**
   * Get recent fallback attempts for monitoring
   */
  getRecentFallbackAttempts(limit: number = 10): FallbackAttempt[] {
    return this.fallbackAttempts.slice(0, limit);
  }

  /**
   * Update fallback configuration
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('fallback_config_updated', 'Fallback configuration updated', {
      autoFallbackEnabled: this.config.enableAutoFallback,
      maxAttempts: this.config.maxFallbackAttempts,
      rulesCount: this.config.fallbackRules.length,
    });
  }

  /**
   * Add or update a fallback rule
   */
  addFallbackRule(rule: FallbackRule): void {
    // Remove existing rule for the same error code if it exists
    this.config.fallbackRules = this.config.fallbackRules.filter(
      r => r.errorCode !== rule.errorCode
    );
    
    // Add the new rule
    this.config.fallbackRules.push(rule);
    
    this.logger.info('fallback_rule_added', 'Fallback rule added/updated', {
      errorCode: rule.errorCode,
      shouldFallback: rule.shouldFallback,
      fallbackChannel: rule.fallbackChannel,
    });
  }

  /**
   * Remove a fallback rule
   */
  removeFallbackRule(errorCode: GupshupErrorCode): void {
    const originalLength = this.config.fallbackRules.length;
    this.config.fallbackRules = this.config.fallbackRules.filter(
      r => r.errorCode !== errorCode
    );
    
    if (this.config.fallbackRules.length < originalLength) {
      this.logger.info('fallback_rule_removed', 'Fallback rule removed', {
        errorCode,
      });
    }
  }

  /**
   * Clear fallback tracking data
   */
  clearFallbackData(): void {
    this.fallbackAttempts = [];
    this.logger.info('fallback_data_cleared', 'Fallback tracking data cleared');
  }

  /**
   * Find the appropriate fallback rule for an error
   */
  private findFallbackRule(error: GupshupError): FallbackRule | null {
    // First, try to find a rule by exact error code match
    let rule = this.config.fallbackRules.find(r => r.errorCode === error.code);
    
    // If no exact match, try to find by error category
    if (!rule) {
      rule = this.config.fallbackRules.find(r => r.errorCategory === error.category);
    }
    
    return rule || null;
  }

  /**
   * Check if fallback is enabled for a specific channel combination
   */
  isFallbackEnabled(from: 'whatsapp' | 'sms', to: 'sms' | 'none'): boolean {
    if (!this.config.enableAutoFallback) {
      return false;
    }

    if (from === 'whatsapp' && to === 'sms') {
      return this.config.whatsappToSmsEnabled;
    }

    return false;
  }

  /**
   * Get current fallback configuration
   */
  getConfig(): FallbackConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance for global use
 */
let fallbackManagerInstance: FallbackManager | null = null;

export function getFallbackManager(): FallbackManager {
  if (!fallbackManagerInstance) {
    fallbackManagerInstance = new FallbackManager();
  }
  return fallbackManagerInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearFallbackManagerInstance(): void {
  fallbackManagerInstance = null;
}