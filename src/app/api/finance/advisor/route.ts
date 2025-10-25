import { NextRequest, NextResponse } from 'next/server';
import { FinanceAdvisorService } from '@/lib/service/FinanceAdvisorService';

interface ToolRequest {
  tool: string;
  parameters: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: ToolRequest = await request.json();
    const { tool, parameters } = body;

    console.log(`🔧 Finance Advisor Tool called: ${tool}`, parameters);

    let result;

    switch (tool) {
      case 'fetch_timeseries':
        result = await FinanceAdvisorService.fetchTimeSeries(parameters);
        break;

      case 'top_products':
        result = await FinanceAdvisorService.getTopProducts(parameters);
        break;

      case 'bottom_products':
        result = await FinanceAdvisorService.getBottomProducts(parameters);
        break;

      case 'forecast_revenue':
        result = await FinanceAdvisorService.forecastRevenue(parameters);
        break;

      case 'detect_anomalies':
        result = await FinanceAdvisorService.detectAnomalies(parameters);
        break;

      case 'simulate_discount':
        result = await FinanceAdvisorService.simulateDiscount(parameters);
        break;

      case 'sales_summary':
        result = await FinanceAdvisorService.getSalesSummary(parameters);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown tool: ${tool}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tool,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Finance Advisor Tool error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get('tool');

    if (!tool) {
      return NextResponse.json({
        success: true,
        availableTools: [
          'fetch_timeseries',
          'top_products',
          'bottom_products',
          'forecast_revenue',
          'detect_anomalies',
          'simulate_discount',
          'sales_summary'
        ],
        timestamp: new Date()
      });
    }

    // For GET requests, return tool schema
    let schema;

    switch (tool) {
      case 'fetch_timeseries':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              artisanId: { type: 'string', description: 'Artisan ID for filtering' },
              productId: { type: 'string', description: 'Product ID for filtering' },
              timeRange: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' }
            },
            required: ['timeRange']
          }
        };
        break;

      case 'top_products':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Product category' },
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
              limit: { type: 'number', description: 'Number of products to return' },
              sortBy: { type: 'string', enum: ['revenue', 'units', 'growth', 'margin'] }
            },
            required: ['timeRange', 'sortBy']
          }
        };
        break;

      case 'bottom_products':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Product category' },
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
              limit: { type: 'number', description: 'Number of products to return' },
              minRevenue: { type: 'number', description: 'Minimum revenue threshold' }
            },
            required: ['timeRange']
          }
        };
        break;

      case 'forecast_revenue':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              artisanId: { type: 'string', description: 'Artisan ID for forecasting' },
              productId: { type: 'string', description: 'Product ID for forecasting' },
              horizon: { type: 'string', enum: ['week', 'month', 'quarter'] },
              confidence: { type: 'number', description: 'Confidence level (0.8-0.95)' }
            },
            required: ['horizon']
          }
        };
        break;

      case 'detect_anomalies':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              artisanId: { type: 'string', description: 'Artisan ID for analysis' },
              metric: { type: 'string', enum: ['revenue', 'units', 'orders', 'margin'] },
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter'] },
              threshold: { type: 'number', description: 'Anomaly detection threshold' }
            },
            required: ['metric', 'timeRange']
          }
        };
        break;

      case 'simulate_discount':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Product ID for simulation' },
              discountPercent: { type: 'number', description: 'Discount percentage (0-100)' },
              expectedVolumeIncrease: { type: 'number', description: 'Expected volume increase percentage' },
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter'] }
            },
            required: ['productId', 'discountPercent']
          }
        };
        break;

      case 'sales_summary':
        schema = {
          parameters: {
            type: 'object',
            properties: {
              artisanId: { type: 'string', description: 'Artisan ID for summary' },
              timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
              includeComparisons: { type: 'boolean', description: 'Include period-over-period comparisons' },
              includeProjections: { type: 'boolean', description: 'Include future projections' }
            },
            required: ['timeRange']
          }
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown tool: ${tool}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tool,
      schema,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Finance Advisor Tool GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
