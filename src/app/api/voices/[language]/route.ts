import { NextRequest, NextResponse } from 'next/server';
import { 
  getVoicesForLanguage, 
  isLanguageSupported,
  getDefaultVoice,
  getFallbackVoice
} from '@/lib/voice-mapping';

export async function GET(
  request: NextRequest,
  { params }: { params: { language: string } }
) {
  try {
    const { language } = params;

    if (!isLanguageSupported(language)) {
      return NextResponse.json({
        success: false,
        error: `Language ${language} is not supported`
      }, { status: 400 });
    }

    const voices = getVoicesForLanguage(language);
    const defaultVoice = getDefaultVoice(language);
    const fallbackVoice = getFallbackVoice(language);

    return NextResponse.json({
      success: true,
      language,
      voices,
      defaultVoice,
      fallbackVoice,
      total: voices.length
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get voices for language'
    }, { status: 500 });
  }
}