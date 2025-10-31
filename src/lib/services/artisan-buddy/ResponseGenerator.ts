/**
 * Response Generator Service
 * 
 * Generates contextually appropriate responses using RAG pipeline and LLM.
 * Implements context-aware response generation with caching and optimization.
 */

import { RAGPipelineService } from './RAGPipelineService';
import { ContextEngine } from './ContextEngine';
import { redisClient } from './RedisClient';
import { digitalKhataIntegration } from './DigitalKhataIntegration';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GeneratedResponse,
  Intent,
  ArtisanContext,
  Message,
  Action,
  Source,
  UserPreferences,
} from '@/lib/types/artisan-buddy';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ResponseGenerationRequest {
  intent: Intent;
  context: ArtisanContext;
  history: Message[];
  userMessage: string;
  language: string;
  sessionId: string;
}

export interface ResponseGenerationOptions {
  useCache?: boolean;
  streamResponse?: boolean;
  maxLength?: number;
  includeActions?: boolean;
  includeFollowUps?: boolean;
}

export class ResponseGenerator {
  private static instance: ResponseGenerator;
  private ragPipeline: RAGPipelineService;
  private contextEngine: ContextEngine;
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  // Cache configuration
  private readonly RESPONSE_CACHE_TTL = 3600; // 1 hour
  private readonly COMMON_RESPONSE_CACHE_TTL = 86400; // 24 hours
  
  // Response quality monitoring
  private responseMetrics: Map<string, ResponseMetrics> = new Map();

  private constructor() {
    this.ragPipeline = RAGPipelineService.getInstance();
    this.contextEngine = ContextEngine.getInstance();
  }

  static getInstance(): ResponseGenerator {
    if (!ResponseGenerator.instance) {
      ResponseGenerator.instance = new ResponseGenerator();
    }
    return ResponseGenerator.instance;
  }

  // ============================================================================
  // Main Response Generation
  // ============================================================================

  /**
   * Generate response for user query
   */
  async generateResponse(
    request: ResponseGenerationRequest,
    options: ResponseGenerationOptions = {}
  ): Promise<GeneratedResponse> {
    const startTime = Date.now();

    try {
      // Set default options
      const opts = {
        useCache: true,
        streamResponse: false,
        maxLength: 500,
        includeActions: true,
        includeFollowUps: true,
        ...options,
      };

      // Check cache first
      if (opts.useCache) {
        const cached = await this.getCachedResponse(request);
        if (cached) {
          console.log('✅ Response Generator: Returned cached response');
          return cached;
        }
      }

      // Generate response using RAG pipeline
      const ragResponse = await this.ragPipeline.generateWithContext({
        query: request.userMessage,
        context: this.convertToRAGContext(request.context),
        conversationHistory: request.history,
        maxDocuments: 5,
      });

      // Format and style the response
      const formattedText = this.formatResponse(
        ragResponse.response,
        request.context.preferences,
        opts.maxLength
      );

      // Generate suggested actions
      const suggestedActions = opts.includeActions
        ? await this.generateSuggestedActions(request.intent, request.context)
        : [];

      // Generate follow-up questions
      const followUpQuestions = opts.includeFollowUps
        ? await this.generateFollowUpQuestions(request)
        : [];

      // Build sources
      const sources = this.buildSources(ragResponse.retrievedDocuments, request.context);

      // Create response object
      const response: GeneratedResponse = {
        text: formattedText,
        language: request.language,
        confidence: ragResponse.confidence,
        sources,
        suggestedActions,
        followUpQuestions,
      };

      // Cache the response
      if (opts.useCache) {
        await this.cacheResponse(request, response);
      }

      // Track metrics
      const processingTime = Date.now() - startTime;
      this.trackResponseMetrics(request.sessionId, {
        processingTime,
        confidence: response.confidence,
        cached: false,
        sourcesUsed: sources.length,
      });

      console.log(`✅ Response Generator: Generated response in ${processingTime}ms`);
      return response;
    } catch (error) {
      console.error('❌ Response Generator: Error generating response:', error);
      
      // Return fallback response
      return this.getFallbackResponse(request, error);
    }
  }

  // ============================================================================
  // Context-Aware Response Generation (Subtask 7.1)
  // ============================================================================

