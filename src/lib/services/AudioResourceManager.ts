/**
 * Audio Resource Manager
 * Handles cleanup, memory management, and caching for audio resources
 */

interface AudioResource {
    id: string;
    url: string;
    element?: HTMLAudioElement;
    blob?: Blob;
    createdAt: number;
    lastUsed: number;
    size: number;
    type: 'tts' | 'recording' | 'response';
    persistent: boolean;
}

interface AudioCacheConfig {
    maxCacheSize: number; // Maximum cache size in bytes
    maxCacheAge: number; // Maximum age in milliseconds
    maxItems: number; // Maximum number of cached items
    cleanupInterval: number; // Cleanup interval in milliseconds
}

export class AudioResourceManager {
    private static instance: AudioResourceManager | null = null;
    private audioResources = new Map<string, AudioResource>();
    private activeAudioElements = new Set<HTMLAudioElement>();
    private cleanupInterval: NodeJS.Timeout | null = null;
    private config: AudioCacheConfig;

    private constructor(config?: Partial<AudioCacheConfig>) {
        this.config = {
            maxCacheSize: 50 * 1024 * 1024, // 50MB default
            maxCacheAge: 30 * 60 * 1000, // 30 minutes default
            maxItems: 100, // 100 items default
            cleanupInterval: 5 * 60 * 1000, // 5 minutes cleanup interval
            ...config
        };

        this.startCleanupInterval();
        this.setupUnloadHandler();
    }

    public static getInstance(config?: Partial<AudioCacheConfig>): AudioResourceManager {
        if (!AudioResourceManager.instance) {
            AudioResourceManager.instance = new AudioResourceManager(config);
        }
        return AudioResourceManager.instance;
    }

