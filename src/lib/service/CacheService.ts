import connectDB from '../mongodb';
import { createClient, RedisClientType } from 'redis';

interface CacheEntry {
  key: string;
  value: any;
  expiresAt: Date;
  createdAt: Date;
  hits: number;
  size?: number; // Size in bytes
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for bulk invalidation
  compress?: boolean; // Enable compression for large values
  priority?: 'low' | 'medium' | 'high'; // Cache priority
}

interface CacheStats {
  size: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  evictions: number;
  compressionRatio?: number;
}

interface CacheConfig {
  enableRedis: boolean;
  redisUrl?: string;
  maxMemorySize: number; // Max memory in MB
  defaultTtl: number;
  compressionThreshold: number; // Compress values larger than this (bytes)
  enableMetrics: boolean;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry>();
  private static redisClient: RedisClientType | null = null;
  private static tagMappings = new Map<string, Set<string>>();
  private static metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalMemoryUsage: 0
  };

  private static config: CacheConfig = {
    enableRedis: process.env.REDIS_URL ? true : false,
    redisUrl: process.env.REDIS_URL,
    maxMemorySize: 100, // 100MB
    defaultTtl: 300, // 5 minutes
    compressionThreshold: 1024, // 1KB
    enableMetrics: true
  };

  /**
   * Initialize cache service
   */
  static async initialize(config?: Partial<CacheConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.enableRedis && this.config.redisUrl) {
      try {
        this.redisClient = createClient({ url: this.config.redisUrl });
        await this.redisClient.connect();
        console.log('✅ Redis cache connected');
      } catch (error) {
        console.warn('⚠️ Redis connection failed, falling back to memory cache:', error);
        this.redisClient = null;
      }
    }

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Check if Redis is available
   */
  private static get useRedis(): boolean {
    return this.redisClient !== null && this.redisClient.isReady;
  }

  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      let value: T | null = null;

      if (this.useRedis) {
        const redisValue = await this.redisClient!.get(key);
        if (redisValue) {
          value = this.deserializeValue(redisValue);
        }
      } else {
        const entry = this.cache.get(key);
        if (entry) {
          // Check if expired
          if (new Date() > entry.expiresAt) {
            this.cache.delete(key);
            this.updateMetrics('miss');
            return null;
          }

          // Update hit count
          entry.hits++;
          this.cache.set(key, entry);
          value = entry.value;
        }
      }

      if (value !== null) {
        this.updateMetrics('hit');
        return value;
      } else {
        this.updateMetrics('miss');
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.updateMetrics('miss');
      return null;
    }
  }

  /**
   * Set cached value
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.config.defaultTtl;
      const serializedValue = this.serializeValue(value, options.compress);

      if (this.useRedis) {
        await this.redisClient!.setEx(key, ttl, serializedValue);
      } else {
        const expiresAt = new Date(Date.now() + ttl * 1000);
        const valueSize = this.calculateSize(serializedValue);

        // Check memory limit
        if (this.shouldEvict(valueSize)) {
          await this.evictByPolicy();
        }

        const entry: CacheEntry = {
          key,
          value,
          expiresAt,
          createdAt: new Date(),
          hits: 0,
          size: valueSize
        };

        this.cache.set(key, entry);
        this.metrics.totalMemoryUsage += valueSize;
      }

      // Store tags for invalidation
      if (options.tags) {
        for (const tag of options.tags) {
          await this.addToTag(tag, key);
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<boolean> {
    try {
      if (this.useRedis) {
        const result = await this.redisClient!.del(key);
        return result > 0;
      } else {
        const entry = this.cache.get(key);
        if (entry && entry.size) {
          this.metrics.totalMemoryUsage -= entry.size;
        }
        return this.cache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      if (this.useRedis) {
        await this.redisClient!.flushAll();
      } else {
        this.cache.clear();
        this.metrics.totalMemoryUsage = 0;
      }
      this.tagMappings.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (this.useRedis) {
        const result = await this.redisClient!.exists(key);
        return result > 0;
      } else {
        const entry = this.cache.get(key);
        if (!entry) return false;

        // Check if expired
        if (new Date() > entry.expiresAt) {
          this.cache.delete(key);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.useRedis) {
        const values = await this.redisClient!.mGet(keys);
        return values.map(value => value ? this.deserializeValue(value) : null);
      } else {
        return Promise.all(keys.map(key => this.get<T>(key)));
      }
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values at once
   */
  static async mset(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    try {
      if (this.useRedis) {
        const pipeline = this.redisClient!.multi();
        for (const entry of entries) {
          const ttl = entry.options?.ttl || this.config.defaultTtl;
          const serializedValue = this.serializeValue(entry.value, entry.options?.compress);
          pipeline.setEx(entry.key, ttl, serializedValue);
        }
        await pipeline.exec();
      } else {
        await Promise.all(entries.map(entry =>
          this.set(entry.key, entry.value, entry.options)
        ));
      }
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  static async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.getKeysByTag(tag);

        if (this.useRedis && keys.length > 0) {
          await this.redisClient!.del(keys);
        } else {
          for (const key of keys) {
            await this.delete(key);
          }
        }

        await this.clearTag(tag);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Increment a numeric value in cache
   */
  static async increment(key: string, delta: number = 1, options: CacheOptions = {}): Promise<number> {
    try {
      if (this.useRedis) {
        const result = await this.redisClient!.incrBy(key, delta);
        if (options.ttl) {
          await this.redisClient!.expire(key, options.ttl);
        }
        return result;
      } else {
        const current = await this.get<number>(key) || 0;
        const newValue = current + delta;
        await this.set(key, newValue, options);
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Get cache keys matching pattern
   */
  static async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      if (this.useRedis) {
        return await this.redisClient!.keys(pattern);
      } else {
        const keys = Array.from(this.cache.keys());
        if (pattern === '*') return keys;

        // Simple pattern matching (only supports * wildcard)
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return keys.filter(key => regex.test(key));
      }
    } catch (error) {
      console.error('Cache getKeys error:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    try {
      if (this.useRedis) {
        const info = await this.redisClient!.info('memory');
        const memoryUsage = this.parseRedisMemoryInfo(info);

        return {
          size: await this.redisClient!.dbSize(),
          hitRate: this.calculateHitRate(),
          totalHits: this.metrics.hits,
          totalMisses: this.metrics.misses,
          memoryUsage,
          evictions: this.metrics.evictions
        };
      } else {
        let totalHits = 0;
        let totalEntries = 0;
        let compressedSize = 0;
        let uncompressedSize = 0;

        for (const entry of this.cache.values()) {
          totalHits += entry.hits;
          totalEntries++;

          if (entry.size) {
            const serialized = this.serializeValue(entry.value, false);
            const compressed = this.serializeValue(entry.value, true);
            uncompressedSize += serialized.length;
            compressedSize += compressed.length;
          }
        }

        const compressionRatio = uncompressedSize > 0 ? compressedSize / uncompressedSize : 1;

        return {
          size: this.cache.size,
          hitRate: this.calculateHitRate(),
          totalHits: this.metrics.hits,
          totalMisses: this.metrics.misses,
          memoryUsage: this.metrics.totalMemoryUsage,
          evictions: this.metrics.evictions,
          compressionRatio
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        size: 0,
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0,
        memoryUsage: 0,
        evictions: 0
      };
    }
  }

  /**
   * Calculate hit rate
   */
  private static calculateHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? Math.round((this.metrics.hits / total) * 100) / 100 : 0;
  }

  /**
   * Parse Redis memory info
   */
  private static parseRedisMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Clean expired entries
   */
  static async cleanup(): Promise<void> {
    if (this.useRedis) {
      // Redis handles expiration automatically
      return;
    }

    const now = new Date();
    const keysToDelete: string[] = [];
    let freedMemory = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
        if (entry.size) {
          freedMemory += entry.size;
        }
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.metrics.totalMemoryUsage -= freedMemory;

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: Removed ${keysToDelete.length} expired entries, freed ${this.formatBytes(freedMemory)}`);
    }
  }

  /**
   * Update metrics
   */
  private static updateMetrics(type: 'hit' | 'miss'): void {
    if (!this.config.enableMetrics) return;

    if (type === 'hit') {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
  }

  /**
   * Serialize value for storage
   */
  private static serializeValue(value: any, compress: boolean = false): string {
    try {
      const serialized = JSON.stringify(value);

      if (compress && serialized.length > this.config.compressionThreshold) {
        // Simple compression simulation (in real implementation, use gzip)
        return `compressed:${serialized}`;
      }

      return serialized;
    } catch (error) {
      console.error('Serialization error:', error);
      return JSON.stringify(null);
    }
  }

  /**
   * Deserialize value from storage
   */
  private static deserializeValue(serialized: string): any {
    try {
      if (serialized.startsWith('compressed:')) {
        // Simple decompression simulation
        return JSON.parse(serialized.substring(11));
      }

      return JSON.parse(serialized);
    } catch (error) {
      console.error('Deserialization error:', error);
      return null;
    }
  }

  /**
   * Calculate size of serialized value
   */
  private static calculateSize(value: string): number {
    return new Blob([value]).size;
  }

  /**
   * Check if eviction is needed
   */
  private static shouldEvict(newValueSize: number): boolean {
    const maxBytes = this.config.maxMemorySize * 1024 * 1024; // Convert MB to bytes
    return (this.metrics.totalMemoryUsage + newValueSize) > maxBytes;
  }

  /**
   * Evict entries by policy (LRU)
   */
  private static async evictByPolicy(): Promise<void> {
    const entries = Array.from(this.cache.entries());

    // Sort by last access time (hits as proxy) and creation time
    entries.sort(([, a], [, b]) => {
      if (a.hits !== b.hits) {
        return a.hits - b.hits; // Fewer hits first
      }
      return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
    });

    // Evict 25% of entries
    const toEvict = Math.ceil(entries.length * 0.25);
    let freedMemory = 0;

    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      if (entry.size) {
        freedMemory += entry.size;
      }
    }

    this.metrics.totalMemoryUsage -= freedMemory;
    this.metrics.evictions += toEvict;

    console.log(`🗑️ Cache eviction: Removed ${toEvict} entries, freed ${this.formatBytes(freedMemory)}`);
  }

  /**
   * Format bytes for display
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Add key to tag (for invalidation)
   */
  private static async addToTag(tag: string, key: string): Promise<void> {
    try {
      if (this.useRedis) {
        await this.redisClient!.sAdd(`tag:${tag}`, key);
      } else {
        if (!this.tagMappings.has(tag)) {
          this.tagMappings.set(tag, new Set());
        }
        this.tagMappings.get(tag)!.add(key);
      }
    } catch (error) {
      console.error('Add to tag error:', error);
    }
  }

  /**
   * Get keys by tag
   */
  private static async getKeysByTag(tag: string): Promise<string[]> {
    try {
      if (this.useRedis) {
        return await this.redisClient!.sMembers(`tag:${tag}`);
      } else {
        const keys = this.tagMappings.get(tag);
        return keys ? Array.from(keys) : [];
      }
    } catch (error) {
      console.error('Get keys by tag error:', error);
      return [];
    }
  }

  /**
   * Clear tag
   */
  private static async clearTag(tag: string): Promise<void> {
    try {
      if (this.useRedis) {
        await this.redisClient!.del(`tag:${tag}`);
      } else {
        this.tagMappings.delete(tag);
      }
    } catch (error) {
      console.error('Clear tag error:', error);
    }
  }

  /**
   * Get configuration
   */
  static getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    memory: boolean;
    details: Record<string, any>;
  }> {
    try {
      const stats = await this.getStats();
      const memoryUsageMB = stats.memoryUsage / (1024 * 1024);
      const memoryHealthy = memoryUsageMB < (this.config.maxMemorySize * 0.9);

      let redisHealthy = true;
      if (this.config.enableRedis) {
        try {
          if (this.useRedis) {
            await this.redisClient!.ping();
          } else {
            redisHealthy = false;
          }
        } catch {
          redisHealthy = false;
        }
      }

      const overallHealthy = memoryHealthy && (redisHealthy || !this.config.enableRedis);

      return {
        status: overallHealthy ? 'healthy' : 'degraded',
        redis: redisHealthy,
        memory: memoryHealthy,
        details: {
          memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
          maxMemoryMB: this.config.maxMemorySize,
          hitRate: stats.hitRate,
          cacheSize: stats.size,
          redisEnabled: this.config.enableRedis,
          redisConnected: this.useRedis
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: false,
        memory: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Hash arguments for cache key generation
   */
  static hashArgs(args: any[]): string {
    try {
      const serialized = JSON.stringify(args, (key, value) => {
        // Handle circular references and functions
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'object' && value !== null) {
          if (value.constructor !== Object && value.constructor !== Array) {
            return `[${value.constructor.name}]`;
          }
        }
        return value;
      });

      // Simple hash function (in production, use a proper hash like SHA-256)
      let hash = 0;
      for (let i = 0; i < serialized.length; i++) {
        const char = serialized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(36);
    } catch (error) {
      console.error('Args hashing error:', error);
      return Math.random().toString(36);
    }
  }

  /**
   * Disconnect and cleanup
   */
  static async disconnect(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.disconnect();
        this.redisClient = null;
      }
      this.cache.clear();
      this.tagMappings.clear();
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }
}

/**
 * Cache decorator for methods
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Create cache key with class name, method name, and arguments
      const argsHash = CacheService.hashArgs(args);
      const cacheKey = `${target.constructor.name}.${propertyName}:${argsHash}`;

      // Try to get from cache
      const cachedResult = await CacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute method
      const startTime = Date.now();
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;

      // Cache result with performance-based TTL adjustment
      const adjustedOptions = { ...options };
      if (duration > 1000 && !options.ttl) {
        // Longer TTL for expensive operations
        adjustedOptions.ttl = Math.min(3600, (options.ttl || 300) * 2);
      }

      await CacheService.set(cacheKey, result, adjustedOptions);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(tags: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute method
      const result = await method.apply(this, args);

      // Invalidate cache
      await CacheService.invalidateByTags(tags);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming decorator
 */
export function CacheWarm(options: CacheOptions & { warmupArgs?: any[][] } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    // Warmup cache on application start
    if (options.warmupArgs) {
      setTimeout(async () => {
        for (const args of options.warmupArgs!) {
          try {
            await method.apply(target.prototype, args);
          } catch (error) {
            console.warn(`Cache warmup failed for ${target.constructor.name}.${propertyName}:`, error);
          }
        }
      }, 1000);
    }

    return descriptor;
  };
}

/**
 * Performance monitoring decorator
 */
export function MonitorPerformance(threshold: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        console.warn(`⚠️ Slow operation detected: ${target.constructor.name}.${propertyName} took ${duration}ms`);
      }

      return result;
    };

    return descriptor;
  };
}