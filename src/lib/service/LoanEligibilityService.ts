import connectDB from '../mongodb';
import { SalesAggregate } from '../models/SalesAggregate';
import LoanApplication from '../models/LoanApplication';

interface FinancialHistory {
  totalRevenue: number;
  averageMonthlyRevenue: number;
  revenueTrend: 'increasing' | 'decreasing' | 'stable';
  revenueVolatility: number;
  monthsOfData: number;
  bestMonth: { month: string; revenue: number };
  worstMonth: { month: string; revenue: number };
  consistentRevenue: boolean;
}

interface EligibilityScore {
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  maxLoanAmount: number;
  recommendedLoanAmount: number;
  interestRateModifier: number; // -2 to +5 percentage points
  factors: {
    revenueStability: { score: number; weight: number; reason: string };
    revenueTrend: { score: number; weight: number; reason: string };
    businessExperience: { score: number; weight: number; reason: string };
    debtToIncomeRatio: { score: number; weight: number; reason: string };
    marketPosition: { score: number; weight: number; reason: string };
  };
  recommendations: string[];
  warnings: string[];
}

export class LoanEligibilityService {
  /**
   * Calculate loan eligibility score based on financial history
   */
  static async calculateEligibilityScore(
    userId: string,
    requestedAmount: number,
    loanTenure: number
  ): Promise<{ success: boolean; score?: EligibilityScore; error?: string }> {
    try {
      await connectDB();

      // Get financial history from sales aggregates
      const financialHistory = await this.getFinancialHistory(userId);

      if (!financialHistory || financialHistory.monthsOfData < 3) {
        return {
          success: false,
          error: 'Insufficient financial history. At least 3 months of data required.'
        };
      }

      // Get business information from recent loan applications
      const businessInfo = await this.getBusinessInfo(userId);

      // Calculate individual factor scores
      const factors = await this.calculateFactorScores(financialHistory, businessInfo, requestedAmount);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(factors);

      // Determine risk level and loan parameters
      const riskLevel = this.determineRiskLevel(overallScore);
      const maxLoanAmount = this.calculateMaxLoanAmount(financialHistory, overallScore);
      const recommendedLoanAmount = Math.min(requestedAmount, maxLoanAmount);
      const interestRateModifier = this.calculateInterestRateModifier(overallScore, riskLevel);

      // Generate recommendations and warnings
      const recommendations = this.generateRecommendations(factors, financialHistory);
      const warnings = this.generateWarnings(factors, financialHistory, requestedAmount);

      const score: EligibilityScore = {
        overallScore,
        riskLevel,
        maxLoanAmount,
        recommendedLoanAmount,
        interestRateModifier,
        factors,
        recommendations,
        warnings
      };

      return {
        success: true,
        score
      };

    } catch (error: any) {
      console.error('Eligibility scoring error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get financial history from sales aggregates
   */
  private static async getFinancialHistory(userId: string): Promise<FinancialHistory | null> {
    try {
      // Get monthly revenue data for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyAggregates = await SalesAggregate.find({
        artisanId: userId,
        period: 'monthly',
        periodStart: { $gte: twelveMonthsAgo }
      }).sort({ periodStart: -1 });

      if (monthlyAggregates.length === 0) {
        return null;
      }

      // Calculate metrics
      const revenues = monthlyAggregates.map(agg => agg.totalRevenue);
      const totalRevenue = revenues.reduce((sum, rev) => sum + rev, 0);
      const averageMonthlyRevenue = totalRevenue / revenues.length;

      // Calculate trend
      const recentMonths = revenues.slice(0, 6); // Last 6 months
      const earlierMonths = revenues.slice(6, 12); // Previous 6 months

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentMonths.length >= 3 && earlierMonths.length >= 3) {
        const recentAvg = recentMonths.reduce((sum, rev) => sum + rev, 0) / recentMonths.length;
        const earlierAvg = earlierMonths.reduce((sum, rev) => sum + rev, 0) / earlierMonths.length;

        const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
        if (changePercent > 10) trend = 'increasing';
        else if (changePercent < -10) trend = 'decreasing';
      }

      // Calculate volatility (coefficient of variation)
      const mean = averageMonthlyRevenue;
      const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length;
      const volatility = Math.sqrt(variance) / mean;

      // Find best and worst months
      const maxRevenue = Math.max(...revenues);
      const minRevenue = Math.min(...revenues);
      const bestMonthIndex = revenues.indexOf(maxRevenue);
      const worstMonthIndex = revenues.indexOf(minRevenue);

      const bestMonth = {
        month: monthlyAggregates[bestMonthIndex].periodKey,
        revenue: maxRevenue
      };
      const worstMonth = {
        month: monthlyAggregates[worstMonthIndex].periodKey,
        revenue: minRevenue
      };

      // Check consistency (months with revenue > 80% of average)
      const consistentMonths = revenues.filter(rev => rev > averageMonthlyRevenue * 0.8).length;
      const consistentRevenue = consistentMonths / revenues.length > 0.7;

      return {
        totalRevenue,
        averageMonthlyRevenue,
        revenueTrend: trend,
        revenueVolatility: volatility,
        monthsOfData: revenues.length,
        bestMonth,
        worstMonth,
        consistentRevenue
      };

    } catch (error) {
      console.error('Error getting financial history:', error);
      return null;
    }
  }

