/**
 * Example usage of ModelLoader component
 * Demonstrates how to load and use the Gemma 2B model
 */

import { ModelLoader, getModelLoader } from '../ModelLoader';
import { LoadStage } from '../../../types/gemma-2b-offline';

/**
 * Example: Basic model loading
 */
export async function basicModelLoadingExample(): Promise<void> {
    console.log('=== Basic Model Loading Example ===');

    const modelLoader = new ModelLoader();

    try {
        // Listen for progress updates
        if (typeof window !== 'undefined') {
            window.addEventListener('gemma-model-progress', (event: any) => {
                const progress = event.detail;
                console.log(`Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
            });
        }

        console.log('Starting model load...');
        const pipeline = await modelLoader.loadModel('google/gemma-2b-it');

        console.log('Model loaded successfully!');

        // Test the model with a simple prompt
        const testResult = await pipeline('Hello, I am an artisan who makes pottery. Can you help me?', {
            max_new_tokens: 50,
            temperature: 0.7,
            do_sample: true
        });

        console.log('Test result:', testResult);

    } catch (error) {
        console.error('Model loading failed:', error);
    } finally {
        modelLoader.dispose();
    }
}

/**
 * Example: Using singleton instance
 */
export async function singletonExample(): Promise<void> {
    console.log('=== Singleton ModelLoader Example ===');

    const modelLoader = getModelLoader();

    try {
        // Check if model is already cached
        const isCached = await modelLoader.isModelCached('google/gemma-2b-it');
        console.log('Model cached:', isCached);

        // Get model size information
        const modelSize = await modelLoader.getModelSize('google/gemma-2b-it');
        console.log('Model size:', Math.round(modelSize / 1024 / 1024), 'MB');

        // Load the model
        const pipeline = await modelLoader.loadModel();
        console.log('Model ready for inference');

    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Example: Progress monitoring
 */
export async function progressMonitoringExample(): Promise<void> {
    console.log('=== Progress Monitoring Example ===');

    const modelLoader = new ModelLoader();

    // Monitor progress
    const progressInterval = setInterval(() => {
        const progress = modelLoader.getLoadProgress();
        console.log(`Stage: ${progress.stage}, Progress: ${progress.progress}%, Message: ${progress.message}`);

        if (progress.stage === LoadStage.READY || progress.stage === LoadStage.ERROR) {
            clearInterval(progressInterval);
        }
    }, 1000);

    try {
        await modelLoader.loadModel('google/gemma-2b-it');
        console.log('Model loading completed');
    } catch (error) {
        console.error('Model loading failed:', error);
    } finally {
        clearInterval(progressInterval);
        modelLoader.dispose();
    }
}

/**
 * Example: Error handling and recovery
 */
export async function errorHandlingExample(): Promise<void> {
    console.log('=== Error Handling Example ===');

    const modelLoader = new ModelLoader();

    try {
        // Attempt to load model
        await modelLoader.loadModel('google/gemma-2b-it');

    } catch (error) {
        console.error('Initial load failed:', error);

        // Try clearing cache and retrying
        try {
            console.log('Clearing cache and retrying...');
            await modelLoader.clearCache();
            await modelLoader.loadModel('google/gemma-2b-it');
            console.log('Retry successful');

        } catch (retryError) {
            console.error('Retry also failed:', retryError);

            // In a real application, you might fallback to demo mode here
            console.log('Would fallback to demo mode in production');
        }
    } finally {
        modelLoader.dispose();
    }
}

/**
 * Example: Cache management
 */
export async function cacheManagementExample(): Promise<void> {
    console.log('=== Cache Management Example ===');

    const modelLoader = new ModelLoader();

    try {
        const modelId = 'google/gemma-2b-it';

        // Check cache status
        console.log('Checking cache status...');
        const isCached = await modelLoader.isModelCached(modelId);
        console.log('Model cached:', isCached);

        if (isCached) {
            console.log('Loading from cache...');
        } else {
            console.log('Will download model...');
        }

        // Load model (will use cache if available)
        const pipeline = await modelLoader.loadModel(modelId);
        console.log('Model loaded');

        // Clear cache for demonstration
        console.log('Clearing cache...');
        await modelLoader.clearCache();
        console.log('Cache cleared');

        // Verify cache is cleared
        const isCachedAfterClear = await modelLoader.isModelCached(modelId);
        console.log('Model cached after clear:', isCachedAfterClear);

    } catch (error) {
        console.error('Cache management error:', error);
    } finally {
        modelLoader.dispose();
    }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
    console.log('Running ModelLoader examples...\n');

    try {
        await basicModelLoadingExample();
        console.log('\n');

        await singletonExample();
        console.log('\n');

        await progressMonitoringExample();
        console.log('\n');

        await errorHandlingExample();
        console.log('\n');

        await cacheManagementExample();
        console.log('\n');

        console.log('All examples completed!');

    } catch (error) {
        console.error('Example execution failed:', error);
    }
}

// Export for use in other modules
export {
    ModelLoader,
    getModelLoader
};