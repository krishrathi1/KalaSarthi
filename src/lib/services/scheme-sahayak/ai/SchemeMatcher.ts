/**
 * Scheme Matcher Component
 * ML-powered scheme-artisan compatibility scoring using hybrid recommendation approach
 * Combines collaborative filtering and content-based filtering
 */

import { ArtisanProfile, GovernmentScheme, AISchemeRecommendation } from '../../../types/scheme-sahayak';
import { ExtractedFeatures } from './ProfileAnalyzer';

/**
 * Compatibility score breakdown
 */
export interface CompatibilityScore {
  overall: number; // 0-100
  eligibility: number; // 0-100
  benefit: number; // 0-100
  feasibility: number; // 0-100
  timing: number; // 0-100
  components: {
    contentBased: number;
    collaborative: number;
    contextual: number;
  };
}

/**
 * Matching result with detailed scoring
 */
export interface MatchingResult {
  schemeId: string;
  score: CompatibilityScore;
  reasons: string[];
  warnings: string[];
  confidence: number;
}

/**
 * Collaborative filtering data
 */
interface CollaborativeData {
  artisanId: string;
  schemeId: string;
  interaction: 'viewed' | 'applied' | 'approved' | 'rejected';
  timestamp: Date;
  outcome?: 'success' | 'failure';
}

/**
 * Scheme Matcher using hybrid recommendation algorithm
 */
export class SchemeMatcher {
  private collaborativeMatrix: Map<string, Map<string, number>>;
  private schemeFeatureCache: Map<string, number[]>;
  private similarityCache: Map<string, Map<string, number>>;

  constructor() {
    this.collaborativeMatrix = new Map();
    this.schemeFeatureCache = new Map();
    this.similarityCache = new Map();
  }

  /**
   * Calculate compatibility score between artisan and scheme
   * Uses hybrid approach: content-based + collaborative filtering
   */
  async calculateCompatibility(
    artisanFeatures: ExtractedFeatures,
    scheme: GovernmentScheme,
    artisanProfile: ArtisanProfile
  ): Promise<CompatibilityScore> {
    // Content-based filtering score
    const contentScore = this.calculateContentBasedScore(artisanFeatures, scheme, artisanProfile);
    
    // Collaborative filtering score
    const collaborativeScore = await this.calculateCollaborativeScore(artisanProfile.id, scheme.id);
    
    // Contextual factors score
    const contextualScore = this.calculateContextualScore(artisanProfile, scheme);
    
    // Combine scores with weights
    const weights = {
      content: 0.5,
      collaborative: 0.3,
      contextual: 0.2
    };
    
    const overall = (
      contentScore.overall * weights.content +
      collaborativeScore * weights.collaborative +
      contextualScore * weights.contextual
    );

    return {
      overall: Math.round(overall * 100) / 100,
      eligibility: contentScore.eligibility,
      benefit: contentScore.benefit,
      feasibility: contentScore.feasibility,
      timing: contextualScore,
      components: {
        contentBased: contentScore.overall,
        collaborative: collaborativeScore,
        contextual: contextualScore
      }
    };
  }

  /**
   * Content-based filtering: Match artisan features with scheme requirements
   */
  private calculateContentBasedScore(
    features: ExtractedFeatures,
    scheme: GovernmentScheme,
    profile: ArtisanProfile
  ): { overall: number; eligibility: number; benefit: number; feasibility: number } {
    // Eligibility matching
    const eligibilityScore = this.calculateEligibilityScore(profile, scheme);
    
    // Benefit potential
    const benefitScore = this.calculateBenefitScore(features, scheme, profile);
    
    // Feasibility assessment
    const feasibilityScore = this.calculateFeasibilityScore(features, scheme, profile);
    
    // Overall content score
    const overall = (eligibilityScore * 0.4 + benefitScore * 0.35 + feasibilityScore * 0.25);
    
    return {
      overall,
      eligibility: eligibilityScore,
      benefit: benefitScore,
      feasibility: feasibilityScore
    };
  }

