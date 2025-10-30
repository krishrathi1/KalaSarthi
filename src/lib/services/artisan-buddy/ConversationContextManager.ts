/**
 * Conversation Context Manager for Artisan Buddy
 * 
 * Manages conversation state, context window, and provides summarization for long threads.
 * Handles context overflow gracefully with intelligent truncation and summarization.
 */

import { redisClient } from './RedisClient';
import {
  Message,
  ConversationContext,
  Action,
  UserPreferences,
  MAX_CONVERSATION_HISTORY,
} from '@/lib/types/artisan-buddy';

export interface ConversationState {
  sessionId: string;
  currentTopic?: string;
  conversationFlow: ConversationFlowState;
  contextWindow: Message[];
  summary?: string;
  messageCount: number;
  lastSummarizedAt?: Date;
}

export type ConversationFlowState = 
  | 'greeting'
  | 'information_gathering'
  | 'query_handling'
  | 'action_execution'
  | 'clarification'
  | 'closing';

export interface ContextWindowOptions {
  maxMessages?: number;
  includeSystemMessages?: boolean;
  prioritizeRecent?: boolean;
}

export interface SummarizationOptions {
  maxLength?: number;
  includeKeyPoints?: boolean;
  language?: string;
}

export class ConversationContextManager {
  private static instance: ConversationContextManager;
  private readonly CONTEXT_WINDOW_SIZE = MAX_CONVERSATION_HISTORY;
  private readonly SUMMARIZATION_THRESHOLD = 50; // Summarize after 50 messages
  private readonly SUMMARY_CACHE_TTL = 3600; // 1 hour

  private constructor() {}

  public static getInstance(): ConversationContextManager {
    if (!ConversationContextManager.instance) {
      ConversationContextManager.instance = new ConversationContextManager();
    }
    return ConversationContextManager.instance;
  }

  // ============================================================================
  // Conversation State Management
  // ============================================================================

  /**
   * Initialize conversation state
   */
  async initializeState(sessionId: string): Promise<ConversationState> {
    const state: ConversationState = {
      sessionId,
      conversationFlow: 'greeting',
      contextWindow: [],
      messageCount: 0,
    };

    await this.saveState(sessionId, state);
    return state;
  }

  /**
   * Get conversation state
   */
  async getState(sessionId: string): Promise<ConversationState | null> {
    try {
      const cached = await redisClient.getCachedJSON<ConversationState>(
        `conversation_state:${sessionId}`
      );
      return cached;
    } catch (error) {
      console.error('Error getting conversation state:', error);
      return null;
    }
  }

  /**
   * Save conversation state
   */
  async saveState(sessionId: string, state: ConversationState): Promise<void> {
    try {
      await redisClient.cacheJSON(
        `conversation_state:${sessionId}`,
        state,
        this.SUMMARY_CACHE_TTL
      );
    } catch (error) {
      console.error('Error saving conversation state:', error);
    }
  }

  /**
   * Update conversation flow state
   */
  async updateFlowState(
    sessionId: string,
    flowState: ConversationFlowState
  ): Promise<void> {
    try {
      const state = await this.getState(sessionId);
      if (state) {
        state.conversationFlow = flowState;
        await this.saveState(sessionId, state);
        console.log(`Context Manager: Flow state updated to ${flowState}`);
      }
    } catch (error) {
      console.error('Error updating flow state:', error);
    }
  }

  /**
   * Track current topic
   */
  async trackTopic(sessionId: string, topic: string): Promise<void> {
    try {
      const state = await this.getState(sessionId);
      if (state) {
        state.currentTopic = topic;
        await this.saveState(sessionId, state);
      }
    } catch (error) {
      console.error('Error tracking topic:', error);
    }
  }

  // ============================================================================
  // Context Window Management
  // ============================================================================

  /**
   * Get context window (last N messages)
   */
  async getContextWindow(
    messages: Message[],
    options?: ContextWindowOptions
  ): Promise<Message[]> {
    const maxMessages = options?.maxMessages || this.CONTEXT_WINDOW_SIZE;
    const includeSystemMessages = options?.includeSystemMessages ?? true;
    const prioritizeRecent = options?.prioritizeRecent ?? true;

    let filteredMessages = messages;

    // Filter out system messages if needed
    if (!includeSystemMessages) {
      filteredMessages = messages.filter(msg => 
        msg.role === 'user' || msg.role === 'assistant'
      );
    }

    // Get most recent messages
    if (prioritizeRecent) {
      filteredMessages = filteredMessages.slice(-maxMessages);
    } else {
      filteredMessages = filteredMessages.slice(0, maxMessages);
    }

    return filteredMessages;
  }

