/**
 * Constants and default configurations for Gemma 2B Offline Service
 * Centralized configuration for model settings, system requirements, and defaults
 */

import {
    ModelConfig,
    GenerationConfig,
    SystemRequirements,
    OptimizationSettings,
    BrowserSupport,
    SupportedLanguage,
    ArtisanDomain
} from '../../types/gemma-2b-offline';

// ============================================================================
// Model Configuration Constants
// ============================================================================

/**
 * Default model configuration for Gemma 2B
 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
    modelId: 'google/gemma-2b-it',
    quantization: 'q4',
    maxContextLength: 2048,
    cacheLocation: 'gemma-2b-cache',
    devicePreference: 'auto'
};

/**
 * Alternative model configurations for different scenarios
 */
export const MODEL_CONFIGS = {
    // High performance - larger model, better quality
    HIGH_PERFORMANCE: {
        ...DEFAULT_MODEL_CONFIG,
        quantization: 'q8' as const,
        maxContextLength: 4096
    },

    // Low resource - smaller model, faster inference
    LOW_RESOURCE: {
        ...DEFAULT_MODEL_CONFIG,
        quantization: 'q4' as const,
        maxContextLength: 1024,
        devicePreference: 'cpu' as const
    },

    // Balanced - good quality and performance
    BALANCED: DEFAULT_MODEL_CONFIG
} as const;

/**
 * Model file information
 */
export const MODEL_INFO = {
    BASE_URL: 'https://huggingface.co/google/gemma-2b-it',
    APPROXIMATE_SIZE_MB: {
        q4: 1500,   // ~1.5GB quantized
        q8: 2800,   // ~2.8GB
        fp16: 5600  // ~5.6GB full precision
    },
    SUPPORTED_TASKS: ['text-generation', 'conversational']
} as const;

// ============================================================================
// Generation Configuration Constants
// ============================================================================

/**
 * Default text generation configuration
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
    maxNewTokens: 256,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repetitionPenalty: 1.1,
    doSample: true,
    padTokenId: 0,
    eosTokenId: 1
};

/**
 * Generation presets for different use cases
 */
export const GENERATION_PRESETS = {
    // Creative responses - higher temperature
    CREATIVE: {
        ...DEFAULT_GENERATION_CONFIG,
        temperature: 0.9,
        topP: 0.95,
        topK: 50
    },

    // Factual responses - lower temperature
    FACTUAL: {
        ...DEFAULT_GENERATION_CONFIG,
        temperature: 0.3,
        topP: 0.8,
        topK: 20
    },

    // Balanced responses
    BALANCED: DEFAULT_GENERATION_CONFIG,

    // Quick responses - shorter output
    QUICK: {
        ...DEFAULT_GENERATION_CONFIG,
        maxNewTokens: 128,
        temperature: 0.5
    }
} as const;

// ============================================================================
// System Requirements Constants
// ============================================================================

/**
 * Minimum system requirements
 */
export const SYSTEM_REQUIREMENTS: SystemRequirements = {
    minMemoryMB: 2048,      // 2GB minimum
    recommendedMemoryMB: 4096, // 4GB recommended
    supportedBrowsers: [
        'Chrome 90+',
        'Firefox 89+',
        'Safari 14+',
        'Edge 90+'
    ],
    webglRequired: true,
    wasmRequired: true
};

/**
 * Browser support matrix
 */
export const BROWSER_SUPPORT: BrowserSupport = {
    chrome: {
        min: '90',
        webgl: true,
        wasm: true,
        recommended: '120'
    },
    firefox: {
        min: '89',
        webgl: true,
        wasm: true,
        recommended: '115'
    },
    safari: {
        min: '14',
        webgl: true,
        wasm: true,
        recommended: '17'
    },
    edge: {
        min: '90',
        webgl: true,
        wasm: true,
        recommended: '120'
    }
};

// ============================================================================
// Performance and Optimization Constants
// ============================================================================

/**
 * Default optimization settings
 */
