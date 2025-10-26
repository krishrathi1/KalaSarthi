import { NextRequest, NextResponse } from 'next/server';
import { EnhancedArtisanBuddyService } from '@/lib/services/EnhancedArtisanBuddyV2';

/**
 * GET /api/enhanced-artisan-buddy/conversations/export
 * Export conversation data in various formats
 * 
 * Requirements: 1.3, 1.4, 6.4
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const conversationId = searchParams.get('conversationId');
        const format = searchParams.get('format') || 'json';
        const includeMetadata = searchParams.get('includeMetadata') !== 'false';
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        if (!userId) {
            return NextResponse.json(
                {
                    error: 'User ID is required',
                    code: 'MISSING_USER_ID'
                },
                { status: 400 }
            );
        }

        // Validate format
        const supportedFormats = ['json', 'csv', 'txt'];
        if (!supportedFormats.includes(format)) {
            return NextResponse.json(
                {
                    error: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}`,
                    code: 'UNSUPPORTED_FORMAT'
                },
                { status: 400 }
            );
        }

        const enhancedBuddy = EnhancedArtisanBuddyService.getInstance();

        // Get conversation data
        let conversations;
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

            conversations = [conversation];
        } else {
            conversations = await enhancedBuddy.getUserConversations(userId);
        }

        // Get messages for all conversations
        const conversationsWithMessages = await Promise.all(
            conversations.map(async (conversation) => {
                const messages = await enhancedBuddy.getConversationHistory(userId, conversation.conversationId);

                // Apply date filters if provided
                let filteredMessages = messages;
                if (dateFrom || dateTo) {
                    const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
                    const toDate = dateTo ? new Date(dateTo) : new Date();

                    filteredMessages = messages.filter(message => {
                        const messageDate = message.timestamp;
                        return messageDate >= fromDate && messageDate <= toDate;
                    });
                }

                return {
                    ...conversation,
                    conversationHistory: filteredMessages
                };
            })
        );

        // Generate export data based on format
        let exportData;
        let contentType;
        let filename;

        switch (format) {
            case 'json':
                exportData = generateJSONExport(conversationsWithMessages, includeMetadata);
                contentType = 'application/json';
                filename = `conversations_${userId}_${new Date().toISOString().split('T')[0]}.json`;
                break;

            case 'csv':
                exportData = generateCSVExport(conversationsWithMessages, includeMetadata);
                contentType = 'text/csv';
                filename = `conversations_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
                break;

            case 'txt':
                exportData = generateTextExport(conversationsWithMessages, includeMetadata);
                contentType = 'text/plain';
                filename = `conversations_${userId}_${new Date().toISOString().split('T')[0]}.txt`;
                break;

            default:
                throw new Error('Unsupported format');
        }

        // Return file download response
        return new NextResponse(exportData, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Export conversations error:', error);
        return NextResponse.json(
            {
                error: 'Failed to export conversations',
                code: 'EXPORT_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * Generate JSON export format
 */
function generateJSONExport(conversations: any[], includeMetadata: boolean): string {
    const exportData = {
        exportInfo: {
            timestamp: new Date().toISOString(),
            format: 'json',
            conversationCount: conversations.length,
            totalMessages: conversations.reduce((sum, conv) => sum + conv.conversationHistory.length, 0)
        },
        conversations: conversations.map(conversation => ({
            conversationId: conversation.conversationId,
            userId: conversation.userId,
            startTime: conversation.sessionMetadata.startTime,
            lastActivity: conversation.sessionMetadata.lastActivity,
            messageCount: conversation.sessionMetadata.messageCount,
            voiceEnabled: conversation.sessionMetadata.voiceEnabled,
            ...(includeMetadata && {
                currentIntent: conversation.currentIntent,
                entities: conversation.entities,
                profileContext: conversation.profileContext
            }),
            messages: conversation.conversationHistory.map((message: any) => ({
                id: message.id,
                content: message.content,
                sender: message.sender,
                timestamp: message.timestamp,
                ...(includeMetadata && {
                    audioUrl: message.audioUrl,
                    metadata: message.metadata
                })
            }))
        }))
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Generate CSV export format
 */
function generateCSVExport(conversations: any[], includeMetadata: boolean): string {
    const headers = [
        'ConversationId',
        'MessageId',
        'Sender',
        'Content',
        'Timestamp',
        'MessageCount',
        'VoiceEnabled'
    ];

    if (includeMetadata) {
        headers.push('Intent', 'Confidence', 'AudioUrl');
    }

    const rows = [headers.join(',')];

    conversations.forEach(conversation => {
        conversation.conversationHistory.forEach((message: any) => {
            const row = [
                conversation.conversationId,
                message.id,
                message.sender,
                `"${message.content.replace(/"/g, '""')}"`, // Escape quotes in CSV
                message.timestamp,
                conversation.sessionMetadata.messageCount,
                conversation.sessionMetadata.voiceEnabled
            ];

            if (includeMetadata) {
                row.push(
                    message.metadata?.intent || '',
                    message.metadata?.confidence || '',
                    message.audioUrl || ''
                );
            }

            rows.push(row.join(','));
        });
    });

    return rows.join('\n');
}

/**
 * Generate plain text export format
 */
function generateTextExport(conversations: any[], includeMetadata: boolean): string {
    const lines = [];

    lines.push('Enhanced Artisan Buddy - Conversation Export');
    lines.push('='.repeat(50));
    lines.push(`Export Date: ${new Date().toISOString()}`);
    lines.push(`Total Conversations: ${conversations.length}`);
    lines.push(`Total Messages: ${conversations.reduce((sum, conv) => sum + conv.conversationHistory.length, 0)}`);
    lines.push('');

    conversations.forEach((conversation, index) => {
        lines.push(`Conversation ${index + 1}: ${conversation.conversationId}`);
        lines.push('-'.repeat(40));
        lines.push(`Start Time: ${conversation.sessionMetadata.startTime}`);
        lines.push(`Last Activity: ${conversation.sessionMetadata.lastActivity}`);
        lines.push(`Message Count: ${conversation.sessionMetadata.messageCount}`);
        lines.push(`Voice Enabled: ${conversation.sessionMetadata.voiceEnabled}`);

        if (includeMetadata && conversation.currentIntent) {
            lines.push(`Current Intent: ${conversation.currentIntent}`);
        }

        lines.push('');
        lines.push('Messages:');

        conversation.conversationHistory.forEach((message: any, msgIndex: number) => {
            const timestamp = new Date(message.timestamp).toLocaleString();
            lines.push(`${msgIndex + 1}. [${timestamp}] ${message.sender.toUpperCase()}: ${message.content}`);

            if (includeMetadata && message.metadata) {
                if (message.metadata.intent) {
                    lines.push(`   Intent: ${message.metadata.intent} (confidence: ${message.metadata.confidence || 'N/A'})`);
                }
                if (message.audioUrl) {
                    lines.push(`   Audio: ${message.audioUrl}`);
                }
            }
        });

        lines.push('');
        lines.push('');
    });

    return lines.join('\n');
}