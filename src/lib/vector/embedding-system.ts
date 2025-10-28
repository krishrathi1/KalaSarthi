/**
 * Vector Embedding System
 * Multi-model embedding generation with fusion capabilities
 */

import { IUser } from '../models/User';
import { VectorConfig } from './config';
import { EmbeddingService, createEmbeddingService } from './embeddings';
import { VectorUtils } from './utils';
import crypto from 'crypto';

export interface ArtisanEmbedding {
  artisanId: string;
  profileVector: number[];
  skillsVector: number[];
  portfolioVector: number[];
  compositeVector: number[];
  metadata: {
    modelVersion: string;
    generatedAt: Date;
    profileHash: string;
    dimensions: number;
    confidence: number;
  };
}

export interface QueryEmbedding {
  queryText: string;
  queryVector: number[];
  extractedConcepts: string[];
  confidence: number;
  processingTime: number;
  expandedQuery?: string;
}

export interface EmbeddingModelConfig {
  name: string;
  provider: 'openai' | 'huggingface' | 'local';
  weight: number;
  dimensions: number;
  specialization: 'general' | 'skills' | 'portfolio' | 'semantic';
}

export class VectorEmbeddingSystem {
  private config: VectorConfig;
  private embeddingServices: Map<string, EmbeddingService>;
  private modelConfigs: EmbeddingModelConfig[];
  private cache: Map<string, number[]>;
  
  constructor(config: VectorConfig) {
    this.config = config;
    this.embeddingServices = new Map();
    this.cache = new Map();
    this.modelConfigs = this.getDefaultModelConfigs();
    
    this.initializeModels();
  }
  
  private getDefaultModelConfigs(): EmbeddingModelConfig[] {
    return [
      {
        name: 'text-embedding-3-large',
        provider: 'openai',
        weight: 0.6,
        dimensions: 3072,
        specialization: 'general'
      },
      {
        name: 'text-embedding-3-small',
        provider: 'openai',
        weight: 0.4,
        dimensions: 1536,
        specialization: 'skills'
      }
    ];
  }
  
  private initializeModels(): void {
    try {
      // Initialize primary embedding service
      const primaryService = createEmbeddingService(this.config);
      this.embeddingServices.set('primary', primaryService);
      
      console.log('✅ Initialized embedding models successfully');
    } catch (error) {
      console.error('❌ Failed to initialize embedding models:', error);
      throw error;
    }
  }
  
