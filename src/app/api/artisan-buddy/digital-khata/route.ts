/**
 * Artisan Buddy - Digital Khata Integration API
 * 
 * Provides access to Digital Khata financial data through the Artisan Buddy chatbot.
 * Supports sales metrics, financial insights, inventory status, and trend analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { digitalKhataIntegration } from '@/lib/services/artisan-buddy/DigitalKhataIntegration';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    const queryType = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') || 'month';

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: 'artisanId is required' },
        { status: 400 }
      );
    }

    let data;

    switch (queryType) {
      case 'sales':
        data = await digitalKhataIntegration.getSalesMetrics(
          artisanId,
          period as 'week' | 'month' | 'year'
        );
        break;

      case 'financial':
        data = await digitalKhataIntegration.getFinancialInsights(artisanId);
        break;

      case 'inventory':
        data = await digitalKhataIntegration.getInventoryInsights(artisanId);
        break;

      case 'trends':
        data = await digitalKhataIntegration.analyzeSalesTrends(
          artisanId,
          period as 'week' | 'month' | 'year'
        );
        break;

      case 'performance':
        data = await digitalKhataIntegration.getCurrentSalesPerformance(artisanId);
        break;

      case 'summary':
      default:
        const summary = await digitalKhataIntegration.getQuickFinancialSummary(artisanId);
        return NextResponse.json({
          success: true,
          data: { summary },
          timestamp: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      data,
      queryType,
      period,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Digital Khata API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch Digital Khata data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artisanId, action, parameters } = body;

    if (!artisanId) {
      return NextResponse.json(
        { success: false, error: 'artisanId is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'get_insights':
        const insights = await digitalKhataIntegration.getFinancialInsights(artisanId);
        result = {
          insights,
          recommendations: insights.profitability.recommendations,
        };
        break;

      case 'analyze_trends':
        const period = parameters?.period || 'month';
        const trends = await digitalKhataIntegration.analyzeSalesTrends(
          artisanId,
          period as 'week' | 'month' | 'year'
        );
        result = {
          trends: trends.trends,
          insights: trends.insights,
          predictions: trends.predictions,
        };
        break;

      case 'check_inventory':
        const inventory = await digitalKhataIntegration.getInventoryInsights(artisanId);
        result = {
          overview: inventory.overview,
          alerts: inventory.alerts,
          recommendations: inventory.recommendations,
        };
        break;

      case 'get_summary':
        const summary = await digitalKhataIntegration.getQuickFinancialSummary(artisanId);
        result = { summary };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Digital Khata POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process Digital Khata request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
