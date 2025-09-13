import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

let ttsClient: TextToSpeechClient | null = null;

function initializeTTSClient() {
  if (!ttsClient) {
    try {
      // Try environment variables first, fallback to credentials file
      if (process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
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
        // Fallback to credentials file
        const credentialsPath = './google-credentials.json';
        ttsClient = new TextToSpeechClient({
          keyFilename: credentialsPath
        });
      }
    } catch (error) {
      console.error('Failed to initialize Google Cloud TTS client:', error);
      ttsClient = null;
    }
  }
  return ttsClient;
}

export async function POST(request: NextRequest) {
  try {
    const { text, language = 'en-US', voice = 'en-US-Neural2-D', speed = 1.0, pitch = 0.0 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const client = initializeTTSClient();
    if (!client) {
      return NextResponse.json({ error: 'Google Cloud TTS not available' }, { status: 503 });
    }

    // Map language codes to Google Cloud format
    const languageCode = mapLanguageToGoogleCloud(language);
    const voiceName = getOptimalVoice(languageCode, voice);

    // Get the correct gender for the voice
    const voiceGender = getVoiceGender(voiceName);
    
    const ttsRequest = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
        ssmlGender: voiceGender as const
      },
      audioConfig: {
        audioEncoding: 'LINEAR16' as const,
        speakingRate: speed,
        pitch: pitch,
        sampleRateHertz: 24000
      }
    };

    const [response] = await client.synthesizeSpeech(ttsRequest);

    if (response.audioContent) {
      // Convert the audio content to base64 for transmission
      const audioBuffer = Buffer.from(response.audioContent);
      const audioBase64 = audioBuffer.toString('base64');

      return NextResponse.json({
        audioContent: audioBase64,
        audioConfig: {
          encoding: 'LINEAR16',
          sampleRateHertz: 24000
        }
      });
    }

    return NextResponse.json({ error: 'No audio content generated' }, { status: 500 });

  } catch (error) {
    console.error('Google Cloud TTS API error:', error);
    return NextResponse.json({
      error: 'TTS service error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function mapLanguageToGoogleCloud(language: string): string {
  const languageMap: { [key: string]: string } = {
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    'hi-IN': 'hi-IN',
    'bn-IN': 'bn-IN',
    'te-IN': 'te-IN',
    'mr-IN': 'mr-IN',
    'ta-IN': 'ta-IN',
    'gu-IN': 'gu-IN',
    'kn-IN': 'kn-IN',
    'ml-IN': 'ml-IN',
    'pa-IN': 'pa-IN',
    'or-IN': 'or-IN',
    'as-IN': 'as-IN',
    'es-ES': 'es-ES',
    'fr-FR': 'fr-FR',
    'de-DE': 'de-DE',
    'it-IT': 'it-IT',
    'pt-BR': 'pt-BR',
    'ja-JP': 'ja-JP',
    'ko-KR': 'ko-KR',
    'zh-CN': 'cmn-CN',
    'zh-TW': 'cmn-TW'
  };

  return languageMap[language] || 'en-US';
}

function getOptimalVoice(languageCode: string, requestedVoice?: string): string {
  if (requestedVoice) {
    return requestedVoice;
  }

  const defaultVoices: { [key: string]: string } = {
    'en-US': 'en-US-Neural2-D',
    'en-GB': 'en-GB-Neural2-D',
    'hi-IN': 'hi-IN-Neural2-D',
    'bn-IN': 'bn-IN-Neural2-D',
    'te-IN': 'te-IN-Neural2-D',
    'mr-IN': 'mr-IN-Neural2-D',
    'ta-IN': 'ta-IN-Neural2-D',
    'gu-IN': 'gu-IN-Neural2-D',
    'kn-IN': 'kn-IN-Neural2-D',
    'ml-IN': 'ml-IN-Neural2-D',
    'pa-IN': 'pa-IN-Neural2-D',
    'or-IN': 'or-IN-Neural2-D',
    'as-IN': 'as-IN-Neural2-D',
    'es-ES': 'es-ES-Neural2-F',
    'fr-FR': 'fr-FR-Neural2-D',
    'de-DE': 'de-DE-Neural2-D',
    'it-IT': 'it-IT-Neural2-D',
    'pt-BR': 'pt-BR-Neural2-C',
    'ja-JP': 'ja-JP-Neural2-D',
    'ko-KR': 'ko-KR-Neural2-C',
    'cmn-CN': 'cmn-CN-Neural2-D',
    'cmn-TW': 'cmn-TW-Neural2-D'
  };

  return defaultVoices[languageCode] || 'en-US-Neural2-D';
}

// Get the correct gender for a voice
function getVoiceGender(voiceName: string): 'MALE' | 'FEMALE' {
  const voiceGenderMap: Record<string, 'MALE' | 'FEMALE'> = {
    'en-US-Neural2-A': 'FEMALE',
    'en-US-Neural2-C': 'FEMALE', 
    'en-US-Neural2-D': 'MALE',
    'en-US-Neural2-E': 'MALE',
    'en-US-Neural2-F': 'FEMALE',
    'en-US-Neural2-G': 'FEMALE',
    'en-US-Neural2-H': 'FEMALE',
    'en-US-Neural2-I': 'MALE',
    'en-US-Neural2-J': 'MALE',
    'en-US-Standard-A': 'FEMALE',
    'en-US-Standard-B': 'MALE',
    'en-US-Standard-C': 'FEMALE',
    'en-US-Standard-D': 'MALE',
    'en-US-Standard-E': 'FEMALE',
    'en-US-Standard-F': 'FEMALE',
    'en-US-Standard-G': 'FEMALE',
    'en-US-Standard-H': 'FEMALE',
    'en-US-Standard-I': 'MALE',
    'en-US-Standard-J': 'MALE',
    'en-US-Wavenet-A': 'FEMALE',
    'en-US-Wavenet-B': 'MALE',
    'en-US-Wavenet-C': 'FEMALE',
    'en-US-Wavenet-D': 'MALE',
    'en-US-Wavenet-E': 'FEMALE',
    'en-US-Wavenet-F': 'FEMALE',
    'en-US-Wavenet-G': 'FEMALE',
    'en-US-Wavenet-H': 'FEMALE',
    'en-US-Wavenet-I': 'MALE',
    'en-US-Wavenet-J': 'MALE'
  };
  
  return voiceGenderMap[voiceName] || 'FEMALE'; // Default to female if voice not found
}