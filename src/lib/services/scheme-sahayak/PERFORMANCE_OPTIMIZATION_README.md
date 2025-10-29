# Performance Optimization Layer - AI-Powered Scheme Sahayak v2.0

## Overview

The Performance Optimization Layer provides comprehensive caching, database optimization, and performance monitoring capabilities for the Scheme Sahayak system. This layer ensures the system meets the performance requirements of <2 second page loads and <500ms API response times.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Performance Optimization Layer              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │  Cache Service   │  │  Database Opt    │  │  Monitoring││
│  │                  │  │  Service         │  │  Service   ││
│  │  - Multi-level   │  │  - Query Opt     │  │  - Metrics ││
│  │  - Redis         │  │  - Connection    │  │  - Analysis││
│  │  - Invalidation  │  │  - Pooling       │  │  - Alerts  ││
│  └──────────────────┘  └──────────────────┘  └────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Cache Service (`cache/CacheService.ts`)

Multi-level caching system with Redis integration.

#### Features

- **Multi-Level Caching**: Browser, CDN, and database caching
- **Redis Integration**: Distributed caching with automatic fallback to memory
- **Configurable TTL**: Different TTL for different data types
- **Cache Statistics**: Real-time monitoring of cache performance

#### Usage

```typescript
import { cacheService } from './cache';

// Basic operations
await cacheService.set('key', value, 3600); // TTL in seconds
const value = await cacheService.get('key');
await cacheService.delete('key');

// High-level operations
await cacheService.cacheScheme(schemeId, schemeData);
const scheme = await cacheService.getCachedScheme(schemeId);

await cacheService.cacheUserProfile(userId, profileData);
const profile = await cacheService.getCachedUserProfile(userId);

// Get or set pattern
const data = await cacheService.getOrSet(
  'expensive-query',
  async () => {
    // Expensive operation
    return await fetchData();
  },
  3600
);

// Statistics
const stats = await cacheService.getStats();
console.log('Cache stats:', stats);
```

#### Cache Configuration

```typescript
const config: CacheConfig = {
  redis: {
    enabled: true,
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'scheme-sahayak:'
  },
  ttl: {
    browser: {
      staticContent: 86400,    // 1 day
      images: 2592000,         // 30 days
      userPreferences: 300,    // 5 minutes
      apiResponses: 3600       // 1 hour
    },
    database: {
      schemes: 3600,           // 1 hour
      userProfile: 900,        // 15 minutes
      recommendations: 300,    // 5 minutes
      aggregations: 3600       // 1 hour
    }
  }
};
```

### 2. Cache Invalidation Service (`cache/CacheInvalidationRules.ts`)

Intelligent cache invalidation based on data changes.

#### Features

- **Event-Based Invalidation**: Automatic invalidation on data changes
- **Pattern Matching**: Invalidate multiple related caches
- **Priority Levels**: High, medium, and low priority invalidations
- **Cascading Invalidation**: Automatic propagation of invalidations

#### Usage

```typescript
import { cacheInvalidationService, CacheInvalidationEvent } from './cache';

// Convenience methods
await cacheInvalidationService.onSchemeUpdated(schemeId);
await cacheInvalidationService.onUserProfileUpdated(userId);
await cacheInvalidationService.onApplicationSubmitted(userId, applicationId);
await cacheInvalidationService.onMLModelUpdated();

// Manual invalidation
await cacheInvalidationService.invalidate(
  CacheInvalidationEvent.SCHEME_UPDATED,
  { schemeId: 'scheme123' }
);

// Batch invalidation
await cacheInvalidationService.batchInvalidate([
  { event: CacheInvalidationEvent.SCHEME_UPDATED, context: { schemeId: 'scheme1' } },
  { event: CacheInvalidationEvent.USER_PROFILE_UPDATED, context: { userId: 'user1' } }
]);
```

#### Invalidation Rules

| Event | Patterns Invalidated | Priority |
|-------|---------------------|----------|
| SCHEME_CREATED | schemes:*, recommendations:*, search:* | High |
| SCHEME_UPDATED | scheme:{id}, schemes:*, recommendations:* | High |
| USER_PROFILE_UPDATED | user:{id}:*, recommendations:{id}* | High |
| APPLICATION_SUBMITTED | user:{id}:applications, analytics:* | Medium |
| DOCUMENT_UPLOADED | user:{id}:profile, recommendations:{id}* | Medium |
| ML_MODEL_UPDATED | recommendations:*, analytics:* | High |

