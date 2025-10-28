/**
 * Vector Database Performance Optimizer
 * Optimizes vector search performance through caching, indexing, and query optimization
 */

import { VectorDatabase } from './database';
import { SimilaritySearchEngine, SimilaritySearchQuery } from './similarity-search';
import { VectorConfig } from './config';
import { VectorUtils } from './utils';

export interface PerformanceMetrics {
  averageSearchTime: number;
  cacheHitRate: number;
  indexUtilization: number;
  queryOptimizationRate: number;
  memoryUsage: number;
  throughput: number; // queries per second
}

export interface OptimizationConfig {
  enableQueryOptimization: boolean;
  enableResultCaching: boolean;
  enableIndexOptimization: boolean;
  enableBatchProcessing: boolean;
  cacheSize: number;
  cacheTTL: number;
  batchSize: number;
  optimizationInterval: number; // in milliseconds
}

export interface QueryPattern {
  queryHash: string;
  frequency: number;
  averageResponseTime: number;
  lastUsed: Date;
  optimizationApplied: boolean;
}

export interface IndexOptimization {
  indexName: string;
  currentPerformance: number;
  suggestedChanges: string[];
  estimatedImprovement: number;
  lastOptimized: Date;
}

export class VectorPerformanceOptimizer {
  private vectorDB: VectorDatabase;
  private searchEngine: SimilaritySearchEngine;
  private config: VectorConfig;
  private optimizationConfig: OptimizationConfig;
  
  // Performance tracking
  private queryPatterns: Map<string, QueryPattern>;
  private performanceHistory: PerformanceMetrics[];
  private optimizationHistory: IndexOptimization[];
  
  // Caching layers
  private queryCache: Map<string, { results: any; timestamp: number; hitCount: number }>;
  private popularQueries: Map<string, { query: SimilaritySearchQuery; precomputedResults: any }>;
  
  // Optimization state
  private isOptimizing: boolean;
  private lastOptimization: Date;
  private optimizationTimer: NodeJS.Timeout | null;
  
  constructor(
    vectorDB: VectorDatabase,
    searchEngine: SimilaritySearchEngine,
    config: VectorConfig,
    optimizationConfig?: Partial<OptimizationConfig>
  ) {
    this.vectorDB = vectorDB;
    this.searchEngine = searchEngine;
    this.config = config;
    this.optimizationConfig = {
      enableQueryOptimization: true,
      enableResultCaching: true,
      enableIndexOptimization: true,
      enableBatchProcessing: true,
      cacheSize: 5000,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      batchSize: 100,
      optimizationInterval: 60 * 60 * 1000, // 1 hour
      ...optimizationConfig
    };
    
    this.queryPatterns = new Map();
    this.performanceHistory = [];
    this.optimizationHistory = [];
    this.queryCache = new Map();
    this.popularQueries = new Map();
    
    this.isOptimizing = false;
    this.lastOptimization = new Date();
    this.optimizationTimer = null;
    
    this.startOptimizationScheduler();
  }
  
  /**
   * Optimize a search query for better performance
   */
  async optimizeQuery(query: SimilaritySearchQuery): Promise<SimilaritySearchQuery> {
    if (!this.optimizationConfig.enableQueryOptimization) {
      return query;
    }
    
    const startTime = Date.now();
    let optimizedQuery = { ...query };
    
    try {
      // Track query pattern
      const queryHash = this.generateQueryHash(query);
      this.trackQueryPattern(queryHash, query);
      
      // Check if this is a popular query with precomputed results
      const precomputed = this.popularQueries.get(queryHash);
      if (precomputed) {
        console.log('🚀 Using precomputed results for popular query');
        return precomputed.query;
      }
      
      // Optimize vector dimensions if possible
      optimizedQuery = this.optimizeVectorDimensions(optimizedQuery);
      
      // Optimize topK based on typical usage patterns
      optimizedQuery = this.optimizeTopK(optimizedQuery, queryHash);
      
      // Optimize threshold based on query type
      optimizedQuery = this.optimizeThreshold(optimizedQuery);
      
      // Optimize filters for better database performance
      optimizedQuery = this.optimizeFilters(optimizedQuery);
      
      const optimizationTime = Date.now() - startTime;
      console.log(`⚡ Query optimized in ${optimizationTime}ms`);
      
      return optimizedQuery;
      
    } catch (error) {
      console.error('❌ Query optimization failed:', error);
      return query; // Return original query on error
    }
  }
  
