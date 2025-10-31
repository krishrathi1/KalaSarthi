/**
 * Firestore Indexes Configuration for AI-Powered Scheme Sahayak v2.0
 * Optimized indexes for scheme discovery, search, and analytics
 */

import { SCHEME_SAHAYAK_COLLECTIONS } from '../types/scheme-sahayak';

/**
 * Firestore index configuration interface
 */
export interface FirestoreIndex {
  collection: string;
  fields: Array<{
    fieldPath: string;
    order: 'ASCENDING' | 'DESCENDING';
  }>;
  queryScope?: 'COLLECTION' | 'COLLECTION_GROUP';
}

/**
 * Comprehensive Firestore indexes for optimized queries
 */
export const SCHEME_SAHAYAK_INDEXES: FirestoreIndex[] = [
  // ============================================================================
  // SCHEME COLLECTION INDEXES
  // ============================================================================
  
  // Basic scheme queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // Category-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'subCategory', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.successRate', order: 'DESCENDING' }
    ]
  },
  
  // Location-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'application.deadline', order: 'ASCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // Business type queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.successRate', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'benefits.amount.max', order: 'DESCENDING' }
    ]
  },
  
  // Government level queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'provider.level', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // Deadline-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'application.deadline', order: 'ASCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'application.deadline', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // Amount-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'benefits.amount.min', order: 'ASCENDING' },
      { fieldPath: 'benefits.amount.max', order: 'DESCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },
  
  // Success rate queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'metadata.successRate', order: 'DESCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // Processing time queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'application.processingTime.max', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // Complex multi-field queries for AI recommendations
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
      { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.popularity', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // APPLICATION COLLECTION INDEXES
  // ============================================================================
  
  // Artisan application queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'submittedAt', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // Scheme application queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
    fields: [
      { fieldPath: 'schemeId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'submittedAt', order: 'DESCENDING' }
    ]
  },
  
  // Status-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // Government application ID queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
    fields: [
      { fieldPath: 'governmentApplicationId', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // RECOMMENDATION COLLECTION INDEXES
  // ============================================================================
  
  // Artisan recommendation queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'aiScore', order: 'DESCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'urgencyScore', order: 'DESCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'successProbability', order: 'DESCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // Scheme recommendation queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
    fields: [
      { fieldPath: 'scheme.id', order: 'ASCENDING' },
      { fieldPath: 'aiScore', order: 'DESCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // DOCUMENT COLLECTION INDEXES
  // ============================================================================
  
  // Artisan document queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'uploadDate', order: 'DESCENDING' }
    ]
  },
  
  // Document expiry queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'expiryDate', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
    fields: [
      { fieldPath: 'expiryDate', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },
  
  // Document verification queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS,
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'uploadDate', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // NOTIFICATION COLLECTION INDEXES
  // ============================================================================
  
  // User notification queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'priority', order: 'DESCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'scheduledFor', order: 'ASCENDING' }
    ]
  },
  
  // System notification queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'scheduledFor', order: 'ASCENDING' },
      { fieldPath: 'priority', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // ANALYTICS COLLECTION INDEXES
  // ============================================================================
  
  // Artisan analytics queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  
  // System analytics queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
    fields: [
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
    fields: [
      { fieldPath: 'schemeId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' }
    ]
  },
  
  // ============================================================================
  // FEEDBACK COLLECTION INDEXES
  // ============================================================================
  
  // Recommendation feedback queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK,
    fields: [
      { fieldPath: 'recommendationId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  
  // Rating-based queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK,
    fields: [
      { fieldPath: 'rating', order: 'DESCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // ML_FEATURES COLLECTION INDEXES
  // ============================================================================
  
  // ML feature queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ML_FEATURES,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ML_FEATURES,
    fields: [
      { fieldPath: 'schemeId', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // ============================================================================
  // USER_SETTINGS COLLECTION INDEXES
  // ============================================================================
  
  // User settings queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.USER_SETTINGS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  },
  
  // Language preference queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.USER_SETTINGS,
    fields: [
      { fieldPath: 'languageAccessibility.language.primary', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  }
];

/**
 * Generate Firestore index creation commands
 */
export function generateIndexCommands(): string[] {
  return SCHEME_SAHAYAK_INDEXES.map(index => {
    const fields = index.fields
      .map(field => `${field.fieldPath}:${field.order.toLowerCase()}`)
      .join(',');
    
    return `firebase firestore:indexes:create --collection-group=${index.collection} --fields="${fields}"`;
  });
}

/**
 * Generate Firebase CLI index configuration
 */
export function generateFirebaseIndexConfig(): {
  indexes: Array<{
    collectionGroup: string;
    queryScope: string;
    fields: Array<{
      fieldPath: string;
      order: string;
    }>;
  }>;
} {
  return {
    indexes: SCHEME_SAHAYAK_INDEXES.map(index => ({
      collectionGroup: index.collection,
      queryScope: index.queryScope || 'COLLECTION',
      fields: index.fields.map(field => ({
        fieldPath: field.fieldPath,
        order: field.order
      }))
    }))
  };
}

/**
 * Validate that required indexes exist for a query
 */
export function validateQueryIndexes(
  collection: string,
  whereFields: string[],
  orderByFields: Array<{ field: string; direction: 'asc' | 'desc' }>
): {
  hasRequiredIndex: boolean;
  suggestedIndex?: FirestoreIndex;
  existingIndexes: FirestoreIndex[];
} {
  const existingIndexes = SCHEME_SAHAYAK_INDEXES.filter(
    index => index.collection === collection
  );
  
  // Check if any existing index covers the query
  const hasRequiredIndex = existingIndexes.some(index => {
    const indexFields = index.fields.map(f => f.fieldPath);
    const indexOrders = index.fields.map(f => f.order);
    
    // Check if all where fields are covered
    const whereFieldsCovered = whereFields.every(field => indexFields.includes(field));
    
    // Check if order by fields are covered in the right order
    const orderByFieldsCovered = orderByFields.every((orderField, i) => {
      const indexFieldIndex = indexFields.indexOf(orderField.field);
      if (indexFieldIndex === -1) return false;
      
      const expectedOrder = orderField.direction === 'asc' ? 'ASCENDING' : 'DESCENDING';
      return indexOrders[indexFieldIndex] === expectedOrder;
    });
    
    return whereFieldsCovered && orderByFieldsCovered;
  });
  
  let suggestedIndex: FirestoreIndex | undefined;
  
  if (!hasRequiredIndex) {
    // Generate a suggested index
    const fields: Array<{ fieldPath: string; order: 'ASCENDING' | 'DESCENDING' }> = [];
    
    // Add where fields first
    whereFields.forEach(field => {
      fields.push({ fieldPath: field, order: 'ASCENDING' });
    });
    
    // Add order by fields
    orderByFields.forEach(orderField => {
      const order = orderField.direction === 'asc' ? 'ASCENDING' : 'DESCENDING';
      // Avoid duplicates
      if (!fields.some(f => f.fieldPath === orderField.field)) {
        fields.push({ fieldPath: orderField.field, order });
      }
    });
    
    suggestedIndex = {
      collection,
      fields
    };
  }
  
  return {
    hasRequiredIndex,
    suggestedIndex,
    existingIndexes
  };
}

/**
 * Get performance recommendations for scheme queries
 */
export function getQueryPerformanceRecommendations(): {
  recommendations: string[];
  criticalIndexes: FirestoreIndex[];
  optionalIndexes: FirestoreIndex[];
} {
  const recommendations = [
    'Create composite indexes for multi-field queries to improve performance',
    'Use array-contains queries sparingly as they require special indexing',
    'Consider denormalizing frequently accessed data to reduce query complexity',
    'Use pagination with startAfter() for large result sets',
    'Cache frequently accessed scheme data in Redis for better performance',
    'Use Firestore bundle for initial data loading in web applications',
    'Monitor query performance using Firebase Performance Monitoring'
  ];
  
  // Critical indexes for core functionality
  const criticalIndexes = SCHEME_SAHAYAK_INDEXES.filter(index => 
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.SCHEMES ||
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS ||
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS
  );
  
  // Optional indexes for analytics and advanced features
  const optionalIndexes = SCHEME_SAHAYAK_INDEXES.filter(index => 
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS ||
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK ||
    index.collection === SCHEME_SAHAYAK_COLLECTIONS.ML_FEATURES
  );
  
  return {
    recommendations,
    criticalIndexes,
    optionalIndexes
  };
}

/**
 * Export index configuration for Firebase CLI
 */
export const FIREBASE_INDEXES_CONFIG = generateFirebaseIndexConfig();

/**
 * Export CLI commands for easy setup
 */
export const INDEX_SETUP_COMMANDS = generateIndexCommands();