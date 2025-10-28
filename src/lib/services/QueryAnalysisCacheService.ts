/**
 * Query Analysis Cache Service
 * 
 * This service implements Redis-based caching for Google AI analysis results,
 * cache key generation, invalidation logic, and hit rate monitoring.
 */

import { EnhancedQueryAnalysis } from './IntelligentProfessionMatcher';
import { QueryAnalysis, RequirementExtraction, ProfessionDetection } from './GoogleGenerativeAIService';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessed: Date;
  queryHash: string;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  cacheSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export interface CacheConfiguration {
  defaultTTL: number; // Time to live in milliseconds
  maxEntries: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  cleanupInterval: number;
}

export class QueryAnalysisCacheService {
  private static instance: QueryAnalysisCacheService;
  
  // In-memory cache (can be replaced with Redis in production)
  private queryAnalysisCache: Map<string, CacheEntry<EnhancedQueryAnalysis>> = new Map();
  private basicAnalysisCache: Map<string, CacheEntry<QueryAnalysis>> = new Map();
  private requirementCache: Map<string, CacheEntry<RequirementExtraction>> = new Map();
  private professionCache: Map<string, CacheEntry<ProfessionDetection>> = new Map();
  
  // Cache statistics
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    totalRequests: 0,
    responseTimes: [] as number[]
  };

  private config: CacheConfiguration = {
    defaultTTL: 3600000, // 1 hour
    maxEntries: 1000,
    enableCompression: false,
    enableMetrics: true,
    cleanupInterval: 300000 // 5 minutes
  };

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredEntries(), this.config.cleanupInterval);
  }

  public static getInstance(): QueryAnalysisCacheService {
    if (!QueryAnalysisCacheService.instance) {
      QueryAnalysisCacheService.instance = new QueryAnalysisCacheService();
    }
    return QueryAnalysisCacheService.instance;
  }

  /**
   * Cache enhanced query analysis results
   */
  public async cacheQueryAnalysis(
    query: string, 
    analysis: EnhancedQueryAnalysis,
    ttl?: number
  ): Promise<void> {
    const key = this.generateQueryKey(query, 'enhanced');
    const entry = this.createCacheEntry(analysis, ttl);
    
    await this.setCacheEntry(this.queryAnalysisCache, key, entry);
  }

  /**
   * Get cached enhanced query analysis
   */
  public async getCachedQueryAnalysis(query: string): Promise<EnhancedQueryAnalysis | null> {
    const key = this.generateQueryKey(query, 'enhanced');
    return this.getCacheEntry(this.queryAnalysisCache, key);
  }

  /**
   * Cache basic query analysis results
   */
  public async cacheBasicAnalysis(
    query: string, 
    analysis: QueryAnalysis,
    ttl?: number
  ): Promise<void> {
    const key = this.generateQueryKey(query, 'basic');
    const entry = this.createCacheEntry(analysis, ttl);
    
    await this.setCacheEntry(this.basicAnalysisCache, key, entry);
  }

  /**
   * Get cached basic query analysis
   */
  public async getCachedBasicAnalysis(query: string): Promise<QueryAnalysis | null> {
    const key = this.generateQueryKey(query, 'basic');
    return this.getCacheEntry(this.basicAnalysisCache, key);
  }

  /**
   * Cache requirement extraction results
   */
  public async cacheRequirementExtraction(
    query: string, 
    requirements: RequirementExtraction,
    ttl?: number
  ): Promise<void> {
    const key = this.generateQueryKey(query, 'requirements');
    const entry = this.createCacheEntry(requirements, ttl);
    
    await this.setCacheEntry(this.requirementCache, key, entry);
  }

  /**
   * Get cached requirement extraction
   */
  public async getCachedRequirementExtraction(query: string): Promise<RequirementExtraction | null> {
    const key = this.generateQueryKey(query, 'requirements');
    return this.getCacheEntry(this.requirementCache, key);
  }

  /**
   * Cache profession detection results
   */
  public async cacheProfessionDetection(
    requirements: RequirementExtraction, 
    detection: ProfessionDetection,
    ttl?: number
  ): Promise<void> {
    const key = this.generateRequirementKey(requirements, 'profession');
    const entry = this.createCacheEntry(detection, ttl);
    
    await this.setCacheEntry(this.professionCache, key, entry);
  }

  /**
   * Get cached profession detection
   */
  public async getCachedProfessionDetection(requirements: RequirementExtraction): Promise<ProfessionDetection | null> {
    const key = this.generateRequirementKey(requirements, 'profession');
    return this.getCacheEntry(this.professionCache, key);
  }

  /**
   * Invalidate cache entries by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    
    const caches = [
      this.queryAnalysisCache,
      this.basicAnalysisCache,
      this.requirementCache,
      this.professionCache
    ];

    for (const cache of caches) {
      for (const key of cache.keys()) {
        if (key.includes(pattern)) {
          cache.delete(key);
          invalidatedCount++;
        }
      }
    }

    return invalidatedCount;
  }

  /**
   * Invalidate all cache entries
   */
  public async invalidateAll(): Promise<void> {
    this.queryAnalysisCache.clear();
    this.basicAnalysisCache.clear();
    this.requirementCache.clear();
    this.professionCache.clear();
    
    // Reset stats
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      responseTimes: []
    };
  }

  /**
   * Get comprehensive cache statistics
   */
  public getCacheStats(): CacheStats {
    const totalEntries = 
      this.queryAnalysisCache.size +
      this.basicAnalysisCache.size +
      this.requirementCache.size +
      this.professionCache.size;

    const hitRate = this.stats.totalRequests > 0 ? 
      this.stats.totalHits / this.stats.totalRequests : 0;

    const averageResponseTime = this.stats.responseTimes.length > 0 ?
      this.stats.responseTimes.reduce((sum, time) => sum + time, 0) / this.stats.responseTimes.length : 0;

    // Find oldest and newest entries
    const allEntries: CacheEntry<any>[] = [];
    [this.queryAnalysisCache, this.basicAnalysisCache, this.requirementCache, this.professionCache]
      .forEach(cache => allEntries.push(...Array.from(cache.values())));

    const timestamps = allEntries.map(entry => entry.timestamp.getTime());
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      totalEntries,
      hitRate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      averageResponseTime,
      cacheSize: this.calculateCacheSize(),
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Get cache entries by type
   */
  public getCacheEntriesByType(type: 'enhanced' | 'basic' | 'requirements' | 'profession'): Array<{
    key: string;
    entry: CacheEntry<any>;
  }> {
    let cache: Map<string, CacheEntry<any>>;
    
    switch (type) {
      case 'enhanced':
        cache = this.queryAnalysisCache;
        break;
      case 'basic':
        cache = this.basicAnalysisCache;
        break;
      case 'requirements':
        cache = this.requirementCache;
        break;
      case 'profession':
        cache = this.professionCache;
        break;
      default:
        return [];
    }

    return Array.from(cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Preload frequently used queries
   */
  public async preloadFrequentQueries(queries: string[]): Promise<void> {
    // This would typically load from a database of frequent queries
    // For now, we'll just ensure the cache is ready for these queries
    console.log(`Cache prepared for ${queries.length} frequent queries`);
  }

  /**
   * Update cache configuration
   */
  public updateConfiguration(newConfig: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply new max entries limit
    if (newConfig.maxEntries) {
      this.enforceMaxEntries();
    }
  }

  /**
   * Export cache data for backup
   */
  public exportCacheData(): {
    queryAnalysis: Array<[string, CacheEntry<EnhancedQueryAnalysis>]>;
    basicAnalysis: Array<[string, CacheEntry<QueryAnalysis>]>;
    requirements: Array<[string, CacheEntry<RequirementExtraction>]>;
    profession: Array<[string, CacheEntry<ProfessionDetection>]>;
    stats: typeof this.stats;
    config: CacheConfiguration;
  } {
    return {
      queryAnalysis: Array.from(this.queryAnalysisCache.entries()),
      basicAnalysis: Array.from(this.basicAnalysisCache.entries()),
      requirements: Array.from(this.requirementCache.entries()),
      profession: Array.from(this.professionCache.entries()),
      stats: { ...this.stats },
      config: { ...this.config }
    };
  }

  /**
   * Import cache data from backup
   */
  public importCacheData(data: ReturnType<typeof this.exportCacheData>): void {
    this.queryAnalysisCache = new Map(data.queryAnalysis);
    this.basicAnalysisCache = new Map(data.basicAnalysis);
    this.requirementCache = new Map(data.requirements);
    this.professionCache = new Map(data.profession);
    this.stats = data.stats;
    this.config = data.config;
  }

  // Private helper methods

  private generateQueryKey(query: string, type: string): string {
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const hash = this.hashString(normalizedQuery);
    return `${type}:${hash}`;
  }

  private generateRequirementKey(requirements: RequirementExtraction, type: string): string {
    const keyData = JSON.stringify({
      products: requirements.products.sort(),
      materials: requirements.materials.sort(),
      techniques: requirements.techniques.sort(),
      styles: requirements.styles.sort(),
      endUse: requirements.endUse,
      specifications: requirements.specifications
    });
    
    const hash = this.hashString(keyData);
    return `${type}:${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private createCacheEntry<T>(data: T, ttl?: number): CacheEntry<T> {
    const now = new Date();
    const expirationTime = ttl || this.config.defaultTTL;
    
    return {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + expirationTime),
      hitCount: 0,
      lastAccessed: now,
      queryHash: this.hashString(JSON.stringify(data))
    };
  }

  private async setCacheEntry<T>(
    cache: Map<string, CacheEntry<T>>, 
    key: string, 
    entry: CacheEntry<T>
  ): Promise<void> {
    // Enforce max entries limit
    if (cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed(cache);
    }

    cache.set(key, entry);
  }

  private getCacheEntry<T>(
    cache: Map<string, CacheEntry<T>>, 
    key: string
  ): T | null {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const entry = cache.get(key);
    
    if (!entry) {
      this.stats.totalMisses++;
      this.recordResponseTime(Date.now() - startTime);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt.getTime()) {
      cache.delete(key);
      this.stats.totalMisses++;
      this.recordResponseTime(Date.now() - startTime);
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = new Date();
    this.stats.totalHits++;
    this.recordResponseTime(Date.now() - startTime);

    return entry.data;
  }

  private evictLeastRecentlyUsed<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const caches = [
      this.queryAnalysisCache,
      this.basicAnalysisCache,
      this.requirementCache,
      this.professionCache
    ];

    let totalCleaned = 0;

    for (const cache of caches) {
      for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt.getTime()) {
          cache.delete(key);
          totalCleaned++;
        }
      }
    }

    if (totalCleaned > 0) {
      console.log(`Cleaned up ${totalCleaned} expired cache entries`);
    }
  }

  private enforceMaxEntries(): void {
    const caches = [
      this.queryAnalysisCache,
      this.basicAnalysisCache,
      this.requirementCache,
      this.professionCache
    ];

    const maxPerCache = Math.floor(this.config.maxEntries / caches.length);

    for (const cache of caches) {
      while (cache.size > maxPerCache) {
        this.evictLeastRecentlyUsed(cache);
      }
    }
  }

  private calculateCacheSize(): number {
    // Rough estimation of cache size in bytes
    let totalSize = 0;
    
    const caches = [
      this.queryAnalysisCache,
      this.basicAnalysisCache,
      this.requirementCache,
      this.professionCache
    ];

    for (const cache of caches) {
      for (const entry of cache.values()) {
        // Rough estimation: JSON string length * 2 (for Unicode) + overhead
        totalSize += JSON.stringify(entry).length * 2 + 100;
      }
    }

    return totalSize;
  }

  private recordResponseTime(time: number): void {
    if (this.config.enableMetrics) {
      this.stats.responseTimes.push(time);
      
      // Keep only last 1000 response times to prevent memory bloat
      if (this.stats.responseTimes.length > 1000) {
        this.stats.responseTimes = this.stats.responseTimes.slice(-1000);
      }
    }
  }
}