'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Target, AlertCircle, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastData {
  date: string;
  historical?: number;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  isHistorical: boolean;
}

interface ForecastMetrics {
  totalForecast: number;
  averageDaily: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  accuracy: number;
}

interface ForecastChartProps {
  artisanId?: string;
  productId?: string;
  horizon?: number; // days to forecast
  metric?: 'revenue' | 'orders' | 'quantity';
  className?: string;
}

const chartConfig = {
  historical: {
    label: 'Historical',
    color: 'hsl(var(--chart-1))',
  },
  predicted: {
    label: 'Forecast',
    color: 'hsl(var(--chart-2))',
  },
  upperBound: {
    label: 'Upper Bound',
    color: 'hsl(var(--chart-3))',
  },
  lowerBound: {
    label: 'Lower Bound',
    color: 'hsl(var(--chart-4))',
  },
};

export function ForecastChart({ 
  artisanId, 
  productId, 
  horizon = 30, 
  metric = 'revenue', 
  className 
}: ForecastChartProps) {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState(horizon);
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [confidence, setConfidence] = useState(95);

  useEffect(() => {
    fetchForecastData();
  }, [artisanId, productId, selectedHorizon, selectedMetric, confidence]);

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct API URL
      const params = new URLSearchParams();
      if (artisanId) params.append('artisanId', artisanId);
      if (productId) params.append('productId', productId);
      params.append('horizon', selectedHorizon.toString());
      params.append('metric', selectedMetric);
      params.append('confidence', confidence.toString());

      const response = await fetch(`/api/finance/forecasts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform API data to chart format
        const transformedData = data.data.forecast?.map((item: any, index: number) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          predicted: item.predicted,
          upperBound: item.confidence.upper,
          lowerBound: item.confidence.lower,
          isHistorical: false,
        })) || [];

        // Add historical data (mock for now)
        const historicalData = generateHistoricalData(14); // 14 days of history
        const combinedData = [...historicalData, ...transformedData];

        setForecastData(combinedData);

        // Calculate metrics
        const totalForecast = transformedData.reduce((sum: number, item: ForecastData) => sum + item.predicted, 0);
        const averageDaily = totalForecast / transformedData.length;
        
        setMetrics({
          totalForecast,
          averageDaily,
          confidence: data.data.confidence?.level || confidence,
          trend: data.data.trend?.direction || 'stable',
          accuracy: data.data.metadata?.accuracy || 0.85,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch forecast data');
      }
    } catch (err) {
      console.error('Error fetching forecast data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Set mock data for development
      const mockData = generateMockForecastData(selectedHorizon, selectedMetric);
      setForecastData(mockData.forecastData);
      setMetrics(mockData.metrics);
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalData = (days: number): ForecastData[] => {
    const data: ForecastData[] = [];
    const baseValue = selectedMetric === 'revenue' ? 1000 : selectedMetric === 'orders' ? 20 : 50;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const value = baseValue + (Math.random() - 0.5) * baseValue * 0.3;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: Math.round(value),
        predicted: 0,
        upperBound: 0,
        lowerBound: 0,
        isHistorical: true,
      });
    }
    
    return data;
  };

  const generateMockForecastData = (days: number, metric: string) => {
    const baseValue = metric === 'revenue' ? 1000 : metric === 'orders' ? 20 : 50;
    const historicalData = generateHistoricalData(14);
    const forecastData: ForecastData[] = [...historicalData];
    
    let totalForecast = 0;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      const trend = 1 + (i * 0.01); // Slight upward trend
      const predicted = Math.round(baseValue * trend + (Math.random() - 0.5) * baseValue * 0.2);
      const margin = predicted * 0.15; // 15% confidence margin
      
      totalForecast += predicted;
      
      forecastData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        predicted,
        upperBound: Math.round(predicted + margin),
        lowerBound: Math.round(Math.max(0, predicted - margin)),
        isHistorical: false,
      });
    }

    return {
      forecastData,
      metrics: {
        totalForecast,
        averageDaily: Math.round(totalForecast / days),
        confidence: 85,
        trend: 'up' as const,
        accuracy: 0.87,
      }
    };
  };

  const formatValue = (value: number) => {
    if (selectedMetric === 'revenue') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 80) return 'text-blue-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>Loading forecast data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayIndex = forecastData.findIndex(item => !item.isHistorical);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedHorizon}-Day Forecast
                  </p>
                  <p className="text-xl font-bold">{formatValue(metrics.totalForecast)}</p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                  <p className="text-xl font-bold">{formatValue(metrics.averageDaily)}</p>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trend</p>
                  <p className="text-xl font-bold capitalize">{metrics.trend}</p>
                </div>
                {getTrendIcon(metrics.trend)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  <p className={cn('text-xl font-bold', getConfidenceColor(metrics.confidence))}>
                    {metrics.confidence}%
                  </p>
                </div>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Forecast
              </CardTitle>
              <CardDescription>
                Historical data and {selectedHorizon}-day forecast with {confidence}% confidence interval
                {error && (
                  <Badge variant="secondary" className="ml-2">
                    Demo Data
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Metric Selector */}
              <div className="flex items-center gap-1">
                {(['revenue', 'orders', 'quantity'] as const).map((m) => (
                  <Button
                    key={m}
                    variant={selectedMetric === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMetric(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Button>
                ))}
              </div>
              
              {/* Horizon Selector */}
              <div className="flex items-center gap-1">
                {([7, 14, 30, 60] as const).map((h) => (
                  <Button
                    key={h}
                    variant={selectedHorizon === h ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedHorizon(h)}
                  >
                    {h}d
                  </Button>
                ))}
              </div>

              {/* Confidence Selector */}
              <div className="flex items-center gap-1">
                {([80, 90, 95, 99] as const).map((c) => (
                  <Button
                    key={c}
                    variant={confidence === c ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfidence(c)}
                  >
                    {c}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && metrics.accuracy < 0.7 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Low forecast accuracy ({(metrics.accuracy * 100).toFixed(0)}%). 
                Consider gathering more historical data for better predictions.
              </AlertDescription>
            </Alert>
          )}
          
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ComposedChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              
              {/* Historical data line */}
              <Line 
                type="monotone" 
                dataKey="historical" 
                stroke="var(--color-historical)" 
                strokeWidth={2}
                dot={{ fill: 'var(--color-historical)', r: 3 }}
                connectNulls={false}
              />
              
              {/* Forecast confidence area */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stackId="confidence"
                stroke="none"
                fill="var(--color-upperBound)"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stackId="confidence"
                stroke="none"
                fill="var(--color-lowerBound)"
                fillOpacity={0.1}
              />
              
              {/* Forecast line */}
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="var(--color-predicted)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'var(--color-predicted)', r: 3 }}
                connectNulls={false}
              />
              
              {/* Today reference line */}
              {todayIndex > 0 && (
                <ReferenceLine 
                  x={forecastData[todayIndex - 1]?.date} 
                  stroke="#666" 
                  strokeDasharray="2 2"
                  label="Today"
                />
              )}
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForecastChart;