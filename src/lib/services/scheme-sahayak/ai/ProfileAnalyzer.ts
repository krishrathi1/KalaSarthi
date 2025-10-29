/**
 * Profile Analyzer Component
 * Extracts 50+ features from artisan profiles for ML model input
 * Implements data preprocessing and normalization
 */

import { ArtisanProfile, GovernmentScheme } from '../../../types/scheme-sahayak';

/**
 * Extracted features from artisan profile for ML models
 */
export interface ExtractedFeatures {
  // Demographic features (10)
  age: number;
  genderEncoded: number; // 0: male, 1: female, 0.5: other
  educationLevel: number; // 0-1 normalized
  maritalStatus: number; // 0: single, 1: married, 0.5: other
  familySize: number; // normalized 0-1
  dependents: number; // normalized 0-1
  locationTier: number; // 0: rural, 0.5: semi-urban, 1: urban
  stateEconomicIndex: number; // 0-1 normalized state economic ranking
  districtDevelopmentIndex: number; // 0-1 normalized
  populationDensity: number; // 0-1 normalized

  // Business features (15)
  businessAge: number; // years since establishment, normalized 0-1
  businessSize: number; // employee count normalized 0-1
  monthlyIncomeNormalized: number; // 0-1 normalized
  businessTypeEncoded: number; // categorical encoding
  businessCategoryEncoded: number; // categorical encoding
  businessSubCategoryEncoded: number; // categorical encoding
  hasRegistration: number; // 0 or 1
  experienceYears: number; // normalized 0-1
  seasonalityFactor: number; // 0-1 based on business type
  growthPotential: number; // 0-1 calculated score
  marketReach: number; // 0-1 local to national
  technologyAdoption: number; // 0-1 digital readiness
  competitionLevel: number; // 0-1 in local market
  supplyChainIntegration: number; // 0-1 integration level
  exportPotential: number; // 0-1 export readiness

  // Financial features (8)
  incomeStability: number; // 0-1 variance-based score
  creditworthiness: number; // 0-1 estimated score
  assetBase: number; // 0-1 normalized asset value
  debtToIncomeRatio: number; // 0-1 normalized
  savingsRate: number; // 0-1 estimated
  financialLiteracy: number; // 0-1 estimated score
  bankingRelationship: number; // 0-1 banking integration
  previousLoanHistory: number; // 0-1 success rate

  // Digital & Social features (7)
  digitalLiteracy: number; // 0-1 based on usage patterns
  socialMediaPresence: number; // 0-1 online presence
  networkStrength: number; // 0-1 professional network
  communityInvolvement: number; // 0-1 participation level
  governmentInteraction: number; // 0-1 previous interactions
  documentReadiness: number; // 0-1 document completeness
  applicationHistory: number; // 0-1 success rate

  // Behavioral features (10)
  riskTolerance: number; // 0-1 from preferences
  timeHorizon: number; // 0: short, 0.5: medium, 1: long
  proactiveness: number; // 0-1 based on actions
  learningOrientation: number; // 0-1 training participation
  innovationIndex: number; // 0-1 adoption of new practices
  collaborationScore: number; // 0-1 group participation
  persistenceLevel: number; // 0-1 application follow-through
  adaptabilityScore: number; // 0-1 change adaptation
  communicationSkills: number; // 0-1 estimated
  leadershipPotential: number; // 0-1 community leadership
}

/**
 * Feature extraction configuration and weights
 */
interface FeatureConfig {
  weights: Record<keyof ExtractedFeatures, number>;
  normalizationRanges: Record<string, { min: number; max: number }>;
  categoricalMappings: Record<string, Record<string, number>>;
}

/**
 * Profile Analyzer for extracting ML features from artisan profiles
 */
export class ProfileAnalyzer {
  private config: FeatureConfig;
  private stateEconomicData: Record<string, number>;
  private districtDevelopmentData: Record<string, number>;
  private businessSeasonalityData: Record<string, number>;

  constructor() {
    this.config = this.initializeConfig();
    this.stateEconomicData = this.loadStateEconomicData();
    this.districtDevelopmentData = this.loadDistrictDevelopmentData();
    this.businessSeasonalityData = this.loadBusinessSeasonalityData();
  }

