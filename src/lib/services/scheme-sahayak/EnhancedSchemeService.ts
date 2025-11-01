/**
 * Enhanced Scheme Service for AI-Powered Scheme Sahayak v2.0
 * Manages government scheme data with advanced categorization, validation, and AI features
 */

import { BaseService } from './base/BaseService';
import { ISchemeService } from './interfaces';
import { timestampToDate } from '../../firestore';
import { 
  schemeSahayakCollections, 
  schemeSahayakQueries, 
  schemeSahayakDocRefs 
} from '../../config/scheme-sahayak-firebase';
import { 
  GovernmentScheme,
  SCHEME_SAHAYAK_COLLECTIONS,
  SchemeSahayakErrorType
} from '../../types/scheme-sahayak';
import { 
  GovernmentSchemeValidator,
  GovernmentSchemeFactory,
  SchemeMetadataManager,
  SCHEME_CATEGORIES,
  BUSINESS_TYPES
} from '../../models/scheme-sahayak/GovernmentScheme';
import {
  SchemeCategorizer,
  SchemeIndexer,
  SchemeClassification
} from '../../models/scheme-sahayak/SchemeCategorization';
import {
  QueryOptimizer,
  IndexManager
} from '../../models/scheme-sahayak/FirestoreIndexes';
import { 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  collection,
  serverTimestamp,
  writeBatch,
  setDoc,
  updateDoc,
  addDoc,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Helper function to convert Firestore scheme data to GovernmentScheme
 */
function convertSchemeData(doc: any): GovernmentScheme {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    application: {
      ...data.application,
      deadline: data.application.deadline ? timestampToDate(data.application.deadline) : undefined
    },
    metadata: {
      ...data.metadata,
      lastUpdated: timestampToDate(data.metadata.lastUpdated)
    }
  } as GovernmentScheme;
}

/**
 * Enhanced Scheme Service Implementation with AI-powered features
 */
export class EnhancedSchemeService extends BaseService implements ISchemeService {
  private queryOptimizer: QueryOptimizer;
  private indexManager: IndexManager;

  constructor() {
    super('EnhancedSchemeService');
    this.queryOptimizer = new QueryOptimizer();
    this.indexManager = new IndexManager();
  }

  // ============================================================================
  // CORE SCHEME OPERATIONS
  // ============================================================================

  /**
   * Get all active schemes with advanced filtering and optimization
   */
  async getActiveSchemes(filters?: {
    category?: string;
    state?: string;
    businessType?: string;
    maxAmount?: number;
    sortBy?: 'popularity' | 'successRate' | 'deadline' | 'amount';
    sortOrder?: 'asc' | 'desc';
    limitCount?: number;
    startAfterDoc?: DocumentSnapshot;
  }): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      // Optimize query using the new query optimizer
      const optimization = QueryOptimizer.optimizeSchemeQuery({
        ...filters,
        status: 'active'
      });

      this.log('info', `Using optimized query with index: ${optimization.indexUsed}`, {
        estimatedCost: optimization.estimatedCost,
        recommendations: optimization.recommendations
      });

      // Execute optimized query
      const q = query(schemeSahayakCollections.schemes, ...optimization.constraints);
      const querySnapshot = await getDocs(q);
      
      let schemes = querySnapshot.docs.map(convertSchemeData);

      // Apply client-side filtering for complex conditions
      if (filters?.maxAmount) {
        schemes = schemes.filter(scheme => 
          scheme.benefits.amount.min <= filters.maxAmount!
        );
      }

      // Log performance metrics
      this.log('info', 'Scheme query completed', {
        resultCount: schemes.length,
        documentsRead: querySnapshot.size,
        indexUsed: optimization.indexUsed
      });

