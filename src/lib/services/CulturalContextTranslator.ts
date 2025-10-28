/**
 * Cultural Context Translator Service
 * Handles craft-specific translations with cultural preservation
 */

import { TranslationServiceClient } from '@google-cloud/translate';
import { TranslationCache } from './TranslationCache';

const translateClient = new TranslationServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: 'craft' | 'business' | 'casual' | 'technical';
  preserveCulturalTerms?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  sourceLanguage: string;
  targetLanguage: string;
  alternatives: Array<{
    text: string;
    confidence: number;
    context: string;
  }>;
  culturalNotes?: Array<{
    originalTerm: string;
    translatedTerm: string;
    culturalContext: string;
    preservationReason: string;
  }>;
  glossaryTermsUsed: string[];
}

export interface CraftTerminology {
  [key: string]: {
    translations: { [language: string]: string };
    culturalContext: string;
    preserveOriginal: boolean;
    synonyms: string[];
    category: 'pottery' | 'textile' | 'jewelry' | 'woodwork' | 'metalwork' | 'general';
  };
}

export class CulturalContextTranslator {
  private static instance: CulturalContextTranslator;
  private craftTerminology: CraftTerminology;
  private cache: TranslationCache;
  private projectPath: string;

  constructor() {
    this.craftTerminology = this.initializeCraftTerminology();
    this.cache = TranslationCache.getInstance();
    this.projectPath = `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/global`;
  }

