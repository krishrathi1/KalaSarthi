import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { agentMemoryManager } from '../core/agent-memory';
import { aiMonitoringService } from '../core/monitoring';
import { vectorStore } from '../core/vector-store';

// Confidence scoring input schema
const ConfidenceScoringInput = z.object({
  buyerRequirements: z.object({
    extractedRequirements: z.any(),
    categories: z.array(z.string()),
    aiAnalysis: z.any(),
    suggestedFilters: z.any()
  }),
  artisanProfile: z.object({
    id: z.string(),
    name: z.string(),
    artisticProfession: z.string(),
    specializations: z.array(z.string()).optional(),
    skillTags: z.array(z.any()).optional(),
    aiMetrics: z.any().optional(),
    availabilityStatus: z.string().optional(),
    responseTimeAverage: z.number().optional(),
    portfolioHighlights: z.array(z.string()).optional()
  }),
  contextData: z.object({
    userId: z.string(),
    sessionId: z.string(),
    userProfile: z.any().optional(),
    marketConditions: z.any().optional(),
    seasonalFactors: z.any().optional()
  })
});

// Confidence scoring output schema
const ConfidenceScoringOutput = z.object({
  overallConfidenceScore: z.number().min(0).max(1),
  detailedScoring: z.object({
    skillMatch: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string())
    }),
    culturalAlignment: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      culturalFactors: z.array(z.string()),
      authenticityScore: z.number().min(0).max(1)
    }),
    availabilityScore: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      timelineCompatibility: z.boolean(),
      workloadAssessment: z.string()
    }),
    priceCompatibility: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      estimatedPriceRange: z.object({
        min: z.number(),
        max: z.number()
      }),
      budgetAlignment: z.string()
    }),
    qualityPrediction: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      qualityIndicators: z.array(z.string()),
      riskFactors: z.array(z.string())
    }),
    communicationFit: z.object({
      score: z.number().min(0).max(1),
      reasoning: z.string(),
      languageCompatibility: z.boolean(),
      responseTimeExpectation: z.string()
    })
  }),
  matchReasons: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  recommendedActions: z.array(z.object({
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    reasoning: z.string()
  })),
  alternativeRecommendations: z.array(z.string()),
  confidenceFactors: z.array(z.object({
    factor: z.string(),
    weight: z.number().min(0).max(1),
    score: z.number().min(0).max(1),
    explanation: z.string()
  }))
});

export type ConfidenceScoringInput = z.infer<typeof ConfidenceScoringInput>;
export type ConfidenceScoringOutput = z.infer<typeof ConfidenceScoringOutput>;

/**
 * Agentic Confidence Scoring Agent
 * Generates explainable confidence scores for artisan-buyer matches
 */
export class ConfidenceScorerAgent {
  private agentId = 'confidence-scorer';
  
  constructor() {
    // Register this agent with the orchestrator
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Confidence Scorer',
      description: 'Generates explainable confidence scores for artisan-buyer matches using advanced AI reasoning',
      capabilities: ['confidence-scoring', 'matching', 'reasoning', 'risk-assessment'],
      status: 'active',
      priority: 8,
      lastActivity: new Date()
    };
    
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Generate comprehensive confidence score for artisan-buyer match
   */
  async generateConfidenceScore(input: ConfidenceScoringInput): Promise<ConfidenceScoringOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = ConfidenceScoringInput.parse(input);
      
      // Get relevant context and historical data
      const contextData = await this.gatherContextualData(validatedInput);
      
      // Build comprehensive scoring prompt
      const scoringPrompt = this.buildScoringPrompt(validatedInput, contextData);
      
      // Generate detailed confidence analysis using GenAI
      const confidenceAnalysis = await genAIService.generateStructured(
        scoringPrompt,
        ConfidenceScoringOutput,
        {
          buyerRequirements: validatedInput.buyerRequirements,
          artisanProfile: validatedInput.artisanProfile,
          contextData: contextData,
          scoringType: 'comprehensive-match-analysis'
        },
        'pro' // Use advanced model for complex reasoning
      );
      
      // Enhance scoring with semantic similarity analysis
      const enhancedScoring = await this.enhanceWithSemanticAnalysis(
        validatedInput,
        confidenceAnalysis
      );
      
      // Store scoring results for learning
      await this.storeScoringInMemory(validatedInput, enhancedScoring);
      
      // Log successful scoring
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'confidence-scoring',
        validatedInput.contextData.userId,
        validatedInput.contextData.sessionId,
        duration,
        true,
        undefined,
        { 
          confidenceScore: enhancedScoring.overallConfidenceScore,
          artisanId: validatedInput.artisanProfile.id
        }
      );
      
      return enhancedScoring;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'confidence-scoring',
        input.contextData.userId,
        input.contextData.sessionId,
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Confidence scoring failed: ${errorMessage}`);
    }
  }

  /**
   * Build comprehensive scoring prompt
   */
  private buildScoringPrompt(input: ConfidenceScoringInput, contextData: any): string {
    const { buyerRequirements, artisanProfile } = input;
    
    return `
