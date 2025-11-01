/**
 * InferenceEngine Component for Gemma 2B Offline Service
 * 
 * Handles text generation using the loaded Gemma 2B model with configuration management,
 * token counting, context management, and streaming response generation
 */

import { TextGenerationPipeline } from '@xenova/transformers';
import {
    IInferenceEngine,
    GenerationConfig,
    GenerationOptions,
    Gemma2BErrorType,
    PerformanceMetrics
} from '../../types/gemma-2b-offline';
import {
    InferenceError,
    ResourceError,
    Gemma2BErrorHandler
} from './errors';
import {
    DEFAULT_GENERATION_CONFIG,
    GENERATION_PRESETS,
    PERFORMANCE_LIMITS,
    CONTEXT_SETTINGS,
    RETRY_CONFIG
} from './constants';

/**
 * Token counting interface for text analysis
 */
interface TokenInfo {
    count: number;
    text: string;
    truncated: boolean;
}

/**
 * Generation statistics for performance monitoring
 */
interface GenerationStats {
    startTime: number;
    endTime: number;
    inputTokens: number;
    outputTokens: number;
    tokensPerSecond: number;
    memoryUsed: number;
}

/**
 * InferenceEngine implementation for Gemma 2B text generation
 */
export class InferenceEngine implements IInferenceEngine {
    private generationConfig: GenerationConfig;
    private errorHandler: Gemma2BErrorHandler;
    private pipeline: TextGenerationPipeline | null = null;
    private isGenerating: boolean = false;
    private abortController: AbortController | null = null;

    // Performance tracking
    private generationStats: GenerationStats[] = [];
    private readonly maxStatsHistory = 100;

    // Token estimation (approximate for Gemma 2B)
    private readonly avgTokensPerChar = 0.25; // Rough estimate for English text
    private readonly avgCharsPerToken = 4;

    constructor(generationConfig?: Partial<GenerationConfig>) {
        this.generationConfig = {
            ...DEFAULT_GENERATION_CONFIG,
            ...generationConfig
        };
        this.errorHandler = new Gemma2BErrorHandler();
    }

    /**
     * Set the pipeline instance for inference
     */
    setPipeline(pipeline: TextGenerationPipeline): void {
        this.pipeline = pipeline;
    }

    /**
     * Generate text using the Gemma 2B model
     */
    async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
        if (!this.pipeline) {
            throw new InferenceError('Model pipeline not initialized');
        }

        if (this.isGenerating) {
            throw new InferenceError('Generation already in progress');
        }

        // Validate input
        this.validateInput(prompt);

        // Merge options with current config
        const config = this.mergeGenerationOptions(options);

        this.isGenerating = true;
        this.abortController = new AbortController();

        const startTime = performance.now();
        let stats: GenerationStats | null = null;

