/**
 * Translation Engine
 * Advanced translation service with craft-specific terminology and cultural context
 */

import { Translate } from '@google-cloud/translate/build/src/v2';

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  craftSpecialty?: string;
}

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  alternatives?: string[];
  culturalContext?: string;
  detectedLanguage?: string;
  processingTime: number;
}

export interface CraftTerminology {
  [key: string]: {
    [language: string]: string[];
  };
}

export class TranslationEngine {
  private static instance: TranslationEngine;
  private translateClient: Translate;
  private translationCache: Map<string, TranslationResult> = new Map();
  private craftTerminology: CraftTerminology;

  constructor() {
    this.translateClient = new Translate({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    this.craftTerminology = this.initializeCraftTerminology();
  }

  static getInstance(): TranslationEngine {
    if (!TranslationEngine.instance) {
      TranslationEngine.instance = new TranslationEngine();
    }
    return TranslationEngine.instance;
  }

  /**
   * Translate message with cultural context preservation
   */
  async translateMessage(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.translationCache.get(cacheKey);
      if (cached) {
        console.log(`🔄 Translation cache hit: ${request.sourceLanguage} -> ${request.targetLanguage}`);
        return {
          ...cached,
          processingTime: Date.now() - startTime
        };
      }

      // Preprocess text with craft-specific terminology
      const preprocessedText = this.preprocessCraftTerms(request.text, request.sourceLanguage, request.targetLanguage);

      // Perform translation
      const [translation, detectionResult] = await Promise.all([
        this.translateClient.translate(preprocessedText, {
          from: request.sourceLanguage,
          to: request.targetLanguage,
          format: 'text'
        }),
        this.translateClient.detect(request.text)
      ]);

      const translatedText = Array.isArray(translation) ? translation[0] : translation;
      const detectedLanguage = Array.isArray(detectionResult) ? detectionResult[0].language : detectionResult.language;
      const confidence = Array.isArray(detectionResult) ? detectionResult[0].confidence : detectionResult.confidence;

      // Post-process with craft terminology
      const finalTranslation = this.postprocessCraftTerms(translatedText, request.targetLanguage);

      // Generate cultural context notes
      const culturalContext = this.generateCulturalContext(request.text, request.sourceLanguage, request.targetLanguage);

      // Get alternative translations for low confidence results
      let alternatives: string[] = [];
      if (confidence < 0.8) {
        alternatives = await this.getAlternativeTranslations(request.text, request.sourceLanguage, request.targetLanguage);
      }

      const result: TranslationResult = {
        translatedText: finalTranslation,
        confidence: confidence || 0.9,
        alternatives,
        culturalContext,
        detectedLanguage,
        processingTime: Date.now() - startTime
      };

      // Cache the result
      this.translationCache.set(cacheKey, result);

      console.log(`✅ Translation completed: "${request.text}" -> "${finalTranslation}" (${Math.round(result.confidence * 100)}% confidence)`);

      return result;

    } catch (error) {
      console.error('❌ Translation error:', error);
      
      // Return fallback translation
      return {
        translatedText: request.text, // Return original text as fallback
        confidence: 0,
        alternatives: [],
        culturalContext: 'Translation service unavailable',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch translate multiple messages
   */
  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]> {
    const results = await Promise.all(
      requests.map(request => this.translateMessage(request))
    );
    return results;
  }

  /**
   * Initialize craft-specific terminology database
   */
  private initializeCraftTerminology(): CraftTerminology {
    return {
      // Pottery terms
      pottery: {
        en: ['pottery', 'ceramic', 'clay', 'kiln', 'glaze', 'wheel', 'earthenware', 'stoneware', 'porcelain'],
        hi: ['मिट्टी के बर्तन', 'सिरेमिक', 'मिट्टी', 'भट्टी', 'चमक', 'चाक', 'मिट्टी के बर्तन'],
        bn: ['মৃৎশিল্প', 'সিরামিক', 'মাটি', 'ভাটি', 'গ্লেজ', 'চাকা'],
        te: ['కుండలు', 'సిరామిక్', 'మట్టి', 'కొలిమి', 'గ్లేజ్', 'చక్రం'],
        ta: ['மண்பாண்டங்கள்', 'செராமிக்', 'களிமண்', 'சூளை', 'மெருகூட்டல்', 'சக்கரம்']
      },

      // Woodworking terms
      woodworking: {
        en: ['woodworking', 'carpentry', 'carving', 'furniture', 'timber', 'oak', 'teak', 'mahogany', 'joinery'],
        hi: ['लकड़ी का काम', 'बढ़ईगीरी', 'नक्काशी', 'फर्नीचर', 'लकड़ी', 'बांज', 'सागौन', 'महोगनी'],
        bn: ['কাঠের কাজ', 'ছুতারগিরি', 'খোদাই', 'আসবাবপত্র', 'কাঠ', 'ওক', 'সেগুন', 'মেহগনি'],
        te: ['చెక్క పని', 'వడ్రంగి', 'చెక్కడం', 'ఫర్నిచర్', 'కలప', 'ఓక్', 'తేకు', 'మహోగని'],
        ta: ['மரவேலை', 'தச்சுவேலை', 'செதுக்குதல்', 'மரச்சாமான்கள்', 'மரம்', 'ஓக்', 'தேக்கு', 'மஹோகனி']
      },

      // Textile terms
      textiles: {
        en: ['textiles', 'weaving', 'embroidery', 'handloom', 'cotton', 'silk', 'wool', 'fabric', 'thread'],
        hi: ['वस्त्र', 'बुनाई', 'कढ़ाई', 'हथकरघा', 'कपास', 'रेशम', 'ऊन', 'कपड़ा', 'धागा'],
        bn: ['বস্ত্র', 'তাঁত', 'সূচিকর্ম', 'হস্তচালিত তাঁত', 'তুলা', 'রেশম', 'পশম', 'কাপড়', 'সুতা'],
        te: ['వస్త్రాలు', 'నేత', 'కుట్టుపని', 'చేతిమగ్గం', 'పత్తి', 'పట్టు', 'ఉన్ని', 'వస్త్రం', 'దారం'],
        ta: ['ஜவுளி', 'நெசவு', 'எம்ப்ராய்டரி', 'கைத்தறி', 'பருத்தி', 'பட்டு', 'கம்பளி', 'துணி', 'நூல்']
      },

      // Jewelry terms
      jewelry: {
        en: ['jewelry', 'gold', 'silver', 'precious', 'gemstone', 'necklace', 'bracelet', 'earrings', 'ring'],
        hi: ['आभूषण', 'सोना', 'चांदी', 'कीमती', 'रत्न', 'हार', 'कंगन', 'कान की बाली', 'अंगूठी'],
        bn: ['গহনা', 'সোনা', 'রূপা', 'মূল্যবান', 'রত্ন', 'হার', 'কাঁকন', 'কানের দুল', 'আংটি'],
        te: ['ఆభరణాలు', 'బంగారం', 'వెండి', 'విలువైన', 'రత్నం', 'హారం', 'కంకణం', 'చెవిపోగులు', 'ఉంగరం'],
        ta: ['நகைகள்', 'தங்கம்', 'வெள்ளி', 'விலையுயர்ந்த', 'ரத்தினம்', 'கழுத்தணி', 'வளையல்', 'காதணி', 'மோதிரம்']
      },

      // Business terms
      business: {
        en: ['order', 'delivery', 'price', 'cost', 'payment', 'timeline', 'custom', 'handmade', 'traditional'],
        hi: ['आदेश', 'डिलीवरी', 'कीमत', 'लागत', 'भुगतान', 'समयसीमा', 'कस्टम', 'हस्तनिर्मित', 'पारंपरिक'],
        bn: ['অর্ডার', 'ডেলিভারি', 'দাম', 'খরচ', 'পেমেন্ট', 'সময়সীমা', 'কাস্টম', 'হস্তনির্মিত', 'ঐতিহ্যবাহী'],
        te: ['ఆర్డర్', 'డెలివరీ', 'ధర', 'ఖర్చు', 'చెల్లింపు', 'కాలపరిమితి', 'కస్టమ్', 'చేతితో తయారు', 'సాంప్రదాయిక'],
        ta: ['ஆர்டர்', 'டெலிவரி', 'விலை', 'செலவு', 'பணம்', 'கால அட்டவணை', 'கஸ்டம்', 'கைவினை', 'பாரம்பரிய']
      }
    };
  }

  /**
   * Preprocess text to handle craft-specific terms
   */
  private preprocessCraftTerms(text: string, sourceLanguage: string, targetLanguage: string): string {
    let processedText = text;

    // Replace craft terms with standardized versions for better translation
    Object.values(this.craftTerminology).forEach(termGroup => {
      const sourceTerms = termGroup[sourceLanguage] || [];
      sourceTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        if (processedText.match(regex)) {
          // Mark craft terms for special handling
          processedText = processedText.replace(regex, `[CRAFT_TERM:${term}]`);
        }
      });
    });

    return processedText;
  }

  /**
   * Post-process translation to restore craft-specific terms
   */
  private postprocessCraftTerms(translatedText: string, targetLanguage: string): string {
    let processedText = translatedText;

    // Restore craft terms with proper translations
    const craftTermRegex = /\[CRAFT_TERM:([^\]]+)\]/g;
    processedText = processedText.replace(craftTermRegex, (match, term) => {
      // Find the appropriate translation for this craft term
      for (const [category, termGroup] of Object.entries(this.craftTerminology)) {
        const targetTerms = termGroup[targetLanguage] || [];
        const sourceTerms = Object.values(termGroup).flat();
        
        if (sourceTerms.includes(term.toLowerCase())) {
          return targetTerms[0] || term; // Return first translation or original term
        }
      }
      return term; // Return original if no translation found
    });

    return processedText;
  }