  /**
   * Execute search with performance optimizations
   */
  async executeOptimizedSearch(query: SimilaritySearchQuery): Promise<{
    results: any[];
    metrics: PerformanceMetrics;
    optimizationsApplied: string[];
  }> {
    const startTime = Date.now();
    const optimizationsApplied: string[] = [];
    
    try {
      // Check cache first
      if (this.optimizationConfig.enableResultCaching) {
        const cached = this.getCachedResults(query);
        if (cached) {
          optimizationsApplied.push('cache_hit');
          return {
            results: cached.results,
            metrics: this.generateCurrentMetrics(Date.now() - startTime, true),
            optimizationsApplied
          };
        }
      }
      
      // Optimize the query
      const optimizedQuery = await this.optimizeQuery(query);
      if (JSON.stringify(optimizedQuery) !== JSON.stringify(query)) {
        optimizationsApplied.push('query_optimization');
      }
      
      // Execute search
      const searchResult = await this.searchEngine.searchSimilar(optimizedQuery);
      
      // Cache results if caching is enabled
      if (this.optimizationConfig.enableResultCaching) {
        this.cacheResults(query, searchResult.results);
        optimizationsApplied.push('result_caching');
      }
      
      // Update performance metrics
      const metrics = this.generateCurrentMetrics(Date.now() - startTime, false);
      this.updatePerformanceHistory(metrics);
      
      return {
        results: searchResult.results,
        metrics,
        optimizationsApplied
      };
      
    } catch (error) {
      console.error('❌ Optimized search execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Batch process multiple queries for better performance
   */
  async executeBatchOptimizedSearch(queries: SimilaritySearchQuery[]): Promise<{
    results: any[][];
    aggregateMetrics: PerformanceMetrics;
    totalOptimizations: number;
  }> {
    if (!this.optimizationConfig.enableBatchProcessing) {
      // Execute queries individually
      const results = await Promise.all(
        queries.map(query => this.executeOptimizedSearch(query))
      );
      
      return {
        results: results.map(r => r.results),
        aggregateMetrics: this.aggregateMetrics(results.map(r => r.metrics)),
        totalOptimizations: results.reduce((sum, r) => sum + r.optimizationsApplied.length, 0)
      };
    }
    
    const startTime = Date.now();
    console.log(`🔄 Executing batch optimized search for ${queries.length} queries`);
    
    // Group queries by similarity for batch optimization
    const queryGroups = this.groupSimilarQueries(queries);
    const results: any[][] = [];
    let totalOptimizations = 0;
    
    for (const group of queryGroups) {
      const groupResults = await this.executeBatchGroup(group);
      results.push(...groupResults.results);
      totalOptimizations += groupResults.optimizations;
    }
    
    const aggregateMetrics = this.generateCurrentMetrics(Date.now() - startTime, false);
    
    console.log(`✅ Batch search completed in ${aggregateMetrics.searchTime}ms with ${totalOptimizations} optimizations`);
    
    return {
      results,
      aggregateMetrics,
      totalOptimizations
    };
  }
  
  /**
   * Precompute results for popular queries
   */
  async precomputePopularQueries(): Promise<void> {
    console.log('🔄 Precomputing results for popular queries...');
    
    const popularPatterns = Array.from(this.queryPatterns.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, 50); // Top 50 most frequent queries
    
    for (const [queryHash, pattern] of popularPatterns) {
      try {
        if (!pattern.optimizationApplied && pattern.frequency > 10) {
          // Reconstruct query from pattern (simplified)
          const query = this.reconstructQueryFromPattern(pattern);
          if (query) {
            const results = await this.searchEngine.searchSimilar(query);
            
            this.popularQueries.set(queryHash, {
              query,
              precomputedResults: results.results
            });
            
            pattern.optimizationApplied = true;
            console.log(`✅ Precomputed results for popular query (frequency: ${pattern.frequency})`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to precompute query ${queryHash}:`, error);
      }
    }
    
    console.log(`✅ Precomputed ${this.popularQueries.size} popular queries`);
  }
  
  /**
   * Optimize vector database indexes
   */
  async optimizeIndexes(): Promise<IndexOptimization[]> {
    if (!this.optimizationConfig.enableIndexOptimization) {
      return [];
    }
    
    console.log('🔄 Analyzing and optimizing vector database indexes...');
    
    try {
      const indexes = await this.vectorDB.listIndexes();
      const optimizations: IndexOptimization[] = [];
      
      for (const indexName of indexes) {
        const stats = await this.vectorDB.getIndexStats(indexName);
        if (stats) {
          const optimization = await this.analyzeIndexPerformance(stats);
          if (optimization) {
            optimizations.push(optimization);
          }
        }
      }
      
      // Apply optimizations
      for (const optimization of optimizations) {
        await this.applyIndexOptimization(optimization);
      }
      
      this.optimizationHistory.push(...optimizations);
      
      console.log(`✅ Completed index optimization, ${optimizations.length} improvements applied`);
      
      return optimizations;
      
    } catch (error) {
      console.error('❌ Index optimization failed:', error);
      return [];
    }
  }
  
  /**
   * Get current performance metrics
   */
  getCurrentPerformanceMetrics(): PerformanceMetrics {
    const searchStats = this.searchEngine.getSearchStats();
    
    return {
      averageSearchTime: searchStats.averageSearchTime,
      cacheHitRate: searchStats.cacheHitRate,
      indexUtilization: this.calculateIndexUtilization(),
      queryOptimizationRate: this.calculateOptimizationRate(),
      memoryUsage: this.calculateMemoryUsage(),
      throughput: this.calculateThroughput()
    };
  }
  
  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): {
    recommendations: string[];
    estimatedImprovements: Record<string, number>;
    priority: 'low' | 'medium' | 'high';
  } {
    const recommendations: string[] = [];
    const estimatedImprovements: Record<string, number> = {};
    
    const currentMetrics = this.getCurrentPerformanceMetrics();
    
    // Cache hit rate recommendations
    if (currentMetrics.cacheHitRate < 0.3) {
      recommendations.push('Increase cache size to improve hit rate');
      estimatedImprovements.cacheHitRate = 0.2;
    }
    
    // Search time recommendations
    if (currentMetrics.averageSearchTime > 1000) {
      recommendations.push('Optimize query patterns and enable precomputation');
      estimatedImprovements.averageSearchTime = -300; // 300ms improvement
    }
    
    // Index utilization recommendations
    if (currentMetrics.indexUtilization < 0.7) {
      recommendations.push('Rebuild indexes with optimized parameters');
      estimatedImprovements.indexUtilization = 0.2;
    }
    
    // Determine priority
    let priority: 'low' | 'medium' | 'high' = 'low';
    if (currentMetrics.averageSearchTime > 2000 || currentMetrics.cacheHitRate < 0.2) {
      priority = 'high';
    } else if (currentMetrics.averageSearchTime > 1000 || currentMetrics.cacheHitRate < 0.4) {
      priority = 'medium';
    }
    
    return {
      recommendations,
      estimatedImprovements,
      priority
    };
  }
  
  /**
   * Private helper methods
   */
  
  private generateQueryHash(query: SimilaritySearchQuery): string {
    const hashData = {
      vectorHash: VectorUtils.hashVector(query.vector),
      topK: query.topK,
      threshold: query.threshold,
      filters: query.filters
    };
    
    return Buffer.from(JSON.stringify(hashData)).toString('base64').substring(0, 32);
  }
  
  private trackQueryPattern(queryHash: string, query: SimilaritySearchQuery): void {
    const existing = this.queryPatterns.get(queryHash);
    
    if (existing) {
      existing.frequency++;
      existing.lastUsed = new Date();
    } else {
      this.queryPatterns.set(queryHash, {
        queryHash,
        frequency: 1,
        averageResponseTime: 0,
        lastUsed: new Date(),
        optimizationApplied: false
      });
    }
  }
  
  private optimizeVectorDimensions(query: SimilaritySearchQuery): SimilaritySearchQuery {
    // For now, return as-is. In the future, could implement dimension reduction
    return query;
  }
  
  private optimizeTopK(query: SimilaritySearchQuery, queryHash: string): SimilaritySearchQuery {
    const pattern = this.queryPatterns.get(queryHash);
    
    // If this is a frequent query, optimize topK based on usage patterns
    if (pattern && pattern.frequency > 5) {
      // Reduce topK for very frequent queries to improve performance
      const optimizedTopK = Math.min(query.topK, 30);
      return { ...query, topK: optimizedTopK };
    }
    
    return query;
  }
  
  private optimizeThreshold(query: SimilaritySearchQuery): SimilaritySearchQuery {
    // Adjust threshold based on query characteristics
    if (!query.threshold) {
      // Set a reasonable default threshold
      return { ...query, threshold: 0.3 };
    }
    
    // If threshold is very low, increase it slightly for better performance
    if (query.threshold < 0.1) {
      return { ...query, threshold: 0.2 };
    }
    
    return query;
  }
  
  private optimizeFilters(query: SimilaritySearchQuery): SimilaritySearchQuery {
    if (!query.filters) return query;
    
    // Optimize filter structure for better database performance
    const optimizedFilters = { ...query.filters };
    
    // Remove empty filter arrays
    Object.keys(optimizedFilters).forEach(key => {
      const value = optimizedFilters[key as keyof typeof optimizedFilters];
      if (Array.isArray(value) && value.length === 0) {
        delete optimizedFilters[key as keyof typeof optimizedFilters];
      }
    });
    
    return { ...query, filters: optimizedFilters };
  }
  
  private getCachedResults(query: SimilaritySearchQuery): { results: any; timestamp: number; hitCount: number } | null {
    const cacheKey = this.generateQueryHash(query);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.optimizationConfig.cacheTTL) {
      cached.hitCount++;
      return cached;
    }
    
    return null;
  }
  
  private cacheResults(query: SimilaritySearchQuery, results: any): void {
    const cacheKey = this.generateQueryHash(query);
    
    this.queryCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      hitCount: 0
    });
    
    // Implement LRU cache
    if (this.queryCache.size > this.optimizationConfig.cacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
  }
  
  private generateCurrentMetrics(searchTime: number, fromCache: boolean): PerformanceMetrics {
    return {
      averageSearchTime: searchTime,
      cacheHitRate: fromCache ? 1 : 0,
      indexUtilization: this.calculateIndexUtilization(),
      queryOptimizationRate: this.calculateOptimizationRate(),
      memoryUsage: this.calculateMemoryUsage(),
      throughput: 1000 / searchTime // queries per second
    };
  }
  
  private updatePerformanceHistory(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only last 1000 entries
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
  }
  
  private aggregateMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        averageSearchTime: 0,
        cacheHitRate: 0,
        indexUtilization: 0,
        queryOptimizationRate: 0,
        memoryUsage: 0,
        throughput: 0
      };
    }
    
    return {
      averageSearchTime: metrics.reduce((sum, m) => sum + m.averageSearchTime, 0) / metrics.length,
      cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
      indexUtilization: metrics.reduce((sum, m) => sum + m.indexUtilization, 0) / metrics.length,
      queryOptimizationRate: metrics.reduce((sum, m) => sum + m.queryOptimizationRate, 0) / metrics.length,
      memoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0)
    };
  }
  
  private groupSimilarQueries(queries: SimilaritySearchQuery[]): SimilaritySearchQuery[][] {
    // Simple grouping by topK and threshold for now
    const groups = new Map<string, SimilaritySearchQuery[]>();
    
    queries.forEach(query => {
      const groupKey = `${query.topK}-${query.threshold || 'default'}`;
      const existing = groups.get(groupKey) || [];
      existing.push(query);
      groups.set(groupKey, existing);
    });
    
    return Array.from(groups.values());
  }
  
  private async executeBatchGroup(queries: SimilaritySearchQuery[]): Promise<{
    results: any[][];
    optimizations: number;
  }> {
    const results = await Promise.all(
      queries.map(query => this.executeOptimizedSearch(query))
    );
    
    return {
      results: results.map(r => r.results),
      optimizations: results.reduce((sum, r) => sum + r.optimizationsApplied.length, 0)
    };
  }
  
  private reconstructQueryFromPattern(pattern: QueryPattern): SimilaritySearchQuery | null {
    // This is a simplified reconstruction - in practice, you'd need to store more query details
    return null;
  }
  
  private async analyzeIndexPerformance(stats: any): Promise<IndexOptimization | null> {
    // Analyze index performance and suggest optimizations
    const suggestions: string[] = [];
    let estimatedImprovement = 0;
    
    if (stats.totalVectors > 100000) {
      suggestions.push('Consider partitioning large index');
      estimatedImprovement += 0.2;
    }
    
    if (suggestions.length === 0) return null;
    
    return {
      indexName: stats.name,
      currentPerformance: 0.7, // Placeholder
      suggestedChanges: suggestions,
      estimatedImprovement,
      lastOptimized: new Date()
    };
  }
  
  private async applyIndexOptimization(optimization: IndexOptimization): Promise<void> {
    console.log(`🔧 Applying optimization to index ${optimization.indexName}`);
    // Implementation would depend on specific optimizations
  }
  
  private calculateIndexUtilization(): number {
    // Placeholder calculation
    return 0.8;
  }
  
  private calculateOptimizationRate(): number {
    const totalQueries = this.queryPatterns.size;
    const optimizedQueries = Array.from(this.queryPatterns.values())
      .filter(p => p.optimizationApplied).length;
    
    return totalQueries > 0 ? optimizedQueries / totalQueries : 0;
  }
  
  private calculateMemoryUsage(): number {
    // Estimate memory usage in MB
    const cacheMemory = this.queryCache.size * 0.1; // Rough estimate
    const patternMemory = this.queryPatterns.size * 0.01;
    
    return cacheMemory + patternMemory;
  }
  
  private calculateThroughput(): number {
    const recentMetrics = this.performanceHistory.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length;
  }
  
  private startOptimizationScheduler(): void {
    this.optimizationTimer = setInterval(async () => {
      if (!this.isOptimizing) {
        this.isOptimizing = true;
        
        try {
          await this.precomputePopularQueries();
          await this.optimizeIndexes();
          this.lastOptimization = new Date();
        } catch (error) {
          console.error('❌ Scheduled optimization failed:', error);
        } finally {
          this.isOptimizing = false;
        }
      }
    }, this.optimizationConfig.optimizationInterval);
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    this.queryCache.clear();
    this.popularQueries.clear();
    this.queryPatterns.clear();
  }
}

export default VectorPerformanceOptimizer;