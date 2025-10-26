/**
 * Vector Database Connection Manager
 * Handles FAISS vector database connections, indexing, and operations
 */

import { VectorStoreConfig } from '../config/vector-store-config';

// Only import faiss-node on server-side
let faiss: any = null;
let fs: any = null;
let path: any = null;

if (typeof window === 'undefined') {
    try {
        faiss = require('faiss-node');
        fs = require('fs');
        path = require('path');
    } catch (error) {
        console.warn('Failed to load server-side dependencies:', error);
    }
}

export interface VectorSearchResult {
    id: string;
    score: number;
    metadata: Record<string, any>;
}

export interface VectorDocument {
    id: string;
    embedding: number[];
    metadata: Record<string, any>;
}

export class VectorDatabase {
    private index: any | null = null;
    private idToMetadata: Map<string, Record<string, any>> = new Map();
    private idToIndex: Map<string, number> = new Map();
    private indexToId: Map<number, string> = new Map();
    private nextIndex: number = 0;
    private config: VectorStoreConfig;
    private isInitialized: boolean = false;
    private isServerSide: boolean;

    constructor(config: VectorStoreConfig) {
        this.config = config;
        this.isServerSide = typeof window === 'undefined';
    }

    /**
     * Initialize the vector database
     */
    async initialize(): Promise<void> {
        if (!this.isServerSide || !faiss || !fs || !path) {
            console.warn('Vector database can only be initialized on server-side');
            return;
        }

        try {
            // Ensure directory exists
            const indexDir = path.dirname(this.config.faiss.indexPath);
            if (!fs.existsSync(indexDir)) {
                fs.mkdirSync(indexDir, { recursive: true });
            }

            // Try to load existing index
            if (fs.existsSync(this.config.faiss.indexPath)) {
                await this.loadIndex();
            } else {
                await this.createNewIndex();
            }

            this.isInitialized = true;
            console.log('Vector database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize vector database:', error);
            throw new Error(`Vector database initialization failed: ${error}`);
        }
    }

    /**
     * Create a new FAISS index
     */
    private async createNewIndex(): Promise<void> {
        const { dimension, indexType } = this.config.faiss;

        switch (indexType) {
            case 'IndexFlatL2':
                this.index = new faiss.IndexFlatL2(dimension);
                break;
            case 'IndexIVFFlat':
                const quantizer = new faiss.IndexFlatL2(dimension);
                const nlist = this.config.faiss.nlist || 100;
                this.index = new faiss.IndexIVFFlat(quantizer, dimension, nlist);
                break;
            case 'IndexHNSWFlat':
                const efConstruction = this.config.faiss.efConstruction || 200;
                this.index = new faiss.IndexHNSWFlat(dimension, 32);
                // Note: FAISS-node might not support all HNSW parameters
                break;
            default:
                throw new Error(`Unsupported index type: ${indexType}`);
        }

        console.log(`Created new ${indexType} index with dimension ${dimension}`);
    }

    /**
     * Load existing index from disk
     */
    private async loadIndex(): Promise<void> {
        try {
            this.index = faiss.read_index(this.config.faiss.indexPath);

            // Load metadata
            const metadataPath = this.config.faiss.indexPath + '.metadata';
            if (fs.existsSync(metadataPath)) {
                const metadataJson = fs.readFileSync(metadataPath, 'utf8');
                const metadata = JSON.parse(metadataJson);

                this.idToMetadata = new Map(metadata.idToMetadata);
                this.idToIndex = new Map(metadata.idToIndex);
                this.indexToId = new Map(metadata.indexToId.map(([k, v]: [string, string]) => [parseInt(k), v]));
                this.nextIndex = metadata.nextIndex || 0;
            }

            console.log(`Loaded existing index with ${this.index.ntotal()} vectors`);
        } catch (error) {
            console.error('Failed to load existing index:', error);
            await this.createNewIndex();
        }
    }

    /**
     * Save index and metadata to disk
     */
    async saveIndex(): Promise<void> {
        if (!this.index) {
            throw new Error('Index not initialized');
        }

        try {
            // Save FAISS index
            faiss.write_index(this.index, this.config.faiss.indexPath);

            // Save metadata
            const metadata = {
                idToMetadata: Array.from(this.idToMetadata.entries()),
                idToIndex: Array.from(this.idToIndex.entries()),
                indexToId: Array.from(this.indexToId.entries()),
                nextIndex: this.nextIndex,
            };

            const metadataPath = this.config.faiss.indexPath + '.metadata';
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

            console.log('Index and metadata saved successfully');
        } catch (error) {
            console.error('Failed to save index:', error);
            throw error;
        }
    }

