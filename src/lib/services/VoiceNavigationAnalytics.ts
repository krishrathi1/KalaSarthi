/**
 * Voice Navigation Analytics and Monitoring Service
 * Tracks usage, performance, and provides insights for voice navigation
 */

export interface VoiceNavigationEvent {
    id: string;
    timestamp: number;
    type: 'activation' | 'recognition' | 'navigation' | 'error' | 'deactivation';
    userId?: string;
    sessionId: string;
    language: string;
    data: Record<string, any>;
    duration?: number;
    success: boolean;
}

export interface VoiceNavigationSession {
    id: string;
    userId?: string;
    startTime: number;
    endTime?: number;
    language: string;
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    averageConfidence: number;
    totalDuration: number;
    events: VoiceNavigationEvent[];
    userAgent: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface VoiceNavigationMetrics {
    totalSessions: number;
    totalCommands: number;
    successRate: number;
    averageSessionDuration: number;
    averageCommandProcessingTime: number;
    mostUsedCommands: Array<{ command: string; count: number; successRate: number }>;
    languageDistribution: Array<{ language: string; count: number; percentage: number }>;
    errorDistribution: Array<{ error: string; count: number; percentage: number }>;
    deviceDistribution: Array<{ device: string; count: number; percentage: number }>;
    performanceMetrics: {
        averageLatency: number;
        cacheHitRate: number;
        memoryUsage: number;
    };
}

export interface VoiceNavigationInsights {
    recommendations: string[];
    performanceIssues: string[];
    usagePatterns: string[];
    optimizationSuggestions: string[];
}

export class VoiceNavigationAnalytics {
    private static instance: VoiceNavigationAnalytics;
    private sessions: Map<string, VoiceNavigationSession> = new Map();
    private events: VoiceNavigationEvent[] = [];
    private currentSessionId: string | null = null;
    private readonly MAX_EVENTS = 10000;
    private readonly MAX_SESSIONS = 1000;

    private constructor() {
        // Load persisted data from localStorage
        this.loadPersistedData();

        // Start periodic cleanup and persistence
        this.startPeriodicTasks();
    }

    public static getInstance(): VoiceNavigationAnalytics {
        if (!VoiceNavigationAnalytics.instance) {
            VoiceNavigationAnalytics.instance = new VoiceNavigationAnalytics();
        }
        return VoiceNavigationAnalytics.instance;
    }

    /**
     * Start a new voice navigation session
     */
    public startSession(userId?: string, language: string = 'en-US'): string {
        const sessionId = this.generateSessionId();
        const session: VoiceNavigationSession = {
            id: sessionId,
            userId,
            startTime: Date.now(),
            language,
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            averageConfidence: 0,
            totalDuration: 0,
            events: [],
            userAgent: navigator.userAgent,
            deviceType: this.detectDeviceType()
        };

        this.sessions.set(sessionId, session);
        this.currentSessionId = sessionId;

        // Track session start event
        this.trackEvent({
            type: 'activation',
            sessionId,
            language,
            data: { deviceType: session.deviceType },
            success: true
        });

        return sessionId;
    }

    /**
     * End the current voice navigation session
     */
    public endSession(sessionId?: string): void {
        const targetSessionId = sessionId || this.currentSessionId;
        if (!targetSessionId) return;

        const session = this.sessions.get(targetSessionId);
        if (session) {
            session.endTime = Date.now();
            session.totalDuration = session.endTime - session.startTime;

            // Track session end event
            this.trackEvent({
                type: 'deactivation',
                sessionId: targetSessionId,
                language: session.language,
                data: {
                    totalCommands: session.totalCommands,
                    successRate: session.totalCommands > 0 ? session.successfulCommands / session.totalCommands : 0,
                    duration: session.totalDuration
                },
                duration: session.totalDuration,
                success: true
            });
        }

        if (this.currentSessionId === targetSessionId) {
            this.currentSessionId = null;
        }

        // Persist data
        this.persistData();
    }

