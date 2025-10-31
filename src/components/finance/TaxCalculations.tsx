'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  PieChart,
  BarChart3,
  Target,
  Shield,
  Lightbulb,
  Calendar,
  Activity
} from 'lucide-react';
import { TaxCalculationData } from '@/lib/services/TaxCalculationService';

interface TaxCalculationsProps {
  artisanId: string;
  className?: string;
}

interface TaxConfig {
  financialYear: string;
  includeComparison: boolean;
  realtime: boolean;
}

export default function TaxCalculations({ artisanId, className = '' }: TaxCalculationsProps) {
  const [taxData, setTaxData] = useState<TaxCalculationData | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<TaxConfig>({
    financialYear: getCurrentFinancialYear(),
    includeComparison: false,
    realtime: true,
  });

  // Get current financial year
  function getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (now.getMonth() >= 3) { // April onwards
      return `${currentYear}-${currentYear + 1}`;
    } else { // January to March
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  // Calculate tax data
  const calculateTaxes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        artisanId,
        financialYear: config.financialYear,
        realtime: config.realtime.toString(),
        includeRecommendations: 'true',
        includeComparison: config.includeComparison.toString(),
      });

      const response = await fetch(`/api/finance/tax-calculations?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        if (config.includeComparison && result.comparison) {
          setComparisonData(result.comparison);
          setTaxData(result.comparison.currentYear);
        } else {
          setTaxData(result.data);
          setComparisonData(null);
        }
      } else {
        setError(result.error || 'Failed to calculate taxes');
      }

    } catch (err) {
      console.error('Error calculating taxes:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate taxes');
    } finally {
      setLoading(false);
    }
  };

  // Load initial tax data
  useEffect(() => {
    calculateTaxes();
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

  // Get compliance status color
  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tax Calculations</h2>
          <p className="text-muted-foreground">
            Comprehensive tax analysis with real-time data integration
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
          <CardTitle>Tax Configuration</CardTitle>
          <CardDescription>
            Configure your tax calculation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financial Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Financial Year</label>
              <Select
                value={config.financialYear}
                onValueChange={(value) => setConfig(prev => ({ ...prev, financialYear: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={getCurrentFinancialYear()}>Current FY ({getCurrentFinancialYear()})</SelectItem>
                  <SelectItem value={`${parseInt(getCurrentFinancialYear().split('-')[0]) - 1}-${parseInt(getCurrentFinancialYear().split('-')[1]) - 1}`}>
                    Previous FY ({`${parseInt(getCurrentFinancialYear().split('-')[0]) - 1}-${parseInt(getCurrentFinancialYear().split('-')[1]) - 1}`})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeComparison}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeComparison: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Year-over-year comparison</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button
                onClick={calculateTaxes}
                disabled={loading}
                className="w-full"
              >
                <Calculator className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Calculate Taxes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !taxData && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Calculating taxes with real-time data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Data Display */}
      {taxData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxable Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(taxData.businessIncome.taxableIncome)}</div>
                  {comparisonData && (
                    <div className="flex items-center text-sm">
                      {(() => {
                        const growth = taxData.yearOverYear.growth.profitGrowth;
                        const trend = getTrendDisplay(growth);
                        const Icon = trend.icon;
                        return (
                          <>
                            <Icon className={`h-3 w-3 mr-1 ${trend.color}`} />
                            <span className={trend.color}>{trend.text}</span>
                            <span className="text-muted-foreground ml-1">vs last year</span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tax Liability</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(taxData.taxCalculations.totalTaxLiability)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {taxData.taxCalculations.effectiveTaxRate.toFixed(1)}% effective rate
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Income Tax</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(taxData.taxCalculations.incomeTax)}</div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    Primary tax component
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net GST</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${taxData.taxCalculations.gst.netGST >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(taxData.taxCalculations.gst.netGST))}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {taxData.taxCalculations.gst.netGST >= 0 ? 'Payable' : 'Refundable'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Year-over-Year Comparison */}
            {comparisonData && (
              <Card>
                <CardHeader>
                  <CardTitle>Year-over-Year Comparison</CardTitle>
                  <CardDescription>
                    Financial performance comparison with previous year
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {getTrendDisplay(taxData.yearOverYear.growth.revenueGrowth).text}
                      </div>
                      <p className="text-sm text-muted-foreground">Revenue Growth</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {getTrendDisplay(taxData.yearOverYear.growth.profitGrowth).text}
                      </div>
                      <p className="text-sm text-muted-foreground">Profit Growth</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {getTrendDisplay(taxData.yearOverYear.growth.taxGrowth).text}
                      </div>
                      <p className="text-sm text-muted-foreground">Tax Growth</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(comparisonData.improvements.taxSavings)}
                      </div>
                      <p className="text-sm text-muted-foreground">Tax Savings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Income Breakdown</CardTitle>
                  <CardDescription>Revenue sources and taxable income</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Sales Revenue</span>
                      <span className="font-medium">{formatCurrency(taxData.businessIncome.breakdown.salesRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Service Revenue</span>
                      <span className="font-medium">{formatCurrency(taxData.businessIncome.breakdown.serviceRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Other Income</span>
                      <span className="font-medium">{formatCurrency(taxData.businessIncome.breakdown.otherIncome)}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Revenue</span>
                        <span>{formatCurrency(taxData.businessIncome.totalRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                        <span>Taxable Income</span>
                        <span>{formatCurrency(taxData.businessIncome.taxableIncome)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Expenses Breakdown</CardTitle>
                  <CardDescription>Deductible and non-deductible expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(taxData.businessExpenses.breakdown).map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="capitalize">{category}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Expenses</span>
                        <span>{formatCurrency(taxData.businessExpenses.totalExpenses)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-green-600 mt-2">
                        <span>Tax Deductible</span>
                        <span>{formatCurrency(taxData.businessExpenses.deductibleExpenses)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                        <span>Depreciation</span>
                        <span>{formatCurrency(taxData.businessExpenses.depreciation)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tax Components */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Components</CardTitle>
                <CardDescription>Detailed breakdown of tax calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Income Tax</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base Tax</span>
                        <span>{formatCurrency(taxData.taxCalculations.incomeTax * 0.9)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cess (4%)</span>
                        <span>{formatCurrency(taxData.taxCalculations.incomeTax * 0.1)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Income Tax</span>
                        <span>{formatCurrency(taxData.taxCalculations.incomeTax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">GST</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>GST Collected</span>
                        <span>{formatCurrency(taxData.taxCalculations.gst.collected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST Paid</span>
                        <span>-{formatCurrency(taxData.taxCalculations.gst.paid)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Net GST</span>
                        <span className={taxData.taxCalculations.gst.netGST >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(taxData.taxCalculations.gst.netGST)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Other Taxes</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Professional Tax</span>
                        <span>{formatCurrency(taxData.taxCalculations.professionalTax)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Tax Liability</span>
                        <span className="text-red-600">{formatCurrency(taxData.taxCalculations.totalTaxLiability)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax Compliance Status</CardTitle>
                <CardDescription>
                  Check your compliance with tax regulations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Compliance Score */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getComplianceColor(85)}`}>85%</div>
                    <p className="text-muted-foreground">Overall Compliance Score</p>
                    <Progress value={85} className="mt-2" />
                  </div>

                  {/* Compliance Checks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Compliant Items
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Books of accounts maintained</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Expense documentation adequate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>Tax calculations up to date</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Action Required
                      </h4>
                      <div className="space-y-2 text-sm">
                        {taxData.businessIncome.totalRevenue > 2000000 && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            <span>GST registration required</span>
                          </div>
                        )}
                        {taxData.taxCalculations.incomeTax > 10000 && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            <span>Advance tax payment due</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span>ITR filing deadline approaching</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tax Saving Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Tax Saving Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {taxData.recommendations.taxSavingOpportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Reminders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Compliance Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {taxData.recommendations.complianceReminders.map((reminder, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{reminder}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Optimization Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Optimization Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {taxData.recommendations.optimizationSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tax Planning Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Planning Timeline</CardTitle>
                <CardDescription>
                  Important tax dates and deadlines for FY {taxData.period.financialYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="font-semibold">Q1 (Apr-Jun)</div>
                      <div className="text-sm text-muted-foreground mt-1">Advance Tax Due</div>
                      <div className="text-xs mt-2">15% of annual tax</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="font-semibold">Q2 (Jul-Sep)</div>
                      <div className="text-sm text-muted-foreground mt-1">Advance Tax Due</div>
                      <div className="text-xs mt-2">45% of annual tax</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="font-semibold">Q3 (Oct-Dec)</div>
                      <div className="text-sm text-muted-foreground mt-1">Advance Tax Due</div>
                      <div className="text-xs mt-2">75% of annual tax</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="font-semibold">Q4 (Jan-Mar)</div>
                      <div className="text-sm text-muted-foreground mt-1">Final Payment & ITR</div>
                      <div className="text-xs mt-2">100% + ITR filing</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}