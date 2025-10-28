/**
 * Enhanced Chat API - Voice to Text Endpoint
 * Converts audio to text using Google Speech-to-Text
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

interface VoiceToTextRequest {
  audioData: string; // Base64 encoded audio
  language: string;
  sessionId: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VoiceToTextRequest = await request.json();
    
    if (!body.audioData || !body.language) {
      return NextResponse.json({
        success: false,
        error: 'Missing audioData or language'
      }, { status: 400 });
    }
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(body.audioData, 'base64');
    
    // Configure speech recognition
    const config = {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: 48000,
      languageCode: body.language,
      alternativeLanguageCodes: ['en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN'],
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'latest_long',
      useEnhanced: true,
    };
    
    const audio = {
      content: audioBuffer,
    };
    
    const request_config = {
      audio: audio,
      config: config,
    };
    
    // Perform speech recognition
    const [response] = await speechClient.recognize(request_config);
    
    if (!response.results || response.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No speech detected in audio'
      }, { status: 400 });
    }
    
    const transcription = response.results[0];
    const transcript = transcription.alternatives?.[0]?.transcript || '';
    const confidence = transcription.alternatives?.[0]?.confidence || 0;
    
    // Detect actual language used
    const detectedLanguage = response.results[0].languageCode || body.language;
    
    // Get alternative transcriptions
    const alternatives = transcription.alternatives?.slice(1, 3).map(alt => ({
      transcript: alt.transcript,
      confidence: alt.confidence
    })) || [];
    
    return NextResponse.json({
      success: true,
      result: {
        text: transcript,
        confidence: confidence,
        language: detectedLanguage,
        alternatives: alternatives,
        wordTimeOffsets: transcription.alternatives?.[0]?.words?.map(word => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime
        })) || []
      }
    });
    
  } catch (error) {
    console.error('Voice to text error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to convert voice to text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}