  /**
   * Extract comprehensive features from artisan profile
   */
  async extractFeatures(profile: ArtisanProfile): Promise<ExtractedFeatures> {
    const features: ExtractedFeatures = {
      // Demographic features
      age: this.calculateAge(profile.personalInfo.dateOfBirth),
      genderEncoded: this.encodeGender(profile.personalInfo.name), // Estimated from name patterns
      educationLevel: this.estimateEducationLevel(profile),
      maritalStatus: this.estimateMaritalStatus(profile),
      familySize: this.estimateFamilySize(profile),
      dependents: this.estimateDependents(profile),
      locationTier: this.calculateLocationTier(profile.location),
      stateEconomicIndex: this.getStateEconomicIndex(profile.location.state),
      districtDevelopmentIndex: this.getDistrictDevelopmentIndex(profile.location.district),
      populationDensity: this.calculatePopulationDensity(profile.location.pincode),

      // Business features
      businessAge: this.normalizeBusinessAge(profile.business.establishmentYear),
      businessSize: this.normalizeBusinessSize(profile.business.employeeCount),
      monthlyIncomeNormalized: this.normalizeIncome(profile.business.monthlyIncome),
      businessTypeEncoded: this.encodeBusinessType(profile.business.type),
      businessCategoryEncoded: this.encodeBusinessCategory(profile.business.category),
      businessSubCategoryEncoded: this.encodeBusinessSubCategory(profile.business.subCategory),
      hasRegistration: profile.business.registrationNumber ? 1 : 0,
      experienceYears: this.normalizeExperience(profile.business.experienceYears),
      seasonalityFactor: this.calculateSeasonalityFactor(profile.business.category),
      growthPotential: this.calculateGrowthPotential(profile),
      marketReach: this.estimateMarketReach(profile),
      technologyAdoption: this.estimateTechnologyAdoption(profile),
      competitionLevel: this.estimateCompetitionLevel(profile),
      supplyChainIntegration: this.estimateSupplyChainIntegration(profile),
      exportPotential: this.estimateExportPotential(profile),

      // Financial features
      incomeStability: this.calculateIncomeStability(profile),
      creditworthiness: this.estimateCreditworthiness(profile),
      assetBase: this.estimateAssetBase(profile),
      debtToIncomeRatio: this.estimateDebtToIncomeRatio(profile),
      savingsRate: this.estimateSavingsRate(profile),
      financialLiteracy: this.estimateFinancialLiteracy(profile),
      bankingRelationship: this.estimateBankingRelationship(profile),
      previousLoanHistory: this.calculatePreviousLoanHistory(profile),

      // Digital & Social features
      digitalLiteracy: this.estimateDigitalLiteracy(profile),
      socialMediaPresence: this.estimateSocialMediaPresence(profile),
      networkStrength: this.estimateNetworkStrength(profile),
      communityInvolvement: this.estimateCommunityInvolvement(profile),
      governmentInteraction: this.calculateGovernmentInteraction(profile),
      documentReadiness: this.calculateDocumentReadiness(profile),
      applicationHistory: this.calculateApplicationHistory(profile),

      // Behavioral features
      riskTolerance: this.encodeRiskTolerance(profile.preferences.riskTolerance),
      timeHorizon: this.encodeTimeHorizon(profile.preferences.timeHorizon),
      proactiveness: this.estimateProactiveness(profile),
      learningOrientation: this.estimateLearningOrientation(profile),
      innovationIndex: this.estimateInnovationIndex(profile),
      collaborationScore: this.estimateCollaborationScore(profile),
      persistenceLevel: this.estimatePersistenceLevel(profile),
      adaptabilityScore: this.estimateAdaptabilityScore(profile),
      communicationSkills: this.estimateCommunicationSkills(profile),
      leadershipPotential: this.estimateLeadershipPotential(profile)
    };

    return this.normalizeFeatures(features);
  }

