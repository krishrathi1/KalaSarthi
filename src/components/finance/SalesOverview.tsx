'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  growth?: number;
}

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  aovGrowth: number;
}

interface SalesOverviewProps {
  artisanId?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
  orders: {
    label: 'Orders',
    color: 'hsl(var(--chart-2))',
  },
  averageOrderValue: {
    label: 'Average Order Value',
    color: 'hsl(var(--chart-3))',
  },
};

export function SalesOverview({ artisanId, timeRange = 'month', className }: SalesOverviewProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

  useEffect(() => {
    fetchSalesData();
  }, [artisanId, selectedTimeRange]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct API URL
      const params = new URLSearchParams();
      if (artisanId) params.append('artisanId', artisanId);
      params.append('range', selectedTimeRange);
      params.append('resolution', 'daily');

      const response = await fetch(`/api/finance/sales?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      
      if (data.success) {
        // Transform API data to chart format
        const transformedData = data.data.timeSeries?.map((item: any) => ({
          date: new Date(item.periodStart).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          revenue: item.totalRevenue || 0,
          orders: item.totalOrders || 0,
          averageOrderValue: item.averageOrderValue || 0,
        })) || [];

        setSalesData(transformedData);

        // Calculate metrics
        const totalRevenue = transformedData.reduce((sum: number, item: SalesData) => sum + item.revenue, 0);
        const totalOrders = transformedData.reduce((sum: number, item: SalesData) => sum + item.orders, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setMetrics({
          totalRevenue,
          totalOrders,
          averageOrderValue,
          revenueGrowth: data.data.growth?.revenueGrowth || 0,
          orderGrowth: data.data.growth?.orderGrowth || 0,
          aovGrowth: data.data.growth?.aovGrowth || 0,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch sales data');
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Set mock data for development
      const mockData = generateMockData(selectedTimeRange);
      setSalesData(mockData.salesData);
      setMetrics(mockData.metrics);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (range: string) => {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365;
    const salesData: SalesData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const baseRevenue = 1000 + Math.random() * 2000;
      const orders = Math.floor(5 + Math.random() * 20);
      
      salesData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(baseRevenue),
        orders,
        averageOrderValue: Math.round(baseRevenue / orders),
      });
    }

    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);

    return {
      salesData,
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue: Math.round(totalRevenue / totalOrders),
        revenueGrowth: 12.5,
        orderGrowth: 8.3,
        aovGrowth: 4.2,
      }
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={cn('flex items-center gap-1', isPositive ? 'text-green-600' : 'text-red-600')}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{growth.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: salesData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="var(--color-revenue)" 
              strokeWidth={2}
              dot={{ fill: 'var(--color-revenue)' }}
            />
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" />
          </BarChart>
        );
      
      default:
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="var(--color-revenue)" 
              fill="var(--color-revenue)"
              fillOpacity={0.3}
            />
          </AreaChart>
        );
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Loading sales data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  {formatGrowth(metrics.revenueGrowth)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{metrics.totalOrders.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  {formatGrowth(metrics.orderGrowth)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.averageOrderValue)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {formatGrowth(metrics.aovGrowth)}
                </div>
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
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Sales performance over the selected time period
                {error && (
                  <Badge variant="secondary" className="ml-2">
                    Demo Data
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Time Range Selector */}
              <div className="flex items-center gap-1">
                {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={selectedTimeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeRange(range)}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Button>
                ))}
              </div>
              
              {/* Chart Type Selector */}
              <div className="flex items-center gap-1">
                {(['area', 'line', 'bar'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={chartType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            {renderChart()}
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default SalesOverview;