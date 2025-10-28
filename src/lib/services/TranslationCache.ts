/**
 * Translation Cache Service
 * Provides caching and optimization for translation requests
 */

import { createHash } from 'crypto';

export interface CachedTranslation {
  translatedText: string;
  confidence: number;
  alternatives: string[];
  culturalContext?: string;
  timestamp: number;
  hitCount: number;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslationCacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  oldestEntry: number;
  newestEntry: number;
}

export class TranslationCache {
  private static instance: TranslationCache;
  private cache = new Map<string, CachedTranslation>();
  private maxSize: number;
  private maxAge: number; // in milliseconds
  private hitCount = 0;
  private missCount = 0;
  
  // Common phrases cache for offline support
  private commonPhrases = new Map<string, CachedTranslation>();
  
  constructor(maxSize = 10000, maxAgeHours = 24) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
    this.initializeCommonPhrases();
  }
  
  static getInstance(): TranslationCache {
    if (!TranslationCache.instance) {
      TranslationCache.instance = new TranslationCache();
    }
    return TranslationCache.instance;
  }
  
  /**
   * Generate cache key for translation request
   */
  private generateCacheKey(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string,
    context?: any
  ): string {
    const contextString = context ? JSON.stringify(context) : '';
    const input = `${text}|${sourceLanguage}|${targetLanguage}|${contextString}`;
    return createHash('md5').update(input.toLowerCase().trim()).digest('hex');
  }
  
  /**
   * Get cached translation
   */
  get(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string,
    context?: any
  ): CachedTranslation | null {
    const key = this.generateCacheKey(text, sourceLanguage, targetLanguage, context);
    
    // Check main cache
    let cached = this.cache.get(key);
    
    // Check common phrases cache if not found
    if (!cached) {
      cached = this.commonPhrases.get(key);
    }
    
    if (cached) {
      // Check if entry is still valid
      if (Date.now() - cached.timestamp > this.maxAge) {
        this.cache.delete(key);
        this.missCount++;
        return null;
      }
      
      // Update hit count and timestamp
      cached.hitCount++;
      cached.timestamp = Date.now();
      this.hitCount++;
      
      return cached;
    }
    
    this.missCount++;
    return null;
  }
  
  /**
   * Store translation in cache
   */
  set(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    translation: Omit<CachedTranslation, 'timestamp' | 'hitCount' | 'sourceLanguage' | 'targetLanguage'>,
    context?: any
  ): void {
    const key = this.generateCacheKey(text, sourceLanguage, targetLanguage, context);
    
    const cachedTranslation: CachedTranslation = {
      ...translation,
      timestamp: Date.now(),
      hitCount: 0,
      sourceLanguage,
      targetLanguage
    };
    
    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldEntries();
    }
    
    this.cache.set(key, cachedTranslation);
  }
  
  /**
   * Evict old entries when cache is full
   */
  private evictOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp and hit count (LRU with frequency consideration)
    entries.sort((a, b) => {
      const scoreA = a[1].timestamp + (a[1].hitCount * 60000); // Boost recent and frequently used
      const scoreB = b[1].timestamp + (b[1].hitCount * 60000);
      return scoreA - scoreB;
    });
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  /**
   * Initialize common phrases for offline support
   */
  private initializeCommonPhrases(): void {
    const commonTranslations = [
      // English to Hindi
      { text: 'hello', source: 'en', target: 'hi', translation: 'नमस्ते', confidence: 0.95 },
      { text: 'thank you', source: 'en', target: 'hi', translation: 'धन्यवाद', confidence: 0.95 },
      { text: 'please', source: 'en', target: 'hi', translation: 'कृपया', confidence: 0.95 },
      { text: 'yes', source: 'en', target: 'hi', translation: 'हाँ', confidence: 0.95 },
      { text: 'no', source: 'en', target: 'hi', translation: 'नहीं', confidence: 0.95 },
      { text: 'price', source: 'en', target: 'hi', translation: 'कीमत', confidence: 0.95 },
      { text: 'order', source: 'en', target: 'hi', translation: 'ऑर्डर', confidence: 0.95 },
      { text: 'delivery', source: 'en', target: 'hi', translation: 'डिलीवरी', confidence: 0.95 },
      
      // Hindi to English
      { text: 'नमस्ते', source: 'hi', target: 'en', translation: 'hello', confidence: 0.95 },
      { text: 'धन्यवाद', source: 'hi', target: 'en', translation: 'thank you', confidence: 0.95 },
      { text: 'कृपया', source: 'hi', target: 'en', translation: 'please', confidence: 0.95 },
      { text: 'हाँ', source: 'hi', target: 'en', translation: 'yes', confidence: 0.95 },
      { text: 'नहीं', source: 'hi', target: 'en', translation: 'no', confidence: 0.95 },
      { text: 'कीमत', source: 'hi', target: 'en', translation: 'price', confidence: 0.95 },
      
      // Craft-specific terms
      { text: 'pottery', source: 'en', target: 'hi', translation: 'मिट्टी के बर्तन', confidence: 0.9 },
      { text: 'handmade', source: 'en', target: 'hi', translation: 'हस्तनिर्मित', confidence: 0.9 },
      { text: 'artisan', source: 'en', target: 'hi', translation: 'कारीगर', confidence: 0.9 },
      { text: 'traditional', source: 'en', target: 'hi', translation: 'पारंपरिक', confidence: 0.9 },
    ];
    
    for (const item of commonTranslations) {
      const key = this.generateCacheKey(item.text, item.source, item.target);
      this.commonPhrases.set(key, {
        translatedText: item.translation,
        confidence: item.confidence,
        alternatives: [],
        timestamp: Date.now(),
        hitCount: 0,
        sourceLanguage: item.source,
        targetLanguage: item.target
      });
    }
  }
  
  /**
   * Preload translations for common phrases
   */
  async preloadTranslations(phrases: string[], sourceLanguage: string, targetLanguage: string): Promise<void> {
    // This would typically make batch translation requests
    // For now, we'll just mark these as requested
    console.log(`Preloading ${phrases.length} phrases from ${sourceLanguage} to ${targetLanguage}`);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): TranslationCacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: this.cache.size,
      hitRate: this.hitCount + this.missCount > 0 ? this.hitCount / (this.hitCount + this.missCount) : 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      cacheSize: this.calculateCacheSize(),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }
  
  /**
   * Calculate approximate cache size in bytes
   */
  private calculateCacheSize(): number {
    let size = 0;
    for (const [key, value] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(value).length * 2;
    }
    return size;
  }
  
  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
  
  /**
   * Get most frequently used translations
   */
  getMostUsed(limit = 10): Array<{ key: string; translation: CachedTranslation }> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => b[1].hitCount - a[1].hitCount);
    
    return entries.slice(0, limit).map(([key, translation]) => ({
      key,
      translation
    }));
  }
  
  /**
   * Get translations by language pair
   */
  getByLanguagePair(sourceLanguage: string, targetLanguage: string): CachedTranslation[] {
    const results: CachedTranslation[] = [];
    
    for (const translation of this.cache.values()) {
      if (translation.sourceLanguage === sourceLanguage && 
          translation.targetLanguage === targetLanguage) {
        results.push(translation);
      }
    }
    
    return results.sort((a, b) => b.hitCount - a.hitCount);
  }
  
  /**
   * Export cache data for backup
   */
  export(): string {
    const data = {
      cache: Array.from(this.cache.entries()),
      stats: this.getStats(),
      timestamp: Date.now()
    };
    
    return JSON.stringify(data);
  }
  
  /**
   * Import cache data from backup
   */
  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.cache && Array.isArray(parsed.cache)) {
        this.cache.clear();
        
        for (const [key, value] of parsed.cache) {
          // Validate entry structure
          if (typeof key === 'string' && value && 
              typeof value.translatedText === 'string' &&
              typeof value.confidence === 'number') {
            this.cache.set(key, value);
          }
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to import cache data:', error);
    }
    
    return false;
  }
  
  /**
   * Optimize cache by removing low-quality or rarely used entries
   */
  optimize(): number {
    const entries = Array.from(this.cache.entries());
    let removed = 0;
    
    for (const [key, value] of entries) {
      // Remove entries with very low confidence and no hits
      if (value.confidence < 0.3 && value.hitCount === 0) {
        this.cache.delete(key);
        removed++;
      }
      
      // Remove very old entries with low hit count
      const age = Date.now() - value.timestamp;
      if (age > this.maxAge * 2 && value.hitCount < 2) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
}