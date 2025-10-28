/**
 * Translation Cache Management API
 * Handles cache statistics, preloading, and quality feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';
import { TranslationCache } from '@/lib/services/TranslationCache';

// Get cache statistics
export async function GET() {
  try {
    const translator = CulturalContextTranslator.getInstance();
    const cache = TranslationCache.getInstance();
    
    const stats = translator.getCacheStats();
    
    return NextResponse.json({
      status: 'success',
      cacheStats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cache stats error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Preload common translations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceLanguage, 
      targetLanguage, 
      context = 'craft' 
    } = body;

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Source and target languages are required' },
        { status: 400 }
      );
    }

    const translator = CulturalContextTranslator.getInstance();
    const commonPhrases = translator.preloadCommonTranslations(
      sourceLanguage, 
      targetLanguage, 
      context
    );

    console.log('📦 Preloaded common translations:', {
      sourceLanguage,
      targetLanguage,
      context,
      phrasesCount: commonPhrases.length
    });

    return NextResponse.json({
      status: 'success',
      preloadedPhrases: commonPhrases.length,
      phrases: commonPhrases.slice(0, 10), // Return first 10 for preview
      sourceLanguage,
      targetLanguage,
      context,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Preload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to preload translations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Update translation quality feedback
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceText,
      sourceLanguage,
      targetLanguage,
      context = 'craft',
      qualityScore
    } = body;

    if (!sourceText || !sourceLanguage || !targetLanguage || qualityScore === undefined) {
      return NextResponse.json(
        { error: 'All fields are required: sourceText, sourceLanguage, targetLanguage, qualityScore' },
        { status: 400 }
      );
    }

    if (qualityScore < 1 || qualityScore > 5) {
      return NextResponse.json(
        { error: 'Quality score must be between 1 and 5' },
        { status: 400 }
      );
    }

    const translator = CulturalContextTranslator.getInstance();
    translator.updateTranslationQuality(
      sourceText,
      sourceLanguage,
      targetLanguage,
      context,
      qualityScore
    );

    console.log('📊 Translation quality updated:', {
      sourceText: sourceText.substring(0, 50),
      sourceLanguage,
      targetLanguage,
      context,
      qualityScore
    });

    return NextResponse.json({
      status: 'success',
      message: 'Translation quality feedback recorded',
      sourceText: sourceText.substring(0, 50) + '...',
      qualityScore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Quality feedback error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update translation quality',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Clear cache
export async function DELETE() {
  try {
    const translator = CulturalContextTranslator.getInstance();
    translator.clearCache();

    console.log('🗑️ Translation cache cleared');

    return NextResponse.json({
      status: 'success',
      message: 'Translation cache cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cache clear error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}