/**
 * API endpoints for scheme application management
 * Requirements: 5.1, 3.1, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApplicationTracker } from '@/lib/services/scheme-sahayak/ApplicationTracker';
import type { SchemeApplication } from '@/lib/types/scheme-sahayak';

const applicationTracker = new ApplicationTracker();

/**
 * POST /api/scheme-sahayak/applications
 * Submit a new scheme application
 */
export async function POST(request: NextRequest) {
  try {
    const applicationData: SchemeApplication = await request.json();

    // Validate required fields
    if (!applicationData.artisanId || !applicationData.schemeId || !applicationData.formData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: artisanId, schemeId, or formData'
        },
        { status: 400 }
      );
    }

    // Submit application
    const result = await applicationTracker.submitApplication(applicationData);

    return NextResponse.json(
      {
        success: true,
        data: result
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Application submission error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scheme-sahayak/applications?artisanId=xxx
 * Get all applications for an artisan
 */
export async function GET(request: NextRequest) {
  try {
    const artisanId = request.nextUrl.searchParams.get('artisanId');

    if (!artisanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: artisanId'
        },
        { status: 400 }
      );
    }

    // Sync all applications
    const syncResult = await applicationTracker.syncAllApplications(artisanId);

    return NextResponse.json(
      {
        success: true,
        data: syncResult
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Application sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync applications'
      },
      { status: 500 }
    );
  }
}
