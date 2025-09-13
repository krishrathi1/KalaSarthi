import { Translate } from '@google-cloud/translate/build/src/v2';

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
  originalText: string;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export class TranslationService {
  private static instance: TranslationService;
  private translateClient: Translate;

  private constructor() {
    this.translateClient = new Translate({
      keyFilename: 'google-credentials.json',
      projectId: 'gen-lang-client-0314311341'
    });
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  public async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      const options: any = {
        from: sourceLanguage,
        to: targetLanguage,
      };

      // Remove undefined options
      Object.keys(options).forEach(key => 
        options[key] === undefined && delete options[key]
      );

      const [translation] = await this.translateClient.translate(text, options);

      // Get detected language if source language wasn't specified
      let detectedLanguage = sourceLanguage || 'unknown';
      let confidence = 1.0;

      if (!sourceLanguage) {
        try {
          const [detection] = await this.translateClient.detect(text);
          detectedLanguage = detection.language;
          confidence = detection.confidence || 0.5;
        } catch (detectError) {
          console.warn('Language detection failed:', detectError);
        }
      }

      return {
        translatedText: translation,
        detectedLanguage,
        confidence,
        originalText: text
      };

    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Failed to translate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult[]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts to translate cannot be empty');
      }

      const options: any = {
        from: sourceLanguage,
        to: targetLanguage,
      };

      // Remove undefined options
      Object.keys(options).forEach(key => 
        options[key] === undefined && delete options[key]
      );

      const [translations] = await this.translateClient.translate(texts, options);

      const results: TranslationResult[] = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const translation = Array.isArray(translations) ? translations[i] : translations;

        // Get detected language if source language wasn't specified
        let detectedLanguage = sourceLanguage || 'unknown';
        let confidence = 1.0;

        if (!sourceLanguage) {
          try {
            const [detection] = await this.translateClient.detect(text);
            detectedLanguage = detection.language;
            confidence = detection.confidence || 0.5;
          } catch (detectError) {
            console.warn('Language detection failed for text:', text, detectError);
          }
        }

        results.push({
          translatedText: translation,
          detectedLanguage,
          confidence,
          originalText: text
        });
      }

      return results;

    } catch (error) {
      console.error('Batch translation error:', error);
      throw new Error(`Failed to translate texts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text to detect cannot be empty');
      }

      const [detection] = await this.translateClient.detect(text);

      return {
        language: detection.language,
        confidence: detection.confidence || 0.5
      };

    } catch (error) {
      console.error('Language detection error:', error);
      throw new Error(`Failed to detect language: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getSupportedLanguages(targetLanguage?: string): Promise<any[]> {
    try {
      const [languages] = await this.translateClient.getLanguages(targetLanguage);
      return languages;

    } catch (error) {
      console.error('Get supported languages error:', error);
      return [];
    }
  }

  public async translateWithGlossary(
    text: string,
    targetLanguage: string,
    glossaryId: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      const options: any = {
        from: sourceLanguage,
        to: targetLanguage,
        glossary: {
          glossary: `projects/gen-lang-client-0314311341/locations/global/glossaries/${glossaryId}`
        }
      };

      // Remove undefined options
      Object.keys(options).forEach(key => 
        options[key] === undefined && delete options[key]
      );

      const [translation] = await this.translateClient.translate(text, options);

      // Get detected language if source language wasn't specified
      let detectedLanguage = sourceLanguage || 'unknown';
      let confidence = 1.0;

      if (!sourceLanguage) {
        try {
          const [detection] = await this.translateClient.detect(text);
          detectedLanguage = detection.language;
          confidence = detection.confidence || 0.5;
        } catch (detectError) {
          console.warn('Language detection failed:', detectError);
        }
      }

      return {
        translatedText: translation,
        detectedLanguage,
        confidence,
        originalText: text
      };

    } catch (error) {
      console.error('Translation with glossary error:', error);
      throw new Error(`Failed to translate text with glossary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public getLanguageCode(languageName: string): string {
    const languageMap: Record<string, string> = {
      'english': 'en',
      'hindi': 'hi',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'japanese': 'ja',
      'korean': 'ko',
      'chinese': 'zh',
      'arabic': 'ar',
      'portuguese': 'pt',
      'russian': 'ru',
      'italian': 'it',
      'dutch': 'nl',
      'swedish': 'sv',
      'norwegian': 'no',
      'danish': 'da',
      'finnish': 'fi',
      'polish': 'pl',
      'czech': 'cs',
      'hungarian': 'hu',
      'romanian': 'ro',
      'bulgarian': 'bg',
      'croatian': 'hr',
      'slovak': 'sk',
      'slovenian': 'sl',
      'estonian': 'et',
      'latvian': 'lv',
      'lithuanian': 'lt',
      'greek': 'el',
      'turkish': 'tr',
      'hebrew': 'he',
      'thai': 'th',
      'vietnamese': 'vi',
      'indonesian': 'id',
      'malay': 'ms',
      'tagalog': 'tl',
      'swahili': 'sw',
      'amharic': 'am',
      'hausa': 'ha',
      'yoruba': 'yo',
      'zulu': 'zu',
      'afrikaans': 'af',
      'albanian': 'sq',
      'azerbaijani': 'az',
      'belarusian': 'be',
      'bosnian': 'bs',
      'catalan': 'ca',
      'welsh': 'cy',
      'esperanto': 'eo',
      'basque': 'eu',
      'galician': 'gl',
      'icelandic': 'is',
      'irish': 'ga',
      'macedonian': 'mk',
      'maltese': 'mt',
      'moldovan': 'mo',
      'montenegrin': 'me',
      'serbian': 'sr',
      'ukrainian': 'uk'
    };

    return languageMap[languageName.toLowerCase()] || languageName;
  }
}
