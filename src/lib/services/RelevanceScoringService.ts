/**
 * Relevance Scoring Service for Intelligent Profession Matching
 * 
 * This service provides sophisticated algorithms for calculating relevance scores
 * between buyer queries and artisan profiles using multiple factors and weights.
 */

import { IUser } from '../models/User';
import { EnhancedQueryAnalysis } from './IntelligentProfessionMatcher';

export interface ScoringWeights {
  profession: number;
  skills: number;
  materials: number;
  techniques: number;
  experience: number;
  location: number;
  performance: number;
  specialization: number;
  portfolio: number;
  availability: number;
}

export interface DetailedScore {
  totalScore: number;
  breakdown: {
    professionScore: number;
    skillScore: number;
    materialScore: number;
    techniqueScore: number;
    experienceScore: number;
    locationScore: number;
    performanceScore: number;
    specializationScore: number;
    portfolioScore: number;
    availabilityScore: number;
  };
  normalizedScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  scoringMethod: 'ai_enhanced' | 'rule_based' | 'hybrid';
}

export interface ContextualFactors {
  urgency: 'immediate' | 'planned' | 'exploring';
  budget: 'premium' | 'standard' | 'budget' | 'unspecified';
  complexity: 'simple' | 'moderate' | 'complex';
  customization: 'none' | 'minor' | 'major';
  timeframe: string;
  location?: string;
}

export class RelevanceScoringService {
  private static instance: RelevanceScoringService;
  
  // Default scoring weights - can be adjusted based on analytics
  private defaultWeights: ScoringWeights = {
    profession: 0.25,
    skills: 0.18,
    materials: 0.15,
    techniques: 0.12,
    experience: 0.10,
    location: 0.08,
    performance: 0.07,
    specialization: 0.03,
    portfolio: 0.02,
    availability: 0.00 // Will be enhanced later
  };

  private constructor() {}

  public static getInstance(): RelevanceScoringService {
    if (!RelevanceScoringService.instance) {
      RelevanceScoringService.instance = new RelevanceScoringService();
    }
    return RelevanceScoringService.instance;
  }

  /**
   * Calculate comprehensive relevance score with detailed breakdown
   */
  public calculateDetailedScore(
    artisan: IUser,
    analysis: EnhancedQueryAnalysis,
    contextualFactors?: ContextualFactors,
    customWeights?: Partial<ScoringWeights>
  ): DetailedScore {
    const weights = { ...this.defaultWeights, ...customWeights };
    
    // Adjust weights based on contextual factors
    const adjustedWeights = this.adjustWeightsForContext(weights, contextualFactors);

    const breakdown = {
      professionScore: this.calculateProfessionScore(artisan, analysis),
      skillScore: this.calculateSkillScore(artisan, analysis),
      materialScore: this.calculateMaterialScore(artisan, analysis),
      techniqueScore: this.calculateTechniqueScore(artisan, analysis),
      experienceScore: this.calculateExperienceScore(artisan, analysis, contextualFactors),
      locationScore: this.calculateLocationScore(artisan, contextualFactors?.location),
      performanceScore: this.calculatePerformanceScore(artisan, contextualFactors),
      specializationScore: this.calculateSpecializationScore(artisan, analysis),
      portfolioScore: this.calculatePortfolioScore(artisan, analysis),
      availabilityScore: this.calculateAvailabilityScore(artisan, contextualFactors)
    };

    const totalScore = 
      breakdown.professionScore * adjustedWeights.profession +
      breakdown.skillScore * adjustedWeights.skills +
      breakdown.materialScore * adjustedWeights.materials +
      breakdown.techniqueScore * adjustedWeights.techniques +
      breakdown.experienceScore * adjustedWeights.experience +
      breakdown.locationScore * adjustedWeights.location +
      breakdown.performanceScore * adjustedWeights.performance +
      breakdown.specializationScore * adjustedWeights.specialization +
      breakdown.portfolioScore * adjustedWeights.portfolio +
      breakdown.availabilityScore * adjustedWeights.availability;

    const normalizedScore = Math.min(1.0, Math.max(0.0, totalScore));
    const confidenceLevel = this.determineConfidenceLevel(normalizedScore, breakdown);
    const scoringMethod = this.determineScoringMethod(analysis);

    return {
      totalScore,
      breakdown,
      normalizedScore,
      confidenceLevel,
      scoringMethod
    };
  }

