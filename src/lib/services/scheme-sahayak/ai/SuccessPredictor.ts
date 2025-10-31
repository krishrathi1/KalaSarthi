/**
 * Success Predictor Component
 * ML model for predicting application success probability
 * Provides confidence intervals and improvement suggestions
 */

import { ArtisanProfile, GovernmentScheme, SuccessPrediction } from '../../../types/scheme-sahayak';
import { ExtractedFeatures } from './ProfileAnalyzer';
import { CompatibilityScore } from './SchemeMatcher';

/**
 * Historical application data for training
 */
interface HistoricalApplication {
  artisanId: string;
  schemeId: string;
  features: ExtractedFeatures;
  outcome: 'approved' | 'rejected' | 'pending';
  processingTime: number;
  timestamp: Date;
}

/**
 * Success factors analysis
 */
interface SuccessFactors {
  positive: Array<{ factor: string; impact: number }>;
  negative: Array<{ factor: string; impact: number }>;
  neutral: Array<{ factor: string; impact: number }>;
}

/**
 * Success Predictor using ML-based probability estimation
 */
export class SuccessPredictor {
  private historicalData: HistoricalApplication[];
  private modelWeights: Map<string, number>;
  private benchmarkData: Map<string, { successRate: number; count: number }>;

  constructor() {
    this.historicalData = [];
    this.modelWeights = this.initializeModelWeights();
    this.benchmarkData = new Map();
  }

  /**
   * Predict application success probability
   */
  async predictSuccess(
    artisanFeatures: ExtractedFeatures,
    scheme: GovernmentScheme,
    artisanProfile: ArtisanProfile,
    compatibilityScore: CompatibilityScore
  ): Promise<SuccessPrediction> {
    // Calculate base probability from features
    const baseProbability = this.calculateBaseProbability(artisanFeatures, scheme, compatibilityScore);
    
    // Adjust with historical data
    const adjustedProbability = this.adjustWithHistoricalData(
      baseProbability,
      artisanFeatures,
      scheme
    );
    
    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      adjustedProbability,
      artisanFeatures,
      scheme
    );
    
    // Analyze success factors
    const factors = this.analyzeSuccessFactors(artisanFeatures, scheme, compatibilityScore);
    
    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(
      factors,
      artisanFeatures,
      scheme
    );
    
    // Get benchmark comparison
    const benchmarkComparison = await this.getBenchmarkComparison(
      artisanProfile,
      scheme,
      adjustedProbability
    );