You are an expert AI agent specializing in matching buyers with artisans for traditional crafts and handmade products. 
Your task is to generate a comprehensive, explainable confidence score for this potential match.

BUYER REQUIREMENTS:
${JSON.stringify(buyerRequirements, null, 2)}

ARTISAN PROFILE:
${JSON.stringify(artisanProfile, null, 2)}

CONTEXTUAL DATA:
${JSON.stringify(contextData, null, 2)}

SCORING CRITERIA:
Evaluate the match across these key dimensions:

1. SKILL MATCH (25% weight):
   - How well do the artisan's skills align with buyer requirements?
   - Consider specializations, verified skills, and proficiency levels
   - Assess technical capability for the requested work

2. CULTURAL ALIGNMENT (20% weight):
   - Does the artisan's cultural background match the buyer's needs?
   - Consider authenticity, traditional techniques, and cultural significance
   - Evaluate cultural sensitivity and understanding

3. AVAILABILITY SCORE (15% weight):
   - Can the artisan meet the buyer's timeline requirements?
   - Consider current workload, response time, and availability status
   - Assess capacity for custom orders

4. PRICE COMPATIBILITY (15% weight):
   - Are the artisan's pricing and buyer's budget compatible?
   - Consider market rates, quality expectations, and value proposition
   - Evaluate pricing transparency and negotiation flexibility

5. QUALITY PREDICTION (15% weight):
   - What's the likelihood of delivering high-quality work?
   - Consider past performance, customer satisfaction, and completion rates
   - Assess risk factors and quality indicators

6. COMMUNICATION FIT (10% weight):
   - How well can buyer and artisan communicate?
   - Consider language compatibility, response patterns, and communication style
   - Evaluate potential for smooth collaboration

ANALYSIS REQUIREMENTS:
- Provide detailed reasoning for each scoring dimension
- Identify specific match strengths and potential concerns
- Suggest actionable recommendations for improving the match
- Consider both explicit and implicit factors
- Account for cultural nuances and traditional craft aspects
- Provide confidence factors with weights and explanations

