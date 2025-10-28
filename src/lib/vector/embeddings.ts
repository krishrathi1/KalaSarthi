/**
 * Embedding Generation Service
 * Handles text-to-vector conversion using various embedding models
 */

import OpenAI from 'openai';
import { VectorConfig } from './config';

export interface EmbeddingModel {
  name: string;
  provider: string;
  dimensions: number;
  maxTokens: number;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  user?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model?: string;
  user?: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

export abstract class EmbeddingService {
  protected config: VectorConfig;
  protected cache: Map<string, number[]>;
  
  constructor(config: VectorConfig) {
    this.config = config;
    this.cache = new Map();
  }
  
  abstract generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  abstract generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse>;
  abstract getAvailableModels(): Promise<EmbeddingModel[]>;
  
  protected getCacheKey(text: string, model: string): string {
    // Create a hash of the text and model for caching
    const content = `${model}:${text.toLowerCase().trim()}`;
    return Buffer.from(content).toString('base64').substring(0, 50);
  }
  
  protected getCachedEmbedding(text: string, model: string): number[] | null {
    const key = this.getCacheKey(text, model);
    return this.cache.get(key) || null;
  }
  
  protected setCachedEmbedding(text: string, model: string, embedding: number[]): void {
    const key = this.getCacheKey(text, model);
    this.cache.set(key, embedding);
    
    // Implement LRU cache by removing oldest entries when cache is full
    if (this.cache.size > this.config.performance.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.performance.cacheSize
    };
  }
}

export class OpenAIEmbeddingService extends EmbeddingService {
  private client: OpenAI;
  
  constructor(config: VectorConfig) {
    super(config);
    
    if (!config.embeddings.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: config.embeddings.apiKey
    });
  }
  
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.embeddings.model;
    
    // Check cache first
    const cached = this.getCachedEmbedding(request.text, model);
    if (cached) {
      return {
        embedding: cached,
        model,
        usage: { promptTokens: 0, totalTokens: 0 },
        processingTime: Date.now() - startTime
      };
    }
    
    try {
      // Truncate text if it exceeds max tokens (rough estimation)
      const truncatedText = this.truncateText(request.text, this.config.embeddings.maxTokens);
      
      const response = await this.client.embeddings.create({
        model,
        input: truncatedText,
        user: request.user
      });
      
      const embedding = response.data[0].embedding;
      
      // Cache the result
      this.setCachedEmbedding(request.text, model, embedding);
      
      return {
        embedding,
        model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens
        },
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }
  
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.embeddings.model;
    
    try {
      // Check cache for each text
      const embeddings: number[][] = [];
      const uncachedTexts: string[] = [];
      const uncachedIndexes: number[] = [];
      
      for (let i = 0; i < request.texts.length; i++) {
        const text = request.texts[i];
        const cached = this.getCachedEmbedding(text, model);
        
        if (cached) {
          embeddings[i] = cached;
        } else {
          uncachedTexts.push(this.truncateText(text, this.config.embeddings.maxTokens));
          uncachedIndexes.push(i);
        }
      }
      
      let totalUsage = { promptTokens: 0, totalTokens: 0 };
      
      // Generate embeddings for uncached texts in batches
      if (uncachedTexts.length > 0) {
        const batchSize = this.config.embeddings.batchSize;
        
        for (let i = 0; i < uncachedTexts.length; i += batchSize) {
          const batch = uncachedTexts.slice(i, i + batchSize);
          const batchIndexes = uncachedIndexes.slice(i, i + batchSize);
          
          const response = await this.client.embeddings.create({
            model,
            input: batch,
            user: request.user
          });
          
          // Store results and cache them
          response.data.forEach((item, batchIndex) => {
            const originalIndex = batchIndexes[batchIndex];
            const originalText = request.texts[originalIndex];
            
            embeddings[originalIndex] = item.embedding;
            this.setCachedEmbedding(originalText, model, item.embedding);
          });
          
          totalUsage.promptTokens += response.usage.prompt_tokens;
          totalUsage.totalTokens += response.usage.total_tokens;
          
          // Add delay between batches to respect rate limits
          if (i + batchSize < uncachedTexts.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      return {
        embeddings,
        model,
        usage: totalUsage,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error}`);
    }
  }
  
  async getAvailableModels(): Promise<EmbeddingModel[]> {
    try {
      const models = await this.client.models.list();
      
      return models.data
        .filter(model => model.id.includes('embedding'))
        .map(model => ({
          name: model.id,
          provider: 'openai',
          dimensions: this.getModelDimensions(model.id),
          maxTokens: this.getModelMaxTokens(model.id)
        }));
        
    } catch (error) {
      console.error('❌ Failed to fetch available models:', error);
      return [];
    }
  }
  
  private truncateText(text: string, maxTokens: number): string {
    // Rough estimation: 1 token ≈ 4 characters for English text
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;
  }
  
  private getModelDimensions(modelId: string): number {
    const dimensionMap: Record<string, number> = {
      'text-embedding-3-large': 3072,
      'text-embedding-3-small': 1536,
      'text-embedding-ada-002': 1536
    };
    
    return dimensionMap[modelId] || 1536;
  }
  
  private getModelMaxTokens(modelId: string): number {
    const tokenMap: Record<string, number> = {
      'text-embedding-3-large': 8191,
      'text-embedding-3-small': 8191,
      'text-embedding-ada-002': 8191
    };
    
    return tokenMap[modelId] || 8191;
  }
}

// Factory function to create embedding service
export const createEmbeddingService = (config: VectorConfig): EmbeddingService => {
  switch (config.embeddings.provider) {
    case 'openai':
      return new OpenAIEmbeddingService(config);
    case 'gemini':
      // Import Gemini service dynamically
      const { GeminiEmbeddingService } = require('./gemini-embeddings');
      return new GeminiEmbeddingService(config);
    case 'local':
      // Import Local service dynamically
      const { LocalEmbeddingService } = require('./local-embeddings');
      return new LocalEmbeddingService(config);
    default:
      throw new Error(`Unsupported embedding provider: ${config.embeddings.provider}`);
  }
};

// Factory function with automatic fallback
export const createEmbeddingServiceWithFallback = async (config: VectorConfig): Promise<EmbeddingService> => {
  try {
    // Try to create the configured service
    const service = createEmbeddingService(config);
    
    // Test the service with a simple embedding
    await service.generateEmbedding({ text: 'test' });
    
    console.log(`✅ Using ${config.embeddings.provider} embedding service`);
    return service;
    
  } catch (error) {
    console.warn(`⚠️ ${config.embeddings.provider} embedding service failed: ${error.message}`);
    console.log('🔄 Falling back to local embedding service...');
    
    // Create local fallback configuration
    const fallbackConfig = {
      ...config,
      embeddings: {
        ...config.embeddings,
        provider: 'local' as const,
        model: 'local-tfidf',
        dimensions: 384
      }
    };
    
    const { LocalEmbeddingService } = require('./local-embeddings');
    const fallbackService = new LocalEmbeddingService(fallbackConfig);
    
    console.log('✅ Using local embedding service as fallback');
    return fallbackService;
  }
};

export default EmbeddingService;