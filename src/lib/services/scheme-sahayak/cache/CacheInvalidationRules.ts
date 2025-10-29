/**
 * Cache Invalidation Rules for AI-Powered Scheme Sahayak v2.0
 * Defines rules and strategies for cache invalidation based on data changes
 * Requirements: 10.1, 10.2
 */

import { cacheService, CacheKeyBuilder } from './CacheService';
import { BaseService } from '../base/BaseService';

// ============================================================================
// INVALIDATION EVENT TYPES
// ============================================================================

export enum CacheInvalidationEvent {
  // Scheme events
  SCHEME_CREATED = 'scheme.created',
  SCHEME_UPDATED = 'scheme.updated',
  SCHEME_DELETED = 'scheme.deleted',
  SCHEME_STATUS_CHANGED = 'scheme.status.changed',
  
  // User events
  USER_PROFILE_UPDATED = 'user.profile.updated',
  USER_PREFERENCES_UPDATED = 'user.preferences.updated',
  USER_DELETED = 'user.deleted',
  
  // Application events
  APPLICATION_SUBMITTED = 'application.submitted',
  APPLICATION_STATUS_UPDATED = 'application.status.updated',
  APPLICATION_DELETED = 'application.deleted',
  
  // Document events
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_VERIFIED = 'document.verified',
  DOCUMENT_DELETED = 'document.deleted',
  
  // Recommendation events
  RECOMMENDATIONS_GENERATED = 'recommendations.generated',
  ML_MODEL_UPDATED = 'ml.model.updated',
  
  // Analytics events
  ANALYTICS_UPDATED = 'analytics.updated',
  
  // System events
  BULK_DATA_IMPORT = 'system.bulk.import',
  CACHE_CLEAR_ALL = 'system.cache.clear'
}

// ============================================================================
// INVALIDATION RULE DEFINITION
// ============================================================================

export interface InvalidationRule {
  event: CacheInvalidationEvent;
  patterns: string[];
  description: string;
  priority: 'high' | 'medium' | 'low';
  cascading?: boolean; // Whether this triggers other invalidations
}

// ============================================================================
// CACHE INVALIDATION RULES
// ============================================================================

