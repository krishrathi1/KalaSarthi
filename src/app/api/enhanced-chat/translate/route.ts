/**
 * Enhanced Chat API - Translation Endpoint
 * Provides context-aware translation with cultural preservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';

const translate = new Translate({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: {
    conversationHistory?: any[];
    artisanSpecialization?: string;
    culturalContext?: string;
  };
}

export async function POST(request: NextRequest) {
  const body: TranslateRequest = await request.json();
  
  try {
    
    if (!body.text || !body.sourceLanguage || !body.targetLanguage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: text, sourceLanguage, targetLanguage'
      }, { status: 400 });
    }
    
    // Skip translation if same language
    if (body.sourceLanguage === body.targetLanguage) {
      return NextResponse.json({
        success: true,
        result: {
          translatedText: body.text,
          originalText: body.text,
          sourceLanguage: body.sourceLanguage,
          targetLanguage: body.targetLanguage,
          confidence: 1.0,
          alternatives: [],
          culturalContext: null
        }
      });
    }
    
    // Use cultural context translator for enhanced translation
    const culturalTranslator = CulturalContextTranslator.getInstance();
    const enhancedTranslation = await culturalTranslator.translateText({
      text: body.text,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      context: 'business'
    });
    
    return NextResponse.json({
      success: true,
      result: {
        translatedText: enhancedTranslation.translatedText,
        originalText: body.text,
        sourceLanguage: enhancedTranslation.sourceLanguage,
        targetLanguage: enhancedTranslation.targetLanguage,
        confidence: enhancedTranslation.confidence,
        alternatives: enhancedTranslation.alternatives,
        culturalContext: enhancedTranslation.culturalNotes?.map(note => note.culturalContext).join('; ') || null
      }
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback to basic Google Translate
    try {
      const [translation] = await translate.translate(body.text, {
        from: body.sourceLanguage,
        to: body.targetLanguage,
      });
      
      return NextResponse.json({
        success: true,
        result: {
          translatedText: translation,
          originalText: body.text,
          sourceLanguage: body.sourceLanguage,
          targetLanguage: body.targetLanguage,
          confidence: 0.8, // Lower confidence for fallback
          alternatives: [],
          culturalContext: 'Basic translation used due to service error',
          fallback: true
        }
      });
      
    } catch (fallbackError) {
      console.error('Fallback translation error:', fallbackError);
      return NextResponse.json({
        success: false,
        error: 'Translation service unavailable'
      }, { status: 503 });
    }
  }
}

export async function GET(request: NextRequest) {
  // Get supported languages
  try {
    const [languages] = await translate.getLanguages();
    
    // Filter to commonly used languages in India
    const supportedLanguages = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'bn', name: 'Bengali' },
      { code: 'ta', name: 'Tamil' },
      { code: 'te', name: 'Telugu' },
      { code: 'gu', name: 'Gujarati' },
      { code: 'kn', name: 'Kannada' },
      { code: 'ml', name: 'Malayalam' },
      { code: 'mr', name: 'Marathi' },
      { code: 'pa', name: 'Punjabi' },
      { code: 'or', name: 'Odia' },
      { code: 'as', name: 'Assamese' },
      { code: 'ur', name: 'Urdu' }
    ];
    
    return NextResponse.json({
      success: true,
      languages: supportedLanguages
    });
    
  } catch (error) {
    console.error('Get languages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get supported languages'
    }, { status: 500 });
  }
}