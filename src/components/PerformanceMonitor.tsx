'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Clock, Database, Wifi } from 'lucide-react';
import { PerformanceMonitor as PerfMonitor, getCacheStats } from '@/lib/performance';

interface PerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [cacheStats, setCacheStats] = useState(getCacheStats());

  useEffect(() => {
    // Monitor page load time
    const pageLoadTime = performance.now();
    
    // Monitor render time
    const renderStart = performance.now();
    const renderTime = performance.now() - renderStart;

    // Get performance metrics
    const perfMonitor = PerfMonitor.getInstance();
    const perfMetrics = perfMonitor.getMetrics();

    // Calculate cache hit rate
    const stats = getCacheStats();
    const hitRate = stats.totalEntries > 0 ? (stats.validEntries / stats.totalEntries) * 100 : 0;

    // Get memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    setMetrics({
      pageLoadTime,
      renderTime,
      apiResponseTime: perfMetrics['api-call']?.avg || 0,
      cacheHitRate: hitRate,
      memoryUsage: memoryUsage / 1024 / 1024, // Convert to MB
    });

    // Update cache stats periodically
    const interval = setInterval(() => {
      setCacheStats(getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
        <CardDescription className="text-xs">
          Real-time performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics && (
          <>
            {/* Page Load Time */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>Page Load</span>
              </div>
              <Badge variant={metrics.pageLoadTime < 1000 ? 'default' : 'destructive'}>
                {metrics.pageLoadTime.toFixed(0)}ms
              </Badge>
            </div>

            {/* Render Time */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-green-500" />
                <span>Render Time</span>
              </div>
              <Badge variant={metrics.renderTime < 100 ? 'default' : 'destructive'}>
                {metrics.renderTime.toFixed(1)}ms
              </Badge>
            </div>

            {/* API Response Time */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wifi className="h-3 w-3 text-purple-500" />
                <span>API Response</span>
              </div>
              <Badge variant={metrics.apiResponseTime < 500 ? 'default' : 'destructive'}>
                {metrics.apiResponseTime.toFixed(0)}ms
              </Badge>
            </div>

            {/* Cache Hit Rate */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-orange-500" />
                <span>Cache Hit Rate</span>
              </div>
              <Badge variant={metrics.cacheHitRate > 70 ? 'default' : 'destructive'}>
                {metrics.cacheHitRate.toFixed(1)}%
              </Badge>
            </div>

            {/* Memory Usage */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-red-500" />
                <span>Memory Usage</span>
              </div>
              <Badge variant={metrics.memoryUsage < 50 ? 'default' : 'destructive'}>
                {metrics.memoryUsage.toFixed(1)}MB
              </Badge>
            </div>
          </>
        )}

        {/* Cache Statistics */}
        <div className="pt-2 border-t">
          <div className="text-xs font-medium mb-2">Cache Statistics</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Total Entries:</span>
              <span>{cacheStats.totalEntries}</span>
            </div>
            <div className="flex justify-between">
              <span>Valid Entries:</span>
              <span>{cacheStats.validEntries}</span>
            </div>
            <div className="flex justify-between">
              <span>Expired:</span>
              <span>{cacheStats.expiredEntries}</span>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <span>{(cacheStats.memoryUsage / 1024).toFixed(1)}KB</span>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="pt-2 border-t">
          <div className="text-xs font-medium mb-1">Performance Tips</div>
          <div className="text-xs text-gray-600 space-y-1">
            {metrics && metrics.pageLoadTime > 2000 && (
              <div>• Consider lazy loading components</div>
            )}
            {metrics && metrics.cacheHitRate < 50 && (
              <div>• Enable more aggressive caching</div>
            )}
            {metrics && metrics.memoryUsage > 100 && (
              <div>• Clear unused cache entries</div>
            )}
            {metrics && metrics.apiResponseTime > 1000 && (
              <div>• Optimize API endpoints</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
