/**
 * Gemma 2B Offline AI Service - Production Implementation
 * 
 * This service provides true offline AI capabilities using Google's Gemma 2B model
 * through Transformers.js. It integrates all components for a complete AI experience.
 */

import {
    IGemma2BOfflineService,
    ModelInfo,
    ServiceState,
    ServiceStatus,
    Gemma2BError,
    Gemma2BErrorType,
    ErrorSeverity,
    SupportedLanguage
} from '../types/gemma-2b-offline';

import {
    ModelLoader,
    InferenceEngine,
    ContextManager,
    ResourceMonitor,
    Gemma2BErrorHandler,
    ModelLoadError,
    InferenceError,
    ResourceError,
    DEFAULT_MODEL_CONFIG,
    DEFAULT_GENERATION_CONFIG,
    SYSTEM_REQUIREMENTS,
    ERROR_MESSAGES,
    DEBUG_CONFIG
} from './gemma-2b-offline';

import { FallbackService } from './gemma-2b-offline/FallbackService';

export class GemmaOfflineService implements IGemma2BOfflineService {
    private static instance: GemmaOfflineService;

    // Service state
    private serviceState: ServiceState = ServiceState.UNINITIALIZED;
    private loadError: string | null = null;
    private modelInfo: ModelInfo | null = null;
    private lastActivity: number = Date.now();

    // Component instances
    private modelLoader: ModelLoader;
    private inferenceEngine: InferenceEngine;
    private contextManager: ContextManager;
    private resourceMonitor: ResourceMonitor;
    private errorHandler: Gemma2BErrorHandler;
    private fallbackService: FallbackService;

    // Initialization tracking
    private initializationPromise: Promise<boolean> | null = null;
    private isInitializing: boolean = false;

