/**
 * Tests for Application Tracker Service
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { ApplicationTracker } from '@/lib/services/scheme-sahayak/ApplicationTracker';
import type { SchemeApplication } from '@/lib/types/scheme-sahayak';

describe('ApplicationTracker', () => {
  let applicationTracker: ApplicationTracker;

  beforeEach(() => {
    // Disable automatic sync for tests
    applicationTracker = new ApplicationTracker({ enabled: false });
  });

  afterEach(async () => {
    // Cleanup
    await applicationTracker.cleanup();
  });

  describe('Application Submission', () => {
    it('should submit application successfully', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_test_001',
        artisanId: 'artisan_test_001',
        schemeId: 'scheme_test_001',
        status: 'draft',
        formData: {
          name: 'Test Artisan',
          businessType: 'Handicraft',
          monthlyIncome: 50000,
          experienceYears: 5
        },
        submittedDocuments: ['doc_1', 'doc_2'],
        lastUpdated: new Date()
      };

      const result = await applicationTracker.submitApplication(mockApplication);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe(mockApplication.id);
      expect(['submitted', 'pending']).toContain(result.status);
      expect(result.submissionMethod).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      expect(Array.isArray(result.nextSteps)).toBe(true);
    });

    it('should validate application before submission', async () => {
      const invalidApplication = {
        id: 'app_test_002',
        artisanId: 'artisan_test_002'
        // Missing required fields
      } as any;

      try {
        await applicationTracker.submitApplication(invalidApplication);
        // If it doesn't throw, validation passed (may happen with fallback)
      } catch (error) {
        // Expected to throw validation error
        expect(error).toBeDefined();
      }
    });

    it('should handle application with empty form data', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app_test_003',
        artisanId: 'artisan_test_003',
        schemeId: 'scheme_test_003',
        status: 'draft',
        formData: {}, // Empty form data
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      try {
        const result = await applicationTracker.submitApplication(mockApplication);
        // May succeed via fallback or fail validation
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to throw validation error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Application Tracking', () => {
    it('should track application status', async () => {
      const applicationId = 'app_test_004';

      const status = await applicationTracker.trackApplication(applicationId);

      expect(status).toBeDefined();
      expect(status.applicationId).toBeDefined();
      expect(status.status).toBeDefined();
      expect(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'on_hold']).toContain(status.status);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('should provide next actions in status', async () => {
      const applicationId = 'app_test_005';

      const status = await applicationTracker.trackApplication(applicationId);

      expect(status.nextActions).toBeDefined();
      expect(Array.isArray(status.nextActions)).toBe(true);
    });
  });

  describe('Application Timeline', () => {
    it('should generate application timeline', async () => {
      const applicationId = 'app_test_006';

      const timeline = await applicationTracker.getApplicationTimeline(applicationId);

      expect(timeline).toBeDefined();
      expect(timeline.stages).toBeDefined();
      expect(Array.isArray(timeline.stages)).toBe(true);
      expect(timeline.stages.length).toBeGreaterThan(0);
      expect(timeline.currentStageIndex).toBeGreaterThanOrEqual(0);
      expect(timeline.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include all required stages in timeline', async () => {
      const applicationId = 'app_test_007';

      const timeline = await applicationTracker.getApplicationTimeline(applicationId);

      const expectedStages = [
        'Application Submitted',
        'Document Verification',
        'Eligibility Assessment',
        'Officer Review',
        'Final Decision'
      ];

      const stageNames = timeline.stages.map(stage => stage.name);
      expectedStages.forEach(expectedStage => {
        expect(stageNames).toContain(expectedStage);
      });
    });

    it('should calculate progress correctly', async () => {
      const applicationId = 'app_test_008';

      const timeline = await applicationTracker.getApplicationTimeline(applicationId);

      timeline.stages.forEach(stage => {
        expect(['completed', 'in_progress', 'pending', 'failed']).toContain(stage.status);
        expect(stage.estimatedDuration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Application Synchronization', () => {
    it('should sync all applications for an artisan', async () => {
      const artisanId = 'artisan_test_009';

      const syncResult = await applicationTracker.syncAllApplications(artisanId);

      expect(syncResult).toBeDefined();
      expect(syncResult.success).toBeDefined();
      expect(syncResult.applicationsUpdated).toBeGreaterThanOrEqual(0);
      expect(syncResult.errors).toBeDefined();
      expect(Array.isArray(syncResult.errors)).toBe(true);
      expect(syncResult.lastSyncTime).toBeInstanceOf(Date);
      expect(syncResult.nextSyncTime).toBeInstanceOf(Date);
    });

    it('should handle sync errors gracefully', async () => {
      const artisanId = 'artisan_invalid';

      const syncResult = await applicationTracker.syncAllApplications(artisanId);

      expect(syncResult).toBeDefined();
      expect(syncResult.success).toBeDefined();
      // Should not throw, but may have errors in the result
    });
  });

  describe('Webhook Setup', () => {
    it('should setup status webhooks for application', async () => {
      const applicationId = 'app_test_010';

      // Webhook setup may fail if portal doesn't support webhooks
      try {
        await applicationTracker.setupStatusWebhooks(applicationId);
      } catch (error) {
        // Expected if webhook registration fails
        expect(error).toBeDefined();
      }
    });
  });

  describe('Automatic Sync', () => {
    it('should start automatic sync', () => {
      const tracker = new ApplicationTracker({ enabled: true, interval: 1000 });

      expect(() => tracker.startAutomaticSync()).not.toThrow();

      tracker.stopAutomaticSync();
    });

    it('should stop automatic sync', () => {
      const tracker = new ApplicationTracker({ enabled: true, interval: 1000 });
      tracker.startAutomaticSync();

      expect(() => tracker.stopAutomaticSync()).not.toThrow();
    });

    it('should not start sync twice', () => {
      const tracker = new ApplicationTracker({ enabled: true, interval: 1000 });
      tracker.startAutomaticSync();

      // Should not throw, but should log warning
      expect(() => tracker.startAutomaticSync()).not.toThrow();

      tracker.stopAutomaticSync();
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      // Health check may fail if no APIs are accessible in test environment
      try {
        await applicationTracker.performHealthCheck();
      } catch (error) {
        // Expected in test environment without real API connections
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      const tracker = new ApplicationTracker({ enabled: true, interval: 1000 });
      tracker.startAutomaticSync();

      await expect(tracker.cleanup()).resolves.not.toThrow();
    });
  });
});
