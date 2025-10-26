/**
 * Vector Database Connection Pool
 * Manages multiple vector database connections with pooling and error handling
 */

import { VectorDatabase } from './vector-database';
import { VectorStoreConfig, getVectorStoreConfig } from '../config/vector-store-config';

export interface ConnectionPoolConfig {
    maxConnections: number;
    minConnections: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
}

export interface PoolStats {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
}

interface PooledConnection {
    database: VectorDatabase;
    isActive: boolean;
    lastUsed: Date;
    id: string;
}

export class VectorConnectionPool {
    private static instance: VectorConnectionPool;
    private connections: Map<string, PooledConnection> = new Map();
    private pendingRequests: Array<{
        resolve: (db: VectorDatabase) => void;
        reject: (error: Error) => void;
        timestamp: Date;
    }> = [];

    private config: ConnectionPoolConfig;
    private vectorConfig: VectorStoreConfig;
    private isInitialized: boolean = false;
    private cleanupInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.config = {
            maxConnections: parseInt(process.env.VECTOR_POOL_MAX_CONNECTIONS || '5'),
            minConnections: parseInt(process.env.VECTOR_POOL_MIN_CONNECTIONS || '1'),
            acquireTimeoutMs: parseInt(process.env.VECTOR_POOL_ACQUIRE_TIMEOUT || '30000'),
            idleTimeoutMs: parseInt(process.env.VECTOR_POOL_IDLE_TIMEOUT || '300000'), // 5 minutes
            retryAttempts: parseInt(process.env.VECTOR_POOL_RETRY_ATTEMPTS || '3'),
            retryDelayMs: parseInt(process.env.VECTOR_POOL_RETRY_DELAY || '1000'),
        };

