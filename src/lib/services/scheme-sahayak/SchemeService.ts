/**
 * Enhanced Scheme Service for AI-Powered Scheme Sahayak v2.0
 * Manages government scheme data, discovery, validation, and metadata
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
  GovernmentSchemeModel,
  SchemeCategorization,
  SCHEME_CATEGORIES,
  BUSINESS_TYPES,
  INDIAN_STATES
} from '../../models/scheme-sahayak/GovernmentScheme';
import { 
  SchemeMetadataManager,
  SchemeIndexing,
  SchemePerformanceMetrics,
  SchemeAnalytics
} from '../../models/scheme-sahayak/SchemeMetadata';
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
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment
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
 * Enhanced Scheme Service Implementation with validation and metadata management
 */
export class SchemeService extends BaseService implements ISchemeService {
  constructor() {
    super('SchemeService');
  }

  /**
   * Get all active schemes with optional filtering
   */
  async getActiveSchemes(filters?: {
    category?: string;
    state?: string;
    businessType?: string;
    maxAmount?: number;
  }): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      let q = schemeSahayakQueries.getActiveSchemes();

      // Apply additional filters if provided
      if (filters) {
        const constraints = [where('status', '==', 'active')];

        if (filters.category) {
          constraints.push(where('category', '==', filters.category));
        }

        if (filters.state) {
          constraints.push(where('eligibility.location.states', 'array-contains', filters.state));
        }

        if (filters.businessType) {
          constraints.push(where('eligibility.businessType', 'array-contains', filters.businessType));
        }

        // For amount filtering, we'd need to handle this client-side or use a different approach
        // as Firestore doesn't support range queries on nested fields easily

        // Add orderBy as a separate constraint
        q = query(schemeSahayakCollections.schemes, ...constraints, orderBy('metadata.popularity', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const schemes = querySnapshot.docs.map(convertSchemeData);

      // Apply client-side filtering for amount if needed
      if (filters?.maxAmount) {
        return schemes.filter(scheme => 
          scheme.benefits.amount.min <= filters.maxAmount!
        );
      }

      return schemes;
    }, 'Failed to get active schemes', 'GET_ACTIVE_SCHEMES_FAILED');
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(schemeId: string): Promise<GovernmentScheme | null> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);

      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return convertSchemeData(docSnap);
    }, 'Failed to get scheme by ID', 'GET_SCHEME_BY_ID_FAILED');
  }

  /**
   * Search schemes by text query
   */
  async searchSchemes(
    query: string,
    filters?: Record<string, any>
  ): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const sanitizedQuery = this.sanitizeInput(query.toLowerCase());

      // Get all active schemes first (in a production system, you'd use a search service like Elasticsearch)
      const activeSchemes = await this.getActiveSchemes(filters);

      // Perform client-side text search (this should be replaced with proper search indexing)
      const searchResults = activeSchemes.filter(scheme => {
        const searchableText = [
          scheme.title,
          scheme.description,
          scheme.category,
          scheme.subCategory,
          scheme.provider.name,
          scheme.provider.department,
          ...scheme.eligibility.otherCriteria,
          scheme.benefits.coverageDetails
        ].join(' ').toLowerCase();

        return searchableText.includes(sanitizedQuery);
      });

      // Sort by relevance (simple scoring based on title match)
      return searchResults.sort((a, b) => {
        const aScore = a.title.toLowerCase().includes(sanitizedQuery) ? 1 : 0;
        const bScore = b.title.toLowerCase().includes(sanitizedQuery) ? 1 : 0;
        
        if (aScore !== bScore) {
          return bScore - aScore;
        }
        
        return b.metadata.popularity - a.metadata.popularity;
      });
    }, 'Failed to search schemes', 'SEARCH_SCHEMES_FAILED');
  }

  /**
   * Get schemes by category
   */
  async getSchemesByCategory(category: string): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (!category || typeof category !== 'string') {
        throw new Error('Category is required');
      }

      const q = schemeSahayakQueries.getSchemesByCategory(category);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(convertSchemeData);
    }, 'Failed to get schemes by category', 'GET_SCHEMES_BY_CATEGORY_FAILED');
  }

  /**
   * Get popular schemes
   */
  async getPopularSchemes(limitCount: number = 10): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (limitCount <= 0 || limitCount > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      const q = schemeSahayakQueries.getPopularSchemes(limitCount);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(convertSchemeData);
    }, 'Failed to get popular schemes', 'GET_POPULAR_SCHEMES_FAILED');
  }

  /**
   * Update scheme data from government APIs
   */
  async syncSchemeData(): Promise<{
    updated: number;
    added: number;
    removed: number;
    errors: string[];
  }> {
    return this.handleAsync(async () => {
      // This is a placeholder implementation
      // In a real system, this would:
      // 1. Fetch data from various government APIs
      // 2. Compare with existing data
      // 3. Update/add/remove schemes as needed
      // 4. Handle rate limiting and error recovery

      this.log('info', 'Starting scheme data synchronization');

      const result = {
        updated: 0,
        added: 0,
        removed: 0,
        errors: [] as string[]
      };

      try {
        // Placeholder: In reality, you'd call government APIs here
        // const governmentData = await this.fetchFromGovernmentAPIs();
        
        // For now, just log that sync was attempted
        this.log('info', 'Scheme data synchronization completed');
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(errorMessage);
        this.log('error', 'Scheme data synchronization failed', error);
        return result;
      }
    }, 'Failed to sync scheme data', 'SYNC_SCHEME_DATA_FAILED');
  }

  /**
   * Get scheme statistics
   */
  async getSchemeStatistics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    categoryCounts: Record<string, number>;
    averageSuccessRate: number;
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
      schemes.forEach(scheme => {
        if (scheme.status === 'active') {
          categoryCounts[scheme.category] = (categoryCounts[scheme.category] || 0) + 1;
        }
      });
      
      // Calculate average success rate
      const activeSchemesList = schemes.filter(scheme => scheme.status === 'active');
      const averageSuccessRate = activeSchemesList.length > 0
        ? activeSchemesList.reduce((sum, scheme) => sum + scheme.metadata.successRate, 0) / activeSchemesList.length
        : 0;

      return {
        totalSchemes,
        activeSchemes,
        categoryCounts,
        averageSuccessRate
      };
    }, 'Failed to get scheme statistics', 'GET_SCHEME_STATISTICS_FAILED');
  }

  /**
   * Get schemes by location
   */
  async getSchemesByLocation(state: string, district?: string): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      if (!state || typeof state !== 'string') {
        throw new Error('State is required');
      }

      const q = schemeSahayakQueries.getSchemesByLocation(state);
      const querySnapshot = await getDocs(q);

      let schemes = querySnapshot.docs.map(convertSchemeData);

      // Filter by district if provided (client-side filtering)
      if (district) {
        schemes = schemes.filter(scheme => 
          !scheme.eligibility.location.districts || 
          scheme.eligibility.location.districts.includes(district)
        );
      }

      return schemes;
    }, 'Failed to get schemes by location', 'GET_SCHEMES_BY_LOCATION_FAILED');
  }

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
   * Health check for Scheme Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test basic Firestore connectivity and scheme collection access
    const testQuery = query(schemeSahayakCollections.schemes, limit(1));
    await getDocs(testQuery);
  }

  /**
   * Create a new government scheme with validation
   */
  async createScheme(schemeData: Partial<GovernmentScheme>): Promise<string> {
    return this.handleAsync(async () => {
      // Create and validate scheme model
      const schemeModel = new GovernmentSchemeModel(schemeData);
      const validation = schemeModel.validate();
      
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Scheme validation failed: ${errorMessages}`);
      }
      
      // Log warnings if any
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          this.log('warn', `Scheme validation warning: ${warning.message}`, { field: warning.field });
        });
      }
      
      // Convert to Firestore format and add
      const firestoreData = schemeModel.toFirestoreData();
      const docRef = await addDoc(schemeSahayakCollections.schemes, firestoreData);
      
      this.log('info', 'New scheme created successfully', { schemeId: docRef.id, title: schemeData.title });
      
      return docRef.id;
    }, 'Failed to create scheme', 'CREATE_SCHEME_FAILED');
  }

  /**
   * Update an existing scheme with validation
   */
  async updateScheme(schemeId: string, updates: Partial<GovernmentScheme>): Promise<void> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);
      
      // Get existing scheme
      const existingScheme = await this.getSchemeById(schemeId);
      if (!existingScheme) {
        throw new Error(`Scheme not found: ${schemeId}`);
      }
      
      // Create updated scheme model
      const updatedData = { ...existingScheme, ...updates };
      const schemeModel = new GovernmentSchemeModel(updatedData);
      const validation = schemeModel.validate();
      
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Scheme validation failed: ${errorMessages}`);
      }
      
      // Update in Firestore
      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      const firestoreData = schemeModel.toFirestoreData();
      await updateDoc(docRef, firestoreData);
      
      this.log('info', 'Scheme updated successfully', { schemeId, updates: Object.keys(updates) });
    }, 'Failed to update scheme', 'UPDATE_SCHEME_FAILED');
  }

  /**
   * Delete a scheme
   */
  async deleteScheme(schemeId: string): Promise<void> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);
      
      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      await deleteDoc(docRef);
      
      this.log('info', 'Scheme deleted successfully', { schemeId });
    }, 'Failed to delete scheme', 'DELETE_SCHEME_FAILED');
  }

  /**
   * Get schemes with advanced filtering and sorting
   */
  async getAdvancedSchemes(filters: {
    categories?: string[];
    subCategories?: string[];
    states?: string[];
    businessTypes?: string[];
    governmentLevels?: string[];
    minAmount?: number;
    maxAmount?: number;
    minSuccessRate?: number;
    hasDeadline?: boolean;
    onlineApplication?: boolean;
    sortBy?: 'popularity' | 'successRate' | 'deadline' | 'amount' | 'processingTime';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  } = {}): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      // Start with active schemes
      let schemes = await this.getActiveSchemes();
      
      // Apply filters
      if (filters.categories && filters.categories.length > 0) {
        schemes = schemes.filter(scheme => filters.categories!.includes(scheme.category));
      }
      
      if (filters.subCategories && filters.subCategories.length > 0) {
        schemes = schemes.filter(scheme => filters.subCategories!.includes(scheme.subCategory));
      }
      
      if (filters.states && filters.states.length > 0) {
        schemes = schemes.filter(scheme => 
          !scheme.eligibility.location.states || 
          scheme.eligibility.location.states.some(state => filters.states!.includes(state))
        );
      }
      
      if (filters.businessTypes && filters.businessTypes.length > 0) {
        schemes = schemes.filter(scheme => 
          scheme.eligibility.businessType.length === 0 ||
          scheme.eligibility.businessType.some(type => filters.businessTypes!.includes(type))
        );
      }
      
      if (filters.governmentLevels && filters.governmentLevels.length > 0) {
        schemes = schemes.filter(scheme => filters.governmentLevels!.includes(scheme.provider.level));
      }
      
      if (filters.minAmount !== undefined) {
        schemes = schemes.filter(scheme => scheme.benefits.amount.max >= filters.minAmount!);
      }
      
      if (filters.maxAmount !== undefined) {
        schemes = schemes.filter(scheme => scheme.benefits.amount.min <= filters.maxAmount!);
      }
      
      if (filters.minSuccessRate !== undefined) {
        schemes = schemes.filter(scheme => scheme.metadata.successRate >= filters.minSuccessRate!);
      }
      
      if (filters.hasDeadline !== undefined) {
        schemes = schemes.filter(scheme => 
          filters.hasDeadline ? !!scheme.application.deadline : !scheme.application.deadline
        );
      }
      
      if (filters.onlineApplication !== undefined) {
        schemes = schemes.filter(scheme => scheme.application.onlineApplication === filters.onlineApplication);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        schemes.sort((a, b) => {
          let aValue: number, bValue: number;
          
          switch (filters.sortBy) {
            case 'popularity':
              aValue = a.metadata.popularity;
              bValue = b.metadata.popularity;
              break;
            case 'successRate':
              aValue = a.metadata.successRate;
              bValue = b.metadata.successRate;
              break;
            case 'deadline':
              aValue = a.application.deadline ? a.application.deadline.getTime() : Infinity;
              bValue = b.application.deadline ? b.application.deadline.getTime() : Infinity;
              break;
            case 'amount':
              aValue = a.benefits.amount.max;
              bValue = b.benefits.amount.max;
              break;
            case 'processingTime':
              aValue = a.metadata.averageProcessingTime;
              bValue = b.metadata.averageProcessingTime;
              break;
            default:
              aValue = a.metadata.popularity;
              bValue = b.metadata.popularity;
          }
          
          const order = filters.sortOrder === 'asc' ? 1 : -1;
          return (aValue - bValue) * order;
        });
      }
      
      // Apply limit
      if (filters.limit && filters.limit > 0) {
        schemes = schemes.slice(0, filters.limit);
      }
      
      return schemes;
    }, 'Failed to get advanced schemes', 'GET_ADVANCED_SCHEMES_FAILED');
  }

  /**
   * Get scheme recommendations for an artisan profile
   */
  async getSchemeRecommendations(artisanProfile: {
    age?: number;
    monthlyIncome?: number;
    businessType?: string;
    state?: string;
    district?: string;
    pincode?: string;
    experienceYears?: number;
    previousApplications?: number;
  }, options: {
    maxResults?: number;
    minScore?: number;
    categories?: string[];
  } = {}): Promise<Array<{
    scheme: GovernmentScheme;
    score: number;
    eligibilityMatch: number;
    reasons: string[];
    urgencyScore: number;
  }>> {
    return this.handleAsync(async () => {
      // Get all active schemes
      let schemes = await this.getActiveSchemes();
      
      // Filter by categories if specified
      if (options.categories && options.categories.length > 0) {
        schemes = schemes.filter(scheme => options.categories!.includes(scheme.category));
      }
      
      // Calculate recommendations
      const recommendations = schemes.map(scheme => {
        const schemeModel = new GovernmentSchemeModel(scheme);
        const eligibility = schemeModel.isEligibleFor(artisanProfile);
        const urgencyScore = schemeModel.getUrgencyScore();
        
        // Mock performance metrics for recommendation calculation
        const mockMetrics: SchemePerformanceMetrics = {
          schemeId: scheme.id,
          totalApplications: Math.floor(Math.random() * 1000),
          approvedApplications: Math.floor(Math.random() * 500),
          rejectedApplications: Math.floor(Math.random() * 300),
          pendingApplications: Math.floor(Math.random() * 200),
          successRate: scheme.metadata.successRate,
          averageProcessingTime: scheme.metadata.averageProcessingTime,
          averageApprovalAmount: scheme.benefits.amount.max * 0.7,
          popularityScore: scheme.metadata.popularity,
          userRating: 4.0,
          lastUpdated: new Date(),
          monthlyStats: []
        };
        
        const recommendationScore = SchemeMetadataManager.calculateRecommendationScore(
          scheme,
          artisanProfile,
          mockMetrics
        );
        
        return {
          scheme,
          score: recommendationScore.score,
          eligibilityMatch: eligibility.score,
          reasons: eligibility.reasons.length > 0 ? eligibility.reasons : recommendationScore.explanation,
          urgencyScore
        };
      });
      
      // Filter by minimum score
      const minScore = options.minScore || 50;
      const filteredRecommendations = recommendations.filter(rec => rec.score >= minScore);
      
      // Sort by score (descending)
      filteredRecommendations.sort((a, b) => b.score - a.score);
      
      // Apply limit
      const maxResults = options.maxResults || 10;
      return filteredRecommendations.slice(0, maxResults);
    }, 'Failed to get scheme recommendations', 'GET_RECOMMENDATIONS_FAILED');
  }

  /**
   * Get scheme categories and subcategories
   */
  getSchemeCategories(): Array<{ key: string; name: string; subcategories: string[] }> {
    return SchemeCategorization.getCategories();
  }

  /**
   * Get available business types
   */
  getBusinessTypes(): string[] {
    return [...BUSINESS_TYPES];
  }

  /**
   * Get Indian states
   */
  getIndianStates(): string[] {
    return [...INDIAN_STATES];
  }

  /**
   * Validate scheme data
   */
  async validateSchemeData(schemeData: Partial<GovernmentScheme>): Promise<{
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
    warnings: Array<{ field: string; message: string }>;
  }> {
    return this.handleAsync(async () => {
      const schemeModel = new GovernmentSchemeModel(schemeData);
      const validation = schemeModel.validate();
      
      return {
        isValid: validation.isValid,
        errors: validation.errors.map(e => ({ field: e.field, message: e.message })),
        warnings: validation.warnings.map(w => ({ field: w.field, message: w.message }))
      };
    }, 'Failed to validate scheme data', 'VALIDATE_SCHEME_FAILED');
  }

  /**
   * Generate search keywords for a scheme
   */
  generateSchemeSearchKeywords(scheme: GovernmentScheme): string[] {
    return SchemeIndexing.generateSearchKeywords(scheme);
  }

  /**
   * Generate scheme tags for categorization
   */
  generateSchemeTags(scheme: GovernmentScheme): string[] {
    return SchemeIndexing.generateSchemeTags(scheme);
  }

  /**
   * Update scheme metadata based on performance data
   */
  async updateSchemeMetadata(
    schemeId: string, 
    performanceData: {
      totalApplications?: number;
      approvedApplications?: number;
      rejectedApplications?: number;
      averageProcessingTime?: number;
      userRating?: number;
      viewCount?: number;
    }
  ): Promise<void> {
    return this.handleAsync(async () => {
      this.validateSchemeId(schemeId);
      
      const scheme = await this.getSchemeById(schemeId);
      if (!scheme) {
        throw new Error(`Scheme not found: ${schemeId}`);
      }
      
      // Calculate success rate if application data is provided
      let successRate = scheme.metadata.successRate;
      if (performanceData.totalApplications && performanceData.approvedApplications) {
        successRate = (performanceData.approvedApplications / performanceData.totalApplications) * 100;
      }
      
      // Update metadata
      const updatedScheme = SchemeMetadataManager.updateSchemeMetadata(
        scheme,
        {
          totalApplications: performanceData.totalApplications,
          approvedApplications: performanceData.approvedApplications,
          rejectedApplications: performanceData.rejectedApplications,
          successRate,
          averageProcessingTime: performanceData.averageProcessingTime,
          userRating: performanceData.userRating
        },
        {
          viewCount: performanceData.viewCount
        }
      );
      
      // Update in Firestore
      const docRef = schemeSahayakDocRefs.scheme(schemeId);
      await updateDoc(docRef, {
        'metadata.successRate': updatedScheme.metadata.successRate,
        'metadata.averageProcessingTime': updatedScheme.metadata.averageProcessingTime,
        'metadata.popularity': updatedScheme.metadata.popularity,
        'metadata.aiFeatures': updatedScheme.metadata.aiFeatures,
        'metadata.lastUpdated': serverTimestamp()
      });
      
      this.log('info', 'Scheme metadata updated successfully', { schemeId, performanceData });
    }, 'Failed to update scheme metadata', 'UPDATE_METADATA_FAILED');
  }

  /**
   * Get service-specific metrics
   */
  async getServiceMetrics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    schemesWithDeadlines: number;
    lastSyncTime: Date | null;
    categoryCounts: Record<string, number>;
    averageSuccessRate: number;
  }> {
    return this.handleAsync(async () => {
      const stats = await this.getSchemeStatistics();
      
      // Get schemes with deadlines in next 30 days
      const upcomingDeadlines = await this.getSchemesWithUpcomingDeadlines(30);
      
      return {
        totalSchemes: stats.totalSchemes,
        activeSchemes: stats.activeSchemes,
        schemesWithDeadlines: upcomingDeadlines.length,
        lastSyncTime: null, // Would be tracked in a real implementation
        categoryCounts: stats.categoryCounts,
        averageSuccessRate: stats.averageSuccessRate
      };
    }, 'Failed to get service metrics', 'GET_METRICS_FAILED');
  }
}