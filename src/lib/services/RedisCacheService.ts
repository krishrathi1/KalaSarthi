import { createClient, RedisClientType } from 'redis';

export interface CacheData {
  dashboardData: any;
  timestamp: number;
  artisanId: string;
}

export class RedisCacheService {
  private static instance: RedisCacheService;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() { }

  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  async connect(): Promise<void> {
    // If already connected, return
    if (this.isConnected && this.client) return;

    // If connection was already attempted and failed, don't retry
    if (this.client && !this.isConnected) return;

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: () => false // Don't auto-reconnect
        }
      });

      // Suppress error logging - just mark as disconnected
      this.client.on('error', () => {
        this.isConnected = false;
        // Silently fail - no console.error
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      // Silently fail - Redis is optional
      this.isConnected = false;
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
      } catch (error) {
        // Silently fail
        this.isConnected = false;
      }
    }
  }

  private getCacheKey(artisanId: string): string {
    return `dashboard:${artisanId}`;
  }

  async cacheDashboardData(artisanId: string, data: any): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('Redis not connected, skipping cache');
      return;
    }

    try {
      const cacheData: CacheData = {
        dashboardData: data,
        timestamp: Date.now(),
        artisanId
      };

      const key = this.getCacheKey(artisanId);
      await this.client.setEx(key, 3600, JSON.stringify(cacheData)); // Cache for 1 hour
      console.log(`✅ Cached dashboard data for ${artisanId}`);
    } catch (error) {
      console.error('❌ Failed to cache dashboard data:', error);
    }
  }

  async getCachedDashboardData(artisanId: string): Promise<CacheData | null> {
    if (!this.isConnected || !this.client) {
      console.warn('Redis not connected, no cached data available');
      return null;
    }

    try {
      const key = this.getCacheKey(artisanId);
      const cached = await this.client.get(key);

      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        console.log(`✅ Retrieved cached dashboard data for ${artisanId} (age: ${Date.now() - cacheData.timestamp}ms)`);
        return cacheData;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to retrieve cached data:', error);
      return null;
    }
  }

  async clearCache(artisanId: string): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      const key = this.getCacheKey(artisanId);
      await this.client.del(key);
      console.log(`✅ Cleared cache for ${artisanId}`);
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  isRedisConnected(): boolean {
    return this.isConnected;
  }
}