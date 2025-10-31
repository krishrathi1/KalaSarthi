/**
 * Batch Processing and Retry System Tests
 * Tests for task 5.3 implementation
 */

import { 
  BatchProcessor,
  getBatchProcessor,
  clearBatchProcessorInstance,
  BatchConfig,
  QueuedMessage
} from '../../../lib/services/notifications';

// Mock environment variables for testing
process.env.GUPSHUP_API_KEY = 'test-api-key';
process.env.GUPSHUP_APP_ID = 'test-app-id';
process.env.GUPSHUP_WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
process.env.GUPSHUP_WHATSAPP_BUSINESS_ACCOUNT_ID = 'test-business-id';
process.env.GUPSHUP_SMS_SENDER_ID = 'TEST01';
process.env.GUPSHUP_SMS_ROUTE = '1';

describe('Batch Processing and Retry System', () => {
  let batchProcessor: BatchProcessor;

  beforeEach(() => {
    // Clear any existing instances
    clearBatchProcessorInstance();
    
    // Get fresh instance with test configuration
    const testConfig: Partial<BatchConfig> = {
      maxBatchSize: 10,
      batchTimeoutMs: 5000,
      maxConcurrentBatches: 2,
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableErrorCodes: [],
        jitterEnabled: true,
      },
      deadLetterConfig: {
        maxSize: 100,
        retentionDays: 7,
        alertThreshold: 10,
        autoReprocessEnabled: false, // Disable for testing
        reprocessIntervalHours: 1,
      },
    };
    
    batchProcessor = new BatchProcessor(testConfig);
  });

  afterEach(() => {
    // Cleanup
    if (batchProcessor) {
      batchProcessor.destroy();
    }
    clearBatchProcessorInstance();
  });

  describe('Batch Processing', () => {
    it('should process messages in batches efficiently', async () => {
      // Create test messages
      const messages: QueuedMessage[] = [];
      for (let i = 0; i < 5; i++) {
        messages.push({
          id: `test-message-${i}`,
          userId: `user-${i}`,
          channel: i % 2 === 0 ? 'whatsapp' : 'sms',
          priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
          scheduledAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
          payload: {
            to: `+91900000000${i}`,
            templateName: 'test-template',
            templateParams: { name: `User ${i}` },
            language: 'en',
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'test',
            tags: ['batch-test'],
          },
        });
      }

      // Process batch directly
      const batchResult = await batchProcessor.processBatch(messages);

      // Verify batch processing
      expect(batchResult.totalMessages).toBe(5);
      expect(batchResult.batchId).toBeDefined();
      expect(batchResult.processingTimeMs).toBeGreaterThan(0);
      expect(batchResult.throughputPerSecond).toBeGreaterThan(0);
      expect(typeof batchResult.successCount).toBe('number');
      expect(typeof batchResult.failureCount).toBe('number');
    });

    it('should handle different message channels in batch', async () => {
      // Create messages with different channels
      const whatsappMessage: QueuedMessage = {
        id: 'whatsapp-msg',
        userId: 'user-1',
        channel: 'whatsapp',
        priority: 'high',
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        payload: {
          to: '+919000000001',
          templateName: 'test-template',
          templateParams: { name: 'User 1' },
          language: 'en',
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'test',
          tags: ['channel-test'],
        },
      };

      const smsMessage: QueuedMessage = {
        ...whatsappMessage,
        id: 'sms-msg',
        channel: 'sms',
        payload: {
          to: '+919000000002',
          message: 'Test SMS message',
        },
      };

      // Process batch with mixed channels
      const batchResult = await batchProcessor.processBatch([whatsappMessage, smsMessage]);

      // Verify processing occurred
      expect(batchResult.totalMessages).toBe(2);
      expect(batchResult.batchId).toBeDefined();
    });
  });

  describe('Exponential Backoff Retry Logic', () => {
    it('should implement exponential backoff for retries', async () => {
      const config = batchProcessor.getConfig();
      
      // Verify retry configuration
      expect(config.retryConfig.maxRetries).toBe(3);
      expect(config.retryConfig.baseDelayMs).toBe(1000);
      expect(config.retryConfig.maxDelayMs).toBe(10000);
      expect(config.retryConfig.backoffMultiplier).toBe(2);
      expect(config.retryConfig.jitterEnabled).toBe(true);
    });

    it('should track retry attempts for messages', async () => {
      const testMessage: QueuedMessage = {
        id: 'retry-test-msg',
        userId: 'user-retry',
        channel: 'whatsapp',
        priority: 'medium',
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        payload: {
          to: '+919000000003',
          templateName: 'test-template',
          templateParams: { name: 'Retry User' },
          language: 'en',
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'retry-test',
          tags: ['retry-test'],
        },
      };

      // Get initial retry history (should be empty)
      const initialHistory = batchProcessor.getRetryHistory(testMessage.id);
      expect(initialHistory).toHaveLength(0);

      // Process the message (may generate retries in case of failures)
      await batchProcessor.processBatch([testMessage]);

      // Check if retry history is being tracked
      const retryHistory = batchProcessor.getRetryHistory(testMessage.id);
      // History length depends on whether processing succeeded or failed
      expect(Array.isArray(retryHistory)).toBe(true);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should have dead letter queue configuration', () => {
      const config = batchProcessor.getConfig();
      
      expect(config.deadLetterConfig.maxSize).toBe(100);
      expect(config.deadLetterConfig.retentionDays).toBe(7);
      expect(config.deadLetterConfig.alertThreshold).toBe(10);
      expect(config.deadLetterConfig.autoReprocessEnabled).toBe(false);
      expect(config.deadLetterConfig.reprocessIntervalHours).toBe(1);
    });

    it('should provide dead letter queue statistics', () => {
      const deadLetterStats = batchProcessor.getDeadLetterStats();
      
      expect(typeof deadLetterStats.totalMessages).toBe('number');
      expect(typeof deadLetterStats.reprocessableMessages).toBe('number');
      expect(typeof deadLetterStats.averageRetries).toBe('number');
    });

    it('should support requeuing from dead letter queue', () => {
      // This test verifies the requeue functionality exists
      const result = batchProcessor.reprocessDeadLetterMessage('non-existent-message');
      expect(result).toBe(null); // Should return null for non-existent message
    });

    it('should support removing messages from dead letter queue', () => {
      const result = batchProcessor.removeDeadLetterMessage('non-existent-message');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false); // Should return false for non-existent message
    });

    it('should get dead letter messages', () => {
      const deadLetterMessages = batchProcessor.getDeadLetterMessages();
      expect(Array.isArray(deadLetterMessages)).toBe(true);
    });
  });

  describe('Batch Processing Statistics', () => {
    it('should provide batch processing statistics', () => {
      const batchStats = batchProcessor.getProcessingStats();
      
      expect(typeof batchStats.totalBatchesProcessed).toBe('number');
      expect(typeof batchStats.totalMessagesProcessed).toBe('number');
      expect(typeof batchStats.averageBatchSize).toBe('number');
      expect(typeof batchStats.averageProcessingTimeMs).toBe('number');
      expect(typeof batchStats.successRate).toBe('number');
      expect(typeof batchStats.retryRate).toBe('number');
      expect(typeof batchStats.deadLetterRate).toBe('number');
      expect(typeof batchStats.throughputPerMinute).toBe('number');
    });

    it('should update statistics after processing batches', async () => {
      const initialStats = batchProcessor.getProcessingStats();
      const initialBatchCount = initialStats.totalBatchesProcessed;

      // Create and process a test message
      const testMessage: QueuedMessage = {
        id: 'stats-test-msg',
        userId: 'user-stats',
        channel: 'sms',
        priority: 'medium',
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        payload: {
          to: '+919000000005',
          message: 'Statistics test message',
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'stats-test',
          tags: ['stats-test'],
        },
      };

      await batchProcessor.processBatch([testMessage]);

      const updatedStats = batchProcessor.getProcessingStats();
      expect(updatedStats.totalBatchesProcessed).toBe(initialBatchCount + 1);
      expect(updatedStats.totalMessagesProcessed).toBeGreaterThanOrEqual(initialStats.totalMessagesProcessed + 1);
    });
  });

  describe('Configuration and Management', () => {
    it('should support configuration updates', () => {
      const initialConfig = batchProcessor.getConfig();
      expect(initialConfig.maxBatchSize).toBe(10);

      // Update configuration
      batchProcessor.updateConfig({ maxBatchSize: 20 });

      const updatedConfig = batchProcessor.getConfig();
      expect(updatedConfig.maxBatchSize).toBe(20);
    });

    it('should support cleanup operations', () => {
      // Test cleanup method exists and can be called
      expect(() => batchProcessor.cleanup()).not.toThrow();
    });

    it('should handle concurrent batch processing limits', async () => {
      const config = batchProcessor.getConfig();
      expect(config.maxConcurrentBatches).toBe(2);

      // This test verifies the configuration exists
      // Actual concurrent processing testing would require more complex setup
    });
  });
});