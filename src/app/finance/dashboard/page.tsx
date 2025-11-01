'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProductPerformance, ForecastChart, RealtimeDashboard } from '@/components/finance';
import { useAuth } from '@/context/auth-context';
import { useOffline } from '@/hooks/use-offline';
import { notificationManager, notifySyncComplete } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Package,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Wifi,
  Zap,
  FileText,
  WifiOff,
  RefreshCw
} from 'lucide-react';

interface SalesData {
  periodKey: string;
  revenue: number;
  units: number;
  orders: number;
  averageOrderValue: number;
  averageUnitPrice: number;
}

interface ProductPerformance {
  rank: number;
  productId: string;
  productName: string;
  category: string;
  revenue: number;
  units: number;
  marginPercentage: number;
  revenueGrowth?: number;
}

interface DashboardSummary {
  totalRevenue: number;
  totalUnits: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate?: number;
}

export default function FinanceDashboard() {
  const { userProfile } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [resolution, setResolution] = useState('daily');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [worstProducts, setWorstProducts] = useState<ProductPerformance[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalRevenue: 0,
    totalUnits: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Always show real-time dashboard - removed toggle functionality

  // Google Sheets integration
  const [exportingToSheets, setExportingToSheets] = useState(false);

  // Get artisan ID (use Dev Bulchandani as default for demo)
  const artisanId = 'dev_bulchandani_001'; // Fixed artisan ID for sample data

  // Offline support
  const {
    isOnline,
    isSyncing,
    storeOffline,
    getOfflineData,
    sync,
  } = useOffline();

  // Track previous online state
  const previousOnlineState = useRef(isOnline);
  const { toast } = useToast();

  // Request notification permission on mount
  useEffect(() => {
    if (notificationManager.isSupported() && notificationManager.getPermission() === 'default') {
      setTimeout(() => {
        notificationManager.requestPermission();
      }, 3000);
    }
  }, []);

  // Detect connection restoration
  useEffect(() => {
    if (!previousOnlineState.current && isOnline) {
      if (notificationManager.getPermission() === 'granted') {
        notificationManager.notifyConnectionRestored();
      }
      toast({
        title: "Connection Restored",
        description: "You're back online! Refreshing financial data...",
      });
      fetchDashboardData();
    }
    previousOnlineState.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, resolution]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOnline) {
        // Fetch from API when online
        // Fetch sales data
        const salesResponse = await fetch(
          `/api/finance/sales?range=${timeRange}&resolution=${resolution}`
        );
        const salesResult = await salesResponse.json();

        if (salesResult.success) {
          setSalesData(salesResult.data);
          setSummary({
            totalRevenue: salesResult.summary.totalRevenue,
            totalUnits: salesResult.summary.totalUnits,
            totalOrders: salesResult.summary.totalOrders,
            averageOrderValue: salesResult.summary.averageOrderValue,
            growthRate: salesResult.summary.growthRate,
          });

          // Cache data for offline use
          await storeOffline('product', { salesData: salesResult.data, summary: salesResult.summary }, 'finance-sales', true);
        } else if (salesResult.offline) {
          // Handle offline response from API
          throw new Error('Service requires internet connection');
        }

        // Fetch top products
        const topProductsResponse = await fetch(
          `/api/finance/products/performance?range=${timeRange}&sort=best&limit=5`
        );
        const topProductsResult = await topProductsResponse.json();

        if (topProductsResult.success) {
          setTopProducts(topProductsResult.data);
          await storeOffline('product', topProductsResult.data, 'finance-top-products', true);
        }

        // Fetch worst products
        const worstProductsResponse = await fetch(
          `/api/finance/products/performance?range=${timeRange}&sort=worst&limit=5`
        );
        const worstProductsResult = await worstProductsResponse.json();

        if (worstProductsResult.success) {
          setWorstProducts(worstProductsResult.data);
          await storeOffline('product', worstProductsResult.data, 'finance-worst-products', true);
        }
      } else {
        // Load from offline storage when offline
        const offlineData = await getOfflineData('product') as any[];
        const salesCache = offlineData.find((item: any) => item.id === 'finance-sales');
        const topProductsCache = offlineData.find((item: any) => item.id === 'finance-top-products');
        const worstProductsCache = offlineData.find((item: any) => item.id === 'finance-worst-products');

        if (salesCache) {
          setSalesData(salesCache.salesData || []);
          setSummary(salesCache.summary || {
            totalRevenue: 0,
            totalUnits: 0,
            totalOrders: 0,
            averageOrderValue: 0,
          });
        }

        if (topProductsCache) {
          setTopProducts(topProductsCache || []);
        }

        if (worstProductsCache) {
          setWorstProducts(worstProductsCache || []);
        }

        if (salesCache || topProductsCache || worstProductsCache) {
          toast({
            title: "Working Offline",
            description: "Showing cached financial data.",
            duration: 5000,
          });
        } else {
          setError('No offline data available');
          toast({
            title: "No Offline Data",
            description: "Please connect to the internet to load financial data.",
            variant: "destructive",
          });
        }
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);

      // Fallback to offline data on error
      try {
        const offlineData = await getOfflineData('product') as any[];
        const salesCache = offlineData.find((item: any) => item.id === 'finance-sales');
        const topProductsCache = offlineData.find((item: any) => item.id === 'finance-top-products');
        const worstProductsCache = offlineData.find((item: any) => item.id === 'finance-worst-products');

        if (salesCache || topProductsCache || worstProductsCache) {
          if (salesCache) {
            setSalesData(salesCache.salesData || []);
            setSummary(salesCache.summary || {
              totalRevenue: 0,
              totalUnits: 0,
              totalOrders: 0,
              averageOrderValue: 0,
            });
          }
          if (topProductsCache) setTopProducts(topProductsCache || []);
          if (worstProductsCache) setWorstProducts(worstProductsCache || []);

          toast({
            title: "Using Cached Data",
            description: "Couldn't reach server. Showing cached financial data.",
            variant: "destructive",
          });
        } else {
          setError('Failed to load dashboard data. Redis connection unavailable.');
        }
      } catch (offlineError) {
        console.error('Error loading offline data:', offlineError);
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
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



  // File export functionality
  const exportToFile = async (format: 'csv' | 'json' | 'excel') => {
    try {
      const exportData = {
        summary: {
          period: timeRange,
          totalRevenue: summary.totalRevenue,
          totalOrders: summary.totalOrders,
          totalUnits: summary.totalUnits,
          averageOrderValue: summary.averageOrderValue
        },
        topProducts: topProducts.map(product => ({
          productName: product.productName,
          revenue: product.revenue,
          units: product.units
        })),
        recentSales: topProducts.slice(0, 10).map((product, index) => ({
          productName: product.productName,
          buyerName: `Customer ${index + 1}`,
          quantity: Math.floor(product.units / 10) || 1,
          totalAmount: Math.floor(product.revenue / 10) || 1000,
          paymentStatus: index % 2 === 0 ? 'Paid' : 'Fulfilled',
          timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()
        })),
        monthlyTrend: salesData
          .filter((_, index) => index % Math.ceil(salesData.length / 12) === 0)
          .map(sale => ({
            month: sale.periodKey,
            revenue: sale.revenue,
            orders: sale.orders
          }))
      };

      const response = await fetch(`/api/export-data?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        // Create a blob and download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        notification.innerHTML = `✅ ${format.toUpperCase()} file downloaded successfully!`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
      notification.innerHTML = `❌ Failed to export ${format.toUpperCase()} file. Please try again.`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  };

  // Google Sheets export functionality
  const exportToGoogleSheets = async () => {
    try {
      setExportingToSheets(true);

      const exportData = {
        summary: {
          period: timeRange,
          totalRevenue: summary.totalRevenue,
          totalOrders: summary.totalOrders,
          totalUnits: summary.totalUnits,
          averageOrderValue: summary.averageOrderValue
        },
        topProducts: topProducts.map(product => ({
          productName: product.productName,
          revenue: product.revenue,
          units: product.units
        })),
        recentSales: topProducts.slice(0, 10).map((product, index) => ({
          productName: product.productName,
          buyerName: `Customer ${index + 1}`,
          quantity: Math.floor(product.units / 10) || 1,
          totalAmount: Math.floor(product.revenue / 10) || 1000,
          paymentStatus: index % 2 === 0 ? 'Paid' : 'Fulfilled',
          timestamp: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()
        })),
        monthlyTrend: salesData
          .filter((_, index) => index % Math.ceil(salesData.length / 12) === 0) // Sample 12 points
          .map(sale => ({
            month: sale.periodKey,
            revenue: sale.revenue,
            orders: sale.orders
          }))
      };

      const response = await fetch('/api/google-sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      const result = await response.json();

      if (result.success) {
        // Show success notification without alert
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        notification.innerHTML = '✅ Sales data exported to Google Sheets successfully!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else if (result.mockExport) {
        // Handle mock export case (when Google Sheets API isn't fully configured)
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
        notification.innerHTML = `
          <div class="text-sm">
            <div class="font-bold mb-2">📊 Export Preview Generated</div>
            <div>Google Sheets API needs setup. Check console for details.</div>
            <div class="mt-1 text-xs opacity-90">
              Products: ${result.mockExport.productCount} | 
              Sales: ${result.mockExport.salesCount} | 
              Revenue: ₹${result.mockExport.summary.totalRevenue.toLocaleString('en-IN')}
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (err) {
      console.error('Error exporting to Google Sheets:', err);
      // Show error notification without alert
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
      notification.innerHTML = '❌ Failed to export to Google Sheets. Please try again.';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } finally {
      setExportingToSheets(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading Finance Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-32 w-32 text-destructive mx-auto" />
          <h2 className="mt-4 text-2xl font-bold">Error Loading Dashboard</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Offline/Online Indicator and Sync */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Badge variant="outline" className="gap-1 border-green-200 text-green-700 bg-green-50">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-red-200 text-red-700 bg-red-50">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Sync Button */}
        {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const result = await sync();
              if (result) {
                toast({
                  title: "Sync Complete",
                  description: "All data synchronized successfully.",
                });

                if (notificationManager.getPermission() === 'granted') {
                  await notifySyncComplete(result.synced || 0);
                }
              }
            }}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You're working offline. Showing cached financial data. Real-time features require an internet connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Redis Connection Error Banner */}
      {error && error.includes('Redis') && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Real-time analytics unavailable (Redis not connected). Showing cached data. This is normal for local development.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DigitalKhata Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time financial tracking with AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!isOnline}
            onClick={async () => {
              if (!isOnline) {
                toast({
                  title: "Offline Mode",
                  description: "Generating sample data requires an internet connection.",
                  variant: "destructive",
                });
                return;
              }
              try {
                const response = await fetch('/api/generate-sample-data', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                  alert('Sample data generated successfully! Refresh the page to see the data.');
                } else {
                  alert('Failed to generate sample data: ' + result.error);
                }
              } catch (error) {
                alert('Error generating sample data: ' + error);
              }
            }}
          >
            Generate Sample Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await fetch('/api/debug-firestore');
                const result = await response.json();
                if (result.success) {
                  alert(`Firestore Debug:\nSales Events: ${result.data.salesEvents.count}\nSummaries: ${result.data.monthlySummaries.count}`);
                } else {
                  alert('Debug failed: ' + result.error);
                }
              } catch (error) {
                alert('Debug error: ' + error);
              }
            }}
          >
            Debug Firestore
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Real-time Dashboard - Always shown */}
      <RealtimeDashboard artisanId="dev_bulchandani_001" />



      {/* Main Content Tabs - Moved to top as requested */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Analytics</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest sales events</CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.slice(-5).reverse().map((sale, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{sale.periodKey}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.orders} orders • {sale.units} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(sale.revenue)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(sale.averageOrderValue)} avg
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {/* Enhanced Real-time Dashboard */}
          <Alert>
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              This tab shows real-time financial data with live updates from Firestore.
              Data is synchronized automatically and cached for offline access.
            </AlertDescription>
          </Alert>

          <RealtimeDashboard artisanId="dev_bulchandani_001" />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {/* Product Performance Component */}
          <ProductPerformance
            timeRange={timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : timeRange === '90d' ? 'quarter' : 'year'}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Forecast Chart Component */}
          <ForecastChart
            horizon={30}
            metric="revenue"
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>Intelligent recommendations for your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Revenue Growth Opportunity</h4>
                    <p className="text-sm text-green-700">
                      Your top-performing category shows 15% growth potential. Consider increasing inventory.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Margin Optimization</h4>
                    <p className="text-sm text-yellow-700">
                      Several products have declining margins. Review pricing strategy and costs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Inventory Management</h4>
                    <p className="text-sm text-blue-700">
                      Stock levels for popular items are below optimal. Consider restocking.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Generate detailed reports, export data, and perform common tasks quickly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Generation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Reports
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Sales Report</h4>
                        <p className="text-sm text-muted-foreground">Comprehensive sales analysis</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const reportData = {
                          type: 'sales_report',
                          period: timeRange,
                          summary: summary,
                          salesData: salesData,
                          topProducts: topProducts.slice(0, 10),
                          generatedAt: new Date().toISOString()
                        };

                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `sales-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download
                    </Button>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Product Report</h4>
                        <p className="text-sm text-muted-foreground">Product performance analysis</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const reportData = {
                          type: 'product_report',
                          period: timeRange,
                          topProducts: topProducts,
                          worstProducts: worstProducts,
                          totalProducts: topProducts.length + worstProducts.length,
                          generatedAt: new Date().toISOString()
                        };

                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `product-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download
                    </Button>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Analytics Report</h4>
                        <p className="text-sm text-muted-foreground">Complete business analytics</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const reportData = {
                          type: 'analytics_report',
                          period: timeRange,
                          summary: summary,
                          salesData: salesData,
                          topProducts: topProducts,
                          worstProducts: worstProducts,
                          trends: {
                            revenue: salesData.map(s => ({ period: s.periodKey, value: s.revenue })),
                            orders: salesData.map(s => ({ period: s.periodKey, value: s.orders }))
                          },
                          generatedAt: new Date().toISOString()
                        };

                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate & Download
                    </Button>
                  </Card>
                </div>
              </div>

              {/* Quick Export Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Quick Export
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => exportToFile('csv')}
                    disabled={!isOnline}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Export CSV</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => exportToFile('json')}
                    disabled={!isOnline}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Export JSON</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => exportToFile('excel')}
                    disabled={!isOnline}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <FileSpreadsheet className="h-6 w-6" />
                    <span className="text-sm">Excel Format</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={exportToGoogleSheets}
                    disabled={!isOnline || exportingToSheets}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    {exportingToSheets ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                    ) : (
                      <FileSpreadsheet className="h-6 w-6" />
                    )}
                    <span className="text-sm">Google Sheets</span>
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Stats
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</div>
                    <div className="text-sm text-blue-700">Total Revenue</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{summary.totalOrders}</div>
                    <div className="text-sm text-green-700">Total Orders</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{summary.totalUnits}</div>
                    <div className="text-sm text-purple-700">Units Sold</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.averageOrderValue)}</div>
                    <div className="text-sm text-orange-700">Avg Order Value</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}