  /**
   * Preprocess features for ML model input
   */
  preprocessFeatures(features: ExtractedFeatures): number[] {
    const featureArray: number[] = [];
    
    // Convert features to array in consistent order
    const orderedKeys: (keyof ExtractedFeatures)[] = [
      // Demographic
      'age', 'genderEncoded', 'educationLevel', 'maritalStatus', 'familySize',
      'dependents', 'locationTier', 'stateEconomicIndex', 'districtDevelopmentIndex', 'populationDensity',
      
      // Business
      'businessAge', 'businessSize', 'monthlyIncomeNormalized', 'businessTypeEncoded', 'businessCategoryEncoded',
      'businessSubCategoryEncoded', 'hasRegistration', 'experienceYears', 'seasonalityFactor', 'growthPotential',
      'marketReach', 'technologyAdoption', 'competitionLevel', 'supplyChainIntegration', 'exportPotential',
      
      // Financial
      'incomeStability', 'creditworthiness', 'assetBase', 'debtToIncomeRatio', 'savingsRate',
      'financialLiteracy', 'bankingRelationship', 'previousLoanHistory',
      
      // Digital & Social
      'digitalLiteracy', 'socialMediaPresence', 'networkStrength', 'communityInvolvement',
      'governmentInteraction', 'documentReadiness', 'applicationHistory',
      
      // Behavioral
      'riskTolerance', 'timeHorizon', 'proactiveness', 'learningOrientation', 'innovationIndex',
      'collaborationScore', 'persistenceLevel', 'adaptabilityScore', 'communicationSkills', 'leadershipPotential'
    ];

    for (const key of orderedKeys) {
      featureArray.push(features[key]);
    }

    return featureArray;
  }

