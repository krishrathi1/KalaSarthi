/**
 * Voice Service Performance Optimizer
 * Handles service availability caching, audio processing optimization, and TTS response caching
 */

interface ServiceAvailabilityCache {
    sttAvailable: boolean;
    ttsAvailable: boolean;
    selectedTTSService: 'google-cloud' | 'browser';
    microphonePermission: 'granted' | 'denied' | 'prompt';
    lastChecked: number;
    expiresAt: number;
}

interface TTSCacheEntry {
    text: string;
    language: string;
    voice?: string;
    audioData: string;
    mimeType: string;
    createdAt: number;
    lastUsed: number;
    size: number;
    hash: string;
}

interface AudioProcessingConfig {
    preferredSampleRate: number;
    preferredChannels: number;
    compressionEnabled: boolean;
    noiseSuppressionEnabled: boolean;
    echoCancellationEnabled: boolean;
    autoGainControlEnabled: boolean;
}

interface PerformanceMetrics {
    sttProcessingTimes: number[];
    ttsGenerationTimes: number[];
    audioLoadTimes: number[];
    cacheHitRate: number;
    totalRequests: number;
    cacheHits: number;
    averageSTTTime: number;
    averageTTSTime: number;
    averageAudioLoadTime: number;
}

export class VoiceServiceOptimizer {
    private static instance: VoiceServiceOptimizer | null = null;
    private serviceCache: ServiceAvailabilityCache | null = null;
    private ttsCache = new Map<string, TTSCacheEntry>();
    private performanceMetrics: PerformanceMetrics;
    private audioConfig: AudioProcessingConfig;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private readonly TTS_CACHE_MAX_SIZE = 20 * 1024 * 1024; // 20MB
    private readonly TTS_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour
    private readonly TTS_CACHE_MAX_ITEMS = 200;

    private constructor() {
        this.performanceMetrics = {
            sttProcessingTimes: [],
            ttsGenerationTimes: [],
            audioLoadTimes: [],
            cacheHitRate: 0,
            totalRequests: 0,
            cacheHits: 0,
            averageSTTTime: 0,
            averageTTSTime: 0,
            averageAudioLoadTime: 0
        };

        this.audioConfig = {
            preferredSampleRate: 16000,
            preferredChannels: 1,
            compressionEnabled: true,
            noiseSuppressionEnabled: true,
            echoCancellationEnabled: true,
            autoGainControlEnabled: true
        };

        this.startPerformanceTracking();
    }

    public static getInstance(): VoiceServiceOptimizer {
        if (!VoiceServiceOptimizer.instance) {
            VoiceServiceOptimizer.instance = new VoiceServiceOptimizer();
        }
        return VoiceServiceOptimizer.instance;
    }

    /**
     * Get cached service availability or check and cache if expired
     */
    public async getServiceAvailability(forceRefresh = false): Promise<ServiceAvailabilityCache> {
        const now = Date.now();

        // Return cached result if valid and not forcing refresh
        if (!forceRefresh && this.serviceCache && now < this.serviceCache.expiresAt) {
            console.log('🚀 Using cached service availability');
            return this.serviceCache;
        }

        console.log('🔍 Checking service availability...');
        const startTime = Date.now();

        try {
            // Check TTS service availability
            const ttsAvailability = await this.checkTTSAvailability();

            // Check microphone permission
            const micPermission = await this.checkMicrophonePermission();

            // Check STT availability (assume available if we have a service instance)
            const sttAvailable = true; // GeminiSpeechService is typically available

            const serviceCache: ServiceAvailabilityCache = {
                sttAvailable,
                ttsAvailable: ttsAvailability.available,
                selectedTTSService: ttsAvailability.selectedService,
                microphonePermission: micPermission,
                lastChecked: now,
                expiresAt: now + this.CACHE_DURATION
            };

            this.serviceCache = serviceCache;

            const checkTime = Date.now() - startTime;
            console.log(`✅ Service availability cached (${checkTime}ms)`, serviceCache);

            return serviceCache;

        } catch (error) {
            console.error('❌ Service availability check failed:', error);

            // Return a conservative fallback cache
            const fallbackCache: ServiceAvailabilityCache = {
                sttAvailable: false,
                ttsAvailable: false,
                selectedTTSService: 'browser',
                microphonePermission: 'prompt',
                lastChecked: now,
                expiresAt: now + (this.CACHE_DURATION / 2) // Shorter cache for failures
            };

            this.serviceCache = fallbackCache;
            return fallbackCache;
        }
    }

