import { NextRequest, NextResponse } from 'next/server';

// Google Cloud Text-to-Speech integration
// This provides realistic buyer voices for product narration

export async function POST(request: NextRequest) {
  try {
    const { text, language = 'en', voiceType = 'buyer_female', speed = 1.0 } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided for speech synthesis' },
        { status: 400 }
      );
    }

    // Check API key availability
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    console.log(`🎵 Synthesizing speech: ${text.length} chars, language: ${language}, voice: ${voiceType}`);
    console.log(`🔑 API Key available: ${apiKey ? 'Yes' : 'No'}`);

    // Enhanced voice mapping with better models and voice cloning
    const voiceMapping = {
      // Professional buyer voices (enhanced models)
      'buyer_female': { name: 'en-US-Neural2-F', languageCode: 'en-US', ssmlGender: 'FEMALE' },
      'buyer_male': { name: 'en-US-Neural2-D', languageCode: 'en-US', ssmlGender: 'MALE' },
      'buyer_neutral': { name: 'en-US-Neural2-C', languageCode: 'en-US', ssmlGender: 'NEUTRAL' },

      // Authentic artisan voices (culturally appropriate)
      'artisan_female': { name: 'en-US-Neural2-F', languageCode: 'en-US', ssmlGender: 'FEMALE' },
      'artisan_male': { name: 'en-US-Neural2-D', languageCode: 'en-US', ssmlGender: 'MALE' },
      'storyteller': { name: 'en-US-Neural2-H', languageCode: 'en-US', ssmlGender: 'FEMALE' },

      // Enhanced Indian voices with better models
      'buyer_hindi_female': { name: 'hi-IN-Neural2-A', languageCode: 'hi-IN', ssmlGender: 'FEMALE' },
      'buyer_hindi_male': { name: 'hi-IN-Neural2-B', languageCode: 'hi-IN', ssmlGender: 'MALE' },
      'artisan_hindi_female': { name: 'hi-IN-Neural2-C', languageCode: 'hi-IN', ssmlGender: 'FEMALE' },
      'artisan_hindi_male': { name: 'hi-IN-Neural2-D', languageCode: 'hi-IN', ssmlGender: 'MALE' },

      // Regional Indian languages with enhanced models
      'buyer_tamil_female': { name: 'ta-IN-Neural2-A', languageCode: 'ta-IN', ssmlGender: 'FEMALE' },
      'buyer_telugu_female': { name: 'te-IN-Neural2-A', languageCode: 'te-IN', ssmlGender: 'FEMALE' },
      'buyer_bengali_female': { name: 'bn-IN-Neural2-A', languageCode: 'bn-IN', ssmlGender: 'FEMALE' },
      'buyer_gujarati_female': { name: 'gu-IN-Neural2-A', languageCode: 'gu-IN', ssmlGender: 'FEMALE' },
      'buyer_marathi_female': { name: 'mr-IN-Neural2-A', languageCode: 'mr-IN', ssmlGender: 'FEMALE' },
      'buyer_punjabi_female': { name: 'pa-IN-Neural2-A', languageCode: 'pa-IN', ssmlGender: 'FEMALE' },
      'buyer_urdu_female': { name: 'ur-IN-Neural2-A', languageCode: 'ur-IN', ssmlGender: 'FEMALE' },

      // International voices with enhanced models
      'buyer_spanish_female': { name: 'es-ES-Neural2-F', languageCode: 'es-ES', ssmlGender: 'FEMALE' },
      'buyer_french_female': { name: 'fr-FR-Neural2-E', languageCode: 'fr-FR', ssmlGender: 'FEMALE' },
      'buyer_arabic_female': { name: 'ar-XA-Neural2-A', languageCode: 'ar-XA', ssmlGender: 'FEMALE' },
      'buyer_german_female': { name: 'de-DE-Neural2-F', languageCode: 'de-DE', ssmlGender: 'FEMALE' },
      'buyer_italian_female': { name: 'it-IT-Neural2-E', languageCode: 'it-IT', ssmlGender: 'FEMALE' },
      'buyer_portuguese_female': { name: 'pt-BR-Neural2-A', languageCode: 'pt-BR', ssmlGender: 'FEMALE' },

      // Voice cloning simulation (maps to similar enhanced voices)
      'clone_artisan_warm': { name: 'en-US-Neural2-G', languageCode: 'en-US', ssmlGender: 'FEMALE' },
      'clone_artisan_deep': { name: 'en-US-Neural2-I', languageCode: 'en-US', ssmlGender: 'MALE' },
      'clone_artisan_young': { name: 'en-US-Neural2-F', languageCode: 'en-US', ssmlGender: 'FEMALE' },

      // Dynamic cloned voices (these would be generated at runtime)
      // In production, these would be actual custom voice models
    };

    const selectedVoice = voiceMapping[voiceType as keyof typeof voiceMapping] || voiceMapping.buyer_female;

    // Prepare the request for Google Cloud TTS
    const ttsRequest = {
      input: { text: text },
      voice: {
        languageCode: selectedVoice.languageCode,
        name: selectedVoice.name,
        ssmlGender: selectedVoice.ssmlGender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.max(0.25, Math.min(4.0, speed)), // Clamp speed between 0.25 and 4.0
        pitch: voiceType.startsWith('buyer') ? 0 : 2.0, // Buyers have neutral pitch, artisans slightly higher
        volumeGainDb: voiceType.startsWith('buyer') ? 0 : 1.0 // Buyers speak normally, artisans with slight enthusiasm
      }
    };

    try {
      // Call Google Cloud Text-to-Speech API
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ttsRequest)
      });

      if (!response.ok) {
        throw new Error(`Google TTS API error: ${response.status} ${response.statusText}`);
      }

      const ttsResult = await response.json();

      if (!ttsResult.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      // Calculate approximate duration based on text length and speaking rate
      const wordsPerMinute = 150 * speed; // Average speaking rate
      const wordCount = text.split(/\s+/).length;
      const durationSeconds = Math.max(2, (wordCount / wordsPerMinute) * 60);

      return NextResponse.json({
        success: true,
        audioData: `data:audio/mp3;base64,${ttsResult.audioContent}`,
        metadata: {
          textLength: text.length,
          wordCount: wordCount,
          language: selectedVoice.languageCode,
          voiceType: voiceType,
          voiceName: selectedVoice.name,
          speed: speed,
          duration: Math.round(durationSeconds),
          format: 'mp3',
          sampleRate: 24000,
          ssmlGender: selectedVoice.ssmlGender,
          isBuyerVoice: voiceType.startsWith('buyer')
        }
      });

    } catch (ttsError) {
      console.error('❌ Google TTS API failed:', ttsError);

      // Fallback to mock data if TTS fails
      console.log('⚠️ Falling back to mock audio generation');
      const mockAudioData = generateMockAudioData(text.length);
      const wordCount = text.split(/\s+/).length;
      const durationSeconds = Math.max(2, Math.ceil(wordCount / 15));

      return NextResponse.json({
        success: true,
        audioData: mockAudioData,
        metadata: {
          textLength: text.length,
          wordCount: wordCount,
          language,
          voiceType,
          speed,
          duration: durationSeconds,
          format: 'mp3',
          sampleRate: 24000,
          isBuyerVoice: voiceType.startsWith('buyer'),
          fallback: true,
          error: 'Google TTS temporarily unavailable'
        },
        message: 'Generated with fallback audio synthesis'
      });
    }

  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}