    /**
     * Track a voice navigation event
     */
    public trackEvent(eventData: Partial<VoiceNavigationEvent>): void {
        const event: VoiceNavigationEvent = {
            id: this.generateEventId(),
            timestamp: Date.now(),
            sessionId: eventData.sessionId || this.currentSessionId || 'unknown',
            type: eventData.type || 'recognition',
            language: eventData.language || 'en-US',
            data: eventData.data || {},
            duration: eventData.duration,
            success: eventData.success ?? true
        };

        this.events.push(event);

        // Update session data
        const session = this.sessions.get(event.sessionId);
        if (session) {
            session.events.push(event);

            if (event.type === 'recognition' || event.type === 'navigation') {
                session.totalCommands++;
                if (event.success) {
                    session.successfulCommands++;
                } else {
                    session.failedCommands++;
                }

                // Update average confidence
                if (event.data.confidence) {
                    const totalConfidence = session.averageConfidence * (session.totalCommands - 1) + event.data.confidence;
                    session.averageConfidence = totalConfidence / session.totalCommands;
                }
            }
        }

        // Cleanup old events if needed
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }
    }

    /**
     * Track voice command recognition
     */
    public trackVoiceCommand(
        command: string,
        confidence: number,
        success: boolean,
        processingTime: number,
        targetRoute?: string,
        error?: string
    ): void {
        this.trackEvent({
            type: 'recognition',
            data: {
                command,
                confidence,
                processingTime,
                targetRoute,
                error
            },
            duration: processingTime,
            success
        });
    }

    /**
     * Track navigation action
     */
    public trackNavigation(
        targetRoute: string,
        success: boolean,
        navigationTime: number,
        method: 'voice' | 'fallback' = 'voice'
    ): void {
        this.trackEvent({
            type: 'navigation',
            data: {
                targetRoute,
                method,
                navigationTime
            },
            duration: navigationTime,
            success
        });
    }

    /**
     * Track error occurrence
     */
    public trackError(
        errorType: string,
        errorMessage: string,
        context: Record<string, any> = {}
    ): void {
        this.trackEvent({
            type: 'error',
            data: {
                errorType,
                errorMessage,
                context
            },
            success: false
        });
    }

