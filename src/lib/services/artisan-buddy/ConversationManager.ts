/**
 * Conversation Manager for Artisan Buddy
 * 
 * Orchestrates conversation flow, manages sessions, and coordinates between components.
 * Implements Redis-based message storage with pagination and search capabilities.
 */

import { v4 as uuidv4 } from 'uuid';
import { redisClient } from './RedisClient';
import { contextEngine } from './ContextEngine';
import { conversationContextManager } from './ConversationContextManager';
import {
  Session,
  Message,
  MessageMetadata,
  SessionData,
  MessageEntry,
  ArtisanProfile,
  UserPreferences,
  MAX_CONVERSATION_HISTORY,
  DEFAULT_SESSION_TTL,
} from '@/lib/types/enhanced-artisan-buddy';

export class ConversationManager {
  private static instance: ConversationManager;

  private constructor() { }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Initialize a new conversation session
   */
  async initializeSession(userId: string, language: string = 'en'): Promise<Session> {
    try {
      // Load artisan context
      const artisanContext = await contextEngine.loadArtisanContext(userId);

      // Create session
      const sessionId = uuidv4();
      const now = Date.now();

      const sessionData: SessionData = {
        userId,
        language: language || artisanContext.preferences.language,
        startedAt: now,
        lastActivityAt: now,
        contextHash: this.generateContextHash(artisanContext.profile),
      };

      // Store session in Redis
      await redisClient.storeSession(sessionId, sessionData);

      // Initialize conversation state
      await conversationContextManager.initializeState(sessionId);

      // Create session object
      const session: Session = {
        id: sessionId,
        userId,
        artisanProfile: artisanContext.profile,
        language: sessionData.language,
        startedAt: new Date(sessionData.startedAt),
        lastActivityAt: new Date(sessionData.lastActivityAt),
        context: {
          conversationId: sessionId,
          userId,
          entities: {},
          profileContext: artisanContext.profile,
          conversationHistory: [],
          sessionMetadata: {
            startTime: new Date(sessionData.startedAt),
            lastActivity: new Date(sessionData.lastActivityAt),
            messageCount: 0,
            voiceEnabled: false,
          },
        },
      };

      console.log(`Conversation Manager: Session initialized - ${sessionId}`);
      return session;
    } catch (error) {
      console.error('Conversation Manager: Error initializing session:', error);
      throw error;
    }
  }

  /**
   * Get existing session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionData = await redisClient.getSession(sessionId);

      if (!sessionData) {
        return null;
      }

      // Load artisan context
      const artisanContext = await contextEngine.loadArtisanContext(sessionData.userId);

      // Reconstruct session
      const session: Session = {
        id: sessionId,
        userId: sessionData.userId,
        artisanProfile: artisanContext.profile,
        language: sessionData.language,
        startedAt: new Date(sessionData.startedAt),
        lastActivityAt: new Date(sessionData.lastActivityAt),
        context: {
          conversationId: sessionId,
          userId: sessionData.userId,
          entities: {},
          profileContext: artisanContext.profile,
          conversationHistory: [],
          sessionMetadata: {
            startTime: new Date(sessionData.startedAt),
            lastActivity: new Date(sessionData.lastActivityAt),
            messageCount: 0,
            voiceEnabled: false,
          },
        },
      };

      return session;
    } catch (error) {
      console.error('Conversation Manager: Error getting session:', error);
      return null;
    }
  }

  /**
   * End conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      // Clear conversation state
      await conversationContextManager.clearState(sessionId);

      // Delete session data
      await redisClient.deleteSession(sessionId);

      // Clear messages
      await redisClient.clearMessages(sessionId);

      console.log(`Conversation Manager: Session ended - ${sessionId}`);
    } catch (error) {
      console.error('Conversation Manager: Error ending session:', error);
      throw error;
    }
  }

  // ============================================================================
  // Message Processing Pipeline
  // ============================================================================

  /**
   * Process incoming message
   */
  async processMessage(
    sessionId: string,
    message: Message
  ): Promise<Message> {
    try {
      const startTime = Date.now();

      // Get or create session
      let session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Update session activity
      await redisClient.updateSessionActivity(sessionId);

      // Store user message
      const userMessage = await this.storeMessage(sessionId, message);

      // Update conversation context window
      await conversationContextManager.updateContextWindow(sessionId, userMessage);

      // Update conversation context
      await this.updateConversationContext(sessionId, message);

      const processingTime = Date.now() - startTime;
      console.log(`Conversation Manager: Message processed in ${processingTime}ms`);

      return userMessage;
    } catch (error) {
      console.error('Conversation Manager: Error processing message:', error);
      throw error;
    }
  }