function generateMockAudioData(textLength: number): string {
  // Generate a mock base64 audio string
  // In production, this would be actual audio data from TTS service
  const mockSize = Math.max(1000, textLength * 50); // Rough size estimate
  const mockData = new Uint8Array(mockSize);

  // Fill with some pattern to simulate audio data
  for (let i = 0; i < mockSize; i++) {
    mockData[i] = (i * 7 + 13) % 256; // Simple pattern
  }

  // Convert to base64
  const base64Data = Buffer.from(mockData).toString('base64');
  return `data:audio/mp3;base64,${base64Data}`;
}

// Get available voices endpoint
export async function GET(request: NextRequest) {
  try {
    // Comprehensive voice options for buyers and artisans
    const voices = {
      buyer: {
        english: [
          { id: 'buyer_female', name: 'Professional Buyer (Female)', language: 'en', gender: 'female', description: 'Neutral, professional tone for marketplace buyers' },
          { id: 'buyer_male', name: 'Professional Buyer (Male)', language: 'en', gender: 'male', description: 'Confident, business-like tone for buyers' },
          { id: 'buyer_neutral', name: 'Market Analyst', language: 'en', gender: 'neutral', description: 'Analytical, informative tone for product reviews' }
        ],
        hindi: [
          { id: 'buyer_hindi_female', name: 'व्यावसायिक खरीदार (महिला)', language: 'hi', gender: 'female', description: 'Professional buyer voice in Hindi' },
          { id: 'buyer_hindi_male', name: 'व्यावसायिक खरीदार (पुरुष)', language: 'hi', gender: 'male', description: 'Professional buyer voice in Hindi' }
        ],
        spanish: [
          { id: 'buyer_spanish_female', name: 'Comprador Profesional', language: 'es', gender: 'female', description: 'Professional buyer voice in Spanish' }
        ],
        french: [
          { id: 'buyer_french_female', name: 'Acheteur Professionnel', language: 'fr', gender: 'female', description: 'Professional buyer voice in French' }
        ],
        arabic: [
          { id: 'buyer_arabic_female', name: 'مشتري محترف', language: 'ar', gender: 'female', description: 'Professional buyer voice in Arabic' }
        ]
      },
      artisan: {
        english: [
          { id: 'artisan_female', name: 'Artisan Storyteller (Female)', language: 'en', gender: 'female', description: 'Warm, passionate voice for artisan stories' },
          { id: 'artisan_male', name: 'Artisan Storyteller (Male)', language: 'en', gender: 'male', description: 'Authentic, experienced craftsman voice' },
          { id: 'storyteller', name: 'Master Storyteller', language: 'en', gender: 'neutral', description: 'Wise, traditional storytelling voice' }
        ],
        hindi: [
          { id: 'artisan_hindi_female', name: 'कारीगर कथाकार (महिला)', language: 'hi', gender: 'female', description: 'Indian artisan storyteller in Hindi' },
          { id: 'artisan_hindi_male', name: 'कारीगर कथाकार (पुरुष)', language: 'hi', gender: 'male', description: 'Indian artisan storyteller in Hindi' }
        ]
      }
    };

    return NextResponse.json({
      success: true,
      voices,
      defaultVoice: 'buyer_female',
      recommendedForBuyers: ['buyer_female', 'buyer_male', 'buyer_neutral'],
      recommendedForArtisans: ['artisan_female', 'artisan_male'],
      categories: {
        buyer: 'Professional, neutral voices for marketplace buyers and reviewers',
        artisan: 'Warm, authentic voices for artisan storytelling and product narratives'
      }
    });

  } catch (error) {
    console.error('Get voices error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve voices' },
      { status: 500 }
    );
  }
}