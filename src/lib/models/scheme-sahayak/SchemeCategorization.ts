/**
 * Scheme Categorization and Classification System
 * Advanced categorization logic for government schemes
 */

import { GovernmentScheme } from '../../types/scheme-sahayak';
import { SCHEME_CATEGORIES, BUSINESS_TYPES, GOVERNMENT_LEVELS } from './GovernmentScheme';

// ============================================================================
// CATEGORIZATION INTERFACES
// ============================================================================

export interface CategoryMatch {
  category: string;
  subcategory: string;
  confidence: number;
  reasons: string[];
}

export interface BusinessTypeMatch {
  businessType: string;
  relevanceScore: number;
  matchingCriteria: string[];
}

export interface LocationRelevance {
  state: string;
  district?: string;
  relevanceScore: number;
  coverage: 'full' | 'partial' | 'limited';
}

export interface SchemeClassification {
  primaryCategory: CategoryMatch;
  secondaryCategories: CategoryMatch[];
  targetBusinessTypes: BusinessTypeMatch[];
  locationRelevance: LocationRelevance[];
  complexityLevel: 'low' | 'medium' | 'high';
  urgencyLevel: 'low' | 'medium' | 'high';
  accessibilityScore: number; // 0-100
}

// ============================================================================
// CATEGORIZATION ENGINE
// ============================================================================

/**
 * Advanced scheme categorization engine
 */
export class SchemeCategorizer {
  private static readonly CATEGORY_KEYWORDS = {
    loan: [
      'loan', 'credit', 'financing', 'advance', 'fund', 'capital',
      'mudra', 'msme', 'startup', 'business loan', 'working capital'
    ],
    grant: [
      'grant', 'assistance', 'support', 'aid', 'help', 'benefit',
      'scheme', 'yojana', 'programme', 'initiative', 'welfare'
    ],
    subsidy: [
      'subsidy', 'rebate', 'discount', 'concession', 'reduction',
      'incentive', 'reimbursement', 'compensation', 'allowance'
    ],
    training: [
      'training', 'skill', 'education', 'learning', 'development',
      'capacity building', 'workshop', 'course', 'program', 'certification'
    ],
    insurance: [
      'insurance', 'protection', 'coverage', 'security', 'safety',
      'risk', 'premium', 'policy', 'claim', 'indemnity'
    ]
  };

  private static readonly BUSINESS_TYPE_KEYWORDS = {
    manufacturing: [
      'manufacturing', 'production', 'factory', 'industry', 'textile',
      'food processing', 'handicraft', 'leather', 'metal', 'wood',
      'pottery', 'ceramic', 'jewelry', 'electronics', 'chemical'
    ],
    services: [
      'service', 'repair', 'beauty', 'wellness', 'transport',
      'catering', 'cleaning', 'it services', 'consulting',
      'education', 'healthcare', 'financial services'
    ],
    trading: [
      'trading', 'retail', 'wholesale', 'online', 'export',
      'agricultural trading', 'handicraft trading', 'textile trading',
      'electronics trading', 'food trading', 'raw material'
    ],
    agriculture: [
      'agriculture', 'farming', 'crop', 'horticulture', 'animal husbandry',
      'poultry', 'dairy', 'fisheries', 'beekeeping', 'organic',
      'floriculture', 'sericulture'
    ]
  };

  /**
   * Classify a scheme comprehensively
   */
  static classifyScheme(scheme: GovernmentScheme): SchemeClassification {
    const primaryCategory = this.identifyPrimaryCategory(scheme);
    const secondaryCategories = this.identifySecondaryCategories(scheme, primaryCategory.category);
    const targetBusinessTypes = this.identifyTargetBusinessTypes(scheme);
    const locationRelevance = this.assessLocationRelevance(scheme);
    const complexityLevel = this.assessComplexityLevel(scheme);
    const urgencyLevel = this.assessUrgencyLevel(scheme);
    const accessibilityScore = this.calculateAccessibilityScore(scheme);

    return {
      primaryCategory,
      secondaryCategories,
      targetBusinessTypes,
      locationRelevance,
      complexityLevel,
      urgencyLevel,
      accessibilityScore
    };
  }

