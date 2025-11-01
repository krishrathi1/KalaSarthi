/**
 * Simple Offline AI with Online Sync
 * Queries online AI when available, caches responses for offline use
 */

interface CachedResponse {
    id: string;
    query: string;
    response: string;
    timestamp: number;
    confidence: number;
    intent: string;
    language: string;
}

interface OnlineAIResponse {
    text: string;
    confidence?: number;
    intent?: string;
}

export class SimpleOfflineAI {
    private static instance: SimpleOfflineAI;
    private cache: Map<string, CachedResponse> = new Map();
    private isOnline: boolean = true;
    private dbName = 'ArtisanAICache';
    private dbVersion = 1;
    private db: IDBDatabase | null = null;

    private constructor() {
        this.initializeDB();
        this.setupOnlineDetection();
    }

    public static getInstance(): SimpleOfflineAI {
        if (!SimpleOfflineAI.instance) {
            SimpleOfflineAI.instance = new SimpleOfflineAI();
        }
        return SimpleOfflineAI.instance;
    }

    /**
     * Initialize IndexedDB for persistent caching
     */
    private async initializeDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadCacheFromDB();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('responses')) {
                    const store = db.createObjectStore('responses', { keyPath: 'id' });
                    store.createIndex('query', 'query', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Load cached responses from IndexedDB
     */
    private async loadCacheFromDB(): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction(['responses'], 'readonly');
        const store = transaction.objectStore('responses');
        const request = store.getAll();

        request.onsuccess = () => {
            const responses = request.result as CachedResponse[];
            responses.forEach(response => {
                this.cache.set(this.generateCacheKey(response.query), response);
            });
            console.log(`✅ Loaded ${responses.length} cached AI responses`);
        };
    }

    /**
     * Save response to IndexedDB
     */
    private async saveToDB(response: CachedResponse): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction(['responses'], 'readwrite');
        const store = transaction.objectStore('responses');
        store.put(response);
    }

    /**
     * Setup online/offline detection
     */
    private setupOnlineDetection(): void {
        this.isOnline = navigator.onLine;

        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online - AI queries will use live service');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Gone offline - AI queries will use cache');
        });
    }

    /**
     * Generate cache key for query
     */
    private generateCacheKey(query: string): string {
        return query.toLowerCase().trim().replace(/\s+/g, '_');
    }

    /**
     * Detect language of query
     */
    private detectLanguage(text: string): string {
        const hindiPattern = /[\u0900-\u097F]/;
        return hindiPattern.test(text) ? 'hi' : 'en';
    }

    /**
     * Query online AI service
     */
    private async queryOnlineAI(message: string, context?: any): Promise<OnlineAIResponse> {
        try {
            // Try different AI services in order of preference

            // 1. Try OpenAI/ChatGPT API if available
            if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
                return await this.queryOpenAI(message, context);
            }

            // 2. Try Google Gemini API if available
            if (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) {
                return await this.queryGemini(message, context);
            }

            // 3. Try your custom AI endpoint
            return await this.queryCustomAI(message, context);

        } catch (error) {
            console.error('Online AI query failed:', error);
            throw error;
        }
    }

    /**
     * Query OpenAI API
     */
    private async queryOpenAI(message: string, context?: any): Promise<OnlineAIResponse> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant helping Indian artisans and craftspeople with their business, marketing, and craft-related questions. Respond in the same language as the user (Hindi or English).'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.choices[0].message.content,
            confidence: 0.9,
            intent: 'general'
        };
    }

    /**
     * Query Google Gemini API
     */
    private async queryGemini(message: string, context?: any): Promise<OnlineAIResponse> {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an AI assistant for Indian artisans. Help with: ${message}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.candidates[0].content.parts[0].text,
            confidence: 0.9,
            intent: 'general'
        };
    }

    /**
     * Query custom AI endpoint
     */
    private async queryCustomAI(message: string, context?: any): Promise<OnlineAIResponse> {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                context,
                language: this.detectLanguage(message)
            })
        });

        if (!response.ok) {
            throw new Error(`Custom AI API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.response || data.text,
            confidence: data.confidence || 0.8,
            intent: data.intent || 'general'
        };
    }

    /**
     * Get fallback response for common queries
     */
    private getFallbackResponse(query: string): OnlineAIResponse {
        const language = this.detectLanguage(query);
        const lowerQuery = query.toLowerCase();

        // Business-related fallbacks
        if (lowerQuery.includes('price') || lowerQuery.includes('कीमत')) {
            return {
                text: language === 'hi'
                    ? 'उत्पाद की कीमत तय करने के लिए: सामग्री की लागत + श्रम लागत + 30-50% मार्जिन जोड़ें। बाज़ार रिसर्च भी जरूरी है।'
                    : 'For pricing: Calculate material cost + labor cost + 30-50% margin. Market research is also important.',
                confidence: 0.7,
                intent: 'business_finance'
            };
        }

        // Marketing fallbacks
        if (lowerQuery.includes('market') || lowerQuery.includes('sell') || lowerQuery.includes('बेच')) {
            return {
                text: language === 'hi'
                    ? 'ऑनलाइन मार्केटिंग के लिए: Facebook, Instagram का उपयोग करें। अच्छी फोटो लें और अपनी कहानी शेयर करें।'
                    : 'For online marketing: Use Facebook, Instagram. Take good photos and share your story.',
                confidence: 0.7,
                intent: 'marketing_sales'
            };
        }

        // General fallback
        return {
            text: language === 'hi'
                ? 'मैं आपकी मदद करने की कोशिश कर रहा हूँ। कृपया अपना प्रश्न दोबारा पूछें या इंटरनेट कनेक्शन चेक करें।'
                : 'I\'m trying to help you. Please rephrase your question or check your internet connection.',
            confidence: 0.5,
            intent: 'general'
        };
    }

    /**
     * Main method to get AI response
     */
    public async getResponse(query: string, context?: any): Promise<{
        text: string;
        confidence: number;
        intent: string;
        source: 'online' | 'cache' | 'fallback';
        timestamp: number;
    }> {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey(query);
        const language = this.detectLanguage(query);

        // Check cache first for exact matches
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours
            console.log('📋 Using cached response');
            return {
                text: cached.response,
                confidence: cached.confidence,
                intent: cached.intent,
                source: 'cache',
                timestamp: startTime
            };
        }

        // Try online AI if available
        if (this.isOnline) {
            try {
                console.log('🌐 Querying online AI...');
                const onlineResponse = await this.queryOnlineAI(query, context);

                // Cache the response
                const cachedResponse: CachedResponse = {
                    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    query,
                    response: onlineResponse.text,
                    timestamp: startTime,
                    confidence: onlineResponse.confidence || 0.8,
                    intent: onlineResponse.intent || 'general',
                    language
                };

                this.cache.set(cacheKey, cachedResponse);
                await this.saveToDB(cachedResponse);

                console.log('✅ Online AI response cached');
                return {
                    text: onlineResponse.text,
                    confidence: onlineResponse.confidence || 0.8,
                    intent: onlineResponse.intent || 'general',
                    source: 'online',
                    timestamp: startTime
                };

            } catch (error) {
                console.warn('⚠️ Online AI failed, using fallback:', error);
            }
        }

        // Use fallback response
        console.log('🔄 Using fallback response');
        const fallback = this.getFallbackResponse(query);

        return {
            text: fallback.text,
            confidence: fallback.confidence,
            intent: fallback.intent,
            source: 'fallback',
            timestamp: startTime
        };
    }

    /**
     * Get cached responses for search
     */
    public async searchCache(searchQuery: string, limit: number = 10): Promise<CachedResponse[]> {
        const results: CachedResponse[] = [];
        const lowerSearch = searchQuery.toLowerCase();

        for (const response of this.cache.values()) {
            if (response.query.toLowerCase().includes(lowerSearch) ||
                response.response.toLowerCase().includes(lowerSearch)) {
                results.push(response);
            }
        }

        return results
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Clear old cache entries
     */
    public async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        const cutoff = Date.now() - maxAge;
        const toDelete: string[] = [];

        for (const [key, response] of this.cache.entries()) {
            if (response.timestamp < cutoff) {
                toDelete.push(key);
            }
        }

        // Remove from memory cache
        toDelete.forEach(key => this.cache.delete(key));

        // Remove from IndexedDB
        if (this.db) {
            const transaction = this.db.transaction(['responses'], 'readwrite');
            const store = transaction.objectStore('responses');
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoff);

            index.openCursor(range).onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        }

        console.log(`🧹 Cleared ${toDelete.length} old cache entries`);
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        totalEntries: number;
        totalSize: number;
        oldestEntry: number;
        newestEntry: number;
    } {
        let totalSize = 0;
        let oldest = Date.now();
        let newest = 0;

        for (const response of this.cache.values()) {
            totalSize += response.query.length + response.response.length;
            oldest = Math.min(oldest, response.timestamp);
            newest = Math.max(newest, response.timestamp);
        }

        return {
            totalEntries: this.cache.size,
            totalSize,
            oldestEntry: oldest,
            newestEntry: newest
        };
    }

    /**
     * Export cache data
     */
    public exportCache(): CachedResponse[] {
        return Array.from(this.cache.values());
    }

    /**
     * Import cache data
     */
    public async importCache(responses: CachedResponse[]): Promise<void> {
        for (const response of responses) {
            const key = this.generateCacheKey(response.query);
            this.cache.set(key, response);
            await this.saveToDB(response);
        }
        console.log(`📥 Imported ${responses.length} cache entries`);
    }
}