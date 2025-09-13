import { NextRequest, NextResponse } from 'next/server';
import { SalesAggregate } from '@/lib/models/SalesAggregate';
import connectDB from '@/lib/mongodb';
import { SecurityMiddleware } from '@/lib/middleware/security';

interface SalesQueryParams {
  range?: string; // '7d', '30d', '90d', '1y', 'all'
  resolution?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  productId?: string;
  artisanId?: string;
  channel?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

interface SalesResponse {
  success: boolean;
  data: {
    periodKey: string;
    startDate: Date;
    endDate: Date;
    revenue: number;
    units: number;
    orders: number;
    averageOrderValue: number;
    averageUnitPrice: number;
    channelBreakdown?: {
      web: number;
      mobile: number;
      marketplace: number;
      direct: number;
    };
  }[];
  summary: {
    totalRevenue: number;
    totalUnits: number;
    totalOrders: number;
    averageOrderValue: number;
    averageUnitPrice: number;
    growthRate?: number;
  };
  metadata: {
    resolution: string;
    timeRange: string;
    dataPoints: number;
    lastUpdated: Date;
    cacheStatus: 'fresh' | 'cached' | 'stale';
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const params: SalesQueryParams = {
      range: searchParams.get('range') || '30d',
      resolution: (searchParams.get('resolution') as any) || 'daily',
      productId: searchParams.get('productId') || undefined,
      artisanId: searchParams.get('artisanId') || undefined,
      channel: searchParams.get('channel') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    console.log('📊 Finance Sales API called with params:', params);

    // Calculate date range based on range parameter
    const { startDate, endDate } = calculateDateRange(params.range || '30d', params.startDate, params.endDate);

    // Build query filters
    const queryFilters: any = {
      period: params.resolution,
      periodStart: { $gte: startDate },
      periodEnd: { $lte: endDate },
    };

    if (params.productId) queryFilters.productId = params.productId;
    if (params.artisanId) queryFilters.artisanId = params.artisanId;
    if (params.channel) queryFilters.channel = params.channel;
    if (params.category) queryFilters.productCategory = params.category;

    // Fetch sales aggregates
    const aggregates = await SalesAggregate.find(queryFilters)
      .sort({ periodStart: 1 })
      .lean();

    let transformedData: any[];

    if (aggregates.length === 0) {
      // Generate mock data for development/demo purposes
      console.log('📊 No sales aggregates found, generating mock data');
      transformedData = generateMockSalesData(params.range || '30d', params.resolution || 'daily');
    } else {
      // Transform real data for response
      transformedData = aggregates.map(agg => ({
        periodKey: agg.periodKey,
        startDate: agg.periodStart,
        endDate: agg.periodEnd,
        revenue: agg.totalRevenue,
        units: agg.totalQuantity,
        orders: agg.totalOrders,
        averageOrderValue: agg.averageOrderValue,
        averageUnitPrice: agg.totalRevenue / agg.totalQuantity || 0,
        channelBreakdown: {
          web: agg.channelBreakdown?.web || 0,
          mobile: agg.channelBreakdown?.mobile || 0,
          marketplace: agg.channelBreakdown?.marketplace || 0,
          direct: agg.channelBreakdown?.direct || 0,
        },
      }));
    }

    // Calculate summary statistics
    const summary = calculateSummary(transformedData);

    // Calculate growth rate if we have multiple periods
    if (transformedData.length > 1) {
      const firstPeriod = transformedData[0];
      const lastPeriod = transformedData[transformedData.length - 1];
      summary.growthRate = calculateGrowthRate(firstPeriod.revenue, lastPeriod.revenue);
    }

    const response: SalesResponse = {
      success: true,
      data: transformedData,
      summary,
      metadata: {
        resolution: params.resolution!,
        timeRange: params.range!,
        dataPoints: transformedData.length,
        lastUpdated: new Date(),
        cacheStatus: aggregates.length === 0 ? 'stale' : 'fresh',
      },
    };

    console.log(`✅ Finance Sales API: Retrieved ${transformedData.length} data points`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Finance Sales API error:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        summary: {
          totalRevenue: 0,
          totalUnits: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          averageUnitPrice: 0,
        },
        metadata: {
          resolution: 'daily',
          timeRange: '30d',
          dataPoints: 0,
          lastUpdated: new Date(),
          cacheStatus: 'stale',
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as SalesResponse,
      { status: 500 }
    );
  }
}

/**
 * Calculate date range based on range parameter
 */
function calculateDateRange(range: string, startDate?: string, endDate?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let start: Date;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  switch (range) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      start = new Date(0); // Beginning of time
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }

  return {
    startDate: start,
    endDate: now,
  };
}

/**
 * Calculate summary statistics from sales data
 */
function calculateSummary(data: any[]): any {
  const totals = data.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      units: acc.units + item.units,
      orders: acc.orders + item.orders,
    }),
    { revenue: 0, units: 0, orders: 0 }
  );

  return {
    totalRevenue: totals.revenue,
    totalUnits: totals.units,
    totalOrders: totals.orders,
    averageOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0,
    averageUnitPrice: totals.units > 0 ? totals.revenue / totals.units : 0,
  };
}

/**
 * Calculate growth rate between two values
 */
function calculateGrowthRate(initialValue: number, finalValue: number): number {
  if (initialValue === 0) return finalValue > 0 ? 100 : 0;
  return ((finalValue - initialValue) / initialValue) * 100;
}

/**
 * Generate mock sales data for development/demo
 */
function generateMockSalesData(range: string, resolution: string): any[] {
  const now = new Date();
  let days: number;

  switch (range) {
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
    case '1y': days = 365; break;
    default: days = 30;
  }

  const data = [];
  const baseRevenue = 10000;
  const baseOrders = 20;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
    const revenue = Math.round(baseRevenue * (1 + variation));
    const orders = Math.round(baseOrders * (1 + variation));
    const averageOrderValue = Math.round(revenue / orders);

    data.push({
      periodKey: date.toISOString().split('T')[0],
      startDate: new Date(date.setHours(0, 0, 0, 0)),
      endDate: new Date(date.setHours(23, 59, 59, 999)),
      revenue,
      units: orders * 2, // Assume 2 units per order on average
      orders,
      averageOrderValue,
      averageUnitPrice: Math.round(revenue / (orders * 2)),
      channelBreakdown: {
        web: Math.round(revenue * 0.6),
        mobile: Math.round(revenue * 0.25),
        marketplace: Math.round(revenue * 0.1),
        direct: Math.round(revenue * 0.05),
      },
    });
  }

  return data;
}

/**
 * POST method for creating sales events (for testing/backfill)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Finance Sales API POST called with:', body);

    // This endpoint could be used for:
    // - Backfilling historical data
    // - Testing aggregation jobs
    // - Manual data entry

    return NextResponse.json({
      success: true,
      message: 'POST method not implemented yet. Use for backfill operations.',
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('❌ Finance Sales API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
