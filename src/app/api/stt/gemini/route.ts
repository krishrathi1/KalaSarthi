import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/stt/gemini
 * Bulletproof Speech-to-Text using Gemini AI
 */
export async function POST(request: NextRequest) {
    try {
        console.log('🎤 Gemini STT API called');

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'en-US';

        if (!audioFile) {
            return NextResponse.json(
                { success: false, error: 'Audio file is required' },
                { status: 400 }
            );
        }

        // Get API key
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
        if (!apiKey) {
            console.error('❌ No Gemini API key found');
            return NextResponse.json(
                { success: false, error: 'Gemini API not configured' },
                { status: 500 }
            );
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Convert audio to base64
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        console.log('🎤 Processing audio with Gemini:', {
            audioSize: audioBuffer.byteLength,
            language,
            audioType: audioFile.type
        });

        // Create prompt for speech-to-text
        const prompt = `
You are a speech-to-text transcription service. Convert the following audio to text.
Language: ${language}
Context: This is from an artisan/craftsperson talking about their products, business, or crafts.

Please provide ONLY the transcribed text without any additional commentary, explanations, or formatting.
If you cannot understand the audio clearly, respond with: "Could not transcribe audio clearly"

Audio data provided below.
    `;

        // Process with Gemini
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: audioFile.type || 'audio/webm',
                            data: audioBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1000,
            }
        });

        const response = await result.response;
        const transcribedText = response.text().trim();

        console.log('✅ Gemini STT successful:', {
            textLength: transcribedText.length,
            preview: transcribedText.substring(0, 50) + '...'
        });

        // Check if transcription was successful
        if (!transcribedText || transcribedText.includes('Could not transcribe')) {
            return NextResponse.json({
                success: false,
                error: 'No speech detected or audio quality too poor'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            result: {
                text: transcribedText,
                confidence: 0.9, // Gemini doesn't provide confidence scores
                language: language,
                duration: audioBuffer.byteLength / 16000 // Rough estimate
            }
        });

    } catch (error) {
        console.error('❌ Gemini STT error:', error);

        // Handle specific error types
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('429') || errorMessage.includes('quota')) {
            return NextResponse.json({
                success: false,
                error: 'Service temporarily overloaded. Please try again in a moment.'
            }, { status: 429 });
        }

        if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
            return NextResponse.json({
                success: false,
                error: 'Invalid audio format. Please try recording again.'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            error: 'Speech recognition failed. Please try again.'
        }, { status: 500 });
    }
}

/**
 * GET /api/stt/gemini
 * Get service status
 */
export async function GET() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

    return NextResponse.json({
        success: true,
        status: apiKey ? 'available' : 'not_configured',
        capabilities: {
            languages: ['en-US', 'hi-IN', 'es-ES', 'fr-FR'],
            formats: ['audio/webm', 'audio/wav', 'audio/mp3'],
            maxSize: '10MB'
        }
    });
}