export const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
    maxConcurrentRequests: 1,
    contextWindowSize: 2048,
    memoryThreshold: 0.8,        // 80% memory usage threshold
    cpuThrottleThreshold: 0.9,   // 90% CPU usage threshold
    batteryOptimization: true
};

/**
 * Performance thresholds and limits
 */
export const PERFORMANCE_LIMITS = {
    MAX_INFERENCE_TIME_MS: 30000,    // 30 seconds max
    MAX_MODEL_LOAD_TIME_MS: 300000,  // 5 minutes max
    MIN_TOKENS_PER_SECOND: 0.5,      // Minimum acceptable speed
    MAX_CONTEXT_LENGTH: 4096,        // Maximum context window
    MAX_OUTPUT_LENGTH: 1024,         // Maximum output tokens
    MEMORY_WARNING_THRESHOLD: 0.7,   // 70% memory usage warning
    MEMORY_CRITICAL_THRESHOLD: 0.9   // 90% memory usage critical
} as const;

/**
 * Cache and storage settings
 */
export const CACHE_SETTINGS = {
    MAX_CACHE_SIZE_MB: 8192,         // 8GB max cache
    CACHE_EXPIRY_DAYS: 30,           // 30 days cache expiry
    MODEL_VALIDATION_INTERVAL: 7,    // Validate every 7 days
    CLEANUP_INTERVAL_MS: 3600000,    // Cleanup every hour
    STORAGE_QUOTA_WARNING: 0.8       // Warn at 80% storage usage
} as const;

// ============================================================================
// Language and Context Constants
// ============================================================================

/**
 * Supported languages configuration
 */
