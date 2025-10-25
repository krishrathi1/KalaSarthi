// API optimization utilities

import { withCache, CACHE_TTL, PerformanceMonitor } from './performance';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

interface ApiOptions {
  cache?: boolean;
  ttl?: number;
  retries?: number;
  timeout?: number;
}

/**
 * Optimized API call with caching, retries, and performance monitoring
 */
export async function optimizedApiCall<T>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    cache = true,
    ttl = CACHE_TTL.MEDIUM,
    retries = 3,
    timeout = 10000
  } = apiOptions;

  const perfMonitor = PerformanceMonitor.getInstance();
  const endTiming = perfMonitor.startTiming('api-call');

  try {
    // Create cache key
    const cacheKey = `api-${url}-${JSON.stringify(options)}`;

    const fetchData = async (): Promise<T> => {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Use cache if enabled
    if (cache) {
      const result = await withCache(
        cacheKey,
        fetchData,
        { ttl }
      );
      
      endTiming();
      return {
        success: true,
        data: result,
        cached: false,
        timestamp: Date.now()
      };
    } else {
      const result = await fetchData();
      endTiming();
      return {
        success: true,
        data: result,
        cached: false,
        timestamp: Date.now()
      };
    }
  } catch (error) {
    endTiming();
    
    // Retry logic
    if (retries > 0) {
      console.warn(`API call failed, retrying... (${retries} retries left)`, error);
      return optimizedApiCall(url, options, { ...apiOptions, retries: retries - 1 });
    }

    return {
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      timestamp: Date.now()
    };
  }
}

/**
 * Batch multiple API calls for better performance
 */
export async function batchApiCalls<T>(
  calls: Array<() => Promise<ApiResponse<T>>>,
  batchSize: number = 5
): Promise<ApiResponse<T>[]> {
  const results: ApiResponse<T>[] = [];
  
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(call => call()));
    
    // Convert settled results to our format
    const processedResults = batchResults.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          timestamp: Date.now()
        };
      }
    });
    
    results.push(...processedResults);
  }
  
  return results;
}

/**
 * Preload critical API data
 */
export function preloadApiData(url: string, options: RequestInit = {}): void {
  if (typeof window !== 'undefined') {
    // Preload in background
    optimizedApiCall(url, options, { cache: true, ttl: CACHE_TTL.LONG })
      .catch(error => console.warn('Preload failed:', error));
  }
}

/**
 * Optimized fetch with request deduplication
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const requestDeduplicator = new RequestDeduplicator();

/**
 * Deduplicated API call - prevents duplicate requests
 */
export async function deduplicatedApiCall<T>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const key = `dedup-${url}-${JSON.stringify(options)}`;
  
  return requestDeduplicator.deduplicate(key, () => 
    optimizedApiCall<T>(url, options, apiOptions)
  );
}

/**
 * API response compression
 */
export function compressApiResponse(data: any): string {
  // Simple compression for large responses
  if (typeof data === 'string' && data.length > 1000) {
    // In a real implementation, you'd use a compression library
    return btoa(data);
  }
  return JSON.stringify(data);
}

/**
 * Decompress API response
 */
export function decompressApiResponse(compressed: string): any {
  try {
    // Try to decompress
    const decompressed = atob(compressed);
    return JSON.parse(decompressed);
  } catch {
    // Fallback to regular JSON parse
    return JSON.parse(compressed);
  }
}

/**
 * API health check
 */
export async function checkApiHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Circuit breaker for API calls
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

const circuitBreaker = new CircuitBreaker();

/**
 * Circuit breaker protected API call
 */
export async function protectedApiCall<T>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<ApiResponse<T>> {
  return circuitBreaker.execute(() => 
    optimizedApiCall<T>(url, options, apiOptions)
  );
}
