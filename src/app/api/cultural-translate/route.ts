/**
 * Cultural Context Translation API Route
 * Handles craft-specific translations with cultural preservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      sourceLanguage, 
      targetLanguage, 
      context = 'craft',
      preserveCulturalTerms = true,
      userId,
      sessionId
    } = body;

    // Validate input
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Source and target languages are required' },
        { status: 400 }
      );
    }

    console.log('🌐 Cultural Translation API called:', {
      textLength: text.length,
      sourceLanguage,
      targetLanguage,
      context,
      preserveCulturalTerms,
      timestamp: new Date().toISOString()
    });

    // Use our cultural context translator
    const translator = CulturalContextTranslator.getInstance();
    
    const translationRequest = {
      text,
      sourceLanguage,
      targetLanguage,
      context,
      preserveCulturalTerms,
      userId,
      sessionId
    };

    const result = await translator.translateText(translationRequest);

    console.log('✅ Cultural translation completed:', {
      translatedText: result.translatedText.substring(0, 50) + '...',
      confidence: result.confidence,
      culturalNotesCount: result.culturalNotes?.length || 0,
      glossaryTermsUsed: result.glossaryTermsUsed.length
    });

    return NextResponse.json({
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      alternatives: result.alternatives,
      culturalNotes: result.culturalNotes,
      glossaryTermsUsed: result.glossaryTermsUsed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cultural Translation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Cultural translation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check and supported languages endpoint
export async function GET() {
  try {
    const translator = CulturalContextTranslator.getInstance();
    const supportedPairs = translator.getSupportedLanguagePairs();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'cultural-context-translator',
      supportedLanguagePairs: supportedPairs.slice(0, 20), // Limit response size
      totalSupportedPairs: supportedPairs.length,
      features: [
        'craft-specific-terminology',
        'cultural-preservation',
        'context-aware-translation',
        'confidence-scoring',
        'alternative-suggestions',
        'translation-caching'
      ],
      craftCategories: [
        'pottery',
        'textile', 
        'jewelry',
        'woodwork',
        'metalwork',
        'general'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Cultural translator initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get craft terminology for a specific category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const translator = CulturalContextTranslator.getInstance();
    const terminology = translator.getCraftTerminologyByCategory(category);

    return NextResponse.json({
      category,
      terminology,
      termCount: Object.keys(terminology).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Terminology retrieval error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve craft terminology',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}