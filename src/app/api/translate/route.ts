import { NextRequest, NextResponse } from 'next/server';
import { Translate } from '@google-cloud/translate/build/src/v2';

// Simple fallback translations for testing
const fallbackTranslations: { [key: string]: { [key: string]: { [key: string]: string } } } = {
  'en': {
    'hi': {
      'Hello': 'नमस्ते',
      'How are you?': 'आप कैसे हैं?',
      'Thank you': 'धन्यवाद',
      'Hello, how are you?': 'नमस्ते, आप कैसे हैं?'
    }
  },
  'hi': {
    'en': {
      'नमस्ते': 'Hello',
      'आप कैसे हैं?': 'How are you?',
      'धन्यवाद': 'Thank you'
    }
  }
};

// Google Cloud Translation API supported language codes mapping
const googleCloudLanguageMap: { [key: string]: string } = {
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

const translate = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// In-memory cache for translations
const translationCache = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = await request.json();

    // Input validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid text parameter' },
        { status: 400 }
      );
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid targetLanguage parameter' },
        { status: 400 }
      );
    }

    // Don't translate if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return NextResponse.json({
        translation: text,
        cached: true
      });
    }

    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;

    // Check cache first
    if (translationCache.has(cacheKey)) {
      return NextResponse.json({
        translation: translationCache.get(cacheKey),
        cached: true
      });
    }

    // Try Google Cloud Translation first, fallback to simple translation
    let translation;
    let usedFallback = false;
    
    try {
      const [googleTranslation] = await translate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
      });
      translation = googleTranslation;
    } catch (error) {
      console.warn('Google Cloud Translation failed, using fallback:', error);
      
      // Use fallback translation
      const fallback = fallbackTranslations[sourceLanguage]?.[targetLanguage]?.[text];
      if (fallback) {
        translation = fallback;
        usedFallback = true;
      } else {
        // Simple fallback - just return original text with a note
        translation = `[Translation not available: ${text}]`;
        usedFallback = true;
      }
    }

    // Cache the result
    translationCache.set(cacheKey, translation);

    return NextResponse.json({
      translation,
      cached: false,
      fallback: usedFallback
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      {
        error: 'Translation failed',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Translation API is running',
    cacheSize: translationCache.size
  });
}
