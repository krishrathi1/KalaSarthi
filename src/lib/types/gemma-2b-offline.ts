/**
 * TypeScript interfaces and types for Gemma 2B Offline AI Service
 * Provides type definitions for all service components
 */

// ============================================================================
// Core Service Interfaces
// ============================================================================

/**
 * Main interface for the Gemma 2B Offline Service
 */
export interface IGemma2BOfflineService {
    initialize(): Promise<boolean>;
    generateResponse(message: string, context?: string): Promise<string>;
    isReady(): boolean;
    isModelLoading(): boolean;
    getLoadError(): string | null;
    getModelInfo(): ModelInfo;
    dispose(): Promise<void>;
}

/**
 * Interface for model loading and caching operations
 */
export interface IModelLoader {
    loadModel(modelId: string): Promise<any>; // TextGenerationPipeline type from transformers.js
    isModelCached(modelId: string): Promise<boolean>;
    getModelSize(modelId: string): Promise<number>;
    clearCache(): Promise<void>;
    getLoadProgress(): LoadProgress;
}

/**
 * Interface for AI inference operations
 */
export interface IInferenceEngine {
    generateText(prompt: string, options?: GenerationOptions): Promise<string>;
    setGenerationConfig(config: GenerationConfig): void;
    getTokenCount(text: string): number;
    streamGeneration(prompt: string): AsyncGenerator<string>;
}

/**
 * Interface for conversation context management
 */
export interface IContextManager {
    buildPrompt(userMessage: string, language: string): string;
    updateContext(message: string, response: string): void;
    clearContext(): void;
    getArtisanSystemPrompt(language: string): string;
    detectLanguage(text: string): string;
}

/**
 * Interface for system resource monitoring
 */
export interface IResourceMonitor {
    checkSystemRequirements(): SystemCheck;
    monitorMemoryUsage(): MemoryStats;
    optimizeForDevice(): OptimizationSettings;
    shouldPauseInference(): boolean;
    getPerformanceMetrics(): PerformanceMetrics;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Model configuration settings
 */
export interface ModelConfig {
    modelId: string;
    quantization: 'q4' | 'q8' | 'fp16';
    maxContextLength: number;
    cacheLocation: string;
    devicePreference: 'auto' | 'cpu' | 'gpu';
}

/**
 * Text generation configuration
 */
export interface GenerationConfig {
    maxNewTokens: number;
    temperature: number;
    topP: number;
    topK: number;
    repetitionPenalty: number;
    doSample: boolean;
    padTokenId?: number;
    eosTokenId?: number;
}

/**
 * Generation options for individual requests
 */
export interface GenerationOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    repetitionPenalty?: number;
    stopSequences?: string[];
}

/**
 * System requirements specification
 */
export interface SystemRequirements {
    minMemoryMB: number;
    recommendedMemoryMB: number;
    supportedBrowsers: string[];
    webglRequired: boolean;
    wasmRequired: boolean;
}

/**
 * Performance optimization settings
 */
export interface OptimizationSettings {
    maxConcurrentRequests: number;
    contextWindowSize: number;
    memoryThreshold: number;
    cpuThrottleThreshold: number;
    batteryOptimization: boolean;
}

// ============================================================================
// Status and Progress Types
// ============================================================================

/**
 * Model loading progress information
 */
export interface LoadProgress {
    stage: LoadStage;
    progress: number; // 0-100
    message: string;
    bytesLoaded?: number;
    totalBytes?: number;
}

/**
 * Model loading stages
 */
export enum LoadStage {
    INITIALIZING = 'initializing',
    DOWNLOADING = 'downloading',
    CACHING = 'caching',
    VALIDATING = 'validating',
    LOADING = 'loading',
    READY = 'ready',
    ERROR = 'error'
}

/**
 * Model information
 */
export interface ModelInfo {
    modelId: string;
    version: string;
    size: number;
    quantization: string;
    loadTime: number;
    isReady: boolean;
}

/**
 * System capability check results
 */
export interface SystemCheck {
    isSupported: boolean;
    hasWebGL: boolean;
    hasWebAssembly: boolean;
    availableMemory: number;
    browserSupported: boolean;
    warnings: string[];
    recommendations: string[];
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
    used: number;
    total: number;
    available: number;
    percentage: number;
    jsHeapSizeLimit?: number;
    usedJSHeapSize?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    modelLoadTime: number;
    averageInferenceTime: number;
    tokensPerSecond: number;
    memoryUsage: number;
    errorRate: number;
    fallbackRate: number;
    totalRequests: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error categories for the Gemma 2B service
 */
export enum Gemma2BErrorType {
    MODEL_LOAD_ERROR = 'MODEL_LOAD_ERROR',
    INFERENCE_ERROR = 'INFERENCE_ERROR',
    RESOURCE_ERROR = 'RESOURCE_ERROR',
    BROWSER_COMPATIBILITY_ERROR = 'BROWSER_COMPATIBILITY_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Structured error information
 */
export interface Gemma2BError {
    type: Gemma2BErrorType;
    severity: ErrorSeverity;
    message: string;
    details?: any;
    timestamp: number;
    recoverable: boolean;
    suggestedAction?: string;
}

// ============================================================================
// Language and Context Types
// ============================================================================

/**
 * Supported languages
 */
export enum SupportedLanguage {
    ENGLISH = 'en',
    HINDI = 'hi'
}

/**
 * Conversation context
 */
export interface ConversationContext {
    messages: ContextMessage[];
    language: SupportedLanguage;
    artisanDomain?: string;
    maxContextLength: number;
}

/**
 * Context message structure
 */
export interface ContextMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

/**
 * Artisan domain categories
 */
export enum ArtisanDomain {
    POTTERY = 'pottery',
    TEXTILES = 'textiles',
    WOODWORK = 'woodwork',
    METALWORK = 'metalwork',
    JEWELRY = 'jewelry',
    PAINTING = 'painting',
    SCULPTURE = 'sculpture',
    GENERAL = 'general'
}

// ============================================================================
// Browser Support Types
// ============================================================================

/**
 * Browser support matrix
 */
export interface BrowserSupport {
    chrome: BrowserVersion;
    firefox: BrowserVersion;
    safari: BrowserVersion;
    edge: BrowserVersion;
}

/**
 * Browser version requirements
 */
export interface BrowserVersion {
    min: string;
    webgl: boolean;
    wasm: boolean;
    recommended?: string;
}

// ============================================================================
// Service State Types
// ============================================================================

/**
 * Service initialization state
 */
export enum ServiceState {
    UNINITIALIZED = 'uninitialized',
    INITIALIZING = 'initializing',
    READY = 'ready',
    ERROR = 'error',
    DISPOSED = 'disposed'
}

/**
 * Service status information
 */
export interface ServiceStatus {
    state: ServiceState;
    modelInfo?: ModelInfo;
    error?: Gemma2BError;
    performance?: PerformanceMetrics;
    lastActivity: number;
}