import { NextRequest, NextResponse } from 'next/server';
import { EnhancedArtisanBuddy } from '@/lib/services/EnhancedArtisanBuddy';

export async function POST(request: NextRequest) {
    try {
        const { message, userId, enableVoice } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Use userId or default to anonymous user
        const actualUserId = userId || 'default_user';

        // Get the Enhanced Artisan Buddy service instance
        const artisanBuddy = EnhancedArtisanBuddy.getInstance();

        // Process the message using the actual service
        const chatResponse = await artisanBuddy.processMessage(message, actualUserId, actualUserId);

        // Generate voice if requested (placeholder for now)
        let audioData = null;
        if (enableVoice) {
            console.log('Voice generation requested for:', chatResponse.response);
        }

        return NextResponse.json({
            response: chatResponse.response,
            intent: chatResponse.intent,
            confidence: chatResponse.confidence,
            shouldNavigate: chatResponse.shouldNavigate,
            navigationTarget: chatResponse.navigationTarget,
            usedProfile: chatResponse.usedProfile,
            language: chatResponse.language,
            audio: audioData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced Artisan Buddy API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');

        const actualUserId = userId || 'default_user';

        if (action === 'history') {
            return NextResponse.json({
                history: [
                    {
                        id: '1',
                        content: 'Sample conversation history',
                        sender: 'user',
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        }

        if (action === 'profile') {
            return NextResponse.json({
                profile: {
                    id: 'sample-profile',
                    userId: actualUserId,
                    personalInfo: {
                        name: 'Sample Artisan',
                        location: 'Sample Location'
                    }
                }
            });
        }

        return NextResponse.json({
            message: 'Enhanced Artisan Buddy API is running',
            userId: actualUserId,
            status: 'healthy'
        });

    } catch (error) {
        console.error('Enhanced Artisan Buddy GET API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');

        const actualUserId = userId || 'default_user';

        if (action === 'clear-history') {
            return NextResponse.json({
                message: 'Conversation history cleared',
                userId: actualUserId
            });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Enhanced Artisan Buddy DELETE API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}