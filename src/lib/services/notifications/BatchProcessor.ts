/**
 * Batch Processing and Retry System for Gupshup Notification System
 * 
 * Provides efficient batch message processing, exponential backoff retry logic,
 * and dead letter queue management for permanently failed messages
 */

import { getGupshupLogger } from './GupshupLogger';
import { GupshupError, GupshupErrorCode, handleGupshupError } from './GupshupErrorHandler';
import { MessageQueue, QueuedMessage, ProcessingResult } from './MessageQueue';
import { RateLimitManager, getRateLimitManager } from './RateLimitManager';

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  maxConcurrentBatches: number;
  retryConfig: RetryConfig;
  deadLetterConfig: DeadLetterConfig;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrorCodes: string[];
  jitterEnabled: boolean;
}

export interface DeadLetterConfig {
  maxSize: number;
  retentionDays: number;
  alertThreshold: number;
  autoReprocessEnabled: boolean;
  reprocessIntervalHours: number;
}

export interface BatchResult {
  batchId: string;
  totalMessages: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  deadLetterCount: number;
  processingTimeMs: number;
  throughputPerSecond: number;
  errors: BatchError[];
}

export interface BatchError {
  messageId: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  retryCount: number;
}

export interface RetryAttempt {
  messageId: string;
  attemptNumber: number;
  scheduledAt: Date;
  executedAt?: Date;
  success: boolean;
  error?: GupshupError;
  nextRetryAt?: Date;
}

export interface DeadLetterMessage {
  originalMessage: QueuedMessage;
  failureReason: string;
  totalRetries: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  errorHistory: GupshupError[];
  canReprocess: boolean;
}

export interface BatchProcessingStats {
  totalBatchesProcessed: number;
  totalMessagesProcessed: number;
  averageBatchSize: number;
  averageProcessingTimeMs: number;
  successRate: number;
  retryRate: number;
  deadLetterRate: number;
  throughputPerMinute: number;
  lastProcessedAt?: Date;
}

/**
 * Exponential backoff retry handler
 */
class RetryHandler {
  private config: RetryConfig;
  private logger = getGupshupLogger();
  private retryAttempts: Map<string, RetryAttempt[]> = new Map();

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: GupshupError, currentRetryCount: number): boolean {
    // Check retry count limit
    if (currentRetryCount >= this.config.maxRetries) {
      return false;
    }

    // Check if error code is retryable
    if (this.config.retryableErrorCodes.length > 0) {
      return this.config.retryableErrorCodes.includes(error.code);
    }

    // Default retryable errors
    const retryableErrors = [
      GupshupErrorCode.RATE_LIMIT_EXCEEDED,
      GupshupErrorCode.SERVICE_UNAVAILABLE,
      GupshupErrorCode.TIMEOUT,
      GupshupErrorCode.NETWORK_ERROR,
      GupshupErrorCode.TEMPORARY_FAILURE,
    ];

    return retryableErrors.includes(error.code as GupshupErrorCode);
  }

  /**
   * Calculate next retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = this.config.baseDelayMs;
    const maxDelay = this.config.maxDelayMs;
    const multiplier = this.config.backoffMultiplier;

    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(multiplier, attemptNumber - 1);
    
    // Apply jitter if enabled
    if (this.config.jitterEnabled) {
      const jitter = Math.random() * 0.1; // ±10% jitter
      delay = delay * (1 + (jitter - 0.05));
    }

    // Cap at maximum delay
    return Math.min(delay, maxDelay);
  }

  /**
   * Schedule retry for a message
   */
  scheduleRetry(message: QueuedMessage, error: GupshupError): Date | null {
    const nextRetryCount = message.retryCount + 1;

    if (!this.isRetryable(error, nextRetryCount)) {
      this.logger.info('retry_not_scheduled', 'Message not eligible for retry', {
        messageId: message.id,
        retryCount: message.retryCount,
        maxRetries: this.config.maxRetries,
        errorCode: error.code,
      });
      return null;
    }

    const delay = this.calculateRetryDelay(nextRetryCount);
    const nextRetryAt = new Date(Date.now() + delay);

    // Record retry attempt
    const attempt: RetryAttempt = {
      messageId: message.id,
      attemptNumber: nextRetryCount,
      scheduledAt: nextRetryAt,
      success: false,
      error,
    };

    const attempts = this.retryAttempts.get(message.id) || [];
    attempts.push(attempt);
    this.retryAttempts.set(message.id, attempts);

    this.logger.info('retry_scheduled', 'Message scheduled for retry', {
      messageId: message.id,
      attemptNumber: nextRetryCount,
      delay,
      nextRetryAt,
      errorCode: error.code,
    });

    return nextRetryAt;
  }

  /**
   * Record successful retry
   */
  recordSuccess(messageId: string): void {
    const attempts = this.retryAttempts.get(messageId);
    if (attempts && attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      lastAttempt.success = true;
      lastAttempt.executedAt = new Date();
    }

    this.logger.info('retry_succeeded', 'Message retry succeeded', {
      messageId,
      totalAttempts: attempts?.length || 0,
    });
  }

  /**
   * Get retry history for a message
   */
  getRetryHistory(messageId: string): RetryAttempt[] {
    return this.retryAttempts.get(messageId) || [];
  }

  /**
   * Clean up old retry records
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [messageId, attempts] of this.retryAttempts.entries()) {
      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt.scheduledAt < cutoffTime) {
        this.retryAttempts.delete(messageId);
        cleanedCount++;
      }
    }

    this.logger.debug('retry_history_cleaned', 'Cleaned up old retry records', {
      cleanedCount,
      cutoffTime,
    });
  }
}

/**
 * Dead letter queue manager
 */