  /**
   * Calculate eligibility score based on scheme criteria
   */
  private calculateEligibilityScore(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    let score = 1.0;
    let criteriaCount = 0;
    let metCriteria = 0;

    // Age eligibility
    if (scheme.eligibility.age.min !== undefined || scheme.eligibility.age.max !== undefined) {
      criteriaCount++;
      const age = this.calculateAge(profile.personalInfo.dateOfBirth);
      const minAge = scheme.eligibility.age.min || 0;
      const maxAge = scheme.eligibility.age.max || 100;
      
      if (age >= minAge && age <= maxAge) {
        metCriteria++;
      } else {
        score *= 0.5; // Partial penalty for age mismatch
      }
    }

    // Income eligibility
    if (scheme.eligibility.income.min !== undefined || scheme.eligibility.income.max !== undefined) {
      criteriaCount++;
      const income = profile.business.monthlyIncome;
      const minIncome = scheme.eligibility.income.min || 0;
      const maxIncome = scheme.eligibility.income.max || Infinity;
      
      if (income >= minIncome && income <= maxIncome) {
        metCriteria++;
      } else {
        score *= 0.3; // Higher penalty for income mismatch
      }
    }

    // Business type eligibility
    if (scheme.eligibility.businessType.length > 0) {
      criteriaCount++;
      const businessTypeMatch = scheme.eligibility.businessType.some(type => 
        type.toLowerCase() === profile.business.type.toLowerCase() ||
        type.toLowerCase() === profile.business.category.toLowerCase()
      );
      
      if (businessTypeMatch) {
        metCriteria++;
      } else {
        score *= 0.4;
      }
    }

    // Location eligibility
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      criteriaCount++;
      const stateMatch = scheme.eligibility.location.states.some(state =>
        state.toLowerCase() === profile.location.state.toLowerCase()
      );
      
      if (stateMatch) {
        metCriteria++;
      } else {
        score *= 0.2; // High penalty for location mismatch
      }
    }

    // District eligibility
    if (scheme.eligibility.location.districts && scheme.eligibility.location.districts.length > 0) {
      criteriaCount++;
      const districtMatch = scheme.eligibility.location.districts.some(district =>
        district.toLowerCase() === profile.location.district.toLowerCase()
      );
      
      if (districtMatch) {
        metCriteria++;
      } else {
        score *= 0.3;
      }
    }

    // If no criteria specified, assume eligible
    if (criteriaCount === 0) {
      return 0.8; // Default moderate eligibility
    }

