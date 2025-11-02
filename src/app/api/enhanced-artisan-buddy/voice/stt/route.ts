import { NextRequest, NextResponse } from 'next/server';
import { EnhancedSpeechToTextService, EnhancedSpeechToTextOptions } from '@/lib/service/EnhancedSpeechToTextService';

/**
 * POST /api/enhanced-artisan-buddy/voice/stt
 * Speech-to-Text endpoint for converting audio to text
 * 
 * Requirements: 2.1, 2.5, 7.2
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en-US';
        const enableLanguageDetection = formData.get('enableLanguageDetection') === 'true';
        const model = formData.get('model') as string || 'latest_short';

        // Validate audio file
        if (!audioFile) {
            return NextResponse.json(
                {
                    error: 'Audio file is required',
                    code: 'MISSING_AUDIO_FILE'
                },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (audioFile.size > maxSize) {
            return NextResponse.json(
                {
                    error: 'Audio file too large. Maximum size is 10MB',
                    code: 'FILE_TOO_LARGE'
                },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            'audio/wav',
            'audio/mpeg',
            'audio/mp3',
            'audio/flac',
            'audio/ogg',
            'audio/webm'
        ];

        if (!allowedTypes.includes(audioFile.type)) {
            return NextResponse.json(
                {
                    error: 'Unsupported audio format. Supported formats: WAV, MP3, FLAC, OGG, WebM',
                    code: 'UNSUPPORTED_FORMAT'
                },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const audioBuffer = await audioFile.arrayBuffer();

        // Configure STT options
        const sttOptions: EnhancedSpeechToTextOptions = {
            language,
            enableLanguageDetection,
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
            model: model as any,
            audioEncoding: getAudioEncoding(audioFile.type),
            profanityFilter: false,
            speechContexts: [
                {
                    phrases: [
                        'artisan', 'craft', 'handmade', 'product', 'sales',
                        'revenue', 'customer', 'buyer', 'marketplace', 'trend'
                    ],
                    boost: 10
                }
            ]
        };

        // Get STT service instance
        const sttService = EnhancedSpeechToTextService.getInstance();

        // Process audio
        const startTime = Date.now();
        const result = await sttService.speechToText(audioBuffer, sttOptions);
        const processingTime = Date.now() - startTime;

        // Return successful response
        return NextResponse.json({
            success: true,
            text: result.text,
            confidence: result.confidence,
            language: result.language,
            detectedLanguage: result.detectedLanguage,
            wordTimeOffsets: result.wordTimeOffsets,
            alternatives: result.alternatives,
            audioQuality: result.audioQuality,
            metadata: {
                processingTime,
                audioSize: audioFile.size,
                audioType: audioFile.type,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Speech-to-Text API error:', error);

        if (error instanceof Error) {
            // Handle specific STT errors
            if (error.message.includes('INVALID_ARGUMENT')) {
                return NextResponse.json(
                    {
                        error: 'Invalid audio format or configuration',
                        code: 'INVALID_AUDIO'
                    },
                    { status: 400 }
                );
            }

            if (error.message.includes('QUOTA_EXCEEDED')) {
                return NextResponse.json(
                    {
                        error: 'Speech-to-Text quota exceeded. Please try again later',
                        code: 'QUOTA_EXCEEDED'
                    },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            {
                error: 'Failed to process audio. Please try again',
                code: 'STT_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/enhanced-artisan-buddy/voice/stt
 * Get STT service capabilities and status
 */
export async function GET(request: NextRequest) {
    try {
        const sttService = EnhancedSpeechToTextService.getInstance();

        return NextResponse.json({
            success: true,
            capabilities: {
                supportedLanguages: [
                    'en-US', 'en-GB', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN',
                    'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'ur-IN'
                ],
                supportedFormats: ['WAV', 'MP3', 'FLAC', 'OGG', 'WebM'],
                maxFileSize: '10MB',
                features: {
                    languageDetection: true,
                    automaticPunctuation: true,
                    wordTimeOffsets: true,
                    speakerDiarization: true,
                    profanityFilter: true,
                    speechContexts: true
                },
                models: [
                    'latest_long',
                    'latest_short',
                    'command_and_search',
                    'phone_call',
                    'video'
                ]
            },
            status: 'operational'
        });

    } catch (error) {
        console.error('STT capabilities API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to get STT capabilities',
                code: 'CAPABILITIES_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * Helper function to determine audio encoding from MIME type
 */
function getAudioEncoding(mimeType: string): 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'WEBM_OPUS' {
    switch (mimeType) {
        case 'audio/wav':
            return 'LINEAR16';
        case 'audio/flac':
            return 'FLAC';
        case 'audio/ogg':
            return 'OGG_OPUS';
        case 'audio/webm':
            return 'WEBM_OPUS';
        default:
            return 'LINEAR16'; // Default fallback
    }
}