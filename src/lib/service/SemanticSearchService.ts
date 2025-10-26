/**
 * Semantic Search Service
 * Implements vector similarity search with configurable thresholds and ranking
 */

import { VectorConnectionPool } from '../database/vector-connection-pool';
import { EmbeddingService } from './EmbeddingService';
import { TextPreprocessor } from '../utils/text-preprocessing';
import {
    ArtisanProfile,
    ProfileMatch,
    VectorDocument,
    extractMetadata,
    SEARCH_QUERY_TYPES,
    SearchQueryType
} from '../database/vector-schema';
import { VectorStoreConfig, getVectorStoreConfig } from '../config/vector-store-config';

export interface SearchQuery {
    text: string;
    type?: string;
    filters?: SearchFilters;
    limit?: number;
    threshold?: number;
    includeMetadata?: boolean;
}

export interface SearchFilters {
    location?: string;
    experienceMin?: number;
    experienceMax?: number;
    skills?: string[];
    productCategories?: string[];
    businessType?: string;
    languages?: string[];
    priceRangeMin?: number;
    priceRangeMax?: number;
}

export interface SearchResult {
    profile: ArtisanProfile;
    similarity: number;
    matchedFields: string[];
    relevanceScore: number;
    metadata: Record<string, any>;
}

export interface SearchResponse {
    results: SearchResult[];
    totalFound: number;
    searchTime: number;
    query: SearchQuery;
    suggestions?: string[];
}

export class SemanticSearchService {
    private static instance: SemanticSearchService;
    private connectionPool: VectorConnectionPool;
    private embeddingService: EmbeddingService;
    private textPreprocessor: TextPreprocessor;
    private config: VectorStoreConfig;
    private profileCache: Map<string, ArtisanProfile> = new Map();

    private constructor() {
        this.config = getVectorStoreConfig();
        this.connectionPool = VectorConnectionPool.getInstance();
        this.embeddingService = EmbeddingService.getInstance(this.config);
        this.textPreprocessor = new TextPreprocessor();
    }

    public static getInstance(): SemanticSearchService {
        if (!SemanticSearchService.instance) {
            SemanticSearchService.instance = new SemanticSearchService();
        }
        return SemanticSearchService.instance;
    }

    /**
     * Initialize the search service
     */
    async initialize(): Promise<void> {
        await this.connectionPool.initialize();
        console.log('Semantic search service initialized');
    }

    /**
     * Search for similar artisan profiles
     */
    async searchProfiles(query: SearchQuery): Promise<SearchResponse> {
        const startTime = Date.now();

        try {
            // Validate and normalize query
            const normalizedQuery = this.normalizeQuery(query);

            // Generate query embedding
            const queryEmbedding = await this.generateQueryEmbedding(normalizedQuery);

            // Perform vector search
            const vectorResults = await this.performVectorSearch(queryEmbedding, normalizedQuery);

            // Apply filters
            const filteredResults = this.applyFilters(vectorResults, normalizedQuery.filters);

            // Rank and score results
            const rankedResults = await this.rankResults(filteredResults, normalizedQuery);

            // Apply threshold and limit
            const finalResults = this.applyThresholdAndLimit(rankedResults, normalizedQuery);

            const searchTime = Date.now() - startTime;

            return {
                results: finalResults,
                totalFound: vectorResults.length,
                searchTime,
                query: normalizedQuery,
                suggestions: await this.generateSuggestions(normalizedQuery, finalResults),
            };

        } catch (error) {
            console.error('Search failed:', error);
            throw new Error(`Search operation failed: ${error}`);
        }
    }

    /**
     * Search for profiles by specific field
     */
    async searchByField(fieldName: string, value: string, limit: number = 10): Promise<SearchResult[]> {
        const queryType = this.getQueryTypeForField(fieldName);

        const query: SearchQuery = {
            text: value,
            type: queryType?.type,
            limit,
        };

        const response = await this.searchProfiles(query);
        return response.results;
    }

