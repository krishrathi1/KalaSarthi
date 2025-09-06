import { NextRequest, NextResponse } from 'next/server';
import { runSalesBackfill, resumeSalesBackfill } from '@/lib/jobs/sales-backfill-job';

interface BackfillRequest {
  startDate?: string;
  endDate?: string;
  chunkSize?: number;
  resumeFromOrderId?: string;
  jobId?: string;
  dryRun?: boolean;
  action?: 'start' | 'resume' | 'status';
}

export async function POST(request: NextRequest) {
  try {
    const body: BackfillRequest = await request.json();

    const {
      startDate,
      endDate,
      chunkSize = 1000,
      resumeFromOrderId,
      jobId,
      dryRun = false,
      action = 'start'
    } = body;

    console.log(`🔄 Finance backfill API called with action: ${action}`, body);

    let result;

    switch (action) {
      case 'start':
        result = await runSalesBackfill({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          chunkSize,
          dryRun
        });
        break;

      case 'resume':
        if (!jobId) {
          return NextResponse.json({
            success: false,
            error: 'jobId is required for resume action'
          }, { status: 400 });
        }
        result = await resumeSalesBackfill(jobId, {
          resumeFromOrderId,
          chunkSize,
          dryRun
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "start" or "resume"'
        }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        stats: result.stats,
        timestamp: new Date()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Finance backfill API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    console.log(`📊 Finance backfill status API called with action: ${action}`);

    switch (action) {
      case 'status':
        // In a real implementation, you'd query the database for job status
        return NextResponse.json({
          success: true,
          message: 'Backfill job status endpoint',
          note: 'Job status tracking not yet implemented in database',
          availableActions: ['start', 'resume', 'status'],
          timestamp: new Date()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "status"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Finance backfill GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}