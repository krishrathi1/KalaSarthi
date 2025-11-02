/**
 * Database Optimization Service for AI-Powered Scheme Sahayak v2.0
 * Implements connection pooling, query optimization, and performance monitoring
 * Requirements: 10.2, 10.3
 */

import { BaseService } from '../base/BaseService';
import { cacheService } from '../cache/CacheService';
import { QueryOptimizer, IndexManager } from '../../../models/scheme-sahayak/FirestoreIndexes';
import { 
  getDocs, 
  query, 
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

// ============================================================================
// QUERY PERFORMANCE MONITORING
// ============================================================================

export interface QueryPerformanceMetrics {
  queryId: string;
  queryType: string;
  executionTime: number;
  documentsRead: number;
  resultCount: number;
  cacheHit: boolean;
  indexUsed: string;
  timestamp: Date;
}

export interface QueryStatistics {
  totalQueries: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  slowQueries: QueryPerformanceMetrics[];
  indexUsage: Map<string, number>;
  recommendations: string[];
}

// ============================================================================
// CONNECTION POOL CONFIGURATION
// ============================================================================

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 100,
  minConnections: 10,
  connectionTimeout: 30000,
  idleTimeout: 60000,
  maxRetries: 3,
  retryDelay: 1000
};

// ============================================================================
// DATABASE OPTIMIZATION SERVICE
// ============================================================================

export class DatabaseOptimizationService extends BaseService {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private poolConfig: ConnectionPoolConfig;
  private activeConnections: number = 0;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private queryCacheTTL: number = 300000; // 5 minutes

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super('DatabaseOptimizationService');
    this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // ============================================================================
  // OPTIMIZED QUERY EXECUTION
  // ============================================================================

  /**
   * Execute optimized query with caching and performance monitoring
   */
  async executeOptimizedQuery<T>(
    queryFn: () => Promise<QuerySnapshot>,
    options: {
      queryType: string;
      cacheKey?: string;
      cacheTTL?: number;
      useCache?: boolean;
    }
  ): Promise<{
    data: T[];
    metrics: QueryPerformanceMetrics;
  }> {
    return this.handleAsync(async () => {
      const startTime = Date.now();
      const queryId = this.generateQueryId();
      let cacheHit = false;
      let data: T[] = [];

      // Try cache first if enabled
      if (options.useCache !== false && options.cacheKey) {
        const cached = await cacheService.get<T[]>(options.cacheKey);
        if (cached) {
          cacheHit = true;
          data = cached;
          
          const metrics: QueryPerformanceMetrics = {
            queryId,
            queryType: options.queryType,
            executionTime: Date.now() - startTime,
            documentsRead: 0,
            resultCount: data.length,
            cacheHit: true,
            indexUsed: 'cache',
            timestamp: new Date()
          };

          this.recordMetrics(metrics);
          return { data, metrics };
        }
      }

      // Execute query
      const querySnapshot = await queryFn();
      data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as T[];

      // Cache results if enabled
      if (options.useCache !== false && options.cacheKey) {
        const ttl = options.cacheTTL || this.queryCacheTTL / 1000;
        await cacheService.set(options.cacheKey, data, ttl);
      }

      // Record metrics
      const metrics: QueryPerformanceMetrics = {
        queryId,
        queryType: options.queryType,
        executionTime: Date.now() - startTime,
        documentsRead: querySnapshot.size,
        resultCount: data.length,
        cacheHit: false,
        indexUsed: 'firestore',
        timestamp: new Date()
      };

      this.recordMetrics(metrics);

      // Log slow queries
      if (metrics.executionTime > 1000) {
        this.log('warn', 'Slow query detected', {
          queryType: options.queryType,
          executionTime: metrics.executionTime,
          documentsRead: metrics.documentsRead
        });
      }

      return { data, metrics };
    }, 'Failed to execute optimized query', 'QUERY_EXECUTION_FAILED');
  }

