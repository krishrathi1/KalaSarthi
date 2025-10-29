/**
 * Feature Engineering Pipeline
 * Processes and transforms extracted features for ML model consumption
 * Handles feature scaling, encoding, and transformation
 */

import { ExtractedFeatures, ProfileAnalyzer } from './ProfileAnalyzer';
import { ArtisanProfile, GovernmentScheme } from '../../../types/scheme-sahayak';

/**
 * Engineered features combining profile and scheme data
 */
export interface EngineeredFeatures {
  // Profile features (normalized)
  profileFeatures: number[];
  
  // Scheme compatibility features
  schemeCompatibilityFeatures: number[];
  
  // Interaction features (profile x scheme)
  interactionFeatures: number[];
  
  // Temporal features
  temporalFeatures: number[];
  
  // Contextual features
  contextualFeatures: number[];
  
  // Feature metadata
  featureNames: string[];
  featureImportance: number[];
  processingTimestamp: Date;
}

/**
 * Feature transformation configuration
 */
interface FeatureTransformConfig {
  scalingMethod: 'minmax' | 'standard' | 'robust';
  encodingMethod: 'onehot' | 'label' | 'target';
  interactionDepth: number;
  temporalWindowDays: number;
  contextualFactors: string[];
}

/**
 * Feature statistics for normalization and monitoring
 */
interface FeatureStatistics {
  mean: number[];
  std: number[];
  min: number[];
  max: number[];
  median: number[];
  skewness: number[];
  kurtosis: number[];
  nullCount: number[];
  lastUpdated: Date;
}

/**
 * Feature Engineering Pipeline for ML model preparation
 */
export class FeatureEngineeringPipeline {
  private profileAnalyzer: ProfileAnalyzer;
  private config: FeatureTransformConfig;
  private statistics: FeatureStatistics | null = null;
  private featureCache: Map<string, EngineeredFeatures> = new Map();

  constructor(config?: Partial<FeatureTransformConfig>) {
    this.profileAnalyzer = new ProfileAnalyzer();
    this.config = {
      scalingMethod: 'minmax',
      encodingMethod: 'label',
      interactionDepth: 2,
      temporalWindowDays: 30,
      contextualFactors: ['season', 'economic_cycle', 'policy_changes'],
      ...config
    };
  }

  /**
   * Process artisan profile and scheme data into engineered features
   */
  async engineerFeatures(
    profile: ArtisanProfile,
    schemes: GovernmentScheme[],
    targetScheme?: GovernmentScheme
  ): Promise<EngineeredFeatures> {
    const cacheKey = this.generateCacheKey(profile.id, targetScheme?.id);
    
    // Check cache first
    if (this.featureCache.has(cacheKey)) {
      const cached = this.featureCache.get(cacheKey)!;
      // Return cached if less than 1 hour old
      if (Date.now() - cached.processingTimestamp.getTime() < 3600000) {
        return cached;
      }
    }

    // Extract base profile features
    const extractedFeatures = await this.profileAnalyzer.extractFeatures(profile);
    const profileFeatures = this.profileAnalyzer.preprocessFeatures(extractedFeatures);

    // Generate scheme compatibility features
    const schemeCompatibilityFeatures = targetScheme 
      ? this.generateSchemeCompatibilityFeatures(profile, targetScheme)
      : this.generateAggregateSchemeFeatures(profile, schemes);

    // Create interaction features
    const interactionFeatures = this.generateInteractionFeatures(
      profileFeatures,
      schemeCompatibilityFeatures
    );

    // Generate temporal features
    const temporalFeatures = this.generateTemporalFeatures(profile);

    // Generate contextual features
    const contextualFeatures = this.generateContextualFeatures(profile);

    // Combine all features
    const allFeatures = [
      ...profileFeatures,
      ...schemeCompatibilityFeatures,
      ...interactionFeatures,
      ...temporalFeatures,
      ...contextualFeatures
    ];

    // Apply transformations
    const transformedFeatures = this.applyTransformations(allFeatures);

    // Generate feature names and importance
    const featureNames = this.generateFeatureNames(
      profileFeatures.length,
      schemeCompatibilityFeatures.length,
      interactionFeatures.length,
      temporalFeatures.length,
      contextualFeatures.length
    );

    const featureImportance = this.calculateFeatureImportance(
      extractedFeatures,
      transformedFeatures
    );

    const engineeredFeatures: EngineeredFeatures = {
      profileFeatures: transformedFeatures.slice(0, profileFeatures.length),
      schemeCompatibilityFeatures: transformedFeatures.slice(
        profileFeatures.length,
        profileFeatures.length + schemeCompatibilityFeatures.length
      ),
      interactionFeatures: transformedFeatures.slice(
        profileFeatures.length + schemeCompatibilityFeatures.length,
        profileFeatures.length + schemeCompatibilityFeatures.length + interactionFeatures.length
      ),
      temporalFeatures: transformedFeatures.slice(
        profileFeatures.length + schemeCompatibilityFeatures.length + interactionFeatures.length,
        profileFeatures.length + schemeCompatibilityFeatures.length + interactionFeatures.length + temporalFeatures.length
      ),
      contextualFeatures: transformedFeatures.slice(
        profileFeatures.length + schemeCompatibilityFeatures.length + interactionFeatures.length + temporalFeatures.length
      ),
      featureNames,
      featureImportance,
      processingTimestamp: new Date()
    };

    // Cache the result
    this.featureCache.set(cacheKey, engineeredFeatures);

    return engineeredFeatures;
  }