  /**
   * Inject artisan context into prompts
   */
  private async buildContextualPrompt(
    userMessage: string,
    context: ArtisanContext,
    history: Message[],
    intent: Intent
  ): Promise<string> {
    let prompt = this.getSystemPrompt(context.preferences);

    // Add artisan profile context
    prompt += this.injectArtisanContext(context);

    // Add conversation history for coherence
    prompt += this.injectConversationHistory(history);

    // Add personalization based on preferences
    prompt += this.injectPersonalization(context.preferences);

    // Add intent-specific context (now async for Digital Khata integration)
    prompt += await this.injectIntentContext(intent, context);

    // Add user message
    prompt += `\n\nUser Message: ${userMessage}\n\n`;
    prompt += `Please provide a helpful, personalized response based on the artisan's context and conversation history.\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Inject artisan context into prompt
   */
  private injectArtisanContext(context: ArtisanContext): string {
    const { profile, products, salesMetrics, inventory } = context;

    let contextStr = `\n## Artisan Context\n\n`;
    contextStr += `**Profile:**\n`;
    contextStr += `- Name: ${profile.name}\n`;
    contextStr += `- Profession: ${profile.profession}\n`;
    contextStr += `- Specializations: ${profile.specializations.join(', ')}\n`;
    contextStr += `- Location: ${profile.location.city}, ${profile.location.state}\n`;
    contextStr += `- Experience: ${profile.experience} years\n`;

    if (products.length > 0) {
      contextStr += `\n**Products:**\n`;
      contextStr += `- Total Products: ${products.length}\n`;
      contextStr += `- Active Products: ${products.filter(p => p.status === 'active').length}\n`;
      contextStr += `- Categories: ${[...new Set(products.map(p => p.category))].join(', ')}\n`;
    }

    if (salesMetrics) {
      contextStr += `\n**Business Performance:**\n`;
      contextStr += `- Total Sales (${salesMetrics.period}): ${salesMetrics.totalSales}\n`;
      contextStr += `- Total Revenue: ₹${salesMetrics.totalRevenue.toLocaleString('en-IN')}\n`;
      contextStr += `- Average Order Value: ₹${salesMetrics.averageOrderValue.toFixed(2)}\n`;
    }

    if (inventory) {
      contextStr += `\n**Inventory Status:**\n`;
      contextStr += `- Total Products: ${inventory.totalProducts}\n`;
      contextStr += `- Low Stock Items: ${inventory.lowStockProducts.length}\n`;
      contextStr += `- Out of Stock Items: ${inventory.outOfStockProducts.length}\n`;
    }

    return contextStr + '\n';
  }

  /**
   * Use conversation history for coherence
   */
  private injectConversationHistory(history: Message[]): string {
    if (history.length === 0) {
      return '';
    }

    let historyStr = `\n## Recent Conversation\n\n`;
    
    // Include last 5 messages for context
    const recentHistory = history.slice(-5);
    
    for (const msg of recentHistory) {
      const role = msg.role === 'user' ? 'Artisan' : 'Assistant';
      historyStr += `**${role}:** ${msg.content}\n\n`;
    }

    return historyStr;
  }

  /**
   * Add personalization based on preferences
   */
  private injectPersonalization(preferences: UserPreferences): string {
    let personalStr = `\n## Response Guidelines\n\n`;
    
    // Response length preference
    const lengthGuide = {
      short: 'Keep responses concise (2-3 sentences)',
      medium: 'Provide moderate detail (4-6 sentences)',
      long: 'Give comprehensive explanations (7+ sentences)',
    };
    personalStr += `- Length: ${lengthGuide[preferences.responseLength]}\n`;

    // Communication style
    const styleGuide = {
      formal: 'Use professional, respectful language',
      casual: 'Use friendly, conversational tone',
    };
    personalStr += `- Style: ${styleGuide[preferences.communicationStyle]}\n`;

    // Language preference
    personalStr += `- Language: ${preferences.language}\n`;

    return personalStr + '\n';
  }

