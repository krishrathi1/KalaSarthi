import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

let ttsClient: TextToSpeechClient | null = null;

function initializeTTSClient() {
  if (!ttsClient) {
    try {
      const credentialsPath = './google-credentials.json';
      ttsClient = new TextToSpeechClient({
        keyFilename: credentialsPath
      });
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

    const ttsRequest = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
        ssmlGender: 'FEMALE' as const
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