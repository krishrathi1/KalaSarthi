import { NextRequest, NextResponse } from 'next/server';
import { SalesAggregate } from '@/lib/models/SalesAggregate';
import { ForecastService } from '@/lib/service/ForecastService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      artisanId, 
      productId, 
      discountPercent, 
      duration = 7, // days
      targetMetric = 'revenue', // revenue, orders, quantity
      priceElasticity = -0.5 // default elasticity
    } = body;

    if (!artisanId || discountPercent === undefined) {
      return NextResponse.json(
        { error: 'artisanId and discountPercent are required' },
        { status: 400 }
      );
    }

    if (discountPercent < 0 || discountPercent > 90) {
      return NextResponse.json(
        { error: 'discountPercent must be between 0 and 90' },
        { status: 400 }
      );
    }

    // Get historical data for baseline
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days for baseline

    const historicalData = await (SalesAggregate as any).findTimeSeries(
      artisanId,
      'daily',
      startDate,
      endDate,
      productId ? { productId } : undefined
    );

    if (historicalData.length < 7) {
      return NextResponse.json(
        { 
          error: 'Insufficient historical data for simulation',
          message: 'At least 7 days of data required'
        },
        { status: 400 }
      );
    }

    // Calculate baseline metrics
    const baseline = calculateBaseline(historicalData, targetMetric);
    
    // Simulate discount impact
    const simulation = simulateDiscountImpact({
      baseline,
      discountPercent,
      duration,
      priceElasticity,
      targetMetric,
      historicalData
    });

    // Calculate financial impact
    const financialImpact = calculateFinancialImpact({
      baseline,
      simulation,
      discountPercent,
      duration
    });

    // Generate recommendations
    const recommendations = generateRecommendations({
      discountPercent,
      simulation,
      financialImpact,
      baseline
    });

    // Calculate risk assessment
    const riskAssessment = assessRisk({
      discountPercent,
      simulation,
      baseline,
      historicalData
    });

    return NextResponse.json({
      success: true,
      data: {
        simulation: {
          baseline: baseline,
          projected: simulation,
          impact: {
            revenueChange: simulation.totalRevenue - baseline.totalRevenue,
            revenueChangePercent: ((simulation.totalRevenue - baseline.totalRevenue) / baseline.totalRevenue) * 100,
            orderChange: simulation.totalOrders - baseline.totalOrders,
            orderChangePercent: ((simulation.totalOrders - baseline.totalOrders) / baseline.totalOrders) * 100,
            marginImpact: financialImpact.marginImpact,
            netProfit: financialImpact.netProfit,
            roi: financialImpact.roi
          }
        },
        recommendations,
        riskAssessment,
        metadata: {
          artisanId,
          productId,
          discountPercent,
          duration,
          targetMetric,
          priceElasticity,
          simulatedAt: new Date().toISOString(),
          dataPoints: historicalData.length
        }
      }
    });

  } catch (error) {
    console.error('Discount simulation API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to simulate discount impact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artisanId = searchParams.get('artisanId');
    const productId = searchParams.get('productId');

    if (!artisanId) {
      return NextResponse.json(
        { error: 'artisanId is required' },
        { status: 400 }
      );
    }

    // Get historical discount performance
    const discountHistory = await getDiscountHistory(artisanId, productId || undefined);
    
    // Get recommended discount ranges
    const recommendations = await getDiscountRecommendations(artisanId, productId || undefined);
    
    // Get price elasticity estimates
    const elasticity = await estimatePriceElasticity(artisanId, productId || undefined);

    return NextResponse.json({
      success: true,
      data: {
        discountHistory,
        recommendations,
        elasticity,
        metadata: {
          artisanId,
          productId,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Discount data API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch discount data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateBaseline(data: any[], metric: string) {
  const recentData = data.slice(-7); // Last 7 days
  
  const totalRevenue = recentData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalOrders = recentData.reduce((sum, d) => sum + d.totalOrders, 0);
  const totalQuantity = recentData.reduce((sum, d) => sum + d.totalQuantity, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    totalQuantity,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    dailyAverage: {
      revenue: Math.round((totalRevenue / recentData.length) * 100) / 100,
      orders: Math.round(totalOrders / recentData.length),
      quantity: Math.round(totalQuantity / recentData.length)
    }
  };
}

function simulateDiscountImpact(options: {
  baseline: any;
  discountPercent: number;
  duration: number;
  priceElasticity: number;
  targetMetric: string;
  historicalData: any[];
}) {
  const { baseline, discountPercent, duration, priceElasticity } = options;
  
  // Calculate demand elasticity effect
  const priceChange = -discountPercent / 100; // Negative because it's a discount
  const demandChange = priceElasticity * priceChange; // Elasticity formula
  
  // Apply demand change to orders
  const projectedOrders = Math.round(baseline.totalOrders * (1 + demandChange));
  
  // Calculate new pricing
  const newAvgOrderValue = baseline.avgOrderValue * (1 - discountPercent / 100);
  
  // Calculate projected revenue
  const projectedRevenue = projectedOrders * newAvgOrderValue;
  
  // Calculate projected quantity (assuming same ratio)
  const projectedQuantity = Math.round(baseline.totalQuantity * (1 + demandChange));
  
  return {
    totalRevenue: Math.round(projectedRevenue * 100) / 100,
    totalOrders: projectedOrders,
    totalQuantity: projectedQuantity,
    avgOrderValue: Math.round(newAvgOrderValue * 100) / 100,
    demandIncrease: Math.round(demandChange * 100 * 100) / 100, // percentage
    dailyProjected: {
      revenue: Math.round((projectedRevenue / duration) * 100) / 100,
      orders: Math.round(projectedOrders / duration),
      quantity: Math.round(projectedQuantity / duration)
    }
  };
}

function calculateFinancialImpact(options: {
  baseline: any;
  simulation: any;
  discountPercent: number;
  duration: number;
}) {
  const { baseline, simulation, discountPercent } = options;
  
  // Assume 30% margin before discount
  const assumedMargin = 0.30;
  const baselineProfit = baseline.totalRevenue * assumedMargin;
  
  // Calculate new margin after discount
  const newMargin = assumedMargin - (discountPercent / 100);
  const projectedProfit = simulation.totalRevenue * Math.max(0, newMargin);
  
  const marginImpact = projectedProfit - baselineProfit;
  const roi = baselineProfit > 0 ? (marginImpact / baselineProfit) * 100 : 0;
  
  return {
    marginImpact: Math.round(marginImpact * 100) / 100,
    netProfit: Math.round(projectedProfit * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    breakEvenOrders: Math.ceil(baselineProfit / (simulation.avgOrderValue * Math.max(0.01, newMargin)))
  };
}

function generateRecommendations(options: {
  discountPercent: number;
  simulation: any;
  financialImpact: any;
  baseline: any;
}) {
  const { discountPercent, simulation, financialImpact, baseline } = options;
  const recommendations = [];
  
  if (financialImpact.roi > 20) {
    recommendations.push('Excellent ROI expected. Consider implementing this discount strategy.');
  } else if (financialImpact.roi > 0) {
    recommendations.push('Positive ROI expected, but monitor closely for actual performance.');
  } else {
    recommendations.push('Negative ROI projected. Consider reducing discount percentage or improving margins.');
  }
  
  if (discountPercent > 30) {
    recommendations.push('High discount percentage may impact brand perception. Consider alternative strategies.');
  }
  
  if (simulation.totalOrders > baseline.totalOrders * 1.5) {
    recommendations.push('Significant order increase expected. Ensure inventory and fulfillment capacity.');
  }
  
  if (financialImpact.marginImpact < 0) {
    recommendations.push('Consider bundling products or upselling to maintain profitability.');
  }
  
  recommendations.push('Monitor customer acquisition vs. existing customer behavior during discount period.');
  recommendations.push('Track post-discount retention rates to measure long-term impact.');
  
  return recommendations;
}

function assessRisk(options: {
  discountPercent: number;
  simulation: any;
  baseline: any;
  historicalData: any[];
}) {
  const { discountPercent, simulation, baseline, historicalData } = options;
  
  let riskScore = 0;
  const risks = [];
  
  // High discount risk
  if (discountPercent > 40) {
    riskScore += 30;
    risks.push('High discount percentage may erode brand value');
  }
  
  // Inventory risk
  const orderIncrease = (simulation.totalOrders - baseline.totalOrders) / baseline.totalOrders;
  if (orderIncrease > 1) {
    riskScore += 25;
    risks.push('Significant order increase may strain inventory and fulfillment');
  }
  
  // Margin risk
  if (discountPercent > 25) {
    riskScore += 20;
    risks.push('Discount may significantly impact profit margins');
  }
  
  // Market volatility risk
  const revenueVariance = calculateVariance(historicalData.map(d => d.totalRevenue));
  const avgRevenue = historicalData.reduce((sum, d) => sum + d.totalRevenue, 0) / historicalData.length;
  const coefficientOfVariation = Math.sqrt(revenueVariance) / avgRevenue;
  
  if (coefficientOfVariation > 0.3) {
    riskScore += 15;
    risks.push('High revenue volatility increases prediction uncertainty');
  }
  
  // Customer behavior risk
  if (orderIncrease > 0.5) {
    riskScore += 10;
    risks.push('Large demand spike may attract price-sensitive customers with low retention');
  }
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore < 20) riskLevel = 'low';
  else if (riskScore < 40) riskLevel = 'medium';
  else if (riskScore < 70) riskLevel = 'high';
  else riskLevel = 'critical';
  
  return {
    riskScore,
    riskLevel,
    risks,
    mitigation: [
      'Start with a smaller discount to test market response',
      'Set clear start and end dates for the discount',
      'Monitor key metrics daily during discount period',
      'Prepare inventory and customer service for increased demand'
    ]
  };
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

async function getDiscountHistory(artisanId: string, productId?: string) {
  // In production, this would query historical discount campaigns
  return {
    campaigns: [
      {
        id: 'discount_001',
        discountPercent: 20,
        duration: 7,
        startDate: '2024-01-15',
        endDate: '2024-01-22',
        results: {
          orderIncrease: 45,
          revenueChange: 12,
          roi: 15.5
        }
      }
    ],
    averagePerformance: {
      orderIncrease: 35, // percentage
      revenueChange: 8,  // percentage
      roi: 12.3
    }
  };
}

async function getDiscountRecommendations(artisanId: string, productId?: string) {
  return {
    optimal: {
      discountPercent: 15,
      expectedOrderIncrease: 25,
      expectedROI: 18.5
    },
    conservative: {
      discountPercent: 10,
      expectedOrderIncrease: 15,
      expectedROI: 22.1
    },
    aggressive: {
      discountPercent: 25,
      expectedOrderIncrease: 40,
      expectedROI: 8.7
    }
  };
}

async function estimatePriceElasticity(artisanId: string, productId?: string) {
  // In production, this would analyze historical price changes and demand response
  return {
    estimated: -0.5, // Default elasticity
    confidence: 0.7,
    category: 'moderately_elastic',
    note: 'Based on similar artisan products. Actual elasticity may vary.'
  };
}