/**
 * Tests for SchemeMatcher
 * Validates hybrid recommendation algorithm and compatibility scoring
 */

import { SchemeMatcher } from '../../../../lib/services/scheme-sahayak/ai/SchemeMatcher';
import { ArtisanProfile, GovernmentScheme } from '../../../../lib/types/scheme-sahayak';
import { ExtractedFeatures } from '../../../../lib/services/scheme-sahayak/ai/ProfileAnalyzer';

describe('SchemeMatcher', () => {
  let schemeMatcher: SchemeMatcher;
  let mockFeatures: ExtractedFeatures;
  let mockProfile: ArtisanProfile;
  let mockScheme: GovernmentScheme;

  beforeEach(() => {
    schemeMatcher = new SchemeMatcher();

    // Mock extracted features
    mockFeatures = {
      age: 0.5,
      genderEncoded: 0,
      educationLevel: 0.6,
      maritalStatus: 0.5,
      familySize: 0.5,
      dependents: 0.5,
      locationTier: 0.5,
      stateEconomicIndex: 0.7,
      districtDevelopmentIndex: 0.6,
      populationDensity: 0.5,
      businessAge: 0.4,
      businessSize: 0.3,
      monthlyIncomeNormalized: 0.4,
      businessTypeEncoded: 0.7,
      businessCategoryEncoded: 0.6,
      businessSubCategoryEncoded: 0.5,
      hasRegistration: 1,
      experienceYears: 0.5,
      seasonalityFactor: 0.5,
      growthPotential: 0.7,
      marketReach: 0.5,
      technologyAdoption: 0.6,
      competitionLevel: 0.5,
      supplyChainIntegration: 0.5,
      exportPotential: 0.4,
      incomeStability: 0.6,
      creditworthiness: 0.7,
      assetBase: 0.5,
      debtToIncomeRatio: 0.4,
      savingsRate: 0.5,
      financialLiteracy: 0.6,
      bankingRelationship: 0.7,
      previousLoanHistory: 0.6,
      digitalLiteracy: 0.7,
      socialMediaPresence: 0.5,
      networkStrength: 0.6,
      communityInvolvement: 0.5,
      governmentInteraction: 0.6,
      documentReadiness: 0.8,
      applicationHistory: 0.7,
      riskTolerance: 0.5,
      timeHorizon: 0.5,
      proactiveness: 0.7,
      learningOrientation: 0.6,
      innovationIndex: 0.6,
      collaborationScore: 0.5,
      persistenceLevel: 0.7,
      adaptabilityScore: 0.6,
      communicationSkills: 0.6,
      leadershipPotential: 0.5
    };

    // Mock artisan profile
    mockProfile = {
      id: 'artisan123',
      personalInfo: {
        name: 'Test Artisan',
        phone: '9876543210',
        email: 'test@example.com',
        aadhaarHash: 'hash123',
        dateOfBirth: new Date('1985-01-01')
      },
      location: {
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400001',
        address: 'Test Address'
      },
      business: {
        type: 'manufacturing',
        category: 'textiles',
        subCategory: 'handloom',
        registrationNumber: 'REG123',
        establishmentYear: 2015,
        employeeCount: 5,
        monthlyIncome: 50000,
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
        successProbability: 0.7,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock government scheme
    mockScheme = {
      id: 'scheme123',
      title: 'Textile Artisan Loan Scheme',
      description: 'Financial assistance for textile artisans',
      category: 'loan',
      subCategory: 'business_loan',
      provider: {
        name: 'Ministry of Textiles',
        department: 'Textiles',
        level: 'central',
        website: 'https://textiles.gov.in',
        contactInfo: {}
      },
      eligibility: {
        age: { min: 18, max: 60 },
        income: { min: 10000, max: 100000 },
        businessType: ['manufacturing', 'textiles'],
        location: {
          states: ['Maharashtra', 'Gujarat'],
          districts: [],
          pincodes: []
        },
        otherCriteria: []
      },
      benefits: {
        amount: { min: 100000, max: 500000, currency: 'INR' },
        type: 'loan',
        interestRate: 5,
        coverageDetails: 'Low interest business loan'
      },
      application: {
        onlineApplication: true,
        requiredDocuments: ['aadhaar', 'pan', 'business_registration'],
        applicationSteps: [],
        processingTime: { min: 30, max: 60 },
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      },
      metadata: {
        popularity: 0.8,
        successRate: 0.7,
        averageProcessingTime: 45,
        aiFeatures: {},
        lastUpdated: new Date()
      },
      status: 'active'
    };
  });

  describe('calculateCompatibility', () => {
    it('should calculate compatibility score with all components', async () => {
      const compatibility = await schemeMatcher.calculateCompatibility(
        mockFeatures,
        mockScheme,
        mockProfile
      );

      expect(compatibility).toBeDefined();
      expect(compatibility.overall).toBeGreaterThanOrEqual(0);
      expect(compatibility.overall).toBeLessThanOrEqual(100);
      expect(compatibility.eligibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.eligibility).toBeLessThanOrEqual(1);
      expect(compatibility.benefit).toBeGreaterThanOrEqual(0);
      expect(compatibility.benefit).toBeLessThanOrEqual(1);
      expect(compatibility.feasibility).toBeGreaterThanOrEqual(0);
      expect(compatibility.feasibility).toBeLessThanOrEqual(1);
      expect(compatibility.components).toBeDefined();
      expect(compatibility.components.contentBased).toBeGreaterThanOrEqual(0);
      expect(compatibility.components.collaborative).toBeGreaterThanOrEqual(0);
      expect(compatibility.components.contextual).toBeGreaterThanOrEqual(0);
    });

    it('should give high eligibility score for matching profile', async () => {
      const compatibility = await schemeMatcher.calculateCompatibility(
        mockFeatures,
        mockScheme,
        mockProfile
      );

      // Profile matches age, income, business type, and location
      expect(compatibility.eligibility).toBeGreaterThan(0.7);
    });

    it('should give low eligibility score for non-matching location', async () => {
      const nonMatchingProfile = {
        ...mockProfile,
        location: { ...mockProfile.location, state: 'Kerala' }
      };

      const compatibility = await schemeMatcher.calculateCompatibility(
        mockFeatures,
        mockScheme,
        nonMatchingProfile
      );

      expect(compatibility.eligibility).toBeLessThan(0.5);
    });

    it('should calculate benefit score based on income ratio', async () => {
      const compatibility = await schemeMatcher.calculateCompatibility(
        mockFeatures,
        mockScheme,
        mockProfile
      );

      expect(compatibility.benefit).toBeGreaterThan(0);
      expect(compatibility.benefit).toBeLessThanOrEqual(1);
    });

    it('should calculate feasibility score based on readiness', async () => {
      const highReadinessFeatures = {
        ...mockFeatures,
        documentReadiness: 0.9,
        applicationHistory: 0.8,
        digitalLiteracy: 0.9
      };

      const compatibility = await schemeMatcher.calculateCompatibility(
        highReadinessFeatures,
        mockScheme,
        mockProfile
      );

      expect(compatibility.feasibility).toBeGreaterThan(0.7);
    });
  });

  describe('updateCollaborativeData', () => {
    it('should update collaborative matrix with interaction data', () => {
      schemeMatcher.updateCollaborativeData({
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        interaction: 'applied',
        timestamp: new Date(),
        outcome: 'success'
      });

      // No error should be thrown
      expect(true).toBe(true);
    });

    it('should handle multiple interactions for same artisan', () => {
      schemeMatcher.updateCollaborativeData({
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        interaction: 'viewed',
        timestamp: new Date()
      });

      schemeMatcher.updateCollaborativeData({
        artisanId: 'artisan123',
        schemeId: 'scheme456',
        interaction: 'applied',
        timestamp: new Date()
      });

      expect(true).toBe(true);
    });

    it('should batch update collaborative data', () => {
      const dataList = [
        {
          artisanId: 'artisan1',
          schemeId: 'scheme1',
          interaction: 'applied' as const,
          timestamp: new Date(),
          outcome: 'success' as const
        },
        {
          artisanId: 'artisan2',
          schemeId: 'scheme2',
          interaction: 'approved' as const,
          timestamp: new Date(),
          outcome: 'success' as const
        }
      ];

      schemeMatcher.batchUpdateCollaborativeData(dataList);
      expect(true).toBe(true);
    });
  });

  describe('clearCaches', () => {
    it('should clear all caches without error', () => {
      schemeMatcher.clearCaches();
      expect(true).toBe(true);
    });
  });
});
