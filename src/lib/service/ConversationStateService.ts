import {
    ConversationContext,
    EnhancedChatMessage,
    SessionMetadata,
    validateConversationContext
} from '../types/enhanced-artisan-buddy';

/**
 * Conversation State Management Service
 * 
 * Handles conversation history storage, retrieval, and session lifecycle management.
 * Designed to work with in-memory storage initially, but can be extended to use Redis
 * or other persistent storage solutions.
 */
export class ConversationStateService {
    private static instance: ConversationStateService;

    // In-memory storage - in production, this would be Redis or database
    private conversationStore: Map<string, ConversationContext> = new Map();
    private sessionStore: Map<string, SessionMetadata> = new Map();
    private userConversationIndex: Map<string, Set<string>> = new Map(); // userId -> conversationIds

    // Configuration
    private readonly maxConversationHistory = 100; // Maximum messages per conversation
    private readonly sessionTimeoutMinutes = 60; // Session timeout in minutes
    private readonly cleanupIntervalMinutes = 30; // Cleanup interval in minutes

    private cleanupTimer?: NodeJS.Timeout;

    private constructor() {
        this.startCleanupTimer();
    }

    public static getInstance(): ConversationStateService {
        if (!ConversationStateService.instance) {
            ConversationStateService.instance = new ConversationStateService();
        }
        return ConversationStateService.instance;
    }

    /**
     * Store conversation context with validation
     */
    public async storeConversationContext(context: ConversationContext): Promise<void> {
        try {
            // Validate context before storing
            const validation = validateConversationContext(context);
            if (!validation.success) {
                throw new Error(`Invalid conversation context: ${validation.errors?.message}`);
            }

            const validatedContext = validation.data!;

            // Update timestamp
            validatedContext.sessionMetadata.lastActivity = new Date();

            // Store conversation context
            this.conversationStore.set(validatedContext.conversationId, validatedContext);

            // Update session metadata
            this.sessionStore.set(validatedContext.conversationId, validatedContext.sessionMetadata);

            // Update user conversation index
            this.addToUserIndex(validatedContext.userId, validatedContext.conversationId);

            // Trim conversation history if needed
            await this.trimConversationHistory(validatedContext.conversationId);

        } catch (error) {
            console.error('Error storing conversation context:', error);
            throw error;
        }
    }

    /**
     * Retrieve conversation context by ID
     */
    public async getConversationContext(conversationId: string): Promise<ConversationContext | null> {
        try {
            const context = this.conversationStore.get(conversationId);

            if (!context) {
                return null;
            }

            // Check if session is still active
            if (!this.isSessionActive(conversationId)) {
                await this.deleteConversationContext(conversationId);
                return null;
            }

            // Update last activity
            context.sessionMetadata.lastActivity = new Date();
            await this.storeConversationContext(context);

            return context;

        } catch (error) {
            console.error('Error retrieving conversation context:', error);
            return null;
        }
    }

    /**
     * Add message to conversation history
     */
    public async addMessageToConversation(
        conversationId: string,
        message: EnhancedChatMessage
    ): Promise<void> {
        try {
            const context = await this.getConversationContext(conversationId);

            if (!context) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Add message to history
            context.conversationHistory.push(message);

            // Update message count
            context.sessionMetadata.messageCount += 1;
            context.sessionMetadata.lastActivity = new Date();

            // Store updated context
            await this.storeConversationContext(context);

        } catch (error) {
            console.error('Error adding message to conversation:', error);
            throw error;
        }
    }

    /**
     * Get conversation history for a specific conversation
     */
    public async getConversationHistory(
        conversationId: string,
        limit?: number
    ): Promise<EnhancedChatMessage[]> {
        try {
            const context = await this.getConversationContext(conversationId);

            if (!context) {
                return [];
            }

            const history = context.conversationHistory;

            if (limit && limit > 0) {
                return history.slice(-limit);
            }

            return history;

        } catch (error) {
            console.error('Error retrieving conversation history:', error);
            return [];
        }
    }

