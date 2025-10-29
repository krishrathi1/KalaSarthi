/**
 * Tests for Feature Engineering Pipeline
 * Validates feature engineering and transformation functionality
 */

import { FeatureEngineeringPipeline } from '@/lib/services/scheme-sahayak/ai/FeatureEngineeringPipeline';
import { ArtisanProfile, GovernmentScheme } from '@/lib/types/scheme-sahayak';

describe('FeatureEngineeringPipeline', () => {
  let pipeline: FeatureEngineeringPipeline;
  let mockProfile: ArtisanProfile;
  let mockScheme: GovernmentScheme;

  beforeEach(() => {
    pipeline = new FeatureEngineeringPipeline();
    
    mockProfile = {
      id: 'test-artisan-1',
      personalInfo: {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        email: 'rajesh@example.com',
        aadhaarHash: 'hashed_aadhaar',
        dateOfBirth: new Date('1985-05-15')
      },
      location: {
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400001',
        address: '123 Main Street'
      },
      business: {
        type: 'manufacturing',
        category: 'textiles',
        subCategory: 'handloom',
        registrationNumber: 'REG123456',
        establishmentYear: 2010,
        employeeCount: 5,
        monthlyIncome: 50000,
        experienceYears: 15
      },
      preferences: {
        language: 'hi',
        notificationChannels: ['sms', 'email'],
        timeHorizon: 'medium_term',
        riskTolerance: 'medium',
        interestedCategories: ['loan', 'subsidy']
      },
      documents: {
        'aadhaar': {
          id: 'doc1',
          type: 'aadhaar',
          filename: 'aadhaar.pdf',
          uploadDate: new Date(),
          status: 'verified'
        }
      },
      applicationHistory: [],
      aiProfile: {
        features: {},
        successProbability: 0.75,
        lastUpdated: new Date()
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date()
    };

    mockScheme = {
      id: 'scheme-1',
      title: 'PMEGP Loan Scheme',
      description: 'Prime Minister Employment Generation Programme',
      category: 'loan',
      subCategory: 'business_loan',
      provider: {
        name: 'KVIC',
        department: 'MSME',
        level: 'central',
        website: 'https://www.kvic.gov.in',
        contactInfo: {
          phone: '1800-xxx-xxxx',
          email: 'info@kvic.gov.in'
        }
      },
      eligibility: {
        age: { min: 18, max: 60 },
        income: { min: 0, max: 500000 },
        businessType: ['manufacturing', 'services'],
        location: {
          states: ['Maharashtra', 'Gujarat'],
          districts: [],
          pincodes: []
        },
        otherCriteria: []
      },
      benefits: {
        amount: { min: 100000, max: 2500000, currency: 'INR' },
        type: 'loan',
        interestRate: 5.5,
        coverageDetails: 'Up to 25 lakhs for manufacturing'
      },
      application: {
        onlineApplication: true,
        requiredDocuments: ['aadhaar', 'pan', 'business_plan'],
        applicationSteps: [],
        processingTime: { min: 30, max: 90 }
      },
      metadata: {
        popularity: 85,
        successRate: 65,
        averageProcessingTime: 60,
        aiFeatures: {},
        lastUpdated: new Date()
      },
      status: 'active'
    };
  });

  describe('engineerFeatures', () => {
    it('should generate engineered features for profile and scheme', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(engineered).toBeDefined();
      expect(engineered.profileFeatures).toBeDefined();
      expect(engineered.schemeCompatibilityFeatures).toBeDefined();
      expect(engineered.interactionFeatures).toBeDefined();
      expect(engineered.temporalFeatures).toBeDefined();
      expect(engineered.contextualFeatures).toBeDefined();
    });

    it('should include feature names and importance', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(engineered.featureNames).toBeDefined();
      expect(engineered.featureImportance).toBeDefined();
      expect(engineered.featureNames.length).toBeGreaterThan(0);
      expect(engineered.featureImportance.length).toBeGreaterThan(0);
    });

    it('should cache results for performance', async () => {
      // First call - not cached
      const result1 = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      // Second call - should use cache
      const result2 = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      // Results should be identical (from cache)
      expect(result1.processingTimestamp).toEqual(result2.processingTimestamp);
    });

    it('should generate profile features array', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(Array.isArray(engineered.profileFeatures)).toBe(true);
      expect(engineered.profileFeatures.length).toBeGreaterThan(0);
      
      // All values should be numbers
      engineered.profileFeatures.forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should generate scheme compatibility features', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(Array.isArray(engineered.schemeCompatibilityFeatures)).toBe(true);
      expect(engineered.schemeCompatibilityFeatures.length).toBeGreaterThan(0);
    });

    it('should generate interaction features', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(Array.isArray(engineered.interactionFeatures)).toBe(true);
      expect(engineered.interactionFeatures.length).toBeGreaterThan(0);
    });

    it('should generate temporal features', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(Array.isArray(engineered.temporalFeatures)).toBe(true);
      expect(engineered.temporalFeatures.length).toBeGreaterThan(0);
    });

    it('should generate contextual features', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      expect(Array.isArray(engineered.contextualFeatures)).toBe(true);
      expect(engineered.contextualFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('updateStatistics', () => {
    it('should update feature statistics from profiles', async () => {
      const profiles = [mockProfile];
      const schemes = [mockScheme];
      
      await pipeline.updateStatistics(profiles, schemes);
      
      const stats = pipeline.getStatistics();
      expect(stats).toBeDefined();
      expect(stats?.mean).toBeDefined();
      expect(stats?.std).toBeDefined();
      expect(stats?.min).toBeDefined();
      expect(stats?.max).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear feature cache', async () => {
      await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      
      pipeline.clearCache();
      
      // After clearing cache, should regenerate features
      const engineered = await pipeline.engineerFeatures(mockProfile, [mockScheme], mockScheme);
      expect(engineered).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty scheme list', async () => {
      const engineered = await pipeline.engineerFeatures(mockProfile, []);
      
      expect(engineered).toBeDefined();
      expect(engineered.schemeCompatibilityFeatures.length).toBeGreaterThan(0);
    });

    it('should handle profile with minimal data', async () => {
      const minimalProfile = {
        ...mockProfile,
        documents: {},
        applicationHistory: []
      };
      
      const engineered = await pipeline.engineerFeatures(minimalProfile, [mockScheme], mockScheme);
      
      expect(engineered).toBeDefined();
      expect(engineered.profileFeatures.length).toBeGreaterThan(0);
    });
  });
});
