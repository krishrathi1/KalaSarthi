import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeAggregationService, startRealtimeAggregation, stopRealtimeAggregation } from '@/lib/jobs/realtime-aggregation-service';

interface AggregationRequest {
  action: 'start' | 'stop' | 'status' | 'config';
  config?: {
    batchSize?: number;
    pollInterval?: number;
    maxRetries?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AggregationRequest = await request.json();
    const { action, config } = body;

    const service = getRealtimeAggregationService();

    console.log(`🔄 Finance aggregation API called with action: ${action}`);

    switch (action) {
      case 'start':
        await startRealtimeAggregation();
        return NextResponse.json({
          success: true,
          message: 'Real-time aggregation service started',
          timestamp: new Date()
        });

      case 'stop':
        stopRealtimeAggregation();
        return NextResponse.json({
          success: true,
          message: 'Real-time aggregation service stopped',
          timestamp: new Date()
        });

      case 'config':
        if (config) {
          service.updateConfig(config);
          return NextResponse.json({
            success: true,
            message: 'Aggregation service configuration updated',
            config,
            timestamp: new Date()
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Configuration data is required'
          }, { status: 400 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "start", "stop", "status", or "config"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Finance aggregation API error:', error);
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

    const service = getRealtimeAggregationService();

    console.log(`📊 Finance aggregation status API called with action: ${action}`);

    switch (action) {
      case 'status':
        const status = service.getStatus();
        return NextResponse.json({
          success: true,
          status,
          timestamp: new Date()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "status"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Finance aggregation GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}