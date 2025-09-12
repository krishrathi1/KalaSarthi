import { NextRequest, NextResponse } from 'next/server';
import { getVoicesForLanguage, isLanguageSupported } from '@/lib/voice-mapping';

export async function GET(
  request: NextRequest,
  { params }: { params: { language: string } }
) {
  try {
    const { language } = params;
    
    if (!isLanguageSupported(language)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Language not supported',
          supportedLanguages: Object.keys(require('@/lib/voice-mapping').VOICE_MAPPING)
        },
        { status: 400 }
      );
    }

    const voices = getVoicesForLanguage(language);
    
    return NextResponse.json({
      success: true,
      language,
      voices,
      count: voices.length
    });
  } catch (error) {
    console.error('Error fetching voices for language:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch voices',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
