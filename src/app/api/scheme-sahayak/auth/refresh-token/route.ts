/**
 * API Route for refreshing access token
 * POST /api/scheme-sahayak/auth/refresh-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/services/scheme-sahayak/AuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Refresh token is required', 
            code: 'MISSING_REFRESH_TOKEN' 
          } 
        },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.refreshToken(refreshToken);

    return NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        message: 'Token refreshed successfully'
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/auth/refresh-token error:', error);
    
    let statusCode = 500;
    let errorCode = 'TOKEN_REFRESH_FAILED';

    if (error instanceof Error) {
      if (error.message.includes('Invalid refresh token') || 
          error.message.includes('no longer valid')) {
        statusCode = 401;
        errorCode = 'INVALID_REFRESH_TOKEN';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to refresh token',
          code: errorCode
        }
      },
      { status: statusCode }
    );
  }
}