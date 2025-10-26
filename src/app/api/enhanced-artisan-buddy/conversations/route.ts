import { NextRequest, NextResponse } from 'next/server';
import { EnhancedArtisanBuddyService } from '@/lib/services/EnhancedArtisanBuddyV2';
import { ConversationStateService } from '@/lib/service/ConversationStateService';
import {
    ConversationContext,
    EnhancedChatMessage,
    validateConversationContext
} from '@/lib/types/enhanced-artisan-buddy';

/**
 * GET /api/enhanced-artisan-buddy/conversations
 * Get conversation history and management
 * 
 * Requirements: 1.3, 1.4, 6.4
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const conversationId = searchParams.get('conversationId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const includeMessages = searchParams.get('includeMessages') !== 'false';
        const activeOnly = searchParams.get('activeOnly') === 'true';

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
        const conversationState = ConversationStateService.getInstance();

        // Get specific conversation
        if (conversationId) {
            const conversation = await enhancedBuddy.getConversationContext(conversationId);

            if (!conversation) {
                return NextResponse.json(
                    {
                        error: 'Conversation not found',
                        code: 'CONVERSATION_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }

            // Verify user owns this conversation
            if (conversation.userId !== userId) {
                return NextResponse.json(
                    {
                        error: 'Access denied to this conversation',
                        code: 'ACCESS_DENIED'
                    },
                    { status: 403 }
                );
            }

            // Get full message history if requested
            let messages: EnhancedChatMessage[] = [];
            if (includeMessages) {
                messages = await enhancedBuddy.getConversationHistory(userId, conversationId);

                // Apply pagination to messages
                if (offset > 0 || limit < messages.length) {
                    messages = messages.slice(offset, offset + limit);
                }
            }

            return NextResponse.json({
                success: true,
                conversation: {
                    ...conversation,
                    conversationHistory: includeMessages ? messages : []
                },
                messageCount: conversation.sessionMetadata.messageCount,
                isActive: enhancedBuddy.isConversationActive(conversationId)
            });
        }

        // Get all conversations for user
        const userConversations = await enhancedBuddy.getUserConversations(userId);

        // Filter active conversations if requested
        let filteredConversations = userConversations;
        if (activeOnly) {
            filteredConversations = userConversations.filter(conv =>
                enhancedBuddy.isConversationActive(conv.conversationId)
            );
        }

        // Apply pagination
        const totalCount = filteredConversations.length;
        const paginatedConversations = filteredConversations.slice(offset, offset + limit);

        // Prepare response data
        const conversationsData = await Promise.all(
            paginatedConversations.map(async (conversation) => {
                let messages: EnhancedChatMessage[] = [];

                if (includeMessages) {
                    messages = await enhancedBuddy.getConversationHistory(userId, conversation.conversationId);
                    // Limit messages per conversation to avoid large responses
                    messages = messages.slice(-20); // Last 20 messages per conversation
                }

                return {
                    conversationId: conversation.conversationId,
                    userId: conversation.userId,
                    currentIntent: conversation.currentIntent,
                    messageCount: conversation.sessionMetadata.messageCount,
                    startTime: conversation.sessionMetadata.startTime,
                    lastActivity: conversation.sessionMetadata.lastActivity,
                    voiceEnabled: conversation.sessionMetadata.voiceEnabled,
                    hasProfile: !!conversation.profileContext,
                    isActive: enhancedBuddy.isConversationActive(conversation.conversationId),
                    messages: includeMessages ? messages : []
                };
            })
        );

        return NextResponse.json({
            success: true,
            conversations: conversationsData,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            },
            summary: {
                totalConversations: userConversations.length,
                activeConversations: userConversations.filter(conv =>
                    enhancedBuddy.isConversationActive(conv.conversationId)
                ).length,
                totalMessages: userConversations.reduce((sum, conv) =>
                    sum + conv.sessionMetadata.messageCount, 0
                )
            }
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        return NextResponse.json(
            {
                error: 'Failed to retrieve conversations',
                code: 'RETRIEVAL_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/enhanced-artisan-buddy/conversations
 * Create a new conversation or import conversation data
 * 
 * Requirements: 1.3, 1.4, 6.4
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, profileContext, importData } = body;

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

        // Handle conversation import
        if (importData) {
            const validation = validateConversationContext(importData);
            if (!validation.success) {
                return NextResponse.json(
                    {
                        error: 'Invalid conversation import data',
                        details: validation.errors,
                        code: 'VALIDATION_ERROR'
                    },
                    { status: 400 }
                );
            }

            const conversationData = validation.data!;

            // Ensure the conversation belongs to the requesting user
            if (conversationData.userId !== userId) {
                return NextResponse.json(
                    {
                        error: 'Cannot import conversation for different user',
                        code: 'USER_MISMATCH'
                    },
                    { status: 400 }
                );
            }

            // Store the imported conversation
            const conversationState = ConversationStateService.getInstance();
            await conversationState.storeConversationContext(conversationData);

            return NextResponse.json({
                success: true,
                message: 'Conversation imported successfully',
                conversationId: conversationData.conversationId,
                messageCount: conversationData.sessionMetadata.messageCount
            }, { status: 201 });
        }

        // Create new conversation
        const newConversation = await enhancedBuddy.initializeConversation(userId, profileContext);

        return NextResponse.json({
            success: true,
            message: 'New conversation created successfully',
            conversation: {
                conversationId: newConversation.conversationId,
                userId: newConversation.userId,
                startTime: newConversation.sessionMetadata.startTime,
                hasProfile: !!newConversation.profileContext
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Create/Import conversation error:', error);

        if (error instanceof Error && error.message.includes('Conversation already exists')) {
            return NextResponse.json(
                {
                    error: 'Conversation with this ID already exists',
                    code: 'CONVERSATION_EXISTS'
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to create/import conversation',
                code: 'CREATE_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/enhanced-artisan-buddy/conversations
 * Delete conversations or cleanup inactive ones
 * 
 * Requirements: 1.3, 1.4, 6.4
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const conversationId = searchParams.get('conversationId');
        const action = searchParams.get('action');
        const timeoutMinutes = parseInt(searchParams.get('timeoutMinutes') || '60');

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

        // Delete specific conversation
        if (conversationId) {
            const conversation = await enhancedBuddy.getConversationContext(conversationId);

            if (!conversation) {
                return NextResponse.json(
                    {
                        error: 'Conversation not found',
                        code: 'CONVERSATION_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }

            // Verify user owns this conversation
            if (conversation.userId !== userId) {
                return NextResponse.json(
                    {
                        error: 'Access denied to this conversation',
                        code: 'ACCESS_DENIED'
                    },
                    { status: 403 }
                );
            }

            await enhancedBuddy.clearConversation(conversationId);

            return NextResponse.json({
                success: true,
                message: 'Conversation deleted successfully',
                conversationId
            });
        }

        // Cleanup inactive conversations
        if (action === 'cleanup') {
            const cleanedCount = enhancedBuddy.cleanupInactiveConversations(timeoutMinutes);

            return NextResponse.json({
                success: true,
                message: `Cleaned up ${cleanedCount} inactive conversations`,
                cleanedCount,
                timeoutMinutes
            });
        }

        // Delete all conversations for user
        if (action === 'clear-all') {
            const userConversations = await enhancedBuddy.getUserConversations(userId);

            for (const conversation of userConversations) {
                await enhancedBuddy.clearConversation(conversation.conversationId);
            }

            return NextResponse.json({
                success: true,
                message: `Deleted ${userConversations.length} conversations`,
                deletedCount: userConversations.length
            });
        }

        return NextResponse.json(
            {
                error: 'Either conversationId or action parameter is required',
                code: 'MISSING_PARAMETERS'
            },
            { status: 400 }
        );

    } catch (error) {
        console.error('Delete conversations error:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete conversation(s)',
                code: 'DELETE_ERROR'
            },
            { status: 500 }
        );
    }
}