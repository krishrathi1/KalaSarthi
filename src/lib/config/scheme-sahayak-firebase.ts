/**
 * Firebase configuration and Firestore setup for AI-Powered Scheme Sahayak v2.0
 * Defines collections, indexes, and database structure
 */

import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  QueryConstraint,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
import { SCHEME_SAHAYAK_COLLECTIONS } from '../types/scheme-sahayak';
import type {
  ArtisanProfile,
  GovernmentScheme,
  SchemeApplication,
  AISchemeRecommendation,
  SmartNotification,
  DocumentInfo,
  UserFeedback,
  UserSettings
} from '../types/scheme-sahayak';

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

/**
 * Typed collection references for type safety
 */
export const schemeSahayakCollections = {
  artisans: collection(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS) as CollectionReference<ArtisanProfile>,
  schemes: collection(db, SCHEME_SAHAYAK_COLLECTIONS.SCHEMES) as CollectionReference<GovernmentScheme>,
  applications: collection(db, SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS) as CollectionReference<SchemeApplication>,
  recommendations: collection(db, SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS) as CollectionReference<AISchemeRecommendation>,
  documents: collection(db, SCHEME_SAHAYAK_COLLECTIONS.DOCUMENTS) as CollectionReference<DocumentInfo>,
  notifications: collection(db, SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS) as CollectionReference<SmartNotification>,
  analytics: collection(db, SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS),
  mlFeatures: collection(db, SCHEME_SAHAYAK_COLLECTIONS.ML_FEATURES),
  feedback: collection(db, SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK) as CollectionReference<UserFeedback>,
  userPreferences: collection(db, SCHEME_SAHAYAK_COLLECTIONS.USER_PREFERENCES),
  userSettings: collection(db, SCHEME_SAHAYAK_COLLECTIONS.USER_SETTINGS) as CollectionReference<UserSettings>,
  syncStatus: collection(db, SCHEME_SAHAYAK_COLLECTIONS.SYNC_STATUS)
} as const;

// ============================================================================
// FIRESTORE INDEXES CONFIGURATION
// ============================================================================

/**
 * Required Firestore indexes for optimized queries
 * These should be created in the Firebase console or via CLI
 */
