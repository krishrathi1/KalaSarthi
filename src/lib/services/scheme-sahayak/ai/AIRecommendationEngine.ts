/**
 * AI Recommendation Engine
 * Main orchestrator for ML-powered scheme recommendations
 * Integrates ProfileAnalyzer, SchemeMatcher, and SuccessPredictor
 */

import {
  ArtisanProfile,
  GovernmentScheme,
  AISchemeRecommendation,
  SuccessPrediction,
  RecommendationExplanation,
  UserFeedback,
  RecommendationOptions
} from '../../../types/scheme-sahayak';
import { ProfileAnalyzer, ExtractedFeatures } from './ProfileAnalyzer';
import { SchemeMatcher, CompatibilityScore } from './SchemeMatcher';
import { SuccessPredictor } from './SuccessPredictor';

/**
 * Recommendation context for caching and optimization
 */
interface RecommendationContext {
  artisanId: string;
  features: ExtractedFeatures;
  timestamp: Date;
  recommendations: AISchemeRecommendation[];
}

/**
 * AI Recommendation Engine - Main Service
 */
export class AIRecommendationEngine {
  private profileAnalyzer: ProfileAnalyzer;
  private schemeMatcher: SchemeMatcher;
  private successPredictor: SuccessPredictor;
  private recommendationCache: Map<string, RecommendationContext>;
  private cacheExpiryMinutes: number = 30;

  constructor() {
    this.profileAnalyzer = new ProfileAnalyzer();
    this.schemeMatcher = new SchemeMatcher();
    this.successPredictor = new SuccessPredictor();
    this.recommendationCache = new Map();
  }

  /**
   * Generate personalized scheme recommendations
   * Main entry point for the recommendation system
   */
  async generateRecommendations(
    artisanId: string,
    artisanProfile: ArtisanProfile,
    availableSchemes: GovernmentScheme[],
    options: RecommendationOptions = {}
  ): Promise<AISchemeRecommendation[]> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.getCachedRecommendations(artisanId);
    if (cached && !this.isCacheExpired(cached)) {
      return this.filterRecommendations(cached.recommendations, options);
    }

    // Step 1: Extract features from artisan profile
    const features = await this.profileAnalyzer.extractFeatures(artisanProfile);

    // Step 2: Filter schemes by basic eligibility and options
    let eligibleSchemes = this.filterSchemesByOptions(availableSchemes, options);
    eligibleSchemes = this.filterByBasicEligibility(eligibleSchemes, artisanProfile);

    // Step 3: Calculate compatibility scores for all eligible schemes
    const scoredSchemes = await Promise.all(
      eligibleSchemes.map(async (scheme) => {
        const compatibility = await this.schemeMatcher.calculateCompatibility(
          features,
          scheme,
          artisanProfile
        );

        return {
          scheme,
          compatibility
        };
      })
    );

    // Step 4: Filter by minimum compatibility threshold
    const minCompatibility = 40; // 40% minimum overall score
    const compatibleSchemes = scoredSchemes.filter(
      item => item.compatibility.overall >= minCompatibility
    );

    // Step 5: Generate detailed recommendations with success predictions
    const recommendations = await Promise.all(
      compatibleSchemes.map(async (item) => {
        const successPrediction = await this.successPredictor.predictSuccess(
          features,
          item.scheme,
          artisanProfile,
          item.compatibility
        );

        return this.buildRecommendation(
          item.scheme,
          item.compatibility,
          successPrediction,
          features,
          artisanProfile,
          options
        );
      })
    );

    // Step 6: Rank and sort recommendations
    const rankedRecommendations = this.rankRecommendations(recommendations, artisanProfile);

    // Step 7: Limit results
    const maxResults = options.maxResults || 10;
    const finalRecommendations = rankedRecommendations.slice(0, maxResults);

    // Cache the results
    this.cacheRecommendations(artisanId, features, finalRecommendations);

    // Log performance
    const processingTime = Date.now() - startTime;
    console.log(`Generated ${finalRecommendations.length} recommendations in ${processingTime}ms`);

