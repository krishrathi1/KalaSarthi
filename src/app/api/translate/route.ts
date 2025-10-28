/**
 * Translation API Route
 * Handles text translation with cultural context preservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';

const translator = CulturalContextTranslator.getInstance();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      sourceLanguage,
      targetLanguage,
      craftCategory,
      userId,
      preserveCulturalTerms = true
    } = body;

    // Validate input
    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text, source language, and target language are required' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      );
    }

    console.log('🌐 Translation API called:', {
      textLength: text.length,
      sourceLanguage,
      targetLanguage,
      craftCategory,
      preserveCulturalTerms,
      timestamp: new Date().toISOString()
    });

    // Perform translation
    const result = await translator.translateText({
      text,
      sourceLanguage,
      targetLanguage,
      craftCategory,
      userId,
      preserveCulturalTerms
    });

    console.log('✅ Translation completed:', {
      confidence: result.confidence,
      craftTermsDetected: result.craftTermsDetected.length,
      culturalNotesCount: result.culturalNotes.length,
      alternativesCount: result.alternatives.length
    });

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Translation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Translation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get supported languages and craft categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'languages':
        return NextResponse.json({
          supportedPairs: translator.getSupportedLanguagePairs(),
          timestamp: new Date().toISOString()
        });

      case 'categories':
        return NextResponse.json({
          categories: translator.getCraftCategories(),
          timestamp: new Date().toISOString()
        });

      case 'terms':
        const category = searchParams.get('category');
        if (category) {
          const terms = translator.getTermsByCategory(category);
          return NextResponse.json({
            category,
            terms,
            timestamp: new Date().toISOString()
          });
        }
        return NextResponse.json(
          { error: 'Category parameter required for terms action' },
          { status: 400 }
        );

      case 'stats':
        return NextResponse.json({
          cacheStats: translator.getCacheStats(),
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          status: 'healthy',
          service: 'cultural-context-translator',
          supportedLanguages: translator.getSupportedLanguagePairs().length,
          craftCategories: translator.getCraftCategories().length,
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('❌ Translation API GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch translation service info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Clear translation cache (admin endpoint)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'cache') {
      translator.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Translation cache cleared',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=cache to clear cache' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Translation API DELETE error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}