    /**
     * Add vectors to the index
     */
    async addVectors(documents: VectorDocument[]): Promise<void> {
        if (!this.isInitialized || !this.index) {
            throw new Error('Vector database not initialized');
        }

        try {
            const embeddings: number[][] = [];
            const ids: string[] = [];

            for (const doc of documents) {
                if (doc.embedding.length !== this.config.faiss.dimension) {
                    throw new Error(`Embedding dimension mismatch: expected ${this.config.faiss.dimension}, got ${doc.embedding.length}`);
                }

                // Check if document already exists
                if (this.idToIndex.has(doc.id)) {
                    console.warn(`Document ${doc.id} already exists, skipping`);
                    continue;
                }

                embeddings.push(doc.embedding);
                ids.push(doc.id);

                // Store metadata and mappings
                this.idToMetadata.set(doc.id, doc.metadata);
                this.idToIndex.set(doc.id, this.nextIndex);
                this.indexToId.set(this.nextIndex, doc.id);
                this.nextIndex++;
            }

            if (embeddings.length > 0) {
                // Convert to Float32Array for FAISS
                const flatEmbeddings = new Float32Array(embeddings.flat());
                this.index.add(flatEmbeddings);

                console.log(`Added ${embeddings.length} vectors to index`);
            }
        } catch (error) {
            console.error('Failed to add vectors:', error);
            throw error;
        }
    }

    /**
     * Search for similar vectors
     */
    async search(queryEmbedding: number[], k: number = 10): Promise<VectorSearchResult[]> {
        if (!this.isInitialized || !this.index) {
            throw new Error('Vector database not initialized');
        }

        try {
            if (queryEmbedding.length !== this.config.faiss.dimension) {
                throw new Error(`Query embedding dimension mismatch: expected ${this.config.faiss.dimension}, got ${queryEmbedding.length}`);
            }

            // Ensure k doesn't exceed available vectors
            const actualK = Math.min(k, this.index.ntotal());
            if (actualK === 0) {
                return [];
            }

            // Convert to Float32Array for FAISS
            const queryVector = new Float32Array(queryEmbedding);

            // Perform search
            const results = this.index.search(queryVector, actualK);

            // Convert results to our format
            const searchResults: VectorSearchResult[] = [];

            for (let i = 0; i < results.labels.length; i++) {
                const indexId = results.labels[i];
                const score = results.distances[i];

                // Skip invalid results
                if (indexId === -1) continue;

                const documentId = this.indexToId.get(indexId);
                if (!documentId) continue;

                const metadata = this.idToMetadata.get(documentId);
                if (!metadata) continue;

                // Convert distance to similarity score (lower distance = higher similarity)
                // For L2 distance, we can use 1 / (1 + distance)
                const similarityScore = 1 / (1 + score);

                searchResults.push({
                    id: documentId,
                    score: similarityScore,
                    metadata,
                });
            }

            // Filter by similarity threshold
            return searchResults.filter(result =>
                result.score >= this.config.search.similarityThreshold
            );

        } catch (error) {
            console.error('Vector search failed:', error);
            throw error;
        }
    }

    /**
     * Remove a document from the index
     */
    async removeDocument(documentId: string): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('Vector database not initialized');
        }

        try {
            if (!this.idToIndex.has(documentId)) {
                return false;
            }

            // Note: FAISS doesn't support direct removal of vectors
            // In a production system, you might need to rebuild the index
            // For now, we'll just remove from our metadata
            const indexId = this.idToIndex.get(documentId)!;

            this.idToMetadata.delete(documentId);
            this.idToIndex.delete(documentId);
            this.indexToId.delete(indexId);

            console.log(`Removed document ${documentId} from metadata`);
            return true;
        } catch (error) {
            console.error('Failed to remove document:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    getStats(): { totalVectors: number; dimension: number; indexType: string } {
        return {
            totalVectors: this.index?.ntotal() || 0,
            dimension: this.config.faiss.dimension,
            indexType: this.config.faiss.indexType,
        };
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        if (this.index) {
            await this.saveIndex();
            this.index = null;
            this.isInitialized = false;
            console.log('Vector database closed');
        }
    }
}