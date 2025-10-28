/**
 * Enhanced Chat API - Text to Voice Endpoint
 * Converts text to speech using Google Text-to-Speech
 */

import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const ttsClient = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

interface TextToVoiceRequest {
  text: string;
  language: string;
  voiceGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number;
  pitch?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: TextToVoiceRequest = await request.json();
    
    if (!body.text || !body.language) {
      return NextResponse.json({
        success: false,
        error: 'Missing text or language'
      }, { status: 400 });
    }
    
    // Map language codes to voice names
    const voiceMap: { [key: string]: string } = {
      'en': 'en-US-Neural2-F',
      'hi': 'hi-IN-Neural2-A',
      'bn': 'bn-IN-Wavenet-A',
      'ta': 'ta-IN-Wavenet-A',
      'te': 'te-IN-Standard-A',
      'gu': 'gu-IN-Wavenet-A',
      'kn': 'kn-IN-Wavenet-A',
      'ml': 'ml-IN-Wavenet-A',
      'mr': 'mr-IN-Wavenet-A',
      'pa': 'pa-IN-Wavenet-A'
    };
    
    const voiceName = voiceMap[body.language] || voiceMap['en'];
    
    // Configure TTS request
    const request_config = {
      input: { text: body.text },
      voice: {
        languageCode: body.language === 'en' ? 'en-US' : `${body.language}-IN`,
        name: voiceName,
        ssmlGender: body.voiceGender || 'FEMALE' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: body.speakingRate || 1.0,
        pitch: body.pitch || 0.0,
        volumeGainDb: 0.0,
        sampleRateHertz: 24000,
      },
    };
    
    // Perform text-to-speech
    const [response] = await ttsClient.synthesizeSpeech(request_config);
    
    if (!response.audioContent) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate audio'
      }, { status: 500 });
    }
    
    // Convert audio to base64
    const audioBase64 = Buffer.from(response.audioContent as Uint8Array).toString('base64');
    
    return NextResponse.json({
      success: true,
      result: {
        audioData: audioBase64,
        audioFormat: 'mp3',
        language: body.language,
        voiceName: voiceName,
        duration: estimateAudioDuration(body.text), // Rough estimate
      }
    });
    
  } catch (error) {
    console.error('Text to voice error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to convert text to voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function estimateAudioDuration(text: string): number {
  // Rough estimate: ~150 words per minute, ~5 characters per word
  const wordsPerMinute = 150;
  const charactersPerWord = 5;
  const estimatedWords = text.length / charactersPerWord;
  const durationMinutes = estimatedWords / wordsPerMinute;
  return Math.max(1, Math.round(durationMinutes * 60)); // Return seconds, minimum 1 second
}