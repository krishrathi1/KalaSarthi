import { FirestoreService, COLLECTIONS, where, orderBy } from '@/lib/firestore';
import { ISalesEvent } from '@/lib/models/SalesEvent';
import RealtimeFirestoreSyncService from './RealtimeFirestoreSyncService';

// Tax calculation interfaces
export interface TaxCalculationData {
  period: {
    startDate: Date;
    endDate: Date;
    financialYear: string;
  };
  businessIncome: {
    totalRevenue: number;
    netRevenue: number;
    taxableIncome: number;
    exemptIncome: number;
    breakdown: {
      salesRevenue: number;
      serviceRevenue: number;
      otherIncome: number;
    };
  };
  businessExpenses: {
    totalExpenses: number;
    deductibleExpenses: number;
    nonDeductibleExpenses: number;
    breakdown: {
      materials: number;
      tools: number;
      marketing: number;
      shipping: number;
      utilities: number;
      rent: number;
      other: number;
    };
    depreciation: number;
  };
  taxCalculations: {
    grossProfit: number;
    netProfit: number;
    taxableProfit: number;
    incomeTax: number;
    gst: {
      collected: number;
      paid: number;
      netGST: number;
    };
    professionalTax: number;
    totalTaxLiability: number;
    effectiveTaxRate: number;
  };
  yearOverYear: {
    previousYear: {
      revenue: number;
      expenses: number;
      taxableIncome: number;
      taxPaid: number;
    };
    growth: {
      revenueGrowth: number;
      expenseGrowth: number;
      profitGrowth: number;
      taxGrowth: number;
    };
  };
  recommendations: {
    taxSavingOpportunities: string[];
    complianceReminders: string[];
    optimizationSuggestions: string[];
  };
  metadata: {
    calculatedAt: Date;
    dataSource: 'firestore' | 'cache' | 'mixed';
    isRealtime: boolean;
    artisanId: string;
    lastUpdated: Date;
  };
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

// Tax rates and thresholds (Indian tax system)
export const TAX_RATES = {
  INCOME_TAX: {
    SLABS: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 500000, rate: 5 },
      { min: 500000, max: 1000000, rate: 20 },
      { min: 1000000, max: Infinity, rate: 30 },
    ],
    SURCHARGE_THRESHOLD: 5000000,
    SURCHARGE_RATE: 10,
    CESS_RATE: 4, // Health and Education Cess
  },
  GST: {
    STANDARD_RATE: 18,
    REDUCED_RATE: 5,
    THRESHOLD: 2000000, // GST registration threshold
  },
  PROFESSIONAL_TAX: {
    ANNUAL_LIMIT: 2500,
  },
  DEPRECIATION: {
    TOOLS_EQUIPMENT: 15,
    FURNITURE: 10,
    COMPUTERS: 40,
    VEHICLES: 15,
  },
};

/**
 * Enhanced Tax Calculation Service with real-time Firestore integration
 */
export class TaxCalculationService {
  private static instance: TaxCalculationService;
  private syncService: RealtimeFirestoreSyncService;

  private constructor() {
    this.syncService = RealtimeFirestoreSyncService.getInstance();
  }

  public static getInstance(): TaxCalculationService {
    if (!TaxCalculationService.instance) {
      TaxCalculationService.instance = new TaxCalculationService();
    }
    return TaxCalculationService.instance;
  }

