/**
 * API Route for verifying OTP and authenticating user
 * POST /api/scheme-sahayak/auth/verify-otp
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/services/scheme-sahayak/AuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, otp } = body;

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

    if (!otp) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'OTP is required', 
            code: 'MISSING_OTP' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid OTP format. Please enter a 6-digit OTP.', 
            code: 'INVALID_OTP_FORMAT' 
          } 
        },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.verifyOTP(sessionId, otp);

    if (result.requiresRegistration) {
      return NextResponse.json({
        success: true,
        requiresRegistration: true,
        message: result.message,
        data: {
          sessionId // Keep session for registration flow
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        refreshToken: result.refreshToken,
        artisanId: result.artisanId,
        expiresIn: result.expiresIn,
        message: result.message
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/auth/verify-otp error:', error);
    
    let statusCode = 500;
    let errorCode = 'VERIFY_OTP_FAILED';

    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        statusCode = 400;
        errorCode = 'INVALID_SESSION';
      } else if (error.message.includes('expired')) {
        statusCode = 400;
        errorCode = 'OTP_EXPIRED';
      } else if (error.message.includes('Invalid OTP')) {
        statusCode = 400;
        errorCode = 'INVALID_OTP';
      } else if (error.message.includes('Maximum')) {
        statusCode = 429;
        errorCode = 'MAX_ATTEMPTS_EXCEEDED';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to verify OTP',
          code: errorCode
        }
      },
      { status: statusCode }
    );
  }
}