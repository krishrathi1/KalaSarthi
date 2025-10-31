import { NextRequest, NextResponse } from 'next/server';
import { TaxCalculationService, TaxCalculationData } from '@/lib/services/TaxCalculationService';

interface TaxQueryParams {
  artisanId?: string;
  financialYear?: string;
  startDate?: string;
  endDate?: string;
  realtime?: 'true' | 'false';
  includeRecommendations?: 'true' | 'false';
  includeComparison?: 'true' | 'false';
}

interface TaxResponse {
  success: boolean;
  data?: TaxCalculationData;
  comparison?: {
    currentYear: TaxCalculationData;
    previousYear: TaxCalculationData;
    improvements: {
      taxSavings: number;
      efficiencyGain: number;
      complianceScore: number;
    };
  };
  metadata: {
    calculatedAt: Date;
    processingTime: number;
    dataPoints: {
      salesEvents: number;
      expenses: number;
      taxableTransactions: number;
    };
    financialYear: string;
  };
  error?: string;
}

/**
 * GET method for tax calculations with real-time Firestore data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const params: TaxQueryParams = {
      artisanId: searchParams.get('artisanId') || undefined,
      financialYear: searchParams.get('financialYear') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      realtime: (searchParams.get('realtime') as any) || 'true',
      includeRecommendations: (searchParams.get('includeRecommendations') as any) || 'true',
      includeComparison: (searchParams.get('includeComparison') as any) || 'false',
    };

    console.log('💰 Tax Calculations API called with params:', params);

    // Validate required parameters
    if (!params.artisanId) {
      return NextResponse.json(
        {
          success: false,
          metadata: {
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: { salesEvents: 0, expenses: 0, taxableTransactions: 0 },
            financialYear: 'unknown',
          },
          error: 'artisanId is required',
        } as TaxResponse,
        { status: 400 }
      );
    }

    // Initialize tax calculation service
    const taxService = TaxCalculationService.getInstance();

    // Determine financial year dates
    let startDate: Date;
    let endDate: Date;
    let financialYear: string;

    if (params.startDate && params.endDate) {
      startDate = new Date(params.startDate);
      endDate = new Date(params.endDate);
      financialYear = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
    } else if (params.financialYear) {
      const [startYear, endYear] = params.financialYear.split('-').map(Number);
      startDate = new Date(startYear, 3, 1); // April 1
      endDate = new Date(endYear, 2, 31); // March 31
      financialYear = params.financialYear;
    } else {
      // Default to current financial year
      const currentFY = taxService.getCurrentFinancialYear();
      startDate = currentFY.startDate;
      endDate = currentFY.endDate;
      financialYear = `${startDate.getFullYear()}-${endDate.getFullYear()}`;
    }

    // Calculate taxes with real-time data
    const taxData = await taxService.calculateTaxes(
      params.artisanId,
      startDate,
      endDate,
      params.realtime === 'true'
    );

    const processingTime = Date.now() - startTime;

    // Handle comparison with previous year if requested
    if (params.includeComparison === 'true') {
      const previousFY = taxService.getPreviousFinancialYear();
      const previousYearTaxData = await taxService.calculateTaxes(
        params.artisanId,
        previousFY.startDate,
        previousFY.endDate,
        params.realtime === 'true'
      );

      // Calculate improvements
      const taxSavings = previousYearTaxData.taxCalculations.totalTaxLiability - taxData.taxCalculations.totalTaxLiability;
      const efficiencyGain = taxData.taxCalculations.effectiveTaxRate - previousYearTaxData.taxCalculations.effectiveTaxRate;
      const complianceScore = calculateComplianceScore(taxData);

      const response: TaxResponse = {
        success: true,
        comparison: {
          currentYear: taxData,
          previousYear: previousYearTaxData,
          improvements: {
            taxSavings,
            efficiencyGain,
            complianceScore,
          },
        },
        metadata: {
          calculatedAt: new Date(),
          processingTime,
          dataPoints: {
            salesEvents: taxData.businessIncome.breakdown.salesRevenue > 0 ? 1 : 0, // Simplified
            expenses: Object.values(taxData.businessExpenses.breakdown).filter(v => v > 0).length,
            taxableTransactions: taxData.businessIncome.taxableIncome > 0 ? 1 : 0,
          },
          financialYear,
        },
      };

      console.log(`✅ Tax comparison calculated successfully in ${processingTime}ms`);
      return NextResponse.json(response);
    }

    // Return single year tax calculation
    const response: TaxResponse = {
      success: true,
      data: taxData,
      metadata: {
        calculatedAt: new Date(),
        processingTime,
        dataPoints: {
          salesEvents: taxData.businessIncome.breakdown.salesRevenue > 0 ? 1 : 0, // Simplified
          expenses: Object.values(taxData.businessExpenses.breakdown).filter(v => v > 0).length,
          taxableTransactions: taxData.businessIncome.taxableIncome > 0 ? 1 : 0,
        },
        financialYear,
      },
    };

    console.log(`✅ Tax calculations completed successfully in ${processingTime}ms`);
    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Tax Calculations API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        metadata: {
          calculatedAt: new Date(),
          processingTime,
          dataPoints: { salesEvents: 0, expenses: 0, taxableTransactions: 0 },
          financialYear: 'unknown',
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as TaxResponse,
      { status: 500 }
    );
  }
}

/**
 * POST method for advanced tax calculations and planning
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    console.log('💰 Tax Calculations API POST called with:', body);

    const { action, artisanId, taxConfig } = body;

    if (!artisanId) {
      return NextResponse.json(
        {
          success: false,
          metadata: {
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: { salesEvents: 0, expenses: 0, taxableTransactions: 0 },
            financialYear: 'unknown',
          },
          error: 'artisanId is required',
        } as TaxResponse,
        { status: 400 }
      );
    }

    const taxService = TaxCalculationService.getInstance();

    switch (action) {
      case 'calculate_projected_taxes':
        // Calculate projected taxes based on current performance
        const {
          projectionMonths = 12,
          includeRealtime = true,
          assumedGrowthRate = 0
        } = taxConfig || {};

        // Get current financial year data
        const currentFY = taxService.getCurrentFinancialYear();
        const currentTaxData = await taxService.calculateTaxes(
          artisanId,
          currentFY.startDate,
          currentFY.endDate,
          includeRealtime
        );

        // Calculate projection based on current performance and growth rate
        const monthsElapsed = Math.max(1, Math.ceil((new Date().getTime() - currentFY.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const monthlyRevenue = currentTaxData.businessIncome.totalRevenue / monthsElapsed;
        const monthlyExpenses = currentTaxData.businessExpenses.totalExpenses / monthsElapsed;

        const projectedRevenue = monthlyRevenue * projectionMonths * (1 + assumedGrowthRate / 100);
        const projectedExpenses = monthlyExpenses * projectionMonths * (1 + assumedGrowthRate / 100);
        const projectedProfit = projectedRevenue - projectedExpenses;

        // Simplified tax calculation for projection
        const projectedIncomeTax = Math.max(0, (projectedProfit - 250000) * 0.2); // Simplified
        const projectedGST = projectedRevenue * 0.18 / 1.18; // Simplified
        const projectedTotalTax = projectedIncomeTax + projectedGST;

        const projection = {
          period: `${projectionMonths} months projection`,
          projectedRevenue,
          projectedExpenses,
          projectedProfit,
          projectedTaxLiability: projectedTotalTax,
          projectedEffectiveTaxRate: projectedRevenue > 0 ? (projectedTotalTax / projectedRevenue) * 100 : 0,
          assumptions: {
            growthRate: assumedGrowthRate,
            basedOnMonths: monthsElapsed,
            monthlyRevenue,
            monthlyExpenses,
          },
          recommendations: [
            projectedTotalTax > currentTaxData.taxCalculations.totalTaxLiability * 1.5 
              ? 'Consider tax planning strategies for the projected increase in tax liability'
              : 'Tax liability projection looks manageable',
            projectedProfit > 1000000 
              ? 'Consider business structure optimization for higher income levels'
              : 'Current business structure appears suitable',
          ],
        };

        return NextResponse.json({
          success: true,
          data: {
            current: currentTaxData,
            projection,
          },
          metadata: {
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: {
              salesEvents: 1,
              expenses: Object.values(currentTaxData.businessExpenses.breakdown).filter(v => v > 0).length,
              taxableTransactions: 1,
            },
            financialYear: currentTaxData.period.financialYear,
          },
        } as TaxResponse);

      case 'optimize_tax_strategy':
        // Provide tax optimization suggestions
        const {
          targetTaxReduction = 10,
          includeCurrentData = true
        } = taxConfig || {};

        const currentFYForOptimization = taxService.getCurrentFinancialYear();
        const optimizationTaxData = await taxService.calculateTaxes(
          artisanId,
          currentFYForOptimization.startDate,
          currentFYForOptimization.endDate,
          includeCurrentData
        );

        const currentTaxLiability = optimizationTaxData.taxCalculations.totalTaxLiability;
        const targetReduction = (currentTaxLiability * targetTaxReduction) / 100;

        const optimizationStrategies = [
          {
            strategy: 'Increase Business Expenses',
            description: 'Document and claim more legitimate business expenses',
            potentialSaving: Math.min(targetReduction * 0.4, currentTaxLiability * 0.1),
            implementation: 'Track all business-related purchases, travel, and equipment costs',
            priority: 'High',
          },
          {
            strategy: 'Equipment Investment',
            description: 'Invest in business equipment to claim depreciation',
            potentialSaving: Math.min(targetReduction * 0.3, currentTaxLiability * 0.08),
            implementation: 'Purchase tools, machinery, or technology for business use',
            priority: 'Medium',
          },
          {
            strategy: 'Business Structure Optimization',
            description: 'Consider incorporating as a business entity',
            potentialSaving: Math.min(targetReduction * 0.3, currentTaxLiability * 0.15),
            implementation: 'Consult with a tax advisor about business incorporation',
            priority: optimizationTaxData.businessIncome.totalRevenue > 1000000 ? 'High' : 'Low',
          },
        ];

        const totalPotentialSaving = optimizationStrategies.reduce((sum, strategy) => sum + strategy.potentialSaving, 0);

        return NextResponse.json({
          success: true,
          data: {
            current: optimizationTaxData,
            optimization: {
              targetReduction: targetTaxReduction,
              targetSavingAmount: targetReduction,
              potentialSavingAmount: totalPotentialSaving,
              achievabilityScore: Math.min(100, (totalPotentialSaving / targetReduction) * 100),
              strategies: optimizationStrategies,
              timeline: '6-12 months for full implementation',
            },
          },
          metadata: {
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: {
              salesEvents: 1,
              expenses: Object.values(optimizationTaxData.businessExpenses.breakdown).filter(v => v > 0).length,
              taxableTransactions: 1,
            },
            financialYear: optimizationTaxData.period.financialYear,
          },
        } as TaxResponse);

      case 'compliance_check':
        // Check tax compliance status
        const complianceFY = taxService.getCurrentFinancialYear();
        const complianceTaxData = await taxService.calculateTaxes(
          artisanId,
          complianceFY.startDate,
          complianceFY.endDate,
          true
        );

        const complianceChecks = [
          {
            item: 'GST Registration',
            required: complianceTaxData.businessIncome.totalRevenue > 2000000,
            status: complianceTaxData.businessIncome.totalRevenue > 2000000 ? 'Required' : 'Not Required',
            action: complianceTaxData.businessIncome.totalRevenue > 2000000 ? 'Register for GST immediately' : 'Monitor revenue threshold',
          },
          {
            item: 'Income Tax Return Filing',
            required: complianceTaxData.businessIncome.taxableIncome > 250000,
            status: complianceTaxData.businessIncome.taxableIncome > 250000 ? 'Required' : 'Not Required',
            action: complianceTaxData.businessIncome.taxableIncome > 250000 ? 'File ITR before due date' : 'File ITR if any tax was deducted',
          },
          {
            item: 'Advance Tax Payment',
            required: complianceTaxData.taxCalculations.incomeTax > 10000,
            status: complianceTaxData.taxCalculations.incomeTax > 10000 ? 'Required' : 'Not Required',
            action: complianceTaxData.taxCalculations.incomeTax > 10000 ? 'Pay advance tax quarterly' : 'No advance tax required',
          },
          {
            item: 'Books of Accounts',
            required: complianceTaxData.businessIncome.totalRevenue > 250000,
            status: 'Recommended',
            action: 'Maintain proper books of accounts and receipts',
          },
        ];

        const complianceScore = calculateComplianceScore(complianceTaxData);

        return NextResponse.json({
          success: true,
          data: {
            taxData: complianceTaxData,
            compliance: {
              overallScore: complianceScore,
              checks: complianceChecks,
              criticalActions: complianceChecks.filter(check => check.required && check.status === 'Required'),
              recommendations: complianceTaxData.recommendations,
            },
          },
          metadata: {
            calculatedAt: new Date(),
            processingTime: Date.now() - startTime,
            dataPoints: {
              salesEvents: 1,
              expenses: Object.values(complianceTaxData.businessExpenses.breakdown).filter(v => v > 0).length,
              taxableTransactions: 1,
            },
            financialYear: complianceTaxData.period.financialYear,
          },
        } as TaxResponse);

      default:
        return NextResponse.json(
          {
            success: false,
            metadata: {
              calculatedAt: new Date(),
              processingTime: Date.now() - startTime,
              dataPoints: { salesEvents: 0, expenses: 0, taxableTransactions: 0 },
              financialYear: 'unknown',
            },
            error: `Unknown action: ${action}. Supported actions: calculate_projected_taxes, optimize_tax_strategy, compliance_check`,
          } as TaxResponse,
          { status: 400 }
        );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Tax Calculations API POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        metadata: {
          calculatedAt: new Date(),
          processingTime,
          dataPoints: { salesEvents: 0, expenses: 0, taxableTransactions: 0 },
          financialYear: 'unknown',
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as TaxResponse,
      { status: 500 }
    );
  }
}

/**
 * Calculate compliance score based on tax data
 */
function calculateComplianceScore(taxData: TaxCalculationData): number {
  let score = 100;

  // Deduct points for missing compliance requirements
  if (taxData.businessIncome.totalRevenue > 2000000) {
    // Should have GST registration
    score -= 20;
  }

  if (taxData.businessIncome.taxableIncome > 250000) {
    // Should file income tax return
    score -= 15;
  }

  if (taxData.taxCalculations.incomeTax > 10000) {
    // Should pay advance tax
    score -= 15;
  }

  // Deduct points for poor expense documentation
  if (taxData.businessExpenses.deductibleExpenses < taxData.businessExpenses.totalExpenses * 0.7) {
    score -= 10;
  }

  // Deduct points for high effective tax rate (indicates poor planning)
  if (taxData.taxCalculations.effectiveTaxRate > 25) {
    score -= 10;
  }

  return Math.max(0, score);
}