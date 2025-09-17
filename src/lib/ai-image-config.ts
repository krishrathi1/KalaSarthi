// AI Image Generation Configuration
export const AI_IMAGE_CONFIG = {
    // Google Cloud Configuration
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'gen-lang-client-0314311341',
    GCP_BUCKET_NAME: process.env.GCP_BUCKET_NAME || 'kala-sarthi-images',
    GCP_REGION: process.env.GCP_REGION || 'us-central1',

    // Image Generation Settings
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    GENERATION_QUALITY: 'high' as const,

    // Vertex AI Imagen Settings
    IMAGEN_MODEL: 'imagegeneration@006',
    IMAGEN_TEMPERATURE: 0.4,
    IMAGEN_TOP_K: 32,
    IMAGEN_TOP_P: 1,
    IMAGEN_MAX_OUTPUT_TOKENS: 2048,
    IMAGEN_SAFETY_THRESHOLD: 'BLOCK_MEDIUM_AND_ABOVE',

    // Retry and Fallback Settings
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    ENABLE_FALLBACK_IMAGES: true,
    FALLBACK_IMAGE_SERVICE: 'https://via.placeholder.com',

    // API Limits
    MAX_GENERATIONS_PER_REQUEST: 5,
    RATE_LIMIT_PER_MINUTE: 10,

    // Style Options
    STYLE_OPTIONS: [
        { id: 'vibrant', name: 'Vibrant Colors', description: 'Bright and bold color variations' },
        { id: 'pastel', name: 'Pastel Tones', description: 'Soft and gentle color palette' },
        { id: 'monochrome', name: 'Monochrome', description: 'Black and white variations' },
        { id: 'vintage', name: 'Vintage Style', description: 'Retro and aged appearance' },
        { id: 'modern', name: 'Modern Minimalist', description: 'Clean and contemporary look' },
        { id: 'traditional', name: 'Traditional', description: 'Classic and heritage style' }
    ],

    // Color Variations
    COLOR_VARIATIONS: [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Blue', hex: '#0000FF' },
        { name: 'Green', hex: '#00FF00' },
        { name: 'Yellow', hex: '#FFFF00' },
        { name: 'Purple', hex: '#800080' },
        { name: 'Orange', hex: '#FFA500' },
        { name: 'Pink', hex: '#FFC0CB' },
        { name: 'Brown', hex: '#A52A2A' }
    ]
};

export type StyleOption = typeof AI_IMAGE_CONFIG.STYLE_OPTIONS[0];
export type ColorVariation = typeof AI_IMAGE_CONFIG.COLOR_VARIATIONS[0];