        try {
            // Check system resources before generation
            await this.checkResourcesBeforeGeneration();

            // Prepare prompt with context management
            const processedPrompt = this.preparePrompt(prompt);
            const inputTokens = this.getTokenCount(processedPrompt);

            // Validate context length
            if (inputTokens > this.generationConfig.maxNewTokens + CONTEXT_SETTINGS.MAX_CONTEXT_TOKENS) {
                throw new InferenceError(
                    `Input too long: ${inputTokens} tokens exceeds maximum context length`,
                    { inputTokens, maxTokens: CONTEXT_SETTINGS.MAX_CONTEXT_TOKENS }
                );
            }

            // Generate text with retry logic
            const result = await this.generateWithRetry(processedPrompt, config);

            // Extract generated text
            const generatedText = this.extractGeneratedText(result, prompt);
            const outputTokens = this.getTokenCount(generatedText);

            // Record performance stats
            const endTime = performance.now();
            stats = {
                startTime,
                endTime,
                inputTokens,
                outputTokens,
                tokensPerSecond: outputTokens / ((endTime - startTime) / 1000),
                memoryUsed: this.getMemoryUsage()
            };

            this.recordGenerationStats(stats);

            return generatedText;

        } catch (error) {
            const endTime = performance.now();

            // Record failed generation stats
            if (stats) {
                stats.endTime = endTime;
                this.recordGenerationStats(stats);
            }

            // Handle inference errors
            await this.errorHandler.handleInferenceError(error as Error);
            throw error;

        } finally {
            this.isGenerating = false;
            this.abortController = null;
        }
    }

    /**
     * Set generation configuration
     */
    setGenerationConfig(config: GenerationConfig): void {
        // Validate configuration
        this.validateGenerationConfig(config);

        this.generationConfig = { ...config };
        console.log('Generation config updated:', this.generationConfig);
    }

    /**
     * Get current generation configuration
     */
    getGenerationConfig(): GenerationConfig {
        return { ...this.generationConfig };
    }

    /**
     * Apply generation preset
     */
    applyGenerationPreset(preset: keyof typeof GENERATION_PRESETS): void {
        const presetConfig = GENERATION_PRESETS[preset];
        if (!presetConfig) {
            throw new InferenceError(`Unknown generation preset: ${preset}`);
        }

        this.setGenerationConfig(presetConfig);
    }

    /**
     * Count tokens in text (approximate)
     */
    getTokenCount(text: string): number {
        if (!text || typeof text !== 'string') {
            return 0;
        }

        // Simple approximation based on character count and word boundaries
        // This is a rough estimate - actual tokenization would require the model's tokenizer
        const words = text.trim().split(/\s+/).length;
        const chars = text.length;

        // Estimate based on average tokens per character for transformer models
        const charBasedEstimate = Math.ceil(chars * this.avgTokensPerChar);
        const wordBasedEstimate = Math.ceil(words * 1.3); // Average 1.3 tokens per word

        // Use the higher estimate to be conservative
        return Math.max(charBasedEstimate, wordBasedEstimate);
    }

    /**
     * Get detailed token information
     */
    getTokenInfo(text: string): TokenInfo {
        const count = this.getTokenCount(text);
        const maxTokens = CONTEXT_SETTINGS.MAX_CONTEXT_TOKENS;

        return {
            count,
            text,
            truncated: count > maxTokens
        };
    }

    /**
     * Stream generation (async generator)
     */
    async* streamGeneration(prompt: string, options?: GenerationOptions): AsyncGenerator<string> {
        if (!this.pipeline) {
            throw new InferenceError('Model pipeline not initialized');
        }

        // For now, we'll simulate streaming by chunking the full response
        // True streaming would require streaming support from Transformers.js
        const fullResponse = await this.generateText(prompt, options);

        // Split response into chunks for streaming effect
        const chunkSize = 10; // Characters per chunk
        const words = fullResponse.split(' ');
        let currentChunk = '';

        for (const word of words) {
            currentChunk += (currentChunk ? ' ' : '') + word;

            if (currentChunk.length >= chunkSize) {
                yield currentChunk;
                currentChunk = '';

                // Add small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // Yield remaining chunk
        if (currentChunk) {
            yield currentChunk;
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        if (this.generationStats.length === 0) {
            return {
                modelLoadTime: 0,
                averageInferenceTime: 0,
                tokensPerSecond: 0,
                memoryUsage: this.getMemoryUsage(),
                errorRate: 0,
                fallbackRate: 0,
                totalRequests: 0
            };
        }

        const totalRequests = this.generationStats.length;
        const totalInferenceTime = this.generationStats.reduce(
            (sum, stat) => sum + (stat.endTime - stat.startTime), 0
        );
        const totalTokens = this.generationStats.reduce(
            (sum, stat) => sum + stat.outputTokens, 0
        );
        const totalTime = totalInferenceTime / 1000; // Convert to seconds

        return {
            modelLoadTime: 0, // This would be tracked by ModelLoader
            averageInferenceTime: totalInferenceTime / totalRequests,
            tokensPerSecond: totalTime > 0 ? totalTokens / totalTime : 0,
            memoryUsage: this.getMemoryUsage(),
            errorRate: 0, // Would need error tracking
            fallbackRate: 0, // Would need fallback tracking
            totalRequests
        };
    }

    /**
     * Check if generation is currently in progress
     */
    isGenerationInProgress(): boolean {
        return this.isGenerating;
    }

    /**
     * Abort current generation
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isGenerating = false;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.abort();
        this.pipeline = null;
        this.generationStats = [];
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Validate input prompt
     */
    private validateInput(prompt: string): void {
        if (!prompt || typeof prompt !== 'string') {
            throw new InferenceError('Invalid prompt: must be a non-empty string');
        }

        if (prompt.trim().length === 0) {
            throw new InferenceError('Invalid prompt: cannot be empty or whitespace only');
        }

        if (prompt.length > PERFORMANCE_LIMITS.MAX_CONTEXT_LENGTH * this.avgCharsPerToken) {
            throw new InferenceError(
                `Prompt too long: ${prompt.length} characters exceeds maximum`,
                { promptLength: prompt.length, maxLength: PERFORMANCE_LIMITS.MAX_CONTEXT_LENGTH * this.avgCharsPerToken }
            );
        }
    }

    /**
     * Validate generation configuration
     */
    private validateGenerationConfig(config: GenerationConfig): void {
        if (config.maxNewTokens <= 0 || config.maxNewTokens > PERFORMANCE_LIMITS.MAX_OUTPUT_LENGTH) {
            throw new InferenceError(
                `Invalid maxNewTokens: must be between 1 and ${PERFORMANCE_LIMITS.MAX_OUTPUT_LENGTH}`
            );
        }

        if (config.temperature < 0 || config.temperature > 2) {
            throw new InferenceError('Invalid temperature: must be between 0 and 2');
        }

        if (config.topP < 0 || config.topP > 1) {
            throw new InferenceError('Invalid topP: must be between 0 and 1');
        }

        if (config.topK < 1 || config.topK > 100) {
            throw new InferenceError('Invalid topK: must be between 1 and 100');
        }

        if (config.repetitionPenalty < 0.1 || config.repetitionPenalty > 2) {
            throw new InferenceError('Invalid repetitionPenalty: must be between 0.1 and 2');
        }
    }

    /**
     * Merge generation options with current config
     */
    private mergeGenerationOptions(options?: GenerationOptions): GenerationConfig {
        if (!options) {
            return this.generationConfig;
        }

        return {
            ...this.generationConfig,
            ...(options.maxTokens && { maxNewTokens: options.maxTokens }),
            ...(options.temperature !== undefined && { temperature: options.temperature }),
            ...(options.topP !== undefined && { topP: options.topP }),
            ...(options.topK !== undefined && { topK: options.topK }),
            ...(options.repetitionPenalty !== undefined && { repetitionPenalty: options.repetitionPenalty })
        };
    }

    /**
     * Prepare prompt with context management
     */
    private preparePrompt(prompt: string): string {
        // For now, return the prompt as-is
        // In a full implementation, this would add system prompts,
        // conversation context, and format according to model requirements
        return prompt.trim();
    }

    /**
     * Check system resources before generation
     */
    private async checkResourcesBeforeGeneration(): Promise<void> {
        const memoryUsage = this.getMemoryUsage();

        if (memoryUsage > PERFORMANCE_LIMITS.MEMORY_CRITICAL_THRESHOLD) {
            throw new ResourceError(
                'Insufficient memory for text generation',
                { memoryUsage, threshold: PERFORMANCE_LIMITS.MEMORY_CRITICAL_THRESHOLD }
            );
        }

        if (memoryUsage > PERFORMANCE_LIMITS.MEMORY_WARNING_THRESHOLD) {
            console.warn('High memory usage detected:', memoryUsage);
        }
    }

    /**
     * Generate text with retry logic
     */
    private async generateWithRetry(prompt: string, config: GenerationConfig): Promise<any> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
            try {
                // Create generation options for Transformers.js
                const pipelineOptions = {
                    max_new_tokens: config.maxNewTokens,
                    temperature: config.temperature,
                    top_p: config.topP,
                    top_k: config.topK,
                    repetition_penalty: config.repetitionPenalty,
                    do_sample: config.doSample,
                    pad_token_id: config.padTokenId,
                    eos_token_id: config.eosTokenId,
                    // Note: stop_sequences not supported in current transformers.js version
                };

                // Set timeout for generation
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Generation timeout')), PERFORMANCE_LIMITS.MAX_INFERENCE_TIME_MS);
                });

                // Generate with timeout
                const generationPromise = this.pipeline!(prompt, pipelineOptions);

                const result = await Promise.race([generationPromise, timeoutPromise]);
                return result;

            } catch (error) {
                lastError = error as Error;

                // Don't retry on certain errors
                if (this.isNonRetryableError(error as Error)) {
                    throw error;
                }

                // Wait before retry with exponential backoff
                if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
                    const delay = Math.min(
                        RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
                        RETRY_CONFIG.MAX_DELAY_MS
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        throw new InferenceError(
            `Text generation failed after ${RETRY_CONFIG.MAX_RETRIES} attempts`,
            { lastError: lastError?.message }
        );
    }

    /**
     * Extract generated text from pipeline result
     */
    private extractGeneratedText(result: any, originalPrompt: string): string {
        if (!result) {
            throw new InferenceError('No result from text generation');
        }

        // Handle different result formats from Transformers.js
        let generatedText: string;

        if (Array.isArray(result) && result.length > 0) {
            const firstResult = result[0];
            if (typeof firstResult === 'string') {
                generatedText = firstResult;
            } else if (firstResult.generated_text) {
                generatedText = firstResult.generated_text;
            } else {
                throw new InferenceError('Unexpected result format from text generation');
            }
        } else if (typeof result === 'string') {
            generatedText = result;
        } else if (result.generated_text) {
            generatedText = result.generated_text;
        } else {
            throw new InferenceError('Unexpected result format from text generation');
        }

        // Remove the original prompt from the generated text if it's included
        if (generatedText.startsWith(originalPrompt)) {
            generatedText = generatedText.slice(originalPrompt.length).trim();
        }

        // Validate generated text
        if (!generatedText || generatedText.trim().length === 0) {
            throw new InferenceError('Generated text is empty');
        }

        return generatedText.trim();
    }

    /**
     * Check if error should not be retried
     */
    private isNonRetryableError(error: Error): boolean {
        const nonRetryablePatterns = [
            'aborted',
            'cancelled',
            'invalid input',
            'model corrupted',
            'webgl context lost',
            'out of memory'
        ];

        return nonRetryablePatterns.some(pattern =>
            error.message.toLowerCase().includes(pattern)
        );
    }

    /**
     * Get current memory usage
     */
    private getMemoryUsage(): number {
        if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
            const memory = (window.performance as any).memory;
            return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }
        return 0; // Unknown memory usage
    }

    /**
     * Record generation statistics
     */
    private recordGenerationStats(stats: GenerationStats): void {
        this.generationStats.push(stats);

        // Maintain history limit
        if (this.generationStats.length > this.maxStatsHistory) {
            this.generationStats = this.generationStats.slice(-this.maxStatsHistory);
        }
    }
}

/**
 * Factory function to create InferenceEngine instance
 */
export function createInferenceEngine(config?: Partial<GenerationConfig>): InferenceEngine {
    return new InferenceEngine(config);
}

/**
 * Singleton instance for global access
 */
let inferenceEngineInstance: InferenceEngine | null = null;

/**
 * Get singleton InferenceEngine instance
 */
export function getInferenceEngine(): InferenceEngine {
    if (!inferenceEngineInstance) {
        inferenceEngineInstance = createInferenceEngine();
    }
    return inferenceEngineInstance;
}