  /**
   * Identify primary category using NLP and keyword matching
   */
  private static identifyPrimaryCategory(scheme: GovernmentScheme): CategoryMatch {
    const text = `${scheme.title} ${scheme.description} ${scheme.benefits.coverageDetails}`.toLowerCase();
    const scores: Record<string, number> = {};
    const reasons: Record<string, string[]> = {};

    // Initialize scores and reasons
    Object.keys(this.CATEGORY_KEYWORDS).forEach(category => {
      scores[category] = 0;
      reasons[category] = [];
    });

    // Keyword matching with weights
    Object.entries(this.CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          const weight = this.getKeywordWeight(keyword);
          scores[category] += matches.length * weight;
          reasons[category].push(`Found "${keyword}" (${matches.length} times)`);
        }
      });
    });

    // Boost score based on explicit category
    if (scheme.category && scores[scheme.category] !== undefined) {
      scores[scheme.category] += 10;
      reasons[scheme.category].push('Explicit category match');
    }

    // Boost score based on benefit type
    if (scheme.benefits.type && scores[scheme.benefits.type] !== undefined) {
      scores[scheme.benefits.type] += 8;
      reasons[scheme.benefits.type].push('Benefit type match');
    }

    // Find highest scoring category
    const topCategory = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    const confidence = Math.min(scores[topCategory] / 20 * 100, 100);
    const subcategory = this.identifySubcategory(scheme, topCategory);

    return {
      category: topCategory,
      subcategory,
      confidence,
      reasons: reasons[topCategory]
    };
  }

  /**
   * Identify secondary categories
   */
  private static identifySecondaryCategories(
    scheme: GovernmentScheme, 
    primaryCategory: string
  ): CategoryMatch[] {
    const text = `${scheme.title} ${scheme.description}`.toLowerCase();
    const secondaryMatches: CategoryMatch[] = [];

    Object.entries(this.CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      if (category === primaryCategory) return;

      let score = 0;
      const matchedReasons: string[] = [];

      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += this.getKeywordWeight(keyword);
          matchedReasons.push(`Contains "${keyword}"`);
        }
      });

      if (score > 2) {
        const confidence = Math.min(score / 10 * 100, 100);
        const subcategory = this.identifySubcategory(scheme, category);
        
        secondaryMatches.push({
          category,
          subcategory,
          confidence,
          reasons: matchedReasons
        });
      }
    });

    return secondaryMatches.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  }

  /**
   * Identify target business types
   */
  private static identifyTargetBusinessTypes(scheme: GovernmentScheme): BusinessTypeMatch[] {
    const text = `${scheme.title} ${scheme.description} ${scheme.eligibility.otherCriteria.join(' ')}`.toLowerCase();
    const matches: BusinessTypeMatch[] = [];

    // Check explicit business types in eligibility
    if (scheme.eligibility.businessType && scheme.eligibility.businessType.length > 0) {
      scheme.eligibility.businessType.forEach(businessType => {
        const normalizedType = businessType.toLowerCase();
        let matchingCategory = '';
        
        // Find which main category this business type belongs to
        Object.entries(BUSINESS_TYPES).forEach(([category, config]) => {
          if (config.subcategories.some(sub => 
            sub.toLowerCase().includes(normalizedType) || 
            normalizedType.includes(sub.toLowerCase())
          )) {
            matchingCategory = category;
          }
        });

        matches.push({
          businessType: matchingCategory || 'general',
          relevanceScore: 100,
          matchingCriteria: [`Explicitly listed: ${businessType}`]
        });
      });
    }

    // Keyword-based matching
    Object.entries(this.BUSINESS_TYPE_KEYWORDS).forEach(([businessType, keywords]) => {
      let score = 0;
      const matchingCriteria: string[] = [];

      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += this.getKeywordWeight(keyword);
          matchingCriteria.push(`Contains "${keyword}"`);
        }
      });

      if (score > 1 && !matches.some(m => m.businessType === businessType)) {
        matches.push({
          businessType,
          relevanceScore: Math.min(score * 20, 100),
          matchingCriteria
        });
      }
    });

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Assess location relevance
   */
  private static assessLocationRelevance(scheme: GovernmentScheme): LocationRelevance[] {
    const relevance: LocationRelevance[] = [];

    // Check state-level coverage
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      scheme.eligibility.location.states.forEach(state => {
        let coverage: 'full' | 'partial' | 'limited' = 'full';
        let relevanceScore = 100;

        // Check if there are district restrictions
        if (scheme.eligibility.location.districts && scheme.eligibility.location.districts.length > 0) {
          coverage = 'partial';
          relevanceScore = 80;
        }

        // Check if there are pincode restrictions
        if (scheme.eligibility.location.pincodes && scheme.eligibility.location.pincodes.length > 0) {
          coverage = 'limited';
          relevanceScore = 60;
        }

        relevance.push({
          state,
          relevanceScore,
          coverage
        });
      });
    } else {
      // National scheme
      relevance.push({
        state: 'ALL',
        relevanceScore: 100,
        coverage: 'full'
      });
    }

    return relevance;
  }

  /**
   * Assess complexity level
   */
  private static assessComplexityLevel(scheme: GovernmentScheme): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Document requirements
    complexityScore += scheme.application.requiredDocuments.length * 2;

    // Application steps
    complexityScore += scheme.application.applicationSteps.length * 1.5;

    // Eligibility criteria complexity
    if (scheme.eligibility.age.min || scheme.eligibility.age.max) complexityScore += 1;
    if (scheme.eligibility.income.min || scheme.eligibility.income.max) complexityScore += 2;
    complexityScore += scheme.eligibility.otherCriteria.length;

    // Processing time
    const avgProcessingTime = (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;
    if (avgProcessingTime > 90) complexityScore += 3;
    else if (avgProcessingTime > 30) complexityScore += 1;

    // Online application reduces complexity
    if (scheme.application.onlineApplication) complexityScore -= 2;

    if (complexityScore <= 5) return 'low';
    if (complexityScore <= 12) return 'medium';
    return 'high';
  }

  /**
   * Assess urgency level based on deadlines and time-sensitive factors
   */
  private static assessUrgencyLevel(scheme: GovernmentScheme): 'low' | 'medium' | 'high' {
    let urgencyScore = 0;

    // Check deadline
    if (scheme.application.deadline) {
      const now = new Date();
      const deadline = new Date(scheme.application.deadline);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline <= 7) urgencyScore += 10;
      else if (daysUntilDeadline <= 30) urgencyScore += 5;
      else if (daysUntilDeadline <= 90) urgencyScore += 2;
    }

    // Check for time-sensitive keywords
    const urgentKeywords = ['limited time', 'deadline', 'last date', 'hurry', 'urgent', 'immediate'];
    const text = `${scheme.title} ${scheme.description}`.toLowerCase();
    
    urgentKeywords.forEach(keyword => {
      if (text.includes(keyword)) urgencyScore += 3;
    });

    // Check processing time
    const avgProcessingTime = (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;
    if (avgProcessingTime <= 15) urgencyScore += 2; // Fast processing suggests urgency

    if (urgencyScore >= 8) return 'high';
    if (urgencyScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Calculate accessibility score
   */
  private static calculateAccessibilityScore(scheme: GovernmentScheme): number {
    let score = 100;

    // Reduce score for complex requirements
    score -= scheme.application.requiredDocuments.length * 3;
    score -= scheme.application.applicationSteps.length * 2;
    score -= scheme.eligibility.otherCriteria.length * 2;

    // Reduce score for restrictive eligibility
    if (scheme.eligibility.age.min || scheme.eligibility.age.max) score -= 5;
    if (scheme.eligibility.income.max && scheme.eligibility.income.max < 500000) score -= 10;

    // Reduce score for long processing time
    const avgProcessingTime = (scheme.application.processingTime.min + scheme.application.processingTime.max) / 2;
    if (avgProcessingTime > 90) score -= 15;
    else if (avgProcessingTime > 60) score -= 10;
    else if (avgProcessingTime > 30) score -= 5;

    // Boost score for online application
    if (scheme.application.onlineApplication) score += 10;

    // Boost score for higher government levels (typically more accessible)
    if (scheme.provider.level === 'central') score += 5;

    // Boost score for popular schemes
    if (scheme.metadata.popularity > 50) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify subcategory based on scheme content
   */
  private static identifySubcategory(scheme: GovernmentScheme, category: string): string {
    if (!SCHEME_CATEGORIES[category as keyof typeof SCHEME_CATEGORIES]) {
      return '';
    }

    const subcategories = SCHEME_CATEGORIES[category as keyof typeof SCHEME_CATEGORIES].subcategories;
    const text = `${scheme.title} ${scheme.description}`.toLowerCase();
    
    let bestMatch = '';
    let bestScore = 0;

    Object.entries(subcategories).forEach(([key, name]) => {
      let score = 0;
      
      // Check if subcategory name appears in text
      if (text.includes(name.toLowerCase())) score += 10;
      
      // Check individual words
      const words = name.toLowerCase().split(' ');
      words.forEach(word => {
        if (text.includes(word)) score += 2;
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    });

    return bestMatch;
  }

  /**
   * Get keyword weight based on importance
   */
  private static getKeywordWeight(keyword: string): number {
    const highImportanceKeywords = ['loan', 'grant', 'subsidy', 'training', 'insurance'];
    const mediumImportanceKeywords = ['scheme', 'yojana', 'programme', 'assistance'];
    
    if (highImportanceKeywords.includes(keyword)) return 3;
    if (mediumImportanceKeywords.includes(keyword)) return 2;
    return 1;
  }
}

// ============================================================================
// SCHEME INDEXING SYSTEM
// ============================================================================

/**
 * Indexing system for efficient scheme search and retrieval
 */
export class SchemeIndexer {
  /**
   * Create search index for a scheme
   */
  static createSearchIndex(scheme: GovernmentScheme): {
    textIndex: string[];
    categoryIndex: string[];
    locationIndex: string[];
    businessTypeIndex: string[];
    metadataIndex: Record<string, any>;
  } {
    const classification = SchemeCategorizer.classifyScheme(scheme);

    return {
      textIndex: this.createTextIndex(scheme),
      categoryIndex: this.createCategoryIndex(scheme, classification),
      locationIndex: this.createLocationIndex(scheme),
      businessTypeIndex: this.createBusinessTypeIndex(scheme, classification),
      metadataIndex: this.createMetadataIndex(scheme, classification)
    };
  }

  /**
   * Create text search index
   */
  private static createTextIndex(scheme: GovernmentScheme): string[] {
    const tokens = new Set<string>();

    // Tokenize title and description
    const text = `${scheme.title} ${scheme.description} ${scheme.benefits.coverageDetails}`;
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    words.forEach(word => tokens.add(word));

    // Add provider information
    tokens.add(scheme.provider.name.toLowerCase());
    tokens.add(scheme.provider.department.toLowerCase());

    // Add eligibility criteria
    scheme.eligibility.otherCriteria.forEach(criteria => {
      const criteriaWords = criteria.toLowerCase().split(/\s+/);
      criteriaWords.forEach(word => {
        if (word.length > 2) tokens.add(word);
      });
    });

    return Array.from(tokens);
  }

  /**
   * Create category index
   */
  private static createCategoryIndex(
    scheme: GovernmentScheme, 
    classification: SchemeClassification
  ): string[] {
    const categories = new Set<string>();

    // Primary category
    categories.add(classification.primaryCategory.category);
    categories.add(classification.primaryCategory.subcategory);

    // Secondary categories
    classification.secondaryCategories.forEach(cat => {
      categories.add(cat.category);
      categories.add(cat.subcategory);
    });

    // Original scheme category
    categories.add(scheme.category);
    categories.add(scheme.subCategory);

    return Array.from(categories).filter(cat => cat && cat.length > 0);
  }

  /**
   * Create location index
   */
  private static createLocationIndex(scheme: GovernmentScheme): string[] {
    const locations = new Set<string>();

    // States
    scheme.eligibility.location.states?.forEach(state => {
      locations.add(state.toLowerCase());
    });

    // Districts
    scheme.eligibility.location.districts?.forEach(district => {
      locations.add(district.toLowerCase());
    });

    // Pincodes
    scheme.eligibility.location.pincodes?.forEach(pincode => {
      locations.add(pincode);
    });

    // Provider level
    locations.add(scheme.provider.level);

    return Array.from(locations);
  }

  /**
   * Create business type index
   */
  private static createBusinessTypeIndex(
    scheme: GovernmentScheme,
    classification: SchemeClassification
  ): string[] {
    const businessTypes = new Set<string>();

    // Explicit business types
    scheme.eligibility.businessType.forEach(type => {
      businessTypes.add(type.toLowerCase());
    });

    // Classified business types
    classification.targetBusinessTypes.forEach(match => {
      businessTypes.add(match.businessType);
    });

    return Array.from(businessTypes);
  }

  /**
   * Create metadata index
   */
  private static createMetadataIndex(
    scheme: GovernmentScheme,
    classification: SchemeClassification
  ): Record<string, any> {
    return {
      // Basic metadata
      popularity: scheme.metadata.popularity,
      successRate: scheme.metadata.successRate,
      averageProcessingTime: scheme.metadata.averageProcessingTime,
      
      // Classification metadata
      complexityLevel: classification.complexityLevel,
      urgencyLevel: classification.urgencyLevel,
      accessibilityScore: classification.accessibilityScore,
      
      // Benefit metadata
      minAmount: scheme.benefits.amount.min,
      maxAmount: scheme.benefits.amount.max,
      benefitType: scheme.benefits.type,
      
      // Application metadata
      onlineApplication: scheme.application.onlineApplication,
      requiredDocumentsCount: scheme.application.requiredDocuments.length,
      applicationStepsCount: scheme.application.applicationSteps.length,
      
      // Timing metadata
      hasDeadline: !!scheme.application.deadline,
      deadline: scheme.application.deadline,
      minProcessingTime: scheme.application.processingTime.min,
      maxProcessingTime: scheme.application.processingTime.max,
      
      // Provider metadata
      providerLevel: scheme.provider.level,
      
      // Status
      status: scheme.status,
      lastUpdated: scheme.metadata.lastUpdated
    };
  }
}
