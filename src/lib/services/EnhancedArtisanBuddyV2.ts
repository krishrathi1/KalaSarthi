import {
    ArtisanProfile,
    ConversationContext,
    EnhancedChatMessage,
    MessageInput,
    MessageResponse,
    MessageMetadata,
    SessionMetadata,
    validateMessageInput,
    validateConversationContext
} from '../types/enhanced-artisan-buddy';
import { ConversationStateService } from '../service/ConversationStateService';
import { ResponseGenerationService } from '../service/ResponseGenerationService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Artisan Buddy Service Core
 * 
 * This service provides the main orchestration for message processing,
 * conversation context management, and response generation for the
 * Enhanced Artisan Buddy system.
 */
export class EnhancedArtisanBuddyService {
    private static instance: EnhancedArtisanBuddyService;
    private conversationStateService: ConversationStateService;
    private responseGenerationService: ResponseGenerationService;
    private messageProcessors: Map<string, (input: MessageInput) => Promise<MessageResponse>> = new Map();

    private constructor() {
        this.conversationStateService = ConversationStateService.getInstance();
        this.responseGenerationService = ResponseGenerationService.getInstance();
        this.initializeMessageProcessors();
    }

    public static getInstance(): EnhancedArtisanBuddyService {
        if (!EnhancedArtisanBuddyService.instance) {
            EnhancedArtisanBuddyService.instance = new EnhancedArtisanBuddyService();
        }
        return EnhancedArtisanBuddyService.instance;
    }

    /**
     * Initialize message processors for different input types
     */
    private initializeMessageProcessors(): void {
        this.messageProcessors.set('text', this.processTextMessage.bind(this));
        this.messageProcessors.set('voice', this.processVoiceMessage.bind(this));
    }

    /**
     * Main message processing orchestration
     * Routes messages to appropriate processors based on input type
     */
    public async processMessage(input: MessageInput): Promise<MessageResponse> {
        try {
            // Validate input
            const validation = validateMessageInput(input);
            if (!validation.success) {
                throw new Error(`Invalid message input: ${validation.errors?.message}`);
            }

            const validatedInput = validation.data!;
            const startTime = Date.now();

            // Get or create conversation context
            const context = await this.getOrCreateConversationContext(
                validatedInput.conversationId,
                validatedInput.userId,
                validatedInput.context
            );

            // Update context with new message
            await this.updateConversationContext(context, validatedInput);

            // Route to appropriate processor
            const processor = this.messageProcessors.get(validatedInput.inputType);
            if (!processor) {
                throw new Error(`Unsupported input type: ${validatedInput.inputType}`);
            }

            // Process message
            const response = await processor(validatedInput);

            // Add processing metadata
            const processingTime = Date.now() - startTime;
            response.metadata = {
                ...response.metadata,
                processingTime,
                source: 'assistant'
            };

            // Update conversation context with response
            await this.addMessageToContext(context, {
                id: uuidv4(),
                content: response.content,
                sender: 'assistant',
                timestamp: new Date(),
                audioUrl: response.audioUrl,
                metadata: response.metadata
            });

            // Return response with updated context
            response.updatedContext = context;

            return response;

        } catch (error) {
            console.error('Message processing error:', error);
            return this.generateErrorResponse(error as Error, input.inputType);
        }
    }

    /**
     * Process text-based messages
     */
    private async processTextMessage(input: MessageInput): Promise<MessageResponse> {
        try {
            const context = input.context || await this.conversationStateService.getConversationContext(input.conversationId);

            if (!context) {
                throw new Error('Conversation context not found');
            }

            // Detect intent from message content
            const intent = this.detectIntent(input.content);

            // Generate appropriate response based on intent
            let response: MessageResponse;

            switch (intent) {
                case 'greeting':
                    response = await this.responseGenerationService.generateGreeting(context);
                    break;
                case 'help':
                    response = await this.responseGenerationService.generateHelpResponse(context);
                    break;
                default:
                    // Generate basic response using the response generation service
                    const basicContent = await this.generateBasicResponse(input.content, input.userId);
                    response = await this.responseGenerationService.generateResponse(
                        basicContent,
                        context,
                        { intent, confidence: 0.7 }
                    );
            }

            return response;

        } catch (error) {
            console.error('Error processing text message:', error);
            const context = input.context || await this.conversationStateService.getConversationContext(input.conversationId);
            if (context) {
                return this.responseGenerationService.generateFallbackResponse('generation_error', context);
            }

            // Fallback when no context available
            return {
                content: "I'm having trouble processing your message. Please try again.",
                metadata: {
                    intent: 'error',
                    confidence: 0.1,
                    entities: {},
                    source: 'assistant'
                }
            };
        }
    }