export const CACHE_INVALIDATION_RULES: InvalidationRule[] = [
  // Scheme-related rules
  {
    event: CacheInvalidationEvent.SCHEME_CREATED,
    patterns: [
      'schemes:*',
      'schemes:category:*',
      'schemes:popular:*',
      'recommendations:*',
      'search:*',
      'analytics:*'
    ],
    description: 'New scheme created - invalidate scheme lists and recommendations',
    priority: 'high',
    cascading: true
  },
  {
    event: CacheInvalidationEvent.SCHEME_UPDATED,
    patterns: [
      'scheme:{schemeId}',
      'schemes:*',
      'schemes:category:*',
      'recommendations:*',
      'search:*'
    ],
    description: 'Scheme updated - invalidate specific scheme and related caches',
    priority: 'high',
    cascading: true
  },
  {
    event: CacheInvalidationEvent.SCHEME_DELETED,
    patterns: [
      'scheme:{schemeId}',
      'schemes:*',
      'schemes:category:*',
      'schemes:popular:*',
      'recommendations:*',
      'search:*'
    ],
    description: 'Scheme deleted - invalidate all scheme-related caches',
    priority: 'high',
    cascading: true
  },
  {
    event: CacheInvalidationEvent.SCHEME_STATUS_CHANGED,
    patterns: [
      'scheme:{schemeId}',
      'schemes:*',
      'recommendations:*'
    ],
    description: 'Scheme status changed - invalidate scheme and recommendations',
    priority: 'high',
    cascading: true
  },

  // User-related rules
  {
    event: CacheInvalidationEvent.USER_PROFILE_UPDATED,
    patterns: [
      'user:{userId}:profile',
      'recommendations:{userId}*',
      'user:{userId}:applications'
    ],
    description: 'User profile updated - invalidate user data and recommendations',
    priority: 'high',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.USER_PREFERENCES_UPDATED,
    patterns: [
      'user:{userId}:preferences',
      'recommendations:{userId}*'
    ],
    description: 'User preferences updated - invalidate preferences and recommendations',
    priority: 'medium',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.USER_DELETED,
    patterns: [
      'user:{userId}:*',
      'recommendations:{userId}*',
      'session:*'
    ],
    description: 'User deleted - invalidate all user-related caches',
    priority: 'high',
    cascading: false
  },

  // Application-related rules
  {
    event: CacheInvalidationEvent.APPLICATION_SUBMITTED,
    patterns: [
      'user:{userId}:applications',
      'recommendations:{userId}*',
      'analytics:*'
    ],
    description: 'Application submitted - invalidate user applications and analytics',
    priority: 'medium',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.APPLICATION_STATUS_UPDATED,
    patterns: [
      'user:{userId}:applications',
      'analytics:*'
    ],
    description: 'Application status updated - invalidate applications and analytics',
    priority: 'medium',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.APPLICATION_DELETED,
    patterns: [
      'user:{userId}:applications',
      'analytics:*'
    ],
    description: 'Application deleted - invalidate applications and analytics',
    priority: 'low',
    cascading: false
  },

  // Document-related rules
  {
    event: CacheInvalidationEvent.DOCUMENT_UPLOADED,
    patterns: [
      'user:{userId}:profile',
      'recommendations:{userId}*'
    ],
    description: 'Document uploaded - invalidate user profile and recommendations',
    priority: 'medium',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.DOCUMENT_VERIFIED,
    patterns: [
      'user:{userId}:profile',
      'recommendations:{userId}*'
    ],
    description: 'Document verified - invalidate user profile and recommendations',
    priority: 'medium',
    cascading: false
  },
  {
    event: CacheInvalidationEvent.DOCUMENT_DELETED,
    patterns: [
      'user:{userId}:profile',
      'recommendations:{userId}*'
    ],
    description: 'Document deleted - invalidate user profile and recommendations',
    priority: 'low',
    cascading: false
  },

  // Recommendation-related rules
  {
    event: CacheInvalidationEvent.ML_MODEL_UPDATED,
    patterns: [
      'recommendations:*',
      'analytics:*'
    ],
    description: 'ML model updated - invalidate all recommendations',
    priority: 'high',
    cascading: true
  },

  // Analytics-related rules
  {
    event: CacheInvalidationEvent.ANALYTICS_UPDATED,
    patterns: [
      'analytics:*'
    ],
    description: 'Analytics updated - invalidate analytics caches',
    priority: 'low',
    cascading: false
  },

  // System-wide rules
  {
    event: CacheInvalidationEvent.BULK_DATA_IMPORT,
    patterns: [
      'schemes:*',
      'recommendations:*',
      'search:*',
      'analytics:*'
    ],
    description: 'Bulk data import - invalidate most caches',
    priority: 'high',
    cascading: true
  },
  {
    event: CacheInvalidationEvent.CACHE_CLEAR_ALL,
    patterns: ['*'],
    description: 'Clear all caches',
    priority: 'high',
    cascading: false
  }
];

// ============================================================================
// CACHE INVALIDATION SERVICE
// ============================================================================

export class CacheInvalidationService extends BaseService {
  private keyBuilder: CacheKeyBuilder;
  private rules: Map<CacheInvalidationEvent, InvalidationRule>;

  constructor() {
    super('CacheInvalidationService');
    this.keyBuilder = new CacheKeyBuilder();
    this.rules = new Map();

    // Load rules
    CACHE_INVALIDATION_RULES.forEach(rule => {
      this.rules.set(rule.event, rule);
    });
  }

  // ============================================================================
  // INVALIDATION METHODS
  // ============================================================================

  /**
   * Invalidate cache based on event
   */
  async invalidate(
    event: CacheInvalidationEvent,
    context?: Record<string, string>
  ): Promise<{
    success: boolean;
    patternsInvalidated: string[];
    keysDeleted: number;
    error?: string;
  }> {
    return this.handleAsync(async () => {
      const rule = this.rules.get(event);
      
      if (!rule) {
        throw new Error(`No invalidation rule found for event: ${event}`);
      }

      this.log('info', `Invalidating cache for event: ${event}`, {
        priority: rule.priority,
        context
      });

      const patternsInvalidated: string[] = [];
      let totalKeysDeleted = 0;

      // Process each pattern
      for (const pattern of rule.patterns) {
        // Replace placeholders with context values
        let resolvedPattern = pattern;
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            resolvedPattern = resolvedPattern.replace(`{${key}}`, value);
          });
        }

        // Build full key pattern
        const fullPattern = this.keyBuilder.pattern(resolvedPattern);
        
        // Delete matching keys
        const deletedCount = await cacheService.deletePattern(fullPattern);
        totalKeysDeleted += deletedCount;
        patternsInvalidated.push(fullPattern);

        this.log('debug', `Invalidated pattern: ${fullPattern}`, {
          keysDeleted: deletedCount
        });
      }

      this.log('info', `Cache invalidation completed for event: ${event}`, {
        patternsInvalidated: patternsInvalidated.length,
        totalKeysDeleted
      });