export const REQUIRED_FIRESTORE_INDEXES = [
  // Scheme queries
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
      { fieldPath: 'eligibility.location.states', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'application.deadline', order: 'ASCENDING' }
    ]
  },
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.SCHEMES,
    fields: [
      { fieldPath: 'eligibility.businessType', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'metadata.successRate', order: 'DESCENDING' }
    ]
  },

  // Application queries
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
      { fieldPath: 'schemeId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'lastUpdated', order: 'DESCENDING' }
    ]
  },

  // Recommendation queries
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

  // Notification queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS,
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'priority', order: 'DESCENDING' },
      { fieldPath: 'scheduledFor', order: 'ASCENDING' }
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

  // Document queries
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
      { fieldPath: 'expiryDate', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },

  // Analytics queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.ANALYTICS,
    fields: [
      { fieldPath: 'artisanId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' }
    ]
  },

  // Feedback queries
  {
    collection: SCHEME_SAHAYAK_COLLECTIONS.FEEDBACK,
    fields: [
      { fieldPath: 'recommendationId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  }
] as const;

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Pre-built query functions for common operations
 */
export const schemeSahayakQueries = {
  // Artisan queries
  getArtisanByPhone: (phone: string) => 
    query(schemeSahayakCollections.artisans, where('personalInfo.phone', '==', phone)),

  getArtisansByLocation: (state: string, district?: string) => {
    const constraints: QueryConstraint[] = [where('location.state', '==', state)];
    if (district) {
      constraints.push(where('location.district', '==', district));
    }
    return query(schemeSahayakCollections.artisans, ...constraints);
  },

  // Scheme queries
  getActiveSchemes: () => 
    query(
      schemeSahayakCollections.schemes, 
      where('status', '==', 'active'),
      orderBy('metadata.popularity', 'desc')
    ),

  getSchemesByCategory: (category: string) =>
    query(
      schemeSahayakCollections.schemes,
      where('category', '==', category),
      where('status', '==', 'active'),
      orderBy('metadata.popularity', 'desc')
    ),

  getSchemesByLocation: (state: string) =>
    query(
      schemeSahayakCollections.schemes,
      where('eligibility.location.states', 'array-contains', state),
      where('status', '==', 'active'),
      orderBy('application.deadline', 'asc')
    ),

  getPopularSchemes: (limitCount: number = 10) =>
    query(
      schemeSahayakCollections.schemes,
      where('status', '==', 'active'),
      orderBy('metadata.popularity', 'desc'),
      limit(limitCount)
    ),

  // Application queries
  getArtisanApplications: (artisanId: string, status?: string) => {
    const constraints: QueryConstraint[] = [where('artisanId', '==', artisanId)];
    if (status) {
      constraints.push(where('status', '==', status));
    }
    constraints.push(orderBy('submittedAt', 'desc'));
    return query(schemeSahayakCollections.applications, ...constraints);
  },

  getApplicationsByScheme: (schemeId: string) =>
    query(
      schemeSahayakCollections.applications,
      where('schemeId', '==', schemeId),
      orderBy('submittedAt', 'desc')
    ),

  // Recommendation queries
  getArtisanRecommendations: (artisanId: string, limitCount: number = 10) =>
    query(
      schemeSahayakCollections.recommendations,
      where('artisanId', '==', artisanId),
      orderBy('aiScore', 'desc'),
      orderBy('lastUpdated', 'desc'),
      limit(limitCount)
    ),

  getUrgentRecommendations: (artisanId: string) =>
    query(
      schemeSahayakCollections.recommendations,
      where('artisanId', '==', artisanId),
      where('urgencyScore', '>=', 7),
      orderBy('urgencyScore', 'desc'),
      orderBy('lastUpdated', 'desc')
    ),

  // Notification queries
  getUserNotifications: (userId: string, limitCount: number = 20) =>
    query(
      schemeSahayakCollections.notifications,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ),

  getPendingNotifications: () =>
    query(
      schemeSahayakCollections.notifications,
      where('status', '==', 'pending'),
      where('scheduledFor', '<=', new Date()),
      orderBy('priority', 'desc')
    ),

  // Document queries
  getArtisanDocuments: (artisanId: string) =>
    query(
      schemeSahayakCollections.documents,
      where('artisanId', '==', artisanId),
      orderBy('uploadDate', 'desc')
    ),

  getExpiringDocuments: (artisanId: string, daysAhead: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return query(
      schemeSahayakCollections.documents,
      where('artisanId', '==', artisanId),
      where('expiryDate', '<=', futureDate),
      where('status', '==', 'verified'),
      orderBy('expiryDate', 'asc')
    );
  },

  // Analytics queries
  getArtisanAnalytics: (artisanId: string, startDate: Date, endDate: Date) =>
    query(
      schemeSahayakCollections.analytics,
      where('artisanId', '==', artisanId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    )
} as const;

// ============================================================================
// DOCUMENT REFERENCE HELPERS
// ============================================================================

/**
 * Helper functions to get document references
 */
export const schemeSahayakDocRefs = {
  artisan: (artisanId: string) => 
    doc(schemeSahayakCollections.artisans, artisanId),

  scheme: (schemeId: string) => 
    doc(schemeSahayakCollections.schemes, schemeId),

  application: (applicationId: string) => 
    doc(schemeSahayakCollections.applications, applicationId),

  recommendation: (recommendationId: string) => 
    doc(schemeSahayakCollections.recommendations, recommendationId),

  document: (documentId: string) => 
    doc(schemeSahayakCollections.documents, documentId),

  notification: (notificationId: string) => 
    doc(schemeSahayakCollections.notifications, notificationId),

  userPreferences: (artisanId: string) => 
    doc(schemeSahayakCollections.userPreferences, artisanId),

  feedback: (feedbackId: string) => 
    doc(schemeSahayakCollections.feedback, feedbackId)
} as const;

// ============================================================================
// SECURITY RULES TEMPLATE
// ============================================================================

/**
 * Firestore security rules template for the Scheme Sahayak collections
 * This should be applied in the Firebase console
 */
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Artisan profiles - users can only access their own data
    match /artisans/{artisanId} {
      allow read, write: if request.auth != null && request.auth.uid == artisanId;
    }
    
    // Government schemes - read-only for authenticated users
    match /schemes/{schemeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
    
    // Applications - users can only access their own applications
    match /applications/{applicationId} {
      allow read, write: if request.auth != null && 
        resource.data.artisanId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.artisanId == request.auth.uid;
    }
    
    // Recommendations - users can only access their own recommendations
    match /recommendations/{recommendationId} {
      allow read: if request.auth != null && 
        resource.data.artisanId == request.auth.uid;
      allow write: if request.auth != null && 
        request.auth.token.role in ['admin', 'system'];
    }
    
    // Documents - users can only access their own documents
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        resource.data.artisanId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.artisanId == request.auth.uid;
    }
    
    // Notifications - users can only access their own notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && 
        request.auth.token.role in ['admin', 'system'];
    }
    
    // User preferences - users can only access their own preferences
    match /user_preferences/{artisanId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == artisanId;
    }
    
    // Analytics - read-only for users (their own data), write for system
    match /analytics/{analyticsId} {
      allow read: if request.auth != null && 
        resource.data.artisanId == request.auth.uid;
      allow write: if request.auth != null && 
        request.auth.token.role in ['admin', 'system'];
    }
    
    // Feedback - users can read/write their own feedback
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null && 
        resource.data.artisanId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.artisanId == request.auth.uid;
    }
    
    // ML Features - system only
    match /ml_features/{featureId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role in ['admin', 'system'];
    }
    
    // Sync Status - system only
    match /sync_status/{syncId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role in ['admin', 'system'];
    }
  }
}
`;

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize Scheme Sahayak Firebase configuration
 * This function can be called during app startup to ensure proper setup
 */
export async function initializeSchemeSahayakFirebase(): Promise<{
  success: boolean;
  message: string;
  collections: string[];
}> {
  try {
    // Test database connectivity
    const testDoc = doc(schemeSahayakCollections.schemes, 'test');
    
    // Return success with collection list
    return {
      success: true,
      message: 'Scheme Sahayak Firebase configuration initialized successfully',
      collections: Object.values(SCHEME_SAHAYAK_COLLECTIONS)
    };
  } catch (error) {
    console.error('Failed to initialize Scheme Sahayak Firebase:', error);
    return {
      success: false,
      message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      collections: []
    };
  }
}

// ============================================================================
// BATCH OPERATIONS HELPER
// ============================================================================

/**
 * Helper for batch operations specific to Scheme Sahayak
 */
export const schemeSahayakBatchOps = {
  /**
   * Create multiple recommendations in a batch
   */
  createRecommendationsBatch: (recommendations: AISchemeRecommendation[]) => {
    // Implementation would use Firestore batch operations
    // This is a placeholder for the actual implementation
    return recommendations.map(rec => ({
      type: 'set' as const,
      collection: SCHEME_SAHAYAK_COLLECTIONS.RECOMMENDATIONS,
      docId: rec.id,
      data: rec
    }));
  },

  /**
   * Update multiple application statuses in a batch
   */
  updateApplicationStatusesBatch: (updates: Array<{ id: string; status: string; lastUpdated: Date }>) => {
    return updates.map(update => ({
      type: 'update' as const,
      collection: SCHEME_SAHAYAK_COLLECTIONS.APPLICATIONS,
      docId: update.id,
      data: { status: update.status, lastUpdated: update.lastUpdated }
    }));
  }
} as const;