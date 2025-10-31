'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { FinancialReportData } from '@/lib/services/FinancialReportService';

interface FinancialReportsProps {
  artisanId: string;
  className?: string;
}

interface ReportConfig {
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  realtime: boolean;
  format: 'json' | 'csv' | 'pdf';
  includeDetails: boolean;
  includeCharts: boolean;
  template: 'standard' | 'detailed' | 'summary';
}

export default function FinancialReports({ artisanId, className = '' }: FinancialReportsProps) {
  const [reportData, setReportData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ReportConfig>({
    period: 'month',
    realtime: true,
    format: 'json',
    includeDetails: true,
    includeCharts: false,
    template: 'standard',
  });

  // Generate report
  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        artisanId,
        period: config.period,
        realtime: config.realtime.toString(),
        format: 'json', // Always get JSON for display
        includeDetails: config.includeDetails.toString(),
        includeCharts: config.includeCharts.toString(),
        template: config.template,
      });

      if (config.period === 'custom' && config.startDate && config.endDate) {
        params.append('startDate', config.startDate);
        params.append('endDate', config.endDate);
      }

      const response = await fetch(`/api/finance/reports?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        setError(result.error || 'Failed to generate report');
      }

    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const exportReport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        artisanId,
        period: config.period,
        realtime: config.realtime.toString(),
        format: config.format,
        includeDetails: config.includeDetails.toString(),
        includeCharts: config.includeCharts.toString(),
        template: config.template,
      });

      if (config.period === 'custom' && config.startDate && config.endDate) {
        params.append('startDate', config.startDate);
        params.append('endDate', config.endDate);
      }

      const response = await fetch(`/api/finance/reports?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from response headers or generate one
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `financial-report-${artisanId}-${new Date().toISOString().split('T')[0]}.${config.format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorResult = await response.json();
        setError(errorResult.error || 'Failed to export report');
      }

    } catch (err) {
      console.error('Error exporting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  // Load initial report
  useEffect(() => {
    generateReport();
  }, [artisanId]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get trend display
  const getTrendDisplay = (value: number) => {
    if (value > 0) {
      return { icon: TrendingUp, color: 'text-green-500', text: `+${value.toFixed(1)}%` };
    } else if (value < 0) {
      return { icon: TrendingDown, color: 'text-red-500', text: `${value.toFixed(1)}%` };
    } else {
      return { icon: Activity, color: 'text-gray-500', text: '0%' };
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">
            Generate comprehensive financial reports with real-time data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${config.realtime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {config.realtime ? 'Real-time' : 'Historical'}
          </Badge>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Configure your financial report parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Period Selection */}
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select
                value={config.period}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={config.format}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Report Template</Label>
              <Select
                value={config.template}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button
                  onClick={generateReport}
                  disabled={loading}
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Generate
                </Button>
                <Button
                  onClick={exportReport}
                  disabled={loading || !reportData}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {config.period === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={config.startDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={config.endDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="realtime"
                checked={config.realtime}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, realtime: !!checked }))}
              />
              <Label htmlFor="realtime">Use real-time data</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDetails"
                checked={config.includeDetails}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeDetails: !!checked }))}
              />
              <Label htmlFor="includeDetails">Include detailed breakdown</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={config.includeCharts}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: !!checked }))}
              />
              <Label htmlFor="includeCharts">Include charts (PDF only)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !reportData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Generating financial report...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {reportData && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Report</CardTitle>
                  <CardDescription>
                    {formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {reportData.period.type.charAt(0).toUpperCase() + reportData.period.type.slice(1)}
                  </Badge>
                  <Badge variant={reportData.metadata.isRealtime ? 'default' : 'secondary'}>
                    {reportData.metadata.dataSource}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</div>
                {reportData.trends.revenueGrowth !== 0 && (
                  <div className="flex items-center text-sm">
                    {(() => {
                      const trend = getTrendDisplay(reportData.trends.revenueGrowth);
                      const Icon = trend.icon;
                      return (
                        <>
                          <Icon className={`h-3 w-3 mr-1 ${trend.color}`} />
                          <span className={trend.color}>{trend.text}</span>
                          <span className="text-muted-foreground ml-1">from last period</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.summary.netProfit)}
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">
                    {reportData.summary.profitMargin.toFixed(1)}% margin
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.totalOrders}</div>
                {reportData.trends.orderGrowth !== 0 && (
                  <div className="flex items-center text-sm">
                    {(() => {
                      const trend = getTrendDisplay(reportData.trends.orderGrowth);
                      const Icon = trend.icon;
                      return (
                        <>
                          <Icon className={`h-3 w-3 mr-1 ${trend.color}`} />
                          <span className={trend.color}>{trend.text}</span>
                          <span className="text-muted-foreground ml-1">from last period</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.summary.averageOrderValue)}</div>
                <div className="flex items-center text-sm text-muted-foreground">
                  {reportData.summary.totalUnits} total units
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          {config.includeDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Channel */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Channel</CardTitle>
                  <CardDescription>Revenue breakdown by sales channel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(reportData.salesBreakdown.byChannel).map(([channel, revenue]) => (
                      <div key={channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="capitalize">{channel}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(revenue)}</div>
                          <div className="text-sm text-muted-foreground">
                            {((revenue / reportData.summary.totalRevenue) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>Expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(reportData.expenseBreakdown.byCategory).map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="capitalize">{category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {((amount / reportData.summary.totalExpenses) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tax Deductible:</span>
                      <span>{formatCurrency(reportData.expenseBreakdown.taxDeductible)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recurring:</span>
                      <span>{formatCurrency(reportData.expenseBreakdown.recurring)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Products */}
          {config.includeDetails && reportData.salesBreakdown.byProduct.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.salesBreakdown.byProduct.slice(0, 10).map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.units} units • {product.orders} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.revenue)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.revenue / product.units)} per unit
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Generated:</span>
                  <p className="font-medium">{formatDate(reportData.metadata.generatedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Source:</span>
                  <p className="font-medium capitalize">{reportData.metadata.dataSource}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Real-time:</span>
                  <p className="font-medium">{reportData.metadata.isRealtime ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}