    /**
     * Create and register an audio element with proper resource management
     */
    public createAudioElement(
        audioData: string | Blob,
        type: 'tts' | 'recording' | 'response',
        options: {
            persistent?: boolean;
            id?: string;
            mimeType?: string;
        } = {}
    ): { audio: HTMLAudioElement; resourceId: string } {
        const resourceId = options.id || `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            let audioUrl: string;
            let blob: Blob | undefined;
            let size: number;

            if (typeof audioData === 'string') {
                // Base64 data
                const mimeType = options.mimeType || 'audio/mp3';
                audioUrl = `data:${mimeType};base64,${audioData}`;
                size = audioData.length * 0.75; // Approximate size after base64 decoding
            } else {
                // Blob data
                blob = audioData;
                audioUrl = URL.createObjectURL(audioData);
                size = audioData.size;
            }

            const audio = new Audio();
            audio.preload = 'auto';
            audio.crossOrigin = 'anonymous';
            audio.src = audioUrl;

            // Register the audio element
            this.activeAudioElements.add(audio);

            // Create resource entry
            const resource: AudioResource = {
                id: resourceId,
                url: audioUrl,
                element: audio,
                blob,
                createdAt: Date.now(),
                lastUsed: Date.now(),
                size,
                type,
                persistent: options.persistent || false
            };

            this.audioResources.set(resourceId, resource);

            // Set up cleanup handlers
            this.setupAudioElementCleanup(audio, resourceId);

            console.log(`🎵 Created audio resource: ${resourceId} (${this.formatBytes(size)})`);

            return { audio, resourceId };

        } catch (error) {
            console.error('❌ Failed to create audio element:', error);
            throw new Error(`Failed to create audio element: ${error.message}`);
        }
    }

    /**
     * Get an existing audio resource
     */
    public getAudioResource(resourceId: string): AudioResource | null {
        const resource = this.audioResources.get(resourceId);
        if (resource) {
            resource.lastUsed = Date.now();
            return resource;
        }
        return null;
    }

    /**
     * Clean up a specific audio resource
     */
    public cleanupAudioResource(resourceId: string): boolean {
        const resource = this.audioResources.get(resourceId);
        if (!resource) {
            return false;
        }

        try {
            console.log(`🧹 Cleaning up audio resource: ${resourceId}`);

            // Clean up audio element
            if (resource.element) {
                this.cleanupAudioElement(resource.element);
                this.activeAudioElements.delete(resource.element);
            }

            // Revoke object URL if it was created from blob
            if (resource.blob && resource.url.startsWith('blob:')) {
                URL.revokeObjectURL(resource.url);
            }

            // Remove from cache
            this.audioResources.delete(resourceId);

            console.log(`✅ Audio resource cleaned up: ${resourceId}`);
            return true;

        } catch (error) {
            console.error(`❌ Error cleaning up audio resource ${resourceId}:`, error);
            return false;
        }
    }

    /**
     * Clean up all audio resources
     */
    public cleanupAllResources(): void {
        console.log(`🧹 Cleaning up all audio resources (${this.audioResources.size} items)`);

        const resourceIds = Array.from(this.audioResources.keys());
        let cleanedCount = 0;

        for (const resourceId of resourceIds) {
            if (this.cleanupAudioResource(resourceId)) {
                cleanedCount++;
            }
        }

        console.log(`✅ Cleaned up ${cleanedCount}/${resourceIds.length} audio resources`);
    }

    /**
     * Clean up non-persistent resources older than maxAge
     */
    public cleanupExpiredResources(): void {
        const now = Date.now();
        const expiredResources: string[] = [];

        for (const [resourceId, resource] of this.audioResources) {
            if (!resource.persistent && (now - resource.lastUsed) > this.config.maxCacheAge) {
                expiredResources.push(resourceId);
            }
        }

        if (expiredResources.length > 0) {
            console.log(`🧹 Cleaning up ${expiredResources.length} expired audio resources`);

            for (const resourceId of expiredResources) {
                this.cleanupAudioResource(resourceId);
            }
        }
    }

    /**
     * Clean up resources to stay within cache limits
     */
    public cleanupToLimits(): void {
        const resources = Array.from(this.audioResources.values());

        // Check if we need to clean up
        const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
        const needsSizeCleanup = totalSize > this.config.maxCacheSize;
        const needsCountCleanup = resources.length > this.config.maxItems;

        if (!needsSizeCleanup && !needsCountCleanup) {
            return;
        }

        console.log(`🧹 Cache limits exceeded - cleaning up resources`, {
            totalSize: this.formatBytes(totalSize),
            maxSize: this.formatBytes(this.config.maxCacheSize),
            itemCount: resources.length,
            maxItems: this.config.maxItems
        });

        // Sort by last used (oldest first), but keep persistent resources
        const sortedResources = resources
            .filter(r => !r.persistent)
            .sort((a, b) => a.lastUsed - b.lastUsed);

        let cleanedSize = 0;
        let cleanedCount = 0;

        for (const resource of sortedResources) {
            if ((!needsSizeCleanup || totalSize - cleanedSize <= this.config.maxCacheSize) &&
                (!needsCountCleanup || resources.length - cleanedCount <= this.config.maxItems)) {
                break;
            }

            if (this.cleanupAudioResource(resource.id)) {
                cleanedSize += resource.size;
                cleanedCount++;
            }
        }

        console.log(`✅ Cleaned up ${cleanedCount} resources (${this.formatBytes(cleanedSize)})`);
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        totalItems: number;
        totalSize: number;
        activeElements: number;
        persistentItems: number;
        oldestItem: number | null;
        newestItem: number | null;
    } {
        const resources = Array.from(this.audioResources.values());
        const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
        const persistentItems = resources.filter(r => r.persistent).length;
        const timestamps = resources.map(r => r.createdAt);

        return {
            totalItems: resources.length,
            totalSize,
            activeElements: this.activeAudioElements.size,
            persistentItems,
            oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : null,
            newestItem: timestamps.length > 0 ? Math.max(...timestamps) : null
        };
    }

    /**
     * Stop and clean up all active audio elements
     */
    public stopAllAudio(): void {
        console.log(`⏹️ Stopping all active audio (${this.activeAudioElements.size} elements)`);

        for (const audio of this.activeAudioElements) {
            try {
                if (!audio.paused) {
                    audio.pause();
                }
                audio.currentTime = 0;
            } catch (error) {
                console.warn('⚠️ Error stopping audio element:', error);
            }
        }
    }

    /**
     * Pause all active audio elements
     */
    public pauseAllAudio(): void {
        console.log(`⏸️ Pausing all active audio (${this.activeAudioElements.size} elements)`);

        for (const audio of this.activeAudioElements) {
            try {
                if (!audio.paused) {
                    audio.pause();
                }
            } catch (error) {
                console.warn('⚠️ Error pausing audio element:', error);
            }
        }
    }

    /**
     * Set up cleanup handlers for an audio element
     */
    private setupAudioElementCleanup(audio: HTMLAudioElement, resourceId: string): void {
        const cleanup = () => {
            this.activeAudioElements.delete(audio);
        };

        audio.addEventListener('ended', cleanup);
        audio.addEventListener('error', cleanup);

        // Store cleanup function for manual cleanup
        (audio as any)._resourceCleanup = cleanup;
        (audio as any)._resourceId = resourceId;
    }

    /**
     * Clean up an individual audio element
     */
    private cleanupAudioElement(audio: HTMLAudioElement): void {
        try {
            // Pause and reset
            if (!audio.paused) {
                audio.pause();
            }
            audio.currentTime = 0;

            // Clear source
            audio.src = '';
            audio.load();

            // Remove event listeners
            audio.onended = null;
            audio.onerror = null;
            audio.onplay = null;
            audio.onpause = null;
            audio.onabort = null;
            audio.onloadstart = null;
            audio.onloadeddata = null;
            audio.oncanplay = null;

            // Call custom cleanup if available
            if ((audio as any)._resourceCleanup) {
                (audio as any)._resourceCleanup();
            }

        } catch (error) {
            console.warn('⚠️ Error during audio element cleanup:', error);
        }
    }

    /**
     * Start the periodic cleanup interval
     */
    private startCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredResources();
            this.cleanupToLimits();
        }, this.config.cleanupInterval);

        console.log(`🔄 Started audio resource cleanup interval (${this.config.cleanupInterval / 1000}s)`);
    }

    /**
     * Set up cleanup on page unload
     */
    private setupUnloadHandler(): void {
        if (typeof window !== 'undefined') {
            const cleanup = () => {
                console.log('🧹 Page unloading - cleaning up all audio resources');
                this.stopAllAudio();
                this.cleanupAllResources();

                if (this.cleanupInterval) {
                    clearInterval(this.cleanupInterval);
                    this.cleanupInterval = null;
                }
            };

            window.addEventListener('beforeunload', cleanup);
            window.addEventListener('unload', cleanup);

            // Also cleanup on visibility change (mobile browsers)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseAllAudio();
                }
            });
        }
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
        if (AudioResourceManager.instance) {
            AudioResourceManager.instance.cleanupAllResources();
            if (AudioResourceManager.instance.cleanupInterval) {
                clearInterval(AudioResourceManager.instance.cleanupInterval);
            }
            AudioResourceManager.instance = null;
        }
    }
}

export default AudioResourceManager;