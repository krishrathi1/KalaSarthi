'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface SalesOverviewProps {
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

interface SalesDataPoint {
  period: string;
  revenue: number;
  orders: number;
  units: number;
  averageOrderValue: number;
}

export default function SalesOverview({ timeRange, className = '' }: SalesOverviewProps) {
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration
      const mockData = generateMockSalesData(timeRange);
      setSalesData(mockData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockSalesData = (range: string): SalesDataPoint[] => {
    const data: SalesDataPoint[] = [];
    const now = new Date();
    
    let periods: string[] = [];
    let baseRevenue = 50000;
    
    switch (range) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        baseRevenue = 8000;
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(date.getDate().toString());
        }
        baseRevenue = 5000;
        break;
      case 'quarter':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
        baseRevenue = 45000;
        break;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        baseRevenue = 120000;
        break;
    }

    periods.forEach((period, index) => {
      const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
      const seasonalFactor = 1 + Math.sin((index / periods.length) * Math.PI * 2) * 0.2;
      const revenue = Math.round(baseRevenue * (1 + variation) * seasonalFactor);
      const orders = Math.round(revenue / (2000 + Math.random() * 1000));
      const units = Math.round(orders * (1.2 + Math.random() * 0.8));
      
      data.push({
        period,
        revenue,
        orders,
        units,
        averageOrderValue: Math.round(revenue / orders)
      });
    });

    return data;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTrend = () => {
    if (salesData.length < 2) return { trend: 'neutral', change: 0 };
    
    const recent = salesData.slice(-3).reduce((sum, item) => sum + item.revenue, 0);
    const previous = salesData.slice(-6, -3).reduce((sum, item) => sum + item.revenue, 0);
    
    if (previous === 0) return { trend: 'neutral', change: 0 };
    
    const change = ((recent - previous) / previous) * 100;
    
    if (change > 5) return { trend: 'up', change };
    if (change < -5) return { trend: 'down', change };
    return { trend: 'neutral', change };
  };

  const trend = calculateTrend();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Loading sales data...</CardDescription>
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
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Error loading data</CardDescription>
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
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>
              Revenue trends for the selected {timeRange}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend.trend === 'up' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{trend.change.toFixed(1)}%
              </Badge>
            )}
            {trend.trend === 'down' && (
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                <TrendingDown className="h-3 w-3 mr-1" />
                {trend.change.toFixed(1)}%
              </Badge>
            )}
            {trend.trend === 'neutral' && (
              <Badge variant="outline">
                <Activity className="h-3 w-3 mr-1" />
                Stable
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SalesDataPoint;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Revenue: {formatCurrency(data.revenue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Orders: {data.orders}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Units: {data.units}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          AOV: {formatCurrency(data.averageOrderValue)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(salesData.reduce((sum, item) => sum + item.revenue, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {salesData.reduce((sum, item) => sum + item.orders, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(
                salesData.reduce((sum, item) => sum + item.revenue, 0) /
                salesData.reduce((sum, item) => sum + item.orders, 0) || 0
              )}
            </p>
            <p className="text-sm text-muted-foreground">Avg Order Value</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}