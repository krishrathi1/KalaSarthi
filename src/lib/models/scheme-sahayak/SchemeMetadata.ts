/**
 * Scheme Metadata System for AI-Powered Scheme Sahayak v2.0
 * Manages scheme metadata, analytics, and performance tracking
 */

import { GovernmentScheme } from '../../types/scheme-sahayak';

/**
 * Scheme performance metrics
 */
export interface SchemePerformanceMetrics {
  schemeId: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  successRate: number; // 0-100
  averageProcessingTime: number; // days
  averageApprovalAmount: number;
  popularityScore: number; // 0-100
  userRating: number; // 0-5
  lastUpdated: Date;
  monthlyStats: Array<{
    month: string; // YYYY-MM
    applications: number;
    approvals: number;
    rejections: number;
    avgProcessingTime: number;
  }>;
}

/**
 * Scheme analytics data
 */
export interface SchemeAnalytics {
  schemeId: string;
  viewCount: number;
  applicationStartCount: number;
  applicationCompleteCount: number;
  conversionRate: number; // application complete / view
  bounceRate: number; // users who viewed but didn't start application
  averageTimeOnPage: number; // seconds
  topExitPoints: string[]; // application steps where users exit most
  userDemographics: {
    ageGroups: Record<string, number>; // "18-25": count
    businessTypes: Record<string, number>;
    states: Record<string, number>;
    incomeRanges: Record<string, number>;
  };
  feedbackSummary: {
    averageRating: number;
    totalFeedback: number;
    sentimentScore: number; // -1 to 1
    commonComplaints: string[];
    commonPraises: string[];
  };
  lastUpdated: Date;
}

/**
 * Scheme recommendation factors
 */
export interface SchemeRecommendationFactors {
  schemeId: string;
  eligibilityScore: number; // 0-100
  benefitScore: number; // 0-100
  accessibilityScore: number; // 0-100
  timelinessScore: number; // 0-100
  competitionScore: number; // 0-100 (lower is better)
  documentComplexityScore: number; // 0-100 (lower is better)
  historicalSuccessScore: number; // 0-100
  personalizedFactors: Record<string, number>;
  lastCalculated: Date;
}

/**
 * Scheme metadata manager class
 */
export class SchemeMetadataManager {
  /**
   * Calculate scheme popularity score based on various factors
   */
  static calculatePopularityScore(metrics: SchemePerformanceMetrics, analytics: SchemeAnalytics): number {
    let score = 0;

    // Application volume factor (40% weight)
    const applicationVolumeFactor = Math.min(100, (metrics.totalApplications / 1000) * 100);
    score += applicationVolumeFactor * 0.4;

    // Success rate factor (30% weight)
    score += metrics.successRate * 0.3;

    // User engagement factor (20% weight)
    const engagementFactor = Math.min(100, (analytics.viewCount / 10000) * 100);
    score += engagementFactor * 0.2;

    // User rating factor (10% weight)
    const ratingFactor = (analytics.feedbackSummary.averageRating / 5) * 100;
    score += ratingFactor * 0.1;

    return Math.round(Math.min(100, score));
  }

  /**
   * Calculate scheme success rate with confidence interval
   */
  static calculateSuccessRate(metrics: SchemePerformanceMetrics): {
    rate: number;
    confidenceInterval: [number, number];
    sampleSize: number;
  } {
    const total = metrics.totalApplications;
    const approved = metrics.approvedApplications;
    
    if (total === 0) {
      return { rate: 0, confidenceInterval: [0, 0], sampleSize: 0 };
    }

    const rate = (approved / total) * 100;
    
    // Calculate 95% confidence interval using Wilson score interval
    const z = 1.96; // 95% confidence
    const p = approved / total;
    const n = total;
    
    const denominator = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / denominator;
    const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    
    const lowerBound = Math.max(0, (centre - margin) * 100);
    const upperBound = Math.min(100, (centre + margin) * 100);

    return {
      rate: Math.round(rate * 100) / 100,
      confidenceInterval: [Math.round(lowerBound * 100) / 100, Math.round(upperBound * 100) / 100],
      sampleSize: total
    };
  }

