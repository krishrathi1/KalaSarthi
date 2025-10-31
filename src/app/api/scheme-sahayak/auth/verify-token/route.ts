/**
 * API Route for verifying JWT token
 * POST /api/scheme-sahayak/auth/verify-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/services/scheme-sahayak/AuthService';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Authorization header with Bearer token is required', 
            code: 'MISSING_AUTH_HEADER' 
          } 
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authService = new AuthService();
    const payload = await authService.verifyToken(token);

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        payload: {
          artisanId: payload.sub,
          phone: payload.phone,
          role: payload.role,
          permissions: payload.permissions,
          mfaVerified: payload.mfa_verified,
          sessionId: payload.session_id,
          expiresAt: new Date(payload.exp! * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/auth/verify-token error:', error);
    
    let statusCode = 401;
    let errorCode = 'TOKEN_VERIFICATION_FAILED';

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
      } else if (error.message.includes('Invalid token')) {
        errorCode = 'INVALID_TOKEN';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Token verification failed',
          code: errorCode
        }
      },
      { status: statusCode }
    );
  }
}