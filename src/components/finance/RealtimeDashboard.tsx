'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import EnhancedDigitalKhataService, { DashboardData } from '@/lib/services/EnhancedDigitalKhataService';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';
import ConnectionStatus from './ConnectionStatus';
import RealtimeMetrics from './RealtimeMetrics';
import ProductRankings from './ProductRankings';
import SalesOverview from './SalesOverview';

interface RealtimeDashboardProps {
  artisanId: string;
  className?: string;
}

// Recent Sales Events Component with dropdown
function RecentSalesEvents({ 
  events, 
  connectionState, 
  formatCurrency 
}: { 
  events: any[], 
  connectionState: ConnectionState, 
  formatCurrency: (amount: number) => string 
}) {
  const [showAll, setShowAll] = useState(false);
  const displayEvents = showAll ? events : events.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>
              Latest transactions in real-time
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2" />
            <p>No recent sales events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayEvents.map((event, index) => (
              <div 
                key={event.id || index} 
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{event.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.eventType} • {event.quantity} units • {event.buyerName || 'Customer'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(event.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.eventTimestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {events.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="flex items-center gap-2"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show All ({events.length} events)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RealtimeDashboard({ artisanId, className = '' }: RealtimeDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const service = EnhancedDigitalKhataService.getInstance();

  // Handle dashboard data updates
  const handleDashboardUpdate = useCallback((data: DashboardData) => {
    setDashboardData(data);
    setConnectionState(data.connectionState);
    setLastUpdated(new Date());
    setLoading(false);
    setError(null);
  }, []);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);

  // Initialize real-time dashboard
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const fetchDashboardData = async (mode: 'realtime' | 'offline' = 'realtime', forceRefresh = false) => {
      try {
        console.log(`🔄 Fetching dashboard data - Mode: ${mode}, Force: ${forceRefresh}`);
        
        const response = await fetch(`/api/dashboard-realtime?artisanId=${artisanId}&mode=${mode}&refresh=${forceRefresh}`);
        const result = await response.json();

        if (result.success) {
          setDashboardData(result.data);
          setConnectionState(result.data.connectionState || 'online');
          setLastUpdated(new Date());
          setError(null);
          
          console.log(`✅ Dashboard data loaded - Source: ${result.metadata.dataSource}, Events: ${result.data.totalEvents}`);
          console.log(`💰 Revenue: Today ₹${result.data.currentSales.today}, Year ₹${result.data.currentSales.thisYear}`);
        } else {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
        
        // Try offline mode as fallback
        if (mode === 'realtime') {
          console.log('🔄 Trying offline mode as fallback...');
          await fetchDashboardData('offline');
        }
      }
    };

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load initial data
        await fetchDashboardData('realtime', true);

        // Set up real-time refresh every 30 seconds
        refreshInterval = setInterval(() => {
          fetchDashboardData('realtime', false);
        }, 30000);

        cleanup = () => {
          if (refreshInterval) {
            clearInterval(refreshInterval);
          }
        };

      } catch (err) {
        console.error('Error initializing real-time dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();

    return () => {
      if (cleanup) cleanup();
    };
  }, [artisanId]);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      console.log('🔄 Manual refresh triggered');
      
      const response = await fetch(`/api/dashboard-realtime?artisanId=${artisanId}&mode=realtime&refresh=true`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
        setConnectionState(result.data.connectionState || 'online');
        setLastUpdated(new Date());
        setError(null);
        console.log(`✅ Manual refresh completed - Source: ${result.metadata.dataSource}`);
      } else {
        throw new Error(result.error || 'Failed to refresh data');
      }
    } catch (err) {
      console.error('❌ Manual refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Get trend icon and color
  const getTrendDisplay = (current: number, previous: number) => {
    if (previous === 0) return { icon: Activity, color: 'text-gray-500', text: 'N/A' };
    
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return { 
        icon: TrendingUp, 
        color: 'text-green-500', 
        text: `+${change.toFixed(1)}%` 
      };
    } else if (change < 0) {
      return { 
        icon: TrendingDown, 
        color: 'text-red-500', 
        text: `${change.toFixed(1)}%` 
      };
    } else {
      return { 
        icon: Activity, 
        color: 'text-gray-500', 
        text: '0%' 
      };
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Real-time Dashboard</h2>
            <p className="text-muted-foreground">Loading financial data...</p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No dashboard data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-time Dashboard</h2>
          <p className="text-muted-foreground">
            {connectionState === 'online' 
              ? 'Live financial data and performance metrics' 
              : connectionState === 'offline' 
                ? 'Showing cached data - offline mode'
                : 'Reconnecting to live data...'
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus 
            connectionState={connectionState}
            lastUpdated={lastUpdated}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>



      {/* Sales Overview Component */}
      <SalesOverview
        timeRange="month"
      />

      {/* Real-time Analytics */}
      <RealtimeMetrics 
        currentSales={dashboardData.currentSales}
        recentEvents={dashboardData.recentEvents}
        connectionState={connectionState}
      />

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Key business metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardData.recentEvents.length}</div>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.recentEvents.filter(e => e.eventType === 'order_paid').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed Orders</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.recentEvents.reduce((sum, e) => sum + e.quantity, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Units Sold</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Product Rankings */}
      <ProductRankings
        recentEvents={dashboardData.recentEvents}
        aggregates={dashboardData.aggregates}
        connectionState={connectionState}
      />

      {/* Recent Sales Events - Limited to 5 with dropdown */}
      <RecentSalesEvents 
        events={dashboardData.recentEvents}
        connectionState={connectionState}
        formatCurrency={formatCurrency}
      />

      {/* Connection Status Alert */}
      {connectionState === 'offline' && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Showing cached sales data from Redis. Real-time updates will resume when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {connectionState === 'reconnecting' && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Reconnecting to real-time data stream...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}