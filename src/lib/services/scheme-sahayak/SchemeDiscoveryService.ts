/**
 * Scheme Discovery and Search Service for AI-Powered Scheme Sahayak v2.0
 * Advanced search, filtering, and discovery functionality with Elasticsearch integration
 */

import { BaseService } from './base/BaseService';
import { 
  GovernmentScheme, 
  ArtisanProfile,
  SchemeSahayakErrorType 
} from '../../types/scheme-sahayak';
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
  SCHEME_CATEGORIES,
  BUSINESS_TYPES 
} from '../../models/scheme-sahayak/GovernmentScheme';
import { 
  schemeSahayakCollections,
  schemeSahayakQueries 
} from '../../config/scheme-sahayak-firebase';
import { 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';

// ============================================================================
// SEARCH AND DISCOVERY INTERFACES
// ============================================================================

export interface SchemeSearchFilters {
  // Basic filters
  category?: string;
  subCategory?: string;
  businessType?: string[];
  location?: {
    state?: string;
    district?: string;
    pincode?: string;
  };
  
  // Financial filters
  minAmount?: number;
  maxAmount?: number;
  benefitType?: 'loan' | 'grant' | 'subsidy' | 'training' | 'insurance';
  
  // Eligibility filters
  ageRange?: { min?: number; max?: number };
  incomeRange?: { min?: number; max?: number };
  
  // Application filters
  onlineApplicationOnly?: boolean;
  maxProcessingTime?: number;
  hasUpcomingDeadline?: boolean;
  
  // Quality filters
  minSuccessRate?: number;
  minPopularity?: number;
  maxComplexity?: 'low' | 'medium' | 'high';
  minAccessibilityScore?: number;
  
  // Provider filters
  providerLevel?: 'central' | 'state' | 'district' | 'local';
  
  // Sorting and pagination
  sortBy?: 'relevance' | 'popularity' | 'successRate' | 'deadline' | 'amount' | 'processingTime';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface SchemeSearchResult {
  schemes: EnhancedSchemeResult[];
  totalCount: number;
  hasMore: boolean;
  nextPageToken?: string;
  searchMetadata: {
    query?: string;
    filters: SchemeSearchFilters;
    executionTime: number;
    indexesUsed: string[];
    suggestions: string[];
  };
  facets: {
    categories: Array<{ name: string; count: number }>;
    businessTypes: Array<{ name: string; count: number }>;
    states: Array<{ name: string; count: number }>;
    providerLevels: Array<{ name: string; count: number }>;
    amountRanges: Array<{ range: string; count: number }>;
  };
}

export interface EnhancedSchemeResult extends GovernmentScheme {
  // Search-specific metadata
  _searchScore?: number;
  _relevanceFactors?: string[];
  _matchedTerms?: string[];
  _classification?: SchemeClassification;
  
  // Personalization metadata (when user context is available)
  _eligibilityMatch?: number; // 0-100
  _personalizedScore?: number;
  _recommendationReasons?: string[];
  _missingRequirements?: string[];
}

export interface SchemeDiscoveryOptions {
  // Discovery mode
  mode: 'trending' | 'recommended' | 'deadline_urgent' | 'high_success' | 'easy_access' | 'new_schemes';
  
  // User context for personalization
  userProfile?: ArtisanProfile;
  
  // Discovery parameters
  limitCount?: number;
  excludeApplied?: boolean;
  includeSecondaryMatches?: boolean;
  
  // Freshness parameters
  maxAge?: number; // days
  includeUpcoming?: boolean;
}

// ============================================================================
// ELASTICSEARCH INTEGRATION (PLACEHOLDER)
// ============================================================================

/**
 * Elasticsearch service for advanced full-text search
 * Enhanced implementation with better search capabilities
 */
class ElasticsearchService {
  private isEnabled: boolean = false; // Set to true when Elasticsearch is configured
  private elasticsearchUrl: string = process.env.ELASTICSEARCH_URL || '';
  private indexName: string = 'scheme-sahayak-schemes';

  constructor() {
    // Check if Elasticsearch is configured
    this.isEnabled = !!this.elasticsearchUrl && this.elasticsearchUrl.length > 0;
  }

  /**
   * Perform full-text search using Elasticsearch
   */
  async searchSchemes(
    query: string,
    filters: SchemeSearchFilters,
    options: { from?: number; size?: number } = {}
  ): Promise<{
    hits: Array<{
      scheme: GovernmentScheme;
      score: number;
      highlights: Record<string, string[]>;
    }>;
    total: number;
    aggregations: Record<string, any>;
  }> {
    if (!this.isEnabled) {
      throw new Error('Elasticsearch is not configured');
    }

    try {
      // Build Elasticsearch query
      const searchQuery = this.buildElasticsearchQuery(query, filters);
      
      // In a real implementation, this would make an HTTP request to Elasticsearch
      // For now, we'll simulate the response structure
      const mockResponse = await this.simulateElasticsearchSearch(query, filters, options);
      
      return mockResponse;
    } catch (error) {
      console.error('Elasticsearch search failed:', error);
      throw new Error('Full-text search temporarily unavailable');
    }
  }

  /**
   * Build Elasticsearch query with filters and aggregations
   */
  private buildElasticsearchQuery(query: string, filters: SchemeSearchFilters): any {
    const esQuery: any = {
      query: {
        bool: {
          must: [],
          filter: [],
          should: []
        }
      },
      highlight: {
        fields: {
          title: { fragment_size: 150, number_of_fragments: 1 },
          description: { fragment_size: 200, number_of_fragments: 2 },
          'benefits.coverageDetails': { fragment_size: 150, number_of_fragments: 1 }
        }
      },
      aggs: {
        categories: { terms: { field: 'category.keyword', size: 10 } },
        businessTypes: { terms: { field: 'eligibility.businessType.keyword', size: 15 } },
        states: { terms: { field: 'eligibility.location.states.keyword', size: 30 } },
        providerLevels: { terms: { field: 'provider.level.keyword', size: 4 } },
        amountRanges: {
          range: {
            field: 'benefits.amount.max',
            ranges: [
              { key: 'Up to ₹1L', to: 100000 },
              { key: '₹1L - ₹5L', from: 100000, to: 500000 },
              { key: '₹5L - ₹10L', from: 500000, to: 1000000 },
              { key: 'Above ₹10L', from: 1000000 }
            ]
          }
        }
      }
    };

    // Add text search
    if (query && query.trim()) {
      esQuery.query.bool.must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^3',
            'description^2',
            'benefits.coverageDetails^1.5',
            '_textIndex^1',
            '_categoryIndex^2'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      esQuery.query.bool.must.push({ match_all: {} });
    }

    // Add filters
    esQuery.query.bool.filter.push({ term: { status: 'active' } });

    if (filters.category) {
      esQuery.query.bool.filter.push({ term: { 'category.keyword': filters.category } });
    }

    if (filters.location?.state) {
      esQuery.query.bool.filter.push({
        term: { 'eligibility.location.states.keyword': filters.location.state }
      });
    }

    if (filters.businessType && filters.businessType.length > 0) {
      esQuery.query.bool.filter.push({
        terms: { 'eligibility.businessType.keyword': filters.businessType }
      });
    }

    if (filters.minAmount || filters.maxAmount) {
      const rangeQuery: any = {};
      if (filters.minAmount) rangeQuery.gte = filters.minAmount;
      if (filters.maxAmount) rangeQuery.lte = filters.maxAmount;
      esQuery.query.bool.filter.push({
        range: { 'benefits.amount.max': rangeQuery }
      });
    }

    if (filters.hasUpcomingDeadline) {
      esQuery.query.bool.filter.push({
        range: { 'application.deadline': { gte: 'now' } }
      });
    }

    // Add sorting
    const sortField = this.mapSortField(filters.sortBy || 'relevance');
    const sortOrder = filters.sortOrder || 'desc';
    
    if (sortField !== '_score') {
      esQuery.sort = [{ [sortField]: { order: sortOrder } }];
    }

    return esQuery;
  }

  /**
   * Map sort fields to Elasticsearch field names
   */
  private mapSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      relevance: '_score',
      popularity: 'metadata.popularity',
      successRate: 'metadata.successRate',
      deadline: 'application.deadline',
      amount: 'benefits.amount.max',
      processingTime: 'metadata.averageProcessingTime'
    };

    return fieldMap[sortBy] || '_score';
  }

  /**
   * Simulate Elasticsearch search for development/testing
   */
  private async simulateElasticsearchSearch(
    query: string,
    filters: SchemeSearchFilters,
    options: { from?: number; size?: number }
  ): Promise<{
    hits: Array<{
      scheme: GovernmentScheme;
      score: number;
      highlights: Record<string, string[]>;
    }>;
    total: number;
    aggregations: Record<string, any>;
  }> {
    // This is a simulation - in production, this would be replaced with actual Elasticsearch calls
    return {
      hits: [],
      total: 0,
      aggregations: {
        categories: { buckets: [] },
        businessTypes: { buckets: [] },
        states: { buckets: [] },
        providerLevels: { buckets: [] },
        amountRanges: { buckets: [] }
      }
    };
  }

  /**
   * Index a scheme in Elasticsearch
   */
  async indexScheme(scheme: GovernmentScheme): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Create search document with enhanced fields
      const searchIndex = SchemeIndexer.createSearchIndex(scheme);
      const classification = SchemeCategorizer.classifyScheme(scheme);

      const searchDocument = {
        ...scheme,
        _textIndex: searchIndex.textIndex,
        _categoryIndex: searchIndex.categoryIndex,
        _locationIndex: searchIndex.locationIndex,
        _businessTypeIndex: searchIndex.businessTypeIndex,
        _classification: classification,
        _indexedAt: new Date()
      };

      // In production, this would make an HTTP request to Elasticsearch
      console.log('Would index scheme in Elasticsearch:', {
        index: this.indexName,
        id: scheme.id,
        body: searchDocument
      });
    } catch (error) {
      console.error('Failed to index scheme in Elasticsearch:', error);
    }
  }

  /**
   * Bulk index multiple schemes
   */
  async bulkIndexSchemes(schemes: GovernmentScheme[]): Promise<{
    indexed: number;
    errors: string[];
  }> {
    if (!this.isEnabled) {
      return { indexed: 0, errors: ['Elasticsearch not configured'] };
    }

    const errors: string[] = [];
    let indexed = 0;

    for (const scheme of schemes) {
      try {
        await this.indexScheme(scheme);
        indexed++;
      } catch (error) {
        errors.push(`Failed to index scheme ${scheme.id}: ${error}`);
      }
    }

    return { indexed, errors };
  }

  /**
   * Remove scheme from Elasticsearch index
   */
  async removeScheme(schemeId: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // In production, this would make a DELETE request to Elasticsearch
      console.log('Would remove scheme from Elasticsearch:', {
        index: this.indexName,
        id: schemeId
      });
    } catch (error) {
      console.error('Failed to remove scheme from Elasticsearch:', error);
    }
  }

  /**
   * Check if Elasticsearch is available and healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // In production, this would check Elasticsearch cluster health
      return true;
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      return false;
    }
  }

  /**
   * Check if Elasticsearch is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!this.isEnabled || !query.trim()) return [];

    try {
      // In production, this would use Elasticsearch completion suggester
      const suggestions = [
        `${query} loan`,
        `${query} grant`,
        `${query} subsidy`,
        `${query} training`,
        `${query} scheme`
      ].slice(0, limit);

      return suggestions;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }
}

// ============================================================================
// SCHEME DISCOVERY SERVICE
// ============================================================================

/**
 * Advanced Scheme Discovery and Search Service
 */
