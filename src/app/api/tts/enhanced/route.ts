import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { 
  VOICE_MAPPING, 
  getBestVoiceForLanguage, 
  getDefaultVoice, 
  getFallbackVoice,
  isLanguageSupported 
} from '@/lib/voice-mapping';
import { withCache, CACHE_TTL } from '@/lib/performance';

let ttsClient: TextToSpeechClient | null = null;

function initializeTTSClient() {
  if (!ttsClient) {
    try {
      // Try environment variables first
      if (process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
        console.log('🔑 Using environment variables for TTS authentication');
        const credentials = {
          type: 'service_account',
          project_id: process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0314311341',
          private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
          universe_domain: 'googleapis.com'
        };

        ttsClient = new TextToSpeechClient({
          credentials,
          projectId: credentials.project_id
        });
      } else {
        // Fallback to google-credentials.json file
        console.log('📁 Using google-credentials.json for TTS authentication');
        ttsClient = new TextToSpeechClient({
          keyFilename: './google-credentials.json'
        });
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud TTS client:', error);
      ttsClient = null;
    }
  }
  return ttsClient;
}

export async function POST(request: NextRequest) {
  try {
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
    } = await request.json();

    console.log('🎤 TTS Request received:', { text: text.substring(0, 50) + '...', language, voice, gender, quality });

    if (!text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Text is required' 
      }, { status: 400 });
    }

    // Validate language support
    if (!isLanguageSupported(language)) {
      return NextResponse.json({ 
        success: false, 
        error: `Language ${language} is not supported` 
      }, { status: 400 });
    }

    // Create cache key for the request
    const cacheKey = `tts-${text}-${language}-${voice}-${gender}-${quality}-${speed}-${pitch}-${volume}-${enableTranslation}`;
    
    // Try to get from cache first
    const result = await withCache(
      cacheKey,
      async () => {
    const client = initializeTTSClient();
    if (!client) {
      console.error('❌ TTS client initialization failed');
      throw new Error('Google Cloud TTS not available. Please check your credentials.');
    }

    console.log('✅ TTS client initialized successfully');

        // Select optimal voice
        let selectedVoice = voice;
        if (!selectedVoice) {
          const bestVoice = getBestVoiceForLanguage(language, gender, quality);
          selectedVoice = bestVoice?.name || getDefaultVoice(language);
        }

        // Get voice configuration
        const voices = VOICE_MAPPING[language]?.voices || [];
        const voiceConfig = voices.find(v => v.name === selectedVoice);
        const voiceGender = voiceConfig?.gender || gender;

        // Handle translation if needed
        let processedText = text;
        if (enableTranslation && language !== sourceLanguage) {
          try {
            // Use Gemini for translation
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (geminiApiKey) {
              const translateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `Translate the following text from ${sourceLanguage} to ${language}: "${text}"`
                    }]
                  }]
                })
              });

              if (translateResponse.ok) {
                const translateData = await translateResponse.json();
                const translatedText = translateData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (translatedText) {
                  processedText = translatedText;
                }
              }
            }
          } catch (error) {
            console.warn('Translation failed, using original text:', error);
          }
        }

        // Enhanced voice configuration
        const ttsRequest = {
          input: { text: processedText },
          voice: {
            languageCode: language,
            name: selectedVoice,
            ssmlGender: voiceGender as const
          },
          audioConfig: {
            audioEncoding: 'MP3' as const,
            speakingRate: speed,
            pitch: pitch,
            volumeGainDb: volume,
            effectsProfileId: ['headphone-class-device'],
            sampleRateHertz: 24000
          }
        };

        console.log('TTS Request:', {
          language,
          voice: selectedVoice,
          gender: voiceGender,
          textLength: processedText.length,
          quality
        });

        const [response] = await client.synthesizeSpeech(ttsRequest);

        if (!response.audioContent) {
          throw new Error('No audio content generated');
        }

        // Convert the audio content to base64 for transmission
        const audioBuffer = Buffer.from(response.audioContent);
        const audioBase64 = audioBuffer.toString('base64');

        return {
          success: true,
          audio: {
            data: audioBase64,
            format: 'MP3',
            sampleRate: 24000
          },
          voice: {
            name: selectedVoice,
            language,
            gender: voiceGender,
            quality: voiceConfig?.quality || quality
          },
          text: {
            original: text,
            processed: processedText,
            translated: enableTranslation && processedText !== text
          }
        };
      },
      { ttl: CACHE_TTL.VERY_LONG } // Cache for 24 hours
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Enhanced TTS API error:', error);
    
    // More specific error messages
    let errorMessage = 'TTS service error';
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        errorMessage = 'Google Cloud credentials not configured properly';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Insufficient permissions for TTS service';
      } else if (error.message.includes('quota')) {
        errorMessage = 'TTS quota exceeded';
      } else if (error.message.includes('voice')) {
        errorMessage = 'Selected voice not available';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = initializeTTSClient();
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Cloud TTS not available' 
      }, { status: 503 });
    }

    // Return available languages and voices
    const languages = Object.keys(VOICE_MAPPING).map(code => ({
      code,
      name: VOICE_MAPPING[code]?.defaultVoice || 'Unknown',
      voices: VOICE_MAPPING[code]?.voices?.length || 0
    }));

    return NextResponse.json({
      success: true,
      languages,
      totalLanguages: languages.length,
      totalVoices: Object.values(VOICE_MAPPING).reduce((sum, lang) => sum + (lang.voices?.length || 0), 0)
    });

  } catch (error) {
    console.error('Get languages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get available languages'
    }, { status: 500 });
  }
}