  /**
   * Handle multi-turn conversations
   */
  private async injectIntentContext(intent: Intent, context: ArtisanContext): Promise<string> {
    let intentStr = `\n## Current Intent\n\n`;
    intentStr += `- Type: ${intent.type}\n`;
    intentStr += `- Confidence: ${(intent.confidence * 100).toFixed(1)}%\n`;

    if (intent.entities.length > 0) {
      intentStr += `- Entities: ${intent.entities.map(e => `${e.type}:${e.value}`).join(', ')}\n`;
    }

    // Add intent-specific context
    switch (intent.type) {
      case 'query_products':
        intentStr += `\nFocus on the artisan's ${context.products.length} products.\n`;
        break;
      case 'query_sales':
        intentStr += `\nProvide insights from sales data and metrics.\n`;
        // Fetch Digital Khata data for sales queries
        try {
          const financialSummary = await digitalKhataIntegration.getQuickFinancialSummary(context.profile.id);
          intentStr += `\n**Digital Khata Financial Summary:**\n${financialSummary}\n`;
        } catch (error) {
          console.error('Failed to fetch Digital Khata summary:', error);
        }
        break;
      case 'query_schemes':
        intentStr += `\nDiscuss relevant government schemes and opportunities.\n`;
        break;
      case 'query_craft_knowledge':
        intentStr += `\nShare craft techniques and traditional knowledge.\n`;
        break;
    }

    return intentStr + '\n';
  }

  /**
   * Get system prompt with personalization
   */
  private getSystemPrompt(preferences: UserPreferences): string {
    const style = preferences.communicationStyle === 'formal' 
      ? 'professional and respectful'
      : 'friendly and conversational';

    return `You are Artisan Buddy, an AI assistant specialized in helping Indian artisans with their craft, business, and growth.

Your communication style should be ${style}. You have deep knowledge of Indian arts and crafts, traditional techniques, materials, market trends, and business practices.

Your role is to:
- Provide accurate, personalized information based on the artisan's profile
- Offer practical business advice and growth strategies
- Share market insights and pricing guidance
- Suggest improvements and opportunities
- Be culturally sensitive and respectful of traditional practices
- Maintain conversation coherence by referencing previous messages

Always base your responses on the provided context. If information is unavailable, acknowledge it clearly and suggest alternatives.
`;
  }

  // ============================================================================
  // Response Caching and Optimization (Subtask 7.2)
  // ============================================================================

