/**
 * Tests for Missing Document Analysis functionality
 * Task 5.4: Create missing document analysis
 * Requirement: 2.4 - Identify missing documents with 95% accuracy
 */

import { DocumentManager } from '@/lib/services/scheme-sahayak/DocumentManager';
import { adminDb } from '@/lib/firebase-admin';
import {
  ArtisanProfile,
  GovernmentScheme,
  DocumentInfo,
  MissingDocumentReport
} from '@/lib/types/scheme-sahayak';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn()
  }
}));

// Mock Google Cloud services
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn()
  }))
}));

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    documentTextDetection: jest.fn()
  }))
}));

describe('DocumentManager - Missing Document Analysis', () => {
  let documentManager: DocumentManager;
  let mockArtisanProfile: ArtisanProfile;
  let mockSchemes: GovernmentScheme[];

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize DocumentManager
    documentManager = new DocumentManager();

    // Create mock artisan profile with some documents
    mockArtisanProfile = {
      id: 'artisan123',
      personalInfo: {
        name: 'Test Artisan',
        phone: '9876543210',
        email: 'test@example.com',
        aadhaarHash: 'hash123',
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
      documents: {
        'doc1': {
          id: 'doc1',
          type: 'aadhaar',
          filename: 'aadhaar.pdf',
          uploadDate: new Date(),
          status: 'verified',
          qualityScore: 95
        },
        'doc2': {
          id: 'doc2',
          type: 'photo',
          filename: 'photo.jpg',
          uploadDate: new Date(),
          status: 'verified',
          qualityScore: 90
        }
      },
      applicationHistory: [],
      aiProfile: {
        features: {},
        successProbability: 0.75,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create mock schemes
    mockSchemes = [
      {
        id: 'scheme1',
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
          income: { max: 300000 },
          businessType: ['Handicraft', 'Artisan'],
          location: {},
          otherCriteria: []
        },
        benefits: {
          amount: { min: 50000, max: 500000, currency: 'INR' },
          type: 'loan',
          coverageDetails: 'Low interest loan'
        },
        application: {
          onlineApplication: true,
          requiredDocuments: [
            'Aadhaar Card',
            'PAN Card',
            'Business Registration',
            'Bank Statement',
            'Income Certificate',
            'Photo'
          ],
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
      },
      {
        id: 'scheme2',
        title: 'SC/ST Artisan Grant',
        description: 'Grant for SC/ST artisans',
        category: 'grant',
        subCategory: 'Social Welfare',
        provider: {
          name: 'Ministry of Social Justice',
          department: 'Social Justice',
          level: 'central',
          website: 'https://socialjustice.gov.in',
          contactInfo: {}
        },
        eligibility: {
          age: { min: 18 },
          businessType: ['Handicraft', 'Artisan'],
          location: {},
          otherCriteria: ['SC/ST category']
        },
        benefits: {
          amount: { min: 25000, max: 100000, currency: 'INR' },
          type: 'grant',
          coverageDetails: 'One-time grant'
        },
        application: {
          onlineApplication: true,
          requiredDocuments: [
            'Aadhaar Card',
            'Caste Certificate',
            'Business Registration',
            'Photo'
          ],
          applicationSteps: [],
          processingTime: { min: 45, max: 90 }
        },
        metadata: {
          popularity: 75,
          successRate: 0.65,
          averageProcessingTime: 60,
          aiFeatures: {},
          lastUpdated: new Date()
        },
        status: 'active'
      }
    ];
  });

  describe('generateMissingDocumentReport', () => {
    it('should identify missing documents correctly', async () => {
      // Mock Firestore calls
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] })
        .mockResolvedValueOnce({ exists: true, id: 'scheme2', data: () => mockSchemes[1] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1', 'scheme2']
      );

      // Verify report structure
      expect(report).toBeDefined();
      expect(report.artisanId).toBe('artisan123');
      expect(report.schemes).toEqual(['scheme1', 'scheme2']);
      expect(report.missingDocuments).toBeDefined();
      expect(Array.isArray(report.missingDocuments)).toBe(true);
      expect(report.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(report.completionPercentage).toBeLessThanOrEqual(100);
      expect(report.estimatedTimeToComplete).toBeGreaterThanOrEqual(0);
    });

    it('should identify PAN card as missing', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Should identify PAN as missing
      const panMissing = report.missingDocuments.find(doc => doc.documentType === 'pan');
      expect(panMissing).toBeDefined();
      expect(panMissing?.requiredFor).toContain('Artisan Loan Scheme');
    });

    it('should identify business registration as missing', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Should identify business registration as missing
      const businessRegMissing = report.missingDocuments.find(
        doc => doc.documentType === 'business_registration'
      );
      expect(businessRegMissing).toBeDefined();
      expect(businessRegMissing?.priority).toBe('high');
    });

    it('should identify caste certificate as missing for SC/ST scheme', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme2', data: () => mockSchemes[1] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme2']
      );

      // Should identify caste certificate as missing
      const casteCertMissing = report.missingDocuments.find(
        doc => doc.documentType === 'caste_certificate'
      );
      expect(casteCertMissing).toBeDefined();
      expect(casteCertMissing?.requiredFor).toContain('SC/ST Artisan Grant');
    });

    it('should calculate completion percentage correctly', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Artisan has 2 documents (aadhaar, photo) out of required documents
      // Completion should be less than 100%
      expect(report.completionPercentage).toBeLessThan(100);
      expect(report.completionPercentage).toBeGreaterThan(0);
    });

    it('should provide document descriptions and where to obtain', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Check that each missing document has description and whereToObtain
      for (const doc of report.missingDocuments) {
        expect(doc.description).toBeDefined();
        expect(doc.description.length).toBeGreaterThan(0);
        expect(doc.whereToObtain).toBeDefined();
        expect(doc.whereToObtain.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize documents correctly', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // High priority documents should come first
      const priorities = report.missingDocuments.map(doc => doc.priority);
      
      // Check that high priority docs come before low priority
      const firstHighIndex = priorities.indexOf('high');
      const lastLowIndex = priorities.lastIndexOf('low');
      
      if (firstHighIndex !== -1 && lastLowIndex !== -1) {
        expect(firstHighIndex).toBeLessThan(lastLowIndex);
      }
    });

    it('should estimate completion time', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Should provide a reasonable time estimate
      expect(report.estimatedTimeToComplete).toBeGreaterThan(0);
      expect(report.estimatedTimeToComplete).toBeLessThan(365); // Less than a year
    });

    it('should handle multiple schemes correctly', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] })
        .mockResolvedValueOnce({ exists: true, id: 'scheme2', data: () => mockSchemes[1] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1', 'scheme2']
      );

      // Should aggregate requirements from both schemes
      expect(report.schemes).toEqual(['scheme1', 'scheme2']);
      
      // Should list which schemes require each document
      const businessRegDoc = report.missingDocuments.find(
        doc => doc.documentType === 'business_registration'
      );
      
      if (businessRegDoc) {
        expect(businessRegDoc.requiredFor.length).toBeGreaterThan(0);
      }
    });

    it('should not list documents that are already uploaded', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Should not list Aadhaar or Photo as missing (already uploaded)
      const aadhaarMissing = report.missingDocuments.find(doc => doc.documentType === 'aadhaar');
      const photoMissing = report.missingDocuments.find(doc => doc.documentType === 'photo');
      
      expect(aadhaarMissing).toBeUndefined();
      expect(photoMissing).toBeUndefined();
    });

    it('should handle expired documents as missing', async () => {
      // Add expired document to profile
      const profileWithExpired = {
        ...mockArtisanProfile,
        documents: {
          ...mockArtisanProfile.documents,
          'doc3': {
            id: 'doc3',
            type: 'income_certificate',
            filename: 'income.pdf',
            uploadDate: new Date('2020-01-01'),
            status: 'expired',
            expiryDate: new Date('2021-01-01'),
            qualityScore: 90
          } as DocumentInfo
        }
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => profileWithExpired })
        .mockResolvedValueOnce({ exists: true, id: 'scheme1', data: () => mockSchemes[0] });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      const report = await documentManager.generateMissingDocumentReport(
        'artisan123',
        ['scheme1']
      );

      // Should list expired income certificate as missing
      const incomeCertMissing = report.missingDocuments.find(
        doc => doc.documentType === 'income_certificate'
      );
      
      expect(incomeCertMissing).toBeDefined();
      expect(incomeCertMissing?.description).toContain('Expired');
    });

    it('should throw error if artisan profile not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      await expect(
        documentManager.generateMissingDocumentReport('nonexistent', ['scheme1'])
      ).rejects.toThrow();
    });

    it('should throw error if no schemes found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({ exists: true, id: 'artisan123', data: () => mockArtisanProfile })
        .mockResolvedValue({ exists: false });

      const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      (adminDb.collection as jest.Mock) = mockCollection;

      await expect(
        documentManager.generateMissingDocumentReport('artisan123', ['nonexistent'])
      ).rejects.toThrow();
    });
  });
});
