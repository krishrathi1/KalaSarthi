/**
 * Tests for Application Guidance Service
 * Task 6.4: Create application guidance system
 * Requirements: 5.2, 5.3, 5.4
 */

import { ApplicationGuidanceService } from '@/lib/services/scheme-sahayak/ApplicationGuidanceService';
import { adminDb } from '@/lib/firebase-admin';
import {
  SchemeApplication,
  ArtisanProfile,
  GovernmentScheme
} from '@/lib/types/scheme-sahayak';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

// Mock ApplicationService
jest.mock('@/lib/services/scheme-sahayak/ApplicationService', () => ({
  ApplicationService: jest.fn().mockImplementation(() => ({
    validateApplication: jest.fn().mockResolvedValue({
      isValid: true,
      completeness: 85,
      errors: [],
      warnings: [],
      missingFields: [],
      missingDocuments: []
    })
  }))
}));

describe('ApplicationGuidanceService', () => {
  let guidanceService: ApplicationGuidanceService;
  let mockApplication: SchemeApplication;
  let mockProfile: ArtisanProfile;
  let mockScheme: GovernmentScheme;

  beforeEach(() => {
    jest.clearAllMocks();
    guidanceService = new ApplicationGuidanceService();

    mockApplication = {
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
        businessCategory: 'Artisan'
      },
      submittedDocuments: [],
      lastUpdated: new Date()
    };

    mockProfile = {
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
        address: 'Test Address'
      },
      business: {
        type: 'Handicraft',
        category: 'Artisan',
        subCategory: 'Pottery',
        registrationNumber: 'REG123',
        establishmentYear: 2015,
        employeeCount: 5,
        monthlyIncome: 25000,
        experienceYears: 8
      },
      preferences: {
        language: 'en',
        notificationChannels: ['sms'],
        timeHorizon: 'medium_term',
        riskTolerance: 'medium',
        interestedCategories: ['loan']
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

    mockScheme = {
      id: 'scheme123',
      title: 'Test Scheme',
      description: 'Test',
      category: 'loan',
      subCategory: 'Business',
      provider: {
        name: 'Test',
        department: 'Test',
        level: 'central',
        website: 'test.com',
        contactInfo: {}
      },
      eligibility: {
        age: { min: 18, max: 60 },
        income: { max: 500000 },
        businessType: ['Handicraft'],
        location: { states: ['Maharashtra'] },
        otherCriteria: []
      },
      benefits: {
        amount: { min: 50000, max: 500000, currency: 'INR' },
        type: 'loan',
        coverageDetails: 'Test'
      },
      application: {
        onlineApplication: true,
        requiredDocuments: ['Aadhaar', 'PAN'],
        applicationSteps: [],
        processingTime: { min: 30, max: 60 }
      },
      metadata: {
        popularity: 80,
        successRate: 0.7,
        averageProcessingTime: 45,
        aiFeatures: {},
        lastUpdated: new Date()
      },
      status: 'active'
    };
  });

  describe('getApplicationSteps', () => {
    it('should generate application steps', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const steps = await guidanceService.getApplicationSteps('app123');

      expect(steps).toBeDefined();
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('completed');
    });

    it('should include all required steps', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const steps = await guidanceService.getApplicationSteps('app123');

      const stepIds = steps.map(s => s.id);
      expect(stepIds).toContain('personal_info');
      expect(stepIds).toContain('location');
      expect(stepIds).toContain('business_info');
      expect(stepIds).toContain('documents');
      expect(stepIds).toContain('review');
    });

    it('should mark completed steps correctly', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const steps = await guidanceService.getApplicationSteps('app123');

      const personalInfoStep = steps.find(s => s.id === 'personal_info');
      expect(personalInfoStep?.completed).toBe(true);
    });
  });

  describe('getGuidanceProgress', () => {
    it('should calculate progress correctly', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const progress = await guidanceService.getGuidanceProgress('app123');

      expect(progress).toBeDefined();
      expect(progress.applicationId).toBe('app123');
      expect(progress.percentComplete).toBeGreaterThanOrEqual(0);
      expect(progress.percentComplete).toBeLessThanOrEqual(100);
      expect(progress.totalSteps).toBeGreaterThan(0);
    });

    it('should provide next step information', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const progress = await guidanceService.getGuidanceProgress('app123');

      if (progress.percentComplete < 100) {
        expect(progress.nextStep).toBeDefined();
        expect(progress.nextStep?.title).toBeDefined();
      }
    });
  });

  describe('analyzeApplicationStrength', () => {
    it('should analyze application strength', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockProfile })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const analysis = await guidanceService.analyzeApplicationStrength('app123');

      expect(analysis).toBeDefined();
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.category).toBeDefined();
      expect(['weak', 'moderate', 'strong', 'excellent']).toContain(analysis.category);
    });

    it('should provide strengths and weaknesses', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockProfile })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const analysis = await guidanceService.analyzeApplicationStrength('app123');

      expect(Array.isArray(analysis.strengths)).toBe(true);
      expect(Array.isArray(analysis.weaknesses)).toBe(true);
    });

    it('should generate prioritized recommendations', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockProfile })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const analysis = await guidanceService.analyzeApplicationStrength('app123');

      expect(Array.isArray(analysis.recommendations)).toBe(true);
      if (analysis.recommendations.length > 0) {
        expect(analysis.recommendations[0]).toHaveProperty('priority');
        expect(analysis.recommendations[0]).toHaveProperty('recommendation');
        expect(analysis.recommendations[0]).toHaveProperty('impact');
      }
    });

    it('should calculate success probability', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockProfile })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const analysis = await guidanceService.analyzeApplicationStrength('app123');

      expect(analysis.successProbability).toBeGreaterThanOrEqual(0);
      expect(analysis.successProbability).toBeLessThanOrEqual(1);
    });

    it('should provide comparison with similar applications', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication })
        .mockResolvedValueOnce({ exists: true, id: 'scheme123', data: () => mockScheme })
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockProfile })
        .mockResolvedValueOnce({ exists: true, id: 'app123', data: () => mockApplication });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      (adminDb.collection as jest.Mock) = jest.fn().mockReturnValue({ doc: mockDoc });

      const analysis = await guidanceService.analyzeApplicationStrength('app123');

      expect(analysis.comparisonWithSimilar).toBeDefined();
      expect(analysis.comparisonWithSimilar.averageScore).toBeGreaterThanOrEqual(0);
      expect(['below_average', 'average', 'above_average']).toContain(
        analysis.comparisonWithSimilar.yourPosition
      );
    });
  });
});
