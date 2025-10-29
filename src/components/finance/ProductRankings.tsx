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
      // Calculate growth (mock calculation)
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
      
      // Mock margin calculation (15-35%)
      const margin = 15 + Math.random() * 20;
      
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
      product.previousRank = Math.max(1, product.rank + Math.floor((Math.random() - 0.5) * 4)); // Mock previous rank
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
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Award className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Star className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Product Rankings</h3>
          <p className="text-sm text-muted-foreground">
            Live product performance with automatic ranking updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="units">Units</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="margin">Margin</SelectItem>
            </SelectContent>
          </Select>
          {connectionState === 'online' && (
            <Badge variant="default" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rankings.slice(0, 3).map((product, index) => (
          <Card key={product.id} className={`relative ${product.isTopPerformer ? 'ring-2 ring-primary/20' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getRankIcon(product.rank)}
                  <Badge variant={index === 0 ? 'default' : 'outline'}>
                    Top {product.rank}
                  </Badge>
                </div>
                {connectionState === 'online' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm leading-tight">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                
                <div className="text-lg font-bold">
                  {formatCurrency(product.revenue)}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span>{product.units} units</span>
                  <span>{product.orders} orders</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {getTrendIcon(product.trend)}
                  <span className={`text-xs font-medium ${
                    product.trend === 'up' ? 'text-green-500' : 
                    product.trend === 'down' ? 'text-red-500' : 
                    'text-gray-500'
                  }`}>
                    {product.growth > 0 ? '+' : ''}{product.growth.toFixed(1)}%
                  </span>
                </div>

                <Progress value={product.revenueShare} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {product.revenueShare.toFixed(1)}% of total revenue
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Product Rankings</CardTitle>
          <CardDescription>
            All products ranked by {sortBy} with real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rankings.map((product) => {
              const rankChange = getRankChange(product.rank, product.previousRank);
              
              return (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex items-center gap-2 w-16">
                      {getRankIcon(product.rank)}
                      {rankChange.direction !== 'neutral' && (
                        <div className="flex items-center gap-1">
                          {rankChange.direction === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {rankChange.value}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.units} units • {product.orders} orders
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">{product.margin.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Margin</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(product.trend)}
                        <span className={`font-medium text-sm ${
                          product.trend === 'up' ? 'text-green-500' : 
                          product.trend === 'down' ? 'text-red-500' : 
                          'text-gray-500'
                        }`}>
                          {product.growth > 0 ? '+' : ''}{product.growth.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Growth</p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">{product.revenueShare.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Share</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rankings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p>No product data available</p>
              <p className="text-sm">Sales events will appear here in real-time</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rankings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {rankings.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {rankings.filter(p => p.trend === 'up').length}
              </div>
              <p className="text-sm text-muted-foreground">Growing</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {rankings.slice(0, 3).reduce((sum, p) => sum + p.revenueShare, 0).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Top 3 Share</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {rankings.length > 0 ? (rankings.reduce((sum, p) => sum + p.growth, 0) / rankings.length).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Avg Growth</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}