    /**
     * Get all conversations for a user
     */
    public async getUserConversations(userId: string): Promise<ConversationContext[]> {
        try {
            const conversationIds = this.userConversationIndex.get(userId) || new Set();
            const conversations: ConversationContext[] = [];

            for (const conversationId of Array.from(conversationIds)) {
                const context = await this.getConversationContext(conversationId);
                if (context) {
                    conversations.push(context);
                }
            }

            // Sort by last activity (most recent first)
            return conversations.sort((a, b) =>
                b.sessionMetadata.lastActivity.getTime() - a.sessionMetadata.lastActivity.getTime()
            );

        } catch (error) {
            console.error('Error retrieving user conversations:', error);
            return [];
        }
    }

    /**
     * Delete conversation context and cleanup
     */
    public async deleteConversationContext(conversationId: string): Promise<void> {
        try {
            const context = this.conversationStore.get(conversationId);

            if (context) {
                // Remove from user index
                this.removeFromUserIndex(context.userId, conversationId);
            }

            // Remove from stores
            this.conversationStore.delete(conversationId);
            this.sessionStore.delete(conversationId);

        } catch (error) {
            console.error('Error deleting conversation context:', error);
            throw error;
        }
    }

    /**
     * Update session metadata
     */
    public async updateSessionMetadata(
        conversationId: string,
        updates: Partial<SessionMetadata>
    ): Promise<void> {
        try {
            const context = await this.getConversationContext(conversationId);

            if (!context) {
                throw new Error(`Conversation ${conversationId} not found`);
            }

            // Update session metadata
            Object.assign(context.sessionMetadata, updates);
            context.sessionMetadata.lastActivity = new Date();

            // Store updated context
            await this.storeConversationContext(context);

        } catch (error) {
            console.error('Error updating session metadata:', error);
            throw error;
        }
    }

    /**
     * Check if session is active (within timeout period)
     */
    public isSessionActive(conversationId: string, timeoutMinutes?: number): boolean {
        const session = this.sessionStore.get(conversationId);

        if (!session) {
            return false;
        }

        const timeout = timeoutMinutes || this.sessionTimeoutMinutes;
        const now = new Date();
        const lastActivity = session.lastActivity;
        const timeDiffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

        return timeDiffMinutes <= timeout;
    }

    /**
     * Get session statistics
     */
    public async getSessionStats(conversationId: string): Promise<SessionMetadata | null> {
        try {
            const context = await this.getConversationContext(conversationId);
            return context?.sessionMetadata || null;

        } catch (error) {
            console.error('Error retrieving session stats:', error);
            return null;
        }
    }

    /**
     * Clear all conversations for a user
     */
    public async clearUserConversations(userId: string): Promise<number> {
        try {
            const conversationIds = this.userConversationIndex.get(userId) || new Set();
            let deletedCount = 0;

            for (const conversationId of Array.from(conversationIds)) {
                await this.deleteConversationContext(conversationId);
                deletedCount++;
            }

            // Clear user index
            this.userConversationIndex.delete(userId);

            return deletedCount;

        } catch (error) {
            console.error('Error clearing user conversations:', error);
            return 0;
        }
    }

    /**
     * Get storage statistics
     */
    public getStorageStats(): {
        totalConversations: number;
        totalUsers: number;
        activeSessions: number;
        memoryUsage: string;
    } {
        const activeSessions = Array.from(this.conversationStore.keys())
            .filter(id => this.isSessionActive(id)).length;

        return {
            totalConversations: this.conversationStore.size,
            totalUsers: this.userConversationIndex.size,
            activeSessions,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        };
    }

    /**
     * Private helper: Add conversation to user index
     */
    private addToUserIndex(userId: string, conversationId: string): void {
        if (!this.userConversationIndex.has(userId)) {
            this.userConversationIndex.set(userId, new Set());
        }
        this.userConversationIndex.get(userId)!.add(conversationId);
    }

