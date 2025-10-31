import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the Google Cloud TTS client using existing credentials
const ttsClient = new TextToSpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0314311341',
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Cache voices for 1 hour to reduce API calls
let voicesCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const languageCode = searchParams.get('languageCode');

        console.log(`🎤 Fetching available voices${languageCode ? ` for language: ${languageCode}` : ''}`);

        // Check cache first
        const now = Date.now();
        if (voicesCache && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📦 Using cached voices data');
            const filteredVoices = languageCode
                ? voicesCache.filter((voice: any) => voice.languageCode === languageCode)
                : voicesCache;

            return NextResponse.json({
                success: true,
                voices: filteredVoices,
                cached: true
            });
        }

        // Fetch voices from Google Cloud TTS
        const [response] = await ttsClient.listVoices({});

        if (!response.voices) {
            throw new Error('No voices received from TTS service');
        }

        // Process and format voices
        const processedVoices = response.voices.map(voice => ({
            name: voice.name,
            languageCode: voice.languageCodes?.[0] || 'unknown',
            languageCodes: voice.languageCodes || [],
            gender: voice.ssmlGender,
            naturalSampleRateHertz: voice.naturalSampleRateHertz,
            // Add language display names for better UX
            languageDisplayName: getLanguageDisplayName(voice.languageCodes?.[0] || ''),
            // Categorize by region/country
            region: getRegionFromLanguageCode(voice.languageCodes?.[0] || ''),
            // Mark recommended voices for Indian languages
            recommended: isRecommendedVoice(voice.name || '', voice.languageCodes?.[0] || '')
        }));

        // Sort voices by language and then by name
        processedVoices.sort((a, b) => {
            if (a.languageCode !== b.languageCode) {
                return a.languageCode.localeCompare(b.languageCode);
            }
            return (a.name || '').localeCompare(b.name || '');
        });

        // Update cache
        voicesCache = processedVoices;
        cacheTimestamp = now;

        // Filter by language if requested
        const filteredVoices = languageCode
            ? processedVoices.filter(voice => voice.languageCode === languageCode)
            : processedVoices;

        console.log(`✅ Retrieved ${filteredVoices.length} voices${languageCode ? ` for ${languageCode}` : ''}`);

        return NextResponse.json({
            success: true,
            voices: filteredVoices,
            cached: false,
            totalVoices: processedVoices.length
        });

    } catch (error) {
        console.error('❌ Error fetching voices:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to fetch voices',
                success: false
            },
            { status: 500 }
        );
    }
}

// Helper function to get display name for language codes
function getLanguageDisplayName(languageCode: string): string {
    const languageNames: { [key: string]: string } = {
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'en-AU': 'English (Australia)',
        'en-IN': 'English (India)',
        'hi-IN': 'Hindi (India)',
        'bn-IN': 'Bengali (India)',
        'gu-IN': 'Gujarati (India)',
        'kn-IN': 'Kannada (India)',
        'ml-IN': 'Malayalam (India)',
        'mr-IN': 'Marathi (India)',
        'ta-IN': 'Tamil (India)',
        'te-IN': 'Telugu (India)',
        'pa-IN': 'Punjabi (India)',
        'ur-IN': 'Urdu (India)',
        'as-IN': 'Assamese (India)',
        'or-IN': 'Odia (India)',
        'ne-NP': 'Nepali (Nepal)',
        'si-LK': 'Sinhala (Sri Lanka)',
        'my-MM': 'Myanmar (Burmese)',
        'th-TH': 'Thai (Thailand)',
        'vi-VN': 'Vietnamese (Vietnam)',
        'zh-CN': 'Chinese (Simplified)',
        'zh-TW': 'Chinese (Traditional)',
        'ja-JP': 'Japanese (Japan)',
        'ko-KR': 'Korean (South Korea)',
        'ar-XA': 'Arabic',
        'fr-FR': 'French (France)',
        'de-DE': 'German (Germany)',
        'es-ES': 'Spanish (Spain)',
        'it-IT': 'Italian (Italy)',
        'pt-BR': 'Portuguese (Brazil)',
        'ru-RU': 'Russian (Russia)'
    };

    return languageNames[languageCode] || languageCode;
}

