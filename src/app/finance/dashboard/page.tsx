'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SalesOverview, ProductPerformance, ForecastChart, RealtimeDashboard } from '@/components/finance';
import { useAuth } from '@/context/auth-context';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Wifi,
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
  const [showRealtimeDashboard, setShowRealtimeDashboard] = useState(true);

  // Google Sheets integration
  const [exportingToSheets, setExportingToSheets] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

  // Get artisan ID (use Dev Bulchandani as default for demo)
  const artisanId = userProfile?.uid || 'dev_bulchandani_001';

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, resolution]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

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
      }

      // Fetch top products
      const topProductsResponse = await fetch(
        `/api/finance/products/performance?range=${timeRange}&sort=best&limit=5`
      );
      const topProductsResult = await topProductsResponse.json();

      if (topProductsResult.success) {
        setTopProducts(topProductsResult.data);
      }

      // Fetch worst products
      const worstProductsResponse = await fetch(
        `/api/finance/products/performance?range=${timeRange}&sort=worst&limit=5`
      );
      const worstProductsResult = await worstProductsResponse.json();

      if (worstProductsResult.success) {
        setWorstProducts(worstProductsResult.data);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Google Sheets export functionality
  const exportToGoogleSheets = async () => {
    try {
      setExportingToSheets(true);

      const exportData = {
        summary: {
          totalRevenue: summary.totalRevenue,
          totalUnits: summary.totalUnits,
          totalOrders: summary.totalOrders,
          averageOrderValue: summary.averageOrderValue,
          growthRate: summary.growthRate,
          timeRange: timeRange,
          exportDate: new Date().toISOString()
        },
        salesData: salesData.map(sale => ({
          date: sale.periodKey,
          revenue: sale.revenue,
          units: sale.units,
          orders: sale.orders,
          averageOrderValue: sale.averageOrderValue,
          averageUnitPrice: sale.averageUnitPrice
        })),
        topProducts: topProducts.map(product => ({
          rank: product.rank,
          productName: product.productName,
          category: product.category,
          revenue: product.revenue,
          units: product.units,
          marginPercentage: product.marginPercentage,
          revenueGrowth: product.revenueGrowth
        })),
        worstProducts: worstProducts.map(product => ({
          rank: product.rank,
          productName: product.productName,
          category: product.category,
          revenue: product.revenue,
          units: product.units,
          marginPercentage: product.marginPercentage,
          revenueGrowth: product.revenueGrowth
        }))
      };

      const response = await fetch('/api/google-sheets/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      const result = await response.json();

      if (result.success) {
        setSheetsUrl(result.sheetsUrl);
        setLastExportDate(new Date().toLocaleString());
        // Show success message
        alert('Sales data exported to Google Sheets successfully!');
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (err) {
      console.error('Error exporting to Google Sheets:', err);
      alert('Failed to export to Google Sheets. Please try again.');
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced DigitalKhata Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time financial tracking with AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showRealtimeDashboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRealtimeDashboard(!showRealtimeDashboard)}
          >
            <Wifi className="h-4 w-4 mr-2" />
            {showRealtimeDashboard ? 'Real-time View' : 'Enable Real-time'}
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

      {/* Real-time Dashboard */}
      {showRealtimeDashboard && (
        <RealtimeDashboard artisanId={artisanId} />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            {summary.growthRate !== undefined && (
              <div className="flex items-center text-xs text-muted-foreground">
                {summary.growthRate > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                {formatPercentage(summary.growthRate)} from previous period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalOrders)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.averageOrderValue)} average order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalUnits)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.totalUnits > 0 ? summary.totalRevenue / summary.totalUnits : 0)} average unit price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalOrders > 0 ? 'Good' : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on current metrics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Analytics</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Sales Overview Component */}
          <SalesOverview
            timeRange={timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : timeRange === '90d' ? 'quarter' : 'year'}
          />

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common finance tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Set Revenue Targets
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <PieChart className="h-4 w-4 mr-2" />
                  Generate Reports
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Alerts
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Forecast Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
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
          
          <RealtimeDashboard artisanId={artisanId} />
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

        <TabsContent value="sheets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Google Sheets Integration
              </CardTitle>
              <CardDescription>
                Export and manage your sales data in Google Sheets with systematic organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Section */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-blue-900">Export Sales Data</h4>
                  <p className="text-sm text-blue-700">
                    Export current dashboard data to a well-organized Google Sheet
                  </p>
                  {lastExportDate && (
                    <p className="text-xs text-blue-600 mt-1">
                      Last exported: {lastExportDate}
                    </p>
                  )}
                </div>
                <Button
                  onClick={exportToGoogleSheets}
                  disabled={exportingToSheets}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {exportingToSheets ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export to Sheets
                    </>
                  )}
                </Button>
              </div>

              {/* Sheets Link */}
              {sheetsUrl && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-green-900">Google Sheet Created</h4>
                    <p className="text-sm text-green-700">
                      Your sales data has been exported successfully
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(sheetsUrl!, '_blank')}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Sheets
                  </Button>
                </div>
              )}

              {/* Data Structure Preview */}
              <div className="space-y-4">
                <h4 className="font-medium">Sheet Structure Preview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Summary Sheet</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <div>• Total Revenue: {formatCurrency(summary.totalRevenue)}</div>
                      <div>• Total Orders: {formatNumber(summary.totalOrders)}</div>
                      <div>• Total Units: {formatNumber(summary.totalUnits)}</div>
                      <div>• Average Order Value: {formatCurrency(summary.averageOrderValue)}</div>
                      <div>• Time Range: {timeRange}</div>
                      <div>• Export Date: {new Date().toLocaleDateString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Sales Data Sheet</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <div>• Date-wise breakdown</div>
                      <div>• Revenue per period</div>
                      <div>• Units sold</div>
                      <div>• Order count</div>
                      <div>• Average values</div>
                      <div>• Growth metrics</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Top Products Sheet</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <div>• Product rankings</div>
                      <div>• Revenue by product</div>
                      <div>• Units sold</div>
                      <div>• Margin analysis</div>
                      <div>• Growth trends</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Performance Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <div>• Automated calculations</div>
                      <div>• Trend analysis</div>
                      <div>• Performance metrics</div>
                      <div>• Charts and graphs</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Benefits of Google Sheets Integration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Systematic data organization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time collaboration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Automated calculations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Custom reporting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Data visualization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Historical tracking</span>
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