    /**
     * Get comprehensive analytics metrics
     */
    public getMetrics(timeRange?: { start: number; end: number }): VoiceNavigationMetrics {
        const filteredEvents = timeRange
            ? this.events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
            : this.events;

        const filteredSessions = Array.from(this.sessions.values()).filter(s =>
            !timeRange || (s.startTime >= timeRange.start && (s.endTime || Date.now()) <= timeRange.end)
        );

        const totalCommands = filteredEvents.filter(e => e.type === 'recognition').length;
        const successfulCommands = filteredEvents.filter(e => e.type === 'recognition' && e.success).length;
        const successRate = totalCommands > 0 ? successfulCommands / totalCommands : 0;

        // Calculate most used commands
        const commandCounts = new Map<string, { count: number; successes: number }>();
        filteredEvents
            .filter(e => e.type === 'recognition' && e.data.command)
            .forEach(e => {
                const command = e.data.command;
                const current = commandCounts.get(command) || { count: 0, successes: 0 };
                current.count++;
                if (e.success) current.successes++;
                commandCounts.set(command, current);
            });

        const mostUsedCommands = Array.from(commandCounts.entries())
            .map(([command, stats]) => ({
                command,
                count: stats.count,
                successRate: stats.count > 0 ? stats.successes / stats.count : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate language distribution
        const languageCounts = new Map<string, number>();
        filteredSessions.forEach(s => {
            languageCounts.set(s.language, (languageCounts.get(s.language) || 0) + 1);
        });

        const totalSessions = filteredSessions.length;
        const languageDistribution = Array.from(languageCounts.entries())
            .map(([language, count]) => ({
                language,
                count,
                percentage: totalSessions > 0 ? (count / totalSessions) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Calculate error distribution
        const errorCounts = new Map<string, number>();
        filteredEvents
            .filter(e => e.type === 'error')
            .forEach(e => {
                const errorType = e.data.errorType || 'unknown';
                errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
            });

        const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const errorDistribution = Array.from(errorCounts.entries())
            .map(([error, count]) => ({
                error,
                count,
                percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Calculate device distribution
        const deviceCounts = new Map<string, number>();
        filteredSessions.forEach(s => {
            deviceCounts.set(s.deviceType, (deviceCounts.get(s.deviceType) || 0) + 1);
        });

        const deviceDistribution = Array.from(deviceCounts.entries())
            .map(([device, count]) => ({
                device,
                count,
                percentage: totalSessions > 0 ? (count / totalSessions) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Calculate performance metrics
        const processingTimes = filteredEvents
            .filter(e => e.duration !== undefined)
            .map(e => e.duration!);

        const averageLatency = processingTimes.length > 0
            ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
            : 0;

        const averageSessionDuration = filteredSessions.length > 0
            ? filteredSessions.reduce((sum, s) => sum + s.totalDuration, 0) / filteredSessions.length
            : 0;

        const averageCommandProcessingTime = filteredEvents
            .filter(e => e.type === 'recognition' && e.duration)
            .reduce((sum, e, _, arr) => sum + (e.duration! / arr.length), 0);

        return {
            totalSessions,
            totalCommands,
            successRate,
            averageSessionDuration,
            averageCommandProcessingTime,
            mostUsedCommands,
            languageDistribution,
            errorDistribution,
            deviceDistribution,
            performanceMetrics: {
                averageLatency,
                cacheHitRate: 0, // This would be provided by the performance optimizer
                memoryUsage: 0   // This would be calculated based on cache size
            }
        };
    }

    /**
     * Generate insights and recommendations
     */
    public generateInsights(): VoiceNavigationInsights {
        const metrics = this.getMetrics();
        const recommendations: string[] = [];
        const performanceIssues: string[] = [];
        const usagePatterns: string[] = [];
        const optimizationSuggestions: string[] = [];

        // Analyze success rate
        if (metrics.successRate < 0.8) {
            performanceIssues.push(`Low success rate (${(metrics.successRate * 100).toFixed(1)}%)`);
            recommendations.push('Consider improving speech recognition accuracy or command patterns');
        }

        // Analyze processing time
        if (metrics.averageCommandProcessingTime > 2000) {
            performanceIssues.push(`High processing time (${metrics.averageCommandProcessingTime.toFixed(0)}ms)`);
            optimizationSuggestions.push('Implement more aggressive caching for common commands');
        }

        // Analyze language usage
        const primaryLanguage = metrics.languageDistribution[0];
        if (primaryLanguage && primaryLanguage.percentage > 80) {
            usagePatterns.push(`Primarily ${primaryLanguage.language} usage (${primaryLanguage.percentage.toFixed(1)}%)`);
            optimizationSuggestions.push(`Optimize for ${primaryLanguage.language} language patterns`);
        }

        // Analyze most common errors
        const topError = metrics.errorDistribution[0];
        if (topError && topError.percentage > 30) {
            performanceIssues.push(`Frequent ${topError.error} errors (${topError.percentage.toFixed(1)}%)`);
            recommendations.push(`Address ${topError.error} error causes`);
        }

        // Analyze device usage
        const mobileUsage = metrics.deviceDistribution.find(d => d.device === 'mobile');
        if (mobileUsage && mobileUsage.percentage > 60) {
            usagePatterns.push(`High mobile usage (${mobileUsage.percentage.toFixed(1)}%)`);
            optimizationSuggestions.push('Optimize for mobile voice recognition patterns');
        }

        // Analyze command patterns
        const topCommands = metrics.mostUsedCommands.slice(0, 3);
        if (topCommands.length > 0) {
            usagePatterns.push(`Top commands: ${topCommands.map(c => c.command).join(', ')}`);
            optimizationSuggestions.push('Pre-cache most frequently used commands');
        }

        return {
            recommendations,
            performanceIssues,
            usagePatterns,
            optimizationSuggestions
        };
    }

    /**
     * Export analytics data for external analysis
     */
    public exportData(format: 'json' | 'csv' = 'json'): string {
        const data = {
            sessions: Array.from(this.sessions.values()),
            events: this.events,
            metrics: this.getMetrics(),
            insights: this.generateInsights(),
            exportTimestamp: Date.now()
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else {
            // Simple CSV export for events
            const csvHeaders = 'timestamp,type,sessionId,language,success,duration,data\n';
            const csvRows = this.events.map(e =>
                `${e.timestamp},${e.type},${e.sessionId},${e.language},${e.success},${e.duration || ''},${JSON.stringify(e.data).replace(/"/g, '""')}`
            ).join('\n');
            return csvHeaders + csvRows;
        }
    }

    /**
     * Clear all analytics data
     */
    public clearData(): void {
        this.sessions.clear();
        this.events = [];
        this.currentSessionId = null;
        this.persistData();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateEventId(): string {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        const userAgent = navigator.userAgent.toLowerCase();

        if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
            return 'mobile';
        } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    private loadPersistedData(): void {
        try {
            const sessionsData = localStorage.getItem('voiceNavigation_sessions');
            const eventsData = localStorage.getItem('voiceNavigation_events');

            if (sessionsData) {
                const sessions = JSON.parse(sessionsData);
                sessions.forEach((session: VoiceNavigationSession) => {
                    this.sessions.set(session.id, session);
                });
            }

            if (eventsData) {
                this.events = JSON.parse(eventsData);
            }
        } catch (error) {
            console.error('Failed to load persisted analytics data:', error);
        }
    }

    private persistData(): void {
        try {
            // Limit stored sessions
            const sessionsArray = Array.from(this.sessions.values());
            if (sessionsArray.length > this.MAX_SESSIONS) {
                const recentSessions = sessionsArray
                    .sort((a, b) => b.startTime - a.startTime)
                    .slice(0, this.MAX_SESSIONS);

                this.sessions.clear();
                recentSessions.forEach(session => {
                    this.sessions.set(session.id, session);
                });
            }

            localStorage.setItem('voiceNavigation_sessions', JSON.stringify(Array.from(this.sessions.values())));
            localStorage.setItem('voiceNavigation_events', JSON.stringify(this.events));
        } catch (error) {
            console.error('Failed to persist analytics data:', error);
        }
    }

    private startPeriodicTasks(): void {
        // Persist data every 5 minutes
        setInterval(() => {
            this.persistData();
        }, 5 * 60 * 1000);

        // Cleanup old data every hour
        setInterval(() => {
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            // Remove old events
            this.events = this.events.filter(e => e.timestamp > oneWeekAgo);

            // Remove old sessions
            for (const [sessionId, session] of this.sessions.entries()) {
                if (session.startTime < oneWeekAgo) {
                    this.sessions.delete(sessionId);
                }
            }
        }, 60 * 60 * 1000);
    }
}

/**
 * Performance Monitor for Voice Navigation
 */
export class VoiceNavigationPerformanceMonitor {
    private static instance: VoiceNavigationPerformanceMonitor;
    private performanceEntries: PerformanceEntry[] = [];
    private memoryUsageHistory: Array<{ timestamp: number; usage: number }> = [];

    private constructor() {
        this.startMonitoring();
    }

    public static getInstance(): VoiceNavigationPerformanceMonitor {
        if (!VoiceNavigationPerformanceMonitor.instance) {
            VoiceNavigationPerformanceMonitor.instance = new VoiceNavigationPerformanceMonitor();
        }
        return VoiceNavigationPerformanceMonitor.instance;
    }

    /**
     * Start performance monitoring
     */
    public startMonitoring(): void {
        // Monitor performance entries
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                this.performanceEntries.push(...entries);

                // Keep only recent entries
                const oneHourAgo = Date.now() - (60 * 60 * 1000);
                this.performanceEntries = this.performanceEntries.filter(
                    entry => entry.startTime > oneHourAgo
                );
            });

            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }

        // Monitor memory usage
        this.startMemoryMonitoring();
    }

    /**
     * Measure performance of a voice navigation operation
     */
    public measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
        const startTime = performance.now();

        return operation().finally(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            performance.mark(`${name}-start`);
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);

            // Track in analytics
            VoiceNavigationAnalytics.getInstance().trackEvent({
                type: 'recognition',
                data: {
                    operation: name,
                    duration
                },
                duration,
                success: true
            });
        });
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): {
        averageResponseTime: number;
        memoryUsage: number;
        resourceLoadTimes: Array<{ name: string; duration: number }>;
    } {
        const voiceEntries = this.performanceEntries.filter(
            entry => entry.name.includes('voice') || entry.name.includes('speech')
        );

        const averageResponseTime = voiceEntries.length > 0
            ? voiceEntries.reduce((sum, entry) => sum + entry.duration, 0) / voiceEntries.length
            : 0;

        const currentMemoryUsage = this.getCurrentMemoryUsage();

        const resourceLoadTimes = this.performanceEntries
            .filter(entry => entry.entryType === 'resource')
            .map(entry => ({
                name: entry.name,
                duration: entry.duration
            }))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        return {
            averageResponseTime,
            memoryUsage: currentMemoryUsage,
            resourceLoadTimes
        };
    }

    private startMemoryMonitoring(): void {
        setInterval(() => {
            const memoryUsage = this.getCurrentMemoryUsage();
            this.memoryUsageHistory.push({
                timestamp: Date.now(),
                usage: memoryUsage
            });

            // Keep only last hour of data
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            this.memoryUsageHistory = this.memoryUsageHistory.filter(
                entry => entry.timestamp > oneHourAgo
            );
        }, 30000); // Every 30 seconds
    }

    private getCurrentMemoryUsage(): number {
        if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
    }
}