  /**
   * Generate cultural context notes for translations
   */
  private generateCulturalContext(text: string, sourceLanguage: string, targetLanguage: string): string {
    const culturalNotes: string[] = [];

    // Check for cultural greetings
    if (text.toLowerCase().includes('namaste') || text.toLowerCase().includes('नमस्ते')) {
      culturalNotes.push('Traditional Indian greeting showing respect');
    }

    // Check for craft-specific cultural context
    if (text.toLowerCase().includes('traditional') || text.toLowerCase().includes('heritage')) {
      culturalNotes.push('Refers to time-honored craft techniques passed down through generations');
    }

    // Check for business formality
    if (text.toLowerCase().includes('sir') || text.toLowerCase().includes('madam')) {
      culturalNotes.push('Formal address showing respect in business context');
    }

    return culturalNotes.length > 0 ? culturalNotes.join('; ') : '';
  }

  /**
   * Get alternative translations for low confidence results
   */
  private async getAlternativeTranslations(text: string, sourceLanguage: string, targetLanguage: string): Promise<string[]> {
    try {
      // Use different translation approaches for alternatives
      const alternatives: string[] = [];

      // Try with different formality levels
      const formalText = this.makeFormal(text, sourceLanguage);
      const informalText = this.makeInformal(text, sourceLanguage);

      if (formalText !== text) {
        const [formalTranslation] = await this.translateClient.translate(formalText, {
          from: sourceLanguage,
          to: targetLanguage
        });
        alternatives.push(Array.isArray(formalTranslation) ? formalTranslation[0] : formalTranslation);
      }

      if (informalText !== text) {
        const [informalTranslation] = await this.translateClient.translate(informalText, {
          from: sourceLanguage,
          to: targetLanguage
        });
        alternatives.push(Array.isArray(informalTranslation) ? informalTranslation[0] : informalTranslation);
      }

      return alternatives.slice(0, 2); // Return max 2 alternatives

    } catch (error) {
      console.error('❌ Alternative translation error:', error);
      return [];
    }
  }

