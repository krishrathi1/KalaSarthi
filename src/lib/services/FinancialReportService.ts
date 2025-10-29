import { FirestoreService, COLLECTIONS, where, orderBy } from '@/lib/firestore';
import { ISalesEvent } from '@/lib/models/SalesEvent';
import { ISalesAggregate } from '@/lib/models/SalesAggregate';
import RealtimeFirestoreSyncService from './RealtimeFirestoreSyncService';
import RealtimeAggregationService from './RealtimeAggregationService';

// Report interfaces
export interface FinancialReportData {
  period: {
    startDate: Date;
    endDate: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    totalOrders: number;
    totalUnits: number;
    averageOrderValue: number;
    uniqueProducts: number;
    topSellingProduct: string;
  };
  salesBreakdown: {
    byChannel: Record<string, number>;
    byCategory: Record<string, number>;
    byProduct: Array<{
      productId: string;
      productName: string;
      revenue: number;
      units: number;
      orders: number;
    }>;
  };
  expenseBreakdown: {
    byCategory: Record<string, number>;
    taxDeductible: number;
    recurring: number;
  };
  trends: {
    revenueGrowth: number;
    orderGrowth: number;
    profitGrowth: number;
    monthlyTrend: Array<{
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }>;
  };
  metadata: {
    generatedAt: Date;
    dataSource: 'firestore' | 'cache' | 'mixed';
    isRealtime: boolean;
    artisanId: string;
  };
}

export interface ReportExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includeCharts: boolean;
  includeDetails: boolean;
  template?: 'standard' | 'detailed' | 'summary';
}

export interface ExpenseRecord {
  id?: string;
  artisanId: string;
  category: 'materials' | 'tools' | 'marketing' | 'shipping' | 'utilities' | 'rent' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: Date;
  receiptUrl?: string;
  vendor?: string;
  isRecurring: boolean;
  recurringPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  tags: string[];
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'other';
  businessPurpose: string;
  taxDeductible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Financial Report Service with real-time Firestore integration
 */
export class FinancialReportService {
  private static instance: FinancialReportService;
  private syncService: RealtimeFirestoreSyncService;
  private aggregationService: RealtimeAggregationService;

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
    this.aggregationService = RealtimeAggregationService.getInstance();
  }

  public static getInstance(): FinancialReportService {
    if (!FinancialReportService.instance) {
      FinancialReportService.instance = new FinancialReportService();
    }
    return FinancialReportService.instance;
  }

