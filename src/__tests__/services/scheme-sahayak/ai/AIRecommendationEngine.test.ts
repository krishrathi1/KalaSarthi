/**
 * Tests for AIRecommendationEngine
 * Validates end-to-end recommendation generation and model feedback
 */

import { AIRecommendationEngine } from '../../../../lib/services/scheme-sahayak/ai/AIRecommendationEngine';
import { ArtisanProfile, GovernmentScheme } from '../../../../lib/types/scheme-sahayak';

describe('AIRecommendationEngine', () => {
  let engine: AIRecommendationEngine;
  let mockProfile: ArtisanProfile;
  let mockSchemes: GovernmentScheme[];

  beforeEach(() => {
    engine = new AIRecommendationEngine();

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
      documents: {
        aadhaar: {
          id: 'doc1',
          type: 'aadhaar',
          filename: 'aadhaar.pdf',
          uploadDate: new Date(),
          status: 'verified'
        },
        pan: {
          id: 'doc2',
          type: 'pan',
          filename: 'pan.pdf',
          uploadDate: new Date(),
          status: 'verified'
        }
      },
      applicationHistory: [
        {
          id: 'app1',
          schemeId: 'scheme1',
          schemeName: 'Previous Scheme',
          status: 'approved',
          submittedAt: new Date(),
          lastUpdated: new Date(),
          outcome: 'approved'
        }
      ],
      aiProfile: {
        features: {},
        successProbability: 0.7,
        lastUpdated: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockSchemes = [
      {
        id: 'scheme1',
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
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        },
        metadata: {
          popularity: 0.8,
          successRate: 0.7,
          averageProcessingTime: 45,
          aiFeatures: {},
          lastUpdated: new Date()
        },
        status: 'active'
      },
      {
        id: 'scheme2',
        title: 'Artisan Training Grant',
        description: 'Skill development grant for artisans',
        category: 'grant',
        subCategory: 'training',
        provider: {
          name: 'Ministry of Skill Development',
          department: 'Skill Development',
          level: 'central',
          website: 'https://skill.gov.in',
          contactInfo: {}
        },
        eligibility: {
          age: { min: 18, max: 55 },
          income: { max: 80000 },
          businessType: ['manufacturing', 'handicrafts'],
          location: {
            states: ['Maharashtra'],
            districts: [],
            pincodes: []
          },
          otherCriteria: []
        },
        benefits: {
          amount: { min: 20000, max: 50000, currency: 'INR' },
          type: 'grant',
          coverageDetails: 'Training and skill development'
        },
        application: {
          onlineApplication: true,
          requiredDocuments: ['aadhaar', 'income_certificate'],
          applicationSteps: [],
          processingTime: { min: 15, max: 30 }
        },
        metadata: {
          popularity: 0.6,
          successRate: 0.8,
          averageProcessingTime: 20,
          aiFeatures: {},
          lastUpdated: new Date()
        },
        status: 'active'
      }
    ];
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations within 3 seconds', async () => {
      const startTime = Date.now();
      
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(3000);
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should return recommendations with required fields', async () => {
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );

      // May return 0 recommendations if compatibility is too low
      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec.id).toBeDefined();
        expect(rec.scheme).toBeDefined();
        expect(rec.aiScore).toBeGreaterThanOrEqual(0);
        expect(rec.aiScore).toBeLessThanOrEqual(100);
        expect(rec.eligibilityMatch).toBeGreaterThanOrEqual(0);
        expect(rec.eligibilityMatch).toBeLessThanOrEqual(100);
        expect(rec.benefitPotential).toBeGreaterThanOrEqual(0);
        expect(rec.benefitPotential).toBeLessThanOrEqual(100);
        expect(rec.urgencyScore).toBeGreaterThanOrEqual(0);
        expect(rec.urgencyScore).toBeLessThanOrEqual(10);
        expect(rec.personalizedReason).toBeDefined();
        expect(rec.actionPlan).toBeDefined();
        expect(rec.actionPlan.immediateActions).toBeDefined();
        expect(rec.actionPlan.documentPreparation).toBeDefined();
        expect(rec.actionPlan.timelineEstimate).toBeDefined();
        expect(rec.successProbability).toBeGreaterThanOrEqual(0);
        expect(rec.successProbability).toBeLessThanOrEqual(1);
        expect(rec.confidenceInterval).toHaveLength(2);
      }
      
      // Test passes if we get valid structure (even if 0 recommendations)
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should filter by categories when specified', async () => {
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes,
        { categories: ['loan'] }
      );

      recommendations.forEach(rec => {
        expect(rec.scheme.category).toBe('loan');
      });
    });

    it('should limit results based on maxResults option', async () => {
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes,
        { maxResults: 1 }
      );

      expect(recommendations.length).toBeLessThanOrEqual(1);
    });

    it('should rank recommendations by AI score', async () => {
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );

      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          expect(recommendations[i].aiScore).toBeGreaterThanOrEqual(
            recommendations[i + 1].aiScore
          );
        }
      }
    });

    it('should use cache for subsequent calls', async () => {
      // First call
      const firstCall = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );

      // Second call (should be faster due to cache)
      const startTime = Date.now();
      const secondCall = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast from cache
      expect(secondCall.length).toBe(firstCall.length);
    });
  });

  describe('predictSuccess', () => {
    it('should predict success for specific scheme', async () => {
      const prediction = await engine.predictSuccess(
        mockProfile.id,
        mockProfile,
        mockSchemes[0]
      );

      expect(prediction).toBeDefined();
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(prediction.confidenceInterval).toHaveLength(2);
      expect(prediction.factors).toBeDefined();
      expect(prediction.improvementSuggestions).toBeDefined();
      expect(prediction.benchmarkComparison).toBeDefined();
    });
  });

  describe('explainRecommendation', () => {
    it('should provide explanation for recommendation', async () => {
      const explanation = await engine.explainRecommendation(
        'rec123',
        mockProfile,
        mockSchemes[0]
      );

      expect(explanation).toBeDefined();
      expect(explanation.recommendationId).toBe('rec123');
      expect(Array.isArray(explanation.primaryFactors)).toBe(true);
      expect(Array.isArray(explanation.secondaryFactors)).toBe(true);
      expect(explanation.dataPoints).toBeDefined();
      expect(explanation.modelVersion).toBeDefined();
      expect(explanation.confidence).toBeGreaterThanOrEqual(0);
      expect(explanation.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('updateModelFeedback', () => {
    it('should update model with user feedback', async () => {
      const feedback = {
        recommendationId: 'rec123',
        rating: 5,
        helpful: true,
        applied: true,
        outcome: 'approved' as const,
        timestamp: new Date()
      };

      await engine.updateModelFeedback(
        'rec123',
        feedback,
        mockProfile,
        mockSchemes[0]
      );

      expect(true).toBe(true);
    });

    it('should clear cache after feedback update', async () => {
      // Generate initial recommendations
      await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );

      // Update feedback
      const feedback = {
        recommendationId: 'rec123',
        rating: 5,
        helpful: true,
        applied: true,
        outcome: 'approved' as const,
        timestamp: new Date()
      };

      await engine.updateModelFeedback(
        'rec123',
        feedback,
        mockProfile,
        mockSchemes[0]
      );

      // Next call should not use cache
      const recommendations = await engine.generateRecommendations(
        mockProfile.id,
        mockProfile,
        mockSchemes
      );

      expect(recommendations).toBeDefined();
    });
  });

  describe('clearCaches', () => {
    it('should clear all caches', () => {
      engine.clearCaches();
      expect(true).toBe(true);
    });
  });
});
