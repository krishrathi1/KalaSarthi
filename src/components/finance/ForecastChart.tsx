'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Target, AlertCircle, BarChart3 } from 'lucide-react';

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

  useEffect(() => {
    generateForecastData();
  }, [horizon, metric, confidence]);

  const generateForecastData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock forecast data generation
      const data = generateMockForecastData();
      setForecastData(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const generateMockForecastData = (): ForecastDataPoint[] => {
    const data: ForecastDataPoint[] = [];
    const now = new Date();
    
    // Generate historical data (last 30 days)
    for (let i = 30; i >= 1; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const baseValue = getBaseValue(metric);
      const seasonalFactor = 1 + Math.sin((i / 30) * Math.PI * 2) * 0.2;
      const randomFactor = 0.8 + Math.random() * 0.4;
      const value = Math.round(baseValue * seasonalFactor * randomFactor);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: value,
        isHistorical: true
      });
    }

    // Generate forecast data
    const lastHistoricalValue = data[data.length - 1].historical || 0;
    const trendFactor = 1.02; // 2% growth trend
    
    for (let i = 1; i <= horizon; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      const trendValue = lastHistoricalValue * Math.pow(trendFactor, i / 30);
      const seasonalFactor = 1 + Math.sin(((30 + i) / 30) * Math.PI * 2) * 0.2;
      const forecastValue = Math.round(trendValue * seasonalFactor);
      
      // Confidence intervals
      const confidenceMultiplier = getConfidenceMultiplier(confidence);
      const variance = forecastValue * 0.1 * confidenceMultiplier * (i / horizon);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        forecast: forecastValue,
        upperBound: Math.round(forecastValue + variance),
        lowerBound: Math.round(Math.max(0, forecastValue - variance)),
        isHistorical: false
      });
    }

    return data;
  };

  const getBaseValue = (metric: string): number => {
    switch (metric) {
      case 'revenue':
        return 8000;
      case 'orders':
        return 15;
      case 'units':
        return 25;
      default:
        return 8000;
    }
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