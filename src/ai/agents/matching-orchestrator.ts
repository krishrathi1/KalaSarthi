import { z } from 'zod';
import { genAIService } from '../core/genai-service';
import { agentOrchestrator, AIAgent } from '../core/agent-orchestrator';
import { agentMemoryManager } from '../core/agent-memory';
import { aiMonitoringService } from '../core/monitoring';
import { vectorStore } from '../core/vector-store';
import { requirementAnalyzerAgent, RequirementAnalysisOutput } from './requirement-analyzer';
import { confidenceScorerAgent, ConfidenceScoringOutput } from './confidence-scorer';
import { UserService } from '../../lib/service/UserService';

// Matching request input schema
const MatchingRequestInput = z.object({
  buyerId: z.string(),
  userInput: z.string().min(1, 'User input is required'),
  sessionId: z.string(),
  filters: z.object({
    priceRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional(),
    location: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    availability: z.string().optional(),
    rating: z.number().optional(),
    culturalPreferences: z.array(z.string()).optional()
  }).optional(),
  preferences: z.object({
    maxResults: z.number().default(10),
    minConfidenceScore: z.number().min(0).max(1).default(0.3),
    sortBy: z.enum(['confidence', 'rating', 'price', 'availability']).default('confidence'),
    includeAlternatives: z.boolean().default(true)
  }).optional()
});

// Artisan match result schema
const ArtisanMatchResult = z.object({
  artisanId: z.string(),
  artisanProfile: z.object({
    name: z.string(),
    artisticProfession: z.string(),
    description: z.string().optional(),
    profileImage: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    availabilityStatus: z.string().optional(),
    responseTimeAverage: z.number().optional(),
    aiMetrics: z.any().optional(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional()
    }).optional()
  }),
  confidenceScore: z.number().min(0).max(1),
  confidenceAnalysis: z.any(), // ConfidenceScoringOutput
  matchReasons: z.array(z.string()),
  estimatedPrice: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().default('INR')
  }),
  estimatedTimeline: z.string(),
  culturalContext: z.object({
    authenticity: z.number().min(0).max(1),
    culturalSignificance: z.string().optional(),
    traditionalTechniques: z.array(z.string()).optional()
  }).optional(),
  recommendedActions: z.array(z.string()),
  riskFactors: z.array(z.string()).optional()
});

// Matching result schema
const MatchingResultOutput = z.object({
  matches: z.array(ArtisanMatchResult),
  totalMatches: z.number(),
  searchMetadata: z.object({
    extractedKeywords: z.array(z.string()),
    categories: z.array(z.string()),
    confidenceThreshold: z.number(),
    searchTime: z.number(),
    aiAnalysisTime: z.number(),
    timestamp: z.string()
  }),
  requirementAnalysis: z.any(), // RequirementAnalysisOutput
  alternativeRecommendations: z.array(z.object({
    suggestion: z.string(),
    reasoning: z.string(),
    actionRequired: z.string()
  })),
  marketInsights: z.object({
    averagePricing: z.object({
      min: z.number(),
      max: z.number()
    }),
    demandLevel: z.enum(['low', 'medium', 'high']),
    availabilityTrend: z.string(),
    seasonalFactors: z.array(z.string())
  }),
  improvementSuggestions: z.array(z.object({
    area: z.string(),
    suggestion: z.string(),
    impact: z.enum(['low', 'medium', 'high'])
  }))
});

export type MatchingRequestInput = z.infer<typeof MatchingRequestInput>;
export type ArtisanMatchResult = z.infer<typeof ArtisanMatchResult>;
export type MatchingResultOutput = z.infer<typeof MatchingResultOutput>;

/**
 * Intelligent Matching Orchestration Agent
 * Coordinates the entire matching process using multiple AI agents
 */
export class MatchingOrchestratorAgent {
  private agentId = 'matching-orchestrator';
  
  constructor() {
    // Register this agent with the orchestrator
    const agentConfig: AIAgent = {
      id: this.agentId,
      name: 'Matching Orchestrator',
      description: 'Orchestrates intelligent artisan-buyer matching using multiple AI agents',
      capabilities: ['matching-orchestration', 'multi-agent-coordination', 'result-optimization'],
      status: 'active',
      priority: 10,
      lastActivity: new Date()
    };
    
    agentOrchestrator.registerAgent(agentConfig);
  }

  /**
   * Execute comprehensive matching process
   */
  async executeMatching(input: MatchingRequestInput): Promise<MatchingResultOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = MatchingRequestInput.parse(input);
      
