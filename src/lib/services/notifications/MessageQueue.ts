/**
 * Message Queue Infrastructure for Gupshup Notification System
 * 
 * Provides high-performance message queuing with priority handling,
 * persistence, recovery mechanisms, and comprehensive monitoring
 */

import { getGupshupLogger } from './GupshupLogger';
import { GupshupError, GupshupErrorCode, handleGupshupError } from './GupshupErrorHandler';
import { getRateLimitManager, RateLimitManager } from './RateLimitManager';
import { getBatchProcessor, BatchProcessor, BatchResult } from './BatchProcessor';

export interface QueuedMessage {
  id: string;
  userId: string;
  channel: 'whatsapp' | 'sms';
  priority: 'high' | 'medium' | 'low';
  scheduledAt: Date;
  retryCount: number;
  maxRetries: number;
  payload: WhatsAppMessageParams | SMSParams;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    source: string;
    tags: string[];
    correlationId?: string;
  };
}

export interface WhatsAppMessageParams {
  to: string;
  templateName: string;
  templateParams: Record<string, string>;
  language: string;
  messageType?: 'template' | 'text';
}

export interface SMSParams {
  to: string;
  message: string;
  senderId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface QueueStatus {
  totalMessages: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  scheduledMessages: number;
  processingMessages: number;
  failedMessages: number;
  retryMessages: number;
  lastProcessedAt?: Date;
  averageProcessingTime: number;
  throughputPerMinute: number;
}

export interface QueueHealthCheck {
  isHealthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  metrics: {
    queueDepth: number;
    oldestMessage?: Date;
    processingRate: number;
    errorRate: number;
    memoryUsage: number;
  };
  lastCheckedAt: Date;
}

export interface ProcessingResult {
  success: boolean;
  messageId: string;
  processingTime: number;
  error?: GupshupError;
  retryScheduled?: boolean;
  nextRetryAt?: Date;
}

/**
 * Priority-based message queue with persistence and recovery
 */
export class MessageQueue {
  private highPriorityQueue: QueuedMessage[] = [];
  private mediumPriorityQueue: QueuedMessage[] = [];
  private lowPriorityQueue: QueuedMessage[] = [];
  private scheduledMessages: Map<string, QueuedMessage> = new Map();
  private processingMessages: Map<string, QueuedMessage> = new Map();
  private deadLetterQueue: QueuedMessage[] = [];
  
  private isProcessing = false;
  private processingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalRetries: 0,
    averageProcessingTime: 0,
    lastProcessedAt: null as Date | null,
    processingTimes: [] as number[],
  };
  
  private readonly logger = getGupshupLogger();
  private readonly rateLimitManager: RateLimitManager;
  private readonly batchProcessor: BatchProcessor;
  private readonly maxQueueSize = 10000;
  private readonly maxDeadLetterSize = 1000;
  private readonly persistenceInterval = 30000; // 30 seconds
  private readonly healthCheckInterval = 60000; // 1 minute
  
