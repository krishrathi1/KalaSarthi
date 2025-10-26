import { NextRequest, NextResponse } from 'next/server';
import { VectorStoreService } from '@/lib/service/VectorStoreService';
import { ProfileMatch } from '@/lib/types/enhanced-artisan-buddy';

/**
 * POST /api/enhanced-artisan-buddy/profile/search
 * Advanced profile search with multiple criteria
 * 
 * Requirements: 4.4, 5.1, 5.3
 */
export async function POST(request: NextRequest) {
    try {
        const searchCriteria = await request.json();

        const {
            query,
            filters = {},
            limit = 10,
            threshold = 0.7,
            includeEmbedding = false,
            sortBy = 'similarity'
        } = searchCriteria;

        // Validate required fields
        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                {
                    error: 'Search query is required and must be a string',
                    code: 'MISSING_QUERY'
                },
                { status: 400 }
            );
        }

        // Validate limit
        if (limit < 1 || limit > 100) {
            return NextResponse.json(
                {
                    error: 'Limit must be between 1 and 100',
                    code: 'INVALID_LIMIT'
                },
                { status: 400 }
            );
        }

        // Validate threshold
        if (threshold < 0 || threshold > 1) {
            return NextResponse.json(
                {
                    error: 'Threshold must be between 0 and 1',
                    code: 'INVALID_THRESHOLD'
                },
                { status: 400 }
            );
        }

        const vectorStore = VectorStoreService.getInstance();

        // Perform semantic search
        const startTime = Date.now();
        let searchResults = await vectorStore.searchSimilarProfiles(query, limit * 2); // Get more results for filtering
        const searchTime = Date.now() - startTime;

        // Apply filters
        if (Object.keys(filters).length > 0) {
            searchResults = applyFilters(searchResults, filters);
        }

        // Apply similarity threshold
        searchResults = searchResults.filter(result => result.similarity >= threshold);

        // Sort results
        searchResults = sortResults(searchResults, sortBy);

        // Limit results
        searchResults = searchResults.slice(0, limit);

        // Remove embeddings unless requested
        if (!includeEmbedding) {
            searchResults.forEach(result => {
                if (result.profile.metadata.embedding) {
                    delete result.profile.metadata.embedding;
                }
            });
        }

        // Calculate search statistics
        const stats = calculateSearchStats(searchResults);

        return NextResponse.json({
            success: true,
            query,
            results: searchResults,
            count: searchResults.length,
            filters: filters,
            threshold,
            statistics: {
                ...stats,
                searchTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Profile search error:', error);
        return NextResponse.json(
            {
                error: 'Failed to search profiles',
                code: 'SEARCH_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/enhanced-artisan-buddy/profile/search
 * Simple profile search with query parameters
 * 
 * Requirements: 4.4, 5.1, 5.3
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const limit = parseInt(searchParams.get('limit') || '10');
        const threshold = parseFloat(searchParams.get('threshold') || '0.7');
        const location = searchParams.get('location');
        const skills = searchParams.get('skills');
        const experience = searchParams.get('experience');
        const includeEmbedding = searchParams.get('includeEmbedding') === 'true';

        if (!query) {
            return NextResponse.json(
                {
                    error: 'Search query is required',
                    code: 'MISSING_QUERY'
                },
                { status: 400 }
            );
        }

        // Build filters from query parameters
        const filters: any = {};
        if (location) filters.location = location;
        if (skills) filters.skills = skills.split(',');
        if (experience) filters.experience = parseInt(experience);

        const vectorStore = VectorStoreService.getInstance();

        // Perform search
        let searchResults = await vectorStore.searchSimilarProfiles(query, limit * 2);

        // Apply filters
        if (Object.keys(filters).length > 0) {
            searchResults = applyFilters(searchResults, filters);
        }

        // Apply threshold and limit
        searchResults = searchResults
            .filter(result => result.similarity >= threshold)
            .slice(0, limit);

        // Remove embeddings unless requested
        if (!includeEmbedding) {
            searchResults.forEach(result => {
                if (result.profile.metadata.embedding) {
                    delete result.profile.metadata.embedding;
                }
            });
        }

        return NextResponse.json({
            success: true,
            query,
            results: searchResults,
            count: searchResults.length,
            filters
        });

    } catch (error) {
        console.error('Profile search GET error:', error);
        return NextResponse.json(
            {
                error: 'Failed to search profiles',
                code: 'SEARCH_ERROR'
            },
            { status: 500 }
        );
    }
}

/**
 * Apply filters to search results
 */
function applyFilters(results: ProfileMatch[], filters: any): ProfileMatch[] {
    return results.filter(result => {
        const profile = result.profile;

        // Location filter
        if (filters.location) {
            const locationMatch = profile.personalInfo.location
                .toLowerCase()
                .includes(filters.location.toLowerCase());
            if (!locationMatch) return false;
        }

        // Skills filter
        if (filters.skills && Array.isArray(filters.skills)) {
            const profileSkills = [
                ...profile.skills.primary,
                ...profile.skills.secondary
            ].map(skill => skill.toLowerCase());

            const hasMatchingSkill = filters.skills.some((filterSkill: string) =>
                profileSkills.some(skill => skill.includes(filterSkill.toLowerCase()))
            );

            if (!hasMatchingSkill) return false;
        }

        // Experience filter
        if (filters.experience !== undefined) {
            if (profile.personalInfo.experience < filters.experience) return false;
        }

        // Product categories filter
        if (filters.categories && Array.isArray(filters.categories)) {
            const hasMatchingCategory = filters.categories.some((filterCategory: string) =>
                profile.products.categories.some(category =>
                    category.toLowerCase().includes(filterCategory.toLowerCase())
                )
            );

            if (!hasMatchingCategory) return false;
        }

        // Business type filter
        if (filters.businessType) {
            const businessTypeMatch = profile.businessInfo.businessType
                .toLowerCase()
                .includes(filters.businessType.toLowerCase());
            if (!businessTypeMatch) return false;
        }

        // Target market filter
        if (filters.targetMarket && Array.isArray(filters.targetMarket)) {
            const hasMatchingMarket = filters.targetMarket.some((filterMarket: string) =>
                profile.businessInfo.targetMarket.some(market =>
                    market.toLowerCase().includes(filterMarket.toLowerCase())
                )
            );

            if (!hasMatchingMarket) return false;
        }

        // Price range filter
        if (filters.priceRange) {
            const { min, max } = filters.priceRange;
            if (min !== undefined && profile.products.priceRange.max < min) return false;
            if (max !== undefined && profile.products.priceRange.min > max) return false;
        }

        return true;
    });
}

/**
 * Sort search results by specified criteria
 */
function sortResults(results: ProfileMatch[], sortBy: string): ProfileMatch[] {
    switch (sortBy) {
        case 'similarity':
            return results.sort((a, b) => b.similarity - a.similarity);

        case 'experience':
            return results.sort((a, b) =>
                b.profile.personalInfo.experience - a.profile.personalInfo.experience
            );

        case 'completeness':
            return results.sort((a, b) =>
                b.profile.metadata.completeness - a.profile.metadata.completeness
            );

        case 'updated':
            return results.sort((a, b) =>
                b.profile.metadata.updatedAt.getTime() - a.profile.metadata.updatedAt.getTime()
            );

        case 'created':
            return results.sort((a, b) =>
                b.profile.metadata.createdAt.getTime() - a.profile.metadata.createdAt.getTime()
            );

        default:
            return results.sort((a, b) => b.similarity - a.similarity);
    }
}

/**
 * Calculate search statistics
 */
function calculateSearchStats(results: ProfileMatch[]) {
    if (results.length === 0) {
        return {
            averageSimilarity: 0,
            maxSimilarity: 0,
            minSimilarity: 0,
            averageCompleteness: 0,
            skillsDistribution: {},
            locationDistribution: {}
        };
    }

    const similarities = results.map(r => r.similarity);
    const completeness = results.map(r => r.profile.metadata.completeness);

    // Skills distribution
    const skillsCount: Record<string, number> = {};
    results.forEach(result => {
        [...result.profile.skills.primary, ...result.profile.skills.secondary]
            .forEach(skill => {
                skillsCount[skill] = (skillsCount[skill] || 0) + 1;
            });
    });

    // Location distribution
    const locationCount: Record<string, number> = {};
    results.forEach(result => {
        const location = result.profile.personalInfo.location;
        locationCount[location] = (locationCount[location] || 0) + 1;
    });

    return {
        averageSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
        maxSimilarity: Math.max(...similarities),
        minSimilarity: Math.min(...similarities),
        averageCompleteness: completeness.reduce((a, b) => a + b, 0) / completeness.length,
        skillsDistribution: Object.entries(skillsCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [skill, count]) => ({ ...obj, [skill]: count }), {}),
        locationDistribution: Object.entries(locationCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [location, count]) => ({ ...obj, [location]: count }), {})
    };
}