    return {
      probability: adjustedProbability,
      confidenceInterval,
      factors: {
        positive: factors.positive.map(f => f.factor),
        negative: factors.negative.map(f => f.factor),
        neutral: factors.neutral.map(f => f.factor)
      },
      improvementSuggestions,
      benchmarkComparison
    };
  }

  /**
   * Calculate base probability from features and compatibility
   */
  private calculateBaseProbability(
    features: ExtractedFeatures,
    scheme: GovernmentScheme,
    compatibility: CompatibilityScore
  ): number {
    let probability = 0;

    // Eligibility is the foundation (40% weight)
    probability += (compatibility.eligibility / 100) * 0.4;

    // Document readiness (15% weight)
    probability += features.documentReadiness * 0.15;

    // Application history (10% weight)
    probability += features.applicationHistory * 0.1;

    // Financial factors (10% weight)
    const financialScore = (
      features.creditworthiness * 0.4 +
      features.incomeStability * 0.3 +
      features.financialLiteracy * 0.3
    );
    probability += financialScore * 0.1;

    // Business maturity (10% weight)
    const businessScore = (
      features.businessAge * 0.3 +
      features.experienceYears * 0.3 +
      features.hasRegistration * 0.4
    );
    probability += businessScore * 0.1;

    // Digital and administrative capability (8% weight)
    const capabilityScore = (
      features.digitalLiteracy * 0.5 +
      features.governmentInteraction * 0.5
    );
    probability += capabilityScore * 0.08;

    // Behavioral factors (7% weight)
    const behavioralScore = (
      features.persistenceLevel * 0.4 +
      features.proactiveness * 0.3 +
      features.adaptabilityScore * 0.3
    );
    probability += behavioralScore * 0.07;

    // Scheme-specific factors
    // Success rate of the scheme itself
    probability += scheme.metadata.successRate * 0.05;

    // Feasibility score from compatibility
    probability += (compatibility.feasibility / 100) * 0.05;

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Adjust probability based on historical data
   */
  private adjustWithHistoricalData(
    baseProbability: number,
    features: ExtractedFeatures,
    scheme: GovernmentScheme
  ): number {
    // Find similar historical applications
    const similarApplications = this.findSimilarApplications(features, scheme);
    
    if (similarApplications.length === 0) {
      return baseProbability; // No adjustment if no historical data
    }

    // Calculate success rate from similar applications
    const successfulApps = similarApplications.filter(app => app.outcome === 'approved').length;
    const historicalSuccessRate = successfulApps / similarApplications.length;

    // Blend base probability with historical success rate
    // More weight to historical data if we have more samples
    const historicalWeight = Math.min(0.4, similarApplications.length / 50);
    const baseWeight = 1 - historicalWeight;

    const adjustedProbability = (
      baseProbability * baseWeight +
      historicalSuccessRate * historicalWeight
    );

    return Math.max(0, Math.min(1, adjustedProbability));
  }

  /**
   * Calculate confidence interval for the prediction
   */
  private calculateConfidenceInterval(
    probability: number,
    features: ExtractedFeatures,
    scheme: GovernmentScheme
  ): [number, number] {
    // Base confidence interval width
    let intervalWidth = 0.15; // ±15% by default

    // Reduce interval width with more data quality
    if (features.documentReadiness > 0.8) {
      intervalWidth *= 0.8;
    }

    // Reduce interval width with application history
    if (features.applicationHistory > 0.5) {
      intervalWidth *= 0.85;
    }

    // Increase interval width for complex schemes
    const docComplexity = scheme.application.requiredDocuments.length;
    if (docComplexity > 10) {
      intervalWidth *= 1.2;
    }

    // Increase interval width for low scheme success rate
    if (scheme.metadata.successRate < 0.4) {
      intervalWidth *= 1.3;
    }

    // Calculate bounds
    const lowerBound = Math.max(0, probability - intervalWidth / 2);
    const upperBound = Math.min(1, probability + intervalWidth / 2);

    return [
      Math.round(lowerBound * 100) / 100,
      Math.round(upperBound * 100) / 100
    ];
  }

  /**
   * Analyze factors contributing to success or failure
   */
  private analyzeSuccessFactors(
    features: ExtractedFeatures,
    scheme: GovernmentScheme,
    compatibility: CompatibilityScore
  ): SuccessFactors {
    const factors: SuccessFactors = {
      positive: [],
      negative: [],
      neutral: []
    };

    // Analyze eligibility
    if (compatibility.eligibility > 80) {
      factors.positive.push({ factor: 'Strong eligibility match', impact: 0.9 });
    } else if (compatibility.eligibility < 50) {
      factors.negative.push({ factor: 'Low eligibility match', impact: 0.8 });
    } else {
      factors.neutral.push({ factor: 'Moderate eligibility match', impact: 0.5 });
    }

    // Document readiness
    if (features.documentReadiness > 0.8) {
      factors.positive.push({ factor: 'Excellent document readiness', impact: 0.85 });
    } else if (features.documentReadiness < 0.4) {
      factors.negative.push({ factor: 'Insufficient documents', impact: 0.9 });
    } else {
      factors.neutral.push({ factor: 'Partial document readiness', impact: 0.5 });
    }

    // Application history
    if (features.applicationHistory > 0.7) {
      factors.positive.push({ factor: 'Strong application track record', impact: 0.8 });
    } else if (features.applicationHistory < 0.3 && features.governmentInteraction > 0) {
      factors.negative.push({ factor: 'Poor previous application outcomes', impact: 0.7 });
    }

    // Business registration
    if (features.hasRegistration === 1) {
      factors.positive.push({ factor: 'Registered business', impact: 0.75 });
    } else {
      factors.negative.push({ factor: 'Unregistered business', impact: 0.6 });
    }

    // Financial stability
    const financialScore = (features.creditworthiness + features.incomeStability) / 2;
    if (financialScore > 0.7) {
      factors.positive.push({ factor: 'Strong financial profile', impact: 0.8 });
    } else if (financialScore < 0.4) {
      factors.negative.push({ factor: 'Weak financial indicators', impact: 0.75 });
    }

    // Digital literacy (for online applications)
    if (scheme.application.onlineApplication) {
      if (features.digitalLiteracy > 0.7) {
        factors.positive.push({ factor: 'Good digital skills for online application', impact: 0.7 });
      } else if (features.digitalLiteracy < 0.4) {
        factors.negative.push({ factor: 'Low digital literacy for online process', impact: 0.8 });
      }
    }

    // Experience and business age
    if (features.experienceYears > 0.6 && features.businessAge > 0.4) {
      factors.positive.push({ factor: 'Established business with experience', impact: 0.75 });
    } else if (features.experienceYears < 0.2 && features.businessAge < 0.2) {
      factors.negative.push({ factor: 'New business with limited experience', impact: 0.65 });
    }

    // Behavioral factors
    if (features.persistenceLevel > 0.7 && features.proactiveness > 0.7) {
      factors.positive.push({ factor: 'Strong commitment and proactive approach', impact: 0.7 });
    }

    // Scheme success rate
    if (scheme.metadata.successRate > 0.7) {
      factors.positive.push({ factor: 'High scheme approval rate', impact: 0.6 });
    } else if (scheme.metadata.successRate < 0.3) {
      factors.negative.push({ factor: 'Low scheme approval rate', impact: 0.7 });
    }

    // Sort by impact
    factors.positive.sort((a, b) => b.impact - a.impact);
    factors.negative.sort((a, b) => b.impact - a.impact);

    return factors;
  }

  /**
   * Generate actionable improvement suggestions
   */
  private generateImprovementSuggestions(
    factors: SuccessFactors,
    features: ExtractedFeatures,
    scheme: GovernmentScheme
  ): string[] {
    const suggestions: string[] = [];

    // Address top negative factors
    for (const negativeFactor of factors.negative.slice(0, 3)) {
      if (negativeFactor.factor.includes('document')) {
        const missingDocs = scheme.application.requiredDocuments.length - 
                           Math.floor(features.documentReadiness * scheme.application.requiredDocuments.length);
        suggestions.push(
          `Complete ${missingDocs} missing documents to improve approval chances by 15-20%`
        );
      } else if (negativeFactor.factor.includes('eligibility')) {
        suggestions.push(
          'Review eligibility criteria carefully and ensure all requirements are met before applying'
        );
      } else if (negativeFactor.factor.includes('Unregistered')) {
        suggestions.push(
          'Register your business to significantly improve approval probability (20-30% increase)'
        );
      } else if (negativeFactor.factor.includes('financial')) {
        suggestions.push(
          'Improve financial documentation: maintain regular bank statements and income records for 6+ months'
        );
      } else if (negativeFactor.factor.includes('digital')) {
        suggestions.push(
          'Consider seeking assistance for online application or attend digital literacy training'
        );
      } else if (negativeFactor.factor.includes('experience')) {
        suggestions.push(
          'Highlight any relevant experience or training in your application to compensate for business age'
        );
      }
    }

    // General suggestions based on scheme type
    if (scheme.category === 'loan') {
      if (features.creditworthiness < 0.6) {
        suggestions.push(
          'Build credit history by maintaining timely payments and regular banking transactions'
        );
      }
    }

    if (scheme.application.onlineApplication && features.digitalLiteracy < 0.5) {
      suggestions.push(
        'Seek help from a digital literacy center or trusted advisor for online application submission'
      );
    }

    // Timing suggestions
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.floor(
        (scheme.application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline < 7 && features.documentReadiness < 0.8) {
        suggestions.push(
          'Deadline is approaching - prioritize completing essential documents first'
        );
      }
    }

    // Limit to top 5 most actionable suggestions
    return suggestions.slice(0, 5);
  }

  /**
   * Get benchmark comparison with similar artisans
   */
  private async getBenchmarkComparison(
    profile: ArtisanProfile,
    scheme: GovernmentScheme,
    probability: number
  ): Promise<SuccessPrediction['benchmarkComparison']> {
    // Create benchmark key based on business type and location
    const benchmarkKey = `${profile.business.type}_${profile.location.state}_${scheme.category}`;
    
    // Get or calculate benchmark data
    let benchmark = this.benchmarkData.get(benchmarkKey);
    
    if (!benchmark) {
      // In production, this would query Firestore for similar artisans
      // For now, use scheme's overall success rate as proxy
      benchmark = {
        successRate: scheme.metadata.successRate,
        count: 100 // Placeholder
      };
      this.benchmarkData.set(benchmarkKey, benchmark);
    }

    // Determine position relative to average
    let position: 'below_average' | 'average' | 'above_average';
    const diff = probability - benchmark.successRate;
    
    if (diff > 0.1) {
      position = 'above_average';
    } else if (diff < -0.1) {
      position = 'below_average';
    } else {
      position = 'average';
    }

    return {
      similarArtisans: benchmark.count,
      averageSuccessRate: Math.round(benchmark.successRate * 100) / 100,
      yourPosition: position
    };
  }

  /**
   * Find similar historical applications
   */
  private findSimilarApplications(
    features: ExtractedFeatures,
    scheme: GovernmentScheme
  ): HistoricalApplication[] {
    // Filter applications for the same scheme
    const schemeApplications = this.historicalData.filter(app => app.schemeId === scheme.id);
    
    if (schemeApplications.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const withSimilarity = schemeApplications.map(app => ({
      application: app,
      similarity: this.calculateFeatureSimilarity(features, app.features)
    }));

    // Sort by similarity and return top matches
    withSimilarity.sort((a, b) => b.similarity - a.similarity);
    
    // Return top 20 most similar applications
    return withSimilarity.slice(0, 20).map(item => item.application);
  }

  /**
   * Calculate similarity between two feature sets
   */
  private calculateFeatureSimilarity(features1: ExtractedFeatures, features2: ExtractedFeatures): number {
    // Key features for similarity comparison
    const keyFeatures: (keyof ExtractedFeatures)[] = [
      'monthlyIncomeNormalized',
      'businessAge',
      'experienceYears',
      'documentReadiness',
      'applicationHistory',
      'creditworthiness',
      'digitalLiteracy',
      'businessTypeEncoded',
      'locationTier'
    ];

    let totalDiff = 0;
    for (const key of keyFeatures) {
      const diff = Math.abs(features1[key] - features2[key]);
      totalDiff += diff;
    }

    // Convert to similarity score (0-1)
    const avgDiff = totalDiff / keyFeatures.length;
    return 1 - avgDiff;
  }

  /**
   * Add historical application data for model improvement
   */
  addHistoricalData(data: HistoricalApplication): void {
    this.historicalData.push(data);
    
    // Update benchmark data
    const benchmarkKey = `${data.features.businessTypeEncoded}_${data.features.locationTier}`;
    const existing = this.benchmarkData.get(benchmarkKey);
    
    if (existing) {
      const newCount = existing.count + 1;
      const newSuccessRate = data.outcome === 'approved' 
        ? (existing.successRate * existing.count + 1) / newCount
        : (existing.successRate * existing.count) / newCount;
      
      this.benchmarkData.set(benchmarkKey, {
        successRate: newSuccessRate,
        count: newCount
      });
    } else {
      this.benchmarkData.set(benchmarkKey, {
        successRate: data.outcome === 'approved' ? 1 : 0,
        count: 1
      });
    }
  }

  /**
   * Batch add historical data
   */
  batchAddHistoricalData(dataList: HistoricalApplication[]): void {
    for (const data of dataList) {
      this.addHistoricalData(data);
    }
  }

  /**
   * Initialize model weights for different features
   */
  private initializeModelWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    
    // High impact features
    weights.set('documentReadiness', 1.5);
    weights.set('applicationHistory', 1.4);
    weights.set('creditworthiness', 1.3);
    weights.set('eligibility', 1.6);
    
    // Medium impact features
    weights.set('businessAge', 1.2);
    weights.set('experienceYears', 1.2);
    weights.set('hasRegistration', 1.3);
    weights.set('digitalLiteracy', 1.1);
    weights.set('financialLiteracy', 1.1);
    
    // Lower impact features
    weights.set('persistenceLevel', 1.0);
    weights.set('proactiveness', 1.0);
    weights.set('governmentInteraction', 1.1);
    
    return weights;
  }

  /**
   * Clear historical data (useful for testing)
   */
  clearHistoricalData(): void {
    this.historicalData = [];
    this.benchmarkData.clear();
  }
}
