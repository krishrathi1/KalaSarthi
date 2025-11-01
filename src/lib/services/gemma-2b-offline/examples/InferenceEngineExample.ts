/**
 * Example usage of the InferenceEngine component
 * Demonstrates text generation, configuration management, and streaming
 */

import { pipeline } from '@xenova/transformers';
import {
    InferenceEngine,
    createInferenceEngine,
    GenerationOptions
} from '../InferenceEngine';
import { GENERATION_PRESETS } from '../constants';

/**
 * Basic text generation example
 */
export async function basicTextGeneration() {
    console.log('=== Basic Text Generation Example ===');

    // Create inference engine
    const inferenceEngine = createInferenceEngine();

    try {
        // Load a mock pipeline (in real usage, this would come from ModelLoader)
        const mockPipeline = await pipeline('text-generation', 'gpt2'); // Using GPT-2 as example
        inferenceEngine.setPipeline(mockPipeline);

        // Generate text
        const prompt = "As an Indian artisan, I want to improve my pottery business by";
        const response = await inferenceEngine.generateText(prompt);

        console.log('Prompt:', prompt);
        console.log('Response:', response);

    } catch (error) {
        console.error('Generation failed:', error.message);
    } finally {
        inferenceEngine.dispose();
    }
}

/**
 * Configuration management example
 */
export async function configurationExample() {
    console.log('=== Configuration Management Example ===');

    const inferenceEngine = createInferenceEngine();

    // Apply different presets
    console.log('Applying CREATIVE preset...');
    inferenceEngine.applyGenerationPreset('CREATIVE');
    console.log('Creative config:', inferenceEngine.getGenerationConfig());

    console.log('Applying FACTUAL preset...');
    inferenceEngine.applyGenerationPreset('FACTUAL');
    console.log('Factual config:', inferenceEngine.getGenerationConfig());

    // Custom configuration
    console.log('Setting custom configuration...');
    inferenceEngine.setGenerationConfig({
        maxNewTokens: 128,
        temperature: 0.6,
        topP: 0.85,
        topK: 30,
        repetitionPenalty: 1.2,
        doSample: true
    });
    console.log('Custom config:', inferenceEngine.getGenerationConfig());

    inferenceEngine.dispose();
}

/**
 * Token counting example
 */
export function tokenCountingExample() {
    console.log('=== Token Counting Example ===');

    const inferenceEngine = createInferenceEngine();

    const texts = [
        "Hello world",
        "This is a longer sentence with more words to demonstrate token counting.",
        "मैं एक भारतीय कारीगर हूं और मैं अपने व्यापार को बेहतर बनाना चाहता हूं।" // Hindi text
    ];

    texts.forEach((text, index) => {
        const tokenCount = inferenceEngine.getTokenCount(text);
        const tokenInfo = inferenceEngine.getTokenInfo(text);

        console.log(`Text ${index + 1}:`, text);
        console.log(`Token count:`, tokenCount);
        console.log(`Token info:`, tokenInfo);
        console.log('---');
    });

    inferenceEngine.dispose();
}

/**
 * Streaming generation example
 */
export async function streamingExample() {
    console.log('=== Streaming Generation Example ===');

    const inferenceEngine = createInferenceEngine();

    try {
        // Mock pipeline for demonstration
        const mockPipeline = {
            call: async () => [{
                generated_text: "Streaming response example with multiple words that will be chunked for demonstration purposes."
            }]
        };
        inferenceEngine.setPipeline(mockPipeline as any);

        const prompt = "How can I price my handmade products?";
        console.log('Prompt:', prompt);
        console.log('Streaming response:');

        // Stream the response
        const stream = inferenceEngine.streamGeneration(prompt);
        for await (const chunk of stream) {
            process.stdout.write(chunk + ' ');
        }
        console.log('\n--- End of stream ---');

    } catch (error) {
        console.error('Streaming failed:', error.message);
    } finally {
        inferenceEngine.dispose();
    }
}

/**
 * Performance monitoring example
 */
export async function performanceExample() {
    console.log('=== Performance Monitoring Example ===');

    const inferenceEngine = createInferenceEngine();

    try {
        // Mock pipeline
        const mockPipeline = {
            call: async () => [{
                generated_text: "Performance test response"
            }]
        };
        inferenceEngine.setPipeline(mockPipeline as any);

        // Generate multiple responses to collect metrics
        const prompts = [
            "What materials do I need for pottery?",
            "How do I market my textiles?",
            "What are good pricing strategies?"
        ];

        console.log('Generating responses for performance metrics...');
        for (const prompt of prompts) {
            await inferenceEngine.generateText(prompt);
            console.log(`Generated response for: "${prompt}"`);
        }

        // Get performance metrics
        const metrics = inferenceEngine.getPerformanceMetrics();
        console.log('Performance Metrics:', {
            totalRequests: metrics.totalRequests,
            averageInferenceTime: `${metrics.averageInferenceTime.toFixed(2)}ms`,
            tokensPerSecond: metrics.tokensPerSecond.toFixed(2),
            memoryUsage: `${(metrics.memoryUsage * 100).toFixed(1)}%`
        });

    } catch (error) {
        console.error('Performance test failed:', error.message);
    } finally {
        inferenceEngine.dispose();
    }
}

/**
 * Error handling example
 */
export async function errorHandlingExample() {
    console.log('=== Error Handling Example ===');

    const inferenceEngine = createInferenceEngine();

    // Test various error scenarios
    const errorTests = [
        {
            name: 'Empty prompt',
            test: () => inferenceEngine.generateText('')
        },
        {
            name: 'No pipeline set',
            test: () => inferenceEngine.generateText('test')
        },
        {
            name: 'Invalid configuration',
            test: () => inferenceEngine.setGenerationConfig({
                maxNewTokens: -1,
                temperature: -1,
                topP: 2,
                topK: 0,
                repetitionPenalty: 0,
                doSample: true
            })
        }
    ];

    for (const errorTest of errorTests) {
        try {
            console.log(`Testing: ${errorTest.name}`);
            await errorTest.test();
            console.log('❌ Expected error but none occurred');
        } catch (error) {
            console.log(`✅ Caught expected error: ${error.message}`);
        }
    }

    inferenceEngine.dispose();
}

/**
 * Run all examples
 */
export async function runAllExamples() {
    console.log('🚀 InferenceEngine Examples\n');

    try {
        await basicTextGeneration();
        console.log('\n');

        await configurationExample();
        console.log('\n');

        tokenCountingExample();
        console.log('\n');

        await streamingExample();
        console.log('\n');

        await performanceExample();
        console.log('\n');

        await errorHandlingExample();
        console.log('\n');

        console.log('✅ All examples completed successfully!');

    } catch (error) {
        console.error('❌ Example failed:', error);
    }
}

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples();
}