/**
 * Intelligent Matching Orchestrator
 * 
 * This service orchestrates all the intelligent matching components to provide
 * a unified interface for AI-powered artisan matching with comprehensive explanations.
 */

import { IntelligentProfessionMatcher, MatchOptions, MatchResult, EnhancedArtisanMatch } from './IntelligentProfessionMatcher';
import { MatchExplanationService, UserFriendlyExplanation } from './MatchExplanationService';
import { RelevanceScoringService, ContextualFactors } from './RelevanceScoringService';
import { GoogleGenerativeAIService } from './GoogleGenerativeAIService';
import { ProfessionMappingService } from './ProfessionMappingService';
import { IUser } from '../models/User';

export interface EnhancedMatchResult extends MatchResult {
  enhancedMatches: EnhancedArtisanMatchWithExplanation[];
  systemHealth: {
    aiServiceHealthy: boolean;
    fallbackUsed: boolean;
    processingTime: number;
    cacheHit: boolean;
  };
  analytics: {
    queryComplexity: 'simple' | 'moderate' | 'complex';
    professionConfidence: number;
    totalArtisansEvaluated: number;
    averageRelevanceScore: number;
  };
}

export interface EnhancedArtisanMatchWithExplanation extends EnhancedArtisanMatch {
  userFriendlyExplanation: UserFriendlyExplanation;
  detailedScore: any; // Will be populated with DetailedScore
}

export interface MatchingConfiguration {
  enableAI: boolean;
  enableFallback: boolean;
  cacheResults: boolean;
  maxResults: number;
  minScore: number;
  enableExplanations: boolean;
  enableAnalytics: boolean;
}

export class IntelligentMatchingOrchestrator {
  private static instance: IntelligentMatchingOrchestrator;
  private professionMatcher: IntelligentProfessionMatcher;
  private explanationService: MatchExplanationService;
  private scoringService: RelevanceScoringService;
  private aiService: GoogleGenerativeAIService;
  private mappingService: ProfessionMappingService;
  
  private defaultConfig: MatchingConfiguration = {
    enableAI: true,
    enableFallback: true,
    cacheResults: true,
    maxResults: 20,
    minScore: 0.2,
    enableExplanations: true,
    enableAnalytics: true
  };

  private constructor() {
    this.professionMatcher = IntelligentProfessionMatcher.getInstance();
    this.explanationService = MatchExplanationService.getInstance();
    this.scoringService = RelevanceScoringService.getInstance();
    this.aiService = GoogleGenerativeAIService.getInstance();
    this.mappingService = ProfessionMappingService.getInstance();
  }

  public static getInstance(): IntelligentMatchingOrchestrator {
    if (!IntelligentMatchingOrchestrator.instance) {
      IntelligentMatchingOrchestrator.instance = new IntelligentMatchingOrchestrator();
    }
    return IntelligentMatchingOrchestrator.instance;
  }

  /**
   * Main method for intelligent artisan matching with comprehensive results
   */
  public async findMatchingArtisans(
    query: string,
    artisans: IUser[],
    options: MatchOptions = {},
    config: Partial<MatchingConfiguration> = {}
  ): Promise<EnhancedMatchResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Check AI service health
      const healthCheck = await this.aiService.healthCheck();
      const aiServiceHealthy = healthCheck.isHealthy;
      
      // Perform the matching
      const matchOptions: MatchOptions = {
        maxResults: finalConfig.maxResults,
        minScore: finalConfig.minScore,
        includeFallback: finalConfig.enableFallback,
        ...options
      };

      const matchResult = await this.professionMatcher.matchArtisans(
        query, 
        artisans, 
        matchOptions
      );

      // Generate enhanced explanations if enabled
      let enhancedMatches: EnhancedArtisanMatchWithExplanation[] = [];
      
      if (finalConfig.enableExplanations) {
        enhancedMatches = await this.generateEnhancedExplanations(
          matchResult.matches,
          matchResult.queryAnalysis
        );
      } else {
        enhancedMatches = matchResult.matches.map(match => ({
          ...match,
          userFriendlyExplanation: this.createBasicExplanation(match),
          detailedScore: null
        }));
      }