  /**
   * Cache common responses in Redis
   */
  private async cacheResponse(
    request: ResponseGenerationRequest,
    response: GeneratedResponse
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const ttl = this.isCommonQuery(request.userMessage)
        ? this.COMMON_RESPONSE_CACHE_TTL
        : this.RESPONSE_CACHE_TTL;

      await redisClient.cacheJSON(cacheKey, response, ttl);
      console.log(`✅ Response cached with TTL: ${ttl}s`);
    } catch (error) {
      console.error('❌ Failed to cache response:', error);
    }
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(
    request: ResponseGenerationRequest
  ): Promise<GeneratedResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      return await redisClient.getCachedJSON<GeneratedResponse>(cacheKey);
    } catch (error) {
      console.error('❌ Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: ResponseGenerationRequest): string {
    // Create a hash of the request for caching
    const keyData = {
      message: request.userMessage.toLowerCase().trim(),
      intent: request.intent.type,
      language: request.language,
      userId: request.context.profile.id,
    };

    const keyString = JSON.stringify(keyData);
    return `response:${Buffer.from(keyString).toString('base64').substring(0, 50)}`;
  }

  /**
   * Check if query is common
   */
  private isCommonQuery(message: string): boolean {
    const commonPatterns = [
      /^(hi|hello|hey|namaste)/i,
      /^(how are you|what can you do|help)/i,
      /^(thank you|thanks)/i,
      /^(bye|goodbye)/i,
    ];

    return commonPatterns.some(pattern => pattern.test(message.trim()));
  }

  /**
   * Implement streaming responses for long content
   */
  async *streamResponse(
    request: ResponseGenerationRequest
  ): AsyncGenerator<string, void, unknown> {
    try {
      // Build prompt (now async)
      const prompt = await this.buildContextualPrompt(
        request.userMessage,
        request.context,
        request.history,
        request.intent
      );

      // Stream from Gemini
      const result = await this.model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield text;
      }
    } catch (error) {
      console.error('❌ Streaming response failed:', error);
      yield 'I apologize, but I encountered an error generating the response.';
    }
  }

  /**
   * Add response quality monitoring
   */
  private trackResponseMetrics(
    sessionId: string,
    metrics: Partial<ResponseMetrics>
  ): void {
    const existing = this.responseMetrics.get(sessionId) || {
      totalResponses: 0,
      averageProcessingTime: 0,
      averageConfidence: 0,
      cacheHitRate: 0,
      averageSourcesUsed: 0,
    };

    const updated: ResponseMetrics = {
      totalResponses: existing.totalResponses + 1,
      averageProcessingTime: this.updateAverage(
        existing.averageProcessingTime,
        metrics.processingTime || 0,
        existing.totalResponses
      ),
      averageConfidence: this.updateAverage(
        existing.averageConfidence,
        metrics.confidence || 0,
        existing.totalResponses
      ),
      cacheHitRate: this.updateAverage(
        existing.cacheHitRate,
        metrics.cached ? 1 : 0,
        existing.totalResponses
      ),
      averageSourcesUsed: this.updateAverage(
        existing.averageSourcesUsed,
        metrics.sourcesUsed || 0,
        existing.totalResponses
      ),
    };

    this.responseMetrics.set(sessionId, updated);
  }

  /**
   * Update running average
   */
  private updateAverage(current: number, newValue: number, count: number): number {
    return (current * count + newValue) / (count + 1);
  }

  /**
   * Get response quality metrics
   */
  getResponseMetrics(sessionId: string): ResponseMetrics | null {
    return this.responseMetrics.get(sessionId) || null;
  }

  /**
   * Create fallback responses for errors
   */
  private getFallbackResponse(
    request: ResponseGenerationRequest,
    error: any
  ): GeneratedResponse {
    console.error('Using fallback response due to error:', error);

    const fallbackMessages = {
      en: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      hi: "मुझे खेद है, लेकिन मुझे अभी आपके अनुरोध को संसाधित करने में परेशानी हो रही है। कृपया एक क्षण में पुनः प्रयास करें।",
      ta: "மன்னிக்கவும், உங்கள் கோரிக்கையை இப்போது செயலாக்குவதில் எனக்கு சிக்கல் உள்ளது. தயவுசெய்து சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
    };

    const message = fallbackMessages[request.language as keyof typeof fallbackMessages] 
      || fallbackMessages.en;

    return {
      text: message,
      language: request.language,
      confidence: 0.5,
      sources: [],
      suggestedActions: [
        {
          type: 'view',
          label: 'Try Again',
        },
      ],
      followUpQuestions: [],
    };
  }

  // ============================================================================
  // Response Formatting and Styling
  // ============================================================================

  /**
   * Format and style response
   */
  private formatResponse(
    text: string,
    preferences: UserPreferences,
    maxLength: number
  ): string {
    let formatted = text.trim();

    // Apply length constraints
    if (preferences.responseLength === 'short' && formatted.length > 200) {
      formatted = this.truncateResponse(formatted, 200);
    } else if (preferences.responseLength === 'medium' && formatted.length > maxLength) {
      formatted = this.truncateResponse(formatted, maxLength);
    }

    // Clean up formatting
    formatted = this.cleanFormatting(formatted);

    // Apply style adjustments
    if (preferences.communicationStyle === 'formal') {
      formatted = this.applyFormalStyle(formatted);
    }

    return formatted;
  }

  /**
   * Truncate response intelligently
   */
  private truncateResponse(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to truncate at sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclamation = truncated.lastIndexOf('!');

    const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }

    return truncated + '...';
  }

  /**
   * Clean formatting artifacts
   */
  private cleanFormatting(text: string): string {
    return text
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\s{2,}/g, ' ') // Remove excessive spaces
      .replace(/^(Response:|Answer:)/i, '') // Remove prefixes
      .trim();
  }

  /**
   * Apply formal style
   */
  private applyFormalStyle(text: string): string {
    // Replace casual phrases with formal equivalents
    const replacements: Record<string, string> = {
      "hey": "hello",
      "yeah": "yes",
      "nope": "no",
      "gonna": "going to",
      "wanna": "want to",
    };

    let formal = text;
    for (const [casual, formalWord] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${casual}\\b`, 'gi');
      formal = formal.replace(regex, formalWord);
    }

    return formal;
  }

  // ============================================================================
  // Suggested Actions Generation
  // ============================================================================

  /**
   * Generate suggested actions
   */
  private async generateSuggestedActions(
    intent: Intent,
    context: ArtisanContext
  ): Promise<Action[]> {
    const actions: Action[] = [];

    switch (intent.type) {
      case 'query_products':
        actions.push(
          {
            type: 'navigate',
            label: 'View All Products',
            route: '/inventory',
          },
          {
            type: 'create',
            label: 'Add New Product',
            route: '/product-creator',
          }
        );
        break;

      case 'query_sales':
        actions.push(
          {
            type: 'navigate',
            label: 'View Sales Dashboard',
            route: '/finance/dashboard',
          },
          {
            type: 'navigate',
            label: 'Digital Khata',
            route: '/digital-khata',
          }
        );
        break;

      case 'query_schemes':
        actions.push(
          {
            type: 'navigate',
            label: 'Explore Schemes',
            route: '/scheme-sahayak',
          }
        );
        break;

      case 'connect_buyer':
        actions.push(
          {
            type: 'navigate',
            label: 'View Buyer Connections',
            route: '/buyer-connect',
          }
        );
        break;

      case 'navigation':
        // Actions already handled by navigation router
        break;

      default:
        actions.push(
          {
            type: 'view',
            label: 'View Profile',
            route: '/profile',
          }
        );
    }

    return actions.slice(0, 3); // Limit to 3 actions
  }

  // ============================================================================
  // Follow-up Questions Generation
  // ============================================================================

  /**
   * Generate follow-up questions
   */
  private async generateFollowUpQuestions(
    request: ResponseGenerationRequest
  ): Promise<string[]> {
    try {
      const prompt = `Based on this conversation with an artisan:

User Question: ${request.userMessage}
Intent: ${request.intent.type}
Artisan Profession: ${request.context.profile.profession}

Generate 3 relevant follow-up questions that the artisan might want to ask next.
Make them specific, actionable, and related to their craft or business.

Format: Return only the questions, one per line, without numbering.`;

      const result = await this.model.generateContent(prompt);
      const questions = result.response.text()
        .split('\n')
        .filter(q => q.trim().length > 0)
        .map(q => q.replace(/^[\d\.\-\*]+\s*/, '').trim()) // Remove numbering
        .slice(0, 3);

      return questions;
    } catch (error) {
      console.error('❌ Failed to generate follow-up questions:', error);
      return [];
    }
  }

  // ============================================================================
  // Digital Khata Integration Methods
  // ============================================================================

  /**
   * Get comprehensive Digital Khata insights for sales queries
   */
  async getDigitalKhataInsights(
    artisanId: string,
    queryType: 'sales' | 'financial' | 'inventory' | 'trends' | 'summary'
  ): Promise<string> {
    try {
      switch (queryType) {
        case 'sales':
          const salesMetrics = await digitalKhataIntegration.getSalesMetrics(artisanId, 'month');
          return this.formatSalesMetrics(salesMetrics);

        case 'financial':
          const financialInsights = await digitalKhataIntegration.getFinancialInsights(artisanId);
          return this.formatFinancialInsights(financialInsights);

        case 'inventory':
          const inventoryInsights = await digitalKhataIntegration.getInventoryInsights(artisanId);
          return this.formatInventoryInsights(inventoryInsights);

        case 'trends':
          const trendAnalysis = await digitalKhataIntegration.analyzeSalesTrends(artisanId, 'month');
          return this.formatTrendAnalysis(trendAnalysis);

        case 'summary':
        default:
          return await digitalKhataIntegration.getQuickFinancialSummary(artisanId);
      }
    } catch (error) {
      console.error('Error fetching Digital Khata insights:', error);
      return 'Unable to fetch financial data at this time. Please try again later.';
    }
  }

  /**
   * Format sales metrics for response
   */
  private formatSalesMetrics(metrics: any): string {
    return `
📊 Sales Metrics (${metrics.period}):

💰 Revenue: ₹${metrics.sales.revenue.toLocaleString('en-IN')}
📦 Orders: ${metrics.sales.count}
📈 Average Order Value: ₹${metrics.sales.averageValue.toLocaleString('en-IN')}

🏆 Top Products:
${metrics.topProducts.slice(0, 3).map((p: any, i: number) => 
  `${i + 1}. ${p.productName} - ₹${p.revenue.toLocaleString('en-IN')} (${p.salesCount} sales)`
).join('\n')}

📅 Recent Transactions: ${metrics.recentTransactions.length} recent orders
    `.trim();
  }

  /**
   * Format financial insights for response
   */
  private formatFinancialInsights(insights: any): string {
    const trendEmoji = insights.salesPerformance.trend === 'increasing' ? '📈' : 
                       insights.salesPerformance.trend === 'decreasing' ? '📉' : '➡️';
    
    return `
💼 Financial Insights:

${trendEmoji} Sales Performance:
- Current Month: ₹${insights.salesPerformance.currentMonth.toLocaleString('en-IN')}
- Previous Month: ₹${insights.salesPerformance.previousMonth.toLocaleString('en-IN')}
- Growth Rate: ${insights.salesPerformance.growthRate > 0 ? '+' : ''}${insights.salesPerformance.growthRate}%
- Trend: ${insights.salesPerformance.trend}

💰 Revenue Analysis:
- Total Revenue: ₹${insights.revenueAnalysis.totalRevenue.toLocaleString('en-IN')}
- Average Order: ₹${insights.revenueAnalysis.averageOrderValue.toLocaleString('en-IN')}

💡 Profitability:
- Estimated Profit: ₹${insights.profitability.estimatedProfit.toLocaleString('en-IN')}
- Profit Margin: ${insights.profitability.profitMargin}%

💵 Cash Flow:
- Status: ${insights.cashFlow.status}
- Net Cash Flow: ₹${insights.cashFlow.netCashFlow.toLocaleString('en-IN')}

📌 Recommendations:
${insights.profitability.recommendations.map((r: string) => `• ${r}`).join('\n')}
    `.trim();
  }

  /**
   * Format inventory insights for response
   */
  private formatInventoryInsights(insights: any): string {
    return `
📦 Inventory Status:

📊 Overview:
- Total Products: ${insights.overview.totalProducts}
- Active Products: ${insights.overview.activeProducts}
- Low Stock: ${insights.overview.lowStockCount} items
- Out of Stock: ${insights.overview.outOfStockCount} items
- Total Value: ₹${insights.overview.totalValue.toLocaleString('en-IN')}

${insights.alerts.length > 0 ? `
⚠️ Alerts:
${insights.alerts.slice(0, 3).map((a: any) => 
  `• ${a.type === 'low_stock' ? '🟡' : '🔴'} ${a.productName}: ${a.recommendedAction}`
).join('\n')}
` : '✅ No inventory alerts'}

💡 Recommendations:
${insights.recommendations.map((r: string) => `• ${r}`).join('\n')}
    `.trim();
  }

  /**
   * Format trend analysis for response
   */
  private formatTrendAnalysis(analysis: any): string {
    return `
📈 Sales Trend Analysis (${analysis.period}):

📊 Key Insights:
- Best Day: ${analysis.insights.bestPerformingDay}
- Worst Day: ${analysis.insights.worstPerformingDay}
- Average Daily Sales: ${analysis.insights.averageDailySales}
- Peak Sales Time: ${analysis.insights.peakSalesTime}
- Pattern: ${analysis.insights.seasonalPattern}

🔮 Predictions:
- Next Week: ₹${analysis.predictions.nextWeekSales.toLocaleString('en-IN')}
- Next Month: ₹${analysis.predictions.nextMonthSales.toLocaleString('en-IN')}
- Confidence: ${analysis.predictions.confidence}%

📅 Recent Trends:
${analysis.trends.slice(-5).map((t: any) => 
  `${t.date}: ₹${t.revenue.toLocaleString('en-IN')} (${t.sales} sales)`
).join('\n')}
    `.trim();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert ArtisanContext to RAG context format
   */
  private convertToRAGContext(context: ArtisanContext): any {
    return {
      userId: context.profile.id,
      name: context.profile.name,
      profession: context.profile.profession,
      specializations: context.profile.specializations,
      location: `${context.profile.location.city}, ${context.profile.location.state}`,
      products: context.products,
      salesMetrics: context.salesMetrics,
    };
  }

  /**
   * Build sources from retrieved documents and context
   */
  private buildSources(documents: any[], context: ArtisanContext): Source[] {
    const sources: Source[] = [];

    // Add knowledge base sources
    documents.forEach(doc => {
      sources.push({
        type: 'knowledge_base',
        reference: doc.title || doc.id,
        relevance: doc.relevance || doc.similarity || 0,
      });
    });

    // Add profile source if relevant
    sources.push({
      type: 'profile',
      reference: context.profile.name,
      relevance: 1.0,
    });

    return sources.slice(0, 5); // Limit to 5 sources
  }

  /**
   * Clear metrics for session
   */
  clearMetrics(sessionId: string): void {
    this.responseMetrics.delete(sessionId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ResponseMetrics> {
    return new Map(this.responseMetrics);
  }
}

// ============================================================================
// Types
// ============================================================================

interface ResponseMetrics {
  totalResponses: number;
  averageProcessingTime: number;
  averageConfidence: number;
  cacheHitRate: number;
  averageSourcesUsed: number;
}

export const responseGenerator = ResponseGenerator.getInstance();