// Helper function to get region from language code
function getRegionFromLanguageCode(languageCode: string): string {
    const regions: { [key: string]: string } = {
        'en-US': 'North America',
        'en-GB': 'Europe',
        'en-AU': 'Oceania',
        'en-IN': 'South Asia',
        'hi-IN': 'South Asia',
        'bn-IN': 'South Asia',
        'gu-IN': 'South Asia',
        'kn-IN': 'South Asia',
        'ml-IN': 'South Asia',
        'mr-IN': 'South Asia',
        'ta-IN': 'South Asia',
        'te-IN': 'South Asia',
        'pa-IN': 'South Asia',
        'ur-IN': 'South Asia',
        'as-IN': 'South Asia',
        'or-IN': 'South Asia',
        'ne-NP': 'South Asia',
        'si-LK': 'South Asia',
        'my-MM': 'Southeast Asia',
        'th-TH': 'Southeast Asia',
        'vi-VN': 'Southeast Asia',
        'zh-CN': 'East Asia',
        'zh-TW': 'East Asia',
        'ja-JP': 'East Asia',
        'ko-KR': 'East Asia',
        'ar-XA': 'Middle East',
        'fr-FR': 'Europe',
        'de-DE': 'Europe',
        'es-ES': 'Europe',
        'it-IT': 'Europe',
        'pt-BR': 'South America',
        'ru-RU': 'Europe/Asia'
    };

    return regions[languageCode] || 'Other';
}

// Helper function to identify recommended voices for Indian languages
function isRecommendedVoice(voiceName: string, languageCode: string): boolean {
    // Recommend Neural2 and Journey voices for better quality
    const isHighQuality = voiceName.includes('Neural2') || voiceName.includes('Journey') || voiceName.includes('Studio');

    // Prioritize Indian language voices
    const isIndianLanguage = languageCode.includes('-IN');

    // Specific recommendations for popular voices
    const recommendedVoices = [
        'en-IN-Neural2-A', 'en-IN-Neural2-B', 'en-IN-Neural2-C', 'en-IN-Neural2-D',
        'hi-IN-Neural2-A', 'hi-IN-Neural2-B', 'hi-IN-Neural2-C', 'hi-IN-Neural2-D',
        'en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-F',
        'en-GB-Neural2-A', 'en-GB-Neural2-B', 'en-GB-Neural2-C', 'en-GB-Neural2-D'
    ];

    return recommendedVoices.includes(voiceName) || (isHighQuality && isIndianLanguage);
}

// POST endpoint to test a specific voice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { voiceName, languageCode, text = 'Hello, this is a test of the selected voice.' } = body;

        if (!voiceName || !languageCode) {
            return NextResponse.json(
                { error: 'Voice name and language code are required', success: false },
                { status: 400 }
            );
        }

        console.log(`🎵 Testing voice: ${voiceName} (${languageCode})`);

        // Test synthesis with the specified voice
        const testRequest = {
            input: { text },
            voice: {
                languageCode,
                name: voiceName,
                ssmlGender: 'NEUTRAL' as const,
            },
            audioConfig: {
                audioEncoding: 'MP3' as const,
                speakingRate: 1.0,
                pitch: 0.0,
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(testRequest);

        if (!response.audioContent) {
            throw new Error('No audio content received from voice test');
        }

        const audioBase64 = Buffer.from(response.audioContent).toString('base64');

        console.log(`✅ Voice test successful for ${voiceName}`);

        return NextResponse.json({
            success: true,
            voice: {
                name: voiceName,
                languageCode,
                tested: true
            },
            audio: {
                content: audioBase64,
                format: 'mp3',
                mimeType: 'audio/mpeg'
            }
        });

    } catch (error) {
        console.error('❌ Voice test error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Voice test failed',
                success: false
            },
            { status: 500 }
        );
    }
}