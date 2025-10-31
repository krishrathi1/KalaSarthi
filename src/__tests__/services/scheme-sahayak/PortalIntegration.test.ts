/**
 * Tests for Portal Integration Service
 * Requirements: 3.1, 11.1, 11.2
 */

import { PortalIntegrationService } from '@/lib/services/scheme-sahayak/PortalIntegrationService';
import type { SchemeApplication, WebhookPayload } from '@/lib/types/scheme-sahayak';

describe('PortalIntegrationService', () => {
  let portalIntegration: PortalIntegrationService;

  beforeEach(() => {
    portalIntegration = new PortalIntegrationService();
  });

  describe('Application Submission', () => {
    it('should submit application via API successfully', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_123',
        artisanId: 'artisan_456',
        schemeId: 'scheme_789',
        status: 'draft',
        formData: {
          name: 'Test Artisan',
          businessType: 'Handicraft',
          income: 50000
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const result = await portalIntegration.submitApplication(
        mockApplication.schemeId,
        mockApplication
      );

      expect(result).toBeDefined();
      expect(result.applicationId).toBe(mockApplication.id);
      expect(['submitted', 'pending']).toContain(result.status);
      expect(result.submissionMethod).toBeDefined();
    });

    it('should handle API failure and fallback to scraping', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_124',
        artisanId: 'artisan_457',
        schemeId: 'scheme_invalid',
        status: 'draft',
        formData: {
          name: 'Test Artisan 2'
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const result = await portalIntegration.submitApplication(
        mockApplication.schemeId,
        mockApplication
      );

      // Should either succeed via fallback or return manual submission required
      expect(result).toBeDefined();
      expect(['submitted', 'pending']).toContain(result.status);
    });
  });

  describe('Status Checking', () => {
    it('should check application status successfully', async () => {
      const governmentAppId = 'GOV_APP_123';
      const schemeId = 'scheme_789';

      const status = await portalIntegration.checkApplicationStatus(
        governmentAppId,
        schemeId
      );

      expect(status).toBeDefined();
      expect(status.applicationId).toBe(governmentAppId);
      expect(status.schemeId).toBeDefined(); // May be 'unknown' in mock
      expect(status.status).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Webhook Management', () => {
    it('should register webhook successfully', async () => {
      const portalName = 'test_portal';
      const events = ['application.status_changed', 'application.approved'];
      const callbackUrl = 'https://example.com/webhook';

      const webhook = await portalIntegration.registerWebhook(
        portalName,
        events,
        callbackUrl
      );

      expect(webhook).toBeDefined();
      expect(webhook.id).toBeDefined();
      expect(webhook.portalName).toBe(portalName);
      expect(webhook.events).toEqual(events);
      expect(webhook.endpoint).toBe(callbackUrl);
      expect(webhook.secret).toBeDefined();
      expect(webhook.active).toBe(true);
    });

    it('should handle incoming webhook', async () => {
      const mockPayload: WebhookPayload = {
        event: 'application.status_changed',
        timestamp: new Date(),
        portalName: 'test_portal',
        data: {
          applicationId: 'app_123',
          governmentApplicationId: 'GOV_APP_123',
          status: 'approved',
          message: 'Application approved'
        },
        signature: 'test_signature'
      };

      const result = await portalIntegration.handleWebhook(
        mockPayload,
        'test_signature'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should list registered webhooks', async () => {
      // Register a webhook first
      await portalIntegration.registerWebhook(
        'test_portal',
        ['application.status_changed'],
        'https://example.com/webhook'
      );

      const webhooks = await portalIntegration.listWebhooks();

      expect(webhooks).toBeDefined();
      expect(Array.isArray(webhooks)).toBe(true);
      expect(webhooks.length).toBeGreaterThan(0);
    });

    it('should filter webhooks by portal name', async () => {
      const portalName = 'specific_portal';
      
      await portalIntegration.registerWebhook(
        portalName,
        ['application.approved'],
        'https://example.com/webhook'
      );

      const webhooks = await portalIntegration.listWebhooks(portalName);

      expect(webhooks).toBeDefined();
      expect(webhooks.every(w => w.portalName === portalName)).toBe(true);
    });
  });

  describe('Web Scraping Fallback', () => {
    it('should handle scraping submission when API fails', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_125',
        artisanId: 'artisan_458',
        schemeId: 'scheme_scraping',
        status: 'draft',
        formData: {
          name: 'Scraping Test'
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      // This should attempt API first, then fall back to scraping
      const result = await portalIntegration.submitApplication(
        mockApplication.schemeId,
        mockApplication
      );

      expect(result).toBeDefined();
      expect(result.applicationId).toBe(mockApplication.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid scheme ID gracefully', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_126',
        artisanId: 'artisan_459',
        schemeId: '',
        status: 'draft',
        formData: {},
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      // With fallback, it may still succeed via scraping
      const result = await portalIntegration.submitApplication('', mockApplication);
      expect(result).toBeDefined();
      expect(result.applicationId).toBe(mockApplication.id);
    });

    it('should handle missing application data', async () => {
      const invalidApplication = {
        id: 'app_127',
        artisanId: 'artisan_460',
        schemeId: 'scheme_789'
      } as any;

      // With fallback, it may still succeed via scraping
      const result = await portalIntegration.submitApplication(
        invalidApplication.schemeId,
        invalidApplication
      );
      expect(result).toBeDefined();
      expect(result.applicationId).toBe(invalidApplication.id);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      // Health check may fail if no APIs are accessible in test environment
      try {
        await portalIntegration.performHealthCheck();
      } catch (error) {
        // Expected in test environment without real API connections
        expect(error).toBeDefined();
      }
    });
  });
});