  /**
   * Generate comprehensive embedding for an artisan profile
   */
  async generateArtisanEmbedding(artisan: IUser): Promise<ArtisanEmbedding> {
    try {
      const startTime = Date.now();
      
      // Extract different types of text content
      const profileText = this.extractProfileText(artisan);
      const skillsText = this.extractSkillsText(artisan);
      const portfolioText = this.extractPortfolioText(artisan);
      
      console.log(`🔄 Generating embeddings for artisan: ${artisan.name}`);
      
      // Generate embeddings for different content types
      const [profileVector, skillsVector, portfolioVector] = await Promise.all([
        this.embedText(profileText, 'general'),
        this.embedText(skillsText, 'skills'),
        this.embedText(portfolioText, 'portfolio')
      ]);
      
      // Create composite embedding using weighted fusion
      const compositeVector = this.fuseVectors([
        { vector: profileVector, weight: 0.4 },
        { vector: skillsVector, weight: 0.4 },
        { vector: portfolioVector, weight: 0.2 }
      ]);
      
      // Calculate confidence based on content richness
      const confidence = this.calculateProfileConfidence(artisan, profileText, skillsText, portfolioText);
      
      const embedding: ArtisanEmbedding = {
        artisanId: artisan.uid,
        profileVector,
        skillsVector,
        portfolioVector,
        compositeVector,
        metadata: {
          modelVersion: this.getModelVersion(),
          generatedAt: new Date(),
          profileHash: this.hashProfile(artisan),
          dimensions: compositeVector.length,
          confidence
        }
      };
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Generated embedding for ${artisan.name} in ${processingTime}ms (confidence: ${(confidence * 100).toFixed(1)}%)`);
      
      return embedding;
      
    } catch (error) {
      console.error(`❌ Failed to generate embedding for artisan ${artisan.uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate embedding for a search query
   */
  async generateQueryEmbedding(query: string): Promise<QueryEmbedding> {
    try {
      const startTime = Date.now();
      
      // Preprocess and expand the query
      const expandedQuery = await this.expandQuery(query);
      const extractedConcepts = this.extractConcepts(expandedQuery);
      
      // Generate query vector
      const queryVector = await this.embedText(expandedQuery, 'general');
      
      // Calculate confidence based on query clarity and length
      const confidence = this.calculateQueryConfidence(query, extractedConcepts);
      
      const embedding: QueryEmbedding = {
        queryText: query,
        queryVector,
        extractedConcepts,
        confidence,
        processingTime: Date.now() - startTime,
        expandedQuery
      };
      
      console.log(`🔍 Generated query embedding in ${embedding.processingTime}ms (confidence: ${(confidence * 100).toFixed(1)}%)`);
      
      return embedding;
      
    } catch (error) {
      console.error('❌ Failed to generate query embedding:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for multiple artisans in batch
   */
  async generateBatchArtisanEmbeddings(artisans: IUser[]): Promise<ArtisanEmbedding[]> {
    const results: ArtisanEmbedding[] = [];
    const batchSize = this.config.embeddings.batchSize;
    
    console.log(`🔄 Processing ${artisans.length} artisans in batches of ${batchSize}`);
    
    for (let i = 0; i < artisans.length; i += batchSize) {
      const batch = artisans.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(artisans.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(artisan => this.generateArtisanEmbedding(artisan))
      );
      
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < artisans.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Generated embeddings for ${results.length} artisans`);
    return results;
  }
  
  /**
   * Extract comprehensive profile text from artisan
   */
  private extractProfileText(artisan: IUser): string {
    const profile = artisan.artisanConnectProfile;
    const parts = [
      artisan.name,
      artisan.artisticProfession,
      artisan.description,
      profile?.specializations?.join(' '),
      profile?.culturalCertifications?.map(cert => cert.name).join(' '),
      profile?.portfolioHighlights?.join(' ')
    ].filter(Boolean);
    
    return parts.join(' ').toLowerCase().trim();
  }
  
  /**
   * Extract skills-specific text from artisan
   */
  private extractSkillsText(artisan: IUser): string {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    const parts = [
      matchingData?.skills?.join(' '),
      matchingData?.techniques?.join(' '),
      matchingData?.materials?.join(' '),
      matchingData?.categoryTags?.join(' '),
      matchingData?.experienceLevel,
      profile?.skillTags?.map(tag => `${tag.skill} (${tag.proficiency})`).join(' ')
    ].filter(Boolean);
    
    return parts.join(' ').toLowerCase().trim();
  }
  
  /**
   * Extract portfolio-specific text from artisan
   */
  private extractPortfolioText(artisan: IUser): string {
    const profile = artisan.artisanConnectProfile;
    const matchingData = profile?.matchingData;
    
    const parts = [
      matchingData?.portfolioKeywords?.join(' '),
      profile?.portfolioHighlights?.join(' '),
      `price range ${matchingData?.averageProjectSize?.min} to ${matchingData?.averageProjectSize?.max}`,
      `timeline ${matchingData?.typicalTimeline}`,
      `experience ${matchingData?.experienceLevel}`
    ].filter(Boolean);
    
    return parts.join(' ').toLowerCase().trim();
  }
  
  /**
   * Generate embedding for text using specified specialization
   */
  private async embedText(text: string, specialization: string = 'general'): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      // Return zero vector for empty text
      return new Array(this.config.embeddings.dimensions).fill(0);
    }
    
    // Check cache first
    const cacheKey = this.getCacheKey(text, specialization);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const embeddingService = this.embeddingServices.get('primary');
      if (!embeddingService) {
        throw new Error('Primary embedding service not initialized');
      }
      
      const response = await embeddingService.generateEmbedding({ text });
      const embedding = response.embedding;
      
      // Normalize the embedding
      const normalizedEmbedding = VectorUtils.normalize(embedding);
      
      // Cache the result
      this.setCachedEmbedding(text, specialization, normalizedEmbedding);
      
      return normalizedEmbedding;
      
    } catch (error) {
      console.error(`❌ Failed to embed text for ${specialization}:`, error);
      throw error;
    }
  }
  
  /**
   * Fuse multiple vectors using weighted combination
   */
  private fuseVectors(weightedVectors: Array<{ vector: number[]; weight: number }>): number[] {
    if (weightedVectors.length === 0) {
      throw new Error('At least one vector is required for fusion');
    }
    
    // Ensure all vectors have the same dimensions
    const dimensions = weightedVectors[0].vector.length;
    for (const { vector } of weightedVectors) {
      if (vector.length !== dimensions) {
        throw new Error('All vectors must have the same dimensions for fusion');
      }
    }
    
    // Calculate weighted average
    const result = VectorUtils.weightedAverage(weightedVectors);
    
    // Normalize the result
    return VectorUtils.normalize(result);
  }
  
  /**
   * Expand query with related terms and synonyms
   */
  private async expandQuery(query: string): Promise<string> {
    // For now, implement basic expansion
    // In the future, this could use AI to generate related terms
    
    const expansions = this.getQueryExpansions(query);
    return [query, ...expansions].join(' ');
  }
  
  /**
   * Get query expansions based on craft-specific knowledge
   */
  private getQueryExpansions(query: string): string[] {
    const expansionMap: Record<string, string[]> = {
      'pottery': ['ceramics', 'clay', 'wheel throwing', 'glazing', 'kiln fired'],
      'woodworking': ['carpentry', 'furniture', 'carving', 'joinery', 'timber'],
      'jewelry': ['metalwork', 'gems', 'precious metals', 'handcrafted', 'artisan'],
      'textiles': ['weaving', 'fabric', 'embroidery', 'traditional', 'handloom'],
      'leather': ['hide', 'tanning', 'craftsmanship', 'accessories', 'handmade'],
      'painting': ['canvas', 'colors', 'brushwork', 'artistic', 'creative'],
      'sculpture': ['carving', 'modeling', 'three dimensional', 'artistic', 'handcrafted']
    };
    
    const queryLower = query.toLowerCase();
    const expansions: string[] = [];
    
    for (const [key, values] of Object.entries(expansionMap)) {
      if (queryLower.includes(key)) {
        expansions.push(...values);
      }
    }
    
    return expansions;
  }
  
  /**
   * Extract concepts from expanded query
   */
  private extractConcepts(query: string): string[] {
    // Simple concept extraction - split by spaces and filter meaningful terms
    const words = query.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'want', 'need', 'looking']);
    
    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
  }
  
  /**
   * Calculate confidence score for artisan profile
   */
  private calculateProfileConfidence(
    artisan: IUser,
    profileText: string,
    skillsText: string,
    portfolioText: string
  ): number {
    let confidence = 0;
    let factors = 0;
    
    // Profile completeness
    if (profileText.length > 50) {
      confidence += 0.3;
      factors++;
    }
    
    // Skills richness
    if (skillsText.length > 30) {
      confidence += 0.3;
      factors++;
    }
    
    // Portfolio content
    if (portfolioText.length > 20) {
      confidence += 0.2;
      factors++;
    }
    
    // Verification status
    const verification = artisan.artisanConnectProfile?.matchingData?.verificationStatus;
    if (verification?.skillsVerified || verification?.portfolioVerified) {
      confidence += 0.2;
      factors++;
    }
    
    return factors > 0 ? Math.min(1, confidence / factors) : 0.5;
  }
  
  /**
   * Calculate confidence score for query
   */
  private calculateQueryConfidence(query: string, concepts: string[]): number {
    let confidence = 0;
    
    // Query length
    if (query.length > 10) confidence += 0.3;
    if (query.length > 30) confidence += 0.2;
    
    // Number of concepts
    if (concepts.length > 1) confidence += 0.3;
    if (concepts.length > 3) confidence += 0.2;
    
    return Math.min(1, confidence);
  }
  
  /**
   * Generate hash of artisan profile for change detection
   */
  private hashProfile(artisan: IUser): string {
    const profileData = {
      name: artisan.name,
      profession: artisan.artisticProfession,
      description: artisan.description,
      skills: artisan.artisanConnectProfile?.matchingData?.skills,
      materials: artisan.artisanConnectProfile?.matchingData?.materials,
      techniques: artisan.artisanConnectProfile?.matchingData?.techniques,
      lastUpdate: artisan.artisanConnectProfile?.matchingData?.lastProfileUpdate
    };
    
    return crypto.createHash('md5').update(JSON.stringify(profileData)).digest('hex');
  }
  
  /**
   * Get current model version for tracking
   */
  private getModelVersion(): string {
    return `${this.config.embeddings.model}-v1.0`;
  }
  
  /**
   * Cache management
   */
  private getCacheKey(text: string, specialization: string): string {
    const content = `${specialization}:${text.toLowerCase().trim()}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  private setCachedEmbedding(text: string, specialization: string, embedding: number[]): void {
    const key = this.getCacheKey(text, specialization);
    this.cache.set(key, embedding);
    
    // Implement LRU cache
    if (this.cache.size > this.config.performance.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.performance.cacheSize,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
  
  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Validate embedding integrity
   */
  validateEmbedding(embedding: ArtisanEmbedding): boolean {
    // Check if all vectors have correct dimensions
    const expectedDim = this.config.embeddings.dimensions;
    
    if (embedding.profileVector.length !== expectedDim) return false;
    if (embedding.skillsVector.length !== expectedDim) return false;
    if (embedding.portfolioVector.length !== expectedDim) return false;
    if (embedding.compositeVector.length !== expectedDim) return false;
    
    // Check for valid values
    const allVectors = [
      embedding.profileVector,
      embedding.skillsVector,
      embedding.portfolioVector,
      embedding.compositeVector
    ];
    
    for (const vector of allVectors) {
      if (!VectorUtils.isValidVector(vector)) return false;
    }
    
    return true;
  }
}

export default VectorEmbeddingSystem;