    /**
     * Find similar profiles to a given profile
     */
    async findSimilarProfiles(profileId: string, limit: number = 5): Promise<SearchResult[]> {
        try {
            const profile = await this.getProfileById(profileId);
            if (!profile) {
                throw new Error(`Profile not found: ${profileId}`);
            }

            // Generate profile text for similarity search
            const profileText = this.textPreprocessor.preprocessProfile(profile);

            const query: SearchQuery = {
                text: profileText,
                type: 'comprehensive',
                limit: limit + 1, // +1 to exclude the original profile
            };

            const response = await this.searchProfiles(query);

            // Filter out the original profile
            return response.results.filter(result => result.profile.id !== profileId);

        } catch (error) {
            console.error('Similar profiles search failed:', error);
            throw error;
        }
    }

    /**
     * Get search suggestions based on query
     */
    async getSearchSuggestions(partialQuery: string): Promise<string[]> {
        try {
            // Simple suggestion generation based on common terms
            const suggestions: string[] = [];
            const queryLower = partialQuery.toLowerCase();

            // Skill-based suggestions
            const skillSuggestions = [
                'handloom weaving', 'pottery making', 'wood carving', 'metal craft',
                'embroidery work', 'jewelry making', 'textile design', 'ceramic art'
            ].filter(skill => skill.includes(queryLower));

            // Location-based suggestions
            const locationSuggestions = [
                'Rajasthan artisans', 'Gujarat craftspeople', 'Uttar Pradesh weavers',
                'Karnataka silk makers', 'Tamil Nadu bronze workers'
            ].filter(location => location.toLowerCase().includes(queryLower));

            // Product-based suggestions
            const productSuggestions = [
                'silk sarees', 'cotton fabrics', 'wooden furniture', 'metal sculptures',
                'ceramic pottery', 'leather goods', 'bamboo crafts'
            ].filter(product => product.includes(queryLower));

            suggestions.push(...skillSuggestions, ...locationSuggestions, ...productSuggestions);

            return suggestions.slice(0, 5);

        } catch (error) {
            console.error('Suggestion generation failed:', error);
            return [];
        }
    }

    /**
     * Add or update profile in search index
     */
    async indexProfile(profile: ArtisanProfile): Promise<void> {
        try {
            // Generate embedding for profile
            const embeddingResult = await this.embeddingService.generateProfileEmbedding(profile);

            // Create vector document
            const vectorDoc: VectorDocument = {
                id: profile.id,
                embedding: embeddingResult.embedding,
                metadata: extractMetadata(profile),
            };

            // Add to vector database
            await this.connectionPool.withConnection(async (db) => {
                await db.addVectors([vectorDoc]);
                await db.saveIndex();
            });

            // Cache profile
            this.profileCache.set(profile.id, profile);

            console.log(`Indexed profile: ${profile.id}`);

        } catch (error) {
            console.error('Profile indexing failed:', error);
            throw error;
        }
    }

    /**
     * Remove profile from search index
     */
    async removeProfile(profileId: string): Promise<void> {
        try {
            await this.connectionPool.withConnection(async (db) => {
                await db.removeDocument(profileId);
                await db.saveIndex();
            });

            this.profileCache.delete(profileId);
            console.log(`Removed profile from index: ${profileId}`);

        } catch (error) {
            console.error('Profile removal failed:', error);
            throw error;
        }
    }

    /**
     * Normalize search query
     */
    private normalizeQuery(query: SearchQuery): SearchQuery {
        return {
            text: this.textPreprocessor.preprocessText(query.text),
            type: query.type || 'comprehensive',
            filters: query.filters || {},
            limit: Math.min(query.limit || this.config.search.defaultLimit, this.config.search.maxLimit),
            threshold: query.threshold || this.config.search.similarityThreshold,
            includeMetadata: query.includeMetadata !== false,
        };
    }

    /**
     * Generate embedding for search query
     */
    private async generateQueryEmbedding(query: SearchQuery): Promise<number[]> {
        const queryType = SEARCH_QUERY_TYPES.find(type => type.type === query.type);

        let enhancedText = query.text;

        // Enhance query based on type
        if (queryType) {
            enhancedText = this.enhanceQueryText(query.text, queryType);
        }

        const embeddingResult = await this.embeddingService.generateEmbedding(enhancedText);
        return embeddingResult.embedding;
    }

    /**
     * Enhance query text based on search type
     */
    private enhanceQueryText(text: string, queryType: SearchQueryType): string {
        const enhancements: string[] = [text];

        // Add context based on query type
        switch (queryType.type) {
            case 'skill_based':
                enhancements.push('artisan craft skill expertise');
                break;
            case 'product_based':
                enhancements.push('handmade product traditional craft');
                break;
            case 'location_based':
                enhancements.push('location region area artisan');
                break;
            case 'business_based':
                enhancements.push('business enterprise artisan work');
                break;
        }

        return enhancements.join(' ');
    }

