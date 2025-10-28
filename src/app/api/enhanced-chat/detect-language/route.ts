/**
 * Enhanced Chat - Language Detection API
 * Detects spoken language from audio data
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

const speechClient = new SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

export async function POST(request: NextRequest) {
  try {
    const { audioData } = await request.json();
    
    if (!audioData) {
      return NextResponse.json({
        success: false,
        error: 'Missing audio data'
      }, { status: 400 });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Configure for language detection with multiple language codes
    const config = {
      encoding: 'WEBM_OPUS' as any,
      sampleRateHertz: 48000,
      languageCode: 'en', // Primary language
      alternativeLanguageCodes: [
        'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 
        'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
      ],
      enableAutomaticPunctuation: false,
      model: 'latest_short' // Better for language detection
    };

    const audio = {
      content: audioBuffer.toString('base64')
    };

    // Perform recognition with language detection
    const [response] = await speechClient.recognize({
      config,
      audio
    });

    if (!response.results || response.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No speech detected for language identification'
      }, { status: 400 });
    }

    // Extract language information
    const result = response.results[0];
    const detectedLanguage = result.languageCode || 'en';
    const confidence = result.alternatives?.[0]?.confidence || 0.5;

    // Create alternatives based on confidence scores
    const alternatives = response.results
      .slice(1, 4) // Top 3 alternatives
      .map(result => ({
        language: result.languageCode || 'unknown',
        confidence: result.alternatives?.[0]?.confidence || 0
      }))
      .filter(alt => alt.language !== 'unknown');

    return NextResponse.json({
      success: true,
      language: detectedLanguage,
      confidence,
      alternatives,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Language detection error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json({
          success: false,
          error: 'Language detection quota exceeded',
          retryAfter: 60
        }, { status: 429 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Language detection failed'
    }, { status: 500 });
  }
}