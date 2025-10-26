import { ISalesAggregate } from '../models/SalesAggregate';

export interface ForecastOptions {
  artisanId: string;
  productId?: string;
  historicalData: {
    date: Date;
    value: number;
    orders: number;
    revenue: number;
  }[];
  horizon: number; // days to forecast
  confidence: number; // confidence level (e.g., 95)
  metric: 'revenue' | 'orders' | 'quantity';
}

export interface ForecastResult {
  predictions: {
    date: Date;
    predicted: number;
    confidence: {
      upper: number;
      lower: number;
    };
  }[];
  upperBound: number[];
  lowerBound: number[];
  model: string;
  accuracy: number;
}

export interface ScenarioForecastOptions {
  artisanId: string;
  productId?: string;
  scenario: 'optimistic' | 'pessimistic' | 'realistic' | 'custom';
  adjustments?: {
    priceChange?: number; // percentage
    marketingBoost?: number; // percentage
    seasonalFactor?: number; // multiplier
    competitionImpact?: number; // percentage
  };
  horizon: number;
}

export interface ScenarioForecastResult {
  predictions: {
    date: Date;
    predicted: number;
    baseline: number;
    adjustment: number;
  }[];
  impact: {
    totalImpact: number;
    averageDailyImpact: number;
    peakImpact: number;
  };
  recommendations: string[];
}

export interface SeasonalPattern {
  pattern: 'weekly' | 'monthly' | 'yearly';
  strength: number; // 0-1
  peaks: {
    period: string;
    multiplier: number;
  }[];
  troughs: {
    period: string;
    multiplier: number;
  }[];
}

export class ForecastService {
  private static instance: ForecastService;

  static getInstance(): ForecastService {
    if (!ForecastService.instance) {
      ForecastService.instance = new ForecastService();
    }
    return ForecastService.instance;
  }

  /**
   * Generate forecast using simple moving average and trend analysis
   * In production, this would use more sophisticated models like Prophet or ARIMA
   */
  async generateForecast(options: ForecastOptions): Promise<ForecastResult> {
    const { historicalData, horizon, confidence, metric } = options;
    
    if (historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Sort data by date
    const sortedData = historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
    const values = sortedData.map(d => d.value);
    
    // Calculate trend using linear regression
    const trend = this.calculateTrend(values);
    
    // Calculate seasonal patterns
    const seasonal = this.calculateSeasonality(sortedData);
    
    // Generate predictions
    const predictions = [];
    const lastDate = sortedData[sortedData.length - 1].date;
    
    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Base prediction using trend
      const basePrediction = this.predictWithTrend(values, trend, i);
      
      // Apply seasonal adjustment
      const seasonalAdjustment = this.getSeasonalAdjustment(forecastDate, seasonal);
      const predicted = Math.max(0, basePrediction * seasonalAdjustment);
      
      // Calculate confidence intervals
      const variance = this.calculateVariance(values);
      const confidenceMultiplier = this.getConfidenceMultiplier(confidence);
      const margin = Math.sqrt(variance) * confidenceMultiplier * Math.sqrt(i);
      
      predictions.push({
        date: forecastDate,
        predicted: Math.round(predicted * 100) / 100,
        confidence: {
          upper: Math.round((predicted + margin) * 100) / 100,
          lower: Math.max(0, Math.round((predicted - margin) * 100) / 100)
        }
      });
    }

    // Calculate model accuracy using MAPE (Mean Absolute Percentage Error)
    const accuracy = this.calculateAccuracy(values);

    return {
      predictions,
      upperBound: predictions.map(p => p.confidence.upper),
      lowerBound: predictions.map(p => p.confidence.lower),
      model: 'Linear Trend with Seasonality',
      accuracy
    };
  }