    /**
     * Perform vector similarity search
     */
    private async performVectorSearch(embedding: number[], query: SearchQuery): Promise<SearchResult[]> {
        return await this.connectionPool.withConnection(async (db) => {
            const vectorResults = await db.search(embedding, query.limit! * 2); // Get more for filtering

            const searchResults: SearchResult[] = [];

            for (const result of vectorResults) {
                const profile = await this.getProfileById(result.id);
                if (profile) {
                    searchResults.push({
                        profile,
                        similarity: result.score,
                        matchedFields: [], // Will be populated in ranking
                        relevanceScore: result.score,
                        metadata: result.metadata,
                    });
                }
            }

            return searchResults;
        });
    }

    /**
     * Apply search filters
     */
    private applyFilters(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
        if (!filters) return results;

        return results.filter(result => {
            const profile = result.profile;

            // Location filter
            if (filters.location) {
                const locationMatch = profile.personalInfo.location
                    .toLowerCase()
                    .includes(filters.location.toLowerCase());
                if (!locationMatch) return false;
            }

            // Experience filter
            if (filters.experienceMin !== undefined) {
                if (profile.personalInfo.experience < filters.experienceMin) return false;
            }
            if (filters.experienceMax !== undefined) {
                if (profile.personalInfo.experience > filters.experienceMax) return false;
            }

            // Skills filter
            if (filters.skills && filters.skills.length > 0) {
                const profileSkills = [...profile.skills.primary, ...profile.skills.secondary]
                    .map(skill => skill.toLowerCase());
                const hasMatchingSkill = filters.skills.some(filterSkill =>
                    profileSkills.some(profileSkill =>
                        profileSkill.includes(filterSkill.toLowerCase())
                    )
                );
                if (!hasMatchingSkill) return false;
            }

            // Product categories filter
            if (filters.productCategories && filters.productCategories.length > 0) {
                const hasMatchingCategory = filters.productCategories.some(category =>
                    profile.products.categories.some(profileCategory =>
                        profileCategory.toLowerCase().includes(category.toLowerCase())
                    )
                );
                if (!hasMatchingCategory) return false;
            }

            // Business type filter
            if (filters.businessType) {
                const businessMatch = profile.businessInfo.businessType
                    .toLowerCase()
                    .includes(filters.businessType.toLowerCase());
                if (!businessMatch) return false;
            }

            // Languages filter
            if (filters.languages && filters.languages.length > 0) {
                const hasMatchingLanguage = filters.languages.some(lang =>
                    profile.personalInfo.languages.some(profileLang =>
                        profileLang.toLowerCase().includes(lang.toLowerCase())
                    )
                );
                if (!hasMatchingLanguage) return false;
            }

            return true;
        });
    }