  /**
   * Generate comprehensive financial report with real-time Firestore data
   */
  public async generateFinancialReport(
    artisanId: string,
    startDate: Date,
    endDate: Date,
    useRealtime: boolean = true
  ): Promise<FinancialReportData> {
    console.log(`📊 Generating financial report for ${artisanId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    let salesData: ISalesEvent[] = [];
    let aggregates: ISalesAggregate[] = [];
    let expenses: ExpenseRecord[] = [];
    let dataSource: 'firestore' | 'cache' | 'mixed' = 'firestore';

    try {
      // Get sales data with real-time integration
      if (useRealtime) {
        console.log('🔄 Using real-time data for report generation');
        
        // Try to get cached real-time data first
        const cachedEvents = this.syncService.getCachedSalesEvents(artisanId);
        const filteredCachedEvents = cachedEvents.filter(event => {
          const eventDate = new Date(event.eventTimestamp);
          return eventDate >= startDate && eventDate <= endDate;
        });

        if (filteredCachedEvents.length > 0) {
          salesData = filteredCachedEvents;
          dataSource = 'cache';
        }

        // Get real-time aggregates
        const dashboardAggregates = await this.aggregationService.getDashboardAggregates(artisanId);
        aggregates = [
          ...dashboardAggregates.daily,
          ...dashboardAggregates.weekly,
          ...dashboardAggregates.monthly
        ].filter(agg => {
          return agg.periodStart >= startDate && agg.periodEnd <= endDate;
        });

        // Get cached expenses
        const cachedExpenses = this.syncService.getCachedExpenses(artisanId);
        expenses = cachedExpenses.filter(expense => {
          const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
          return expenseDate >= startDate && expenseDate <= endDate;
        });

        if (salesData.length === 0 || expenses.length === 0) {
          dataSource = 'mixed';
        }
      }

      // Fallback to direct Firestore queries if real-time data is insufficient
      if (salesData.length === 0) {
        console.log('📊 Fetching sales events from Firestore');
        salesData = await FirestoreService.query<ISalesEvent>(
          COLLECTIONS.SALES_EVENTS,
          [
            where('artisanId', '==', artisanId),
            where('eventTimestamp', '>=', startDate),
            where('eventTimestamp', '<=', endDate),
            orderBy('eventTimestamp', 'desc')
          ]
        );
      }

      if (aggregates.length === 0) {
        console.log('📊 Fetching aggregates from Firestore');
        aggregates = await FirestoreService.query<ISalesAggregate>(
          COLLECTIONS.SALES_AGGREGATES,
          [
            where('artisanId', '==', artisanId),
            where('periodStart', '>=', startDate),
            where('periodEnd', '<=', endDate),
            orderBy('periodStart', 'asc')
          ]
        );
      }

      if (expenses.length === 0) {
        console.log('📊 Fetching expenses from Firestore');
        expenses = await FirestoreService.query<ExpenseRecord>(
          COLLECTIONS.EXPENSES,
          [
            where('artisanId', '==', artisanId),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
          ]
        );
      }

      // Generate comprehensive report
      const report = await this.processReportData(
        artisanId,
        startDate,
        endDate,
        salesData,
        aggregates,
        expenses,
        dataSource,
        useRealtime
      );

      console.log(`✅ Financial report generated successfully with ${salesData.length} sales events and ${expenses.length} expenses`);
      return report;

    } catch (error) {
      console.error('❌ Error generating financial report:', error);
      throw new Error(`Failed to generate financial report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process raw data into structured report format
   */
  private async processReportData(
    artisanId: string,
    startDate: Date,
    endDate: Date,
    salesData: ISalesEvent[],
    aggregates: ISalesAggregate[],
    expenses: ExpenseRecord[],
    dataSource: 'firestore' | 'cache' | 'mixed',
    isRealtime: boolean
  ): Promise<FinancialReportData> {
    
    // Calculate summary metrics
    const totalRevenue = salesData.reduce((sum, event) => sum + event.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const grossProfit = totalRevenue - totalExpenses;
    const netRevenue = salesData.reduce((sum, event) => sum + event.netRevenue, 0);
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const totalOrders = salesData.filter(event => 
      event.eventType === 'order_paid' || event.eventType === 'order_fulfilled'
    ).length;
    const totalUnits = salesData.reduce((sum, event) => sum + event.quantity, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Product analysis
    const productMap = new Map<string, { revenue: number; units: number; orders: number; name: string }>();
    salesData.forEach(event => {
      const key = event.productId;
      const existing = productMap.get(key) || { revenue: 0, units: 0, orders: 0, name: event.productName };
      existing.revenue += event.totalAmount;
      existing.units += event.quantity;
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        existing.orders += 1;
      }
      productMap.set(key, existing);
    });

    const uniqueProducts = productMap.size;
    const topSellingProduct = Array.from(productMap.entries())
      .sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[1]?.name || '';

    // Sales breakdown
    const channelBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    
    salesData.forEach(event => {
      channelBreakdown[event.channel] = (channelBreakdown[event.channel] || 0) + event.totalAmount;
      categoryBreakdown[event.productCategory] = (categoryBreakdown[event.productCategory] || 0) + event.totalAmount;
    });

    const productBreakdown = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      revenue: data.revenue,
      units: data.units,
      orders: data.orders,
    })).sort((a, b) => b.revenue - a.revenue);

    // Expense breakdown
    const expenseCategoryBreakdown: Record<string, number> = {};
    let taxDeductibleAmount = 0;
    let recurringAmount = 0;

    expenses.forEach(expense => {
      expenseCategoryBreakdown[expense.category] = (expenseCategoryBreakdown[expense.category] || 0) + expense.amount;
      if (expense.taxDeductible) taxDeductibleAmount += expense.amount;
      if (expense.isRecurring) recurringAmount += expense.amount;
    });

    // Calculate trends (compare with previous period)
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime());

    const previousSalesData = await this.getPreviousPeriodData(artisanId, previousStartDate, previousEndDate);
    const previousRevenue = previousSalesData.reduce((sum, event) => sum + event.totalAmount, 0);
    const previousOrders = previousSalesData.filter(event => 
      event.eventType === 'order_paid' || event.eventType === 'order_fulfilled'
    ).length;

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
    