      return schemes;
    }, 'Failed to get active schemes', 'GET_ACTIVE_SCHEMES_FAILED');
  }

  /**
   * Get scheme by ID with enhanced metadata
   */
  async getSchemeById(schemeId: string): Promise<GovernmentScheme | null> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);

      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const scheme = convertSchemeData(docSnap);
      
      // Enhance with real-time classification if needed
      if (!scheme.metadata.aiFeatures || Object.keys(scheme.metadata.aiFeatures).length === 0) {
        await this.enhanceSchemeWithAIFeatures(scheme);
      }

      return scheme;
    }, 'Failed to get scheme by ID', 'GET_SCHEME_BY_ID_FAILED');
  }

  /**
   * Advanced scheme search with full-text capabilities
   */
  async searchSchemes(
    query: string,
    filters?: {
      category?: string;
      state?: string;
      businessType?: string;
      maxAmount?: number;
      sortBy?: string;
      limitCount?: number;
    }
  ): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const sanitizedQuery = this.sanitizeInput(query.toLowerCase());

      // Get schemes with basic filters first
      const activeSchemes = await this.getActiveSchemes(filters);

      // Perform enhanced text search using the indexer
      const searchResults = activeSchemes.filter(scheme => {
        const searchIndex = SchemeIndexer.createSearchIndex(scheme);
        
        // Check text index
        const queryWords = sanitizedQuery.split(/\s+/);
        const textMatches = queryWords.some(word => 
          searchIndex.textIndex.some(token => token.includes(word))
        );

        // Check category index
        const categoryMatches = searchIndex.categoryIndex.some(cat => 
          cat.toLowerCase().includes(sanitizedQuery)
        );

        // Check business type index
        const businessTypeMatches = searchIndex.businessTypeIndex.some(type => 
          type.includes(sanitizedQuery)
        );

        return textMatches || categoryMatches || businessTypeMatches;
      });

      // Enhanced scoring and ranking
      const scoredResults = searchResults.map(scheme => {
        const classification = SchemeCategorizer.classifyScheme(scheme);
        let relevanceScore = 0;

        // Title match bonus
        if (scheme.title.toLowerCase().includes(sanitizedQuery)) {
          relevanceScore += 10;
        }

        // Description match bonus
        if (scheme.description.toLowerCase().includes(sanitizedQuery)) {
          relevanceScore += 5;
        }

        // Category match bonus
        if (scheme.category.toLowerCase().includes(sanitizedQuery)) {
          relevanceScore += 8;
        }

        // Popularity and success rate bonus
        relevanceScore += (scheme.metadata.popularity / 100) * 3;
        relevanceScore += (scheme.metadata.successRate / 100) * 2;

        // Accessibility bonus
        relevanceScore += (classification.accessibilityScore / 100) * 2;

        return {
          scheme,
          relevanceScore,
          classification
        };
      });

      // Sort by relevance score
      scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return scoredResults.map(result => result.scheme);
    }, 'Failed to search schemes', 'SEARCH_SCHEMES_FAILED');
  }

  /**
   * Get schemes by category with enhanced classification
   */
  async getSchemesByCategory(category: string): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (!category || typeof category !== 'string') {
        throw new Error('Category is required');
      }

      // Validate category
      if (!Object.keys(SCHEME_CATEGORIES).includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      const q = schemeSahayakQueries.getSchemesByCategory(category);
      const querySnapshot = await getDocs(q);

      const schemes = querySnapshot.docs.map(convertSchemeData);

      // Enhance with classification data
      const enhancedSchemes = await Promise.all(
        schemes.map(async (scheme) => {
          const classification = SchemeCategorizer.classifyScheme(scheme);
          return {
            ...scheme,
            _classification: classification // Add classification metadata
          };
        })
      );

      return enhancedSchemes;
    }, 'Failed to get schemes by category', 'GET_SCHEMES_BY_CATEGORY_FAILED');
  }

  /**
   * Get popular schemes with enhanced ranking
   */
  async getPopularSchemes(limitCount: number = 10): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (limitCount <= 0 || limitCount > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      const q = schemeSahayakQueries.getPopularSchemes(limitCount);
      const querySnapshot = await getDocs(q);

      const schemes = querySnapshot.docs.map(convertSchemeData);

      // Re-rank based on multiple factors
      const rankedSchemes = schemes.map(scheme => {
        const classification = SchemeCategorizer.classifyScheme(scheme);
        
        // Calculate composite popularity score
        const compositeScore = (
          scheme.metadata.popularity * 0.4 +
          scheme.metadata.successRate * 0.3 +
          classification.accessibilityScore * 0.2 +
          (scheme.metadata.averageProcessingTime > 0 ? (100 - scheme.metadata.averageProcessingTime) : 50) * 0.1
        );

        return {
          ...scheme,
          _compositeScore: compositeScore,
          _classification: classification
        };
      });

      // Sort by composite score
      rankedSchemes.sort((a, b) => b._compositeScore - a._compositeScore);

      return rankedSchemes;
    }, 'Failed to get popular schemes', 'GET_POPULAR_SCHEMES_FAILED');
  }

  // ============================================================================
  // SCHEME MANAGEMENT AND VALIDATION
  // ============================================================================

  /**
   * Create a new government scheme with validation
   */
  async createScheme(schemeData: Partial<GovernmentScheme>): Promise<string> {
    return this.handleAsync(async () => {
      // Validate scheme data
      const validation = GovernmentSchemeValidator.validate(schemeData);
      
      if (!validation.isValid) {
        throw new Error(`Scheme validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        this.log('warn', 'Scheme validation warnings', { warnings: validation.warnings });
      }

      // Generate AI features and classification
      const completeScheme = await this.prepareSchemeForStorage(schemeData);

      // Create document
      const docRef = await addDoc(schemeSahayakCollections.schemes, completeScheme);
      
      this.log('info', 'New scheme created', { 
        schemeId: docRef.id, 
        title: completeScheme.title,
        category: completeScheme.category
      });

      return docRef.id;
    }, 'Failed to create scheme', 'CREATE_SCHEME_FAILED');
  }

  /**
   * Update existing scheme with validation
   */
  async updateScheme(schemeId: string, updates: Partial<GovernmentScheme>): Promise<void> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);

      // Get existing scheme
      const existingScheme = await this.getSchemeById(schemeId);
      if (!existingScheme) {
        throw new Error('Scheme not found');
      }

      // Merge updates with existing data
      const updatedScheme = { ...existingScheme, ...updates };

      // Validate updated scheme
      const validation = GovernmentSchemeValidator.validate(updatedScheme);
      
      if (!validation.isValid) {
        throw new Error(`Scheme validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare for storage with updated metadata
      const preparedScheme = await this.prepareSchemeForStorage(updatedScheme);

      // Update document
      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      await updateDoc(docRef, {
        ...preparedScheme,
        metadata: {
          ...preparedScheme.metadata,
          lastUpdated: serverTimestamp()
        }
      });

      this.log('info', 'Scheme updated', { 
        schemeId, 
        updatedFields: Object.keys(updates)
      });
    }, 'Failed to update scheme', 'UPDATE_SCHEME_FAILED');
  }

  /**
   * Sync scheme data from government APIs with enhanced processing
   */
  async syncSchemeData(): Promise<{
    updated: number;
    added: number;
    removed: number;
    errors: string[];
    performance: {
      totalProcessingTime: number;
      averageProcessingTime: number;
      successRate: number;
    };
  }> {
    return this.handleAsync(async () => {
      const startTime = Date.now();
      this.log('info', 'Starting enhanced scheme data synchronization');

      const result = {
        updated: 0,
        added: 0,
        removed: 0,
        errors: [] as string[],
        performance: {
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          successRate: 0
        }
      };

      try {
        // In a real implementation, this would:
        // 1. Fetch data from various government APIs
        // 2. Validate and categorize each scheme
        // 3. Update existing schemes or create new ones
        // 4. Remove schemes that are no longer active
        // 5. Update metadata and AI features

        // Placeholder implementation
        const schemes = await this.getActiveSchemes({ limitCount: 100 });
        
        // Update AI features for existing schemes
        for (const scheme of schemes) {
          try {
            await this.enhanceSchemeWithAIFeatures(scheme);
            result.updated++;
          } catch (error) {
            result.errors.push(`Failed to update scheme ${scheme.id}: ${error}`);
          }
        }

        // Calculate performance metrics
        const endTime = Date.now();
        result.performance.totalProcessingTime = endTime - startTime;
        result.performance.averageProcessingTime = result.performance.totalProcessingTime / Math.max(schemes.length, 1);
        result.performance.successRate = ((result.updated + result.added) / Math.max(schemes.length, 1)) * 100;

        this.log('info', 'Enhanced scheme data synchronization completed', result);
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(errorMessage);
        this.log('error', 'Scheme data synchronization failed', error);
        return result;
      }
    }, 'Failed to sync scheme data', 'SYNC_SCHEME_DATA_FAILED');
  }

  // ============================================================================
  // AI AND ANALYTICS FEATURES
  // ============================================================================

  /**
   * Enhance scheme with AI features and classification
   */
  private async enhanceSchemeWithAIFeatures(scheme: GovernmentScheme): Promise<void> {
    try {
      // Calculate AI features
      const aiFeatures = SchemeMetadataManager.calculateAIFeatures(scheme);
      
      // Get classification
      const classification = SchemeCategorizer.classifyScheme(scheme);
      
      // Create search index
      const searchIndex = SchemeIndexer.createSearchIndex(scheme);

      // Update scheme metadata
      const updatedMetadata = {
        ...scheme.metadata,
        aiFeatures,
        lastUpdated: new Date(),
        // Add classification data
        _classification: classification,
        _searchIndex: searchIndex
      };

      // Update in Firestore
      const docRef = schemeSahayakDocRefs.scheme(scheme.id);
      await updateDoc(docRef, {
        metadata: updatedMetadata
      });

      this.log('info', 'Enhanced scheme with AI features', {
        schemeId: scheme.id,
        featuresCount: Object.keys(aiFeatures).length,
        complexityLevel: classification.complexityLevel,
        accessibilityScore: classification.accessibilityScore
      });
    } catch (error) {
      this.log('error', 'Failed to enhance scheme with AI features', {
        schemeId: scheme.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Prepare scheme data for storage with all enhancements
   */
  private async prepareSchemeForStorage(schemeData: Partial<GovernmentScheme>): Promise<GovernmentScheme> {
    const now = new Date();

    // Ensure required fields
    const completeScheme: GovernmentScheme = {
      id: schemeData.id || '',
      title: schemeData.title || '',
      description: schemeData.description || '',
      category: schemeData.category || 'grant',
      subCategory: schemeData.subCategory || '',
      provider: schemeData.provider || {
        name: '',
        department: '',
        level: 'state',
        website: '',
        contactInfo: {}
      },
      eligibility: schemeData.eligibility || {
        age: {},
        income: {},
        businessType: [],
        location: { states: [], districts: [], pincodes: [] },
        otherCriteria: []
      },
      benefits: schemeData.benefits || {
        amount: { min: 0, max: 0, currency: 'INR' },
        type: 'grant',
        coverageDetails: ''
      },
      application: schemeData.application || {
        onlineApplication: false,
        requiredDocuments: [],
        applicationSteps: [],
        processingTime: { min: 30, max: 90 }
      },
      metadata: {
        popularity: schemeData.metadata?.popularity || 0,
        successRate: schemeData.metadata?.successRate || 0,
        averageProcessingTime: schemeData.metadata?.averageProcessingTime || 60,
        aiFeatures: {},
        lastUpdated: now
      },
      status: schemeData.status || 'active'
    };

    // Calculate AI features
    completeScheme.metadata.aiFeatures = SchemeMetadataManager.calculateAIFeatures(completeScheme);

    return completeScheme;
  }

  /**
   * Get comprehensive scheme statistics with AI insights
   */
  async getSchemeStatistics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    categoryCounts: Record<string, number>;
    averageSuccessRate: number;
    complexityDistribution: Record<string, number>;
    accessibilityMetrics: {
      averageScore: number;
      highAccessibility: number;
      lowAccessibility: number;
    };
    performanceMetrics: {
      averageProcessingTime: number;
      onlineApplicationRate: number;
      popularityDistribution: Record<string, number>;
    };
  }> {
    return this.handleAsync(async () => {
      // Get all schemes
      const allSchemesQuery = query(schemeSahayakCollections.schemes);
      const allSchemesSnapshot = await getDocs(allSchemesQuery);
      
      const schemes = allSchemesSnapshot.docs.map(doc => doc.data() as GovernmentScheme);
      
      const totalSchemes = schemes.length;
      const activeSchemes = schemes.filter(scheme => scheme.status === 'active').length;
      
      // Calculate category counts
      const categoryCounts: Record<string, number> = {};
      const complexityDistribution: Record<string, number> = { low: 0, medium: 0, high: 0 };
      const popularityDistribution: Record<string, number> = { low: 0, medium: 0, high: 0 };
      
      let totalSuccessRate = 0;
      let totalAccessibilityScore = 0;
      let totalProcessingTime = 0;
      let onlineApplicationCount = 0;
      let highAccessibilityCount = 0;
      let lowAccessibilityCount = 0;

      schemes.forEach(scheme => {
        if (scheme.status === 'active') {
          // Category counts
          categoryCounts[scheme.category] = (categoryCounts[scheme.category] || 0) + 1;
          
          // Classification for complexity and accessibility
          const classification = SchemeCategorizer.classifyScheme(scheme);
          complexityDistribution[classification.complexityLevel]++;
          
          totalAccessibilityScore += classification.accessibilityScore;
          if (classification.accessibilityScore >= 80) highAccessibilityCount++;
          if (classification.accessibilityScore <= 40) lowAccessibilityCount++;
          
          // Other metrics
          totalSuccessRate += scheme.metadata.successRate;
          totalProcessingTime += scheme.metadata.averageProcessingTime;
          
          if (scheme.application.onlineApplication) onlineApplicationCount++;
          
          // Popularity distribution
          if (scheme.metadata.popularity >= 70) popularityDistribution.high++;
          else if (scheme.metadata.popularity >= 30) popularityDistribution.medium++;
          else popularityDistribution.low++;
        }
      });
      
      const averageSuccessRate = activeSchemes > 0 ? totalSuccessRate / activeSchemes : 0;
      const averageAccessibilityScore = activeSchemes > 0 ? totalAccessibilityScore / activeSchemes : 0;
      const averageProcessingTime = activeSchemes > 0 ? totalProcessingTime / activeSchemes : 0;
      const onlineApplicationRate = activeSchemes > 0 ? (onlineApplicationCount / activeSchemes) * 100 : 0;

      return {
        totalSchemes,
        activeSchemes,
        categoryCounts,
        averageSuccessRate,
        complexityDistribution,
        accessibilityMetrics: {
          averageScore: averageAccessibilityScore,
          highAccessibility: highAccessibilityCount,
          lowAccessibility: lowAccessibilityCount
        },
        performanceMetrics: {
          averageProcessingTime,
          onlineApplicationRate,
          popularityDistribution
        }
      };
    }, 'Failed to get scheme statistics', 'GET_SCHEME_STATISTICS_FAILED');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get schemes with upcoming deadlines
   */
  async getSchemesWithUpcomingDeadlines(daysAhead: number = 30): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (daysAhead <= 0 || daysAhead > 365) {
        throw new Error('Days ahead must be between 1 and 365');
      }

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const q = query(
        schemeSahayakCollections.schemes,
        where('status', '==', 'active'),
        where('application.deadline', '<=', futureDate),
        where('application.deadline', '>=', new Date()),
        orderBy('application.deadline', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertSchemeData);
    }, 'Failed to get schemes with upcoming deadlines', 'GET_UPCOMING_DEADLINES_FAILED');
  }

  /**
   * Health check for Enhanced Scheme Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test basic Firestore connectivity
    const testQuery = query(schemeSahayakCollections.schemes, limit(1));
    await getDocs(testQuery);
    
    // Test AI features functionality
    const testScheme = GovernmentSchemeFactory.createScheme({
      title: 'Test Scheme',
      description: 'Test scheme for health check',
      category: 'grant',
      providerName: 'Test Provider',
      providerLevel: 'central'
    });
    
    // Test categorization
    SchemeCategorizer.classifyScheme(testScheme as GovernmentScheme);
    
    // Test validation
    GovernmentSchemeValidator.validate(testScheme);
  }

  /**
   * Get enhanced service metrics
   */
  async getServiceMetrics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    schemesWithDeadlines: number;
    lastSyncTime: Date | null;
    aiEnhancedSchemes: number;
    averageAccessibilityScore: number;
    indexPerformance: {
      queryOptimizationRate: number;
      averageQueryTime: number;
    };
  }> {
    return this.handleAsync(async () => {
      const stats = await this.getSchemeStatistics();
      const upcomingDeadlines = await this.getSchemesWithUpcomingDeadlines(30);
      
      // Count AI-enhanced schemes
      const allSchemes = await this.getActiveSchemes({ limitCount: 1000 });
      const aiEnhancedSchemes = allSchemes.filter(scheme => 
        scheme.metadata.aiFeatures && Object.keys(scheme.metadata.aiFeatures).length > 0
      ).length;
      
      return {
        totalSchemes: stats.totalSchemes,
        activeSchemes: stats.activeSchemes,
        schemesWithDeadlines: upcomingDeadlines.length,
        lastSyncTime: null, // Would be tracked in a real implementation
        aiEnhancedSchemes,
        averageAccessibilityScore: stats.accessibilityMetrics.averageScore,
        indexPerformance: {
          queryOptimizationRate: 85, // Placeholder - would be calculated from actual metrics
          averageQueryTime: 250 // Placeholder - would be calculated from actual metrics
        }
      };
    }, 'Failed to get service metrics', 'GET_METRICS_FAILED');
  }
}

// Export the enhanced service
