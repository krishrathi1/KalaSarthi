import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 Testing voice services API...');

        // Check environment variables
        const envCheck = {
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
            hasPublicGoogleAIKey: !!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
            hasGoogleCloudCreds: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
            nodeEnv: process.env.NODE_ENV
        };

        // Test basic service imports
        let serviceImports = {
            geminiSpeechService: false,
            enhancedTTSService: false,
            audioResourceManager: false,
            voiceServiceOptimizer: false
        };

        try {
            const { GeminiSpeechService } = await import('@/lib/service/GeminiSpeechService');
            serviceImports.geminiSpeechService = true;
            console.log('✅ GeminiSpeechService imported successfully');
        } catch (e:any) {
            console.error('❌ Failed to import GeminiSpeechService:', e.message);
        }

        try {
            const { EnhancedTTSService } = await import('@/lib/services/EnhancedTTSService');
            serviceImports.enhancedTTSService = true;
            console.log('✅ EnhancedTTSService imported successfully');
        } catch (e:any) {
            console.error('❌ Failed to import EnhancedTTSService:', e.message);
        }

        try {
            const AudioResourceManager = (await import('@/lib/services/AudioResourceManager')).default;
            serviceImports.audioResourceManager = true;
            console.log('✅ AudioResourceManager imported successfully');
        } catch (e:any) {
            console.error('❌ Failed to import AudioResourceManager:', e.message);
        }

        try {
            const VoiceServiceOptimizer = (await import('@/lib/services/VoiceServiceOptimizer')).default;
            serviceImports.voiceServiceOptimizer = true;
            console.log('✅ VoiceServiceOptimizer imported successfully');
        } catch (e:any) {
            console.error('❌ Failed to import VoiceServiceOptimizer:', e.message);
        }

        // Test service initialization
        let serviceInitialization = {
            geminiSpeechService: false,
            enhancedTTSService: false,
            error: null
        };

        try {
            const { GeminiSpeechService } = await import('@/lib/service/GeminiSpeechService');
            const geminiService = GeminiSpeechService.getInstance();
            serviceInitialization.geminiSpeechService = !!geminiService;
            console.log('✅ GeminiSpeechService initialized successfully');
        } catch (e:any) {
            console.error('❌ Failed to initialize GeminiSpeechService:', e.message);
            serviceInitialization.error = e.message;
        }

        try {
            const { EnhancedTTSService } = await import('@/lib/services/EnhancedTTSService');
            const ttsStatus = await EnhancedTTSService.checkServiceAvailability();
            serviceInitialization.enhancedTTSService = ttsStatus.googleCloud || ttsStatus.browser;
            console.log('✅ EnhancedTTSService availability checked:', ttsStatus);
        } catch (e:any) {
            console.error('❌ Failed to check EnhancedTTSService availability:', e.message);
            if (!serviceInitialization.error) serviceInitialization.error = e.message;
        }

        return NextResponse.json({
            success: true,
            envCheck,
            serviceImports,
            serviceInitialization,
            timestamp: new Date().toISOString()
        });

    } catch (error : any) {
        console.error('❌ Voice services test failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}