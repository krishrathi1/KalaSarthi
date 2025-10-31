/**
 * Voice Navigation Performance Optimizer
 * Implements lazy loading, caching, and audio processing optimizations
 */

export interface VoiceNavigationCache {
    intents: Map<string, CachedIntent>;
    audioFeedback: Map<string, CachedAudio>;
    languageModels: Map<string, CachedLanguageModel>;
    navigationPatterns: Map<string, CachedNavigationPattern>;
}

export interface CachedIntent {
    key: string;
    intent: string;
    confidence: number;
    targetRoute: string;
    language: string;
    timestamp: number;
    hitCount: number;
    expiresAt: number;
}

export interface CachedAudio {
    key: string;
    audioBuffer: ArrayBuffer;
    text: string;
    language: string;
    timestamp: number;
    hitCount: number;
    expiresAt: number;
}

export interface CachedLanguageModel {
    language: string;
    patterns: string[];
    confidence: number;
    timestamp: number;
    expiresAt: number;
}

export interface CachedNavigationPattern {
    pattern: string;
    route: string;
    language: string;
    confidence: number;
    timestamp: number;
    hitCount: number;
    expiresAt: number;
}

export interface PerformanceMetrics {
    cacheHitRate: number;
    averageProcessingTime: number;
    audioLatency: number;
    memoryUsage: number;
    totalRequests: number;
    cacheSize: number;
}

export class VoiceNavigationPerformanceOptimizer {
    private static instance: VoiceNavigationPerformanceOptimizer;
    private cache: VoiceNavigationCache;
    private metrics: PerformanceMetrics;
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
    private readonly MAX_AUDIO_CACHE_SIZE = 100;

    private constructor() {
        this.cache = {
            intents: new Map(),
            audioFeedback: new Map(),
            languageModels: new Map(),
            navigationPatterns: new Map()
        };

        this.metrics = {
            cacheHitRate: 0,
            averageProcessingTime: 0,
            audioLatency: 0,
            memoryUsage: 0,
            totalRequests: 0,
            cacheSize: 0
        };

        // Start cache cleanup interval
        this.startCacheCleanup();
    }

    public static getInstance(): VoiceNavigationPerformanceOptimizer {
        if (!VoiceNavigationPerformanceOptimizer.instance) {
            VoiceNavigationPerformanceOptimizer.instance = new VoiceNavigationPerformanceOptimizer();
        }
        return VoiceNavigationPerformanceOptimizer.instance;
    }

    /**
     * Cache intent recognition results
     */
    public cacheIntent(text: string, intent: CachedIntent): void {
        const key = this.generateIntentKey(text, intent.language);

        // Check cache size and evict if necessary
        if (this.cache.intents.size >= this.MAX_CACHE_SIZE) {
            this.evictLeastUsedIntents();
        }

        intent.key = key;
        intent.timestamp = Date.now();
        intent.expiresAt = Date.now() + this.CACHE_TTL;
        intent.hitCount = 0;

        this.cache.intents.set(key, intent);
        this.updateCacheMetrics();
    }

    /**
     * Get cached intent if available
     */
    public getCachedIntent(text: string, language: string): CachedIntent | null {
        const key = this.generateIntentKey(text, language);
        const cached = this.cache.intents.get(key);

        this.metrics.totalRequests++;

        if (cached) {
            if (cached.expiresAt > Date.now()) {
                cached.hitCount++;
                return { ...cached }; // Return a copy to avoid mutation issues
            } else {
                // Remove expired entry
                this.cache.intents.delete(key);
            }
        }

        return null;
    }

    /**
     * Cache audio feedback for reuse
     */
    public cacheAudioFeedback(text: string, language: string, audioBuffer: ArrayBuffer): void {
        const key = this.generateAudioKey(text, language);

        // Check cache size and evict if necessary
        if (this.cache.audioFeedback.size >= this.MAX_AUDIO_CACHE_SIZE) {
            this.evictLeastUsedAudio();
        }

        const cachedAudio: CachedAudio = {
            key,
            audioBuffer,
            text,
            language,
            timestamp: Date.now(),
            hitCount: 0,
            expiresAt: Date.now() + this.AUDIO_CACHE_TTL
        };

        this.cache.audioFeedback.set(key, cachedAudio);
        this.updateCacheMetrics();
    }