  /**
   * Calculate feature importance scores
   */
  calculateFeatureImportance(features: ExtractedFeatures): Record<keyof ExtractedFeatures, number> {
    const importance: Record<keyof ExtractedFeatures, number> = {} as any;
    
    for (const [key, value] of Object.entries(features)) {
      const weight = this.config.weights[key as keyof ExtractedFeatures] || 1;
      importance[key as keyof ExtractedFeatures] = value * weight;
    }

    return importance;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializeConfig(): FeatureConfig {
    return {
      weights: {
        // Higher weights for more predictive features
        monthlyIncomeNormalized: 1.5,
        businessAge: 1.3,
        experienceYears: 1.3,
        documentReadiness: 1.4,
        applicationHistory: 1.6,
        creditworthiness: 1.5,
        digitalLiteracy: 1.2,
        growthPotential: 1.4,
        
        // Standard weights for other features
        age: 1.0,
        genderEncoded: 0.8,
        educationLevel: 1.1,
        maritalStatus: 0.9,
        familySize: 0.8,
        dependents: 0.9,
        locationTier: 1.1,
        stateEconomicIndex: 1.0,
        districtDevelopmentIndex: 1.0,
        populationDensity: 0.9,
        businessSize: 1.2,
        businessTypeEncoded: 1.1,
        businessCategoryEncoded: 1.1,
        businessSubCategoryEncoded: 1.0,
        hasRegistration: 1.3,
        seasonalityFactor: 1.0,
        marketReach: 1.1,
        technologyAdoption: 1.2,
        competitionLevel: 1.0,
        supplyChainIntegration: 1.1,
        exportPotential: 1.0,
        incomeStability: 1.3,
        assetBase: 1.2,
        debtToIncomeRatio: 1.1,
        savingsRate: 1.1,
        financialLiteracy: 1.2,
        bankingRelationship: 1.1,
        previousLoanHistory: 1.4,
        socialMediaPresence: 0.9,
        networkStrength: 1.1,
        communityInvolvement: 1.0,
        governmentInteraction: 1.2,
        riskTolerance: 1.0,
        timeHorizon: 1.0,
        proactiveness: 1.2,
        learningOrientation: 1.1,
        innovationIndex: 1.1,
        collaborationScore: 1.0,
        persistenceLevel: 1.3,
        adaptabilityScore: 1.1,
        communicationSkills: 1.0,
        leadershipPotential: 1.0
      },
      normalizationRanges: {
        age: { min: 18, max: 70 },
        monthlyIncome: { min: 5000, max: 500000 },
        businessAge: { min: 0, max: 50 },
        experienceYears: { min: 0, max: 40 },
        employeeCount: { min: 1, max: 100 }
      },
      categoricalMappings: {
        businessType: {
          'manufacturing': 0.8,
          'services': 0.6,
          'retail': 0.4,
          'agriculture': 0.3,
          'handicrafts': 0.7,
          'textiles': 0.8,
          'food_processing': 0.7,
          'technology': 0.9,
          'other': 0.5
        },
        riskTolerance: {
          'low': 0.2,
          'medium': 0.5,
          'high': 0.8
        },
        timeHorizon: {
          'short_term': 0.2,
          'medium_term': 0.5,
          'long_term': 0.8
        }
      }
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      return this.normalize(age - 1, 18, 70);
    }
    
    return this.normalize(age, 18, 70);
  }

  private encodeGender(name: string): number {
    // Simple heuristic based on common Indian name patterns
    // In production, this would use a more sophisticated name-gender mapping
    const maleIndicators = ['kumar', 'singh', 'raj', 'dev', 'ram', 'krishna'];
    const femaleIndicators = ['devi', 'kumari', 'priya', 'rani', 'lata', 'maya'];
    
    const lowerName = name.toLowerCase();
    
    for (const indicator of maleIndicators) {
      if (lowerName.includes(indicator)) return 0;
    }
    
    for (const indicator of femaleIndicators) {
      if (lowerName.includes(indicator)) return 1;
    }
    
    return 0.5; // Unknown/other
  }

  private estimateEducationLevel(profile: ArtisanProfile): number {
    // Estimate based on business type, digital usage, and other indicators
    let score = 0.5; // Base score
    
    // Business type indicators
    if (profile.business.type === 'technology') score += 0.3;
    else if (profile.business.type === 'services') score += 0.2;
    else if (profile.business.type === 'manufacturing') score += 0.1;
    
    // Registration indicates higher education/awareness
    if (profile.business.registrationNumber) score += 0.2;
    
    // Email usage indicates literacy
    if (profile.personalInfo.email) score += 0.1;
    
    return Math.min(1, score);
  }

  private normalizeBusinessAge(establishmentYear: number): number {
    const currentYear = new Date().getFullYear();
    const age = currentYear - establishmentYear;
    return this.normalize(age, 0, 50);
  }

  private normalizeIncome(income: number): number {
    return this.normalize(income, 5000, 500000);
  }

  private encodeBusinessType(type: string): number {
    return this.config.categoricalMappings.businessType[type] || 0.5;
  }

  private encodeBusinessCategory(category: string): number {
    // Simple hash-based encoding for categories
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = ((hash << 5) - hash + category.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) / 0xffffffff;
  }

  private encodeBusinessSubCategory(subCategory: string): number {
    // Simple hash-based encoding for subcategories
    let hash = 0;
    for (let i = 0; i < subCategory.length; i++) {
      hash = ((hash << 5) - hash + subCategory.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) / 0xffffffff;
  }

  private calculateDocumentReadiness(profile: ArtisanProfile): number {
    const totalDocuments = Object.keys(profile.documents).length;
    const verifiedDocuments = Object.values(profile.documents)
      .filter(doc => doc.status === 'verified').length;
    
    if (totalDocuments === 0) return 0;
    return verifiedDocuments / totalDocuments;
  }

  private calculateApplicationHistory(profile: ArtisanProfile): number {
    const applications = profile.applicationHistory;
    if (applications.length === 0) return 0;
    
    const successfulApplications = applications.filter(app => app.outcome === 'approved').length;
    return successfulApplications / applications.length;
  }

  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  private normalizeFeatures(features: ExtractedFeatures): ExtractedFeatures {
    // Ensure all features are within [0, 1] range
    const normalized = { ...features };
    
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value === 'number') {
        normalized[key as keyof ExtractedFeatures] = Math.max(0, Math.min(1, value));
      }
    }
    
    return normalized;
  }

  // Placeholder implementations for estimation methods
  // In production, these would use more sophisticated algorithms and data sources