class DeadLetterManager {
  private config: DeadLetterConfig;
  private logger = getGupshupLogger();
  private deadLetterMessages: Map<string, DeadLetterMessage> = new Map();
  private reprocessTimer?: NodeJS.Timeout;

  constructor(config: DeadLetterConfig) {
    this.config = config;
    
    if (config.autoReprocessEnabled) {
      this.startAutoReprocessing();
    }
  }

  /**
   * Add message to dead letter queue
   */
  addToDeadLetter(
    message: QueuedMessage, 
    finalError: GupshupError, 
    errorHistory: GupshupError[]
  ): void {
    // Check capacity
    if (this.deadLetterMessages.size >= this.config.maxSize) {
      this.removeOldestMessage();
    }

    const now = new Date();
    const deadLetterMessage: DeadLetterMessage = {
      originalMessage: message,
      failureReason: finalError.message,
      totalRetries: message.retryCount,
      firstFailedAt: errorHistory.length > 0 ? new Date(now.getTime() - (errorHistory.length * 60000)) : now,
      lastFailedAt: now,
      errorHistory,
      canReprocess: this.isReprocessable(finalError),
    };

    this.deadLetterMessages.set(message.id, deadLetterMessage);

    this.logger.error('message_added_to_dlq', 'Message added to dead letter queue', {
      messageId: message.id,
      totalRetries: message.retryCount,
      finalErrorCode: finalError.code,
      canReprocess: deadLetterMessage.canReprocess,
      dlqSize: this.deadLetterMessages.size,
    });

    // Check alert threshold
    if (this.deadLetterMessages.size >= this.config.alertThreshold) {
      this.triggerAlert();
    }
  }

  /**
   * Get all dead letter messages
   */
  getDeadLetterMessages(): DeadLetterMessage[] {
    return Array.from(this.deadLetterMessages.values());
  }

  /**
   * Get reprocessable messages
   */
  getReprocessableMessages(): DeadLetterMessage[] {
    return this.getDeadLetterMessages().filter(msg => msg.canReprocess);
  }

