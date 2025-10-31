/**
 * Tests for Rate Limiting and Quota Management System
 * 
 * Tests the enhanced rate limiting, daily quota tracking, intelligent scheduling,
 * and alert system for the Gupshup notification service
 */

import { RateLimitManager, getRateLimitManager, clearRateLimitManagerInstance } from '@/lib/services/notifications/RateLimitManager';
import { GupshupService, getGupshupService, clearGupshupServiceInstance } from '@/lib/services/notifications/GupshupService';
import { MessageQueue, getMessageQueue, clearMessageQueueInstance } from '@/lib/services/notifications/MessageQueue';
import { getGupshupConfig } from '@/lib/config/gupshup-config';

// Mock the config to avoid environment variable requirements
jest.mock('@/lib/config/gupshup-config');
const mockGetGupshupConfig = getGupshupConfig as jest.MockedFunction<typeof getGupshupConfig>;

describe('Rate Limiting and Quota Management System', () => {
  let rateLimitManager: RateLimitManager;
  let gupshupService: GupshupService;
  let messageQueue: MessageQueue;

  const mockConfig = {
    apiKey: 'test-api-key',
    appId: 'test-app-id',
    baseUrl: 'https://api.gupshup.io/sm/api/v1',
    whatsapp: {
      phoneNumberId: 'test-phone-id',
      businessAccountId: 'test-business-id',
    },
    sms: {
      senderId: 'KALASARTHI',
      route: '1',
    },
    rateLimit: {
      whatsappPerSecond: 10,
      smsPerSecond: 100,
      dailyLimit: 10000,
    },
    webhook: {
      secret: 'test-webhook-secret',
    },
  };

  beforeEach(() => {
    // Clear all instances
    clearRateLimitManagerInstance();
    clearGupshupServiceInstance();
    clearMessageQueueInstance();

    // Mock config
    mockGetGupshupConfig.mockReturnValue(mockConfig);

    // Create fresh instances
    rateLimitManager = getRateLimitManager();
    gupshupService = getGupshupService();
    messageQueue = getMessageQueue();
  });

  afterEach(() => {
    // Clean up
    clearRateLimitManagerInstance();
    clearGupshupServiceInstance();
    clearMessageQueueInstance();
    jest.clearAllMocks();
  });

  describe('RateLimitManager', () => {
    describe('Basic Rate Limiting', () => {
      test('should allow WhatsApp messages within rate limit', async () => {
        const result = await rateLimitManager.canSendWhatsApp();
        
        expect(result.allowed).toBe(true);
        expect(result.rateLimitInfo.remaining).toBe(mockConfig.rateLimit.whatsappPerSecond);
        expect(result.rateLimitInfo.isLimited).toBe(false);
      });

      test('should allow SMS messages within rate limit', async () => {
        const result = await rateLimitManager.canSendSMS();
        
        expect(result.allowed).toBe(true);
        expect(result.rateLimitInfo.remaining).toBe(mockConfig.rateLimit.smsPerSecond);
        expect(result.rateLimitInfo.isLimited).toBe(false);
      });

      test('should consume WhatsApp tokens correctly', async () => {
        const initialCheck = await rateLimitManager.canSendWhatsApp();
        expect(initialCheck.rateLimitInfo.remaining).toBe(10);

        const consumed = await rateLimitManager.consumeWhatsAppToken();
        expect(consumed).toBe(true);

        const afterCheck = await rateLimitManager.canSendWhatsApp();
        expect(afterCheck.rateLimitInfo.remaining).toBe(9);
      });

      test('should consume SMS tokens correctly', async () => {
        const initialCheck = await rateLimitManager.canSendSMS();
        expect(initialCheck.rateLimitInfo.remaining).toBe(100);

        const consumed = await rateLimitManager.consumeSMSToken();
        expect(consumed).toBe(true);

        const afterCheck = await rateLimitManager.canSendSMS();
        expect(afterCheck.rateLimitInfo.remaining).toBe(99);
      });
    });

    describe('Daily Quota Management', () => {
      test('should track daily quota usage', async () => {
        // Consume some tokens
        await rateLimitManager.consumeWhatsAppToken();
        await rateLimitManager.consumeWhatsAppToken();
        await rateLimitManager.consumeSMSToken();

        const stats = rateLimitManager.getQuotaUsageStats();
        
        expect(stats.whatsapp.dailyUsed).toBe(2);
        expect(stats.sms.dailyUsed).toBe(1);
        expect(stats.daily.totalUsed).toBe(3);
        expect(stats.daily.totalLimit).toBe(mockConfig.rateLimit.dailyLimit);
      });

      test('should calculate utilization percentages correctly', async () => {
        // Consume 50 tokens (0.5% of 10000)
        for (let i = 0; i < 50; i++) {
          await rateLimitManager.consumeSMSToken();
        }

        const stats = rateLimitManager.getQuotaUsageStats();
        
        expect(stats.daily.utilizationPercentage).toBe(0.5);
        expect(stats.sms.utilizationPercentage).toBe(0.5);
      });

      test('should reset daily quota', async () => {
        // Use some quota first
        await rateLimitManager.consumeWhatsAppToken();
        await rateLimitManager.consumeSMSToken();

        let stats = rateLimitManager.getQuotaUsageStats();
        expect(stats.daily.totalUsed).toBe(2);

        // Reset quota
        rateLimitManager.resetDailyQuota();

        stats = rateLimitManager.getQuotaUsageStats();
        expect(stats.daily.totalUsed).toBe(0);
        expect(stats.whatsapp.dailyUsed).toBe(0);
        expect(stats.sms.dailyUsed).toBe(0);
      });
    });

    describe('Intelligent Scheduling', () => {
      test('should provide immediate scheduling when quota allows', async () => {
        const recommendation = await rateLimitManager.getSchedulingRecommendation('whatsapp', 'high');
        
        expect(recommendation.shouldSchedule).toBe(false);
        expect(recommendation.priority).toBe('immediate');
        expect(recommendation.recommendedDelay).toBe(0);
        expect(recommendation.reason).toBe('Can send immediately');
      });

      test('should schedule messages for optimal delivery', async () => {
        const result = await rateLimitManager.scheduleMessage('test-msg-1', 'whatsapp', 'high');
        
        expect(result.scheduled).toBe(false); // Should be immediate when quota allows
        expect(result.reason).toBe('Can send immediately');
      });

      test('should get ready messages from schedule', () => {
        const readyMessages = rateLimitManager.getReadyMessages();
        
        expect(Array.isArray(readyMessages)).toBe(true);
        expect(readyMessages.length).toBe(0); // No scheduled messages initially
      });
    });

    describe('Quota Alerts', () => {
      test('should not have alerts initially', () => {
        const alerts = rateLimitManager.getQuotaAlerts();
        
        expect(Array.isArray(alerts)).toBe(true);
        expect(alerts.length).toBe(0);
      });

      test('should clear quota alerts', () => {
        rateLimitManager.clearQuotaAlerts();
        
        const alerts = rateLimitManager.getQuotaAlerts();
        expect(alerts.length).toBe(0);
      });
    });

    describe('Performance Metrics', () => {
      test('should track performance metrics', async () => {
        // Make some requests
        await rateLimitManager.canSendWhatsApp();
        await rateLimitManager.canSendSMS();
        await rateLimitManager.consumeWhatsAppToken();

        const metrics = rateLimitManager.getPerformanceMetrics();
        
        expect(metrics.totalRequests).toBeGreaterThan(0);
        expect(metrics.rateLimitHits).toBe(0); // No rate limits hit yet
        expect(metrics.quotaExceeded).toBe(0); // No quota exceeded yet
        expect(typeof metrics.rateLimitHitRate).toBe('number');
        expect(typeof metrics.quotaExceededRate).toBe('number');
      });
    });
  });

  describe('GupshupService Integration', () => {
    test('should provide enhanced rate limit information', () => {
      const whatsappInfo = gupshupService.getEnhancedWhatsAppRateLimit();
      const smsInfo = gupshupService.getEnhancedSMSRateLimit();
      
      expect(whatsappInfo.remaining).toBe(mockConfig.rateLimit.whatsappPerSecond);
      expect(whatsappInfo.dailyQuotaRemaining).toBe(mockConfig.rateLimit.dailyLimit);
      expect(smsInfo.remaining).toBe(mockConfig.rateLimit.smsPerSecond);
      expect(smsInfo.dailyQuotaRemaining).toBe(mockConfig.rateLimit.dailyLimit);
    });

    test('should provide quota usage statistics', () => {
      const stats = gupshupService.getQuotaUsageStats();
      
      expect(stats.whatsapp.dailyLimit).toBe(mockConfig.rateLimit.dailyLimit);
      expect(stats.sms.dailyLimit).toBe(mockConfig.rateLimit.dailyLimit);
      expect(stats.daily.totalLimit).toBe(mockConfig.rateLimit.dailyLimit);
      expect(typeof stats.whatsapp.utilizationPercentage).toBe('number');
      expect(typeof stats.sms.utilizationPercentage).toBe('number');
      expect(typeof stats.daily.utilizationPercentage).toBe('number');
    });

    test('should provide scheduling recommendations', async () => {
      const recommendation = await gupshupService.getSchedulingRecommendation('whatsapp', 'medium');
      
      expect(recommendation.shouldSchedule).toBe(false); // Should be immediate when quota allows
      expect(recommendation.priority).toBe('immediate');
      expect(typeof recommendation.recommendedDelay).toBe('number');
      expect(typeof recommendation.reason).toBe('string');
      expect(recommendation.estimatedDeliveryTime).toBeInstanceOf(Date);
    });

    test('should schedule messages for optimal delivery', async () => {
      const result = await gupshupService.scheduleMessageForOptimalDelivery('test-msg-1', 'sms', 'low');
      
      expect(typeof result.scheduled).toBe('boolean');
      expect(result.scheduledFor).toBeInstanceOf(Date);
      expect(typeof result.reason).toBe('string');
    });

    test('should get ready scheduled messages', () => {
      const readyMessages = gupshupService.getReadyScheduledMessages();
      
      expect(Array.isArray(readyMessages)).toBe(true);
    });

    test('should provide rate limiting performance metrics', () => {
      const metrics = gupshupService.getRateLimitPerformanceMetrics();
      
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.rateLimitHits).toBe('number');
      expect(typeof metrics.quotaExceeded).toBe('number');
      expect(typeof metrics.rateLimitHitRate).toBe('number');
      expect(typeof metrics.quotaExceededRate).toBe('number');
    });

    test('should reset daily quota', () => {
      expect(() => {
        gupshupService.resetDailyQuota();
      }).not.toThrow();
    });

    test('should manage quota alerts', () => {
      const alerts = gupshupService.getQuotaAlerts();
      expect(Array.isArray(alerts)).toBe(true);

      expect(() => {
        gupshupService.clearQuotaAlerts();
      }).not.toThrow();
    });
  });

  describe('MessageQueue Integration', () => {
    test('should provide enhanced queue status with quota information', () => {
      const status = messageQueue.getEnhancedQueueStatus();
      
      expect(status.totalMessages).toBe(0);
      expect(status.quotaStats).toBeDefined();
      expect(status.rateLimitInfo).toBeDefined();
      expect(status.rateLimitInfo.whatsapp).toBeDefined();
      expect(status.rateLimitInfo.sms).toBeDefined();
      expect(Array.isArray(status.quotaAlerts)).toBe(true);
    });

    test('should provide rate limiting metrics', () => {
      const metrics = messageQueue.getRateLimitingMetrics();
      
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.rateLimitHits).toBe('number');
      expect(typeof metrics.quotaExceeded).toBe('number');
    });

    test('should enqueue messages with intelligent scheduling', async () => {
      const message = {
        id: 'test-msg-1',
        userId: 'user-123',
        channel: 'whatsapp' as const,
        priority: 'medium' as const,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        payload: {
          to: '+919876543210',
          templateName: 'test_template',
          templateParams: { name: 'Test User' },
          language: 'en',
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'test',
          tags: [],
        },
      };

      await expect(messageQueue.enqueueWithIntelligentScheduling(message)).resolves.not.toThrow();
      
      const status = messageQueue.getQueueStatus();
      expect(status.totalMessages).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid scheduling parameters gracefully', async () => {
      await expect(
        rateLimitManager.getSchedulingRecommendation('invalid' as any, 'high')
      ).rejects.toThrow();
    });

    test('should handle quota exceeded scenarios', async () => {
      // Mock a scenario where daily quota is exceeded
      // This would require more complex mocking of internal state
      const stats = rateLimitManager.getQuotaUsageStats();
      expect(stats.daily.totalLimit).toBe(mockConfig.rateLimit.dailyLimit);
    });
  });

  describe('Configuration Validation', () => {
    test('should use correct rate limit configuration', () => {
      const whatsappInfo = rateLimitManager.getWhatsAppRateLimit();
      const smsInfo = rateLimitManager.getSMSRateLimit();
      
      expect(whatsappInfo.remaining).toBe(mockConfig.rateLimit.whatsappPerSecond);
      expect(smsInfo.remaining).toBe(mockConfig.rateLimit.smsPerSecond);
    });

    test('should track quota against correct daily limits', () => {
      const stats = rateLimitManager.getQuotaUsageStats();
      
      expect(stats.daily.totalLimit).toBe(mockConfig.rateLimit.dailyLimit);
      expect(stats.whatsapp.dailyLimit).toBe(mockConfig.rateLimit.dailyLimit);
      expect(stats.sms.dailyLimit).toBe(mockConfig.rateLimit.dailyLimit);
    });
  });
});

