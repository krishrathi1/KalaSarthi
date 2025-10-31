import { NextRequest, NextResponse } from 'next/server';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = await request.json();

    if (!Array.isArray(texts) || !targetLanguage) {
      return NextResponse.json(
        { error: 'Invalid request. Expected texts array and targetLanguage.' },
        { status: 400 }
      );
    }

    if (targetLanguage === sourceLanguage) {
      // No translation needed
      return NextResponse.json({
        success: true,
        translations: texts.map(text => ({ original: text, translated: text })),
        cached: true
      });
    }

    // Initialize translator
    const translator = CulturalContextTranslator.getInstance();

    // Batch translate all texts
    const translationPromises = texts.map(async (text: string) => {
      try {
        const result = await translator.translateText({
          text,
          sourceLanguage,
          targetLanguage,
          craftCategory: 'general',
          preserveCulturalTerms: true
        });
        return {
          original: text,
          translated: result.translatedText,
          success: true
        };
      } catch (error) {
        console.error(`Translation failed for: ${text}`, error);
        return {
          original: text,
          translated: text, // Fallback to original
          success: false,
          error: 'Translation failed'
        };
      }
    });

    const results = await Promise.allSettled(translationPromises);

    const translations = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          original: texts[index],
          translated: texts[index], // Fallback
          success: false,
          error: 'Translation promise failed'
        };
      }
    });

    const successfulTranslations = translations.filter(t => t.success).length;
    const totalTranslations = translations.length;

    return NextResponse.json({
      success: true,
      translations,
      stats: {
        total: totalTranslations,
        successful: successfulTranslations,
        failed: totalTranslations - successfulTranslations,
        successRate: (successfulTranslations / totalTranslations) * 100
      },
      cached: false // Since we just did fresh translations
    });

  } catch (error) {
    console.error('Bulk translation error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk translation request' },
      { status: 500 }
    );
  }
}
