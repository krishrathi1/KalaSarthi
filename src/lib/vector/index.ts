/**
 * Vector System Entry Point
 * Exports all vector-related functionality
 */

// Configuration
export { 
  type VectorConfig,
  defaultVectorConfig,
  getVectorConfig,
  validateVectorConfig
} from './config';

// Database
export {
  type VectorSearchQuery,
  type VectorSearchResult,
  type VectorUpsertData,
  type VectorIndex,
  VectorDatabase,
  PineconeDatabase,
  createVectorDatabase
} from './database';

// Embeddings
export {
  type EmbeddingModel,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type BatchEmbeddingRequest,
  type BatchEmbeddingResponse,
  EmbeddingService,
  OpenAIEmbeddingService,
  createEmbeddingService
} from './embeddings';

// Gemini Embeddings
export { GeminiEmbeddingService } from './gemini-embeddings';

// Utilities
export { VectorUtils } from './utils';

// Initialize vector system
export { initializeVectorSystem } from './init';