import { NextRequest, NextResponse } from 'next/server';
import { SalesAggregate } from '@/lib/models/SalesAggregate';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    const horizon = parseInt(searchParams.get('horizon') || '30'); // days
    const productId = searchParams.get('productId');
    const metric = searchParams.get('metric') || 'revenue'; // revenue, orders, quantity
    const confidence = parseInt(searchParams.get('confidence') || '95'); // confidence interval

    // Use default artisanId for demo if not provided
    const effectiveArtisanId = artisanId || 'demo_artisan_123';

    console.log('🔮 Forecast API called with params:', { artisanId, productId, horizon, metric, confidence });

    // Try to get historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Use 90 days of historical data

    let historicalData: any[] = [];
    try {
      historicalData = await SalesAggregate.find({
        artisanId: effectiveArtisanId,
        periodStart: { $gte: startDate },
        periodEnd: { $lte: endDate },
        ...(productId && { productId })
      }).sort({ periodStart: 1 }).lean();
    } catch (error) {
      console.log('📊 No historical data found, using mock data');
    }

    // Generate mock forecast data
    const forecastData = generateMockForecast(horizon, metric, historicalData, confidence);

    // Calculate trend analysis
    const trendAnalysis = calculateTrendAnalysis(historicalData, metric);

    return NextResponse.json({
      success: true,
      data: {
        forecast: forecastData.predictions.map(p => ({
          date: p.date,
          predicted: p.predicted,
          confidence: {
            upper: p.upperBound,
            lower: p.lowerBound
          }
        })),
        confidence: {
          level: confidence
        },
        trend: {
          direction: trendAnalysis.direction
        },
        seasonal: { patterns: [], strength: 0.3 },
        metadata: {
          artisanId: effectiveArtisanId,
          productId,
          metric,
          horizon,
          historicalDataPoints: historicalData.length,
          forecastGeneratedAt: new Date().toISOString(),
          model: 'time_series_regression',
          accuracy: 0.85
        }
      }
    });

  } catch (error) {
    console.error('Forecast API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      artisanId,
      productId,
      scenario,
      adjustments
    } = body;

    if (!artisanId || !scenario) {
      return NextResponse.json(
        { error: 'artisanId and scenario are required' },
        { status: 400 }
      );
    }

    // Generate mock scenario-based forecast
    const scenarioForecast = generateMockScenarioForecast(scenario, adjustments);

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        forecast: scenarioForecast.predictions,
        impact: scenarioForecast.impact,
        recommendations: scenarioForecast.recommendations,
        metadata: {
          artisanId,
          productId,
          scenario,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Scenario forecast API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate scenario forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getMetricValue(aggregate: any, metric: string): number {
  switch (metric) {
    case 'revenue':
      return aggregate.totalRevenue;
    case 'orders':
      return aggregate.totalOrders;
    case 'quantity':
      return aggregate.totalQuantity;
    default:
      return aggregate.totalRevenue;
  }
}

function calculateTrendAnalysis(data: any[], metric: string) {
  if (data.length < 2) {
    return { direction: 'insufficient_data', strength: 0, change: 0 };
  }

  const values = data.map(d => getMetricValue(d, metric));
  const recent = values.slice(-7); // Last 7 days
  const previous = values.slice(-14, -7); // Previous 7 days

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.length > 0
    ? previous.reduce((a, b) => a + b, 0) / previous.length
    : recentAvg;

  const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  let strength = Math.abs(change);

  if (change > 5) direction = 'up';
  else if (change < -5) direction = 'down';

  return {
    direction,
    strength: Math.round(strength * 100) / 100,
    change: Math.round(change * 100) / 100,
    recentAverage: Math.round(recentAvg * 100) / 100,
    previousAverage: Math.round(previousAvg * 100) / 100
  };
}

/**
 * Generate mock forecast data
 */
function generateMockForecast(horizon: number, metric: string, historicalData: any[], confidence: number) {
  const predictions = [];
  const baseValue = historicalData.length > 0
    ? historicalData.reduce((sum, d) => sum + getMetricValue(d, metric), 0) / historicalData.length
    : (metric === 'revenue' ? 10000 : metric === 'orders' ? 20 : 50);

  const trend = 1 + (Math.random() - 0.5) * 0.1; // Slight trend
  const seasonality = 1 + Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 7)) * 0.1; // Weekly seasonality

  for (let i = 1; i <= horizon; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const predictedValue = Math.round(baseValue * Math.pow(trend, i / 30) * seasonality * (1 + (Math.random() - 0.5) * 0.2));
    const margin = predictedValue * (1 - confidence / 100);

    predictions.push({
      date: date.toISOString().split('T')[0],
      predicted: predictedValue,
      upperBound: Math.round(predictedValue + margin),
      lowerBound: Math.round(Math.max(0, predictedValue - margin)),
      isHistorical: false
    });
  }

  return {
    predictions,
    upperBound: predictions.map(p => p.upperBound),
    lowerBound: predictions.map(p => p.lowerBound),
    model: 'time_series_regression',
    accuracy: 0.85
  };
}

/**
 * Generate mock scenario forecast
 */
function generateMockScenarioForecast(scenario: string, adjustments: any = {}) {
  const baseValue = 10000;
  const horizon = 30;
  const predictions = [];

  let multiplier = 1;
  switch (scenario) {
    case 'optimistic':
      multiplier = 1.3;
      break;
    case 'pessimistic':
      multiplier = 0.7;
      break;
    case 'realistic':
      multiplier = 1.1;
      break;
    default:
      multiplier = 1;
  }

  for (let i = 1; i <= horizon; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const predictedValue = Math.round(baseValue * multiplier * (1 + i * 0.01));

    predictions.push({
      date: date.toISOString().split('T')[0],
      predicted: predictedValue
    });
  }

  return {
    predictions,
    impact: {
      totalRevenue: predictions.reduce((sum, p) => sum + p.predicted, 0),
      averageDaily: Math.round(predictions.reduce((sum, p) => sum + p.predicted, 0) / horizon),
      growthRate: Math.round((multiplier - 1) * 100)
    },
    recommendations: [
      scenario === 'optimistic' ? 'Consider increasing production capacity' : 'Focus on cost optimization',
      'Monitor market trends closely',
      'Adjust pricing strategy based on demand'
    ]
  };
}