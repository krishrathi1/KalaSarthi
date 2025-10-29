/**
 * Unified Translation Service
 * A clean, reliable translation system using Google Translate API
 * Replaces all existing broken translation code
 */

import { LanguageCode } from '@/lib/i18n';

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  cached: boolean;
  processingTime: number;
  detectedLanguage?: string;
  qualityScore?: number;
  isCustomOverride?: boolean;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  totalProcessingTime: number;
  cacheHitRate: number;
  averageConfidence: number;
  averageQualityScore: number;
}

export interface LanguageDetectionResult {
  detectedLanguage: LanguageCode;
  confidence: number;
  alternatives: Array<{ language: LanguageCode; confidence: number }>;
}

export interface QualityFeedback {
  translationId: string;
  originalText: string;
  translatedText: string;
  rating: number; // 1-5 scale
  feedback?: string;
  timestamp: number;
}

export interface CustomTranslationOverride {
  originalText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  createdAt: number;
  createdBy?: string;
}

export interface TranslationCache {
  get(key: string): string | null;
  set(key: string, value: string, ttl?: number): void;
  clear(): void;
  size(): number;
}

/**
 * Language detection utility using statistical analysis
 */
class LanguageDetector {
  // Common words and patterns for different languages
  private static readonly LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
    hi: [/[\u0900-\u097F]/g, /\b(है|हैं|का|की|के|में|से|को|पर|और|या|नहीं|आप|मैं|ठीक|हूं)\b/g],
    ta: [/[\u0B80-\u0BFF]/g, /\b(உள்ளது|இருக்கிறது|என்று|அல்லது|மற்றும்)\b/g],
    bn: [/[\u0980-\u09FF]/g, /\b(আছে|হয়|এর|এবং|বা|না|থেকে)\b/g],
    te: [/[\u0C00-\u0C7F]/g, /\b(ఉంది|అని|లేదా|మరియు|నుండి)\b/g],
    gu: [/[\u0A80-\u0AFF]/g, /\b(છે|અને|અથવા|નથી|માં|થી)\b/g],
    mr: [/[\u0900-\u097F]/g, /\b(आहे|आणि|किंवा|नाही|मध्ये|पासून)\b/g],
    es: [/[ñáéíóúü]/g, /\b(el|la|de|que|y|a|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|al|del|los|cómo|estás|espero|tengas|buen|día)\b/g],
    fr: [/[àâäéèêëïîôöùûüÿç]/g, /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|par|grand)\b/g],
    de: [/[äöüß]/g, /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei)\b/g],
    ar: [/[\u0600-\u06FF]/g, /\b(في|من|إلى|على|هذا|هذه|التي|الذي|أن|كان|لم|قد|ما|لا|أو|كل|بعد|عند|حتى|أم|أي|كيف|أين|متى|لماذا)\b/g]
  };

  static detectLanguage(text: string): LanguageDetectionResult {
    if (!text || text.trim().length < 10) {
      return {
        detectedLanguage: 'en' as LanguageCode,
        confidence: 0.5,
        alternatives: []
      };
    }

    const scores: Record<string, number> = {};
    const cleanText = text.toLowerCase().trim();

    // Check each language pattern
    for (const [lang, patterns] of Object.entries(this.LANGUAGE_PATTERNS)) {
      let score = 0;

      for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          score += matches.length * (pattern.source.includes('\\u') ? 3 : 1); // Unicode patterns get higher weight
        }
      }

      // Normalize score by text length
      scores[lang] = score / cleanText.length;
    }

    // Check for English (default fallback)
    const englishWords = cleanText.match(/\b(the|and|or|not|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|under|over)\b/g);
    scores['en'] = englishWords ? (englishWords.length / cleanText.split(' ').length) : 0.1;

    // Sort by score
    const sortedResults = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    if (sortedResults.length === 0) {
      return {
        detectedLanguage: 'en' as LanguageCode,
        confidence: 0.3,
        alternatives: []
      };
    }

    const [topLang, topScore] = sortedResults[0];
    const alternatives = sortedResults.slice(1, 4).map(([lang, score]) => ({
      language: lang as LanguageCode,
      confidence: Math.min(score * 0.8, 0.95) // Cap confidence
    }));

    return {
      detectedLanguage: topLang as LanguageCode,
      confidence: Math.min(topScore * 1.2, 0.95), // Boost top result but cap at 95%
      alternatives
    };
  }
}

/**
 * Quality scoring system for translations
 */