  static getInstance(): CulturalContextTranslator {
    if (!CulturalContextTranslator.instance) {
      CulturalContextTranslator.instance = new CulturalContextTranslator();
    }
    return CulturalContextTranslator.instance;
  }

  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    try {
      // Check cache first
      const cachedResult = this.cache.get(
        request.text,
        request.sourceLanguage,
        request.targetLanguage,
        request.context || 'craft'
      );
      
      if (cachedResult) {
        return {
          translatedText: cachedResult.translatedText,
          confidence: cachedResult.confidence,
          sourceLanguage: cachedResult.sourceLanguage,
          targetLanguage: cachedResult.targetLanguage,
          alternatives: [],
          culturalNotes: cachedResult.culturalNotes,
          glossaryTermsUsed: []
        };
      }

      // Try offline translation first for common phrases
      const offlineTranslation = this.cache.getOfflineTranslation(
        request.text,
        request.sourceLanguage,
        request.targetLanguage
      );

      if (offlineTranslation) {
        const result: TranslationResult = {
          translatedText: offlineTranslation,
          confidence: 0.9,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          alternatives: [],
          culturalNotes: [],
          glossaryTermsUsed: []
        };

        // Cache the offline result
        this.cache.set(
          request.text,
          offlineTranslation,
          request.sourceLanguage,
          request.targetLanguage,
          request.context || 'craft',
          0.9
        );

        return result;
      }

      // Preprocess text to identify cultural terms
      const preprocessedText = this.preprocessCulturalTerms(request.text, request.sourceLanguage);

      // Perform translation with cultural context
      const translationResult = await this.performContextualTranslation(
        preprocessedText,
        request
      );

      // Post-process to restore cultural terms
      const finalResult = this.postprocessCulturalTerms(
        translationResult,
        request.text,
        request.targetLanguage,
        request.preserveCulturalTerms
      );

      // Cache the result
      this.cache.set(
        request.text,
        finalResult.translatedText,
        request.sourceLanguage,
        request.targetLanguage,
        request.context || 'craft',
        finalResult.confidence,
        finalResult.culturalNotes
      );

      return finalResult;

    } catch (error) {
      console.error('Cultural translation error:', error);
      
      // Check if it's a Google Cloud API permission error
      if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Google Cloud Translation API not enabled, using fallback mock service');
        return this.createMockTranslationResult(request);
      }
      
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeCraftTerminology(): CraftTerminology {
    return {
      // Pottery terms
      'pottery': {
        translations: {
          'hi': 'मिट्टी के बर्तन',
          'bn': 'মৃৎশিল্প',
          'ta': 'மண்பாண்டம்',
          'te': 'కుండలు',
          'gu': 'માટીના વાસણો',
          'kn': 'ಮಣ್ಣಿನ ಪಾತ್ರೆಗಳು',
          'ml': 'മൺപാത്രങ്ങൾ',
          'mr': 'मातीची भांडी',
          'pa': 'ਮਿੱਟੀ ਦੇ ਬਰਤਨ'
        },
        culturalContext: 'Traditional craft with regional variations',
        preserveOriginal: false,
        synonyms: ['ceramic', 'earthenware', 'terracotta'],
        category: 'pottery'
      },
      'terracotta': {
        translations: {
          'hi': 'टेराकोटा',
          'bn': 'টেরাকোটা',
          'ta': 'டெரகோட்டா',
          'te': 'టెర్రకోట్టా',
          'gu': 'ટેરાકોટા',
          'kn': 'ಟೆರಾಕೋಟಾ',
          'ml': 'ടെറാകോട്ട',
          'mr': 'टेराकोटा',
          'pa': 'ਟੈਰਾਕੋਟਾ'
        },
        culturalContext: 'Specific type of clay work, often preserved as original term',
        preserveOriginal: true,
        synonyms: ['burnt clay', 'fired clay'],
        category: 'pottery'
      },

      // Textile terms
      'handloom': {
        translations: {
          'hi': 'हथकरघा',
          'bn': 'হস্তচালিত তাঁত',
          'ta': 'கைத்தறி',
          'te': 'చేతిమగ్గం',
          'gu': 'હાથકરઘા',
          'kn': 'ಕೈಮಗ್ಗ',
          'ml': 'കൈത്തറി',
          'mr': 'हातमाग',
          'pa': 'ਹੱਥਕਰਘਾ'
        },
        culturalContext: 'Traditional weaving method with cultural significance',
        preserveOriginal: false,
        synonyms: ['hand weaving', 'traditional loom'],
        category: 'textile'
      },
      'khadi': {
        translations: {
          'hi': 'खादी',
          'bn': 'খাদি',
          'ta': 'காதி',
          'te': 'ఖాదీ',
          'gu': 'ખાદી',
          'kn': 'ಖಾದಿ',
          'ml': 'ഖാദി',
          'mr': 'खादी',
          'pa': 'ਖਾਦੀ'
        },
        culturalContext: 'Hand-spun cloth with historical and cultural importance',
        preserveOriginal: true,
        synonyms: ['hand-spun cloth'],
        category: 'textile'
      },

      // Jewelry terms
      'kundan': {
        translations: {
          'hi': 'कुंदन',
          'bn': 'কুন্দন',
          'ta': 'குந்தன்',
          'te': 'కుందన్',
          'gu': 'કુંદન',
          'kn': 'ಕುಂದನ್',
          'ml': 'കുന്ദൻ',
          'mr': 'कुंदन',
          'pa': 'ਕੁੰਦਨ'
        },
        culturalContext: 'Traditional jewelry technique, preserve original term',
        preserveOriginal: true,
        synonyms: ['gold jewelry technique'],
        category: 'jewelry'
      },
      'meenakari': {
        translations: {
          'hi': 'मीनाकारी',
          'bn': 'মীনাকারী',
          'ta': 'மீனாகாரி',
          'te': 'మీనాకారి',
          'gu': 'મીનાકારી',
          'kn': 'ಮೀನಾಕಾರಿ',
          'ml': 'മീനാകാരി',
          'mr': 'मीनाकारी',
          'pa': 'ਮੀਨਾਕਾਰੀ'
        },
        culturalContext: 'Enamel work technique, preserve original term',
        preserveOriginal: true,
        synonyms: ['enamel work'],
        category: 'jewelry'
      },

      // Woodwork terms
      'sandalwood': {
        translations: {
          'hi': 'चंदन',
          'bn': 'চন্দন',
          'ta': 'சந்தனம்',
          'te': 'చందనం',
          'gu': 'ચંદન',
          'kn': 'ಚಂದನ',
          'ml': 'ചന്ദനം',
          'mr': 'चंदन',
          'pa': 'ਚੰਦਨ'
        },
        culturalContext: 'Sacred wood with cultural significance',
        preserveOriginal: false,
        synonyms: ['fragrant wood'],
        category: 'woodwork'
      },

      // General craft terms
      'artisan': {
        translations: {
          'hi': 'कारीगर',
          'bn': 'কারিগর',
          'ta': 'கைவினைஞர்',
          'te': 'కళాకారుడు',
          'gu': 'કારીગર',
          'kn': 'ಕುಶಲಕರ್ಮಿ',
          'ml': 'കരകൗശലത്തൊഴിലാളി',
          'mr': 'कारागीर',
          'pa': 'ਕਾਰੀਗਰ'
        },
        culturalContext: 'Skilled craftsperson with traditional knowledge',
        preserveOriginal: false,
        synonyms: ['craftsperson', 'skilled worker'],
        category: 'general'
      },
      'handicraft': {
        translations: {
          'hi': 'हस्तशिल्प',
          'bn': 'হস্তশিল্প',
          'ta': 'கைவினைப்பொருள்',
          'te': 'చేతిపని',
          'gu': 'હસ્તકલા',
          'kn': 'ಕೈಕೆಲಸ',
          'ml': 'കരകൗശലവസ്തു',
          'mr': 'हस्तकला',
          'pa': 'ਦਸਤਕਾਰੀ'
        },
        culturalContext: 'Traditional handmade items',
        preserveOriginal: false,
        synonyms: ['handmade craft', 'traditional craft'],
        category: 'general'
      }
    };
  }

