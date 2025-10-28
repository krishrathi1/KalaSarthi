/**
 * Intelligent Profession Matcher Service
 * 
 * This service provides AI-powered artisan matching using Google Generative AI
 * for query analysis and sophisticated relevance scoring algorithms.
 */

import { GoogleGenerativeAIService, QueryAnalysis, RequirementExtraction } from './GoogleGenerativeAIService';
import { ProfessionMappingService, ProfessionMapping } from './ProfessionMappingService';
import { RelevanceScoringService, DetailedScore, ContextualFactors } from './RelevanceScoringService';
import { IUser } from '../models/User';

export interface MatchOptions {
  maxResults?: number;
  minScore?: number;
  includeFallback?: boolean;
  location?: string;
  priceRange?: { min: number; max: number };
  experienceLevel?: string[];
}

export interface EnhancedQueryAnalysis {
  originalQuery: string;
  processedQuery: string;
  detectedIntent: {
    action: 'buy' | 'commission' | 'browse';
    urgency: 'immediate' | 'planned' | 'exploring';
    budget: 'premium' | 'standard' | 'budget' | 'unspecified';
  };
  extractedRequirements: RequirementExtraction;
  contextualFactors: {
    endUse: string;
    setting: string;
    occasion: string;
    targetAudience: string;
  };
  professionMapping: ProfessionMapping;
  confidence: number;
  timestamp: Date;
  processingTime: number;
}

export interface EnhancedArtisanMatch {
  artisan: IUser;
  relevanceScore: number;
  professionMatch: boolean;
  materialMatch: boolean;
  techniqueMatch: boolean;
  specializationMatch: boolean;
  locationMatch: boolean;
  explanation: MatchExplanation;
  rank: number;
}

export interface MatchExplanation {
  primaryReason: string;
  detailedReasons: string[];
  matchedSkills: string[];
  matchedMaterials: string[];
  matchedTechniques: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  scoreBreakdown: {
    professionScore: number;
    skillScore: number;
    materialScore: number;
    techniqueScore: number;
    experienceScore: number;
    locationScore: number;
    performanceScore: number;
  };
}

export interface MatchResult {
  matches: EnhancedArtisanMatch[];
  totalFound: number;
  queryAnalysis: EnhancedQueryAnalysis;
  processingTime: number;
  confidence: number;
  fallbackUsed: boolean;
}

export class IntelligentProfessionMatcher {
  private static instance: IntelligentProfessionMatcher;
  private aiService: GoogleGenerativeAIService;
  private mappingService: ProfessionMappingService;
  private scoringService: RelevanceScoringService;
  private queryCache: Map<string, EnhancedQueryAnalysis>;
  private cacheExpiry: number = 3600000; // 1 hour in milliseconds

  private constructor() {
    this.aiService = GoogleGenerativeAIService.getInstance();
    this.mappingService = ProfessionMappingService.getInstance();
    this.scoringService = RelevanceScoringService.getInstance();
    this.queryCache = new Map();
  }

  public static getInstance(): IntelligentProfessionMatcher {
    if (!IntelligentProfessionMatcher.instance) {
      IntelligentProfessionMatcher.instance = new IntelligentProfessionMatcher();
    }
    return IntelligentProfessionMatcher.instance;
  }

