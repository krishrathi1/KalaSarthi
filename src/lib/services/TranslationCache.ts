/**
 * Translation Cache Service
 * Handles caching, offline translation, and performance optimization
 */

export interface CachedTranslation {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: string;
  confidence: number;
  timestamp: number;
  expiresAt: number;
  usageCount: number;
  culturalNotes?: Array<{
    originalTerm: string;
    translatedTerm: string;
    culturalContext: string;
  }>;
}

export interface OfflinePhrase {
  id: string;
  sourceText: string;
  translations: { [language: string]: string };
  category: 'greeting' | 'business' | 'craft' | 'common' | 'emergency';
  priority: number; // 1-5, higher is more important
  frequency: number; // Usage frequency
}

export class TranslationCache {
  private static instance: TranslationCache;
  private cache: Map<string, CachedTranslation>;
  private offlinePhrases: Map<string, OfflinePhrase>;
  private maxCacheSize: number = 10000;
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new Map();
    this.offlinePhrases = new Map();
    this.initializeOfflinePhrases();
    this.startCleanupTimer();
  }

  static getInstance(): TranslationCache {
    if (!TranslationCache.instance) {
      TranslationCache.instance = new TranslationCache();
    }
    return TranslationCache.instance;
  }

  // Cache management methods
  get(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'default'
  ): CachedTranslation | null {
    const key = this.generateCacheKey(sourceText, sourceLanguage, targetLanguage, context);
    const cached = this.cache.get(key);

    if (cached) {
      // Check if expired
      if (Date.now() > cached.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      // Update usage count
      cached.usageCount++;
      return cached;
    }

    return null;
  }

  set(
    sourceText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'default',
    confidence: number = 0.85,
    culturalNotes?: CachedTranslation['culturalNotes'],
    ttl?: number
  ): void {
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

    const key = this.generateCacheKey(sourceText, sourceLanguage, targetLanguage, context);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    const cachedTranslation: CachedTranslation = {
      id: key,
      sourceText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      context,
      confidence,
      timestamp: now,
      expiresAt,
      usageCount: 1,
      culturalNotes
    };

    this.cache.set(key, cachedTranslation);
  }

  // Offline translation methods
  getOfflineTranslation(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string | null {
    // First check for exact matches
    for (const phrase of this.offlinePhrases.values()) {
      if (phrase.sourceText.toLowerCase() === sourceText.toLowerCase()) {
        const translation = phrase.translations[targetLanguage];
        if (translation) {
          phrase.frequency++;
          return translation;
        }
      }
    }

    // Then check for partial matches (for common phrases)
    const lowerSourceText = sourceText.toLowerCase();
    for (const phrase of this.offlinePhrases.values()) {
      if (lowerSourceText.includes(phrase.sourceText.toLowerCase()) || 
          phrase.sourceText.toLowerCase().includes(lowerSourceText)) {
        const translation = phrase.translations[targetLanguage];
        if (translation && phrase.category === 'common') {
          phrase.frequency++;
          return translation;
        }
      }
    }

    return null;
  }

  addOfflinePhrase(phrase: Omit<OfflinePhrase, 'id' | 'frequency'>): void {
    const id = this.generateOfflinePhraseId(phrase.sourceText, phrase.category);
    const offlinePhrase: OfflinePhrase = {
      ...phrase,
      id,
      frequency: 0
    };
    this.offlinePhrases.set(id, offlinePhrase);
  }

  // Performance optimization methods
  preloadCommonTranslations(
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'craft'
  ): OfflinePhrase[] {
    const commonPhrases: OfflinePhrase[] = [];

    for (const phrase of this.offlinePhrases.values()) {
      if (phrase.priority >= 3 && phrase.translations[targetLanguage]) {
        commonPhrases.push(phrase);
      }
    }

    // Sort by priority and frequency
    return commonPhrases.sort((a, b) => {
      const scoreA = a.priority * 10 + Math.min(a.frequency, 10);
      const scoreB = b.priority * 10 + Math.min(b.frequency, 10);
      return scoreB - scoreA;
    });
  }

  // Analytics and optimization
  getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    topTranslations: Array<{
      sourceText: string;
      targetLanguage: string;
      usageCount: number;
    }>;
    languagePairs: Array<{
      source: string;
      target: string;
      count: number;
    }>;
  } {
    const totalEntries = this.cache.size;
    const translations = Array.from(this.cache.values());

    // Calculate hit rate (simplified)
    const totalUsage = translations.reduce((sum, t) => sum + t.usageCount, 0);
    const hitRate = totalUsage > 0 ? (totalUsage - totalEntries) / totalUsage : 0;

    // Top translations
    const topTranslations = translations
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(t => ({
        sourceText: t.sourceText.substring(0, 50),
        targetLanguage: t.targetLanguage,
        usageCount: t.usageCount
      }));

    // Language pairs
    const languagePairCounts = new Map<string, number>();
    translations.forEach(t => {
      const pair = `${t.sourceLanguage}-${t.targetLanguage}`;
      languagePairCounts.set(pair, (languagePairCounts.get(pair) || 0) + 1);
    });

    const languagePairs = Array.from(languagePairCounts.entries())
      .map(([pair, count]) => {
        const [source, target] = pair.split('-');
        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalEntries,
      hitRate,
      topTranslations,
      languagePairs
    };
  }

  // Quality feedback system
  updateTranslationQuality(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string,
    qualityScore: number // 1-5
  ): void {
    const key = this.generateCacheKey(sourceText, sourceLanguage, targetLanguage, context);
    const cached = this.cache.get(key);

    if (cached) {
      // Update confidence based on quality feedback
      const newConfidence = (cached.confidence + (qualityScore / 5)) / 2;
      cached.confidence = Math.max(0.1, Math.min(1.0, newConfidence));

      // If quality is very low, reduce TTL
      if (qualityScore <= 2) {
        cached.expiresAt = Date.now() + (this.defaultTTL / 4);
      }
    }
  }

  // Private helper methods
  private generateCacheKey(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string
  ): string {
    const textHash = Buffer.from(sourceText).toString('base64').substring(0, 20);
    return `${sourceLanguage}-${targetLanguage}-${context}-${textHash}`;
  }

  private generateOfflinePhraseId(sourceText: string, category: string): string {
    const textHash = Buffer.from(sourceText).toString('base64').substring(0, 15);
    return `offline-${category}-${textHash}`;
  }

  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by usage count (ascending) and timestamp (ascending)
    entries.sort((a, b) => {
      if (a[1].usageCount !== b[1].usageCount) {
        return a[1].usageCount - b[1].usageCount;
      }
      return a[1].timestamp - b[1].timestamp;
    });

    // Remove the least used 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  private initializeOfflinePhrases(): void {
    // Common greetings
    this.addOfflinePhrase({
      sourceText: 'Hello',
      translations: {
        'hi': 'नमस्ते',
        'bn': 'নমস্কার',
        'ta': 'வணக்கம்',
        'te': 'నమస్కారం',
        'gu': 'નમસ્તે',
        'kn': 'ನಮಸ್ಕಾರ',
        'ml': 'നമസ്കാരം',
        'mr': 'नमस्कार',
        'pa': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'
      },
      category: 'greeting',
      priority: 5
    });

    this.addOfflinePhrase({
      sourceText: 'Thank you',
      translations: {
        'hi': 'धन्यवाद',
        'bn': 'ধন্যবাদ',
        'ta': 'நன்றி',
        'te': 'ధన్యవాదాలు',
        'gu': 'આભાર',
        'kn': 'ಧನ್ಯವಾದಗಳು',
        'ml': 'നന്ദി',
        'mr': 'धन्यवाद',
        'pa': 'ਧੰਨਵਾਦ'
      },
      category: 'common',
      priority: 5
    });

    // Business phrases
    this.addOfflinePhrase({
      sourceText: 'What is the price?',
      translations: {
        'hi': 'कीमत क्या है?',
        'bn': 'দাম কত?',
        'ta': 'விலை என்ன?',
        'te': 'ధర ఎంత?',
        'gu': 'કિંમત કેટલી છે?',
        'kn': 'ಬೆಲೆ ಎಷ್ಟು?',
        'ml': 'വില എത്രയാണ്?',
        'mr': 'किंमत काय आहे?',
        'pa': 'ਕੀਮਤ ਕੀ ਹੈ?'
      },
      category: 'business',
      priority: 4
    });

    // Craft-specific terms
    this.addOfflinePhrase({
      sourceText: 'handmade',
      translations: {
        'hi': 'हस्तनिर्मित',
        'bn': 'হস্তনির্মিত',
        'ta': 'கைவினை',
        'te': 'చేతితో తయారు చేసిన',
        'gu': 'હાથથી બનાવેલું',
        'kn': 'ಕೈಯಿಂದ ಮಾಡಿದ',
        'ml': 'കൈകൊണ്ട് നിർമ്മിച്ച',
        'mr': 'हाताने बनवलेले',
        'pa': 'ਹੱਥਾਂ ਨਾਲ ਬਣਿਆ'
      },
      category: 'craft',
      priority: 4
    });

    this.addOfflinePhrase({
      sourceText: 'traditional',
      translations: {
        'hi': 'पारंपरिक',
        'bn': 'ঐতিহ্যবাহী',
        'ta': 'பாரம்பரிய',
        'te': 'సాంప్రదాయిక',
        'gu': 'પરંપરાગત',
        'kn': 'ಸಾಂಪ್ರದಾಯಿಕ',
        'ml': 'പരമ്പരാഗത',
        'mr': 'पारंपारिक',
        'pa': 'ਪਰੰਪਰਾਗਤ'
      },
      category: 'craft',
      priority: 4
    });

    // Emergency phrases
    this.addOfflinePhrase({
      sourceText: 'Help',
      translations: {
        'hi': 'मदद',
        'bn': 'সাহায্য',
        'ta': 'உதவி',
        'te': 'సహాయం',
        'gu': 'મદદ',
        'kn': 'ಸಹಾಯ',
        'ml': 'സഹായം',
        'mr': 'मदत',
        'pa': 'ਮਦਦ'
      },
      category: 'emergency',
      priority: 5
    });
  }

  // Cleanup method
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.offlinePhrases.clear();
  }

  // Export/Import for persistence
  exportCache(): string {
    const data = {
      cache: Array.from(this.cache.entries()),
      offlinePhrases: Array.from(this.offlinePhrases.entries()),
      timestamp: Date.now()
    };
    return JSON.stringify(data);
  }

  importCache(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      // Import cache entries (only non-expired ones)
      const now = Date.now();
      for (const [key, cached] of parsed.cache) {
        if (cached.expiresAt > now) {
          this.cache.set(key, cached);
        }
      }

      // Import offline phrases
      for (const [key, phrase] of parsed.offlinePhrases) {
        this.offlinePhrases.set(key, phrase);
      }
    } catch (error) {
      console.error('Failed to import cache data:', error);
    }
  }
}