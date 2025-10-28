/**
 * Matching Analytics Service
 * 
 * This service provides comprehensive logging for profession detection decisions,
 * analytics tracking, and performance monitoring for the intelligent matching system.
 */

export interface MatchingDecisionLog {
  id: string;
  timestamp: Date;
  query: string;
  queryHash: string;
  userId?: string;
  sessionId?: string;
  
  // Query Analysis
  queryAnalysis: {
    detectedProfession: string;
    confidence: number;
    extractedMaterials: string[];
    extractedTechniques: string[];
    extractedProducts: string[];
    intent: {
      action: string;
      urgency: string;
      budget: string;
    };
    complexity: 'simple' | 'moderate' | 'complex';
  };
  
  // Matching Results
  matchingResults: {
    totalArtisansEvaluated: number;
    totalMatches: number;
    averageRelevanceScore: number;
    highQualityMatches: number; // score > 0.7
    mediumQualityMatches: number; // score 0.4-0.7
    lowQualityMatches: number; // score < 0.4
    topMatchScore: number;
    searchMethod: 'intelligent' | 'vector' | 'hybrid' | 'fallback';
    fallbackUsed: boolean;
  };
  
  // Performance Metrics
  performance: {
    totalProcessingTime: number;
    aiAnalysisTime: number;
    retrievalTime: number;
    scoringTime: number;
    cacheHit: boolean;
    systemHealth: {
      aiServiceHealthy: boolean;
      databaseHealthy: boolean;
    };
  };
  
  // User Interaction
  userInteraction?: {
    selectedArtisanId?: string;
    selectedArtisanRank?: number;
    selectedArtisanScore?: number;
    timeToSelection?: number;
    contactInitiated?: boolean;
    feedbackProvided?: boolean;
    feedbackRating?: number;
  };
}

export interface AnalyticsMetrics {
  // Query Patterns
  queryPatterns: {
    totalQueries: number;
    uniqueQueries: number;
    averageQueryLength: number;
    mostCommonProfessions: Array<{ profession: string; count: number; percentage: number }>;
    mostCommonMaterials: Array<{ material: string; count: number; percentage: number }>;
    mostCommonTechniques: Array<{ technique: string; count: number; percentage: number }>;
    intentDistribution: Record<string, number>;
    complexityDistribution: Record<string, number>;
  };
  
  // Matching Performance
  matchingPerformance: {
    averageProcessingTime: number;
    averageConfidence: number;
    averageMatchCount: number;
    successRate: number; // queries with at least one match
    highQualityRate: number; // queries with high-quality matches
    fallbackRate: number; // queries that used fallback
    cacheHitRate: number;
  };
  
  // System Health
  systemHealth: {
    aiServiceUptime: number;
    averageResponseTime: number;
    errorRate: number;
    lastHealthCheck: Date;
    serviceStatus: 'healthy' | 'degraded' | 'unhealthy';
  };
  
  // User Engagement
  userEngagement: {
    averageTimeToSelection: number;
    selectionRate: number; // users who select an artisan
    contactRate: number; // users who initiate contact
    satisfactionScore: number;
    repeatUsageRate: number;
  };
  
