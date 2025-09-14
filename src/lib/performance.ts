// Performance optimization utilities

// In-memory cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache configuration
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

export interface CacheOptions {
  ttl?: number;
  key?: string;
  forceRefresh?: boolean;
}

/**
 * Get cached data or fetch and cache new data
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM, forceRefresh = false } = options;
  
  // Check cache first
  if (!forceRefresh) {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
  }

  // Fetch new data
  try {
    const data = await fetcher();
    
    // Cache the result
    apiCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    return data;
  } catch (error) {
    // Return cached data if available, even if expired
    const cached = apiCache.get(key);
    if (cached) {
      console.warn(`Using expired cache for ${key} due to fetch error:`, error);
      return cached.data;
    }
    throw error;
  }
}

/**
 * Clear cache for specific key or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    apiCache.delete(key);
  } else {
    apiCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(apiCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([, value]) => now - value.timestamp < value.ttl).length,
    expiredEntries: entries.filter(([, value]) => now - value.timestamp >= value.ttl).length,
    memoryUsage: JSON.stringify(Array.from(apiCache.values())).length
  };
}

/**
 * Clean up expired cache entries
 */
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp >= value.ttl) {
      apiCache.delete(key);
    }
  }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load component with loading state
 */
import { lazy } from 'react';

export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  return lazy(importFunc);
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string = 'script'): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
}

/**
 * Prefetch route
 */
export function prefetchRoute(href: string): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Optimize images with lazy loading
 */
export function optimizeImage(
  src: string,
  width?: number,
  height?: number,
  quality: number = 75
): string {
  // Add Cloudinary optimizations
  if (src.includes('cloudinary.com')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    params.set('f_auto', 'true');
    params.set('c_fill', 'true');
    
    return `${src}?${params.toString()}`;
  }
  
  return src;
}

/**
 * Batch API calls to reduce network requests
 */
export async function batchApiCalls<T>(
  calls: Array<() => Promise<T>>,
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(call => call()));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(value);
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [label, values] of this.metrics.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      result[label] = { avg, min, max, count: values.length };
    }
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Auto-cleanup cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000);
}

export { CACHE_TTL };