Be thorough, objective, and provide actionable insights that help both buyer and artisan succeed.
    `.trim();
  }

  /**
   * Gather contextual data for scoring
   */
  private async gatherContextualData(input: ConfidenceScoringInput): Promise<any> {
    try {
      // Get user's historical preferences and behavior
      const memoryContext = agentMemoryManager.getRelevantContext(
        input.contextData.userId,
        input.contextData.sessionId,
        'confidence-scoring',
        10
      );
      
      // Search for similar artisan profiles for comparison
      const similarArtisans = await vectorStore.search(
        `${input.artisanProfile.artisticProfession} ${input.artisanProfile.specializations?.join(' ')}`,
        {
          limit: 5,
          type: 'artisan',
          minScore: 0.6
        }
      );
      
      // Get market data (mock for now - would integrate with real market data)
      const marketData = {
        averagePricing: this.estimateMarketPricing(input.buyerRequirements.categories),
        demandLevel: 'medium',
        seasonalFactors: this.getSeasonalFactors(),
        competitionLevel: similarArtisans.length > 3 ? 'high' : 'medium'
      };
      
      return {
        memoryContext,
        similarArtisans: similarArtisans.map(r => r.document),
        marketData,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.warn('Failed to gather contextual data:', error);
      return {
        memoryContext: { conversations: [], preferences: [], context: [] },
        similarArtisans: [],
        marketData: { averagePricing: { min: 1000, max: 10000 }, demandLevel: 'medium' },
        timestamp: new Date()
      };
    }
  }

  /**
   * Enhance scoring with semantic similarity analysis
   */
  private async enhanceWithSemanticAnalysis(
    input: ConfidenceScoringInput,
    baseScoring: ConfidenceScoringOutput
  ): Promise<ConfidenceScoringOutput> {
    try {
      // Create semantic representations
      const buyerText = `${input.buyerRequirements.extractedRequirements.keyFeatures?.join(' ')} ${input.buyerRequirements.categories.join(' ')}`;
      const artisanText = `${input.artisanProfile.artisticProfession} ${input.artisanProfile.specializations?.join(' ')} ${input.artisanProfile.portfolioHighlights?.join(' ')}`;
      
      // Search for semantic similarity
      const semanticMatches = await vectorStore.search(buyerText, {
        limit: 1,
        type: 'artisan',
        metadata: { artisanId: input.artisanProfile.id }
      });
      
      // Adjust confidence score based on semantic similarity
      let semanticBonus = 0;
      if (semanticMatches.length > 0) {
        semanticBonus = semanticMatches[0].score * 0.1; // Up to 10% bonus
      }
      
      // Apply semantic enhancement
      const enhancedScore = Math.min(1, baseScoring.overallConfidenceScore + semanticBonus);
      
      return {
        ...baseScoring,
        overallConfidenceScore: enhancedScore,
        confidenceFactors: [
          ...baseScoring.confidenceFactors,
          {
            factor: 'semantic_similarity',
            weight: 0.1,
            score: semanticMatches.length > 0 ? semanticMatches[0].score : 0,
            explanation: 'Semantic similarity between buyer requirements and artisan profile'
          }
        ]
      };
      
    } catch (error) {
      console.warn('Failed to enhance with semantic analysis:', error);
      return baseScoring;
    }
  }

  /**
   * Store scoring results in memory for learning
   */
  private async storeScoringInMemory(
    input: ConfidenceScoringInput,
    scoring: ConfidenceScoringOutput
  ): Promise<void> {
    try {
      // Store scoring decision for learning
      agentMemoryManager.storeMemory({
        agentId: this.agentId,
        userId: input.contextData.userId,
        sessionId: input.contextData.sessionId,
        type: 'decision',
        content: {
          decision: 'confidence-scoring',
          artisanId: input.artisanProfile.id,
          confidenceScore: scoring.overallConfidenceScore,
          keyFactors: scoring.confidenceFactors.slice(0, 3),
          matchReasons: scoring.matchReasons,
          concerns: scoring.potentialConcerns
        },
        importance: 0.7,
        tags: ['confidence-scoring', 'matching', input.artisanProfile.artisticProfession]
      });
      
    } catch (error) {
      console.warn('Failed to store scoring in memory:', error);
    }
  }

  /**
   * Estimate market pricing for categories
   */
  private estimateMarketPricing(categories: string[]): { min: number; max: number } {
    // Mock pricing estimation - would integrate with real market data
    const pricingMap: Record<string, { min: number; max: number }> = {
      pottery: { min: 500, max: 5000 },
      textiles: { min: 1000, max: 15000 },
      jewelry: { min: 2000, max: 50000 },
      woodwork: { min: 800, max: 12000 },
      metalwork: { min: 1500, max: 25000 },
      default: { min: 1000, max: 10000 }
    };
    
    const relevantPricing = categories
      .map(cat => pricingMap[cat.toLowerCase()] || pricingMap.default)
      .reduce((acc, pricing) => ({
        min: Math.min(acc.min, pricing.min),
        max: Math.max(acc.max, pricing.max)
      }), { min: Infinity, max: 0 });
    
    return relevantPricing.min === Infinity ? pricingMap.default : relevantPricing;
  }

  /**
   * Get seasonal factors affecting demand
   */
  private getSeasonalFactors(): any {
    const month = new Date().getMonth();
    const seasonalFactors = {
      festivalSeason: month >= 8 && month <= 11, // Sep-Dec (Diwali, etc.)
      weddingSeason: month >= 10 || month <= 2, // Nov-Feb
      touristSeason: month >= 9 && month <= 3, // Oct-Mar
      giftingSeason: month === 11 || month === 0 // Dec-Jan
    };
    
    return seasonalFactors;
  }

  /**
   * Batch score multiple artisans for efficiency
   */
  async batchScoreArtisans(
    buyerRequirements: any,
    artisanProfiles: any[],
    contextData: any
  ): Promise<ConfidenceScoringOutput[]> {
    const startTime = Date.now();
    
    try {
      const scoringPromises = artisanProfiles.map(artisan => 
        this.generateConfidenceScore({
          buyerRequirements,
          artisanProfile: artisan,
          contextData
        })
      );
      
      const results = await Promise.allSettled(scoringPromises);
      
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<ConfidenceScoringOutput> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
      
      // Log batch scoring
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'batch-confidence-scoring',
        contextData.userId,
        contextData.sessionId,
        duration,
        true,
        undefined,
        { 
          totalArtisans: artisanProfiles.length,
          successfulScores: successfulResults.length,
          averageConfidence: successfulResults.reduce((sum, r) => sum + r.overallConfidenceScore, 0) / successfulResults.length
        }
      );
      
      return successfulResults;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      aiMonitoringService.logAgentTask(
        this.agentId,
        'batch-confidence-scoring',
        contextData.userId,
        contextData.sessionId,
        duration,
        false,
        errorMessage
      );
      
      throw error;
    }
  }
}

// Export singleton instance
export const confidenceScorerAgent = new ConfidenceScorerAgent();