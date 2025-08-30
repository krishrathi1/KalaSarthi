import { LanguageCode } from './i18n';

// Google Cloud Translation API supported language codes mapping
const googleCloudLanguageMap: { [key in LanguageCode]?: string } = {
  // Indian Languages - Map to closest supported Google Cloud languages
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  bn: 'bn',
  te: 'te',
  as: 'as', // Assamese is supported
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  ur: 'ur',

  // Regional languages - Map to closest supported alternatives
  mai: 'hi', // Maithili -> Hindi fallback
  bho: 'hi', // Bhojpuri -> Hindi fallback
  doi: 'hi', // Dogri -> Hindi fallback
  kok: 'mr', // Konkani -> Marathi fallback
  mr: 'mr', // Marathi is supported
  raj: 'hi', // Rajasthani -> Hindi fallback
  mni: 'hi', // Manipuri -> Hindi fallback
  ne: 'ne', // Nepali is supported
  sa: 'hi', // Sanskrit -> Hindi fallback
  sat: 'hi', // Santali -> Hindi fallback
  sd: 'ur', // Sindhi -> Urdu fallback

  // Foreign Languages
  es: 'es',
  fr: 'fr',
  de: 'de',
  zh: 'zh',
  ja: 'ja',
  ar: 'ar',
  pt: 'pt',
  ru: 'ru',
  it: 'it',
  ko: 'ko',
  nl: 'nl',
  sv: 'sv',
  da: 'da',
  no: 'no',
  fi: 'fi',
  pl: 'pl',
  tr: 'tr',
  th: 'th',
  vi: 'vi',
};

class TranslationService {
  private cache: Map<string, string> = new Map();

  async translateText(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode = 'en'
  ): Promise<string> {
    // Input validation
    if (!text || text.trim() === '') {
      return text;
    }

    if (!targetLanguage) {
      return text;
    }

    // Don't translate if source and target languages are the same
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;

    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check localStorage cache
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`translation_${cacheKey}`);
      if (cached) {
        this.cache.set(cacheKey, cached); // Also cache in memory
        return cached;
      }
    }

    try {
      // Map language codes to Google Cloud supported codes
      const mappedTargetLanguage = googleCloudLanguageMap[targetLanguage] || 'en';
      const mappedSourceLanguage = googleCloudLanguageMap[sourceLanguage] || 'en';

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage: mappedTargetLanguage,
          sourceLanguage: mappedSourceLanguage,
        }),
      });

      if (!response.ok) {
        // Handle 400 errors (validation errors) gracefully
        if (response.status === 400) {
          console.warn('Translation validation error, returning original text');
          return text;
        }
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        // Handle validation errors gracefully
        if (data.error.includes('Missing required parameters')) {
          console.warn('Translation validation error, returning original text');
          return text;
        }
        throw new Error(data.error);
      }

      const translation = data.translation;

      // Cache the result
      this.cache.set(cacheKey, translation);

      // Cache in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(`translation_${cacheKey}`, translation);
      }

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text if translation fails
      return text;
    }
  }

  async translateMultiple(
    texts: string[],
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode = 'en'
  ): Promise<string[]> {
    const translations: string[] = [];

    for (const text of texts) {
      const translation = await this.translateText(text, targetLanguage, sourceLanguage);
      translations.push(translation);
    }

    return translations;
  }

  // Enhanced caching method
  async translateWithCache(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode = 'en'
  ): Promise<string> {
    return this.translateText(text, targetLanguage, sourceLanguage);
  }
}

export const translationService = new TranslationService();