  /**
   * Store message in Redis
   */
  private async storeMessage(sessionId: string, message: Message): Promise<Message> {
    try {
      const messageEntry: MessageEntry = {
        id: message.id || uuidv4(),
        role: message.role,
        content: message.content,
        language: message.language,
        timestamp: message.timestamp.getTime(),
        metadata: JSON.stringify(message.metadata || {}),
      };

      const messageId = await redisClient.addMessage(sessionId, messageEntry);

      return {
        ...message,
        id: messageId,
      };
    } catch (error) {
      console.error('Conversation Manager: Error storing message:', error);
      throw error;
    }
  }

  // ============================================================================
  // Conversation History Retrieval
  // ============================================================================

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string, limit: number = MAX_CONVERSATION_HISTORY): Promise<Message[]> {
    try {
      const messageEntries = await redisClient.getMessages(sessionId, limit);

      return messageEntries.map(entry => ({
        id: entry.id,
        sessionId,
        role: entry.role,
        content: entry.content,
        language: entry.language,
        timestamp: new Date(entry.timestamp),
        metadata: this.parseMetadata(entry.metadata),
      }));
    } catch (error) {
      console.error('Conversation Manager: Error getting history:', error);
      return [];
    }
  }

  /**
   * Get paginated conversation history
   */
  async getPaginatedHistory(
    sessionId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    try {
      // Get all messages
      const allMessages = await this.getHistory(sessionId, 1000);

      // Calculate pagination
      const total = allMessages.length;
      const start = offset;
      const end = offset + limit;
      const messages = allMessages.slice(start, end);
      const hasMore = end < total;

      return {
        messages,
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Conversation Manager: Error getting paginated history:', error);
      return {
        messages: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Search messages in conversation history
   */
  async searchMessages(
    sessionId: string,
    query: string,
    options?: {
      role?: 'user' | 'assistant';
      language?: string;
      limit?: number;
    }
  ): Promise<Message[]> {
    try {
      const allMessages = await this.getHistory(sessionId, 1000);

      // Filter messages based on search criteria
      let filteredMessages = allMessages.filter(msg =>
        msg.content.toLowerCase().includes(query.toLowerCase())
      );

      // Apply additional filters
      if (options?.role) {
        filteredMessages = filteredMessages.filter(msg => msg.role === options.role);
      }

      if (options?.language) {
        filteredMessages = filteredMessages.filter(msg => msg.language === options.language);
      }

      // Limit results
      const limit = options?.limit || 10;
      return filteredMessages.slice(0, limit);
    } catch (error) {
      console.error('Conversation Manager: Error searching messages:', error);
      return [];
    }
  }

  /**
   * Export conversation history
   */
  async exportMessages(
    sessionId: string,
    format: 'json' | 'text' = 'json'
  ): Promise<string> {
    try {
      const messages = await this.getHistory(sessionId, 1000);

      if (format === 'json') {
        return JSON.stringify(messages, null, 2);
      }

      // Text format
      let text = `Conversation Export - Session: ${sessionId}\n`;
      text += `Date: ${new Date().toISOString()}\n`;
      text += `Total Messages: ${messages.length}\n\n`;
      text += '='.repeat(80) + '\n\n';

      messages.forEach((msg, index) => {
        text += `[${index + 1}] ${msg.role.toUpperCase()} (${msg.language})\n`;
        text += `Time: ${msg.timestamp.toISOString()}\n`;
        text += `Content: ${msg.content}\n`;
        if (msg.metadata) {
          text += `Metadata: ${JSON.stringify(msg.metadata)}\n`;
        }
        text += '\n' + '-'.repeat(80) + '\n\n';
      });

      return text;
    } catch (error) {
      console.error('Conversation Manager: Error exporting messages:', error);
      throw error;
    }
  }

  // ============================================================================
  // Session Cleanup
  // ============================================================================

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = 'session:*';
      const sessionKeys = await redisClient.keys(pattern);

      let cleanedCount = 0;
      const now = Date.now();
      const expirationThreshold = DEFAULT_SESSION_TTL * 1000; // Convert to milliseconds

      for (const key of sessionKeys) {
        const sessionId = key.replace('session:', '');
        const sessionData = await redisClient.getSession(sessionId);

        if (sessionData) {
          const age = now - sessionData.lastActivityAt;

          if (age > expirationThreshold) {
            await this.endSession(sessionId);
            cleanedCount++;
          }
        }
      }

      console.log(`Conversation Manager: Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Conversation Manager: Error cleaning up sessions:', error);
      return 0;
    }
  }

  /**
   * Get active session count
   */
  async getActiveSessionCount(): Promise<number> {
    try {
      const pattern = 'session:*';
      const sessionKeys = await redisClient.keys(pattern);
      return sessionKeys.length;
    } catch (error) {
      console.error('Conversation Manager: Error getting session count:', error);
      return 0;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate context hash for cache invalidation
   */
  private generateContextHash(profile: ArtisanProfile): string {
    const data = `${profile.id}-${profile.metadata.updatedAt.getTime()}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Parse message metadata
   */
  private parseMetadata(metadata: string): MessageMetadata | undefined {
    try {
      if (!metadata || metadata === '{}') {
        return undefined;
      }
      return JSON.parse(metadata);
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return undefined;
    }
  }

  /**
   * Extract recent topics from conversation
   */
  private async extractRecentTopics(sessionId: string): Promise<string[]> {
    try {
      const messages = await this.getHistory(sessionId, 10);

      // Simple topic extraction based on message metadata
      const topics = new Set<string>();

      messages.forEach(msg => {
        if (msg.metadata?.intent) {
          topics.add(msg.metadata.intent);
        }
      });

      return Array.from(topics);
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Update conversation context
   */
  private async updateConversationContext(sessionId: string, message: Message): Promise<void> {
    try {
      // Track intent/topic
      if (message.metadata?.intent) {
        await conversationContextManager.trackTopic(sessionId, message.metadata.intent);
        console.log(`Conversation Manager: Tracked intent - ${message.metadata.intent}`);
      }
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  // ============================================================================
  // Context Management Methods
  // ============================================================================

  /**
   * Get conversation context window
   */
  async getContextWindow(sessionId: string, maxMessages?: number): Promise<Message[]> {
    try {
      const messages = await this.getHistory(sessionId, maxMessages || MAX_CONVERSATION_HISTORY);
      return await conversationContextManager.getContextWindow(messages, {
        maxMessages,
        prioritizeRecent: true,
      });
    } catch (error) {
      console.error('Conversation Manager: Error getting context window:', error);
      return [];
    }
  }

  /**
   * Get effective context (summary + recent messages)
   */
  async getEffectiveContext(sessionId: string): Promise<{
    summary?: string;
    recentMessages: Message[];
    totalMessages: number;
  }> {
    try {
      return await conversationContextManager.getEffectiveContext(sessionId);
    } catch (error) {
      console.error('Conversation Manager: Error getting effective context:', error);
      return {
        recentMessages: [],
        totalMessages: 0,
      };
    }
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(sessionId: string): Promise<string> {
    try {
      const messages = await this.getHistory(sessionId, 1000);
      return await conversationContextManager.summarizeConversation(sessionId, messages);
    } catch (error) {
      console.error('Conversation Manager: Error summarizing conversation:', error);
      return '';
    }
  }

  /**
   * Get context statistics
   */
  async getContextStatistics(sessionId: string): Promise<{
    totalMessages: number;
    contextWindowSize: number;
    hasSummary: boolean;
    lastActivity: Date | null;
    qualityScore: number;
  }> {
    try {
      return await conversationContextManager.getContextStatistics(sessionId);
    } catch (error) {
      console.error('Conversation Manager: Error getting context statistics:', error);
      return {
        totalMessages: 0,
        contextWindowSize: 0,
        hasSummary: false,
        lastActivity: null,
        qualityScore: 0,
      };
    }
  }

  /**
   * Handle context overflow
   */
  async handleContextOverflow(sessionId: string): Promise<void> {
    try {
      const messages = await this.getHistory(sessionId, 1000);
      const result = await conversationContextManager.handleContextOverflow(sessionId, messages);

      console.log(`Conversation Manager: Context overflow handled with action: ${result.action}`);
    } catch (error) {
      console.error('Conversation Manager: Error handling context overflow:', error);
    }
  }
}

export const conversationManager = ConversationManager.getInstance();