  /**
   * Generate scheme compatibility features for a specific scheme
   */
  private generateSchemeCompatibilityFeatures(
    profile: ArtisanProfile,
    scheme: GovernmentScheme
  ): number[] {
    const features: number[] = [];

    // Eligibility match features
    features.push(this.calculateAgeEligibility(profile, scheme));
    features.push(this.calculateIncomeEligibility(profile, scheme));
    features.push(this.calculateLocationEligibility(profile, scheme));
    features.push(this.calculateBusinessTypeEligibility(profile, scheme));

    // Benefit alignment features
    features.push(this.calculateBenefitAlignment(profile, scheme));
    features.push(this.calculateAmountSuitability(profile, scheme));
    features.push(this.calculateTimingAlignment(profile, scheme));

    // Application complexity features
    features.push(this.calculateApplicationComplexity(scheme));
    features.push(this.calculateDocumentRequirementMatch(profile, scheme));
    features.push(this.calculateProcessingTimeAlignment(profile, scheme));

    // Historical performance features
    features.push(scheme.metadata.successRate / 100);
    features.push(scheme.metadata.popularity / 100);
    features.push(this.normalizeProcessingTime(scheme.metadata.averageProcessingTime));

    return features;
  }

  /**
   * Generate aggregate scheme features across all available schemes
   */
  private generateAggregateSchemeFeatures(
    profile: ArtisanProfile,
    schemes: GovernmentScheme[]
  ): number[] {
    const features: number[] = [];

    if (schemes.length === 0) {
      return new Array(12).fill(0); // Return zeros if no schemes
    }

    // Calculate aggregate eligibility scores
    const eligibilityScores = schemes.map(scheme => 
      this.calculateOverallEligibility(profile, scheme)
    );

    features.push(Math.max(...eligibilityScores)); // Best eligibility match
    features.push(eligibilityScores.reduce((a, b) => a + b, 0) / eligibilityScores.length); // Average eligibility
    features.push(eligibilityScores.filter(score => score > 0.7).length / schemes.length); // High eligibility ratio

    // Category distribution features
    const categories = schemes.map(s => s.category);
    const categoryDistribution = this.calculateCategoryDistribution(categories);
    features.push(...Object.values(categoryDistribution));

    // Benefit range features
    const benefitAmounts = schemes.map(s => s.benefits.amount.max);
    features.push(Math.max(...benefitAmounts) / 1000000); // Max benefit (normalized)
    features.push(benefitAmounts.reduce((a, b) => a + b, 0) / benefitAmounts.length / 1000000); // Average benefit

    // Success rate features
    const successRates = schemes.map(s => s.metadata.successRate);
    features.push(Math.max(...successRates) / 100); // Best success rate
    features.push(successRates.reduce((a, b) => a + b, 0) / successRates.length / 100); // Average success rate

    return features;
  }

  /**
   * Generate interaction features between profile and scheme features
   */
  private generateInteractionFeatures(
    profileFeatures: number[],
    schemeFeatures: number[]
  ): number[] {
    const interactions: number[] = [];

    // Generate polynomial interactions up to specified depth
    for (let i = 0; i < Math.min(profileFeatures.length, 10); i++) {
      for (let j = 0; j < Math.min(schemeFeatures.length, 5); j++) {
        // Multiplicative interactions
        interactions.push(profileFeatures[i] * schemeFeatures[j]);
        
        // Additive interactions (if depth > 1)
        if (this.config.interactionDepth > 1) {
          interactions.push(profileFeatures[i] + schemeFeatures[j]);
        }
      }
    }

    return interactions.slice(0, 50); // Limit to 50 interaction features
  }

