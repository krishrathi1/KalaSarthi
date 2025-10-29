/**
 * API Route for sending OTP
 * POST /api/scheme-sahayak/auth/send-otp
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/services/scheme-sahayak/AuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, purpose = 'login' } = body;

    if (!phone) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Phone number is required', 
            code: 'MISSING_PHONE' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number.', 
            code: 'INVALID_PHONE_FORMAT' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate purpose
    const validPurposes = ['login', 'registration', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid purpose. Must be one of: login, registration, password_reset', 
            code: 'INVALID_PURPOSE' 
          } 
        },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.sendOTP(phone, purpose);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        expiresAt: result.expiresAt.toISOString(),
        message: `OTP sent to ${phone}. Valid for 5 minutes.`
      }
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/auth/send-otp error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to send OTP',
          code: 'SEND_OTP_FAILED'
        }
      },
      { status: 500 }
    );
  }
}