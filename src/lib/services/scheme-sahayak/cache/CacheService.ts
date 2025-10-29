/**
 * Multi-Level Cache Service for AI-Powered Scheme Sahayak v2.0
 * Implements browser, CDN, and database caching with Redis integration
 * Requirements: 10.1, 10.2
 */

import { createClient, RedisClientType } from 'redis';
import { BaseService } from '../base/BaseService';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export interface CacheConfig {
  // Redis configuration
  redis: {
    enabled: boolean;
    url: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxRetries?: number;
    retryDelay?: number;
  };
  
  // Cache TTL (Time To Live) in seconds
  ttl: {
    browser: {
      staticContent: number;    // 1 day
      images: number;           // 30 days
      userPreferences: number;  // 5 minutes
      apiResponses: number;     // 1 hour
    };
    cdn: {
      staticAssets: number;     // 1 year
      images: number;           // 30 days
      documents: number;        // 7 days
    };
    database: {
      frequentQueries: number;  // 10 minutes
      schemes: number;          // 1 hour
      userProfile: number;      // 15 minutes
      recommendations: number;  // 5 minutes
      aggregations: number;     // 1 hour
      reports: number;          // 4 hours
    };
  };
  
  // Cache size limits
  limits: {
    maxMemoryMB: number;
    maxKeys: number;
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
  };
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  redis: {
    enabled: !!process.env.REDIS_URL,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'scheme-sahayak:',
    maxRetries: 3,
    retryDelay: 1000
  },
  ttl: {
    browser: {
      staticContent: 86400,      // 1 day
      images: 2592000,           // 30 days
      userPreferences: 300,      // 5 minutes
      apiResponses: 3600         // 1 hour
    },
    cdn: {
      staticAssets: 31536000,    // 1 year
      images: 2592000,           // 30 days
      documents: 604800          // 7 days
    },
    database: {
      frequentQueries: 600,      // 10 minutes
      schemes: 3600,             // 1 hour
      userProfile: 900,          // 15 minutes
      recommendations: 300,      // 5 minutes
      aggregations: 3600,        // 1 hour
      reports: 14400             // 4 hours
    }
  },
  limits: {
    maxMemoryMB: 512,
    maxKeys: 100000,
    evictionPolicy: 'lru'
  }
};

// ============================================================================
// CACHE KEY PATTERNS
// ============================================================================

export class CacheKeyBuilder {
  private prefix: string;

  constructor(prefix: string = 'scheme-sahayak:') {
    this.prefix = prefix;
  }

  // Scheme-related keys
  scheme(schemeId: string): string {
    return `${this.prefix}scheme:${schemeId}`;
  }

  schemes(filters: string): string {
    return `${this.prefix}schemes:${filters}`;
  }

  schemesByCategory(category: string): string {
    return `${this.prefix}schemes:category:${category}`;
  }

  popularSchemes(limit: number): string {
    return `${this.prefix}schemes:popular:${limit}`;
  }

  // User-related keys
  userProfile(userId: string): string {
    return `${this.prefix}user:${userId}:profile`;
  }

  userPreferences(userId: string): string {
    return `${this.prefix}user:${userId}:preferences`;
  }

  userApplications(userId: string): string {
    return `${this.prefix}user:${userId}:applications`;
  }

  // Recommendation keys
  recommendations(userId: string, filters?: string): string {
    const filterKey = filters ? `:${filters}` : '';
    return `${this.prefix}recommendations:${userId}${filterKey}`;
  }

  // Search keys
  searchResults(query: string, filters: string): string {
    return `${this.prefix}search:${query}:${filters}`;
  }

  // Analytics keys
  analytics(type: string, period: string): string {
    return `${this.prefix}analytics:${type}:${period}`;
  }

  // Session keys
  session(sessionId: string): string {
    return `${this.prefix}session:${sessionId}`;
  }

  // Query result keys
  queryResult(queryHash: string): string {
    return `${this.prefix}query:${queryHash}`;
  }

  // Pattern for bulk operations
  pattern(pattern: string): string {
    return `${this.prefix}${pattern}`;
  }
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

export class CacheService extends BaseService {
  private redisClient: RedisClientType | null = null;
  private config: CacheConfig;
  private keyBuilder: CacheKeyBuilder;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  // In-memory fallback cache
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private memoryCacheCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    super('CacheService');
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.keyBuilder = new CacheKeyBuilder(this.config.redis.keyPrefix);

    // Initialize Redis if enabled
    if (this.config.redis.enabled) {
      this.initializeRedis();
    }

    // Start memory cache cleanup
    this.startMemoryCacheCleanup();
  }

