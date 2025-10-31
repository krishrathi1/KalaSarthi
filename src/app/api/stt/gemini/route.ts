import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
    ''
);

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const language = formData.get('language') as string || 'hi-IN';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Audio file is required', success: false },
                { status: 400 }
            );
        }

        console.log(`🎤 GEMINI STT for language: ${language}`);
        console.log(`📁 Audio: ${audioFile.size} bytes, type: ${audioFile.type}`);

        // Convert audio to base64
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        // Get the model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Create multilingual prompt
        const prompt = `
You are a multilingual speech-to-text transcription service. Convert the audio to text.

IMPORTANT INSTRUCTIONS:
- Listen carefully to the audio and transcribe EXACTLY what is spoken
- The speaker may use Hindi, English, or mix of both languages (Hinglish)
- Preserve the original language - if they speak Hindi, write in Hindi (Devanagari script)
- If they speak English, write in English
- If they mix languages, preserve the mix exactly as spoken
- Do NOT translate - just transcribe what you hear
- Return ONLY the transcribed text, no other commentary
- If no clear speech is detected, return: "No speech detected"

Language context: ${language}
Audio data follows...
`;

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                console.log(`🔄 Gemini STT attempt ${retryCount + 1}/${maxRetries}`);

                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: audioFile.type || 'audio/webm',
                            data: audioBase64
                        }
                    }
                ]);

                const response = await result.response;
                const transcription = response.text().trim();

                console.log(`📝 Gemini transcription: "${transcription.substring(0, 100)}..."`);

                // Check if transcription is valid
                if (!transcription ||
                    transcription.toLowerCase().includes('no speech detected') ||
                    transcription.toLowerCase().includes('cannot transcribe') ||
                    transcription.toLowerCase().includes('unable to process')) {

                    if (retryCount < maxRetries - 1) {
                        retryCount++;
                        console.log(`⚠️ Poor transcription, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    } else {
                        return NextResponse.json({
                            success: false,
                            error: 'No speech detected in audio. Please speak clearly and try again.',
                            fallbackAvailable: true
                        }, { status: 400 });
                    }
                }

                // Success!
                console.log(`✅ Gemini STT successful: ${transcription.length} characters`);

                return NextResponse.json({
                    success: true,
                    result: {
                        text: transcription,
                        confidence: 0.9, // Gemini doesn't provide confidence, use high value
                        language: language,
                        duration: audioFile.size / 16000, // Rough estimate
                        service: 'gemini'
                    }
                });

            } catch (error) {
                retryCount++;
                console.error(`❌ Gemini STT attempt ${retryCount} failed:`, error);

                if (retryCount >= maxRetries) {
                    // Final fallback - return a helpful message
                    return NextResponse.json({
                        success: false,
                        error: 'Speech recognition failed after multiple attempts. Please try again.',
                        fallbackAvailable: true
                    }, { status: 500 });
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
        }

    } catch (error) {
        console.error('❌ Gemini STT error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Speech recognition failed',
            success: false,
            fallbackAvailable: true
        }, { status: 500 });
    }
}

// Health check
export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_AI_API_KEY ||
            process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                status: 'unhealthy',
                service: 'gemini-stt',
                error: 'No Gemini API key found'
            }, { status: 503 });
        }

        // Test Gemini connection
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        await model.generateContent("test");

        return NextResponse.json({
            success: true,
            status: 'healthy',
            service: 'gemini-stt'
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            status: 'unhealthy',
            service: 'gemini-stt',
            error: error instanceof Error ? error.message : 'Health check failed'
        }, { status: 503 });
    }
}