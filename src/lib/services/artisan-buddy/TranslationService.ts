/**
 * Enhanced Translation Service for Artisan Buddy
 * Implements Redis caching, batch optimization, quality monitoring, and error handling
 * Requirements: 4.1, 4.3, 10.1, 10.2
 */

import { createClient, RedisClientType } from 'redis';
import { LanguageCode } from '@/lib/i18n';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TranslationRequest {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  context?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  confidence: number;
  cached: boolean;
  processingTime: number;
  qualityScore?: number;
  error?: string;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  totalProcessingTime: number;
  cacheHitRate: number;
  averageConfidence: number;
  successRate: number;
  errors: Array<{ index: number; error: string }>;
}

export interface TranslationQualityMetrics {
  translationId: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  confidence: number;
  qualityScore: number;
  processingTime: number;
  cached: boolean;
  timestamp: number;
  error?: string;
}

export interface TranslationServiceConfig {
  redis: {
    enabled: boolean;
    url: string;
    password?: string;
    db?: number;
    keyPrefix: string;
    maxRetries: number;
    retryDelay: number;
  };
  cache: {
    ttl: number; // 7 days default
    maxSize: number;
  };
  batch: {
    maxSize: number;
    timeout: number;
  };
  rateLimit: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  quality: {
    minConfidence: number;
    enableMonitoring: boolean;
    sampleRate: number; // Percentage of translations to monitor
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: TranslationServiceConfig = {
  redis: {
    enabled: !!process.env.REDIS_URL,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1'),
    keyPrefix: 'artisan-buddy:translation:',
    maxRetries: 3,
    retryDelay: 1000
  },
  cache: {
    ttl: 7 * 24 * 60 * 60, // 7 days
    maxSize: 10000
  },
  batch: {
    maxSize: 50,
    timeout: 30000 // 30 seconds
  },
  rateLimit: {
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 5000
  },
  quality: {
    minConfidence: 0.7,
    enableMonitoring: true,
    sampleRate: 0.1 // Monitor 10% of translations
  }
};

// ============================================================================
// TRANSLATION SERVICE
// ============================================================================

export class TranslationService {
  private static instance: TranslationService;
  private config: TranslationServiceConfig;
  private redisClient: RedisClientType | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  // In-memory fallback cache
  private memoryCache: Map<string, { value: TranslationResult; expiry: number }> = new Map();
  
  // Rate limiting
  private requestTimestamps: number[] = [];
  
  // Quality monitoring
  private qualityMetrics: TranslationQualityMetrics[] = [];
  private maxMetricsSize = 1000;

  // Batch processing queue
  private batchQueue: Map<string, {
    requests: TranslationRequest[];
    resolvers: Array<(result: TranslationResult) => void>;
    rejectors: Array<(error: Error) => void>;
    timer: NodeJS.Timeout;
  }> = new Map();

  private constructor(config: Partial<TranslationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Redis if enabled
    if (this.config.redis.enabled) {
      this.initializeRedis();
    }

    // Start cleanup intervals
    this.startCleanupIntervals();
  }

  static getInstance(config?: Partial<TranslationServiceConfig>): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService(config);
    }
    return TranslationService.instance;
  }