      // Step 1: Analyze buyer requirements
      console.log('🔍 Analyzing buyer requirements...');
      const requirementAnalysis = await this.analyzeRequirements(validatedInput);
      
      // Step 2: Find candidate artisans
      console.log('👥 Finding candidate artisans...');
      const candidateArtisans = await this.findCandidateArtisans(
        requirementAnalysis,
        validatedInput.filters
      );
      
      // Step 3: Score and rank artisans
      console.log('📊 Scoring and ranking artisans...');
      const scoredMatches = await this.scoreAndRankArtisans(
        requirementAnalysis,
        candidateArtisans,
        validatedInput
      );
      
      // Step 4: Generate market insights
      console.log('📈 Generating market insights...');
      const marketInsights = await this.generateMarketInsights(
        requirementAnalysis,
        scoredMatches
      );
      
      // Step 5: Create alternative recommendations
      console.log('💡 Creating alternative recommendations...');
      const alternatives = await this.generateAlternativeRecommendations(
        requirementAnalysis,
        scoredMatches,
        validatedInput
      );
      
      // Step 6: Optimize and finalize results
      console.log('⚡ Optimizing results...');
      const optimizedResults = await this.optimizeResults(
        scoredMatches,
        validatedInput.preferences
      );
      
      // Build final result
      const result: MatchingResultOutput = {
        matches: optimizedResults,
        totalMatches: optimizedResults.length,
        searchMetadata: {
          extractedKeywords: requirementAnalysis.extractedKeywords,
          categories: requirementAnalysis.categories,
          confidenceThreshold: validatedInput.preferences?.minConfidenceScore || 0.3,
          searchTime: Date.now() - startTime,
          aiAnalysisTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        requirementAnalysis,
        alternativeRecommendations: alternatives,
        marketInsights,
        improvementSuggestions: await this.generateImprovementSuggestions(
          requirementAnalysis,
          optimizedResults
        )
      };
      
      // Store matching results for learning
      await this.storeMatchingResults(validatedInput, result);
      
      // Log successful matching
      const duration = Date.now() - startTime;
      aiMonitoringService.logAgentTask(
        this.agentId,
        'intelligent-matching',
        validatedInput.buyerId,
        validatedInput.sessionId,
        duration,
        true,
        undefined,
        {
          totalMatches: result.totalMatches,
          averageConfidence: result.matches.reduce((sum, m) => sum + m.confidenceScore, 0) / result.matches.length,
          categories: result.searchMetadata.categories
        }
      );
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      aiMonitoringService.logAgentTask(
        this.agentId,
        'intelligent-matching',
        input.buyerId,
        input.sessionId,
        duration,
        false,
        errorMessage
      );
      
      throw new Error(`Intelligent matching failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze buyer requirements using requirement analyzer agent
   */
  private async analyzeRequirements(input: MatchingRequestInput): Promise<RequirementAnalysisOutput> {
    try {
      // Get user profile for context
      const userProfile = await UserService.getUserByUid(input.buyerId);
      
      const analysis = await requirementAnalyzerAgent.analyzeRequirements({
        userInput: input.userInput,
        userId: input.buyerId,
        sessionId: input.sessionId,
        context: {
          userProfile,
          priceRange: input.filters?.priceRange,
          culturalPreferences: input.filters?.culturalPreferences
        }
      });
      
      console.log('Requirement analysis result:', JSON.stringify(analysis, null, 2));
      
      // Ensure all required properties exist with fallbacks
      const fallbackCategories = this.extractCategoriesFromText(input.userInput);
      const fallbackKeywords = input.userInput.toLowerCase().split(' ').filter(word => word.length > 2);
      
      return {
        extractedRequirements: analysis.extractedRequirements || {
          keyFeatures: [],
          constraints: [],
          preferences: [],
          confidence: 0.5
        },
        processedText: analysis.processedText || input.userInput,
        extractedKeywords: (analysis.extractedKeywords && analysis.extractedKeywords.length > 0) ? analysis.extractedKeywords : fallbackKeywords,
        categories: (analysis.categories && analysis.categories.length > 0) ? analysis.categories : fallbackCategories,
        aiAnalysis: analysis.aiAnalysis || {
          intent: 'general_inquiry',
          sentiment: 'neutral',
          urgency: 'medium',
          complexity: 'moderate',
          culturalContext: 'General craftsmanship',
          priceIndications: {
            budget: 'medium',
            range: { min: 1000, max: 10000 }
          },
          timelineIndications: {
            urgency: 'flexible',
            estimatedDuration: '2-4 weeks'
          }
        },
        suggestedFilters: analysis.suggestedFilters || {},
        followUpQuestions: analysis.followUpQuestions || [],
        confidence: analysis.confidence || 0.5
      };
      
    } catch (error) {
      console.error('Requirement analysis failed:', error);
      
      // Return a fallback analysis
      const fallbackCategories = this.extractCategoriesFromText(input.userInput);
      console.log('Fallback categories extracted:', fallbackCategories);
      
      return {
        extractedRequirements: {
          keyFeatures: [input.userInput],
          constraints: [],
          preferences: [],
          confidence: 0.3
        },
        processedText: input.userInput,
        extractedKeywords: input.userInput.toLowerCase().split(' ').filter(word => word.length > 2),
        categories: this.extractCategoriesFromText(input.userInput),
        aiAnalysis: {
          intent: 'general_inquiry',
          sentiment: 'neutral',
          urgency: 'medium',
          complexity: 'moderate',
          culturalContext: 'General craftsmanship',
          priceIndications: {
            budget: 'medium',
            range: { min: 1000, max: 10000 }
          },
          timelineIndications: {
            urgency: 'flexible',
            estimatedDuration: '2-4 weeks'
          }
        },
        suggestedFilters: {},
        followUpQuestions: [],
        confidence: 0.3
      };
    }
  }

  /**
   * Find candidate artisans using multiple search strategies
   */
  private async findCandidateArtisans(
    requirements: RequirementAnalysisOutput,
    filters?: any
  ): Promise<any[]> {
    try {
      // Strategy 1: Get all artisans and filter client-side
      // TODO: Implement more efficient Firestore querying for complex filters
      console.log('Fetching all artisans for client-side filtering...');
      
      const allArtisans = await UserService.getAllArtisans();
      console.log(`Retrieved ${allArtisans.length} total artisans`);
      
      // Apply client-side filters
      let dbCandidates = allArtisans.filter(artisan => {
        // Apply specializations filter
        if (filters?.specializations?.length > 0) {
          const artisanSpecs = artisan.artisanConnectProfile?.specializations || [];
          if (!filters.specializations.some((spec: string) => 
            artisanSpecs.some((as: string) => as.toLowerCase().includes(spec.toLowerCase()))
          )) {
            return false;
          }
        }
        
        // Apply availability filter
        if (filters?.availability && 
            artisan.artisanConnectProfile?.availabilityStatus !== filters.availability) {
          return false;
        }
        
        // Apply rating filter
        if (filters?.rating && 
            (artisan.artisanConnectProfile?.aiMetrics?.customerSatisfactionScore || 0) < filters.rating) {
          return false;
        }
        
        // Apply location filter
        if (filters?.location && 
            !artisan.address?.city?.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
        
        // Apply category-based filtering
        if (requirements.categories && requirements.categories.length > 0) {
          const matchesCategory = requirements.categories.some(category => {
            const catLower = category.toLowerCase();
            return (
              artisan.artisticProfession?.toLowerCase().includes(catLower) ||
              artisan.artisanConnectProfile?.specializations?.some((spec: string) => 
                spec.toLowerCase().includes(catLower)
              )
            );
          });
          if (!matchesCategory) {
            return false;
          }
        }
        
        return true;
      });
      
      // Limit for performance
      dbCandidates = dbCandidates.slice(0, 50);
      
      console.log(`Client-side filtering found ${dbCandidates.length} candidates`);
      
      // Strategy 2: Semantic search using vector store (with fallback)
      let semanticCandidates: any[] = [];
      try {
        const semanticQuery = `${(requirements.extractedKeywords || []).join(' ')} ${(requirements.categories || []).join(' ')}`;
        semanticCandidates = await vectorStore.search(semanticQuery, {
          limit: 20,
          type: 'artisan',
          minScore: 0.4
        });
        console.log(`Vector search found ${semanticCandidates.length} candidates`);
      } catch (error) {
        console.warn('Vector search failed, using database results only:', error);
      }
      
      // Combine and deduplicate candidates
      const allCandidates = new Map();
      
      // Add database candidates
      dbCandidates.forEach(candidate => {
        allCandidates.set(candidate.uid, candidate);
      });
      
      // Add semantic candidates (if they have corresponding user records)
      for (const semantic of semanticCandidates) {
        const artisanId = semantic.document.metadata?.artisanId;
        if (artisanId && !allCandidates.has(artisanId)) {
          const artisan = await UserService.getUserByUid(artisanId);
          if (artisan) {
            allCandidates.set(artisanId, artisan);
          }
        }
      }
      
      const finalCandidates = Array.from(allCandidates.values());
      console.log(`Total unique candidates: ${finalCandidates.length}`);
      
      return finalCandidates;
      
    } catch (error) {
      console.error('Failed to find candidate artisans:', error);
      throw new Error('Failed to find candidate artisans');
    }
  }

  /**
   * Score and rank artisans using confidence scorer agent
   */
  private async scoreAndRankArtisans(
    requirements: RequirementAnalysisOutput,
    candidates: any[],
    input: MatchingRequestInput
  ): Promise<ArtisanMatchResult[]> {
    try {
      const scoringPromises = candidates.map(async (artisan) => {
        try {
          // Prepare artisan profile for scoring
          const artisanProfile = {
            id: artisan.uid,
            name: artisan.name,
            artisticProfession: artisan.artisticProfession,
            specializations: artisan.artisanConnectProfile?.specializations || [],
            skillTags: artisan.artisanConnectProfile?.skillTags || [],
            aiMetrics: artisan.artisanConnectProfile?.aiMetrics || {},
            availabilityStatus: artisan.artisanConnectProfile?.availabilityStatus || 'available',
            responseTimeAverage: artisan.artisanConnectProfile?.responseTimeAverage || 60,
            portfolioHighlights: artisan.artisanConnectProfile?.portfolioHighlights || []
          };
          
          // Generate confidence score
          const confidenceAnalysis = await confidenceScorerAgent.generateConfidenceScore({
            buyerRequirements: requirements,
            artisanProfile,
            contextData: {
              userId: input.buyerId,
              sessionId: input.sessionId
            }
          });
          
          console.log(`Confidence analysis for ${artisan.uid}:`, JSON.stringify(confidenceAnalysis, null, 2));
          
          // Build match result
          const matchResult: ArtisanMatchResult = {
            artisanId: artisan.uid,
            artisanProfile: {
              name: artisan.name,
              artisticProfession: artisan.artisticProfession,
              description: artisan.description,
              profileImage: artisan.profileImage,
              specializations: artisan.artisanConnectProfile?.specializations,
              availabilityStatus: artisan.artisanConnectProfile?.availabilityStatus,
              responseTimeAverage: artisan.artisanConnectProfile?.responseTimeAverage,
              aiMetrics: artisan.artisanConnectProfile?.aiMetrics,
              location: {
                city: artisan.address?.city,
                state: artisan.address?.state,
                country: artisan.address?.country
              }
            },
            confidenceScore: confidenceAnalysis.overallConfidenceScore || 0.5,
            confidenceAnalysis,
            matchReasons: confidenceAnalysis.matchReasons || ['Matching artisan found'],
            estimatedPrice: {
              ...(confidenceAnalysis.detailedScoring?.priceCompatibility?.estimatedPriceRange || { min: 1000, max: 5000 }),
              currency: 'INR'
            },
            estimatedTimeline: this.estimateTimeline(requirements, artisan),
            culturalContext: {
              authenticity: confidenceAnalysis.detailedScoring?.culturalAlignment?.authenticityScore || 0.7,
              culturalSignificance: requirements.aiAnalysis?.culturalContext || 'General craftsmanship',
              traditionalTechniques: artisan.artisanConnectProfile?.skillTags?.map((s: any) => s.skill) || []
            },
            recommendedActions: confidenceAnalysis.recommendedActions?.map(a => a.action) || ['Contact artisan to discuss requirements'],
            riskFactors: confidenceAnalysis.potentialConcerns || []
          };
          
          return matchResult;
          
        } catch (error) {
          console.warn(`Failed to score artisan ${artisan.uid}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(scoringPromises);
      
      return results
        .filter((result): result is PromiseFulfilledResult<ArtisanMatchResult> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value)
        .filter(match => {
          console.log(`Artisan ${match.artisanId} confidence: ${match.confidenceScore}, threshold: ${input.preferences?.minConfidenceScore || 0.3}`);
          return match.confidenceScore >= (input.preferences?.minConfidenceScore || 0.3);
        })
        .sort((a, b) => b.confidenceScore - a.confidenceScore);
      
    } catch (error) {
      console.error('Failed to score and rank artisans:', error);
      throw new Error('Failed to score and rank artisans');
    }
  }

