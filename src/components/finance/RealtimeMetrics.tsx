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

  // Calculate actual previous period data from sales events
  const calculatePreviousPeriodSales = () => {
    const now = new Date();
    
    // Yesterday's sales
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    
    // Last week's sales (same day last week)
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    // Last month's sales
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const yesterdayRevenue = recentEvents
      .filter(event => {
        const eventDate = new Date(event.eventTimestamp);
        return eventDate >= yesterdayStart && eventDate <= yesterdayEnd &&
               (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled');
      })
      .reduce((sum, event) => sum + event.totalAmount, 0);

    const lastWeekRevenue = recentEvents
      .filter(event => {
        const eventDate = new Date(event.eventTimestamp);
        return eventDate >= lastWeekStart && eventDate <= lastWeekEnd &&
               (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled');
      })
      .reduce((sum, event) => sum + event.totalAmount, 0);

    const lastMonthRevenue = recentEvents
      .filter(event => {
        const eventDate = new Date(event.eventTimestamp);
        return eventDate >= lastMonthStart && eventDate <= lastMonthEnd &&
               (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled');
      })
      .reduce((sum, event) => sum + event.totalAmount, 0);

    return {
      today: yesterdayRevenue,
      thisWeek: lastWeekRevenue,
      thisMonth: lastMonthRevenue
    };
  };

  const previousPeriodSales = calculatePreviousPeriodSales();
  const todayTrend = getTrendIndicator(currentSales.today, previousPeriodSales.today);
  const weekTrend = getTrendIndicator(currentSales.thisWeek, previousPeriodSales.thisWeek);
  const monthTrend = getTrendIndicator(currentSales.thisMonth, previousPeriodSales.thisMonth);

  const TodayTrendIcon = todayTrend.icon;
  const WeekTrendIcon = weekTrend.icon;
  const MonthTrendIcon = monthTrend.icon;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Today's Revenue */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">Today's Revenue</CardTitle>
          <div className="p-2 bg-green-500 rounded-lg">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{formatCurrency(currentSales.today)}</div>
          <div className="flex items-center text-xs mt-2">
            <TodayTrendIcon className={`h-3 w-3 mr-1 ${todayTrend.color}`} />
            {todayTrend.change !== 0 && (
              <span className={`${todayTrend.color} font-medium`}>
                {todayTrend.change > 0 ? '+' : ''}{todayTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1 text-green-700">vs yesterday</span>
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
            )}
          </div>
          <p className="text-xs text-green-700 mt-1 font-medium">
            {metrics.todayOrders} orders • {metrics.todayUnits} units
          </p>
        </CardContent>
      </Card>

      {/* This Week's Revenue */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">This Week</CardTitle>
          <div className="p-2 bg-blue-500 rounded-lg">
            <Calendar className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{formatCurrency(currentSales.thisWeek)}</div>
          <div className="flex items-center text-xs mt-2">
            <WeekTrendIcon className={`h-3 w-3 mr-1 ${weekTrend.color}`} />
            {weekTrend.change !== 0 && (
              <span className={`${weekTrend.color} font-medium`}>
                {weekTrend.change > 0 ? '+' : ''}{weekTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1 text-blue-700">vs last week</span>
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2"></div>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-1 font-medium">
            {metrics.weekOrders} orders this week
          </p>
        </CardContent>
      </Card>

      {/* This Month's Revenue */}
      <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800">This Month</CardTitle>
          <div className="p-2 bg-purple-500 rounded-lg">
            <Package className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-900">{formatCurrency(currentSales.thisMonth)}</div>
          <div className="flex items-center text-xs mt-2">
            <MonthTrendIcon className={`h-3 w-3 mr-1 ${monthTrend.color}`} />
            {monthTrend.change !== 0 && (
              <span className={`${monthTrend.color} font-medium`}>
                {monthTrend.change > 0 ? '+' : ''}{monthTrend.change.toFixed(1)}%
              </span>
            )}
            <span className="ml-1 text-purple-700">vs last month</span>
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse ml-2"></div>
            )}
          </div>
          <p className="text-xs text-purple-700 mt-1 font-medium">
            Monthly performance
          </p>
        </CardContent>
      </Card>

      {/* Average Order Value */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-800">Avg Order Value</CardTitle>
          <div className="p-2 bg-orange-500 rounded-lg">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-900">{formatCurrency(metrics.averageOrderValue)}</div>
          <div className="flex items-center text-xs mt-2">
            <Activity className="h-3 w-3 mr-1 text-orange-600" />
            <span className="text-orange-700 font-medium">Based on today's orders</span>
            {connectionState === 'online' && (
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse ml-2"></div>
            )}
          </div>
          <p className="text-xs text-orange-700 mt-1 font-medium">
            {recentEvents.length} recent events
          </p>
        </CardContent>
      </Card>
    </div>
  );
}