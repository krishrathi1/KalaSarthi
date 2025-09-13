import { NextRequest, NextResponse } from 'next/server';
import { GeminiSpeechService } from '@/lib/service/GeminiSpeechService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const context = formData.get('context') as string || 'general';
    const language = formData.get('language') as string || 'en-US';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Process voice command with Gemini
    const geminiService = GeminiSpeechService.getInstance();
    const result = await geminiService.processVoiceCommand(arrayBuffer, context);

    return NextResponse.json({
      success: true,
      data: {
        intent: result.intent,
        entities: result.entities,
        confidence: result.confidence,
        text: result.text,
        language,
        context
      }
    });

  } catch (error) {
    console.error('Voice command API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Voice command processing failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      supportedContexts: [
        'general',
        'navigation',
        'search',
        'finance',
        'marketplace',
        'profile',
        'loans'
      ],
      supportedIntents: [
        'navigate',
        'search',
        'action',
        'query',
        'help'
      ],
      supportedLanguages: [
        'en-US', 'en-GB', 'hi-IN', 'bn-IN', 'te-IN', 'mr-IN', 'ta-IN',
        'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
      ]
    }
  });
}