    /**
     * Get cached audio feedback if available
     */
    public getCachedAudioFeedback(text: string, language: string): ArrayBuffer | null {
        const key = this.generateAudioKey(text, language);
        const cached = this.cache.audioFeedback.get(key);

        if (cached && cached.expiresAt > Date.now()) {
            cached.hitCount++;
            return cached.audioBuffer;
        }

        if (cached) {
            this.cache.audioFeedback.delete(key);
        }

        return null;
    }

    /**
     * Cache navigation patterns for faster matching
     */
    public cacheNavigationPattern(pattern: string, route: string, language: string, confidence: number): void {
        const key = this.generatePatternKey(pattern, language);

        const cachedPattern: CachedNavigationPattern = {
            pattern,
            route,
            language,
            confidence,
            timestamp: Date.now(),
            hitCount: 0,
            expiresAt: Date.now() + this.CACHE_TTL
        };

        this.cache.navigationPatterns.set(key, cachedPattern);
        this.updateCacheMetrics();
    }

    /**
     * Get cached navigation pattern
     */
    public getCachedNavigationPattern(pattern: string, language: string): CachedNavigationPattern | null {
        const key = this.generatePatternKey(pattern, language);
        const cached = this.cache.navigationPatterns.get(key);

        if (cached && cached.expiresAt > Date.now()) {
            cached.hitCount++;
            return cached;
        }

        if (cached) {
            this.cache.navigationPatterns.delete(key);
        }

        return null;
    }

    /**
     * Optimize audio processing with compression and buffering
     */
    public async optimizeAudioProcessing(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
        try {
            // Create audio context for processing
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioData = await audioContext.decodeAudioData(audioBuffer.slice(0));

            // Apply audio optimizations
            const optimizedBuffer = await this.applyAudioOptimizations(audioContext, audioData);

            // Close context to free resources
            await audioContext.close();

            return optimizedBuffer;
        } catch (error) {
            console.error('Audio optimization failed:', error);
            return audioBuffer;
        }
    }

    /**
     * Preload common navigation patterns for faster access
     */
    public async preloadCommonPatterns(language: string): Promise<void> {
        const commonPatterns = this.getCommonNavigationPatterns(language);

        for (const pattern of commonPatterns) {
            this.cacheNavigationPattern(
                pattern.text,
                pattern.route,
                language,
                pattern.confidence
            );
        }
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        this.updateCacheMetrics();
        return { ...this.metrics };
    }

    /**
     * Clear all caches
     */
    public clearCache(): void {
        this.cache.intents.clear();
        this.cache.audioFeedback.clear();
        this.cache.languageModels.clear();
        this.cache.navigationPatterns.clear();
        this.updateCacheMetrics();
    }

    /**
     * Optimize memory usage by cleaning up expired entries
     */
    public optimizeMemoryUsage(): void {
        const now = Date.now();

        // Clean expired intents
        for (const [key, intent] of this.cache.intents.entries()) {
            if (intent.expiresAt < now) {
                this.cache.intents.delete(key);
            }
        }

        // Clean expired audio
        for (const [key, audio] of this.cache.audioFeedback.entries()) {
            if (audio.expiresAt < now) {
                this.cache.audioFeedback.delete(key);
            }
        }

        // Clean expired patterns
        for (const [key, pattern] of this.cache.navigationPatterns.entries()) {
            if (pattern.expiresAt < now) {
                this.cache.navigationPatterns.delete(key);
            }
        }

        this.updateCacheMetrics();
    }

    private generateIntentKey(text: string, language: string): string {
        return `intent:${language}:${text.toLowerCase().trim()}`;
    }

    private generateAudioKey(text: string, language: string): string {
        return `audio:${language}:${text.toLowerCase().trim()}`;
    }

