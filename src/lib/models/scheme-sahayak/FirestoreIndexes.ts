/**
 * Firestore Indexes Configuration and Optimization for Scheme Sahayak
 * Defines optimized indexes for government scheme queries
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore,
  QueryConstraint,
  DocumentSnapshot,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { SCHEME_SAHAYAK_COLLECTIONS } from '../../types/scheme-sahayak';

// ============================================================================
// INDEX DEFINITIONS
// ============================================================================

/**
 * Comprehensive Firestore index definitions for optimal query performance
 */
export const SCHEME_SAHAYAK_INDEXES = {
  // Core scheme indexes for basic queries
  schemes_basic: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'category', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'metadata.successRate', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Location-based scheme indexes
  schemes_location: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'application.deadline', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
        { fieldPath: 'category', order: 'ASCENDING' },
        { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'provider.level', order: 'ASCENDING' },
        { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Business type and eligibility indexes
  schemes_eligibility: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'benefits.amount.max', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
        { fieldPath: 'category', order: 'ASCENDING' },
        { fieldPath: 'metadata.averageProcessingTime', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Time-sensitive scheme indexes
  schemes_temporal: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'application.deadline', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
      fields: [
        { fieldPath: 'metadata.lastUpdated', order: 'DESCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Application tracking indexes
  applications_tracking: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'submittedAt', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
      fields: [
        { fieldPath: 'schemeId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'lastUpdated', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'estimatedDecisionDate', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // AI recommendation indexes
  recommendations_ai: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'aiScore', order: 'DESCENDING' },
        { fieldPath: 'lastUpdated', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'urgencyScore', order: 'DESCENDING' },
        { fieldPath: 'successProbability', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
      fields: [
        { fieldPath: 'scheme.category', order: 'ASCENDING' },
        { fieldPath: 'aiScore', order: 'DESCENDING' },
        { fieldPath: 'lastUpdated', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Document management indexes
  documents_management: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'expiryDate', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'uploadDate', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Notification system indexes
  notifications_system: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'priority', order: 'DESCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
      fields: [
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'scheduledFor', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'read', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ],

  // Analytics and reporting indexes
  analytics_reporting: [
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
      fields: [
        { fieldPath: 'artisanId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    },
    {
      collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
      fields: [
        { fieldPath: 'schemeId', order: 'ASCENDING' },
        { fieldPath: 'date', order: 'DESCENDING' },
        { fieldPath: 'eventType', order: 'ASCENDING' }
      ],
      queryScope: 'COLLECTION'
    }
  ]
} as const;

// ============================================================================
// QUERY OPTIMIZATION SYSTEM
// ============================================================================

/**
 * Query optimization and index usage analyzer
 */
export class QueryOptimizer {
  /**
   * Optimize scheme search queries based on filters
   */
  static optimizeSchemeQuery(filters: {
    category?: string;
    state?: string;
    businessType?: string;
    status?: string;
    maxAmount?: number;
    hasDeadline?: boolean;
    sortBy?: 'popularity' | 'successRate' | 'deadline' | 'amount' | 'processingTime' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    limitCount?: number;
    startAfterDoc?: DocumentSnapshot;
  }): {
    constraints: QueryConstraint[];
    indexUsed: string;
    estimatedCost: number;
    recommendations: string[];
  } {
    const constraints: QueryConstraint[] = [];
    const recommendations: string[] = [];
    let indexUsed = 'schemes_basic';
    let estimatedCost = 1;

    // Always filter by status first (most selective)
    const status = filters.status || 'active';
    constraints.push(where('status', '==', status));

    // Add category filter if specified
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
      indexUsed = 'schemes_basic';
      estimatedCost += 0.5;
    }

    // Add location filter if specified
    if (filters.state) {
      constraints.push(where('eligibility.location.states', 'array-contains', filters.state));
      indexUsed = 'schemes_location';
      estimatedCost += 1;
    }

    // Add business type filter if specified
    if (filters.businessType) {
      constraints.push(where('eligibility.businessType', 'array-contains', filters.businessType));
      indexUsed = 'schemes_eligibility';
      estimatedCost += 1;
    }

    // Add deadline filter if specified
    if (filters.hasDeadline) {
      const now = new Date();
      constraints.push(where('application.deadline', '>=', now));
      indexUsed = 'schemes_temporal';
      estimatedCost += 0.5;
    }

    // Add sorting
    const sortBy = filters.sortBy || 'popularity';
    const sortOrder = filters.sortOrder || 'desc';
    
    switch (sortBy) {
      case 'popularity':
        constraints.push(orderBy('metadata.popularity', sortOrder));
        break;
      case 'successRate':
        constraints.push(orderBy('metadata.successRate', sortOrder));
        break;
      case 'deadline':
        constraints.push(orderBy('application.deadline', sortOrder));
        indexUsed = 'schemes_temporal';
        break;
      case 'amount':
        constraints.push(orderBy('benefits.amount.max', sortOrder));
        break;
      case 'processingTime':
        constraints.push(orderBy('metadata.averageProcessingTime', sortOrder));
        break;
      case 'relevance':
        constraints.push(orderBy('metadata.popularity', 'desc'));
        break;
      default:
        constraints.push(orderBy('metadata.popularity', 'desc'));
    }

    // Add pagination
    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    // Add limit
    const limitCount = filters.limitCount || 20;
    constraints.push(limit(limitCount));

    // Generate recommendations
    if (filters.maxAmount) {
      recommendations.push('Amount filtering requires client-side processing - consider pre-filtering by category');
    }

    if (Object.keys(filters).length > 3) {
      recommendations.push('Complex queries may benefit from denormalized data structures');
      estimatedCost += 1;
    }

    return {
      constraints,
      indexUsed,
      estimatedCost,
      recommendations
    };
  }

  /**
   * Optimize application tracking queries
   */
  static optimizeApplicationQuery(filters: {
    artisanId?: string;
    schemeId?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: 'submittedAt' | 'lastUpdated' | 'estimatedDecision';
    limitCount?: number;
  }): {
    constraints: QueryConstraint[];
    indexUsed: string;
    estimatedCost: number;
  } {
    const constraints: QueryConstraint[] = [];
    let indexUsed = 'applications_tracking';
    let estimatedCost = 1;

    // Artisan-specific queries (most common)
    if (filters.artisanId) {
      constraints.push(where('artisanId', '==', filters.artisanId));
      
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
        estimatedCost += 0.5;
      }

      // Sort by submission date by default for artisan queries
      const sortBy = filters.sortBy || 'submittedAt';
      constraints.push(orderBy(sortBy, 'desc'));
    }
    // Scheme-specific queries
    else if (filters.schemeId) {
      constraints.push(where('schemeId', '==', filters.schemeId));
      
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }

      constraints.push(orderBy('lastUpdated', 'desc'));
      estimatedCost += 1;
    }

    // Add date range filter if specified
    if (filters.dateRange) {
      constraints.push(where('submittedAt', '>=', filters.dateRange.start));
      constraints.push(where('submittedAt', '<=', filters.dateRange.end));
      estimatedCost += 1;
    }

    // Add limit
    const limitCount = filters.limitCount || 50;
    constraints.push(limit(limitCount));

    return {
      constraints,
      indexUsed,
      estimatedCost
    };
  }

  /**
   * Optimize recommendation queries for AI system
   */
  static optimizeRecommendationQuery(filters: {
    artisanId: string;
    minAIScore?: number;
    minUrgencyScore?: number;
    category?: string;
    limitCount?: number;
    includeExpired?: boolean;
  }): {
    constraints: QueryConstraint[];
    indexUsed: string;
    estimatedCost: number;
  } {
    const constraints: QueryConstraint[] = [];
    let indexUsed = 'recommendations_ai';
    let estimatedCost = 1;

    // Always filter by artisan ID first
    constraints.push(where('artisanId', '==', filters.artisanId));

    // Filter by AI score if specified
    if (filters.minAIScore && filters.minAIScore > 0) {
      constraints.push(where('aiScore', '>=', filters.minAIScore));
      estimatedCost += 0.5;
    }

    // Filter by urgency if specified
    if (filters.minUrgencyScore && filters.minUrgencyScore > 0) {
      constraints.push(where('urgencyScore', '>=', filters.minUrgencyScore));
      estimatedCost += 0.5;
    }

    // Filter by category if specified
    if (filters.category) {
      constraints.push(where('scheme.category', '==', filters.category));
      estimatedCost += 0.5;
    }

    // Filter out expired recommendations unless explicitly included
    if (!filters.includeExpired) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      constraints.push(where('lastUpdated', '>=', oneWeekAgo));
      estimatedCost += 0.5;
    }

    // Sort by AI score and recency
    constraints.push(orderBy('aiScore', 'desc'));
    constraints.push(orderBy('lastUpdated', 'desc'));

    // Add limit
    const limitCount = filters.limitCount || 10;
    constraints.push(limit(limitCount));

    return {
      constraints,
      indexUsed,
      estimatedCost
    };
  }
}

// ============================================================================
// INDEX MANAGEMENT UTILITIES
// ============================================================================

/**
 * Index management and monitoring utilities
 */
export class IndexManager {
  /**
   * Generate Firestore CLI commands for creating indexes
   */
  static generateIndexCommands(): string[] {
    const commands: string[] = [];
    
    Object.values(SCHEME_SAHAYAK_INDEXES).flat().forEach((index, i) => {
      const fieldsStr = index.fields
        .map(field => `${field.fieldPath}:${field.order.toLowerCase()}`)
        .join(',');
      
      commands.push(
        `firebase firestore:indexes:create --collection-group=${index.collection} --fields="${fieldsStr}"`
      );
    });

    return commands;
  }

  /**
   * Generate index configuration for firebase.json
   */
  static generateFirebaseConfig(): {
    firestore: {
      indexes: Array<{
        collectionGroup: string;
        queryScope: string;
        fields: Array<{
          fieldPath: string;
          order?: string;
          arrayConfig?: string;
        }>;
      }>;
    };
  } {
    const indexes = Object.values(SCHEME_SAHAYAK_INDEXES)
      .flat()
      .map(index => ({
        collectionGroup: index.collection,
        queryScope: index.queryScope,
        fields: index.fields.map(field => ({
          fieldPath: field.fieldPath,
          order: field.order
        }))
      }));

    return {
      firestore: {
        indexes
      }
    };
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static analyzeQueryPerformance(
    queryType: string,
    executionTime: number,
    documentsRead: number,
    resultCount: number
  ): {
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions: string[];
    indexRecommendations: string[];
  } {
    const suggestions: string[] = [];
    const indexRecommendations: string[] = [];
    
    let performance: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    // Analyze execution time
    if (executionTime > 2000) {
      performance = 'poor';
      suggestions.push('Query execution time is too high (>2s)');
      suggestions.push('Consider adding more selective filters');
    } else if (executionTime > 1000) {
      performance = 'fair';
      suggestions.push('Query execution time could be improved');
    } else if (executionTime > 500) {
      performance = 'good';
    }

    // Analyze document read efficiency
    const readEfficiency = resultCount / documentsRead;
    if (readEfficiency < 0.1) {
      performance = 'poor';
      suggestions.push('Low read efficiency - too many documents scanned');
      indexRecommendations.push('Add more selective compound indexes');
    } else if (readEfficiency < 0.3) {
      if (performance === 'excellent') performance = 'fair';
      suggestions.push('Consider adding more selective filters');
    }

    // Query-specific recommendations
    switch (queryType) {
      case 'scheme_search':
        if (documentsRead > 1000) {
          indexRecommendations.push('Consider using Elasticsearch for full-text search');
        }
        break;
      case 'application_tracking':
        if (executionTime > 500) {
          indexRecommendations.push('Ensure artisanId + status + timestamp composite index exists');
        }
        break;
      case 'ai_recommendations':
        if (documentsRead > 100) {
          indexRecommendations.push('Pre-compute and cache recommendations for better performance');
        }
        break;
    }

    return {
      performance,
      suggestions,
      indexRecommendations
    };
  }

  /**
   * Monitor index usage and suggest optimizations
   */
  static monitorIndexUsage(queryStats: Array<{
    query: string;
    indexUsed: string;
    frequency: number;
    avgExecutionTime: number;
    avgDocumentsRead: number;
  }>): {
    underutilizedIndexes: string[];
    missingIndexes: string[];
    optimizationSuggestions: string[];
  } {
    const underutilizedIndexes: string[] = [];
    const missingIndexes: string[] = [];
    const optimizationSuggestions: string[] = [];

    // Analyze query patterns
    const indexUsage = new Map<string, number>();
    const slowQueries = queryStats.filter(stat => stat.avgExecutionTime > 1000);

    queryStats.forEach(stat => {
      const currentUsage = indexUsage.get(stat.indexUsed) || 0;
      indexUsage.set(stat.indexUsed, currentUsage + stat.frequency);
    });

    // Identify underutilized indexes
    Object.keys(SCHEME_SAHAYAK_INDEXES).forEach(indexGroup => {
      if (!indexUsage.has(indexGroup) || (indexUsage.get(indexGroup) || 0) < 10) {
        underutilizedIndexes.push(indexGroup);
      }
    });

    // Identify missing indexes for slow queries
    slowQueries.forEach(query => {
      if (query.avgDocumentsRead > query.frequency * 10) {
        missingIndexes.push(`Potential missing index for: ${query.query}`);
      }
    });

    // Generate optimization suggestions
    if (slowQueries.length > 0) {
      optimizationSuggestions.push('Consider caching results for frequently executed slow queries');
    }

    if (underutilizedIndexes.length > 5) {
      optimizationSuggestions.push('Review and remove unused indexes to reduce storage costs');
    }

    return {
      underutilizedIndexes,
      missingIndexes,
      optimizationSuggestions
    };
  }
}

