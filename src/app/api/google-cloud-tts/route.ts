import { NextRequest, NextResponse } from 'next/server';
import { TTSProcessor } from '@/lib/services/TTSProcessor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      language = 'en', 
      voiceGender, 
      voiceName, 
      speakingRate = 1.0, 
      pitch = 0.0, 
      volumeGainDb = 0.0,
      audioFormat = 'mp3',
      culturalContext = 'casual',
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

    console.log('🔊 TTS API called:', {
      textLength: text.length,
      language,
      voiceGender,
      culturalContext,
      timestamp: new Date().toISOString()
    });

    // Use our enhanced TTS processor
    const ttsProcessor = TTSProcessor.getInstance();
    
    const ttsRequest = {
      text,
      language,
      voiceGender,
      voiceName,
      speakingRate,
      pitch,
      volumeGainDb,
      audioFormat,
      culturalContext,
      userId,
      sessionId
    };

    const result = await ttsProcessor.synthesizeSpeech(ttsRequest);

    const isUsingFallback = result.audioContent.length < 2000; // Mock audio is typically small
    
    console.log(isUsingFallback ? '⚠️ TTS using fallback service:' : '✅ TTS processing completed:', {
      audioSize: result.audioContent.length,
      duration: result.duration,
      voiceName: result.voiceName,
      language: result.language,
      service: isUsingFallback ? 'fallback-mock' : 'google-cloud'
    });

    // Convert audio content to base64 for transmission
    const audioBase64 = result.audioContent.toString('base64');
    
    return NextResponse.json({
      audioContent: audioBase64,
      audioFormat: result.audioFormat,
      language: result.language,
      voiceName: result.voiceName,
      voiceGender: result.voiceGender,
      duration: result.duration,
      metadata: result.metadata,
      service: isUsingFallback ? 'fallback-mock' : 'google-cloud',
      fallbackReason: isUsingFallback ? 'Google Cloud TTS API not enabled' : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TTS API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Text-to-speech processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const ttsProcessor = TTSProcessor.getInstance();
    const supportedLanguages = ttsProcessor.getSupportedLanguages();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'google-cloud-tts',
      supportedLanguages,
      features: [
        'multilingual-synthesis',
        'cultural-voice-selection',
        'craft-specific-pronunciation',
        'context-aware-speech'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'TTS service initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