    return finalRecommendations;
  }

  /**
   * Predict success probability for a specific scheme
   */
  async predictSuccess(
    artisanId: string,
    artisanProfile: ArtisanProfile,
    scheme: GovernmentScheme
  ): Promise<SuccessPrediction> {
    // Extract features
    const features = await this.profileAnalyzer.extractFeatures(artisanProfile);

    // Calculate compatibility
    const compatibility = await this.schemeMatcher.calculateCompatibility(
      features,
      scheme,
      artisanProfile
    );

    // Predict success
    return this.successPredictor.predictSuccess(
      features,
      scheme,
      artisanProfile,
      compatibility
    );
  }

  /**
   * Explain why a scheme was recommended
   */
  async explainRecommendation(
    recommendationId: string,
    artisanProfile: ArtisanProfile,
    scheme: GovernmentScheme
  ): Promise<RecommendationExplanation> {
    // Extract features
    const features = await this.profileAnalyzer.extractFeatures(artisanProfile);

    // Calculate compatibility
    const compatibility = await this.schemeMatcher.calculateCompatibility(
      features,
      scheme,
      artisanProfile
    );

    // Get success prediction
    const prediction = await this.successPredictor.predictSuccess(
      features,
      scheme,
      artisanProfile,
      compatibility
    );

    // Build explanation
    const primaryFactors: string[] = [];
    const secondaryFactors: string[] = [];

    // Primary factors (high impact)
    if (compatibility.eligibility > 80) {
      primaryFactors.push(`Strong eligibility match (${compatibility.eligibility}%)`);
    }
    if (prediction.probability > 0.7) {
      primaryFactors.push(`High success probability (${Math.round(prediction.probability * 100)}%)`);
    }
    if (compatibility.benefit > 70) {
      primaryFactors.push(`Excellent benefit potential for your business`);
    }

    // Secondary factors
    prediction.factors.positive.slice(0, 3).forEach(factor => {
      secondaryFactors.push(factor);
    });

    // Get feature importance
    const featureImportance = this.profileAnalyzer.calculateFeatureImportance(features);
    const topFeatures = Object.entries(featureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);

    return {
      recommendationId,
      primaryFactors,
      secondaryFactors,
      dataPoints: {
        eligibilityScore: compatibility.eligibility,
        benefitScore: compatibility.benefit,
        feasibilityScore: compatibility.feasibility,
        successProbability: prediction.probability,
        topFeatures
      },
      modelVersion: '1.0.0',
      confidence: (compatibility.overall / 100 + prediction.probability) / 2,
      alternatives: [] // Would be populated with similar schemes
    };
  }

  /**
   * Update model with user feedback
   */
  async updateModelFeedback(
    recommendationId: string,
    feedback: UserFeedback,
    artisanProfile: ArtisanProfile,
    scheme: GovernmentScheme
  ): Promise<void> {
    // Extract features for historical data
    const features = await this.profileAnalyzer.extractFeatures(artisanProfile);

    // Update collaborative filtering data
    let interaction: 'viewed' | 'applied' | 'approved' | 'rejected' = 'viewed';
    let outcome: 'success' | 'failure' | undefined;

    if (feedback.applied) {
      interaction = 'applied';
    }
    if (feedback.outcome === 'approved') {
      interaction = 'approved';
      outcome = 'success';
    } else if (feedback.outcome === 'rejected') {
      interaction = 'rejected';
      outcome = 'failure';
    }

    this.schemeMatcher.updateCollaborativeData({
      artisanId: artisanProfile.id,
      schemeId: scheme.id,
      interaction,
      timestamp: feedback.timestamp,
      outcome
    });

    // Update success predictor with historical data
    if (feedback.outcome) {
      this.successPredictor.addHistoricalData({
        artisanId: artisanProfile.id,
        schemeId: scheme.id,
        features,
        outcome: feedback.outcome,
        processingTime: 0, // Would be calculated from actual data
        timestamp: feedback.timestamp
      });
    }

    // Clear cache for this artisan to force fresh recommendations
    this.recommendationCache.delete(artisanProfile.id);
  }

  /**
   * Build a complete recommendation object
   */
  private buildRecommendation(
    scheme: GovernmentScheme,
    compatibility: CompatibilityScore,
    prediction: SuccessPrediction,
    features: ExtractedFeatures,
    profile: ArtisanProfile,
    options: RecommendationOptions
  ): AISchemeRecommendation {
    // Calculate AI score (weighted combination)
    const aiScore = this.calculateAIScore(compatibility, prediction);

    // Calculate urgency score
    const urgencyScore = this.calculateUrgencyScore(scheme, compatibility);

    // Generate personalized reason
    const personalizedReason = this.generatePersonalizedReason(
      scheme,
      compatibility,
      prediction,
      profile
    );

    // Generate action plan
    const actionPlan = this.generateActionPlan(scheme, features, prediction);

    // Identify risk factors
    const riskFactors = prediction.factors.negative.slice(0, 3);

    // Find alternative schemes (placeholder)
    const alternativeSchemes: string[] = [];

    return {
      id: `rec_${profile.id}_${scheme.id}_${Date.now()}`,
      scheme,
      aiScore,
      eligibilityMatch: compatibility.eligibility,
      benefitPotential: compatibility.benefit,
      urgencyScore,
      personalizedReason,
      actionPlan,
      riskFactors,
      alternativeSchemes,
      confidenceInterval: prediction.confidenceInterval,
      successProbability: prediction.probability,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate overall AI score
   */
  private calculateAIScore(
    compatibility: CompatibilityScore,
    prediction: SuccessPrediction
  ): number {
    // Weighted combination of compatibility and success probability
    const score = (
      compatibility.overall * 0.6 +
      prediction.probability * 100 * 0.4
    );

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate urgency score (0-10)
   */
  private calculateUrgencyScore(scheme: GovernmentScheme, compatibility: CompatibilityScore): number {
    let urgency = 5; // Base urgency

    // Deadline urgency
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.floor(
        (scheme.application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline < 7) {
        urgency += 3;
      } else if (daysUntilDeadline < 30) {
        urgency += 2;
      } else if (daysUntilDeadline < 90) {
        urgency += 1;
      }
    }

    // High compatibility increases urgency
    if (compatibility.overall > 80) {
      urgency += 2;
    } else if (compatibility.overall > 70) {
      urgency += 1;
    }

    // High benefit potential increases urgency
    if (compatibility.benefit > 80) {
      urgency += 1;
    }

    return Math.min(10, Math.max(0, urgency));
  }

  /**
   * Generate personalized reason for recommendation
   */
  private generatePersonalizedReason(
    scheme: GovernmentScheme,
    compatibility: CompatibilityScore,
    prediction: SuccessPrediction,
    profile: ArtisanProfile
  ): string {
    const reasons: string[] = [];

    // Eligibility match
    if (compatibility.eligibility > 80) {
      reasons.push('You meet all key eligibility criteria');
    }

    // Success probability
    if (prediction.probability > 0.7) {
      reasons.push(`High approval probability (${Math.round(prediction.probability * 100)}%)`);
    }

    // Benefit potential
    const benefitAmount = (scheme.benefits.amount.min + scheme.benefits.amount.max) / 2;
    const monthlyIncome = profile.business.monthlyIncome;
    const benefitRatio = benefitAmount / (monthlyIncome * 12);

    if (benefitRatio > 1) {
      reasons.push(`Significant financial benefit (${Math.round(benefitRatio * 100)}% of annual income)`);
    }

    // Business alignment
    if (scheme.eligibility.businessType.includes(profile.business.type)) {
      reasons.push(`Specifically designed for ${profile.business.type} businesses`);
    }

    // Top positive factors
    if (prediction.factors.positive.length > 0) {
      reasons.push(prediction.factors.positive[0]);
    }

    return reasons.slice(0, 3).join('. ') + '.';
  }

  /**
   * Generate action plan for applying to scheme
   */
  private generateActionPlan(
    scheme: GovernmentScheme,
    features: ExtractedFeatures,
    prediction: SuccessPrediction
  ): AISchemeRecommendation['actionPlan'] {
    const immediateActions: string[] = [];
    const documentPreparation: string[] = [];

    // Immediate actions based on urgency
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.floor(
        (scheme.application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      immediateActions.push(`Apply within ${daysUntilDeadline} days before deadline`);
    } else {
      immediateActions.push('Review scheme details and eligibility criteria');
    }

    // Document preparation
    if (features.documentReadiness < 0.8) {
      documentPreparation.push('Complete missing documents');
      
      const missingDocCount = Math.ceil(
        (1 - features.documentReadiness) * scheme.application.requiredDocuments.length
      );
      documentPreparation.push(`Prepare ${missingDocCount} additional documents`);
    }

    // Add top improvement suggestions
    prediction.improvementSuggestions.slice(0, 2).forEach(suggestion => {
      if (suggestion.includes('document')) {
        documentPreparation.push(suggestion);
      } else {
        immediateActions.push(suggestion);
      }
    });

    // Timeline estimate
    const processingTime = scheme.metadata.averageProcessingTime || 
                          (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;
    const preparationTime = features.documentReadiness > 0.8 ? 3 : 7;
    const totalTime = preparationTime + processingTime;

    const timelineEstimate = `${preparationTime} days preparation + ${processingTime} days processing = ${totalTime} days total`;

    return {
      immediateActions: immediateActions.slice(0, 3),
      documentPreparation: documentPreparation.slice(0, 3),
      timelineEstimate
    };
  }

  /**
   * Rank recommendations by priority
   */
  private rankRecommendations(
    recommendations: AISchemeRecommendation[],
    profile: ArtisanProfile
  ): AISchemeRecommendation[] {
    return recommendations.sort((a, b) => {
      // Primary: AI score
      if (Math.abs(a.aiScore - b.aiScore) > 5) {
        return b.aiScore - a.aiScore;
      }

      // Secondary: Urgency
      if (a.urgencyScore !== b.urgencyScore) {
        return b.urgencyScore - a.urgencyScore;
      }

      // Tertiary: Success probability
      return b.successProbability - a.successProbability;
    });
  }

  /**
   * Filter schemes by basic eligibility
   */
  private filterByBasicEligibility(
    schemes: GovernmentScheme[],
    profile: ArtisanProfile
  ): GovernmentScheme[] {
    return schemes.filter(scheme => {
      // Only active schemes
      if (scheme.status !== 'active') return false;

      // Location check (if specified)
      if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
        const stateMatch = scheme.eligibility.location.states.some(
          state => state.toLowerCase() === profile.location.state.toLowerCase()
        );
        if (!stateMatch) return false;
      }

      return true;
    });
  }

  /**
   * Filter schemes by recommendation options
   */
  private filterSchemesByOptions(
    schemes: GovernmentScheme[],
    options: RecommendationOptions
  ): GovernmentScheme[] {
    let filtered = schemes;

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(scheme =>
        options.categories!.includes(scheme.category)
      );
    }

    return filtered;
  }

  /**
   * Filter recommendations by options
   */
  private filterRecommendations(
    recommendations: AISchemeRecommendation[],
    options: RecommendationOptions
  ): AISchemeRecommendation[] {
    let filtered = recommendations;

    // Filter by urgency
    if (options.urgencyFilter) {
      const urgencyThresholds = {
        low: 3,
        medium: 6,
        high: 8
      };
      const threshold = urgencyThresholds[options.urgencyFilter];
      filtered = filtered.filter(rec => rec.urgencyScore >= threshold);
    }

    // Limit results
    if (options.maxResults) {
      filtered = filtered.slice(0, options.maxResults);
    }

    return filtered;
  }

  /**
   * Cache recommendations
   */
  private cacheRecommendations(
    artisanId: string,
    features: ExtractedFeatures,
    recommendations: AISchemeRecommendation[]
  ): void {
    this.recommendationCache.set(artisanId, {
      artisanId,
      features,
      timestamp: new Date(),
      recommendations
    });
  }

  /**
   * Get cached recommendations
   */
  private getCachedRecommendations(artisanId: string): RecommendationContext | undefined {
    return this.recommendationCache.get(artisanId);
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(context: RecommendationContext): boolean {
    const now = Date.now();
    const cacheTime = context.timestamp.getTime();
    const expiryMs = this.cacheExpiryMinutes * 60 * 1000;
    
    return (now - cacheTime) > expiryMs;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.recommendationCache.clear();
    this.schemeMatcher.clearCaches();
    this.successPredictor.clearHistoricalData();
  }
}