      // Generate analytics if enabled
      const analytics = finalConfig.enableAnalytics ? 
        this.generateAnalytics(matchResult, artisans) : 
        this.getDefaultAnalytics();

      const processingTime = Date.now() - startTime;

      return {
        ...matchResult,
        enhancedMatches,
        systemHealth: {
          aiServiceHealthy,
          fallbackUsed: matchResult.fallbackUsed,
          processingTime,
          cacheHit: false // TODO: Implement cache hit detection
        },
        analytics
      };

    } catch (error) {
      console.error('Error in intelligent matching orchestrator:', error);
      
      // Return fallback result
      return this.generateFallbackResult(query, artisans, options, startTime);
    }
  }

  /**
   * Quick match method for simple use cases
   */
  public async quickMatch(
    query: string,
    artisans: IUser[],
    maxResults: number = 10
  ): Promise<EnhancedArtisanMatch[]> {
    const result = await this.findMatchingArtisans(
      query,
      artisans,
      { maxResults },
      { enableExplanations: false, enableAnalytics: false }
    );

    return result.matches;
  }

  /**
   * Get detailed analysis of a query without performing matching
   */
  public async analyzeQuery(query: string) {
    try {
      const analysis = await this.professionMatcher.analyzeQueryEnhanced(query);
      return {
        success: true,
        analysis,
        processingTime: analysis.processingTime
      };
    } catch (error) {
      console.error('Error analyzing query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: null,
        processingTime: 0
      };
    }
  }

  /**
   * Get system health and configuration status
   */
  public async getSystemStatus() {
    try {
      const [aiHealth, aiConfig] = await Promise.all([
        this.aiService.healthCheck(),
        Promise.resolve(this.aiService.getConfiguration())
      ]);

      return {
        aiService: {
          healthy: aiHealth.isHealthy,
          responseTime: aiHealth.responseTime,
          error: aiHealth.error,
          configuration: aiConfig
        },
        professionMapping: {
          availableProfessions: this.mappingService.getAllProfessions(),
          totalMappings: this.mappingService.getAllProfessions().length
        },
        orchestrator: {
          defaultConfiguration: this.defaultConfig,
          cacheSize: 0 // TODO: Implement cache size tracking
        }
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        healthy: false
      };
    }
  }

  /**
   * Update default configuration
   */
  public updateConfiguration(newConfig: Partial<MatchingConfiguration>): void {
    this.defaultConfig = { ...this.defaultConfig, ...newConfig };
  }

  // Private helper methods

  private async generateEnhancedExplanations(
    matches: EnhancedArtisanMatch[],
    queryAnalysis: any
  ): Promise<EnhancedArtisanMatchWithExplanation[]> {
    const enhancedMatches: EnhancedArtisanMatchWithExplanation[] = [];

    for (const match of matches) {
      try {
        // Generate detailed score
        const contextualFactors: ContextualFactors = {
          urgency: queryAnalysis.detectedIntent?.urgency || 'exploring',
          budget: queryAnalysis.detectedIntent?.budget || 'unspecified',
          complexity: 'moderate', // TODO: Extract from query analysis
          customization: 'minor', // TODO: Extract from query analysis
          timeframe: 'flexible' // TODO: Extract from query analysis
        };

        const detailedScore = this.scoringService.calculateDetailedScore(
          match.artisan,
          queryAnalysis,
          contextualFactors
        );

        // Generate user-friendly explanation
        const userFriendlyExplanation = this.explanationService.generateUserFriendlyExplanation(
          match.artisan,
          queryAnalysis,
          detailedScore,
          match.explanation
        );

        enhancedMatches.push({
          ...match,
          userFriendlyExplanation,
          detailedScore
        });

      } catch (error) {
        console.error('Error generating explanation for artisan:', match.artisan.uid, error);
        
        // Add match with basic explanation
        enhancedMatches.push({
          ...match,
          userFriendlyExplanation: this.createBasicExplanation(match),
          detailedScore: null
        });
      }
    }

    return enhancedMatches;
  }

  private createBasicExplanation(match: EnhancedArtisanMatch): UserFriendlyExplanation {
    return {
      summary: `${match.artisan.name} is a ${match.artisan.artisticProfession} with a ${Math.round(match.relevanceScore * 100)}% match score.`,
      keyStrengths: [match.explanation.primaryReason],
      matchHighlights: {
        profession: match.professionMatch ? match.artisan.artisticProfession : null,
        skills: match.explanation.matchedSkills,
        materials: match.explanation.matchedMaterials,
        techniques: match.explanation.matchedTechniques,
        experience: null,
        location: null,
        performance: null
      },
      confidenceIndicator: {
        level: match.explanation.confidenceLevel,
        percentage: Math.round(match.relevanceScore * 100),
        description: `This is a ${match.explanation.confidenceLevel} confidence match based on available information.`
      },
      whyThisArtisan: match.explanation.primaryReason,
      potentialConcerns: [],
      nextSteps: [
        'View their profile and portfolio',
        'Send a message about your project',
        'Request a quote or consultation'
      ]
    };
  }

  private generateAnalytics(matchResult: MatchResult, allArtisans: IUser[]) {
    const matches = matchResult.matches;
    const queryAnalysis = matchResult.queryAnalysis;

    const averageScore = matches.length > 0 ? 
      matches.reduce((sum, match) => sum + match.relevanceScore, 0) / matches.length : 0;

    let queryComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    const requirements = queryAnalysis.extractedRequirements;
    const totalRequirements = 
      requirements.products.length + 
      requirements.materials.length + 
      requirements.techniques.length + 
      requirements.styles.length;

    if (totalRequirements > 6) queryComplexity = 'complex';
    else if (totalRequirements > 3) queryComplexity = 'moderate';

    return {
      queryComplexity,
      professionConfidence: queryAnalysis.confidence,
      totalArtisansEvaluated: allArtisans.length,
      averageRelevanceScore: averageScore
    };
  }

  private getDefaultAnalytics() {
    return {
      queryComplexity: 'simple' as const,
      professionConfidence: 0,
      totalArtisansEvaluated: 0,
      averageRelevanceScore: 0
    };
  }

  private async generateFallbackResult(
    query: string,
    artisans: IUser[],
    options: MatchOptions,
    startTime: number
  ): Promise<EnhancedMatchResult> {
    // Simple keyword-based fallback matching
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/);

    const fallbackMatches = artisans
      .map(artisan => {
        let score = 0;
        const explanation = {
          primaryReason: 'Basic keyword matching (system fallback)',
          detailedReasons: [],
          matchedSkills: [],
          matchedMaterials: [],
          matchedTechniques: [],
          confidenceLevel: 'low' as const,
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

        keywords.forEach(keyword => {
          if (artisan.artisticProfession?.toLowerCase().includes(keyword)) {
            score += 0.3;
            explanation.detailedReasons.push(`Profession matches "${keyword}"`);
          }
          if (artisan.name.toLowerCase().includes(keyword)) {
            score += 0.1;
          }
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
          rank: 0,
          userFriendlyExplanation: this.createBasicExplanation({
            artisan,
            relevanceScore: score,
            professionMatch: score > 0.2,
            materialMatch: false,
            techniqueMatch: false,
            specializationMatch: false,
            locationMatch: true,
            explanation,
            rank: 0
          }),
          detailedScore: null
        };
      })
      .filter(match => match.relevanceScore >= (options.minScore || 0.1))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 20)
      .map((match, index) => ({ ...match, rank: index + 1 }));

    const processingTime = Date.now() - startTime;

    return {
      matches: fallbackMatches,
      enhancedMatches: fallbackMatches,
      totalFound: fallbackMatches.length,
      queryAnalysis: {
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
          reasoning: 'Fallback matching used due to system error'
        },
        confidence: 0.2,
        timestamp: new Date(),
        processingTime: 0
      },
      processingTime,
      confidence: 0.2,
      fallbackUsed: true,
      systemHealth: {
        aiServiceHealthy: false,
        fallbackUsed: true,
        processingTime,
        cacheHit: false
      },
      analytics: {
        queryComplexity: 'simple',
        professionConfidence: 0.2,
        totalArtisansEvaluated: artisans.length,
        averageRelevanceScore: fallbackMatches.length > 0 ? 
          fallbackMatches.reduce((sum, match) => sum + match.relevanceScore, 0) / fallbackMatches.length : 0
      }
    };
  }
}