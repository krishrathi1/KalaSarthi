'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Package, Star, AlertCircle } from 'lucide-react';
import { EnhancedDigitalKhataService } from '@/lib/services/EnhancedDigitalKhataService';
import { useAuth } from '@/context/auth-context';

interface ProductPerformanceProps {
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

interface ProductData {
  id: string;
  name: string;
  category: string;
  revenue: number;
  units: number;
  orders: number;
  margin: number;
  growth: number;
  rank: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ProductPerformance({ timeRange, className = '' }: ProductPerformanceProps) {
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'growth' | 'margin'>('revenue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchProductData();
  }, [timeRange, sortBy]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Map timeRange to API parameters
      const rangeMap = {
        'week': '7d',
        'month': '30d', 
        'quarter': '90d',
        'year': '1y'
      };

      const range = rangeMap[timeRange];
      const sortParam = sortBy === 'revenue' ? 'best' : 'best'; // API only supports best/worst for now

      // Fetch product performance data from finance API
      const response = await fetch(`/api/finance/products/performance?range=${range}&sort=${sortParam}&limit=20&artisanId=dev_bulchandani_001`);
      const result = await response.json();

      if (result.success && result.data) {
        // Convert API data to component format
        const productDataWithRankings: ProductData[] = result.data.map((item: any) => ({
          id: item.productId,
          name: item.productName,
          category: item.category,
          revenue: item.revenue,
          units: item.units,
          orders: item.orders,
          margin: item.marginPercentage / 100, // Convert percentage to decimal
          growth: item.revenueGrowth || 0,
          rank: item.rank
        }));

        // Sort by selected criteria (client-side sorting for now)
        const sortedData = productDataWithRankings.sort((a, b) => {
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
        }).map((product, index) => ({ ...product, rank: index + 1 }));

        setProductData(sortedData);
      } else {
        throw new Error(result.error || 'Failed to fetch product data');
      }

    } catch (err) {
      console.error('Error fetching product data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch product data');
    } finally {
      setLoading(false);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getCategoryData = () => {
    const categoryMap = new Map<string, { revenue: number, units: number }>();
    
    productData.forEach(product => {
      const existing = categoryMap.get(product.category) || { revenue: 0, units: 0 };
      categoryMap.set(product.category, {
        revenue: existing.revenue + product.revenue,
        units: existing.units + product.units
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      name: category,
      value: data.revenue,
      units: data.units
    }));
  };

  const topProducts = productData.slice(0, 5);
  const categoryData = getCategoryData();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>Loading product data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 w-full max-w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Performance</h3>
          <p className="text-sm text-muted-foreground">
            Analyze your product sales and performance metrics
          </p>
        </div>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="units">Units Sold</SelectItem>
            <SelectItem value="growth">Growth Rate</SelectItem>
            <SelectItem value="margin">Profit Margin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</CardTitle>
            <CardDescription>Best performing products this {timeRange}</CardDescription>
          </CardHeader>
          <CardContent className="w-full max-w-full overflow-hidden p-4 sm:p-6">
            <div className="h-64 sm:h-80 w-full overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topProducts} layout="horizontal" margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    fontSize={10}
                    tickFormatter={(value) => 
                      sortBy === 'revenue' ? `₹${(value / 1000).toFixed(0)}k` :
                      sortBy === 'margin' ? `${(value * 100).toFixed(0)}%` :
                      sortBy === 'growth' ? `${value.toFixed(0)}%` :
                      value.toString()
                    }
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    fontSize={9}
                    width={80}
                    tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ProductData;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">Category: {data.category}</p>
                            <p className="text-sm text-muted-foreground">Revenue: {formatCurrency(data.revenue)}</p>
                            <p className="text-sm text-muted-foreground">Units: {data.units}</p>
                            <p className="text-sm text-muted-foreground">Margin: {(data.margin * 100).toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">Growth: {formatPercentage(data.growth)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey={sortBy === 'margin' ? (data: ProductData) => data.margin * 100 : sortBy} 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Distribution across product categories</CardDescription>
          </CardHeader>
          <CardContent className="w-full max-w-full overflow-hidden p-4 sm:p-6">
            <div className="h-64 sm:h-80 w-full overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">Revenue: {formatCurrency(data.value)}</p>
                            <p className="text-sm text-muted-foreground">Units: {data.units}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Complete product performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productData.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-medium">#{product.rank}</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {product.units} units • {product.orders} orders
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{(product.margin * 100).toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Margin</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {product.growth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : product.growth < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <Package className="h-4 w-4 text-gray-500" />
                      )}
                      <span className={`font-medium ${
                        product.growth > 0 ? 'text-green-500' : 
                        product.growth < 0 ? 'text-red-500' : 
                        'text-gray-500'
                      }`}>
                        {formatPercentage(product.growth)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Growth</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}