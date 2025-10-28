import { z } from 'zod';

// Monitoring event types
export interface AIEvent {
  id: string;
  timestamp: Date;
  type: 'agent_task' | 'workflow_step' | 'genai_call' | 'memory_access' | 'vector_search' | 'error';
  agentId?: string;
  userId?: string;
  sessionId?: string;
  data: any;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Performance metrics
export interface PerformanceMetrics {
  totalEvents: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  eventsByType: Record<string, number>;
  eventsByAgent: Record<string, number>;
  recentErrors: AIEvent[];
}

// AI monitoring and logging system
export class AIMonitoringService {
  private events: AIEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  private metricsCache: PerformanceMetrics | null = null;
  private cacheExpiry: Date | null = null;

  // Log an AI event
  logEvent(event: Omit<AIEvent, 'id' | 'timestamp'>): void {
    const aiEvent: AIEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.events.push(aiEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Clear metrics cache
    this.metricsCache = null;

    // Log to console for debugging
    if (!aiEvent.success || aiEvent.error) {
      console.error('AI Event Error:', aiEvent);
    } else {
      console.log('AI Event:', {
        type: aiEvent.type,
        agentId: aiEvent.agentId,
        duration: aiEvent.duration,
        success: aiEvent.success
      });
    }
  }

  // Log agent task execution
  logAgentTask(
    agentId: string,
    taskType: string,
    userId: string,
    sessionId: string,
    duration: number,
    success: boolean,
    error?: string,
    result?: any
  ): void {
    this.logEvent({
      type: 'agent_task',
      agentId,
      userId,
      sessionId,
      data: { taskType, result },
      duration,
      success,
      error
    });
  }

  // Log GenAI API calls
  logGenAICall(
    operation: string,
    prompt: string,
    userId?: string,
    sessionId?: string,
    duration?: number,
    success: boolean = true,
    error?: string,
    result?: any
  ): void {
    this.logEvent({
      type: 'genai_call',
      userId,
      sessionId,
      data: { operation, prompt: prompt.substring(0, 100), result },
      duration,
      success,
      error
    });
  }

  // Log workflow step execution
  logWorkflowStep(
    workflowId: string,
    stepId: string,
    userId: string,
    sessionId: string,
    duration: number,
    success: boolean,
    error?: string,
    result?: any
  ): void {
    this.logEvent({
      type: 'workflow_step',
      userId,
      sessionId,
      data: { workflowId, stepId, result },
      duration,
      success,
      error
    });
  }

  // Log memory access
  logMemoryAccess(
    operation: 'store' | 'retrieve' | 'update',
    memoryType: string,
    userId: string,
    sessionId: string,
    success: boolean,
    error?: string
  ): void {
    this.logEvent({
      type: 'memory_access',
      userId,
      sessionId,
      data: { operation, memoryType },
      success,
      error
    });
  }

  // Log vector search operations
  logVectorSearch(
    query: string,
    resultCount: number,
    userId?: string,
    sessionId?: string,
    duration?: number,
    success: boolean = true,
    error?: string
  ): void {
    this.logEvent({
      type: 'vector_search',
      userId,
      sessionId,
      data: { query: query.substring(0, 100), resultCount },
      duration,
      success,
      error
    });
  }

  // Get performance metrics
  getMetrics(forceRefresh: boolean = false): PerformanceMetrics {
    // Return cached metrics if available and not expired
    if (!forceRefresh && this.metricsCache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.metricsCache;
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Filter events from the last hour for metrics
    const recentEvents = this.events.filter(event => event.timestamp > oneHourAgo);
    
    const totalEvents = recentEvents.length;
    const successfulEvents = recentEvents.filter(event => event.success).length;
    const errorEvents = recentEvents.filter(event => !event.success);
    
    const eventsWithDuration = recentEvents.filter(event => event.duration !== undefined);
    const averageResponseTime = eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, event) => sum + (event.duration || 0), 0) / eventsWithDuration.length
      : 0;

    const eventsByType: Record<string, number> = {};
    const eventsByAgent: Record<string, number> = {};

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      if (event.agentId) {
        eventsByAgent[event.agentId] = (eventsByAgent[event.agentId] || 0) + 1;
      }
    });

    this.metricsCache = {
      totalEvents,
      successRate: totalEvents > 0 ? successfulEvents / totalEvents : 0,
      averageResponseTime,
      errorRate: totalEvents > 0 ? errorEvents.length / totalEvents : 0,
      eventsByType,
      eventsByAgent,
      recentErrors: errorEvents.slice(-10) // Last 10 errors
    };

    // Cache for 5 minutes
    this.cacheExpiry = new Date(now.getTime() + 5 * 60 * 1000);

    return this.metricsCache;
  }

  // Get events by criteria
  getEvents(criteria: {
    type?: AIEvent['type'];
    agentId?: string;
    userId?: string;
    sessionId?: string;
    success?: boolean;
    since?: Date;
    limit?: number;
  } = {}): AIEvent[] {
    let filtered = this.events;

    if (criteria.type) {
      filtered = filtered.filter(event => event.type === criteria.type);
    }
    if (criteria.agentId) {
      filtered = filtered.filter(event => event.agentId === criteria.agentId);
    }
    if (criteria.userId) {
      filtered = filtered.filter(event => event.userId === criteria.userId);
    }
    if (criteria.sessionId) {
      filtered = filtered.filter(event => event.sessionId === criteria.sessionId);
    }
    if (criteria.success !== undefined) {
      filtered = filtered.filter(event => event.success === criteria.success);
    }
    if (criteria.since) {
      filtered = filtered.filter(event => event.timestamp > criteria.since!);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return criteria.limit ? filtered.slice(0, criteria.limit) : filtered;
  }

  // Get error summary
  getErrorSummary(since?: Date): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByAgent: Record<string, number>;
    commonErrors: Array<{ error: string; count: number }>;
  } {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const errorEvents = this.events.filter(event => 
      !event.success && event.timestamp > sinceDate
    );

    const errorsByType: Record<string, number> = {};
    const errorsByAgent: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    errorEvents.forEach(event => {
      errorsByType[event.type] = (errorsByType[event.type] || 0) + 1;
      if (event.agentId) {
        errorsByAgent[event.agentId] = (errorsByAgent[event.agentId] || 0) + 1;
      }
      if (event.error) {
        errorMessages[event.error] = (errorMessages[event.error] || 0) + 1;
      }
    });

    const commonErrors = Object.entries(errorMessages)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: errorEvents.length,
      errorsByType,
      errorsByAgent,
      commonErrors
    };
  }

  // Clear old events
  clearOldEvents(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    this.metricsCache = null;
  }

  // Export events for analysis
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    } else {
      // CSV format
      const headers = ['id', 'timestamp', 'type', 'agentId', 'userId', 'sessionId', 'duration', 'success', 'error'];
      const csvRows = [headers.join(',')];
      
      this.events.forEach(event => {
        const row = [
          event.id,
          event.timestamp.toISOString(),
          event.type,
          event.agentId || '',
          event.userId || '',
          event.sessionId || '',
          event.duration?.toString() || '',
          event.success.toString(),
          event.error || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }
}

// Global monitoring service instance
export const aiMonitoringService = new AIMonitoringService();