  /**
   * Calculate profession alignment score with enhanced logic
   */
  private calculateProfessionScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanProfession = artisan.artisticProfession?.toLowerCase() || '';
    const professionMapping = analysis.professionMapping;

    if (!professionMapping.professions.length) return 0;

    // Check primary profession match
    const primaryProfession = professionMapping.professions[0];
    if (artisanProfession.includes(primaryProfession.name.toLowerCase())) {
      return primaryProfession.confidence * 1.0;
    }

    // Check secondary profession matches
    for (let i = 1; i < Math.min(3, professionMapping.professions.length); i++) {
      const profession = professionMapping.professions[i];
      if (artisanProfession.includes(profession.name.toLowerCase())) {
        return profession.confidence * (0.8 - (i - 1) * 0.1); // Decreasing weight for secondary matches
      }
    }

    // Check fallback professions
    const fallbackMatch = professionMapping.fallbackProfessions.find(fp => 
      artisanProfession.includes(fp.toLowerCase())
    );
    
    return fallbackMatch ? 0.3 : 0;
  }

  /**
   * Calculate skill alignment score with fuzzy matching
   */
  private calculateSkillScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanSkills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const skillTags = artisan.artisanConnectProfile?.skillTags || [];
    const requirements = analysis.extractedRequirements;

    if (artisanSkills.length === 0 && skillTags.length === 0) return 0;

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Check direct skill matches
    const allSkills = [...artisanSkills, ...skillTags.map(st => st.skill)];
    
    // Score against products
    requirements.products.forEach(product => {
      maxPossibleScore += 1;
      const skillMatch = allSkills.find(skill => 
        this.fuzzyMatch(skill, product) || 
        this.isSkillRelevantToProduct(skill, product)
      );
      if (skillMatch) {
        const proficiency = skillTags.find(st => st.skill === skillMatch)?.proficiency || 0.7;
        totalScore += proficiency;
      }
    });

    // Score against techniques
    requirements.techniques.forEach(technique => {
      maxPossibleScore += 0.8;
      const skillMatch = allSkills.find(skill => this.fuzzyMatch(skill, technique));
      if (skillMatch) {
        const proficiency = skillTags.find(st => st.skill === skillMatch)?.proficiency || 0.7;
        totalScore += proficiency * 0.8;
      }
    });

    // Score against materials
    requirements.materials.forEach(material => {
      maxPossibleScore += 0.6;
      const skillMatch = allSkills.find(skill => 
        skill.toLowerCase().includes(material.toLowerCase()) ||
        this.isSkillRelevantToMaterial(skill, material)
      );
      if (skillMatch) {
        const proficiency = skillTags.find(st => st.skill === skillMatch)?.proficiency || 0.7;
        totalScore += proficiency * 0.6;
      }
    });

    return maxPossibleScore > 0 ? Math.min(1, totalScore / maxPossibleScore) : 0;
  }

  /**
   * Calculate material expertise score
   */
  private calculateMaterialScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanMaterials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    const queryMaterials = analysis.extractedRequirements.materials;

    if (queryMaterials.length === 0) return 0.5; // Neutral score if no materials specified
    if (artisanMaterials.length === 0) return 0.2; // Low score if artisan has no material data

    let matchScore = 0;
    let totalWeight = 0;

    queryMaterials.forEach((material, index) => {
      const weight = 1 / (index + 1); // Higher weight for earlier materials
      totalWeight += weight;

      const exactMatch = artisanMaterials.find(am => 
        am.toLowerCase() === material.toLowerCase()
      );
      
      if (exactMatch) {
        matchScore += weight * 1.0;
        return;
      }

      const partialMatch = artisanMaterials.find(am => 
        am.toLowerCase().includes(material.toLowerCase()) ||
        material.toLowerCase().includes(am.toLowerCase())
      );

      if (partialMatch) {
        matchScore += weight * 0.7;
        return;
      }

      // Check for related materials
      const relatedMatch = artisanMaterials.find(am => 
        this.areMaterialsRelated(am, material)
      );

      if (relatedMatch) {
        matchScore += weight * 0.4;
      }
    });

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Calculate technique proficiency score
   */
  private calculateTechniqueScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanTechniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    const queryTechniques = analysis.extractedRequirements.techniques;

    if (queryTechniques.length === 0) return 0.5; // Neutral score if no techniques specified
    if (artisanTechniques.length === 0) return 0.2; // Low score if artisan has no technique data

    let matchScore = 0;
    let totalWeight = 0;

    queryTechniques.forEach((technique, index) => {
      const weight = 1 / (index + 1);
      totalWeight += weight;

      const exactMatch = artisanTechniques.find(at => 
        at.toLowerCase() === technique.toLowerCase()
      );

      if (exactMatch) {
        matchScore += weight * 1.0;
        return;
      }

      const partialMatch = artisanTechniques.find(at => 
        at.toLowerCase().includes(technique.toLowerCase()) ||
        technique.toLowerCase().includes(at.toLowerCase())
      );

      if (partialMatch) {
        matchScore += weight * 0.8;
        return;
      }

      // Check for related techniques
      const relatedMatch = artisanTechniques.find(at => 
        this.areTechniquesRelated(at, technique)
      );

      if (relatedMatch) {
        matchScore += weight * 0.5;
      }
    });

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Calculate experience level score with context consideration
   */
  private calculateExperienceScore(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis,
    contextualFactors?: ContextualFactors
  ): number {
    const experienceLevel = artisan.artisanConnectProfile?.matchingData?.experienceLevel;
    const totalOrders = artisan.artisanConnectProfile?.performanceMetrics?.totalOrders || 0;
    
    let baseScore = 0.5;
    
    // Base experience level scoring
    switch (experienceLevel) {
      case 'master':
        baseScore = 1.0;
        break;
      case 'expert':
        baseScore = 0.85;
        break;
      case 'intermediate':
        baseScore = 0.65;
        break;
      case 'beginner':
        baseScore = 0.35;
        break;
      default:
        baseScore = 0.5;
    }

    // Adjust based on order history
    if (totalOrders > 100) baseScore = Math.min(1.0, baseScore + 0.1);
    else if (totalOrders > 50) baseScore = Math.min(1.0, baseScore + 0.05);
    else if (totalOrders < 5) baseScore = Math.max(0.1, baseScore - 0.2);

    // Adjust based on contextual factors
    if (contextualFactors) {
      // For complex projects, prefer experienced artisans
      if (contextualFactors.complexity === 'complex' && experienceLevel === 'beginner') {
        baseScore *= 0.5;
      }
      
      // For premium budget, prefer master/expert level
      if (contextualFactors.budget === 'premium' && ['master', 'expert'].includes(experienceLevel || '')) {
        baseScore = Math.min(1.0, baseScore + 0.1);
      }
      
      // For budget projects, don't penalize beginners as much
      if (contextualFactors.budget === 'budget' && experienceLevel === 'beginner') {
        baseScore = Math.min(1.0, baseScore + 0.15);
      }
    }

    return baseScore;
  }

  /**
   * Calculate location proximity score
   */
  private calculateLocationScore(artisan: IUser, queryLocation?: string): number {
    if (!queryLocation) return 0.5; // Neutral score if no location specified

    const artisanLocation = artisan.artisanConnectProfile?.locationData?.address;
    if (!artisanLocation) return 0.3; // Low score if no location data

    const queryLower = queryLocation.toLowerCase();
    
    // Exact city match
    if (artisanLocation.city?.toLowerCase() === queryLower) {
      return 1.0;
    }
    
    // City contains query or vice versa
    if (artisanLocation.city?.toLowerCase().includes(queryLower) ||
        queryLower.includes(artisanLocation.city?.toLowerCase() || '')) {
      return 0.9;
    }
    
    // State match
    if (artisanLocation.state?.toLowerCase() === queryLower ||
        artisanLocation.state?.toLowerCase().includes(queryLower)) {
      return 0.7;
    }
    
    // Country match
    if (artisanLocation.country?.toLowerCase() === queryLower) {
      return 0.5;
    }
    
    // Check service areas
    const serviceAreas = artisan.artisanConnectProfile?.locationData?.serviceAreas || [];
    const serviceAreaMatch = serviceAreas.some(area => 
      area.toLowerCase().includes(queryLower) || queryLower.includes(area.toLowerCase())
    );
    
    if (serviceAreaMatch) {
      return 0.8;
    }

    return 0.2; // Low score for no location match
  }

  /**
   * Calculate performance metrics score
   */
  private calculatePerformanceScore(artisan: IUser, contextualFactors?: ContextualFactors): number {
    const metrics = artisan.artisanConnectProfile?.performanceMetrics;
    if (!metrics) return 0.5;

    let score = 0;
    let weightSum = 0;

    // Customer satisfaction (40% weight)
    if (metrics.customerSatisfaction !== undefined) {
      score += (metrics.customerSatisfaction / 5) * 0.4;
      weightSum += 0.4;
    }

    // Completion rate (30% weight)
    if (metrics.completionRate !== undefined) {
      score += metrics.completionRate * 0.3;
      weightSum += 0.3;
    }

    // Response time (20% weight) - better score for faster response
    if (metrics.responseTime !== undefined) {
      const responseScore = Math.max(0, 1 - (metrics.responseTime / 48)); // 48 hours as baseline
      score += responseScore * 0.2;
      weightSum += 0.2;
    }

    // Repeat customer rate (10% weight)
    if (metrics.repeatCustomerRate !== undefined) {
      score += metrics.repeatCustomerRate * 0.1;
      weightSum += 0.1;
    }

    // Adjust based on contextual factors
    if (contextualFactors?.urgency === 'immediate' && metrics.responseTime) {
      // Heavily penalize slow response for urgent requests
      if (metrics.responseTime > 6) {
        score *= 0.5;
      }
    }

    return weightSum > 0 ? score / weightSum : 0.5;
  }

  /**
   * Calculate specialization alignment score
   */
  private calculateSpecializationScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const specializations = artisan.artisanConnectProfile?.specializations || [];
    const requirements = analysis.extractedRequirements;

    if (specializations.length === 0) return 0.3; // Low score if no specializations

    let matchScore = 0;
    let totalChecks = 0;

    // Check against products
    requirements.products.forEach(product => {
      totalChecks++;
      const match = specializations.find(spec => 
        this.fuzzyMatch(spec, product) || 
        spec.toLowerCase().includes(product.toLowerCase()) ||
        product.toLowerCase().includes(spec.toLowerCase())
      );
      if (match) matchScore += 1;
    });

    // Check against end use
    if (requirements.endUse) {
      totalChecks++;
      const match = specializations.find(spec => 
        this.fuzzyMatch(spec, requirements.endUse) ||
        spec.toLowerCase().includes(requirements.endUse.toLowerCase())
      );
      if (match) matchScore += 1;
    }

    // Check against contextual factors
    const contextualFactors = analysis.contextualFactors;
    if (contextualFactors.occasion) {
      totalChecks++;
      const match = specializations.find(spec => 
        spec.toLowerCase().includes(contextualFactors.occasion.toLowerCase())
      );
      if (match) matchScore += 1;
    }

    return totalChecks > 0 ? matchScore / totalChecks : 0.3;
  }

  /**
   * Calculate portfolio relevance score
   */
  private calculatePortfolioScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const portfolioKeywords = artisan.artisanConnectProfile?.matchingData?.portfolioKeywords || [];
    const categoryTags = artisan.artisanConnectProfile?.matchingData?.categoryTags || [];
    
    if (portfolioKeywords.length === 0 && categoryTags.length === 0) return 0.3;

    const allKeywords = [...portfolioKeywords, ...categoryTags];
    const requirements = analysis.extractedRequirements;
    
    let matchScore = 0;
    let totalChecks = 0;

    // Check against all requirement fields
    [...requirements.products, ...requirements.materials, ...requirements.techniques, ...requirements.styles]
      .forEach(term => {
        totalChecks++;
        const match = allKeywords.find(keyword => 
          this.fuzzyMatch(keyword, term) ||
          keyword.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(keyword.toLowerCase())
        );
        if (match) matchScore += 1;
      });

    return totalChecks > 0 ? Math.min(1, matchScore / totalChecks) : 0.3;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(artisan: IUser, contextualFactors?: ContextualFactors): number {
    const availabilityStatus = artisan.artisanConnectProfile?.availabilityStatus;
    
    let baseScore = 0.5;
    
    switch (availabilityStatus) {
      case 'available':
        baseScore = 1.0;
        break;
      case 'busy':
        baseScore = 0.6;
        break;
      case 'unavailable':
        baseScore = 0.1;
        break;
      default:
        baseScore = 0.5;
    }

    // Adjust based on urgency
    if (contextualFactors?.urgency === 'immediate' && availabilityStatus === 'busy') {
      baseScore *= 0.3;
    }

    return baseScore;
  }

  // Helper methods

  private adjustWeightsForContext(
    weights: ScoringWeights, 
    contextualFactors?: ContextualFactors
  ): ScoringWeights {
    const adjusted = { ...weights };

    if (!contextualFactors) return adjusted;

    // Adjust for urgency
    if (contextualFactors.urgency === 'immediate') {
      adjusted.availability *= 2;
      adjusted.performance *= 1.5;
      adjusted.location *= 1.3;
    }

    // Adjust for budget
    if (contextualFactors.budget === 'premium') {
      adjusted.experience *= 1.4;
      adjusted.performance *= 1.3;
      adjusted.portfolio *= 1.2;
    } else if (contextualFactors.budget === 'budget') {
      adjusted.location *= 1.3;
      adjusted.availability *= 1.2;
    }

    // Adjust for complexity
    if (contextualFactors.complexity === 'complex') {
      adjusted.experience *= 1.5;
      adjusted.skills *= 1.3;
      adjusted.techniques *= 1.2;
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(adjusted).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjusted).forEach(key => {
      adjusted[key as keyof ScoringWeights] /= totalWeight;
    });

    return adjusted;
  }

  private determineConfidenceLevel(score: number, breakdown: DetailedScore['breakdown']): 'high' | 'medium' | 'low' {
    if (score > 0.7 && breakdown.professionScore > 0.6) return 'high';
    if (score > 0.4 && breakdown.professionScore > 0.3) return 'medium';
    return 'low';
  }

  private determineScoringMethod(analysis: EnhancedQueryAnalysis): 'ai_enhanced' | 'rule_based' | 'hybrid' {
    if (analysis.confidence > 0.7) return 'ai_enhanced';
    if (analysis.confidence > 0.4) return 'hybrid';
    return 'rule_based';
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number = 0.7): boolean {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1.includes(s2) || s2.includes(s1)) return true;
    
    // Simple Levenshtein distance check
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private isSkillRelevantToProduct(skill: string, product: string): boolean {
    const skillLower = skill.toLowerCase();
    const productLower = product.toLowerCase();
    
    // Define skill-product relationships
    const relationships = {
      'carving': ['doors', 'furniture', 'decorative', 'wooden'],
      'weaving': ['sarees', 'fabric', 'textile', 'cloth'],
      'pottery': ['pots', 'vases', 'ceramic', 'clay'],
      'jewelry': ['earrings', 'necklace', 'ring', 'bracelet'],
      'metalwork': ['gates', 'railings', 'utensils', 'tools']
    };

    return Object.entries(relationships).some(([skillType, products]) => {
      return skillLower.includes(skillType) && products.some(p => productLower.includes(p));
    });
  }

  private isSkillRelevantToMaterial(skill: string, material: string): boolean {
    const skillLower = skill.toLowerCase();
    const materialLower = material.toLowerCase();
    
    const relationships = {
      'wood': ['carving', 'turning', 'joinery', 'carpentry'],
      'metal': ['forging', 'welding', 'casting', 'engraving'],
      'clay': ['throwing', 'glazing', 'firing', 'molding'],
      'fabric': ['weaving', 'dyeing', 'printing', 'stitching'],
      'leather': ['tooling', 'stamping', 'stitching', 'tanning']
    };

    return Object.entries(relationships).some(([mat, skills]) => {
      return materialLower.includes(mat) && skills.some(s => skillLower.includes(s));
    });
  }

  private areMaterialsRelated(material1: string, material2: string): boolean {
    const m1 = material1.toLowerCase();
    const m2 = material2.toLowerCase();
    
    const relatedGroups = [
      ['wood', 'timber', 'oak', 'pine', 'teak', 'bamboo'],
      ['metal', 'iron', 'steel', 'brass', 'bronze', 'aluminum'],
      ['fabric', 'cotton', 'silk', 'wool', 'linen', 'textile'],
      ['clay', 'ceramic', 'terracotta', 'porcelain', 'earthenware'],
      ['leather', 'hide', 'suede', 'skin']
    ];

    return relatedGroups.some(group => 
      group.some(item => m1.includes(item)) && group.some(item => m2.includes(item))
    );
  }

  private areTechniquesRelated(technique1: string, technique2: string): boolean {
    const t1 = technique1.toLowerCase();
    const t2 = technique2.toLowerCase();
    
    const relatedGroups = [
      ['carving', 'engraving', 'etching', 'sculpting'],
      ['weaving', 'knitting', 'crocheting', 'braiding'],
      ['forging', 'hammering', 'smithing', 'metalworking'],
      ['glazing', 'firing', 'kiln', 'ceramic'],
      ['stitching', 'sewing', 'embroidery', 'needlework']
    ];

    return relatedGroups.some(group => 
      group.some(item => t1.includes(item)) && group.some(item => t2.includes(item))
    );
  }
}