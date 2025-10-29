'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Package, Star, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    fetchProductData();
  }, [timeRange, sortBy]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration
      const mockData = generateMockProductData();
      setProductData(mockData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockProductData = (): ProductData[] => {
    const products = [
      { name: 'Handcrafted Teak Dining Table', category: 'Furniture' },
      { name: 'Carved Wooden Door Set', category: 'Doors' },
      { name: 'Traditional Wall Art', category: 'Decorative' },
      { name: 'Wooden Storage Chest', category: 'Furniture' },
      { name: 'Decorative Mirror Frame', category: 'Decorative' },
      { name: 'Custom Kitchen Cabinet', category: 'Furniture' },
      { name: 'Ornate Room Divider', category: 'Decorative' },
      { name: 'Handmade Jewelry Box', category: 'Accessories' },
    ];

    return products.map((product, index) => {
      const baseRevenue = 50000 - (index * 5000) + (Math.random() * 10000);
      const units = Math.round(baseRevenue / (2000 + Math.random() * 3000));
      const orders = Math.round(units * (0.7 + Math.random() * 0.3));
      const margin = 0.15 + Math.random() * 0.25; // 15-40% margin
      const growth = (Math.random() - 0.5) * 40; // -20% to +20% growth

      return {
        id: `product_${index + 1}`,
        name: product.name,
        category: product.category,
        revenue: Math.round(baseRevenue),
        units,
        orders,
        margin: Math.round(margin * 100) / 100,
        growth: Math.round(growth * 10) / 10,
        rank: index + 1
      };
    }).sort((a, b) => {
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
    <div className={`space-y-6 ${className}`}>
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
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    fontSize={12}
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
                    fontSize={10}
                    width={120}
                    tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
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
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
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