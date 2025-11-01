/**
 * Transformers.js Environment Configuration
 * 
 * This file sets up the environment for @xenova/transformers to work properly
 * in Next.js with proper fallbacks and error handling
 */

// Set up environment variables for transformers.js
if (typeof window !== 'undefined') {
    // Browser environment
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
        cacheDir: '/models/',
        ...((globalThis as any).env || {})
    };
} else {
    // Server environment
    process.env.TRANSFORMERS_CACHE = process.env.TRANSFORMERS_CACHE || './models';
    process.env.ONNX_CACHE = process.env.ONNX_CACHE || './models';
}

// Export a function to initialize transformers environment
export function initializeTransformersEnv() {
    if (typeof window !== 'undefined') {
        // Browser-specific initialization
        try {
            // Ensure global env object exists
            if (!(globalThis as any).env) {
                (globalThis as any).env = {};
            }

            // Set up basic configuration
            const env = (globalThis as any).env;
            env.backends = env.backends || {};
            env.backends.onnx = env.backends.onnx || {};
            env.backends.onnx.wasm = env.backends.onnx.wasm || {};
            env.backends.onnx.wasm.wasmPaths = env.backends.onnx.wasm.wasmPaths || '/models/';

            env.allowRemoteModels = env.allowRemoteModels !== false;
            env.allowLocalModels = env.allowLocalModels !== false;
            env.cacheDir = env.cacheDir || '/models/';

            console.log('Transformers.js environment initialized for browser');
        } catch (error) {
            console.warn('Failed to initialize transformers environment:', error);
        }
    }
}

// Auto-initialize when module is loaded
initializeTransformersEnv();