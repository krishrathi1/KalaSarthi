/**
 * Vector Database Interface
 * Abstraction layer for different vector database providers
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { VectorConfig } from './config';

export interface VectorSearchQuery {
  vector: number[];
  topK: number;
  threshold?: number;
  filters?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

export interface VectorUpsertData {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface VectorIndex {
  name: string;
  dimensions: number;
  metric: string;
  totalVectors: number;
  lastUpdated: Date;
}

export abstract class VectorDatabase {
  protected config: VectorConfig;
  
  constructor(config: VectorConfig) {
    this.config = config;
  }
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract createIndex(name: string, dimensions: number, metric?: string): Promise<void>;
  abstract deleteIndex(name: string): Promise<void>;
  abstract upsertVectors(indexName: string, vectors: VectorUpsertData[]): Promise<void>;
  abstract searchSimilar(indexName: string, query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  abstract deleteVectors(indexName: string, ids: string[]): Promise<void>;
  abstract getIndexStats(indexName: string): Promise<VectorIndex | null>;
  abstract listIndexes(): Promise<string[]>;
}

export class PineconeDatabase extends VectorDatabase {
  private client: Pinecone | null = null;
  private connected: boolean = false;
  
  async connect(): Promise<void> {
    try {
      if (!this.config.vectorDB.apiKey) {
        throw new Error('Pinecone API key is required');
      }
      
      this.client = new Pinecone({
        apiKey: this.config.vectorDB.apiKey
      });
      
      // Test connection by listing indexes
      await this.client.listIndexes();
      this.connected = true;
      
      console.log('✅ Connected to Pinecone successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Pinecone:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
    console.log('🔌 Disconnected from Pinecone');
  }
  
  async createIndex(name: string, dimensions: number, metric: string = 'cosine'): Promise<void> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      // Check if index already exists
      const existingIndexes = await this.client.listIndexes();
      const indexExists = existingIndexes.indexes?.some(index => index.name === name);
      
      if (indexExists) {
        console.log(`📋 Index '${name}' already exists`);
        return;
      }
      
      await this.client.createIndex({
        name,
        dimension: dimensions,
        metric: metric as any,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      // Wait for index to be ready
      console.log(`⏳ Creating index '${name}'...`);
      await this.waitForIndexReady(name);
      console.log(`✅ Index '${name}' created successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to create index '${name}':`, error);
      throw error;
    }
  }
  
  async deleteIndex(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      await this.client.deleteIndex(name);
      console.log(`🗑️ Index '${name}' deleted successfully`);
    } catch (error) {
      console.error(`❌ Failed to delete index '${name}':`, error);
      throw error;
    }
  }
  
  async upsertVectors(indexName: string, vectors: VectorUpsertData[]): Promise<void> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      const index = this.client.index(indexName);
      
      // Process in batches to avoid rate limits
      const batchSize = this.config.embeddings.batchSize;
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        
        await index.upsert(batch.map(vector => ({
          id: vector.id,
          values: vector.values,
          metadata: vector.metadata || {}
        })));
        
        console.log(`📤 Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
        
        // Add small delay between batches
        if (i + batchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Upserted ${vectors.length} vectors to index '${indexName}'`);
      
    } catch (error) {
      console.error(`❌ Failed to upsert vectors to index '${indexName}':`, error);
      throw error;
    }
  }
  
  async searchSimilar(indexName: string, query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      const index = this.client.index(indexName);
      
      const searchRequest: any = {
        vector: query.vector,
        topK: query.topK,
        includeMetadata: query.includeMetadata ?? true,
        includeValues: query.includeValues ?? false
      };
      
      // Add filters if provided
      if (query.filters && Object.keys(query.filters).length > 0) {
        searchRequest.filter = query.filters;
      }
      
      const response = await index.query(searchRequest);
      
      return response.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        values: match.values,
        metadata: match.metadata
      })) || [];
      
    } catch (error) {
      console.error(`❌ Failed to search in index '${indexName}':`, error);
      throw error;
    }
  }
  
  async deleteVectors(indexName: string, ids: string[]): Promise<void> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      const index = this.client.index(indexName);
      await index.deleteMany(ids);
      
      console.log(`🗑️ Deleted ${ids.length} vectors from index '${indexName}'`);
      
    } catch (error) {
      console.error(`❌ Failed to delete vectors from index '${indexName}':`, error);
      throw error;
    }
  }
  
  async getIndexStats(indexName: string): Promise<VectorIndex | null> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      const indexDescription = await this.client.describeIndex(indexName);
      const indexStats = await this.client.index(indexName).describeIndexStats();
      
      return {
        name: indexName,
        dimensions: indexDescription.dimension || 0,
        metric: indexDescription.metric || 'cosine',
        totalVectors: indexStats.totalVectorCount || 0,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Failed to get stats for index '${indexName}':`, error);
      return null;
    }
  }
  
  async listIndexes(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to Pinecone');
    
    try {
      const response = await this.client.listIndexes();
      return response.indexes?.map(index => index.name) || [];
    } catch (error) {
      console.error('❌ Failed to list indexes:', error);
      throw error;
    }
  }
  
  private async waitForIndexReady(indexName: string, maxWaitTime: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const description = await this.client!.describeIndex(indexName);
        if (description.status?.ready) {
          return;
        }
      } catch (error) {
        // Index might not be available yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Index '${indexName}' did not become ready within ${maxWaitTime}ms`);
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

// Factory function to create vector database instance
export const createVectorDatabase = (config: VectorConfig): VectorDatabase => {
  switch (config.vectorDB.provider) {
    case 'pinecone':
      return new PineconeDatabase(config);
    default:
      throw new Error(`Unsupported vector database provider: ${config.vectorDB.provider}`);
  }
};

export default VectorDatabase;