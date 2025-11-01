/**
 * ModelLoader Component for Gemma 2B Offline Service
 * 
 * Handles downloading, caching, and initialization of the Gemma 2B model using Transformers.js
 * Implements progressive loading with progress callbacks and model validation
 */

// Initialize transformers environment first
import '../../transformers-env';

import { pipeline, TextGenerationPipeline } from '@xenova/transformers';
import {
    IModelLoader,
    LoadProgress,
    LoadStage,
    ModelConfig,
    Gemma2BErrorType
} from '../../types/gemma-2b-offline';
import {
    ModelLoadError,
    NetworkError,
    CacheError,
    ValidationError,
    Gemma2BErrorHandler
} from './errors';
import {
    DEFAULT_MODEL_CONFIG,
    MODEL_INFO,
    CACHE_SETTINGS,
    RETRY_CONFIG
} from './constants';

/**
 * IndexedDB cache interface for model storage
 */
interface ModelCacheEntry {
    modelId: string;
    version: string;
    timestamp: number;
    size: number;
    checksum?: string;
    metadata: any;
}

/**
 * ModelLoader implementation using Transformers.js
 */
export class ModelLoader implements IModelLoader {
    private loadProgress: LoadProgress;
    private errorHandler: Gemma2BErrorHandler;
    private currentPipeline: TextGenerationPipeline | null = null;
    private isLoading: boolean = false;
    private abortController: AbortController | null = null;

    // Cache management
    private readonly dbName = 'gemma-2b-model-cache';
    private readonly dbVersion = 1;
    private readonly storeName = 'models';

    constructor() {
        this.loadProgress = {
            stage: LoadStage.INITIALIZING,
            progress: 0,
            message: 'Initializing model loader...'
        };
        this.errorHandler = new Gemma2BErrorHandler();
    }

    /**
     * Load the Gemma 2B model using Transformers.js pipeline
     */
    async loadModel(modelId: string = DEFAULT_MODEL_CONFIG.modelId): Promise<TextGenerationPipeline> {
        if (this.isLoading) {
            throw new ModelLoadError('Model loading already in progress');
        }

        this.isLoading = true;
        this.abortController = new AbortController();

        try {
            // Check if model is already cached and valid
            if (await this.isModelCached(modelId)) {
                this.updateProgress(LoadStage.LOADING, 90, 'Loading cached model...');

                const cachedPipeline = await this.loadFromCache(modelId);
                if (cachedPipeline) {
                    this.currentPipeline = cachedPipeline;
                    this.updateProgress(LoadStage.READY, 100, 'Model ready');
                    this.isLoading = false;
                    return cachedPipeline;
                }
            }

            // Download and initialize new model
            return await this.downloadAndInitializeModel(modelId);

        } catch (error) {
            this.isLoading = false;
            this.updateProgress(LoadStage.ERROR, 0, `Failed to load model: ${error.message}`);

            const shouldFallback = await this.errorHandler.handleModelLoadError(error as Error);
            if (!shouldFallback) {
                throw error;
            }

            throw new ModelLoadError(
                `Failed to load model ${modelId}`,
                { originalError: error.message },
                'Try clearing cache and reloading'
            );
        }
    }

