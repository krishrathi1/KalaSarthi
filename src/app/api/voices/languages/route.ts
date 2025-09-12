import { NextResponse } from 'next/server';
import { getSupportedLanguagesWithNames, getAvailableLanguages } from '@/lib/voice-mapping';

export async function GET() {
  try {
    const languages = getSupportedLanguagesWithNames();
    
    return NextResponse.json({
      success: true,
      languages,
      count: languages.length
    });
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch supported languages',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
