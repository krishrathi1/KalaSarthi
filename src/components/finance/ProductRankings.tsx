'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Crown,
  Star,
  Package,
  DollarSign,
  ShoppingCart,
  Activity,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { ISalesEvent } from '@/lib/models/SalesEvent';
import { ISalesAggregate } from '@/lib/models/SalesAggregate';
import { ConnectionState } from '@/lib/services/RealtimeFirestoreSyncService';

interface ProductRanking {
  id: string;
  name: string;
  category: string;
  rank: number;
  previousRank: number;
  revenue: number;
  units: number;
  orders: number;
  growth: number;
  margin: number;
  trend: 'up' | 'down' | 'neutral';
  isTopPerformer: boolean;
  revenueShare: number;
}

interface ProductRankingsProps {
  recentEvents: ISalesEvent[];
  aggregates: {
    daily: ISalesAggregate[];
    weekly: ISalesAggregate[];
    monthly: ISalesAggregate[];
  };
  connectionState: ConnectionState;
  className?: string;
}

export default function ProductRankings({ 
  recentEvents, 
  aggregates, 
  connectionState,
  className = '' 
}: ProductRankingsProps) {
  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'growth' | 'margin'>('revenue');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    calculateRankings();
    setLastUpdated(new Date());
  }, [recentEvents, aggregates, sortBy, timeframe]);

  const calculateRankings = () => {
    // Get product data from recent events and aggregates
    const productMap = new Map<string, {
      name: string;
      category: string;
      revenue: number;
      units: number;
      orders: number;
      events: ISalesEvent[];
    }>();

    // Process recent events
    recentEvents.forEach(event => {
      if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
        const existing = productMap.get(event.productId) || {
          name: event.productName,
          category: event.productCategory,
          revenue: 0,
          units: 0,
          orders: 0,
          events: []
        };

        existing.revenue += event.totalAmount;
        existing.units += event.quantity;
        existing.orders += 1;
        existing.events.push(event);
        
        productMap.set(event.productId, existing);
      }
    });

    // Convert to rankings array
    const productRankings: ProductRanking[] = Array.from(productMap.entries()).map(([id, data], index) => {
      // Calculate actual growth based on sales data
      const recentRevenue = data.events
        .filter(e => new Date(e.eventTimestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .reduce((sum, e) => sum + e.totalAmount, 0);
      
      const olderRevenue = data.events
        .filter(e => {
          const eventDate = new Date(e.eventTimestamp);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          return eventDate <= weekAgo && eventDate > twoWeeksAgo;
        })
        .reduce((sum, e) => sum + e.totalAmount, 0);

      const growth = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;
      
      // Calculate actual margin based on cost price (if available in events)
      const totalCost = data.events.reduce((sum, e) => sum + (e.costPrice || 0) * e.quantity, 0);
      const margin = totalCost > 0 ? ((data.revenue - totalCost) / data.revenue) * 100 : 0;
      
      return {
        id,
        name: data.name,
        category: data.category,
        rank: 0, // Will be set after sorting
        previousRank: 0, // Mock previous rank
        revenue: data.revenue,
        units: data.units,
        orders: data.orders,
        growth,
        margin,
        trend: growth > 5 ? 'up' : growth < -5 ? 'down' : 'neutral',
        isTopPerformer: false, // Will be set for top 3
        revenueShare: 0 // Will be calculated
      };
    });

    // Sort by selected metric
    productRankings.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'units':
          return b.units - a.units;
        case 'growth':
          return b.growth - a.growth;
        case 'margin':
          return b.margin - a.margin;
        default:
          return b.revenue - a.revenue;
      }
    });

    // Set ranks and calculate revenue share
    const totalRevenue = productRankings.reduce((sum, p) => sum + p.revenue, 0);
    
    productRankings.forEach((product, index) => {
      product.rank = index + 1;
      // Calculate previous rank based on older data if available
      const olderEvents = recentEvents.filter(e => {
        const eventDate = new Date(e.eventTimestamp);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return eventDate <= oneWeekAgo && eventDate > twoWeeksAgo;
      });
      
      // Calculate previous rank based on older revenue data
      const olderProductMap = new Map<string, number>();
      olderEvents.forEach(event => {
        if (event.eventType === 'order_paid' || event.eventType === 'order_fulfilled') {
          const existing = olderProductMap.get(event.productId) || 0;
          olderProductMap.set(event.productId, existing + event.totalAmount);
        }
      });
      
      const olderRankings = Array.from(olderProductMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([productId], index) => ({ productId, rank: index + 1 }));
      
      const previousRankData = olderRankings.find(r => r.productId === product.id);
      product.previousRank = previousRankData ? previousRankData.rank : product.rank;
      product.isTopPerformer = index < 3;
      product.revenueShare = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
    });

    setRankings(productRankings);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRankChange = (current: number, previous: number) => {
    const change = previous - current;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'neutral', value: 0 };
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
            <Crown className="h-4 w-4 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
            <Award className="h-4 w-4 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-lg">
            <Star className="h-4 w-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-md">
            <span className="text-xs font-bold text-white">#{rank}</span>
          </div>
        );
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Real-time Product Rankings
          </h3>
          <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Live product performance with automatic ranking updates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-28 bg-white border-indigo-200 hover:border-indigo-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">📅 Daily</SelectItem>
              <SelectItem value="weekly">📊 Weekly</SelectItem>
              <SelectItem value="monthly">📈 Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-36 bg-white border-indigo-200 hover:border-indigo-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">💰 Revenue</SelectItem>
              <SelectItem value="units">📦 Units</SelectItem>
              <SelectItem value="growth">📈 Growth</SelectItem>
              <SelectItem value="margin">🎯 Margin</SelectItem>
            </SelectContent>
          </Select>
          {connectionState === 'online' && (
            <Badge className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg animate-pulse">
              <Zap className="h-3 w-3" />
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rankings.slice(0, 3).map((product, index) => {
          const cardGradients = [
            'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
            'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
            'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'
          ];
          
          return (
            <Card key={product.id} className={`relative ${cardGradients[index]} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(product.rank)}
                    <Badge 
                      variant={index === 0 ? 'default' : 'outline'} 
                      className={index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' : ''}
                    >
                      Top {product.rank}
                    </Badge>
                  </div>
                  {connectionState === 'online' && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-base leading-tight text-gray-800">{product.name}</h4>
                    <Badge variant="secondary" className="mt-1 text-xs bg-blue-100 text-blue-700">
                      {product.category}
                    </Badge>
                  </div>
                  
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(product.revenue)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-purple-600">{product.units}</div>
                      <div className="text-xs text-purple-500">units</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-indigo-600">{product.orders}</div>
                      <div className="text-xs text-indigo-500">orders</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
                    {getTrendIcon(product.trend)}
                    <span className={`text-sm font-bold ${
                      product.trend === 'up' ? 'text-green-600' : 
                      product.trend === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {product.growth > 0 ? '+' : ''}{product.growth.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">growth</span>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Progress 
                        value={product.revenueShare} 
                        className="h-3 bg-gray-200 overflow-hidden" 
                      />
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${product.revenueShare}%`,
                          background: `linear-gradient(to right, 
                            ${index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#f59e0b'} 0%, 
                            ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#d97706'} 100%)`,
                          boxShadow: `0 0 10px ${index === 0 ? '#fbbf2440' : index === 1 ? '#9ca3af40' : '#f59e0b40'}`
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">
                        {product.revenueShare.toFixed(1)}% market share
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          index === 0 ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                          index === 1 ? 'border-gray-300 text-gray-700 bg-gray-50' :
                          'border-amber-300 text-amber-700 bg-amber-50'
                        }`}
                      >
                        Rank #{product.rank}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Rankings Table */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
          <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            Complete Product Rankings
          </CardTitle>
          <CardDescription className="text-gray-600">
            All products ranked by <span className="font-semibold text-indigo-600">{sortBy}</span> with real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rankings.map((product) => {
              const rankChange = getRankChange(product.rank, product.previousRank);
              
              return (
                <div key={product.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 hover:shadow-md ${
                  product.rank <= 3 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100' 
                    : 'hover:bg-gray-50'
                }`}>
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-20">
                      {getRankIcon(product.rank)}
                      {rankChange.direction !== 'neutral' && (
                        <div className="flex items-center gap-1">
                          {rankChange.direction === 'up' ? (
                            <div className="flex items-center gap-1 bg-green-100 rounded-full px-2 py-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span className="text-xs font-medium text-green-700">
                                {rankChange.value}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-red-100 rounded-full px-2 py-1">
                              <TrendingDown className="h-3 w-3 text-red-600" />
                              <span className="text-xs font-medium text-red-700">
                                {rankChange.value}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold truncate text-gray-800">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                        >
                          {product.category}
                        </Badge>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-blue-600">
                            <Package className="h-3 w-3" />
                            {product.units} units
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <ShoppingCart className="h-3 w-3" />
                            {product.orders} orders
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="text-right bg-green-50 rounded-lg p-3 min-w-[100px]">
                      <p className="font-bold text-green-700">{formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Revenue
                      </p>
                    </div>
                    
                    <div className="text-right bg-blue-50 rounded-lg p-3 min-w-[80px]">
                      <p className="font-bold text-blue-700">{product.margin.toFixed(1)}%</p>
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Margin
                      </p>
                    </div>
                    
                    <div className="text-right bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 min-w-[90px]">
                      <div className="flex items-center justify-end gap-1">
                        {getTrendIcon(product.trend)}
                        <span className={`font-bold text-sm ${
                          product.trend === 'up' ? 'text-green-600' : 
                          product.trend === 'down' ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {product.growth > 0 ? '+' : ''}{product.growth.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-purple-600">Growth</p>
                    </div>

                    <div className="text-right bg-orange-50 rounded-lg p-3 min-w-[80px]">
                      <p className="font-bold text-orange-700">{product.revenueShare.toFixed(1)}%</p>
                      <p className="text-xs text-orange-600">Share</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rankings.length === 0 && (
            <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto mb-4 animate-pulse">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">No product data available</p>
              <p className="text-sm text-blue-600 flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 animate-pulse" />
                Sales events will appear here in real-time
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rankings Summary */}
      <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Rankings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mx-auto mb-2">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-700">
                {rankings.length}
              </div>
              <p className="text-sm font-medium text-blue-600">Total Products</p>
            </div>
            <div className="text-center bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-green-700">
                {rankings.filter(p => p.trend === 'up').length}
              </div>
              <p className="text-sm font-medium text-green-600">Growing</p>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-100 to-pink-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mx-auto mb-2">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-purple-700">
                {rankings.slice(0, 3).reduce((sum, p) => sum + p.revenueShare, 0).toFixed(0)}%
              </div>
              <p className="text-sm font-medium text-purple-600">Top 3 Share</p>
            </div>
            <div className="text-center bg-gradient-to-br from-orange-100 to-amber-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-500 rounded-full mx-auto mb-2">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-orange-700">
                {rankings.length > 0 ? (rankings.reduce((sum, p) => sum + p.growth, 0) / rankings.length).toFixed(1) : 0}%
              </div>
              <p className="text-sm font-medium text-orange-600">Avg Growth</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}