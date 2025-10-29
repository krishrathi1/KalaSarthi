/**
 * API Routes for User Preferences Management
 * Handles notification preferences, language settings, and privacy controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserService } from '../../../../../lib/services/scheme-sahayak';
import { NotificationPreferences } from '../../../../../lib/types/scheme-sahayak';

/**
 * GET /api/scheme-sahayak/artisans/preferences
 * Get user preferences for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    const preferences = await userService.getUserPreferences(artisanId);

    return NextResponse.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    console.error('GET /api/scheme-sahayak/artisans/preferences error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheme-sahayak/artisans/preferences
 * Update user preferences for an artisan
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, ...preferences } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    // Validate preferences structure
    if (preferences.channels && typeof preferences.channels !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid channels format', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    if (preferences.timing && typeof preferences.timing !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid timing format', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    if (preferences.types && typeof preferences.types !== 'object') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid types format', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const userService = getUserService();
    await userService.updateUserPreferences(artisanId, preferences);

    return NextResponse.json({
      success: true,
      message: 'User preferences updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/scheme-sahayak/artisans/preferences error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheme-sahayak/artisans/preferences
 * Reset user preferences to default values
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: { message: 'Artisan ID is required', code: 'MISSING_ARTISAN_ID' } },
        { status: 400 }
      );
    }

    // Default preferences
    const defaultPreferences: NotificationPreferences = {
      channels: {
        sms: true,
        email: true,
        push: true,
        whatsapp: false
      },
      timing: {
        preferredHours: [9, 18], // 9 AM to 6 PM
        timezone: 'Asia/Kolkata',
        frequency: 'immediate'
      },
      types: {
        newSchemes: true,
        deadlineReminders: true,
        statusUpdates: true,
        documentRequests: true,
        rejectionNotices: true
      }
    };

    const userService = getUserService();
    await userService.updateUserPreferences(artisanId, defaultPreferences);

    return NextResponse.json({
      success: true,
      data: defaultPreferences,
      message: 'User preferences reset to default values'
    });

  } catch (error) {
    console.error('POST /api/scheme-sahayak/artisans/preferences error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}