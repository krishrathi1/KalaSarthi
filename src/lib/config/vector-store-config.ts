/**
 * Vector Store Configuration
 * Manages configuration for vector database connections and embedding settings
 */

export interface VectorStoreConfig {
    // FAISS Configuration
    faiss: {
        indexPath: string;
        dimension: number;
        indexType: 'IndexFlatL2' | 'IndexIVFFlat' | 'IndexHNSWFlat';
        nlist?: number; // for IVF indices
        efConstruction?: number; // for HNSW indices
        efSearch?: number; // for HNSW indices
    };

    // Embedding Configuration
    embedding: {
        model: string;
        maxTokens: number;
        batchSize: number;
    };

    // Search Configuration
    search: {
        defaultLimit: number;
        maxLimit: number;
        similarityThreshold: number;
    };

    // Cache Configuration
    cache: {
        enabled: boolean;
        ttlSeconds: number;
        maxSize: number;
    };
}

export const defaultVectorStoreConfig: VectorStoreConfig = {
    faiss: {
        indexPath: './data/vector-store/artisan-profiles.index',
        dimension: 384, // all-MiniLM-L6-v2 embedding dimension
        indexType: 'IndexFlatL2',
    },

    embedding: {
        model: 'all-MiniLM-L6-v2',
        maxTokens: 512,
        batchSize: 32,
    },

    search: {
        defaultLimit: 10,
        maxLimit: 100,
        similarityThreshold: 0.7,
    },

    cache: {
        enabled: true,
        ttlSeconds: 3600, // 1 hour
        maxSize: 1000,
    },
};

export function getVectorStoreConfig(): VectorStoreConfig {
    return {
        ...defaultVectorStoreConfig,
        faiss: {
            ...defaultVectorStoreConfig.faiss,
            indexPath: process.env.VECTOR_STORE_INDEX_PATH || defaultVectorStoreConfig.faiss.indexPath,
            dimension: parseInt(process.env.VECTOR_STORE_DIMENSION || '384'),
        },
        search: {
            ...defaultVectorStoreConfig.search,
            similarityThreshold: parseFloat(process.env.VECTOR_STORE_SIMILARITY_THRESHOLD || '0.7'),
        },
    };
}