import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

let sttClient: SpeechClient | null = null;

function initializeSTTClient() {
  if (!sttClient) {
    try {

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

        sttClient = new SpeechClient({
          credentials,
          projectId: credentials.project_id
        });
      } else {
        // Fallback to credentials file
        const credentialsPath = './google-credentials.json';
        sttClient = new SpeechClient({
          keyFilename: credentialsPath
        });
      }
    } catch (error) {
      console.error('Failed to initialize Google Cloud STT client:', error);
      sttClient = null;
    }
  }
  return sttClient;
}

export async function POST(request: NextRequest) {
  try {
    const { audioData, language = 'en-US', sampleRate = 48000, enableMultilingual = true } = await request.json();

    if (!audioData) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    const client = initializeSTTClient();
    if (!client) {
      return NextResponse.json({ error: 'Google Cloud STT not available' }, { status: 503 });
    }

    // Convert base64 audio data to Buffer
    const audioBytes = Buffer.from(audioData, 'base64');

    // Determine encoding based on sample rate
    const encoding = sampleRate === 48000 ? 'WEBM_OPUS' : 'LINEAR16';
    const sampleRateHertz = sampleRate;

    // Configure for multilingual support
    // Note: latest_long model doesn't support auto language detection
    // We'll use alternativeLanguageCodes for multilingual support
    const sttRequest = {
      audio: {
        content: audioBytes
      },
      config: {
        encoding: encoding as any,
        sampleRateHertz: sampleRateHertz,
        languageCode: mapLanguageToGoogleCloud(language), // Use specific language instead of 'auto'
        alternativeLanguageCodes: enableMultilingual ? [
          'en-US', 'hi-IN', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 
          'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA', 'th-TH', 'vi-VN', 'id-ID', 'ms-MY',
          'ta-IN', 'te-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'pa-IN'
        ] : undefined,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_long',
        useEnhanced: true,
        enableSpeakerDiarization: false,
        diarizationSpeakerCount: 0
      }
    };

    const [response] = await client.recognize(sttRequest);

    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      if (result.alternatives && result.alternatives.length > 0) {
        const alternative = result.alternatives[0];
        
        // Get detected language from the result
        const detectedLanguage = result.languageCode || language;
        
        return NextResponse.json({
          text: alternative.transcript || '',
          confidence: alternative.confidence || 0.9,
          language: detectedLanguage,
          detectedLanguage: detectedLanguage,
          isMultilingual: enableMultilingual
        });
      }
    }

    return NextResponse.json({
      text: '',
      confidence: 0.0,
      language,
      error: 'No speech detected'
    });

  } catch (error) {
    console.error('Google Cloud STT API error:', error);
    return NextResponse.json({
      error: 'STT service error',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
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