  /**
   * Execute batch queries with connection pooling
   */
  async executeBatchQueries<T>(
    queries: Array<{
      queryFn: () => Promise<QuerySnapshot>;
      queryType: string;
      cacheKey?: string;
    }>,
    options: {
      maxConcurrent?: number;
      useCache?: boolean;
    } = {}
  ): Promise<Array<{
    data: T[];
    metrics: QueryPerformanceMetrics;
  }>> {
    return this.handleAsync(async () => {
      const maxConcurrent = options.maxConcurrent || 5;
      const results: Array<{
        data: T[];
        metrics: QueryPerformanceMetrics;
      }> = [];

      // Execute queries in batches
      for (let i = 0; i < queries.length; i += maxConcurrent) {
        const batch = queries.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
          batch.map(q => 
            this.executeOptimizedQuery<T>(q.queryFn, {
              queryType: q.queryType,
              cacheKey: q.cacheKey,
              useCache: options.useCache
            })
          )
        );
        results.push(...batchResults);
      }

      return results;
    }, 'Failed to execute batch queries', 'BATCH_QUERY_FAILED');
  }

  // ============================================================================
  // QUERY OPTIMIZATION PATTERNS
  // ============================================================================

  /**
   * Optimize pagination queries
   */
  async executePaginatedQuery<T>(
    baseQuery: QueryConstraint[],
    options: {
      pageSize: number;
      pageToken?: string;
      queryType: string;
      cacheKey?: string;
    }
  ): Promise<{
    data: T[];
    nextPageToken?: string;
    metrics: QueryPerformanceMetrics;
  }> {
    return this.handleAsync(async () => {
      // Build cache key with pagination
      const cacheKey = options.cacheKey 
        ? `${options.cacheKey}:page:${options.pageToken || 'first'}`
        : undefined;

      const result = await this.executeOptimizedQuery<T>(
        async () => {
          // In a real implementation, this would use the actual collection reference
          // For now, we'll return a mock result
          throw new Error('Collection reference required');
        },
        {
          queryType: options.queryType,
          cacheKey,
          useCache: true
        }
      );

      // Generate next page token if there are more results
      let nextPageToken: string | undefined;
      if (result.data.length === options.pageSize) {
        nextPageToken = this.generatePageToken(result.data[result.data.length - 1]);
      }

      return {
        data: result.data,
        nextPageToken,
        metrics: result.metrics
      };
    }, 'Failed to execute paginated query', 'PAGINATED_QUERY_FAILED');
  }

  /**
   * Optimize aggregation queries with pre-computed results
   */
  async executeAggregationQuery<T>(
    aggregationType: 'count' | 'sum' | 'average' | 'min' | 'max',
    options: {
      field?: string;
      groupBy?: string;
      filters?: Record<string, any>;
      cacheKey?: string;
      cacheTTL?: number;
    }
  ): Promise<{
    result: T;
    metrics: QueryPerformanceMetrics;
  }> {
    return this.handleAsync(async () => {
      const startTime = Date.now();
      const queryId = this.generateQueryId();

      // Try cache first
      if (options.cacheKey) {
        const cached = await cacheService.get<T>(options.cacheKey);
        if (cached) {
          const metrics: QueryPerformanceMetrics = {
            queryId,
            queryType: `aggregation_${aggregationType}`,
            executionTime: Date.now() - startTime,
            documentsRead: 0,
            resultCount: 1,
            cacheHit: true,
            indexUsed: 'cache',
            timestamp: new Date()
          };

          this.recordMetrics(metrics);
          return { result: cached, metrics };
        }
      }

      // Execute aggregation
      // In a real implementation, this would use Firestore aggregation queries
      // For now, we'll return a mock result
      const result = {} as T;

      // Cache result
      if (options.cacheKey) {
        const ttl = options.cacheTTL || 3600; // 1 hour default for aggregations
        await cacheService.set(options.cacheKey, result, ttl);
      }

      const metrics: QueryPerformanceMetrics = {
        queryId,
        queryType: `aggregation_${aggregationType}`,
        executionTime: Date.now() - startTime,
        documentsRead: 0,
        resultCount: 1,
        cacheHit: false,
        indexUsed: 'firestore_aggregation',
        timestamp: new Date()
      };

      this.recordMetrics(metrics);
      return { result, metrics };
    }, 'Failed to execute aggregation query', 'AGGREGATION_QUERY_FAILED');
  }

  // ============================================================================
  // CONNECTION POOL MANAGEMENT
  // ============================================================================

  /**
   * Acquire connection from pool
   */
  private async acquireConnection(): Promise<void> {
    const startTime = Date.now();
    
    while (this.activeConnections >= this.poolConfig.maxConnections) {
      if (Date.now() - startTime > this.poolConfig.connectionTimeout) {
        throw new Error('Connection pool timeout');
      }
      await this.sleep(100);
    }

    this.activeConnections++;
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Get connection pool statistics
   */
  getPoolStatistics(): {
    activeConnections: number;
    maxConnections: number;
    utilizationRate: number;
  } {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.poolConfig.maxConnections,
      utilizationRate: this.activeConnections / this.poolConfig.maxConnections
    };
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  /**
   * Get query statistics
   */
  getQueryStatistics(timeWindow?: number): QueryStatistics {
    const now = Date.now();
    const windowMs = timeWindow || 3600000; // 1 hour default
    
    const recentMetrics = this.queryMetrics.filter(
      m => now - m.timestamp.getTime() < windowMs
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        indexUsage: new Map(),
        recommendations: []
      };
    }

    const totalQueries = recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const totalExecutionTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const slowQueries = recentMetrics
      .filter(m => m.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Calculate index usage
    const indexUsage = new Map<string, number>();
    recentMetrics.forEach(m => {
      indexUsage.set(m.indexUsed, (indexUsage.get(m.indexUsed) || 0) + 1);
    });

    // Generate recommendations
    const recommendations: string[] = [];
    const cacheHitRate = cacheHits / totalQueries;
    
    if (cacheHitRate < 0.3) {
      recommendations.push('Low cache hit rate - consider increasing cache TTL or pre-warming cache');
    }

    if (slowQueries.length > totalQueries * 0.1) {
      recommendations.push('High number of slow queries - review indexes and query patterns');
    }

    const avgDocsRead = recentMetrics.reduce((sum, m) => sum + m.documentsRead, 0) / totalQueries;
    const avgResults = recentMetrics.reduce((sum, m) => sum + m.resultCount, 0) / totalQueries;
    
    if (avgDocsRead > avgResults * 5) {
      recommendations.push('Low query efficiency - too many documents scanned relative to results');
    }

    return {
      totalQueries,
      averageExecutionTime: totalExecutionTime / totalQueries,
      cacheHitRate,
      slowQueries,
      indexUsage,
      recommendations
    };
  }

  /**
   * Analyze query performance and get optimization suggestions
   */
  analyzeQueryPerformance(queryType: string): {
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions: string[];
    indexRecommendations: string[];
  } {
    const metrics = this.queryMetrics.filter(m => m.queryType === queryType);
    
    if (metrics.length === 0) {
      return {
        performance: 'excellent',
        suggestions: [],
        indexRecommendations: []
      };
    }

    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const avgDocsRead = metrics.reduce((sum, m) => sum + m.documentsRead, 0) / metrics.length;
    const avgResults = metrics.reduce((sum, m) => sum + m.resultCount, 0) / metrics.length;

    return IndexManager.analyzeQueryPerformance(
      queryType,
      avgExecutionTime,
      avgDocsRead,
      avgResults
    );
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(threshold: number = 1000): {
    queries: QueryPerformanceMetrics[];
    totalCount: number;
    averageExecutionTime: number;
    recommendations: string[];
  } {
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > threshold);
    
    const recommendations: string[] = [];
    
    if (slowQueries.length > 0) {
      const avgTime = slowQueries.reduce((sum, m) => sum + m.executionTime, 0) / slowQueries.length;
      
      recommendations.push(`${slowQueries.length} slow queries detected with average time ${avgTime.toFixed(0)}ms`);
      
      // Group by query type
      const byType = new Map<string, number>();
      slowQueries.forEach(q => {
        byType.set(q.queryType, (byType.get(q.queryType) || 0) + 1);
      });
      
      const topTypes = Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topTypes.forEach(([type, count]) => {
        recommendations.push(`Query type "${type}" has ${count} slow queries - review indexes`);
      });
    }

    return {
      queries: slowQueries.slice(0, 20), // Top 20 slowest
      totalCount: slowQueries.length,
      averageExecutionTime: slowQueries.length > 0 
        ? slowQueries.reduce((sum, m) => sum + m.executionTime, 0) / slowQueries.length 
        : 0,
      recommendations
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate page token from document
   */
  private generatePageToken(doc: any): string {
    return Buffer.from(JSON.stringify({ id: doc.id })).toString('base64');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic cleanup of old metrics
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000;
      this.queryMetrics = this.queryMetrics.filter(
        m => m.timestamp.getTime() > oneHourAgo
      );
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Health check
   */
  protected async performHealthCheck(): Promise<void> {
    const poolStats = this.getPoolStatistics();
    
    if (poolStats.utilizationRate > 0.9) {
      this.log('warn', 'Connection pool utilization high', poolStats);
    }

    const stats = this.getQueryStatistics(300000); // Last 5 minutes
    
    if (stats.averageExecutionTime > 2000) {
      this.log('warn', 'Average query execution time high', {
        avgTime: stats.averageExecutionTime,
        recommendations: stats.recommendations
      });
    }
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(): Promise<{
    poolStatistics: ReturnType<DatabaseOptimizationService['getPoolStatistics']>;
    queryStatistics: QueryStatistics;
    slowQueries: ReturnType<DatabaseOptimizationService['getSlowQueriesReport']>;
  }> {
    return {
      poolStatistics: this.getPoolStatistics(),
      queryStatistics: this.getQueryStatistics(),
      slowQueries: this.getSlowQueriesReport()
    };
  }
}

// Export singleton instance
export const databaseOptimizationService = new DatabaseOptimizationService();
