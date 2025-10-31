/**
 * Tests for Data Preprocessor Component
 * Validates data cleaning, validation, and quality assessment
 */

import { DataPreprocessor } from '@/lib/services/scheme-sahayak/ai/DataPreprocessor';
import { ArtisanProfile, GovernmentScheme } from '@/lib/types/scheme-sahayak';

describe('DataPreprocessor', () => {
  let preprocessor: DataPreprocessor;
  let mockProfile: ArtisanProfile;

  beforeEach(() => {
    preprocessor = new DataPreprocessor();
    
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
  });

  describe('preprocessProfile', () => {
    it('should clean and normalize profile data', async () => {
      const cleaned = await preprocessor.preprocessProfile(mockProfile);
      
      expect(cleaned).toBeDefined();
      expect(cleaned.id).toBe(mockProfile.id);
      expect(cleaned.personalInfo.phone).toBe('9876543210');
    });

    it('should clean phone number by removing non-digits', async () => {
      const profileWithDirtyPhone = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          phone: '+91-987-654-3210'
        }
      };
      
      const cleaned = await preprocessor.preprocessProfile(profileWithDirtyPhone);
      
      // Should remove non-digits (may include country code)
      expect(cleaned.personalInfo.phone).toMatch(/^\d{10,12}$/);
      expect(cleaned.personalInfo.phone).toContain('9876543210');
    });

    it('should normalize email to lowercase', async () => {
      const profileWithUpperEmail = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          email: 'RAJESH@EXAMPLE.COM'
        }
      };
      
      const cleaned = await preprocessor.preprocessProfile(profileWithUpperEmail);
      
      expect(cleaned.personalInfo.email).toBe('rajesh@example.com');
    });

    it('should handle missing optional fields', async () => {
      const profileWithMissing = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          email: '',
          panNumber: undefined
        }
      };
      
      const cleaned = await preprocessor.preprocessProfile(profileWithMissing);
      
      expect(cleaned).toBeDefined();
    });

    it('should set default values for missing business data', async () => {
      const profileWithMissing = {
        ...mockProfile,
        business: {
          ...mockProfile.business,
          monthlyIncome: 0,
          employeeCount: 0
        }
      };
      
      const cleaned = await preprocessor.preprocessProfile(profileWithMissing);
      
      expect(cleaned.business.monthlyIncome).toBeGreaterThan(0);
      expect(cleaned.business.employeeCount).toBeGreaterThan(0);
    });

    it('should validate and clip data ranges', async () => {
      const profileWithOutliers = {
        ...mockProfile,
        business: {
          ...mockProfile.business,
          monthlyIncome: 99999999, // Extremely high
          employeeCount: 50000 // Extremely high
        }
      };
      
      const cleaned = await preprocessor.preprocessProfile(profileWithOutliers);
      
      // Should be clipped to reasonable ranges
      expect(cleaned.business.monthlyIncome).toBeLessThanOrEqual(10000000);
      expect(cleaned.business.employeeCount).toBeLessThanOrEqual(10000);
    });
  });

  describe('assessDataQuality', () => {
    it('should assess data quality and return metrics', async () => {
      const quality = await preprocessor.assessDataQuality(mockProfile);
      
      expect(quality).toBeDefined();
      expect(quality.completeness).toBeGreaterThanOrEqual(0);
      expect(quality.completeness).toBeLessThanOrEqual(1);
      expect(quality.consistency).toBeGreaterThanOrEqual(0);
      expect(quality.consistency).toBeLessThanOrEqual(1);
      expect(quality.accuracy).toBeGreaterThanOrEqual(0);
      expect(quality.accuracy).toBeLessThanOrEqual(1);
      expect(quality.validity).toBeGreaterThanOrEqual(0);
      expect(quality.validity).toBeLessThanOrEqual(1);
      expect(quality.timeliness).toBeGreaterThanOrEqual(0);
      expect(quality.timeliness).toBeLessThanOrEqual(1);
      expect(quality.overallScore).toBeGreaterThanOrEqual(0);
      expect(quality.overallScore).toBeLessThanOrEqual(1);
    });

    it('should identify missing fields as issues', async () => {
      const incompleteProfile = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          email: ''
        }
      };
      
      const quality = await preprocessor.assessDataQuality(incompleteProfile);
      
      expect(quality.issues.length).toBeGreaterThan(0);
      const missingEmailIssue = quality.issues.find(
        issue => issue.field === 'personalInfo.email' && issue.issueType === 'missing'
      );
      expect(missingEmailIssue).toBeDefined();
    });

    it('should identify invalid phone numbers', async () => {
      const invalidPhoneProfile = {
        ...mockProfile,
        personalInfo: {
          ...mockProfile.personalInfo,
          phone: '123' // Invalid
        }
      };
      
      const quality = await preprocessor.assessDataQuality(invalidPhoneProfile);
      
      const phoneIssue = quality.issues.find(
        issue => issue.field === 'personalInfo.phone' && issue.issueType === 'invalid'
      );
      expect(phoneIssue).toBeDefined();
    });

    it('should identify inconsistent data', async () => {
      const inconsistentProfile = {
        ...mockProfile,
        business: {
          ...mockProfile.business,
          establishmentYear: 2020,
          experienceYears: 50 // Inconsistent with establishment year
        }
      };
      
      const quality = await preprocessor.assessDataQuality(inconsistentProfile);
      
      const consistencyIssue = quality.issues.find(
        issue => issue.issueType === 'inconsistent'
      );
      expect(consistencyIssue).toBeDefined();
    });

    it('should cache quality metrics', async () => {
      const quality1 = await preprocessor.assessDataQuality(mockProfile);
      const quality2 = await preprocessor.assessDataQuality(mockProfile);
      
      // Should return same cached result
      expect(quality1.lastChecked).toEqual(quality2.lastChecked);
    });
  });

  describe('batchPreprocessProfiles', () => {
    it('should process multiple profiles', async () => {
      const profiles = [mockProfile, { ...mockProfile, id: 'test-artisan-2' }];
      
      const processed = await preprocessor.batchPreprocessProfiles(profiles);
      
      expect(processed.length).toBe(2);
      expect(processed[0].id).toBe('test-artisan-1');
      expect(processed[1].id).toBe('test-artisan-2');
    });

    it('should handle errors gracefully', async () => {
      const invalidProfile = { ...mockProfile, id: '' } as any;
      const profiles = [mockProfile, invalidProfile];
      
      const processed = await preprocessor.batchPreprocessProfiles(profiles);
      
      // Should still process valid profiles
      expect(processed.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear quality metrics cache', async () => {
      await preprocessor.assessDataQuality(mockProfile);
      
      preprocessor.clearCache();
      
      // Should regenerate metrics after cache clear
      const quality = await preprocessor.assessDataQuality(mockProfile);
      expect(quality).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle profile with all missing optional fields', async () => {
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
        },
        documents: {},
        applicationHistory: []
      };
      
      const cleaned = await preprocessor.preprocessProfile(minimalProfile);
      
      expect(cleaned).toBeDefined();
      expect(cleaned.documents).toBeDefined();
      expect(cleaned.applicationHistory).toBeDefined();
    });

    it('should handle very old profiles', async () => {
      const oldProfile = {
        ...mockProfile,
        updatedAt: new Date('2020-01-01')
      };
      
      const quality = await preprocessor.assessDataQuality(oldProfile);
      
      // Should flag as outdated
      const outdatedIssue = quality.issues.find(
        issue => issue.issueType === 'outdated'
      );
      expect(outdatedIssue).toBeDefined();
    });

    it('should handle profiles with expired documents', async () => {
      const profileWithExpiredDoc = {
        ...mockProfile,
        documents: {
          'aadhaar': {
            id: 'doc1',
            type: 'aadhaar',
            filename: 'aadhaar.pdf',
            uploadDate: new Date('2020-01-01'),
            status: 'verified',
            expiryDate: new Date('2021-01-01') // Expired
          }
        }
      };
      
      const quality = await preprocessor.assessDataQuality(profileWithExpiredDoc);
      
      // Should flag expired documents
      const expiredIssue = quality.issues.find(
        issue => issue.field === 'documents' && issue.issueType === 'outdated'
      );
      expect(expiredIssue).toBeDefined();
    });
  });
});