    /**
     * Get optimized audio constraints for recording
     */
    public getOptimizedAudioConstraints(fallbackMode = false): MediaStreamConstraints {
        if (fallbackMode) {
            // Basic constraints for compatibility
            return {
                audio: true
            };
        }

        // Optimized constraints for best performance and quality
        return {
            audio: {
                sampleRate: this.audioConfig.preferredSampleRate,
                channelCount: this.audioConfig.preferredChannels,
                echoCancellation: this.audioConfig.echoCancellationEnabled,
                noiseSuppression: this.audioConfig.noiseSuppressionEnabled,
                autoGainControl: this.audioConfig.autoGainControlEnabled,
                // Additional optimizations
                latency: 0.01, // Low latency for real-time processing
                volume: 1.0
            }
        };
    }

    /**
     * Get cached TTS response or return null if not found
     */
    public getCachedTTS(text: string, language: string, voice?: string): TTSCacheEntry | null {
        const hash = this.generateTTSHash(text, language, voice);
        const entry = this.ttsCache.get(hash);

        if (entry) {
            // Update last used time
            entry.lastUsed = Date.now();
            this.performanceMetrics.cacheHits++;
            this.updateCacheHitRate();

            console.log(`🚀 TTS cache hit for: "${text.substring(0, 50)}..."`);
            return entry;
        }

        return null;
    }

    /**
     * Cache TTS response
     */
    public cacheTTSResponse(
        text: string,
        language: string,
        audioData: string,
        mimeType: string,
        voice?: string
    ): void {
        try {
            const hash = this.generateTTSHash(text, language, voice);
            const size = audioData.length * 0.75; // Approximate size after base64 decoding

            const entry: TTSCacheEntry = {
                text,
                language,
                voice,
                audioData,
                mimeType,
                createdAt: Date.now(),
                lastUsed: Date.now(),
                size,
                hash
            };

            // Clean up cache if needed before adding
            this.cleanupTTSCache();

            this.ttsCache.set(hash, entry);
            console.log(`💾 Cached TTS response: "${text.substring(0, 50)}..." (${this.formatBytes(size)})`);

        } catch (error) {
            console.error('❌ Failed to cache TTS response:', error);
        }
    }

    /**
     * Track STT processing time
     */
    public trackSTTPerformance(processingTime: number): void {
        this.performanceMetrics.sttProcessingTimes.push(processingTime);

        // Keep only last 100 measurements
        if (this.performanceMetrics.sttProcessingTimes.length > 100) {
            this.performanceMetrics.sttProcessingTimes.shift();
        }

        this.updateAverageSTTTime();
        console.log(`📊 STT processing time: ${processingTime}ms (avg: ${this.performanceMetrics.averageSTTTime}ms)`);
    }

    /**
     * Track TTS generation time
     */
    public trackTTSPerformance(generationTime: number): void {
        this.performanceMetrics.ttsGenerationTimes.push(generationTime);

        // Keep only last 100 measurements
        if (this.performanceMetrics.ttsGenerationTimes.length > 100) {
            this.performanceMetrics.ttsGenerationTimes.shift();
        }

        this.updateAverageTTSTime();
        console.log(`📊 TTS generation time: ${generationTime}ms (avg: ${this.performanceMetrics.averageTTSTime}ms)`);
    }

    /**
     * Track audio loading time
     */
    public trackAudioLoadPerformance(loadTime: number): void {
        this.performanceMetrics.audioLoadTimes.push(loadTime);

        // Keep only last 100 measurements
        if (this.performanceMetrics.audioLoadTimes.length > 100) {
            this.performanceMetrics.audioLoadTimes.shift();
        }

        this.updateAverageAudioLoadTime();
        console.log(`📊 Audio load time: ${loadTime}ms (avg: ${this.performanceMetrics.averageAudioLoadTime}ms)`);
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get TTS cache statistics
     */
    public getTTSCacheStats(): {
        totalItems: number;
        totalSize: number;
        hitRate: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    } {
        const entries = Array.from(this.ttsCache.values());
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        const timestamps = entries.map(entry => entry.createdAt);

        return {
            totalItems: entries.length,
            totalSize,
            hitRate: this.performanceMetrics.cacheHitRate,
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
        };
    }

    /**
     * Clear TTS cache
     */
    public clearTTSCache(): void {
        const itemCount = this.ttsCache.size;
        this.ttsCache.clear();
        console.log(`🧹 Cleared TTS cache (${itemCount} items)`);
    }

    /**
     * Optimize audio format for processing
     */
    public async optimizeAudioBlob(audioBlob: Blob): Promise<Blob> {
        try {
            // If compression is disabled, return original blob
            if (!this.audioConfig.compressionEnabled) {
                return audioBlob;
            }

            // For now, return the original blob
            // In the future, we could implement audio compression here
            console.log(`🔧 Audio optimization: ${this.formatBytes(audioBlob.size)} (no compression applied)`);
            return audioBlob;

        } catch (error) {
            console.error('❌ Audio optimization failed:', error);
            return audioBlob; // Return original on error
        }
    }

    /**
     * Get recommended TTS service based on performance
     */
    public getRecommendedTTSService(): 'google-cloud' | 'browser' {
        const avgTTSTime = this.performanceMetrics.averageTTSTime;

        // If we have performance data and Google Cloud is slow, recommend browser
        if (avgTTSTime > 3000) { // 3 seconds threshold
            console.log('🔧 Recommending browser TTS due to slow Google Cloud performance');
            return 'browser';
        }

        // Default to Google Cloud for better quality
        return 'google-cloud';
    }

    /**
     * Check TTS service availability
     */
    private async checkTTSAvailability(): Promise<{
        available: boolean;
        selectedService: 'google-cloud' | 'browser';
    }> {
        try {
            // Check browser TTS availability
            const browserTTSAvailable = 'speechSynthesis' in window && !!window.speechSynthesis;

            // For Google Cloud TTS, we'll assume it's available if we have the service
            // In a real implementation, you might want to make a test call
            const googleCloudAvailable = true; // Assume available

            return {
                available: browserTTSAvailable || googleCloudAvailable,
                selectedService: googleCloudAvailable ? 'google-cloud' : 'browser'
            };

        } catch (error) {
            console.error('❌ TTS availability check failed:', error);
            return {
                available: false,
                selectedService: 'browser'
            };
        }
    }

    /**
     * Check microphone permission
     */
    private async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
        try {
            if (typeof navigator === 'undefined' || !navigator.permissions) {
                return 'prompt';
            }

            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            return permission.state as 'granted' | 'denied' | 'prompt';
        } catch (error) {
            console.warn('Could not check microphone permission:', error);
            return 'prompt';
        }
    }