    private generatePatternKey(pattern: string, language: string): string {
        return `pattern:${language}:${pattern.toLowerCase().trim()}`;
    }

    private evictLeastUsedIntents(): void {
        let leastUsed: [string, CachedIntent] | null = null;

        for (const entry of this.cache.intents.entries()) {
            if (!leastUsed || entry[1].hitCount < leastUsed[1].hitCount) {
                leastUsed = entry;
            }
        }

        if (leastUsed) {
            this.cache.intents.delete(leastUsed[0]);
        }
    }

    private evictLeastUsedAudio(): void {
        let leastUsed: [string, CachedAudio] | null = null;

        for (const entry of this.cache.audioFeedback.entries()) {
            if (!leastUsed || entry[1].hitCount < leastUsed[1].hitCount) {
                leastUsed = entry;
            }
        }

        if (leastUsed) {
            this.cache.audioFeedback.delete(leastUsed[0]);
        }
    }

    private async applyAudioOptimizations(
        audioContext: AudioContext,
        audioBuffer: AudioBuffer
    ): Promise<ArrayBuffer> {
        try {
            // Create offline context for processing
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );

            // Create source and apply filters
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;

            // Apply compression to reduce size
            const compressor = offlineContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, offlineContext.currentTime);
            compressor.knee.setValueAtTime(30, offlineContext.currentTime);
            compressor.ratio.setValueAtTime(12, offlineContext.currentTime);
            compressor.attack.setValueAtTime(0.003, offlineContext.currentTime);
            compressor.release.setValueAtTime(0.25, offlineContext.currentTime);

            // Connect nodes
            source.connect(compressor);
            compressor.connect(offlineContext.destination);

            // Start processing
            source.start();
            const optimizedBuffer = await offlineContext.startRendering();

            // Convert back to ArrayBuffer
            const length = optimizedBuffer.length * optimizedBuffer.numberOfChannels * 2;
            const arrayBuffer = new ArrayBuffer(length);
            const view = new Int16Array(arrayBuffer);

            let offset = 0;
            for (let i = 0; i < optimizedBuffer.length; i++) {
                for (let channel = 0; channel < optimizedBuffer.numberOfChannels; channel++) {
                    const sample = Math.max(-1, Math.min(1, optimizedBuffer.getChannelData(channel)[i]));
                    view[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                }
            }

            return arrayBuffer;
        } catch (error) {
            console.error('Audio optimization processing failed:', error);
            throw error;
        }
    }

    private getCommonNavigationPatterns(language: string): Array<{ text: string, route: string, confidence: number }> {
        const patterns = {
            'en-US': [
                { text: 'go to dashboard', route: '/dashboard', confidence: 0.95 },
                { text: 'open profile', route: '/profile', confidence: 0.95 },
                { text: 'show marketplace', route: '/marketplace', confidence: 0.95 },
                { text: 'go home', route: '/', confidence: 0.95 },
                { text: 'open cart', route: '/cart', confidence: 0.95 },
                { text: 'show trends', route: '/trend-spotter', confidence: 0.90 },
                { text: 'finance dashboard', route: '/finance', confidence: 0.90 }
            ],
            'hi-IN': [
                { text: 'डैशबोर्ड पर जाएं', route: '/dashboard', confidence: 0.95 },
                { text: 'प्रोफाइल खोलें', route: '/profile', confidence: 0.95 },
                { text: 'बाजार दिखाएं', route: '/marketplace', confidence: 0.95 },
                { text: 'घर जाएं', route: '/', confidence: 0.95 },
                { text: 'कार्ट खोलें', route: '/cart', confidence: 0.95 }
            ]
        };

        return patterns[language as keyof typeof patterns] || patterns['en-US'];
    }

    private updateCacheMetrics(): void {
        const totalCacheSize =
            this.cache.intents.size +
            this.cache.audioFeedback.size +
            this.cache.languageModels.size +
            this.cache.navigationPatterns.size;

        this.metrics.cacheSize = totalCacheSize;

        // Calculate cache hit rate
        let totalHits = 0;
        for (const intent of this.cache.intents.values()) {
            totalHits += intent.hitCount;
        }
        for (const audio of this.cache.audioFeedback.values()) {
            totalHits += audio.hitCount;
        }
        for (const pattern of this.cache.navigationPatterns.values()) {
            totalHits += pattern.hitCount;
        }

        this.metrics.cacheHitRate = this.metrics.totalRequests > 0
            ? totalHits / this.metrics.totalRequests
            : 0;

        // Estimate memory usage (rough calculation)
        this.metrics.memoryUsage = totalCacheSize * 1024; // Rough estimate in bytes
    }

    private startCacheCleanup(): void {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.optimizeMemoryUsage();
        }, 5 * 60 * 1000);
    }
}

