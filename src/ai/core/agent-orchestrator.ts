import { z } from 'zod';

// Core interfaces for AI agent system
export interface AIAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy';
  priority: number;
  lastActivity: Date;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  userId: string;
  sessionId: string;
  conversationHistory: any[];
  userPreferences: Record<string, any>;
  currentTask?: string;
  metadata: Record<string, any>;
}

// Agent orchestration system
export class AgentOrchestrator {
  private agents: Map<string, AIAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private contexts: Map<string, AgentContext> = new Map();

  // Register an AI agent
  registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`Agent registered: ${agent.name} (${agent.id})`);
  }

  // Get available agents by capability
  getAgentsByCapability(capability: string): AIAgent[] {
    return Array.from(this.agents.values())
      .filter(agent => 
        agent.capabilities.includes(capability) && 
        agent.status === 'active'
      )
      .sort((a, b) => b.priority - a.priority);
  }

  // Create a new task for an agent
  async createTask(
    agentId: string, 
    type: string, 
    input: any, 
    context?: AgentContext
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: AgentTask = {
      id: taskId,
      agentId,
      type,
      input,
      status: 'pending',
      createdAt: new Date(),
      metadata: context ? { contextId: context.sessionId } : {}
    };

    this.tasks.set(taskId, task);
    
    // Update agent status
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'busy';
      agent.lastActivity = new Date();
    }

    return taskId;
  }

  // Execute a task
  async executeTask(taskId: string): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const agent = this.agents.get(task.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentId}`);
    }

    try {
      task.status = 'running';
      
      // This would be implemented by specific agent handlers
      const result = await this.executeAgentTask(agent, task);
      
      task.output = result;
      task.status = 'completed';
      task.completedAt = new Date();
      
      // Update agent status
      agent.status = 'active';
      agent.lastActivity = new Date();
      
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = new Date();
      
      // Update agent status
      agent.status = 'active';
      
      throw error;
    }
  }

  // Abstract method to be implemented by specific agent handlers
  private async executeAgentTask(agent: AIAgent, task: AgentTask): Promise<any> {
    // This will be implemented by specific agent types
    throw new Error(`Agent task execution not implemented for agent: ${agent.id}`);
  }

  // Get or create context for a user session
  getOrCreateContext(userId: string, sessionId: string): AgentContext {
    const contextKey = `${userId}_${sessionId}`;
    
    if (!this.contexts.has(contextKey)) {
      const context: AgentContext = {
        userId,
        sessionId,
        conversationHistory: [],
        userPreferences: {},
        metadata: {}
      };
      this.contexts.set(contextKey, context);
    }
    
    return this.contexts.get(contextKey)!;
  }

  // Update context with new information
  updateContext(userId: string, sessionId: string, updates: Partial<AgentContext>): void {
    const contextKey = `${userId}_${sessionId}`;
    const context = this.contexts.get(contextKey);
    
    if (context) {
      Object.assign(context, updates);
    }
  }

  // Get task status
  getTaskStatus(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  // Get agent status
  getAgentStatus(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  // Get all active agents
  getActiveAgents(): AIAgent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === 'active');
  }

  // Cleanup completed tasks (for memory management)
  cleanupCompletedTasks(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' && task.completedAt && task.completedAt < cutoffTime) {
        this.tasks.delete(taskId);
      }
    }
  }
}

// Global orchestrator instance
export const agentOrchestrator = new AgentOrchestrator();