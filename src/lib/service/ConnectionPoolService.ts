import { MongoClient, Db } from 'mongodb';
import { createClient, RedisClientType } from 'redis';

export interface ConnectionConfig {
    mongodb?: {
        uri: string;
        maxPoolSize: number;
        minPoolSize: number;
        maxIdleTimeMS: number;
        serverSelectionTimeoutMS: number;
    };
    redis?: {
        url: string;
        maxRetriesPerRequest: number;
        retryDelayOnFailover: number;
        lazyConnect: boolean;
    };
}

export interface PoolStats {
    mongodb?: {
        totalConnections: number;
        availableConnections: number;
        checkedOutConnections: number;
    };
    redis?: {
        status: string;
        connectedClients: number;
    };
}

export class ConnectionPoolService {
    private static instance: ConnectionPoolService;
    private mongoClient: MongoClient | null = null;
    private redisClient: RedisClientType | null = null;
    private config: ConnectionConfig;
    private isInitialized = false;

    private constructor() {
        this.config = {
            mongodb: {
                uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-buddy',
                maxPoolSize: 10,
                minPoolSize: 2,
                maxIdleTimeMS: 30000,
                serverSelectionTimeoutMS: 5000
            },
            redis: {
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                lazyConnect: true
            }
        };
    }

    static getInstance(): ConnectionPoolService {
        if (!ConnectionPoolService.instance) {
            ConnectionPoolService.instance = new ConnectionPoolService();
        }
        return ConnectionPoolService.instance;
    }

    /**
     * Initialize connection pools
     */
    async initialize(config?: Partial<ConnectionConfig>): Promise<void> {
        if (this.isInitialized) {
            console.log('Connection pools already initialized');
            return;
        }

        if (config) {
            this.config = {
                mongodb: { ...this.config.mongodb!, ...config.mongodb },
                redis: { ...this.config.redis!, ...config.redis }
            };
        }

        await Promise.all([
            this.initializeMongoDB(),
            this.initializeRedis()
        ]);

        this.isInitialized = true;
        console.log('✅ Connection pools initialized');
    }

    /**
     * Initialize MongoDB connection pool
     */
    private async initializeMongoDB(): Promise<void> {
        if (!this.config.mongodb) return;

        try {
            this.mongoClient = new MongoClient(this.config.mongodb.uri, {
                maxPoolSize: this.config.mongodb.maxPoolSize,
                minPoolSize: this.config.mongodb.minPoolSize,
                maxIdleTimeMS: this.config.mongodb.maxIdleTimeMS,
                serverSelectionTimeoutMS: this.config.mongodb.serverSelectionTimeoutMS,
                // Connection pool monitoring
                monitorCommands: true
            });

            await this.mongoClient.connect();

            // Test connection
            await this.mongoClient.db().admin().ping();

            console.log('✅ MongoDB connection pool initialized');
        } catch (error) {
            console.error('❌ MongoDB connection pool initialization failed:', error);
            this.mongoClient = null;
        }
    }

