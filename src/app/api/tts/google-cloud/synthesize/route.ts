import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the Google Cloud TTS client using existing credentials
const ttsClient = new TextToSpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            text,
            languageCode = 'en-US',
            voiceName,
            gender = 'NEUTRAL',
            speakingRate = 1.0,
            pitch = 0.0,
            audioEncoding = 'MP3'
        } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required for synthesis', success: false },
                { status: 400 }
            );
        }

        if (text.length > 5000) {
            return NextResponse.json(
                { error: 'Text too long. Maximum 5000 characters allowed.', success: false },
                { status: 400 }
            );
        }

        console.log(`🔊 Synthesizing speech for text: "${text.substring(0, 50)}..."`);
        console.log(`📝 Language: ${languageCode}, Voice: ${voiceName || 'default'}, Gender: ${gender}`);

        // Prepare the synthesis request - simplified for any voice
        const synthesisRequest = {
            input: { text },
            voice: {
                languageCode,
                // Let Google pick any available voice for the language
            },
            audioConfig: {
                audioEncoding: audioEncoding as 'LINEAR16' | 'MP3' | 'OGG_OPUS',
                speakingRate,
                pitch,
                sampleRateHertz: audioEncoding === 'MP3' ? 24000 : 16000,
            },
        };

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                console.log(`🔄 TTS synthesis attempt ${retryCount + 1}/${maxRetries}`);

                const [response] = await ttsClient.synthesizeSpeech(synthesisRequest);

                if (!response.audioContent) {
                    throw new Error('No audio content received from TTS service');
                }

                // Convert audio content to base64
                const audioBase64 = Buffer.from(response.audioContent).toString('base64');

                // Calculate approximate duration (rough estimate)
                const wordsPerMinute = 150; // Average speaking rate
                const wordCount = text.split(' ').length;
                const estimatedDuration = Math.ceil((wordCount / wordsPerMinute) * 60 * 1000); // in milliseconds

                console.log(`✅ TTS synthesis successful! Audio size: ${audioBase64.length} chars`);

                return NextResponse.json({
                    success: true,
                    audio: {
                        content: audioBase64,
                        duration: estimatedDuration,
                        format: audioEncoding.toLowerCase(),
                        mimeType: audioEncoding === 'MP3' ? 'audio/mpeg' :
                            audioEncoding === 'OGG_OPUS' ? 'audio/ogg' : 'audio/wav'
                    },
                    voice: {
                        languageCode,
                        name: voiceName || 'default',
                        gender
                    }
                });

            } catch (error) {
                retryCount++;
                console.error(`❌ TTS synthesis attempt ${retryCount} failed:`, error);

                if (retryCount >= maxRetries) {
                    // Check for specific error types
                    if (error instanceof Error) {
                        if (error.message.includes('quota')) {
                            return NextResponse.json(
                                {
                                    error: 'TTS quota exceeded. Please try again later.',
                                    success: false,
                                    fallbackAvailable: true
                                },
                                { status: 429 }
                            );
                        } else if (error.message.includes('permission') || error.message.includes('authentication')) {
                            return NextResponse.json(
                                {
                                    error: 'TTS service authentication failed.',
                                    success: false,
                                    fallbackAvailable: true
                                },
                                { status: 403 }
                            );
                        } else if (error.message.includes('not found') || error.message.includes('invalid')) {
                            return NextResponse.json(
                                {
                                    error: 'Invalid voice or language selection.',
                                    success: false,
                                    fallbackAvailable: true
                                },
                                { status: 400 }
                            );
                        }
                    }

                    throw error;
                } else {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }
        }

    } catch (error) {
        console.error('❌ TTS synthesis error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to synthesize speech',
                success: false,
                fallbackAvailable: true
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check TTS service health
export async function GET() {
    try {
        console.log('🔍 Checking Google Cloud TTS service health...');

        // Test with a simple synthesis
        const testRequest = {
            input: { text: 'Test' },
            voice: {
                languageCode: 'en-US',
                ssmlGender: 'NEUTRAL' as const,
            },
            audioConfig: {
                audioEncoding: 'MP3' as const,
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(testRequest);

        if (response.audioContent) {
            console.log('✅ Google Cloud TTS service is healthy');
            return NextResponse.json({
                success: true,
                status: 'healthy',
                service: 'google-cloud-tts'
            });
        } else {
            throw new Error('No audio content in test response');
        }

    } catch (error) {
        console.error('❌ Google Cloud TTS health check failed:', error);
        return NextResponse.json(
            {
                success: false,
                status: 'unhealthy',
                service: 'google-cloud-tts',
                error: error instanceof Error ? error.message : 'Health check failed'
            },
            { status: 503 }
        );
    }
}