/**
 * Local Embedding Service
 * Fallback embedding service using simple text vectorization when APIs are unavailable
 */

import { VectorConfig } from './config.js';
import { EmbeddingService, EmbeddingRequest, EmbeddingResponse, BatchEmbeddingRequest, BatchEmbeddingResponse, EmbeddingModel } from './embeddings.js';

export class LocalEmbeddingService extends EmbeddingService {
  private vocabulary: Map<string, number>;
  private dimensions: number;
  
  constructor(config: VectorConfig) {
    super(config);
    this.dimensions = 384; // Smaller dimension for local embeddings
    this.vocabulary = new Map();
    this.initializeVocabulary();
  }
  
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || 'local-tfidf';
    
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
      console.log(`🔄 Generating local embedding for: "${request.text.substring(0, 50)}..."`);
      
      // Generate TF-IDF style embedding
      const embedding = this.generateTFIDFEmbedding(request.text);
      
      // Cache the result
      this.setCachedEmbedding(request.text, model, embedding);
      
      console.log(`✅ Local embedding generated: ${embedding.length} dimensions`);
      
      return {
        embedding,
        model,
        usage: {
          promptTokens: this.estimateTokens(request.text),
          totalTokens: this.estimateTokens(request.text)
        },
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate local embedding:', error);
      throw new Error(`Local embedding generation failed: ${error}`);
    }
  }
  
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const model = request.model || 'local-tfidf';
    
    try {
      console.log(`🔄 Generating ${request.texts.length} local embeddings in batch`);
      
      const embeddings: number[][] = [];
      let totalTokens = 0;
      
      for (const text of request.texts) {
        const cached = this.getCachedEmbedding(text, model);
        
        if (cached) {
          embeddings.push(cached);
        } else {
          const embedding = this.generateTFIDFEmbedding(text);
          embeddings.push(embedding);
          this.setCachedEmbedding(text, model, embedding);
        }
        
        totalTokens += this.estimateTokens(text);
      }
      
      console.log(`✅ Generated ${embeddings.length} local embeddings`);
      
      return {
        embeddings,
        model,
        usage: {
          promptTokens: totalTokens,
          totalTokens
        },
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate batch local embeddings:', error);
      throw new Error(`Local batch embedding generation failed: ${error}`);
    }
  }
  
  async getAvailableModels(): Promise<EmbeddingModel[]> {
    return [
      {
        name: 'local-tfidf',
        provider: 'local',
        dimensions: this.dimensions,
        maxTokens: 1000
      }
    ];
  }
  
  private initializeVocabulary(): void {
    // Initialize with craft-specific vocabulary
    const craftTerms = [
      // Materials
      'clay', 'ceramic', 'porcelain', 'wood', 'oak', 'pine', 'metal', 'silver', 'gold', 'copper',
      'fabric', 'cotton', 'silk', 'wool', 'leather', 'hide', 'glass', 'stone', 'marble',
      
      // Techniques
      'handmade', 'handcrafted', 'carved', 'molded', 'woven', 'embroidered', 'painted', 'glazed',
      'polished', 'etched', 'forged', 'cast', 'thrown', 'built', 'assembled',
      
      // Products
      'bowl', 'vase', 'pot', 'plate', 'cup', 'table', 'chair', 'cabinet', 'box', 'frame',
      'necklace', 'bracelet', 'ring', 'earrings', 'bag', 'purse', 'wallet', 'belt', 'shoes',
      'scarf', 'blanket', 'cushion', 'rug', 'tapestry',
      
      // Styles
      'traditional', 'modern', 'contemporary', 'vintage', 'rustic', 'elegant', 'minimalist',
      'ornate', 'decorative', 'functional', 'artistic', 'cultural', 'heritage',
      
      // Crafts
      'pottery', 'ceramics', 'woodworking', 'carpentry', 'jewelry', 'metalwork', 'textiles',
      'weaving', 'embroidery', 'leatherwork', 'glasswork', 'stonework', 'sculpture', 'painting',
      
      // Qualities
      'unique', 'custom', 'bespoke', 'artisan', 'craft', 'quality', 'durable', 'beautiful',
      'authentic', 'original', 'creative', 'skilled', 'experienced', 'professional'
    ];
    
    craftTerms.forEach((term, index) => {
      this.vocabulary.set(term.toLowerCase(), index);
    });
    
    console.log(`📚 Initialized local vocabulary with ${this.vocabulary.size} craft terms`);
  }
  
  private generateTFIDFEmbedding(text: string): number[] {
    const words = this.tokenize(text);
    const embedding = new Array(this.dimensions).fill(0);
    
    // Calculate term frequencies
    const termFreq = new Map<string, number>();
    words.forEach(word => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });
    
    // Generate embedding based on vocabulary matches and semantic features
    termFreq.forEach((freq, word) => {
      const vocabIndex = this.vocabulary.get(word);
      
      if (vocabIndex !== undefined) {
        // Direct vocabulary match
        const embeddingIndex = vocabIndex % this.dimensions;
        embedding[embeddingIndex] += freq * 2; // Higher weight for vocabulary matches
      } else {
        // Hash-based embedding for unknown words
        const hash = this.simpleHash(word);
        const embeddingIndex = hash % this.dimensions;
        embedding[embeddingIndex] += freq;
      }
    });
    
    // Add semantic features based on text characteristics
    this.addSemanticFeatures(embedding, text, words);
    
    // Normalize the embedding
    return this.normalizeVector(embedding);
  }
  
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private addSemanticFeatures(embedding: number[], text: string, words: string[]): void {
    const textLower = text.toLowerCase();
    
    // Material indicators
    if (this.containsAny(textLower, ['clay', 'ceramic', 'pottery'])) {
      embedding[0] += 1;
    }
    if (this.containsAny(textLower, ['wood', 'timber', 'oak', 'pine'])) {
      embedding[1] += 1;
    }
    if (this.containsAny(textLower, ['metal', 'silver', 'gold', 'copper'])) {
      embedding[2] += 1;
    }
    if (this.containsAny(textLower, ['fabric', 'textile', 'cotton', 'silk'])) {
      embedding[3] += 1;
    }
    
    // Technique indicators
    if (this.containsAny(textLower, ['handmade', 'handcrafted', 'artisan'])) {
      embedding[10] += 1;
    }
    if (this.containsAny(textLower, ['carved', 'carving', 'sculpted'])) {
      embedding[11] += 1;
    }
    if (this.containsAny(textLower, ['woven', 'weaving', 'textile'])) {
      embedding[12] += 1;
    }
    
    // Style indicators
    if (this.containsAny(textLower, ['traditional', 'heritage', 'cultural'])) {
      embedding[20] += 1;
    }
    if (this.containsAny(textLower, ['modern', 'contemporary', 'current'])) {
      embedding[21] += 1;
    }
    if (this.containsAny(textLower, ['rustic', 'rural', 'country'])) {
      embedding[22] += 1;
    }
    
    // Quality indicators
    if (this.containsAny(textLower, ['unique', 'custom', 'bespoke'])) {
      embedding[30] += 1;
    }
    if (this.containsAny(textLower, ['quality', 'premium', 'fine'])) {
      embedding[31] += 1;
    }
    
    // Text length feature
    embedding[50] = Math.min(words.length / 10, 1); // Normalized word count
    
    // Craft type features
    const craftTypes = ['pottery', 'woodworking', 'jewelry', 'textiles', 'leather'];
    craftTypes.forEach((craft, index) => {
      if (textLower.includes(craft)) {
        embedding[60 + index] += 1;
      }
    });
  }
  
  private containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }
  
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return vector;
    }
    
    return vector.map(val => val / magnitude);
  }
  
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export default LocalEmbeddingService;