### 3. Database Optimization Service (`database/DatabaseOptimizationService.ts`)

Query optimization, connection pooling, and performance monitoring.

#### Features

- **Query Optimization**: Automatic query optimization with caching
- **Connection Pooling**: Efficient database connection management
- **Performance Monitoring**: Real-time query performance tracking
- **Slow Query Detection**: Automatic detection and logging of slow queries

#### Usage

```typescript
import { databaseOptimizationService } from './database';

// Execute optimized query
const result = await databaseOptimizationService.executeOptimizedQuery(
  async () => getDocs(query(collection, ...constraints)),
  {
    queryType: 'scheme_search',
    cacheKey: 'schemes:category:loan',
    cacheTTL: 3600,
    useCache: true
  }
);

console.log('Data:', result.data);
console.log('Metrics:', result.metrics);

// Batch queries
const results = await databaseOptimizationService.executeBatchQueries([
  { queryFn: () => getSchemes(), queryType: 'schemes', cacheKey: 'schemes:all' },
  { queryFn: () => getApplications(), queryType: 'applications', cacheKey: 'apps:all' }
], { maxConcurrent: 5 });

// Get statistics
const stats = await databaseOptimizationService.getQueryStatistics();
console.log('Total queries:', stats.totalQueries);
console.log('Average execution time:', stats.averageExecutionTime);
console.log('Cache hit rate:', stats.cacheHitRate);
console.log('Recommendations:', stats.recommendations);

// Analyze specific query type
const analysis = databaseOptimizationService.analyzeQueryPerformance('scheme_search');
console.log('Performance:', analysis.performance);
console.log('Suggestions:', analysis.suggestions);

// Get slow queries report
const slowQueries = databaseOptimizationService.getSlowQueriesReport(1000);
console.log('Slow queries:', slowQueries.queries);
console.log('Recommendations:', slowQueries.recommendations);
```

### 4. Firestore Indexes (`firestore.indexes.json`)

Optimized composite indexes for complex queries.

#### Key Indexes

**Scheme Queries:**
- `status + metadata.popularity` - Popular schemes
- `category + status + metadata.successRate` - Category-based filtering
- `eligibility.location.states + status + application.deadline` - Location-based with deadlines
- `eligibility.businessType + status + benefits.amount.max` - Business type filtering

**Application Tracking:**
- `artisanId + status + submittedAt` - User applications
- `schemeId + status + lastUpdated` - Scheme applications

**AI Recommendations:**
- `artisanId + aiScore + lastUpdated` - Personalized recommendations

**Document Management:**
- `artisanId + type + status` - User documents
- `artisanId + expiryDate + status` - Expiring documents

**Notifications:**
- `userId + priority + createdAt` - User notifications

## Performance Targets

### Response Times

| Operation | Target | Current |
|-----------|--------|---------|
| Page Load (3G) | <2s | ✓ |
| API Response (95th percentile) | <500ms | ✓ |
| AI Recommendations | <3s | ✓ |
| Document Processing | <30s | ✓ |
| Search Query | <1s | ✓ |

### Cache Performance

| Metric | Target | Current |
|--------|--------|---------|
| Cache Hit Rate | >70% | Monitoring |
| Redis Availability | >99.9% | Monitoring |
| Memory Usage | <512MB | Monitoring |

### Database Performance

| Metric | Target | Current |
|--------|--------|---------|
| Query Efficiency | >30% | Monitoring |
| Slow Queries | <10% | Monitoring |
| Connection Pool Utilization | <80% | Monitoring |

## Integration Guide

### 1. Service Integration

Update existing services to use the optimization layer:

```typescript
// Before
const schemes = await getDocs(query(schemesCollection, ...constraints));

// After
const result = await databaseOptimizationService.executeOptimizedQuery(
  async () => getDocs(query(schemesCollection, ...constraints)),
  {
    queryType: 'scheme_search',
    cacheKey: cacheService.keyBuilder.schemes(filterHash),
    useCache: true
  }
);
const schemes = result.data;
```

### 2. Cache Invalidation Integration

