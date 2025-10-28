/**
 * Vector System Initialization
 * Sets up vector database and embedding services
 */

import { getVectorConfig, validateVectorConfig } from './config';
import { createVectorDatabase } from './database';
import { createEmbeddingService } from './embeddings';

export interface VectorSystemComponents {
  vectorDB: any;
  embeddingService: any;
  config: any;
}

let vectorSystem: VectorSystemComponents | null = null;

export async function initializeVectorSystem(): Promise<VectorSystemComponents> {
  if (vectorSystem) {
    return vectorSystem;
  }
  
  console.log('🚀 Initializing Vector System...');
  
  try {
    // Load and validate configuration
    const config = getVectorConfig();
    
    if (!validateVectorConfig(config)) {
      throw new Error('Invalid vector configuration');
    }
    
    console.log(`📋 Using vector DB: ${config.vectorDB.provider}`);
    console.log(`🤖 Using embedding model: ${config.embeddings.model}`);
    
    // Initialize vector database
    const vectorDB = createVectorDatabase(config);
    await vectorDB.connect();
    
    // Initialize embedding service
    const embeddingService = createEmbeddingService(config);
    
    // Create index if it doesn't exist
    const indexName = config.vectorDB.indexName;
    const existingIndexes = await vectorDB.listIndexes();
    
    if (!existingIndexes.includes(indexName)) {
      console.log(`📋 Creating vector index: ${indexName}`);
      await vectorDB.createIndex(
        indexName,
        config.vectorDB.dimensions,
        config.vectorDB.metric
      );
    } else {
      console.log(`✅ Vector index '${indexName}' already exists`);
    }
    
    // Test embedding generation
    console.log('🧪 Testing embedding generation...');
    const testResponse = await embeddingService.generateEmbedding({
      text: 'Test embedding generation'
    });
    
    if (testResponse.embedding.length !== config.embeddings.dimensions) {
      throw new Error(`Embedding dimensions mismatch: expected ${config.embeddings.dimensions}, got ${testResponse.embedding.length}`);
    }
    
    vectorSystem = {
      vectorDB,
      embeddingService,
      config
    };
    
    console.log('✅ Vector System initialized successfully');
    console.log(`📊 Cache size: ${config.performance.cacheSize}`);
    console.log(`⚡ Batch size: ${config.embeddings.batchSize}`);
    
    return vectorSystem;
    
  } catch (error) {
    console.error('❌ Failed to initialize Vector System:', error);
    throw error;
  }
}

export function getVectorSystem(): VectorSystemComponents {
  if (!vectorSystem) {
    throw new Error('Vector system not initialized. Call initializeVectorSystem() first.');
  }
  
  return vectorSystem;
}

export async function shutdownVectorSystem(): Promise<void> {
  if (vectorSystem) {
    console.log('🔌 Shutting down Vector System...');
    
    try {
      await vectorSystem.vectorDB.disconnect();
      vectorSystem.embeddingService.clearCache();
      vectorSystem = null;
      
      console.log('✅ Vector System shutdown complete');
    } catch (error) {
      console.error('❌ Error during Vector System shutdown:', error);
    }
  }
}

// Health check function
export async function checkVectorSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, any>;
}> {
  try {
    if (!vectorSystem) {
      return {
        status: 'unhealthy',
        details: { error: 'Vector system not initialized' }
      };
    }
    
    const { vectorDB, embeddingService, config } = vectorSystem;
    
    // Check vector database connection
    const indexes = await vectorDB.listIndexes();
    const indexExists = indexes.includes(config.vectorDB.indexName);
    
    // Check embedding service
    const cacheStats = embeddingService.getCacheStats();
    
    // Test embedding generation (small test)
    const testStart = Date.now();
    await embeddingService.generateEmbedding({ text: 'health check' });
    const embeddingLatency = Date.now() - testStart;
    
    const isHealthy = indexExists && embeddingLatency < 5000; // 5 second threshold
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      details: {
        vectorDB: {
          connected: vectorDB.isConnected?.() ?? true,
          indexExists,
          totalIndexes: indexes.length
        },
        embeddings: {
          latency: embeddingLatency,
          cacheSize: cacheStats.size,
          cacheUtilization: (cacheStats.size / cacheStats.maxSize) * 100
        },
        config: {
          provider: config.vectorDB.provider,
          model: config.embeddings.model,
          dimensions: config.embeddings.dimensions
        }
      }
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error.message }
    };
  }
}

export default initializeVectorSystem;