    private constructor() {
        // Initialize all components
        this.modelLoader = new ModelLoader();
        this.inferenceEngine = new InferenceEngine();
        this.contextManager = new ContextManager();
        this.resourceMonitor = new ResourceMonitor();
        this.errorHandler = new Gemma2BErrorHandler();
        this.fallbackService = new FallbackService();

        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
            console.log('🤖 Gemma2BOfflineService initialized with components');
        }
    }

    public static getInstance(): GemmaOfflineService {
        if (!GemmaOfflineService.instance) {
            GemmaOfflineService.instance = new GemmaOfflineService();
        }
        return GemmaOfflineService.instance;
    }

    /**
     * Initialize the Gemma 2B offline AI service
     */
    public async initialize(): Promise<boolean> {
        // Return existing initialization if already ready
        if (this.serviceState === ServiceState.READY) {
            return true;
        }

        // Return existing initialization promise if already initializing
        if (this.isInitializing && this.initializationPromise) {
            return this.initializationPromise;
        }

        // Check if transformers.js environment is available
        try {
            // Test if transformers.js can be imported
            const { pipeline } = await import('@xenova/transformers');
            if (!pipeline) {
                throw new Error('Transformers.js not available');
            }
        } catch (error) {
            console.warn('Transformers.js not available, enabling fallback mode:', error);
            await this.errorHandler.enableFallbackMode('Transformers.js initialization failed');
            this.serviceState = ServiceState.READY;
            return true;
        }

        // Start new initialization
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform the actual initialization process with comprehensive error handling
     */
    private async performInitialization(): Promise<boolean> {
        this.isInitializing = true;
        this.serviceState = ServiceState.INITIALIZING;
        this.loadError = null;

        const startTime = performance.now();

        try {
            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('🤖 Initializing Gemma 2B Offline Service...');
            }

            // Use retry mechanism for initialization steps
            await this.errorHandler.retryOperation(
                async () => {
                    // Step 1: Check system requirements
                    await this.checkSystemCompatibility();

                    // Step 2: Load the model with retry
                    await this.loadModelWithRetry();

                    // Step 3: Initialize inference engine
                    await this.initializeInferenceEngine();

                    // Step 4: Validate the complete system
                    await this.validateSystem();
                },
                'initialization',
                2, // max retries for initialization
                2000 // 2 second base delay
            );

            // Record successful initialization
            const loadTime = performance.now() - startTime;
            this.resourceMonitor.recordModelLoadTime(loadTime);

            this.modelInfo = {
                modelId: DEFAULT_MODEL_CONFIG.modelId,
                version: '1.0.0',
                size: await this.modelLoader.getModelSize(DEFAULT_MODEL_CONFIG.modelId),
                quantization: DEFAULT_MODEL_CONFIG.quantization,
                loadTime,
                isReady: true
            };

            this.serviceState = ServiceState.READY;
            this.lastActivity = Date.now();

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ Gemma 2B Offline Service ready!', {
                    loadTime: `${Math.round(loadTime)}ms`,
                    modelInfo: this.modelInfo
                });
            }

            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            this.loadError = errorMessage;
            this.serviceState = ServiceState.ERROR;

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.error('❌ Gemma 2B initialization failed:', errorMessage);
            }

            // Enhanced error handling with fallback decision
            const shouldFallback = await this.handleInitializationError(error as Error);

            if (shouldFallback) {
                await this.errorHandler.enableFallbackMode(`Initialization failed: ${errorMessage}`);
                console.warn('🔄 Fallback mode enabled due to initialization failure');

                // Return true to indicate service is "ready" in fallback mode
                this.serviceState = ServiceState.READY;
                return true;
            }

            return false;

        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Handle initialization errors and determine fallback strategy
     */
    private async handleInitializationError(error: Error): Promise<boolean> {
        try {
            // Let error handler process the error
            const shouldFallback = await this.errorHandler.handleModelLoadError(error);

            // Generate user-friendly error information
            const errorResponse = this.errorHandler.generateUserFriendlyErrorResponse({
                type: Gemma2BErrorType.MODEL_LOAD_ERROR,
                severity: ErrorSeverity.HIGH,
                message: error.message,
                timestamp: Date.now(),
                recoverable: true
            });

            // Log user-friendly error information
            console.warn('Initialization Error Details:', {
                message: errorResponse.message,
                troubleshooting: errorResponse.troubleshooting,
                canRetry: errorResponse.canRetry,
                fallbackAvailable: errorResponse.fallbackAvailable
            });

            // Decide on fallback based on error type
            return this.errorHandler.shouldFallbackToDemo(error) || shouldFallback;

        } catch (handlingError) {
            console.error('Error handling initialization error:', handlingError);
            return true; // Default to fallback on error handling failure
        }
    }

    /**
     * Load model with enhanced retry and error handling
     */
    private async loadModelWithRetry(): Promise<void> {
        try {
            // Check available resources before loading
            await this.errorHandler.handleResourceConstraints();

            // Load the model
            await this.loadModel();

        } catch (error) {
            // If resource error, suggest fallback
            if (error instanceof ResourceError) {
                throw new ModelLoadError(
                    'Insufficient resources to load AI model',
                    {
                        originalError: error.message,
                        suggestions: [
                            'Close other browser tabs',
                            'Close other applications',
                            'Use a device with more memory',
                            'Try again later'
                        ]
                    },
                    'Free up system resources and try again'
                );
            }

            // Re-throw other errors
            throw error;
        }
    }

    /**
     * Generate AI response using Gemma 2B model with comprehensive error handling and performance optimizations
     */
    public async generateResponse(
        userMessage: string,
        systemPrompt?: string
    ): Promise<string> {
        // Input validation
        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
            throw new InferenceError('Invalid user message: must be a non-empty string');
        }

        this.lastActivity = Date.now();

        // Check if we're in fallback mode or service not ready
        if (this.errorHandler.isInFallbackMode() || this.serviceState !== ServiceState.READY) {
            return this.handleFallbackResponse(userMessage);
        }

        // Attempt to exit fallback mode if we were in it
        if (this.errorHandler.isInFallbackMode()) {
            const exitedFallback = await this.errorHandler.attemptExitFallbackMode();
            if (!exitedFallback) {
                return this.handleFallbackResponse(userMessage);
            }
        }

        const startTime = performance.now();

        try {
            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('🤖 Generating Gemma 2B response for:', userMessage.slice(0, 50) + '...');
            }

            // Enhanced resource constraint handling
            await this.errorHandler.handleResourceConstraints();

            // Check if we should pause inference due to resource constraints
            if (this.resourceMonitor.shouldPauseInference()) {
                await this.errorHandler.enableFallbackMode('Resource constraints detected');
                return this.handleFallbackResponse(userMessage);
            }

            // Use retry mechanism for inference
            const response = await this.errorHandler.retryOperation(
                async () => {
                    // Build the complete prompt with context
                    const language = this.contextManager.detectLanguage(userMessage);
                    const fullPrompt = this.contextManager.buildPrompt(userMessage, language);

                    if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                        console.log('📝 Built prompt with context:', {
                            language,
                            promptLength: fullPrompt.length,
                            contextStats: this.contextManager.getContextStats()
                        });
                    }

                    // Generate response using inference engine
                    return await this.inferenceEngine.generateText(fullPrompt);
                },
                `inference-${Date.now()}`,
                3, // max retries
                1000 // base delay
            );

            // Update conversation context
            this.contextManager.updateContext(userMessage, response);

            // Record performance metrics
            const inferenceTime = performance.now() - startTime;
            const tokenCount = this.inferenceEngine.getTokenCount(response);
            this.resourceMonitor.recordInferenceTime(inferenceTime, tokenCount);

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ Gemma 2B response generated:', {
                    responseLength: response.length,
                    inferenceTime: `${Math.round(inferenceTime)}ms`,
                    tokensPerSecond: Math.round(tokenCount / (inferenceTime / 1000))
                });
            }

            return response;

        } catch (error) {
            const inferenceTime = performance.now() - startTime;
            this.resourceMonitor.recordError();

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.error('❌ Gemma 2B generation error:', error);
            }

            // Enhanced error handling with fallback
            return this.handleInferenceError(error as Error, userMessage, inferenceTime);
        }
    }

    /**
     * Handle inference errors with intelligent fallback
     */
    private async handleInferenceError(
        error: Error,
        userMessage: string,
        inferenceTime: number
    ): Promise<string> {
        try {
            // Let error handler process the error
            await this.errorHandler.handleInferenceError(error);

            // If we get here, error was handled but we still need a response
            throw error;

        } catch (handledError) {
            // Check if we should fall back to demo mode
            if (this.errorHandler.shouldFallbackToDemo(error)) {
                await this.errorHandler.enableFallbackMode(`Critical error: ${error.message}`);
                return this.handleFallbackResponse(userMessage);
            }

            // Generate user-friendly error response
            const errorResponse = this.errorHandler.generateUserFriendlyErrorResponse({
                type: Gemma2BErrorType.INFERENCE_ERROR,
                severity: ErrorSeverity.MEDIUM,
                message: error.message,
                timestamp: Date.now(),
                recoverable: true
            });

            // If fallback is available, use it
            if (errorResponse.fallbackAvailable) {
                await this.errorHandler.enableFallbackMode(`Inference error: ${error.message}`);
                return this.handleFallbackResponse(userMessage);
            }

            // Otherwise, throw user-friendly error
            throw new InferenceError(
                errorResponse.message,
                {
                    originalError: error.message,
                    inferenceTime,
                    troubleshooting: errorResponse.troubleshooting,
                    canRetry: errorResponse.canRetry
                }
            );
        }
    }

    /**
     * Handle fallback response generation
     */
    private async handleFallbackResponse(userMessage: string): Promise<string> {
        try {
            const language = this.contextManager.detectLanguage(userMessage);
            return await this.fallbackService.generateFallbackResponse(
                userMessage,
                language,
                'default' // session ID
            );
        } catch (fallbackError) {
            console.error('Fallback service failed:', fallbackError);

            // Ultimate fallback - static response
            const language = this.contextManager.detectLanguage(userMessage);
            return language === SupportedLanguage.HINDI
                ? 'क्षमा करें, मैं अभी आपकी मदद नहीं कर सकता। कृपया बाद में पुनः प्रयास करें।'
                : 'Sorry, I cannot help you right now. Please try again later.';
        }
    }

    /**
     * Check if the service is ready for use
     */
    public isReady(): boolean {
        return this.serviceState === ServiceState.READY;
    }

    /**
     * Check if model is currently loading
     */
    public isModelLoading(): boolean {
        return this.serviceState === ServiceState.INITIALIZING || this.isInitializing;
    }

    /**
     * Get load error if any
     */
    public getLoadError(): string | null {
        return this.loadError;
    }

    /**
     * Get model information
     */
    public getModelInfo(): ModelInfo {
        if (!this.modelInfo) {
            return {
                modelId: DEFAULT_MODEL_CONFIG.modelId,
                version: 'unknown',
                size: 0,
                quantization: DEFAULT_MODEL_CONFIG.quantization,
                loadTime: 0,
                isReady: false
            };
        }
        return { ...this.modelInfo };
    }

    /**
     * Get current service status
     */
    public getServiceStatus(): ServiceStatus {
        return {
            state: this.serviceState,
            modelInfo: this.modelInfo || undefined,
            error: this.loadError ? {
                type: Gemma2BErrorType.MODEL_LOAD_ERROR,
                severity: ErrorSeverity.HIGH,
                message: this.loadError,
                timestamp: Date.now(),
                recoverable: true
            } : undefined,
            performance: this.resourceMonitor.getPerformanceMetrics(),
            lastActivity: this.lastActivity
        };
    }

    /**
     * Get artisan-specific system prompt
     */
    public getArtisanSystemPrompt(language: string = 'en'): string {
        return this.contextManager.getArtisanSystemPrompt(language);
    }

    /**
     * Clear conversation context
     */
    public clearContext(): void {
        this.contextManager.clearContext();
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics() {
        return this.resourceMonitor.getPerformanceMetrics();
    }

    /**
     * Get error statistics and troubleshooting information
     */
    public getErrorInfo(): {
        isInFallbackMode: boolean;
        errorStats: { [key in Gemma2BErrorType]?: number };
        lastError: Gemma2BError | null;
        troubleshooting: string[];
        recoveryStrategies: {
            immediate: string[];
            shortTerm: string[];
            longTerm: string[];
        };
    } {
        const errorStats = this.errorHandler.getErrorStats();
        const lastError = this.loadError ? {
            type: Gemma2BErrorType.MODEL_LOAD_ERROR,
            severity: ErrorSeverity.HIGH,
            message: this.loadError,
            timestamp: Date.now(),
            recoverable: true
        } as Gemma2BError : null;

        const troubleshooting = lastError
            ? this.errorHandler.getTroubleshootingSteps(lastError)
            : [];

        const recoveryStrategies = lastError
            ? this.errorHandler.getRecoveryStrategy(lastError)
            : {
                immediate: [],
                shortTerm: [],
                longTerm: []
            };

        return {
            isInFallbackMode: this.errorHandler.isInFallbackMode(),
            errorStats,
            lastError,
            troubleshooting,
            recoveryStrategies
        };
    }

    /**
     * Attempt to recover from errors and exit fallback mode
     */
    public async attemptRecovery(): Promise<boolean> {
        try {
            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('🔄 Attempting service recovery...');
            }

            // Clear previous errors
            this.loadError = null;
            this.errorHandler.clearErrorLog();

            // If in fallback mode, try to exit
            if (this.errorHandler.isInFallbackMode()) {
                const exitedFallback = await this.errorHandler.attemptExitFallbackMode();
                if (!exitedFallback) {
                    return false;
                }
            }

            // If service is not ready, try to reinitialize
            if (this.serviceState !== ServiceState.READY) {
                return await this.initialize();
            }

            return true;

        } catch (error) {
            console.error('Recovery attempt failed:', error);
            return false;
        }
    }

    /**
     * Get fallback service status
     */
    public getFallbackStatus() {
        return this.fallbackService.getStatus();
    }

    /**
     * Force enable fallback mode (for testing or manual override)
     */
    public async enableFallbackMode(reason: string = 'Manual override'): Promise<void> {
        await this.errorHandler.enableFallbackMode(reason);
    }

    // Performance optimization methods removed for stability

    /**
     * Dispose of all resources and cleanup
     */
    public async dispose(): Promise<void> {
        try {
            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('🧹 Disposing Gemma 2B Offline Service...');
            }

            // Stop any ongoing operations
            this.inferenceEngine.abort();

            // Dispose of all components
            this.modelLoader.dispose();
            await this.inferenceEngine.dispose();
            this.resourceMonitor.dispose();

            // Clear context
            this.contextManager.clearContext();

            // Reset state
            this.serviceState = ServiceState.DISPOSED;
            this.modelInfo = null;
            this.loadError = null;
            this.initializationPromise = null;
            this.isInitializing = false;

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ Gemma 2B Offline Service disposed');
            }

        } catch (error) {
            console.error('❌ Error during service disposal:', error);
        }
    }

    // ============================================================================
    // Private Helper Methods for Initialization
    // ============================================================================

    /**
     * Check system compatibility before loading model
     */
    private async checkSystemCompatibility(): Promise<void> {
        const systemCheck = this.resourceMonitor.checkSystemRequirements();

        if (!systemCheck.isSupported) {
            const errorMessage = `System not supported: ${systemCheck.warnings.join(', ')}`;
            throw new ResourceError(errorMessage, {
                systemCheck,
                recommendations: systemCheck.recommendations
            });
        }

        if (systemCheck.warnings.length > 0) {
            console.warn('⚠️ System compatibility warnings:', systemCheck.warnings);
        }

        if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
            console.log('✅ System compatibility check passed:', {
                webGL: systemCheck.hasWebGL,
                webAssembly: systemCheck.hasWebAssembly,
                memory: `${systemCheck.availableMemory}MB`,
                browser: systemCheck.browserSupported
            });
        }
    }

    /**
     * Load the Gemma 2B model
     */
    private async loadModel(): Promise<void> {
        try {
            const pipeline = await this.modelLoader.loadModel(DEFAULT_MODEL_CONFIG.modelId);

            if (!pipeline) {
                throw new ModelLoadError('Model pipeline is null after loading');
            }

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ Gemma 2B model loaded successfully');
            }

        } catch (error) {
            if (error instanceof ModelLoadError) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown model loading error';
            throw new ModelLoadError(
                `Failed to load Gemma 2B model: ${errorMessage}`,
                { originalError: errorMessage }
            );
        }
    }

    /**
     * Initialize the inference engine with the loaded model
     */
    private async initializeInferenceEngine(): Promise<void> {
        try {
            // Get the loaded pipeline from model loader
            const pipeline = await this.modelLoader.loadModel(DEFAULT_MODEL_CONFIG.modelId);

            // Set the pipeline in the inference engine
            this.inferenceEngine.setPipeline(pipeline);

            // Set up generation configuration
            this.inferenceEngine.setGenerationConfig(DEFAULT_GENERATION_CONFIG);

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ Inference engine initialized with config:', DEFAULT_GENERATION_CONFIG);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown inference engine error';
            throw new InferenceError(
                `Failed to initialize inference engine: ${errorMessage}`,
                { originalError: errorMessage }
            );
        }
    }

    /**
     * Validate the complete system with a test generation
     */
    private async validateSystem(): Promise<void> {
        try {
            // Test the system with a simple prompt
            const testPrompt = "Hello";
            const testLanguage = SupportedLanguage.ENGLISH;

            // Build test prompt through context manager
            const fullPrompt = this.contextManager.buildPrompt(testPrompt, testLanguage);

            // Test inference engine
            const testResponse = await this.inferenceEngine.generateText(fullPrompt, {
                maxTokens: 10,
                temperature: 0.1
            });

            if (!testResponse || testResponse.trim().length === 0) {
                throw new Error('System validation failed: empty response');
            }

            if (DEBUG_CONFIG.ENABLE_CONSOLE_LOGS) {
                console.log('✅ System validation passed:', {
                    testPrompt,
                    testResponse: testResponse.slice(0, 50) + '...'
                });
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            throw new InferenceError(
                `System validation failed: ${errorMessage}`,
                { originalError: errorMessage }
            );
        }
    }
}
