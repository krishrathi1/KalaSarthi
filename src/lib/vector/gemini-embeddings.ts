/**
 * Gemini Embedding Service
 * Uses Google's Gemini API for text embeddings instead of OpenAI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorConfig } from './config';
import { EmbeddingService, EmbeddingRequest, EmbeddingResponse, BatchEmbeddingRequest, BatchEmbeddingResponse, EmbeddingModel } from './embeddings';

export class GeminiEmbeddingService extends EmbeddingService {
  private client: GoogleGenerativeAI;
  private model: any;
  
  constructor(config: VectorConfig) {
    super(config);
    
    if (!config.embeddings.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.client = new GoogleGenerativeAI(config.embeddings.apiKey);
    this.model = this.client.getGenerativeModel({ model: 'embedding-001' });
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
      
      console.log(`🧠 Generating Gemini embedding for text: "${truncatedText.substring(0, 50)}..."`);
      
      const result = await this.model.embedContent(truncatedText);
      const embedding = result.embedding.values;
      
      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding returned from Gemini API');
      }
      
      console.log(`✅ Gemini embedding generated: ${embedding.length} dimensions`);
      
      // Cache the result
      this.setCachedEmbedding(request.text, model, embedding);
      
      return {
        embedding,
        model,
        usage: {
          promptTokens: this.estimateTokens(truncatedText),
          totalTokens: this.estimateTokens(truncatedText)
        },
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate Gemini embedding:', error);
      throw new Error(`Gemini embedding generation failed: ${error}`);
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
        console.log(`🧠 Generating ${uncachedTexts.length} Gemini embeddings in batch`);
        
        const batchSize = Math.min(this.config.embeddings.batchSize, 10); // Gemini has lower batch limits
        
        for (let i = 0; i < uncachedTexts.length; i += batchSize) {
          const batch = uncachedTexts.slice(i, i + batchSize);
          const batchIndexes = uncachedIndexes.slice(i, i + batchSize);
          
          // Process batch sequentially for Gemini (it doesn't support true batch processing)
          for (let j = 0; j < batch.length; j++) {
            const text = batch[j];
            const originalIndex = batchIndexes[j];
            
            try {
              const result = await this.model.embedContent(text);
              const embedding = result.embedding.values;
              
              if (embedding && embedding.length > 0) {
                embeddings[originalIndex] = embedding;
                this.setCachedEmbedding(request.texts[originalIndex], model, embedding);
                
                totalUsage.promptTokens += this.estimateTokens(text);
                totalUsage.totalTokens += this.estimateTokens(text);
              } else {
                console.warn(`⚠️ Empty embedding for text at index ${originalIndex}`);
                // Use zero vector as fallback
                embeddings[originalIndex] = new Array(768).fill(0); // Gemini embedding-001 is 768 dimensions
              }
            } catch (error) {
              console.error(`❌ Failed to generate embedding for text at index ${originalIndex}:`, error);
              // Use zero vector as fallback
              embeddings[originalIndex] = new Array(768).fill(0);
            }
            
            // Add delay between requests to respect rate limits
            if (j < batch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log(`📤 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uncachedTexts.length / batchSize)}`);
          
          // Add delay between batches
          if (i + batchSize < uncachedTexts.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      console.log(`✅ Generated ${embeddings.length} Gemini embeddings`);
      
      return {
        embeddings,
        model,
        usage: totalUsage,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to generate batch Gemini embeddings:', error);
      throw new Error(`Gemini batch embedding generation failed: ${error}`);
    }
  }
  
  async getAvailableModels(): Promise<EmbeddingModel[]> {
    return [
      {
        name: 'embedding-001',
        provider: 'gemini',
        dimensions: 768,
        maxTokens: 2048
      }
    ];
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
  
  private estimateTokens(text: string): number {
    // Rough estimation for token counting
    return Math.ceil(text.length / 4);
  }
}

export default GeminiEmbeddingService;