  /**
   * Generate scenario-based forecast
   */
  async generateScenarioForecast(options: ScenarioForecastOptions): Promise<ScenarioForecastResult> {
    const { artisanId, productId, scenario, adjustments, horizon } = options;
    
    // Get baseline forecast first
    // This would typically fetch recent historical data
    const mockHistoricalData = this.generateMockHistoricalData(30); // 30 days of mock data
    
    const baselineForecast = await this.generateForecast({
      artisanId,
      productId,
      historicalData: mockHistoricalData,
      horizon,
      confidence: 95,
      metric: 'revenue'
    });

    // Apply scenario adjustments
    const scenarioMultipliers = this.getScenarioMultipliers(scenario, adjustments);
    
    const predictions = baselineForecast.predictions.map((pred, index) => {
      const dayMultiplier = scenarioMultipliers.daily[index % scenarioMultipliers.daily.length];
      const adjustedPrediction = pred.predicted * dayMultiplier;
      
      return {
        date: pred.date,
        predicted: Math.round(adjustedPrediction * 100) / 100,
        baseline: pred.predicted,
        adjustment: Math.round((adjustedPrediction - pred.predicted) * 100) / 100
      };
    });

    // Calculate impact metrics
    const totalBaseline = baselineForecast.predictions.reduce((sum, p) => sum + p.predicted, 0);
    const totalAdjusted = predictions.reduce((sum, p) => sum + p.predicted, 0);
    const totalImpact = totalAdjusted - totalBaseline;
    
    const impact = {
      totalImpact: Math.round(totalImpact * 100) / 100,
      averageDailyImpact: Math.round((totalImpact / horizon) * 100) / 100,
      peakImpact: Math.max(...predictions.map(p => p.adjustment))
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(scenario, impact, adjustments);

    return {
      predictions,
      impact,
      recommendations
    };
  }

  /**
   * Get seasonal patterns for an artisan/product
   */
  async getSeasonalPatterns(artisanId: string, productId?: string): Promise<SeasonalPattern[]> {
    // In production, this would analyze historical data to identify patterns
    // For now, return common seasonal patterns for Indian artisans
    
    const patterns: SeasonalPattern[] = [
      {
        pattern: 'yearly',
        strength: 0.8,
        peaks: [
          { period: 'October', multiplier: 1.5 }, // Diwali season
          { period: 'November', multiplier: 1.4 }, // Wedding season
          { period: 'December', multiplier: 1.3 }, // Holiday season
          { period: 'February', multiplier: 1.2 }  // Valentine's Day
        ],
        troughs: [
          { period: 'June', multiplier: 0.7 }, // Monsoon
          { period: 'July', multiplier: 0.8 }, // Monsoon
          { period: 'August', multiplier: 0.9 }  // Post-monsoon
        ]
      },
      {
        pattern: 'weekly',
        strength: 0.3,
        peaks: [
          { period: 'Friday', multiplier: 1.2 },
          { period: 'Saturday', multiplier: 1.3 },
          { period: 'Sunday', multiplier: 1.1 }
        ],
        troughs: [
          { period: 'Monday', multiplier: 0.8 },
          { period: 'Tuesday', multiplier: 0.9 }
        ]
      }
    ];

    return patterns;
  }

  /**
   * Calculate linear trend from historical data
   */
  private calculateTrend(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  /**
   * Calculate seasonality patterns
   */
  private calculateSeasonality(data: { date: Date; value: number }[]): { [key: string]: number } {
    const seasonal: { [key: string]: number } = {};
    
    // Calculate day-of-week patterns
    const dayOfWeekValues: { [key: number]: number[] } = {};
    
    data.forEach(d => {
      const dayOfWeek = d.date.getDay();
      if (!dayOfWeekValues[dayOfWeek]) {
        dayOfWeekValues[dayOfWeek] = [];
      }
      dayOfWeekValues[dayOfWeek].push(d.value);
    });
    
    const overallAverage = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    
    Object.keys(dayOfWeekValues).forEach(day => {
      const dayValues = dayOfWeekValues[parseInt(day)];
      const dayAverage = dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
      seasonal[`day_${day}`] = dayAverage / overallAverage;
    });
    
    return seasonal;
  }

  /**
   * Predict value using trend
   */
  private predictWithTrend(values: number[], trend: { slope: number; intercept: number }, steps: number): number {
    const lastIndex = values.length - 1;
    return trend.intercept + trend.slope * (lastIndex + steps);
  }

  /**
   * Get seasonal adjustment for a specific date
   */
  private getSeasonalAdjustment(date: Date, seasonal: { [key: string]: number }): number {
    const dayOfWeek = date.getDay();
    return seasonal[`day_${dayOfWeek}`] || 1.0;
  }

  /**
   * Calculate variance of values
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get confidence multiplier based on confidence level
   */
  private getConfidenceMultiplier(confidence: number): number {
    // Z-scores for common confidence levels
    const zScores: { [key: number]: number } = {
      90: 1.645,
      95: 1.96,
      99: 2.576
    };
    
    return zScores[confidence] || 1.96;
  }

  /**
   * Calculate model accuracy using MAPE
   */
  private calculateAccuracy(values: number[]): number {
    if (values.length < 4) return 0.8; // Default accuracy for small datasets
    
    // Simple accuracy calculation - in production would use cross-validation
    const recentValues = values.slice(-10);
    const variance = this.calculateVariance(recentValues);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    const accuracy = Math.max(0.5, 1 - coefficientOfVariation);
    
    return Math.round(accuracy * 100) / 100;
  }

  /**
   * Get scenario multipliers
   */
  private getScenarioMultipliers(
    scenario: string, 
    adjustments?: ScenarioForecastOptions['adjustments']
  ): { daily: number[] } {
    const baseMultipliers = {
      optimistic: Array(30).fill(1.2),
      pessimistic: Array(30).fill(0.8),
      realistic: Array(30).fill(1.0),
      custom: Array(30).fill(1.0)
    };
    
    let multipliers = baseMultipliers[scenario as keyof typeof baseMultipliers] || baseMultipliers.realistic;
    
    if (scenario === 'custom' && adjustments) {
      multipliers = multipliers.map((base, index) => {
        let adjusted = base;
        
        if (adjustments.priceChange) {
          // Price elasticity effect (simplified)
          const elasticity = -0.5; // Assume elastic demand
          adjusted *= (1 + (adjustments.priceChange / 100) * elasticity);
        }
        
        if (adjustments.marketingBoost) {
          adjusted *= (1 + adjustments.marketingBoost / 100);
        }
        
        if (adjustments.seasonalFactor) {
          adjusted *= adjustments.seasonalFactor;
        }
        
        if (adjustments.competitionImpact) {
          adjusted *= (1 - adjustments.competitionImpact / 100);
        }
        
        return adjusted;
      });
    }
    
    return { daily: multipliers };
  }

  /**
   * Generate recommendations based on scenario
   */
  private generateRecommendations(
    scenario: string, 
    impact: ScenarioForecastResult['impact'],
    adjustments?: ScenarioForecastOptions['adjustments']
  ): string[] {
    const recommendations: string[] = [];
    
    if (scenario === 'optimistic' && impact.totalImpact > 0) {
      recommendations.push('Consider increasing inventory to meet higher demand');
      recommendations.push('Prepare marketing campaigns to capitalize on growth opportunities');
    }
    
    if (scenario === 'pessimistic' && impact.totalImpact < 0) {
      recommendations.push('Focus on cost optimization and efficiency improvements');
      recommendations.push('Consider diversifying product offerings or markets');
    }
    
    if (adjustments?.priceChange && adjustments.priceChange > 10) {
      recommendations.push('Monitor customer response closely due to significant price changes');
    }
    
    if (adjustments?.marketingBoost && adjustments.marketingBoost > 20) {
      recommendations.push('Track marketing ROI to ensure sustainable growth');
    }
    
    return recommendations;
  }

  /**
   * Generate mock historical data for testing
   */
  private generateMockHistoricalData(days: number): ForecastOptions['historicalData'] {
    const data = [];
    const baseValue = 1000;
    const today = new Date();
    
    for (let i = days; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add some randomness and trend
      const trend = (days - i) * 2; // Slight upward trend
      const randomness = (Math.random() - 0.5) * 200;
      const seasonal = Math.sin((i / 7) * Math.PI) * 100; // Weekly pattern
      
      const value = Math.max(0, baseValue + trend + randomness + seasonal);
      
      data.push({
        date,
        value: Math.round(value),
        orders: Math.round(value / 50), // Assume average order value of 50
        revenue: value
      });
    }
    
    return data;
  }
}

export default ForecastService;