    /**
     * Generate hash for TTS cache key
     */
    private generateTTSHash(text: string, language: string, voice?: string): string {
        const content = `${text}|${language}|${voice || 'default'}`;
        // Simple hash function (in production, consider using a proper hash library)
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Clean up TTS cache to stay within limits
     */
    private cleanupTTSCache(): void {
        const entries = Array.from(this.ttsCache.entries());
        const totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);
        const now = Date.now();

        // Remove expired entries
        const expiredKeys: string[] = [];
        for (const [key, entry] of entries) {
            if (now - entry.lastUsed > this.TTS_CACHE_MAX_AGE) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.ttsCache.delete(key);
        }

        if (expiredKeys.length > 0) {
            console.log(`🧹 Removed ${expiredKeys.length} expired TTS cache entries`);
        }

        // Check if we still need to clean up for size/count limits
        const remainingEntries = Array.from(this.ttsCache.entries());
        const remainingSize = remainingEntries.reduce((sum, [, entry]) => sum + entry.size, 0);

        if (remainingSize > this.TTS_CACHE_MAX_SIZE || remainingEntries.length > this.TTS_CACHE_MAX_ITEMS) {
            // Sort by last used (oldest first)
            remainingEntries.sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

            let cleanedSize = 0;
            let cleanedCount = 0;

            for (const [key, entry] of remainingEntries) {
                if (remainingSize - cleanedSize <= this.TTS_CACHE_MAX_SIZE &&
                    remainingEntries.length - cleanedCount <= this.TTS_CACHE_MAX_ITEMS) {
                    break;
                }

                this.ttsCache.delete(key);
                cleanedSize += entry.size;
                cleanedCount++;
            }

            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} TTS cache entries (${this.formatBytes(cleanedSize)})`);
            }
        }
    }

    /**
     * Update cache hit rate
     */
    private updateCacheHitRate(): void {
        this.performanceMetrics.totalRequests++;
        this.performanceMetrics.cacheHitRate =
            (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100;
    }

    /**
     * Update average STT time
     */
    private updateAverageSTTTime(): void {
        const times = this.performanceMetrics.sttProcessingTimes;
        this.performanceMetrics.averageSTTTime =
            times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    }

    /**
     * Update average TTS time
     */
    private updateAverageTTSTime(): void {
        const times = this.performanceMetrics.ttsGenerationTimes;
        this.performanceMetrics.averageTTSTime =
            times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    }

    /**
     * Update average audio load time
     */
    private updateAverageAudioLoadTime(): void {
        const times = this.performanceMetrics.audioLoadTimes;
        this.performanceMetrics.averageAudioLoadTime =
            times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    }

    /**
     * Start performance tracking
     */
    private startPerformanceTracking(): void {
        // Track cache performance every 30 seconds
        setInterval(() => {
            const stats = this.getTTSCacheStats();
            console.log(`📊 Performance: TTS Cache ${stats.hitRate.toFixed(1)}% hit rate, ${stats.totalItems} items, ${this.formatBytes(stats.totalSize)}`);
        }, 30000);
    }

    /**
     * Format bytes for human-readable display
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Destroy the singleton instance (for testing)
     */
    public static destroy(): void {
        if (VoiceServiceOptimizer.instance) {
            VoiceServiceOptimizer.instance.clearTTSCache();
            VoiceServiceOptimizer.instance = null;
        }
    }
}

export default VoiceServiceOptimizer;