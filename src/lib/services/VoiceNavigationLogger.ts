/**
 * Voice Navigation Logger
 * Comprehensive logging and monitoring service for voice navigation system
 * Provides structured logging, performance monitoring, and analytics
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export enum LogCategory {
    VOICE_INPUT = 'voice_input',
    SPEECH_RECOGNITION = 'speech_recognition',
    INTENT_PROCESSING = 'intent_processing',
    NAVIGATION = 'navigation',
    ERROR_HANDLING = 'error_handling',
    PERFORMANCE = 'performance',
    USER_INTERACTION = 'user_interaction',
    SYSTEM = 'system'
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    category: LogCategory;
    message: string;
    data?: Record<string, any>;
    sessionId?: string;
    userId?: string;
    userAgent?: string;
    url?: string;
    duration?: number;
    error?: Error;
}

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    sessionId?: string;
    additionalData?: Record<string, any>;
}

export interface LoggerConfig {
    enabled: boolean;
    level: LogLevel;
    categories: LogCategory[];
    maxEntries: number;
    enableConsoleOutput: boolean;
    enableRemoteLogging: boolean;
    enablePerformanceTracking: boolean;
    remoteEndpoint?: string;
    batchSize: number;
    flushInterval: number;
}

export class VoiceNavigationLogger {
    private static instance: VoiceNavigationLogger;
    private config: LoggerConfig;
    private logEntries: LogEntry[] = [];
    private performanceMetrics: PerformanceMetric[] = [];
    private batchQueue: LogEntry[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private performanceObserver: PerformanceObserver | null = null;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.initializePerformanceTracking();
    }

    public static getInstance(): VoiceNavigationLogger {
        if (!VoiceNavigationLogger.instance) {
            VoiceNavigationLogger.instance = new VoiceNavigationLogger();
        }
        return VoiceNavigationLogger.instance;
    }

    /**
     * Configure the logger
     */
    public configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.config.enablePerformanceTracking) {
            this.initializePerformanceTracking();
        } else {
            this.stopPerformanceTracking();
        }

        if (this.config.enableRemoteLogging) {
            this.startBatchFlushTimer();
        } else {
            this.stopBatchFlushTimer();
        }
    }

    /**
     * Log a message with specified level and category
     */
    public log(
        level: LogLevel,
        category: LogCategory,
        message: string,
        data?: Record<string, any>,
        error?: Error
    ): void {
        if (!this.shouldLog(level, category)) {
            return;
        }

        const entry: LogEntry = {
            id: this.generateLogId(),
            timestamp: new Date(),
            level,
            category,
            message,
            data,
            error,
            sessionId: this.getCurrentSessionId(),
            userId: this.getCurrentUserId(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.addLogEntry(entry);
    }

    /**
     * Log debug message
     */
    public debug(category: LogCategory, message: string, data?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, category, message, data);
    }

    /**
     * Log info message
     */
    public info(category: LogCategory, message: string, data?: Record<string, any>): void {
        this.log(LogLevel.INFO, category, message, data);
    }

    /**
     * Log warning message
     */
    public warn(category: LogCategory, message: string, data?: Record<string, any>): void {
        this.log(LogLevel.WARN, category, message, data);
    }

    /**
     * Log error message
     */
    public error(category: LogCategory, message: string, error?: Error, data?: Record<string, any>): void {
        this.log(LogLevel.ERROR, category, message, data, error);
    }

    /**
     * Log critical message
     */
    public critical(category: LogCategory, message: string, error?: Error, data?: Record<string, any>): void {
        this.log(LogLevel.CRITICAL, category, message, data, error);
    }

    /**
     * Log voice input event
     */
    public logVoiceInput(
        event: 'started' | 'stopped' | 'recognized' | 'failed',
        data?: Record<string, any>
    ): void {
        this.info(LogCategory.VOICE_INPUT, `Voice input ${event}`, data);
    }

    /**
     * Log speech recognition event
     */
    public logSpeechRecognition(
        event: 'processing' | 'success' | 'failure' | 'timeout',
        data?: Record<string, any>
    ): void {
        const level = event === 'failure' || event === 'timeout' ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, LogCategory.SPEECH_RECOGNITION, `Speech recognition ${event}`, data);
    }

    /**
     * Log intent processing event
     */
    public logIntentProcessing(
        event: 'detected' | 'processed' | 'failed' | 'not_recognized',
        intent?: string,
        confidence?: number,
        data?: Record<string, any>
    ): void {
        const level = event === 'failed' || event === 'not_recognized' ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, LogCategory.INTENT_PROCESSING, `Intent ${event}`, {
            intent,
            confidence,
            ...data
        });
    }

    /**
     * Log navigation event
     */
    public logNavigation(
        event: 'initiated' | 'success' | 'failed' | 'blocked',
        route?: string,
        data?: Record<string, any>
    ): void {
        const level = event === 'failed' || event === 'blocked' ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, LogCategory.NAVIGATION, `Navigation ${event}`, {
            route,
            ...data
        });
    }

    /**
     * Log performance metric
     */
    public logPerformance(
        name: string,
        value: number,
        unit: string = 'ms',
        additionalData?: Record<string, any>
    ): void {
        const metric: PerformanceMetric = {
            name,
            value,
            unit,
            timestamp: new Date(),
            sessionId: this.getCurrentSessionId(),
            additionalData
        };

        this.performanceMetrics.push(metric);

        // Also log as regular entry
        this.info(LogCategory.PERFORMANCE, `Performance: ${name}`, {
            value,
            unit,
            ...additionalData
        });

        // Keep only recent metrics
        if (this.performanceMetrics.length > this.config.maxEntries) {
            this.performanceMetrics = this.performanceMetrics.slice(-this.config.maxEntries);
        }
    }

    /**
     * Start timing a performance metric
     */
    public startTiming(name: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            this.logPerformance(name, duration, 'ms');
        };
    }

    /**
     * Log user interaction
     */
    public logUserInteraction(
        action: string,
        element?: string,
        data?: Record<string, any>
    ): void {
        this.info(LogCategory.USER_INTERACTION, `User ${action}`, {
            element,
            ...data
        });
    }

    /**
     * Get log entries with optional filtering
     */
    public getLogEntries(filter?: {
        level?: LogLevel;
        category?: LogCategory;
        sessionId?: string;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): LogEntry[] {
        let entries = [...this.logEntries];

        if (filter) {
            if (filter.level) {
                entries = entries.filter(entry => entry.level === filter.level);
            }
            if (filter.category) {
                entries = entries.filter(entry => entry.category === filter.category);
            }
            if (filter.sessionId) {
                entries = entries.filter(entry => entry.sessionId === filter.sessionId);
            }
            if (filter.startTime) {
                entries = entries.filter(entry => entry.timestamp >= filter.startTime!);
            }
            if (filter.endTime) {
                entries = entries.filter(entry => entry.timestamp <= filter.endTime!);
            }
            if (filter.limit) {
                entries = entries.slice(-filter.limit);
            }
        }

        return entries;
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(filter?: {
        name?: string;
        sessionId?: string;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): PerformanceMetric[] {
        let metrics = [...this.performanceMetrics];

        if (filter) {
            if (filter.name) {
                metrics = metrics.filter(metric => metric.name === filter.name);
            }
            if (filter.sessionId) {
                metrics = metrics.filter(metric => metric.sessionId === filter.sessionId);
            }
            if (filter.startTime) {
                metrics = metrics.filter(metric => metric.timestamp >= filter.startTime!);
            }
            if (filter.endTime) {
                metrics = metrics.filter(metric => metric.timestamp <= filter.endTime!);
            }
            if (filter.limit) {
                metrics = metrics.slice(-filter.limit);
            }
        }

        return metrics;
    }

    /**
     * Get logging statistics
     */
    public getStatistics(): {
        totalEntries: number;
        entriesByLevel: Record<string, number>;
        entriesByCategory: Record<string, number>;
        averagePerformance: Record<string, number>;
        errorRate: number;
        sessionCount: number;
    } {
        const entriesByLevel: Record<string, number> = {};
        const entriesByCategory: Record<string, number> = {};
        const performanceByName: Record<string, number[]> = {};
        const sessions = new Set<string>();

        this.logEntries.forEach(entry => {
            // Count by level
            entriesByLevel[entry.level] = (entriesByLevel[entry.level] || 0) + 1;

            // Count by category
            entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;

            // Track sessions
            if (entry.sessionId) {
                sessions.add(entry.sessionId);
            }
        });

        // Calculate average performance metrics
        this.performanceMetrics.forEach(metric => {
            if (!performanceByName[metric.name]) {
                performanceByName[metric.name] = [];
            }
            performanceByName[metric.name].push(metric.value);
        });

        const averagePerformance: Record<string, number> = {};
        Object.entries(performanceByName).forEach(([name, values]) => {
            averagePerformance[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        const errorEntries = (entriesByLevel[LogLevel.ERROR] || 0) + (entriesByLevel[LogLevel.CRITICAL] || 0);
        const errorRate = this.logEntries.length > 0 ? errorEntries / this.logEntries.length : 0;

        return {
            totalEntries: this.logEntries.length,
            entriesByLevel,
            entriesByCategory,
            averagePerformance,
            errorRate,
            sessionCount: sessions.size
        };
    }

    /**
     * Export logs as JSON
     */
    public exportLogs(): string {
        return JSON.stringify({
            config: this.config,
            entries: this.logEntries,
            metrics: this.performanceMetrics,
            statistics: this.getStatistics(),
            exportTime: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Clear all logs
     */
    public clearLogs(): void {
        this.logEntries = [];
        this.performanceMetrics = [];
        this.batchQueue = [];
    }

    /**
     * Flush logs to remote endpoint
     */
    public async flushLogs(): Promise<void> {
        if (!this.config.enableRemoteLogging || !this.config.remoteEndpoint || this.batchQueue.length === 0) {
            return;
        }

        try {
            const logsToFlush = [...this.batchQueue];
            this.batchQueue = [];

            const response = await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logs: logsToFlush,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to flush logs: ${response.statusText}`);
            }

            this.debug(LogCategory.SYSTEM, `Flushed ${logsToFlush.length} log entries`);
        } catch (error) {
            console.error('Failed to flush logs to remote endpoint:', error);
            // Re-add failed logs to queue
            this.batchQueue.unshift(...this.batchQueue);
        }
    }

    /**
     * Check if should log based on level and category
     */
    private shouldLog(level: LogLevel, category: LogCategory): boolean {
        if (!this.config.enabled) {
            return false;
        }

        if (!this.config.categories.includes(category)) {
            return false;
        }

        const levelPriority = this.getLevelPriority(level);
        const configLevelPriority = this.getLevelPriority(this.config.level);

        return levelPriority >= configLevelPriority;
    }

    /**
     * Add log entry to storage
     */
    private addLogEntry(entry: LogEntry): void {
        this.logEntries.push(entry);

        // Keep only recent entries
        if (this.logEntries.length > this.config.maxEntries) {
            this.logEntries = this.logEntries.slice(-this.config.maxEntries);
        }

        // Console output
        if (this.config.enableConsoleOutput) {
            this.outputToConsole(entry);
        }

        // Add to batch queue for remote logging
        if (this.config.enableRemoteLogging) {
            this.batchQueue.push(entry);

            // Flush if batch is full
            if (this.batchQueue.length >= this.config.batchSize) {
                this.flushLogs();
            }
        }
    }

    /**
     * Output log entry to console
     */
    private outputToConsole(entry: LogEntry): void {
        const message = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`;

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(message, entry.data);
                break;
            case LogLevel.INFO:
                console.info(message, entry.data);
                break;
            case LogLevel.WARN:
                console.warn(message, entry.data);
                break;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                console.error(message, entry.data, entry.error);
                break;
        }
    }

    /**
     * Initialize performance tracking
     */
    private initializePerformanceTracking(): void {
        if (!this.config.enablePerformanceTracking || typeof PerformanceObserver === 'undefined') {
            return;
        }

        try {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.logPerformance(
                        entry.name,
                        entry.duration || 0,
                        'ms',
                        {
                            entryType: entry.entryType,
                            startTime: entry.startTime
                        }
                    );
                });
            });

            this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        } catch (error) {
            console.warn('Failed to initialize performance tracking:', error);
        }
    }

    /**
     * Stop performance tracking
     */
    private stopPerformanceTracking(): void {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
    }

    /**
     * Start batch flush timer
     */
    private startBatchFlushTimer(): void {
        this.stopBatchFlushTimer();

        this.flushTimer = setInterval(() => {
            this.flushLogs();
        }, this.config.flushInterval);
    }

    /**
     * Stop batch flush timer
     */
    private stopBatchFlushTimer(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Get current session ID (placeholder)
     */
    private getCurrentSessionId(): string | undefined {
        // In a real implementation, this would get the current session ID
        return 'session_' + Date.now();
    }

    /**
     * Get current user ID (placeholder)
     */
    private getCurrentUserId(): string | undefined {
        // In a real implementation, this would get the current user ID
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get level priority for comparison
     */
    private getLevelPriority(level: LogLevel): number {
        switch (level) {
            case LogLevel.DEBUG: return 0;
            case LogLevel.INFO: return 1;
            case LogLevel.WARN: return 2;
            case LogLevel.ERROR: return 3;
            case LogLevel.CRITICAL: return 4;
            default: return 1;
        }
    }

    /**
     * Generate unique log ID
     */
    private generateLogId(): string {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): LoggerConfig {
        return {
            enabled: true,
            level: LogLevel.INFO,
            categories: Object.values(LogCategory),
            maxEntries: 1000,
            enableConsoleOutput: process.env.NODE_ENV === 'development',
            enableRemoteLogging: false,
            enablePerformanceTracking: true,
            batchSize: 50,
            flushInterval: 30000 // 30 seconds
        };
    }
}