/**
 * Vector Similarity Search Engine
 * Advanced similarity search with ranking and filtering capabilities
 */

import { VectorDatabase, VectorSearchQuery, VectorSearchResult } from './database';
import { VectorUtils } from './utils';
import { VectorConfig } from './config';

export interface SimilaritySearchQuery {
  vector: number[];
  topK: number;
  threshold?: number;
  filters?: {
    artisanIds?: string[];
    experienceLevel?: string[];
    rating?: number;
    priceRange?: { min: number; max: number };
    location?: {
      latitude: number;
      longitude: number;
      radius: number; // in kilometers
    };
    materials?: string[];
    skills?: string[];
    verifiedOnly?: boolean;
  };
  includeMetadata?: boolean;
  includeValues?: boolean;
  searchMode?: 'exact' | 'approximate' | 'hybrid';
}

export interface SimilaritySearchResult {
  artisanId: string;
  similarity: number;
  rank: number;
  vector?: number[];
  metadata?: {
    profileHash?: string;
    modelVersion?: string;
    generatedAt?: string;
    confidence?: number;
    [key: string]: any;
  };
  explanation?: {
    similarityBreakdown: {
      profileSimilarity: number;
      skillsSimilarity: number;
      portfolioSimilarity: number;
    };
    matchReasons: string[];
    confidenceLevel: number;
  };
}

export interface SearchPerformanceMetrics {
  searchTime: number;
  resultsCount: number;
  averageSimilarity: number;
  filteringTime: number;
  rankingTime: number;
  cacheHitRate: number;
}

export interface SimilaritySearchConfig {
  defaultTopK: number;
  defaultThreshold: number;
  maxResults: number;
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number;
  enableExplanations: boolean;
  performanceTracking: boolean;
}

export class SimilaritySearchEngine {
  private vectorDB: VectorDatabase;
  private config: VectorConfig;
  private searchConfig: SimilaritySearchConfig;
  private searchCache: Map<string, { results: SimilaritySearchResult[]; timestamp: number }>;
  private performanceMetrics: Map<string, SearchPerformanceMetrics>;
  
  constructor(
    vectorDB: VectorDatabase,
    config: VectorConfig,
    searchConfig?: Partial<SimilaritySearchConfig>
  ) {
    this.vectorDB = vectorDB;
    this.config = config;
    this.searchConfig = {
      defaultTopK: 50,
      defaultThreshold: 0.3,
      maxResults: 100,
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      enableExplanations: true,
      performanceTracking: true,
      ...searchConfig
    };
    
    this.searchCache = new Map();
    this.performanceMetrics = new Map();
  }
  