    /**
     * Initialize Redis connection pool
     */
    private async initializeRedis(): Promise<void> {
        if (!this.config.redis) return;

        try {
            this.redisClient = createClient({
                url: this.config.redis.url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) return new Error('Max retries reached');
                        return Math.min(retries * 50, 1000);
                    }
                }
            });

            // Error handling
            this.redisClient.on('error', (error) => {
                console.error('Redis client error:', error);
            });

            this.redisClient.on('connect', () => {
                console.log('✅ Redis connected');
            });

            this.redisClient.on('disconnect', () => {
                console.warn('⚠️ Redis disconnected');
            });

            await this.redisClient.connect();

            // Test connection
            await this.redisClient.ping();

            console.log('✅ Redis connection pool initialized');
        } catch (error) {
            console.error('❌ Redis connection pool initialization failed:', error);
            this.redisClient = null;
        }
    }

    /**
     * Get MongoDB database instance
     */
    getDatabase(dbName?: string): Db | null {
        if (!this.mongoClient) {
            console.warn('MongoDB client not initialized');
            return null;
        }

        try {
            return this.mongoClient.db(dbName);
        } catch (error) {
            console.error('Failed to get database:', error);
            return null;
        }
    }

    /**
     * Get Redis client instance
     */
    getRedisClient(): RedisClientType | null {
        if (!this.redisClient || !this.redisClient.isReady) {
            console.warn('Redis client not ready');
            return null;
        }

        return this.redisClient;
    }

    /**
     * Execute MongoDB operation with retry logic
     */
    async executeMongoOperation<T>(
        operation: (db: Db) => Promise<T>,
        dbName?: string,
        retries: number = 3
    ): Promise<T> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const db = this.getDatabase(dbName);
                if (!db) {
                    throw new Error('Database not available');
                }

                return await operation(db);
            } catch (error) {
                console.error(`MongoDB operation attempt ${attempt} failed:`, error);

                if (attempt === retries) {
                    throw error;
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * 100;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error('All MongoDB operation attempts failed');
    }

    /**
     * Execute Redis operation with retry logic
     */
    async executeRedisOperation<T>(
        operation: (client: RedisClientType) => Promise<T>,
        retries: number = 3
    ): Promise<T> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const client = this.getRedisClient();
                if (!client) {
                    throw new Error('Redis client not available');
                }

                return await operation(client);
            } catch (error) {
                console.error(`Redis operation attempt ${attempt} failed:`, error);

                if (attempt === retries) {
                    throw error;
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * 100;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error('All Redis operation attempts failed');
    }

    /**
     * Get connection pool statistics
     */
    async getPoolStats(): Promise<PoolStats> {
        const stats: PoolStats = {};

        // MongoDB stats
        if (this.mongoClient) {
            try {
                // Note: MongoDB Node.js driver doesn't expose detailed pool stats
                // In a real implementation, you might use monitoring tools
                stats.mongodb = {
                    totalConnections: this.config.mongodb?.maxPoolSize || 0,
                    availableConnections: 0, // Would need monitoring integration
                    checkedOutConnections: 0 // Would need monitoring integration
                };
            } catch (error) {
                console.error('Failed to get MongoDB stats:', error);
            }
        }

        // Redis stats
        if (this.redisClient) {
            try {
                const info = await this.redisClient.info('clients');
                const connectedClients = this.parseRedisInfo(info, 'connected_clients');

                stats.redis = {
                    status: this.redisClient.isReady ? 'ready' : 'not_ready',
                    connectedClients: parseInt(connectedClients) || 0
                };
            } catch (error) {
                console.error('Failed to get Redis stats:', error);
                stats.redis = {
                    status: 'error',
                    connectedClients: 0
                };
            }
        }

        return stats;
    }

    /**
     * Health check for all connections
     */
    async healthCheck(): Promise<{
        mongodb: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
        redis: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
        overall: 'healthy' | 'degraded' | 'unhealthy';
    }> {
        const results = {
            mongodb: { status: 'unhealthy' as const, latency: undefined as number | undefined, error: undefined as string | undefined },
            redis: { status: 'unhealthy' as const, latency: undefined as number | undefined, error: undefined as string | undefined },
            overall: 'unhealthy' as const
        };

        // Check MongoDB
        if (this.mongoClient) {
            try {
                const start = Date.now();
                await this.mongoClient.db().admin().ping();
                results.mongodb = {
                    status: 'healthy',
                    latency: Date.now() - start
                };
            } catch (error) {
                results.mongodb = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        // Check Redis
        if (this.redisClient) {
            try {
                const start = Date.now();
                await this.redisClient.ping();
                results.redis = {
                    status: 'healthy',
                    latency: Date.now() - start
                };
            } catch (error) {
                results.redis = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        // Determine overall health
        const healthyConnections = [results.mongodb, results.redis].filter(r => r.status === 'healthy').length;
        const totalConnections = [this.mongoClient, this.redisClient].filter(c => c !== null).length;

        if (healthyConnections === totalConnections && totalConnections > 0) {
            results.overall = 'healthy';
        } else if (healthyConnections > 0) {
            results.overall = 'degraded';
        } else {
            results.overall = 'unhealthy';
        }

        return results;
    }

    /**
     * Gracefully close all connections
     */
    async close(): Promise<void> {
        const closePromises: Promise<void>[] = [];

        if (this.mongoClient) {
            closePromises.push(
                this.mongoClient.close().catch(error => {
                    console.error('Error closing MongoDB connection:', error);
                })
            );
        }

        if (this.redisClient) {
            closePromises.push(
                this.redisClient.disconnect().catch(error => {
                    console.error('Error closing Redis connection:', error);
                })
            );
        }

        await Promise.all(closePromises);

        this.mongoClient = null;
        this.redisClient = null;
        this.isInitialized = false;

        console.log('✅ All connections closed');
    }

    /**
     * Parse Redis info response
     */
    private parseRedisInfo(info: string, key: string): string {
        const lines = info.split('\r\n');
        for (const line of lines) {
            if (line.startsWith(`${key}:`)) {
                return line.split(':')[1];
            }
        }
        return '0';
    }

    /**
     * Get configuration
     */
    getConfig(): ConnectionConfig {
        return { ...this.config };
    }

    /**
     * Update configuration (requires reinitialization)
     */
    updateConfig(config: Partial<ConnectionConfig>): void {
        this.config = {
            mongodb: { ...this.config.mongodb!, ...config.mongodb },
            redis: { ...this.config.redis!, ...config.redis }
        };
    }

    /**
     * Check if service is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}

// Singleton instance
export const connectionPool = ConnectionPoolService.getInstance();

// Utility functions for common operations
export async function withDatabase<T>(
    operation: (db: Db) => Promise<T>,
    dbName?: string
): Promise<T> {
    return connectionPool.executeMongoOperation(operation, dbName);
}

export async function withRedis<T>(
    operation: (client: RedisClientType) => Promise<T>
): Promise<T> {
    return connectionPool.executeRedisOperation(operation);
}