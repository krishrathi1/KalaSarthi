// Vector storage system for artisan products
// This is a simple implementation that can be replaced with Pinecone/Weaviate/ChromaDB

export interface ProductEmbedding {
  productId: string;
  artisanId: string;

  // Visual embeddings
  imageEmbeddings: {
    primary: number[];
    variants: number[][];
    materials: number[];
    craftsmanship: number[];
  };

  // Text embeddings
  textEmbeddings: {
    description: number[];
    story: number[];
    keywords: number[];
    categories: number[];
  };

  // Audio embeddings
  audioEmbeddings: {
    voiceDescription: number[];
    culturalContext: number[];
    pronunciation: number[];
  };

  // Metadata
  metadata: {
    title: string;
    description: string;
    price: number;
    category: string;
    tags: string[];
    culturalSignificance: string;
    artisanName: string;
    region: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ArtisanVectorStore {
  artisanId: string;
  products: ProductEmbedding[];
  profileEmbedding: number[];
  metadata: {
    name: string;
    region: string;
    craftType: string;
    experience: number;
    specializations: string[];
    totalProducts: number;
    lastActive: Date;
  };
}

class VectorStore {
  private products: Map<string, ProductEmbedding> = new Map();
  private artisans: Map<string, ArtisanVectorStore> = new Map();
  private storageKey = 'kalaMitra_vector_store';

  constructor() {
    this.loadFromStorage();
  }

  // Load data from localStorage (for demo purposes)
  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.products = new Map(Object.entries(data.products || {}));
          this.artisans = new Map(Object.entries(data.artisans || {}));
        }
      } catch (error) {
        console.error('Failed to load vector store:', error);
      }
    }
  }

  // Save data to localStorage
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          products: Object.fromEntries(this.products),
          artisans: Object.fromEntries(this.artisans),
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save vector store:', error);
      }
    }
  }

  // Store product embedding
  async storeProduct(product: ProductEmbedding): Promise<void> {
    this.products.set(product.productId, {
      ...product,
      metadata: {
        ...product.metadata,
        updatedAt: new Date(),
      },
    });

    // Update artisan's product list
    const artisan = this.artisans.get(product.artisanId);
    if (artisan) {
      const existingProductIndex = artisan.products.findIndex(p => p.productId === product.productId);
      if (existingProductIndex >= 0) {
        artisan.products[existingProductIndex] = product;
      } else {
        artisan.products.push(product);
      }
      artisan.metadata.totalProducts = artisan.products.length;
      artisan.metadata.lastActive = new Date();
    } else {
      // Create new artisan entry
      this.artisans.set(product.artisanId, {
        artisanId: product.artisanId,
        products: [product],
        profileEmbedding: [], // Will be generated from products
        metadata: {
          name: product.metadata.artisanName,
          region: product.metadata.region,
          craftType: product.metadata.category,
          experience: 0, // Will be updated from profile
          specializations: [product.metadata.category],
          totalProducts: 1,
          lastActive: new Date(),
        },
      });
    }

    this.saveToStorage();
  }

  // Search similar products
  async findSimilarProducts(queryEmbedding: number[], limit: number = 10): Promise<ProductEmbedding[]> {
    const products = Array.from(this.products.values());

    // Simple cosine similarity (in production, use optimized vector search)
    const similarities = products.map(product => {
      const similarity = this.cosineSimilarity(queryEmbedding, product.imageEmbeddings.primary);
      return { product, similarity };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit).map(item => item.product);
  }

  // Get artisan's products
  async getArtisanProducts(artisanId: string): Promise<ProductEmbedding[]> {
    const artisan = this.artisans.get(artisanId);
    return artisan ? artisan.products : [];
  }

  // Get all products (for marketplace)
  async getAllProducts(): Promise<ProductEmbedding[]> {
    return Array.from(this.products.values());
  }

  // Search products by text
  async searchByText(query: string, limit: number = 20): Promise<ProductEmbedding[]> {
    const products = Array.from(this.products.values());
    const queryLower = query.toLowerCase();

    return products
      .filter(product =>
        product.metadata.title.toLowerCase().includes(queryLower) ||
        product.metadata.description.toLowerCase().includes(queryLower) ||
        product.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);
  }

  // Generate mock embeddings (replace with actual embedding generation)
  generateImageEmbedding(imageData: string): number[] {
    // Mock embedding generation - in production, use actual ML models
    const hash = this.simpleHash(imageData);
    const embedding: number[] = [];
    for (let i = 0; i < 512; i++) {
      embedding.push((hash * (i + 1)) % 1000 / 1000); // Normalized values
    }
    return embedding;
  }

  generateTextEmbedding(text: string): number[] {
    // Mock text embedding
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    for (let i = 0; i < 384; i++) {
      embedding.push((hash * (i + 1)) % 1000 / 1000);
    }
    return embedding;
  }

  generateAudioEmbedding(audioData: Blob): number[] {
    // Mock audio embedding
    const hash = this.simpleHash(audioData.size.toString());
    const embedding: number[] = [];
    for (let i = 0; i < 256; i++) {
      embedding.push((hash * (i + 1)) % 1000 / 1000);
    }
    return embedding;
  }

  // Simple hash function for mock embeddings
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Cosine similarity calculation
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Clear all data (for testing)
  async clear(): Promise<void> {
    this.products.clear();
    this.artisans.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

// Export singleton instance
export const vectorStore = new VectorStore();