export class SchemeDiscoveryService extends BaseService {
  private elasticsearchService: ElasticsearchService;

  constructor() {
    super('SchemeDiscoveryService');
    this.elasticsearchService = new ElasticsearchService();
  }

  // ============================================================================
  // ADVANCED SEARCH FUNCTIONALITY
  // ============================================================================

  /**
   * Perform advanced scheme search with full-text capabilities
   */
  async searchSchemes(
    searchQuery?: string,
    filters: SchemeSearchFilters = {},
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    return this.handleAsync(async () => {
      const startTime = Date.now();
      
      // Use Elasticsearch if available and query is provided
      if (searchQuery && this.elasticsearchService.isAvailable()) {
        return await this.performElasticsearchSearch(searchQuery, filters, userProfile);
      }

      // Fall back to Firestore-based search
      return await this.performFirestoreSearch(searchQuery, filters, startTime, userProfile);
    }, 'Failed to search schemes', 'SEARCH_SCHEMES_FAILED');
  }

  /**
   * Perform Elasticsearch-based search
   */
  private async performElasticsearchSearch(
    searchQuery: string,
    filters: SchemeSearchFilters,
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    const startTime = Date.now();

    try {
      const searchOptions = {
        from: ((filters.page || 1) - 1) * (filters.pageSize || 20),
        size: filters.pageSize || 20
      };

      const elasticResults = await this.elasticsearchService.searchSchemes(
        searchQuery,
        filters,
        searchOptions
      );

      // Convert Elasticsearch results to our format
      const enhancedSchemes: EnhancedSchemeResult[] = elasticResults.hits.map(hit => ({
        ...hit.scheme,
        _searchScore: hit.score,
        _matchedTerms: Object.keys(hit.highlights),
        _relevanceFactors: this.extractRelevanceFactors(hit.highlights)
      }));

      // Apply personalization if user profile is provided
      if (userProfile) {
        await this.applyPersonalization(enhancedSchemes, userProfile);
      }

      const executionTime = Date.now() - startTime;

      return {
        schemes: enhancedSchemes,
        totalCount: elasticResults.total,
        hasMore: elasticResults.total > (searchOptions.from + searchOptions.size),
        searchMetadata: {
          query: searchQuery,
          filters,
          executionTime,
          indexesUsed: ['elasticsearch'],
          suggestions: []
        },
        facets: this.buildFacetsFromAggregations(elasticResults.aggregations)
      };
    } catch (error) {
      this.log('error', 'Elasticsearch search failed, falling back to Firestore', error);
      return await this.performFirestoreSearch(searchQuery, filters, startTime, userProfile);
    }
  }