  /**
   * Main method to match artisans based on buyer query
   */
  public async matchArtisans(
    query: string, 
    artisans: IUser[], 
    options: MatchOptions = {}
  ): Promise<MatchResult> {
    const startTime = Date.now();
    let fallbackUsed = false;

    try {
      // Analyze the query
      const queryAnalysis = await this.analyzeQueryEnhanced(query);
      
      // Filter artisans by profession first
      const relevantArtisans = this.filterArtisansByProfession(artisans, queryAnalysis);
      
      // Calculate relevance scores for each artisan using enhanced scoring
      const contextualFactors: ContextualFactors = {
        urgency: queryAnalysis.detectedIntent.urgency,
        budget: queryAnalysis.detectedIntent.budget,
        complexity: this.determineComplexity(queryAnalysis),
        customization: this.determineCustomization(queryAnalysis),
        timeframe: this.extractTimeframe(queryAnalysis),
        location: options.location
      };

      const scoredMatches = relevantArtisans.map(artisan => {
        const detailedScore = this.scoringService.calculateDetailedScore(
          artisan, 
          queryAnalysis, 
          contextualFactors
        );
        
        const explanation = this.explainMatchEnhanced(artisan, queryAnalysis, detailedScore);
        
        return {
          artisan,
          relevanceScore: detailedScore.normalizedScore,
          professionMatch: detailedScore.breakdown.professionScore > 0.3,
          materialMatch: detailedScore.breakdown.materialScore > 0.3,
          techniqueMatch: detailedScore.breakdown.techniqueScore > 0.3,
          specializationMatch: detailedScore.breakdown.specializationScore > 0.3,
          locationMatch: detailedScore.breakdown.locationScore > 0.5,
          explanation,
          rank: 0 // Will be set after sorting
        };
      });

      // Filter by minimum score
      const minScore = options.minScore || 0.2;
      const filteredMatches = scoredMatches.filter(match => match.relevanceScore >= minScore);

      // Sort by relevance score
      const sortedMatches = filteredMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Add rank and limit results
      const maxResults = options.maxResults || 20;
      const finalMatches = sortedMatches.slice(0, maxResults).map((match, index) => ({
        ...match,
        rank: index + 1
      }));

      const processingTime = Date.now() - startTime;

      return {
        matches: finalMatches,
        totalFound: filteredMatches.length,
        queryAnalysis,
        processingTime,
        confidence: queryAnalysis.confidence,
        fallbackUsed
      };

    } catch (error) {
      console.error('Error in intelligent matching, falling back to basic matching:', error);
      fallbackUsed = true;
      
      // Fallback to basic keyword matching
      const fallbackResult = await this.fallbackMatching(query, artisans, options);
      const processingTime = Date.now() - startTime;
      
      return {
        ...fallbackResult,
        processingTime,
        fallbackUsed
      };
    }
  }

  /**
   * Enhanced query analysis with preprocessing and validation
   */
  public async analyzeQueryEnhanced(query: string): Promise<EnhancedQueryAnalysis> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = this.queryCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Preprocess query
    const processedQuery = this.preprocessQuery(query);
    
