import { NextRequest, NextResponse } from 'next/server';
import { trackApplicationStatus } from '@/ai/flows/status-tracking-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applications, artisanId } = body;

    if (!applications || !Array.isArray(applications)) {
      return NextResponse.json(
        { error: 'Applications array is required' },
        { status: 400 }
      );
    }

    const { statusUpdates } = await trackApplicationStatus({
      applicationIds: applications,
    });

    return NextResponse.json({
      message: 'Application status tracking completed',
      statusUpdates,
    });

  } catch (error) {
    console.error('Error tracking application status:', error);
    return NextResponse.json(
      { error: 'Failed to track application status' },
      { status: 500 }
    );
  }
}