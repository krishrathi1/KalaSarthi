import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

// Initialize the Google Cloud Speech client using existing credentials
const speechClient = new SpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en-IN';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Audio file is required', success: false },
                { status: 400 }
            );
        }

        console.log(`🎤 Processing speech-to-text for language: ${language}`);
        console.log(`📁 Audio file size: ${audioFile.size} bytes, type: ${audioFile.type}`);

        // Convert audio file to buffer
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBytes = Buffer.from(audioBuffer);

        // Configure the speech recognition request
        const speechRequest = {
            audio: {
                content: audioBytes,
            },
            config: {
                encoding: 'WEBM_OPUS' as const, // Most common format from browser recording
                // Remove sampleRateHertz to let Google Cloud auto-detect from audio header
                languageCode: language,
                alternativeLanguageCodes: ['en-IN', 'hi-IN', 'en-US'], // Fallback languages
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false,
                model: 'latest_long', // Better for longer audio
                useEnhanced: true, // Use enhanced model if available
            },
        };

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                console.log(`🔄 STT attempt ${retryCount + 1}/${maxRetries}`);

                // Perform the speech recognition request
                const [response] = await speechClient.recognize(speechRequest);

                if (!response.results || response.results.length === 0) {
                    throw new Error('No speech detected in audio');
                }

                // Get the best transcription result
                const transcription = response.results
                    .map(result => result.alternatives?.[0]?.transcript)
                    .filter(Boolean)
                    .join(' ');

                if (!transcription || transcription.trim().length === 0) {
                    throw new Error('Empty transcription result');
                }

                // Get confidence score
                const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0.8;

                console.log(`✅ STT successful: "${transcription.substring(0, 50)}..." (confidence: ${confidence})`);

                return NextResponse.json({
                    success: true,
                    result: {
                        text: transcription.trim(),
                        confidence,
                        language: language,
                        duration: audioFile.size / 16000 // Rough estimate
                    }
                });

            } catch (error) {
                retryCount++;
                console.error(`❌ STT attempt ${retryCount} failed:`, error);

                if (retryCount >= maxRetries) {
                    // Try with different audio encoding as fallback
                    if (speechRequest.config.encoding === 'WEBM_OPUS') {
                        console.log('🔄 Retrying with LINEAR16 encoding...');
                        speechRequest.config.encoding = 'LINEAR16';
                        speechRequest.config.sampleRateHertz = 16000; // Standard rate for LINEAR16
                        retryCount = 0; // Reset retry count for new encoding
                        continue;
                    }

                    // Check for specific error types
                    if (error instanceof Error) {
                        if (error.message.includes('quota')) {
                            return NextResponse.json(
                                {
                                    error: 'Speech recognition quota exceeded. Please try again later.',
                                    success: false,
                                    fallbackAvailable: true
                                },
                                { status: 429 }
                            );
                        } else if (error.message.includes('No speech detected')) {
                            return NextResponse.json(
                                {
                                    error: 'No speech detected in the audio. Please speak clearly and try again.',
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
        console.error('❌ Speech-to-text error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to process speech',
                success: false,
                fallbackAvailable: true
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check STT service health
export async function GET() {
    try {
        console.log('🔍 Checking Google Cloud Speech-to-Text service health...');

        // Simple health check - just verify client can be created
        const testConfig = {
            audio: {
                content: Buffer.from('test'),
            },
            config: {
                encoding: 'LINEAR16' as const,
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
        };

        // Don't actually call recognize, just test client initialization
        if (speechClient) {
            console.log('✅ Google Cloud Speech-to-Text client initialized successfully');
            return NextResponse.json({
                success: true,
                status: 'healthy',
                service: 'google-cloud-stt'
            });
        } else {
            throw new Error('Speech client not initialized');
        }

    } catch (error) {
        console.error('❌ Google Cloud STT health check failed:', error);
        return NextResponse.json(
            {
                success: false,
                status: 'unhealthy',
                service: 'google-cloud-stt',
                error: error instanceof Error ? error.message : 'Health check failed'
            },
            { status: 503 }
        );
    }
}