import { NextRequest, NextResponse } from 'next/server';
import { EnhancedTextToSpeechService, EnhancedTextToSpeechOptions } from '@/lib/service/EnhancedTextToSpeechService';

/**
 * POST /api/enhanced-artisan-buddy/voice/tts
 * Text-to-Speech endpoint for converting text to audio
 * 
 * Requirements: 2.2, 2.3, 7.3
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            text,
            language = 'en-US',
            voice,
            gender = 'NEUTRAL',
            speed = 1.0,
            pitch = 0.0,
            volume = 0.0,
            audioEncoding = 'MP3',
            enableCache = true,
            ssmlOptions
        } = body;

        // Validate required fields
        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                {
                    error: 'Text is required and must be a string',
                    code: 'MISSING_TEXT'
                },
                { status: 400 }
            );
        }

        // Validate text length (max 5000 characters for TTS)
        if (text.length > 5000) {
            return NextResponse.json(
                {
                    error: 'Text too long. Maximum length is 5000 characters',
                    code: 'TEXT_TOO_LONG'
                },
                { status: 400 }
            );
        }

        // Validate speed range
        if (speed < 0.25 || speed > 4.0) {
            return NextResponse.json(
                {
                    error: 'Speed must be between 0.25 and 4.0',
                    code: 'INVALID_SPEED'
                },
                { status: 400 }
            );
        }

        // Validate pitch range
        if (pitch < -20.0 || pitch > 20.0) {
            return NextResponse.json(
                {
                    error: 'Pitch must be between -20.0 and 20.0',
                    code: 'INVALID_PITCH'
                },
                { status: 400 }
            );
        }

        // Configure TTS options
        const ttsOptions: EnhancedTextToSpeechOptions = {
            language,
            voice,
            gender: gender as 'MALE' | 'FEMALE' | 'NEUTRAL',
            speed,
            pitch,
            volume,
            audioEncoding: audioEncoding as any,
            enableCache,
            cacheKey: enableCache ? `tts_${Buffer.from(text + language + voice).toString('base64')}` : undefined,
            ssmlOptions
        };

        // Get TTS service instance
        const ttsService = EnhancedTextToSpeechService.getInstance();

        // Generate audio
        const startTime = Date.now();
        const result = await ttsService.synthesizeSpeech(text, ttsOptions);
        const processingTime = Date.now() - startTime;

        // Convert audio buffer to base64 for JSON response
        const audioBase64 = Buffer.from(result.audioBuffer).toString('base64');

        // Return successful response
        return NextResponse.json({
            success: true,
            audioData: audioBase64,
            audioFormat: result.audioFormat,
            language: result.language,
            voice: result.voice,
            duration: result.duration,
            cached: result.cached,
            audioUrl: result.audioUrl,
            metadata: {
                ...result.metadata,
                processingTime,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Text-to-Speech API error:', error);

        if (error instanceof Error) {
            // Handle specific TTS errors
            if (error.message.includes('INVALID_ARGUMENT')) {
                return NextResponse.json(
                    {
                        error: 'Invalid text or voice configuration',
                        code: 'INVALID_CONFIG'
                    },
                    { status: 400 }
                );
            }

            if (error.message.includes('QUOTA_EXCEEDED')) {
                return NextResponse.json(
                    {
                        error: 'Text-to-Speech quota exceeded. Please try again later',
                        code: 'QUOTA_EXCEEDED'
                    },
                    { status: 429 }
                );
            }

            if (error.message.includes('VOICE_NOT_FOUND')) {
                return NextResponse.json(
                    {
                        error: 'Requested voice not available for the specified language',
                        code: 'VOICE_NOT_FOUND'
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            {
                error: 'Failed to generate speech. Please try again',
                code: 'TTS_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/enhanced-artisan-buddy/voice/tts
 * Get TTS service capabilities and available voices
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const language = searchParams.get('language');

        const ttsService = EnhancedTextToSpeechService.getInstance();

        // Get available voices
        let availableVoices;
        if (language) {
            availableVoices = await ttsService.getAvailableVoices(language);
        } else {
            // Get voices for common languages
            const commonLanguages = ['en-US', 'hi-IN', 'bn-IN', 'ta-IN'];
            availableVoices = {};

            for (const lang of commonLanguages) {
                try {
                    availableVoices[lang] = await ttsService.getAvailableVoices(lang);
                } catch (error) {
                    console.warn(`Failed to get voices for ${lang}:`, error);
                    availableVoices[lang] = [];
                }
            }
        }

        return NextResponse.json({
            success: true,
            capabilities: {
                supportedLanguages: [
                    'en-US', 'en-GB', 'en-AU', 'en-IN',
                    'hi-IN', 'bn-IN', 'ta-IN', 'te-IN',
                    'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN',
                    'pa-IN', 'ur-IN', 'as-IN', 'or-IN'
                ],
                supportedFormats: ['MP3', 'LINEAR16', 'OGG_OPUS', 'MULAW', 'ALAW'],
                maxTextLength: 5000,
                features: {
                    ssmlSupport: true,
                    speedControl: true,
                    pitchControl: true,
                    volumeControl: true,
                    voiceSelection: true,
                    caching: true,
                    effectsProfiles: true
                },
                speedRange: { min: 0.25, max: 4.0 },
                pitchRange: { min: -20.0, max: 20.0 },
                volumeRange: { min: -96.0, max: 16.0 }
            },
            availableVoices,
            status: 'operational'
        });

    } catch (error) {
        console.error('TTS capabilities API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to get TTS capabilities',
                code: 'CAPABILITIES_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/enhanced-artisan-buddy/voice/tts
 * Update TTS preferences for a user
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            userId,
            preferences
        } = body;

        if (!userId) {
            return NextResponse.json(
                {
                    error: 'User ID is required',
                    code: 'MISSING_USER_ID'
                },
                { status: 400 }
            );
        }

        if (!preferences || typeof preferences !== 'object') {
            return NextResponse.json(
                {
                    error: 'Preferences object is required',
                    code: 'MISSING_PREFERENCES'
                },
                { status: 400 }
            );
        }

        const ttsService = EnhancedTextToSpeechService.getInstance();

        // Update user preferences (this would typically be stored in a database)
        await ttsService.updateUserPreferences(userId, preferences);

        return NextResponse.json({
            success: true,
            message: 'TTS preferences updated successfully',
            userId,
            preferences
        });

    } catch (error) {
        console.error('TTS preferences update error:', error);
        return NextResponse.json(
            {
                error: 'Failed to update TTS preferences',
                code: 'UPDATE_ERROR'
            },
            { status: 500 }
        );
    }
}