    try {
      // Get AI analysis
      const [basicAnalysis, requirements] = await Promise.all([
        this.aiService.analyzeQuery(processedQuery),
        this.aiService.extractRequirements(processedQuery)
      ]);

      // Get profession mapping
      const professionMapping = this.mappingService.mapRequirementsToProfessions(requirements);

      // Detect intent and context
      const detectedIntent = this.detectIntent(query, basicAnalysis);
      const contextualFactors = this.extractContextualFactors(query, requirements);

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(basicAnalysis, professionMapping);

      const enhancedAnalysis: EnhancedQueryAnalysis = {
        originalQuery: query,
        processedQuery,
        detectedIntent,
        extractedRequirements: requirements,
        contextualFactors,
        professionMapping,
        confidence,
        timestamp: new Date(),
        processingTime
      };

      // Cache the result
      this.queryCache.set(cacheKey, enhancedAnalysis);
      
      return enhancedAnalysis;

    } catch (error) {
      console.error('Error in enhanced query analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive relevance score for an artisan
   */
  public calculateRelevanceScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const weights = {
      profession: 0.25,
      skills: 0.20,
      materials: 0.15,
      techniques: 0.15,
      experience: 0.10,
      location: 0.08,
      performance: 0.07
    };

    const scores = {
      professionScore: this.calculateProfessionScore(artisan, analysis),
      skillScore: this.calculateSkillScore(artisan, analysis),
      materialScore: this.calculateMaterialScore(artisan, analysis),
      techniqueScore: this.calculateTechniqueScore(artisan, analysis),
      experienceScore: this.calculateExperienceScore(artisan, analysis),
      locationScore: this.calculateLocationScore(artisan, analysis),
      performanceScore: this.calculatePerformanceScore(artisan)
    };

    const weightedScore = 
      scores.professionScore * weights.profession +
      scores.skillScore * weights.skills +
      scores.materialScore * weights.materials +
      scores.techniqueScore * weights.techniques +
      scores.experienceScore * weights.experience +
      scores.locationScore * weights.location +
      scores.performanceScore * weights.performance;

    return Math.min(1.0, Math.max(0.0, weightedScore));
  }

  /**
   * Generate enhanced explanation using detailed scoring breakdown
   */
  public explainMatchEnhanced(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis, 
    detailedScore: DetailedScore
  ): MatchExplanation {
    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const matchedMaterials: string[] = [];
    const matchedTechniques: string[] = [];

    // Analyze score breakdown to generate explanations
    const breakdown = detailedScore.breakdown;

    if (breakdown.professionScore > 0.5) {
      reasons.push(`Strong profession match: ${artisan.artisticProfession}`);
    } else if (breakdown.professionScore > 0.3) {
      reasons.push(`Good profession alignment with ${artisan.artisticProfession}`);
    }

    if (breakdown.skillScore > 0.6) {
      const skills = artisan.artisanConnectProfile?.matchingData?.skills || [];
      const relevantSkills = skills.filter(skill => 
        this.isSkillRelevantToQuery(skill, analysis)
      ).slice(0, 3);
      matchedSkills.push(...relevantSkills);
      if (relevantSkills.length > 0) {
        reasons.push(`Excellent skill match: ${relevantSkills.join(', ')}`);
      }
    }

    if (breakdown.materialScore > 0.5) {
      const materials = artisan.artisanConnectProfile?.matchingData?.materials || [];
      const queryMaterials = analysis.extractedRequirements.materials;
      queryMaterials.forEach(qm => {
        const match = materials.find(m => 
          m.toLowerCase().includes(qm.toLowerCase()) ||
          qm.toLowerCase().includes(m.toLowerCase())
        );
        if (match && !matchedMaterials.includes(match)) {
          matchedMaterials.push(match);
        }
      });
      if (matchedMaterials.length > 0) {
        reasons.push(`Material expertise: ${matchedMaterials.join(', ')}`);
      }
    }

    if (breakdown.techniqueScore > 0.5) {
      const techniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
      const queryTechniques = analysis.extractedRequirements.techniques;
      queryTechniques.forEach(qt => {
        const match = techniques.find(t => 
          t.toLowerCase().includes(qt.toLowerCase()) ||
          qt.toLowerCase().includes(t.toLowerCase())
        );
        if (match && !matchedTechniques.includes(match)) {
          matchedTechniques.push(match);
        }
      });
      if (matchedTechniques.length > 0) {
        reasons.push(`Technique proficiency: ${matchedTechniques.join(', ')}`);
      }
    }

    if (breakdown.experienceScore > 0.7) {
      const level = artisan.artisanConnectProfile?.matchingData?.experienceLevel;
      reasons.push(`High experience level: ${level}`);
    }

    if (breakdown.performanceScore > 0.7) {
      const metrics = artisan.artisanConnectProfile?.performanceMetrics;
      if (metrics?.customerSatisfaction && metrics.customerSatisfaction > 4) {
        reasons.push(`Excellent customer satisfaction: ${metrics.customerSatisfaction}/5`);
      }
    }

    if (breakdown.locationScore > 0.8) {
      reasons.push('Excellent location match for your area');
    }

    // Determine primary reason
    let primaryReason = 'General match based on profession';
    const topScores = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);

    if (topScores[0][1] > 0.6) {
      switch (topScores[0][0]) {
        case 'professionScore':
          primaryReason = `Perfect profession match: ${artisan.artisticProfession}`;
          break;
        case 'skillScore':
          primaryReason = `Outstanding skill alignment`;
          break;
        case 'materialScore':
          primaryReason = `Expert in required materials`;
          break;
        case 'techniqueScore':
          primaryReason = `Specialized in needed techniques`;
          break;
        case 'performanceScore':
          primaryReason = `Proven track record of excellence`;
          break;
        default:
          primaryReason = reasons[0] || primaryReason;
      }
    }

    return {
      primaryReason,
      detailedReasons: reasons.slice(0, 5),
      matchedSkills,
      matchedMaterials,
      matchedTechniques,
      confidenceLevel: detailedScore.confidenceLevel,
      scoreBreakdown: breakdown
    };
  }

