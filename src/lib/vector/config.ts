/**
 * Vector Database Configuration
 * Centralized configuration for vector database and embedding services
 */

export interface VectorConfig {
  // Vector Database Settings
  vectorDB: {
    provider: 'pinecone' | 'qdrant' | 'faiss';
    apiKey?: string;
    environment?: string;
    indexName: string;
    dimensions: number;
    metric: 'cosine' | 'euclidean' | 'dotproduct';
  };
  
  // Embedding Model Settings
  embeddings: {
    provider: 'openai' | 'huggingface' | 'local';
    model: string;
    apiKey?: string;
    dimensions: number;
    maxTokens: number;
    batchSize: number;
  };
  
  // Performance Settings
  performance: {
    cacheSize: number;
    cacheTTL: number; // in milliseconds
    searchTimeout: number;
    maxConcurrentRequests: number;
  };
  
  // Security Settings
  security: {
    encryptVectors: boolean;
    sanitizeProfiles: boolean;
    auditAccess: boolean;
  };
}

// Default configuration
export const defaultVectorConfig: VectorConfig = {
  vectorDB: {
    provider: 'pinecone',
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    indexName: process.env.PINECONE_INDEX_NAME || 'artisan-profiles',
    dimensions: 384, // Local embedding dimensions (fallback-friendly)
    metric: 'cosine'
  },
  
  embeddings: {
    provider: 'local', // Use local embeddings by default (no API quota issues)
    model: 'local-tfidf',
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY, // Available for fallback
    dimensions: 384,
    maxTokens: 2048,
    batchSize: 50 // Higher batch size for local processing
  },
  
  performance: {
    cacheSize: 1000,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    searchTimeout: 30000, // 30 seconds
    maxConcurrentRequests: 10
  },
  
  security: {
    encryptVectors: false, // Set to true in production
    sanitizeProfiles: true,
    auditAccess: true
  }
};

// Environment-specific configurations
export const getVectorConfig = (): VectorConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultVectorConfig,
        security: {
          ...defaultVectorConfig.security,
          encryptVectors: true
        },
        performance: {
          ...defaultVectorConfig.performance,
          cacheSize: 5000,
          maxConcurrentRequests: 50
        }
      };
      
    case 'test':
      return {
        ...defaultVectorConfig,
        vectorDB: {
          ...defaultVectorConfig.vectorDB,
          indexName: 'test-artisan-profiles'
        },
        performance: {
          ...defaultVectorConfig.performance,
          cacheSize: 100,
          maxConcurrentRequests: 5
        }
      };
      
    default: // development
      return defaultVectorConfig;
  }
};

// Validation functions
export const validateVectorConfig = (config: VectorConfig): boolean => {
  // Validate required API keys
  if (config.vectorDB.provider === 'pinecone' && !config.vectorDB.apiKey) {
    console.error('Pinecone API key is required');
    return false;
  }
  
  if (config.embeddings.provider === 'openai' && !config.embeddings.apiKey) {
    console.error('OpenAI API key is required');
    return false;
  }
  
  if (config.embeddings.provider === 'gemini' && !config.embeddings.apiKey) {
    console.error('Gemini API key is required');
    return false;
  }
  
  if (config.embeddings.provider === 'local') {
    // Local embeddings don't require API keys
    console.log('Using local embeddings (no API key required)');
  }
  
  // Validate dimensions match
  if (config.vectorDB.dimensions !== config.embeddings.dimensions) {
    console.error('Vector DB and embedding dimensions must match');
    return false;
  }
  
  // Validate positive values
  if (config.embeddings.batchSize <= 0 || config.performance.cacheSize <= 0) {
    console.error('Batch size and cache size must be positive');
    return false;
  }
  
  return true;
};

export default getVectorConfig;