  /**
   * Generate market insights
   */
  private async generateMarketInsights(
    requirements: RequirementAnalysisOutput,
    matches: ArtisanMatchResult[]
  ): Promise<any> {
    try {
      const prices = matches.map(m => ({ min: m.estimatedPrice.min, max: m.estimatedPrice.max }));
      const avgMin = prices.reduce((sum, p) => sum + p.min, 0) / prices.length || 0;
      const avgMax = prices.reduce((sum, p) => sum + p.max, 0) / prices.length || 0;
      
      return {
        averagePricing: {
          min: Math.round(avgMin),
          max: Math.round(avgMax)
        },
        demandLevel: matches.length > 10 ? 'high' : matches.length > 5 ? 'medium' : 'low',
        availabilityTrend: this.analyzeAvailabilityTrend(matches),
        seasonalFactors: this.getSeasonalFactors(requirements.categories || [])
      };
      
    } catch (error) {
      console.warn('Failed to generate market insights:', error);
      return {
        averagePricing: { min: 1000, max: 10000 },
        demandLevel: 'medium',
        availabilityTrend: 'stable',
        seasonalFactors: []
      };
    }
  }

  /**
   * Generate alternative recommendations
   */
  private async generateAlternativeRecommendations(
    requirements: RequirementAnalysisOutput,
    matches: ArtisanMatchResult[],
    input: MatchingRequestInput
  ): Promise<any[]> {
    try {
      const alternatives = [];
      
      // If few matches, suggest broader search
      if (matches.length < 3) {
        alternatives.push({
          suggestion: 'Expand search criteria',
          reasoning: 'Limited matches found. Consider broadening your requirements or exploring related categories.',
          actionRequired: 'Modify filters or add alternative categories'
        });
      }
      
      // If all matches are expensive, suggest budget alternatives
      const avgPrice = matches.reduce((sum, m) => sum + (m.estimatedPrice.min + m.estimatedPrice.max) / 2, 0) / matches.length;
      if (avgPrice > (requirements.aiAnalysis?.priceIndications?.range?.max || 10000)) {
        alternatives.push({
          suggestion: 'Consider budget-friendly alternatives',
          reasoning: 'Current matches may exceed your budget. Consider simpler designs or emerging artisans.',
          actionRequired: 'Adjust budget expectations or simplify requirements'
        });
      }
      
      // Suggest cultural alternatives
      if (requirements.aiAnalysis?.culturalContext) {
        alternatives.push({
          suggestion: 'Explore related cultural traditions',
          reasoning: 'Similar crafts from neighboring regions might offer unique perspectives.',
          actionRequired: 'Expand cultural preferences in search'
        });
      }
      
      return alternatives;
      
    } catch (error) {
      console.warn('Failed to generate alternatives:', error);
      return [];
    }
  }