  /**
   * Generate AI features for machine learning models
   */
  static generateMLFeatures(
    scheme: GovernmentScheme,
    metrics: SchemePerformanceMetrics,
    analytics: SchemeAnalytics
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // Basic scheme features
    features.category_loan = scheme.category === 'loan' ? 1 : 0;
    features.category_grant = scheme.category === 'grant' ? 1 : 0;
    features.category_subsidy = scheme.category === 'subsidy' ? 1 : 0;
    features.category_training = scheme.category === 'training' ? 1 : 0;
    features.category_insurance = scheme.category === 'insurance' ? 1 : 0;

    features.gov_level_central = scheme.provider.level === 'central' ? 1 : 0;
    features.gov_level_state = scheme.provider.level === 'state' ? 1 : 0;
    features.gov_level_district = scheme.provider.level === 'district' ? 1 : 0;
    features.gov_level_local = scheme.provider.level === 'local' ? 1 : 0;

    // Amount features
    features.min_amount = scheme.benefits.amount.min;
    features.max_amount = scheme.benefits.amount.max;
    features.amount_range = scheme.benefits.amount.max - scheme.benefits.amount.min;
    features.log_min_amount = Math.log10(Math.max(1, scheme.benefits.amount.min));
    features.log_max_amount = Math.log10(Math.max(1, scheme.benefits.amount.max));

    // Processing time features
    features.min_processing_time = scheme.application.processingTime.min;
    features.max_processing_time = scheme.application.processingTime.max;
    features.avg_processing_time = (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;

    // Eligibility features
    features.has_age_restriction = (scheme.eligibility.age.min !== undefined || scheme.eligibility.age.max !== undefined) ? 1 : 0;
    features.has_income_restriction = (scheme.eligibility.income.min !== undefined || scheme.eligibility.income.max !== undefined) ? 1 : 0;
    features.business_type_count = scheme.eligibility.businessType.length;
    features.state_count = scheme.eligibility.location.states?.length || 0;
    features.district_count = scheme.eligibility.location.districts?.length || 0;

    // Application features
    features.online_application = scheme.application.onlineApplication ? 1 : 0;
    features.required_documents_count = scheme.application.requiredDocuments.length;
    features.application_steps_count = scheme.application.applicationSteps.length;
    features.has_deadline = scheme.application.deadline ? 1 : 0;

    // Deadline urgency
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.ceil(
        (scheme.application.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      features.days_until_deadline = Math.max(0, daysUntilDeadline);
      features.deadline_urgency = daysUntilDeadline <= 30 ? 1 : 0;
    } else {
      features.days_until_deadline = 9999; // No deadline
      features.deadline_urgency = 0;
    }

    // Performance metrics features
    features.total_applications = metrics.totalApplications;
    features.success_rate = metrics.successRate;
    features.avg_processing_time_actual = metrics.averageProcessingTime;
    features.popularity_score = metrics.popularityScore;
    features.user_rating = metrics.userRating;
    features.log_total_applications = Math.log10(Math.max(1, metrics.totalApplications));

    // Analytics features
    features.view_count = analytics.viewCount;
    features.conversion_rate = analytics.conversionRate;
    features.bounce_rate = analytics.bounceRate;
    features.avg_time_on_page = analytics.averageTimeOnPage;
    features.feedback_sentiment = analytics.feedbackSummary.sentimentScore;
    features.log_view_count = Math.log10(Math.max(1, analytics.viewCount));

    // Temporal features
    const now = new Date();
    const schemeAge = Math.ceil((now.getTime() - scheme.metadata.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    features.scheme_age_days = schemeAge;
    features.is_new_scheme = schemeAge <= 30 ? 1 : 0;

    // Seasonal features
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    features.month = month;
    features.quarter = quarter;
    features.is_financial_year_end = (month >= 1 && month <= 3) ? 1 : 0; // Indian financial year

    // Competition features (based on similar schemes)
    features.competition_level = this.calculateCompetitionLevel(scheme, metrics);

    return features;
  }

  /**
   * Calculate competition level for a scheme
   */
  private static calculateCompetitionLevel(scheme: GovernmentScheme, metrics: SchemePerformanceMetrics): number {
    // This would typically involve comparing with similar schemes
    // For now, we'll use a simple heuristic based on application volume and success rate
    
    let competition = 0;
    
    // High application volume indicates high competition
    if (metrics.totalApplications > 1000) competition += 0.4;
    else if (metrics.totalApplications > 500) competition += 0.3;
    else if (metrics.totalApplications > 100) competition += 0.2;
    else competition += 0.1;
    
    // Low success rate indicates high competition
    if (metrics.successRate < 30) competition += 0.4;
    else if (metrics.successRate < 50) competition += 0.3;
    else if (metrics.successRate < 70) competition += 0.2;
    else competition += 0.1;
    
    // High benefit amount attracts more competition
    if (scheme.benefits.amount.max > 1000000) competition += 0.2; // > 10 lakh
    else if (scheme.benefits.amount.max > 500000) competition += 0.15; // > 5 lakh
    else if (scheme.benefits.amount.max > 100000) competition += 0.1; // > 1 lakh
    
    return Math.min(1, competition);
  }

  /**
   * Update scheme metadata based on new data
   */
  static updateSchemeMetadata(
    scheme: GovernmentScheme,
    newMetrics: Partial<SchemePerformanceMetrics>,
    newAnalytics: Partial<SchemeAnalytics>
  ): GovernmentScheme {
    const updatedScheme = { ...scheme };
    
    // Update basic metadata
    if (newMetrics.successRate !== undefined) {
      updatedScheme.metadata.successRate = newMetrics.successRate;
    }
    
    if (newMetrics.averageProcessingTime !== undefined) {
      updatedScheme.metadata.averageProcessingTime = newMetrics.averageProcessingTime;
    }
    
    // Calculate and update popularity
    if (newMetrics && newAnalytics) {
      const mockMetrics: SchemePerformanceMetrics = {
        schemeId: scheme.id,
        totalApplications: newMetrics.totalApplications || 0,
        approvedApplications: newMetrics.approvedApplications || 0,
        rejectedApplications: newMetrics.rejectedApplications || 0,
        pendingApplications: newMetrics.pendingApplications || 0,
        successRate: newMetrics.successRate || 0,
        averageProcessingTime: newMetrics.averageProcessingTime || 60,
        averageApprovalAmount: newMetrics.averageApprovalAmount || 0,
        popularityScore: 0,
        userRating: newMetrics.userRating || 0,
        lastUpdated: new Date(),
        monthlyStats: []
      };
      
      const mockAnalytics: SchemeAnalytics = {
        schemeId: scheme.id,
        viewCount: newAnalytics.viewCount || 0,
        applicationStartCount: newAnalytics.applicationStartCount || 0,
        applicationCompleteCount: newAnalytics.applicationCompleteCount || 0,
        conversionRate: newAnalytics.conversionRate || 0,
        bounceRate: newAnalytics.bounceRate || 0,
        averageTimeOnPage: newAnalytics.averageTimeOnPage || 0,
        topExitPoints: [],
        userDemographics: {
          ageGroups: {},
          businessTypes: {},
          states: {},
          incomeRanges: {}
        },
        feedbackSummary: {
          averageRating: newAnalytics.feedbackSummary?.averageRating || 0,
          totalFeedback: 0,
          sentimentScore: 0,
          commonComplaints: [],
          commonPraises: []
        },
        lastUpdated: new Date()
      };
      
      updatedScheme.metadata.popularity = this.calculatePopularityScore(mockMetrics, mockAnalytics);
    }
    
    // Update AI features
    updatedScheme.metadata.aiFeatures = this.generateMLFeatures(
      updatedScheme,
      newMetrics as SchemePerformanceMetrics,
      newAnalytics as SchemeAnalytics
    );
    
    updatedScheme.metadata.lastUpdated = new Date();
    
    return updatedScheme;
  }

  /**
   * Generate scheme insights based on metadata
   */
  static generateSchemeInsights(
    scheme: GovernmentScheme,
    metrics: SchemePerformanceMetrics,
    analytics: SchemeAnalytics
  ): {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    recommendations: string[];
  } {
    const insights = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      threats: [] as string[],
      recommendations: [] as string[]
    };

    // Analyze strengths
    if (metrics.successRate > 70) {
      insights.strengths.push(`High success rate of ${metrics.successRate}%`);
    }
    
    if (metrics.averageProcessingTime < scheme.application.processingTime.max) {
      insights.strengths.push(`Faster than expected processing time (${metrics.averageProcessingTime} days)`);
    }
    
    if (analytics.conversionRate > 0.3) {
      insights.strengths.push(`Good conversion rate of ${(analytics.conversionRate * 100).toFixed(1)}%`);
    }
    
    if (analytics.feedbackSummary.averageRating > 4) {
      insights.strengths.push(`Excellent user rating of ${analytics.feedbackSummary.averageRating}/5`);
    }

    // Analyze weaknesses
    if (metrics.successRate < 40) {
      insights.weaknesses.push(`Low success rate of ${metrics.successRate}%`);
      insights.recommendations.push('Review eligibility criteria and application process to improve success rate');
    }
    
    if (analytics.bounceRate > 0.7) {
      insights.weaknesses.push(`High bounce rate of ${(analytics.bounceRate * 100).toFixed(1)}%`);
      insights.recommendations.push('Improve scheme description and initial user experience');
    }
    
    if (scheme.application.requiredDocuments.length > 10) {
      insights.weaknesses.push(`High document requirement (${scheme.application.requiredDocuments.length} documents)`);
      insights.recommendations.push('Consider reducing document requirements or providing document assistance');
    }

    // Analyze opportunities
    if (analytics.viewCount > analytics.applicationStartCount * 3) {
      insights.opportunities.push('High interest but low application starts - opportunity to improve conversion');
      insights.recommendations.push('Simplify application process and provide better guidance');
    }
    
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length < 10) {
      insights.opportunities.push('Opportunity to expand to more states');
    }
    
    if (metrics.totalApplications < 100) {
      insights.opportunities.push('Low awareness - opportunity for better marketing');
      insights.recommendations.push('Increase marketing efforts and awareness campaigns');
    }

    // Analyze threats
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.ceil(
        (scheme.application.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 30) {
        insights.threats.push(`Application deadline approaching in ${daysUntilDeadline} days`);
        insights.recommendations.push('Urgent promotion needed due to approaching deadline');
      }
    }
    
    if (metrics.successRate < 30 && metrics.totalApplications > 500) {
      insights.threats.push('High competition with low success rate may discourage future applicants');
    }

    return insights;
  }

  /**
   * Calculate scheme recommendation score for an artisan
   */
  static calculateRecommendationScore(
    scheme: GovernmentScheme,
    artisanProfile: {
      age?: number;
      monthlyIncome?: number;
      businessType?: string;
      state?: string;
      experienceYears?: number;
      previousApplications?: number;
    },
    metrics: SchemePerformanceMetrics
  ): {
    score: number; // 0-100
    factors: {
      eligibility: number;
      benefit: number;
      accessibility: number;
      timeliness: number;
      competition: number;
      personalFit: number;
    };
    explanation: string[];
  } {
    const factors = {
      eligibility: 0,
      benefit: 0,
      accessibility: 0,
      timeliness: 0,
      competition: 0,
      personalFit: 0
    };
    
    const explanation: string[] = [];

    // Eligibility factor (25% weight)
    let eligibilityScore = 100;
    
    if (artisanProfile.age !== undefined) {
      if (scheme.eligibility.age.min !== undefined && artisanProfile.age < scheme.eligibility.age.min) {
        eligibilityScore = 0;
        explanation.push(`Age requirement not met (minimum ${scheme.eligibility.age.min})`);
      } else if (scheme.eligibility.age.max !== undefined && artisanProfile.age > scheme.eligibility.age.max) {
        eligibilityScore = 0;
        explanation.push(`Age requirement not met (maximum ${scheme.eligibility.age.max})`);
      }
    }
    
    if (artisanProfile.monthlyIncome !== undefined && eligibilityScore > 0) {
      if (scheme.eligibility.income.min !== undefined && artisanProfile.monthlyIncome < scheme.eligibility.income.min) {
        eligibilityScore = 0;
        explanation.push(`Income requirement not met (minimum ₹${scheme.eligibility.income.min})`);
      } else if (scheme.eligibility.income.max !== undefined && artisanProfile.monthlyIncome > scheme.eligibility.income.max) {
        eligibilityScore = 0;
        explanation.push(`Income requirement not met (maximum ₹${scheme.eligibility.income.max})`);
      }
    }
    
    factors.eligibility = eligibilityScore;

    // Benefit factor (20% weight)
    const maxBenefit = scheme.benefits.amount.max;
    if (maxBenefit > 1000000) factors.benefit = 100;
    else if (maxBenefit > 500000) factors.benefit = 80;
    else if (maxBenefit > 100000) factors.benefit = 60;
    else if (maxBenefit > 50000) factors.benefit = 40;
    else factors.benefit = 20;

    // Accessibility factor (15% weight)
    factors.accessibility = scheme.application.onlineApplication ? 80 : 60;
    factors.accessibility += Math.max(0, 20 - scheme.application.requiredDocuments.length * 2);
    factors.accessibility = Math.min(100, factors.accessibility);

    // Timeliness factor (15% weight)
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.ceil(
        (scheme.application.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 0) factors.timeliness = 0;
      else if (daysUntilDeadline <= 7) factors.timeliness = 30;
      else if (daysUntilDeadline <= 30) factors.timeliness = 70;
      else factors.timeliness = 100;
    } else {
      factors.timeliness = 100; // No deadline pressure
    }

    // Competition factor (15% weight) - lower competition is better
    const competitionScore = 100 - (metrics.totalApplications / 100); // Rough heuristic
    factors.competition = Math.max(0, Math.min(100, competitionScore));

    // Personal fit factor (10% weight)
    factors.personalFit = 50; // Base score
    
    if (artisanProfile.businessType && scheme.eligibility.businessType.includes(artisanProfile.businessType)) {
      factors.personalFit += 30;
      explanation.push('Business type matches scheme requirements');
    }
    
    if (artisanProfile.state && scheme.eligibility.location.states?.includes(artisanProfile.state)) {
      factors.personalFit += 20;
      explanation.push('Location eligible for this scheme');
    }
    
    factors.personalFit = Math.min(100, factors.personalFit);

    // Calculate weighted score
    const score = (
      factors.eligibility * 0.25 +
      factors.benefit * 0.20 +
      factors.accessibility * 0.15 +
      factors.timeliness * 0.15 +
      factors.competition * 0.15 +
      factors.personalFit * 0.10
    );

    // Add explanations for high-scoring factors
    if (factors.benefit > 80) explanation.push(`High benefit amount up to ₹${maxBenefit.toLocaleString()}`);
    if (factors.accessibility > 80) explanation.push('Easy online application process');
    if (metrics.successRate > 70) explanation.push(`High success rate of ${metrics.successRate}%`);

    return {
      score: Math.round(score),
      factors,
      explanation
    };
  }
}

/**
 * Scheme indexing utilities for search optimization
 */
export class SchemeIndexing {
  /**
   * Generate search keywords for a scheme
   */
  static generateSearchKeywords(scheme: GovernmentScheme): string[] {
    const keywords = new Set<string>();
    
    // Basic information
    scheme.title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
    
    scheme.description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 3) keywords.add(word);
    });
    
