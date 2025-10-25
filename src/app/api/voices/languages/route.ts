import { NextResponse } from 'next/server';
import { 
  getSupportedLanguagesWithNames, 
  getAvailableLanguages 
} from '@/lib/voice-mapping';

export async function GET() {
  try {
    const languages = getSupportedLanguagesWithNames();
    
    return NextResponse.json({
      success: true,
      languages,
      total: languages.length
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get supported languages'
    }, { status: 500 });
  }
}
