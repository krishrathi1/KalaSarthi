/**
 * RAG (Retrieval-Augmented Generation) Pipeline Service
 * Implements context-aware response generation using retrieved knowledge
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStore } from './VectorStore';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { KnowledgeResult, SearchFilters } from './types/knowledge-base';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface RAGRequest {
  query: string;
  context?: ArtisanContext;
  conversationHistory?: Message[];
  filters?: SearchFilters;
  maxDocuments?: number;
}

export interface ArtisanContext {
  userId: string;
  name: string;
  profession: string;
  specializations?: string[];
  location?: string;
  products?: any[];
  salesMetrics?: any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface RAGResponse {
  response: string;
  retrievedDocuments: KnowledgeResult[];
  confidence: number;
  reasoning: string;
  sources: string[];
}

export interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class RAGPipelineService {
  private static instance: RAGPipelineService;
  private vectorStore: VectorStore;
  private knowledgeBase: KnowledgeBaseService;
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  private constructor() {
    this.vectorStore = VectorStore.getInstance();
    this.knowledgeBase = KnowledgeBaseService.getInstance();
  }

  static getInstance(): RAGPipelineService {
    if (!RAGPipelineService.instance) {
      RAGPipelineService.instance = new RAGPipelineService();
    }
    return RAGPipelineService.instance;
  }

  /**
   * Generate response with retrieved context
   */
  async generateWithContext(request: RAGRequest): Promise<RAGResponse> {
    try {
      // Step 1: Retrieve relevant documents
      const documents = await this.retrieveDocuments(
        request.query,
        request.filters,
        request.maxDocuments || 5
      );

      // Step 2: Build context-enriched prompt
      const prompt = this.buildPrompt(
        request.query,
        documents,
        request.context,
        request.conversationHistory
      );

      // Step 3: Generate response using LLM
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Step 4: Extract reasoning and confidence
      const { reasoning, confidence } = this.analyzeResponse(response, documents);

      return {
        response: this.cleanResponse(response),
        retrievedDocuments: documents,
        confidence,
        reasoning,
        sources: documents.map(doc => doc.metadata.source)
      };
    } catch (error) {
      console.error('❌ RAG generation failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents from knowledge base
   */
  async retrieveDocuments(
    query: string,
    filters?: SearchFilters,
    topK: number = 5
  ): Promise<KnowledgeResult[]> {
    try {
      return await this.vectorStore.semanticSearch(query, filters, topK);
    } catch (error) {
      console.error('❌ Document retrieval failed:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return await this.vectorStore.generateEmbedding(text);
  }

  /**
   * Build context-enriched prompt
   */
  private buildPrompt(
    query: string,
    documents: KnowledgeResult[],
    context?: ArtisanContext,
    history?: Message[]
  ): string {
    let prompt = this.getSystemPrompt();

    // Add artisan context
    if (context) {
      prompt += this.buildArtisanContext(context);
    }

    // Add conversation history
    if (history && history.length > 0) {
      prompt += this.buildConversationHistory(history);
    }

    // Add retrieved knowledge
    if (documents.length > 0) {
      prompt += this.buildKnowledgeContext(documents);
    }

    // Add user query
    prompt += `\n\nUser Question: ${query}\n\n`;
    prompt += `Please provide a helpful, accurate, and contextually relevant response. `;
    prompt += `Use the provided knowledge and artisan context to personalize your answer. `;
    prompt += `If the information is not available in the context, say so clearly.\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Get system prompt template
   */
  private getSystemPrompt(): string {
    return `You are Artisan Buddy, an AI assistant specialized in helping Indian artisans with their craft, business, and growth. 
You have deep knowledge of Indian arts and crafts, traditional techniques, materials, market trends, and business practices.

Your role is to:
- Provide accurate information about crafts, techniques, and materials
- Offer personalized business advice based on the artisan's profile
- Share market insights and pricing guidance
- Suggest improvements and growth opportunities
- Be culturally sensitive and respectful of traditional practices
- Communicate in a friendly, supportive, and encouraging manner

Always base your responses on the provided context and knowledge. If you don't have enough information, acknowledge it and suggest where the artisan might find more details.

`;
  }

  /**
   * Build artisan context section
   */
  private buildArtisanContext(context: ArtisanContext): string {
    let contextStr = `\n## Artisan Profile\n`;
    contextStr += `Name: ${context.name}\n`;
    contextStr += `Profession: ${context.profession}\n`;
    
    if (context.specializations && context.specializations.length > 0) {
      contextStr += `Specializations: ${context.specializations.join(', ')}\n`;
    }
    
    if (context.location) {
      contextStr += `Location: ${context.location}\n`;
    }
    
    if (context.products && context.products.length > 0) {
      contextStr += `Number of Products: ${context.products.length}\n`;
    }
    
    if (context.salesMetrics) {
      contextStr += `Sales Performance: Available\n`;
    }
    
    return contextStr + '\n';
  }

  /**
   * Build conversation history section
   */
  private buildConversationHistory(history: Message[]): string {
    let historyStr = `\n## Recent Conversation\n`;
    
    // Only include last 5 messages to keep context manageable
    const recentHistory = history.slice(-5);
    
    for (const msg of recentHistory) {
      historyStr += `${msg.role === 'user' ? 'Artisan' : 'Assistant'}: ${msg.content}\n`;
    }
    
    return historyStr + '\n';
  }

  /**
   * Build knowledge context section
   */
  private buildKnowledgeContext(documents: KnowledgeResult[]): string {
    let knowledgeStr = `\n## Relevant Knowledge\n\n`;
    
    documents.forEach((doc, index) => {
      knowledgeStr += `### Source ${index + 1} (Relevance: ${(doc.relevance * 100).toFixed(1)}%)\n`;
      knowledgeStr += `Category: ${doc.category}\n`;
      knowledgeStr += `Content: ${doc.content}\n\n`;
    });
    
    return knowledgeStr;
  }

  /**
   * Analyze response quality and extract reasoning
   */
  private analyzeResponse(
    response: string,
    documents: KnowledgeResult[]
  ): { reasoning: string; confidence: number } {
    // Calculate confidence based on document relevance
    const avgRelevance = documents.length > 0
      ? documents.reduce((sum, doc) => sum + doc.relevance, 0) / documents.length
      : 0.5;

    // Check if response acknowledges uncertainty
    const hasUncertainty = /not sure|don't know|unclear|may not|might not/i.test(response);
    const confidence = hasUncertainty ? avgRelevance * 0.7 : avgRelevance;

    // Extract reasoning
    const reasoning = documents.length > 0
      ? `Response generated using ${documents.length} relevant knowledge sources with average relevance of ${(avgRelevance * 100).toFixed(1)}%`
      : 'Response generated without specific knowledge sources';

    return { reasoning, confidence };
  }

  /**
   * Clean and format response
   */
  private cleanResponse(response: string): string {
    // Remove any system prompts or meta-text that might have leaked
    let cleaned = response.trim();
    
    // Remove common artifacts
    cleaned = cleaned.replace(/^(Response:|Answer:)/i, '').trim();
    
    return cleaned;
  }

  /**
   * Generate follow-up questions
   */
  async generateFollowUpQuestions(
    query: string,
    response: string,
    context?: ArtisanContext
  ): Promise<string[]> {
    try {
      const prompt = `Based on this conversation:
User Question: ${query}
Assistant Response: ${response}

Generate 3 relevant follow-up questions that the artisan might want to ask next. 
Make them specific, actionable, and related to their craft or business.
${context ? `The artisan is a ${context.profession} from ${context.location}.` : ''}

Format: Return only the questions, one per line, without numbering.`;

      const result = await this.model.generateContent(prompt);
      const questions = result.response.text()
        .split('\n')
        .filter(q => q.trim().length > 0)
        .slice(0, 3);

      return questions;
    } catch (error) {
      console.error('❌ Failed to generate follow-up questions:', error);
      return [];
    }
  }

  /**
   * Summarize long conversation
   */
  async summarizeConversation(messages: Message[]): Promise<string> {
    try {
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `Summarize this conversation between an artisan and their AI assistant in 2-3 sentences:

${conversationText}

Summary:`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Failed to summarize conversation:', error);
      return 'Conversation summary unavailable';
    }
  }

  /**
   * Extract key topics from query
   */
  async extractTopics(query: string): Promise<string[]> {
    try {
      const prompt = `Extract 3-5 key topics or keywords from this query:
"${query}"

Return only the topics, one per line, without explanations.`;

      const result = await this.model.generateContent(prompt);
      const topics = result.response.text()
        .split('\n')
        .filter(t => t.trim().length > 0)
        .map(t => t.trim().toLowerCase());

      return topics;
    } catch (error) {
      console.error('❌ Failed to extract topics:', error);
      return [];
    }
  }
}