    /**
     * Process voice-based messages
     */
    private async processVoiceMessage(input: MessageInput): Promise<MessageResponse> {
        try {
            const context = input.context || await this.conversationStateService.getConversationContext(input.conversationId);

            if (!context) {
                throw new Error('Conversation context not found');
            }

            // Update session to indicate voice is enabled
            await this.conversationStateService.updateSessionMetadata(input.conversationId, {
                voiceEnabled: true
            });

            // Process similar to text but with voice-specific handling
            const intent = this.detectIntent(input.content);

            let response: MessageResponse;

            switch (intent) {
                case 'greeting':
                    response = await this.responseGenerationService.generateGreeting(context);
                    break;
                case 'help':
                    response = await this.responseGenerationService.generateHelpResponse(context);
                    break;
                default:
                    const basicContent = await this.generateBasicResponse(input.content, input.userId);
                    response = await this.responseGenerationService.generateResponse(
                        basicContent,
                        context,
                        { intent, confidence: 0.7 }
                    );
            }

            // For voice messages, we might want to generate audio URL in the future
            // response.audioUrl = await this.generateAudioResponse(response.content);

            return response;

        } catch (error) {
            console.error('Error processing voice message:', error);
            const context = input.context || await this.conversationStateService.getConversationContext(input.conversationId);
            if (context) {
                return this.responseGenerationService.generateFallbackResponse('voice_processing_error', context);
            }

            return {
                content: "I'm having trouble processing your voice message. Please try speaking again or use text input.",
                metadata: {
                    intent: 'error',
                    confidence: 0.1,
                    entities: {},
                    source: 'assistant'
                }
            };
        }
    }

    /**
     * Initialize a new conversation context
     */
    public async initializeConversation(userId: string, profileContext?: ArtisanProfile): Promise<ConversationContext> {
        const conversationId = uuidv4();

        const context: ConversationContext = {
            conversationId,
            userId,
            entities: {},
            profileContext,
            conversationHistory: [],
            sessionMetadata: {
                startTime: new Date(),
                lastActivity: new Date(),
                messageCount: 0,
                voiceEnabled: false
            }
        };

        // Validate context
        const validation = validateConversationContext(context);
        if (!validation.success) {
            throw new Error(`Invalid conversation context: ${validation.errors?.message}`);
        }

        // Store in conversation state service
        await this.conversationStateService.storeConversationContext(validation.data!);
        return validation.data!;
    }

    /**
     * Get or create conversation context
     */
    private async getOrCreateConversationContext(
        conversationId: string,
        userId: string,
        providedContext?: ConversationContext
    ): Promise<ConversationContext> {
        // If context is provided, store and use it
        if (providedContext) {
            await this.conversationStateService.storeConversationContext(providedContext);
            return providedContext;
        }

        // Try to get existing context
        let context = await this.conversationStateService.getConversationContext(conversationId);

        if (!context) {
            // Create new context
            context = await this.initializeConversation(userId);
            context.conversationId = conversationId;
            await this.conversationStateService.storeConversationContext(context);
        }

        return context;
    }

    /**
     * Update conversation context with new message
     */
    private async updateConversationContext(context: ConversationContext, input: MessageInput): Promise<void> {
        // Add user message to history
        const userMessage: EnhancedChatMessage = {
            id: uuidv4(),
            content: input.content,
            sender: 'user',
            timestamp: new Date(),
            metadata: {
                source: 'user'
            }
        };

        await this.addMessageToContext(context, userMessage);

        // Update session metadata
        context.sessionMetadata.lastActivity = new Date();
        context.sessionMetadata.messageCount += 1;

        if (input.inputType === 'voice') {
            context.sessionMetadata.voiceEnabled = true;
        }
    }

    /**
     * Add message to conversation context
     */
    private async addMessageToContext(context: ConversationContext, message: EnhancedChatMessage): Promise<void> {
        // Use conversation state service to add message
        await this.conversationStateService.addMessageToConversation(context.conversationId, message);

        // Update local context reference
        context.conversationHistory.push(message);

        // Keep only last 50 messages to manage memory
        if (context.conversationHistory.length > 50) {
            context.conversationHistory = context.conversationHistory.slice(-50);
        }
    }