  /**
   * Optimize final results
   */
  private async optimizeResults(
    matches: ArtisanMatchResult[],
    preferences?: any
  ): Promise<ArtisanMatchResult[]> {
    try {
      const maxResults = preferences?.maxResults || 10;
      const sortBy = preferences?.sortBy || 'confidence';
      
      // Sort based on preference
      let sortedMatches = [...matches];
      
      switch (sortBy) {
        case 'rating':
          sortedMatches.sort((a, b) => 
            (b.artisanProfile.aiMetrics?.customerSatisfactionScore || 0) - 
            (a.artisanProfile.aiMetrics?.customerSatisfactionScore || 0)
          );
          break;
        case 'price':
          sortedMatches.sort((a, b) => a.estimatedPrice.min - b.estimatedPrice.min);
          break;
        case 'availability':
          sortedMatches.sort((a, b) => 
            (a.artisanProfile.responseTimeAverage || 999) - 
            (b.artisanProfile.responseTimeAverage || 999)
          );
          break;
        default: // confidence
          sortedMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);
      }
      
      return sortedMatches.slice(0, maxResults);
      
    } catch (error) {
      console.warn('Failed to optimize results:', error);
      return matches.slice(0, 10);
    }
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(
    requirements: RequirementAnalysisOutput,
    matches: ArtisanMatchResult[]
  ): Promise<any[]> {
    const suggestions = [];
    
    // Analyze match quality
    const avgConfidence = matches.reduce((sum, m) => sum + m.confidenceScore, 0) / matches.length;
    
    if (avgConfidence < 0.6) {
      suggestions.push({
        area: 'requirements',
        suggestion: 'Provide more specific details about your needs to improve match quality',
        impact: 'high'
      });
    }
    
    if (matches.length < 5) {
      suggestions.push({
        area: 'search',
        suggestion: 'Consider expanding your search criteria or exploring related categories',
        impact: 'medium'
      });
    }
    
    return suggestions;
  }

