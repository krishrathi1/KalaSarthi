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
  RefreshCw
} from 'lucide-react';

interface DigitalKhataProps {
  artisanId?: string;
  className?: string;
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  averageOrderValue: number;
  topProducts: Array<{
    productName: string;
    revenue: number;
    units: number;
  }>;
  recentSales: Array<{
    id: string;
    productName: string;
    buyerName: string;
    totalAmount: number;
    quantity: number;
    timestamp: Date;
    paymentStatus: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

export function DigitalKhata({ artisanId = 'artisan_001', className = '' }: DigitalKhataProps) {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
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

  // Mock data for demo
  const getMockSalesData = (): SalesData => {
    return {
      totalRevenue: 125000,
      totalOrders: 45,
      totalUnits: 78,
      averageOrderValue: 2778,
      topProducts: [
        { productName: 'Traditional Terracotta Water Pot', revenue: 34000, units: 40 },
        { productName: 'Decorative Ceramic Vase', revenue: 28800, units: 24 },
        { productName: 'Set of Clay Dinner Plates', revenue: 26400, units: 11 },
        { productName: 'Handmade Clay Cups', revenue: 18000, units: 30 },
        { productName: 'Terracotta Plant Pots', revenue: 17800, units: 40 }
      ],
      recentSales: [
        {
          id: '1',
          productName: 'Traditional Terracotta Water Pot',
          buyerName: 'Rajesh Kumar',
          totalAmount: 1700,
          quantity: 2,
          timestamp: new Date(Date.now() - 3600000),
          paymentStatus: 'completed'
        },
        {
          id: '2',
          productName: 'Decorative Ceramic Vase',
          buyerName: 'Priya Sharma',
          totalAmount: 1200,
          quantity: 1,
          timestamp: new Date(Date.now() - 7200000),
          paymentStatus: 'completed'
        },
        {
          id: '3',
          productName: 'Set of Clay Dinner Plates',
          buyerName: 'Amit Patel',
          totalAmount: 2400,
          quantity: 1,
          timestamp: new Date(Date.now() - 10800000),
          paymentStatus: 'pending'
        },
        {
          id: '4',
          productName: 'Handmade Clay Cups',
          buyerName: 'Sneha Gupta',
          totalAmount: 1800,
          quantity: 3,
          timestamp: new Date(Date.now() - 14400000),
          paymentStatus: 'completed'
        },
        {
          id: '5',
          productName: 'Terracotta Plant Pots',
          buyerName: 'Vikram Singh',
          totalAmount: 900,
          quantity: 2,
          timestamp: new Date(Date.now() - 18000000),
          paymentStatus: 'completed'
        }
      ],
      monthlyTrend: [
        { month: 'Aug', revenue: 98000, orders: 35 },
        { month: 'Sep', revenue: 112000, orders: 42 },
        { month: 'Oct', revenue: 125000, orders: 45 }
      ]
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

  // Calculate growth percentage
  const calculateGrowth = () => {
    if (!salesData || salesData.monthlyTrend.length < 2) return 0;
    const current = salesData.monthlyTrend[salesData.monthlyTrend.length - 1].revenue;
    const previous = salesData.monthlyTrend[salesData.monthlyTrend.length - 2].revenue;
    return Math.round(((current - previous) / previous) * 100);
  };

  const growth = calculateGrowth();

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
          <p className="text-muted-foreground mt-1">Track your sales and business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSalesData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={exporting || !salesData}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToGoogleSheets}
            disabled={exporting || !salesData}
            className="hidden sm:flex"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export to Sheets'}
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {growth >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{growth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">{growth}%</span>
                </>
              )}
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {salesData.totalUnits} units sold
            </p>
          </CardContent>
        </Card>

        <Card>
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
                  className="w-full justify-start"
                  onClick={() => {
                    if (!salesData) return;
                    const avgRevenue = salesData.totalRevenue / salesData.monthlyTrend.length;
                    const trend = growth >= 0 ? 'growing' : 'declining';
                    alert(`📊 Quick Analysis:\n\n` +
                          `• Total Revenue: ${formatCurrency(salesData.totalRevenue)}\n` +
                          `• Average Monthly: ${formatCurrency(avgRevenue)}\n` +
                          `• Trend: ${trend} (${growth}%)\n` +
                          `• Best Product: ${salesData.topProducts[0]?.productName}\n` +
                          `• Total Orders: ${salesData.totalOrders}`);
                  }}
                  disabled={!salesData}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Quick Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (!salesData) return;
                    const topProduct = salesData.topProducts[0];
                    const topPercentage = Math.round((topProduct.revenue / salesData.totalRevenue) * 100);
                    alert(`🎯 Performance Insights:\n\n` +
                          `• Top Product: ${topProduct.productName}\n` +
                          `• Contributes: ${topPercentage}% of revenue\n` +
                          `• Units Sold: ${topProduct.units}\n` +
                          `• Revenue: ${formatCurrency(topProduct.revenue)}\n\n` +
                          `💡 Tip: Focus on promoting your top products!`);
                  }}
                  disabled={!salesData}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Product Performance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (!salesData) return;
                    const completedSales = salesData.recentSales.filter(s => s.paymentStatus === 'completed').length;
                    const pendingSales = salesData.recentSales.filter(s => s.paymentStatus === 'pending').length;
                    const completionRate = Math.round((completedSales / salesData.recentSales.length) * 100);
                    alert(`💰 Payment Status:\n\n` +
                          `• Completed: ${completedSales} orders\n` +
                          `• Pending: ${pendingSales} orders\n` +
                          `• Completion Rate: ${completionRate}%\n\n` +
                          `${pendingSales > 0 ? '⚠️ Follow up on pending payments!' : '✅ All payments completed!'}`);
                  }}
                  disabled={!salesData}
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  Payment Status
                </Button>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Management</CardTitle>
                <CardDescription>Manage your sales data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={loadSalesData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const periods = ['week', 'month', 'year'];
                    const currentIndex = periods.indexOf(selectedPeriod);
                    const nextPeriod = periods[(currentIndex + 1) % periods.length] as 'week' | 'month' | 'year';
                    setSelectedPeriod(nextPeriod);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Change Period ({selectedPeriod})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (!salesData) return;
                    const summary = `Digital Khata Summary (${selectedPeriod})\n\n` +
                                  `Revenue: ${formatCurrency(salesData.totalRevenue)}\n` +
                                  `Orders: ${salesData.totalOrders}\n` +
                                  `Units: ${salesData.totalUnits}\n` +
                                  `Avg Order: ${formatCurrency(salesData.averageOrderValue)}`;
                    navigator.clipboard.writeText(summary);
                    alert('✅ Summary copied to clipboard!');
                  }}
                  disabled={!salesData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Copy Summary
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
