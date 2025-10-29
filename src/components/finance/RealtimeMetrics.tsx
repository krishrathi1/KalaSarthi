'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Activity,
  Calendar,
  Clock
} from 'lucide-react';
import { ISalesEvent } from '@/lib/models/SalesEvent';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';

interface CurrentSales {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
}

interface RealtimeMetricsProps {
  currentSales: CurrentSales;
  recentEvents: ISalesEvent[];
  connectionState: ConnectionState;
  className?: string;
}

export default function RealtimeMetrics({ 
  currentSales, 
  recentEvents, 
  connectionState,
  className = '' 
}: RealtimeMetricsProps) {
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

  // Calculate metrics from recent events
  const calculateMetrics = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todayEvents = recentEvents.filter(event => 
      new Date(event.eventTimestamp) >= todayStart
    );

    const weekEvents = recentEvents.filter(event => 
      new Date(event.eventTimestamp) >= weekStart
    );

    const todayOrders = todayEvents.filter(event => 
      event.eventType === 'order_paid' || event.eventType === 'order_fulfilled'
    ).length;

    const todayUnits = todayEvents
      .filter(event => event.eventType === 'order_paid' || event.eventType === 'order_fulfilled')
      .reduce((sum, event) => sum + event.quantity, 0);

    const weekOrders = weekEvents.filter(event => 
      event.eventType === 'order_paid' || event.eventType === 'order_fulfilled'
    ).length;

    const averageOrderValue = todayOrders > 0 ? currentSales.today / todayOrders : 0;

    return {
      todayOrders,
      todayUnits,
      weekOrders,
      averageOrderValue
    };
  };

  const metrics = calculateMetrics();

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: Activity, color: 'text-gray-500', change: 0 };
    
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return { icon: TrendingUp, color: 'text-green-500', change };
    } else if (change < 0) {
      return { icon: TrendingDown, color: 'text-red-500', change };
    } else {
      return { icon: Activity, color: 'text-gray-500', change: 0 };
    }
  };

  // Mock previous period data for trend calculation
  const previousPeriodSales = {
    today: currentSales.today * 0.9, // Mock 10% growth
    thisWeek: currentSales.thisWeek * 0.85, // Mock 15% growth
    thisMonth: currentSales.thisMonth * 0.92, // Mock 8% growth
  };

  const todayTrend = getTrendIndicator(currentSales.today, previousPeriodSales.today);
  const weekTrend = getTrendIndicator(currentSales.thisWeek, previousPeriodSales.thisWeek);
  const monthTrend = getTrendIndicator(currentSales.thisMonth, previousPeriodSales.thisMonth);

  const TodayTrendIcon = todayTrend.icon;
  const WeekTrendIcon = weekTrend.icon;
  const MonthTrendIcon = monthTrend.icon;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Today's Revenue */}
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentSales.today)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <TodayTrendIcon className={`h-3 w-3 mr-1 ${todayTrend.color}`} />
            {todayTrend.change !== 0 && (
              <span className={todayTrend.color}>
                {todayTrend.change > 0 ? '+' : ''}{todayTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1">vs yesterday</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.todayOrders} orders • {metrics.todayUnits} units
          </p>
        </CardContent>
      </Card>

      {/* This Week's Revenue */}
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentSales.thisWeek)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <WeekTrendIcon className={`h-3 w-3 mr-1 ${weekTrend.color}`} />
            {weekTrend.change !== 0 && (
              <span className={weekTrend.color}>
                {weekTrend.change > 0 ? '+' : ''}{weekTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1">vs last week</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.weekOrders} orders this week
          </p>
        </CardContent>
      </Card>

      {/* This Month's Revenue */}
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(currentSales.thisMonth)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <MonthTrendIcon className={`h-3 w-3 mr-1 ${monthTrend.color}`} />
            {monthTrend.change !== 0 && (
              <span className={monthTrend.color}>
                {monthTrend.change > 0 ? '+' : ''}{monthTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1">vs last month</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly performance
          </p>
        </CardContent>
      </Card>

      {/* Average Order Value */}
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            {connectionState === 'online' && (
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.averageOrderValue)}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Activity className="h-3 w-3 mr-1" />
            <span>Based on today's orders</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {recentEvents.length} recent events
          </p>
        </CardContent>
      </Card>
    </div>
  );
}