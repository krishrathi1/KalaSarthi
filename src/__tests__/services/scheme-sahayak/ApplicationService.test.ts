/**
 * Tests for Application Submission Service
 * Task 6.1: Implement application submission system
 * Requirements: 5.1, 5.5
 */

import { ApplicationService } from '@/lib/services/scheme-sahayak/ApplicationService';
import { adminDb } from '@/lib/firebase-admin';
import {
  ArtisanProfile,
  GovernmentScheme,
  SchemeApplication
} from '@/lib/types/scheme-sahayak';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

describe('ApplicationService', () => {
  let applicationService: ApplicationService;
  let mockArtisanProfile: ArtisanProfile;
  let mockScheme: GovernmentScheme;

  beforeEach(() => {
    jest.clearAllMocks();
    applicationService = new ApplicationService();

    // Mock artisan profile
    mockArtisanProfile = {
      id: 'artisan123',
      personalInfo: {
        name: 'Test Artisan',
        phone: '9876543210',
        email: 'test@example.com',
        aadhaarHash: 'hash123',
        panNumber: 'ABCDE1234F',
        dateOfBirth: new Date('1990-01-01')
      },
      location: {
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400001',
        address: 'Test Address, Mumbai'
      },
      business: {
        type: 'Handicraft',
        category: 'Artisan',
        subCategory: 'Pottery',
        registrationNumber: 'REG123456',
        establishmentYear: 2015,
        employeeCount: 5,
        monthlyIncome: 25000,
        experienceYears: 8
      },
      preferences: {
        language: 'en',
        notificationChannels: ['sms', 'email'],
        timeHorizon: 'medium_term',
        riskTolerance: 'medium',
        interestedCategories: ['loan', 'grant']
      },
      documents: {},
      applicationHistory: [],
      aiProfile: {
        features: {},
        successProbability: 0.75,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock scheme
    mockScheme = {
      id: 'scheme123',
      title: 'Artisan Loan Scheme',
      description: 'Low-interest loan for artisans',
      category: 'loan',
      subCategory: 'Business Loan',
      provider: {
        name: 'Ministry of MSME',
        department: 'MSME',
        level: 'central',
        website: 'https://msme.gov.in',
        contactInfo: {}
      },
      eligibility: {
        age: { min: 18, max: 60 },
        income: { max: 500000 },
        businessType: ['Handicraft', 'Artisan'],
        location: {
          states: ['Maharashtra', 'Gujarat']
        },
        otherCriteria: []
      },
      benefits: {
        amount: { min: 50000, max: 500000, currency: 'INR' },
        type: 'loan',
        coverageDetails: 'Low interest loan'
      },
      application: {
        onlineApplication: true,
        requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Business Registration'],
        applicationSteps: [],
        processingTime: { min: 30, max: 60 }
      },
      metadata: {
        popularity: 85,
        successRate: 0.7,
        averageProcessingTime: 45,
        aiFeatures: {},
        lastUpdated: new Date()
      },
      status: 'active'
    };
  });

  describe('createDraft', () => {
    it('should create application draft with auto-populated data', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });
      
      const mockDocForGet = jest.fn().mockReturnValue({ get: mockGet });
      
      (adminDb.collection as jest.Mock) = jest.fn((collectionName) => {
        if (collectionName === 'applications') {
          return { doc: mockDoc };
        }
        return { doc: mockDocForGet };
      });

      const draft = await applicationService.createDraft('artisan123', 'scheme123');

      expect(draft).toBeDefined();
      expect(draft.artisanId).toBe('artisan123');
      expect(draft.schemeId).toBe('scheme123');
      expect(draft.status).toBe('draft');
      expect(draft.formData.applicantName).toBe('Test Artisan');
      expect(draft.formData.phone).toBe('9876543210');
      expect(draft.formData.email).toBe('test@example.com');
      expect(mockSet).toHaveBeenCalled();
    });

    it('should auto-populate business information', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });
      
      const mockDocForGet = jest.fn().mockReturnValue({ get: mockGet });
      
      (adminDb.collection as jest.Mock) = jest.fn((collectionName) => {
        if (collectionName === 'applications') {
          return { doc: mockDoc };
        }
        return { doc: mockDocForGet };
      });

      const draft = await applicationService.createDraft('artisan123', 'scheme123');

      expect(draft.formData.businessType).toBe('Handicraft');
      expect(draft.formData.businessCategory).toBe('Artisan');
      expect(draft.formData.monthlyIncome).toBe(25000);
      expect(draft.formData.registrationNumber).toBe('REG123456');
    });

    it('should throw error if artisan profile not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        applicationService.createDraft('nonexistent', 'scheme123')
      ).rejects.toThrow();
    });

    it('should throw error if scheme not found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: false });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        applicationService.createDraft('artisan123', 'nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('updateDraft', () => {
    it('should update draft application', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: { applicantName: 'Test' },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => mockApplication
      });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await applicationService.updateDraft('app123', { requestedAmount: 100000 });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          formData: expect.objectContaining({
            applicantName: 'Test',
            requestedAmount: 100000
          })
        })
      );
    });

    it('should not update submitted application', async () => {
      const mockApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'submitted',
        formData: {},
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => mockApplication
      });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        applicationService.updateDraft('app123', { requestedAmount: 100000 })
      ).rejects.toThrow('Cannot update submitted application');
    });
  });

  describe('validateApplication', () => {
    it('should validate complete application successfully', async () => {
      const completeApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test Artisan',
          phone: '9876543210',
          email: 'test@example.com',
          dateOfBirth: new Date('1990-01-01'),
          address: 'Test Address',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          businessType: 'Handicraft',
          businessCategory: 'Artisan',
          requestedAmount: 100000,
          monthlyIncome: 25000,
          registrationNumber: 'REG123456'
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => completeApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const validation = await applicationService.validateApplication('app123');

      // Application may have warnings about missing documents, but should have no errors
      expect(validation.errors).toHaveLength(0);
      expect(validation.completeness).toBeGreaterThan(0);
      // isValid is true only if there are no errors
      if (validation.errors.length === 0) {
        expect(validation.isValid).toBe(true);
      }
    });

    it('should identify missing required fields', async () => {
      const incompleteApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test Artisan'
          // Missing other required fields
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => incompleteApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const validation = await applicationService.validateApplication('app123');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.missingFields.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const applicationWithInvalidEmail: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test',
          phone: '9876543210',
          email: 'invalid-email',
          address: 'Test',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          businessType: 'Handicraft',
          businessCategory: 'Artisan'
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => applicationWithInvalidEmail })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const validation = await applicationService.validateApplication('app123');

      const emailError = validation.errors.find(e => e.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.message).toContain('Invalid email format');
    });

    it('should calculate completeness percentage', async () => {
      const partialApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test',
          phone: '9876543210',
          email: 'test@example.com',
          address: 'Test',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          businessType: 'Handicraft',
          businessCategory: 'Artisan'
          // Missing some required fields
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => partialApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const validation = await applicationService.validateApplication('app123');

      expect(validation.completeness).toBeGreaterThanOrEqual(0);
      expect(validation.completeness).toBeLessThanOrEqual(100);
    });
  });

  describe('submitApplication', () => {
    it('should submit valid application', async () => {
      const validApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test Artisan',
          phone: '9876543210',
          email: 'test@example.com',
          dateOfBirth: new Date('1990-01-01'),
          address: 'Test Address',
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400001',
          businessType: 'Handicraft',
          businessCategory: 'Artisan',
          requestedAmount: 100000,
          monthlyIncome: 25000,
          registrationNumber: 'REG123456'
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockAdd = jest.fn().mockResolvedValue({ id: 'notif123' });
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => validApplication })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => validApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate });
      const mockCollection = jest.fn((name) => {
        if (name === 'notifications') {
          return { add: mockAdd };
        }
        return { doc: mockDoc };
      });
      (adminDb.collection as jest.Mock) = mockCollection;

      const result = await applicationService.submitApplication('app123');

      expect(result.status).toBe('submitted');
      expect(result.applicationId).toBe('app123');
      expect(result.confirmationNumber).toBeDefined();
      expect(result.estimatedProcessingTime).toBeGreaterThan(0);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should not submit invalid application', async () => {
      const invalidApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {
          applicantName: 'Test'
          // Missing required fields
        },
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => invalidApplication })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => invalidApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const result = await applicationService.submitApplication('app123');

      expect(result.status).toBe('failed');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should not submit already submitted application', async () => {
      const submittedApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'submitted',
        formData: {},
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => submittedApplication
      });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        applicationService.submitApplication('app123')
      ).rejects.toThrow('Application has already been submitted');
    });
  });

  describe('listApplications', () => {
    it('should list applications for artisan', async () => {
      const mockApplications = [
        {
          id: 'app1',
          artisanId: 'artisan123',
          schemeId: 'scheme1',
          status: 'draft',
          formData: {},
          submittedDocuments: [],
          lastUpdated: new Date()
        },
        {
          id: 'app2',
          artisanId: 'artisan123',
          schemeId: 'scheme2',
          status: 'submitted',
          formData: {},
          submittedDocuments: [],
          lastUpdated: new Date()
        }
      ];

      const mockDocs = mockApplications.map(app => ({
        id: app.id,
        data: () => app
      }));

      const mockGet = jest.fn().mockResolvedValue({ docs: mockDocs });
      const mockLimit = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet
      };
      
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue(mockQuery);

      const applications = await applicationService.listApplications('artisan123');

      expect(applications).toHaveLength(2);
      expect(applications[0].artisanId).toBe('artisan123');
    });

    it('should filter applications by status', async () => {
      const mockApplications = [
        {
          id: 'app1',
          artisanId: 'artisan123',
          schemeId: 'scheme1',
          status: 'draft',
          formData: {},
          submittedDocuments: [],
          lastUpdated: new Date()
        }
      ];

      const mockDocs = mockApplications.map(app => ({
        id: app.id,
        data: () => app
      }));

      const mockGet = jest.fn().mockResolvedValue({ docs: mockDocs });
      const mockLimit = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet
      };
      
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue(mockQuery);

      const applications = await applicationService.listApplications('artisan123', {
        status: 'draft'
      });

      expect(applications).toHaveLength(1);
      expect(applications[0].status).toBe('draft');
    });
  });

  describe('deleteApplication', () => {
    it('should delete draft application', async () => {
      const draftApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'draft',
        formData: {},
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => draftApplication
      });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet, delete: mockDelete });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await applicationService.deleteApplication('app123');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should not delete submitted application', async () => {
      const submittedApplication: SchemeApplication = {
        id: 'app123',
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        status: 'submitted',
        formData: {},
        submittedDocuments: [],
        lastUpdated: new Date()
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        id: 'app123',
        data: () => submittedApplication
      });
      
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      await expect(
        applicationService.deleteApplication('app123')
      ).rejects.toThrow('Only draft applications can be deleted');
    });
  });
});
