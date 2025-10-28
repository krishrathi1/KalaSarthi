// Core AI infrastructure exports
import { agentOrchestrator } from './agent-orchestrator';
import { agentMemoryManager } from './agent-memory';
import { workflowManager } from './workflow-manager';
import { vectorStore } from './vector-store';

export { agentOrchestrator, type AIAgent, type AgentTask, type AgentContext } from './agent-orchestrator';
export { genAIService } from './genai-service';
export { agentMemoryManager, type MemoryEntry, type ConversationMemory, type PreferenceMemory, type ContextMemory } from './agent-memory';
export { workflowManager, type Workflow, type WorkflowStep, type WorkflowExecution } from './workflow-manager';
export { vectorStore, type VectorDocument, type SearchResult } from './vector-store';
export { aiMonitoringService, type AIEvent, type PerformanceMetrics } from './monitoring';

// Initialize all AI services
export async function initializeAIInfrastructure(): Promise<void> {
  console.log('Initializing AI infrastructure...');
  
  try {
    // Initialize vector store
    await vectorStore.initialize(768);
    
    // Register cleanup intervals
    setInterval(() => {
      agentOrchestrator.cleanupCompletedTasks(24);
      agentMemoryManager.cleanupMemories(30, 0.2);
      workflowManager.cleanupExecutions(24);
    }, 60 * 60 * 1000); // Run cleanup every hour
    
    console.log('AI infrastructure initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI infrastructure:', error);
    throw error;
  }
}

// Health check for AI services
export function getAIHealthStatus(): {
  orchestrator: boolean;
  genai: boolean;
  memory: boolean;
  workflow: boolean;
  vectorStore: boolean;
  stats: {
    activeAgents: number;
    totalMemories: number;
    runningWorkflows: number;
    vectorDocuments: number;
  };
} {
  try {
    const activeAgents = agentOrchestrator.getActiveAgents();
    const memoryStats = agentMemoryManager.getMemoryStats();
    const vectorStats = vectorStore.getStats();
    
    return {
      orchestrator: true,
      genai: true,
      memory: true,
      workflow: true,
      vectorStore: true,
      stats: {
        activeAgents: activeAgents.length,
        totalMemories: memoryStats.totalMemories,
        runningWorkflows: 0, // Would need to track this in workflow manager
        vectorDocuments: vectorStats.totalDocuments
      }
    };
  } catch (error) {
    console.error('AI health check failed:', error);
    return {
      orchestrator: false,
      genai: false,
      memory: false,
      workflow: false,
      vectorStore: false,
      stats: {
        activeAgents: 0,
        totalMemories: 0,
        runningWorkflows: 0,
        vectorDocuments: 0
      }
    };
  }
}