  /**
   * Get business information from loan applications
   */
  private static async getBusinessInfo(userId: string): Promise<any> {
    try {
      const recentApplication = await LoanApplication.findOne({ userId })
        .sort({ createdAt: -1 });

      if (recentApplication) {
        return {
          businessType: recentApplication.businessInfo.businessType,
          annualTurnover: recentApplication.businessInfo.annualTurnover,
          businessExperience: recentApplication.businessInfo.businessExperience,
          gstNumber: recentApplication.businessInfo.gstNumber
        };
      }

      return {
        businessType: 'unknown',
        annualTurnover: 0,
        businessExperience: 0,
        gstNumber: null
      };

    } catch (error) {
      console.error('Error getting business info:', error);
      return {
        businessType: 'unknown',
        annualTurnover: 0,
        businessExperience: 0,
        gstNumber: null
      };
    }
  }

  /**
   * Calculate individual factor scores
   */
  private static async calculateFactorScores(
    financialHistory: FinancialHistory,
    businessInfo: any,
    requestedAmount: number
  ): Promise<EligibilityScore['factors']> {
    // Revenue stability score (0-100)
    const revenueStabilityScore = Math.max(0, Math.min(100,
      (financialHistory.consistentRevenue ? 80 : 40) +
      (financialHistory.revenueVolatility < 0.3 ? 20 : financialHistory.revenueVolatility < 0.5 ? 10 : 0)
    ));

    // Revenue trend score (0-100)
    const trendScore = financialHistory.revenueTrend === 'increasing' ? 100 :
                      financialHistory.revenueTrend === 'stable' ? 70 : 30;

    // Business experience score (0-100)
    const experienceScore = Math.min(100, businessInfo.businessExperience * 10);

    // Debt-to-income ratio score (0-100)
    const monthlyLoanPayment = requestedAmount / 12; // Simplified monthly payment
    const dtiRatio = monthlyLoanPayment / financialHistory.averageMonthlyRevenue;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 100));

    // Market position score (0-100) - based on revenue compared to industry averages
    const marketScore = financialHistory.averageMonthlyRevenue > 50000 ? 90 :
                       financialHistory.averageMonthlyRevenue > 25000 ? 70 :
                       financialHistory.averageMonthlyRevenue > 10000 ? 50 : 30;

    return {
      revenueStability: {
        score: revenueStabilityScore,
        weight: 0.3,
        reason: `Revenue stability: ${revenueStabilityScore}/100 (${financialHistory.consistentRevenue ? 'Consistent' : 'Inconsistent'} revenue pattern)`
      },
      revenueTrend: {
        score: trendScore,
        weight: 0.25,
        reason: `Revenue trend: ${trendScore}/100 (${financialHistory.revenueTrend} over last 6 months)`
      },
      businessExperience: {
        score: experienceScore,
        weight: 0.2,
        reason: `Business experience: ${experienceScore}/100 (${businessInfo.businessExperience} years)`
      },
      debtToIncomeRatio: {
        score: dtiScore,
        weight: 0.15,
        reason: `Debt-to-income ratio: ${dtiScore}/100 (${(dtiRatio * 100).toFixed(1)}% ratio)`
      },
      marketPosition: {
        score: marketScore,
        weight: 0.1,
        reason: `Market position: ${marketScore}/100 (₹${financialHistory.averageMonthlyRevenue.toLocaleString()} avg monthly revenue)`
      }
    };
  }

  /**
   * Calculate overall eligibility score
   */
  private static calculateOverallScore(factors: EligibilityScore['factors']): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [key, factor] of Object.entries(factors)) {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Determine risk level based on overall score
   */
  private static determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'very_high';
  }

  /**
   * Calculate maximum loan amount based on financial history
   */
  private static calculateMaxLoanAmount(financialHistory: FinancialHistory, score: number): number {
    const baseAmount = financialHistory.averageMonthlyRevenue * 6; // 6 months of revenue
    const scoreMultiplier = score / 100;
    return Math.round(baseAmount * scoreMultiplier);
  }

  /**
   * Calculate interest rate modifier
   */
  private static calculateInterestRateModifier(score: number, riskLevel: string): number {
    switch (riskLevel) {
      case 'low': return -1;
      case 'medium': return 0.5;
      case 'high': return 2;
      case 'very_high': return 4;
      default: return 0;
    }
  }

  /**
   * Generate recommendations based on factors
   */
  private static generateRecommendations(
    factors: EligibilityScore['factors'],
    financialHistory: FinancialHistory
  ): string[] {
    const recommendations = [];

    if (factors.revenueStability.score < 60) {
      recommendations.push('Consider diversifying revenue streams to improve stability');
    }

    if (factors.revenueTrend.score < 50) {
      recommendations.push('Focus on marketing and sales strategies to improve revenue growth');
    }

    if (factors.businessExperience.score < 50) {
      recommendations.push('Consider business training programs to build expertise');
    }

    if (factors.debtToIncomeRatio.score < 70) {
      recommendations.push('Consider lower loan amount or longer tenure to improve debt-to-income ratio');
    }

    if (financialHistory.monthsOfData < 6) {
      recommendations.push('Build more financial history (aim for 6+ months of consistent data)');
    }

    return recommendations;
  }

  /**
   * Generate warnings based on factors
   */
  private static generateWarnings(
    factors: EligibilityScore['factors'],
    financialHistory: FinancialHistory,
    requestedAmount: number
  ): string[] {
    const warnings = [];

    if (factors.revenueStability.score < 40) {
      warnings.push('High revenue volatility detected - loan approval may be challenging');
    }

    if (factors.revenueTrend.score < 30) {
      warnings.push('Declining revenue trend - additional documentation may be required');
    }

    if (factors.debtToIncomeRatio.score < 50) {
      warnings.push('High debt-to-income ratio - consider lower loan amount');
    }

    const maxAmount = this.calculateMaxLoanAmount(financialHistory, factors.revenueStability.score);
    if (requestedAmount > maxAmount) {
      warnings.push(`Requested amount exceeds recommended maximum of ₹${maxAmount.toLocaleString()}`);
    }

    return warnings;
  }

  /**
   * Get eligibility score summary for dashboard
   */
  static async getEligibilitySummary(userId: string): Promise<any> {
    try {
      await connectDB();

      const financialHistory = await this.getFinancialHistory(userId);

      if (!financialHistory) {
        return {
          eligible: false,
          reason: 'No financial history available',
          score: 0
        };
      }

      const mockScore = Math.min(100, Math.max(0,
        40 + // Base score
        (financialHistory.consistentRevenue ? 20 : 0) +
        (financialHistory.revenueTrend === 'increasing' ? 15 : 0) +
        Math.min(25, financialHistory.monthsOfData * 2)
      ));

      return {
        eligible: mockScore >= 50,
        score: mockScore,
        maxLoanAmount: financialHistory.averageMonthlyRevenue * 4,
        factors: {
          dataQuality: financialHistory.monthsOfData >= 6,
          revenueStability: financialHistory.consistentRevenue,
          trend: financialHistory.revenueTrend
        }
      };

    } catch (error) {
      console.error('Error getting eligibility summary:', error);
      return {
        eligible: false,
        reason: 'Error calculating eligibility',
        score: 0
      };
    }
  }
}