  /**
   * Store matching results for learning
   */
  private async storeMatchingResults(
    input: MatchingRequestInput,
    result: MatchingResultOutput
  ): Promise<void> {
    try {
      // Store in agent memory for learning
      agentMemoryManager.storeMemory({
        agentId: this.agentId,
        userId: input.buyerId,
        sessionId: input.sessionId,
        type: 'decision',
        content: {
          searchQuery: input.userInput,
          totalMatches: result.totalMatches,
          topMatches: result.matches.slice(0, 3).map(m => ({
            artisanId: m.artisanId,
            confidenceScore: m.confidenceScore
          })),
          categories: result.searchMetadata.categories,
          searchTime: result.searchMetadata.searchTime
        },
        importance: 0.8,
        tags: ['matching', 'search-results', ...result.searchMetadata.categories]
      });
      
    } catch (error) {
      console.warn('Failed to store matching results:', error);
    }
  }

  /**
   * Helper methods
   */
  private extractCategoriesFromText(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based category extraction
    if (lowerText.includes('pottery') || lowerText.includes('ceramic') || lowerText.includes('clay')) {
      categories.push('pottery');
    }
    if (lowerText.includes('textile') || lowerText.includes('fabric') || lowerText.includes('weaving')) {
      categories.push('textiles');
    }
    if (lowerText.includes('jewelry') || lowerText.includes('silver') || lowerText.includes('gold')) {
      categories.push('jewelry');
    }
    if (lowerText.includes('wood') || lowerText.includes('carving') || lowerText.includes('furniture')) {
      categories.push('wood carving');
    }
    if (lowerText.includes('metal') || lowerText.includes('brass') || lowerText.includes('copper')) {
      categories.push('metal craft');
    }
    if (lowerText.includes('embroidery') || lowerText.includes('stitch') || lowerText.includes('thread')) {
      categories.push('embroidery');
    }
    if (lowerText.includes('painting') || lowerText.includes('art') || lowerText.includes('canvas')) {
      categories.push('painting');
    }
    if (lowerText.includes('glass') || lowerText.includes('crystal')) {
      categories.push('glass work');
    }
    if (lowerText.includes('leather') || lowerText.includes('bag') || lowerText.includes('shoe')) {
      categories.push('leather work');
    }
    if (lowerText.includes('block print') || lowerText.includes('print') || lowerText.includes('dye')) {
      categories.push('block printing');
    }
    
    // If no specific categories found, add general ones
    if (categories.length === 0) {
      if (lowerText.includes('traditional') || lowerText.includes('authentic')) {
        categories.push('traditional crafts');
      }
      if (lowerText.includes('handmade') || lowerText.includes('craft')) {
        categories.push('handmade');
      }
    }
    
    return categories;
  }