    /**
     * Check if model is cached and valid
     */
    async isModelCached(modelId: string): Promise<boolean> {
        try {
            const db = await this.openDatabase();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.get(modelId);

                request.onsuccess = () => {
                    const entry: ModelCacheEntry | undefined = request.result;
                    if (!entry) {
                        resolve(false);
                        return;
                    }

                    // Check if cache entry is still valid
                    const isExpired = Date.now() - entry.timestamp >
                        (CACHE_SETTINGS.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

                    resolve(!isExpired);
                };

                request.onerror = () => {
                    console.warn('Cache check failed:', request.error);
                    resolve(false);
                };
            });
        } catch (error) {
            console.warn('Cache availability check failed:', error);
            return false;
        }
    }

    /**
     * Get estimated model size in bytes
     */
    async getModelSize(modelId: string): Promise<number> {
        const config = DEFAULT_MODEL_CONFIG;
        const sizeKey = config.quantization as keyof typeof MODEL_INFO.APPROXIMATE_SIZE_MB;
        return MODEL_INFO.APPROXIMATE_SIZE_MB[sizeKey] * 1024 * 1024; // Convert MB to bytes
    }

    /**
     * Clear all cached models
     */
    async clearCache(): Promise<void> {
        try {
            const db = await this.openDatabase();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise<void>((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new CacheError('Failed to clear cache'));
            });

            console.log('Model cache cleared successfully');
        } catch (error) {
            throw new CacheError('Failed to clear model cache', { error: error.message });
        }
    }

    /**
     * Get current loading progress
     */
    getLoadProgress(): LoadProgress {
        return { ...this.loadProgress };
    }

    /**
     * Download and initialize model with progress tracking
     */
    private async downloadAndInitializeModel(modelId: string): Promise<TextGenerationPipeline> {
        this.updateProgress(LoadStage.DOWNLOADING, 10, 'Downloading model...');

        try {
            // Initialize transformers environment
            if (typeof window !== 'undefined') {
                // Ensure global env is properly set up
                if (!(globalThis as any).env) {
                    (globalThis as any).env = {
                        backends: {
                            onnx: {
                                wasm: {
                                    wasmPaths: '/models/',
                                }
                            }
                        },
                        allowRemoteModels: true,
                        allowLocalModels: true,
                        cacheDir: '/models/'
                    };
                }
            }

            // Configure pipeline options for progress tracking
            const pipelineOptions = {
                quantized: DEFAULT_MODEL_CONFIG.quantization !== 'fp16',
                cache_dir: DEFAULT_MODEL_CONFIG.cacheLocation,
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 60) + 10; // 10-70%
                        this.updateProgress(
                            LoadStage.DOWNLOADING,
                            percent,
                            `Downloading: ${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB`
                        );
                    } else if (progress.status === 'loading') {
                        const percent = 70 + Math.round(progress.progress * 20); // 70-90%
                        this.updateProgress(LoadStage.LOADING, percent, 'Loading model into memory...');
                    }
                }
            };

            this.updateProgress(LoadStage.DOWNLOADING, 5, 'Initializing pipeline...');

            // Create the pipeline with better error handling
            const modelPipeline = await pipeline(
                'text-generation',
                modelId,
                pipelineOptions
            ).catch((error) => {
                // Handle specific transformers.js errors
                if (error.message && error.message.includes('Cannot convert undefined or null to object')) {
                    throw new ModelLoadError(
                        'Transformers.js environment not properly initialized',
                        { originalError: error.message },
                        'Please refresh the page and try again'
                    );
                }
                throw error;
            });

            this.updateProgress(LoadStage.VALIDATING, 90, 'Validating model...');

            // Validate the model
            await this.validateModel(modelPipeline, modelId);

            this.updateProgress(LoadStage.CACHING, 95, 'Caching model...');

            // Cache the model metadata
            await this.cacheModelMetadata(modelId, modelPipeline);

            this.currentPipeline = modelPipeline;
            this.updateProgress(LoadStage.READY, 100, 'Model ready');
            this.isLoading = false;

            return modelPipeline;

        } catch (error) {
            this.isLoading = false;

            if (error.name === 'AbortError') {
                throw new ModelLoadError('Model loading was cancelled');
            }

            if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new NetworkError('Failed to download model', { originalError: error.message });
            }

            throw new ModelLoadError(
                `Failed to initialize model pipeline: ${error.message}`,
                { originalError: error.message }
            );
        }
    }

    /**
     * Load model from cache
     */
    private async loadFromCache(modelId: string): Promise<TextGenerationPipeline | null> {
        try {
            // For Transformers.js, we rely on its internal caching mechanism
            // We just need to create the pipeline again, it will use cached files
            const modelPipeline = await pipeline(
                'text-generation',
                modelId,
                {
                    quantized: DEFAULT_MODEL_CONFIG.quantization !== 'fp16',
                    cache_dir: DEFAULT_MODEL_CONFIG.cacheLocation
                }
            );

            return modelPipeline;
        } catch (error) {
            console.warn('Failed to load from cache:', error);
            return null;
        }
    }

    /**
     * Validate loaded model functionality
     */
    private async validateModel(modelPipeline: TextGenerationPipeline, modelId: string): Promise<void> {
        try {
            // Test the model with a simple prompt
            const testPrompt = "Hello";
            const testResult = await modelPipeline(testPrompt, {
                max_new_tokens: 5,
                temperature: 0.1,
                do_sample: false
            });

            if (!testResult || !Array.isArray(testResult) || testResult.length === 0) {
                throw new ValidationError('Model validation failed: No output generated');
            }

            // Check if output has expected structure
            const output = testResult[0];
            if (!output || typeof output.generated_text !== 'string') {
                throw new ValidationError('Model validation failed: Invalid output structure');
            }

            console.log('Model validation successful:', {
                modelId,
                testOutput: output.generated_text.slice(0, 50) + '...'
            });

        } catch (error) {
            throw new ValidationError(
                `Model validation failed for ${modelId}`,
                { originalError: error.message }
            );
        }
    }

    /**
     * Cache model metadata in IndexedDB
     */
    private async cacheModelMetadata(modelId: string, pipeline: TextGenerationPipeline): Promise<void> {
        try {
            const db = await this.openDatabase();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const cacheEntry: ModelCacheEntry = {
                modelId,
                version: '1.0.0', // Could be extracted from model config
                timestamp: Date.now(),
                size: await this.getModelSize(modelId),
                metadata: {
                    quantization: DEFAULT_MODEL_CONFIG.quantization,
                    devicePreference: DEFAULT_MODEL_CONFIG.devicePreference
                }
            };

            await new Promise<void>((resolve, reject) => {
                const request = store.put(cacheEntry, modelId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(new CacheError('Failed to cache model metadata'));
            });

        } catch (error) {
            // Non-critical error, log but don't throw
            console.warn('Failed to cache model metadata:', error);
        }
    }

    /**
     * Open IndexedDB database for caching
     */
    private async openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new CacheError('Failed to open cache database'));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName);
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('modelId', 'modelId', { unique: true });
                }
            };
        });
    }

    /**
     * Update loading progress
     */
    private updateProgress(stage: LoadStage, progress: number, message: string): void {
        this.loadProgress = {
            stage,
            progress: Math.min(100, Math.max(0, progress)),
            message,
            ...(stage === LoadStage.DOWNLOADING && {
                bytesLoaded: 0, // Would need to be calculated from actual progress
                totalBytes: 0   // Would need to be calculated from model size
            })
        };

        // Emit progress event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gemma-model-progress', {
                detail: this.loadProgress
            }));
        }
    }

    /**
     * Abort current loading operation
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isLoading = false;
        this.updateProgress(LoadStage.ERROR, 0, 'Loading cancelled');
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.abort();
        this.currentPipeline = null;
    }
}

/**
 * Factory function to create ModelLoader instance
 */
export function createModelLoader(): ModelLoader {
    return new ModelLoader();
}

/**
 * Singleton instance for global access
 */
let modelLoaderInstance: ModelLoader | null = null;

/**
 * Get singleton ModelLoader instance
 */
export function getModelLoader(): ModelLoader {
    if (!modelLoaderInstance) {
        modelLoaderInstance = createModelLoader();
    }
    return modelLoaderInstance;
}