      return {
        success: true,
        patternsInvalidated,
        keysDeleted: totalKeysDeleted
      };
    }, `Failed to invalidate cache for event: ${event}`, 'CACHE_INVALIDATION_FAILED');
  }

  /**
   * Invalidate scheme-related caches
   */
  async invalidateScheme(schemeId: string, event: CacheInvalidationEvent): Promise<void> {
    await this.invalidate(event, { schemeId });
  }

  /**
   * Invalidate user-related caches
   */
  async invalidateUser(userId: string, event: CacheInvalidationEvent): Promise<void> {
    await this.invalidate(event, { userId });
  }

  /**
   * Invalidate application-related caches
   */
  async invalidateApplication(
    userId: string,
    applicationId: string,
    event: CacheInvalidationEvent
  ): Promise<void> {
    await this.invalidate(event, { userId, applicationId });
  }

  /**
   * Batch invalidation for multiple events
   */
  async batchInvalidate(
    events: Array<{ event: CacheInvalidationEvent; context?: Record<string, string> }>
  ): Promise<{
    totalKeysDeleted: number;
    results: Array<{ event: CacheInvalidationEvent; success: boolean; keysDeleted: number }>;
  }> {
    return this.handleAsync(async () => {
      const results: Array<{ event: CacheInvalidationEvent; success: boolean; keysDeleted: number }> = [];
      let totalKeysDeleted = 0;

      for (const { event, context } of events) {
        try {
          const result = await this.invalidate(event, context);
          results.push({
            event,
            success: result.success,
            keysDeleted: result.keysDeleted
          });
          totalKeysDeleted += result.keysDeleted;
        } catch (error) {
          this.log('error', `Failed to invalidate cache for event: ${event}`, error);
          results.push({
            event,
            success: false,
            keysDeleted: 0
          });
        }
      }

      return {
        totalKeysDeleted,
        results
      };
    }, 'Failed to perform batch invalidation', 'BATCH_INVALIDATION_FAILED');
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Invalidate when scheme is created
   */
  async onSchemeCreated(schemeId: string): Promise<void> {
    await this.invalidateScheme(schemeId, CacheInvalidationEvent.SCHEME_CREATED);
  }

  /**
   * Invalidate when scheme is updated
   */
  async onSchemeUpdated(schemeId: string): Promise<void> {
    await this.invalidateScheme(schemeId, CacheInvalidationEvent.SCHEME_UPDATED);
  }

  /**
   * Invalidate when scheme is deleted
   */
  async onSchemeDeleted(schemeId: string): Promise<void> {
    await this.invalidateScheme(schemeId, CacheInvalidationEvent.SCHEME_DELETED);
  }

  /**
   * Invalidate when user profile is updated
   */
  async onUserProfileUpdated(userId: string): Promise<void> {
    await this.invalidateUser(userId, CacheInvalidationEvent.USER_PROFILE_UPDATED);
  }

  /**
   * Invalidate when user preferences are updated
   */
  async onUserPreferencesUpdated(userId: string): Promise<void> {
    await this.invalidateUser(userId, CacheInvalidationEvent.USER_PREFERENCES_UPDATED);
  }

  /**
   * Invalidate when application is submitted
   */
  async onApplicationSubmitted(userId: string, applicationId: string): Promise<void> {
    await this.invalidateApplication(userId, applicationId, CacheInvalidationEvent.APPLICATION_SUBMITTED);
  }

  /**
   * Invalidate when document is uploaded
   */
  async onDocumentUploaded(userId: string): Promise<void> {
    await this.invalidateUser(userId, CacheInvalidationEvent.DOCUMENT_UPLOADED);
  }

  /**
   * Invalidate when ML model is updated
   */
  async onMLModelUpdated(): Promise<void> {
    await this.invalidate(CacheInvalidationEvent.ML_MODEL_UPDATED);
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    await this.invalidate(CacheInvalidationEvent.CACHE_CLEAR_ALL);
  }

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  /**
   * Get all invalidation rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule for specific event
   */
  getRule(event: CacheInvalidationEvent): InvalidationRule | undefined {
    return this.rules.get(event);
  }

  /**
   * Get rules by priority
   */
  getRulesByPriority(priority: 'high' | 'medium' | 'low'): InvalidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.priority === priority);
  }

  /**
   * Health check
   */
  protected async performHealthCheck(): Promise<void> {
    // Verify cache service is available
    await cacheService.getStats();
  }
}

// Export singleton instance
export const cacheInvalidationService = new CacheInvalidationService();
