/**
 * Artisan Buddy API - Session Management Endpoint
 * 
 * POST /api/artisan-buddy/session - Create or manage session
 * DELETE /api/artisan-buddy/session - End session and cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { conversationManager } from '@/lib/services/artisan-buddy/ConversationManager';
import { contextEngine } from '@/lib/services/artisan-buddy/ContextEngine';
import { withAuth, AuthContext } from '@/lib/middleware/artisan-buddy-auth';
import {
  ArtisanBuddyError,
  ErrorType,
  ErrorSeverity,
  createErrorResponse,
  validateInput,
} from '@/lib/utils/artisan-buddy-errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/artisan-buddy/session
 * Create new session or get existing session info
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, authContext) => {
    return handlePost(req, authContext);
  }, {
    requireAuth: false,
    rateLimit: true,
    logging: true,
  });
}

async function handlePost(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();
    const { userId, language = 'en', action = 'create' } = body;

    // Validate required fields
    const validation = validateInput(body, ['userId']);
    if (!validation.valid) {
      throw new ArtisanBuddyError(
        ErrorType.VALIDATION_ERROR,
        validation.errors.join(', '),
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          requestId: authContext.requestId,
        }
      );
    }

    if (action === 'create') {
      // Create new session
      const session = await conversationManager.initializeSession(userId, language);

      // Get context summary
      const artisanContext = await contextEngine.loadArtisanContext(userId);
      const contextSummary = contextEngine.getContextSummary(artisanContext);

      return NextResponse.json({
        session: {
          id: session.id,
          userId: session.userId,
          language: session.language,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
        },
        profile: {
          name: session.artisanProfile.name,
          profession: session.artisanProfile.profession,
          specializations: session.artisanProfile.specializations,
          location: session.artisanProfile.location,
        },
        contextSummary,
        message: 'Session created successfully',
      });
    }

    if (action === 'info') {
      // Get session info
      const sessionId = body.sessionId;
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for info action' },
          { status: 400 }
        );
      }

      const session = await conversationManager.getSession(sessionId);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Get context statistics
      const stats = await conversationManager.getContextStatistics(sessionId);

      return NextResponse.json({
        session: {
          id: session.id,
          userId: session.userId,
          language: session.language,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
        },
        profile: {
          name: session.artisanProfile.name,
          profession: session.artisanProfile.profession,
          specializations: session.artisanProfile.specializations,
          location: session.artisanProfile.location,
        },
        statistics: stats,
        context: {
          recentTopics: session.context.recentTopics,
          pendingActions: session.context.pendingActions,
        },
      });
    }

    if (action === 'refresh') {
      // Refresh session context
      const sessionId = body.sessionId;
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for refresh action' },
          { status: 400 }
        );
      }

      const session = await conversationManager.getSession(sessionId);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      // Refresh artisan context
      await contextEngine.refreshContext(userId);

      return NextResponse.json({
        message: 'Session context refreshed successfully',
        sessionId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: create, info, refresh' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Session management error:', error);
    
    // Use comprehensive error handling
    if (error instanceof ArtisanBuddyError) {
      return createErrorResponse(error, authContext.requestId);
    }
    
    // Handle unexpected errors
    const unexpectedError = new ArtisanBuddyError(
      ErrorType.SERVICE_UNAVAILABLE,
      error instanceof Error ? error.message : 'Session management failed',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 500,
        requestId: authContext.requestId,
      }
    );
    
    return createErrorResponse(unexpectedError, authContext.requestId);
  }
}

/**
 * DELETE /api/artisan-buddy/session
 * End session and cleanup resources
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, authContext) => {
    return handleDelete(req, authContext);
  }, {
    requireAuth: false,
    rateLimit: true,
    logging: true,
  });
}

async function handleDelete(request: NextRequest, authContext: AuthContext) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Check if session exists
    const session = await conversationManager.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get final statistics before cleanup
    const finalStats = await conversationManager.getContextStatistics(sessionId);

    // End session
    await conversationManager.endSession(sessionId);

    return NextResponse.json({
      message: 'Session ended successfully',
      sessionId,
      finalStatistics: finalStats,
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    
    // Use comprehensive error handling
    if (error instanceof ArtisanBuddyError) {
      return createErrorResponse(error, authContext.requestId);
    }
    
    // Handle unexpected errors
    const unexpectedError = new ArtisanBuddyError(
      ErrorType.SERVICE_UNAVAILABLE,
      error instanceof Error ? error.message : 'Session cleanup failed',
      {
        severity: ErrorSeverity.MEDIUM,
        statusCode: 500,
        requestId: authContext.requestId,
      }
    );
    
    return createErrorResponse(unexpectedError, authContext.requestId);
  }
}

/**
 * GET /api/artisan-buddy/session
 * Get active session count and cleanup expired sessions
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
    const action = searchParams.get('action');

    if (action === 'cleanup') {
      // Cleanup expired sessions
      const cleanedCount = await conversationManager.cleanupExpiredSessions();

      return NextResponse.json({
        message: 'Expired sessions cleaned up',
        cleanedCount,
      });
    }

    // Get active session count
    const activeCount = await conversationManager.getActiveSessionCount();

    return NextResponse.json({
      activeSessionCount: activeCount,
    });

  } catch (error) {
    console.error('Session info error:', error);
    
    // Use comprehensive error handling
    if (error instanceof ArtisanBuddyError) {
      return createErrorResponse(error, authContext.requestId);
    }
    
    // Handle unexpected errors
    const unexpectedError = new ArtisanBuddyError(
      ErrorType.SERVICE_UNAVAILABLE,
      error instanceof Error ? error.message : 'Failed to retrieve session info',
      {
        severity: ErrorSeverity.LOW,
        statusCode: 500,
        requestId: authContext.requestId,
      }
    );
    
    return createErrorResponse(unexpectedError, authContext.requestId);
  }
}