  /**
   * Reprocess a specific message
   */
  reprocessMessage(messageId: string): QueuedMessage | null {
    const deadLetterMessage = this.deadLetterMessages.get(messageId);
    if (!deadLetterMessage || !deadLetterMessage.canReprocess) {
      return null;
    }

    // Reset retry count and update metadata
    const message = { ...deadLetterMessage.originalMessage };
    message.retryCount = 0;
    message.metadata.updatedAt = new Date();
    message.metadata.tags.push('reprocessed_from_dlq');

    // Remove from dead letter queue
    this.deadLetterMessages.delete(messageId);

    this.logger.info('message_reprocessed_from_dlq', 'Message reprocessed from dead letter queue', {
      messageId,
      originalFailureReason: deadLetterMessage.failureReason,
    });

    return message;
  }

  /**
   * Remove message from dead letter queue
   */
  removeMessage(messageId: string): boolean {
    const removed = this.deadLetterMessages.delete(messageId);
    if (removed) {
      this.logger.info('message_removed_from_dlq', 'Message removed from dead letter queue', {
        messageId,
      });
    }
    return removed;
  }

  /**
   * Clean up expired messages
   */
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [messageId, deadLetterMessage] of this.deadLetterMessages.entries()) {
      if (deadLetterMessage.lastFailedAt < cutoffTime) {
        this.deadLetterMessages.delete(messageId);
        cleanedCount++;
      }
    }

    this.logger.info('dlq_cleanup_completed', 'Dead letter queue cleanup completed', {
      cleanedCount,
      remainingCount: this.deadLetterMessages.size,
      cutoffTime,
    });
  }

  /**
   * Get dead letter queue statistics
   */
  getStatistics(): {
    totalMessages: number;
    reprocessableMessages: number;
    oldestMessage?: Date;
    newestMessage?: Date;
    averageRetries: number;
  } {
    const messages = this.getDeadLetterMessages();
    
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        reprocessableMessages: 0,
        averageRetries: 0,
      };
    }

    const reprocessableCount = messages.filter(msg => msg.canReprocess).length;
    const totalRetries = messages.reduce((sum, msg) => sum + msg.totalRetries, 0);
    const averageRetries = totalRetries / messages.length;

    const dates = messages.map(msg => msg.lastFailedAt);
    const oldestMessage = new Date(Math.min(...dates.map(d => d.getTime())));
    const newestMessage = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      totalMessages: messages.length,
      reprocessableMessages: reprocessableCount,
      oldestMessage,
      newestMessage,
      averageRetries,
    };
  }

  /**
   * Check if error is reprocessable
   */
  private isReprocessable(error: GupshupError): boolean {
    const nonReprocessableErrors = [
      GupshupErrorCode.INVALID_PHONE_NUMBER,
      GupshupErrorCode.INVALID_TEMPLATE,
      GupshupErrorCode.INVALID_PARAMETERS,
      GupshupErrorCode.UNAUTHORIZED,
      GupshupErrorCode.FORBIDDEN,
    ];

    return !nonReprocessableErrors.includes(error.code as GupshupErrorCode);
  }

  /**
   * Remove oldest message to make space
   */
  private removeOldestMessage(): void {
    let oldestMessageId: string | null = null;
    let oldestDate: Date | null = null;

    for (const [messageId, deadLetterMessage] of this.deadLetterMessages.entries()) {
      if (!oldestDate || deadLetterMessage.firstFailedAt < oldestDate) {
        oldestDate = deadLetterMessage.firstFailedAt;
        oldestMessageId = messageId;
      }
    }

    if (oldestMessageId) {
      this.deadLetterMessages.delete(oldestMessageId);
      this.logger.warn('dlq_oldest_message_removed', 'Removed oldest message from DLQ due to capacity', {
        removedMessageId: oldestMessageId,
        removedDate: oldestDate,
      });
    }
  }

  /**
   * Trigger alert for high dead letter queue size
   */
  private triggerAlert(): void {
    this.logger.warn('dlq_alert_triggered', 'Dead letter queue alert triggered', {
      currentSize: this.deadLetterMessages.size,
      threshold: this.config.alertThreshold,
      maxSize: this.config.maxSize,
    });

    // TODO: Integrate with external alerting system
  }

  /**
   * Start automatic reprocessing of eligible messages
   */
  private startAutoReprocessing(): void {
    const intervalMs = this.config.reprocessIntervalHours * 60 * 60 * 1000;
    
    this.reprocessTimer = setInterval(() => {
      this.logger.info('dlq_auto_reprocess_start', 'Starting automatic reprocessing');
      
      const reprocessableMessages = this.getReprocessableMessages();
      let reprocessedCount = 0;

      for (const deadLetterMessage of reprocessableMessages) {
        // Only reprocess messages that have been in DLQ for at least 1 hour
        const hourAgo = new Date(Date.now() - (60 * 60 * 1000));
        if (deadLetterMessage.lastFailedAt < hourAgo) {
          const reprocessed = this.reprocessMessage(deadLetterMessage.originalMessage.id);
          if (reprocessed) {
            reprocessedCount++;
          }
        }
      }

      this.logger.info('dlq_auto_reprocess_complete', 'Automatic reprocessing completed', {
        reprocessedCount,
        totalReprocessable: reprocessableMessages.length,
      });
    }, intervalMs);
  }

  /**
   * Stop automatic reprocessing
   */
  destroy(): void {
    if (this.reprocessTimer) {
      clearInterval(this.reprocessTimer);
      this.reprocessTimer = undefined;
    }
  }
}

