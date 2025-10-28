import { NextRequest, NextResponse } from 'next/server';
import { GeminiSpeechService } from '@/lib/service/GeminiSpeechService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language = 'en-US', voice, speed = 1.0, pitch = 1.0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Process with Gemini service
    const geminiService = GeminiSpeechService.getInstance();
    const audioBuffer = await geminiService.textToSpeech(text, {
      language,
      voice,
      speed,
      pitch
    });

    // Convert to base64 for response
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        audio: audioBase64,
        format: 'wav',
        sampleRate: 44100,
        language,
        text
      }
    });

  } catch (error) {
    console.error('Text-to-speech API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Text-to-speech failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const geminiService = GeminiSpeechService.getInstance();
    const voices = await geminiService.getAvailableVoices();
    const supportedLanguages = geminiService.getSupportedLanguages();

    return NextResponse.json({
      success: true,
      data: {
        supportedLanguages,
        availableVoices: voices.map(voice => ({
          name: voice.name,
          language: voice.lang,
          default: voice.default
        })),
        defaultLanguage: 'en-US',
        supportedFormats: ['wav', 'mp3'],
        maxTextLength: 5000
      }
    });

  } catch (error) {
    console.error('Text-to-speech info API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get text-to-speech information'
      },
      { status: 500 }
    );
  }
}