    /**
     * Rank and score search results
     */
    private async rankResults(results: SearchResult[], query: SearchQuery): Promise<SearchResult[]> {
        const queryType = SEARCH_QUERY_TYPES.find(type => type.type === query.type);

        for (const result of results) {
            // Calculate field matches
            result.matchedFields = this.calculateMatchedFields(result.profile, query.text, queryType);

            // Calculate enhanced relevance score
            result.relevanceScore = this.calculateRelevanceScore(result, query, queryType);
        }

        // Sort by relevance score
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Calculate matched fields for a result
     */
    private calculateMatchedFields(profile: ArtisanProfile, queryText: string, queryType?: SearchQueryType): string[] {
        const matchedFields: string[] = [];
        const queryTerms = queryText.toLowerCase().split(/\s+/);

        const fieldsToCheck = queryType?.fields || [
            'personalInfo.name', 'personalInfo.location',
            'skills.primary', 'skills.secondary',
            'products.categories', 'products.specialties',
            'businessInfo.businessType'
        ];

        for (const fieldPath of fieldsToCheck) {
            const fieldValue = this.getNestedValue(profile, fieldPath);
            if (fieldValue) {
                const fieldText = Array.isArray(fieldValue)
                    ? fieldValue.join(' ').toLowerCase()
                    : String(fieldValue).toLowerCase();

                const hasMatch = queryTerms.some(term => fieldText.includes(term));
                if (hasMatch) {
                    matchedFields.push(fieldPath);
                }
            }
        }

        return matchedFields;
    }

    /**
     * Calculate enhanced relevance score
     */
    private calculateRelevanceScore(result: SearchResult, query: SearchQuery, queryType?: SearchQueryType): number {
        let score = result.similarity;

        // Boost based on matched fields
        if (queryType) {
            for (const matchedField of result.matchedFields) {
                const weight = queryType.weights[matchedField] || 0.5;
                score += weight * 0.1; // Small boost for field matches
            }
        }

        // Boost based on profile completeness
        const completeness = result.profile.metadata.completeness / 100;
        score += completeness * 0.05;

        // Boost based on experience (for skill-based queries)
        if (query.type === 'skill_based') {
            const experienceBoost = Math.min(result.profile.personalInfo.experience / 20, 1) * 0.1;
            score += experienceBoost;
        }

        return Math.min(score, 1); // Cap at 1.0
    }

    /**
     * Apply threshold and limit to results
     */
    private applyThresholdAndLimit(results: SearchResult[], query: SearchQuery): SearchResult[] {
        return results
            .filter(result => result.relevanceScore >= query.threshold!)
            .slice(0, query.limit!);
    }

    /**
     * Generate search suggestions
     */
    private async generateSuggestions(query: SearchQuery, results: SearchResult[]): Promise<string[]> {
        const suggestions: string[] = [];

        if (results.length === 0) {
            // No results - suggest broader terms
            suggestions.push(
                'Try broader terms like "traditional craft" or "handmade"',
                'Search by location like "Rajasthan artisans"',
                'Try specific skills like "weaving" or "pottery"'
            );
        } else if (results.length < 3) {
            // Few results - suggest related terms
            const commonSkills = this.extractCommonTerms(results, 'skills.primary');
            const commonLocations = this.extractCommonTerms(results, 'personalInfo.location');

            if (commonSkills.length > 0) {
                suggestions.push(`Try "${commonSkills[0]}" for similar artisans`);
            }
            if (commonLocations.length > 0) {
                suggestions.push(`Explore more artisans in ${commonLocations[0]}`);
            }
        }

        return suggestions.slice(0, 3);
    }

    /**
     * Extract common terms from results
     */
    private extractCommonTerms(results: SearchResult[], fieldPath: string): string[] {
        const termCounts: Record<string, number> = {};

        for (const result of results) {
            const value = this.getNestedValue(result.profile, fieldPath);
            if (Array.isArray(value)) {
                for (const item of value) {
                    termCounts[item] = (termCounts[item] || 0) + 1;
                }
            } else if (value) {
                termCounts[String(value)] = (termCounts[String(value)] || 0) + 1;
            }
        }

        return Object.entries(termCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([term]) => term);
    }

    /**
     * Get query type for field
     */
    private getQueryTypeForField(fieldName: string): SearchQueryType | undefined {
        return SEARCH_QUERY_TYPES.find(type =>
            type.fields.some(field => field.includes(fieldName))
        );
    }

    /**
     * Get profile by ID (with caching)
     */
    private async getProfileById(profileId: string): Promise<ArtisanProfile | null> {
        // Check cache first
        if (this.profileCache.has(profileId)) {
            return this.profileCache.get(profileId)!;
        }

        // In a real implementation, this would fetch from the database
        // For now, return null as profiles should be cached during indexing
        return null;
    }

    /**
     * Get nested object value
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * Get search service statistics
     */
    getStats(): {
        poolStats: any;
        cacheSize: number;
        embeddingStats: any;
    } {
        return {
            poolStats: this.connectionPool.getStats(),
            cacheSize: this.profileCache.size,
            embeddingStats: this.embeddingService.getCacheStats(),
        };
    }

    /**
     * Health check for search service
     */
    async healthCheck(): Promise<{ healthy: boolean; details: any }> {
        try {
            const poolHealth = await this.connectionPool.healthCheck();

            return {
                healthy: poolHealth.healthy,
                details: {
                    connectionPool: poolHealth.details,
                    cacheSize: this.profileCache.size,
                    embeddingService: this.embeddingService.getCacheStats(),
                },
            };
        } catch (error) {
            return {
                healthy: false,
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
}