  /**
   * Update context window with new message
   */
  async updateContextWindow(
    sessionId: string,
    newMessage: Message
  ): Promise<Message[]> {
    try {
      const state = await this.getState(sessionId) || await this.initializeState(sessionId);
      
      // Add new message to context window
      state.contextWindow.push(newMessage);
      state.messageCount++;

      // Trim context window if it exceeds max size
      if (state.contextWindow.length > this.CONTEXT_WINDOW_SIZE) {
        // Check if we need to summarize
        if (state.messageCount >= this.SUMMARIZATION_THRESHOLD && !state.summary) {
          await this.summarizeConversation(sessionId, state.contextWindow);
        }

        // Keep only recent messages
        state.contextWindow = state.contextWindow.slice(-this.CONTEXT_WINDOW_SIZE);
      }

      await this.saveState(sessionId, state);
      return state.contextWindow;
    } catch (error) {
      console.error('Error updating context window:', error);
      return [];
    }
  }

  /**
   * Get effective context (window + summary)
   */
  async getEffectiveContext(sessionId: string): Promise<{
    summary?: string;
    recentMessages: Message[];
    totalMessages: number;
  }> {
    try {
      const state = await this.getState(sessionId);
      
      if (!state) {
        return {
          recentMessages: [],
          totalMessages: 0,
        };
      }

      return {
        summary: state.summary,
        recentMessages: state.contextWindow,
        totalMessages: state.messageCount,
      };
    } catch (error) {
      console.error('Error getting effective context:', error);
      return {
        recentMessages: [],
        totalMessages: 0,
      };
    }
  }

  // ============================================================================
  // Conversation Summarization
  // ============================================================================

  /**
   * Summarize conversation for long threads
   */
  async summarizeConversation(
    sessionId: string,
    messages: Message[],
    options?: SummarizationOptions
  ): Promise<string> {
    try {
      const maxLength = options?.maxLength || 500;
      const includeKeyPoints = options?.includeKeyPoints ?? true;

      // Simple extractive summarization
      // In production, this would use an LLM for better summarization
      const summary = this.extractiveSummarization(messages, maxLength, includeKeyPoints);

      // Cache the summary
      const state = await this.getState(sessionId);
      if (state) {
        state.summary = summary;
        state.lastSummarizedAt = new Date();
        await this.saveState(sessionId, state);
      }

      console.log(`Context Manager: Conversation summarized (${summary.length} chars)`);
      return summary;
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      return '';
    }
  }

  /**
   * Extractive summarization (simple implementation)
   */
  private extractiveSummarization(
    messages: Message[],
    maxLength: number,
    includeKeyPoints: boolean
  ): string {
    // Group messages by topic/intent
    const topicGroups = this.groupMessagesByTopic(messages);

    let summary = 'Conversation Summary:\n\n';

    // Extract key exchanges
    for (const [topic, msgs] of Object.entries(topicGroups)) {
      if (msgs.length > 0) {
        summary += `${topic}:\n`;
        
        // Get first user message and assistant response
        const userMsg = msgs.find(m => m.role === 'user');
        const assistantMsg = msgs.find(m => m.role === 'assistant');

        if (userMsg) {
          summary += `- User asked: ${this.truncateText(userMsg.content, 100)}\n`;
        }
        if (assistantMsg) {
          summary += `- Assistant: ${this.truncateText(assistantMsg.content, 150)}\n`;
        }
        summary += '\n';
      }
    }

    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  }