/**
 * Comprehensive batch processing system
 */
export class BatchProcessor {
  private config: BatchConfig;
  private logger = getGupshupLogger();
  private rateLimitManager: RateLimitManager;
  private retryHandler: RetryHandler;
  private deadLetterManager: DeadLetterManager;
  
  private activeBatches: Map<string, Promise<BatchResult>> = new Map();
  private processingStats: BatchProcessingStats = {
    totalBatchesProcessed: 0,
    totalMessagesProcessed: 0,
    averageBatchSize: 0,
    averageProcessingTimeMs: 0,
    successRate: 0,
    retryRate: 0,
    deadLetterRate: 0,
    throughputPerMinute: 0,
  };

  constructor(config?: Partial<BatchConfig>) {
    this.config = {
      maxBatchSize: 50,
      batchTimeoutMs: 30000, // 30 seconds
      maxConcurrentBatches: 5,
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 300000, // 5 minutes
        backoffMultiplier: 2,
        retryableErrorCodes: [],
        jitterEnabled: true,
      },
      deadLetterConfig: {
        maxSize: 1000,
        retentionDays: 7,
        alertThreshold: 100,
        autoReprocessEnabled: true,
        reprocessIntervalHours: 6,
      },
      ...config,
    };

    this.rateLimitManager = getRateLimitManager();
    this.retryHandler = new RetryHandler(this.config.retryConfig);
    this.deadLetterManager = new DeadLetterManager(this.config.deadLetterConfig);

