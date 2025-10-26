import connectDB from '../mongodb';

interface CacheEntry {
  key: string;
  value: any;
  expiresAt: Date;
  createdAt: Date;
  hits: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for bulk invalidation
}

export class CacheService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set cached value
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const entry: CacheEntry = {
      key,
      value,
      expiresAt,
      createdAt: new Date(),
      hits: 0
    };

    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, entry);

    // Store tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        await this.addToTag(tag, key);
      }
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Invalidate cache by tags
   */
  static async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const keys = await this.getKeysByTag(tag);
      for (const key of keys) {
        this.cache.delete(key);
      }
      await this.clearTag(tag);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    let totalHits = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalEntries++;
    }

    // Estimate misses (this is simplified)
    const totalRequests = totalHits + (this.cache.size * 2); // Rough estimate
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits,
      totalMisses: Math.max(0, totalRequests - totalHits)
    };
  }

  /**
   * Clean expired entries
   */
  static async cleanup(): Promise<void> {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    console.log(`🧹 Cache cleanup: Removed ${keysToDelete.length} expired entries`);
  }

  /**
   * Evict oldest entries when cache is full
   */
  private static evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Add key to tag (for invalidation)
   */
  private static async addToTag(tag: string, key: string): Promise<void> {
    // In a real implementation, store tag-key mappings in Redis/database
    // For now, this is a placeholder
  }

  /**
   * Get keys by tag
   */
  private static async getKeysByTag(tag: string): Promise<string[]> {
    // In a real implementation, retrieve keys from Redis/database
    // For now, return empty array
    return [];
  }

  /**
   * Clear tag
   */
  private static async clearTag(tag: string): Promise<void> {
    // In a real implementation, clear tag from Redis/database
    // For now, this is a placeholder
  }
}

/**
 * Cache decorator for methods
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cachedResult = await CacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute method
      const result = await method.apply(this, args);

      // Cache result
      await CacheService.set(cacheKey, result, options);

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
