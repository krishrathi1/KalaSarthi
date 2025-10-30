import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryTracker } from '../../../../../lib/services/notifications/DeliveryTracker';
import { getAnalyticsService } from '../../../../../lib/services/notifications/AnalyticsService';
import { handleGupshupError } from '../../../../../lib/services/notifications/GupshupErrorHandler';

/**
 * Get analytics and reporting data
 * GET /api/notifications/gupshup/analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse date range parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'full'; // full, summary, delivery, cost, performance

    // Default to last 7 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
        },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Start date must be before end date' 
        },
        { status: 400 }
      );
    }

    const dateRange = { start, end };

    // Get services
    const deliveryTracker = getDeliveryTracker();
    const analyticsService = getAnalyticsService(deliveryTracker);

    let responseData: any;

    switch (reportType) {
      case 'summary':
        const deliveryReport = await deliveryTracker.getDeliveryReport(dateRange);
        responseData = {
          summary: {
            totalMessages: deliveryReport.totalMessages,
            successfulDeliveries: deliveryReport.successfulDeliveries,
            failedDeliveries: deliveryReport.failedDeliveries,
            successRate: deliveryReport.successRate,
            averageDeliveryTime: deliveryReport.averageDeliveryTime,
          },
          timeRange: dateRange,
        };
        break;

      case 'delivery':
        const deliveryAnalytics = await analyticsService.generateDeliverySuccessAnalytics(dateRange);
        responseData = deliveryAnalytics;
        break;

      case 'cost':
        const deliveryReportForCost = await deliveryTracker.getDeliveryReport(dateRange);
        const costAnalytics = await analyticsService.generateCostAnalytics(deliveryReportForCost, dateRange);
        responseData = { costAnalytics, timeRange: dateRange };
        break;

      case 'performance':
        const deliveryReportForPerf = await deliveryTracker.getDeliveryReport(dateRange);
        const performanceMetrics = await analyticsService.generatePerformanceMetrics(deliveryReportForPerf, dateRange);
        responseData = { performanceMetrics, timeRange: dateRange };
        break;

      case 'full':
      default:
        const fullReport = await analyticsService.generateAnalyticsReport(dateRange);
        responseData = fullReport;
        break;
    }

    return NextResponse.json({
      success: true,
      type: reportType,
      data: responseData,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Analytics endpoint error:', error);
    
    const gupshupError = handleGupshupError(error, { 
      source: 'analytics_endpoint',
      url: request.url 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: gupshupError.message,
        code: gupshupError.code,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}