class QualityScorer {
  static calculateQualityScore(
    originalText: string,
    translatedText: string,
    confidence: number
  ): number {
    let score = confidence * 0.4; // Base score from API confidence

    // Length similarity (translations shouldn't be drastically different in length)
    const lengthRatio = translatedText.length / originalText.length;
    const lengthScore = lengthRatio > 0.3 && lengthRatio < 3 ? 0.2 : 0.1;
    score += lengthScore;

    // Character diversity (good translations have varied characters)
    const uniqueChars = new Set(translatedText.toLowerCase()).size;
    const diversityScore = Math.min(uniqueChars / 20, 0.2);
    score += diversityScore;

    // Word count similarity
    const originalWords = originalText.split(/\s+/).length;
    const translatedWords = translatedText.split(/\s+/).length;
    const wordRatio = translatedWords / originalWords;
    const wordScore = wordRatio > 0.5 && wordRatio < 2 ? 0.2 : 0.1;
    score += wordScore;

    return Math.min(score, 1.0);
  }
}

/**
 * Multi-level caching system for translations
 */
class UnifiedTranslationCache implements TranslationCache {
  private memoryCache = new Map<string, { value: string; expires: number }>();
  private readonly maxMemorySize = 1000; // Maximum items in memory
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  get(key: string): string | null {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && memoryItem.expires > Date.now()) {
      return memoryItem.value;
    }

