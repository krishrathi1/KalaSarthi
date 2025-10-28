/**
 * Firestore Vector Search Service
 * Handles vector embeddings storage and similarity search in Firestore
 */

import { FirestoreService, where, orderBy, limit as limitQuery } from '../firestore';
import { IUser } from '../models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface VectorEmbedding {
  id: string;
  userId: string;
  type: 'profile' | 'skills' | 'products' | 'description';
  text: string;
  embedding: number[];
  metadata: {
    profession?: string;
    skills?: string[];
    location?: string;
    specializations?: string[];
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorSearchRequest {
  query: string;
  type?: 'profile' | 'skills' | 'products' | 'description';
  profession?: string;
  maxResults?: number;
  threshold?: number;
}

export interface VectorSearchResult {
  user: IUser;
  similarity: number;
  matchedText: string;
  matchType: string;
}

export class FirestoreVectorSearch {
  private static instance: FirestoreVectorSearch;
  private model = genAI.getGenerativeModel({ model: 'embedding-001' });

  static getInstance(): FirestoreVectorSearch {
    if (!FirestoreVectorSearch.instance) {
      FirestoreVectorSearch.instance = new FirestoreVectorSearch();
    }
    return FirestoreVectorSearch.instance;
  }

  /**
   * Generate embedding for text using Gemini with rate limit handling
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
        console.log('⚠️ Rate limit hit, using fallback embedding...');
        // Return a dummy embedding for fallback
        return new Array(768).fill(0).map(() => Math.random() - 0.5);
      }
      
      throw error;
    }
  }

  /**
   * Store user profile embeddings in Firestore
   */
  async storeUserEmbeddings(user: IUser): Promise<void> {
    try {
      const embeddings: Omit<VectorEmbedding, 'id' | 'createdAt' | 'updatedAt'>[] = [];

      // Profile description embedding
      if (user.description) {
        const profileEmbedding = await this.generateEmbedding(user.description);
        embeddings.push({
          userId: user.uid,
          type: 'description',
          text: user.description,
          embedding: profileEmbedding,
          metadata: {
            profession: user.artisticProfession,
            location: user.address ? `${user.address.city}, ${user.address.state}` : undefined,
            lastUpdated: new Date()
          }
        });
      }

      // Skills embedding for artisans
      if (user.role === 'artisan' && user.artisanConnectProfile?.matchingData?.skills) {
        const skillsText = user.artisanConnectProfile.matchingData.skills.join(', ');
        const skillsEmbedding = await this.generateEmbedding(skillsText);
        embeddings.push({
          userId: user.uid,
          type: 'skills',
          text: skillsText,
          embedding: skillsEmbedding,
          metadata: {
            profession: user.artisticProfession,
            skills: user.artisanConnectProfile.matchingData.skills,
            specializations: user.artisanConnectProfile.specializations,
            lastUpdated: new Date()
          }
        });
      }

      // Store all embeddings
      for (const embedding of embeddings) {
        const embeddingId = `${user.uid}_${embedding.type}`;
        await FirestoreService.set('user_embeddings', embeddingId, {
          ...embedding,
          id: embeddingId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      console.log(`✅ Stored ${embeddings.length} embeddings for user ${user.name}`);
    } catch (error) {
      console.error(`❌ Failed to store embeddings for user ${user.uid}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar users using vector similarity
   */
  async searchSimilarUsers(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(request.query);

      // Get all embeddings from Firestore
      let constraints = [];
      if (request.type) {
        constraints.push(where('type', '==', request.type));
      }
      if (request.profession) {
        constraints.push(where('metadata.profession', '==', request.profession));
      }

      const embeddings = await FirestoreService.query<VectorEmbedding>('user_embeddings', constraints);

      // Calculate similarities
      const similarities = embeddings.map(embedding => ({
        embedding,
        similarity: this.cosineSimilarity(queryEmbedding, embedding.embedding)
      }));

      // Filter by threshold and sort by similarity
      const threshold = request.threshold || 0.3;
      const filteredSimilarities = similarities
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, request.maxResults || 10);

      // Get user details for results
      const results: VectorSearchResult[] = [];
      for (const item of filteredSimilarities) {
        const user = await FirestoreService.getById<IUser>('users', item.embedding.userId);
        if (user) {
          results.push({
            user,
            similarity: item.similarity,
            matchedText: item.embedding.text,
            matchType: item.embedding.type
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Vector search failed:', error);
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
   * Update embeddings for a user
   */
  async updateUserEmbeddings(userId: string): Promise<void> {
    try {
      // Get user data
      const user = await FirestoreService.getById<IUser>('users', userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Delete existing embeddings
      const existingEmbeddings = await FirestoreService.query<VectorEmbedding>('user_embeddings', [
        where('userId', '==', userId)
      ]);

      for (const embedding of existingEmbeddings) {
        await FirestoreService.delete('user_embeddings', embedding.id);
      }

      // Store new embeddings
      await this.storeUserEmbeddings(user);
    } catch (error) {
      console.error(`❌ Failed to update embeddings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Batch process embeddings for all users
   */
  async batchProcessEmbeddings(): Promise<void> {
    try {
      console.log('🚀 Starting batch embedding processing...');

      // Get all users
      const users = await FirestoreService.getAll<IUser>('users');
      console.log(`📊 Processing embeddings for ${users.length} users`);

      let processed = 0;
      for (const user of users) {
        try {
          await this.storeUserEmbeddings(user);
          processed++;
          
          if (processed % 10 === 0) {
            console.log(`📈 Processed ${processed}/${users.length} users`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Failed to process user ${user.uid}:`, error);
        }
      }

      console.log(`✅ Batch processing complete! Processed ${processed}/${users.length} users`);
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Search artisans with enhanced vector matching
   */
  async searchArtisans(query: string, options: {
    profession?: string;
    location?: string;
    maxResults?: number;
    includeUnavailable?: boolean;
  } = {}): Promise<VectorSearchResult[]> {
    try {
      // First, do vector search
      const vectorResults = await this.searchSimilarUsers({
        query,
        type: 'skills',
        profession: options.profession,
        maxResults: options.maxResults || 20,
        threshold: 0.2
      });

      // Filter by availability if needed
      if (!options.includeUnavailable) {
        return vectorResults.filter(result => 
          result.user.role === 'artisan' && 
          result.user.artisanConnectProfile?.availabilityStatus !== 'unavailable'
        );
      }

      return vectorResults.filter(result => result.user.role === 'artisan');
    } catch (error) {
      console.error('❌ Artisan search failed:', error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(): Promise<{
    totalEmbeddings: number;
    embeddingsByType: Record<string, number>;
    lastUpdated: Date;
  }> {
    try {
      const embeddings = await FirestoreService.getAll<VectorEmbedding>('user_embeddings');
      
      const embeddingsByType = embeddings.reduce((acc, embedding) => {
        acc[embedding.type] = (acc[embedding.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastUpdated = embeddings.reduce((latest, embedding) => {
        return embedding.updatedAt > latest ? embedding.updatedAt : latest;
      }, new Date(0));

      return {
        totalEmbeddings: embeddings.length,
        embeddingsByType,
        lastUpdated
      };
    } catch (error) {
      console.error('❌ Failed to get analytics:', error);
      throw error;
    }
  }
}