  /**
   * Generate temporal features based on timing and trends
   */
  private generateTemporalFeatures(profile: ArtisanProfile): number[] {
    const features: number[] = [];
    const now = new Date();

    // Account age features
    const accountAge = (now.getTime() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    features.push(Math.min(1, accountAge / 365)); // Account age in years (capped at 1)

    // Recent activity features
    const lastUpdate = (now.getTime() - profile.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    features.push(Math.max(0, 1 - lastUpdate / 30)); // Recency score (last 30 days)

    // Application timing features
    if (profile.applicationHistory.length > 0) {
      const recentApplications = profile.applicationHistory.filter(app => {
        const appAge = (now.getTime() - app.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
        return appAge <= this.config.temporalWindowDays;
      });

      features.push(recentApplications.length / 10); // Recent application count (normalized)
      
      // Application frequency
      const totalDays = Math.max(1, accountAge);
      features.push(Math.min(1, profile.applicationHistory.length / totalDays * 365)); // Applications per year
    } else {
      features.push(0, 0);
    }

    // Seasonal features
    const month = now.getMonth();
    const quarter = Math.floor(month / 3);
    features.push(Math.sin(2 * Math.PI * month / 12)); // Monthly seasonality
    features.push(Math.cos(2 * Math.PI * month / 12));
    features.push(quarter / 4); // Quarterly feature

    return features;
  }

  /**
   * Generate contextual features based on external factors
   */
  private generateContextualFeatures(profile: ArtisanProfile): number[] {
    const features: number[] = [];

    // Economic context features
    features.push(this.getEconomicCyclePhase()); // 0-1 based on current economic phase
    features.push(this.getPolicyEnvironmentScore()); // 0-1 based on policy favorability

    // Market context features
    features.push(this.getMarketSentiment(profile.business.category)); // 0-1 market sentiment
    features.push(this.getCompetitionIntensity(profile.location.state, profile.business.category));

    // Technology context features
    features.push(this.getDigitalAdoptionTrend()); // 0-1 digital adoption trend
    features.push(this.getTechnologyReadiness(profile.location.state));

    return features;
  }

  /**
   * Apply feature transformations based on configuration
   */
  private applyTransformations(features: number[]): number[] {
    switch (this.config.scalingMethod) {
      case 'minmax':
        return this.applyMinMaxScaling(features);
      case 'standard':
        return this.applyStandardScaling(features);
      case 'robust':
        return this.applyRobustScaling(features);
      default:
        return features;
    }
  }

  /**
   * Apply min-max scaling to features
   */
  private applyMinMaxScaling(features: number[]): number[] {
    if (!this.statistics) {
      return features; // Return as-is if no statistics available
    }

    return features.map((value, index) => {
      const min = this.statistics!.min[index] || 0;
      const max = this.statistics!.max[index] || 1;
      return max === min ? 0 : (value - min) / (max - min);
    });
  }

  /**
   * Apply standard scaling (z-score normalization)
   */
  private applyStandardScaling(features: number[]): number[] {
    if (!this.statistics) {
      return features;
    }

    return features.map((value, index) => {
      const mean = this.statistics!.mean[index] || 0;
      const std = this.statistics!.std[index] || 1;
      return std === 0 ? 0 : (value - mean) / std;
    });
  }

  /**
   * Apply robust scaling (using median and IQR)
   */
  private applyRobustScaling(features: number[]): number[] {
    if (!this.statistics) {
      return features;
    }

    return features.map((value, index) => {
      const median = this.statistics!.median[index] || 0;
      // Simplified robust scaling - in production would use proper IQR
      const scale = Math.max(0.1, Math.abs(median) + 0.1);
      return (value - median) / scale;
    });
  }

  /**
   * Generate feature names for interpretability
   */
  private generateFeatureNames(
    profileCount: number,
    schemeCount: number,
    interactionCount: number,
    temporalCount: number,
    contextualCount: number
  ): string[] {
    const names: string[] = [];

    // Profile feature names
    for (let i = 0; i < profileCount; i++) {
      names.push(`profile_feature_${i}`);
    }

    // Scheme compatibility feature names
    const schemeFeatureNames = [
      'age_eligibility', 'income_eligibility', 'location_eligibility', 'business_type_eligibility',
      'benefit_alignment', 'amount_suitability', 'timing_alignment',
      'application_complexity', 'document_requirement_match', 'processing_time_alignment',
      'scheme_success_rate', 'scheme_popularity', 'normalized_processing_time'
    ];
    names.push(...schemeFeatureNames.slice(0, schemeCount));

    // Interaction feature names
    for (let i = 0; i < interactionCount; i++) {
      names.push(`interaction_feature_${i}`);
    }

    // Temporal feature names
    const temporalFeatureNames = [
      'account_age', 'recency_score', 'recent_applications', 'application_frequency',
      'monthly_seasonality_sin', 'monthly_seasonality_cos', 'quarterly_feature'
    ];
    names.push(...temporalFeatureNames.slice(0, temporalCount));

    // Contextual feature names
    const contextualFeatureNames = [
      'economic_cycle_phase', 'policy_environment_score', 'market_sentiment',
      'competition_intensity', 'digital_adoption_trend', 'technology_readiness'
    ];
    names.push(...contextualFeatureNames.slice(0, contextualCount));

    return names;
  }

  /**
   * Calculate feature importance scores
   */
  private calculateFeatureImportance(
    extractedFeatures: ExtractedFeatures,
    transformedFeatures: number[]
  ): number[] {
    // Simple importance calculation based on variance and correlation
    // In production, this would use more sophisticated methods like permutation importance
    
    const importance: number[] = [];
    const profileImportance = this.profileAnalyzer.calculateFeatureImportance(extractedFeatures);
    
    // Add profile feature importance
    Object.values(profileImportance).forEach(imp => importance.push(imp));
    
    // Add default importance for other features
    const remainingFeatures = transformedFeatures.length - Object.keys(profileImportance).length;
    for (let i = 0; i < remainingFeatures; i++) {
      importance.push(0.5); // Default importance
    }

    return importance;
  }

  /**
   * Update feature statistics for normalization
   */
  async updateStatistics(profiles: ArtisanProfile[], schemes: GovernmentScheme[]): Promise<void> {
    const allFeatures: number[][] = [];

    // Collect features from sample of profiles
    for (const profile of profiles.slice(0, 1000)) { // Limit to 1000 for performance
      try {
        const engineered = await this.engineerFeatures(profile, schemes);
        const combined = [
          ...engineered.profileFeatures,
          ...engineered.schemeCompatibilityFeatures,
          ...engineered.interactionFeatures,
          ...engineered.temporalFeatures,
          ...engineered.contextualFeatures
        ];
        allFeatures.push(combined);
      } catch (error) {
        console.warn('Error processing profile for statistics:', error);
      }
    }

    if (allFeatures.length === 0) {
      return;
    }

    // Calculate statistics
    const featureCount = allFeatures[0].length;
    const statistics: FeatureStatistics = {
      mean: new Array(featureCount).fill(0),
      std: new Array(featureCount).fill(0),
      min: new Array(featureCount).fill(Infinity),
      max: new Array(featureCount).fill(-Infinity),
      median: new Array(featureCount).fill(0),
      skewness: new Array(featureCount).fill(0),
      kurtosis: new Array(featureCount).fill(0),
      nullCount: new Array(featureCount).fill(0),
      lastUpdated: new Date()
    };

    // Calculate basic statistics
    for (let i = 0; i < featureCount; i++) {
      const values = allFeatures.map(features => features[i]).filter(v => !isNaN(v));
      
      if (values.length > 0) {
        statistics.mean[i] = values.reduce((a, b) => a + b, 0) / values.length;
        statistics.min[i] = Math.min(...values);
        statistics.max[i] = Math.max(...values);
        
        // Calculate standard deviation
        const variance = values.reduce((acc, val) => acc + Math.pow(val - statistics.mean[i], 2), 0) / values.length;
        statistics.std[i] = Math.sqrt(variance);
        
        // Calculate median
        const sorted = values.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        statistics.median[i] = sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
      }
      
      statistics.nullCount[i] = allFeatures.length - values.length;
    }

    this.statistics = statistics;
  }

  /**
   * Clear feature cache
   */
  clearCache(): void {
    this.featureCache.clear();
  }

  /**
   * Get feature statistics
   */
  getStatistics(): FeatureStatistics | null {
    return this.statistics;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateCacheKey(profileId: string, schemeId?: string): string {
    return `${profileId}_${schemeId || 'all'}`;
  }

  private calculateAgeEligibility(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const age = new Date().getFullYear() - profile.personalInfo.dateOfBirth.getFullYear();
    const { min, max } = scheme.eligibility.age;
    
    if (!min && !max) return 1;
    if (min && age < min) return 0;
    if (max && age > max) return 0;
    return 1;
  }

  private calculateIncomeEligibility(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const income = profile.business.monthlyIncome * 12; // Annual income
    const { min, max } = scheme.eligibility.income;
    
    if (!min && !max) return 1;
    if (min && income < min) return 0;
    if (max && income > max) return 0;
    return 1;
  }

  private calculateLocationEligibility(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const { states, districts, pincodes } = scheme.eligibility.location;
    
    if (states && !states.includes(profile.location.state)) return 0;
    if (districts && !districts.includes(profile.location.district)) return 0;
    if (pincodes && !pincodes.includes(profile.location.pincode)) return 0;
    
    return 1;
  }

  private calculateBusinessTypeEligibility(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const eligibleTypes = scheme.eligibility.businessType;
    if (eligibleTypes.length === 0) return 1;
    
    return eligibleTypes.includes(profile.business.type) ? 1 : 0;
  }

  private calculateOverallEligibility(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const age = this.calculateAgeEligibility(profile, scheme);
    const income = this.calculateIncomeEligibility(profile, scheme);
    const location = this.calculateLocationEligibility(profile, scheme);
    const businessType = this.calculateBusinessTypeEligibility(profile, scheme);
    
    return (age + income + location + businessType) / 4;
  }

  private calculateBenefitAlignment(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    // Simple heuristic based on business needs and scheme benefits
    const incomeRatio = scheme.benefits.amount.max / (profile.business.monthlyIncome * 12);
    return Math.min(1, incomeRatio / 5); // Normalize to reasonable range
  }

  private calculateAmountSuitability(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const monthlyIncome = profile.business.monthlyIncome;
    const maxBenefit = scheme.benefits.amount.max;
    
    // Suitable if benefit is 1-10x monthly income
    const ratio = maxBenefit / monthlyIncome;
    if (ratio < 1) return 0.3;
    if (ratio > 10) return 0.7;
    return 0.8 + (ratio - 1) / 45; // Scale between 0.8 and 1.0
  }

  private calculateTimingAlignment(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    if (!scheme.application.deadline) return 1;
    
    const now = new Date();
    const deadline = scheme.application.deadline;
    const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDeadline < 0) return 0; // Past deadline
    if (daysUntilDeadline < 7) return 0.3; // Very urgent
    if (daysUntilDeadline < 30) return 0.7; // Urgent
    return 1; // Plenty of time
  }

  private calculateApplicationComplexity(scheme: GovernmentScheme): number {
    const docCount = scheme.application.requiredDocuments.length;
    const stepCount = scheme.application.applicationSteps.length;
    
    // Normalize complexity (lower is better)
    const complexity = (docCount / 20) + (stepCount / 10);
    return Math.max(0, 1 - complexity);
  }

  private calculateDocumentRequirementMatch(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const requiredDocs = scheme.application.requiredDocuments;
    const availableDocs = Object.keys(profile.documents);
    
    if (requiredDocs.length === 0) return 1;
    
    const matchCount = requiredDocs.filter(doc => availableDocs.includes(doc)).length;
    return matchCount / requiredDocs.length;
  }

  private calculateProcessingTimeAlignment(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    const maxProcessingTime = scheme.application.processingTime.max;
    const timeHorizon = profile.preferences.timeHorizon;
    
    // Align processing time with user's time horizon preference
    if (timeHorizon === 'short_term' && maxProcessingTime > 30) return 0.5;
    if (timeHorizon === 'medium_term' && maxProcessingTime > 90) return 0.7;
    if (timeHorizon === 'long_term') return 1;
    
    return 0.8;
  }

  private normalizeProcessingTime(days: number): number {
    return Math.max(0, 1 - days / 365); // Normalize to 1 year max
  }

  private calculateCategoryDistribution(categories: string[]): Record<string, number> {
    const distribution: Record<string, number> = {
      loan: 0, grant: 0, subsidy: 0, training: 0, insurance: 0
    };
    
    categories.forEach(cat => {
      if (distribution.hasOwnProperty(cat)) {
        distribution[cat]++;
      }
    });
    
    const total = categories.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = total > 0 ? distribution[key] / total : 0;
    });
    
    return distribution;
  }

  // Placeholder implementations for contextual features
  private getEconomicCyclePhase(): number { return 0.6; }
  private getPolicyEnvironmentScore(): number { return 0.7; }
  private getMarketSentiment(category: string): number { return 0.6; }
  private getCompetitionIntensity(state: string, category: string): number { return 0.5; }
  private getDigitalAdoptionTrend(): number { return 0.8; }
  private getTechnologyReadiness(state: string): number { return 0.6; }
}