    // Check localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`translation_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.expires > Date.now()) {
            // Also cache in memory for faster access
            this.memoryCache.set(key, { value: parsed.value, expires: parsed.expires });
            return parsed.value;
          } else {
            // Remove expired item
            localStorage.removeItem(`translation_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage cache:', error);
      }
    }

    return null;
  }

  set(key: string, value: string, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl;

    // Set in memory cache
    this.memoryCache.set(key, { value, expires });

    // Cleanup memory cache if too large
    if (this.memoryCache.size > this.maxMemorySize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Set in localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`translation_${key}`, JSON.stringify({ value, expires }));
      } catch (error) {
        console.warn('Failed to write to localStorage cache:', error);
      }
    }
  }

  clear(): void {
    this.memoryCache.clear();

    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('translation_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
    }
  }

  size(): number {
    return this.memoryCache.size;
  }
}

/**
 * Google Translate API language mapping
 */
const GOOGLE_LANGUAGE_MAP: Record<LanguageCode, string> = {
  // Indian Languages
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  bn: 'bn',
  te: 'te',
  as: 'as',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  ur: 'ur',
  mr: 'mr',
  ne: 'ne',

  // Regional languages with fallbacks
  mai: 'hi', // Maithili -> Hindi
  bho: 'hi', // Bhojpuri -> Hindi
  doi: 'hi', // Dogri -> Hindi
  kok: 'mr', // Konkani -> Marathi
  raj: 'hi', // Rajasthani -> Hindi
  mni: 'hi', // Manipuri -> Hindi
  sa: 'hi',  // Sanskrit -> Hindi
  sat: 'hi', // Santali -> Hindi
  sd: 'ur',  // Sindhi -> Urdu

  // International Languages
  es: 'es', fr: 'fr', de: 'de', zh: 'zh', ja: 'ja',
  ar: 'ar', pt: 'pt', ru: 'ru', it: 'it', ko: 'ko',
  nl: 'nl', sv: 'sv', da: 'da', no: 'no', fi: 'fi',
  pl: 'pl', tr: 'tr', th: 'th', vi: 'vi'
};

/**
 * Main Unified Translation Service
 */
export class UnifiedTranslationService {
  private static instance: UnifiedTranslationService;
  private cache: UnifiedTranslationCache;
  private rateLimiter: Map<string, number> = new Map();
  private readonly maxRequestsPerMinute = 100;
  private readonly batchSize = 50;
  private customOverrides: Map<string, CustomTranslationOverride> = new Map();
  private qualityFeedback: Map<string, QualityFeedback> = new Map();

  private constructor() {
    this.cache = new UnifiedTranslationCache();
    this.loadCustomOverrides();
    this.loadQualityFeedback();
  }

  static getInstance(): UnifiedTranslationService {
    if (!UnifiedTranslationService.instance) {
      UnifiedTranslationService.instance = new UnifiedTranslationService();
    }
    return UnifiedTranslationService.instance;
  }

  /**
   * Detect language of given text
   */
  detectLanguage(text: string): LanguageDetectionResult {
    return LanguageDetector.detectLanguage(text);
  }

  /**
   * Add custom translation override
   */
  addCustomOverride(override: Omit<CustomTranslationOverride, 'createdAt'>): void {
    const key = this.getOverrideKey(override.originalText, override.sourceLanguage, override.targetLanguage);
    const fullOverride: CustomTranslationOverride = {
      ...override,
      createdAt: Date.now()
    };

    this.customOverrides.set(key, fullOverride);
    this.saveCustomOverrides();
  }

  /**
   * Remove custom translation override
   */
  removeCustomOverride(originalText: string, sourceLanguage: LanguageCode, targetLanguage: LanguageCode): void {
    const key = this.getOverrideKey(originalText, sourceLanguage, targetLanguage);
    this.customOverrides.delete(key);
    this.saveCustomOverrides();
  }

  /**
   * Get all custom overrides
   */
  getCustomOverrides(): CustomTranslationOverride[] {
    return Array.from(this.customOverrides.values());
  }

  /**
   * Submit quality feedback for a translation
   */
  submitQualityFeedback(feedback: Omit<QualityFeedback, 'timestamp'>): void {
    const fullFeedback: QualityFeedback = {
      ...feedback,
      timestamp: Date.now()
    };

    this.qualityFeedback.set(feedback.translationId, fullFeedback);
    this.saveQualityFeedback();
  }

  /**
   * Get quality feedback for analysis
   */
  getQualityFeedback(): QualityFeedback[] {
    return Array.from(this.qualityFeedback.values());
  }

  /**
   * Get average quality rating for a language pair
   */
  getAverageQuality(sourceLanguage: LanguageCode, targetLanguage: LanguageCode): number {
    const relevantFeedback = Array.from(this.qualityFeedback.values())
      .filter(f => f.translationId.includes(`${sourceLanguage}_${targetLanguage}`));

    if (relevantFeedback.length === 0) return 0;

    const totalRating = relevantFeedback.reduce((sum, f) => sum + f.rating, 0);
    return totalRating / relevantFeedback.length;
  }

  /**
   * Translate a single text with enhanced features
   */
  async translateText(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage?: LanguageCode,
    autoDetectSource: boolean = false
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    let detectedLanguage: string | undefined;
    let actualSourceLanguage = sourceLanguage || 'en';

    // Input validation
    if (!text || text.trim() === '') {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 1.0,
        cached: false,
        processingTime: 0,
        qualityScore: 1.0
      };
    }

    // Auto-detect source language if requested or not provided
    if (autoDetectSource || !sourceLanguage) {
      const detection = this.detectLanguage(text);
      detectedLanguage = detection.detectedLanguage;
      actualSourceLanguage = detection.detectedLanguage;
    }

    // Don't translate if source and target are the same
    if (actualSourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 1.0,
        cached: false,
        processingTime: Date.now() - startTime,
        detectedLanguage,
        qualityScore: 1.0
      };
    }

    // Check for custom override first
    const overrideKey = this.getOverrideKey(text, actualSourceLanguage, targetLanguage);
    const customOverride = this.customOverrides.get(overrideKey);

    if (customOverride) {
      return {
        translatedText: customOverride.translatedText,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 1.0,
        cached: false,
        processingTime: Date.now() - startTime,
        detectedLanguage,
        qualityScore: 1.0,
        isCustomOverride: true
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, actualSourceLanguage, targetLanguage);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const qualityScore = QualityScorer.calculateQualityScore(text, cached, 0.95);
      return {
        translatedText: cached,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 0.95,
        cached: true,
        processingTime: Date.now() - startTime,
        detectedLanguage,
        qualityScore
      };
    }

    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Translation rate limit exceeded. Please try again later.');
    }

    try {
      // Map language codes to Google-supported codes
      const mappedSource = GOOGLE_LANGUAGE_MAP[actualSourceLanguage] || 'en';
      const mappedTarget = GOOGLE_LANGUAGE_MAP[targetLanguage] || 'en';

      // Call translation API
      const { fetchApi } = await import('@/lib/utils/url');
      const response = await fetchApi('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLanguage: mappedSource,
          targetLanguage: mappedTarget,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const translatedText = data.translatedText || text;
      const confidence = data.confidence || 0.95;
      const qualityScore = QualityScorer.calculateQualityScore(text, translatedText, confidence);

      // Cache the result
      this.cache.set(cacheKey, translatedText);

      return {
        translatedText,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence,
        cached: false,
        processingTime: Date.now() - startTime,
        detectedLanguage,
        qualityScore
      };

    } catch (error) {
      console.error('Translation failed:', error);

      // Return original text on error
      return {
        translatedText: text,
        originalText: text,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 0.0,
        cached: false,
        processingTime: Date.now() - startTime,
        detectedLanguage,
        qualityScore: 0.0
      };
    }
  }

  /**
   * Translate multiple texts in batch with enhanced analytics
   */
  async translateBatch(
    texts: string[],
    targetLanguage: LanguageCode,
    sourceLanguage?: LanguageCode,
    autoDetectSource: boolean = false
  ): Promise<BatchTranslationResult> {
    const startTime = Date.now();
    const results: TranslationResult[] = [];
    let cacheHits = 0;

    // Determine source language
    let actualSourceLanguage = sourceLanguage || 'en';
    if (autoDetectSource && texts.length > 0) {
      const detection = this.detectLanguage(texts[0]);
      actualSourceLanguage = detection.detectedLanguage;
    }

    // Don't translate if source and target are the same
    if (actualSourceLanguage === targetLanguage) {
      return {
        results: texts.map(text => ({
          translatedText: text,
          originalText: text,
          sourceLanguage: actualSourceLanguage,
          targetLanguage,
          confidence: 1.0,
          cached: false,
          processingTime: 0,
          qualityScore: 1.0
        })),
        totalProcessingTime: Date.now() - startTime,
        cacheHitRate: 0,
        averageConfidence: 1.0,
        averageQualityScore: 1.0
      };
    }

    // Separate cached and non-cached texts
    const textsToTranslate: string[] = [];
    const textIndexMap: Map<string, number[]> = new Map();

    texts.forEach((text, index) => {
      if (!text || text.trim() === '') {
        results[index] = {
          translatedText: text,
          originalText: text,
          sourceLanguage: actualSourceLanguage,
          targetLanguage,
          confidence: 1.0,
          cached: false,
          processingTime: 0,
          qualityScore: 1.0
        };
        return;
      }

      // Check for custom override
      const overrideKey = this.getOverrideKey(text, actualSourceLanguage, targetLanguage);
      const customOverride = this.customOverrides.get(overrideKey);

      if (customOverride) {
        results[index] = {
          translatedText: customOverride.translatedText,
          originalText: text,
          sourceLanguage: actualSourceLanguage,
          targetLanguage,
          confidence: 1.0,
          cached: false,
          processingTime: 0,
          qualityScore: 1.0,
          isCustomOverride: true
        };
        return;
      }

      // Check cache
      const cacheKey = this.getCacheKey(text, actualSourceLanguage, targetLanguage);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        const qualityScore = QualityScorer.calculateQualityScore(text, cached, 0.95);
        results[index] = {
          translatedText: cached,
          originalText: text,
          sourceLanguage: actualSourceLanguage,
          targetLanguage,
          confidence: 0.95,
          cached: true,
          processingTime: 0,
          qualityScore
        };
        cacheHits++;
        return;
      }

      // Add to translation queue
      if (!textIndexMap.has(text)) {
        textIndexMap.set(text, []);
        textsToTranslate.push(text);
      }
      textIndexMap.get(text)!.push(index);
    });

    // Translate non-cached texts using batch API
    if (textsToTranslate.length > 0) {
      try {
        // Rate limiting check
        if (!this.checkRateLimit()) {
          throw new Error('Translation rate limit exceeded. Please try again later.');
        }

        // Map language codes to Google-supported codes
        const mappedSource = GOOGLE_LANGUAGE_MAP[actualSourceLanguage] || 'en';
        const mappedTarget = GOOGLE_LANGUAGE_MAP[targetLanguage] || 'en';

        // Call batch translation API
        const { fetchApi } = await import('@/lib/utils/url');
        const response = await fetchApi('/api/bulk-translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            texts: textsToTranslate,
            sourceLanguage: mappedSource,
            targetLanguage: mappedTarget,
          }),
        });

        if (!response.ok) {
          throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Process batch results from bulk-translate API
        const batchResults = data.translations || [];

        textsToTranslate.forEach((originalText, batchIndex) => {
          const batchResult = batchResults[batchIndex];
          const translatedText = batchResult?.translated || originalText;
          const confidence = batchResult?.success ? 0.95 : 0.5;
          const qualityScore = QualityScorer.calculateQualityScore(originalText, translatedText, confidence);

          // Cache the result
          const cacheKey = this.getCacheKey(originalText, actualSourceLanguage, targetLanguage);
          this.cache.set(cacheKey, translatedText);

          // Apply to all instances of this text
          const indices = textIndexMap.get(originalText) || [];
          indices.forEach(index => {
            results[index] = {
              translatedText,
              originalText,
              sourceLanguage: actualSourceLanguage,
              targetLanguage,
              confidence,
              cached: false,
              processingTime: 0,
              qualityScore
            };
          });
        });

      } catch (error) {
        console.error('Batch translation failed:', error);

        // Fallback: return original texts for failed translations
        textsToTranslate.forEach(originalText => {
          const indices = textIndexMap.get(originalText) || [];
          indices.forEach(index => {
            results[index] = {
              translatedText: originalText,
              originalText,
              sourceLanguage: actualSourceLanguage,
              targetLanguage,
              confidence: 0.0,
              cached: false,
              processingTime: 0,
              qualityScore: 0.0
            };
          });
        });
      }
    }

    // Calculate analytics
    const validResults = results.filter(r => r !== undefined);
    const totalConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0);
    const totalQuality = validResults.reduce((sum, r) => sum + (r.qualityScore || 0), 0);
    const averageConfidence = validResults.length > 0 ? totalConfidence / validResults.length : 0;
    const averageQualityScore = validResults.length > 0 ? totalQuality / validResults.length : 0;

    return {
      results: validResults,
      totalProcessingTime: Date.now() - startTime,
      cacheHitRate: texts.length > 0 ? cacheHits / texts.length : 0,
      averageConfidence,
      averageQualityScore
    };
  }

  /**
   * Clear all cached translations
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear all custom overrides (for testing)
   */
  clearCustomOverrides(): void {
    this.customOverrides.clear();
    this.saveCustomOverrides();
  }

  /**
   * Clear all quality feedback (for testing)
   */
  clearQualityFeedback(): void {
    this.qualityFeedback.clear();
    this.saveQualityFeedback();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size(),
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  /**
   * Check if translation is supported for language pair
   */
  isLanguagePairSupported(source: LanguageCode, target: LanguageCode): boolean {
    return GOOGLE_LANGUAGE_MAP[source] !== undefined && GOOGLE_LANGUAGE_MAP[target] !== undefined;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(GOOGLE_LANGUAGE_MAP) as LanguageCode[];
  }

  // Private helper methods

  private getCacheKey(text: string, source: LanguageCode, target: LanguageCode): string {
    return `${text}_${source}_${target}`;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Clean old entries
    for (const [key, timestamp] of this.rateLimiter.entries()) {
      if (timestamp < windowStart) {
        this.rateLimiter.delete(key);
      }
    }

    // Check current rate
    const currentRequests = this.rateLimiter.size;
    if (currentRequests >= this.maxRequestsPerMinute) {
      return false;
    }

    // Add current request
    this.rateLimiter.set(now.toString(), now);
    return true;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getOverrideKey(text: string, source: LanguageCode, target: LanguageCode): string {
    return `${text}_${source}_${target}`;
  }

  private loadCustomOverrides(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('translation_custom_overrides');
        if (stored) {
          const overrides = JSON.parse(stored) as CustomTranslationOverride[];
          overrides.forEach(override => {
            const key = this.getOverrideKey(override.originalText, override.sourceLanguage, override.targetLanguage);
            this.customOverrides.set(key, override);
          });
        }
      } catch (error) {
        console.warn('Failed to load custom overrides:', error);
      }
    }
  }

  private saveCustomOverrides(): void {
    if (typeof window !== 'undefined') {
      try {
        const overrides = Array.from(this.customOverrides.values());
        localStorage.setItem('translation_custom_overrides', JSON.stringify(overrides));
      } catch (error) {
        console.warn('Failed to save custom overrides:', error);
      }
    }
  }

  private loadQualityFeedback(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('translation_quality_feedback');
        if (stored) {
          const feedback = JSON.parse(stored) as QualityFeedback[];
          feedback.forEach(f => {
            this.qualityFeedback.set(f.translationId, f);
          });
        }
      } catch (error) {
        console.warn('Failed to load quality feedback:', error);
      }
    }
  }

  private saveQualityFeedback(): void {
    if (typeof window !== 'undefined') {
      try {
        const feedback = Array.from(this.qualityFeedback.values());
        localStorage.setItem('translation_quality_feedback', JSON.stringify(feedback));
      } catch (error) {
        console.warn('Failed to save quality feedback:', error);
      }
    }
  }
}

// Export singleton instance
export const unifiedTranslationService = UnifiedTranslationService.getInstance();