  /**
   * Group messages by topic/intent
   */
  private groupMessagesByTopic(messages: Message[]): Record<string, Message[]> {
    const groups: Record<string, Message[]> = {};

    messages.forEach(msg => {
      const topic = msg.metadata?.intent || 'general';
      if (!groups[topic]) {
        groups[topic] = [];
      }
      groups[topic].push(msg);
    });

    return groups;
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  // ============================================================================
  // Context Overflow Handling
  // ============================================================================

  /**
   * Handle context overflow gracefully
   */
  async handleContextOverflow(
    sessionId: string,
    messages: Message[]
  ): Promise<{
    action: 'summarize' | 'truncate' | 'archive';
    result: Message[] | string;
  }> {
    try {
      const state = await this.getState(sessionId);
      
      if (!state) {
        return {
          action: 'truncate',
          result: messages.slice(-this.CONTEXT_WINDOW_SIZE),
        };
      }

      // Decide on overflow strategy
      if (messages.length > this.SUMMARIZATION_THRESHOLD && !state.summary) {
        // Summarize old messages
        const summary = await this.summarizeConversation(sessionId, messages);
        
        return {
          action: 'summarize',
          result: summary,
        };
      } else if (messages.length > this.CONTEXT_WINDOW_SIZE * 2) {
        // Archive very old messages
        await this.archiveMessages(sessionId, messages.slice(0, -this.CONTEXT_WINDOW_SIZE));
        
        return {
          action: 'archive',
          result: messages.slice(-this.CONTEXT_WINDOW_SIZE),
        };
      } else {
        // Simple truncation
        return {
          action: 'truncate',
          result: messages.slice(-this.CONTEXT_WINDOW_SIZE),
        };
      }
    } catch (error) {
      console.error('Error handling context overflow:', error);
      return {
        action: 'truncate',
        result: messages.slice(-this.CONTEXT_WINDOW_SIZE),
      };
    }
  }

  /**
   * Archive old messages
   */
  private async archiveMessages(sessionId: string, messages: Message[]): Promise<void> {
    try {
      // Store archived messages with longer TTL
      const archiveKey = `archived_messages:${sessionId}`;
      await redisClient.cacheJSON(archiveKey, messages, 7 * 24 * 60 * 60); // 7 days
      
      console.log(`Context Manager: Archived ${messages.length} messages`);
    } catch (error) {
      console.error('Error archiving messages:', error);
    }
  }

  /**
   * Get archived messages
   */
  async getArchivedMessages(sessionId: string): Promise<Message[]> {
    try {
      const archiveKey = `archived_messages:${sessionId}`;
      const archived = await redisClient.getCachedJSON<Message[]>(archiveKey);
      return archived || [];
    } catch (error) {
      console.error('Error getting archived messages:', error);
      return [];
    }
  }

  // ============================================================================
  // Context Quality Metrics
  // ============================================================================

  /**
   * Calculate context quality score
   */
  calculateContextQuality(messages: Message[]): {
    score: number;
    factors: {
      recency: number;
      coherence: number;
      completeness: number;
    };
  } {
    const now = Date.now();
    
    // Recency score (how recent are the messages)
    const avgAge = messages.reduce((sum, msg) => {
      return sum + (now - msg.timestamp.getTime());
    }, 0) / messages.length;
    const recency = Math.max(0, 1 - (avgAge / (24 * 60 * 60 * 1000))); // Decay over 24 hours

    // Coherence score (do messages have consistent topics)
    const topics = new Set(messages.map(m => m.metadata?.intent || 'general'));
    const coherence = Math.max(0, 1 - (topics.size / messages.length));

    // Completeness score (do we have both user and assistant messages)
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const completeness = Math.min(userMessages, assistantMessages) / Math.max(userMessages, assistantMessages, 1);

    // Overall score
    const score = (recency * 0.3 + coherence * 0.3 + completeness * 0.4);

    return {
      score,
      factors: {
        recency,
        coherence,
        completeness,
      },
    };
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
      const state = await this.getState(sessionId);
      
      if (!state) {
        return {
          totalMessages: 0,
          contextWindowSize: 0,
          hasSummary: false,
          lastActivity: null,
          qualityScore: 0,
        };
      }

      const quality = this.calculateContextQuality(state.contextWindow);

      return {
        totalMessages: state.messageCount,
        contextWindowSize: state.contextWindow.length,
        hasSummary: !!state.summary,
        lastActivity: state.contextWindow.length > 0 
          ? state.contextWindow[state.contextWindow.length - 1].timestamp 
          : null,
        qualityScore: quality.score,
      };
    } catch (error) {
      console.error('Error getting context statistics:', error);
      return {
        totalMessages: 0,
        contextWindowSize: 0,
        hasSummary: false,
        lastActivity: null,
        qualityScore: 0,
      };
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear conversation state
   */
  async clearState(sessionId: string): Promise<void> {
    try {
      await redisClient.deleteCached(`conversation_state:${sessionId}`);
      await redisClient.deleteCached(`archived_messages:${sessionId}`);
      console.log(`Context Manager: Cleared state for session ${sessionId}`);
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }
}

export const conversationContextManager = ConversationContextManager.getInstance();
