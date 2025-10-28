/**
 * Google Cloud Memorystore (Redis) Caching Service
 * Provides high-performance caching for intelligent matching system
 */

import { createClient, RedisClientType } from 'redis';
import { GoogleCloudLoggingService } from './GoogleCloudLoggingService';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  uptime: number;
}

export class GoogleCloudMemorystore {
  private static instance: GoogleCloudMemorystore;
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private loggingService: GoogleCloudLoggingService;
  private stats = {
    hits: 0,
    misses: 0
  };

  // Cache key prefixes for different data types
  private readonly KEY_PREFIXES = {
    REQUIREMENT_ANALYSIS: 'req_analysis:',
    RELEVANCE_SCORE: 'rel_score:',
    LOCATION_DATA: 'location:',
    ARTISAN_PROFILE: 'artisan:',
    SEARCH_RESULTS: 'search:',
    USER_PREFERENCES: 'user_pref:',
    GEOCODING: 'geocode:',
    ANALYTICS: 'analytics:'
  };

  // Default TTL values (in seconds)
  private readonly DEFAULT_TTL = {
    REQUIREMENT_ANALYSIS: 1800, // 30 minutes
    RELEVANCE_SCORE: 900, // 15 minutes
    LOCATION_DATA: 3600, // 1 hour
    ARTISAN_PROFILE: 1800, // 30 minutes
    SEARCH_RESULTS: 600, // 10 minutes
    USER_PREFERENCES: 7200, // 2 hours
    GEOCODING: 86400, // 24 hours
    ANALYTICS: 300 // 5 minutes
  };

  constructor() {
    this.loggingService = GoogleCloudLoggingService.getInstance();
    this.initializeClient();
  }

  static getInstance(): GoogleCloudMemorystore {
    if (!GoogleCloudMemorystore.instance) {
      GoogleCloudMemorystore.instance = new GoogleCloudMemorystore();
    }
    return GoogleCloudMemorystore.instance;
  }