  /**
   * Perform Firestore-based search with optimization
   */
  private async performFirestoreSearch(
    searchQuery: string | undefined,
    filters: SchemeSearchFilters,
    startTime: number,
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    // Build optimized Firestore query
    const optimization = QueryOptimizer.optimizeSchemeQuery({
      category: filters.category,
      state: filters.location?.state,
      businessType: filters.businessType?.[0],
      status: 'active',
      sortBy: filters.sortBy === 'relevance' ? 'popularity' : filters.sortBy,
      sortOrder: filters.sortOrder,
      limitCount: (filters.pageSize || 20) * 2, // Get more for filtering
      startAfterDoc: filters.startAfterDoc
    });

    // Execute Firestore query
    const q = query(schemeSahayakCollections.schemes, ...optimization.constraints);
    const querySnapshot = await getDocs(q);
    
    let schemes = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as GovernmentScheme[];

    // Apply additional filters
    schemes = this.applyAdvancedFilters(schemes, filters);

    // Apply text search if query is provided
    if (searchQuery) {
      schemes = this.performTextSearch(schemes, searchQuery);
    }

    // Convert to enhanced results
    const enhancedSchemes: EnhancedSchemeResult[] = await Promise.all(
      schemes.map(async (scheme) => {
        const classification = SchemeCategorizer.classifyScheme(scheme);
        const enhanced: EnhancedSchemeResult = {
          ...scheme,
          _classification: classification,
          _searchScore: this.calculateRelevanceScore(scheme, searchQuery, filters),
          _relevanceFactors: this.getRelevanceFactors(scheme, searchQuery, filters)
        };

        return enhanced;
      })
    );

    // Apply personalization
    if (userProfile) {
      await this.applyPersonalization(enhancedSchemes, userProfile);
    }

    // Sort by relevance or specified criteria
    this.sortResults(enhancedSchemes, filters.sortBy || 'relevance', filters.sortOrder || 'desc');

    // Apply pagination
    const pageSize = filters.pageSize || 20;
    const page = filters.page || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedSchemes = enhancedSchemes.slice(startIndex, startIndex + pageSize);

    const executionTime = Date.now() - startTime;

    return {
      schemes: paginatedSchemes,
      totalCount: enhancedSchemes.length,
      hasMore: enhancedSchemes.length > startIndex + pageSize,
      searchMetadata: {
        query: searchQuery,
        filters,
        executionTime,
        indexesUsed: [optimization.indexUsed],
        suggestions: optimization.recommendations
      },
      facets: this.buildFacets(enhancedSchemes)
    };
  }

  // ============================================================================
  // PAGINATED SCHEME LISTING
  // ============================================================================