  private estimateTimeline(requirements: RequirementAnalysisOutput, artisan: any): string {
    const complexity = requirements.aiAnalysis?.complexity || 'moderate';
    const baseTime = artisan.artisanConnectProfile?.responseTimeAverage || 60;
    
    const timelineMap = {
      simple: '1-2 weeks',
      moderate: '2-4 weeks',
      complex: '4-8 weeks'
    };
    
    return timelineMap[complexity] || '2-4 weeks';
  }

  private analyzeAvailabilityTrend(matches: ArtisanMatchResult[]): string {
    const availableCount = matches.filter(m => 
      m.artisanProfile.availabilityStatus === 'available'
    ).length;
    
    const availabilityRate = availableCount / matches.length;
    
    if (availabilityRate > 0.7) return 'high availability';
    if (availabilityRate > 0.4) return 'moderate availability';
    return 'limited availability';
  }

  private getSeasonalFactors(categories: string[]): string[] {
    const month = new Date().getMonth();
    const factors = [];
    
    if (month >= 8 && month <= 11) { // Sep-Dec
      factors.push('Festival season - high demand for traditional items');
    }
    
    if (month >= 10 || month <= 2) { // Nov-Feb
      factors.push('Wedding season - increased demand for jewelry and textiles');
    }
    
    if (categories.some(c => c.toLowerCase().includes('gift'))) {
      factors.push('Gift season - consider personalization options');
    }
    
    return factors;
  }
}

// Export singleton instance
export const matchingOrchestratorAgent = new MatchingOrchestratorAgent();