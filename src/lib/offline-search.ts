/**
 * Offline Search Engine
 * Provides full-text search capabilities for cached data
 */

export interface SearchResult {
    id: string;
    type: 'product' | 'trend' | 'chat' | 'artisan';
    title: string;
    description: string;
    score: number;
    data: any;
}

export class OfflineSearchEngine {
    private searchIndex: Map<string, any[]> = new Map();

    /**
     * Index data for search
     */
    async indexData(type: string, items: any[]) {
        const searchableItems = items.map(item => ({
            ...item,
            searchText: this.createSearchText(item),
            type
        }));

        this.searchIndex.set(type, searchableItems);
    }

    /**
     * Create searchable text from item
     */
    private createSearchText(item: any): string {
        const searchFields = [
            item.name,
            item.title,
            item.description,
            item.category,
            item.tags?.join(' '),
            item.location,
            item.skills?.join(' ')
        ].filter(Boolean);

        return searchFields.join(' ').toLowerCase();
    }

    /**
     * Search across all indexed data
     */
    async search(query: string, options: {
        types?: string[];
        limit?: number;
        minScore?: number;
    } = {}): Promise<SearchResult[]> {
        const { types, limit = 20, minScore = 0.1 } = options;
        const searchQuery = query.toLowerCase().trim();

        if (!searchQuery) return [];

        const results: SearchResult[] = [];
        const searchTypes = types || Array.from(this.searchIndex.keys());

        for (const type of searchTypes) {
            const items = this.searchIndex.get(type) || [];

            for (const item of items) {
                const score = this.calculateScore(searchQuery, item.searchText);

                if (score >= minScore) {
                    results.push({
                        id: item.id || item.productId || item.artisanId,
                        type: type as any,
                        title: item.name || item.title || 'Untitled',
                        description: item.description || '',
                        score,
                        data: item
                    });
                }
            }
        }

        // Sort by score and limit results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Calculate search score using simple text matching
     */
    private calculateScore(query: string, text: string): number {
        if (!text) return 0;

        const queryWords = query.split(' ').filter(Boolean);
        let score = 0;

        for (const word of queryWords) {
            if (text.includes(word)) {
                // Exact match gets higher score
                if (text.includes(query)) {
                    score += 1.0;
                } else {
                    score += 0.5;
                }
            }
        }

        return Math.min(score / queryWords.length, 1.0);
    }

    /**
     * Get search suggestions
     */
    async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
        const searchQuery = query.toLowerCase().trim();
        if (!searchQuery) return [];

        const suggestions = new Set<string>();

        for (const items of this.searchIndex.values()) {
            for (const item of items) {
                const words = item.searchText.split(' ');
                for (const word of words) {
                    if (word.startsWith(searchQuery) && word !== searchQuery) {
                        suggestions.add(word);
                        if (suggestions.size >= limit) break;
                    }
                }
                if (suggestions.size >= limit) break;
            }
            if (suggestions.size >= limit) break;
        }

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Clear search index
     */
    clearIndex() {
        this.searchIndex.clear();
    }
}

// Global search engine instance
export const offlineSearch = new OfflineSearchEngine();