  // ============================================================================
  // REDIS CONNECTION MANAGEMENT
  // ============================================================================

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
              if (retries > this.config.redis.maxRetries) {
                console.error('[TranslationService] Redis max retries exceeded');
                return new Error('Redis connection failed');
              }
              return this.config.redis.retryDelay;
            }
          }
        });

        this.redisClient.on('error', (err) => {
          console.error('[TranslationService] Redis error:', err);
          this.isConnected = false;
        });

        this.redisClient.on('connect', () => {
          console.log('[TranslationService] Redis connected');
          this.isConnected = true;
        });

        this.redisClient.on('disconnect', () => {
          console.warn('[TranslationService] Redis disconnected');
          this.isConnected = false;
        });

        await this.redisClient.connect();
        console.log('[TranslationService] Redis initialized successfully');
      } catch (error) {
        console.error('[TranslationService] Failed to initialize Redis:', error);
        this.redisClient = null;
        this.isConnected = false;
      }
    })();

    return this.connectionPromise;
  }

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
      console.error('[TranslationService] Failed to connect to Redis:', error);
      return false;
    }
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  private getCacheKey(text: string, source: LanguageCode, target: LanguageCode): string {
    // Create a hash of the text to keep keys manageable
    const textHash = this.simpleHash(text);
    return `${this.config.redis.keyPrefix}${source}:${target}:${textHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async getCached(key: string): Promise<TranslationResult | null> {
    try {
      // Try Redis first
      if (await this.ensureConnected() && this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          const result = JSON.parse(value) as TranslationResult;
          result.cached = true;
          return result;
        }
      }

      // Fall back to memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue && memoryValue.expiry > Date.now()) {
        const result = { ...memoryValue.value };
        result.cached = true;
        return result;
      }

      return null;
    } catch (error) {
      console.error('[TranslationService] Cache get error:', error);
      return null;
    }
  }

  private async setCached(key: string, value: TranslationResult): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis first
      if (await this.ensureConnected() && this.redisClient) {
        await this.redisClient.setEx(key, this.config.cache.ttl, serialized);
      }

      // Also set in memory cache
      const expiry = Date.now() + (this.config.cache.ttl * 1000);
      this.memoryCache.set(key, { value, expiry });

      // Enforce cache size limit
      if (this.memoryCache.size > this.config.cache.maxSize) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) {
          this.memoryCache.delete(firstKey);
        }
      }
    } catch (error) {
      console.error('[TranslationService] Cache set error:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear Redis
      if (await this.ensureConnected() && this.redisClient) {
        const keys = await this.redisClient.keys(`${this.config.redis.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      // Clear memory cache
      this.memoryCache.clear();

      console.log('[TranslationService] Cache cleared');
    } catch (error) {
      console.error('[TranslationService] Failed to clear cache:', error);
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  private checkRateLimit(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);

    // Check per-minute limit
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    if (recentRequests.length >= this.config.rateLimit.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.rateLimit.maxRequestsPerMinute} requests per minute`
      };
    }

    // Check per-hour limit
    if (this.requestTimestamps.length >= this.config.rateLimit.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.rateLimit.maxRequestsPerHour} requests per hour`
      };
    }

    // Add current request
    this.requestTimestamps.push(now);
    return { allowed: true };
  }

  // ============================================================================
  // QUALITY MONITORING
  // ============================================================================

  private recordQualityMetrics(result: TranslationResult): void {
    if (!this.config.quality.enableMonitoring) {
      return;
    }

    // Sample based on configured rate
    if (Math.random() > this.config.quality.sampleRate) {
      return;
    }

    const metrics: TranslationQualityMetrics = {
      translationId: `${result.sourceLanguage}_${result.targetLanguage}_${Date.now()}`,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      confidence: result.confidence,
      qualityScore: result.qualityScore || 0,
      processingTime: result.processingTime,
      cached: result.cached,
      timestamp: Date.now(),
      error: result.error
    };

    this.qualityMetrics.push(metrics);

    // Enforce size limit
    if (this.qualityMetrics.length > this.maxMetricsSize) {
      this.qualityMetrics.shift();
    }
  }

  getQualityMetrics(): {
    total: number;
    averageConfidence: number;
    averageQualityScore: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    errorRate: number;
    byLanguagePair: Record<string, {
      count: number;
      averageConfidence: number;
      averageProcessingTime: number;
    }>;
  } {
    if (this.qualityMetrics.length === 0) {
      return {
        total: 0,
        averageConfidence: 0,
        averageQualityScore: 0,
        averageProcessingTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        byLanguagePair: {}
      };
    }

    const total = this.qualityMetrics.length;
    const totalConfidence = this.qualityMetrics.reduce((sum, m) => sum + m.confidence, 0);
    const totalQuality = this.qualityMetrics.reduce((sum, m) => sum + m.qualityScore, 0);
    const totalTime = this.qualityMetrics.reduce((sum, m) => sum + m.processingTime, 0);
    const cacheHits = this.qualityMetrics.filter(m => m.cached).length;
    const errors = this.qualityMetrics.filter(m => m.error).length;

    // Group by language pair
    const byLanguagePair: Record<string, {
      count: number;
      totalConfidence: number;
      totalTime: number;
    }> = {};

    this.qualityMetrics.forEach(m => {
      const pair = `${m.sourceLanguage}_${m.targetLanguage}`;
      if (!byLanguagePair[pair]) {
        byLanguagePair[pair] = { count: 0, totalConfidence: 0, totalTime: 0 };
      }
      byLanguagePair[pair].count++;
      byLanguagePair[pair].totalConfidence += m.confidence;
      byLanguagePair[pair].totalTime += m.processingTime;
    });

    const byLanguagePairStats: Record<string, {
      count: number;
      averageConfidence: number;
      averageProcessingTime: number;
    }> = {};

    Object.entries(byLanguagePair).forEach(([pair, stats]) => {
      byLanguagePairStats[pair] = {
        count: stats.count,
        averageConfidence: stats.totalConfidence / stats.count,
        averageProcessingTime: stats.totalTime / stats.count
      };
    });

    return {
      total,
      averageConfidence: totalConfidence / total,
      averageQualityScore: totalQuality / total,
      averageProcessingTime: totalTime / total,
      cacheHitRate: cacheHits / total,
      errorRate: errors / total,
      byLanguagePair: byLanguagePairStats
    };
  }

  // ============================================================================
  // TRANSLATION OPERATIONS
  // ============================================================================

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();

    try {
      // Input validation
      if (!request.text || request.text.trim() === '') {
        return {
          translatedText: request.text,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          confidence: 1.0,
          cached: false,
          processingTime: Date.now() - startTime
        };
      }

      // Don't translate if source and target are the same
      if (request.sourceLanguage === request.targetLanguage) {
        return {
          translatedText: request.text,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          confidence: 1.0,
          cached: false,
          processingTime: Date.now() - startTime
        };
      }

      // Check cache
      const cacheKey = this.getCacheKey(request.text, request.sourceLanguage, request.targetLanguage);
      const cached = await this.getCached(cacheKey);
      if (cached) {
        cached.processingTime = Date.now() - startTime;
        this.recordQualityMetrics(cached);
        return cached;
      }

      // Check rate limit
      const rateLimitCheck = this.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
      }

      // Call translation API
      const result = await this.callTranslationAPI(request);
      result.processingTime = Date.now() - startTime;

      // Cache the result
      await this.setCached(cacheKey, result);

      // Record quality metrics
      this.recordQualityMetrics(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TranslationService] Translation error:', errorMessage);

      const result: TranslationResult = {
        translatedText: request.text, // Return original text on error
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 0.0,
        cached: false,
        processingTime: Date.now() - startTime,
        error: errorMessage
      };

      this.recordQualityMetrics(result);
      return result;
    }
  }

  // ============================================================================
  // BATCH TRANSLATION
  // ============================================================================

  async translateBatch(requests: TranslationRequest[]): Promise<BatchTranslationResult> {
    const startTime = Date.now();
    const results: TranslationResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Separate cached and non-cached requests
    const cachedResults: Map<number, TranslationResult> = new Map();
    const uncachedRequests: Array<{ index: number; request: TranslationRequest }> = [];

    // Check cache for all requests
    await Promise.all(
      requests.map(async (request, index) => {
        // Skip empty or same-language requests
        if (!request.text || request.text.trim() === '' || 
            request.sourceLanguage === request.targetLanguage) {
          cachedResults.set(index, {
            translatedText: request.text,
            originalText: request.text,
            sourceLanguage: request.sourceLanguage,
            targetLanguage: request.targetLanguage,
            confidence: 1.0,
            cached: false,
            processingTime: 0
          });
          return;
        }

        const cacheKey = this.getCacheKey(request.text, request.sourceLanguage, request.targetLanguage);
        const cached = await this.getCached(cacheKey);
        
        if (cached) {
          cachedResults.set(index, cached);
        } else {
          uncachedRequests.push({ index, request });
        }
      })
    );

    // Process uncached requests in batches
    if (uncachedRequests.length > 0) {
      // Check rate limit
      const rateLimitCheck = this.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        // Return cached results and errors for uncached
        uncachedRequests.forEach(({ index }) => {
          errors.push({ index, error: rateLimitCheck.reason! });
          results[index] = {
            translatedText: requests[index].text,
            originalText: requests[index].text,
            sourceLanguage: requests[index].sourceLanguage,
            targetLanguage: requests[index].targetLanguage,
            confidence: 0.0,
            cached: false,
            processingTime: 0,
            error: rateLimitCheck.reason
          };
        });
      } else {
        // Process in chunks
        const chunkSize = this.config.batch.maxSize;
        for (let i = 0; i < uncachedRequests.length; i += chunkSize) {
          const chunk = uncachedRequests.slice(i, i + chunkSize);
          
          try {
            const chunkResults = await this.callBatchTranslationAPI(
              chunk.map(item => item.request)
            );

            // Store results and cache them
            await Promise.all(
              chunk.map(async ({ index, request }, chunkIndex) => {
                const result = chunkResults[chunkIndex];
                results[index] = result;

                // Cache successful translations
                if (!result.error) {
                  const cacheKey = this.getCacheKey(
                    request.text,
                    request.sourceLanguage,
                    request.targetLanguage
                  );
                  await this.setCached(cacheKey, result);
                } else {
                  errors.push({ index, error: result.error });
                }

                this.recordQualityMetrics(result);
              })
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Record errors for this chunk
            chunk.forEach(({ index, request }) => {
              errors.push({ index, error: errorMessage });
              results[index] = {
                translatedText: request.text,
                originalText: request.text,
                sourceLanguage: request.sourceLanguage,
                targetLanguage: request.targetLanguage,
                confidence: 0.0,
                cached: false,
                processingTime: 0,
                error: errorMessage
              };
            });
          }
        }
      }
    }

    // Merge cached and new results
    cachedResults.forEach((result, index) => {
      results[index] = result;
    });

    // Calculate statistics
    const validResults = results.filter(r => r !== undefined);
    const totalConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0);
    const successCount = validResults.filter(r => !r.error).length;

    return {
      results: validResults,
      totalProcessingTime: Date.now() - startTime,
      cacheHitRate: cachedResults.size / requests.length,
      averageConfidence: validResults.length > 0 ? totalConfidence / validResults.length : 0,
      successRate: validResults.length > 0 ? successCount / validResults.length : 0,
      errors
    };
  }

  // ============================================================================
  // API CALLS
  // ============================================================================

  private async callTranslationAPI(request: TranslationRequest): Promise<TranslationResult> {
    try {
      const { fetchApi } = await import('@/lib/utils/url');
      const response = await fetchApi('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract result from the API response structure
      const result = data.result || data;

      return {
        translatedText: result.translatedText || request.text,
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: result.confidence || 0.95,
        cached: false,
        processingTime: 0,
        qualityScore: this.calculateQualityScore(request.text, result.translatedText || request.text)
      };
    } catch (error) {
      throw error;
    }
  }

  private async callBatchTranslationAPI(requests: TranslationRequest[]): Promise<TranslationResult[]> {
    try {
      const { fetchApi } = await import('@/lib/utils/url');
      const response = await fetchApi('/api/bulk-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: requests.map(r => r.text),
          sourceLanguage: requests[0].sourceLanguage,
          targetLanguage: requests[0].targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch translation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const translations = data.translations || [];

      return requests.map((request, index) => {
        const translation = translations[index];
        const translatedText = translation?.translated || request.text;
        const success = translation?.success !== false;

        return {
          translatedText,
          originalText: request.text,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          confidence: success ? 0.95 : 0.5,
          cached: false,
          processingTime: 0,
          qualityScore: this.calculateQualityScore(request.text, translatedText),
          error: success ? undefined : 'Translation failed'
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateQualityScore(originalText: string, translatedText: string): number {
    // Simple quality scoring based on length ratio and character diversity
    const lengthRatio = translatedText.length / originalText.length;
    const lengthScore = lengthRatio > 0.3 && lengthRatio < 3 ? 0.5 : 0.2;

    const uniqueChars = new Set(translatedText.toLowerCase()).size;
    const diversityScore = Math.min(uniqueChars / 20, 0.5);

    return Math.min(lengthScore + diversityScore, 1.0);
  }

  private startCleanupIntervals(): void {
    // Clean memory cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryCache.entries()) {
        if (value.expiry <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    // Clean rate limit timestamps every minute
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000;
      this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);
    }, 60 * 1000);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
        this.isConnected = false;
      }
      console.log('[TranslationService] Disconnected');
    } catch (error) {
      console.error('[TranslationService] Error disconnecting:', error);
    }
  }
}

// Export singleton instance
export const translationService = TranslationService.getInstance();
