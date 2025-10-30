/**
 * Test suite for SMS Fallback System
 * Tests SMS gateway integration, fallback mechanism, and message optimization
 */

import { GupshupService } from '../../../lib/services/notifications/GupshupService';
import { FallbackManager } from '../../../lib/services/notifications/FallbackManager';
import { SMSTemplateManager } from '../../../lib/services/notifications/SMSTemplateManager';
import { GupshupError, GupshupErrorCode } from '../../../lib/services/notifications/GupshupErrorHandler';

// Mock the config to avoid environment dependencies
jest.mock('../../../lib/config/gupshup-config', () => ({
  getGupshupConfig: () => ({
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
  }),
}));

describe('SMS Fallback System', () => {
  let gupshupService: GupshupService;
  let fallbackManager: FallbackManager;
  let smsTemplateManager: SMSTemplateManager;

  beforeEach(() => {
    // Create fresh instances for each test
    gupshupService = new GupshupService();
    fallbackManager = new FallbackManager();
    smsTemplateManager = new SMSTemplateManager();
  });

  describe('SMS Gateway Integration', () => {
    test('should validate SMS phone numbers correctly', () => {
      const service = gupshupService as any;
      
      // Valid Indian numbers
      expect(service.isValidSMSPhoneNumber('9876543210')).toBe(true);
      expect(service.isValidSMSPhoneNumber('+919876543210')).toBe(true);
      expect(service.isValidSMSPhoneNumber('919876543210')).toBe(true);
      
      // Invalid numbers
      expect(service.isValidSMSPhoneNumber('1234567890')).toBe(false); // Doesn't start with 6-9
      expect(service.isValidSMSPhoneNumber('98765')).toBe(false); // Too short
      expect(service.isValidSMSPhoneNumber('')).toBe(false); // Empty
    });

    test('should format SMS phone numbers correctly', () => {
      const service = gupshupService as any;
      
      expect(service.formatSMSPhoneNumber('9876543210')).toBe('919876543210');
      expect(service.formatSMSPhoneNumber('+919876543210')).toBe('919876543210');
      expect(service.formatSMSPhoneNumber('919876543210')).toBe('919876543210');
    });

    test('should validate and format SMS messages', () => {
      const service = gupshupService as any;
      
      const validParams = {
        to: '9876543210',
        message: 'Test message',
      };
      
      const result = service.validateAndFormatSMS(validParams);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.characterCount).toBe(12);
      expect(result.smsCount).toBe(1);
    });

    test('should detect long messages and calculate SMS count', () => {
      const service = gupshupService as any;
      
      const longMessage = 'A'.repeat(200); // 200 characters
      const params = {
        to: '9876543210',
        message: longMessage,
      };
      
      const result = service.validateAndFormatSMS(params);
      expect(result.isValid).toBe(true);
      expect(result.characterCount).toBe(200);
      expect(result.smsCount).toBe(2); // Should be split into 2 SMS
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Intelligent Fallback Mechanism', () => {
    test('should decide to fallback for WhatsApp user errors', () => {
      const error = new GupshupError(
        GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN,
        'User not opted in'
      );
      
      const decision = fallbackManager.decideFallback(error, 'whatsapp', 0);
      
      expect(decision.shouldFallback).toBe(true);
      expect(decision.fallbackChannel).toBe('sms');
      expect(decision.delay).toBe(0);
    });

    test('should not fallback for authentication errors', () => {
      const error = new GupshupError(
        GupshupErrorCode.UNAUTHORIZED,
        'Invalid API key'
      );
      
      const decision = fallbackManager.decideFallback(error, 'whatsapp', 0);
      
      expect(decision.shouldFallback).toBe(false);
      expect(decision.fallbackChannel).toBe('none');
    });

    test('should not fallback from SMS (final channel)', () => {
      const error = new GupshupError(
        GupshupErrorCode.NETWORK_ERROR,
        'Network timeout'
      );
      
      const decision = fallbackManager.decideFallback(error, 'sms', 0);
      
      expect(decision.shouldFallback).toBe(false);
      expect(decision.reason).toContain('SMS is the final fallback channel');
    });

    test('should respect maximum fallback attempts', () => {
      const error = new GupshupError(
        GupshupErrorCode.WHATSAPP_USER_BLOCKED,
        'User blocked'
      );
      
      const decision = fallbackManager.decideFallback(error, 'whatsapp', 5);
      
      expect(decision.shouldFallback).toBe(false);
      expect(decision.reason).toContain('Maximum fallback attempts');
    });

    test('should record fallback attempts for analytics', () => {
      const attempt = {
        originalChannel: 'whatsapp' as const,
        fallbackChannel: 'sms' as const,
        originalError: new GupshupError(GupshupErrorCode.WHATSAPP_USER_BLOCKED, 'User blocked'),
        success: true,
        messageId: 'test-msg-123',
      };
      
      fallbackManager.recordFallbackAttempt(attempt);
      
      const stats = fallbackManager.getFallbackStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successfulFallbacks).toBe(1);
      expect(stats.fallbackRate).toBe(100);
    });
  });

  describe('SMS Message Optimization', () => {
    test('should get SMS template by name and language', () => {
      const template = smsTemplateManager.getTemplate('scheme_alert_hindi', 'hi');
      
      expect(template).toBeTruthy();
      expect(template?.name).toBe('scheme_alert_hindi');
      expect(template?.language).toBe('hi');
      expect(template?.category).toBe('scheme_alert');
    });

    test('should fallback to English template if language not found', () => {
      const template = smsTemplateManager.getTemplate('scheme_alert_english', 'unknown');
      
      expect(template).toBeTruthy();
      expect(template?.name).toBe('scheme_alert_english');
      expect(template?.language).toBe('en');
    });

    test('should validate template parameters correctly', async () => {
      const parameters = {
        schemeName: 'Test Scheme',
        eligibility: 'Artisans',
        amount: '50000',
        deadline: '2024-12-31',
        applicationUrl: 'https://example.com/apply',
      };
      
      const result = await smsTemplateManager.validateAndFormatTemplate(
        'scheme_alert_english',
        parameters,
        'en'
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.formattedContent).toContain('Test Scheme');
      expect(result.formattedContent).toContain('₹50,000');
    });

    test('should detect missing required parameters', async () => {
      const parameters = {
        schemeName: 'Test Scheme',
        // Missing required parameters
      };
      
      const result = await smsTemplateManager.validateAndFormatTemplate(
        'scheme_alert_english',
        parameters,
        'en'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('eligibility'))).toBe(true);
    });

    test('should optimize long content to fit SMS limits', () => {
      const longContent = 'This is a very long message that exceeds the standard SMS character limit of 160 characters and needs to be optimized for better delivery and cost efficiency while preserving important information.';
      
      const result = smsTemplateManager.optimizeContent(longContent, 160);
      
      expect(result.optimizedLength).toBeLessThanOrEqual(160);
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.smsCount).toBe(1);
    });

    test('should preserve important information during optimization', () => {
      const contentWithImportantInfo = 'योजना: Test Scheme अंतिम तिथि: 31/12/2024 राशि: ₹50,000 आवेदन: https://example.com/apply This is additional text that can be truncated if needed to fit the message within limits.';
      
      const result = smsTemplateManager.optimizeContent(contentWithImportantInfo, 160);
      
      expect(result.optimizedContent).toContain('₹50,000');
      expect(result.optimizedContent).toContain('31/12/2024');
      expect(result.optimizedContent).toContain('https://');
    });
  });

  describe('Integration Tests', () => {
    test('should demonstrate fallback decision making', () => {
      // Test that the fallback manager makes correct decisions
      const whatsappError = new GupshupError(
        GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN,
        'User not opted in'
      );
      
      const decision = fallbackManager.decideFallback(whatsappError, 'whatsapp', 0);
      
      expect(decision.shouldFallback).toBe(true);
      expect(decision.fallbackChannel).toBe('sms');
      expect(decision.delay).toBe(0);
      
      // Test that SMS template manager can format messages
      const template = smsTemplateManager.getTemplate('scheme_alert_english', 'en');
      expect(template).toBeTruthy();
      expect(template?.category).toBe('scheme_alert');
    });
  });
});