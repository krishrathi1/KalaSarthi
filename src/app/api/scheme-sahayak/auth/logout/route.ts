/**
 * API Route for user logout
 * POST /api/scheme-sahayak/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/services/scheme-sahayak/AuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Session ID is required', 
            code: 'MISSING_SESSION_ID' 
          } 
        },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    await authService.logout(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/auth/logout error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to logout',
          code: 'LOGOUT_FAILED'
        }
      },
      { status: 500 }
    );
  }
}