/**
 * Data Preprocessing and Normalization Component
 * Handles data cleaning, validation, and preprocessing for ML models
 * Ensures data quality and consistency for the AI recommendation engine
 */

import { ArtisanProfile, GovernmentScheme } from '../../../types/scheme-sahayak';
import { ExtractedFeatures } from './ProfileAnalyzer';

/**
 * Data quality metrics for monitoring
 */
export interface DataQualityMetrics {
  completeness: number; // 0-1 score
  consistency: number; // 0-1 score
  accuracy: number; // 0-1 score
  validity: number; // 0-1 score
  timeliness: number; // 0-1 score
  overallScore: number; // 0-1 score
  issues: DataQualityIssue[];
  lastChecked: Date;
}

/**
 * Data quality issue details
 */
export interface DataQualityIssue {
  field: string;
  issueType: 'missing' | 'invalid' | 'inconsistent' | 'outdated' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
}

/**
 * Preprocessing configuration
 */
export interface PreprocessingConfig {
  handleMissingValues: 'drop' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'zero';
  handleOutliers: 'clip' | 'remove' | 'transform' | 'keep';
  outlierThreshold: number; // Standard deviations from mean
  normalizationMethod: 'minmax' | 'zscore' | 'robust' | 'none';
  validateSchema: boolean;
  enforceDataTypes: boolean;
  removeInvalidRecords: boolean;
}

/**
 * Validation rules for artisan profiles
 */
interface ValidationRules {
  personalInfo: {
    phone: RegExp;
    email: RegExp;
    ageRange: { min: number; max: number };
  };
  business: {
    incomeRange: { min: number; max: number };
    employeeRange: { min: number; max: number };
    experienceRange: { min: number; max: number };
    establishmentYearRange: { min: number; max: number };
  };
  location: {
    pincodePattern: RegExp;
    requiredFields: string[];
  };
}

/**
 * Data Preprocessor for cleaning and validating data before ML processing
 */
export class DataPreprocessor {
  private config: PreprocessingConfig;
  private validationRules: ValidationRules;
  private qualityMetricsCache: Map<string, DataQualityMetrics> = new Map();

  constructor(config?: Partial<PreprocessingConfig>) {
    this.config = {
      handleMissingValues: 'median',
      handleOutliers: 'clip',
      outlierThreshold: 3,
      normalizationMethod: 'minmax',
      validateSchema: true,
      enforceDataTypes: true,
      removeInvalidRecords: false,
      ...config
    };

    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Preprocess artisan profile data
   */
  async preprocessProfile(profile: ArtisanProfile): Promise<ArtisanProfile> {
    // Validate schema
    if (this.config.validateSchema) {
      this.validateProfileSchema(profile);
    }

    // Clean and normalize data
    let cleanedProfile = { ...profile };

    // Clean personal info
    cleanedProfile.personalInfo = this.cleanPersonalInfo(cleanedProfile.personalInfo);

    // Clean business data
    cleanedProfile.business = this.cleanBusinessData(cleanedProfile.business);

    // Clean location data
    cleanedProfile.location = this.cleanLocationData(cleanedProfile.location);

    // Handle missing values
    cleanedProfile = this.handleMissingProfileValues(cleanedProfile);

    // Validate data ranges
    cleanedProfile = this.validateDataRanges(cleanedProfile);

    // Handle outliers
    cleanedProfile = this.handleProfileOutliers(cleanedProfile);

    return cleanedProfile;
  }

  /**
   * Preprocess scheme data
   */
  async preprocessScheme(scheme: GovernmentScheme): Promise<GovernmentScheme> {
    let cleanedScheme = { ...scheme };

    // Clean and validate eligibility criteria
    cleanedScheme.eligibility = this.cleanEligibilityCriteria(cleanedScheme.eligibility);

    // Clean benefit information
    cleanedScheme.benefits = this.cleanBenefitData(cleanedScheme.benefits);

    // Clean application data
    cleanedScheme.application = this.cleanApplicationData(cleanedScheme.application);

    // Validate metadata
    cleanedScheme.metadata = this.cleanMetadata(cleanedScheme.metadata);

    return cleanedScheme;
  }

  /**
   * Preprocess extracted features
   */
  preprocessFeatures(features: ExtractedFeatures): ExtractedFeatures {
    const processed = { ...features };

    // Handle missing values in features
    for (const [key, value] of Object.entries(processed)) {
      if (value === null || value === undefined || isNaN(value as number)) {
        processed[key as keyof ExtractedFeatures] = this.getDefaultFeatureValue(key);
      }
    }

    // Clip outliers
    if (this.config.handleOutliers === 'clip') {
      for (const [key, value] of Object.entries(processed)) {
        if (typeof value === 'number') {
          processed[key as keyof ExtractedFeatures] = Math.max(0, Math.min(1, value));
        }
      }
    }

    // Ensure all values are in valid range [0, 1]
    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'number') {
        if (value < 0 || value > 1) {
          console.warn(`Feature ${key} out of range: ${value}, clipping to [0, 1]`);
          processed[key as keyof ExtractedFeatures] = Math.max(0, Math.min(1, value));
        }
      }
    }

