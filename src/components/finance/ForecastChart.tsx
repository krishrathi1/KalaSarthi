'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Target, AlertCircle, BarChart3 } from 'lucide-react';
import { EnhancedDigitalKhataService } from '@/lib/services/EnhancedDigitalKhataService';
import { useAuth } from '@/context/auth-context';

interface ForecastChartProps {
  horizon: number; // days to forecast
  metric: 'revenue' | 'orders' | 'units';
  className?: string;
}

interface ForecastDataPoint {
  date: string;
  historical?: number;
  forecast?: number;
  upperBound?: number;
  lowerBound?: number;
  isHistorical: boolean;
}

export default function ForecastChart({ horizon, metric, className = '' }: ForecastChartProps) {
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    generateForecastData();
  }, [horizon, metric, confidence]);

  const generateForecastData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch historical sales data from finance API
      const response = await fetch(`/api/finance/sales?range=90d&resolution=daily&artisanId=dev_bulchandani_001`);
      const result = await response.json();

      if (result.success && result.data) {
        // Generate forecast based on real historical data
        const data = generateRealForecastData(result.data);
        setForecastData(data);
      } else {
        throw new Error(result.error || 'Failed to fetch historical data');
      }

    } catch (err) {
      console.error('Error generating forecast:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const generateRealForecastData = (salesData: any[]): ForecastDataPoint[] => {
    const data: ForecastDataPoint[] = [];
    const now = new Date();
    
    // Use last 30 days of real historical data
    const last30Days = salesData.slice(-30);
    
    last30Days.forEach((item, index) => {
      const date = new Date(item.periodKey);
      let value = 0;
      
      switch (metric) {
        case 'revenue':
          value = item.revenue;
          break;
        case 'orders':
          value = item.orders;
          break;
        case 'units':
          value = item.units;
          break;
      }
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: value,
        isHistorical: true
      });
    });

    // Calculate trend from real data
    if (data.length < 7) {
      // Not enough data for meaningful forecast
      return data;
    }

    const recentValues = data.slice(-7).map(d => d.historical || 0);
    const olderValues = data.slice(-14, -7).map(d => d.historical || 0);
    
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;
    
    // Calculate growth rate from real data
    const growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    const dailyGrowthFactor = 1 + (growthRate / 7); // Convert to daily growth
    
    const lastHistoricalValue = data[data.length - 1].historical || recentAvg;
    
    // Generate forecast data based on real trends
    for (let i = 1; i <= horizon; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Apply trend with some seasonal variation based on historical patterns
      const trendValue = lastHistoricalValue * Math.pow(dailyGrowthFactor, i);
      
      // Add weekly seasonality based on historical data
      const dayOfWeek = date.getDay();
      const weeklyPattern = calculateWeeklyPattern(data);
      const seasonalFactor = weeklyPattern[dayOfWeek] || 1;
      
      const forecastValue = Math.round(trendValue * seasonalFactor);
      
      // Confidence intervals based on historical variance
      const historicalVariance = calculateHistoricalVariance(data);
      const confidenceMultiplier = getConfidenceMultiplier(confidence);
      const variance = historicalVariance * confidenceMultiplier * Math.sqrt(i / horizon);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        forecast: Math.max(0, forecastValue),
        upperBound: Math.round(forecastValue + variance),
        lowerBound: Math.round(Math.max(0, forecastValue - variance)),
        isHistorical: false
      });
    }

    return data;
  };

  const calculateWeeklyPattern = (historicalData: ForecastDataPoint[]): number[] => {
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    historicalData.forEach(point => {
      if (point.isHistorical && point.historical !== undefined) {
        const date = new Date(point.date + ', 2024'); // Add year for parsing
        const dayOfWeek = date.getDay();
        dayTotals[dayOfWeek] += point.historical;
        dayCounts[dayOfWeek]++;
      }
    });
    
    const dayAverages = dayTotals.map((total, index) => 
      dayCounts[index] > 0 ? total / dayCounts[index] : 0
    );
    
    const overallAverage = dayAverages.reduce((sum, avg) => sum + avg, 0) / 7;
    
    return dayAverages.map(avg => overallAverage > 0 ? avg / overallAverage : 1);
  };

  const calculateHistoricalVariance = (historicalData: ForecastDataPoint[]): number => {
    const values = historicalData
      .filter(d => d.isHistorical && d.historical !== undefined)
      .map(d => d.historical!);
    
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  };



  const getConfidenceMultiplier = (confidence: string): number => {
    switch (confidence) {
      case 'low':
        return 2.0;
      case 'medium':
        return 1.0;
      case 'high':
        return 0.5;
      default:
        return 1.0;
    }
  };

  const formatValue = (value: number) => {
    switch (metric) {
      case 'revenue':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'orders':
      case 'units':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue':
        return 'Revenue';
      case 'orders':
        return 'Orders';
      case 'units':
        return 'Units';
      default:
        return 'Value';
    }
  };

  const calculateForecastSummary = () => {
    const forecastPoints = forecastData.filter(d => !d.isHistorical);
    const historicalPoints = forecastData.filter(d => d.isHistorical);
    
    if (forecastPoints.length === 0 || historicalPoints.length === 0) {
      return { totalForecast: 0, averageForecast: 0, growth: 0 };
    }

    const totalForecast = forecastPoints.reduce((sum, point) => sum + (point.forecast || 0), 0);
    const averageForecast = totalForecast / forecastPoints.length;
    const averageHistorical = historicalPoints.reduce((sum, point) => sum + (point.historical || 0), 0) / historicalPoints.length;
    const growth = averageHistorical > 0 ? ((averageForecast - averageHistorical) / averageHistorical) * 100 : 0;

    return { totalForecast, averageForecast, growth };
  };

  const summary = calculateForecastSummary();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Forecast Analysis</CardTitle>
          <CardDescription>Generating forecast...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Forecast Analysis</CardTitle>
          <CardDescription>Error generating forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Forecast Analysis</CardTitle>
            <CardDescription>
              {horizon}-day {getMetricLabel().toLowerCase()} forecast with confidence intervals
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={confidence} onValueChange={(value: any) => setConfidence(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Confidence</SelectItem>
                <SelectItem value="medium">Medium Confidence</SelectItem>
                <SelectItem value="low">Low Confidence</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              AI Forecast
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => 
                  metric === 'revenue' ? `₹${(value / 1000).toFixed(0)}k` : value.toString()
                }
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ForecastDataPoint;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        {data.isHistorical ? (
                          <p className="text-sm text-muted-foreground">
                            Historical: {formatValue(data.historical || 0)}
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Forecast: {formatValue(data.forecast || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Range: {formatValue(data.lowerBound || 0)} - {formatValue(data.upperBound || 0)}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* Historical data line */}
              <Line 
                type="monotone" 
                dataKey="historical" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                connectNulls={false}
              />
              
              {/* Forecast line */}
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                connectNulls={false}
              />
              
              {/* Confidence interval upper bound */}
              <Line 
                type="monotone" 
                dataKey="upperBound" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
              />
              
              {/* Confidence interval lower bound */}
              <Line 
                type="monotone" 
                dataKey="lowerBound" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
              />
              
              {/* Reference line to separate historical from forecast */}
              <ReferenceLine 
                x={forecastData.find(d => !d.isHistorical)?.date} 
                stroke="hsl(var(--border))" 
                strokeDasharray="2 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Forecast Total</span>
            </div>
            <p className="text-2xl font-bold">{formatValue(summary.totalForecast)}</p>
            <p className="text-xs text-muted-foreground">Next {horizon} days</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Daily Average</span>
            </div>
            <p className="text-2xl font-bold">{formatValue(summary.averageForecast)}</p>
            <p className="text-xs text-muted-foreground">Projected daily</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${summary.growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm font-medium">Growth Trend</span>
            </div>
            <p className={`text-2xl font-bold ${summary.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.growth >= 0 ? '+' : ''}{summary.growth.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">vs historical avg</p>
          </div>
        </div>

        {/* Confidence Note */}
        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Forecast Confidence: {confidence.charAt(0).toUpperCase() + confidence.slice(1)}</p>
              <p>
                This forecast is based on historical patterns and trends. Actual results may vary due to 
                market conditions, seasonal factors, and other external influences.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}