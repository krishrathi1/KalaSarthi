/**
 * Semantic Search Engine
 * Main engine that combines vector search with traditional matching factors
 */

import { IUser } from '../models/User';
import { VectorEmbeddingSystem, QueryEmbedding } from './embedding-system';
import { SimilaritySearchEngine, SimilaritySearchQuery } from './similarity-search';
import { VectorPerformanceOptimizer } from './performance-optimizer';
import { QueryProcessor, ProcessedQuery } from './query-processor';
import { VectorDatabase } from './database';
import { VectorConfig } from './config';
import { VectorUtils } from './utils';

export interface SemanticSearchConfig {
  hybridWeights: {
    semantic: number;
    keyword: number;
    location: number;
    performance: number;
  };
  similarityThreshold: number;
  maxResults: number;
  enableExplanations: boolean;
  enableLearning: boolean;
  enablePerformanceOptimization: boolean;
}

export interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  accuracy?: number;
}

export interface FilterCriteria {
  maxDistance?: number;
  minRelevanceScore?: number;
  maxResults?: number;
  priceRange?: { min: number; max: number };
  experienceLevel?: string[];
  materials?: string[];
  verifiedOnly?: boolean;
  artisanRating?: number;
}

export interface SemanticMatchResult {
  artisan: IUser;
  semanticScore: number;
  keywordScore: number;
  locationScore: number;
  performanceScore: number;
  hybridScore: number;
  finalRank: number;
  matchExplanation: {
    semanticReasons: string[];
    conceptualConnections: Array<{
      queryTerm: string;
      artisanTerm: string;
      similarity: number;
      explanation: string;
    }>;
    confidenceLevel: number;
    scoringBreakdown: {
      semantic: { score: number; weight: number; contribution: number };
      keyword: { score: number; weight: number; contribution: number };
      location: { score: number; weight: number; contribution: number };
      performance: { score: number; weight: number; contribution: number };
    };
  };
  processingMetadata: {
    searchTime: number;
    vectorSimilarity: number;
    distanceKm?: number;
    optimizationsApplied: string[];
  };
}

export interface SemanticSearchMetrics {
  totalSearchTime: number;
  vectorSearchTime: number;
  hybridScoringTime: number;
  explanationTime: number;
  resultsCount: number;
  averageSemanticScore: number;
  averageHybridScore: number;
  cacheHitRate: number;
  optimizationsApplied: number;
}

export class SemanticSearchEngine {
  private vectorDB: VectorDatabase;
  private embeddingSystem: VectorEmbeddingSystem;
  private similaritySearch: SimilaritySearchEngine;
  private queryProcessor: QueryProcessor;
  private performanceOptimizer: VectorPerformanceOptimizer;
  private config: VectorConfig;
  private searchConfig: SemanticSearchConfig;
  
  // Learning and adaptation
  private searchHistory: Map<string, Array<{ query: string; results: SemanticMatchResult[]; timestamp: Date }>>;
  private userPreferences: Map<string, { weights: SemanticSearchConfig['hybridWeights']; lastUpdated: Date }>;
  
  constructor(
    vectorDB: VectorDatabase,
    embeddingSystem: VectorEmbeddingSystem,
    config: VectorConfig,
    searchConfig?: Partial<SemanticSearchConfig>
  ) {
    this.vectorDB = vectorDB;
    this.embeddingSystem = embeddingSystem;
    this.config = config;
    this.searchConfig = {
      hybridWeights: {
        semantic: 0.4,
        keyword: 0.2,
        location: 0.2,
        performance: 0.2
      },
      similarityThreshold: 0.3,
      maxResults: 50,
      enableExplanations: true,
      enableLearning: true,
      enablePerformanceOptimization: true,
      ...searchConfig
    };
    
    // Initialize components
    this.similaritySearch = new SimilaritySearchEngine(vectorDB, config);
    this.queryProcessor = new QueryProcessor();
    
    if (this.searchConfig.enablePerformanceOptimization) {
      this.performanceOptimizer = new VectorPerformanceOptimizer(
        vectorDB,
        this.similaritySearch,
        config
      );
    }
    
    // Initialize learning components
    this.searchHistory = new Map();
    this.userPreferences = new Map();
  }
  
