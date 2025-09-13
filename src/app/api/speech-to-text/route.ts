import { NextRequest, NextResponse } from 'next/server';
import { GeminiSpeechService } from '@/lib/service/GeminiSpeechService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en-US';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Process with Gemini
    const geminiService = GeminiSpeechService.getInstance();
    const result = await geminiService.speechToText(arrayBuffer, {
      language,
      model: 'gemini-1.5-flash'
    });

    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration
      }
    });

  } catch (error) {
    console.error('Speech-to-text API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Speech-to-text failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const geminiService = GeminiSpeechService.getInstance();
    const supportedLanguages = geminiService.getSupportedLanguages();

    return NextResponse.json({
      success: true,
      data: {
        supportedLanguages,
        defaultLanguage: 'en-US',
        maxFileSize: '10MB',
        supportedFormats: ['wav', 'mp3', 'm4a', 'webm']
      }
    });

  } catch (error) {
    console.error('Speech-to-text info API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get speech-to-text information'
      },
      { status: 500 }
    );
  }
}