  /**
   * Legacy explanation method for backward compatibility
   */
  public explainMatch(
    artisan: IUser, 
    analysis: EnhancedQueryAnalysis, 
    relevanceScore: number
  ): MatchExplanation {
    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const matchedMaterials: string[] = [];
    const matchedTechniques: string[] = [];

    // Check profession match
    if (this.checkProfessionMatch(artisan, analysis)) {
      reasons.push(`Specializes in ${artisan.artisticProfession} which matches your needs`);
    }

    // Check skill matches
    const artisanSkills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const queryRequirements = analysis.extractedRequirements;
    
    artisanSkills.forEach(skill => {
      if (this.isSkillRelevant(skill, queryRequirements)) {
        matchedSkills.push(skill);
        reasons.push(`Has expertise in ${skill}`);
      }
    });

    // Check material matches
    const artisanMaterials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    queryRequirements.materials.forEach(material => {
      const matchingMaterial = artisanMaterials.find(am => 
        am.toLowerCase().includes(material.toLowerCase()) ||
        material.toLowerCase().includes(am.toLowerCase())
      );
      if (matchingMaterial) {
        matchedMaterials.push(matchingMaterial);
        reasons.push(`Works with ${matchingMaterial}`);
      }
    });

    // Check technique matches
    const artisanTechniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    queryRequirements.techniques.forEach(technique => {
      const matchingTechnique = artisanTechniques.find(at => 
        at.toLowerCase().includes(technique.toLowerCase()) ||
        technique.toLowerCase().includes(at.toLowerCase())
      );
      if (matchingTechnique) {
        matchedTechniques.push(matchingTechnique);
        reasons.push(`Skilled in ${matchingTechnique} technique`);
      }
    });

    // Determine confidence level
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    if (relevanceScore > 0.7) confidenceLevel = 'high';
    else if (relevanceScore > 0.4) confidenceLevel = 'medium';

    // Primary reason
    let primaryReason = 'General match based on profession';
    if (matchedSkills.length > 0) {
      primaryReason = `Strong skill match: ${matchedSkills[0]}`;
    } else if (matchedMaterials.length > 0) {
      primaryReason = `Material expertise: ${matchedMaterials[0]}`;
    } else if (matchedTechniques.length > 0) {
      primaryReason = `Technique match: ${matchedTechniques[0]}`;
    }

    return {
      primaryReason,
      detailedReasons: reasons.slice(0, 5), // Limit to top 5 reasons
      matchedSkills,
      matchedMaterials,
      matchedTechniques,
      confidenceLevel,
      scoreBreakdown: {
        professionScore: this.calculateProfessionScore(artisan, analysis),
        skillScore: this.calculateSkillScore(artisan, analysis),
        materialScore: this.calculateMaterialScore(artisan, analysis),
        techniqueScore: this.calculateTechniqueScore(artisan, analysis),
        experienceScore: this.calculateExperienceScore(artisan, analysis),
        locationScore: this.calculateLocationScore(artisan, analysis),
        performanceScore: this.calculatePerformanceScore(artisan)
      }
    };
  }

  // Private helper methods

  private determineComplexity(analysis: EnhancedQueryAnalysis): 'simple' | 'moderate' | 'complex' {
    const requirements = analysis.extractedRequirements;
    const totalRequirements = 
      requirements.products.length + 
      requirements.materials.length + 
      requirements.techniques.length + 
      requirements.styles.length;

    const hasSpecifications = Object.keys(requirements.specifications).length > 0;
    const hasMultipleProfessions = analysis.professionMapping.professions.length > 1;

    if (totalRequirements > 6 || hasSpecifications || hasMultipleProfessions) {
      return 'complex';
    } else if (totalRequirements > 3) {
      return 'moderate';
    }
    return 'simple';
  }

  private determineCustomization(analysis: EnhancedQueryAnalysis): 'none' | 'minor' | 'major' {
    const query = analysis.originalQuery.toLowerCase();
    const intent = analysis.detectedIntent.action;

    if (intent === 'commission' || 
        query.includes('custom') || 
        query.includes('personalized') ||
        query.includes('bespoke')) {
      return 'major';
    }

    if (query.includes('modify') || 
        query.includes('adjust') ||
        Object.keys(analysis.extractedRequirements.specifications).length > 2) {
      return 'minor';
    }

    return 'none';
  }

  private extractTimeframe(analysis: EnhancedQueryAnalysis): string {
    const query = analysis.originalQuery.toLowerCase();
    
    if (query.includes('urgent') || query.includes('asap') || query.includes('immediately')) {
      return 'immediate';
    }
    if (query.includes('week')) return '1-2 weeks';
    if (query.includes('month')) return '1 month';
    if (query.includes('quarter')) return '3 months';
    
    return 'flexible';
  }

