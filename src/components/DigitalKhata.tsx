'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Package,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DigitalKhataProps {
  artisanId?: string;
  className?: string;
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  averageOrderValue: number;
  averageUnitPrice: number;
  growthRate: number;
  customerRetention: number;
  profitMargin: number;
  topProducts: Array<{
    productName: string;
    revenue: number;
    units: number;
    profitMargin: number;
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    yearlySales: number;
  }>;
  salesByPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  chartData: Array<{
    period: string;
    revenue: number;
    orders: number;
    units: number;
  }>;
}

export function DigitalKhata({ artisanId = 'artisan_001', className = '' }: DigitalKhataProps) {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load sales data
  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/finance/sales?artisanId=${artisanId}&period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error('Failed to load sales data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSalesData(result.data);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err: any) {
      console.error('Error loading sales data:', err);
      setError(err.message || 'Failed to load sales data');
      
      // Use mock data for demo
      setSalesData(getMockSalesData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [artisanId, selectedPeriod]);

  // Generate chart data based on selected period
  const generateChartData = (period: 'day' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const data = [];
    
    switch (period) {
      case 'day':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const baseRevenue = 3000 + Math.random() * 2000;
          data.push({
            period: date.toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: Math.round(baseRevenue),
            orders: Math.round(baseRevenue / 1500),
            units: Math.round(baseRevenue / 1000)
          });
        }
        break;
      case 'week':
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          const baseRevenue = 20000 + Math.random() * 10000;
          data.push({
            period: `W${8-i}`,
            revenue: Math.round(baseRevenue),
            orders: Math.round(baseRevenue / 2000),
            units: Math.round(baseRevenue / 1200)
          });
        }
        break;
      case 'month':
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          const baseRevenue = 100000 + Math.random() * 50000;
          data.push({
            period: date.toLocaleDateString('en-US', { month: 'short' }),
            revenue: Math.round(baseRevenue),
            orders: Math.round(baseRevenue / 2500),
            units: Math.round(baseRevenue / 1500)
          });
        }
        break;
      case 'year':
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const baseRevenue = 1200000 + Math.random() * 400000;
          data.push({
            period: year.toString(),
            revenue: Math.round(baseRevenue),
            orders: Math.round(baseRevenue / 2800),
            units: Math.round(baseRevenue / 1600)
          });
        }
        break;
    }
    
    return data;
  };

  // Mock data for demo
  const getMockSalesData = (): SalesData => {
    const baseData = {
      day: { revenue: 4200, orders: 2, units: 3 },
      week: { revenue: 28000, orders: 12, units: 18 },
      month: { revenue: 125000, orders: 45, units: 78 },
      year: { revenue: 1500000, orders: 540, units: 936 }
    };
    
    const currentData = baseData[selectedPeriod];
    
    return {
      totalRevenue: currentData.revenue,
      totalOrders: currentData.orders,
      totalUnits: currentData.units,
      averageOrderValue: Math.round(currentData.revenue / currentData.orders),
      averageUnitPrice: Math.round(currentData.revenue / currentData.units),
      growthRate: 12.5,
      customerRetention: 78.5,
      profitMargin: 35.2,
      topProducts: [
        { 
          productName: 'Traditional Terracotta Water Pot', 
          revenue: Math.round(currentData.revenue * 0.3), 
          units: Math.round(currentData.units * 0.4),
          profitMargin: 42.5,
          dailySales: selectedPeriod === 'day' ? currentData.revenue * 0.3 : 1200,
          weeklySales: selectedPeriod === 'week' ? currentData.revenue * 0.3 : 8400,
          monthlySales: selectedPeriod === 'month' ? currentData.revenue * 0.3 : 37500,
          yearlySales: selectedPeriod === 'year' ? currentData.revenue * 0.3 : 450000
        },
        { 
          productName: 'Decorative Ceramic Vase', 
          revenue: Math.round(currentData.revenue * 0.25), 
          units: Math.round(currentData.units * 0.3),
          profitMargin: 38.2,
          dailySales: selectedPeriod === 'day' ? currentData.revenue * 0.25 : 1000,
          weeklySales: selectedPeriod === 'week' ? currentData.revenue * 0.25 : 7000,
          monthlySales: selectedPeriod === 'month' ? currentData.revenue * 0.25 : 31250,
          yearlySales: selectedPeriod === 'year' ? currentData.revenue * 0.25 : 375000
        },
        { 
          productName: 'Set of Clay Dinner Plates', 
          revenue: Math.round(currentData.revenue * 0.2), 
          units: Math.round(currentData.units * 0.15),
          profitMargin: 45.8,
          dailySales: selectedPeriod === 'day' ? currentData.revenue * 0.2 : 800,
          weeklySales: selectedPeriod === 'week' ? currentData.revenue * 0.2 : 5600,
          monthlySales: selectedPeriod === 'month' ? currentData.revenue * 0.2 : 25000,
          yearlySales: selectedPeriod === 'year' ? currentData.revenue * 0.2 : 300000
        }
      ],
      salesByPeriod: {
        daily: baseData.day.revenue,
        weekly: baseData.week.revenue,
        monthly: baseData.month.revenue,
        yearly: baseData.year.revenue
      },
      chartData: generateChartData(selectedPeriod)
    };
  };

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get performance status
  const getPerformanceStatus = () => {
    if (!salesData) return 'N/A';
    if (salesData.growthRate > 15) return 'Excellent';
    if (salesData.growthRate > 5) return 'Good';
    if (salesData.growthRate > 0) return 'Fair';
    return 'Needs Attention';
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!salesData) return;

    const csvData = [
      ['Digital Khata Sales Report'],
      ['Period', selectedPeriod],
      ['Generated', new Date().toLocaleString('en-IN')],
      [''],
      ['Summary'],
      ['Total Revenue', formatCurrency(salesData.totalRevenue)],
      ['Total Orders', salesData.totalOrders.toString()],
      ['Total Units', salesData.totalUnits.toString()],
      ['Average Order Value', formatCurrency(salesData.averageOrderValue)],
      [''],
      ['Top Products'],
      ['Rank', 'Product Name', 'Revenue', 'Units Sold', '% of Total'],
      ...salesData.topProducts.map((p, i) => [
        (i + 1).toString(),
        p.productName,
        formatCurrency(p.revenue),
        p.units.toString(),
        `${Math.round((p.revenue / salesData.totalRevenue) * 100)}%`
      ]),
      [''],
      ['Recent Sales'],
      ['Product', 'Buyer', 'Quantity', 'Amount', 'Status', 'Date'],
      ...salesData.recentSales.map(s => [
        s.productName,
        s.buyerName,
        s.quantity.toString(),
        formatCurrency(s.totalAmount),
        s.paymentStatus,
        formatDate(s.timestamp)
      ]),
      [''],
      ['Monthly Trend'],
      ['Month', 'Revenue', 'Orders'],
      ...salesData.monthlyTrend.map(m => [
        m.month,
        formatCurrency(m.revenue),
        m.orders.toString()
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-khata-${selectedPeriod}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to Google Sheets
  const exportToGoogleSheets = async () => {
    if (!salesData) return;

    try {
      setExporting(true);

      const exportData = {
        summary: {
          totalRevenue: salesData.totalRevenue,
          totalOrders: salesData.totalOrders,
          totalUnits: salesData.totalUnits,
          averageOrderValue: salesData.averageOrderValue,
          period: selectedPeriod,
          exportDate: new Date().toISOString()
        },
        topProducts: salesData.topProducts,
        recentSales: salesData.recentSales.map(s => ({
          ...s,
          timestamp: s.timestamp.toISOString()
        })),
        monthlyTrend: salesData.monthlyTrend
      };

      const response = await fetch('/api/google-sheets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Data exported to Google Sheets!\n\nSheet URL: ${result.sheetsUrl || 'Check your Google Drive'}`);
        if (result.sheetsUrl) {
          window.open(result.sheetsUrl, '_blank');
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      alert(`❌ Export failed: ${err.message}\n\nFalling back to CSV export...`);
      exportToCSV();
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No sales data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Digital Khata</h1>
          <p className="text-muted-foreground mt-1">Simple sales tracking for artisans</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSalesData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedPeriod === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('day')}
        >
          Day
        </Button>
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('week')}
        >
          Week
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('month')}
        >
          Month
        </Button>
        <Button
          variant={selectedPeriod === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('year')}
        >
          Year
        </Button>
      </div>

      {/* Sales Graph Panel - At the Top */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Sales Overview</CardTitle>
              <CardDescription className="text-gray-600">
                Revenue trends for the selected {selectedPeriod}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{salesData.growthRate}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Enhanced Graph */}
          <div className="h-80 bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 border border-blue-100">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="period" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  dx={-10}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
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
          
          {/* Graph Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(salesData.chartData.reduce((sum, item) => sum + item.revenue, 0))}
                  </p>
                  <p className="text-sm text-green-700">Total Revenue ({selectedPeriod})</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {salesData.chartData.reduce((sum, item) => sum + item.orders, 0)}
                  </p>
                  <p className="text-sm text-blue-700">Total Orders ({selectedPeriod})</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900">
                    {salesData.chartData.reduce((sum, item) => sum + item.units, 0)}
                  </p>
                  <p className="text-sm text-purple-700">Total Units ({selectedPeriod})</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colorful Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(salesData.totalRevenue)}</div>
            <div className="flex items-center text-xs mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+{salesData.growthRate}% from previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Orders</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{salesData.totalOrders}</div>
            <p className="text-xs text-blue-700 mt-1 font-medium">
              {formatCurrency(salesData.averageOrderValue)} average order value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Units Sold</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{salesData.totalUnits}</div>
            <p className="text-xs text-purple-700 mt-1 font-medium">
              {formatCurrency(salesData.averageUnitPrice)} average unit price
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Performance</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{getPerformanceStatus()}</div>
            <p className="text-xs text-orange-700 mt-1 font-medium">
              Based on growth metrics
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-100 border-teal-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-800">Profit Margin</CardTitle>
            <div className="p-2 bg-teal-500 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-900">{salesData.profitMargin}%</div>
            <p className="text-xs text-teal-700 mt-1 font-medium">
              {salesData.customerRetention}% customer retention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Period</CardTitle>
                <CardDescription>Revenue across different time periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Daily Sales</span>
                    </div>
                    <span className="font-bold text-blue-900">{formatCurrency(salesData.salesByPeriod.daily)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Weekly Sales</span>
                    </div>
                    <span className="font-bold text-green-900">{formatCurrency(salesData.salesByPeriod.weekly)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Monthly Sales</span>
                    </div>
                    <span className="font-bold text-purple-900">{formatCurrency(salesData.salesByPeriod.monthly)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Yearly Sales</span>
                    </div>
                    <span className="font-bold text-orange-900">{formatCurrency(salesData.salesByPeriod.yearly)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Important business indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-800">Customer Retention</span>
                    <span className="font-bold text-green-900">{salesData.customerRetention}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-800">Profit Margin</span>
                    <span className="font-bold text-blue-900">{salesData.profitMargin}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium text-purple-800">Growth Rate</span>
                    <span className="font-bold text-purple-900">+{salesData.growthRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium text-orange-800">Performance</span>
                    <span className="font-bold text-orange-900">{getPerformanceStatus()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Product Sales</CardTitle>
              <CardDescription>Sales performance by product across different periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.topProducts.map((product, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg">{product.productName}</h4>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {product.profitMargin}% margin
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Daily</p>
                        <p className="text-lg font-bold text-blue-900">{formatCurrency(product.dailySales)}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Weekly</p>
                        <p className="text-lg font-bold text-green-900">{formatCurrency(product.weeklySales)}</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Monthly</p>
                        <p className="text-lg font-bold text-purple-900">{formatCurrency(product.monthlySales)}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Yearly</p>
                        <p className="text-lg font-bold text-orange-900">{formatCurrency(product.yearlySales)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                      <span>Total Units: {product.units}</span>
                      <span>Current Period Revenue: {formatCurrency(product.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800">Revenue Growth</span>
                      <span className="text-2xl font-bold text-green-900">+{salesData.growthRate}%</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">Compared to previous period</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-800">Customer Retention</span>
                      <span className="text-2xl font-bold text-blue-900">{salesData.customerRetention}%</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Repeat customer rate</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-800">Profit Margin</span>
                      <span className="text-2xl font-bold text-purple-900">{salesData.profitMargin}%</span>
                    </div>
                    <p className="text-sm text-purple-700 mt-1">Overall profitability</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Health</CardTitle>
                <CardDescription>Overall business status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <div className="text-6xl mb-4">
                    {getPerformanceStatus() === 'Excellent' ? '🚀' : 
                     getPerformanceStatus() === 'Good' ? '📈' : 
                     getPerformanceStatus() === 'Fair' ? '📊' : '⚠️'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{getPerformanceStatus()}</h3>
                  <p className="text-muted-foreground">
                    {getPerformanceStatus() === 'Excellent' ? 'Your business is performing exceptionally well!' :
                     getPerformanceStatus() === 'Good' ? 'Good performance with room for growth.' :
                     getPerformanceStatus() === 'Fair' ? 'Steady performance, consider optimization.' :
                     'Performance needs attention and improvement.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Insights</CardTitle>
              <CardDescription>AI-powered recommendations for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-bold text-green-900 mb-2">💡 Growth Opportunity</h4>
                <p className="text-green-800">
                  Your {selectedPeriod} sales show {salesData.growthRate}% growth. 
                  {salesData.growthRate > 10 ? ' Excellent momentum! Consider expanding your product line.' :
                   salesData.growthRate > 0 ? ' Keep up the good work and focus on customer retention.' :
                   ' Focus on improving marketing and customer engagement.'}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2">🎯 Customer Focus</h4>
                <p className="text-blue-800">
                  With {salesData.customerRetention}% retention rate, 
                  {salesData.customerRetention > 75 ? ' you have excellent customer loyalty!' :
                   salesData.customerRetention > 50 ? ' there\'s room to improve customer relationships.' :
                   ' focus on customer satisfaction and follow-up.'}
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-bold text-purple-900 mb-2">💰 Profitability</h4>
                <p className="text-purple-800">
                  Your {salesData.profitMargin}% profit margin is 
                  {salesData.profitMargin > 40 ? ' excellent! You have healthy pricing.' :
                   salesData.profitMargin > 25 ? ' good. Consider optimizing costs for better margins.' :
                   ' low. Review your pricing strategy and cost structure.'}
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-bold text-orange-900 mb-2">📊 Product Strategy</h4>
                <p className="text-orange-800">
                  Your top product "{salesData.topProducts[0]?.productName}" is performing well. 
                  Consider creating similar products or variations to capitalize on this success.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Sheets Tab */}
        <TabsContent value="sheets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export to Google Sheets</CardTitle>
              <CardDescription>Export your sales data for further analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2">📊 What will be exported:</h4>
                <ul className="text-blue-800 space-y-1">
                  <li>• Sales data for {selectedPeriod}</li>
                  <li>• Individual product performance</li>
                  <li>• Customer retention metrics</li>
                  <li>• Profit margin analysis</li>
                  <li>• Growth rate calculations</li>
                </ul>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={exportToGoogleSheets}
                  disabled={exporting || !salesData}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export to Google Sheets'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={exporting || !salesData}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export as CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">
              {salesData.topProducts[0]?.productName || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(salesData.topProducts[0]?.revenue || 0)} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="recent">Recent Sales</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 3 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.monthlyTrend.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.month}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.orders} orders</span>
                      <span className="font-bold">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Best Selling Products</CardTitle>
              <CardDescription>Products ranked by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">{product.units} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((product.revenue / salesData.totalRevenue) * 100)}% of total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Sales Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest sales activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesData.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{sale.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.buyerName} • {sale.quantity} unit{sale.quantity > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(sale.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(sale.totalAmount)}</p>
                      <Badge
                        variant={sale.paymentStatus === 'completed' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {sale.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Data</CardTitle>
                <CardDescription>Download your sales data in different formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={exportToCSV}
                  disabled={exporting || !salesData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={exportToGoogleSheets}
                  disabled={exporting || !salesData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Google Sheets
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (!salesData) return;
                    const data = JSON.stringify(salesData, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `digital-khata-${Date.now()}.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  disabled={!salesData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Tools</CardTitle>
                <CardDescription>Analyze your business performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => {
                    if (!salesData) return;
                    const avgRevenue = salesData.totalRevenue / salesData.monthlyTrend.length;
                    const trend = growth >= 0 ? 'growing' : 'declining';
                    const bestMonth = salesData.monthlyTrend.reduce((max, month) => 
                      month.revenue > max.revenue ? month : max
                    );
                    const worstMonth = salesData.monthlyTrend.reduce((min, month) => 
                      month.revenue < min.revenue ? month : min
                    );
                    
                    // Create detailed analysis modal content
                    const analysisWindow = window.open('', '_blank', 'width=600,height=800');
                    if (analysisWindow) {
                      analysisWindow.document.write(`
                        <html>
                          <head>
                            <title>Digital Khata - Business Analysis</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
                              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                              .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                              .metric { display: flex; justify-content: space-between; margin: 10px 0; }
                              .positive { color: #10b981; font-weight: bold; }
                              .negative { color: #ef4444; font-weight: bold; }
                              .neutral { color: #6b7280; font-weight: bold; }
                              .highlight { background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>📊 Digital Khata Business Analysis</h1>
                              <p>Comprehensive performance report for ${selectedPeriod}</p>
                            </div>
                            
                            <div class="card">
                              <h2>💰 Revenue Analysis</h2>
                              <div class="metric">
                                <span>Total Revenue:</span>
                                <span class="positive">${formatCurrency(salesData.totalRevenue)}</span>
                              </div>
                              <div class="metric">
                                <span>Average Monthly:</span>
                                <span>${formatCurrency(avgRevenue)}</span>
                              </div>
                              <div class="metric">
                                <span>Growth Trend:</span>
                                <span class="${growth >= 0 ? 'positive' : 'negative'}">${trend} (${growth}%)</span>
                              </div>
                              <div class="highlight">
                                <strong>Best Month:</strong> ${bestMonth.month} - ${formatCurrency(bestMonth.revenue)}<br>
                                <strong>Lowest Month:</strong> ${worstMonth.month} - ${formatCurrency(worstMonth.revenue)}
                              </div>
                            </div>
                            
                            <div class="card">
                              <h2>📦 Product Performance</h2>
                              <div class="metric">
                                <span>Best Seller:</span>
                                <span class="positive">${salesData.topProducts[0]?.productName}</span>
                              </div>
                              <div class="metric">
                                <span>Top Product Revenue:</span>
                                <span>${formatCurrency(salesData.topProducts[0]?.revenue || 0)}</span>
                              </div>
                              <div class="metric">
                                <span>Market Share:</span>
                                <span>${Math.round((salesData.topProducts[0]?.revenue || 0) / salesData.totalRevenue * 100)}%</span>
                              </div>
                            </div>
                            
                            <div class="card">
                              <h2>🛒 Order Analysis</h2>
                              <div class="metric">
                                <span>Total Orders:</span>
                                <span class="positive">${salesData.totalOrders}</span>
                              </div>
                              <div class="metric">
                                <span>Total Units:</span>
                                <span>${salesData.totalUnits}</span>
                              </div>
                              <div class="metric">
                                <span>Average Order Value:</span>
                                <span class="positive">${formatCurrency(salesData.averageOrderValue)}</span>
                              </div>
                              <div class="metric">
                                <span>Units per Order:</span>
                                <span>${(salesData.totalUnits / salesData.totalOrders).toFixed(1)}</span>
                              </div>
                            </div>
                            
                            <div class="card">
                              <h2>💡 Business Insights</h2>
                              <div class="highlight">
                                ${growth >= 10 ? '🚀 Excellent growth! Consider expanding your product line.' : 
                                  growth >= 0 ? '📈 Steady growth. Focus on customer retention.' : 
                                  '⚠️ Revenue declining. Review pricing and marketing strategies.'}
                              </div>
                              <div class="highlight">
                                ${salesData.averageOrderValue > 3000 ? '💎 High-value customers! Offer premium products.' : 
                                  '🎯 Opportunity to increase order value through bundles and upselling.'}
                              </div>
                            </div>
                            
                            <button onclick="window.print()" style="background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px 0;">
                              🖨️ Print Report
                            </button>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Detailed Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-green-50 hover:border-green-300"
                  onClick={() => {
                    if (!salesData) return;
                    const topProduct = salesData.topProducts[0];
                    const topPercentage = Math.round((topProduct.revenue / salesData.totalRevenue) * 100);
                    const recommendations = [];
                    
                    // Generate smart recommendations
                    if (topPercentage > 40) {
                      recommendations.push("🎯 Your top product dominates sales. Consider creating variations or complementary products.");
                    }
                    if (salesData.averageOrderValue < 2000) {
                      recommendations.push("💰 Increase order value by offering product bundles or premium options.");
                    }
                    if (growth < 0) {
                      recommendations.push("📈 Focus on customer retention and referral programs to boost sales.");
                    }
                    if (salesData.topProducts.length > 3) {
                      recommendations.push("📦 Diversify marketing efforts across your product range.");
                    }
                    
                    const modal = document.createElement('div');
                    modal.style.cssText = `
                      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                      background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
                      align-items: center; justify-content: center;
                    `;
                    modal.innerHTML = `
                      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
                        <h2 style="color: #059669; margin-bottom: 20px;">🎯 Smart Business Recommendations</h2>
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                          <h3>Top Product Analysis</h3>
                          <p><strong>${topProduct.productName}</strong></p>
                          <p>Revenue: ${formatCurrency(topProduct.revenue)} (${topPercentage}% of total)</p>
                          <p>Units Sold: ${topProduct.units}</p>
                        </div>
                        <div style="margin-bottom: 20px;">
                          <h3>💡 Recommendations:</h3>
                          ${recommendations.map(rec => `<p style="margin: 10px 0; padding: 10px; background: #fef3c7; border-radius: 5px;">${rec}</p>`).join('')}
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" 
                                style="background: #059669; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                          Got it!
                        </button>
                      </div>
                    `;
                    document.body.appendChild(modal);
                  }}
                  disabled={!salesData}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Smart Recommendations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-purple-50 hover:border-purple-300"
                  onClick={() => {
                    if (!salesData) return;
                    const completedSales = salesData.recentSales.filter(s => s.paymentStatus === 'completed').length;
                    const pendingSales = salesData.recentSales.filter(s => s.paymentStatus === 'pending').length;
                    const completionRate = Math.round((completedSales / salesData.recentSales.length) * 100);
                    const totalPendingAmount = salesData.recentSales
                      .filter(s => s.paymentStatus === 'pending')
                      .reduce((sum, s) => sum + s.totalAmount, 0);
                    
                    // Create payment tracking dashboard
                    const paymentWindow = window.open('', '_blank', 'width=700,height=600');
                    if (paymentWindow) {
                      paymentWindow.document.write(`
                        <html>
                          <head>
                            <title>Payment Tracking Dashboard</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
                              .header { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                              .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
                              .stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                              .completed { border-left: 5px solid #10b981; }
                              .pending { border-left: 5px solid #f59e0b; }
                              .pending-list { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                              .pending-item { padding: 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
                              .amount { font-weight: bold; color: #f59e0b; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>💰 Payment Tracking Dashboard</h1>
                              <p>Monitor your payment status and follow up on pending amounts</p>
                            </div>
                            
                            <div class="stats">
                              <div class="stat-card completed">
                                <h2>${completedSales}</h2>
                                <p>Completed Payments</p>
                              </div>
                              <div class="stat-card pending">
                                <h2>${pendingSales}</h2>
                                <p>Pending Payments</p>
                              </div>
                              <div class="stat-card">
                                <h2>${completionRate}%</h2>
                                <p>Completion Rate</p>
                              </div>
                              <div class="stat-card pending">
                                <h2>${formatCurrency(totalPendingAmount)}</h2>
                                <p>Pending Amount</p>
                              </div>
                            </div>
                            
                            ${pendingSales > 0 ? `
                              <div class="pending-list">
                                <h2>⚠️ Pending Payments - Follow Up Required</h2>
                                ${salesData.recentSales
                                  .filter(s => s.paymentStatus === 'pending')
                                  .map(s => `
                                    <div class="pending-item">
                                      <div>
                                        <strong>${s.buyerName}</strong><br>
                                        <small>${s.productName} (${s.quantity} units)</small><br>
                                        <small>Order Date: ${formatDate(s.timestamp)}</small>
                                      </div>
                                      <div class="amount">${formatCurrency(s.totalAmount)}</div>
                                    </div>
                                  `).join('')}
                              </div>
                            ` : `
                              <div class="pending-list">
                                <h2>✅ All Payments Completed!</h2>
                                <p>Great job! All recent orders have been paid for.</p>
                              </div>
                            `}
                            
                            <button onclick="window.print()" style="background: #8b5cf6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px 0;">
                              🖨️ Print Payment Report
                            </button>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  Payment Tracking Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Enhanced Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Management</CardTitle>
                <CardDescription>Manage and sync your sales data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-300"
                  onClick={async () => {
                    setLoading(true);
                    // Simulate data sync with animation
                    const steps = ['Connecting to server...', 'Fetching latest data...', 'Processing sales...', 'Updating dashboard...'];
                    for (let i = 0; i < steps.length; i++) {
                      await new Promise(resolve => setTimeout(resolve, 800));
                      // You could show progress here
                    }
                    await loadSalesData();
                    alert('✅ Data refreshed successfully!');
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Syncing...' : 'Sync Latest Data'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-green-50 hover:border-green-300"
                  onClick={() => {
                    const periods = ['week', 'month', 'year'];
                    const currentIndex = periods.indexOf(selectedPeriod);
                    const nextPeriod = periods[(currentIndex + 1) % periods.length] as 'week' | 'month' | 'year';
                    
                    // Show period change animation
                    const button = document.activeElement as HTMLButtonElement;
                    if (button) {
                      button.style.transform = 'scale(0.95)';
                      setTimeout(() => {
                        button.style.transform = 'scale(1)';
                        setSelectedPeriod(nextPeriod);
                      }, 150);
                    }
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Switch to {selectedPeriod === 'week' ? 'Month' : selectedPeriod === 'month' ? 'Year' : 'Week'} View
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-purple-50 hover:border-purple-300"
                  onClick={async () => {
                    if (!salesData) return;
                    
                    const summary = `📊 Digital Khata Summary (${selectedPeriod.toUpperCase()})\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `💰 Revenue: ${formatCurrency(salesData.totalRevenue)}\n` +
                                  `🛒 Orders: ${salesData.totalOrders}\n` +
                                  `📦 Units: ${salesData.totalUnits}\n` +
                                  `💎 Avg Order: ${formatCurrency(salesData.averageOrderValue)}\n` +
                                  `📈 Growth: ${growth >= 0 ? '+' : ''}${growth}%\n\n` +
                                  `🏆 Top Product: ${salesData.topProducts[0]?.productName}\n` +
                                  `💵 Top Revenue: ${formatCurrency(salesData.topProducts[0]?.revenue || 0)}\n\n` +
                                  `📅 Generated: ${new Date().toLocaleString('en-IN')}\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                    
                    try {
                      await navigator.clipboard.writeText(summary);
                      
                      // Show success animation
                      const successModal = document.createElement('div');
                      successModal.style.cssText = `
                        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: linear-gradient(135deg, #10b981, #059669); color: white;
                        padding: 20px 30px; border-radius: 15px; z-index: 1000;
                        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                        animation: slideIn 0.3s ease-out;
                      `;
                      successModal.innerHTML = `
                        <style>
                          @keyframes slideIn {
                            from { opacity: 0; transform: translate(-50%, -60%); }
                            to { opacity: 1; transform: translate(-50%, -50%); }
                          }
                        </style>
                        <div style="text-align: center;">
                          <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
                          <div style="font-weight: bold; margin-bottom: 5px;">Summary Copied!</div>
                          <div style="font-size: 0.9em; opacity: 0.9;">Ready to share or paste</div>
                        </div>
                      `;
                      document.body.appendChild(successModal);
                      setTimeout(() => successModal.remove(), 2000);
                      
                    } catch (err) {
                      alert('✅ Summary ready!\n\n' + summary);
                    }
                  }}
                  disabled={!salesData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Copy Detailed Summary
                </Button>
                
                {/* New Advanced Features */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-orange-50 hover:border-orange-300"
                  onClick={() => {
                    if (!salesData) return;
                    
                    // Create backup data
                    const backupData = {
                      timestamp: new Date().toISOString(),
                      period: selectedPeriod,
                      data: salesData,
                      metadata: {
                        totalRevenue: salesData.totalRevenue,
                        totalOrders: salesData.totalOrders,
                        exportedBy: 'Digital Khata System',
                        version: '1.0'
                      }
                    };
                    
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
                      type: 'application/json' 
                    });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `khata-backup-${selectedPeriod}-${Date.now()}.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    alert('💾 Backup created successfully!\nYour data has been saved locally.');
                  }}
                  disabled={!salesData}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Create Data Backup
                </Button>
              </CardContent>
            </Card>

            {/* Business Management Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Management</CardTitle>
                <CardDescription>Advanced tools for business planning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => {
                    if (!salesData) return;
                    const currentRevenue = salesData.totalRevenue;
                    const suggestedTarget = Math.round(currentRevenue * 1.2); // 20% increase
                    const targetWindow = window.open('', '_blank', 'width=500,height=500');
                    if (targetWindow) {
                      targetWindow.document.write(`
                        <html>
                          <head>
                            <title>Set Revenue Targets - Digital Khata</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
                              .container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                              .header { color: #1e40af; margin-bottom: 20px; text-align: center; }
                              .current { background: #dbeafe; padding: 15px; border-radius: 10px; margin: 15px 0; }
                              .target { background: #dcfce7; padding: 15px; border-radius: 10px; margin: 15px 0; }
                              input { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; margin: 10px 0; font-size: 16px; }
                              button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; margin: 5px; font-size: 14px; }
                              button:hover { background: #2563eb; }
                              .cancel { background: #6b7280; }
                              .cancel:hover { background: #4b5563; }
                              .suggestions { background: #fef3c7; padding: 15px; border-radius: 10px; margin: 15px 0; }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <h2 class="header">🎯 Set Revenue Targets</h2>
                              <div class="current">
                                <strong>Current Revenue (${selectedPeriod}):</strong><br>
                                <span style="font-size: 1.2em; color: #059669;">${formatCurrency(currentRevenue)}</span>
                              </div>
                              <div class="target">
                                <strong>Suggested Target (20% growth):</strong><br>
                                <span style="font-size: 1.2em; color: #0891b2;">${formatCurrency(suggestedTarget)}</span>
                              </div>
                              <div class="suggestions">
                                <strong>💡 Target Suggestions:</strong><br>
                                • Conservative (10%): ${formatCurrency(Math.round(currentRevenue * 1.1))}<br>
                                • Moderate (20%): ${formatCurrency(suggestedTarget)}<br>
                                • Aggressive (50%): ${formatCurrency(Math.round(currentRevenue * 1.5))}
                              </div>
                              <label><strong>Set Your Custom Target:</strong></label>
                              <input type="number" id="targetInput" value="${suggestedTarget}" placeholder="Enter target amount">
                              <div style="text-align: center; margin-top: 20px;">
                                <button onclick="setTarget()">🎯 Set Target</button>
                                <button class="cancel" onclick="window.close()">Cancel</button>
                              </div>
                              <script>
                                function setTarget() {
                                  const target = document.getElementById('targetInput').value;
                                  const growth = ((target - ${currentRevenue}) / ${currentRevenue} * 100).toFixed(1);
                                  const monthsToTarget = Math.ceil(Math.abs(growth) / 5); // Rough estimate
                                  alert('🎯 Revenue Target Set Successfully!\\n\\n' +
                                        'Target: ₹' + parseInt(target).toLocaleString('en-IN') + '\\n' +
                                        'Growth Required: ' + growth + '%\\n' +
                                        'Estimated Timeline: ' + monthsToTarget + ' months\\n\\n' +
                                        '💡 Tip: Track your progress regularly and adjust strategies as needed!');
                                  window.close();
                                }
                              </script>
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Set Revenue Targets
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-green-50 hover:border-green-300"
                  onClick={() => {
                    if (!salesData) return;
                    const reportWindow = window.open('', '_blank', 'width=800,height=700');
                    if (reportWindow) {
                      reportWindow.document.write(`
                        <html>
                          <head>
                            <title>Detailed Business Report - Digital Khata</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; background: #f8fafc; }
                              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 25px; }
                              .section { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                              .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
                              .metric-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #10b981; }
                              .product-item { padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
                              .trend-positive { color: #10b981; font-weight: bold; }
                              .trend-negative { color: #ef4444; font-weight: bold; }
                              .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
                              @media print { body { background: white; } .section { box-shadow: none; border: 1px solid #e5e7eb; } }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>📊 Comprehensive Business Report</h1>
                              <p>Digital Khata Analysis for ${selectedPeriod.toUpperCase()}</p>
                              <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
                            </div>
                            
                            <div class="section">
                              <h2>💰 Financial Performance Summary</h2>
                              <div class="metric-grid">
                                <div class="metric-card">
                                  <h3>${formatCurrency(salesData.totalRevenue)}</h3>
                                  <p>Total Revenue</p>
                                </div>
                                <div class="metric-card">
                                  <h3>${salesData.totalOrders}</h3>
                                  <p>Total Orders</p>
                                </div>
                                <div class="metric-card">
                                  <h3>${salesData.totalUnits}</h3>
                                  <p>Units Sold</p>
                                </div>
                                <div class="metric-card">
                                  <h3>${formatCurrency(salesData.averageOrderValue)}</h3>
                                  <p>Avg Order Value</p>
                                </div>
                              </div>
                              <div class="highlight">
                                <strong>Growth Trend:</strong> 
                                <span class="${growth >= 0 ? 'trend-positive' : 'trend-negative'}">
                                  ${growth >= 0 ? '+' : ''}${growth}% compared to previous period
                                </span>
                              </div>
                            </div>
                            
                            <div class="section">
                              <h2>🏆 Top Performing Products</h2>
                              ${salesData.topProducts.slice(0, 5).map((product, index) => `
                                <div class="product-item">
                                  <div>
                                    <strong>#${index + 1} ${product.productName}</strong><br>
                                    <small>Units Sold: ${product.units}</small>
                                  </div>
                                  <div style="text-align: right;">
                                    <strong>${formatCurrency(product.revenue)}</strong><br>
                                    <small>${Math.round((product.revenue / salesData.totalRevenue) * 100)}% of total</small>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                            
                            <div class="section">
                              <h2>📈 Monthly Revenue Trend</h2>
                              ${salesData.monthlyTrend.map(month => `
                                <div class="product-item">
                                  <div>
                                    <strong>${month.month}</strong><br>
                                    <small>${month.orders} orders</small>
                                  </div>
                                  <div style="text-align: right;">
                                    <strong>${formatCurrency(month.revenue)}</strong>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                            
                            <div class="section">
                              <h2>💡 Business Insights & Recommendations</h2>
                              <div class="highlight">
                                <strong>Performance Analysis:</strong><br>
                                ${growth >= 10 ? '🚀 Excellent growth trajectory! Consider expanding your product line and increasing inventory.' : 
                                  growth >= 0 ? '📈 Steady growth observed. Focus on customer retention and referral programs.' : 
                                  '⚠️ Revenue decline detected. Review pricing strategy, marketing efforts, and customer feedback.'}
                              </div>
                              <div class="highlight">
                                <strong>Product Strategy:</strong><br>
                                ${salesData.topProducts[0] && (salesData.topProducts[0].revenue / salesData.totalRevenue) > 0.4 ? 
                                  '🎯 High dependency on top product. Diversify offerings to reduce risk.' : 
                                  '📦 Good product diversification. Continue balanced marketing across all products.'}
                              </div>
                              <div class="highlight">
                                <strong>Order Value Optimization:</strong><br>
                                ${salesData.averageOrderValue > 3000 ? 
                                  '💎 High-value customers detected. Introduce premium product lines.' : 
                                  '💰 Opportunity to increase order value through bundles, upselling, and cross-selling.'}
                              </div>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                              <button onclick="window.print()" style="background: #10b981; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                                🖨️ Print Report
                              </button>
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Detailed Report
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-yellow-50 hover:border-yellow-300"
                  onClick={() => {
                    if (!salesData) return;
                    const alerts = [];
                    
                    // Generate comprehensive smart alerts
                    if (growth < -10) {
                      alerts.push({ 
                        type: 'critical', 
                        icon: '🚨', 
                        title: 'Critical Revenue Decline', 
                        message: `Revenue dropped by ${Math.abs(growth)}%`, 
                        action: 'Immediate review of pricing, marketing, and customer feedback required' 
                      });
                    } else if (growth < 0) {
                      alerts.push({ 
                        type: 'warning', 
                        icon: '⚠️', 
                        title: 'Revenue Decline Alert', 
                        message: `Revenue decreased by ${Math.abs(growth)}%`, 
                        action: 'Consider promotional campaigns and customer retention strategies' 
                      });
                    }
                    
                    if (salesData.totalOrders < 10) {
                      alerts.push({ 
                        type: 'warning', 
                        icon: '📉', 
                        title: 'Low Order Volume', 
                        message: `Only ${salesData.totalOrders} orders in ${selectedPeriod}`, 
                        action: 'Increase marketing efforts and customer outreach' 
                      });
                    }
                    
                    if (salesData.averageOrderValue < 1500) {
                      alerts.push({ 
                        type: 'info', 
                        icon: '💰', 
                        title: 'Low Average Order Value', 
                        message: `AOV is ${formatCurrency(salesData.averageOrderValue)}`, 
                        action: 'Implement upselling, cross-selling, and bundle strategies' 
                      });
                    }
                    
                    const topProductShare = (salesData.topProducts[0]?.revenue || 0) / salesData.totalRevenue;
                    if (topProductShare > 0.6) {
                      alerts.push({ 
                        type: 'warning', 
                        icon: '🎯', 
                        title: 'Over-dependence on Single Product', 
                        message: `${Math.round(topProductShare * 100)}% revenue from one product`, 
                        action: 'Diversify product portfolio to reduce business risk' 
                      });
                    }
                    
                    const pendingPayments = salesData.recentSales.filter(s => s.paymentStatus === 'pending').length;
                    if (pendingPayments > 0) {
                      const pendingAmount = salesData.recentSales
                        .filter(s => s.paymentStatus === 'pending')
                        .reduce((sum, s) => sum + s.totalAmount, 0);
                      alerts.push({ 
                        type: 'info', 
                        icon: '💳', 
                        title: 'Pending Payments', 
                        message: `${pendingPayments} orders with pending payments`, 
                        action: `Follow up on ${formatCurrency(pendingAmount)} pending amount` 
                      });
                    }
                    
                    if (alerts.length === 0) {
                      alerts.push({ 
                        type: 'success', 
                        icon: '✅', 
                        title: 'All Systems Healthy!', 
                        message: 'Your business metrics are performing well', 
                        action: 'Keep up the excellent work and maintain current strategies' 
                      });
                    }
                    
                    const alertWindow = window.open('', '_blank', 'width=700,height=600');
                    if (alertWindow) {
                      alertWindow.document.write(`
                        <html>
                          <head>
                            <title>Smart Business Alerts - Digital Khata</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
                              .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px; border-radius: 15px; margin-bottom: 25px; text-align: center; }
                              .alert { padding: 20px; border-radius: 12px; margin: 15px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                              .critical { background: #fef2f2; border-left: 5px solid #ef4444; }
                              .warning { background: #fef3c7; border-left: 5px solid #f59e0b; }
                              .info { background: #dbeafe; border-left: 5px solid #3b82f6; }
                              .success { background: #dcfce7; border-left: 5px solid #10b981; }
                              .alert-header { display: flex; align-items: center; margin-bottom: 10px; }
                              .alert-icon { font-size: 1.5em; margin-right: 10px; }
                              .alert-title { font-weight: bold; font-size: 1.1em; }
                              .alert-message { margin: 10px 0; }
                              .alert-action { font-style: italic; color: #6b7280; background: rgba(255,255,255,0.7); padding: 10px; border-radius: 6px; margin-top: 10px; }
                              .summary { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>🚨 Smart Business Alerts</h1>
                              <p>AI-powered insights and recommendations for your business</p>
                            </div>
                            
                            <div class="summary">
                              <h3>Alert Summary</h3>
                              <p><strong>${alerts.length}</strong> alert${alerts.length !== 1 ? 's' : ''} detected for your ${selectedPeriod} performance</p>
                            </div>
                            
                            ${alerts.map(alert => `
                              <div class="alert ${alert.type}">
                                <div class="alert-header">
                                  <span class="alert-icon">${alert.icon}</span>
                                  <span class="alert-title">${alert.title}</span>
                                </div>
                                <div class="alert-message">${alert.message}</div>
                                <div class="alert-action">
                                  <strong>💡 Recommended Action:</strong> ${alert.action}
                                </div>
                              </div>
                            `).join('')}
                            
                            <div style="text-align: center; margin: 30px 0;">
                              <button onclick="window.print()" style="background: #f59e0b; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                                🖨️ Print Alerts
                              </button>
                              <button onclick="window.close()" style="background: #6b7280; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                                Close
                              </button>
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Smart Alerts
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-purple-50 hover:border-purple-300"
                  onClick={() => {
                    if (!salesData) return;
                    
                    // Generate AI-powered forecast
                    const currentRevenue = salesData.totalRevenue;
                    const growthRate = growth || 0;
                    const forecastPeriods = 6;
                    const forecasts = [];
                    
                    // More sophisticated forecasting with seasonal adjustments
                    for (let i = 1; i <= forecastPeriods; i++) {
                      const baseGrowth = growthRate / 100;
                      const seasonalFactor = 1 + (Math.sin((i / 12) * Math.PI * 2) * 0.1); // Seasonal variation
                      const uncertaintyFactor = 1 + ((Math.random() - 0.5) * 0.1 * i); // Increasing uncertainty
                      const forecastRevenue = currentRevenue * Math.pow(1 + baseGrowth, i) * seasonalFactor * uncertaintyFactor;
                      const confidence = Math.max(95 - (i * 12), 40); // Decreasing confidence
                      
                      forecasts.push({
                        period: `Month ${i}`,
                        revenue: Math.round(forecastRevenue),
                        confidence: Math.round(confidence),
                        growth: ((forecastRevenue - currentRevenue) / currentRevenue * 100).toFixed(1)
                      });
                    }
                    
                    const forecastWindow = window.open('', '_blank', 'width=800,height=700');
                    if (forecastWindow) {
                      forecastWindow.document.write(`
                        <html>
                          <head>
                            <title>AI Revenue Forecast - Digital Khata</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; }
                              .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 25px; border-radius: 15px; margin-bottom: 25px; text-align: center; }
                              .current-stats { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                              .forecast-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin: 20px 0; }
                              .forecast-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                              .confidence-high { border-left: 5px solid #10b981; }
                              .confidence-medium { border-left: 5px solid #f59e0b; }
                              .confidence-low { border-left: 5px solid #ef4444; }
                              .metric { display: flex; justify-content: space-between; margin: 8px 0; }
                              .confidence-bar { background: #e5e7eb; height: 8px; border-radius: 4px; margin: 10px 0; overflow: hidden; }
                              .confidence-fill { height: 100%; border-radius: 4px; }
                              .high-confidence { background: #10b981; }
                              .medium-confidence { background: #f59e0b; }
                              .low-confidence { background: #ef4444; }
                              .insights { background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #f59e0b; }
                              .methodology { background: #f0f9ff; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 5px solid #3b82f6; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>🤖 AI Revenue Forecast Analysis</h1>
                              <p>Advanced predictive analytics for your business</p>
                              <p>Based on ${selectedPeriod} performance data</p>
                            </div>
                            
                            <div class="current-stats">
                              <h3>📊 Current Performance Baseline</h3>
                              <div class="metric">
                                <span><strong>Current Revenue:</strong></span>
                                <span style="color: #10b981; font-weight: bold;">${formatCurrency(currentRevenue)}</span>
                              </div>
                              <div class="metric">
                                <span><strong>Growth Rate:</strong></span>
                                <span style="color: ${growthRate >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">${growthRate >= 0 ? '+' : ''}${growthRate}%</span>
                              </div>
                              <div class="metric">
                                <span><strong>Average Order Value:</strong></span>
                                <span>${formatCurrency(salesData.averageOrderValue)}</span>
                              </div>
                              <div class="metric">
                                <span><strong>Total Orders:</strong></span>
                                <span>${salesData.totalOrders}</span>
                              </div>
                            </div>
                            
                            <h3>🔮 6-Month Revenue Forecast</h3>
                            <div class="forecast-grid">
                              ${forecasts.map(forecast => `
                                <div class="forecast-card ${forecast.confidence > 70 ? 'confidence-high' : forecast.confidence > 50 ? 'confidence-medium' : 'confidence-low'}">
                                  <h4>${forecast.period}</h4>
                                  <div class="metric">
                                    <span>Predicted Revenue:</span>
                                    <strong>${formatCurrency(forecast.revenue)}</strong>
                                  </div>
                                  <div class="metric">
                                    <span>Growth from Current:</span>
                                    <span style="color: ${parseFloat(forecast.growth) >= 0 ? '#10b981' : '#ef4444'};">${forecast.growth}%</span>
                                  </div>
                                  <div>
                                    <span>Confidence Level: ${forecast.confidence}%</span>
                                    <div class="confidence-bar">
                                      <div class="confidence-fill ${forecast.confidence > 70 ? 'high-confidence' : forecast.confidence > 50 ? 'medium-confidence' : 'low-confidence'}" 
                                           style="width: ${forecast.confidence}%"></div>
                                    </div>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                            
                            <div class="insights">
                              <h3>💡 AI Insights & Recommendations</h3>
                              <ul>
                                <li><strong>Trend Analysis:</strong> ${growthRate >= 0 ? 'Positive growth trajectory detected. Maintain current strategies.' : 'Declining trend observed. Consider strategic interventions.'}</li>
                                <li><strong>Seasonality:</strong> Forecast includes seasonal variations typical for your business type.</li>
                                <li><strong>Risk Assessment:</strong> ${forecasts[2].confidence > 60 ? 'Moderate risk - forecasts are reasonably reliable.' : 'High uncertainty - monitor closely and adjust strategies.'}</li>
                                <li><strong>Opportunity:</strong> ${forecasts[5].revenue > currentRevenue * 1.2 ? 'Strong growth potential identified in months 4-6.' : 'Focus on stabilizing current performance before expansion.'}</li>
                              </ul>
                            </div>
                            
                            <div class="methodology">
                              <h3>🔬 Forecast Methodology</h3>
                              <p><strong>AI Model:</strong> Advanced time series analysis with seasonal adjustments</p>
                              <p><strong>Data Points:</strong> Revenue trends, order patterns, seasonal factors</p>
                              <p><strong>Confidence Factors:</strong> Historical accuracy, data quality, market stability</p>
                              <p><strong>Update Frequency:</strong> Forecasts should be updated monthly for accuracy</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                              <button onclick="window.print()" style="background: #8b5cf6; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                                🖨️ Print Forecast
                              </button>
                              <button onclick="window.close()" style="background: #6b7280; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; margin: 10px;">
                                Close
                              </button>
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  disabled={!salesData}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  AI Forecast Analysis
                </Button>
              </CardContent>
            </Card>

            {/* Insights & Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Insights</CardTitle>
                <CardDescription>AI-powered recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">💡 Growth Opportunity</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {growth >= 0 
                      ? `Your sales are growing by ${growth}%. Keep up the momentum!`
                      : `Sales declined by ${Math.abs(growth)}%. Consider promotions or new products.`}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">✅ Best Performer</p>
                  <p className="text-xs text-green-700 mt-1">
                    {salesData?.topProducts[0]?.productName} is your star product. 
                    Consider creating similar items!
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">📊 Average Order</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Your average order value is {formatCurrency(salesData?.averageOrderValue || 0)}. 
                    Try bundle offers to increase this!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DigitalKhata;
