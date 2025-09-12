import { NextRequest, NextResponse } from 'next/server';
import { EnhancedTextToSpeechService } from '@/lib/service/EnhancedTextToSpeechService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      language = 'en-IN', 
      voice, 
      gender = 'FEMALE', 
      quality = 'Neural2',
      speed = 1.0,
      pitch = 0.0,
      volume = 1.0,
      enableTranslation = false,
      sourceLanguage = 'en'
    } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text is required and must be a string',
          received: { text, type: typeof text }
        },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text too long. Maximum 5000 characters allowed.',
          received: text.length
        },
        { status: 400 }
      );
    }

    console.log('Enhanced TTS request:', {
      textLength: text.length,
      language,
      voice,
      gender,
      quality,
      enableTranslation,
      sourceLanguage
    });

    // Initialize enhanced TTS service
    const ttsService = EnhancedTextToSpeechService.getInstance();

    // Synthesize speech
    const result = await ttsService.synthesizeSpeech(text, {
      language,
      voice,
      gender,
      quality,
      speed,
      pitch,
      volume,
      enableTranslation,
      sourceLanguage
    });

    // Convert ArrayBuffer to base64 for JSON response
    const base64Audio = Buffer.from(result.audioBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      audio: {
        data: base64Audio,
        format: result.audioFormat,
        language: result.language,
        voice: result.voice
      },
      translation: result.translatedText ? {
        original: result.originalText,
        translated: result.translatedText,
        sourceLanguage,
        targetLanguage: language
      } : undefined,
      processing: {
        time: result.processingTime,
        cached: result.processingTime < 1000 // Assume cached if very fast
      }
    });

  } catch (error) {
    console.error('Enhanced TTS error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'TTS synthesis failed';
    let statusCode = 500;
    
    if (error.message.includes('Language') && error.message.includes('not supported')) {
      errorMessage = 'Language not supported';
      statusCode = 400;
    } else if (error.message.includes('Invalid voice')) {
      errorMessage = 'Invalid voice selected';
      statusCode = 400;
    } else if (error.message.includes('Translation failed')) {
      errorMessage = 'Translation failed';
      statusCode = 422;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        step: error.message.includes('Translation') ? 'translation' : 'synthesis'
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  try {
    const ttsService = EnhancedTextToSpeechService.getInstance();
    const languages = ttsService.getSupportedLanguages();
    const cacheStats = ttsService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      service: 'Enhanced Text-to-Speech',
      supportedLanguages: languages,
      cache: cacheStats,
      features: [
        'Intelligent voice selection',
        'Automatic translation',
        'Audio caching',
        'Multiple voice qualities',
        'SSML support',
        'Performance optimization'
      ]
    });
  } catch (error) {
    console.error('Error getting TTS service info:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get service information',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