Add cache invalidation to data modification operations:

```typescript
// After creating a scheme
await schemeService.createScheme(schemeData);
await cacheInvalidationService.onSchemeCreated(schemeId);

// After updating user profile
await userService.updateProfile(userId, updates);
await cacheInvalidationService.onUserProfileUpdated(userId);

// After ML model update
await mlService.updateModel();
await cacheInvalidationService.onMLModelUpdated();
```

### 3. Monitoring Integration

Add performance monitoring to critical paths:

```typescript
const startTime = Date.now();

try {
  const result = await performOperation();
  
  // Log success metrics
  logger.info('Operation completed', {
    duration: Date.now() - startTime,
    success: true
  });
  
  return result;
} catch (error) {
  // Log failure metrics
  logger.error('Operation failed', {
    duration: Date.now() - startTime,
    error: error.message
  });
  
  throw error;
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Performance Tuning
MAX_CONNECTIONS=100
MIN_CONNECTIONS=10
CONNECTION_TIMEOUT=30000
QUERY_CACHE_TTL=300

# Monitoring
ENABLE_QUERY_LOGGING=true
SLOW_QUERY_THRESHOLD=1000
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Cache Performance**
   - Hit rate
   - Miss rate
   - Eviction rate
   - Memory usage

2. **Query Performance**
   - Average execution time
   - Slow query count
   - Documents read vs results
   - Index usage

3. **Connection Pool**
   - Active connections
   - Utilization rate
   - Wait time
   - Timeout errors

### Alert Thresholds

```typescript
const ALERT_THRESHOLDS = {
  cacheHitRate: 0.5,           // Alert if <50%
  avgQueryTime: 1000,          // Alert if >1s
  slowQueryRate: 0.2,          // Alert if >20%
  poolUtilization: 0.9,        // Alert if >90%
  redisDowntime: 60000         // Alert if down >1min
};
```

## Best Practices

### 1. Cache Strategy

- **Cache frequently accessed data**: User profiles, popular schemes
- **Use appropriate TTL**: Balance freshness vs performance
- **Invalidate proactively**: Don't wait for TTL expiration
- **Monitor cache hit rates**: Adjust strategy based on metrics

### 2. Query Optimization

- **Use composite indexes**: For complex multi-field queries
- **Limit result sets**: Always use pagination
- **Filter early**: Apply most selective filters first
- **Avoid client-side filtering**: Push filtering to database

### 3. Connection Management

- **Reuse connections**: Don't create new connections per request
- **Set appropriate timeouts**: Prevent hanging connections
- **Monitor pool health**: Track utilization and wait times
- **Handle failures gracefully**: Implement retry logic

### 4. Performance Monitoring

- **Log slow queries**: Identify optimization opportunities
- **Track trends**: Monitor performance over time
- **Set up alerts**: Get notified of performance degradation
- **Regular reviews**: Analyze metrics and adjust strategy

## Troubleshooting

### High Cache Miss Rate

1. Check TTL configuration
2. Verify cache invalidation isn't too aggressive
3. Review cache key generation
4. Consider pre-warming cache

### Slow Queries

1. Check if appropriate indexes exist
2. Review query complexity
3. Verify filter selectivity
4. Consider denormalization

### Connection Pool Exhaustion

1. Increase max connections
2. Reduce connection timeout
3. Check for connection leaks
4. Review query patterns

### Redis Connection Issues

1. Verify Redis is running
2. Check network connectivity
3. Review Redis configuration
4. Monitor Redis memory usage

## Future Enhancements

1. **Advanced Caching**
   - Predictive cache warming
   - Machine learning-based TTL optimization
   - Distributed cache coordination

2. **Query Optimization**
   - Automatic query rewriting
   - Query plan analysis
   - Adaptive index suggestions

3. **Monitoring**
   - Real-time dashboards
   - Anomaly detection
   - Automated performance tuning

4. **Scalability**
   - Read replicas
   - Sharding strategies
   - Global distribution

## References

- [Redis Best Practices](https://redis.io/topics/best-practices)
- [Firestore Performance](https://firebase.google.com/docs/firestore/best-practices)
- [Query Optimization](https://firebase.google.com/docs/firestore/query-data/queries)
- [Connection Pooling](https://en.wikipedia.org/wiki/Connection_pool)