/**
 * Lazy loader for voice navigation services
 */
export class VoiceNavigationLazyLoader {
    private static instance: VoiceNavigationLazyLoader;
    private loadedServices: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();

    private constructor() { }

    public static getInstance(): VoiceNavigationLazyLoader {
        if (!VoiceNavigationLazyLoader.instance) {
            VoiceNavigationLazyLoader.instance = new VoiceNavigationLazyLoader();
        }
        return VoiceNavigationLazyLoader.instance;
    }

    /**
     * Lazy load voice navigation service
     */
    public async loadVoiceNavigationService(): Promise<any> {
        const serviceKey = 'voiceNavigation';

        if (this.loadedServices.has(serviceKey)) {
            return this.loadedServices.get(serviceKey);
        }

        if (this.loadingPromises.has(serviceKey)) {
            return this.loadingPromises.get(serviceKey);
        }

        const loadPromise = this.loadService(serviceKey);
        this.loadingPromises.set(serviceKey, loadPromise);

        try {
            const service = await loadPromise;
            this.loadedServices.set(serviceKey, service);
            this.loadingPromises.delete(serviceKey);
            return service;
        } catch (error) {
            this.loadingPromises.delete(serviceKey);
            throw error;
        }
    }

    /**
     * Lazy load multilingual service
     */
    public async loadMultilingualService(): Promise<any> {
        const serviceKey = 'multilingual';

        if (this.loadedServices.has(serviceKey)) {
            return this.loadedServices.get(serviceKey);
        }

        if (this.loadingPromises.has(serviceKey)) {
            return this.loadingPromises.get(serviceKey);
        }

        const loadPromise = this.loadService(serviceKey);
        this.loadingPromises.set(serviceKey, loadPromise);

        try {
            const service = await loadPromise;
            this.loadedServices.set(serviceKey, service);
            this.loadingPromises.delete(serviceKey);
            return service;
        } catch (error) {
            this.loadingPromises.delete(serviceKey);
            throw error;
        }
    }

    /**
     * Preload services in the background
     */
    public async preloadServices(): Promise<void> {
        try {
            await Promise.all([
                this.loadVoiceNavigationService(),
                this.loadMultilingualService()
            ]);
        } catch (error) {
            console.error('Service preloading failed:', error);
        }
    }

    private async loadService(serviceKey: string): Promise<any> {
        // Simulate dynamic import with delay for realistic loading
        await new Promise(resolve => setTimeout(resolve, 100));

        switch (serviceKey) {
            case 'voiceNavigation':
                const { VoiceNavigationClientService } = await import('@/lib/services/client/VoiceNavigationClientService');
                return VoiceNavigationClientService.getInstance();

            case 'multilingual':
                const { MultilingualVoiceClientService } = await import('@/lib/services/client/VoiceNavigationClientService');
                return MultilingualVoiceClientService.getInstance();

            default:
                throw new Error(`Unknown service: ${serviceKey}`);
        }
    }

    /**
     * Check if service is loaded
     */
    public isServiceLoaded(serviceKey: string): boolean {
        return this.loadedServices.has(serviceKey);
    }

    /**
     * Unload service to free memory
     */
    public unloadService(serviceKey: string): void {
        this.loadedServices.delete(serviceKey);
        this.loadingPromises.delete(serviceKey);
    }
}