  private isSkillRelevantToQuery(skill: string, analysis: EnhancedQueryAnalysis): boolean {
    const skillLower = skill.toLowerCase();
    const requirements = analysis.extractedRequirements;
    
    return requirements.products.some(product => 
      skillLower.includes(product.toLowerCase()) ||
      product.toLowerCase().includes(skillLower)
    ) ||
    requirements.materials.some(material => 
      skillLower.includes(material.toLowerCase()) ||
      material.toLowerCase().includes(skillLower)
    ) ||
    requirements.techniques.some(technique => 
      skillLower.includes(technique.toLowerCase()) ||
      technique.toLowerCase().includes(skillLower)
    );
  }

  private preprocessQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private generateCacheKey(query: string): string {
    return `query_analysis_${Buffer.from(query).toString('base64')}`;
  }

  private isCacheValid(cached: EnhancedQueryAnalysis): boolean {
    return Date.now() - cached.timestamp.getTime() < this.cacheExpiry;
  }

  private detectIntent(query: string, analysis: QueryAnalysis): EnhancedQueryAnalysis['detectedIntent'] {
    const queryLower = query.toLowerCase();
    
    let action: 'buy' | 'commission' | 'browse' = 'browse';
    if (queryLower.includes('buy') || queryLower.includes('purchase') || queryLower.includes('need')) {
      action = 'buy';
    } else if (queryLower.includes('custom') || queryLower.includes('commission') || queryLower.includes('make')) {
      action = 'commission';
    }

    let urgency: 'immediate' | 'planned' | 'exploring' = 'exploring';
    if (queryLower.includes('urgent') || queryLower.includes('asap') || queryLower.includes('immediately')) {
      urgency = 'immediate';
    } else if (queryLower.includes('planning') || queryLower.includes('future') || queryLower.includes('next month')) {
      urgency = 'planned';
    }

    let budget: 'premium' | 'standard' | 'budget' | 'unspecified' = 'unspecified';
    if (queryLower.includes('premium') || queryLower.includes('luxury') || queryLower.includes('high-end')) {
      budget = 'premium';
    } else if (queryLower.includes('budget') || queryLower.includes('affordable') || queryLower.includes('cheap')) {
      budget = 'budget';
    } else if (queryLower.includes('quality') || queryLower.includes('good')) {
      budget = 'standard';
    }

    return { action, urgency, budget };
  }

  private extractContextualFactors(
    query: string, 
    requirements: RequirementExtraction
  ): EnhancedQueryAnalysis['contextualFactors'] {
    const queryLower = query.toLowerCase();
    
    return {
      endUse: requirements.endUse || '',
      setting: this.extractSetting(queryLower),
      occasion: this.extractOccasion(queryLower),
      targetAudience: this.extractTargetAudience(queryLower)
    };
  }

  private extractSetting(query: string): string {
    const settings = ['home', 'office', 'hotel', 'restaurant', 'shop', 'gallery', 'museum'];
    return settings.find(setting => query.includes(setting)) || '';
  }

  private extractOccasion(query: string): string {
    const occasions = ['wedding', 'festival', 'ceremony', 'celebration', 'gift', 'anniversary'];
    return occasions.find(occasion => query.includes(occasion)) || '';
  }

  private extractTargetAudience(query: string): string {
    const audiences = ['children', 'adults', 'elderly', 'tourists', 'locals', 'professionals'];
    return audiences.find(audience => query.includes(audience)) || '';
  }

  private calculateOverallConfidence(
    analysis: QueryAnalysis, 
    mapping: ProfessionMapping
  ): number {
    const aiConfidence = analysis.confidence;
    const mappingConfidence = mapping.professions[0]?.confidence || 0;
    
    // Weighted average with slight preference for AI analysis
    return (aiConfidence * 0.6 + mappingConfidence * 0.4);
  }

