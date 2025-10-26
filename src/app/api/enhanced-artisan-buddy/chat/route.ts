import { NextRequest, NextResponse } from 'next/server';
import { EnhancedArtisanBuddyService } from '@/lib/services/EnhancedArtisanBuddyV2';
import { MessageInput, validateMessageInput } from '@/lib/types/enhanced-artisan-buddy';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/enhanced-artisan-buddy/chat
 * Main chat endpoint for message processing
 * 
 * Requirements: 1.1, 6.4, 7.1
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Extract and validate request data
        const {
            content,
            userId,
            conversationId,
            inputType = 'text',
            context
        } = body;

        // Validate required fields
        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                {
                    error: 'Message content is required and must be a string',
                    code: 'INVALID_CONTENT'
                },
                { status: 400 }
            );
        }

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                {
                    error: 'User ID is required and must be a string',
                    code: 'INVALID_USER_ID'
                },
                { status: 400 }
            );
        }

        // Create message input object
        const messageInput: MessageInput = {
            content: content.trim(),
            userId,
            conversationId: conversationId || uuidv4(),
            inputType: inputType as 'text' | 'voice',
            context
        };

        // Validate message input using the validation schema
        const validation = validateMessageInput(messageInput);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid message input',
                    details: validation.errors,
                    code: 'VALIDATION_ERROR'
                },
                { status: 400 }
            );
        }

        // Get Enhanced Artisan Buddy service instance
        const enhancedBuddy = EnhancedArtisanBuddyService.getInstance();

        // Process the message
        const startTime = Date.now();
        const response = await enhancedBuddy.processMessage(validation.data!);
        const processingTime = Date.now() - startTime;

        // Return successful response
        return NextResponse.json({
            success: true,
            message: response.content,
            conversationId: messageInput.conversationId,
            metadata: {
                ...response.metadata,
                processingTime,
                timestamp: new Date().toISOString()
            },
            audioUrl: response.audioUrl,
            updatedContext: response.updatedContext
        }, { status: 200 });

    } catch (error) {
        console.error('Enhanced Artisan Buddy chat API error:', error);

        // Determine error type and return appropriate response
        if (error instanceof Error) {
            if (error.message.includes('Conversation context not found')) {
                return NextResponse.json(
                    {
                        error: 'Conversation context not found. Please start a new conversation.',
                        code: 'CONTEXT_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes('Invalid message input')) {
                return NextResponse.json(
                    {
                        error: error.message,
                        code: 'VALIDATION_ERROR'
                    },
                    { status: 400 }
                );
            }
        }

        // Generic server error
        return NextResponse.json(
            {
                error: 'Internal server error occurred while processing your message',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/enhanced-artisan-buddy/chat
 * Get chat status and capabilities
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const conversationId = searchParams.get('conversationId');

        if (!userId) {
            return NextResponse.json(
                {
                    error: 'User ID is required',
                    code: 'MISSING_USER_ID'
                },
                { status: 400 }
            );
        }

        const enhancedBuddy = EnhancedArtisanBuddyService.getInstance();

        // If conversationId is provided, get specific conversation context
        if (conversationId) {
            const context = await enhancedBuddy.getConversationContext(conversationId);

            if (!context) {
                return NextResponse.json(
                    {
                        error: 'Conversation not found',
                        code: 'CONVERSATION_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                conversationId,
                context: {
                    userId: context.userId,
                    messageCount: context.sessionMetadata.messageCount,
                    startTime: context.sessionMetadata.startTime,
                    lastActivity: context.sessionMetadata.lastActivity,
                    voiceEnabled: context.sessionMetadata.voiceEnabled,
                    hasProfile: !!context.profileContext
                }
            });
        }

        // Get user's active conversations
        const userConversations = await enhancedBuddy.getUserConversations(userId);

        return NextResponse.json({
            success: true,
            userId,
            activeConversations: userConversations.length,
            conversations: userConversations.map(conv => ({
                conversationId: conv.conversationId,
                messageCount: conv.sessionMetadata.messageCount,
                startTime: conv.sessionMetadata.startTime,
                lastActivity: conv.sessionMetadata.lastActivity,
                voiceEnabled: conv.sessionMetadata.voiceEnabled
            })),
            capabilities: {
                textChat: true,
                voiceChat: true,
                profileAware: true,
                contextualResponses: true
            }
        });

    } catch (error) {
        console.error('Enhanced Artisan Buddy chat GET API error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}