/**
 * Artisan Buddy API - Conversation History Endpoint
 * 
 * GET /api/artisan-buddy/history - Retrieve conversation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { conversationManager } from '@/lib/services/artisan-buddy/ConversationManager';
import { withAuth, AuthContext } from '@/lib/middleware/artisan-buddy-auth';
import {
  ArtisanBuddyError,
  ErrorType,
  ErrorSeverity,
  createErrorResponse,
} from '@/lib/utils/artisan-buddy-errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/artisan-buddy/history
 * Retrieve conversation history with pagination and search
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, authContext) => {
    return handleGet(req, authContext);
  }, {
    requireAuth: false,
    rateLimit: true,
    logging: true,
  });
}

async function handleGet(request: NextRequest, authContext: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const role = searchParams.get('role') as 'user' | 'assistant' | null;
    const language = searchParams.get('language');
    const format = searchParams.get('format') as 'json' | 'text' | null;

    // Validate required fields
    if (!sessionId) {
      throw new ArtisanBuddyError(
        ErrorType.VALIDATION_ERROR,
        'sessionId is required',
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          requestId: authContext.requestId,
        }
      );
    }

    // Check if session exists
    const session = await conversationManager.getSession(sessionId);
    if (!session) {
      throw new ArtisanBuddyError(
        ErrorType.SESSION_NOT_FOUND,
        'Session not found or expired',
        {
          severity: ErrorSeverity.LOW,
          statusCode: 404,
          requestId: authContext.requestId,
          details: { sessionId },
        }
      );
    }

    // Handle export format
    if (format) {
      const exportData = await conversationManager.exportMessages(sessionId, format);
      
      if (format === 'text') {
        return new NextResponse(exportData, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="conversation-${sessionId}.txt"`,
          },
        });
      }

      return NextResponse.json(JSON.parse(exportData));
    }

    // Handle search
    if (search) {
      const searchResults = await conversationManager.searchMessages(
        sessionId,
        search,
        {
          role: role || undefined,
          language: language || undefined,
          limit,
        }
      );

      return NextResponse.json({
        messages: searchResults,
        total: searchResults.length,
        query: search,
        filters: {
          role,
          language,
        },
      });
    }

    // Get paginated history
    const { messages, total, hasMore } = await conversationManager.getPaginatedHistory(
      sessionId,
      limit,
      offset
    );

    // Get context statistics
    const stats = await conversationManager.getContextStatistics(sessionId);

    return NextResponse.json({
      messages,
      pagination: {
        limit,
        offset,
        total,
        hasMore,
      },
      statistics: stats,
      sessionInfo: {
        id: session.id,
        userId: session.userId,
        language: session.language,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
      },
    });

  } catch (error) {
    console.error('Get conversation history error:', error);
    
    // Use comprehensive error handling
    if (error instanceof ArtisanBuddyError) {
      return createErrorResponse(error, authContext.requestId);
    }
    
    // Handle unexpected errors
    const unexpectedError = new ArtisanBuddyError(
      ErrorType.DATABASE_ERROR,
      error instanceof Error ? error.message : 'Failed to retrieve conversation history',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 500,
        requestId: authContext.requestId,
      }
    );
    
    return createErrorResponse(unexpectedError, authContext.requestId);
  }
}
