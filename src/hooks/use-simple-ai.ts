import { useState, useCallback, useEffect } from 'react';
import { SimpleOfflineAI } from '@/lib/services/SimpleOfflineAI';

interface AIResponse {
    text: string;
    confidence: number;
    intent: string;
    source: 'online' | 'cache' | 'fallback';
    timestamp: number;
}

interface CacheStats {
    totalEntries: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
}

export function useSimpleAI() {
    const [isLoading, setIsLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [aiService] = useState(() => SimpleOfflineAI.getInstance());

    // Monitor online status
    useEffect(() => {
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    /**
     * Ask AI a question
     */
    const askAI = useCallback(async (
        question: string,
        context?: any
    ): Promise<AIResponse | null> => {
        if (!question.trim()) return null;

        setIsLoading(true);
        try {
            const response = await aiService.getResponse(question, context);
            return response;
        } catch (error) {
            console.error('AI query failed:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [aiService]);

    /**
     * Search cached responses
     */
    const searchCache = useCallback(async (
        searchQuery: string,
        limit?: number
    ) => {
        try {
            return await aiService.searchCache(searchQuery, limit);
        } catch (error) {
            console.error('Cache search failed:', error);
            return [];
        }
    }, [aiService]);

    /**
     * Get cache statistics
     */
    const getCacheStats = useCallback((): CacheStats => {
        return aiService.getCacheStats();
    }, [aiService]);

    /**
     * Clear old cache entries
     */
    const clearOldCache = useCallback(async (maxAge?: number) => {
        try {
            await aiService.clearOldCache(maxAge);
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }, [aiService]);

    /**
     * Export cache data
     */
    const exportCache = useCallback(() => {
        return aiService.exportCache();
    }, [aiService]);

    /**
     * Import cache data
     */
    const importCache = useCallback(async (data: any[]) => {
        try {
            await aiService.importCache(data);
            return true;
        } catch (error) {
            console.error('Failed to import cache:', error);
            return false;
        }
    }, [aiService]);

    return {
        // State
        isLoading,
        isOnline,

        // Methods
        askAI,
        searchCache,
        getCacheStats,
        clearOldCache,
        exportCache,
        importCache
    };
}