  /**
   * Get paginated scheme listing with advanced filtering and sorting
   */
  async getPaginatedSchemes(
    filters: SchemeSearchFilters = {},
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    return this.handleAsync(async () => {
      const startTime = Date.now();
      
      // Set default pagination values
      const pageSize = Math.min(filters.pageSize || 20, 100); // Cap at 100
      const page = Math.max(filters.page || 1, 1); // Minimum page 1
      
      // Build optimized query
      const optimization = QueryOptimizer.optimizeSchemeQuery({
        category: filters.category,
        state: filters.location?.state,
        businessType: filters.businessType?.[0],
        status: 'active',
        sortBy: filters.sortBy || 'popularity',
        sortOrder: filters.sortOrder || 'desc',
        limitCount: pageSize * 2, // Get extra for filtering
        startAfterDoc: filters.startAfterDoc
      });

      // Execute query
      const q = query(schemeSahayakCollections.schemes, ...optimization.constraints);
      const querySnapshot = await getDocs(q);
      
      let schemes = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        _docSnapshot: doc // Store for pagination
      })) as (GovernmentScheme & { _docSnapshot: DocumentSnapshot })[];

      // Apply advanced filters
      const filteredSchemes = this.applyAdvancedFilters(schemes.map(s => ({ ...s, _docSnapshot: undefined })), filters);
      schemes = schemes.filter(s => filteredSchemes.some(f => f.id === s.id));

      // Convert to enhanced results
      const enhancedSchemes: EnhancedSchemeResult[] = await Promise.all(
        schemes.map(async (scheme) => {
          const classification = SchemeCategorizer.classifyScheme(scheme);
          const enhanced: EnhancedSchemeResult = {
            ...scheme,
            _classification: classification,
            _searchScore: this.calculateRelevanceScore(scheme, undefined, filters),
            _relevanceFactors: this.getRelevanceFactors(scheme, undefined, filters)
          };

          // Remove internal fields
          delete (enhanced as any)._docSnapshot;
          return enhanced;
        })
      );

      // Apply personalization
      if (userProfile) {
        await this.applyPersonalization(enhancedSchemes, userProfile);
      }

      // Sort results
      this.sortResults(enhancedSchemes, filters.sortBy || 'relevance', filters.sortOrder || 'desc');

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const paginatedSchemes = enhancedSchemes.slice(startIndex, startIndex + pageSize);