  // Business Metrics
  businessMetrics: {
    totalSearches: number;
    uniqueUsers: number;
    successfulConnections: number;
    conversionRate: number;
    revenueAttribution?: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'accuracy' | 'system' | 'business';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export class MatchingAnalyticsService {
  private static instance: MatchingAnalyticsService;
  
  // In-memory storage (in production, use database)
  private decisionLogs: Map<string, MatchingDecisionLog> = new Map();
  private performanceAlerts: Map<string, PerformanceAlert> = new Map();
  
  // Analytics aggregation cache
  private metricsCache: AnalyticsMetrics | null = null;
  private metricsCacheExpiry: Date | null = null;
  private cacheValidityPeriod = 300000; // 5 minutes
  
  // Performance thresholds
  private thresholds = {
    maxProcessingTime: 5000, // 5 seconds
    minSuccessRate: 0.8, // 80%
    minConfidence: 0.4, // 40%
    maxErrorRate: 0.05, // 5%
    minCacheHitRate: 0.3 // 30%
  };

  private constructor() {
    // Start periodic cleanup and aggregation
    setInterval(() => this.performPeriodicTasks(), 60000); // Every minute
  }

  public static getInstance(): MatchingAnalyticsService {
    if (!MatchingAnalyticsService.instance) {
      MatchingAnalyticsService.instance = new MatchingAnalyticsService();
    }
    return MatchingAnalyticsService.instance;
  }

  /**
   * Log a matching decision with comprehensive details
   */
  public logMatchingDecision(decision: Omit<MatchingDecisionLog, 'id' | 'timestamp'>): string {
    const id = `decision_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const log: MatchingDecisionLog = {
      id,
      timestamp: new Date(),
      ...decision
    };

    this.decisionLogs.set(id, log);
    
    // Check for performance issues and create alerts
    this.checkPerformanceThresholds(log);
    
    // Invalidate metrics cache
    this.invalidateMetricsCache();
    
    return id;
  }

  /**
   * Update user interaction data for a logged decision
   */
  public updateUserInteraction(
    decisionId: string, 
    interaction: MatchingDecisionLog['userInteraction']
  ): void {
    const log = this.decisionLogs.get(decisionId);
    if (log) {
      log.userInteraction = { ...log.userInteraction, ...interaction };
      this.decisionLogs.set(decisionId, log);
      this.invalidateMetricsCache();
    }
  }

  /**
   * Get comprehensive analytics metrics
   */
  public getAnalyticsMetrics(): AnalyticsMetrics {
    // Return cached metrics if valid
    if (this.metricsCache && this.metricsCacheExpiry && Date.now() < this.metricsCacheExpiry.getTime()) {
      return this.metricsCache;
    }

    // Calculate fresh metrics
    const logs = Array.from(this.decisionLogs.values());
    const metrics = this.calculateMetrics(logs);
    
    // Cache the results
    this.metricsCache = metrics;
    this.metricsCacheExpiry = new Date(Date.now() + this.cacheValidityPeriod);
    
    return metrics;
  }

  /**
   * Get performance alerts
   */
  public getPerformanceAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    const alerts = Array.from(this.performanceAlerts.values());
    
    if (severity) {
      return alerts.filter(alert => alert.severity === severity && !alert.resolved);
    }
    
    return alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get decision logs with filtering
   */
  public getDecisionLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    profession?: string;
    searchMethod?: string;
    minConfidence?: number;
    limit?: number;
  }): MatchingDecisionLog[] {
    let logs = Array.from(this.decisionLogs.values());
    
    if (filters) {
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      
      if (filters.profession) {
        logs = logs.filter(log => 
          log.queryAnalysis.detectedProfession.toLowerCase().includes(filters.profession!.toLowerCase())
        );
      }
      
      if (filters.searchMethod) {
        logs = logs.filter(log => log.matchingResults.searchMethod === filters.searchMethod);
      }
      
      if (filters.minConfidence) {
        logs = logs.filter(log => log.queryAnalysis.confidence >= filters.minConfidence!);
      }
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  }

  /**
   * Get query pattern analysis
   */
  public getQueryPatterns(timeRange?: { start: Date; end: Date }): {
    commonQueries: Array<{ query: string; count: number; avgConfidence: number }>;
    professionTrends: Array<{ profession: string; count: number; trend: 'up' | 'down' | 'stable' }>;
    materialTrends: Array<{ material: string; count: number; trend: 'up' | 'down' | 'stable' }>;
    performanceByComplexity: Record<string, { avgTime: number; avgConfidence: number; successRate: number }>;
  } {
    const logs = timeRange ? 
      this.getDecisionLogs({ startDate: timeRange.start, endDate: timeRange.end }) :
      Array.from(this.decisionLogs.values());

    // Analyze common queries
    const queryMap = new Map<string, { count: number; totalConfidence: number }>();
    logs.forEach(log => {
      const normalizedQuery = log.query.toLowerCase().trim();
      const existing = queryMap.get(normalizedQuery) || { count: 0, totalConfidence: 0 };
      queryMap.set(normalizedQuery, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + log.queryAnalysis.confidence
      });
    });

    const commonQueries = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgConfidence: data.totalConfidence / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Analyze profession trends (simplified - in production, compare with historical data)
    const professionCounts = new Map<string, number>();
    logs.forEach(log => {
      const profession = log.queryAnalysis.detectedProfession;
      professionCounts.set(profession, (professionCounts.get(profession) || 0) + 1);
    });

    const professionTrends = Array.from(professionCounts.entries())
      .map(([profession, count]) => ({
        profession,
        count,
        trend: 'stable' as const // Simplified - would need historical comparison
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze material trends
    const materialCounts = new Map<string, number>();
    logs.forEach(log => {
      log.queryAnalysis.extractedMaterials.forEach(material => {
        materialCounts.set(material, (materialCounts.get(material) || 0) + 1);
      });
    });

    const materialTrends = Array.from(materialCounts.entries())
      .map(([material, count]) => ({
        material,
        count,
        trend: 'stable' as const
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Performance by complexity
    const complexityGroups = logs.reduce((groups, log) => {
      const complexity = log.queryAnalysis.complexity;
      if (!groups[complexity]) {
        groups[complexity] = [];
      }
      groups[complexity].push(log);
      return groups;
    }, {} as Record<string, MatchingDecisionLog[]>);

    const performanceByComplexity = Object.entries(complexityGroups).reduce((result, [complexity, logs]) => {
      const avgTime = logs.reduce((sum, log) => sum + log.performance.totalProcessingTime, 0) / logs.length;
      const avgConfidence = logs.reduce((sum, log) => sum + log.queryAnalysis.confidence, 0) / logs.length;
      const successRate = logs.filter(log => log.matchingResults.totalMatches > 0).length / logs.length;
      
      result[complexity] = { avgTime, avgConfidence, successRate };
      return result;
    }, {} as Record<string, { avgTime: number; avgConfidence: number; successRate: number }>);

    return {
      commonQueries,
      professionTrends,
      materialTrends,
      performanceByComplexity
    };
  }

  /**
   * Export analytics data for external analysis
   */
  public exportAnalyticsData(format: 'json' | 'csv' = 'json'): string {
    const logs = Array.from(this.decisionLogs.values());
    const metrics = this.getAnalyticsMetrics();
    const alerts = Array.from(this.performanceAlerts.values());

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        dateRange: {
          start: logs.length > 0 ? Math.min(...logs.map(l => l.timestamp.getTime())) : null,
          end: logs.length > 0 ? Math.max(...logs.map(l => l.timestamp.getTime())) : null
        }
      },
      logs,
      metrics,
      alerts
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Simplified CSV export (logs only)
      const csvHeaders = [
        'timestamp', 'query', 'detectedProfession', 'confidence', 'totalMatches',
        'averageRelevanceScore', 'processingTime', 'searchMethod', 'fallbackUsed'
      ];
      
      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        `"${log.query.replace(/"/g, '""')}"`,
        log.queryAnalysis.detectedProfession,
        log.queryAnalysis.confidence,
        log.matchingResults.totalMatches,
        log.matchingResults.averageRelevanceScore,
        log.performance.totalProcessingTime,
        log.matchingResults.searchMethod,
        log.matchingResults.fallbackUsed
      ]);

      return [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Clear old logs to manage memory usage
   */
  public clearOldLogs(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let deletedCount = 0;

    for (const [id, log] of this.decisionLogs.entries()) {
      if (log.timestamp < cutoffDate) {
        this.decisionLogs.delete(id);
        deletedCount++;
      }
    }

    this.invalidateMetricsCache();
    return deletedCount;
  }

  // Private helper methods

  private calculateMetrics(logs: MatchingDecisionLog[]): AnalyticsMetrics {
    if (logs.length === 0) {
      return this.getEmptyMetrics();
    }

    // Query Patterns
    const professionCounts = new Map<string, number>();
    const materialCounts = new Map<string, number>();
    const techniqueCounts = new Map<string, number>();
    const intentCounts = new Map<string, number>();
    const complexityCounts = new Map<string, number>();

    logs.forEach(log => {
      // Count professions
      const profession = log.queryAnalysis.detectedProfession;
      professionCounts.set(profession, (professionCounts.get(profession) || 0) + 1);

      // Count materials
      log.queryAnalysis.extractedMaterials.forEach(material => {
        materialCounts.set(material, (materialCounts.get(material) || 0) + 1);
      });

      // Count techniques
      log.queryAnalysis.extractedTechniques.forEach(technique => {
        techniqueCounts.set(technique, (techniqueCounts.get(technique) || 0) + 1);
      });

      // Count intents
      const intent = log.queryAnalysis.intent.action;
      intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);

      // Count complexity
      const complexity = log.queryAnalysis.complexity;
      complexityCounts.set(complexity, (complexityCounts.get(complexity) || 0) + 1);
    });

    const totalQueries = logs.length;
    const uniqueQueries = new Set(logs.map(log => log.query.toLowerCase().trim())).size;

    // Calculate metrics
    const averageQueryLength = logs.reduce((sum, log) => sum + log.query.length, 0) / totalQueries;
    const averageProcessingTime = logs.reduce((sum, log) => sum + log.performance.totalProcessingTime, 0) / totalQueries;
    const averageConfidence = logs.reduce((sum, log) => sum + log.queryAnalysis.confidence, 0) / totalQueries;
    const averageMatchCount = logs.reduce((sum, log) => sum + log.matchingResults.totalMatches, 0) / totalQueries;
    
    const successfulQueries = logs.filter(log => log.matchingResults.totalMatches > 0).length;
    const successRate = successfulQueries / totalQueries;
    
    const highQualityQueries = logs.filter(log => log.matchingResults.highQualityMatches > 0).length;
    const highQualityRate = highQualityQueries / totalQueries;
    
    const fallbackQueries = logs.filter(log => log.matchingResults.fallbackUsed).length;
    const fallbackRate = fallbackQueries / totalQueries;
    
    const cacheHits = logs.filter(log => log.performance.cacheHit).length;
    const cacheHitRate = cacheHits / totalQueries;

    // User engagement metrics
    const logsWithInteraction = logs.filter(log => log.userInteraction);
    const selectionsCount = logsWithInteraction.filter(log => log.userInteraction?.selectedArtisanId).length;
    const contactsCount = logsWithInteraction.filter(log => log.userInteraction?.contactInitiated).length;
    
    const selectionRate = logsWithInteraction.length > 0 ? selectionsCount / logsWithInteraction.length : 0;
    const contactRate = logsWithInteraction.length > 0 ? contactsCount / logsWithInteraction.length : 0;
    
    const averageTimeToSelection = logsWithInteraction
      .filter(log => log.userInteraction?.timeToSelection)
      .reduce((sum, log) => sum + (log.userInteraction?.timeToSelection || 0), 0) / 
      Math.max(1, logsWithInteraction.filter(log => log.userInteraction?.timeToSelection).length);

    const satisfactionScores = logsWithInteraction
      .filter(log => log.userInteraction?.feedbackRating)
      .map(log => log.userInteraction?.feedbackRating || 0);
    const satisfactionScore = satisfactionScores.length > 0 ?
      satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length : 0;

    return {
      queryPatterns: {
        totalQueries,
        uniqueQueries,
        averageQueryLength,
        mostCommonProfessions: this.getTopCounts(professionCounts, totalQueries),
        mostCommonMaterials: this.getTopCounts(materialCounts, totalQueries),
        mostCommonTechniques: this.getTopCounts(techniqueCounts, totalQueries),
        intentDistribution: Object.fromEntries(intentCounts),
        complexityDistribution: Object.fromEntries(complexityCounts)
      },
      matchingPerformance: {
        averageProcessingTime,
        averageConfidence,
        averageMatchCount,
        successRate,
        highQualityRate,
        fallbackRate,
        cacheHitRate
      },
      systemHealth: {
        aiServiceUptime: 0.95, // Would be calculated from health checks
        averageResponseTime: averageProcessingTime,
        errorRate: 0.02, // Would be calculated from error logs
        lastHealthCheck: new Date(),
        serviceStatus: 'healthy'
      },
      userEngagement: {
        averageTimeToSelection,
        selectionRate,
        contactRate,
        satisfactionScore,
        repeatUsageRate: 0 // Would need user tracking
      },
      businessMetrics: {
        totalSearches: totalQueries,
        uniqueUsers: new Set(logs.map(log => log.userId).filter(Boolean)).size,
        successfulConnections: contactsCount,
        conversionRate: contactRate
      }
    };
  }

  private getTopCounts(countMap: Map<string, number>, total: number): Array<{ profession: string; count: number; percentage: number }> {
    return Array.from(countMap.entries())
      .map(([item, count]) => ({
        profession: item,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getEmptyMetrics(): AnalyticsMetrics {
    return {
      queryPatterns: {
        totalQueries: 0,
        uniqueQueries: 0,
        averageQueryLength: 0,
        mostCommonProfessions: [],
        mostCommonMaterials: [],
        mostCommonTechniques: [],
        intentDistribution: {},
        complexityDistribution: {}
      },
      matchingPerformance: {
        averageProcessingTime: 0,
        averageConfidence: 0,
        averageMatchCount: 0,
        successRate: 0,
        highQualityRate: 0,
        fallbackRate: 0,
        cacheHitRate: 0
      },
      systemHealth: {
        aiServiceUptime: 1,
        averageResponseTime: 0,
        errorRate: 0,
        lastHealthCheck: new Date(),
        serviceStatus: 'healthy'
      },
      userEngagement: {
        averageTimeToSelection: 0,
        selectionRate: 0,
        contactRate: 0,
        satisfactionScore: 0,
        repeatUsageRate: 0
      },
      businessMetrics: {
        totalSearches: 0,
        uniqueUsers: 0,
        successfulConnections: 0,
        conversionRate: 0
      }
    };
  }

  private checkPerformanceThresholds(log: MatchingDecisionLog): void {
    const alerts: Omit<PerformanceAlert, 'id' | 'timestamp'>[] = [];

    // Check processing time
    if (log.performance.totalProcessingTime > this.thresholds.maxProcessingTime) {
      alerts.push({
        severity: 'high',
        type: 'performance',
        metric: 'processing_time',
        currentValue: log.performance.totalProcessingTime,
        threshold: this.thresholds.maxProcessingTime,
        message: `Query processing took ${log.performance.totalProcessingTime}ms, exceeding threshold of ${this.thresholds.maxProcessingTime}ms`,
        recommendations: [
          'Check AI service response times',
          'Optimize database queries',
          'Consider caching improvements'
        ],
        resolved: false
      });
    }

    // Check confidence level
    if (log.queryAnalysis.confidence < this.thresholds.minConfidence) {
      alerts.push({
        severity: 'medium',
        type: 'accuracy',
        metric: 'confidence',
        currentValue: log.queryAnalysis.confidence,
        threshold: this.thresholds.minConfidence,
        message: `Low confidence score: ${log.queryAnalysis.confidence.toFixed(2)}`,
        recommendations: [
          'Review query analysis prompts',
          'Check for ambiguous queries',
          'Consider improving training data'
        ],
        resolved: false
      });
    }

    // Create alert records
    alerts.forEach(alertData => {
      const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      this.performanceAlerts.set(id, {
        id,
        timestamp: new Date(),
        ...alertData
      });
    });
  }

  private invalidateMetricsCache(): void {
    this.metricsCache = null;
    this.metricsCacheExpiry = null;
  }

  private performPeriodicTasks(): void {
    // Clean up old alerts (older than 24 hours)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    for (const [id, alert] of this.performanceAlerts.entries()) {
      if (alert.timestamp.getTime() < cutoffTime && alert.resolved) {
        this.performanceAlerts.delete(id);
      }
    }

    // Auto-resolve old unresolved alerts (older than 1 hour)
    const autoResolveCutoff = Date.now() - (60 * 60 * 1000);
    for (const [id, alert] of this.performanceAlerts.entries()) {
      if (alert.timestamp.getTime() < autoResolveCutoff && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        this.performanceAlerts.set(id, alert);
      }
    }
  }
}