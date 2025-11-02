/**
 * Embedding Service
 * Handles text embedding generation using sentence transformers and preprocessing
 */

import { HfInference } from '@huggingface/inference';
import { VectorStoreConfig } from '../config/vector-store-config';
import {
    ArtisanProfile,
    extractTextForEmbedding,
    chunkProfileText,
    PROFILE_EMBEDDING_FIELDS
} from '../database/vector-schema';

export interface EmbeddingResult {
    embedding: number[];
    text: string;
    chunks?: string[];
    processingTime: number;
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    texts: string[];
    totalProcessingTime: number;
    averageProcessingTime: number;
}

export class EmbeddingService {
    private static instance: EmbeddingService;
    private hf: HfInference;
    private config: VectorStoreConfig;
    private cache: Map<string, { embedding: number[]; timestamp: Date }> = new Map();

    private constructor(config: VectorStoreConfig) {
        this.config = config;

        // Initialize Hugging Face client
        const hfToken = process.env.HUGGINGFACE_API_TOKEN;
        if (!hfToken) {
            console.warn('HUGGINGFACE_API_TOKEN not found, using public inference API (rate limited)');
        }

        this.hf = new HfInference(hfToken);
    }

    public static getInstance(config?: VectorStoreConfig): EmbeddingService {
        if (!EmbeddingService.instance) {
            if (!config) {
                throw new Error('Config required for first initialization');
            }
            EmbeddingService.instance = new EmbeddingService(config);
        }
        return EmbeddingService.instance;
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        const startTime = Date.now();

        try {
            // Check cache first
            const cacheKey = this.getCacheKey(text);
            const cached = this.getCachedEmbedding(cacheKey);
            if (cached) {
                return {
                    embedding: cached.embedding,
                    text,
                    processingTime: Date.now() - startTime,
                };
            }

            // Preprocess text
            const processedText = this.preprocessText(text);

            // Check if text needs chunking
            const chunks = this.shouldChunkText(processedText)
                ? chunkProfileText(processedText, this.config.embedding.maxTokens)
                : [processedText];

            let finalEmbedding: number[];

            if (chunks.length === 1) {
                // Single chunk - direct embedding
                finalEmbedding = await this.generateSingleEmbedding(chunks[0]);
            } else {
                // Multiple chunks - average embeddings
                const chunkEmbeddings = await this.generateBatchEmbeddings(chunks);
                finalEmbedding = this.averageEmbeddings(chunkEmbeddings.embeddings);
            }

            // Cache the result
            this.cacheEmbedding(cacheKey, finalEmbedding);

            return {
                embedding: finalEmbedding,
                text: processedText,
                chunks: chunks.length > 1 ? chunks : undefined,
                processingTime: Date.now() - startTime,
            };

        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw new Error(`Failed to generate embedding: ${error}`);
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     */
    async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
        const startTime = Date.now();

        try {
            const batchSize = this.config.embedding.batchSize;
            const embeddings: number[][] = [];
            const processedTexts: string[] = [];

            // Process in batches
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(text => this.generateEmbedding(text))
                );

                embeddings.push(...batchResults.map(r => r.embedding));
                processedTexts.push(...batchResults.map(r => r.text));
            }

            const totalTime = Date.now() - startTime;

            return {
                embeddings,
                texts: processedTexts,
                totalProcessingTime: totalTime,
                averageProcessingTime: totalTime / texts.length,
            };

        } catch (error) {
            console.error('Batch embedding generation failed:', error);
            throw new Error(`Failed to generate batch embeddings: ${error}`);
        }
    }

    /**
     * Generate embedding for an artisan profile
     */
    async generateProfileEmbedding(profile: ArtisanProfile): Promise<EmbeddingResult> {
        try {
            // Extract text from profile using configured fields
            const profileText = extractTextForEmbedding(profile);

            // Add profile-specific preprocessing
            const enhancedText = this.enhanceProfileText(profile, profileText);

            return await this.generateEmbedding(enhancedText);

        } catch (error) {
            console.error('Profile embedding generation failed:', error);
            throw new Error(`Failed to generate profile embedding: ${error}`);
        }
    }

    /**
     * Generate embeddings for multiple profiles
     */
    async generateProfileEmbeddings(profiles: ArtisanProfile[]): Promise<BatchEmbeddingResult> {
        try {
            const profileTexts = profiles.map(profile => {
                const baseText = extractTextForEmbedding(profile);
                return this.enhanceProfileText(profile, baseText);
            });

            return await this.generateBatchEmbeddings(profileTexts);

        } catch (error) {
            console.error('Batch profile embedding generation failed:', error);
            throw new Error(`Failed to generate profile embeddings: ${error}`);
        }
    }

    /**
     * Generate embedding using Hugging Face API
     */
    private async generateSingleEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.hf.featureExtraction({
                model: this.config.embedding.model,
                inputs: text,
            });

            // Handle different response formats
            let embedding: number[];
            if (Array.isArray(response)) {
                if (Array.isArray(response[0])) {
                    // 2D array - take first row
                    embedding = response[0] as number[];
                } else {
                    // 1D array
                    embedding = response as number[];
                }
            } else {
                throw new Error('Unexpected response format from embedding API');
            }

            // Validate embedding dimension
            if (embedding.length !== this.config.faiss.dimension) {
                throw new Error(
                    `Embedding dimension mismatch: expected ${this.config.faiss.dimension}, got ${embedding.length}`
                );
            }

            return embedding;

        } catch (error) {
            console.error('Hugging Face API error:', error);

            // Fallback to local embedding if API fails
            return this.generateFallbackEmbedding(text);
        }
    }

    /**
     * Preprocess text for embedding generation
     */
    private preprocessText(text: string): string {
        return text
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            // Remove special characters but keep punctuation
            .replace(/[^\w\s.,!?-]/g, '')
            // Trim and ensure not empty
            .trim() || 'empty text';
    }

    /**
     * Enhance profile text with structured information
     */
    private enhanceProfileText(profile: ArtisanProfile, baseText: string): string {
        const enhancements: string[] = [baseText];

        // Add weighted field information
        const weightedFields = PROFILE_EMBEDDING_FIELDS
            .filter(field => field.weight > 0.8)
            .map(field => {
                const value = this.getNestedValue(profile, field.field);
                if (value) {
                    const textValue = Array.isArray(value) ? value.join(', ') : String(value);
                    const fieldName = field.field.split('.').pop() || field.field;
                    return `${fieldName}: ${textValue}`;
                }
                return null;
            })
            .filter((item): item is string => item !== null);

        enhancements.push(...weightedFields);

        // Add experience context
        const experience = profile.personalInfo.experience;
        if (experience > 0) {
            enhancements.push(`Experience: ${experience} years professional experience`);
        }

        // Add location context
        enhancements.push(`Location: Based in ${profile.personalInfo.location}`);

        return enhancements.join(' | ');
    }

    /**
     * Check if text should be chunked
     */
    private shouldChunkText(text: string): boolean {
        // Simple token estimation (rough approximation)
        const estimatedTokens = text.split(/\s+/).length * 1.3;
        return estimatedTokens > this.config.embedding.maxTokens;
    }

    /**
     * Average multiple embeddings
     */
    private averageEmbeddings(embeddings: number[][]): number[] {
        if (embeddings.length === 0) {
            throw new Error('Cannot average empty embeddings array');
        }

        const dimension = embeddings[0].length;
        const averaged = new Array(dimension).fill(0);

        for (const embedding of embeddings) {
            for (let i = 0; i < dimension; i++) {
                averaged[i] += embedding[i];
            }
        }

        // Normalize by count
        for (let i = 0; i < dimension; i++) {
            averaged[i] /= embeddings.length;
        }

        return averaged;
    }

    /**
     * Generate fallback embedding using simple hashing
     */
    private generateFallbackEmbedding(text: string): number[] {
        console.warn('Using fallback embedding generation');

        const dimension = this.config.faiss.dimension;
        const embedding = new Array(dimension);

        // Simple hash-based embedding (not ideal for production)
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        // Generate pseudo-random values based on hash
        for (let i = 0; i < dimension; i++) {
            const seed = hash + i;
            embedding[i] = (Math.sin(seed) * 10000) % 1;
        }

        return embedding;
    }

    /**
     * Cache management
     */
    private getCacheKey(text: string): string {
        // Simple hash for cache key
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    private getCachedEmbedding(key: string): { embedding: number[]; timestamp: Date } | null {
        if (!this.config.cache.enabled) {
            return null;
        }

        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        // Check if cache entry is still valid
        const age = Date.now() - cached.timestamp.getTime();
        if (age > this.config.cache.ttlSeconds * 1000) {
            this.cache.delete(key);
            return null;
        }

        return cached;
    }

    private cacheEmbedding(key: string, embedding: number[]): void {
        if (!this.config.cache.enabled) {
            return;
        }

        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.config.cache.maxSize) {
            const firstKey = this.cache.keys().next().value as string | undefined;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            embedding: [...embedding], // Copy array
            timestamp: new Date(),
        });
    }

    /**
     * Utility function to get nested object values
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * Clear embedding cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.cache.size,
            maxSize: this.config.cache.maxSize,
            hitRate: 0, // Would need to track hits/misses for accurate calculation
        };
    }
}