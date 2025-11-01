/**
 * Redis Client for Artisan Buddy
 * 
 * Provides connection pooling, error handling, and utility methods for Redis operations.
 */

import { createClient, RedisClientType } from 'redis';
import {
  SessionData,
  MessageEntry,
  DEFAULT_SESSION_TTL,
  DEFAULT_CACHE_TTL,
} from '@/lib/types/enhanced-artisan-buddy';

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisPassword = process.env.REDIS_PASSWORD;

      this.client = createClient({
        url: redisUrl,
        password: redisPassword || undefined,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Redis: Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Check if connected
   */
  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get Redis client
   */
  private getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Store session data
   */
  public async storeSession(sessionId: string, data: SessionData): Promise<void> {
    const client = this.getClient();
    const key = `session:${sessionId}`;
    const ttl = parseInt(process.env.ARTISAN_BUDDY_SESSION_TTL || String(DEFAULT_SESSION_TTL));

    await client.setEx(key, ttl, JSON.stringify(data));
  }

  /**
   * Get session data
   */
  public async getSession(sessionId: string): Promise<SessionData | null> {
    const client = this.getClient();
    const key = `session:${sessionId}`;

    const data = await client.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as SessionData;
  }

  /**
   * Delete session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    const client = this.getClient();
    const key = `session:${sessionId}`;

    await client.del(key);
  }

  /**
   * Update session activity timestamp
   */
  public async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      await this.storeSession(sessionId, session);
    }
  }

  // ============================================================================
  // Message History (using Redis Streams)
  // ============================================================================

  /**
   * Add message to conversation history
   */
  public async addMessage(sessionId: string, message: MessageEntry): Promise<string> {
    const client = this.getClient();
    const streamKey = `messages:${sessionId}`;

    const messageId = await client.xAdd(streamKey, '*', {
      role: message.role,
      content: message.content,
      language: message.language,
      timestamp: message.timestamp.toString(),
      metadata: message.metadata,
    });

    // Set TTL on the stream
    const ttl = parseInt(process.env.ARTISAN_BUDDY_SESSION_TTL || String(DEFAULT_SESSION_TTL));
    await client.expire(streamKey, ttl);

    return messageId;
  }

  /**
   * Get conversation history
   */
  public async getMessages(sessionId: string, limit: number = 20): Promise<MessageEntry[]> {
    const client = this.getClient();
    const streamKey = `messages:${sessionId}`;

    try {
      // Get messages from stream (most recent first)
      const messages = await client.xRevRange(streamKey, '+', '-', { COUNT: limit });

      return messages.reverse().map((msg) => ({
        id: msg.id,
        role: msg.message.role as 'user' | 'assistant',
        content: msg.message.content,
        language: msg.message.language,
        timestamp: parseInt(msg.message.timestamp),
        metadata: msg.message.metadata,
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Clear conversation history
   */
  public async clearMessages(sessionId: string): Promise<void> {
    const client = this.getClient();
    const streamKey = `messages:${sessionId}`;

    await client.del(streamKey);
  }

  // ============================================================================
  // Caching
  // ============================================================================

  /**
   * Cache a value
   */
  public async cache(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    const cacheKey = `cache:${key}`;
    const cacheTTL = ttl || parseInt(process.env.ARTISAN_BUDDY_CACHE_TTL || String(DEFAULT_CACHE_TTL));

    await client.setEx(cacheKey, cacheTTL, value);
  }

  /**
   * Get cached value
   */
  public async getCached(key: string): Promise<string | null> {
    const client = this.getClient();
    const cacheKey = `cache:${key}`;

    return await client.get(cacheKey);
  }

  /**
   * Delete cached value
   */
  public async deleteCached(key: string): Promise<void> {
    const client = this.getClient();
    const cacheKey = `cache:${key}`;

    await client.del(cacheKey);
  }

  /**
   * Cache JSON object
   */
  public async cacheJSON(key: string, value: any, ttl?: number): Promise<void> {
    await this.cache(key, JSON.stringify(value), ttl);
  }

  /**
   * Get cached JSON object
   */
  public async getCachedJSON<T>(key: string): Promise<T | null> {
    const cached = await this.getCached(key);
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error('Error parsing cached JSON:', error);
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on key
   */
  public async expire(key: string, seconds: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, seconds);
  }

  /**
   * Get TTL of key
   */
  public async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Increment counter
   */
  public async increment(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * Decrement counter
   */
  public async decrement(key: string): Promise<number> {
    const client = this.getClient();
    return await client.decr(key);
  }

  /**
   * Get all keys matching pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  /**
   * Delete multiple keys
   */
  public async deleteKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    const client = this.getClient();
    return await client.del(keys);
  }

  /**
   * Flush all data (use with caution!)
   */
  public async flushAll(): Promise<void> {
    const client = this.getClient();
    await client.flushAll();
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();