  private estimateMaritalStatus(profile: ArtisanProfile): number { return 0.5; }
  private estimateFamilySize(profile: ArtisanProfile): number { return 0.5; }
  private estimateDependents(profile: ArtisanProfile): number { return 0.5; }
  private calculateLocationTier(location: any): number { return 0.5; }
  private getStateEconomicIndex(state: string): number { return 0.5; }
  private getDistrictDevelopmentIndex(district: string): number { return 0.5; }
  private calculatePopulationDensity(pincode: string): number { return 0.5; }
  private normalizeBusinessSize(employeeCount: number): number { 
    return this.normalize(employeeCount, 1, 100); 
  }
  private normalizeExperience(years: number): number { 
    return this.normalize(years, 0, 40); 
  }
  private calculateSeasonalityFactor(category: string): number { return 0.5; }
  private calculateGrowthPotential(profile: ArtisanProfile): number { return 0.5; }
  private estimateMarketReach(profile: ArtisanProfile): number { return 0.5; }
  private estimateTechnologyAdoption(profile: ArtisanProfile): number { return 0.5; }
  private estimateCompetitionLevel(profile: ArtisanProfile): number { return 0.5; }
  private estimateSupplyChainIntegration(profile: ArtisanProfile): number { return 0.5; }
  private estimateExportPotential(profile: ArtisanProfile): number { return 0.5; }
  private calculateIncomeStability(profile: ArtisanProfile): number { return 0.5; }
  private estimateCreditworthiness(profile: ArtisanProfile): number { return 0.5; }
  private estimateAssetBase(profile: ArtisanProfile): number { return 0.5; }
  private estimateDebtToIncomeRatio(profile: ArtisanProfile): number { return 0.5; }
  private estimateSavingsRate(profile: ArtisanProfile): number { return 0.5; }
  private estimateFinancialLiteracy(profile: ArtisanProfile): number { return 0.5; }
  private estimateBankingRelationship(profile: ArtisanProfile): number { return 0.5; }
  private calculatePreviousLoanHistory(profile: ArtisanProfile): number { return 0.5; }
  private estimateDigitalLiteracy(profile: ArtisanProfile): number { return 0.5; }
  private estimateSocialMediaPresence(profile: ArtisanProfile): number { return 0.5; }
  private estimateNetworkStrength(profile: ArtisanProfile): number { return 0.5; }
  private estimateCommunityInvolvement(profile: ArtisanProfile): number { return 0.5; }
  private calculateGovernmentInteraction(profile: ArtisanProfile): number { return 0.5; }
  private encodeRiskTolerance(tolerance: string): number { 
    return this.config.categoricalMappings.riskTolerance[tolerance] || 0.5; 
  }
  private encodeTimeHorizon(horizon: string): number { 
    return this.config.categoricalMappings.timeHorizon[horizon] || 0.5; 
  }
  private estimateProactiveness(profile: ArtisanProfile): number { return 0.5; }
  private estimateLearningOrientation(profile: ArtisanProfile): number { return 0.5; }
  private estimateInnovationIndex(profile: ArtisanProfile): number { return 0.5; }
  private estimateCollaborationScore(profile: ArtisanProfile): number { return 0.5; }
  private estimatePersistenceLevel(profile: ArtisanProfile): number { return 0.5; }
  private estimateAdaptabilityScore(profile: ArtisanProfile): number { return 0.5; }
  private estimateCommunicationSkills(profile: ArtisanProfile): number { return 0.5; }
  private estimateLeadershipPotential(profile: ArtisanProfile): number { return 0.5; }

  private loadStateEconomicData(): Record<string, number> {
    // In production, this would load from a database or external API
    return {
      'Maharashtra': 0.85,
      'Gujarat': 0.82,
      'Tamil Nadu': 0.78,
      'Karnataka': 0.75,
      'Uttar Pradesh': 0.45,
      'Bihar': 0.35,
      'West Bengal': 0.65,
      'Rajasthan': 0.55,
      'Madhya Pradesh': 0.50,
      'Andhra Pradesh': 0.68
    };
  }

  private loadDistrictDevelopmentData(): Record<string, number> {
    // In production, this would load from a database or external API
    return {};
  }

  private loadBusinessSeasonalityData(): Record<string, number> {
    // In production, this would load from a database or external API
    return {
      'agriculture': 0.8,
      'textiles': 0.6,
      'handicrafts': 0.7,
      'food_processing': 0.5,
      'manufacturing': 0.3,
      'services': 0.2,
      'technology': 0.1
    };
  }
}