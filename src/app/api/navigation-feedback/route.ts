/**
 * Navigation Feedback API
 * Test endpoint for the NavigationFeedbackService
 */

import { NextRequest, NextResponse } from 'next/server';
import { NavigationFeedbackService } from '@/lib/services/NavigationFeedbackService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            type = 'confirmation',
            language = 'en-US',
            variables = {},
            templateId,
            priority = 'medium'
        } = body;

        // Validate required fields
        if (!type || !language) {
            return NextResponse.json(
                { error: 'Type and language are required' },
                { status: 400 }
            );
        }

        // Get NavigationFeedbackService instance
        const feedbackService = NavigationFeedbackService.getInstance();

        // Initialize if not already initialized
        if (!feedbackService.isReady()) {
            await feedbackService.initialize();
        }

        // Generate feedback
        const feedbackRequest = {
            type,
            language,
            variables,
            templateId,
            priority
        };

        const response = await feedbackService.generateFeedback(feedbackRequest);

        // Return response with audio as base64 if successful
        if (response.success && response.audioContent) {
            return NextResponse.json({
                success: true,
                textContent: response.textContent,
                audioBase64: response.audioContent.toString('base64'),
                audioFormat: response.audioFormat,
                duration: response.duration,
                language: response.language,
                voiceName: response.voiceName,
                cached: response.cached
            });
        } else {
            return NextResponse.json({
                success: false,
                textContent: response.textContent,
                error: response.error
            });
        }

    } catch (error) {
        console.error('Navigation feedback API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate navigation feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const feedbackService = NavigationFeedbackService.getInstance();

        // Initialize if not already initialized
        if (!feedbackService.isReady()) {
            await feedbackService.initialize();
        }

        const supportedLanguages = feedbackService.getSupportedLanguages();
        const cacheStats = feedbackService.getCacheStats();
        const config = feedbackService.getConfiguration();

        return NextResponse.json({
            status: 'healthy',
            service: 'navigation-feedback',
            supportedLanguages,
            cacheStats,
            config: {
                enableCaching: config.enableCaching,
                cacheMaxSize: config.cacheMaxSize,
                defaultAudioFormat: config.defaultAudioFormat
            }
        });

    } catch (error) {
        console.error('Navigation feedback service health check failed:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        );
    }
}