      // Generate next page token
      let nextPageToken: string | undefined;
      if (enhancedSchemes.length > startIndex + pageSize) {
        const lastDoc = schemes[startIndex + pageSize - 1]?._docSnapshot;
        if (lastDoc) {
          nextPageToken = lastDoc.id;
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        schemes: paginatedSchemes,
        totalCount: enhancedSchemes.length,
        hasMore: enhancedSchemes.length > startIndex + pageSize,
        nextPageToken,
        searchMetadata: {
          filters,
          executionTime,
          indexesUsed: [optimization.indexUsed],
          suggestions: optimization.recommendations
        },
        facets: this.buildFacets(enhancedSchemes)
      };
    }, 'Failed to get paginated schemes', 'GET_PAGINATED_SCHEMES_FAILED');
  }

  /**
   * Get schemes by category with pagination and filtering
   */
  async getSchemesByCategory(
    category: string,
    filters?: Omit<SchemeSearchFilters, 'category'>,
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    return this.handleAsync(async () => {
      // Validate category
      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        throw new Error('Category is required');
      }

      // Add category to filters
      const categoryFilters: SchemeSearchFilters = {
        ...(filters || {}),
        category
      };

      return await this.getPaginatedSchemes(categoryFilters, userProfile);
    }, 'Failed to get schemes by category', 'GET_SCHEMES_BY_CATEGORY_FAILED');
  }

  /**
   * Get schemes by location with pagination and filtering
   */
  async getSchemesByLocation(
    location: { state: string; district?: string; pincode?: string },
    filters?: Omit<SchemeSearchFilters, 'location'>,
    userProfile?: ArtisanProfile
  ): Promise<SchemeSearchResult> {
    return this.handleAsync(async () => {
      // Validate location
      if (!location.state || location.state.trim().length === 0) {
        throw new Error('State is required');
      }

      // Add location to filters
      const locationFilters: SchemeSearchFilters = {
        ...(filters || {}),
        location
      };

      return await this.getPaginatedSchemes(locationFilters, userProfile);
    }, 'Failed to get schemes by location', 'GET_SCHEMES_BY_LOCATION_FAILED');
  }

  // ============================================================================
  // SCHEME DISCOVERY FUNCTIONALITY
  // ============================================================================

  /**
   * Discover schemes based on different discovery modes
   */
  async discoverSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    return this.handleAsync(async () => {
      switch (options.mode) {
        case 'trending':
          return await this.getTrendingSchemes(options);
        case 'recommended':
          return await this.getRecommendedSchemes(options);
        case 'deadline_urgent':
          return await this.getDeadlineUrgentSchemes(options);
        case 'high_success':
          return await this.getHighSuccessSchemes(options);
        case 'easy_access':
          return await this.getEasyAccessSchemes(options);
        case 'new_schemes':
          return await this.getNewSchemes(options);
        default:
          throw new Error(`Unknown discovery mode: ${options.mode}`);
      }
    }, 'Failed to discover schemes', 'DISCOVER_SCHEMES_FAILED');
  }

  /**
   * Get trending schemes based on recent activity
   */
  private async getTrendingSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    const filters: SchemeSearchFilters = {
      sortBy: 'popularity',
      sortOrder: 'desc',
      pageSize: options.limitCount || 20,
      minPopularity: 30 // Only include schemes with some popularity
    };

    const result = await this.searchSchemes(undefined, filters, options.userProfile);
    return result.schemes;
  }

  /**
   * Get personalized recommended schemes
   */
  private async getRecommendedSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    if (!options.userProfile) {
      throw new Error('User profile is required for personalized recommendations');
    }

    // Build filters based on user profile
    const filters: SchemeSearchFilters = {
      businessType: [options.userProfile.business.type],
      location: {
        state: options.userProfile.location.state,
        district: options.userProfile.location.district
      },
      maxAmount: options.userProfile.business.monthlyIncome * 12 * 5, // 5x annual income
      sortBy: 'successRate',
      sortOrder: 'desc',
      pageSize: options.limitCount || 20
    };

    const result = await this.searchSchemes(undefined, filters, options.userProfile);
    return result.schemes;
  }

  /**
   * Get schemes with urgent deadlines
   */
  private async getDeadlineUrgentSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    const filters: SchemeSearchFilters = {
      hasUpcomingDeadline: true,
      sortBy: 'deadline',
      sortOrder: 'asc',
      pageSize: options.limitCount || 20
    };

    const result = await this.searchSchemes(undefined, filters, options.userProfile);
    
    // Filter for truly urgent deadlines (next 30 days)
    const urgentSchemes = result.schemes.filter(scheme => {
      if (!scheme.application.deadline) return false;
      const deadline = new Date(scheme.application.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline <= 30;
    });

    return urgentSchemes;
  }

  /**
   * Get schemes with high success rates
   */
  private async getHighSuccessSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    const filters: SchemeSearchFilters = {
      minSuccessRate: 70,
      sortBy: 'successRate',
      sortOrder: 'desc',
      pageSize: options.limitCount || 20
    };

    const result = await this.searchSchemes(undefined, filters, options.userProfile);
    return result.schemes;
  }

  /**
   * Get easily accessible schemes
   */
  private async getEasyAccessSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    const filters: SchemeSearchFilters = {
      onlineApplicationOnly: true,
      maxComplexity: 'low',
      minAccessibilityScore: 70,
      maxProcessingTime: 30,
      sortBy: 'popularity',
      sortOrder: 'desc',
      pageSize: options.limitCount || 20
    };

    const result = await this.searchSchemes(undefined, filters, options.userProfile);
    return result.schemes;
  }

  /**
   * Get newly added schemes
   */
  private async getNewSchemes(options: SchemeDiscoveryOptions): Promise<EnhancedSchemeResult[]> {
    const maxAge = options.maxAge || 30; // Default to 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    // This would require a lastAdded field in the scheme metadata
    const q = query(
      schemeSahayakCollections.schemes,
      where('status', '==', 'active'),
      where('metadata.lastUpdated', '>=', cutoffDate),
      orderBy('metadata.lastUpdated', 'desc'),
      limit(options.limitCount || 20)
    );

    const querySnapshot = await getDocs(q);
    const schemes = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as GovernmentScheme[];

    // Convert to enhanced results
    const enhancedSchemes: EnhancedSchemeResult[] = await Promise.all(
      schemes.map(async (scheme) => {
        const classification = SchemeCategorizer.classifyScheme(scheme);
        return {
          ...scheme,
          _classification: classification,
          _searchScore: 100, // New schemes get high score
          _relevanceFactors: ['Recently added scheme']
        };
      })
    );

    // Apply personalization if user profile is provided
    if (options.userProfile) {
      await this.applyPersonalization(enhancedSchemes, options.userProfile);
    }

    return enhancedSchemes;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Apply advanced filters to schemes
   */
  private applyAdvancedFilters(schemes: GovernmentScheme[], filters: SchemeSearchFilters): GovernmentScheme[] {
    return schemes.filter(scheme => {
      // Financial filters
      if (filters.minAmount && scheme.benefits.amount.max < filters.minAmount) return false;
      if (filters.maxAmount && scheme.benefits.amount.min > filters.maxAmount) return false;
      if (filters.benefitType && scheme.benefits.type !== filters.benefitType) return false;

      // Application filters
      if (filters.onlineApplicationOnly && !scheme.application.onlineApplication) return false;
      if (filters.maxProcessingTime && scheme.metadata.averageProcessingTime > filters.maxProcessingTime) return false;

      // Quality filters
      if (filters.minSuccessRate && scheme.metadata.successRate < filters.minSuccessRate) return false;
      if (filters.minPopularity && scheme.metadata.popularity < filters.minPopularity) return false;

      // Classification-based filters
      const classification = SchemeCategorizer.classifyScheme(scheme);
      if (filters.maxComplexity) {
        const complexityOrder = { low: 1, medium: 2, high: 3 };
        if (complexityOrder[classification.complexityLevel] > complexityOrder[filters.maxComplexity]) return false;
      }
      if (filters.minAccessibilityScore && classification.accessibilityScore < filters.minAccessibilityScore) return false;

      // Provider filters
      if (filters.providerLevel && scheme.provider.level !== filters.providerLevel) return false;

      // Deadline filters
      if (filters.hasUpcomingDeadline) {
        if (!scheme.application.deadline) return false;
        const deadline = new Date(scheme.application.deadline);
        if (deadline <= new Date()) return false;
      }

      return true;
    });
  }

  /**
   * Perform text search on schemes
   */
  private performTextSearch(schemes: GovernmentScheme[], searchQuery: string): GovernmentScheme[] {
    const queryWords = searchQuery.toLowerCase().split(/\s+/);
    
    return schemes.filter(scheme => {
      const searchIndex = SchemeIndexer.createSearchIndex(scheme);
      
      // Check if any query word matches any indexed term
      return queryWords.some(word => 
        searchIndex.textIndex.some(token => token.includes(word)) ||
        searchIndex.categoryIndex.some(cat => cat.toLowerCase().includes(word)) ||
        searchIndex.businessTypeIndex.some(type => type.includes(word))
      );
    });
  }

  /**
   * Calculate relevance score for a scheme
   */
  private calculateRelevanceScore(
    scheme: GovernmentScheme, 
    searchQuery?: string, 
    filters: SchemeSearchFilters = {}
  ): number {
    let score = 0;

    // Base score from metadata
    score += scheme.metadata.popularity * 0.3;
    score += scheme.metadata.successRate * 0.2;

    // Classification-based scoring
    const classification = SchemeCategorizer.classifyScheme(scheme);
    score += classification.accessibilityScore * 0.2;
    
    // Urgency bonus
    if (classification.urgencyLevel === 'high') score += 20;
    else if (classification.urgencyLevel === 'medium') score += 10;

    // Text relevance bonus
    if (searchQuery) {
      const searchIndex = SchemeIndexer.createSearchIndex(scheme);
      const queryWords = searchQuery.toLowerCase().split(/\s+/);
      
      queryWords.forEach(word => {
        if (scheme.title.toLowerCase().includes(word)) score += 15;
        if (scheme.description.toLowerCase().includes(word)) score += 10;
        if (searchIndex.categoryIndex.some(cat => cat.includes(word))) score += 8;
      });
    }

    // Filter match bonuses
    if (filters.category && scheme.category === filters.category) score += 10;
    if (filters.businessType && filters.businessType.includes(scheme.eligibility.businessType[0])) score += 15;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get relevance factors for a scheme
   */
  private getRelevanceFactors(
    scheme: GovernmentScheme, 
    searchQuery?: string, 
    filters: SchemeSearchFilters = {}
  ): string[] {
    const factors: string[] = [];

    if (scheme.metadata.popularity > 70) factors.push('High popularity');
    if (scheme.metadata.successRate > 80) factors.push('High success rate');
    
    const classification = SchemeCategorizer.classifyScheme(scheme);
    if (classification.accessibilityScore > 80) factors.push('Easy to access');
    if (classification.complexityLevel === 'low') factors.push('Simple application process');
    if (classification.urgencyLevel === 'high') factors.push('Urgent deadline');

    if (scheme.application.onlineApplication) factors.push('Online application available');
    if (scheme.metadata.averageProcessingTime <= 30) factors.push('Fast processing');

    return factors;
  }

  /**
   * Apply personalization to search results
   */
  private async applyPersonalization(
    schemes: EnhancedSchemeResult[], 
    userProfile: ArtisanProfile
  ): Promise<void> {
    schemes.forEach(scheme => {
      // Calculate eligibility match
      let eligibilityMatch = 100;
      const reasons: string[] = [];
      const missing: string[] = [];

      // Age eligibility
      if (scheme.eligibility.age.min || scheme.eligibility.age.max) {
        const userAge = new Date().getFullYear() - new Date(userProfile.personalInfo.dateOfBirth).getFullYear();
        if (scheme.eligibility.age.min && userAge < scheme.eligibility.age.min) {
          eligibilityMatch -= 30;
          missing.push(`Minimum age: ${scheme.eligibility.age.min}`);
        }
        if (scheme.eligibility.age.max && userAge > scheme.eligibility.age.max) {
          eligibilityMatch -= 30;
          missing.push(`Maximum age: ${scheme.eligibility.age.max}`);
        }
      }

      // Income eligibility
      if (scheme.eligibility.income.min || scheme.eligibility.income.max) {
        const userIncome = userProfile.business.monthlyIncome * 12;
        if (scheme.eligibility.income.min && userIncome < scheme.eligibility.income.min) {
          eligibilityMatch -= 25;
          missing.push(`Minimum income: ₹${scheme.eligibility.income.min.toLocaleString()}`);
        }
        if (scheme.eligibility.income.max && userIncome > scheme.eligibility.income.max) {
          eligibilityMatch -= 25;
          missing.push(`Maximum income: ₹${scheme.eligibility.income.max.toLocaleString()}`);
        }
      }

      // Business type match
      if (scheme.eligibility.businessType.length > 0) {
        const hasBusinessTypeMatch = scheme.eligibility.businessType.some(type => 
          type.toLowerCase().includes(userProfile.business.type.toLowerCase()) ||
          userProfile.business.type.toLowerCase().includes(type.toLowerCase())
        );
        if (!hasBusinessTypeMatch) {
          eligibilityMatch -= 20;
          missing.push(`Business type: ${scheme.eligibility.businessType.join(', ')}`);
        } else {
          reasons.push('Business type matches');
        }
      }

      // Location match
      if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
        if (!scheme.eligibility.location.states.includes(userProfile.location.state)) {
          eligibilityMatch -= 40;
          missing.push(`Location: ${scheme.eligibility.location.states.join(', ')}`);
        } else {
          reasons.push('Location matches');
        }
      }

      // Calculate personalized score
      const baseScore = scheme._searchScore || 0;
      const personalizedScore = (baseScore * 0.7) + (eligibilityMatch * 0.3);

      // Add personalization metadata
      scheme._eligibilityMatch = Math.max(0, eligibilityMatch);
      scheme._personalizedScore = personalizedScore;
      scheme._recommendationReasons = reasons;
      scheme._missingRequirements = missing;
    });
  }

  /**
   * Sort search results
   */
  private sortResults(
    schemes: EnhancedSchemeResult[], 
    sortBy: string, 
    sortOrder: string
  ): void {
    const direction = sortOrder === 'desc' ? -1 : 1;

    schemes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (a._personalizedScore || a._searchScore || 0) - (b._personalizedScore || b._searchScore || 0);
          break;
        case 'popularity':
          comparison = a.metadata.popularity - b.metadata.popularity;
          break;
        case 'successRate':
          comparison = a.metadata.successRate - b.metadata.successRate;
          break;
        case 'deadline':
          const aDeadline = a.application.deadline ? new Date(a.application.deadline).getTime() : Infinity;
          const bDeadline = b.application.deadline ? new Date(b.application.deadline).getTime() : Infinity;
          comparison = aDeadline - bDeadline;
          break;
        case 'amount':
          comparison = a.benefits.amount.max - b.benefits.amount.max;
          break;
        case 'processingTime':
          comparison = a.metadata.averageProcessingTime - b.metadata.averageProcessingTime;
          break;
        default:
          comparison = (a._searchScore || 0) - (b._searchScore || 0);
      }

      return comparison * direction;
    });
  }

  /**
   * Build facets from search results
   */
  private buildFacets(schemes: EnhancedSchemeResult[]): SchemeSearchResult['facets'] {
    const categories = new Map<string, number>();
    const businessTypes = new Map<string, number>();
    const states = new Map<string, number>();
    const providerLevels = new Map<string, number>();
    const amountRanges = new Map<string, number>();

    schemes.forEach(scheme => {
      // Categories
      categories.set(scheme.category, (categories.get(scheme.category) || 0) + 1);

      // Business types
      scheme.eligibility.businessType.forEach(type => {
        businessTypes.set(type, (businessTypes.get(type) || 0) + 1);
      });

      // States
      scheme.eligibility.location.states?.forEach(state => {
        states.set(state, (states.get(state) || 0) + 1);
      });

      // Provider levels
      providerLevels.set(scheme.provider.level, (providerLevels.get(scheme.provider.level) || 0) + 1);

      // Amount ranges
      const maxAmount = scheme.benefits.amount.max;
      let range = 'Above ₹10L';
      if (maxAmount <= 100000) range = 'Up to ₹1L';
      else if (maxAmount <= 500000) range = '₹1L - ₹5L';
      else if (maxAmount <= 1000000) range = '₹5L - ₹10L';
      
      amountRanges.set(range, (amountRanges.get(range) || 0) + 1);
    });

    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      businessTypes: Array.from(businessTypes.entries()).map(([name, count]) => ({ name, count })),
      states: Array.from(states.entries()).map(([name, count]) => ({ name, count })),
      providerLevels: Array.from(providerLevels.entries()).map(([name, count]) => ({ name, count })),
      amountRanges: Array.from(amountRanges.entries()).map(([range, count]) => ({ range, count }))
    };
  }

  /**
   * Extract relevance factors from Elasticsearch highlights
   */
  private extractRelevanceFactors(highlights: Record<string, string[]>): string[] {
    const factors: string[] = [];
    
    if (highlights.title) factors.push('Title match');
    if (highlights.description) factors.push('Description match');
    if (highlights.category) factors.push('Category match');
    if (highlights.benefits) factors.push('Benefits match');
    
    return factors;
  }

  /**
   * Build facets from Elasticsearch aggregations
   */
  private buildFacetsFromAggregations(aggregations: Record<string, any>): SchemeSearchResult['facets'] {
    // This would parse Elasticsearch aggregation results
    // Placeholder implementation
    return {
      categories: [],
      businessTypes: [],
      states: [],
      providerLevels: [],
      amountRanges: []
    };
  }

  // ============================================================================
  // SEARCH SUGGESTIONS AND AUTOCOMPLETE
  // ============================================================================

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(
    query: string,
    limit: number = 5,
    userProfile?: ArtisanProfile
  ): Promise<{
    suggestions: string[];
    categories: string[];
    schemes: Array<{ id: string; title: string; category: string }>;
  }> {
    return this.handleAsync(async () => {
      if (!query || query.trim().length < 2) {
        return { suggestions: [], categories: [], schemes: [] };
      }

      const sanitizedQuery = this.sanitizeInput(query.toLowerCase());

      // Get suggestions from Elasticsearch if available
      let suggestions: string[] = [];
      if (this.elasticsearchService.isAvailable()) {
        suggestions = await this.elasticsearchService.getSuggestions(sanitizedQuery, limit);
      }

      // Fallback to category-based suggestions
      if (suggestions.length === 0) {
        suggestions = this.generateCategorySuggestions(sanitizedQuery, limit);
      }

      // Get matching categories
      const categories = this.getMatchingCategories(sanitizedQuery);

      // Get matching scheme titles (limited search)
      const schemes = await this.getMatchingSchemes(sanitizedQuery, Math.min(limit, 3));

      return {
        suggestions,
        categories,
        schemes
      };
    }, 'Failed to get search suggestions', 'GET_SEARCH_SUGGESTIONS_FAILED');
  }

  /**
   * Generate category-based suggestions
   */
  private generateCategorySuggestions(query: string, limit: number): string[] {
    const suggestions: string[] = [];
    
    // Common search patterns
    const patterns = [
      `${query} loan`,
      `${query} grant`,
      `${query} subsidy`,
      `${query} training`,
      `${query} scheme`,
      `${query} yojana`,
      `${query} assistance`,
      `${query} support`
    ];

    // Business type patterns
    const businessTypes = ['manufacturing', 'agriculture', 'services', 'trading', 'handicraft'];
    businessTypes.forEach(type => {
      if (type.includes(query) || query.includes(type)) {
        suggestions.push(`${type} schemes`);
        suggestions.push(`${type} loans`);
      }
    });

    // Add pattern suggestions
    patterns.forEach(pattern => {
      if (suggestions.length < limit) {
        suggestions.push(pattern);
      }
    });

    return suggestions.slice(0, limit);
  }

  /**
   * Get matching categories
   */
  private getMatchingCategories(query: string): string[] {
    const categories = ['loan', 'grant', 'subsidy', 'training', 'insurance'];
    return categories.filter(category => 
      category.includes(query) || query.includes(category)
    );
  }

  /**
   * Get matching scheme titles
   */
  private async getMatchingSchemes(
    searchText: string, 
    limitCount: number
  ): Promise<Array<{ id: string; title: string; category: string }>> {
    try {
      // Quick search for matching schemes
      const searchQuery = query(
        schemeSahayakCollections.schemes,
        where('status', '==', 'active'),
        orderBy('metadata.popularity', 'desc'),
        limit(limitCount * 3) // Get more to filter
      );

      const querySnapshot = await getDocs(searchQuery);
      const schemes = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GovernmentScheme[];

      // Filter by title match
      const matchingSchemes = schemes
        .filter(scheme => 
          scheme.title.toLowerCase().includes(searchText) ||
          scheme.description.toLowerCase().includes(searchText)
        )
        .slice(0, limitCount)
        .map(scheme => ({
          id: scheme.id,
          title: scheme.title,
          category: scheme.category
        }));

      return matchingSchemes;
    } catch (error) {
      this.log('error', 'Failed to get matching schemes for suggestions', error);
      return [];
    }
  }

  // ============================================================================
  // ADVANCED FILTERING METHODS
  // ============================================================================

  /**
   * Get available filter options for the current result set
   */
  async getFilterOptions(
    baseFilters?: SchemeSearchFilters
  ): Promise<{
    categories: Array<{ value: string; label: string; count: number }>;
    businessTypes: Array<{ value: string; label: string; count: number }>;
    states: Array<{ value: string; label: string; count: number }>;
    providerLevels: Array<{ value: string; label: string; count: number }>;
    amountRanges: Array<{ value: string; label: string; count: number; min: number; max: number }>;
  }> {
    return this.handleAsync(async () => {
      // Get schemes with base filters applied
      const result = await this.getPaginatedSchemes({
        ...(baseFilters || {}),
        pageSize: 1000 // Get large sample for filter analysis
      });

      const schemes = result.schemes;

      // Analyze available options
      const categoryMap = new Map<string, number>();
      const businessTypeMap = new Map<string, number>();
      const stateMap = new Map<string, number>();
      const providerLevelMap = new Map<string, number>();
      const amountRangeMap = new Map<string, { count: number; min: number; max: number }>();

      schemes.forEach(scheme => {
        // Categories
        categoryMap.set(scheme.category, (categoryMap.get(scheme.category) || 0) + 1);

        // Business types
        scheme.eligibility.businessType.forEach(type => {
          businessTypeMap.set(type, (businessTypeMap.get(type) || 0) + 1);
        });

        // States
        scheme.eligibility.location.states?.forEach(state => {
          stateMap.set(state, (stateMap.get(state) || 0) + 1);
        });

        // Provider levels
        providerLevelMap.set(scheme.provider.level, (providerLevelMap.get(scheme.provider.level) || 0) + 1);

        // Amount ranges
        const maxAmount = scheme.benefits.amount.max;
        let rangeKey = 'Above ₹10L';
        let rangeMin = 1000000;
        let rangeMax = Infinity;

        if (maxAmount <= 100000) {
          rangeKey = 'Up to ₹1L';
          rangeMin = 0;
          rangeMax = 100000;
        } else if (maxAmount <= 500000) {
          rangeKey = '₹1L - ₹5L';
          rangeMin = 100000;
          rangeMax = 500000;
        } else if (maxAmount <= 1000000) {
          rangeKey = '₹5L - ₹10L';
          rangeMin = 500000;
          rangeMax = 1000000;
        }

        const existing = amountRangeMap.get(rangeKey);
        amountRangeMap.set(rangeKey, {
          count: (existing?.count || 0) + 1,
          min: rangeMin,
          max: rangeMax
        });
      });

      return {
        categories: Array.from(categoryMap.entries()).map(([value, count]) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
          count
        })),
        businessTypes: Array.from(businessTypeMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        })),
        states: Array.from(stateMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        })),
        providerLevels: Array.from(providerLevelMap.entries()).map(([value, count]) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
          count
        })),
        amountRanges: Array.from(amountRangeMap.entries()).map(([value, data]) => ({
          value,
          label: value,
          count: data.count,
          min: data.min,
          max: data.max
        }))
      };
    }, 'Failed to get filter options', 'GET_FILTER_OPTIONS_FAILED');
  }

  // ============================================================================
  // HEALTH CHECK AND MONITORING
  // ============================================================================

  /**
   * Health check for Scheme Discovery Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Test basic search functionality
    await this.searchSchemes('test', { pageSize: 1 });
    
    // Test discovery functionality
    await this.discoverSchemes({ mode: 'trending', limitCount: 1 });

    // Test pagination
    await this.getPaginatedSchemes({ pageSize: 5 });

    // Test Elasticsearch if available
    if (this.elasticsearchService.isAvailable()) {
      const isHealthy = await this.elasticsearchService.isHealthy();
      if (!isHealthy) {
        this.log('warn', 'Elasticsearch is not healthy');
      }
    }
  }

  /**
   * Get service performance metrics
   */
  async getServiceMetrics(): Promise<{
    totalSearches: number;
    averageSearchTime: number;
    elasticsearchEnabled: boolean;
    elasticsearchHealthy: boolean;
    cacheHitRate: number;
    popularSearchTerms: string[];
  }> {
    return this.handleAsync(async () => {
      // In a real implementation, these would be tracked metrics
      return {
        totalSearches: 0, // Would be tracked
        averageSearchTime: 0, // Would be calculated from logs
        elasticsearchEnabled: this.elasticsearchService.isAvailable(),
        elasticsearchHealthy: await this.elasticsearchService.isHealthy(),
        cacheHitRate: 0, // Would be calculated from cache statistics
        popularSearchTerms: [] // Would be tracked from search logs
      };
    }, 'Failed to get service metrics', 'GET_SERVICE_METRICS_FAILED');
  }
}