        this.vectorConfig = getVectorStoreConfig();
    }

    public static getInstance(): VectorConnectionPool {
        if (!VectorConnectionPool.instance) {
            VectorConnectionPool.instance = new VectorConnectionPool();
        }
        return VectorConnectionPool.instance;
    }

    /**
     * Initialize the connection pool
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Create minimum number of connections
            for (let i = 0; i < this.config.minConnections; i++) {
                await this.createConnection();
            }

            // Start cleanup interval
            this.startCleanupInterval();

            this.isInitialized = true;
            console.log(`Vector connection pool initialized with ${this.connections.size} connections`);
        } catch (error) {
            console.error('Failed to initialize connection pool:', error);
            throw error;
        }
    }

    /**
     * Create a new database connection
     */
    private async createConnection(): Promise<PooledConnection> {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const database = new VectorDatabase(this.vectorConfig);
            await database.initialize();

            const connection: PooledConnection = {
                database,
                isActive: false,
                lastUsed: new Date(),
                id: connectionId,
            };

            this.connections.set(connectionId, connection);
            console.log(`Created new vector database connection: ${connectionId}`);

            return connection;
        } catch (error) {
            console.error(`Failed to create connection ${connectionId}:`, error);
            throw error;
        }
    }

    /**
     * Acquire a database connection from the pool
     */
    async acquire(): Promise<VectorDatabase> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const index = this.pendingRequests.findIndex(req => req.resolve === resolve);
                if (index !== -1) {
                    this.pendingRequests.splice(index, 1);
                }
                reject(new Error('Connection acquire timeout'));
            }, this.config.acquireTimeoutMs);

            const tryAcquire = async () => {
                try {
                    // Look for idle connection
                    for (const [id, connection] of this.connections) {
                        if (!connection.isActive) {
                            connection.isActive = true;
                            connection.lastUsed = new Date();
                            clearTimeout(timeoutId);
                            resolve(connection.database);
                            return;
                        }
                    }

                    // Create new connection if under max limit
                    if (this.connections.size < this.config.maxConnections) {
                        const newConnection = await this.createConnection();
                        newConnection.isActive = true;
                        clearTimeout(timeoutId);
                        resolve(newConnection.database);
                        return;
                    }

                    // Add to pending requests
                    this.pendingRequests.push({
                        resolve,
                        reject,
                        timestamp: new Date(),
                    });

                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            };

            tryAcquire();
        });
    }

    /**
     * Release a database connection back to the pool
     */
    async release(database: VectorDatabase): Promise<void> {
        try {
            // Find the connection
            let connectionId: string | null = null;
            for (const [id, connection] of this.connections) {
                if (connection.database === database) {
                    connectionId = id;
                    break;
                }
            }

            if (!connectionId) {
                console.warn('Attempted to release unknown database connection');
                return;
            }

            const connection = this.connections.get(connectionId)!;
            connection.isActive = false;
            connection.lastUsed = new Date();

            // Process pending requests
            if (this.pendingRequests.length > 0) {
                const pendingRequest = this.pendingRequests.shift()!;
                connection.isActive = true;
                pendingRequest.resolve(database);
            }

        } catch (error) {
            console.error('Error releasing connection:', error);
        }
    }

    /**
     * Execute a function with a database connection
     */
    async withConnection<T>(fn: (db: VectorDatabase) => Promise<T>): Promise<T> {
        const database = await this.acquire();
        try {
            return await fn(database);
        } finally {
            await this.release(database);
        }
    }

    /**
     * Start the cleanup interval for idle connections
     */
    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(async () => {
            await this.cleanupIdleConnections();
        }, 60000); // Run every minute
    }

    /**
     * Clean up idle connections
     */
    private async cleanupIdleConnections(): Promise<void> {
        const now = new Date();
        const connectionsToRemove: string[] = [];

        for (const [id, connection] of this.connections) {
            if (!connection.isActive) {
                const idleTime = now.getTime() - connection.lastUsed.getTime();

                if (idleTime > this.config.idleTimeoutMs && this.connections.size > this.config.minConnections) {
                    connectionsToRemove.push(id);
                }
            }
        }

        // Remove idle connections
        for (const id of connectionsToRemove) {
            const connection = this.connections.get(id);
            if (connection) {
                try {
                    await connection.database.close();
                    this.connections.delete(id);
                    console.log(`Removed idle connection: ${id}`);
                } catch (error) {
                    console.error(`Error closing connection ${id}:`, error);
                }
            }
        }

        // Clean up expired pending requests
        const expiredRequests = this.pendingRequests.filter(req => {
            const age = now.getTime() - req.timestamp.getTime();
            return age > this.config.acquireTimeoutMs;
        });

        for (const expiredRequest of expiredRequests) {
            const index = this.pendingRequests.indexOf(expiredRequest);
            if (index !== -1) {
                this.pendingRequests.splice(index, 1);
                expiredRequest.reject(new Error('Connection request expired'));
            }
        }
    }

    /**
     * Get pool statistics
     */
    getStats(): PoolStats {
        const activeConnections = Array.from(this.connections.values()).filter(c => c.isActive).length;

        return {
            totalConnections: this.connections.size,
            activeConnections,
            idleConnections: this.connections.size - activeConnections,
            pendingRequests: this.pendingRequests.length,
        };
    }

    /**
     * Health check for the connection pool
     */
    async healthCheck(): Promise<{ healthy: boolean; details: any }> {
        try {
            const stats = this.getStats();

            // Test a connection
            const testResult = await this.withConnection(async (db) => {
                const dbStats = db.getStats();
                return dbStats;
            });

            return {
                healthy: true,
                details: {
                    poolStats: stats,
                    databaseStats: testResult,
                    isInitialized: this.isInitialized,
                },
            };
        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    poolStats: this.getStats(),
                },
            };
        }
    }

    /**
     * Shutdown the connection pool
     */
    async shutdown(): Promise<void> {
        console.log('Shutting down vector connection pool...');

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Reject all pending requests
        for (const request of this.pendingRequests) {
            request.reject(new Error('Connection pool is shutting down'));
        }
        this.pendingRequests = [];

        // Close all connections
        const closePromises = Array.from(this.connections.values()).map(async (connection) => {
            try {
                await connection.database.close();
            } catch (error) {
                console.error(`Error closing connection ${connection.id}:`, error);
            }
        });

        await Promise.all(closePromises);
        this.connections.clear();
        this.isInitialized = false;

        console.log('Vector connection pool shutdown complete');
    }
}