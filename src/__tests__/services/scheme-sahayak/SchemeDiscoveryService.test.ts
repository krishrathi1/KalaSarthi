/**
 * Tests for SchemeDiscoveryService
 * Testing scheme discovery and search functionality
 */

import { SchemeDiscoveryService } from '../../../lib/services/scheme-sahayak/SchemeDiscoveryService';
import { GovernmentScheme, ArtisanProfile } from '../../../lib/types/scheme-sahayak';

// Mock Firebase
jest.mock('../../../lib/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn()
}));

// Mock the config
jest.mock('../../../lib/config/scheme-sahayak-firebase', () => ({
  schemeSahayakCollections: {
    schemes: {}
  }
}));

describe('SchemeDiscoveryService', () => {
  let service: SchemeDiscoveryService;
  let mockSchemes: GovernmentScheme[];
  let mockArtisanProfile: ArtisanProfile;

  beforeEach(() => {
    service = new SchemeDiscoveryService();
    
    // Mock schemes data
    mockSchemes = [
      {
        id: 'scheme1',
        title: 'MUDRA Loan Scheme',
        description: 'Micro finance scheme for small businesses',
        category: 'loan',
        subCategory: 'micro-finance',
        provider: {
          name: 'MUDRA',
          department: 'Ministry of Finance',
          level: 'central',
          website: 'https://mudra.org.in',
          contactInfo: {}
        },
        eligibility: {
          age: { min: 18, max: 65 },
          income: { max: 1000000 },
          businessType: ['manufacturing', 'services'],
          location: { states: ['Maharashtra', 'Gujarat'] },
          otherCriteria: []
        },
        benefits: {
          amount: { min: 50000, max: 1000000, currency: 'INR' },
          type: 'loan',
          coverageDetails: 'Working capital and equipment financing'
        },
        application: {
          onlineApplication: true,
          requiredDocuments: ['aadhaar', 'pan', 'business_registration'],
          applicationSteps: [],
          processingTime: { min: 15, max: 30 }
        },
        metadata: {
          popularity: 85,
          successRate: 75,
          averageProcessingTime: 22,
          aiFeatures: {},
          lastUpdated: new Date()
        },
        status: 'active'
      },
      {
        id: 'scheme2',
        title: 'PM Kisan Samman Nidhi',
        description: 'Direct income support to farmers',
        category: 'grant',
        subCategory: 'agricultural-support',
        provider: {
          name: 'Ministry of Agriculture',
          department: 'Government of India',
          level: 'central',
          website: 'https://pmkisan.gov.in',
          contactInfo: {}
        },
        eligibility: {
          age: {},
          income: {},
          businessType: ['agriculture'],
          location: { states: [] }, // All states
          otherCriteria: ['Must own agricultural land']
        },
        benefits: {
          amount: { min: 6000, max: 6000, currency: 'INR' },
          type: 'grant',
          coverageDetails: 'Annual income support of ₹6000'
        },
        application: {
          onlineApplication: true,
          requiredDocuments: ['aadhaar', 'land_records'],
          applicationSteps: [],
          processingTime: { min: 7, max: 15 }
        },
        metadata: {
          popularity: 95,
          successRate: 90,
          averageProcessingTime: 10,
          aiFeatures: {},
          lastUpdated: new Date()
        },
        status: 'active'
      }
    ];

    // Mock artisan profile
    mockArtisanProfile = {
      id: 'artisan1',
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
        type: 'manufacturing',
        category: 'handicraft',
        subCategory: 'pottery',
        establishmentYear: 2020,
        employeeCount: 5,
        monthlyIncome: 50000,
        experienceYears: 3
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
  });

  describe('searchSchemes', () => {
    it('should search schemes with text query', async () => {
      // Mock getDocs to return our mock schemes
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.searchSchemes('loan', {
        pageSize: 10,
        sortBy: 'popularity'
      });

      expect(result.schemes).toBeDefined();
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.searchMetadata).toBeDefined();
      expect(result.searchMetadata.query).toBe('loan');
    });

    it('should handle empty search query', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.searchSchemes('', {
        pageSize: 10
      });

      expect(result.schemes).toBeDefined();
      expect(result.searchMetadata.query).toBe('');
    });

    it('should apply personalization when user profile is provided', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.searchSchemes('loan', {
        pageSize: 10
      }, mockArtisanProfile);

      expect(result.schemes).toBeDefined();
      // Check if personalization metadata is added
      if (result.schemes.length > 0) {
        expect(result.schemes[0]._eligibilityMatch).toBeDefined();
        expect(result.schemes[0]._personalizedScore).toBeDefined();
      }
    });
  });

  describe('getPaginatedSchemes', () => {
    it('should return paginated results', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.getPaginatedSchemes({
        pageSize: 1,
        page: 1,
        sortBy: 'popularity'
      });

      expect(result.schemes).toBeDefined();
      expect(result.schemes.length).toBeLessThanOrEqual(1);
      expect(result.totalCount).toBeDefined();
      expect(result.hasMore).toBeDefined();
    });

    it('should handle category filtering', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.filter(s => s.category === 'loan').map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: 1
      });

      const result = await service.getPaginatedSchemes({
        category: 'loan',
        pageSize: 10
      });

      expect(result.schemes).toBeDefined();
      expect(result.searchMetadata.filters.category).toBe('loan');
    });
  });

  describe('getSchemesByCategory', () => {
    it('should filter schemes by category', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.filter(s => s.category === 'grant').map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: 1
      });

      const result = await service.getSchemesByCategory('grant');

      expect(result.schemes).toBeDefined();
      expect(result.searchMetadata.filters.category).toBe('grant');
    });

    it('should throw error for invalid category', async () => {
      await expect(service.getSchemesByCategory('')).rejects.toMatchObject({
        error: {
          message: expect.stringContaining('Category is required')
        }
      });
    });
  });

  describe('getSchemesByLocation', () => {
    it('should filter schemes by location', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.getSchemesByLocation({
        state: 'Maharashtra'
      });

      expect(result.schemes).toBeDefined();
      expect(result.searchMetadata.filters.location?.state).toBe('Maharashtra');
    });

    it('should throw error for missing state', async () => {
      await expect(service.getSchemesByLocation({ state: '' })).rejects.toMatchObject({
        error: {
          message: expect.stringContaining('State is required')
        }
      });
    });
  });

  describe('discoverSchemes', () => {
    it('should discover trending schemes', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.discoverSchemes({
        mode: 'trending',
        limitCount: 5
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should discover recommended schemes with user profile', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.discoverSchemes({
        mode: 'recommended',
        userProfile: mockArtisanProfile,
        limitCount: 5
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for recommended mode without user profile', async () => {
      await expect(service.discoverSchemes({
        mode: 'recommended',
        limitCount: 5
      })).rejects.toMatchObject({
        error: {
          message: expect.stringContaining('User profile is required for personalized recommendations')
        }
      });
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.getSearchSuggestions('loan', 5);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.categories).toBeDefined();
      expect(result.schemes).toBeDefined();
    });

    it('should return empty results for short query', async () => {
      const result = await service.getSearchSuggestions('a', 5);

      expect(result.suggestions).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.schemes).toEqual([]);
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockSchemes.map(scheme => ({
          data: () => scheme,
          id: scheme.id
        })),
        size: mockSchemes.length
      });

      const result = await service.getFilterOptions();

      expect(result.categories).toBeDefined();
      expect(result.businessTypes).toBeDefined();
      expect(result.states).toBeDefined();
      expect(result.providerLevels).toBeDefined();
      expect(result.amountRanges).toBeDefined();
    });
  });
});