  // ============================================================================
  // REDIS CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.redisClient = createClient({
          url: this.config.redis.url,
          password: this.config.redis.password,
          database: this.config.redis.db,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > (this.config.redis.maxRetries || 3)) {
                this.log('error', 'Redis max retries exceeded');
                return new Error('Redis connection failed');
              }
              return this.config.redis.retryDelay || 1000;
            }
          }
        });

        // Error handling
        this.redisClient.on('error', (err) => {
          this.log('error', 'Redis client error', err);
          this.isConnected = false;
        });

        this.redisClient.on('connect', () => {
          this.log('info', 'Redis client connected');
          this.isConnected = true;
        });

        this.redisClient.on('disconnect', () => {
          this.log('warn', 'Redis client disconnected');
          this.isConnected = false;
        });

        // Connect
        await this.redisClient.connect();
        this.log('info', 'Redis initialized successfully');
      } catch (error) {
        this.log('error', 'Failed to initialize Redis', error);
        this.redisClient = null;
        this.isConnected = false;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Ensure Redis is connected
   */
  private async ensureConnected(): Promise<boolean> {
    if (!this.config.redis.enabled) {
      return false;
    }

    if (this.isConnected && this.redisClient) {
      return true;
    }

    try {
      await this.initializeRedis();
      return this.isConnected;
    } catch (error) {
      this.log('error', 'Failed to connect to Redis', error);
      return false;
    }
  }

  // ============================================================================
  // CORE CACHE OPERATIONS
  // ============================================================================

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (await this.ensureConnected() && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.log('debug', `Cache hit (Redis): ${key}`);
          return JSON.parse(value) as T;
        }
      }

      // Fall back to memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue && memoryValue.expiry > Date.now()) {
        this.log('debug', `Cache hit (Memory): ${key}`);
        return memoryValue.value as T;
      }

      this.log('debug', `Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.log('error', `Cache get error for key ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis first
      if (await this.ensureConnected() && this.redisClient) {
        if (ttlSeconds) {
          await this.redisClient.setEx(key, ttlSeconds, serialized);
        } else {
          await this.redisClient.set(key, serialized);
        }
        this.log('debug', `Cache set (Redis): ${key}`);
        return true;
      }

      // Fall back to memory cache
      const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (3600 * 1000);
      this.memoryCache.set(key, { value, expiry });
      this.log('debug', `Cache set (Memory): ${key}`);
      return true;
    } catch (error) {
      this.log('error', `Cache set error for key ${key}`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Delete from Redis
      if (await this.ensureConnected() && this.redisClient) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.delete(key);
      
      this.log('debug', `Cache delete: ${key}`);
      return true;
    } catch (error) {
      this.log('error', `Cache delete error for key ${key}`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0;

      // Delete from Redis
      if (await this.ensureConnected() && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.redisClient.del(keys);
        }
      }

      // Delete from memory cache
      const memoryKeys = Array.from(this.memoryCache.keys()).filter(key => 
        this.matchPattern(key, pattern)
      );
      memoryKeys.forEach(key => this.memoryCache.delete(key));
      deletedCount += memoryKeys.length;

      this.log('debug', `Cache delete pattern: ${pattern}, deleted: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      this.log('error', `Cache delete pattern error for ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis
      if (await this.ensureConnected() && this.redisClient) {
        const exists = await this.redisClient.exists(key);
        return exists > 0;
      }

      // Check memory cache
      const memoryValue = this.memoryCache.get(key);
      return memoryValue !== undefined && memoryValue.expiry > Date.now();
    } catch (error) {
      this.log('error', `Cache exists error for key ${key}`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      // Check Redis
      if (await this.ensureConnected() && this.redisClient) {
        return await this.redisClient.ttl(key);
      }

      // Check memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue) {
        return Math.max(0, Math.floor((memoryValue.expiry - Date.now()) / 1000));
      }

      return -2; // Key doesn't exist
    } catch (error) {
      this.log('error', `Cache TTL error for key ${key}`, error);
      return -2;
    }
  }

  // ============================================================================
  // HIGH-LEVEL CACHE OPERATIONS
  // ============================================================================

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Cache scheme data
   */
  async cacheScheme(schemeId: string, scheme: any): Promise<boolean> {
    const key = this.keyBuilder.scheme(schemeId);
    return await this.set(key, scheme, this.config.ttl.database.schemes);
  }

  /**
   * Get cached scheme
   */
  async getCachedScheme(schemeId: string): Promise<any | null> {
    const key = this.keyBuilder.scheme(schemeId);
    return await this.get(key);
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId: string, profile: any): Promise<boolean> {
    const key = this.keyBuilder.userProfile(userId);
    return await this.set(key, profile, this.config.ttl.database.userProfile);
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = this.keyBuilder.userProfile(userId);
    return await this.get(key);
  }

  /**
   * Cache recommendations
   */
  async cacheRecommendations(
    userId: string,
    recommendations: any,
    filters?: string
  ): Promise<boolean> {
    const key = this.keyBuilder.recommendations(userId, filters);
    return await this.set(key, recommendations, this.config.ttl.database.recommendations);
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(
    userId: string,
    filters?: string
  ): Promise<any | null> {
    const key = this.keyBuilder.recommendations(userId, filters);
    return await this.get(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    filters: string,
    results: any
  ): Promise<boolean> {
    const key = this.keyBuilder.searchResults(query, filters);
    return await this.set(key, results, this.config.ttl.database.frequentQueries);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string,
    filters: string
  ): Promise<any | null> {
    const key = this.keyBuilder.searchResults(query, filters);
    return await this.get(key);
  }

  /**
   * Cache session data
   */
  async cacheSession(sessionId: string, sessionData: any, ttlSeconds?: number): Promise<boolean> {
    const key = this.keyBuilder.session(sessionId);
    return await this.set(key, sessionData, ttlSeconds || 3600);
  }

  /**
   * Get cached session
   */
  async getCachedSession(sessionId: string): Promise<any | null> {
    const key = this.keyBuilder.session(sessionId);
    return await this.get(key);
  }

  // ============================================================================
  // CACHE INVALIDATION
  // ============================================================================

  /**
   * Invalidate scheme cache
   */
  async invalidateScheme(schemeId: string): Promise<void> {
    await this.delete(this.keyBuilder.scheme(schemeId));
    // Also invalidate related caches
    await this.deletePattern(this.keyBuilder.pattern(`schemes:*`));
    await this.deletePattern(this.keyBuilder.pattern(`recommendations:*`));
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delete(this.keyBuilder.userProfile(userId));
    await this.delete(this.keyBuilder.userPreferences(userId));
    await this.delete(this.keyBuilder.userApplications(userId));
    await this.deletePattern(this.keyBuilder.pattern(`recommendations:${userId}*`));
  }

  /**
   * Invalidate all recommendations
   */
  async invalidateAllRecommendations(): Promise<void> {
    await this.deletePattern(this.keyBuilder.pattern(`recommendations:*`));
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearchCache(): Promise<void> {
    await this.deletePattern(this.keyBuilder.pattern(`search:*`));
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      // Clear Redis
      if (await this.ensureConnected() && this.redisClient) {
        await this.redisClient.flushDb();
      }

      // Clear memory cache
      this.memoryCache.clear();

      this.log('info', 'All cache cleared');
    } catch (error) {
      this.log('error', 'Failed to clear cache', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Match key against pattern
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Start memory cache cleanup interval
   */
  private startMemoryCacheCleanup(): void {
    this.memoryCacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expiry <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redis: {
      connected: boolean;
      keys?: number;
      memory?: string;
    };
    memory: {
      keys: number;
      size: number;
    };
  }> {
    const stats = {
      redis: {
        connected: this.isConnected,
        keys: undefined as number | undefined,
        memory: undefined as string | undefined
      },
      memory: {
        keys: this.memoryCache.size,
        size: 0
      }
    };

    // Get Redis stats
    if (await this.ensureConnected() && this.redisClient) {
      try {
        const dbSize = await this.redisClient.dbSize();
        stats.redis.keys = dbSize;

        const info = await this.redisClient.info('memory');
        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        if (memoryMatch) {
          stats.redis.memory = memoryMatch[1];
        }
      } catch (error) {
        this.log('error', 'Failed to get Redis stats', error);
      }
    }

    // Calculate memory cache size
    stats.memory.size = JSON.stringify(Array.from(this.memoryCache.entries())).length;

    return stats;
  }

  /**
   * Health check
   */
  protected async performHealthCheck(): Promise<void> {
    if (this.config.redis.enabled) {
      if (!await this.ensureConnected()) {
        throw new Error('Redis connection failed');
      }

      // Test Redis operations
      const testKey = `${this.config.redis.keyPrefix}health-check`;
      await this.set(testKey, { test: true }, 10);
      const value = await this.get(testKey);
      await this.delete(testKey);

      if (!value) {
        throw new Error('Redis operations failed');
      }
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    try {
      // Stop memory cache cleanup
      if (this.memoryCacheCleanupInterval) {
        clearInterval(this.memoryCacheCleanupInterval);
      }

      // Disconnect Redis
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
        this.isConnected = false;
      }

      this.log('info', 'Cache service disconnected');
    } catch (error) {
      this.log('error', 'Error disconnecting cache service', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