    /**
     * Private helper: Remove conversation from user index
     */
    private removeFromUserIndex(userId: string, conversationId: string): void {
        const userConversations = this.userConversationIndex.get(userId);
        if (userConversations) {
            userConversations.delete(conversationId);
            if (userConversations.size === 0) {
                this.userConversationIndex.delete(userId);
            }
        }
    }

    /**
     * Private helper: Trim conversation history to max length
     */
    private async trimConversationHistory(conversationId: string): Promise<void> {
        const context = this.conversationStore.get(conversationId);

        if (context && context.conversationHistory.length > this.maxConversationHistory) {
            // Keep only the most recent messages
            context.conversationHistory = context.conversationHistory.slice(-this.maxConversationHistory);
            this.conversationStore.set(conversationId, context);
        }
    }

    /**
     * Private helper: Start cleanup timer for inactive sessions
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupInactiveSessions();
        }, this.cleanupIntervalMinutes * 60 * 1000);
    }

    /**
     * Cleanup inactive conversations (public method)
     */
    public cleanupInactiveConversations(timeoutMinutes?: number): number {
        const inactiveConversations: string[] = [];

        for (const conversationId of Array.from(this.conversationStore.keys())) {
            if (!this.isSessionActive(conversationId, timeoutMinutes)) {
                inactiveConversations.push(conversationId);
            }
        }

        for (const conversationId of inactiveConversations) {
            this.deleteConversationContext(conversationId);
        }

        if (inactiveConversations.length > 0) {
            console.log(`Cleaned up ${inactiveConversations.length} inactive conversations`);
        }

        return inactiveConversations.length;
    }

    /**
     * Private helper: Cleanup inactive sessions
     */
    private cleanupInactiveSessions(): void {
        this.cleanupInactiveConversations();
    }

    /**
     * Shutdown service and cleanup resources
     */
    public shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }

        // Clear all data
        this.conversationStore.clear();
        this.sessionStore.clear();
        this.userConversationIndex.clear();
    }

    // Future Redis integration methods (placeholder implementations)

    /**
     * Initialize Redis connection (for future implementation)
     */
    public async initializeRedis(redisUrl?: string): Promise<void> {
        // TODO: Implement Redis connection
        console.log('Redis initialization not implemented yet');
    }

    /**
     * Migrate data to Redis (for future implementation)
     */
    public async migrateToRedis(): Promise<void> {
        // TODO: Implement data migration to Redis
        console.log('Redis migration not implemented yet');
    }

    /**
     * Export conversation data (for backup/migration)
     */
    public async exportConversationData(): Promise<{
        conversations: ConversationContext[];
        sessions: SessionMetadata[];
        userIndex: Record<string, string[]>;
    }> {
        const conversations = Array.from(this.conversationStore.values());
        const sessions = Array.from(this.sessionStore.values());
        const userIndex: Record<string, string[]> = {};

        for (const [userId, conversationIds] of Array.from(this.userConversationIndex.entries())) {
            userIndex[userId] = Array.from(conversationIds);
        }

        return {
            conversations,
            sessions,
            userIndex
        };
    }

    /**
     * Import conversation data (for backup/migration)
     */
    public async importConversationData(data: {
        conversations: ConversationContext[];
        sessions: SessionMetadata[];
        userIndex: Record<string, string[]>;
    }): Promise<void> {
        // Clear existing data
        this.conversationStore.clear();
        this.sessionStore.clear();
        this.userConversationIndex.clear();

        // Import conversations
        for (const conversation of data.conversations) {
            this.conversationStore.set(conversation.conversationId, conversation);
        }

        // Import sessions
        for (const session of data.sessions) {
            // Find corresponding conversation ID
            const conversation = data.conversations.find(c =>
                c.sessionMetadata.startTime.getTime() === session.startTime.getTime()
            );
            if (conversation) {
                this.sessionStore.set(conversation.conversationId, session);
            }
        }

        // Import user index
        for (const [userId, conversationIds] of Object.entries(data.userIndex)) {
            this.userConversationIndex.set(userId, new Set(conversationIds));
        }
    }
}