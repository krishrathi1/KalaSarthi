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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-full space-y-6">
        {/* Offline/Online Indicator and Sync */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white/80 backdrop-blur-sm border rounded-xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Badge variant="outline" className="gap-1.5 border-green-200 text-green-700 bg-green-50 flex-shrink-0">
                <Wifi className="h-3 w-3" />
                <span className="text-xs sm:text-sm">Online</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-red-200 text-red-700 bg-red-50 flex-shrink-0">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs sm:text-sm">Offline</span>
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
              className="flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Sync</span>
            </Button>
          )}
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <Alert className="bg-yellow-50 border-yellow-200 shadow-sm w-full">
            <WifiOff className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm text-yellow-800">
              You're working offline. Showing cached financial data. Real-time features require an internet connection.
            </AlertDescription>
          </Alert>
        )}

        {/* Redis Connection Error Banner */}
        {error && error.includes('Redis') && (
          <Alert className="bg-blue-50 border-blue-200 shadow-sm w-full">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <AlertDescription className="text-xs sm:text-sm text-blue-800">
              Real-time analytics unavailable (Redis not connected). Showing cached data. This is normal for local development.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full">
            <div className="min-w-0 flex-1 max-w-full">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent truncate">
                DigitalKhata Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                Real-time financial tracking with AI-powered insights
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto max-w-full">
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
                className="text-xs sm:text-sm flex-shrink-0 min-w-0"
              >
                <span className="hidden md:inline">Generate Sample Data</span>
                <span className="md:hidden">Sample</span>
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
                className="text-xs sm:text-sm flex-shrink-0 min-w-0"
              >
                <span className="hidden md:inline">Debug</span>
                <span className="md:hidden">🐛</span>
              </Button>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-24 sm:w-28 text-xs sm:text-sm flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="w-24 sm:w-28 text-xs sm:text-sm flex-shrink-0">
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
        </div>

        {/* Real-time Dashboard - Always shown */}
        <div className="w-full max-w-full overflow-hidden">
          <RealtimeDashboard artisanId="dev_bulchandani_001" />
        </div>

        {/* Main Content Tabs - Moved to top as requested */}
        <Tabs defaultValue="overview" className="space-y-6 w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 bg-white/80 backdrop-blur-sm border shadow-sm min-w-fit">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="realtime" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                <span className="hidden sm:inline">Real-time</span>
                <span className="sm:hidden">Live</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                Products
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                Insights
              </TabsTrigger>
              <TabsTrigger value="quick-actions" className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
                <span className="hidden sm:inline">Quick Actions</span>
                <span className="sm:hidden">Actions</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 w-full">
            {/* Recent Activity */}
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-100 shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-emerald-900">Recent Sales</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest sales events</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3">
                  {salesData.slice(-5).reverse().map((sale, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 bg-gradient-to-r from-emerald-50/50 to-cyan-50/50 rounded-lg border border-emerald-100 hover:shadow-md transition-shadow">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{sale.periodKey}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {sale.orders} orders • {sale.units} units
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                        <p className="font-medium text-base sm:text-lg text-emerald-900">{formatCurrency(sale.revenue)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatCurrency(sale.averageOrderValue)} avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6 w-full">
            {/* Enhanced Real-time Dashboard */}
            <Alert className="bg-emerald-50 border-emerald-200 shadow-sm">
              <Wifi className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <AlertDescription className="text-xs sm:text-sm text-emerald-800">
                This tab shows real-time financial data with live updates from Firestore.
                Data is synchronized automatically and cached for offline access.
              </AlertDescription>
            </Alert>

            <RealtimeDashboard artisanId="dev_bulchandani_001" />
          </TabsContent>

          <TabsContent value="products" className="space-y-6 w-full">
            {/* Product Performance Component */}
            <ProductPerformance
              timeRange={timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : timeRange === '90d' ? 'quarter' : 'year'}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 w-full">
            {/* Forecast Chart Component */}
            <ForecastChart
              horizon={30}
              metric="revenue"
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6 w-full">
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-100 shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-emerald-900">AI-Powered Insights</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Intelligent recommendations for your business</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base text-green-800">Revenue Growth Opportunity</h4>
                      <p className="text-xs sm:text-sm text-green-700 mt-1">
                        Your top-performing category shows 15% growth potential. Consider increasing inventory.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base text-yellow-800">Margin Optimization</h4>
                      <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                        Several products have declining margins. Review pricing strategy and costs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                    <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base text-blue-800">Inventory Management</h4>
                      <p className="text-xs sm:text-sm text-blue-700 mt-1">
                        Stock levels for popular items are below optimal. Consider restocking.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick-actions" className="space-y-6 w-full">
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-100 shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-emerald-900">
                  <Zap className="h-5 w-5 flex-shrink-0" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Generate detailed reports, export data, and perform common tasks quickly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
                {/* Report Generation */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-emerald-900">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <span>Generate Reports</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="p-3 sm:p-4 hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex-shrink-0">
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm sm:text-base truncate">Sales Report</h4>
                          <p className="text-xs text-muted-foreground truncate">Comprehensive sales analysis</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs sm:text-sm"
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

                    <Card className="p-3 sm:p-4 hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex-shrink-0">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm sm:text-base truncate">Product Report</h4>
                          <p className="text-xs text-muted-foreground truncate">Product performance analysis</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-xs sm:text-sm"
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

                    <Card className="p-3 sm:p-4 hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm sm:text-base truncate">Analytics Report</h4>
                          <p className="text-xs text-muted-foreground truncate">Complete business analytics</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs sm:text-sm"
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
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-emerald-900">
                    <Download className="h-5 w-5 flex-shrink-0" />
                    <span>Quick Export</span>
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => exportToFile('csv')}
                      disabled={!isOnline}
                      className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                    >
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                      <span className="text-xs sm:text-sm">Export CSV</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => exportToFile('json')}
                      disabled={!isOnline}
                      className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      <span className="text-xs sm:text-sm">Export JSON</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => exportToFile('excel')}
                      disabled={!isOnline}
                      className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 border-green-200 hover:bg-green-50 hover:border-green-300"
                    >
                      <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      <span className="text-xs sm:text-sm">Excel Format</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportToGoogleSheets}
                      disabled={!isOnline || exportingToSheets}
                      className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                    >
                      {exportingToSheets ? (
                        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-purple-600"></div>
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                      )}
                      <span className="text-xs sm:text-sm">Google Sheets</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-emerald-900">
                    <Activity className="h-5 w-5 flex-shrink-0" />
                    <span>Quick Stats</span>
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate">{formatCurrency(summary.totalRevenue)}</div>
                      <div className="text-xs sm:text-sm text-blue-700 mt-1">Total Revenue</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                      <div className="text-lg sm:text-2xl font-bold text-green-600">{summary.totalOrders}</div>
                      <div className="text-xs sm:text-sm text-green-700 mt-1">Total Orders</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                      <div className="text-lg sm:text-2xl font-bold text-purple-600">{summary.totalUnits}</div>
                      <div className="text-xs sm:text-sm text-purple-700 mt-1">Units Sold</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                      <div className="text-lg sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(summary.averageOrderValue)}</div>
                      <div className="text-xs sm:text-sm text-orange-700 mt-1">Avg Order Value</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}