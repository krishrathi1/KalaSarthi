'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { EnhancedDigitalKhataService } from '@/lib/services/EnhancedDigitalKhataService';
import { useAuth } from '@/context/auth-context';

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
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Map timeRange to API parameters
      const rangeMap = {
        'week': '7d',
        'month': '30d', 
        'quarter': '90d',
        'year': '1y'
      };

      const resolutionMap = {
        'week': 'daily',
        'month': 'daily',
        'quarter': 'weekly', 
        'year': 'monthly'
      };

      const range = rangeMap[timeRange];
      const resolution = resolutionMap[timeRange];

      // Fetch sales data from finance API
      const response = await fetch(`/api/finance/sales?range=${range}&resolution=${resolution}&artisanId=dev_bulchandani_001`);
      const result = await response.json();

      if (result.success && result.data) {
        // Convert API data to chart format
        const chartData: SalesDataPoint[] = result.data.map((item: any) => ({
          period: formatPeriodLabel(item.periodKey, timeRange),
          revenue: item.revenue,
          orders: item.orders,
          units: item.units,
          averageOrderValue: item.averageOrderValue
        }));

        setSalesData(chartData);
      } else {
        throw new Error(result.error || 'Failed to fetch sales data');
      }

    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodLabel = (periodKey: string, timeRange: string): string => {
    const date = new Date(periodKey);
    
    switch (timeRange) {
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'month':
        return date.getDate().toString();
      case 'quarter':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'year':
        return date.toLocaleDateString('en-US', { month: 'short' });
      default:
        return periodKey;
    }
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
      <Card className={`w-full max-w-full ${className}`}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Sales Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Loading sales data...</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="h-64 sm:h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`w-full max-w-full ${className}`}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Sales Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="h-64 sm:h-80 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-full ${className}`}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">Sales Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Revenue trends for the selected {timeRange}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
      <CardContent className="p-4 sm:p-6 pt-0 w-full max-w-full overflow-hidden">
        {/* Enhanced Graph with Better Visual Appeal */}
        <div className="h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-2 sm:p-4 border w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis 
                dataKey="period" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                dy={5}
                interval="preserveStartEnd"
              />
              <YAxis 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SalesDataPoint;
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xl">
                        <p className="font-bold text-gray-900 mb-2">{label}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Revenue:</span>
                            <span className="font-bold text-green-600">{formatCurrency(data.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Orders:</span>
                            <span className="font-medium text-blue-600">{data.orders}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Units:</span>
                            <span className="font-medium text-purple-600">{data.units}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">AOV:</span>
                            <span className="font-medium text-orange-600">{formatCurrency(data.averageOrderValue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fill="url(#revenueGradient)"
                dot={{ 
                  fill: '#3b82f6', 
                  strokeWidth: 3, 
                  r: 5,
                  stroke: '#ffffff'
                }}
                activeDot={{ 
                  r: 8, 
                  stroke: '#3b82f6', 
                  strokeWidth: 3,
                  fill: '#ffffff',
                  filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.3))'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Summary Stats - Positioned Below Graph */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              {trend.trend === 'up' && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  +{trend.change.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-green-900 mb-1">
              {formatCurrency(salesData.reduce((sum, item) => sum + item.revenue, 0))}
            </p>
            <p className="text-sm font-medium text-green-700">Total Revenue</p>
            <p className="text-xs text-green-600 mt-1">
              {timeRange === 'week' ? 'This Week' : 
               timeRange === 'month' ? 'This Month' : 
               timeRange === 'quarter' ? 'This Quarter' : 'This Year'}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {Math.round((salesData.reduce((sum, item) => sum + item.orders, 0) / salesData.length))} avg/period
              </Badge>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">
              {salesData.reduce((sum, item) => sum + item.orders, 0)}
            </p>
            <p className="text-sm font-medium text-blue-700">Total Orders</p>
            <p className="text-xs text-blue-600 mt-1">
              {salesData.reduce((sum, item) => sum + item.units, 0)} units sold
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <Badge variant="outline" className="border-purple-300 text-purple-700">
                AOV
              </Badge>
            </div>
            <p className="text-3xl font-bold text-purple-900 mb-1">
              {formatCurrency(
                salesData.reduce((sum, item) => sum + item.revenue, 0) /
                salesData.reduce((sum, item) => sum + item.orders, 0) || 0
              )}
            </p>
            <p className="text-sm font-medium text-purple-700">Avg Order Value</p>
            <p className="text-xs text-purple-600 mt-1">
              Per transaction
            </p>
          </div>
        </div>
        
        {/* Additional Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-orange-900">
                  {(salesData.reduce((sum, item) => sum + item.units, 0) / 
                    salesData.reduce((sum, item) => sum + item.orders, 0) || 0).toFixed(1)}
                </p>
                <p className="text-sm text-orange-700">Units per Order</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-teal-900">
                  {formatCurrency(
                    salesData.reduce((sum, item) => sum + item.revenue, 0) / 
                    salesData.reduce((sum, item) => sum + item.units, 0) || 0
                  )}
                </p>
                <p className="text-sm text-teal-700">Revenue per Unit</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}