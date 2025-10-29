/**
 * API endpoint for application timeline
 * Requirement 3.3: Visual timeline with progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApplicationTracker } from '@/lib/services/scheme-sahayak/ApplicationTracker';

const applicationTracker = new ApplicationTracker();

/**
 * GET /api/scheme-sahayak/applications/[id]/timeline
 * Get application timeline with progress tracking
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

    // Get application timeline
    const timeline = await applicationTracker.getApplicationTimeline(applicationId);

    return NextResponse.json(
      {
        success: true,
        data: timeline
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Timeline retrieval error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get application timeline'
      },
      { status: 500 }
    );
  }
}
