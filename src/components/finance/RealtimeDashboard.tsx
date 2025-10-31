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
  CheckCircle
} from 'lucide-react';
import EnhancedDigitalKhataService, { DashboardData } from '@/lib/services/EnhancedDigitalKhataService';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';
import ConnectionStatus from './ConnectionStatus';
import RealtimeMetrics from './RealtimeMetrics';
import RealtimeKPICards from './RealtimeKPICards';
import ProductRankings from './ProductRankings';

interface RealtimeDashboardProps {
  artisanId: string;
  className?: string;
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

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Subscribe to dashboard updates
        const subId = service.subscribeToDashboard(artisanId, handleDashboardUpdate);
        setSubscriptionId(subId);

        // Subscribe to connection state changes
        const unsubscribeConnection = service.onConnectionStateChange(handleConnectionStateChange);

        // Load initial data
        const initialData = await service.getDashboardData(artisanId);
        setDashboardData(initialData);
        setConnectionState(initialData.connectionState);
        setLastUpdated(new Date());

        cleanup = () => {
          service.unsubscribeFromDashboard(subId);
          unsubscribeConnection();
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
  }, [artisanId, handleDashboardUpdate, handleConnectionStateChange, service]);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const data = await service.getDashboardData(artisanId);
      setDashboardData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
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
            Live financial data and performance metrics
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

      {/* Real-time Metrics Cards */}
      <RealtimeMetrics 
        currentSales={dashboardData.currentSales}
        recentEvents={dashboardData.recentEvents}
        connectionState={connectionState}
      />

      {/* Enhanced KPI Cards */}
      <RealtimeKPICards
        recentEvents={dashboardData.recentEvents}
        aggregates={dashboardData.aggregates}
        connectionState={connectionState}
      />

      {/* Product Rankings */}
      <ProductRankings
        recentEvents={dashboardData.recentEvents}
        aggregates={dashboardData.aggregates}
        connectionState={connectionState}
      />

      {/* Recent Sales Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sales Events</CardTitle>
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
          {dashboardData.recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p>No recent sales events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.recentEvents.slice(0, 5).map((event, index) => (
                <div 
                  key={event.orderId} 
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{event.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.eventType} • {event.quantity} units • {event.channel}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregates Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>Today's aggregated metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.aggregates.daily.length === 0 ? (
              <p className="text-muted-foreground">No daily data available</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.aggregates.daily.slice(0, 3).map((aggregate, index) => (
                  <div key={aggregate.periodKey} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{aggregate.periodKey}</p>
                      <p className="text-sm text-muted-foreground">
                        {aggregate.totalOrders} orders • {aggregate.totalQuantity} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(aggregate.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(aggregate.averageOrderValue)} avg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Trends</CardTitle>
            <CardDescription>This week's performance</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.aggregates.weekly.length === 0 ? (
              <p className="text-muted-foreground">No weekly data available</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.aggregates.weekly.slice(0, 3).map((aggregate, index) => (
                  <div key={aggregate.periodKey} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Week {aggregate.periodKey}</p>
                      <p className="text-sm text-muted-foreground">
                        {aggregate.totalOrders} orders • {aggregate.uniqueProducts} products
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(aggregate.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(aggregate.netRevenue)} net
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Status Alert */}
      {connectionState === 'offline' && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Data may not be up to date. 
            Connection will be restored automatically when available.
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