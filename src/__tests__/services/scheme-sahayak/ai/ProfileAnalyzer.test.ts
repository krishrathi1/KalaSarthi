/**
 * Tests for Profile Analyzer Component
 * Validates feature extraction and preprocessing functionality
 */

import { ProfileAnalyzer } from '@/lib/services/scheme-sahayak/ai/ProfileAnalyzer';
import { ArtisanProfile } from '@/lib/types/scheme-sahayak';

describe('ProfileAnalyzer', () => {
  let analyzer: ProfileAnalyzer;
  let mockProfile: ArtisanProfile;

  beforeEach(() => {
    analyzer = new ProfileAnalyzer();
    
    // Create a mock artisan profile
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
        },
        'pan': {
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
          schemeName: 'PMEGP',
          status: 'approved',
          submittedAt: new Date('2023-01-15'),
          lastUpdated: new Date('2023-02-15'),
          outcome: 'approved',
          approvedAmount: 100000
        }
      ],
      aiProfile: {
        features: {},
        successProbability: 0.75,
        lastUpdated: new Date()
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date()
    };
  });

  describe('extractFeatures', () => {
    it('should extract 50+ features from artisan profile', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Verify we have all expected features
      expect(Object.keys(features).length).toBeGreaterThanOrEqual(50);
      
      // Verify all features are numbers
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should normalize all features to [0, 1] range', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Verify all features are in valid range
      Object.entries(features).forEach(([key, value]) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate age correctly', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Age should be normalized between 0 and 1
      expect(features.age).toBeGreaterThan(0);
      expect(features.age).toBeLessThan(1);
    });

    it('should encode business type correctly', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Manufacturing should have a specific encoding
      expect(features.businessTypeEncoded).toBeGreaterThan(0);
      expect(features.businessTypeEncoded).toBeLessThanOrEqual(1);
    });

    it('should calculate document readiness based on verified documents', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Should be 1.0 since both documents are verified
      expect(features.documentReadiness).toBe(1.0);
    });

    it('should calculate application history success rate', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      
      // Should be 1.0 since the one application was approved
      expect(features.applicationHistory).toBe(1.0);
    });
  });

  describe('preprocessFeatures', () => {
    it('should convert features to array in consistent order', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      const featureArray = analyzer.preprocessFeatures(features);
      
      // Should have same number of features
      expect(featureArray.length).toBe(Object.keys(features).length);
      
      // All values should be numbers
      featureArray.forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should maintain feature order across multiple calls', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      const array1 = analyzer.preprocessFeatures(features);
      const array2 = analyzer.preprocessFeatures(features);
      
      // Arrays should be identical
      expect(array1).toEqual(array2);
    });
  });

  describe('calculateFeatureImportance', () => {
    it('should calculate importance scores for all features', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      const importance = analyzer.calculateFeatureImportance(features);
      
      // Should have importance for all features
      expect(Object.keys(importance).length).toBe(Object.keys(features).length);
      
      // All importance values should be numbers
      Object.values(importance).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should assign higher importance to critical features', async () => {
      const features = await analyzer.extractFeatures(mockProfile);
      const importance = analyzer.calculateFeatureImportance(features);
      
      // Critical features should have higher importance
      expect(importance.monthlyIncomeNormalized).toBeGreaterThan(importance.genderEncoded);
      expect(importance.documentReadiness).toBeGreaterThan(importance.maritalStatus);
    });
  });

  describe('edge cases', () => {
    it('should handle profile with no documents', async () => {
      const profileWithoutDocs = { ...mockProfile, documents: {} };
      const features = await analyzer.extractFeatures(profileWithoutDocs);
      
      expect(features.documentReadiness).toBe(0);
    });

    it('should handle profile with no application history', async () => {
      const profileWithoutHistory = { ...mockProfile, applicationHistory: [] };
      const features = await analyzer.extractFeatures(profileWithoutHistory);
      
      expect(features.applicationHistory).toBe(0);
    });

    it('should handle profile with missing optional fields', async () => {
      const minimalProfile = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          email: '',
          panNumber: undefined
        },
        business: {
          ...mockProfile.business,
          registrationNumber: undefined
        }
      };
      
      const features = await analyzer.extractFeatures(minimalProfile);
      
      // Should still extract all features
      expect(Object.keys(features).length).toBeGreaterThanOrEqual(50);
    });
  });
});
