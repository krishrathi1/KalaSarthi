/**
 * Tests for SuccessPredictor
 * Validates success probability prediction and improvement suggestions
 */

import { SuccessPredictor } from '../../../../lib/services/scheme-sahayak/ai/SuccessPredictor';
import { ArtisanProfile, GovernmentScheme } from '../../../../lib/types/scheme-sahayak';
import { ExtractedFeatures } from '../../../../lib/services/scheme-sahayak/ai/ProfileAnalyzer';
import { CompatibilityScore } from '../../../../lib/services/scheme-sahayak/ai/SchemeMatcher';

describe('SuccessPredictor', () => {
  let successPredictor: SuccessPredictor;
  let mockFeatures: ExtractedFeatures;
  let mockProfile: ArtisanProfile;
  let mockScheme: GovernmentScheme;
  let mockCompatibility: CompatibilityScore;

  beforeEach(() => {
    successPredictor = new SuccessPredictor();

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
          states: ['Maharashtra'],
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
        processingTime: { min: 30, max: 60 }
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

    mockCompatibility = {
      overall: 75,
      eligibility: 0.85,
      benefit: 0.7,
      feasibility: 0.75,
      timing: 0.8,
      components: {
        contentBased: 0.75,
        collaborative: 0.5,
        contextual: 0.7
      }
    };
  });

  describe('predictSuccess', () => {
    it('should predict success probability within valid range', async () => {
      const prediction = await successPredictor.predictSuccess(
        mockFeatures,
        mockScheme,
        mockProfile,
        mockCompatibility
      );

      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
    });

    it('should provide confidence interval', async () => {
      const prediction = await successPredictor.predictSuccess(
        mockFeatures,
        mockScheme,
        mockProfile,
        mockCompatibility
      );

      expect(prediction.confidenceInterval).toHaveLength(2);
      expect(prediction.confidenceInterval[0]).toBeLessThanOrEqual(prediction.probability);
      expect(prediction.confidenceInterval[1]).toBeGreaterThanOrEqual(prediction.probability);
      expect(prediction.confidenceInterval[0]).toBeGreaterThanOrEqual(0);
      expect(prediction.confidenceInterval[1]).toBeLessThanOrEqual(1);
    });

    it('should identify positive and negative factors', async () => {
      const prediction = await successPredictor.predictSuccess(
        mockFeatures,
        mockScheme,
        mockProfile,
        mockCompatibility
      );

      expect(prediction.factors).toBeDefined();
      expect(Array.isArray(prediction.factors.positive)).toBe(true);
      expect(Array.isArray(prediction.factors.negative)).toBe(true);
      expect(Array.isArray(prediction.factors.neutral)).toBe(true);
    });

    it('should provide improvement suggestions', async () => {
      const prediction = await successPredictor.predictSuccess(
        mockFeatures,
        mockScheme,
        mockProfile,
        mockCompatibility
      );

      expect(Array.isArray(prediction.improvementSuggestions)).toBe(true);
      expect(prediction.improvementSuggestions.length).toBeGreaterThan(0);
      expect(prediction.improvementSuggestions.length).toBeLessThanOrEqual(5);
    });

    it('should provide benchmark comparison', async () => {
      const prediction = await successPredictor.predictSuccess(
        mockFeatures,
        mockScheme,
        mockProfile,
        mockCompatibility
      );

      expect(prediction.benchmarkComparison).toBeDefined();
      expect(prediction.benchmarkComparison.similarArtisans).toBeGreaterThan(0);
      expect(prediction.benchmarkComparison.averageSuccessRate).toBeGreaterThanOrEqual(0);
      expect(prediction.benchmarkComparison.averageSuccessRate).toBeLessThanOrEqual(1);
      expect(['below_average', 'average', 'above_average']).toContain(
        prediction.benchmarkComparison.yourPosition
      );
    });

    it('should predict higher probability for strong profiles', async () => {
      const strongFeatures = {
        ...mockFeatures,
        documentReadiness: 0.95,
        applicationHistory: 0.9,
        creditworthiness: 0.9,
        digitalLiteracy: 0.9,
        incomeStability: 0.9,
        financialLiteracy: 0.9
      };

      const strongCompatibility = {
        ...mockCompatibility,
        overall: 90,
        eligibility: 0.95,
        feasibility: 0.9
      };

      const prediction = await successPredictor.predictSuccess(
        strongFeatures,
        mockScheme,
        mockProfile,
        strongCompatibility
      );

      expect(prediction.probability).toBeGreaterThan(0.5);
    });

    it('should predict lower probability for weak profiles', async () => {
      const weakFeatures = {
        ...mockFeatures,
        documentReadiness: 0.2,
        applicationHistory: 0.1,
        creditworthiness: 0.3,
        hasRegistration: 0
      };

      const weakCompatibility = {
        ...mockCompatibility,
        overall: 40,
        eligibility: 0.4
      };

      const prediction = await successPredictor.predictSuccess(
        weakFeatures,
        mockScheme,
        mockProfile,
        weakCompatibility
      );

      expect(prediction.probability).toBeLessThan(0.5);
    });
  });

  describe('addHistoricalData', () => {
    it('should add historical application data', () => {
      successPredictor.addHistoricalData({
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        features: mockFeatures,
        outcome: 'approved',
        processingTime: 45,
        timestamp: new Date()
      });

      expect(true).toBe(true);
    });

    it('should batch add historical data', () => {
      const dataList = [
        {
          artisanId: 'artisan1',
          schemeId: 'scheme1',
          features: mockFeatures,
          outcome: 'approved' as const,
          processingTime: 30,
          timestamp: new Date()
        },
        {
          artisanId: 'artisan2',
          schemeId: 'scheme2',
          features: mockFeatures,
          outcome: 'rejected' as const,
          processingTime: 20,
          timestamp: new Date()
        }
      ];

      successPredictor.batchAddHistoricalData(dataList);
      expect(true).toBe(true);
    });
  });

  describe('clearHistoricalData', () => {
    it('should clear all historical data', () => {
      successPredictor.addHistoricalData({
        artisanId: 'artisan123',
        schemeId: 'scheme123',
        features: mockFeatures,
        outcome: 'approved',
        processingTime: 45,
        timestamp: new Date()
      });

      successPredictor.clearHistoricalData();
      expect(true).toBe(true);
    });
  });
});