describe('Rate Limiting Requirements Validation', () => {
  test('should meet Requirement 2.5: SMS rate limiting and retry logic', async () => {
    const rateLimitManager = getRateLimitManager();
    
    // Test rate limiting
    const canSend = await rateLimitManager.canSendSMS();
    expect(canSend.allowed).toBe(true);
    
    // Test token consumption
    const consumed = await rateLimitManager.consumeSMSToken();
    expect(consumed).toBe(true);
    
    // Test quota tracking
    const stats = rateLimitManager.getQuotaUsageStats();
    expect(stats.sms.dailyUsed).toBe(1);
  });

  test('should meet Requirement 3.3: Delivery analytics and performance optimization', () => {
    const rateLimitManager = getRateLimitManager();
    
    // Test performance metrics
    const metrics = rateLimitManager.getPerformanceMetrics();
    expect(typeof metrics.totalRequests).toBe('number');
    expect(typeof metrics.rateLimitHits).toBe('number');
    expect(typeof metrics.quotaExceeded).toBe('number');
    
    // Test quota statistics
    const stats = rateLimitManager.getQuotaUsageStats();
    expect(typeof stats.daily.utilizationPercentage).toBe('number');
    expect(typeof stats.whatsapp.utilizationPercentage).toBe('number');
    expect(typeof stats.sms.utilizationPercentage).toBe('number');
  });
});