    return processed;
  }

  /**
   * Assess data quality for a profile
   */
  async assessDataQuality(profile: ArtisanProfile): Promise<DataQualityMetrics> {
    const cacheKey = profile.id;
    
    // Check cache
    if (this.qualityMetricsCache.has(cacheKey)) {
      const cached = this.qualityMetricsCache.get(cacheKey)!;
      // Return cached if less than 1 hour old
      if (Date.now() - cached.lastChecked.getTime() < 3600000) {
        return cached;
      }
    }

    const issues: DataQualityIssue[] = [];

    // Check completeness
    const completeness = this.assessCompleteness(profile, issues);

    // Check consistency
    const consistency = this.assessConsistency(profile, issues);

    // Check accuracy
    const accuracy = this.assessAccuracy(profile, issues);

    // Check validity
    const validity = this.assessValidity(profile, issues);

    // Check timeliness
    const timeliness = this.assessTimeliness(profile, issues);

    // Calculate overall score
    const overallScore = (completeness + consistency + accuracy + validity + timeliness) / 5;

    const metrics: DataQualityMetrics = {
      completeness,
      consistency,
      accuracy,
      validity,
      timeliness,
      overallScore,
      issues,
      lastChecked: new Date()
    };

    // Cache the result
    this.qualityMetricsCache.set(cacheKey, metrics);

    return metrics;
  }

  /**
   * Batch preprocess multiple profiles
   */
  async batchPreprocessProfiles(profiles: ArtisanProfile[]): Promise<ArtisanProfile[]> {
    const processed: ArtisanProfile[] = [];

    for (const profile of profiles) {
      try {
        const preprocessed = await this.preprocessProfile(profile);
        processed.push(preprocessed);
      } catch (error) {
        console.error(`Error preprocessing profile ${profile.id}:`, error);
        if (!this.config.removeInvalidRecords) {
          processed.push(profile); // Keep original if not removing invalid records
        }
      }
    }

    return processed;
  }

  /**
   * Batch preprocess multiple schemes
   */
  async batchPreprocessSchemes(schemes: GovernmentScheme[]): Promise<GovernmentScheme[]> {
    const processed: GovernmentScheme[] = [];

    for (const scheme of schemes) {
      try {
        const preprocessed = await this.preprocessScheme(scheme);
        processed.push(preprocessed);
      } catch (error) {
        console.error(`Error preprocessing scheme ${scheme.id}:`, error);
        if (!this.config.removeInvalidRecords) {
          processed.push(scheme);
        }
      }
    }

    return processed;
  }

  /**
   * Clear quality metrics cache
   */
  clearCache(): void {
    this.qualityMetricsCache.clear();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializeValidationRules(): ValidationRules {
    const currentYear = new Date().getFullYear();

    return {
      personalInfo: {
        phone: /^[6-9]\d{9}$/, // Indian phone number pattern
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        ageRange: { min: 18, max: 100 }
      },
      business: {
        incomeRange: { min: 0, max: 10000000 }, // Monthly income in INR
        employeeRange: { min: 1, max: 10000 },
        experienceRange: { min: 0, max: 80 },
        establishmentYearRange: { min: 1900, max: currentYear }
      },
      location: {
        pincodePattern: /^\d{6}$/,
        requiredFields: ['state', 'district', 'pincode']
      }
    };
  }

  private validateProfileSchema(profile: ArtisanProfile): void {
    // Check required fields
    if (!profile.id) throw new Error('Profile ID is required');
    if (!profile.personalInfo) throw new Error('Personal info is required');
    if (!profile.business) throw new Error('Business info is required');
    if (!profile.location) throw new Error('Location info is required');
    if (!profile.preferences) throw new Error('Preferences are required');

    // Check nested required fields
    if (!profile.personalInfo.phone) throw new Error('Phone number is required');
    if (!profile.business.type) throw new Error('Business type is required');
    if (!profile.location.state) throw new Error('State is required');
  }

  private cleanPersonalInfo(personalInfo: any): any {
    const cleaned = { ...personalInfo };

    // Clean phone number
    if (cleaned.phone) {
      cleaned.phone = cleaned.phone.replace(/\D/g, ''); // Remove non-digits
      if (cleaned.phone.length === 10 && !cleaned.phone.startsWith('0')) {
        // Valid 10-digit number
      } else if (cleaned.phone.length === 11 && cleaned.phone.startsWith('0')) {
        cleaned.phone = cleaned.phone.substring(1); // Remove leading 0
      }
    }

    // Clean email
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
    }

    // Clean name
    if (cleaned.name) {
      cleaned.name = cleaned.name.trim();
    }

    return cleaned;
  }

  private cleanBusinessData(business: any): any {
    const cleaned = { ...business };

    // Ensure numeric fields are numbers
    if (cleaned.monthlyIncome) {
      cleaned.monthlyIncome = Number(cleaned.monthlyIncome);
    }
    if (cleaned.employeeCount) {
      cleaned.employeeCount = Number(cleaned.employeeCount);
    }
    if (cleaned.experienceYears) {
      cleaned.experienceYears = Number(cleaned.experienceYears);
    }
    if (cleaned.establishmentYear) {
      cleaned.establishmentYear = Number(cleaned.establishmentYear);
    }

    // Clean text fields
    if (cleaned.type) {
      cleaned.type = cleaned.type.toLowerCase().trim();
    }
    if (cleaned.category) {
      cleaned.category = cleaned.category.toLowerCase().trim();
    }

    return cleaned;
  }

  private cleanLocationData(location: any): any {
    const cleaned = { ...location };

    // Clean pincode
    if (cleaned.pincode) {
      cleaned.pincode = cleaned.pincode.replace(/\D/g, ''); // Remove non-digits
    }

    // Clean text fields
    if (cleaned.state) {
      cleaned.state = cleaned.state.trim();
    }
    if (cleaned.district) {
      cleaned.district = cleaned.district.trim();
    }
    if (cleaned.address) {
      cleaned.address = cleaned.address.trim();
    }

    return cleaned;
  }

  private handleMissingProfileValues(profile: ArtisanProfile): ArtisanProfile {
    const cleaned = { ...profile };

    // Handle missing business values
    if (!cleaned.business.monthlyIncome || cleaned.business.monthlyIncome <= 0) {
      cleaned.business.monthlyIncome = 15000; // Default median income
    }

    if (!cleaned.business.employeeCount || cleaned.business.employeeCount <= 0) {
      cleaned.business.employeeCount = 1; // Default to self-employed
    }

    if (!cleaned.business.experienceYears || cleaned.business.experienceYears < 0) {
      cleaned.business.experienceYears = 0;
    }

    // Handle missing documents
    if (!cleaned.documents) {
      cleaned.documents = {};
    }

    // Handle missing application history
    if (!cleaned.applicationHistory) {
      cleaned.applicationHistory = [];
    }

    // Handle missing AI profile
    if (!cleaned.aiProfile) {
      cleaned.aiProfile = {
        features: {},
        successProbability: 0.5,
        lastUpdated: new Date()
      };
    }

    return cleaned;
  }

  private validateDataRanges(profile: ArtisanProfile): ArtisanProfile {
    const cleaned = { ...profile };

    // Validate business data ranges
    const { business: businessRules } = this.validationRules;

    if (cleaned.business.monthlyIncome < businessRules.incomeRange.min) {
      cleaned.business.monthlyIncome = businessRules.incomeRange.min;
    }
    if (cleaned.business.monthlyIncome > businessRules.incomeRange.max) {
      cleaned.business.monthlyIncome = businessRules.incomeRange.max;
    }

    if (cleaned.business.employeeCount < businessRules.employeeRange.min) {
      cleaned.business.employeeCount = businessRules.employeeRange.min;
    }
    if (cleaned.business.employeeCount > businessRules.employeeRange.max) {
      cleaned.business.employeeCount = businessRules.employeeRange.max;
    }

    if (cleaned.business.experienceYears < businessRules.experienceRange.min) {
      cleaned.business.experienceYears = businessRules.experienceRange.min;
    }
    if (cleaned.business.experienceYears > businessRules.experienceRange.max) {
      cleaned.business.experienceYears = businessRules.experienceRange.max;
    }

    const currentYear = new Date().getFullYear();
    if (cleaned.business.establishmentYear < businessRules.establishmentYearRange.min) {
      cleaned.business.establishmentYear = businessRules.establishmentYearRange.min;
    }
    if (cleaned.business.establishmentYear > currentYear) {
      cleaned.business.establishmentYear = currentYear;
    }

    return cleaned;
  }

  private handleProfileOutliers(profile: ArtisanProfile): ArtisanProfile {
    if (this.config.handleOutliers === 'keep') {
      return profile;
    }

    const cleaned = { ...profile };

    // Handle income outliers (using IQR method)
    const medianIncome = 25000;
    const iqr = 30000;
    const lowerBound = medianIncome - (1.5 * iqr);
    const upperBound = medianIncome + (1.5 * iqr);

    if (this.config.handleOutliers === 'clip') {
      if (cleaned.business.monthlyIncome < lowerBound) {
        cleaned.business.monthlyIncome = lowerBound;
      }
      if (cleaned.business.monthlyIncome > upperBound) {
        cleaned.business.monthlyIncome = upperBound;
      }
    }

    return cleaned;
  }

  private cleanEligibilityCriteria(eligibility: any): any {
    const cleaned = { ...eligibility };

    // Ensure arrays exist
    if (!cleaned.businessType) cleaned.businessType = [];
    if (!cleaned.location) cleaned.location = {};
    if (!cleaned.location.states) cleaned.location.states = [];
    if (!cleaned.location.districts) cleaned.location.districts = [];
    if (!cleaned.location.pincodes) cleaned.location.pincodes = [];
    if (!cleaned.otherCriteria) cleaned.otherCriteria = [];

    // Ensure age and income objects exist
    if (!cleaned.age) cleaned.age = {};
    if (!cleaned.income) cleaned.income = {};

    return cleaned;
  }

  private cleanBenefitData(benefits: any): any {
    const cleaned = { ...benefits };

    // Ensure amount object exists
    if (!cleaned.amount) {
      cleaned.amount = { min: 0, max: 0, currency: 'INR' };
    }

    // Ensure numeric values
    if (cleaned.amount.min) cleaned.amount.min = Number(cleaned.amount.min);
    if (cleaned.amount.max) cleaned.amount.max = Number(cleaned.amount.max);

    // Ensure currency is set
    if (!cleaned.amount.currency) cleaned.amount.currency = 'INR';

    return cleaned;
  }

  private cleanApplicationData(application: any): any {
    const cleaned = { ...application };

    // Ensure arrays exist
    if (!cleaned.requiredDocuments) cleaned.requiredDocuments = [];
    if (!cleaned.applicationSteps) cleaned.applicationSteps = [];

    // Ensure processing time object exists
    if (!cleaned.processingTime) {
      cleaned.processingTime = { min: 30, max: 90 };
    }

    return cleaned;
  }

  private cleanMetadata(metadata: any): any {
    const cleaned = { ...metadata };

    // Ensure numeric fields
    if (!cleaned.popularity) cleaned.popularity = 0;
    if (!cleaned.successRate) cleaned.successRate = 0;
    if (!cleaned.averageProcessingTime) cleaned.averageProcessingTime = 60;

    // Ensure aiFeatures object exists
    if (!cleaned.aiFeatures) cleaned.aiFeatures = {};

    // Ensure lastUpdated is a Date
    if (!cleaned.lastUpdated) {
      cleaned.lastUpdated = new Date();
    } else if (!(cleaned.lastUpdated instanceof Date)) {
      cleaned.lastUpdated = new Date(cleaned.lastUpdated);
    }

    return cleaned;
  }

  private getDefaultFeatureValue(featureName: string): number {
    // Return sensible defaults for different feature types
    if (featureName.includes('Encoded') || featureName.includes('encoded')) {
      return 0.5; // Middle value for encoded features
    }
    if (featureName.includes('has') || featureName.includes('Has')) {
      return 0; // Default to false/no
    }
    return 0.5; // Default middle value
  }

  private assessCompleteness(profile: ArtisanProfile, issues: DataQualityIssue[]): number {
    let totalFields = 0;
    let completedFields = 0;

    // Check personal info
    const personalFields = ['name', 'phone', 'email', 'dateOfBirth'];
    personalFields.forEach(field => {
      totalFields++;
      if (profile.personalInfo[field as keyof typeof profile.personalInfo]) {
        completedFields++;
      } else {
        issues.push({
          field: `personalInfo.${field}`,
          issueType: 'missing',
          severity: field === 'phone' ? 'critical' : 'medium',
          description: `Missing ${field} in personal info`
        });
      }
    });

    // Check business info
    const businessFields = ['type', 'category', 'monthlyIncome', 'employeeCount'];
    businessFields.forEach(field => {
      totalFields++;
      if (profile.business[field as keyof typeof profile.business]) {
        completedFields++;
      } else {
        issues.push({
          field: `business.${field}`,
          issueType: 'missing',
          severity: 'medium',
          description: `Missing ${field} in business info`
        });
      }
    });

    // Check location info
    const locationFields = ['state', 'district', 'pincode'];
    locationFields.forEach(field => {
      totalFields++;
      if (profile.location[field as keyof typeof profile.location]) {
        completedFields++;
      } else {
        issues.push({
          field: `location.${field}`,
          issueType: 'missing',
          severity: 'high',
          description: `Missing ${field} in location info`
        });
      }
    });

    return completedFields / totalFields;
  }

  private assessConsistency(profile: ArtisanProfile, issues: DataQualityIssue[]): number {
    let consistencyScore = 1.0;

    // Check if establishment year is consistent with experience
    const currentYear = new Date().getFullYear();
    const businessAge = currentYear - profile.business.establishmentYear;
    
    if (profile.business.experienceYears > businessAge + 10) {
      consistencyScore -= 0.2;
      issues.push({
        field: 'business.experienceYears',
        issueType: 'inconsistent',
        severity: 'medium',
        description: 'Experience years inconsistent with establishment year'
      });
    }

    // Check if income is consistent with business size
    const expectedMinIncome = profile.business.employeeCount * 5000;
    if (profile.business.monthlyIncome < expectedMinIncome) {
      consistencyScore -= 0.1;
      issues.push({
        field: 'business.monthlyIncome',
        issueType: 'inconsistent',
        severity: 'low',
        description: 'Income seems low for business size'
      });
    }

    return Math.max(0, consistencyScore);
  }

  private assessAccuracy(profile: ArtisanProfile, issues: DataQualityIssue[]): number {
    let accuracyScore = 1.0;

    // Validate phone number format
    if (profile.personalInfo.phone && 
        !this.validationRules.personalInfo.phone.test(profile.personalInfo.phone)) {
      accuracyScore -= 0.3;
      issues.push({
        field: 'personalInfo.phone',
        issueType: 'invalid',
        severity: 'high',
        description: 'Invalid phone number format',
        suggestedFix: 'Use 10-digit Indian mobile number format'
      });
    }

    // Validate email format
    if (profile.personalInfo.email && 
        !this.validationRules.personalInfo.email.test(profile.personalInfo.email)) {
      accuracyScore -= 0.2;
      issues.push({
        field: 'personalInfo.email',
        issueType: 'invalid',
        severity: 'medium',
        description: 'Invalid email format'
      });
    }

    // Validate pincode format
    if (profile.location.pincode && 
        !this.validationRules.location.pincodePattern.test(profile.location.pincode)) {
      accuracyScore -= 0.2;
      issues.push({
        field: 'location.pincode',
        issueType: 'invalid',
        severity: 'medium',
        description: 'Invalid pincode format',
        suggestedFix: 'Use 6-digit pincode'
      });
    }

    return Math.max(0, accuracyScore);
  }

  private assessValidity(profile: ArtisanProfile, issues: DataQualityIssue[]): number {
    let validityScore = 1.0;

    // Check age validity
    const age = new Date().getFullYear() - profile.personalInfo.dateOfBirth.getFullYear();
    if (age < this.validationRules.personalInfo.ageRange.min || 
        age > this.validationRules.personalInfo.ageRange.max) {
      validityScore -= 0.3;
      issues.push({
        field: 'personalInfo.dateOfBirth',
        issueType: 'invalid',
        severity: 'high',
        description: 'Age out of valid range'
      });
    }

    // Check business data validity
    if (profile.business.monthlyIncome < 0) {
      validityScore -= 0.2;
      issues.push({
        field: 'business.monthlyIncome',
        issueType: 'invalid',
        severity: 'high',
        description: 'Negative income value'
      });
    }

    if (profile.business.employeeCount < 1) {
      validityScore -= 0.2;
      issues.push({
        field: 'business.employeeCount',
        issueType: 'invalid',
        severity: 'medium',
        description: 'Invalid employee count'
      });
    }

    return Math.max(0, validityScore);
  }

  private assessTimeliness(profile: ArtisanProfile, issues: DataQualityIssue[]): number {
    let timelinessScore = 1.0;

    // Check how recently the profile was updated
    const daysSinceUpdate = (Date.now() - profile.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 180) { // 6 months
      timelinessScore -= 0.3;
      issues.push({
        field: 'updatedAt',
        issueType: 'outdated',
        severity: 'medium',
        description: 'Profile not updated in over 6 months',
        suggestedFix: 'Request profile update from user'
      });
    } else if (daysSinceUpdate > 90) { // 3 months
      timelinessScore -= 0.1;
      issues.push({
        field: 'updatedAt',
        issueType: 'outdated',
        severity: 'low',
        description: 'Profile not updated in over 3 months'
      });
    }

    // Check document expiry
    const expiredDocs = Object.values(profile.documents).filter(doc => {
      if (doc.expiryDate) {
        return new Date(doc.expiryDate) < new Date();
      }
      return false;
    });

    if (expiredDocs.length > 0) {
      timelinessScore -= 0.2 * Math.min(1, expiredDocs.length / 3);
      issues.push({
        field: 'documents',
        issueType: 'outdated',
        severity: 'high',
        description: `${expiredDocs.length} document(s) expired`,
        suggestedFix: 'Request document renewal'
      });
    }

    return Math.max(0, timelinessScore);
  }
}
