/**
 * Government Scheme Data Model for AI-Powered Scheme Sahayak v2.0
 * Implements comprehensive scheme data structure with validation and categorization
 */

import { GovernmentScheme, ContactInfo, ApplicationStep } from '../../types/scheme-sahayak';

// ============================================================================
// SCHEME CATEGORIZATION SYSTEM
// ============================================================================

/**
 * Comprehensive scheme categories with subcategories
 */
export const SCHEME_CATEGORIES = {
  loan: {
    name: 'Loan',
    description: 'Financial assistance through loans',
    subcategories: {
      business_loan: 'Business Development Loan',
      equipment_loan: 'Equipment Purchase Loan',
      working_capital: 'Working Capital Loan',
      startup_loan: 'Startup Funding Loan',
      mudra_loan: 'MUDRA Loan',
      msme_loan: 'MSME Development Loan'
    }
  },
  grant: {
    name: 'Grant',
    description: 'Direct financial assistance without repayment',
    subcategories: {
      startup_grant: 'Startup Grant',
      innovation_grant: 'Innovation Grant',
      women_entrepreneur: 'Women Entrepreneur Grant',
      sc_st_grant: 'SC/ST Development Grant',
      rural_development: 'Rural Development Grant',
      technology_grant: 'Technology Adoption Grant'
    }
  },
  subsidy: {
    name: 'Subsidy',
    description: 'Partial financial assistance for specific activities',
    subcategories: {
      equipment_subsidy: 'Equipment Purchase Subsidy',
      training_subsidy: 'Training and Skill Development Subsidy',
      marketing_subsidy: 'Marketing and Promotion Subsidy',
      export_subsidy: 'Export Promotion Subsidy',
      technology_subsidy: 'Technology Upgrade Subsidy',
      interest_subsidy: 'Interest Rate Subsidy'
    }
  },
  training: {
    name: 'Training',
    description: 'Skill development and capacity building programs',
    subcategories: {
      skill_development: 'Skill Development Training',
      entrepreneurship: 'Entrepreneurship Development',
      technical_training: 'Technical Skills Training',
      digital_literacy: 'Digital Literacy Training',
      financial_literacy: 'Financial Literacy Training',
      export_training: 'Export Readiness Training'
    }
  },
  insurance: {
    name: 'Insurance',
    description: 'Risk protection and insurance schemes',
    subcategories: {
      life_insurance: 'Life Insurance Scheme',
      health_insurance: 'Health Insurance Scheme',
      business_insurance: 'Business Protection Insurance',
      crop_insurance: 'Crop Insurance Scheme',
      equipment_insurance: 'Equipment Insurance',
      export_insurance: 'Export Credit Insurance'
    }
  }
} as const;

/**
 * Business type categories for eligibility matching
 */
export const BUSINESS_TYPES = {
  manufacturing: {
    name: 'Manufacturing',
    subcategories: [
      'Textile Manufacturing',
      'Food Processing',
      'Handicrafts',
      'Leather Goods',
      'Metal Works',
      'Wood Works',
      'Pottery and Ceramics',
      'Jewelry Making',
      'Electronics Assembly',
      'Chemical Products'
    ]
  },
  services: {
    name: 'Services',
    subcategories: [
      'Repair Services',
      'Beauty and Wellness',
      'Transportation',
      'Catering Services',
      'Cleaning Services',
      'IT Services',
      'Consulting',
      'Education Services',
      'Healthcare Services',
      'Financial Services'
    ]
  },
  trading: {
    name: 'Trading',
    subcategories: [
      'Retail Trading',
      'Wholesale Trading',
      'Online Trading',
      'Export Trading',
      'Agricultural Trading',
      'Handicraft Trading',
      'Textile Trading',
      'Electronics Trading',
      'Food Trading',
      'Raw Material Trading'
    ]
  },
  agriculture: {
    name: 'Agriculture',
    subcategories: [
      'Crop Production',
      'Horticulture',
      'Animal Husbandry',
      'Poultry Farming',
      'Dairy Farming',
      'Fisheries',
      'Beekeeping',
      'Organic Farming',
      'Floriculture',
      'Sericulture'
    ]
  }
} as const;

/**
 * Government levels and their typical departments
 */