  /**
   * Make text more formal
   */
  private makeFormal(text: string, language: string): string {
    // Simple formality adjustments
    const formalReplacements: { [key: string]: { [key: string]: string } } = {
      en: {
        'hi': 'hello',
        'hey': 'hello',
        'yeah': 'yes',
        'ok': 'okay'
      },
      hi: {
        'हाय': 'नमस्ते',
        'हैलो': 'नमस्ते'
      }
    };

    let formalText = text;
    const replacements = formalReplacements[language] || {};
    
    Object.entries(replacements).forEach(([informal, formal]) => {
      const regex = new RegExp(`\\b${informal}\\b`, 'gi');
      formalText = formalText.replace(regex, formal);
    });

    return formalText;
  }

  /**
   * Make text more informal
   */
  private makeInformal(text: string, language: string): string {
    // Simple informality adjustments
    const informalReplacements: { [key: string]: { [key: string]: string } } = {
      en: {
        'hello': 'hi',
        'yes': 'yeah',
        'okay': 'ok'
      },
      hi: {
        'नमस्ते': 'हाय'
      }
    };

    let informalText = text;
    const replacements = informalReplacements[language] || {};
    
    Object.entries(replacements).forEach(([formal, informal]) => {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      informalText = informalText.replace(regex, informal);
    });

    return informalText;
  }

  /**
   * Generate cache key for translation requests
   */
  private generateCacheKey(request: TranslationRequest): string {
    return `${request.sourceLanguage}-${request.targetLanguage}-${Buffer.from(request.text).toString('base64').substring(0, 50)}`;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    console.log('🗑️ Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.translationCache.size,
      maxSize: 1000 // Max cache entries
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ['en', 'hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as'];
  }
}

export default TranslationEngine;