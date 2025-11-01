/**
 * Unit tests for InferenceEngine component
 * Tests text generation, configuration management, token counting, and streaming
 */

import { InferenceEngine } from '../InferenceEngine';
import { GenerationConfig, GenerationOptions } from '../../../types/gemma-2b-offline';
import { InferenceError, ResourceError } from '../errors';
import { DEFAULT_GENERATION_CONFIG, GENERATION_PRESETS } from '../constants';

// Mock pipeline for testing
const mockPipeline = jest.fn();

describe('InferenceEngine', () => {
    let inferenceEngine: InferenceEngine;

    beforeEach(() => {
        inferenceEngine = new InferenceEngine();
        inferenceEngine.setPipeline(mockPipeline as any);
        jest.clearAllMocks();
    });

    afterEach(() => {
        inferenceEngine.dispose();
    });

    describe('initialization', () => {
        it('should initialize with default configuration', () => {
            const config = inferenceEngine.getGenerationConfig();
            expect(config).toEqual(DEFAULT_GENERATION_CONFIG);
        });

        it('should initialize with custom configuration', () => {
            const customConfig: Partial<GenerationConfig> = {
                temperature: 0.5,
                maxNewTokens: 128
            };

            const customEngine = new InferenceEngine(customConfig);
            const config = customEngine.getGenerationConfig();

            expect(config.temperature).toBe(0.5);
            expect(config.maxNewTokens).toBe(128);
            expect(config.topP).toBe(DEFAULT_GENERATION_CONFIG.topP); // Should keep defaults
        });

        it('should throw error when generating without pipeline', async () => {
            const engineWithoutPipeline = new InferenceEngine();

            await expect(engineWithoutPipeline.generateText('test'))
                .rejects
                .toThrow(InferenceError);
        });
    });

    describe('text generation', () => {
        it('should generate text successfully', async () => {
            const mockResult = [{ generated_text: 'Hello world, this is a test response.' }];
            mockPipeline.mockResolvedValue(mockResult);

            const result = await inferenceEngine.generateText('Hello');

            expect(result).toBe('world, this is a test response.');
            expect(mockPipeline).toHaveBeenCalledWith(
                'Hello',
                expect.objectContaining({
                    max_new_tokens: DEFAULT_GENERATION_CONFIG.maxNewTokens,
                    temperature: DEFAULT_GENERATION_CONFIG.temperature
                })
            );
        });

        it('should handle different result formats', async () => {
            // Test string result
            mockPipeline.mockResolvedValue('Generated text response');
            let result = await inferenceEngine.generateText('test');
            expect(result).toBe('Generated text response');

            // Test object result
            mockPipeline.mockResolvedValue({ generated_text: 'Object response' });
            result = await inferenceEngine.generateText('test');
            expect(result).toBe('Object response');
        });

        it('should apply generation options', async () => {
            const mockResult = [{ generated_text: 'test response' }];
            mockPipeline.mockResolvedValue(mockResult);

            const options: GenerationOptions = {
                temperature: 0.8,
                maxTokens: 64,
                topP: 0.95
            };

            await inferenceEngine.generateText('test', options);

            expect(mockPipeline).toHaveBeenCalledWith(
                'test',
                expect.objectContaining({
                    temperature: 0.8,
                    max_new_tokens: 64,
                    top_p: 0.95
                })
            );
        });

        it('should prevent concurrent generation', async () => {
            mockPipeline.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve([{ generated_text: 'response' }]), 100);
            }));

            // Start first generation
            const firstGeneration = inferenceEngine.generateText('test1');

            // Try to start second generation
            await expect(inferenceEngine.generateText('test2'))
                .rejects
                .toThrow(InferenceError);

            // Wait for first to complete
            await firstGeneration;
        });

        it('should handle generation timeout', async () => {
            // Mock a pipeline that takes longer than the configured timeout
            mockPipeline.mockImplementation(() => new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error('Generation timeout')), 100);
            }));

            await expect(inferenceEngine.generateText('test'))
                .rejects
                .toThrow();
        });

        it('should retry on transient errors', async () => {
            mockPipeline
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockRejectedValueOnce(new Error('Another temporary error'))
                .mockResolvedValue([{ generated_text: 'Success after retries' }]);

            const result = await inferenceEngine.generateText('test');
            expect(result).toBe('Success after retries');
            expect(mockPipeline).toHaveBeenCalledTimes(3);
        });

        it('should not retry on non-retryable errors', async () => {
            mockPipeline.mockRejectedValue(new Error('Model corrupted'));

            await expect(inferenceEngine.generateText('test'))
                .rejects
                .toThrow();

            expect(mockPipeline).toHaveBeenCalledTimes(1);
        });
    });

    describe('input validation', () => {
        it('should reject empty prompts', async () => {
            await expect(inferenceEngine.generateText(''))
                .rejects
                .toThrow(InferenceError);

            await expect(inferenceEngine.generateText('   '))
                .rejects
                .toThrow(InferenceError);
        });

        it('should reject non-string prompts', async () => {
            await expect(inferenceEngine.generateText(null as any))
                .rejects
                .toThrow(InferenceError);

            await expect(inferenceEngine.generateText(123 as any))
                .rejects
                .toThrow(InferenceError);
        });

        it('should reject overly long prompts', async () => {
            const longPrompt = 'a'.repeat(50000); // Very long prompt

            await expect(inferenceEngine.generateText(longPrompt))
                .rejects
                .toThrow(InferenceError);
        });
    });

    describe('configuration management', () => {
        it('should update generation configuration', () => {
            const newConfig: GenerationConfig = {
                ...DEFAULT_GENERATION_CONFIG,
                temperature: 0.9,
                maxNewTokens: 512
            };

            inferenceEngine.setGenerationConfig(newConfig);
            const config = inferenceEngine.getGenerationConfig();

            expect(config.temperature).toBe(0.9);
            expect(config.maxNewTokens).toBe(512);
        });

        it('should validate configuration parameters', () => {
            const invalidConfigs = [
                { ...DEFAULT_GENERATION_CONFIG, temperature: -1 },
                { ...DEFAULT_GENERATION_CONFIG, temperature: 3 },
                { ...DEFAULT_GENERATION_CONFIG, topP: -0.1 },
                { ...DEFAULT_GENERATION_CONFIG, topP: 1.1 },
                { ...DEFAULT_GENERATION_CONFIG, topK: 0 },
                { ...DEFAULT_GENERATION_CONFIG, maxNewTokens: 0 },
                { ...DEFAULT_GENERATION_CONFIG, repetitionPenalty: 0 }
            ];

            invalidConfigs.forEach(config => {
                expect(() => inferenceEngine.setGenerationConfig(config))
                    .toThrow(InferenceError);
            });
        });

        it('should apply generation presets', () => {
            inferenceEngine.applyGenerationPreset('CREATIVE');
            const config = inferenceEngine.getGenerationConfig();

            expect(config.temperature).toBe(GENERATION_PRESETS.CREATIVE.temperature);
            expect(config.topP).toBe(GENERATION_PRESETS.CREATIVE.topP);
        });

        it('should throw error for unknown presets', () => {
            expect(() => inferenceEngine.applyGenerationPreset('UNKNOWN' as any))
                .toThrow(InferenceError);
        });
    });

    describe('token counting', () => {
        it('should count tokens approximately', () => {
            const shortText = 'Hello world';
            const longText = 'This is a much longer text with many more words and characters to test token counting accuracy.';

            const shortCount = inferenceEngine.getTokenCount(shortText);
            const longCount = inferenceEngine.getTokenCount(longText);

            expect(shortCount).toBeGreaterThan(0);
            expect(longCount).toBeGreaterThan(shortCount);
            expect(typeof shortCount).toBe('number');
            expect(typeof longCount).toBe('number');
        });

        it('should handle empty text', () => {
            expect(inferenceEngine.getTokenCount('')).toBe(0);
            expect(inferenceEngine.getTokenCount(null as any)).toBe(0);
            expect(inferenceEngine.getTokenCount(undefined as any)).toBe(0);
        });

        it('should provide detailed token information', () => {
            const text = 'This is a test sentence.';
            const tokenInfo = inferenceEngine.getTokenInfo(text);

            expect(tokenInfo.count).toBeGreaterThan(0);
            expect(tokenInfo.text).toBe(text);
            expect(typeof tokenInfo.truncated).toBe('boolean');
        });
    });

    describe('streaming generation', () => {
        it('should stream text generation', async () => {
            const mockResult = 'This is a streaming response with multiple words.';
            mockPipeline.mockResolvedValue([{ generated_text: mockResult }]);

            const chunks: string[] = [];
            const stream = inferenceEngine.streamGeneration('test');

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks.join(' ')).toContain('streaming response');
        });

        it('should handle streaming errors', async () => {
            mockPipeline.mockRejectedValue(new Error('Generation failed'));

            const stream = inferenceEngine.streamGeneration('test');

            await expect(async () => {
                for await (const chunk of stream) {
                    // Should throw before yielding any chunks
                }
            }).rejects.toThrow();
        });
    });

    describe('performance monitoring', () => {
        it('should track performance metrics', async () => {
            mockPipeline.mockResolvedValue([{ generated_text: 'test response' }]);

            // Generate some text to create metrics
            await inferenceEngine.generateText('test1');
            await inferenceEngine.generateText('test2');

            const metrics = inferenceEngine.getPerformanceMetrics();

            expect(metrics.totalRequests).toBe(2);
            expect(metrics.averageInferenceTime).toBeGreaterThan(0);
            expect(typeof metrics.tokensPerSecond).toBe('number');
            expect(typeof metrics.memoryUsage).toBe('number');
        });

        it('should return default metrics when no generations', () => {
            const metrics = inferenceEngine.getPerformanceMetrics();

            expect(metrics.totalRequests).toBe(0);
            expect(metrics.averageInferenceTime).toBe(0);
            expect(metrics.tokensPerSecond).toBe(0);
        });
    });

    describe('resource management', () => {
        it('should check generation status', () => {
            expect(inferenceEngine.isGenerationInProgress()).toBe(false);
        });

        it('should abort generation', () => {
            expect(() => inferenceEngine.abort()).not.toThrow();
        });

        it('should dispose resources', () => {
            expect(() => inferenceEngine.dispose()).not.toThrow();
            expect(inferenceEngine.isGenerationInProgress()).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle empty generation results', async () => {
            mockPipeline.mockResolvedValue([]);

            await expect(inferenceEngine.generateText('test'))
                .rejects
                .toThrow(InferenceError);
        });

        it('should handle malformed generation results', async () => {
            mockPipeline.mockResolvedValue([{ invalid: 'format' }]);

            await expect(inferenceEngine.generateText('test'))
                .rejects
                .toThrow(InferenceError);
        });

        it('should handle null generation results', async () => {
            mockPipeline.mockResolvedValue(null);

            await expect(inferenceEngine.generateText('test'))
                .rejects
                .toThrow(InferenceError);
        });
    });
});

describe('InferenceEngine factory functions', () => {
    it('should create instance with factory function', () => {
        const { createInferenceEngine } = require('../InferenceEngine');
        const engine = createInferenceEngine();

        expect(engine).toBeInstanceOf(InferenceEngine);
    });

    it('should create instance with custom config', () => {
        const { createInferenceEngine } = require('../InferenceEngine');
        const config = { temperature: 0.5 };
        const engine = createInferenceEngine(config);

        expect(engine.getGenerationConfig().temperature).toBe(0.5);
    });

    it('should return singleton instance', () => {
        const { getInferenceEngine } = require('../InferenceEngine');
        const engine1 = getInferenceEngine();
        const engine2 = getInferenceEngine();

        expect(engine1).toBe(engine2);
    });
});