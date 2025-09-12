import { NextRequest, NextResponse } from 'next/server';
import { ObservabilityService } from '@/lib/service/ObservabilityService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('type') || 'all';
    const timeRange = searchParams.get('range') || '1h';

    console.log(`📊 Fetching observability metrics: ${metricType} for ${timeRange}`);

    let result;

    switch (metricType) {
      case 'api':
        const apiMetrics = ObservabilityService.getAPIMetrics(
          getTimeRange(timeRange),
          {
            endpoint: searchParams.get('endpoint') || undefined,
            method: searchParams.get('method') || undefined,
            statusCode: searchParams.get('statusCode') ? parseInt(searchParams.get('statusCode')!) : undefined
          }
        );
        result = {
          metrics: apiMetrics,
          stats: ObservabilityService.calculateAPIStats(apiMetrics)
        };
        break;

      case 'aggregation':
        const aggregationMetrics = ObservabilityService.getAggregationMetrics(
          getTimeRange(timeRange),
          {
            jobType: searchParams.get('jobType') || undefined,
            success: searchParams.get('success') ? searchParams.get('success') === 'true' : undefined
          }
        );
        result = {
          metrics: aggregationMetrics,
          stats: ObservabilityService.calculateAggregationStats(aggregationMetrics)
        };
        break;

      case 'agent':
        const agentMetrics = ObservabilityService.getAgentMetrics(
          getTimeRange(timeRange),
          {
            agentName: searchParams.get('agentName') || undefined,
            toolName: searchParams.get('toolName') || undefined,
            success: searchParams.get('success') ? searchParams.get('success') === 'true' : undefined
          }
        );
        result = {
          metrics: agentMetrics,
          stats: ObservabilityService.calculateAgentStats(agentMetrics)
        };
        break;

      case 'health':
        result = {
          systemHealth: ObservabilityService.getSystemHealth(),
          timestamp: new Date()
        };
        break;

      default:
        result = ObservabilityService.exportMetrics();
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('Observability API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

function getTimeRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;

  switch (range) {
    case '5m':
      start = new Date(now.getTime() - 5 * 60 * 1000);
      break;
    case '15m':
      start = new Date(now.getTime() - 15 * 60 * 1000);
      break;
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 60 * 60 * 1000); // Default to 1 hour
  }

  return { start, end: now };
}