  private preprocessCulturalTerms(text: string, sourceLanguage: string): string {
    let processedText = text;
    const foundTerms: string[] = [];

    // Identify craft terms in the text
    for (const [term, data] of Object.entries(this.craftTerminology)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(text)) {
        foundTerms.push(term);
        
        // Mark terms that should be preserved
        if (data.preserveOriginal) {
          processedText = processedText.replace(regex, `[PRESERVE:${term}]`);
        }
      }

      // Check for translations in source language
      const sourceTranslation = data.translations[sourceLanguage];
      if (sourceTranslation) {
        const sourceRegex = new RegExp(`\\b${sourceTranslation}\\b`, 'gi');
        if (sourceRegex.test(text)) {
          foundTerms.push(term);
          if (data.preserveOriginal) {
            processedText = processedText.replace(sourceRegex, `[PRESERVE:${term}]`);
          }
        }
      }
    }

    return processedText;
  }

  private async performContextualTranslation(
    text: string,
    request: TranslationRequest
  ): Promise<any> {
    // Build glossary for craft terms
    const glossaryTerms = this.buildGlossaryForLanguagePair(
      request.sourceLanguage,
      request.targetLanguage
    );

    // Configure translation request
    const translationRequest = {
      parent: this.projectPath,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: request.sourceLanguage,
      targetLanguageCode: request.targetLanguage,
      glossaryConfig: glossaryTerms.length > 0 ? {
        glossary: `${this.projectPath}/glossaries/craft-terms-${request.sourceLanguage}-${request.targetLanguage}`
      } : undefined
    };

    try {
      const [response] = await translateClient.translateText(translationRequest);
      return response;
    } catch (error) {
      // Fallback to basic translation if glossary fails
      console.warn('Glossary translation failed, using basic translation:', error);
      const basicRequest = {
        parent: this.projectPath,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: request.sourceLanguage,
        targetLanguageCode: request.targetLanguage
      };
      const [response] = await translateClient.translateText(basicRequest);
      return response;
    }
  }

  private buildGlossaryForLanguagePair(sourceLanguage: string, targetLanguage: string): Array<{term: string, translation: string}> {
    const glossaryTerms: Array<{term: string, translation: string}> = [];

    for (const [term, data] of Object.entries(this.craftTerminology)) {
      const sourceTranslation = data.translations[sourceLanguage];
      const targetTranslation = data.translations[targetLanguage];

      if (sourceTranslation && targetTranslation) {
        glossaryTerms.push({
          term: sourceTranslation,
          translation: targetTranslation
        });
      }

      // Add English term if not source/target
      if (sourceLanguage !== 'en' && targetLanguage !== 'en') {
        if (sourceLanguage !== 'en' && targetTranslation) {
          glossaryTerms.push({
            term: term,
            translation: targetTranslation
          });
        }
      }
    }

    return glossaryTerms;
  }

  private postprocessCulturalTerms(
    translationResponse: any,
    originalText: string,
    targetLanguage: string,
    preserveCulturalTerms?: boolean
  ): TranslationResult {
    let translatedText = translationResponse.translations?.[0]?.translatedText || '';
    const culturalNotes: TranslationResult['culturalNotes'] = [];
    const glossaryTermsUsed: string[] = [];

    // Restore preserved terms
    const preserveRegex = /\[PRESERVE:([^\]]+)\]/g;
    let match;
    while ((match = preserveRegex.exec(translatedText)) !== null) {
      const originalTerm = match[1];
      const termData = this.craftTerminology[originalTerm];
      
      if (termData) {
        let replacementTerm = originalTerm;
        
        // Use target language translation if available and not preserving original
        if (!preserveCulturalTerms && termData.translations[targetLanguage]) {
          replacementTerm = termData.translations[targetLanguage];
        }

        translatedText = translatedText.replace(match[0], replacementTerm);
        
        culturalNotes.push({
          originalTerm,
          translatedTerm: replacementTerm,
          culturalContext: termData.culturalContext,
          preservationReason: termData.preserveOriginal ? 'Cultural significance' : 'User preference'
        });

        glossaryTermsUsed.push(originalTerm);
      }
    }

    // Generate alternatives with different cultural preservation strategies
    const alternatives = this.generateTranslationAlternatives(
      originalText,
      translatedText,
      targetLanguage
    );

    return {
      translatedText,
      confidence: translationResponse.translations?.[0]?.confidence || 0.85,
      sourceLanguage: translationResponse.translations?.[0]?.detectedLanguageCode || 'unknown',
      targetLanguage,
      alternatives,
      culturalNotes,
      glossaryTermsUsed
    };
  }

  private generateTranslationAlternatives(
    originalText: string,
    primaryTranslation: string,
    targetLanguage: string
  ): TranslationResult['alternatives'] {
    const alternatives: TranslationResult['alternatives'] = [];

    // Alternative 1: More literal translation
    alternatives.push({
      text: primaryTranslation,
      confidence: 0.85,
      context: 'literal'
    });

    // Alternative 2: More cultural preservation
    let culturalPreservationText = primaryTranslation;
    for (const [term, data] of Object.entries(this.craftTerminology)) {
      if (originalText.toLowerCase().includes(term.toLowerCase())) {
        const targetTranslation = data.translations[targetLanguage];
        if (targetTranslation && data.preserveOriginal) {
          culturalPreservationText = culturalPreservationText.replace(
            new RegExp(targetTranslation, 'gi'),
            `${term} (${targetTranslation})`
          );
        }
      }
    }

    if (culturalPreservationText !== primaryTranslation) {
      alternatives.push({
        text: culturalPreservationText,
        confidence: 0.80,
        context: 'cultural-preservation'
      });
    }

    // Alternative 3: More localized
    alternatives.push({
      text: this.localizeTranslation(primaryTranslation, targetLanguage),
      confidence: 0.75,
      context: 'localized'
    });

    return alternatives;
  }

  private localizeTranslation(text: string, targetLanguage: string): string {
    // Add region-specific localization
    let localizedText = text;

    // Currency localization
    if (targetLanguage.includes('IN')) {
      localizedText = localizedText.replace(/\$(\d+)/g, '₹$1');
      localizedText = localizedText.replace(/dollars?/gi, 'rupees');
    }

    // Measurement localization
    if (targetLanguage.includes('IN')) {
      localizedText = localizedText.replace(/inches?/gi, 'inches');
      localizedText = localizedText.replace(/feet/gi, 'feet');
    }

    return localizedText;
  }

  // Method to provide translation quality feedback
  updateTranslationQuality(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string,
    qualityScore: number
  ): void {
    this.cache.updateTranslationQuality(
      sourceText,
      sourceLanguage,
      targetLanguage,
      context,
      qualityScore
    );
  }

  // Fallback mock translation result when Google Cloud API is not available
  private createMockTranslationResult(request: TranslationRequest): TranslationResult {
    // Try to find direct translations from our craft terminology
    let translatedText = request.text;
    const culturalNotes: TranslationResult['culturalNotes'] = [];
    const glossaryTermsUsed: string[] = [];

    // Apply craft terminology translations
    for (const [term, data] of Object.entries(this.craftTerminology)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(request.text)) {
        const targetTranslation = data.translations[request.targetLanguage];
        if (targetTranslation) {
          translatedText = translatedText.replace(regex, targetTranslation);
          glossaryTermsUsed.push(term);
          
          culturalNotes.push({
            originalTerm: term,
            translatedTerm: targetTranslation,
            culturalContext: data.culturalContext,
            preservationReason: data.preserveOriginal ? 'Cultural significance' : 'Direct translation'
          });
        }
      }
    }

    // If no craft terms found, provide a basic mock translation
    if (translatedText === request.text) {
      const mockTranslations: { [key: string]: { [key: string]: string } } = {
        'en': {
          'hi': 'यह एक नमूना अनुवाद है।',
          'bn': 'এটি একটি নমুনা অনুবাদ।',
          'ta': 'இது ஒரு மாதிரி மொழிபெயர்ப்பு.',
          'te': 'ఇది ఒక నమూనా అనువాదం.',
          'gu': 'આ એક નમૂનો અનુવાદ છે.',
          'kn': 'ಇದು ಒಂದು ಮಾದರಿ ಅನುವಾದ.',
          'ml': 'ഇത് ഒരു സാമ്പിൾ വിവർത്തനമാണ്.',
          'mr': 'हे एक नमुना भाषांतर आहे.',
          'pa': 'ਇਹ ਇੱਕ ਨਮੂਨਾ ਅਨੁਵਾਦ ਹੈ।'
        },
        'hi': {
          'en': 'This is a sample translation.',
          'bn': 'এটি একটি নমুনা অনুবাদ।',
          'ta': 'இது ஒரு மாதிரி மொழிபெயர்ப்பு.'
        }
      };

      const sourceTranslations = mockTranslations[request.sourceLanguage];
      if (sourceTranslations && sourceTranslations[request.targetLanguage]) {
        translatedText = sourceTranslations[request.targetLanguage];
      } else {
        // Fallback: indicate that translation service is not available
        translatedText = `[Translation not available: ${request.text}]`;
      }
    }

    const alternatives = this.generateTranslationAlternatives(
      request.text,
      translatedText,
      request.targetLanguage
    );

    return {
      translatedText,
      confidence: 0.75, // Lower confidence for mock translations
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      alternatives,
      culturalNotes,
      glossaryTermsUsed
    };
  }

  // Method to add new craft terminology
  addCraftTerm(term: string, data: CraftTerminology[string]): void {
    this.craftTerminology[term] = data;
  }

  // Method to get supported language pairs
  getSupportedLanguagePairs(): Array<{source: string, target: string}> {
    const languages = ['en', 'hi', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'mr', 'pa'];
    const pairs: Array<{source: string, target: string}> = [];

    for (const source of languages) {
      for (const target of languages) {
        if (source !== target) {
          pairs.push({ source, target });
        }
      }
    }

    return pairs;
  }

  // Method to get cache statistics
  getCacheStats() {
    return this.cache.getCacheStats();
  }

  // Method to preload common translations
  preloadCommonTranslations(sourceLanguage: string, targetLanguage: string, context: string = 'craft') {
    return this.cache.preloadCommonTranslations(sourceLanguage, targetLanguage, context);
  }

  // Method to clear translation cache
  clearCache(): void {
    this.cache.destroy();
  }

  // Method to get craft terminology for a specific category
  getCraftTerminologyByCategory(category: CraftTerminology[string]['category']): CraftTerminology {
    const filtered: CraftTerminology = {};
    
    for (const [term, data] of Object.entries(this.craftTerminology)) {
      if (data.category === category) {
        filtered[term] = data;
      }
    }

    return filtered;
  }
}