export const LANGUAGE_CONFIG = {
    DEFAULT: SupportedLanguage.ENGLISH,
    SUPPORTED: [SupportedLanguage.ENGLISH, SupportedLanguage.HINDI],
    DETECTION_PATTERNS: {
        [SupportedLanguage.HINDI]: /[\u0900-\u097F]/,  // Devanagari script
        [SupportedLanguage.ENGLISH]: /^[a-zA-Z\s.,!?'"()-]+$/
    }
} as const;

/**
 * Artisan domain configurations
 */
export const ARTISAN_DOMAINS = {
    [ArtisanDomain.POTTERY]: {
        keywords: ['pottery', 'clay', 'ceramic', 'wheel', 'kiln', 'glaze'],
        hindiKeywords: ['मिट्टी', 'कुम्हार', 'बर्तन', 'चाक']
    },
    [ArtisanDomain.TEXTILES]: {
        keywords: ['textile', 'fabric', 'weaving', 'embroidery', 'silk', 'cotton'],
        hindiKeywords: ['कपड़ा', 'बुनाई', 'कढ़ाई', 'रेशम']
    },
    [ArtisanDomain.WOODWORK]: {
        keywords: ['wood', 'carving', 'furniture', 'timber', 'craft'],
        hindiKeywords: ['लकड़ी', 'नक्काशी', 'फर्नीचर']
    },
    [ArtisanDomain.METALWORK]: {
        keywords: ['metal', 'brass', 'copper', 'silver', 'jewelry', 'forging'],
        hindiKeywords: ['धातु', 'पीतल', 'तांबा', 'चांदी']
    },
    [ArtisanDomain.JEWELRY]: {
        keywords: ['jewelry', 'gold', 'silver', 'gems', 'ornaments'],
        hindiKeywords: ['आभूषण', 'सोना', 'चांदी', 'रत्न']
    },
    [ArtisanDomain.PAINTING]: {
        keywords: ['painting', 'art', 'canvas', 'colors', 'brush'],
        hindiKeywords: ['चित्रकारी', 'कला', 'रंग', 'ब्रश']
    },
    [ArtisanDomain.SCULPTURE]: {
        keywords: ['sculpture', 'carving', 'stone', 'marble', 'statue'],
        hindiKeywords: ['मूर्तिकला', 'पत्थर', 'संगमरमर']
    },
    [ArtisanDomain.GENERAL]: {
        keywords: ['craft', 'handmade', 'artisan', 'traditional', 'skill'],
        hindiKeywords: ['शिल्प', 'हस्तनिर्मित', 'कारीगर', 'पारंपरिक']
    }
} as const;

// ============================================================================
// System Prompts and Templates
// ============================================================================

/**
 * Base system prompts for different languages
 */
export const SYSTEM_PROMPTS = {
    [SupportedLanguage.ENGLISH]: `You are an AI assistant specialized in helping Indian artisans with their craft and business needs. You provide practical advice on:

- Traditional craft techniques and materials
- Business development and marketing strategies  
- Pricing and financial management
- Digital tools and record keeping
- Connecting with customers and markets

Keep responses concise, practical, and culturally appropriate. Focus on actionable advice that helps artisans succeed while preserving traditional skills.`,

    [SupportedLanguage.HINDI]: `आप एक AI सहायक हैं जो भारतीय कारीगरों की उनके शिल्प और व्यापार की जरूरतों में मदद करने में विशेषज्ञ हैं। आप निम्नलिखित पर व्यावहारिक सलाह देते हैं:

- पारंपरिक शिल्प तकनीक और सामग्री
- व्यापार विकास और विपणन रणनीति
- मूल्य निर्धारण और वित्तीय प्रबंधन
- डिजिटल उपकरण और रिकॉर्ड रखना
- ग्राहकों और बाजारों से जुड़ना

जवाब संक्षिप्त, व्यावहारिक और सांस्कृतिक रूप से उपयुक्त रखें। ऐसी कार्यात्मक सलाह पर ध्यान दें जो कारीगरों को पारंपरिक कौशल को संरक्षित करते हुए सफल होने में मदद करे।`
} as const;

/**
 * Context window management settings
 */
export const CONTEXT_SETTINGS = {
    MAX_MESSAGES: 10,              // Maximum messages in context
    MAX_CONTEXT_TOKENS: 1500,     // Reserve tokens for context
    SYSTEM_PROMPT_TOKENS: 200,    // Estimated system prompt tokens
    RESPONSE_BUFFER_TOKENS: 300,  // Buffer for response generation
    TRUNCATION_STRATEGY: 'sliding_window' as const
} as const;

// ============================================================================
// Error and Retry Constants
// ============================================================================

/**
 * Retry and timeout configurations
 */
export const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000,
    BACKOFF_MULTIPLIER: 2,
    TIMEOUT_MS: 30000
} as const;

/**
 * Error message templates
 */
export const ERROR_MESSAGES = {
    MODEL_LOAD_FAILED: 'Failed to load AI model. Please check your connection and try again.',
    INFERENCE_FAILED: 'AI processing failed. Please try rephrasing your message.',
    RESOURCE_INSUFFICIENT: 'Insufficient system resources. Please close other applications.',
    BROWSER_UNSUPPORTED: 'Your browser doesn\'t support this AI feature. Please update or use a different browser.',
    NETWORK_ERROR: 'Network connection issue. Please check your internet connection.',
    CACHE_ERROR: 'Storage issue detected. Please clear your browser cache.',
    VALIDATION_ERROR: 'AI model validation failed. Please refresh and try again.'
} as const;

// ============================================================================
// Development and Debug Constants
// ============================================================================

/**
 * Debug and logging configuration
 */
export const DEBUG_CONFIG = {
    ENABLE_CONSOLE_LOGS: process.env.NODE_ENV === 'development',
    ENABLE_PERFORMANCE_LOGS: true,
    LOG_LEVEL: 'info' as const,
    MAX_LOG_ENTRIES: 1000
} as const;

/**
 * Feature flags for development
 */
export const FEATURE_FLAGS = {
    ENABLE_STREAMING: true,
    ENABLE_CACHING: true,
    ENABLE_ANALYTICS: true,
    ENABLE_FALLBACK: true,
    ENABLE_WEB_WORKERS: false
} as const;