    // Calculate previous period profit for growth
    const previousExpenses = await this.getPreviousPeriodExpenses(artisanId, previousStartDate, previousEndDate);
    const previousTotalExpenses = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousProfit = previousRevenue - previousTotalExpenses;
    const profitGrowth = previousProfit !== 0 ? ((netProfit - previousProfit) / Math.abs(previousProfit)) * 100 : 0;

    // Monthly trend analysis
    const monthlyTrend = await this.calculateMonthlyTrend(artisanId, startDate, endDate, salesData, expenses);

    // Determine period type
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' = 'custom';
    if (daysDiff <= 1) periodType = 'daily';
    else if (daysDiff <= 7) periodType = 'weekly';
    else if (daysDiff <= 31) periodType = 'monthly';
    else if (daysDiff <= 93) periodType = 'quarterly';
    else if (daysDiff <= 366) periodType = 'yearly';

    return {
      period: {
        startDate,
        endDate,
        type: periodType,
      },
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        netProfit,
        profitMargin,
        totalOrders,
        totalUnits,
        averageOrderValue,
        uniqueProducts,
        topSellingProduct,
      },
      salesBreakdown: {
        byChannel: channelBreakdown,
        byCategory: categoryBreakdown,
        byProduct: productBreakdown,
      },
      expenseBreakdown: {
        byCategory: expenseCategoryBreakdown,
        taxDeductible: taxDeductibleAmount,
        recurring: recurringAmount,
      },
      trends: {
        revenueGrowth,
        orderGrowth,
        profitGrowth,
        monthlyTrend,
      },
      metadata: {
        generatedAt: new Date(),
        dataSource,
        isRealtime,
        artisanId,
      },
    };
  }

  /**
   * Get previous period data for trend calculation
   */
  private async getPreviousPeriodData(artisanId: string, startDate: Date, endDate: Date): Promise<ISalesEvent[]> {
    try {
      return await FirestoreService.query<ISalesEvent>(
        COLLECTIONS.SALES_EVENTS,
        [
          where('artisanId', '==', artisanId),
          where('eventTimestamp', '>=', startDate),
          where('eventTimestamp', '<=', endDate),
          orderBy('eventTimestamp', 'desc')
        ]
      );
    } catch (error) {
      console.warn('Could not fetch previous period sales data:', error);
      return [];
    }
  }

  /**
   * Get previous period expenses for trend calculation
   */
  private async getPreviousPeriodExpenses(artisanId: string, startDate: Date, endDate: Date): Promise<ExpenseRecord[]> {
    try {
      return await FirestoreService.query<ExpenseRecord>(
        COLLECTIONS.EXPENSES,
        [
          where('artisanId', '==', artisanId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        ]
      );
    } catch (error) {
      console.warn('Could not fetch previous period expenses:', error);
      return [];
    }
  }

  /**
   * Calculate monthly trend data
   */
  private async calculateMonthlyTrend(
    artisanId: string,
    startDate: Date,
    endDate: Date,
    salesData: ISalesEvent[],
    expenses: ExpenseRecord[]
  ): Promise<Array<{ month: string; revenue: number; expenses: number; profit: number }>> {
    const monthlyData = new Map<string, { revenue: number; expenses: number }>();

    // Process sales data by month
    salesData.forEach(event => {
      const eventDate = new Date(event.eventTimestamp);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { revenue: 0, expenses: 0 };
      existing.revenue += event.totalAmount;
      monthlyData.set(monthKey, existing);
    });

    // Process expenses by month
    expenses.forEach(expense => {
      const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { revenue: 0, expenses: 0 };
      existing.expenses += expense.amount;
      monthlyData.set(monthKey, existing);
    });

    // Convert to array and sort
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Export financial report in specified format
   */
  public async exportReport(
    reportData: FinancialReportData,
    options: ReportExportOptions
  ): Promise<{ success: boolean; data: string; filename: string; contentType: string }> {
    console.log(`📄 Exporting financial report in ${options.format} format`);

    try {
      switch (options.format) {
        case 'json':
          return this.exportAsJSON(reportData, options);
        case 'csv':
          return this.exportAsCSV(reportData, options);
        case 'pdf':
          return this.exportAsPDF(reportData, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('❌ Error exporting report:', error);
      throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export report as JSON
   */
  private exportAsJSON(reportData: FinancialReportData, options: ReportExportOptions) {
    const exportData = options.includeDetails ? reportData : {
      period: reportData.period,
      summary: reportData.summary,
      metadata: reportData.metadata,
    };

    const filename = `financial-report-${reportData.metadata.artisanId}-${reportData.period.startDate.toISOString().split('T')[0]}.json`;
    
    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
      filename,
      contentType: 'application/json',
    };
  }

  /**
   * Export report as CSV
   */
  private exportAsCSV(reportData: FinancialReportData, options: ReportExportOptions) {
    const csvRows: string[] = [];
    
    // Header information
    csvRows.push('Financial Report');
    csvRows.push(`Period,${reportData.period.startDate.toISOString().split('T')[0]} to ${reportData.period.endDate.toISOString().split('T')[0]}`);
    csvRows.push(`Generated,${reportData.metadata.generatedAt.toISOString()}`);
    csvRows.push(`Artisan ID,${reportData.metadata.artisanId}`);
    csvRows.push('');

    // Summary section
    csvRows.push('SUMMARY');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Revenue,${reportData.summary.totalRevenue}`);
    csvRows.push(`Total Expenses,${reportData.summary.totalExpenses}`);
    csvRows.push(`Gross Profit,${reportData.summary.grossProfit}`);
    csvRows.push(`Net Profit,${reportData.summary.netProfit}`);
    csvRows.push(`Profit Margin,${reportData.summary.profitMargin.toFixed(2)}%`);
    csvRows.push(`Total Orders,${reportData.summary.totalOrders}`);
    csvRows.push(`Total Units,${reportData.summary.totalUnits}`);
    csvRows.push(`Average Order Value,${reportData.summary.averageOrderValue}`);
    csvRows.push(`Unique Products,${reportData.summary.uniqueProducts}`);
    csvRows.push(`Top Selling Product,${reportData.summary.topSellingProduct}`);
    csvRows.push('');

    if (options.includeDetails) {
      // Sales by channel
      csvRows.push('SALES BY CHANNEL');
      csvRows.push('Channel,Revenue');
      Object.entries(reportData.salesBreakdown.byChannel).forEach(([channel, revenue]) => {
        csvRows.push(`${channel},${revenue}`);
      });
      csvRows.push('');

      // Sales by category
      csvRows.push('SALES BY CATEGORY');
      csvRows.push('Category,Revenue');
      Object.entries(reportData.salesBreakdown.byCategory).forEach(([category, revenue]) => {
        csvRows.push(`${category},${revenue}`);
      });
      csvRows.push('');

      // Top products
      csvRows.push('TOP PRODUCTS');
      csvRows.push('Product ID,Product Name,Revenue,Units,Orders');
      reportData.salesBreakdown.byProduct.slice(0, 10).forEach(product => {
        csvRows.push(`${product.productId},"${product.productName}",${product.revenue},${product.units},${product.orders}`);
      });
      csvRows.push('');

      // Expenses by category
      csvRows.push('EXPENSES BY CATEGORY');
      csvRows.push('Category,Amount');
      Object.entries(reportData.expenseBreakdown.byCategory).forEach(([category, amount]) => {
        csvRows.push(`${category},${amount}`);
      });
      csvRows.push('');

      // Monthly trend
      csvRows.push('MONTHLY TREND');
      csvRows.push('Month,Revenue,Expenses,Profit');
      reportData.trends.monthlyTrend.forEach(month => {
        csvRows.push(`${month.month},${month.revenue},${month.expenses},${month.profit}`);
      });
    }

    const filename = `financial-report-${reportData.metadata.artisanId}-${reportData.period.startDate.toISOString().split('T')[0]}.csv`;
    
    return {
      success: true,
      data: csvRows.join('\n'),
      filename,
      contentType: 'text/csv',
    };
  }

  /**
   * Export report as PDF (HTML-based for now, can be enhanced with proper PDF generation)
   */
  private exportAsPDF(reportData: FinancialReportData, options: ReportExportOptions) {
    // Generate HTML content for PDF conversion
    const htmlContent = this.generateHTMLReport(reportData, options);
    
    const filename = `financial-report-${reportData.metadata.artisanId}-${reportData.period.startDate.toISOString().split('T')[0]}.html`;
    
    return {
      success: true,
      data: htmlContent,
      filename,
      contentType: 'text/html',
    };
  }

  /**
   * Generate HTML content for PDF reports
   */
  private generateHTMLReport(reportData: FinancialReportData, options: ReportExportOptions): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Report - ${reportData.metadata.artisanId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .summary-card h3 { margin: 0 0 10px 0; color: #007bff; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: bold; color: #495057; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Report</h1>
        <p><strong>Period:</strong> ${formatDate(reportData.period.startDate)} - ${formatDate(reportData.period.endDate)}</p>
        <p><strong>Artisan ID:</strong> ${reportData.metadata.artisanId}</p>
        <p><strong>Generated:</strong> ${formatDate(reportData.metadata.generatedAt)}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total Revenue</h3>
            <div class="value">${formatCurrency(reportData.summary.totalRevenue)}</div>
        </div>
        <div class="summary-card">
            <h3>Total Expenses</h3>
            <div class="value">${formatCurrency(reportData.summary.totalExpenses)}</div>
        </div>
        <div class="summary-card">
            <h3>Net Profit</h3>
            <div class="value ${reportData.summary.netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(reportData.summary.netProfit)}</div>
        </div>
        <div class="summary-card">
            <h3>Profit Margin</h3>
            <div class="value ${reportData.summary.profitMargin >= 0 ? 'positive' : 'negative'}">${reportData.summary.profitMargin.toFixed(2)}%</div>
        </div>
        <div class="summary-card">
            <h3>Total Orders</h3>
            <div class="value">${reportData.summary.totalOrders}</div>
        </div>
        <div class="summary-card">
            <h3>Average Order Value</h3>
            <div class="value">${formatCurrency(reportData.summary.averageOrderValue)}</div>
        </div>
    </div>

    ${options.includeDetails ? `
    <div class="section">
        <h2>Sales Breakdown by Channel</h2>
        <table>
            <thead>
                <tr><th>Channel</th><th>Revenue</th><th>Percentage</th></tr>
            </thead>
            <tbody>
                ${Object.entries(reportData.salesBreakdown.byChannel).map(([channel, revenue]) => `
                    <tr>
                        <td>${channel}</td>
                        <td>${formatCurrency(revenue)}</td>
                        <td>${((revenue / reportData.summary.totalRevenue) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Top Products</h2>
        <table>
            <thead>
                <tr><th>Product Name</th><th>Revenue</th><th>Units</th><th>Orders</th></tr>
            </thead>
            <tbody>
                ${reportData.salesBreakdown.byProduct.slice(0, 10).map(product => `
                    <tr>
                        <td>${product.productName}</td>
                        <td>${formatCurrency(product.revenue)}</td>
                        <td>${product.units}</td>
                        <td>${product.orders}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Expense Breakdown</h2>
        <table>
            <thead>
                <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
            </thead>
            <tbody>
                ${Object.entries(reportData.expenseBreakdown.byCategory).map(([category, amount]) => `
                    <tr>
                        <td>${category}</td>
                        <td>${formatCurrency(amount)}</td>
                        <td>${((amount / reportData.summary.totalExpenses) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p><strong>Tax Deductible:</strong> ${formatCurrency(reportData.expenseBreakdown.taxDeductible)}</p>
        <p><strong>Recurring Expenses:</strong> ${formatCurrency(reportData.expenseBreakdown.recurring)}</p>
    </div>

    <div class="section">
        <h2>Growth Trends</h2>
        <table>
            <thead>
                <tr><th>Metric</th><th>Growth Rate</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Revenue Growth</td>
                    <td class="${reportData.trends.revenueGrowth >= 0 ? 'positive' : 'negative'}">${reportData.trends.revenueGrowth.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Order Growth</td>
                    <td class="${reportData.trends.orderGrowth >= 0 ? 'positive' : 'negative'}">${reportData.trends.orderGrowth.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Profit Growth</td>
                    <td class="${reportData.trends.profitGrowth >= 0 ? 'positive' : 'negative'}">${reportData.trends.profitGrowth.toFixed(2)}%</td>
                </tr>
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>Report generated on ${formatDate(reportData.metadata.generatedAt)} using ${reportData.metadata.isRealtime ? 'real-time' : 'historical'} data from ${reportData.metadata.dataSource}</p>
    </div>
</body>
</html>
    `;
  }
}

export default FinancialReportService;