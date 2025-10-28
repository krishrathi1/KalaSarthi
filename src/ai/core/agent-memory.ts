import { z } from 'zod';

// Memory types for AI agents
export interface MemoryEntry {
  id: string;
  agentId: string;
  userId: string;
  sessionId: string;
  type: 'conversation' | 'preference' | 'context' | 'decision' | 'feedback';
  content: any;
  timestamp: Date;
  importance: number; // 0-1 scale
  tags: string[];
  metadata?: Record<string, any>;
}

export interface ConversationMemory {
  messages: Array<{
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  summary?: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PreferenceMemory {
  category: string;
  preferences: Record<string, any>;
  confidence: number;
  lastUpdated: Date;
  source: 'explicit' | 'inferred' | 'behavioral';
}

export interface ContextMemory {
  currentGoal?: string;
  activeTask?: string;
  userState: 'browsing' | 'searching' | 'negotiating' | 'ordering' | 'waiting';
  environment: Record<string, any>;
  constraints: string[];
}

// Agent memory management system
export class AgentMemoryManager {
  private memories: Map<string, MemoryEntry> = new Map();
  private userMemories: Map<string, MemoryEntry[]> = new Map();
  private sessionMemories: Map<string, MemoryEntry[]> = new Map();

  // Store a memory entry
  storeMemory(memory: Omit<MemoryEntry, 'id' | 'timestamp'>): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const memoryEntry: MemoryEntry = {
      ...memory,
      id,
      timestamp: new Date()
    };

    this.memories.set(id, memoryEntry);

    // Index by user
    if (!this.userMemories.has(memory.userId)) {
      this.userMemories.set(memory.userId, []);
    }
    this.userMemories.get(memory.userId)!.push(memoryEntry);

    // Index by session
    const sessionKey = `${memory.userId}_${memory.sessionId}`;
    if (!this.sessionMemories.has(sessionKey)) {
      this.sessionMemories.set(sessionKey, []);
    }
    this.sessionMemories.get(sessionKey)!.push(memoryEntry);

    return id;
  }

  // Retrieve memories by user
  getUserMemories(
    userId: string, 
    type?: MemoryEntry['type'],
    limit?: number
  ): MemoryEntry[] {
    const userMems = this.userMemories.get(userId) || [];
    
    let filtered = type 
      ? userMems.filter(mem => mem.type === type)
      : userMems;

    // Sort by importance and recency
    filtered.sort((a, b) => {
      const importanceScore = b.importance - a.importance;
      if (Math.abs(importanceScore) > 0.1) return importanceScore;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return limit ? filtered.slice(0, limit) : filtered;
  }

  // Retrieve memories by session
  getSessionMemories(
    userId: string, 
    sessionId: string,
    type?: MemoryEntry['type']
  ): MemoryEntry[] {
    const sessionKey = `${userId}_${sessionId}`;
    const sessionMems = this.sessionMemories.get(sessionKey) || [];
    
    return type 
      ? sessionMems.filter(mem => mem.type === type)
      : sessionMems;
  }

  // Store conversation memory
  storeConversation(
    agentId: string,
    userId: string,
    sessionId: string,
    conversation: ConversationMemory,
    importance: number = 0.5
  ): string {
    return this.storeMemory({
      agentId,
      userId,
      sessionId,
      type: 'conversation',
      content: conversation,
      importance,
      tags: ['conversation', 'chat']
    });
  }

  // Store user preferences
  storePreferences(
    agentId: string,
    userId: string,
    sessionId: string,
    preferences: PreferenceMemory,
    importance: number = 0.8
  ): string {
    return this.storeMemory({
      agentId,
      userId,
      sessionId,
      type: 'preference',
      content: preferences,
      importance,
      tags: ['preferences', preferences.category]
    });
  }

  // Store context information
  storeContext(
    agentId: string,
    userId: string,
    sessionId: string,
    context: ContextMemory,
    importance: number = 0.6
  ): string {
    return this.storeMemory({
      agentId,
      userId,
      sessionId,
      type: 'context',
      content: context,
      importance,
      tags: ['context', context.userState]
    });
  }

  // Get relevant context for AI decision making
  getRelevantContext(
    userId: string,
    sessionId: string,
    currentTask?: string,
    limit: number = 10
  ): {
    conversations: ConversationMemory[];
    preferences: PreferenceMemory[];
    context: ContextMemory[];
    decisions: any[];
  } {
    const sessionMems = this.getSessionMemories(userId, sessionId);
    const userMems = this.getUserMemories(userId, undefined, 20);
    
    // Combine and filter relevant memories
    const allRelevant = [...sessionMems, ...userMems]
      .filter(mem => {
        if (currentTask && mem.tags.includes(currentTask)) return true;
        return mem.importance > 0.3; // Only include moderately important memories
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return {
      conversations: allRelevant
        .filter(mem => mem.type === 'conversation')
        .map(mem => mem.content as ConversationMemory),
      preferences: allRelevant
        .filter(mem => mem.type === 'preference')
        .map(mem => mem.content as PreferenceMemory),
      context: allRelevant
        .filter(mem => mem.type === 'context')
        .map(mem => mem.content as ContextMemory),
      decisions: allRelevant
        .filter(mem => mem.type === 'decision')
        .map(mem => mem.content)
    };
  }

  // Update memory importance based on feedback
  updateMemoryImportance(memoryId: string, newImportance: number): void {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.importance = Math.max(0, Math.min(1, newImportance));
    }
  }

  // Clean up old, low-importance memories
  cleanupMemories(olderThanDays: number = 30, minImportance: number = 0.2): void {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    for (const [id, memory] of this.memories.entries()) {
      if (memory.timestamp < cutoffTime && memory.importance < minImportance) {
        this.memories.delete(id);
        
        // Remove from user index
        const userMems = this.userMemories.get(memory.userId);
        if (userMems) {
          const index = userMems.findIndex(m => m.id === id);
          if (index > -1) userMems.splice(index, 1);
        }
        
        // Remove from session index
        const sessionKey = `${memory.userId}_${memory.sessionId}`;
        const sessionMems = this.sessionMemories.get(sessionKey);
        if (sessionMems) {
          const index = sessionMems.findIndex(m => m.id === id);
          if (index > -1) sessionMems.splice(index, 1);
        }
      }
    }
  }

  // Get memory statistics
  getMemoryStats(): {
    totalMemories: number;
    memoriesByType: Record<string, number>;
    memoriesByImportance: Record<string, number>;
    oldestMemory?: Date;
    newestMemory?: Date;
  } {
    const memories = Array.from(this.memories.values());
    
    const stats = {
      totalMemories: memories.length,
      memoriesByType: {} as Record<string, number>,
      memoriesByImportance: {
        high: 0,
        medium: 0,
        low: 0
      },
      oldestMemory: undefined as Date | undefined,
      newestMemory: undefined as Date | undefined
    };

    memories.forEach(mem => {
      // Count by type
      stats.memoriesByType[mem.type] = (stats.memoriesByType[mem.type] || 0) + 1;
      
      // Count by importance
      if (mem.importance > 0.7) stats.memoriesByImportance.high++;
      else if (mem.importance > 0.4) stats.memoriesByImportance.medium++;
      else stats.memoriesByImportance.low++;
      
      // Track oldest and newest
      if (!stats.oldestMemory || mem.timestamp < stats.oldestMemory) {
        stats.oldestMemory = mem.timestamp;
      }
      if (!stats.newestMemory || mem.timestamp > stats.newestMemory) {
        stats.newestMemory = mem.timestamp;
      }
    });

    return stats;
  }
}

// Global memory manager instance
export const agentMemoryManager = new AgentMemoryManager();