  /**
   * Calculate comprehensive tax information with real-time data
   */
  public async calculateTaxes(
    artisanId: string,
    financialYearStart: Date,
    financialYearEnd: Date,
    useRealtime: boolean = true
  ): Promise<TaxCalculationData> {
    console.log(`💰 Calculating taxes for ${artisanId} for FY ${financialYearStart.getFullYear()}-${financialYearEnd.getFullYear()}`);

    let salesData: ISalesEvent[] = [];
    let expenses: ExpenseRecord[] = [];
    let dataSource: 'firestore' | 'cache' | 'mixed' = 'firestore';

    try {
      // Get sales and expense data with real-time integration
      if (useRealtime) {
        console.log('🔄 Using real-time data for tax calculations');
        
        // Try to get cached real-time data first
        const cachedEvents = this.syncService.getCachedSalesEvents(artisanId);
        const filteredCachedEvents = cachedEvents.filter(event => {
          const eventDate = new Date(event.eventTimestamp);
          return eventDate >= financialYearStart && eventDate <= financialYearEnd;
        });

        if (filteredCachedEvents.length > 0) {
          salesData = filteredCachedEvents;
          dataSource = 'cache';
        }

        // Get cached expenses
        const cachedExpenses = this.syncService.getCachedExpenses(artisanId);
        expenses = cachedExpenses.filter(expense => {
          const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
          return expenseDate >= financialYearStart && expenseDate <= financialYearEnd;
        });

        if (salesData.length === 0 || expenses.length === 0) {
          dataSource = 'mixed';
        }
      }

      // Fallback to direct Firestore queries if real-time data is insufficient
      if (salesData.length === 0) {
        console.log('📊 Fetching sales events from Firestore for tax calculation');
        salesData = await FirestoreService.query<ISalesEvent>(
          COLLECTIONS.SALES_EVENTS,
          [
            where('artisanId', '==', artisanId),
            where('eventTimestamp', '>=', financialYearStart),
            where('eventTimestamp', '<=', financialYearEnd),
            orderBy('eventTimestamp', 'desc')
          ]
        );
      }

      if (expenses.length === 0) {
        console.log('📊 Fetching expenses from Firestore for tax calculation');
        expenses = await FirestoreService.query<ExpenseRecord>(
          COLLECTIONS.EXPENSES,
          [
            where('artisanId', '==', artisanId),
            where('date', '>=', financialYearStart),
            where('date', '<=', financialYearEnd),
            orderBy('date', 'desc')
          ]
        );
      }

      // Calculate tax data
      const taxData = await this.processTaxCalculations(
        artisanId,
        financialYearStart,
        financialYearEnd,
        salesData,
        expenses,
        dataSource,
        useRealtime
      );

      console.log(`✅ Tax calculations completed: Taxable Income: ₹${taxData.businessIncome.taxableIncome}, Tax Liability: ₹${taxData.taxCalculations.totalTaxLiability}`);
      return taxData;

    } catch (error) {
      console.error('❌ Error calculating taxes:', error);
      throw new Error(`Failed to calculate taxes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process raw data into tax calculation format
   */
  private async processTaxCalculations(
    artisanId: string,
    financialYearStart: Date,
    financialYearEnd: Date,
    salesData: ISalesEvent[],
    expenses: ExpenseRecord[],
    dataSource: 'firestore' | 'cache' | 'mixed',
    isRealtime: boolean
  ): Promise<TaxCalculationData> {
    
    // Calculate business income
    const totalRevenue = salesData.reduce((sum, event) => sum + event.totalAmount, 0);
    const netRevenue = salesData.reduce((sum, event) => sum + event.netRevenue, 0);
    
    // Categorize revenue
    const salesRevenue = salesData
      .filter(event => event.eventType === 'order_paid' || event.eventType === 'order_fulfilled')
      .reduce((sum, event) => sum + event.totalAmount, 0);
    const serviceRevenue = salesData
      .filter(event => event.productCategory === 'service')
      .reduce((sum, event) => sum + event.totalAmount, 0);
    const otherIncome = totalRevenue - salesRevenue - serviceRevenue;

    // Calculate business expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const deductibleExpenses = expenses
      .filter(expense => expense.taxDeductible)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const nonDeductibleExpenses = totalExpenses - deductibleExpenses;

    // Expense breakdown
    const expenseBreakdown = {
      materials: expenses.filter(e => e.category === 'materials').reduce((sum, e) => sum + e.amount, 0),
      tools: expenses.filter(e => e.category === 'tools').reduce((sum, e) => sum + e.amount, 0),
      marketing: expenses.filter(e => e.category === 'marketing').reduce((sum, e) => sum + e.amount, 0),
      shipping: expenses.filter(e => e.category === 'shipping').reduce((sum, e) => sum + e.amount, 0),
      utilities: expenses.filter(e => e.category === 'utilities').reduce((sum, e) => sum + e.amount, 0),
      rent: expenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0),
      other: expenses.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0),
    };

    // Calculate depreciation (simplified)
    const depreciation = this.calculateDepreciation(expenses);

    // Tax calculations
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = netRevenue - deductibleExpenses;
    const taxableProfit = Math.max(0, netProfit - depreciation);
    
    // Income tax calculation
    const incomeTax = this.calculateIncomeTax(taxableProfit);
    
    // GST calculations
    const gstCollected = this.calculateGSTCollected(salesData);
    const gstPaid = this.calculateGSTPaid(expenses);
    const netGST = gstCollected - gstPaid;
    
    // Professional tax (simplified)
    const professionalTax = Math.min(TAX_RATES.PROFESSIONAL_TAX.ANNUAL_LIMIT, taxableProfit * 0.001);
    
    const totalTaxLiability = incomeTax + Math.max(0, netGST) + professionalTax;
    const effectiveTaxRate = totalRevenue > 0 ? (totalTaxLiability / totalRevenue) * 100 : 0;

    // Year-over-year comparison
    const previousYearData = await this.getPreviousYearData(artisanId, financialYearStart);
    const yearOverYear = this.calculateYearOverYearGrowth(
      { revenue: totalRevenue, expenses: totalExpenses, taxableIncome: taxableProfit, taxPaid: totalTaxLiability },
      previousYearData
    );

    // Generate recommendations
    const recommendations = this.generateTaxRecommendations(
      totalRevenue,
      deductibleExpenses,
      taxableProfit,
      totalTaxLiability,
      expenses
    );

    const financialYear = `${financialYearStart.getFullYear()}-${financialYearEnd.getFullYear()}`;

    return {
      period: {
        startDate: financialYearStart,
        endDate: financialYearEnd,
        financialYear,
      },
      businessIncome: {
        totalRevenue,
        netRevenue,
        taxableIncome: taxableProfit,
        exemptIncome: 0, // Simplified - could be enhanced
        breakdown: {
          salesRevenue,
          serviceRevenue,
          otherIncome,
        },
      },
      businessExpenses: {
        totalExpenses,
        deductibleExpenses,
        nonDeductibleExpenses,
        breakdown: expenseBreakdown,
        depreciation,
      },
      taxCalculations: {
        grossProfit,
        netProfit,
        taxableProfit,
        incomeTax,
        gst: {
          collected: gstCollected,
          paid: gstPaid,
          netGST,
        },
        professionalTax,
        totalTaxLiability,
        effectiveTaxRate,
      },
      yearOverYear,
      recommendations,
      metadata: {
        calculatedAt: new Date(),
        dataSource,
        isRealtime,
        artisanId,
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Calculate income tax based on Indian tax slabs
   */
  private calculateIncomeTax(taxableIncome: number): number {
    let tax = 0;
    let remainingIncome = taxableIncome;

    for (const slab of TAX_RATES.INCOME_TAX.SLABS) {
      if (remainingIncome <= 0) break;

      const taxableInThisSlab = Math.min(remainingIncome, slab.max - slab.min);
      tax += (taxableInThisSlab * slab.rate) / 100;
      remainingIncome -= taxableInThisSlab;
    }

    // Add surcharge if applicable
    if (taxableIncome > TAX_RATES.INCOME_TAX.SURCHARGE_THRESHOLD) {
      tax += (tax * TAX_RATES.INCOME_TAX.SURCHARGE_RATE) / 100;
    }

    // Add Health and Education Cess
    tax += (tax * TAX_RATES.INCOME_TAX.CESS_RATE) / 100;

    return Math.round(tax);
  }

  /**
   * Calculate GST collected on sales
   */
  private calculateGSTCollected(salesData: ISalesEvent[]): number {
    // Simplified GST calculation - assumes standard rate
    const gstApplicableSales = salesData
      .filter(event => event.totalAmount > 0)
      .reduce((sum, event) => sum + event.totalAmount, 0);
    
    return Math.round((gstApplicableSales * TAX_RATES.GST.STANDARD_RATE) / (100 + TAX_RATES.GST.STANDARD_RATE));
  }

  /**
   * Calculate GST paid on purchases
   */
  private calculateGSTPaid(expenses: ExpenseRecord[]): number {
    // Simplified GST calculation on business expenses
    const gstApplicableExpenses = expenses
      .filter(expense => expense.category !== 'rent' && expense.amount > 0)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return Math.round((gstApplicableExpenses * TAX_RATES.GST.STANDARD_RATE) / (100 + TAX_RATES.GST.STANDARD_RATE));
  }

  /**
   * Calculate depreciation on assets
   */
  private calculateDepreciation(expenses: ExpenseRecord[]): number {
    let totalDepreciation = 0;

    // Tools and equipment
    const toolsExpenses = expenses
      .filter(expense => expense.category === 'tools')
      .reduce((sum, expense) => sum + expense.amount, 0);
    totalDepreciation += (toolsExpenses * TAX_RATES.DEPRECIATION.TOOLS_EQUIPMENT) / 100;

    // Other depreciable assets (simplified)
    const otherAssets = expenses
      .filter(expense => expense.tags.includes('asset') || expense.tags.includes('equipment'))
      .reduce((sum, expense) => sum + expense.amount, 0);
    totalDepreciation += (otherAssets * TAX_RATES.DEPRECIATION.FURNITURE) / 100;

    return Math.round(totalDepreciation);
  }

  /**
   * Get previous year data for comparison
   */
  private async getPreviousYearData(artisanId: string, currentYearStart: Date): Promise<{
    revenue: number;
    expenses: number;
    taxableIncome: number;
    taxPaid: number;
  }> {
    try {
      const previousYearStart = new Date(currentYearStart);
      previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
      const previousYearEnd = new Date(currentYearStart);
      previousYearEnd.setDate(previousYearEnd.getDate() - 1);

      // Get previous year sales data
      const previousSalesData = await FirestoreService.query<ISalesEvent>(
        COLLECTIONS.SALES_EVENTS,
        [
          where('artisanId', '==', artisanId),
          where('eventTimestamp', '>=', previousYearStart),
          where('eventTimestamp', '<=', previousYearEnd),
          orderBy('eventTimestamp', 'desc')
        ]
      );

      // Get previous year expenses
      const previousExpenses = await FirestoreService.query<ExpenseRecord>(
        COLLECTIONS.EXPENSES,
        [
          where('artisanId', '==', artisanId),
          where('date', '>=', previousYearStart),
          where('date', '<=', previousYearEnd),
          orderBy('date', 'desc')
        ]
      );

      const revenue = previousSalesData.reduce((sum, event) => sum + event.totalAmount, 0);
      const expenses = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const deductibleExpenses = previousExpenses
        .filter(expense => expense.taxDeductible)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const netRevenue = previousSalesData.reduce((sum, event) => sum + event.netRevenue, 0);
      const taxableIncome = Math.max(0, netRevenue - deductibleExpenses);
      const taxPaid = this.calculateIncomeTax(taxableIncome);

      return { revenue, expenses, taxableIncome, taxPaid };

    } catch (error) {
      console.warn('Could not fetch previous year data:', error);
      return { revenue: 0, expenses: 0, taxableIncome: 0, taxPaid: 0 };
    }
  }

  /**
   * Calculate year-over-year growth metrics
   */
  private calculateYearOverYearGrowth(
    current: { revenue: number; expenses: number; taxableIncome: number; taxPaid: number },
    previous: { revenue: number; expenses: number; taxableIncome: number; taxPaid: number }
  ) {
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      previousYear: previous,
      growth: {
        revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
        expenseGrowth: calculateGrowth(current.expenses, previous.expenses),
        profitGrowth: calculateGrowth(current.taxableIncome, previous.taxableIncome),
        taxGrowth: calculateGrowth(current.taxPaid, previous.taxPaid),
      },
    };
  }

  /**
   * Generate tax optimization recommendations
   */
  private generateTaxRecommendations(
    totalRevenue: number,
    deductibleExpenses: number,
    taxableProfit: number,
    totalTaxLiability: number,
    expenses: ExpenseRecord[]
  ): {
    taxSavingOpportunities: string[];
    complianceReminders: string[];
    optimizationSuggestions: string[];
  } {
    const taxSavingOpportunities: string[] = [];
    const complianceReminders: string[] = [];
    const optimizationSuggestions: string[] = [];

    // Tax saving opportunities
    if (deductibleExpenses < totalRevenue * 0.3) {
      taxSavingOpportunities.push('Consider increasing business expense documentation to maximize deductions');
    }

    if (expenses.filter(e => e.category === 'tools').length === 0) {
      taxSavingOpportunities.push('Invest in business tools and equipment to claim depreciation benefits');
    }

    if (totalRevenue > TAX_RATES.GST.THRESHOLD && taxableProfit > 500000) {
      taxSavingOpportunities.push('Consider setting up a business structure for better tax efficiency');
    }

    // Compliance reminders
    if (totalRevenue > TAX_RATES.GST.THRESHOLD) {
      complianceReminders.push('GST registration is mandatory - ensure timely filing of returns');
    }

    if (taxableProfit > 250000) {
      complianceReminders.push('Advance tax payments may be required - consult with a tax advisor');
    }

    complianceReminders.push('Maintain proper books of accounts and receipts for all business expenses');

    // Optimization suggestions
    if (totalTaxLiability > totalRevenue * 0.15) {
      optimizationSuggestions.push('High tax rate detected - consider tax planning strategies');
    }

    if (expenses.filter(e => e.receiptUrl).length < expenses.length * 0.5) {
      optimizationSuggestions.push('Upload receipts for better expense tracking and tax compliance');
    }

    optimizationSuggestions.push('Regular tax planning can help optimize your overall tax liability');

    return {
      taxSavingOpportunities,
      complianceReminders,
      optimizationSuggestions,
    };
  }

  /**
   * Get current financial year dates
   */
  public getCurrentFinancialYear(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Indian financial year: April 1 to March 31
    let fyStart: Date;
    let fyEnd: Date;

    if (now.getMonth() >= 3) { // April onwards
      fyStart = new Date(currentYear, 3, 1); // April 1 current year
      fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
    } else { // January to March
      fyStart = new Date(currentYear - 1, 3, 1); // April 1 previous year
      fyEnd = new Date(currentYear, 2, 31); // March 31 current year
    }

    return { startDate: fyStart, endDate: fyEnd };
  }

  /**
   * Get previous financial year dates
   */
  public getPreviousFinancialYear(): { startDate: Date; endDate: Date } {
    const current = this.getCurrentFinancialYear();
    const startDate = new Date(current.startDate);
    const endDate = new Date(current.endDate);
    
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() - 1);

    return { startDate, endDate };
  }
}

export default TaxCalculationService;