    /**
     * Get conversation history for a user
     */
    public async getConversationHistory(userId: string, conversationId?: string): Promise<EnhancedChatMessage[]> {
        if (conversationId) {
            return await this.conversationStateService.getConversationHistory(conversationId);
        }

        // Return all conversations for user
        const userConversations = await this.conversationStateService.getUserConversations(userId);
        const allMessages: EnhancedChatMessage[] = [];

        for (const conversation of userConversations) {
            allMessages.push(...conversation.conversationHistory);
        }

        return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    /**
     * Update artisan profile in conversation context
     */
    public async updateProfile(userId: string, profile: ArtisanProfile): Promise<void> {
        // Update profile in all active conversations for this user
        const userConversations = await this.conversationStateService.getUserConversations(userId);

        for (const context of userConversations) {
            context.profileContext = profile;
            await this.conversationStateService.storeConversationContext(context);
        }
    }

    /**
     * Clear conversation context (for cleanup)
     */
    public async clearConversation(conversationId: string): Promise<void> {
        await this.conversationStateService.deleteConversationContext(conversationId);
    }

    /**
     * Generate basic response (placeholder for more sophisticated generation)
     */
    private async generateBasicResponse(message: string, userId: string): Promise<string> {
        // Basic response generation - will be enhanced with RAG pipeline
        const responses = [
            "I understand you're asking about artisan-related topics. How can I help you further?",
            "That's an interesting question about your craft. Let me provide some guidance.",
            "I'm here to assist you with your artisan journey. What specific area would you like to explore?",
            "As your Enhanced Artisan Buddy, I'm ready to help with your craft business needs."
        ];

        // Simple response selection based on message content
        if (message.toLowerCase().includes('help')) {
            return "I'm here to help you with your artisan business. I can assist with product creation, sales tracking, trend analysis, and connecting with buyers. What would you like to know more about?";
        }

        if (message.toLowerCase().includes('product')) {
            return "I can help you with product-related questions. Are you looking to create new products, manage existing ones, or analyze product performance?";
        }

        if (message.toLowerCase().includes('sales') || message.toLowerCase().includes('revenue')) {
            return "I can assist you with sales and revenue tracking. Would you like to see your sales dashboard or get advice on improving your sales performance?";
        }

        // Return random response for general queries
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Detect intent from message content (basic implementation)
     */
    private detectIntent(content: string): string {
        const lowerContent = content.toLowerCase();

        // Greeting patterns
        if (/\b(hello|hi|hey|greetings|good morning|good afternoon|good evening|namaste)\b/.test(lowerContent)) {
            return 'greeting';
        }

        // Help patterns
        if (/\b(help|assist|support|guide|how to|what can|capabilities|features)\b/.test(lowerContent)) {
            return 'help';
        }

        // Product patterns
        if (/\b(product|create|make|design|craft|item|listing)\b/.test(lowerContent)) {
            return 'product';
        }

        // Sales patterns
        if (/\b(sales|revenue|earnings|money|profit|income|finance|dashboard)\b/.test(lowerContent)) {
            return 'sales';
        }

        // Trend patterns
        if (/\b(trend|trending|popular|fashion|style|market|analysis)\b/.test(lowerContent)) {
            return 'trend';
        }

        // Buyer patterns
        if (/\b(buyer|customer|client|match|connect|find|sell)\b/.test(lowerContent)) {
            return 'buyer';
        }

        return 'general';
    }

    /**
     * Generate error response for failed message processing
     */
    private generateErrorResponse(error: Error, inputType: string): MessageResponse {
        const errorMessage = inputType === 'voice'
            ? "I'm having trouble processing your voice message. Please try speaking again or use text input."
            : "I'm experiencing some technical difficulties. Please try your message again.";

        return {
            content: errorMessage,
            metadata: {
                intent: 'error',
                confidence: 0.1,
                entities: {},
                source: 'assistant'
            }
        };
    }

    /**
     * Get conversation context by ID
     */
    public async getConversationContext(conversationId: string): Promise<ConversationContext | null> {
        return await this.conversationStateService.getConversationContext(conversationId);
    }

    /**
     * Get all active conversations for a user
     */
    public async getUserConversations(userId: string): Promise<ConversationContext[]> {
        return await this.conversationStateService.getUserConversations(userId);
    }

    /**
     * Check if conversation is active (has recent activity)
     */
    public isConversationActive(conversationId: string, timeoutMinutes: number = 30): boolean {
        return this.conversationStateService.isSessionActive(conversationId, timeoutMinutes);
    }

    /**
     * Cleanup inactive conversations
     */
    public cleanupInactiveConversations(timeoutMinutes: number = 60): number {
        return this.conversationStateService.cleanupInactiveConversations(timeoutMinutes);
    }
}