  /**
   * Main semantic search method
   */
  async searchArtisans(
    query: string,
    buyerLocation?: LocationData,
    filters?: FilterCriteria,
    buyerId?: string
  ): Promise<{
    results: SemanticMatchResult[];
    metrics: SemanticSearchMetrics;
    processedQuery: ProcessedQuery;
  }> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting semantic search for: "${query}"`);
    
    try {
      // Step 1: Process and expand the query
      const processedQuery = await this.queryProcessor.processQuery(query);
      console.log(`📝 Query processed: ${processedQuery.extractedConcepts.length} concepts, confidence: ${(processedQuery.confidence * 100).toFixed(1)}%`);
      
      // Step 2: Generate query embedding
      const queryEmbedding = await this.embeddingSystem.generateQueryEmbedding(processedQuery.expandedQuery);
      console.log(`🧠 Query embedding generated in ${queryEmbedding.processingTime}ms`);
      
      // Step 3: Get user-specific weights if available
      const hybridWeights = this.getUserWeights(buyerId);
      
      // Step 4: Perform vector similarity search
      const vectorSearchStart = Date.now();
      const similarityQuery: SimilaritySearchQuery = {
        vector: queryEmbedding.queryVector,
        topK: Math.min(filters?.maxResults || this.searchConfig.maxResults, 100),
        threshold: filters?.minRelevanceScore || this.searchConfig.similarityThreshold,
        filters: this.buildVectorFilters(filters),
        includeMetadata: true,
        includeValues: false
      };
      
      let vectorResults;
      if (this.searchConfig.enablePerformanceOptimization && this.performanceOptimizer) {
        const optimizedResult = await this.performanceOptimizer.executeOptimizedSearch(similarityQuery);
        vectorResults = { results: optimizedResult.results, metrics: optimizedResult.metrics };
      } else {
        vectorResults = await this.similaritySearch.searchSimilar(similarityQuery);
      }
      
      const vectorSearchTime = Date.now() - vectorSearchStart;
      console.log(`🎯 Vector search completed in ${vectorSearchTime}ms, found ${vectorResults.results.length} candidates`);
      
      // Step 5: Get full artisan profiles
      const artisanIds = vectorResults.results.map(r => r.artisanId);
      const artisans = await this.getArtisanProfiles(artisanIds);
      console.log(`👥 Retrieved ${artisans.length} artisan profiles`);
      
      // Step 6: Calculate hybrid scores
      const hybridScoringStart = Date.now();
      const hybridResults = await this.calculateHybridScores(
        vectorResults.results,
        artisans,
        processedQuery,
        queryEmbedding,
        buyerLocation,
        hybridWeights
      );
      const hybridScoringTime = Date.now() - hybridScoringStart;
      
      // Step 7: Sort by hybrid score and apply final filtering
      const sortedResults = hybridResults
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, filters?.maxResults || this.searchConfig.maxResults)
        .map((result, index) => ({ ...result, finalRank: index + 1 }));
      
      // Step 8: Generate explanations
      const explanationStart = Date.now();
      if (this.searchConfig.enableExplanations) {
        await this.generateExplanations(sortedResults, processedQuery, queryEmbedding);
      }
      const explanationTime = Date.now() - explanationStart;
      
      // Step 9: Record search for learning
      if (this.searchConfig.enableLearning && buyerId) {
        this.recordSearch(buyerId, query, sortedResults);
      }
      
      const totalTime = Date.now() - startTime;
      
      const metrics: SemanticSearchMetrics = {
        totalSearchTime: totalTime,
        vectorSearchTime,
        hybridScoringTime,
        explanationTime,
        resultsCount: sortedResults.length,
        averageSemanticScore: this.calculateAverageScore(sortedResults, 'semanticScore'),
        averageHybridScore: this.calculateAverageScore(sortedResults, 'hybridScore'),
        cacheHitRate: vectorResults.metrics?.cacheHitRate || 0,
        optimizationsApplied: 0 // Would be set by performance optimizer
      };
      
      console.log(`✅ Semantic search completed in ${totalTime}ms`);
      console.log(`   📊 Results: ${sortedResults.length}, Avg semantic: ${(metrics.averageSemanticScore * 100).toFixed(1)}%, Avg hybrid: ${(metrics.averageHybridScore * 100).toFixed(1)}%`);
      
      return {
        results: sortedResults,
        metrics,
        processedQuery
      };
      
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      throw error;
    }
  }
  
  /**
   * Search for similar artisans based on an existing artisan
   */
  async findSimilarArtisans(
    artisanId: string,
    topK: number = 10,
    threshold: number = 0.5
  ): Promise<SemanticMatchResult[]> {
    console.log(`🔍 Finding similar artisans to: ${artisanId}`);
    
    try {
      const similarResults = await this.similaritySearch.findSimilarArtisans(artisanId, topK, threshold);
      
      // Convert to SemanticMatchResult format
      const artisanIds = similarResults.map(r => r.artisanId);
      const artisans = await this.getArtisanProfiles(artisanIds);
      
      const results: SemanticMatchResult[] = similarResults.map((result, index) => {
        const artisan = artisans.find(a => a.uid === result.artisanId);
        if (!artisan) throw new Error(`Artisan not found: ${result.artisanId}`);
        
        return {
          artisan,
          semanticScore: result.similarity,
          keywordScore: 0, // Not applicable for similarity search
          locationScore: 0, // Not applicable for similarity search
          performanceScore: this.calculatePerformanceScore(artisan),
          hybridScore: result.similarity,
          finalRank: index + 1,
          matchExplanation: {
            semanticReasons: result.explanation?.matchReasons || [],
            conceptualConnections: [],
            confidenceLevel: result.explanation?.confidenceLevel || 0,
            scoringBreakdown: {
              semantic: { score: result.similarity, weight: 1, contribution: result.similarity },
              keyword: { score: 0, weight: 0, contribution: 0 },
              location: { score: 0, weight: 0, contribution: 0 },
              performance: { score: 0, weight: 0, contribution: 0 }
            }
          },
          processingMetadata: {
            searchTime: 0,
            vectorSimilarity: result.similarity,
            optimizationsApplied: []
          }
        };
      });
      
      console.log(`✅ Found ${results.length} similar artisans`);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to find similar artisans:', error);
      throw error;
    }
  }
  
  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    buyerId: string,
    interactionHistory: Array<{ artisanId: string; interaction: 'viewed' | 'contacted' | 'hired'; timestamp: Date }>,
    topK: number = 20
  ): Promise<SemanticMatchResult[]> {
    console.log(`🎯 Generating personalized recommendations for buyer: ${buyerId}`);
    
    try {
      // Calculate interaction weights based on type and recency
      const weightedInteractions = interactionHistory.map(interaction => {
        const daysSince = (Date.now() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const recencyWeight = Math.exp(-daysSince / 30); // Exponential decay over 30 days
        
        let interactionWeight = 1;
        switch (interaction.interaction) {
          case 'hired': interactionWeight = 3; break;
          case 'contacted': interactionWeight = 2; break;
          case 'viewed': interactionWeight = 1; break;
        }
        
        return {
          artisanId: interaction.artisanId,
          interaction: interaction.interaction,
          weight: interactionWeight * recencyWeight
        };
      });
      
      // Get recommendations using similarity search
      const recommendations = await this.similaritySearch.getRecommendations(
        weightedInteractions,
        topK
      );
      
      // Convert to SemanticMatchResult format
      const artisanIds = recommendations.map(r => r.artisanId);
      const artisans = await this.getArtisanProfiles(artisanIds);
      
      const results: SemanticMatchResult[] = recommendations.map((result, index) => {
        const artisan = artisans.find(a => a.uid === result.artisanId);
        if (!artisan) throw new Error(`Artisan not found: ${result.artisanId}`);
        
        return {
          artisan,
          semanticScore: result.similarity,
          keywordScore: 0,
          locationScore: 0,
          performanceScore: this.calculatePerformanceScore(artisan),
          hybridScore: result.similarity,
          finalRank: index + 1,
          matchExplanation: {
            semanticReasons: ['Based on your interaction history', 'Similar to artisans you\'ve engaged with'],
            conceptualConnections: [],
            confidenceLevel: result.similarity,
            scoringBreakdown: {
              semantic: { score: result.similarity, weight: 1, contribution: result.similarity },
              keyword: { score: 0, weight: 0, contribution: 0 },
              location: { score: 0, weight: 0, contribution: 0 },
              performance: { score: 0, weight: 0, contribution: 0 }
            }
          },
          processingMetadata: {
            searchTime: 0,
            vectorSimilarity: result.similarity,
            optimizationsApplied: []
          }
        };
      });
      
      console.log(`✅ Generated ${results.length} personalized recommendations`);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to generate personalized recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Calculate hybrid scores combining semantic, keyword, location, and performance factors
   */
  private async calculateHybridScores(
    vectorResults: any[],
    artisans: IUser[],
    processedQuery: ProcessedQuery,
    queryEmbedding: QueryEmbedding,
    buyerLocation?: LocationData,
    hybridWeights?: SemanticSearchConfig['hybridWeights']
  ): Promise<SemanticMatchResult[]> {
    const weights = hybridWeights || this.searchConfig.hybridWeights;
    const results: SemanticMatchResult[] = [];
    
    for (const vectorResult of vectorResults) {
      const artisan = artisans.find(a => a.uid === vectorResult.artisanId);
      if (!artisan) continue;
      
      // Calculate individual scores
      const semanticScore = vectorResult.similarity;
      const keywordScore = this.calculateKeywordScore(processedQuery.originalQuery, artisan);
      const locationScore = buyerLocation ? this.calculateLocationScore(buyerLocation, artisan) : 0.5;
      const performanceScore = this.calculatePerformanceScore(artisan);
      
      // Calculate weighted hybrid score
      const hybridScore = (
        semanticScore * weights.semantic +
        keywordScore * weights.keyword +
        locationScore * weights.location +
        performanceScore * weights.performance
      );
      
      results.push({
        artisan,
        semanticScore,
        keywordScore,
        locationScore,
        performanceScore,
        hybridScore,
        finalRank: 0, // Will be set after sorting
        matchExplanation: {
          semanticReasons: [],
          conceptualConnections: [],
          confidenceLevel: 0,
          scoringBreakdown: {
            semantic: { score: semanticScore, weight: weights.semantic, contribution: semanticScore * weights.semantic },
            keyword: { score: keywordScore, weight: weights.keyword, contribution: keywordScore * weights.keyword },
            location: { score: locationScore, weight: weights.location, contribution: locationScore * weights.location },
            performance: { score: performanceScore, weight: weights.performance, contribution: performanceScore * weights.performance }
          }
        },
        processingMetadata: {
          searchTime: 0,
          vectorSimilarity: semanticScore,
          distanceKm: buyerLocation ? this.calculateDistance(buyerLocation, artisan) : undefined,
          optimizationsApplied: []
        }
      });
    }
    
    return results;
  }
  
  /**
   * Calculate keyword-based matching score
   */
  private calculateKeywordScore(query: string, artisan: IUser): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const artisanText = this.buildArtisanSearchText(artisan).toLowerCase();
    
    let matches = 0;
    for (const term of queryTerms) {
      if (term.length > 2 && artisanText.includes(term)) {
        matches++;
      }
    }
    
    return queryTerms.length > 0 ? matches / queryTerms.length : 0;
  }
  
  /**
   * Calculate location-based score
   */
  private calculateLocationScore(buyerLocation: LocationData, artisan: IUser): number {
    const artisanLocation = artisan.artisanConnectProfile?.locationData;
    if (!artisanLocation?.coordinates) return 0;
    
    const distance = this.calculateDistance(buyerLocation, artisan);
    const deliveryRadius = artisanLocation.deliveryRadius || 50;
    
    // Score based on delivery feasibility and proximity
    if (distance <= deliveryRadius) {
      // Within delivery range - score based on proximity
      return Math.max(0, 1 - (distance / deliveryRadius));
    } else {
      // Outside delivery range - low score
      return Math.max(0, 0.3 - (distance / 1000)); // Diminishing score for distant artisans
    }
  }
  
  /**
   * Calculate performance-based score
   */
  private calculatePerformanceScore(artisan: IUser): number {
    const metrics = artisan.artisanConnectProfile?.performanceMetrics;
    if (!metrics) return 0.5;
    
    const factors = [
      metrics.customerSatisfaction / 5, // Normalize to 0-1
      metrics.completionRate || 0.8,
      Math.min(1, (metrics.repeatCustomerRate || 0.3) * 2), // Cap at 1
      Math.max(0, 1 - ((metrics.responseTime || 24) / 48)) // Faster response = higher score
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }
  
  /**
   * Calculate distance between buyer and artisan
   */
  private calculateDistance(buyerLocation: LocationData, artisan: IUser): number {
    const artisanLocation = artisan.artisanConnectProfile?.locationData;
    if (!artisanLocation?.coordinates) return Infinity;
    
    return VectorUtils.calculateDistance(
      buyerLocation.coordinates,
      artisanLocation.coordinates
    );
  }
  
  /**
   * Build searchable text from artisan profile
   */
  private buildArtisanSearchText(artisan: IUser): string {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    const parts = [
      artisan.name,
      artisan.artisticProfession,
      artisan.description,
      profile?.specializations?.join(' '),
      matchingData?.skills?.join(' '),
      matchingData?.materials?.join(' '),
      matchingData?.techniques?.join(' '),
      matchingData?.portfolioKeywords?.join(' ')
    ].filter(Boolean);
    
    return parts.join(' ');
  }
  
  /**
   * Generate explanations for search results
   */
  private async generateExplanations(
    results: SemanticMatchResult[],
    processedQuery: ProcessedQuery,
    queryEmbedding: QueryEmbedding
  ): Promise<void> {
    for (const result of results) {
      // Generate semantic reasons
      const semanticReasons = this.generateSemanticReasons(result);
      
      // Generate conceptual connections
      const conceptualConnections = await this.generateConceptualConnections(
        processedQuery,
        result.artisan
      );
      
      // Calculate confidence level
      const confidenceLevel = this.calculateExplanationConfidence(result);
      
      result.matchExplanation = {
        ...result.matchExplanation,
        semanticReasons,
        conceptualConnections,
        confidenceLevel
      };
    }
  }
  
  /**
   * Generate semantic reasons for a match
   */
  private generateSemanticReasons(result: SemanticMatchResult): string[] {
    const reasons: string[] = [];
    
    if (result.semanticScore > 0.8) {
      reasons.push('Excellent semantic match with your requirements');
    } else if (result.semanticScore > 0.6) {
      reasons.push('Strong conceptual alignment with your needs');
    } else if (result.semanticScore > 0.4) {
      reasons.push('Good thematic match for your project');
    }
    
    if (result.keywordScore > 0.7) {
      reasons.push('Direct keyword matches in profile');
    }
    
    if (result.locationScore > 0.8) {
      reasons.push('Very close to your location');
    } else if (result.locationScore > 0.5) {
      reasons.push('Within reasonable delivery distance');
    }
    
    if (result.performanceScore > 0.8) {
      reasons.push('Excellent performance metrics');
    }
    
    return reasons;
  }
  
  /**
   * Generate conceptual connections between query and artisan
   */
  private async generateConceptualConnections(
    processedQuery: ProcessedQuery,
    artisan: IUser
  ): Promise<Array<{ queryTerm: string; artisanTerm: string; similarity: number; explanation: string }>> {
    const connections: Array<{ queryTerm: string; artisanTerm: string; similarity: number; explanation: string }> = [];
    
    const artisanTerms = this.extractArtisanTerms(artisan);
    
    for (const queryConcept of processedQuery.extractedConcepts) {
      for (const artisanTerm of artisanTerms) {
        const similarity = this.calculateTermSimilarity(queryConcept, artisanTerm);
        
        if (similarity > 0.7) {
          connections.push({
            queryTerm: queryConcept,
            artisanTerm,
            similarity,
            explanation: this.explainConceptConnection(queryConcept, artisanTerm)
          });
        }
      }
    }
    
    return connections.slice(0, 5); // Limit to top 5 connections
  }
  
  /**
   * Extract key terms from artisan profile
   */
  private extractArtisanTerms(artisan: IUser): string[] {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    const terms = [
      ...(matchingData?.skills || []),
      ...(matchingData?.materials || []),
      ...(matchingData?.techniques || []),
      ...(profile?.specializations || [])
    ];
    
    return [...new Set(terms)]; // Remove duplicates
  }
  
  /**
   * Calculate similarity between two terms
   */
  private calculateTermSimilarity(term1: string, term2: string): number {
    // Simple similarity calculation - could be enhanced with embeddings
    const t1 = term1.toLowerCase();
    const t2 = term2.toLowerCase();
    
    if (t1 === t2) return 1.0;
    if (t1.includes(t2) || t2.includes(t1)) return 0.8;
    
    // Check for common words
    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    
    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length);
    }
    
    return 0;
  }
  
  /**
   * Explain conceptual connection between terms
   */
  private explainConceptConnection(queryTerm: string, artisanTerm: string): string {
    if (queryTerm.toLowerCase() === artisanTerm.toLowerCase()) {
      return `Direct match: "${queryTerm}" matches "${artisanTerm}"`;
    }
    
    if (queryTerm.toLowerCase().includes(artisanTerm.toLowerCase()) || 
        artisanTerm.toLowerCase().includes(queryTerm.toLowerCase())) {
      return `Related terms: "${queryTerm}" and "${artisanTerm}" are closely related`;
    }
    
    return `Conceptual match between "${queryTerm}" and "${artisanTerm}"`;
  }
  
  /**
   * Calculate confidence level for explanations
   */
  private calculateExplanationConfidence(result: SemanticMatchResult): number {
    const factors = [
      result.semanticScore,
      result.keywordScore,
      result.locationScore > 0 ? result.locationScore : 0.5,
      result.performanceScore
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }
  
  /**
   * Helper methods
   */
  
  private buildVectorFilters(filters?: FilterCriteria): any {
    if (!filters) return {};
    
    const vectorFilters: any = {};
    
    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      vectorFilters.experienceLevel = { $in: filters.experienceLevel };
    }
    
    if (filters.artisanRating) {
      vectorFilters.rating = { $gte: filters.artisanRating };
    }
    
    if (filters.verifiedOnly) {
      vectorFilters.verified = true;
    }
    
    return vectorFilters;
  }
  
  private async getArtisanProfiles(artisanIds: string[]): Promise<IUser[]> {
    try {
      const User = (await import('../models/User')).default;
      return await User.find({ uid: { $in: artisanIds } }).lean();
    } catch (error) {
      console.error('❌ Failed to get artisan profiles:', error);
      return [];
    }
  }
  
  private getUserWeights(buyerId?: string): SemanticSearchConfig['hybridWeights'] {
    if (!buyerId || !this.searchConfig.enableLearning) {
      return this.searchConfig.hybridWeights;
    }
    
    const userPrefs = this.userPreferences.get(buyerId);
    return userPrefs?.weights || this.searchConfig.hybridWeights;
  }
  
  private recordSearch(buyerId: string, query: string, results: SemanticMatchResult[]): void {
    const history = this.searchHistory.get(buyerId) || [];
    history.push({
      query,
      results,
      timestamp: new Date()
    });
    
    // Keep only last 100 searches per user
    if (history.length > 100) {
      history.shift();
    }
    
    this.searchHistory.set(buyerId, history);
  }
  
  private calculateAverageScore(results: SemanticMatchResult[], scoreType: keyof SemanticMatchResult): number {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => r[scoreType] as number);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
  
  /**
   * Update user preferences based on interactions
   */
  updateUserPreferences(
    buyerId: string,
    interactions: Array<{ artisanId: string; action: 'viewed' | 'contacted' | 'hired' }>
  ): void {
    if (!this.searchConfig.enableLearning) return;
    
    // Simple learning algorithm - could be enhanced
    const currentWeights = this.getUserWeights(buyerId);
    const newWeights = { ...currentWeights };
    
    // Adjust weights based on successful interactions
    interactions.forEach(interaction => {
      if (interaction.action === 'hired') {
        // Increase semantic weight for successful hires
        newWeights.semantic = Math.min(0.6, newWeights.semantic + 0.05);
        newWeights.performance = Math.min(0.4, newWeights.performance + 0.02);
      }
    });
    
    this.userPreferences.set(buyerId, {
      weights: newWeights,
      lastUpdated: new Date()
    });
  }
  
  /**
   * Get search statistics
   */
  getSearchStats(): {
    totalSearches: number;
    averageResultsPerSearch: number;
    averageSearchTime: number;
    cacheHitRate: number;
  } {
    const allSearches = Array.from(this.searchHistory.values()).flat();
    
    return {
      totalSearches: allSearches.length,
      averageResultsPerSearch: allSearches.length > 0 
        ? allSearches.reduce((sum, search) => sum + search.results.length, 0) / allSearches.length 
        : 0,
      averageSearchTime: 0, // Would need to track this
      cacheHitRate: this.similaritySearch.getSearchStats().cacheHitRate
    };
  }
  
  /**
   * Clear search history and caches
   */
  clearHistory(): void {
    this.searchHistory.clear();
    this.userPreferences.clear();
    this.similaritySearch.clearCache();
  }
}

// Add distance calculation to VectorUtils if not already present
declare module './utils' {
  namespace VectorUtils {
    function calculateDistance(
      point1: { latitude: number; longitude: number },
      point2: { latitude: number; longitude: number }
    ): number;
  }
}

// Implement distance calculation if not in utils
if (!VectorUtils.calculateDistance) {
  (VectorUtils as any).calculateDistance = function(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
}

export default SemanticSearchEngine;