    // Boost score if most criteria are met
    const criteriaRatio = metCriteria / criteriaCount;
    score *= criteriaRatio;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate benefit potential score
   */
  private calculateBenefitScore(
    features: ExtractedFeatures,
    scheme: GovernmentScheme,
    profile: ArtisanProfile
  ): number {
    let score = 0.5; // Base score

    // Benefit amount relative to income
    const benefitAmount = (scheme.benefits.amount.min + scheme.benefits.amount.max) / 2;
    const incomeRatio = benefitAmount / (profile.business.monthlyIncome * 12);
    
    // Higher score for schemes with significant benefit relative to income
    if (incomeRatio > 2) score += 0.3;
    else if (incomeRatio > 1) score += 0.2;
    else if (incomeRatio > 0.5) score += 0.1;

    // Benefit type alignment with business needs
    if (scheme.category === 'loan' && features.creditworthiness > 0.6) {
      score += 0.1;
    } else if (scheme.category === 'grant' && features.monthlyIncomeNormalized < 0.4) {
      score += 0.15;
    } else if (scheme.category === 'training' && features.learningOrientation > 0.6) {
      score += 0.1;
    } else if (scheme.category === 'insurance' && features.riskTolerance < 0.4) {
      score += 0.1;
    }

    // Growth potential alignment
    if (features.growthPotential > 0.7 && scheme.category === 'loan') {
      score += 0.1;
    }

    // Business stage alignment
    if (features.businessAge < 0.3 && scheme.subCategory.includes('startup')) {
      score += 0.15;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate feasibility score (likelihood of successful application)
   */
  private calculateFeasibilityScore(
    features: ExtractedFeatures,
    scheme: GovernmentScheme,
    profile: ArtisanProfile
  ): number {
    let score = 0.5; // Base score

    // Document readiness
    score += features.documentReadiness * 0.2;

    // Application history
    score += features.applicationHistory * 0.15;

    // Digital literacy (for online applications)
    if (scheme.application.onlineApplication) {
      score += features.digitalLiteracy * 0.15;
    } else {
      score += 0.1; // Bonus for offline applications
    }

    // Financial literacy
    score += features.financialLiteracy * 0.1;

    // Government interaction experience
    score += features.governmentInteraction * 0.1;

    // Persistence and proactiveness
    score += (features.persistenceLevel + features.proactiveness) * 0.075;

    // Registration status
    if (features.hasRegistration === 1) {
      score += 0.1;
    }

    // Scheme complexity vs artisan capability
    const requiredDocCount = scheme.application.requiredDocuments.length;
    const docComplexityPenalty = Math.max(0, (requiredDocCount - 5) * 0.02);
    score -= docComplexityPenalty;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Collaborative filtering: Learn from similar artisans' success
   */
  private async calculateCollaborativeScore(artisanId: string, schemeId: string): Promise<number> {
    // Check cache first
    const cached = this.similarityCache.get(artisanId)?.get(schemeId);
    if (cached !== undefined) {
      return cached;
    }

    // Get similar artisans who applied to this scheme
    const similarArtisans = await this.findSimilarArtisans(artisanId);
    
    if (similarArtisans.length === 0) {
      return 0.5; // Neutral score if no collaborative data
    }

    // Calculate weighted score based on similar artisans' outcomes
    let totalWeight = 0;
    let weightedScore = 0;

    for (const similar of similarArtisans) {
      const interaction = this.collaborativeMatrix.get(similar.artisanId)?.get(schemeId);
      
      if (interaction !== undefined) {
        const weight = similar.similarity;
        totalWeight += weight;
        weightedScore += interaction * weight;
      }
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    
    // Cache the result
    if (!this.similarityCache.has(artisanId)) {
      this.similarityCache.set(artisanId, new Map());
    }
    this.similarityCache.get(artisanId)!.set(schemeId, score);

    return score;
  }

  /**
   * Calculate contextual score based on timing and urgency
   */
  private calculateContextualScore(profile: ArtisanProfile, scheme: GovernmentScheme): number {
    let score = 0.5; // Base score

    // Deadline urgency
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.floor(
        (scheme.application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline < 7) {
        score += 0.3; // High urgency
      } else if (daysUntilDeadline < 30) {
        score += 0.2; // Medium urgency
      } else if (daysUntilDeadline < 90) {
        score += 0.1; // Low urgency
      }
    } else {
      score += 0.15; // No deadline is good
    }

    // Scheme popularity (trending schemes)
    if (scheme.metadata.popularity > 0.8) {
      score += 0.1;
    } else if (scheme.metadata.popularity > 0.6) {
      score += 0.05;
    }

    // Success rate
    if (scheme.metadata.successRate > 0.7) {
      score += 0.15;
    } else if (scheme.metadata.successRate > 0.5) {
      score += 0.1;
    } else if (scheme.metadata.successRate < 0.3) {
      score -= 0.1; // Penalty for low success rate
    }

    // Processing time alignment with time horizon
    const avgProcessingDays = scheme.metadata.averageProcessingTime;
    const timeHorizonDays = profile.preferences.timeHorizon === 'short_term' ? 30 :
                           profile.preferences.timeHorizon === 'medium_term' ? 90 : 180;
    
    if (avgProcessingDays <= timeHorizonDays) {
      score += 0.1;
    } else {
      score -= 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Find similar artisans based on profile features
   */
  private async findSimilarArtisans(artisanId: string): Promise<Array<{ artisanId: string; similarity: number }>> {
    // In production, this would query Firestore for similar artisans
    // using vector similarity search or k-nearest neighbors
    
    // Placeholder: Return empty array for now
    // This will be populated with actual collaborative filtering data
    return [];
  }

  /**
   * Update collaborative filtering matrix with new interaction data
   */
  updateCollaborativeData(data: CollaborativeData): void {
    if (!this.collaborativeMatrix.has(data.artisanId)) {
      this.collaborativeMatrix.set(data.artisanId, new Map());
    }

    // Convert interaction to score
    let score = 0.5; // Default neutral
    
    switch (data.interaction) {
      case 'viewed':
        score = 0.6;
        break;
      case 'applied':
        score = 0.8;
        break;
      case 'approved':
        score = 1.0;
        break;
      case 'rejected':
        score = 0.3;
        break;
    }

    // Adjust based on outcome
    if (data.outcome === 'success') {
      score = Math.min(1.0, score + 0.2);
    } else if (data.outcome === 'failure') {
      score = Math.max(0, score - 0.3);
    }

    this.collaborativeMatrix.get(data.artisanId)!.set(data.schemeId, score);
    
    // Clear similarity cache for this artisan
    this.similarityCache.delete(data.artisanId);
  }

  /**
   * Batch update collaborative matrix
   */
  batchUpdateCollaborativeData(dataList: CollaborativeData[]): void {
    for (const data of dataList) {
      this.updateCollaborativeData(data);
    }
  }

  /**
   * Calculate cosine similarity between two feature vectors
   */
  private calculateCosineSimilarity(features1: number[], features2: number[]): number {
    if (features1.length !== features2.length) {
      throw new Error('Feature vectors must have same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      norm1 += features1[i] * features1[i];
      norm2 += features2[i] * features2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      return age - 1;
    }
    
    return age;
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  clearCaches(): void {
    this.schemeFeatureCache.clear();
    this.similarityCache.clear();
  }
}