export const GOVERNMENT_LEVELS = {
  central: {
    name: 'Central Government',
    departments: [
      'Ministry of MSME',
      'Ministry of Skill Development',
      'Ministry of Rural Development',
      'Ministry of Agriculture',
      'Ministry of Commerce and Industry',
      'Ministry of Women and Child Development',
      'Ministry of Social Justice and Empowerment',
      'Ministry of Tribal Affairs',
      'Ministry of Labour and Employment',
      'Ministry of Finance'
    ]
  },
  state: {
    name: 'State Government',
    departments: [
      'State Industries Department',
      'State Rural Development Department',
      'State Agriculture Department',
      'State Skill Development Department',
      'State Women Development Department',
      'State SC/ST Development Department',
      'State Labour Department',
      'State Finance Department',
      'State Planning Department',
      'State Cooperative Department'
    ]
  },
  district: {
    name: 'District Administration',
    departments: [
      'District Industries Centre',
      'District Rural Development Agency',
      'District Collector Office',
      'District Employment Office',
      'District Agriculture Office',
      'District Cooperative Office',
      'District Welfare Office',
      'District Planning Office'
    ]
  },
  local: {
    name: 'Local Bodies',
    departments: [
      'Municipal Corporation',
      'Panchayat Raj Institution',
      'Block Development Office',
      'Tehsil Office',
      'Village Panchayat',
      'Urban Local Body',
      'Development Block',
      'Gram Panchayat'
    ]
  }
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Comprehensive validation for Government Scheme data
 */
export class GovernmentSchemeValidator {
  /**
   * Validate complete scheme data
   */
  static validate(scheme: Partial<GovernmentScheme>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic required fields
    if (!scheme.title || scheme.title.trim().length === 0) {
      errors.push('Scheme title is required');
    } else if (scheme.title.length < 10) {
      warnings.push('Scheme title is very short, consider adding more descriptive text');
    }

    if (!scheme.description || scheme.description.trim().length === 0) {
      errors.push('Scheme description is required');
    } else if (scheme.description.length < 50) {
      warnings.push('Scheme description is short, consider adding more details');
    }

    // Category validation
    if (!scheme.category) {
      errors.push('Scheme category is required');
    } else if (!Object.keys(SCHEME_CATEGORIES).includes(scheme.category)) {
      errors.push(`Invalid scheme category: ${scheme.category}`);
    }

    // Provider validation
    if (!scheme.provider) {
      errors.push('Scheme provider information is required');
    } else {
      const providerErrors = this.validateProvider(scheme.provider);
      errors.push(...providerErrors);
    }

    // Eligibility validation
    if (!scheme.eligibility) {
      errors.push('Eligibility criteria is required');
    } else {
      const eligibilityErrors = this.validateEligibility(scheme.eligibility);
      errors.push(...eligibilityErrors);
    }

    // Benefits validation
    if (!scheme.benefits) {
      errors.push('Benefits information is required');
    } else {
      const benefitsErrors = this.validateBenefits(scheme.benefits);
      errors.push(...benefitsErrors);
    }

    // Application validation
    if (!scheme.application) {
      errors.push('Application information is required');
    } else {
      const applicationErrors = this.validateApplication(scheme.application);
      errors.push(...applicationErrors);
    }

    // Status validation
    if (!scheme.status) {
      errors.push('Scheme status is required');
    } else if (!['active', 'inactive', 'suspended', 'closed'].includes(scheme.status)) {
      errors.push(`Invalid scheme status: ${scheme.status}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate provider information
   */
  private static validateProvider(provider: any): string[] {
    const errors: string[] = [];

    if (!provider.name || provider.name.trim().length === 0) {
      errors.push('Provider name is required');
    }

    if (!provider.department || provider.department.trim().length === 0) {
      errors.push('Provider department is required');
    }

    if (!provider.level) {
      errors.push('Provider level is required');
    } else if (!Object.keys(GOVERNMENT_LEVELS).includes(provider.level)) {
      errors.push(`Invalid provider level: ${provider.level}`);
    }

    if (provider.website && !this.isValidUrl(provider.website)) {
      errors.push('Invalid provider website URL');
    }

    return errors;
  }

  /**
   * Validate eligibility criteria
   */
  private static validateEligibility(eligibility: any): string[] {
    const errors: string[] = [];

    // Age validation
    if (eligibility.age) {
      if (eligibility.age.min && (eligibility.age.min < 0 || eligibility.age.min > 100)) {
        errors.push('Invalid minimum age');
      }
      if (eligibility.age.max && (eligibility.age.max < 0 || eligibility.age.max > 100)) {
        errors.push('Invalid maximum age');
      }
      if (eligibility.age.min && eligibility.age.max && eligibility.age.min > eligibility.age.max) {
        errors.push('Minimum age cannot be greater than maximum age');
      }
    }

    // Income validation
    if (eligibility.income) {
      if (eligibility.income.min && eligibility.income.min < 0) {
        errors.push('Minimum income cannot be negative');
      }
      if (eligibility.income.max && eligibility.income.max < 0) {
        errors.push('Maximum income cannot be negative');
      }
      if (eligibility.income.min && eligibility.income.max && eligibility.income.min > eligibility.income.max) {
        errors.push('Minimum income cannot be greater than maximum income');
      }
    }

    // Business type validation
    if (!eligibility.businessType || !Array.isArray(eligibility.businessType) || eligibility.businessType.length === 0) {
      errors.push('At least one business type must be specified');
    }

    // Location validation
    if (!eligibility.location) {
      errors.push('Location eligibility is required');
    }

    return errors;
  }

  /**
   * Validate benefits information
   */
  private static validateBenefits(benefits: any): string[] {
    const errors: string[] = [];

    if (!benefits.amount) {
      errors.push('Benefit amount information is required');
    } else {
      if (benefits.amount.min < 0) {
        errors.push('Minimum benefit amount cannot be negative');
      }
      if (benefits.amount.max < 0) {
        errors.push('Maximum benefit amount cannot be negative');
      }
      if (benefits.amount.min > benefits.amount.max) {
        errors.push('Minimum benefit amount cannot be greater than maximum amount');
      }
      if (!benefits.amount.currency) {
        errors.push('Currency is required for benefit amount');
      }
    }

    if (!benefits.type) {
      errors.push('Benefit type is required');
    } else if (!['loan', 'grant', 'subsidy', 'training', 'insurance'].includes(benefits.type)) {
      errors.push(`Invalid benefit type: ${benefits.type}`);
    }

    if (benefits.interestRate && (benefits.interestRate < 0 || benefits.interestRate > 100)) {
      errors.push('Interest rate must be between 0 and 100');
    }

    if (!benefits.coverageDetails || benefits.coverageDetails.trim().length === 0) {
      errors.push('Coverage details are required');
    }

    return errors;
  }

  /**
   * Validate application information
   */
  private static validateApplication(application: any): string[] {
    const errors: string[] = [];

    if (typeof application.onlineApplication !== 'boolean') {
      errors.push('Online application availability must be specified');
    }

    if (!application.requiredDocuments || !Array.isArray(application.requiredDocuments)) {
      errors.push('Required documents list is required');
    }

    if (!application.applicationSteps || !Array.isArray(application.applicationSteps) || application.applicationSteps.length === 0) {
      errors.push('Application steps are required');
    } else {
      application.applicationSteps.forEach((step: any, index: number) => {
        if (!step.name || step.name.trim().length === 0) {
          errors.push(`Application step ${index + 1} name is required`);
        }
        if (!step.description || step.description.trim().length === 0) {
          errors.push(`Application step ${index + 1} description is required`);
        }
        if (typeof step.order !== 'number' || step.order < 1) {
          errors.push(`Application step ${index + 1} order must be a positive number`);
        }
        if (typeof step.required !== 'boolean') {
          errors.push(`Application step ${index + 1} required flag must be specified`);
        }
      });
    }

    if (!application.processingTime) {
      errors.push('Processing time information is required');
    } else {
      if (application.processingTime.min < 0) {
        errors.push('Minimum processing time cannot be negative');
      }
      if (application.processingTime.max < 0) {
        errors.push('Maximum processing time cannot be negative');
      }
      if (application.processingTime.min > application.processingTime.max) {
        errors.push('Minimum processing time cannot be greater than maximum time');
      }
    }

    if (application.website && !this.isValidUrl(application.website)) {
      errors.push('Invalid application website URL');
    }

    return errors;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate scheme for AI processing
   */
  static validateForAI(scheme: GovernmentScheme): {
    isValid: boolean;
    missingFeatures: string[];
    recommendations: string[];
  } {
    const missingFeatures: string[] = [];
    const recommendations: string[] = [];

    // Check for AI-required metadata
    if (!scheme.metadata.aiFeatures || Object.keys(scheme.metadata.aiFeatures).length === 0) {
      missingFeatures.push('AI features not computed');
      recommendations.push('Run AI feature extraction on this scheme');
    }

    if (scheme.metadata.successRate === 0) {
      missingFeatures.push('Success rate not available');
      recommendations.push('Collect historical application data to compute success rate');
    }

    if (scheme.metadata.popularity === 0) {
      missingFeatures.push('Popularity score not available');
      recommendations.push('Track application volume to compute popularity');
    }

    // Check for comprehensive eligibility criteria
    if (!scheme.eligibility.otherCriteria || scheme.eligibility.otherCriteria.length === 0) {
      recommendations.push('Add more detailed eligibility criteria for better AI matching');
    }

    // Check for detailed business type mapping
    if (scheme.eligibility.businessType.length < 2) {
      recommendations.push('Expand business type eligibility for broader reach');
    }

    return {
      isValid: missingFeatures.length === 0,
      missingFeatures,
      recommendations
    };
  }
}

// ============================================================================
// SCHEME FACTORY AND BUILDERS
// ============================================================================

/**
 * Factory class for creating Government Scheme instances
 */
export class GovernmentSchemeFactory {
  /**
   * Create a new scheme with default values
   */
  static createScheme(basicInfo: {
    title: string;
    description: string;
    category: keyof typeof SCHEME_CATEGORIES;
    providerName: string;
    providerLevel: keyof typeof GOVERNMENT_LEVELS;
  }): Partial<GovernmentScheme> {
    const now = new Date();
    
    return {
      title: basicInfo.title,
      description: basicInfo.description,
      category: basicInfo.category,
      subCategory: '',
      provider: {
        name: basicInfo.providerName,
        department: '',
        level: basicInfo.providerLevel,
        website: '',
        contactInfo: {
          phone: '',
          email: '',
          address: '',
          helplineNumber: ''
        }
      },
      eligibility: {
        age: {},
        income: {},
        businessType: [],
        location: {
          states: [],
          districts: [],
          pincodes: []
        },
        otherCriteria: []
      },
      benefits: {
        amount: { min: 0, max: 0, currency: 'INR' },
        type: basicInfo.category,
        coverageDetails: ''
      },
      application: {
        onlineApplication: false,
        requiredDocuments: [],
        applicationSteps: [],
        processingTime: { min: 30, max: 90 }
      },
      metadata: {
        popularity: 0,
        successRate: 0,
        averageProcessingTime: 60,
        aiFeatures: {},
        lastUpdated: now
      },
      status: 'active'
    };
  }

  /**
   * Create scheme from government API data
   */
  static fromGovernmentAPI(apiData: any): Partial<GovernmentScheme> {
    // This would parse data from various government API formats
    // Implementation would depend on specific API structures
    return this.createScheme({
      title: apiData.title || apiData.schemeName || '',
      description: apiData.description || apiData.details || '',
      category: this.mapAPICategory(apiData.category || apiData.type),
      providerName: apiData.department || apiData.ministry || '',
      providerLevel: this.mapAPILevel(apiData.level || apiData.authority)
    });
  }

  /**
   * Map API category to internal category
   */
  private static mapAPICategory(apiCategory: string): keyof typeof SCHEME_CATEGORIES {
    const categoryMap: Record<string, keyof typeof SCHEME_CATEGORIES> = {
      'loan': 'loan',
      'credit': 'loan',
      'financing': 'loan',
      'grant': 'grant',
      'assistance': 'grant',
      'subsidy': 'subsidy',
      'support': 'subsidy',
      'training': 'training',
      'skill': 'training',
      'insurance': 'insurance',
      'protection': 'insurance'
    };

    const normalized = apiCategory.toLowerCase();
    return categoryMap[normalized] || 'grant';
  }

  /**
   * Map API level to internal level
   */
  private static mapAPILevel(apiLevel: string): keyof typeof GOVERNMENT_LEVELS {
    const levelMap: Record<string, keyof typeof GOVERNMENT_LEVELS> = {
      'central': 'central',
      'national': 'central',
      'federal': 'central',
      'state': 'state',
      'provincial': 'state',
      'district': 'district',
      'local': 'local',
      'municipal': 'local',
      'panchayat': 'local'
    };

    const normalized = apiLevel.toLowerCase();
    return levelMap[normalized] || 'state';
  }
}

// ============================================================================
// SCHEME METADATA SYSTEM
// ============================================================================

/**
 * Metadata management for schemes
 */
export class SchemeMetadataManager {
  /**
   * Calculate AI features for a scheme
   */
  static calculateAIFeatures(scheme: GovernmentScheme): Record<string, number> {
    const features: Record<string, number> = {};

    // Category features
    features.category_loan = scheme.category === 'loan' ? 1 : 0;
    features.category_grant = scheme.category === 'grant' ? 1 : 0;
    features.category_subsidy = scheme.category === 'subsidy' ? 1 : 0;
    features.category_training = scheme.category === 'training' ? 1 : 0;
    features.category_insurance = scheme.category === 'insurance' ? 1 : 0;

    // Provider level features
    features.provider_central = scheme.provider.level === 'central' ? 1 : 0;
    features.provider_state = scheme.provider.level === 'state' ? 1 : 0;
    features.provider_district = scheme.provider.level === 'district' ? 1 : 0;
    features.provider_local = scheme.provider.level === 'local' ? 1 : 0;

    // Benefit amount features (normalized)
    features.benefit_amount_min = Math.log10(Math.max(scheme.benefits.amount.min, 1));
    features.benefit_amount_max = Math.log10(Math.max(scheme.benefits.amount.max, 1));
    features.benefit_amount_range = features.benefit_amount_max - features.benefit_amount_min;

    // Processing time features
    features.processing_time_min = scheme.application.processingTime.min;
    features.processing_time_max = scheme.application.processingTime.max;
    features.processing_time_avg = (features.processing_time_min + features.processing_time_max) / 2;

    // Eligibility features
    features.age_restricted = (scheme.eligibility.age.min || scheme.eligibility.age.max) ? 1 : 0;
    features.income_restricted = (scheme.eligibility.income.min || scheme.eligibility.income.max) ? 1 : 0;
    features.business_types_count = scheme.eligibility.businessType.length;
    features.location_restricted = (
      (scheme.eligibility.location.states?.length || 0) +
      (scheme.eligibility.location.districts?.length || 0) +
      (scheme.eligibility.location.pincodes?.length || 0)
    ) > 0 ? 1 : 0;

    // Application features
    features.online_application = scheme.application.onlineApplication ? 1 : 0;
    features.required_documents_count = scheme.application.requiredDocuments.length;
    features.application_steps_count = scheme.application.applicationSteps.length;

    // Complexity score
    features.complexity_score = (
      features.required_documents_count * 0.3 +
      features.application_steps_count * 0.2 +
      (scheme.eligibility.otherCriteria.length * 0.1) +
      (features.age_restricted + features.income_restricted + features.location_restricted) * 0.4
    );

    // Accessibility score
    features.accessibility_score = (
      features.online_application * 0.4 +
      (1 - Math.min(features.complexity_score / 10, 1)) * 0.6
    );

    return features;
  }

  /**
   * Update scheme popularity based on application data
   */
  static updatePopularity(
    currentPopularity: number,
    recentApplications: number,
    totalApplications: number,
    timeWindow: number = 30 // days
  ): number {
    // Weighted average with recent activity having more weight
    const recentWeight = 0.7;
    const historicalWeight = 0.3;
    
    const recentScore = Math.min(recentApplications / timeWindow, 10); // Cap at 10 per day
    const historicalScore = Math.min(totalApplications / 365, 100); // Cap at 100 per year
    
    return (recentScore * recentWeight + historicalScore * historicalWeight) * 10;
  }

  /**
   * Calculate success rate from application outcomes
   */
  static calculateSuccessRate(
    approvedApplications: number,
    totalApplications: number,
    minimumSampleSize: number = 10
  ): number {
    if (totalApplications < minimumSampleSize) {
      return 0; // Not enough data
    }
    
    return (approvedApplications / totalApplications) * 100;
  }

  /**
   * Update average processing time
   */
  static updateAverageProcessingTime(
    currentAverage: number,
    newProcessingTimes: number[],
    totalProcessedApplications: number
  ): number {
    if (newProcessingTimes.length === 0) {
      return currentAverage;
    }

    const newAverage = newProcessingTimes.reduce((sum, time) => sum + time, 0) / newProcessingTimes.length;
    const existingWeight = Math.min(totalProcessedApplications, 100);
    const newWeight = newProcessingTimes.length;
    
    return (currentAverage * existingWeight + newAverage * newWeight) / (existingWeight + newWeight);
  }
}

// Export all components
