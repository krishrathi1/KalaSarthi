import { z } from 'zod';
import { agentOrchestrator, AgentContext } from './agent-orchestrator';
import { genAIService } from './genai-service';

// Workflow step definition
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentCapability: string;
  inputSchema: z.ZodSchema<any>;
  outputSchema: z.ZodSchema<any>;
  conditions?: {
    skipIf?: (context: any) => boolean;
    retryIf?: (result: any) => boolean;
    maxRetries?: number;
  };
  timeout?: number; // in milliseconds
}

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: string[];
  metadata?: Record<string, any>;
}

// Workflow execution context
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStepIndex: number;
  stepResults: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  error?: string;
  context: AgentContext;
}

// Agentic workflow manager
export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  // Register a workflow
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    console.log(`Workflow registered: ${workflow.name} (${workflow.id})`);
  }

  // Start workflow execution
  async startWorkflow(
    workflowId: string,
    userId: string,
    sessionId: string,
    initialInput: any
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      userId,
      sessionId,
      status: 'pending',
      currentStepIndex: 0,
      stepResults: { initial: initialInput },
      startTime: new Date(),
      context: agentOrchestrator.getOrCreateContext(userId, sessionId)
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.executeWorkflow(executionId).catch(error => {
      console.error(`Workflow execution failed: ${executionId}`, error);
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
    });

    return executionId;
  }

  // Execute workflow steps
  private async executeWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    execution.status = 'running';

    try {
      for (let i = execution.currentStepIndex; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        execution.currentStepIndex = i;

        // Check skip conditions
        if (step.conditions?.skipIf?.(execution.stepResults)) {
          console.log(`Skipping step: ${step.name}`);
          continue;
        }

        // Execute step with retries
        const result = await this.executeStepWithRetries(step, execution);
        execution.stepResults[step.id] = result;

        // Update context with step result
        agentOrchestrator.updateContext(execution.userId, execution.sessionId, {
          currentTask: step.name,
          metadata: { ...execution.context.metadata, [step.id]: result }
        });
      }

      execution.status = 'completed';
      execution.endTime = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      throw error;
    }
  }

  // Execute a single step with retry logic
  private async executeStepWithRetries(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const maxRetries = step.conditions?.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get input for this step
        const input = this.getStepInput(step, execution);
        
        // Validate input
        const validatedInput = step.inputSchema.parse(input);

        // Find appropriate agent
        const agents = agentOrchestrator.getAgentsByCapability(step.agentCapability);
        if (agents.length === 0) {
          throw new Error(`No agents available for capability: ${step.agentCapability}`);
        }

        // Create and execute task
        const taskId = await agentOrchestrator.createTask(
          agents[0].id,
          step.name,
          validatedInput,
          execution.context
        );

        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => agentOrchestrator.executeTask(taskId),
          step.timeout || 30000
        );

        // Validate output
        const validatedOutput = step.outputSchema.parse(result);

        // Check retry conditions
        if (step.conditions?.retryIf?.(validatedOutput)) {
          throw new Error('Step result requires retry');
        }

        return validatedOutput;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Step ${step.name} attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('Step execution failed');
  }

  // Get input for a workflow step
  private getStepInput(step: WorkflowStep, execution: WorkflowExecution): any {
    // For the first step, use initial input
    if (execution.currentStepIndex === 0) {
      return execution.stepResults.initial;
    }

    // For subsequent steps, combine previous results
    const previousStep = this.workflows.get(execution.workflowId)!.steps[execution.currentStepIndex - 1];
    return {
      previousResult: execution.stepResults[previousStep.id],
      allResults: execution.stepResults,
      context: execution.context
    };
  }

  // Execute with timeout
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Pause workflow execution
  pauseWorkflow(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
    }
  }

  // Resume workflow execution
  async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'running';
      await this.executeWorkflow(executionId);
    }
  }

  // Get workflow execution status
  getExecutionStatus(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Get all workflows
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  // Get workflow by trigger
  getWorkflowsByTrigger(trigger: string): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(workflow => workflow.triggers.includes(trigger));
  }

  // Auto-trigger workflows based on events
  async triggerWorkflows(
    trigger: string,
    userId: string,
    sessionId: string,
    data: any
  ): Promise<string[]> {
    const workflows = this.getWorkflowsByTrigger(trigger);
    const executionIds: string[] = [];

    for (const workflow of workflows) {
      try {
        const executionId = await this.startWorkflow(workflow.id, userId, sessionId, data);
        executionIds.push(executionId);
      } catch (error) {
        console.error(`Failed to trigger workflow ${workflow.id}:`, error);
      }
    }

    return executionIds;
  }

  // Cleanup completed executions
  cleanupExecutions(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [executionId, execution] of this.executions.entries()) {
      if (execution.endTime && execution.endTime < cutoffTime) {
        this.executions.delete(executionId);
      }
    }
  }
}

// Global workflow manager instance
export const workflowManager = new WorkflowManager();