/**
 * API endpoints for individual application management
 * Requirements: 3.1, 3.3, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApplicationTracker } from '@/lib/services/scheme-sahayak/ApplicationTracker';

const applicationTracker = new ApplicationTracker();

/**
 * GET /api/scheme-sahayak/applications/[id]
 * Get application status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing application ID'
        },
        { status: 400 }
      );
    }

    // Track application status
    const status = await applicationTracker.trackApplication(applicationId);

    return NextResponse.json(
      {
        success: true,
        data: status
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Application tracking error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track application'
      },
      { status: 500 }
    );
  }
}