  /**
   * Initialize Redis client for Google Cloud Memorystore
   */
  private async initializeClient(): Promise<void> {
    try {
      const redisUrl = process.env.GOOGLE_CLOUD_MEMORYSTORE_URL || 
                      process.env.REDIS_URL || 
                      'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          lazyConnect: true
        },
        // Google Cloud Memorystore specific options
        ...(process.env.GOOGLE_CLOUD_MEMORYSTORE_AUTH_TOKEN && {
          password: process.env.GOOGLE_CLOUD_MEMORYSTORE_AUTH_TOKEN
        })
      });

      this.client.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.connected = false;
        this.loggingService.logError(error, {
          operation: 'redis_connection',
          requestData: { redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') }
        });
      });

      this.client.on('connect', () => {
        console.log('Connected to Google Cloud Memorystore');
        this.connected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
        this.connected = true;
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.connected = false;
      });

      // Connect to Redis
      await this.client.connect();

    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.connected = false;
      await this.loggingService.logError(error as Error, {
        operation: 'redis_initialization'
      });
    }
  }

  /**
   * Ensure Redis connection is active
   */
  private async ensureConnection(): Promise<boolean> {
    if (!this.client || !this.connected) {
      try {
        await this.initializeClient();
        return this.connected;
      } catch (error) {
        console.error('Failed to establish Redis connection:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * Cache requirement analysis results
   */
  async cacheRequirementAnalysis(key: string, analysis: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.REQUIREMENT_ANALYSIS + key,
      analysis,
      ttl || this.DEFAULT_TTL.REQUIREMENT_ANALYSIS
    );
  }

  /**
   * Get cached requirement analysis
   */
  async getCachedRequirementAnalysis(key: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.REQUIREMENT_ANALYSIS + key);
  }

  /**
   * Cache relevance scores
   */
  async cacheRelevanceScore(artisanId: string, requirementsHash: string, score: any, ttl?: number): Promise<boolean> {
    const key = `${artisanId}:${requirementsHash}`;
    return this.setCache(
      this.KEY_PREFIXES.RELEVANCE_SCORE + key,
      score,
      ttl || this.DEFAULT_TTL.RELEVANCE_SCORE
    );
  }

  /**
   * Get cached relevance score
   */
  async getCachedRelevanceScore(artisanId: string, requirementsHash: string): Promise<any | null> {
    const key = `${artisanId}:${requirementsHash}`;
    return this.getCache(this.KEY_PREFIXES.RELEVANCE_SCORE + key);
  }

  /**
   * Cache location data (geocoding results)
   */
  async cacheLocationData(locationKey: string, locationData: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.LOCATION_DATA + locationKey,
      locationData,
      ttl || this.DEFAULT_TTL.LOCATION_DATA
    );
  }

  /**
   * Get cached location data
   */
  async getCachedLocationData(locationKey: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.LOCATION_DATA + locationKey);
  }

  /**
   * Cache artisan profile data
   */
  async cacheArtisanProfile(artisanId: string, profile: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.ARTISAN_PROFILE + artisanId,
      profile,
      ttl || this.DEFAULT_TTL.ARTISAN_PROFILE
    );
  }

  /**
   * Get cached artisan profile
   */
  async getCachedArtisanProfile(artisanId: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.ARTISAN_PROFILE + artisanId);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(searchHash: string, results: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.SEARCH_RESULTS + searchHash,
      results,
      ttl || this.DEFAULT_TTL.SEARCH_RESULTS
    );
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(searchHash: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.SEARCH_RESULTS + searchHash);
  }

  /**
   * Cache user preferences and learning weights
   */
  async cacheUserPreferences(userId: string, preferences: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.USER_PREFERENCES + userId,
      preferences,
      ttl || this.DEFAULT_TTL.USER_PREFERENCES
    );
  }

  /**
   * Get cached user preferences
   */
  async getCachedUserPreferences(userId: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.USER_PREFERENCES + userId);
  }

  /**
   * Cache geocoding results
   */
  async cacheGeocodingResult(address: string, result: any, ttl?: number): Promise<boolean> {
    const key = Buffer.from(address.toLowerCase().trim()).toString('base64');
    return this.setCache(
      this.KEY_PREFIXES.GEOCODING + key,
      result,
      ttl || this.DEFAULT_TTL.GEOCODING
    );
  }

  /**
   * Get cached geocoding result
   */
  async getCachedGeocodingResult(address: string): Promise<any | null> {
    const key = Buffer.from(address.toLowerCase().trim()).toString('base64');
    return this.getCache(this.KEY_PREFIXES.GEOCODING + key);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(analyticsKey: string, data: any, ttl?: number): Promise<boolean> {
    return this.setCache(
      this.KEY_PREFIXES.ANALYTICS + analyticsKey,
      data,
      ttl || this.DEFAULT_TTL.ANALYTICS
    );
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(analyticsKey: string): Promise<any | null> {
    return this.getCache(this.KEY_PREFIXES.ANALYTICS + analyticsKey);
  }

  /**
   * Generic cache set method
   */
  private async setCache(key: string, data: any, ttl: number): Promise<boolean> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return false;
      }

      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      };

      await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
      return true;

    } catch (error) {
      console.error('Error setting cache:', error);
      await this.loggingService.logError(error as Error, {
        operation: 'cache_set',
        requestData: { key, ttl }
      });
      return false;
    }
  }

  /**
   * Generic cache get method
   */
  private async getCache(key: string): Promise<any | null> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        this.stats.misses++;
        return null;
      }

      const cached = await this.client.get(key);
      
      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const cacheEntry: CacheEntry = JSON.parse(cached);
      
      // Check if cache entry is still valid
      const age = Date.now() - cacheEntry.timestamp;
      if (age > cacheEntry.ttl * 1000) {
        // Entry expired, delete it
        await this.client.del(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return cacheEntry.data;

    } catch (error) {
      console.error('Error getting cache:', error);
      this.stats.misses++;
      await this.loggingService.logError(error as Error, {
        operation: 'cache_get',
        requestData: { key }
      });
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async deleteCache(key: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return false;
      }

      await this.client.del(key);
      return true;

    } catch (error) {
      console.error('Error deleting cache:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clearCacheByPrefix(prefix: string): Promise<number> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return 0;
      }

      const keys = await this.client.keys(`${prefix}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;

    } catch (error) {
      console.error('Error clearing cache by prefix:', error);
      return 0;
    }
  }

  /**
   * Clear all intelligent matching cache
   */
  async clearAllCache(): Promise<number> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return 0;
      }

      let totalCleared = 0;
      
      for (const prefix of Object.values(this.KEY_PREFIXES)) {
        const cleared = await this.clearCacheByPrefix(prefix);
        totalCleared += cleared;
      }

      return totalCleared;

    } catch (error) {
      console.error('Error clearing all cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return {
          hits: this.stats.hits,
          misses: this.stats.misses,
          hitRate: 0,
          totalKeys: 0,
          memoryUsage: 0,
          uptime: 0
        };
      }

      const info = await this.client.info();
      const keyspaceInfo = await this.client.info('keyspace');
      
      // Parse Redis info
      const memoryUsage = this.parseInfoValue(info, 'used_memory');
      const uptime = this.parseInfoValue(info, 'uptime_in_seconds');
      
      // Count keys with our prefixes
      let totalKeys = 0;
      for (const prefix of Object.values(this.KEY_PREFIXES)) {
        const keys = await this.client.keys(`${prefix}*`);
        totalKeys += keys.length;
      }

      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage: parseInt(memoryUsage) || 0,
        uptime: parseInt(uptime) || 0
      };

    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        uptime: 0
      };
    }
  }

  /**
   * Parse value from Redis INFO command output
   */
  private parseInfoValue(info: string, key: string): string {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(':')[1];
      }
    }
    return '0';
  }

  /**
   * Test cache connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!(await this.ensureConnection()) || !this.client) {
        return false;
      }

      const testKey = 'test:connection';
      const testValue = { test: true, timestamp: Date.now() };
      
      await this.client.setEx(testKey, 10, JSON.stringify(testValue));
      const retrieved = await this.client.get(testKey);
      await this.client.del(testKey);
      
      return retrieved !== null;

    } catch (error) {
      console.error('Cache connection test failed:', error);
      return false;
    }
  }

  /**
   * Get cache configuration status
   */
  getConfigStatus(): { configured: boolean; connected: boolean; url?: string } {
    return {
      configured: !!(process.env.GOOGLE_CLOUD_MEMORYSTORE_URL || process.env.REDIS_URL),
      connected: this.connected,
      url: process.env.GOOGLE_CLOUD_MEMORYSTORE_URL ? 'Google Cloud Memorystore' : 'Local Redis'
    };
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.connected) {
        await this.client.quit();
        this.connected = false;
      }
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}

export default GoogleCloudMemorystore;