import { NextRequest, NextResponse } from 'next/server';
import { FinancialReportService, FinancialReportData, ReportExportOptions } from '@/lib/services/FinancialReportService';

interface ReportQueryParams {
  artisanId?: string;
  startDate?: string;
  endDate?: string;
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  realtime?: 'true' | 'false';
  format?: 'json' | 'csv' | 'pdf';
  includeCharts?: 'true' | 'false';
  includeDetails?: 'true' | 'false';
  template?: 'standard' | 'detailed' | 'summary';
}

interface ReportResponse {
  success: boolean;
  data?: FinancialReportData;
  export?: {
    filename: string;
    contentType: string;
    data: string;
  };
  metadata: {
    generatedAt: Date;
    processingTime: number;
    dataPoints: {
      salesEvents: number;
      expenses: number;
      aggregates: number;
    };
  };
  error?: string;
}

/**
 * GET method for generating and retrieving financial reports
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const params: ReportQueryParams = {
      artisanId: searchParams.get('artisanId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      period: (searchParams.get('period') as any) || 'month',
      realtime: (searchParams.get('realtime') as any) || 'true',
      format: (searchParams.get('format') as any) || 'json',
      includeCharts: (searchParams.get('includeCharts') as any) || 'false',
      includeDetails: (searchParams.get('includeDetails') as any) || 'true',
      template: (searchParams.get('template') as any) || 'standard',
    };

    console.log('📊 Financial Reports API called with params:', params);

    // Validate required parameters
    if (!params.artisanId) {
      return NextResponse.json(
        {
          success: false,
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
          },
          error: 'artisanId is required',
        } as ReportResponse,
        { status: 400 }
      );
    }

    // Calculate date range based on period
    const { startDate, endDate } = calculateDateRange(params.period!, params.startDate, params.endDate);

    // Initialize report service
    const reportService = FinancialReportService.getInstance();

    // Generate financial report with real-time data
    const reportData = await reportService.generateFinancialReport(
      params.artisanId,
      startDate,
      endDate,
      params.realtime === 'true'
    );

    const processingTime = Date.now() - startTime;

    // Handle export formats
    if (params.format && params.format !== 'json') {
      const exportOptions: ReportExportOptions = {
        format: params.format as 'pdf' | 'csv' | 'json',
        includeCharts: params.includeCharts === 'true',
        includeDetails: params.includeDetails === 'true',
        template: params.template as 'standard' | 'detailed' | 'summary',
      };

      const exportResult = await reportService.exportReport(reportData, exportOptions);

      if (exportResult.success) {
        // Return file download response
        return new NextResponse(exportResult.data, {
          headers: {
            'Content-Type': exportResult.contentType,
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
            'X-Processing-Time': processingTime.toString(),
          },
        });
      }
    }

    // Return JSON response
    const response: ReportResponse = {
      success: true,
      data: reportData,
      metadata: {
        generatedAt: new Date(),
        processingTime,
        dataPoints: {
          salesEvents: reportData.salesBreakdown.byProduct.reduce((sum, p) => sum + p.orders, 0),
          expenses: Object.values(reportData.expenseBreakdown.byCategory).length,
          aggregates: reportData.trends.monthlyTrend.length,
        },
      },
    };

    console.log(`✅ Financial report generated successfully in ${processingTime}ms`);
    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Financial Reports API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        metadata: {
          generatedAt: new Date(),
          processingTime,
          dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ReportResponse,
      { status: 500 }
    );
  }
}

/**
 * POST method for generating custom reports with specific parameters
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    console.log('📊 Financial Reports API POST called with:', body);

    const { action, artisanId, reportConfig } = body;

    if (!artisanId) {
      return NextResponse.json(
        {
          success: false,
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
          },
          error: 'artisanId is required',
        } as ReportResponse,
        { status: 400 }
      );
    }

    const reportService = FinancialReportService.getInstance();

    switch (action) {
      case 'generate_custom_report':
        // Generate custom report with specific configuration
        const {
          startDate: configStartDate,
          endDate: configEndDate,
          includeRealtime = true,
          exportFormat = 'json',
          includeDetails = true,
          includeCharts = false,
          template = 'standard'
        } = reportConfig || {};

        const startDate = configStartDate ? new Date(configStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = configEndDate ? new Date(configEndDate) : new Date();

        const reportData = await reportService.generateFinancialReport(
          artisanId,
          startDate,
          endDate,
          includeRealtime
        );

        const processingTime = Date.now() - startTime;

        // Handle export if requested
        if (exportFormat !== 'json') {
          const exportOptions: ReportExportOptions = {
            format: exportFormat,
            includeCharts,
            includeDetails,
            template,
          };

          const exportResult = await reportService.exportReport(reportData, exportOptions);

          if (exportResult.success) {
            return NextResponse.json({
              success: true,
              export: {
                filename: exportResult.filename,
                contentType: exportResult.contentType,
                data: exportResult.data,
              },
              metadata: {
                generatedAt: new Date(),
                processingTime,
                dataPoints: {
                  salesEvents: reportData.salesBreakdown.byProduct.reduce((sum, p) => sum + p.orders, 0),
                  expenses: Object.values(reportData.expenseBreakdown.byCategory).length,
                  aggregates: reportData.trends.monthlyTrend.length,
                },
              },
            } as ReportResponse);
          }
        }

        return NextResponse.json({
          success: true,
          data: reportData,
          metadata: {
            generatedAt: new Date(),
            processingTime,
            dataPoints: {
              salesEvents: reportData.salesBreakdown.byProduct.reduce((sum, p) => sum + p.orders, 0),
              expenses: Object.values(reportData.expenseBreakdown.byCategory).length,
              aggregates: reportData.trends.monthlyTrend.length,
            },
          },
        } as ReportResponse);

      case 'generate_comparison_report':
        // Generate comparison report between two periods
        const {
          currentPeriod,
          previousPeriod,
          includeRealtime: comparisonRealtime = true
        } = reportConfig || {};

        if (!currentPeriod || !previousPeriod) {
          return NextResponse.json(
            {
              success: false,
              metadata: {
                generatedAt: new Date(),
                processingTime: Date.now() - startTime,
                dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
              },
              error: 'Both currentPeriod and previousPeriod are required for comparison reports',
            } as ReportResponse,
            { status: 400 }
          );
        }

        // Generate reports for both periods
        const currentReport = await reportService.generateFinancialReport(
          artisanId,
          new Date(currentPeriod.startDate),
          new Date(currentPeriod.endDate),
          comparisonRealtime
        );

        const previousReport = await reportService.generateFinancialReport(
          artisanId,
          new Date(previousPeriod.startDate),
          new Date(previousPeriod.endDate),
          comparisonRealtime
        );

        // Calculate comparison metrics
        const comparison = {
          current: currentReport,
          previous: previousReport,
          changes: {
            revenueChange: currentReport.summary.totalRevenue - previousReport.summary.totalRevenue,
            revenueChangePercent: previousReport.summary.totalRevenue > 0 
              ? ((currentReport.summary.totalRevenue - previousReport.summary.totalRevenue) / previousReport.summary.totalRevenue) * 100 
              : 0,
            profitChange: currentReport.summary.netProfit - previousReport.summary.netProfit,
            profitChangePercent: previousReport.summary.netProfit !== 0 
              ? ((currentReport.summary.netProfit - previousReport.summary.netProfit) / Math.abs(previousReport.summary.netProfit)) * 100 
              : 0,
            ordersChange: currentReport.summary.totalOrders - previousReport.summary.totalOrders,
            ordersChangePercent: previousReport.summary.totalOrders > 0 
              ? ((currentReport.summary.totalOrders - previousReport.summary.totalOrders) / previousReport.summary.totalOrders) * 100 
              : 0,
          }
        };

        return NextResponse.json({
          success: true,
          data: comparison,
          metadata: {
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: {
              salesEvents: currentReport.salesBreakdown.byProduct.reduce((sum, p) => sum + p.orders, 0) + 
                          previousReport.salesBreakdown.byProduct.reduce((sum, p) => sum + p.orders, 0),
              expenses: Object.values(currentReport.expenseBreakdown.byCategory).length + 
                       Object.values(previousReport.expenseBreakdown.byCategory).length,
              aggregates: currentReport.trends.monthlyTrend.length + previousReport.trends.monthlyTrend.length,
            },
          },
        } as ReportResponse);

      default:
        return NextResponse.json(
          {
            success: false,
            metadata: {
              generatedAt: new Date(),
              processingTime: Date.now() - startTime,
              dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
            },
            error: `Unknown action: ${action}. Supported actions: generate_custom_report, generate_comparison_report`,
          } as ReportResponse,
          { status: 400 }
        );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Financial Reports API POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        metadata: {
          generatedAt: new Date(),
          processingTime,
          dataPoints: { salesEvents: 0, expenses: 0, aggregates: 0 },
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ReportResponse,
      { status: 500 }
    );
  }
}

/**
 * Calculate date range based on period parameter
 */
function calculateDateRange(period: string, startDate?: string, endDate?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let start: Date;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  switch (period) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }

  return {
    startDate: start,
    endDate: now,
  };
}