  private filterArtisansByProfession(artisans: IUser[], analysis: EnhancedQueryAnalysis): IUser[] {
    const targetProfessions = [
      analysis.professionMapping.professions[0]?.name,
      ...analysis.professionMapping.professions.slice(1, 3).map(p => p.name),
      ...analysis.professionMapping.fallbackProfessions
    ].filter(Boolean);

    return artisans.filter(artisan => {
      const artisanProfession = artisan.artisticProfession?.toLowerCase();
      return targetProfessions.some(profession => 
        artisanProfession?.includes(profession?.toLowerCase()) ||
        profession?.toLowerCase().includes(artisanProfession)
      );
    });
  }

  // Scoring methods
  private calculateProfessionScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const primaryProfession = analysis.professionMapping.professions[0]?.name;
    if (!primaryProfession) return 0;

    const artisanProfession = artisan.artisticProfession?.toLowerCase();
    if (artisanProfession?.includes(primaryProfession.toLowerCase())) {
      return analysis.professionMapping.professions[0].confidence;
    }

    // Check secondary professions
    const secondaryMatch = analysis.professionMapping.professions.slice(1).find(p => 
      artisanProfession?.includes(p.name.toLowerCase())
    );
    
    return secondaryMatch ? secondaryMatch.confidence * 0.7 : 0;
  }

  private calculateSkillScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanSkills = artisan.artisanConnectProfile?.matchingData?.skills || [];
    const requirements = analysis.extractedRequirements;
    
    if (artisanSkills.length === 0) return 0;

    let matchCount = 0;
    let totalRelevance = 0;

    artisanSkills.forEach(skill => {
      if (this.isSkillRelevant(skill, requirements)) {
        matchCount++;
        totalRelevance += 1;
      }
    });

    return matchCount > 0 ? Math.min(1, totalRelevance / Math.max(artisanSkills.length, 1)) : 0;
  }

  private calculateMaterialScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanMaterials = artisan.artisanConnectProfile?.matchingData?.materials || [];
    const queryMaterials = analysis.extractedRequirements.materials;
    
    if (queryMaterials.length === 0 || artisanMaterials.length === 0) return 0;

    let matchCount = 0;
    queryMaterials.forEach(material => {
      const hasMatch = artisanMaterials.some(am => 
        am.toLowerCase().includes(material.toLowerCase()) ||
        material.toLowerCase().includes(am.toLowerCase())
      );
      if (hasMatch) matchCount++;
    });

    return matchCount / queryMaterials.length;
  }

  private calculateTechniqueScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const artisanTechniques = artisan.artisanConnectProfile?.matchingData?.techniques || [];
    const queryTechniques = analysis.extractedRequirements.techniques;
    
    if (queryTechniques.length === 0 || artisanTechniques.length === 0) return 0;

    let matchCount = 0;
    queryTechniques.forEach(technique => {
      const hasMatch = artisanTechniques.some(at => 
        at.toLowerCase().includes(technique.toLowerCase()) ||
        technique.toLowerCase().includes(at.toLowerCase())
      );
      if (hasMatch) matchCount++;
    });

    return matchCount / queryTechniques.length;
  }

  private calculateExperienceScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    const experienceLevel = artisan.artisanConnectProfile?.matchingData?.experienceLevel;
    const experienceScores = {
      'master': 1.0,
      'expert': 0.8,
      'intermediate': 0.6,
      'beginner': 0.3
    };

    return experienceScores[experienceLevel as keyof typeof experienceScores] || 0.5;
  }

  private calculateLocationScore(artisan: IUser, analysis: EnhancedQueryAnalysis): number {
    // For now, return neutral score. Can be enhanced with actual location matching
    return 0.5;
  }

  private calculatePerformanceScore(artisan: IUser): number {
    const metrics = artisan.artisanConnectProfile?.performanceMetrics;
    if (!metrics) return 0.5;

    const satisfactionScore = (metrics.customerSatisfaction || 0) / 5; // Normalize to 0-1
    const completionScore = metrics.completionRate || 0;
    const responseScore = Math.max(0, 1 - (metrics.responseTime || 24) / 48); // Better score for faster response

    return (satisfactionScore * 0.4 + completionScore * 0.4 + responseScore * 0.2);
  }

  // Check methods
  private checkProfessionMatch(artisan: IUser, analysis: EnhancedQueryAnalysis): boolean {
    return this.calculateProfessionScore(artisan, analysis) > 0.3;
  }

  private checkMaterialMatch(artisan: IUser, analysis: EnhancedQueryAnalysis): boolean {
    return this.calculateMaterialScore(artisan, analysis) > 0;
  }

  private checkTechniqueMatch(artisan: IUser, analysis: EnhancedQueryAnalysis): boolean {
    return this.calculateTechniqueScore(artisan, analysis) > 0;
  }

  private checkSpecializationMatch(artisan: IUser, analysis: EnhancedQueryAnalysis): boolean {
    const specializations = artisan.artisanConnectProfile?.specializations || [];
    const requirements = analysis.extractedRequirements;
    
    return specializations.some(spec => 
      requirements.products.some(product => 
        spec.toLowerCase().includes(product.toLowerCase()) ||
        product.toLowerCase().includes(spec.toLowerCase())
      )
    );
  }

  private checkLocationMatch(artisan: IUser, location?: string): boolean {
    if (!location) return true; // No location filter
    
    const artisanLocation = artisan.artisanConnectProfile?.locationData?.address;
    if (!artisanLocation) return false;

    const locationLower = location.toLowerCase();
    return artisanLocation.city?.toLowerCase().includes(locationLower) ||
           artisanLocation.state?.toLowerCase().includes(locationLower) ||
           artisanLocation.country?.toLowerCase().includes(locationLower);
  }

  private isSkillRelevant(skill: string, requirements: RequirementExtraction): boolean {
    const skillLower = skill.toLowerCase();
    
    return requirements.products.some(product => skillLower.includes(product.toLowerCase())) ||
           requirements.materials.some(material => skillLower.includes(material.toLowerCase())) ||
           requirements.techniques.some(technique => skillLower.includes(technique.toLowerCase()));
  }

  // Fallback matching for when AI services fail
  private async fallbackMatching(
    query: string, 
    artisans: IUser[], 
    options: MatchOptions
  ): Promise<Omit<MatchResult, 'processingTime' | 'fallbackUsed'>> {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/);

    const matches = artisans.map(artisan => {
      let score = 0;
      const explanation: MatchExplanation = {
        primaryReason: 'Keyword-based matching (fallback)',
        detailedReasons: [],
        matchedSkills: [],
        matchedMaterials: [],
        matchedTechniques: [],
        confidenceLevel: 'low',
        scoreBreakdown: {
          professionScore: 0,
          skillScore: 0,
          materialScore: 0,
          techniqueScore: 0,
          experienceScore: 0,
          locationScore: 0,
          performanceScore: 0
        }
      };

      // Basic keyword matching
      keywords.forEach(keyword => {
        if (artisan.artisticProfession?.toLowerCase().includes(keyword)) {
          score += 0.3;
          explanation.detailedReasons.push(`Profession matches "${keyword}"`);
        }
        
        const skills = artisan.artisanConnectProfile?.matchingData?.skills || [];
        skills.forEach(skill => {
          if (skill.toLowerCase().includes(keyword)) {
            score += 0.2;
            explanation.matchedSkills.push(skill);
          }
        });
      });

      return {
        artisan,
        relevanceScore: Math.min(1, score),
        professionMatch: score > 0.2,
        materialMatch: false,
        techniqueMatch: false,
        specializationMatch: false,
        locationMatch: true,
        explanation,
        rank: 0
      };
    });

    const filteredMatches = matches
      .filter(match => match.relevanceScore >= (options.minScore || 0.1))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 20)
      .map((match, index) => ({ ...match, rank: index + 1 }));

    // Create fallback query analysis
    const fallbackAnalysis: EnhancedQueryAnalysis = {
      originalQuery: query,
      processedQuery: queryLower,
      detectedIntent: {
        action: 'browse',
        urgency: 'exploring',
        budget: 'unspecified'
      },
      extractedRequirements: {
        products: [],
        materials: [],
        techniques: [],
        styles: [],
        endUse: '',
        specifications: {}
      },
      contextualFactors: {
        endUse: '',
        setting: '',
        occasion: '',
        targetAudience: ''
      },
      professionMapping: {
        professions: [],
        fallbackProfessions: [],
        reasoning: 'Fallback matching used due to AI service unavailability'
      },
      confidence: 0.3,
      timestamp: new Date(),
      processingTime: 0
    };

    return {
      matches: filteredMatches,
      totalFound: filteredMatches.length,
      queryAnalysis: fallbackAnalysis,
      confidence: 0.3
    };
  }
}