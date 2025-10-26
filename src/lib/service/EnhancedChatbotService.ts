import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStoreService } from './VectorStoreService';
import { DialogflowService } from './DialogflowService';

interface ChatContext {
    userId: string;
    artisanId?: string;
    conversationHistory: ChatMessage[];
    currentTopic?: string;
    language: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

interface ChatResponse {
    response: string;
    intent?: string;
    confidence?: number;
    shouldNavigate?: boolean;
    navigationTarget?: string;
    contextUsed?: boolean;
    sources?: string[];
}

export class EnhancedChatbotService {
    private static instance: EnhancedChatbotService;
    private genAI: GoogleGenerativeAI;
    private vectorStore: VectorStoreService;
    private dialogflowService: DialogflowService;
    private conversationContexts: Map<string, ChatContext> = new Map();

    private constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.vectorStore = VectorStoreService.getInstance();
        this.dialogflowService = DialogflowService.getInstance();
    }

    public static getInstance(): EnhancedChatbotService {
        if (!EnhancedChatbotService.instance) {
            EnhancedChatbotService.instance = new EnhancedChatbotService();
        }
        return EnhancedChatbotService.instance;
    }

    public async processMessage(
        message: string,
        userId: string,
        options: {
            language?: string;
            artisanId?: string;
            useDialogflow?: boolean;
            useVectorSearch?: boolean;
        } = {}
    ): Promise<ChatResponse> {
        const {
            language = 'en',
            artisanId,
            useDialogflow = true,
            useVectorSearch = true
        } = options;

        try {
            // Get or create conversation context
            const context = this.getOrCreateContext(userId, language, artisanId);

            // Add user message to context
            context.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date()
            });

            let response: ChatResponse;

            if (useDialogflow) {
                // Try DialogFlow first for structured intents
                response = await this.processWithDialogflow(message, context);

                // If DialogFlow confidence is low, fall back to general chat
                if (response.confidence && response.confidence < 0.7) {
                    response = await this.processWithGeneralChat(message, context, useVectorSearch);
                }
            } else {
                // Use general chatbot directly
                response = await this.processWithGeneralChat(message, context, useVectorSearch);
            }

            // Add assistant response to context
            context.conversationHistory.push({
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
                metadata: {
                    intent: response.intent,
                    confidence: response.confidence,
                    contextUsed: response.contextUsed
                }
            });

            // Limit conversation history to last 20 messages
            if (context.conversationHistory.length > 20) {
                context.conversationHistory = context.conversationHistory.slice(-20);
            }

