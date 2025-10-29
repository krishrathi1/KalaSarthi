/**
 * API Routes for Language Settings Management
 * Handles language preferences and localization settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../../lib/services/scheme-sahayak';

/**
 * Supported Languages Configuration
 */
const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', nativeName: 'English', rtl: false },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  'te': { name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  'mr': { name: 'Marathi', nativeName: 'मराठी', rtl: false },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  'ml': { name: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  'or': { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false },
  'as': { name: 'Assamese', nativeName: 'অসমীয়া', rtl: false }
} as const;

/**
 * Language Settings Interface
 */
interface LanguageSettings {
  primary: string;
  secondary?: string;
  autoDetect: boolean;
  region: string;
  dateFormat: string;
  numberFormat: string;
  currency: string;
  voiceLanguage?: string;
  translationPreferences: {
    autoTranslate: boolean;
    showOriginal: boolean;
    preferredTranslationService: 'google' | 'microsoft' | 'local';
  };
}

/**
 * GET /api/scheme-sahayak/artisans/language
 * Get language settings for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Get current language settings
    const currentLanguage = artisan.preferences.language || 'en';
    
    const languageSettings: LanguageSettings = {
      primary: currentLanguage,
      secondary: undefined,
      autoDetect: true,
      region: 'IN', // India
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-IN',
      currency: 'INR',
      voiceLanguage: currentLanguage,
      translationPreferences: {
        autoTranslate: false,
        showOriginal: true,
        preferredTranslationService: 'google'
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        artisanId,
        settings: languageSettings,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentLanguageInfo: SUPPORTED_LANGUAGES[currentLanguage as keyof typeof SUPPORTED_LANGUAGES] || SUPPORTED_LANGUAGES.en
      }
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans/language error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheme-sahayak/artisans/language
 * Update language settings for an artisan
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, settings } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Settings object is required', code: 'MISSING_SETTINGS' } },
        { status: 400 }
      );
    }

    // Validate primary language
    if (settings.primary && !SUPPORTED_LANGUAGES[settings.primary as keyof typeof SUPPORTED_LANGUAGES]) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: `Unsupported primary language: ${settings.primary}`, 
            code: 'UNSUPPORTED_LANGUAGE',
            supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
          } 
        },
        { status: 400 }
      );
    }

    // Validate secondary language if provided
    if (settings.secondary && !SUPPORTED_LANGUAGES[settings.secondary as keyof typeof SUPPORTED_LANGUAGES]) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: `Unsupported secondary language: ${settings.secondary}`, 
            code: 'UNSUPPORTED_LANGUAGE',
            supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
          } 
        },
        { status: 400 }
      );
    }

    const userService = getUserService();
    
    // Check if artisan exists
    const artisan = await userService.getArtisanProfile(artisanId);
    if (!artisan) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan not found', code: 'ARTISAN_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Update artisan profile with new language settings
    const updatedPreferences = {
      ...artisan.preferences,
      language: settings.primary || artisan.preferences.language
    };

    await userService.updateArtisanProfile(artisanId, {
      preferences: updatedPreferences
    });

    // In production, you would also store additional language settings
    // in a separate user_language_settings collection

    const updatedLanguageInfo = SUPPORTED_LANGUAGES[settings.primary as keyof typeof SUPPORTED_LANGUAGES] || 
                               SUPPORTED_LANGUAGES[artisan.preferences.language as keyof typeof SUPPORTED_LANGUAGES] || 
                               SUPPORTED_LANGUAGES.en;

    return NextResponse.json({
      success: true,
      message: 'Language settings updated successfully',
      data: {
        artisanId,
        updatedSettings: settings,
        currentLanguage: settings.primary || artisan.preferences.language,
        languageInfo: updatedLanguageInfo,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans/language error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scheme-sahayak/artisans/language/supported
 * Get list of supported languages
 */
export async function GET_SUPPORTED() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        languages: SUPPORTED_LANGUAGES,
        count: Object.keys(SUPPORTED_LANGUAGES).length,
        defaultLanguage: 'en',
        regions: {
          'IN': {
            name: 'India',
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY',
            numberFormat: 'en-IN'
          }
        }
      }
    });

  } catch (error) {
    console.error('GET supported languages error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheme-sahayak/artisans/language/detect
 * Auto-detect language from text input
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, artisanId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Text is required for language detection', code: 'MISSING_TEXT' } },
        { status: 400 }
      );
    }

    // Simple language detection logic (in production, use a proper language detection service)
    const detectLanguage = (inputText: string): string => {
      const text = inputText.toLowerCase();
      
      // Hindi detection (Devanagari script)
      if (/[\u0900-\u097F]/.test(text)) return 'hi';
      
      // Bengali detection
      if (/[\u0980-\u09FF]/.test(text)) return 'bn';
      
      // Telugu detection
      if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
      
      // Tamil detection
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
      
      // Gujarati detection
      if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
      
      // Kannada detection
      if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
      
      // Malayalam detection
      if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
      
      // Punjabi detection
      if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
      
      // Odia detection
      if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
      
      // Assamese detection (similar to Bengali but with some differences)
      if (/[\u0980-\u09FF]/.test(text) && /[ৰৱ]/.test(text)) return 'as';
      
      // Default to English
      return 'en';
    };

    const detectedLanguage = detectLanguage(text);
    const confidence = detectedLanguage === 'en' ? 0.7 : 0.9; // Lower confidence for English as it's the default
    
    const languageInfo = SUPPORTED_LANGUAGES[detectedLanguage as keyof typeof SUPPORTED_LANGUAGES];

    // If artisanId is provided, optionally update their language preference
    if (artisanId && detectedLanguage !== 'en') {
      try {
        const userService = getUserService();
        const artisan = await userService.getArtisanProfile(artisanId);
        
        if (artisan && artisan.preferences.language !== detectedLanguage) {
          // Suggest language update but don't automatically change it
          return NextResponse.json({
            success: true,
            data: {
              detectedLanguage,
              confidence,
              languageInfo,
              suggestion: {
                updateProfile: true,
                currentLanguage: artisan.preferences.language,
                message: `We detected you're using ${languageInfo.nativeName}. Would you like to update your language preference?`
              }
            }
          });
        }
      } catch (error) {
        // Continue with detection result even if profile update fails
        console.warn('Failed to check artisan profile for language suggestion:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        detectedLanguage,
        confidence,
        languageInfo,
        textLength: text.length
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/artisans/language/detect error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}