    // Category and subcategory
    keywords.add(scheme.category);
    if (scheme.subCategory) keywords.add(scheme.subCategory);
    
    // Provider information
    scheme.provider.name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
    
    scheme.provider.department.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
    
    // Business types
    scheme.eligibility.businessType.forEach(type => keywords.add(type));
    
    // Locations
    scheme.eligibility.location.states?.forEach(state => {
      keywords.add(state.toLowerCase().replace(/\s+/g, '_'));
    });
    
    // Benefit type
    keywords.add(scheme.benefits.type);
    
    // Other criteria
    scheme.eligibility.otherCriteria.forEach(criteria => {
      criteria.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    });
    
    return Array.from(keywords);
  }

  /**
   * Generate scheme tags for categorization
   */
  static generateSchemeTags(scheme: GovernmentScheme): string[] {
    const tags = new Set<string>();
    
    // Category tags
    tags.add(`category:${scheme.category}`);
    if (scheme.subCategory) tags.add(`subcategory:${scheme.subCategory}`);
    
    // Government level tags
    tags.add(`level:${scheme.provider.level}`);
    
    // Benefit amount tags
    const maxAmount = scheme.benefits.amount.max;
    if (maxAmount >= 1000000) tags.add('amount:high');
    else if (maxAmount >= 100000) tags.add('amount:medium');
    else tags.add('amount:low');
    
    // Processing time tags
    const avgProcessingTime = (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;
    if (avgProcessingTime <= 30) tags.add('processing:fast');
    else if (avgProcessingTime <= 60) tags.add('processing:medium');
    else tags.add('processing:slow');
    
    // Application type tags
    if (scheme.application.onlineApplication) tags.add('application:online');
    else tags.add('application:offline');
    
    // Document requirement tags
    const docCount = scheme.application.requiredDocuments.length;
    if (docCount <= 3) tags.add('documents:minimal');
    else if (docCount <= 7) tags.add('documents:moderate');
    else tags.add('documents:extensive');
    
    // Deadline tags
    if (scheme.application.deadline) {
      const daysUntilDeadline = Math.ceil(
        (scheme.application.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 30) tags.add('deadline:urgent');
      else if (daysUntilDeadline <= 90) tags.add('deadline:soon');
      else tags.add('deadline:distant');
    } else {
      tags.add('deadline:none');
    }
    
    // Business type tags
    scheme.eligibility.businessType.forEach(type => tags.add(`business:${type}`));
    
    // Location tags
    scheme.eligibility.location.states?.forEach(state => {
      tags.add(`state:${state.toLowerCase().replace(/\s+/g, '_')}`);
    });
    
    return Array.from(tags);
  }
}