    this.logger.info('batch_processor_init', 'Batch processor initialized', {
      maxBatchSize: this.config.maxBatchSize,
      maxConcurrentBatches: this.config.maxConcurrentBatches,
      maxRetries: this.config.retryConfig.maxRetries,
      deadLetterMaxSize: this.config.deadLetterConfig.maxSize,
    });
  }

  /**
   * Process messages in batches
   */
  async processBatch(messages: QueuedMessage[]): Promise<BatchResult> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Check concurrent batch limit
    if (this.activeBatches.size >= this.config.maxConcurrentBatches) {
      throw handleGupshupError(
        new Error(`Maximum concurrent batches exceeded: ${this.activeBatches.size}/${this.config.maxConcurrentBatches}`),
        { batchId, messageCount: messages.length }
      );
    }

    // Limit batch size
    const batchMessages = messages.slice(0, this.config.maxBatchSize);
    
    this.logger.info('batch_processing_start', 'Starting batch processing', {
      batchId,
      messageCount: batchMessages.length,
      maxBatchSize: this.config.maxBatchSize,
    });

    // Create batch processing promise
    const batchPromise = this.processBatchInternal(batchId, batchMessages, startTime);
    this.activeBatches.set(batchId, batchPromise);

    try {
      const result = await batchPromise;
      this.updateProcessingStats(result);
      return result;
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  /**
   * Internal batch processing logic
   */
  private async processBatchInternal(
    batchId: string,
    messages: QueuedMessage[],
    startTime: number
  ): Promise<BatchResult> {
    const results: ProcessingResult[] = [];
    const errors: BatchError[] = [];
    let successCount = 0;
    let failureCount = 0;
    let retryCount = 0;
    let deadLetterCount = 0;

    // Group messages by channel for efficient processing
    const whatsappMessages = messages.filter(m => m.channel === 'whatsapp');
    const smsMessages = messages.filter(m => m.channel === 'sms');

    // Process WhatsApp messages
    if (whatsappMessages.length > 0) {
      const whatsappResults = await this.processChannelBatch('whatsapp', whatsappMessages);
      results.push(...whatsappResults);
    }

    // Process SMS messages
    if (smsMessages.length > 0) {
      const smsResults = await this.processChannelBatch('sms', smsMessages);
      results.push(...smsResults);
    }

    // Process results and handle retries/dead letters
    for (const result of results) {
      if (result.success) {
        successCount++;
        this.retryHandler.recordSuccess(result.messageId);
      } else {
        failureCount++;
        
        const message = messages.find(m => m.id === result.messageId);
        if (message && result.error) {
          const shouldRetry = this.retryHandler.isRetryable(result.error, message.retryCount);
          
          if (shouldRetry) {
            const nextRetryAt = this.retryHandler.scheduleRetry(message, result.error);
            if (nextRetryAt) {
              retryCount++;
              // Update message for retry
              message.retryCount++;
              message.scheduledAt = nextRetryAt;
            } else {
              // Move to dead letter queue
              await this.moveToDeadLetter(message, result.error);
              deadLetterCount++;
            }
          } else {
            // Move to dead letter queue
            await this.moveToDeadLetter(message, result.error);
            deadLetterCount++;
          }

          // Add to batch errors
          errors.push({
            messageId: result.messageId,
            errorCode: result.error.code,
            errorMessage: result.error.message,
            retryable: shouldRetry,
            retryCount: message.retryCount,
          });
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const throughputPerSecond = messages.length / (processingTimeMs / 1000);

    const batchResult: BatchResult = {
      batchId,
      totalMessages: messages.length,
      successCount,
      failureCount,
      retryCount,
      deadLetterCount,
      processingTimeMs,
      throughputPerSecond,
      errors,
    };

    this.logger.info('batch_processing_complete', 'Batch processing completed', {
      batchId,
      totalMessages: messages.length,
      successCount,
      failureCount,
      retryCount,
      deadLetterCount,
      processingTimeMs,
      throughputPerSecond: throughputPerSecond.toFixed(2),
    });

    return batchResult;
  }

  /**
   * Process messages for a specific channel
   */
  private async processChannelBatch(
    channel: 'whatsapp' | 'sms',
    messages: QueuedMessage[]
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const message of messages) {
      const startTime = Date.now();

      try {
        // Check rate limits
        if (!this.rateLimitManager.canSendMessage(channel, 1)) {
          const recommendation = this.rateLimitManager.getSchedulingRecommendation(channel, 1);
          
          if (recommendation.recommendedDelay > 0) {
            // Wait for rate limit reset
            await this.delay(Math.min(recommendation.recommendedDelay, 5000)); // Max 5 second wait
          }
        }

        // Consume rate limit
        if (!this.rateLimitManager.consumeRateLimit(channel, 1)) {
          throw handleGupshupError(
            new Error(`Rate limit exceeded for ${channel}`),
            { messageId: message.id, channel }
          );
        }

        // Simulate message processing (actual implementation would call GupshupService)
        const processingResult = await this.processMessage(message);
        
        results.push({
          success: true,
          messageId: message.id,
          processingTime: Date.now() - startTime,
        });

      } catch (error) {
        const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
        
        results.push({
          success: false,
          messageId: message.id,
          processingTime: Date.now() - startTime,
          error: gupshupError,
        });
      }

      // Add small delay between messages to be respectful to API
      await this.delay(50);
    }

    return results;
  }

  /**
   * Process individual message (placeholder for actual GupshupService integration)
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    // This is a placeholder - actual implementation would integrate with GupshupService
    // Simulate processing time
    await this.delay(Math.random() * 500 + 100); // 100-600ms

    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new GupshupError(GupshupErrorCode.TEMPORARY_FAILURE, 'Simulated temporary failure');
    }
  }

  /**
   * Move message to dead letter queue
   */
  private async moveToDeadLetter(message: QueuedMessage, error: GupshupError): Promise<void> {
    const retryHistory = this.retryHandler.getRetryHistory(message.id);
    const errorHistory = retryHistory.map(attempt => attempt.error).filter(Boolean) as GupshupError[];
    errorHistory.push(error);

    this.deadLetterManager.addToDeadLetter(message, error, errorHistory);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): BatchProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Get dead letter queue statistics
   */
  getDeadLetterStats() {
    return this.deadLetterManager.getStatistics();
  }

  /**
   * Get dead letter messages
   */
  getDeadLetterMessages(): DeadLetterMessage[] {
    return this.deadLetterManager.getDeadLetterMessages();
  }

  /**
   * Reprocess message from dead letter queue
   */
  reprocessDeadLetterMessage(messageId: string): QueuedMessage | null {
    return this.deadLetterManager.reprocessMessage(messageId);
  }

  /**
   * Remove message from dead letter queue
   */
  removeDeadLetterMessage(messageId: string): boolean {
    return this.deadLetterManager.removeMessage(messageId);
  }

  /**
   * Get retry history for a message
   */
  getRetryHistory(messageId: string): RetryAttempt[] {
    return this.retryHandler.getRetryHistory(messageId);
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(result: BatchResult): void {
    this.processingStats.totalBatchesProcessed++;
    this.processingStats.totalMessagesProcessed += result.totalMessages;
    
    // Update averages
    const totalBatches = this.processingStats.totalBatchesProcessed;
    this.processingStats.averageBatchSize = this.processingStats.totalMessagesProcessed / totalBatches;
    
    // Update processing time average
    const currentAvg = this.processingStats.averageProcessingTimeMs;
    this.processingStats.averageProcessingTimeMs = 
      (currentAvg * (totalBatches - 1) + result.processingTimeMs) / totalBatches;
    
    // Update rates
    const totalMessages = this.processingStats.totalMessagesProcessed;
    this.processingStats.successRate = 
      ((this.processingStats.successRate * (totalMessages - result.totalMessages)) + result.successCount) / totalMessages;
    
    this.processingStats.retryRate = 
      ((this.processingStats.retryRate * (totalMessages - result.totalMessages)) + result.retryCount) / totalMessages;
    
    this.processingStats.deadLetterRate = 
      ((this.processingStats.deadLetterRate * (totalMessages - result.totalMessages)) + result.deadLetterCount) / totalMessages;
    
    // Update throughput (messages per minute)
    this.processingStats.throughputPerMinute = result.throughputPerSecond * 60;
    this.processingStats.lastProcessedAt = new Date();
  }

  /**
   * Cleanup old data
   */
  cleanup(): void {
    this.retryHandler.cleanup();
    this.deadLetterManager.cleanup();
    
    this.logger.info('batch_processor_cleanup', 'Batch processor cleanup completed');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('batch_processor_config_updated', 'Batch processor configuration updated', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): BatchConfig {
    return { ...this.config };
  }

  /**
   * Destroy batch processor and cleanup resources
   */
  destroy(): void {
    this.deadLetterManager.destroy();
    this.activeBatches.clear();
    
    this.logger.info('batch_processor_destroyed', 'Batch processor destroyed');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for global use
 */
let batchProcessorInstance: BatchProcessor | null = null;

export function getBatchProcessor(): BatchProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchProcessor();
  }
  return batchProcessorInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearBatchProcessorInstance(): void {
  if (batchProcessorInstance) {
    batchProcessorInstance.destroy();
    batchProcessorInstance = null;
  }
}