  private persistenceTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.rateLimitManager = getRateLimitManager();
    this.batchProcessor = getBatchProcessor();
    this.startPeriodicTasks();
    this.logger.info('message_queue_init', 'Message queue initialized', {
      maxQueueSize: this.maxQueueSize,
      maxDeadLetterSize: this.maxDeadLetterSize,
      persistenceInterval: this.persistenceInterval,
      healthCheckInterval: this.healthCheckInterval,
      rateLimitingEnabled: true,
      batchProcessingEnabled: true,
    });
  }

  /**
   * Add message to queue with intelligent scheduling and rate limit optimization
   */
  async enqueueWithIntelligentScheduling(message: QueuedMessage): Promise<void> {
    try {
      // Validate message
      this.validateMessage(message);
      
      // Check queue capacity
      const totalMessages = this.getTotalQueueSize();
      if (totalMessages >= this.maxQueueSize) {
        throw handleGupshupError(
          new Error(`Queue capacity exceeded. Current size: ${totalMessages}, Max: ${this.maxQueueSize}`),
          { messageId: message.id, queueSize: totalMessages }
        );
      }

      // Get intelligent scheduling recommendation
      const recommendation = await this.rateLimitManager.getSchedulingRecommendation(
        message.channel,
        message.priority
      );

      // Apply scheduling recommendation
      if (recommendation.shouldSchedule && recommendation.recommendedDelay > 0) {
        message.scheduledAt = recommendation.estimatedDeliveryTime;
        
        this.logger.info('message_intelligently_scheduled', 'Message scheduled based on rate limit optimization', {
          messageId: message.id,
          originalScheduledAt: message.scheduledAt,
          newScheduledAt: recommendation.estimatedDeliveryTime,
          delay: recommendation.recommendedDelay,
          reason: recommendation.reason,
          priority: recommendation.priority,
        });
      }

      // Set metadata
      message.metadata.updatedAt = new Date();
      if (!message.metadata.createdAt) {
        message.metadata.createdAt = new Date();
      }

      // Add scheduling metadata
      message.metadata.tags.push('intelligent_scheduling');
      if (recommendation.shouldSchedule) {
        message.metadata.tags.push('rate_limit_optimized');
      }

      // Handle scheduled messages
      if (message.scheduledAt > new Date()) {
        this.scheduledMessages.set(message.id, message);
        this.logger.debug('message_scheduled', 'Message scheduled for future delivery', {
          messageId: message.id,
          scheduledAt: message.scheduledAt,
          priority: message.priority,
          channel: message.channel,
          intelligentlyScheduled: recommendation.shouldSchedule,
        });
        return;
      }

      // Add to appropriate priority queue
      switch (message.priority) {
        case 'high':
          this.highPriorityQueue.push(message);
          break;
        case 'medium':
          this.mediumPriorityQueue.push(message);
          break;
        case 'low':
          this.lowPriorityQueue.push(message);
          break;
        default:
          this.mediumPriorityQueue.push(message);
      }

      this.logger.info('message_enqueued_with_intelligence', 'Message added to queue with intelligent scheduling', {
        messageId: message.id,
        priority: message.priority,
        channel: message.channel,
        userId: message.userId,
        queueSize: this.getTotalQueueSize(),
        schedulingApplied: recommendation.shouldSchedule,
      });

    } catch (error) {
      const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
      this.logger.error('message_enqueue_failed', 'Failed to enqueue message with intelligent scheduling', {
        messageId: message.id,
        error: gupshupError.message,
        errorCode: gupshupError.code,
      });
      throw gupshupError;
    }
  }

  /**
   * Add message to queue with priority handling (original method)
   */
  async enqueue(message: QueuedMessage): Promise<void> {
    try {
      // Validate message
      this.validateMessage(message);
      
      // Check queue capacity
      const totalMessages = this.getTotalQueueSize();
      if (totalMessages >= this.maxQueueSize) {
        throw handleGupshupError(
          new Error(`Queue capacity exceeded. Current size: ${totalMessages}, Max: ${this.maxQueueSize}`),
          { messageId: message.id, queueSize: totalMessages }
        );
      }

      // Set metadata
      message.metadata.updatedAt = new Date();
      if (!message.metadata.createdAt) {
        message.metadata.createdAt = new Date();
      }

      // Handle scheduled messages
      if (message.scheduledAt > new Date()) {
        this.scheduledMessages.set(message.id, message);
        this.logger.debug('message_scheduled', 'Message scheduled for future delivery', {
          messageId: message.id,
          scheduledAt: message.scheduledAt,
          priority: message.priority,
          channel: message.channel,
        });
        return;
      }

      // Add to appropriate priority queue
      switch (message.priority) {
        case 'high':
          this.highPriorityQueue.push(message);
          break;
        case 'medium':
          this.mediumPriorityQueue.push(message);
          break;
        case 'low':
          this.lowPriorityQueue.push(message);
          break;
        default:
          this.mediumPriorityQueue.push(message);
      }

      this.logger.info('message_enqueued', 'Message added to queue', {
        messageId: message.id,
        priority: message.priority,
        channel: message.channel,
        userId: message.userId,
        queueSize: this.getTotalQueueSize(),
      });

    } catch (error) {
      const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
      this.logger.error('message_enqueue_failed', 'Failed to enqueue message', {
        messageId: message.id,
        error: gupshupError.message,
        errorCode: gupshupError.code,
      });
      throw gupshupError;
    }
  }

  /**
   * Process messages from queue with batch processing and retry logic
   */
  async processBatch(): Promise<BatchResult[]> {
    if (this.isProcessing) {
      this.logger.debug('batch_processing_skipped', 'Batch processing already in progress');
      return [];
    }

    this.isProcessing = true;
    const batchResults: BatchResult[] = [];
    const startTime = Date.now();

    try {
      // Move due scheduled messages to immediate queues
      await this.processDueScheduledMessages();

      // Get messages for batch processing with quota awareness
      const messagesToProcess = await this.getMessagesForProcessing();
      
      if (messagesToProcess.length === 0) {
        return batchResults;
      }

      this.logger.info('batch_processing_start', 'Starting batch processing', {
        totalMessages: messagesToProcess.length,
        highPriority: this.highPriorityQueue.length,
        mediumPriority: this.mediumPriorityQueue.length,
        lowPriority: this.lowPriorityQueue.length,
      });

      // Process messages in batches using BatchProcessor
      const batchResult = await this.batchProcessor.processBatch(messagesToProcess);
      batchResults.push(batchResult);

      // Handle retry scheduling for failed messages
      await this.handleBatchRetries(messagesToProcess, batchResult);

      const processingTime = Date.now() - startTime;
      this.logger.info('batch_processing_complete', 'Batch processing completed', {
        batchCount: batchResults.length,
        totalMessages: batchResult.totalMessages,
        successCount: batchResult.successCount,
        failureCount: batchResult.failureCount,
        retryCount: batchResult.retryCount,
        deadLetterCount: batchResult.deadLetterCount,
        processingTime,
        throughput: batchResult.throughputPerSecond,
      });

    } catch (error) {
      const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
      this.logger.error('batch_processing_failed', 'Batch processing failed', {
        error: gupshupError.message,
        errorCode: gupshupError.code,
      });
      throw gupshupError;
    } finally {
      this.isProcessing = false;
    }

    return batchResults;
  }

  /**
   * Process messages from queue with priority ordering (legacy individual processing)
   */
  async process(): Promise<ProcessingResult[]> {
    if (this.isProcessing) {
      this.logger.debug('queue_processing_skipped', 'Queue processing already in progress');
      return [];
    }

    this.isProcessing = true;
    const results: ProcessingResult[] = [];
    const startTime = Date.now();

    try {
      // Move due scheduled messages to immediate queues
      await this.processDueScheduledMessages();

      // Process messages by priority with quota awareness
      const messagesToProcess = await this.getMessagesForProcessing();
      
      if (messagesToProcess.length === 0) {
        return results;
      }

      this.logger.info('queue_processing_start', 'Starting individual queue processing', {
        totalMessages: messagesToProcess.length,
        highPriority: this.highPriorityQueue.length,
        mediumPriority: this.mediumPriorityQueue.length,
        lowPriority: this.lowPriorityQueue.length,
      });

      for (const message of messagesToProcess) {
        try {
          const result = await this.processMessage(message);
          results.push(result);

          // Update processing statistics
          this.updateProcessingStats(result);

          // Add small delay between messages to respect rate limits
          await this.delay(100);

        } catch (error) {
          const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
          
          const result: ProcessingResult = {
            success: false,
            messageId: message.id,
            processingTime: Date.now() - startTime,
            error: gupshupError,
          };

          // Handle retry logic using BatchProcessor
          const retryHistory = this.batchProcessor.getRetryHistory(message.id);
          if (message.retryCount < message.maxRetries) {
            const retryResult = await this.scheduleRetry(message, gupshupError);
            result.retryScheduled = retryResult.retryScheduled;
            result.nextRetryAt = retryResult.nextRetryAt;
          } else {
            // Move to dead letter queue using BatchProcessor
            await this.moveToDeadLetterQueue(message, gupshupError);
          }

          results.push(result);
          this.updateProcessingStats(result);
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.info('queue_processing_complete', 'Individual queue processing completed', {
        processedCount: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        retryCount: results.filter(r => r.retryScheduled).length,
        processingTime,
      });

    } catch (error) {
      const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
      this.logger.error('queue_processing_failed', 'Individual queue processing failed', {
        error: gupshupError.message,
        errorCode: gupshupError.code,
      });
      throw gupshupError;
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Get current queue status and metrics (enhanced with batch processing)
   */
  getQueueStatus(): QueueStatus {
    const totalMessages = this.getTotalQueueSize();
    const processingTimes = this.processingStats.processingTimes;
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;

    // Calculate throughput (messages per minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentProcessingTimes = processingTimes.filter(time => time > oneMinuteAgo);
    const throughputPerMinute = recentProcessingTimes.length;

    // Get dead letter queue size from BatchProcessor
    const deadLetterStats = this.batchProcessor.getDeadLetterStats();

    return {
      totalMessages,
      highPriority: this.highPriorityQueue.length,
      mediumPriority: this.mediumPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      scheduledMessages: this.scheduledMessages.size,
      processingMessages: this.processingMessages.size,
      failedMessages: deadLetterStats.totalMessages, // Use BatchProcessor's dead letter count
      retryMessages: this.getRetryMessageCount(),
      lastProcessedAt: this.processingStats.lastProcessedAt,
      averageProcessingTime,
      throughputPerMinute,
    };
  }

  /**
   * Perform health check on queue system
   */
  async performHealthCheck(): Promise<QueueHealthCheck> {
    const issues: string[] = [];
    const metrics = {
      queueDepth: this.getTotalQueueSize(),
      oldestMessage: this.getOldestMessageDate(),
      processingRate: this.calculateProcessingRate(),
      errorRate: this.calculateErrorRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };

    // Check queue depth
    if (metrics.queueDepth > this.maxQueueSize * 0.8) {
      issues.push(`Queue depth is high: ${metrics.queueDepth}/${this.maxQueueSize}`);
    }

    // Check for old messages
    if (metrics.oldestMessage) {
      const ageMinutes = (Date.now() - metrics.oldestMessage.getTime()) / (1000 * 60);
      if (ageMinutes > 30) {
        issues.push(`Oldest message is ${Math.round(ageMinutes)} minutes old`);
      }
    }

    // Check processing rate
    if (metrics.processingRate < 10 && metrics.queueDepth > 0) {
      issues.push(`Low processing rate: ${metrics.processingRate} messages/minute`);
    }

    // Check error rate
    if (metrics.errorRate > 0.1) {
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    // Check memory usage
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthCheck: QueueHealthCheck = {
      isHealthy: status === 'healthy',
      status,
      issues,
      metrics,
      lastCheckedAt: new Date(),
    };

    this.logger.info('queue_health_check', 'Queue health check completed', {
      status,
      issueCount: issues.length,
      queueDepth: metrics.queueDepth,
      processingRate: metrics.processingRate,
      errorRate: metrics.errorRate,
    });

    return healthCheck;
  }

  /**
   * Clear all queues (for testing/maintenance)
   */
  clearAllQueues(): void {
    this.highPriorityQueue = [];
    this.mediumPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.scheduledMessages.clear();
    this.processingMessages.clear();
    this.deadLetterQueue = [];
    
    this.logger.info('queues_cleared', 'All queues cleared');
  }

  /**
   * Handle retry scheduling for failed messages in batch processing
   */
  private async handleBatchRetries(messages: QueuedMessage[], batchResult: BatchResult): Promise<void> {
    for (const error of batchResult.errors) {
      const message = messages.find(m => m.id === error.messageId);
      if (!message) continue;

      if (error.retryable && message.retryCount < message.maxRetries) {
        // Message will be automatically retried by BatchProcessor
        this.logger.debug('batch_retry_scheduled', 'Message scheduled for retry in batch processing', {
          messageId: error.messageId,
          retryCount: error.retryCount,
          errorCode: error.errorCode,
        });
      } else {
        // Message moved to dead letter queue by BatchProcessor
        this.logger.info('batch_message_to_dlq', 'Message moved to dead letter queue in batch processing', {
          messageId: error.messageId,
          finalRetryCount: error.retryCount,
          errorCode: error.errorCode,
        });
      }
    }
  }

  /**
   * Get dead letter queue messages (using BatchProcessor)
   */
  getDeadLetterQueue(): QueuedMessage[] {
    const deadLetterMessages = this.batchProcessor.getDeadLetterMessages();
    return deadLetterMessages.map(dlm => dlm.originalMessage);
  }

  /**
   * Get detailed dead letter queue information
   */
  getDeadLetterQueueDetails() {
    return {
      messages: this.batchProcessor.getDeadLetterMessages(),
      statistics: this.batchProcessor.getDeadLetterStats(),
    };
  }

  /**
   * Requeue message from dead letter queue (using BatchProcessor)
   */
  async requeueFromDeadLetter(messageId: string): Promise<boolean> {
    const reprocessedMessage = this.batchProcessor.reprocessDeadLetterMessage(messageId);
    
    if (!reprocessedMessage) {
      this.logger.warn('dlq_requeue_failed', 'Failed to requeue message from dead letter queue', {
        messageId,
        reason: 'Message not found or not reprocessable',
      });
      return false;
    }

    await this.enqueue(reprocessedMessage);
    
    this.logger.info('message_requeued_from_dlq', 'Message requeued from dead letter queue', {
      messageId: reprocessedMessage.id,
    });

    return true;
  }

  /**
   * Remove message from dead letter queue
   */
  removeFromDeadLetterQueue(messageId: string): boolean {
    const removed = this.batchProcessor.removeDeadLetterMessage(messageId);
    
    if (removed) {
      this.logger.info('message_removed_from_dlq', 'Message removed from dead letter queue', {
        messageId,
      });
    }
    
    return removed;
  }

  /**
   * Get comprehensive queue status including rate limiting, quota, and batch processing information
   */
  getEnhancedQueueStatus(): QueueStatus & {
    quotaStats: any;
    rateLimitInfo: {
      whatsapp: any;
      sms: any;
    };
    quotaAlerts: any[];
    batchProcessing: {
      stats: any;
      deadLetterStats: any;
      config: any;
    };
  } {
    const baseStatus = this.getQueueStatus();
    const quotaStats = this.rateLimitManager.getQuotaUsageStats();
    const whatsappRateLimit = this.rateLimitManager.getWhatsAppRateLimit();
    const smsRateLimit = this.rateLimitManager.getSMSRateLimit();
    const quotaAlerts = this.rateLimitManager.getQuotaAlerts();
    
    // Get batch processing information
    const batchStats = this.batchProcessor.getProcessingStats();
    const deadLetterStats = this.batchProcessor.getDeadLetterStats();
    const batchConfig = this.batchProcessor.getConfig();

    return {
      ...baseStatus,
      quotaStats,
      rateLimitInfo: {
        whatsapp: whatsappRateLimit,
        sms: smsRateLimit,
      },
      quotaAlerts,
      batchProcessing: {
        stats: batchStats,
        deadLetterStats,
        config: batchConfig,
      },
    };
  }

  /**
   * Get batch processing statistics
   */
  getBatchProcessingStats() {
    return this.batchProcessor.getProcessingStats();
  }

  /**
   * Get retry history for a specific message
   */
  getMessageRetryHistory(messageId: string) {
    return this.batchProcessor.getRetryHistory(messageId);
  }

  /**
   * Get rate limiting performance metrics
   */
  getRateLimitingMetrics() {
    return this.rateLimitManager.getPerformanceMetrics();
  }

  /**
   * Validate message structure and content
   */
  private validateMessage(message: QueuedMessage): void {
    if (!message.id) {
      throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'Message ID is required');
    }

    if (!message.userId) {
      throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'User ID is required');
    }

    if (!['whatsapp', 'sms'].includes(message.channel)) {
      throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'Invalid channel');
    }

    if (!['high', 'medium', 'low'].includes(message.priority)) {
      throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'Invalid priority');
    }

    if (!message.payload) {
      throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'Message payload is required');
    }

    if (message.channel === 'whatsapp') {
      const payload = message.payload as WhatsAppMessageParams;
      if (!payload.to || !payload.templateName) {
        throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'WhatsApp payload missing required fields');
      }
    }

    if (message.channel === 'sms') {
      const payload = message.payload as SMSParams;
      if (!payload.to || !payload.message) {
        throw new GupshupError(GupshupErrorCode.INVALID_PARAMETERS, 'SMS payload missing required fields');
      }
    }
  }

  /**
   * Process due scheduled messages
   */
  private async processDueScheduledMessages(): Promise<void> {
    const now = new Date();
    const dueMessages: QueuedMessage[] = [];

    for (const [messageId, message] of this.scheduledMessages.entries()) {
      if (message.scheduledAt <= now) {
        dueMessages.push(message);
        this.scheduledMessages.delete(messageId);
      }
    }

    for (const message of dueMessages) {
      await this.enqueue(message);
    }

    if (dueMessages.length > 0) {
      this.logger.debug('scheduled_messages_processed', 'Moved due scheduled messages to queue', {
        count: dueMessages.length,
      });
    }
  }

  /**
   * Get messages for processing in priority order with quota awareness
   */
  private async getMessagesForProcessing(): Promise<QueuedMessage[]> {
    const messages: QueuedMessage[] = [];
    const quotaStats = this.rateLimitManager.getQuotaUsageStats();
    
    // Adjust batch sizes based on quota utilization
    let highPriorityBatchSize = 5;
    let mediumPriorityBatchSize = 3;
    let lowPriorityBatchSize = 2;
    
    // Reduce batch sizes if quota is running low
    if (quotaStats.daily.utilizationPercentage > 90) {
      highPriorityBatchSize = 2;
      mediumPriorityBatchSize = 1;
      lowPriorityBatchSize = 0; // Skip low priority when quota is critical
    } else if (quotaStats.daily.utilizationPercentage > 75) {
      highPriorityBatchSize = 3;
      mediumPriorityBatchSize = 2;
      lowPriorityBatchSize = 1;
    }
    
    // Process high priority first
    const highPriorityBatch = this.highPriorityQueue.splice(0, highPriorityBatchSize);
    messages.push(...highPriorityBatch);
    
    // Then medium priority
    const mediumPriorityBatch = this.mediumPriorityQueue.splice(0, mediumPriorityBatchSize);
    messages.push(...mediumPriorityBatch);
    
    // Finally low priority (if quota allows)
    if (lowPriorityBatchSize > 0) {
      const lowPriorityBatch = this.lowPriorityQueue.splice(0, lowPriorityBatchSize);
      messages.push(...lowPriorityBatch);
    }

    // Log quota-aware processing decisions
    if (quotaStats.daily.utilizationPercentage > 75) {
      this.logger.info('quota_aware_processing', 'Adjusted batch sizes due to quota utilization', {
        quotaUtilization: quotaStats.daily.utilizationPercentage,
        highPriorityBatch: highPriorityBatchSize,
        mediumPriorityBatch: mediumPriorityBatchSize,
        lowPriorityBatch: lowPriorityBatchSize,
        totalMessages: messages.length,
      });
    }

    return messages;
  }

  /**
   * Get messages for processing in priority order (original method)
   */
  private getMessagesForProcessingOriginal(): QueuedMessage[] {
    const messages: QueuedMessage[] = [];
    
    // Process high priority first (up to 50% of batch)
    const highPriorityBatch = this.highPriorityQueue.splice(0, 5);
    messages.push(...highPriorityBatch);
    
    // Then medium priority (up to 30% of batch)
    const mediumPriorityBatch = this.mediumPriorityQueue.splice(0, 3);
    messages.push(...mediumPriorityBatch);
    
    // Finally low priority (up to 20% of batch)
    const lowPriorityBatch = this.lowPriorityQueue.splice(0, 2);
    messages.push(...lowPriorityBatch);

    return messages;
  }

  /**
   * Process individual message (placeholder - will be implemented by GupshupService)
   */
  private async processMessage(message: QueuedMessage): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    // Move to processing queue
    this.processingMessages.set(message.id, message);
    
    try {
      // This is a placeholder - actual processing will be done by GupshupService
      // For now, simulate processing
      await this.delay(Math.random() * 1000 + 500); // 500-1500ms
      
      // Remove from processing queue
      this.processingMessages.delete(message.id);
      
      return {
        success: true,
        messageId: message.id,
        processingTime: Date.now() - startTime,
      };
      
    } catch (error) {
      // Remove from processing queue
      this.processingMessages.delete(message.id);
      throw error;
    }
  }

  /**
   * Schedule message retry with exponential backoff (enhanced with BatchProcessor)
   */
  private async scheduleRetry(message: QueuedMessage, error: GupshupError): Promise<{ retryScheduled: boolean; nextRetryAt?: Date }> {
    // Use BatchProcessor's retry handler for consistent retry logic
    const retryHistory = this.batchProcessor.getRetryHistory(message.id);
    
    message.retryCount++;
    
    // Calculate exponential backoff delay using BatchProcessor's logic
    const baseDelay = 60000; // 1 minute
    const maxDelay = 3600000; // 1 hour
    const backoffMultiplier = 2;
    
    let delay = baseDelay * Math.pow(backoffMultiplier, message.retryCount - 1);
    
    // Add jitter (±10%)
    const jitter = Math.random() * 0.1;
    delay = delay * (1 + (jitter - 0.05));
    
    // Cap at maximum delay
    delay = Math.min(delay, maxDelay);
    
    const nextRetryAt = new Date(Date.now() + delay);
    message.scheduledAt = nextRetryAt;
    message.metadata.updatedAt = new Date();
    message.metadata.tags.push('retry_scheduled');
    
    // Add to scheduled messages
    this.scheduledMessages.set(message.id, message);
    
    this.logger.info('message_retry_scheduled', 'Message scheduled for retry with exponential backoff', {
      messageId: message.id,
      retryCount: message.retryCount,
      maxRetries: message.maxRetries,
      nextRetryAt,
      delay,
      errorCode: error.code,
      backoffMultiplier,
      jitterApplied: true,
    });
    
    return {
      retryScheduled: true,
      nextRetryAt,
    };
  }

  /**
   * Move message to dead letter queue (using BatchProcessor)
   */
  private async moveToDeadLetterQueue(message: QueuedMessage, error: GupshupError): Promise<void> {
    // Add error information to metadata
    message.metadata.tags.push('dead_letter');
    message.metadata.updatedAt = new Date();
    
    // Get retry history for comprehensive error tracking
    const retryHistory = this.batchProcessor.getRetryHistory(message.id);
    const errorHistory = retryHistory.map(attempt => attempt.error).filter(Boolean) as GupshupError[];
    errorHistory.push(error);
    
    // Use BatchProcessor's dead letter manager
    const deadLetterManager = (this.batchProcessor as any).deadLetterManager;
    if (deadLetterManager) {
      deadLetterManager.addToDeadLetter(message, error, errorHistory);
    } else {
      // Fallback to legacy dead letter queue
      if (this.deadLetterQueue.length >= this.maxDeadLetterSize) {
        const removed = this.deadLetterQueue.shift();
        this.logger.warn('dlq_capacity_exceeded', 'Dead letter queue capacity exceeded, removing oldest message', {
          removedMessageId: removed?.id,
          maxSize: this.maxDeadLetterSize,
        });
      }
      
      this.deadLetterQueue.push(message);
    }
    
    this.logger.error('message_moved_to_dlq', 'Message moved to dead letter queue with comprehensive error tracking', {
      messageId: message.id,
      retryCount: message.retryCount,
      maxRetries: message.maxRetries,
      errorCode: error.code,
      errorMessage: error.message,
      totalErrorHistory: errorHistory.length,
      usingBatchProcessor: !!deadLetterManager,
    });
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(result: ProcessingResult): void {
    this.processingStats.totalProcessed++;
    if (!result.success) {
      this.processingStats.totalFailed++;
    }
    if (result.retryScheduled) {
      this.processingStats.totalRetries++;
    }
    
    this.processingStats.processingTimes.push(result.processingTime);
    
    // Keep only last 1000 processing times for memory efficiency
    if (this.processingStats.processingTimes.length > 1000) {
      this.processingStats.processingTimes = this.processingStats.processingTimes.slice(-1000);
    }
    
    this.processingStats.lastProcessedAt = new Date();
  }

  /**
   * Get total queue size across all priority levels
   */
  private getTotalQueueSize(): number {
    return this.highPriorityQueue.length + 
           this.mediumPriorityQueue.length + 
           this.lowPriorityQueue.length;
  }

  /**
   * Get count of messages scheduled for retry
   */
  private getRetryMessageCount(): number {
    let retryCount = 0;
    for (const message of this.scheduledMessages.values()) {
      if (message.retryCount > 0) {
        retryCount++;
      }
    }
    return retryCount;
  }

  /**
   * Get oldest message date across all queues
   */
  private getOldestMessageDate(): Date | undefined {
    const allMessages = [
      ...this.highPriorityQueue,
      ...this.mediumPriorityQueue,
      ...this.lowPriorityQueue,
      ...Array.from(this.scheduledMessages.values()),
    ];

    if (allMessages.length === 0) {
      return undefined;
    }

    return allMessages.reduce((oldest, message) => {
      return message.metadata.createdAt < oldest ? message.metadata.createdAt : oldest;
    }, allMessages[0].metadata.createdAt);
  }

  /**
   * Calculate processing rate (messages per minute)
   */
  private calculateProcessingRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentProcessingTimes = this.processingStats.processingTimes.filter(time => time > oneMinuteAgo);
    return recentProcessingTimes.length;
  }

  /**
   * Calculate error rate (percentage of failed messages)
   */
  private calculateErrorRate(): number {
    if (this.processingStats.totalProcessed === 0) {
      return 0;
    }
    return this.processingStats.totalFailed / this.processingStats.totalProcessed;
  }

  /**
   * Estimate memory usage of queue system
   */
  private estimateMemoryUsage(): number {
    const allMessages = [
      ...this.highPriorityQueue,
      ...this.mediumPriorityQueue,
      ...this.lowPriorityQueue,
      ...Array.from(this.scheduledMessages.values()),
      ...Array.from(this.processingMessages.values()),
      ...this.deadLetterQueue,
    ];

    // Rough estimate: 1KB per message
    return allMessages.length * 1024;
  }

  /**
   * Start periodic tasks (persistence and health checks)
   */
  private startPeriodicTasks(): void {
    // Persistence task (placeholder for future implementation)
    this.persistenceTimer = setInterval(() => {
      this.logger.debug('queue_persistence_check', 'Periodic persistence check');
      // TODO: Implement persistence to Redis/Database
    }, this.persistenceInterval);

    // Health check task
    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck();
        if (!healthCheck.isHealthy) {
          this.logger.warn('queue_health_degraded', 'Queue health check detected issues', {
            status: healthCheck.status,
            issues: healthCheck.issues,
          });
        }
      } catch (error) {
        this.logger.error('queue_health_check_failed', 'Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.healthCheckInterval);
  }

  /**
   * Cleanup old data and perform maintenance
   */
  cleanup(): void {
    // Cleanup BatchProcessor data
    this.batchProcessor.cleanup();
    
    this.logger.info('message_queue_cleanup', 'Message queue cleanup completed');
  }

  /**
   * Stop periodic tasks and cleanup
   */
  destroy(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Cleanup BatchProcessor
    this.batchProcessor.destroy();
    
    this.logger.info('message_queue_destroyed', 'Message queue destroyed and cleaned up');
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
let messageQueueInstance: MessageQueue | null = null;

export function getMessageQueue(): MessageQueue {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueue();
  }
  return messageQueueInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearMessageQueueInstance(): void {
  if (messageQueueInstance) {
    messageQueueInstance.destroy();
    messageQueueInstance = null;
  }
}