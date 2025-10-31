import { NextRequest, NextResponse } from 'next/server';
import { EnhancedDigitalKhataService } from '@/lib/services/EnhancedDigitalKhataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId') || 'dev_bulchandani_001';

    console.log('🔍 Debug Dashboard Data for artisanId:', artisanId);

    const service = EnhancedDigitalKhataService.getInstance();
    const dashboardData = await service.getDashboardData(artisanId);

    // Get raw events for comparison
    const response = await fetch(`${request.nextUrl.origin}/api/sales-events?artisanId=${artisanId}&limit=50`);
    const rawData = await response.json();

    const now = new Date();
    const today = {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    };

    const debugInfo = {
      artisanId,
      currentTime: now.toISOString(),
      todayPeriod: {
        start: today.start.toISOString(),
        end: today.end.toISOString()
      },
      rawEventsCount: rawData.count,
      rawEventsSample: rawData.data?.slice(0, 3).map((event: any) => ({
        productName: event.productName,
        totalAmount: event.totalAmount,
        eventTimestamp: event.eventTimestamp,
        eventType: event.eventType
      })),
      dashboardCurrentSales: dashboardData.currentSales,
      dashboardRecentEventsCount: dashboardData.recentEvents.length,
      dashboardAggregates: {
        dailyCount: dashboardData.aggregates.daily.length,
        weeklyCount: dashboardData.aggregates.weekly.length,
        monthlyCount: dashboardData.aggregates.monthly.length
      },
      recentEventsSample: dashboardData.recentEvents.slice(0, 3).map(event => ({
        productName: event.productName,
        totalAmount: event.totalAmount,
        eventTimestamp: event.eventTimestamp,
        eventType: event.eventType
      }))
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Debug dashboard error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}