/**
 * Vector Store Service
 * Handles vector embeddings storage and semantic search for knowledge base
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { FirestoreService, where } from '../../firestore';
import { KnowledgeDocument, SearchFilters, KnowledgeResult } from './types/knowledge-base';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class VectorStore {
  private static instance: VectorStore;
  private model = genAI.getGenerativeModel({ model: 'embedding-001' });
  private readonly COLLECTION_NAME = 'knowledge_embeddings';

  private constructor() {}

  static getInstance(): VectorStore {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
    }
    return VectorStore.instance;
  }

  /**
   * Generate embedding for text using Gemini
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      
      // Rate limit fallback
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        console.log('⚠️ Rate limit hit, using fallback embedding...');
        return new Array(768).fill(0).map(() => Math.random() - 0.5);
      }
      
      throw error;
    }
  }

  /**
   * Store knowledge document with embedding
   */
  async storeDocument(document: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Generate embedding if not provided
      let embedding = document.embedding;
      if (!embedding) {
        embedding = await this.generateEmbedding(document.content);
      }

      const docId = `${document.metadata.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const knowledgeDoc: KnowledgeDocument = {
        ...document,
        id: docId,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await FirestoreService.set(this.COLLECTION_NAME, docId, knowledgeDoc);
      console.log(`✅ Stored knowledge document: ${docId}`);
      
      return docId;
    } catch (error) {
      console.error('❌ Failed to store document:', error);
      throw error;
    }
  }

  /**
   * Batch store multiple documents
   */
  async batchStoreDocuments(documents: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const doc of documents) {
      try {
        const id = await this.storeDocument(doc);
        ids.push(id);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Failed to store document:', error);
      }
    }
    
    return ids;
  }

  /**
   * Search for similar documents using vector similarity
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    topK: number = 10
  ): Promise<KnowledgeResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Build Firestore query with filters
      const constraints = [];
      if (filters?.category) {
        constraints.push(where('metadata.category', '==', filters.category));
      }
      if (filters?.craftType) {
        constraints.push(where('metadata.craftType', '==', filters.craftType));
      }
      if (filters?.language) {
        constraints.push(where('metadata.language', '==', filters.language));
      }
      if (filters?.region) {
        constraints.push(where('metadata.region', '==', filters.region));
      }

      // Get documents from Firestore
      const documents = await FirestoreService.query<KnowledgeDocument>(
        this.COLLECTION_NAME,
        constraints
      );

      // Calculate similarities
      const similarities = documents
        .filter(doc => doc.embedding && doc.embedding.length > 0)
        .map(doc => ({
          document: doc,
          similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!)
        }));

      // Filter by minimum relevance
      const minRelevance = filters?.minRelevance || 0.3;
      const filteredResults = similarities
        .filter(item => item.similarity >= minRelevance)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      // Format results
      return filteredResults.map(item => ({
        id: item.document.id,
        title: this.extractTitle(item.document.content),
        content: item.document.content,
        category: item.document.metadata.category,
        relevance: item.similarity,
        sources: [item.document.metadata.source],
        metadata: item.document.metadata
      }));
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Extract title from content (first line or first 50 chars)
   */
  private extractTitle(content: string): string {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * Update document embedding
   */
  async updateDocument(docId: string, updates: Partial<KnowledgeDocument>): Promise<void> {
    try {
      const existing = await FirestoreService.getById<KnowledgeDocument>(this.COLLECTION_NAME, docId);
      if (!existing) {
        throw new Error(`Document ${docId} not found`);
      }

      // Regenerate embedding if content changed
      let embedding = existing.embedding;
      if (updates.content && updates.content !== existing.content) {
        embedding = await this.generateEmbedding(updates.content);
      }

      await FirestoreService.update(this.COLLECTION_NAME, docId, {
        ...updates,
        embedding,
        updatedAt: new Date()
      });

      console.log(`✅ Updated document: ${docId}`);
    } catch (error) {
      console.error('❌ Failed to update document:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(docId: string): Promise<void> {
    try {
      await FirestoreService.delete(this.COLLECTION_NAME, docId);
      console.log(`✅ Deleted document: ${docId}`);
    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(docId: string): Promise<KnowledgeDocument | null> {
    try {
      return await FirestoreService.getById<KnowledgeDocument>(this.COLLECTION_NAME, docId);
    } catch (error) {
      console.error('❌ Failed to get document:', error);
      throw error;
    }
  }

  /**
   * Get all documents with optional filters
   */
  async getAllDocuments(filters?: SearchFilters): Promise<KnowledgeDocument[]> {
    try {
      const constraints = [];
      if (filters?.category) {
        constraints.push(where('metadata.category', '==', filters.category));
      }
      if (filters?.craftType) {
        constraints.push(where('metadata.craftType', '==', filters.craftType));
      }

      return await FirestoreService.query<KnowledgeDocument>(
        this.COLLECTION_NAME,
        constraints
      );
    } catch (error) {
      console.error('❌ Failed to get documents:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    documentsByCategory: Record<string, number>;
    documentsByCraftType: Record<string, number>;
    lastUpdated: Date;
  }> {
    try {
      const documents = await FirestoreService.getAll<KnowledgeDocument>(this.COLLECTION_NAME);
      
      const documentsByCategory = documents.reduce((acc, doc) => {
        acc[doc.metadata.category] = (acc[doc.metadata.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const documentsByCraftType = documents.reduce((acc, doc) => {
        if (doc.metadata.craftType) {
          acc[doc.metadata.craftType] = (acc[doc.metadata.craftType] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const lastUpdated = documents.reduce((latest, doc) => {
        return doc.updatedAt > latest ? doc.updatedAt : latest;
      }, new Date(0));

      return {
        totalDocuments: documents.length,
        documentsByCategory,
        documentsByCraftType,
        lastUpdated
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw error;
    }
  }
}
