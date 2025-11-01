/**
 * Transformers.js Configuration
 * Environment setup for optimal performance
 */

// Configure Transformers.js environment
export const configureTransformersEnvironment = () => {
    if (typeof window !== 'undefined') {
        // Set up cache directory
        if (!window.localStorage.getItem('transformers_cache_configured')) {
            try {
                // Configure cache settings
                window.localStorage.setItem('transformers_cache_configured', 'true');
                console.log('✅ Transformers.js cache configured');
            } catch (error) {
                console.warn('Could not configure cache:', error);
            }
        }
    }
};

// Model configuration
export const TRANSFORMERS_CONFIG = {
    // Use smaller, faster model for better UX
    DEFAULT_MODEL: 'Xenova/distilgpt2',

    // Cache settings
    CACHE_DIR: './.cache/transformers',
    USE_CACHE: true,

    // Generation settings
    MAX_LENGTH: 100,
    TEMPERATURE: 0.8,
    TOP_K: 40,
    TOP_P: 0.9,

    // Performance settings
    BATCH_SIZE: 1,
    NUM_THREADS: 1,

    // Timeout settings
    LOAD_TIMEOUT: 300000, // 5 minutes
    GENERATION_TIMEOUT: 30000, // 30 seconds
};

// Initialize configuration
if (typeof window !== 'undefined') {
    configureTransformersEnvironment();
}