  /**
   * Perform similarity search with advanced filtering and ranking
   */
  async searchSimilar(query: SimilaritySearchQuery): Promise<{
    results: SimilaritySearchResult[];
    metrics: SearchPerformanceMetrics;
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Performing similarity search (topK: ${query.topK}, threshold: ${query.threshold || 'default'})`);
      
      // Check cache first
      if (this.searchConfig.enableCaching) {
        const cached = this.getCachedResults(query);
        if (cached) {
          console.log('✅ Returning cached results');
          return {
            results: cached,
            metrics: this.generateMetrics(cached, Date.now() - startTime, true)
          };
        }
      }
      
      // Prepare vector database query
      const vectorQuery: VectorSearchQuery = {
        vector: query.vector,
        topK: Math.min(query.topK, this.searchConfig.maxResults),
        threshold: query.threshold || this.searchConfig.defaultThreshold,
        filters: this.buildVectorFilters(query.filters),
        includeMetadata: query.includeMetadata ?? true,
        includeValues: query.includeValues ?? false
      };
      
      // Perform vector search
      const vectorResults = await this.vectorDB.searchSimilar(
        this.config.vectorDB.indexName,
        vectorQuery
      );
      
      console.log(`📊 Vector search returned ${vectorResults.length} results`);
      
      // Apply additional filtering
      const filteredResults = this.applyAdditionalFilters(vectorResults, query.filters);
      
      // Rank and process results
      const rankedResults = await this.processAndRankResults(
        filteredResults,
        query,
        startTime
      );
      
      // Generate explanations if enabled
      if (this.searchConfig.enableExplanations) {
        await this.addExplanations(rankedResults, query.vector);
      }
      
      // Cache results
      if (this.searchConfig.enableCaching) {
        this.cacheResults(query, rankedResults);
      }
      
      const metrics = this.generateMetrics(rankedResults, Date.now() - startTime, false);
      
      console.log(`✅ Similarity search completed in ${metrics.searchTime}ms, found ${metrics.resultsCount} results`);
      
      return { results: rankedResults, metrics };
      
    } catch (error) {
      console.error('❌ Similarity search failed:', error);
      throw error;
    }
  }
  
  /**
   * Batch similarity search for multiple queries
   */
  async searchSimilarBatch(queries: SimilaritySearchQuery[]): Promise<{
    results: SimilaritySearchResult[][];
    aggregateMetrics: SearchPerformanceMetrics;
  }> {
    console.log(`🔄 Performing batch similarity search for ${queries.length} queries`);
    
    const startTime = Date.now();
    const results: SimilaritySearchResult[][] = [];
    let totalResults = 0;
    let totalSimilarity = 0;
    
    for (const query of queries) {
      const searchResult = await this.searchSimilar(query);
      results.push(searchResult.results);
      
      totalResults += searchResult.results.length;
      totalSimilarity += searchResult.results.reduce((sum, r) => sum + r.similarity, 0);
    }
    
    const aggregateMetrics: SearchPerformanceMetrics = {
      searchTime: Date.now() - startTime,
      resultsCount: totalResults,
      averageSimilarity: totalResults > 0 ? totalSimilarity / totalResults : 0,
      filteringTime: 0,
      rankingTime: 0,
      cacheHitRate: 0
    };
    
    console.log(`✅ Batch search completed in ${aggregateMetrics.searchTime}ms`);
    
    return { results, aggregateMetrics };
  }
  
  /**
   * Find most similar artisans to a given artisan
   */
  async findSimilarArtisans(
    artisanId: string,
    topK: number = 10,
    threshold: number = 0.5
  ): Promise<SimilaritySearchResult[]> {
    try {
      // Get the artisan's vector from the database
      const artisanVector = await this.getArtisanVector(artisanId);
      
      if (!artisanVector) {
        throw new Error(`Vector not found for artisan: ${artisanId}`);
      }
      
      // Search for similar artisans (excluding the original)
      const query: SimilaritySearchQuery = {
        vector: artisanVector,
        topK: topK + 1, // +1 to account for excluding the original
        threshold,
        filters: {
          artisanIds: [`!${artisanId}`] // Exclude the original artisan
        }
      };
      
      const { results } = await this.searchSimilar(query);
      
      // Remove the original artisan if it appears in results and limit to topK
      return results
        .filter(result => result.artisanId !== artisanId)
        .slice(0, topK);
        
    } catch (error) {
      console.error(`❌ Failed to find similar artisans for ${artisanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recommendations based on user interaction history
   */
  async getRecommendations(
    interactionHistory: Array<{ artisanId: string; interaction: 'viewed' | 'contacted' | 'hired'; weight: number }>,
    topK: number = 20
  ): Promise<SimilaritySearchResult[]> {
    try {
      console.log(`🎯 Generating recommendations based on ${interactionHistory.length} interactions`);
      
      // Get vectors for interacted artisans
      const interactionVectors: Array<{ vector: number[]; weight: number }> = [];
      
      for (const interaction of interactionHistory) {
        const vector = await this.getArtisanVector(interaction.artisanId);
        if (vector) {
          interactionVectors.push({
            vector,
            weight: interaction.weight
          });
        }
      }
      
      if (interactionVectors.length === 0) {
        throw new Error('No valid vectors found for interaction history');
      }
      
      // Create weighted average vector representing user preferences
      const preferenceVector = VectorUtils.weightedAverage(interactionVectors);
      
      // Search for similar artisans
      const query: SimilaritySearchQuery = {
        vector: preferenceVector,
        topK,
        threshold: 0.4,
        filters: {
          // Exclude artisans the user has already interacted with
          artisanIds: interactionHistory.map(i => `!${i.artisanId}`)
        }
      };
      
      const { results } = await this.searchSimilar(query);
      
      console.log(`✅ Generated ${results.length} recommendations`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Build vector database filters from search filters
   */
  private buildVectorFilters(filters?: SimilaritySearchQuery['filters']): Record<string, any> {
    if (!filters) return {};
    
    const vectorFilters: Record<string, any> = {};
    
    // Experience level filter
    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      vectorFilters.experienceLevel = { $in: filters.experienceLevel };
    }
    
    // Rating filter
    if (filters.rating) {
      vectorFilters.rating = { $gte: filters.rating };
    }
    
    // Verified only filter
    if (filters.verifiedOnly) {
      vectorFilters.verified = true;
    }
    
    return vectorFilters;
  }
  
  /**
   * Apply additional filters that can't be handled by vector database
   */
  private applyAdditionalFilters(
    results: VectorSearchResult[],
    filters?: SimilaritySearchQuery['filters']
  ): VectorSearchResult[] {
    if (!filters) return results;
    
    return results.filter(result => {
      // Artisan ID filters (including exclusions)
      if (filters.artisanIds) {
        const excludeIds = filters.artisanIds.filter(id => id.startsWith('!')).map(id => id.substring(1));
        const includeIds = filters.artisanIds.filter(id => !id.startsWith('!'));
        
        if (excludeIds.length > 0 && excludeIds.includes(result.id)) {
          return false;
        }
        
        if (includeIds.length > 0 && !includeIds.includes(result.id)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Process and rank search results
   */
  private async processAndRankResults(
    results: VectorSearchResult[],
    query: SimilaritySearchQuery,
    startTime: number
  ): Promise<SimilaritySearchResult[]> {
    const processedResults: SimilaritySearchResult[] = results.map((result, index) => ({
      artisanId: result.id,
      similarity: result.score,
      rank: index + 1,
      vector: result.values,
      metadata: result.metadata
    }));
    
    // Apply custom ranking if needed
    if (query.searchMode === 'hybrid') {
      return this.applyHybridRanking(processedResults, query);
    }
    
    return processedResults;
  }
  
  /**
   * Apply hybrid ranking combining similarity with other factors
   */
  private applyHybridRanking(
    results: SimilaritySearchResult[],
    query: SimilaritySearchQuery
  ): SimilaritySearchResult[] {
    return results.map(result => {
      let adjustedSimilarity = result.similarity;
      
      // Boost verified artisans
      if (result.metadata?.verified) {
        adjustedSimilarity *= 1.1;
      }
      
      // Boost high-rated artisans
      const rating = result.metadata?.rating || 0;
      if (rating > 4.5) {
        adjustedSimilarity *= 1.05;
      }
      
      return {
        ...result,
        similarity: Math.min(1, adjustedSimilarity)
      };
    }).sort((a, b) => b.similarity - a.similarity)
      .map((result, index) => ({ ...result, rank: index + 1 }));
  }
  
  /**
   * Add explanations to search results
   */
  private async addExplanations(
    results: SimilaritySearchResult[],
    queryVector: number[]
  ): Promise<void> {
    for (const result of results) {
      if (result.vector) {
        result.explanation = {
          similarityBreakdown: {
            profileSimilarity: result.similarity, // Simplified for now
            skillsSimilarity: result.similarity * 0.9,
            portfolioSimilarity: result.similarity * 0.8
          },
          matchReasons: this.generateMatchReasons(result),
          confidenceLevel: this.calculateConfidenceLevel(result.similarity)
        };
      }
    }
  }
  
  /**
   * Generate match reasons for a result
   */
  private generateMatchReasons(result: SimilaritySearchResult): string[] {
    const reasons: string[] = [];
    
    if (result.similarity > 0.8) {
      reasons.push('Excellent semantic match with your requirements');
    } else if (result.similarity > 0.6) {
      reasons.push('Strong conceptual alignment with your needs');
    } else if (result.similarity > 0.4) {
      reasons.push('Good thematic match for your project');
    }
    
    if (result.metadata?.verified) {
      reasons.push('Verified artisan profile');
    }
    
    if (result.metadata?.rating && result.metadata.rating > 4.5) {
      reasons.push('Highly rated by customers');
    }
    
    return reasons;
  }
  
  /**
   * Calculate confidence level for similarity score
   */
  private calculateConfidenceLevel(similarity: number): number {
    // Convert similarity to confidence (0-1 scale)
    return Math.min(1, similarity * 1.2);
  }
  
  /**
   * Get artisan vector from database
   */
  private async getArtisanVector(artisanId: string): Promise<number[] | null> {
    try {
      const results = await this.vectorDB.searchSimilar(
        this.config.vectorDB.indexName,
        {
          vector: new Array(this.config.embeddings.dimensions).fill(0), // Dummy vector
          topK: 1,
          filters: { id: artisanId },
          includeValues: true
        }
      );
      
      return results.length > 0 ? results[0].values || null : null;
    } catch (error) {
      console.error(`❌ Failed to get vector for artisan ${artisanId}:`, error);
      return null;
    }
  }
  
  /**
   * Cache management
   */
  private getCachedResults(query: SimilaritySearchQuery): SimilaritySearchResult[] | null {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.searchConfig.cacheTTL) {
      return cached.results;
    }
    
    return null;
  }
  
  private cacheResults(query: SimilaritySearchQuery, results: SimilaritySearchResult[]): void {
    const cacheKey = this.generateCacheKey(query);
    
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    // Implement LRU cache
    if (this.searchCache.size > this.searchConfig.cacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
  }
  
  private generateCacheKey(query: SimilaritySearchQuery): string {
    const keyData = {
      vector: VectorUtils.hashVector(query.vector),
      topK: query.topK,
      threshold: query.threshold,
      filters: query.filters
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }
  
  /**
   * Generate performance metrics
   */
  private generateMetrics(
    results: SimilaritySearchResult[],
    searchTime: number,
    fromCache: boolean
  ): SearchPerformanceMetrics {
    const averageSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;
    
    return {
      searchTime,
      resultsCount: results.length,
      averageSimilarity,
      filteringTime: 0, // Would need to track separately
      rankingTime: 0, // Would need to track separately
      cacheHitRate: fromCache ? 1 : 0
    };
  }
  
  /**
   * Get search statistics
   */
  getSearchStats(): {
    cacheSize: number;
    cacheHitRate: number;
    averageSearchTime: number;
    totalSearches: number;
  } {
    const metrics = Array.from(this.performanceMetrics.values());
    
    return {
      cacheSize: this.searchCache.size,
      cacheHitRate: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length 
        : 0,
      averageSearchTime: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.searchTime, 0) / metrics.length
        : 0,
      totalSearches: metrics.length
    };
  }
  
  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
  
  /**
   * Validate search query
   */
  validateSearchQuery(query: SimilaritySearchQuery): boolean {
    return (
      Array.isArray(query.vector) &&
      query.vector.length === this.config.embeddings.dimensions &&
      VectorUtils.isValidVector(query.vector) &&
      query.topK > 0 &&
      query.topK <= this.searchConfig.maxResults &&
      (!query.threshold || (query.threshold >= 0 && query.threshold <= 1))
    );
  }
}

export default SimilaritySearchEngine;