            return response;

        } catch (error) {
            console.error('Enhanced chatbot processing error:', error);
            return {
                response: language === 'hi'
                    ? 'क्षमा करें, मुझे कुछ तकनीकी समस्या हो रही है। कृपया दोबारा कोशिश करें।'
                    : 'I apologize, but I\'m experiencing some technical difficulties. Please try again.',
                confidence: 0.1
            };
        }
    }

    private async processWithDialogflow(message: string, context: ChatContext): Promise<ChatResponse> {
        try {
            const intentResult = await this.dialogflowService.detectIntent(
                message,
                context.language,
                context.artisanId
            );

            const response: ChatResponse = {
                response: intentResult.fulfillmentText,
                intent: intentResult.intent,
                confidence: intentResult.confidence,
                contextUsed: intentResult.requiresVectorSearch || false
            };

            // Handle navigation intents
            if (intentResult.action === 'navigate') {
                const target = this.dialogflowService.getNavigationTarget(intentResult.intent);
                if (target) {
                    response.shouldNavigate = true;
                    response.navigationTarget = target;
                }
            }

            // Add contextual data if available
            if (intentResult.contextualData) {
                response.sources = intentResult.contextualData.map((doc: any) => doc.id);
            }

            return response;

        } catch (error) {
            console.error('DialogFlow processing error:', error);
            throw error;
        }
    }

    private async processWithGeneralChat(
        message: string,
        context: ChatContext,
        useVectorSearch: boolean
    ): Promise<ChatResponse> {
        try {
            let systemPrompt = this.buildSystemPrompt(context);
            let contextualInfo = '';
            let sources: string[] = [];

            // Add vector search context if enabled
            if (useVectorSearch) {
                const relevantDocs = await this.vectorStore.searchSimilarContent(message, 3);
                if (relevantDocs.length > 0) {
                    contextualInfo = '\n\nRelevant Information:\n' +
                        relevantDocs.map(doc => doc.content).join('\n\n');
                    sources = relevantDocs.map(doc => doc.id);
                }
            }

            // Build conversation history
            const conversationHistory = context.conversationHistory
                .slice(-10) // Last 10 messages for context
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const fullPrompt = `${systemPrompt}${contextualInfo}

Conversation History:
${conversationHistory}

Current User Message: ${message}

Please provide a helpful, contextual response as an Artisan Buddy:`;

            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();

            return {
                response: responseText,
                intent: 'general_chat',
                confidence: 0.8,
                contextUsed: useVectorSearch && sources.length > 0,
                sources: sources.length > 0 ? sources : undefined
            };

        } catch (error) {
            console.error('General chat processing error:', error);
            throw error;
        }
    }

    private buildSystemPrompt(context: ChatContext): string {
        let prompt = `You are an AI assistant called "Artisan Buddy" designed to help artisans with their craft business. `;

        if (context.language === 'hi') {
            prompt = `आप "Artisan Buddy" नामक एक AI असिस्टेंट हैं जो कारीगरों की उनके क्राफ्ट बिज़नेस में मदद करने के लिए बनाया गया है। `;
        }

        // Add artisan-specific context if available
        if (context.artisanId) {
            const profile = this.vectorStore.getArtisanProfile(context.artisanId);
            if (profile) {
                if (context.language === 'hi') {
                    prompt += `आप ${profile.name} का प्रतिनिधित्व कर रहे हैं, जो ${profile.location} से ${profile.craft} के क्षेत्र में ${profile.experience} साल का अनुभव रखते हैं। `;
                } else {
                    prompt += `You are representing ${profile.name}, a ${profile.craft} artisan from ${profile.location} with ${profile.experience} years of experience. `;
                }
            }
        }

        // Add general capabilities
        if (context.language === 'hi') {
            prompt += `आप निम्नलिखित में मदद कर सकते हैं:
- नए प्रोडक्ट्स बनाना और डिज़ाइन करना
- सेल्स और वित्तीय डेटा ट्रैक करना
- मार्केट ट्रेंड्स और लोकप्रिय डिज़ाइन्स की जानकारी
- संभावित बायर्स से जुड़ना
- बिज़नेस की सलाह और मार्गदर्शन
- सामान्य बातचीत और सहायता

कृपया मददगार, दोस्ताना और सांस्कृतिक रूप से उपयुक्त जवाब दें।`;
        } else {
            prompt += `You can help with:
- Creating and designing new products
- Tracking sales and financial data
- Market trends and popular designs
- Connecting with potential buyers
- Business advice and guidance
- General conversation and assistance

Please provide helpful, friendly, and culturally appropriate responses.`;
        }

        return prompt;
    }

    private getOrCreateContext(userId: string, language: string, artisanId?: string): ChatContext {
        const contextKey = `${userId}_${artisanId || 'default'}`;

        if (!this.conversationContexts.has(contextKey)) {
            this.conversationContexts.set(contextKey, {
                userId,
                artisanId,
                conversationHistory: [],
                language,
                currentTopic: undefined
            });
        }

        const context = this.conversationContexts.get(contextKey)!;
        context.language = language; // Update language if changed
        return context;
    }

    public clearContext(userId: string, artisanId?: string): void {
        const contextKey = `${userId}_${artisanId || 'default'}`;
        this.conversationContexts.delete(contextKey);
    }

    public getContextHistory(userId: string, artisanId?: string): ChatMessage[] {
        const contextKey = `${userId}_${artisanId || 'default'}`;
        const context = this.conversationContexts.get(contextKey);
        return context?.conversationHistory || [];
    }

    public updateArtisanContext(userId: string, artisanId: string): void {
        const contextKey = `${userId}_${artisanId}`;
        const context = this.conversationContexts.get(contextKey);
        if (context) {
            context.artisanId = artisanId;
        }
    }
}