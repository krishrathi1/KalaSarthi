import { NextRequest, NextResponse } from 'next/server';
import { STTProcessor } from '@/lib/services/STTProcessor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      audioData, 
      language = 'en', 
      sampleRate = 48000, 
      audioFormat = 'webm',
      userId,
      sessionId
    } = body;

    // Validate input
    if (!audioData) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      );
    }

    console.log('🎤 STT API called:', {
      audioDataLength: audioData.length,
      language,
      sampleRate,
      audioFormat,
      timestamp: new Date().toISOString()
    });

    // Use our enhanced STT processor
    const sttProcessor = STTProcessor.getInstance();
    
    // Convert base64 audio data to Buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    const sttRequest = {
      audioData: audioBuffer,
      language,
      audioFormat,
      sampleRate,
      userId,
      sessionId
    };

    const result = await sttProcessor.processAudio(sttRequest);

    const isUsingFallback = result.confidence === 0.85 && result.text.includes('help you today');
    
    console.log(isUsingFallback ? '⚠️ STT using fallback service:' : '✅ STT processing completed:', {
      transcript: result.text.substring(0, 50) + '...',
      confidence: result.confidence,
      language: result.language,
      audioQuality: result.audioQuality,
      service: isUsingFallback ? 'fallback-mock' : 'google-cloud'
    });
    
    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      alternatives: result.alternatives,
      wordTimeOffsets: result.wordTimeOffsets,
      audioQuality: result.audioQuality,
      service: isUsingFallback ? 'fallback-mock' : 'google-cloud',
      fallbackReason: isUsingFallback ? 'Google Cloud STT API not enabled' : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ STT API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Speech-to-text processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const sttProcessor = STTProcessor.getInstance();
    const supportedLanguages = sttProcessor.getSupportedLanguages();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'google-cloud-stt',
      supportedLanguages,
      features: [
        'multilingual-recognition',
        'craft-specific-vocabulary',
        'cultural-pronunciation-handling',
        'audio-quality-analysis',
        'confidence-scoring'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'STT service initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
