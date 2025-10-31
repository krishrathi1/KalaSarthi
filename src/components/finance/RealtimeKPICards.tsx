'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Target,
  Activity,
  Clock,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';
import { ISalesEvent } from '@/lib/models/SalesEvent';
import { ISalesAggregate } from '@/lib/models/SalesAggregate';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';

interface KPIData {
  value: number;
  previousValue: number;
  target?: number;
  unit: 'currency' | 'number' | 'percentage';
  trend: 'up' | 'down' | 'neutral';
  changePercent: number;
}

interface RealtimeKPICardsProps {
  recentEvents: ISalesEvent[];
  aggregates: {
    daily: ISalesAggregate[];
    weekly: ISalesAggregate[];
    monthly: ISalesAggregate[];
    yearly: ISalesAggregate[];
  };
  connectionState: ConnectionState;
  className?: string;
}

export default function RealtimeKPICards({ 
  recentEvents, 
  aggregates, 
  connectionState,
  className = '' 
}: RealtimeKPICardsProps) {
  const [kpiData, setKpiData] = useState<{
    revenue: KPIData;
    orders: KPIData;
    conversionRate: KPIData;
    averageOrderValue: KPIData;
    customerRetention: KPIData;
    profitMargin: KPIData;
  } | null>(null);

  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    calculateKPIs();
    setLastUpdateTime(new Date());
  }, [recentEvents, aggregates]);

  const calculateKPIs = () => {
    // Get current period data
    const todayAggregate = aggregates.daily[0];
    const weekAggregate = aggregates.weekly[0];
    const monthAggregate = aggregates.monthly[0];

    // Get previous period data for comparison
    const yesterdayAggregate = aggregates.daily[1];
    const lastWeekAggregate = aggregates.weekly[1];
    const lastMonthAggregate = aggregates.monthly[1];

    // Calculate real-time metrics
    const currentRevenue = todayAggregate?.totalRevenue || 0;
    const previousRevenue = yesterdayAggregate?.totalRevenue || 0;
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentOrders = todayAggregate?.totalOrders || 0;
    const previousOrders = yesterdayAggregate?.totalOrders || 0;
    const ordersChange = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

    const currentAOV = todayAggregate?.averageOrderValue || 0;
    const previousAOV = yesterdayAggregate?.averageOrderValue || 0;
    const aovChange = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;

    // Mock conversion rate calculation (would be based on actual traffic data)
    const conversionRate = currentOrders > 0 ? Math.min(100, (currentOrders / Math.max(currentOrders * 10, 100)) * 100) : 0;
    const previousConversionRate = conversionRate * 0.95; // Mock previous rate
    const conversionChange = previousConversionRate > 0 ? ((conversionRate - previousConversionRate) / previousConversionRate) * 100 : 0;

    // Mock customer retention (would be calculated from actual customer data)
    const customerRetention = 75 + Math.random() * 20; // 75-95%
    const previousRetention = customerRetention * 0.98;
    const retentionChange = ((customerRetention - previousRetention) / previousRetention) * 100;

    // Calculate profit margin from aggregates
    const profitMargin = currentRevenue > 0 ? ((todayAggregate?.netRevenue || 0) / currentRevenue) * 100 : 0;
    const previousMargin = previousRevenue > 0 ? ((yesterdayAggregate?.netRevenue || 0) / previousRevenue) * 100 : 0;
    const marginChange = previousMargin > 0 ? ((profitMargin - previousMargin) / previousMargin) * 100 : 0;

    setKpiData({
      revenue: {
        value: currentRevenue,
        previousValue: previousRevenue,
        target: monthAggregate?.totalRevenue ? monthAggregate.totalRevenue * 1.1 : currentRevenue * 30, // 10% growth target
        unit: 'currency',
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
        changePercent: revenueChange
      },
      orders: {
        value: currentOrders,
        previousValue: previousOrders,
        target: Math.max(currentOrders * 1.2, 10), // 20% growth target
        unit: 'number',
        trend: ordersChange > 0 ? 'up' : ordersChange < 0 ? 'down' : 'neutral',
        changePercent: ordersChange
      },
      conversionRate: {
        value: conversionRate,
        previousValue: previousConversionRate,
        target: 5, // 5% conversion rate target
        unit: 'percentage',
        trend: conversionChange > 0 ? 'up' : conversionChange < 0 ? 'down' : 'neutral',
        changePercent: conversionChange
      },
      averageOrderValue: {
        value: currentAOV,
        previousValue: previousAOV,
        target: currentAOV * 1.15, // 15% increase target
        unit: 'currency',
        trend: aovChange > 0 ? 'up' : aovChange < 0 ? 'down' : 'neutral',
        changePercent: aovChange
      },
      customerRetention: {
        value: customerRetention,
        previousValue: previousRetention,
        target: 85, // 85% retention target
        unit: 'percentage',
        trend: retentionChange > 0 ? 'up' : retentionChange < 0 ? 'down' : 'neutral',
        changePercent: retentionChange
      },
      profitMargin: {
        value: profitMargin,
        previousValue: previousMargin,
        target: 30, // 30% margin target
        unit: 'percentage',
        trend: marginChange > 0 ? 'up' : marginChange < 0 ? 'down' : 'neutral',
        changePercent: marginChange
      }
    });
  };

  const formatValue = (value: number, unit: 'currency' | 'number' | 'percentage') => {
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Activity;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getProgressValue = (current: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min(100, (current / target) * 100);
  };

  if (!kpiData) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Today\'s Revenue',
      icon: DollarSign,
      data: kpiData.revenue,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Orders Today',
      icon: ShoppingCart,
      data: kpiData.orders,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Conversion Rate',
      icon: Target,
      data: kpiData.conversionRate,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg Order Value',
      icon: BarChart3,
      data: kpiData.averageOrderValue,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Customer Retention',
      icon: Users,
      data: kpiData.customerRetention,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Profit Margin',
      icon: PieChart,
      data: kpiData.profitMargin,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Performance Indicators</h3>
          <p className="text-sm text-muted-foreground">
            Live KPIs with automatic updates and trend analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {lastUpdateTime.toLocaleTimeString()}
          </Badge>
          {connectionState === 'online' && (
            <Badge variant="default" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const TrendIcon = getTrendIcon(card.data.trend);
          const IconComponent = card.icon;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <IconComponent className={`h-4 w-4 ${card.color}`} />
                  </div>
                  {connectionState === 'online' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Main Value */}
                  <div className="text-2xl font-bold">
                    {formatValue(card.data.value, card.data.unit)}
                  </div>

                  {/* Trend Indicator */}
                  <div className="flex items-center gap-2">
                    <TrendIcon className={`h-4 w-4 ${getTrendColor(card.data.trend)}`} />
                    <span className={`text-sm font-medium ${getTrendColor(card.data.trend)}`}>
                      {card.data.changePercent > 0 ? '+' : ''}{card.data.changePercent.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs yesterday</span>
                  </div>

                  {/* Progress to Target */}
                  {card.data.target && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Target Progress</span>
                        <span className="font-medium">
                          {getProgressValue(card.data.value, card.data.target).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={getProgressValue(card.data.value, card.data.target)} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Target: {formatValue(card.data.target, card.data.unit)}
                      </div>
                    </div>
                  )}

                  {/* Previous Value Comparison */}
                  <div className="text-xs text-muted-foreground">
                    Previous: {formatValue(card.data.previousValue, card.data.unit)}
                  </div>
                </div>
              </CardContent>

              {/* Live Update Indicator */}
              {connectionState === 'online' && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {kpiCards.filter(card => card.data.trend === 'up').length}
              </div>
              <p className="text-sm text-muted-foreground">Metrics Improving</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {kpiCards.filter(card => card.data.target && card.data.value >= card.data.target).length}
              </div>
              <p className="text-sm text-muted-foreground">Targets Achieved</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(kpiCards.reduce((sum, card) => sum + Math.abs(card.data.changePercent), 0) / kpiCards.length)}%
              </div>
              <p className="text-sm text-muted-foreground">Avg Change Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}