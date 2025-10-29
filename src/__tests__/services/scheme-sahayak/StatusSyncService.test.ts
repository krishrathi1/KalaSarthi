/**
 * Tests for Status Synchronization Service
 * Task 6.3: Implement status synchronization system
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { StatusSyncService } from '@/lib/services/scheme-sahayak/StatusSyncService';
import { adminDb } from '@/lib/firebase-admin';
import { SchemeApplication } from '@/lib/types/scheme-sahayak';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

// Mock GovernmentAPIConnector
jest.mock('@/lib/services/scheme-sahayak/GovernmentAPIConnector', () => ({
  GovernmentAPIConnector: jest.fn().mockImplementation(() => ({
    checkApplicationStatus: jest.fn().mockResolvedValue({
      status: 'under_review',
      currentStage: 'Document Verification',
      progress: 50,
      officerAssigned: 'officer123'
    })
  }))
}));

describe('StatusSyncService', () => {
  let statusSyncService: StatusSyncService;
  let mockApplication: SchemeApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    statusSyncService = new StatusSyncService();

    mockApplication = {
      id: 'app123',
      artisanId: 'artisan123',
      schemeId: 'scheme123',
      status: 'submitted',
      formData: {},
      submittedDocuments: [],
      submittedAt: new Date(),
      lastUpdated: new Date(),
      governmentApplicationId: 'gov123'
    };
  });

  describe('syncApplicationStatus', () => {
    it('should sync application status successfully', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockAdd = jest.fn().mockResolvedValue({ id: 'notif123' });
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate });
      const mockCollection = jest.fn((name) => {
        if (name === 'notifications') {
          return { add: mockAdd };
        }
        return { doc: mockDoc };
      });
      (adminDb.collection as jest.Mock) = mockCollection;

      const status = await statusSyncService.syncApplicationStatus('app123');

      expect(status).toBeDefined();
      expect(status.applicationId).toBe('app123');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should skip sync for draft applications', async () => {
      const draftApp = { ...mockApplication, status: 'draft' as const };
      
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => draftApp
      });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const status = await statusSyncService.syncApplicationStatus('app123');

      expect(status.status).toBe('draft');
      expect(status.progress).toBe(0);
    });

    it('should handle application not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        statusSyncService.syncApplicationStatus('nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('getApplicationTimeline', () => {
    it('should generate application timeline', async () => {
      const mockScheme = {
        id: 'scheme123',
        application: {
          processingTime: { min: 30, max: 60 }
        }
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const timeline = await statusSyncService.getApplicationTimeline('app123');

      expect(timeline).toBeDefined();
      expect(timeline.stages).toBeDefined();
      expect(timeline.stages.length).toBeGreaterThan(0);
      expect(timeline.currentStageIndex).toBeGreaterThanOrEqual(0);
      expect(timeline.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include all required stages', async () => {
      const mockScheme = {
        id: 'scheme123',
        application: {
          processingTime: { min: 30, max: 60 }
        }
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const timeline = await statusSyncService.getApplicationTimeline('app123');

      const stageNames = timeline.stages.map(s => s.name);
      expect(stageNames).toContain('Application Submitted');
      expect(stageNames).toContain('Document Verification');
      expect(stageNames).toContain('Eligibility Check');
      expect(stageNames).toContain('Review by Officer');
      expect(stageNames).toContain('Final Decision');
    });

    it('should mark completed stages correctly', async () => {
      const approvedApp = { ...mockApplication, status: 'approved' as const };
      const mockScheme = {
        id: 'scheme123',
        application: {
          processingTime: { min: 30, max: 60 }
        }
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => approvedApp })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const timeline = await statusSyncService.getApplicationTimeline('app123');

      const completedStages = timeline.stages.filter(s => s.status === 'completed');
      expect(completedStages.length).toBeGreaterThan(0);
    });
  });

  describe('syncAllApplications', () => {
    it('should sync multiple applications', async () => {
      const mockApplications = [
        { ...mockApplication, id: 'app1', status: 'submitted' as const },
        { ...mockApplication, id: 'app2', status: 'under_review' as const }
      ];

      const mockDocs = mockApplications.map(app => ({
        id: app.id,
        data: () => app
      }));

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockAdd = jest.fn().mockResolvedValue({ id: 'notif123' });
      const mockGetApp = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app1', data: () => mockApplications[0] })
        .mockResolvedValueOnce({ exists: true, id: 'app2', data: () => mockApplications[1] });

      const mockGetList = jest.fn().mockResolvedValue({ docs: mockDocs });
      const mockWhere = jest.fn().mockReturnValue({ get: mockGetList });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGetApp, update: mockUpdate });
      
      const mockCollection = jest.fn((name) => {
        if (name === 'notifications') {
          return { add: mockAdd };
        }
        if (name === 'applications') {
          return { where: mockWhere, doc: mockDoc };
        }
        return { doc: mockDoc };
      });
      (adminDb.collection as jest.Mock) = mockCollection;

      const result = await statusSyncService.syncAllApplications('artisan123');

      expect(result.success).toBe(true);
      expect(result.applicationsUpdated).toBeGreaterThanOrEqual(0);
      expect(result.lastSyncTime).toBeDefined();
      expect(result.nextSyncTime).toBeDefined();
    });

    it('should skip draft and completed applications', async () => {
      const mockApplications = [
        { ...mockApplication, id: 'app1', status: 'draft' as const },
        { ...mockApplication, id: 'app2', status: 'approved' as const },
        { ...mockApplication, id: 'app3', status: 'submitted' as const }
      ];

      const mockDocs = mockApplications.map(app => ({
        id: app.id,
        data: () => app
      }));

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockAdd = jest.fn().mockResolvedValue({ id: 'notif123' });
      const mockGetApp = jest.fn()
        .mockResolvedValue({ exists: true, id: 'app3', data: () => mockApplications[2] });

      const mockGetList = jest.fn().mockResolvedValue({ docs: mockDocs });
      const mockWhere = jest.fn().mockReturnValue({ get: mockGetList });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGetApp, update: mockUpdate });
      
      const mockCollection = jest.fn((name) => {
        if (name === 'notifications') {
          return { add: mockAdd };
        }
        if (name === 'applications') {
          return { where: mockWhere, doc: mockDoc };
        }
        return { doc: mockDoc };
      });
      (adminDb.collection as jest.Mock) = mockCollection;

      const result = await statusSyncService.syncAllApplications('artisan123');

      // Should only sync the submitted application
      expect(result.applicationsUpdated).toBeLessThanOrEqual(1);
    });
  });

  describe('extractOfficerContact', () => {
    it('should extract officer contact from notes', async () => {
      const appWithNotes = {
        ...mockApplication,
        notes: [
          'Contact Officer: John Doe',
          'Phone: +91-9876543210',
          'Email: john.doe@gov.in'
        ]
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => appWithNotes
      });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const contact = await statusSyncService.extractOfficerContact('app123');

      expect(contact).toBeDefined();
      if (contact) {
        expect(contact.name).toBeDefined();
        expect(contact.phone || contact.email).toBeTruthy();
      }
    });

    it('should return null if no contact information available', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => mockApplication
      });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const contact = await statusSyncService.extractOfficerContact('app123');

      expect(contact).toBeNull();
    });
  });
});
