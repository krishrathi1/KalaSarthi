'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Package, Star, AlertTriangle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductData {
  productId: string;
  productName: string;
  category: string;
  revenue: number;
  units: number;
  averagePrice: number;
  growth: number;
  rank: number;
  margin?: number;
  rating?: number;
}

interface ProductPerformanceProps {
  artisanId?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
  units: {
    label: 'Units Sold',
    color: 'hsl(var(--chart-2))',
  },
  margin: {
    label: 'Margin',
    color: 'hsl(var(--chart-3))',
  },
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function ProductPerformance({ artisanId, timeRange = 'month', className }: ProductPerformanceProps) {
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'growth' | 'margin'>('revenue');
  const [viewType, setViewType] = useState<'table' | 'chart' | 'pie'>('table');

  useEffect(() => {
    fetchProductData();
  }, [artisanId, selectedTimeRange, sortBy]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct API URL
      const params = new URLSearchParams();
      if (artisanId) params.append('artisanId', artisanId);
      params.append('range', selectedTimeRange);
      params.append('sort', sortBy);
      params.append('limit', '20');

      const response = await fetch(`/api/finance/products/performance?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product performance data');
      }

      const data = await response.json();
      
      if (data.success) {
        setProductData(data.data.products || []);
      } else {
        throw new Error(data.error || 'Failed to fetch product performance data');
      }
    } catch (err) {
      console.error('Error fetching product data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Set mock data for development
      setProductData(generateMockProductData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockProductData = (): ProductData[] => {
    const categories = ['Textiles', 'Jewelry', 'Pottery', 'Woodwork', 'Metalcraft'];
    const products = [
      'Handwoven Silk Saree', 'Silver Earrings', 'Clay Vase', 'Wooden Bowl', 'Brass Lamp',
      'Cotton Kurta', 'Gold Necklace', 'Ceramic Plate', 'Teak Table', 'Copper Pot',
      'Embroidered Dupatta', 'Pearl Bracelet', 'Terracotta Figurine', 'Bamboo Basket', 'Iron Sculpture',
      'Block Print Fabric', 'Diamond Ring', 'Glazed Mug', 'Carved Frame', 'Steel Utensils'
    ];

    return products.map((name, index) => ({
      productId: `prod_${index + 1}`,
      productName: name,
      category: categories[index % categories.length],
      revenue: Math.floor(Math.random() * 50000) + 5000,
      units: Math.floor(Math.random() * 200) + 10,
      averagePrice: Math.floor(Math.random() * 2000) + 500,
      growth: (Math.random() - 0.5) * 50, // -25% to +25%
      rank: index + 1,
      margin: Math.random() * 30 + 10, // 10% to 40%
      rating: Math.random() * 2 + 3, // 3 to 5 stars
    })).sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'units':
          return b.units - a.units;
        case 'growth':
          return b.growth - a.growth;
        case 'margin':
          return (b.margin || 0) - (a.margin || 0);
        default:
          return b.revenue - a.revenue;
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={cn('flex items-center gap-1', isPositive ? 'text-green-600' : 'text-red-600')}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{growth.toFixed(1)}%
        </span>
      </div>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank <= 3) return <Star className="h-4 w-4 text-blue-500" />;
    if (rank <= 10) return <Package className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  };

  const renderTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Rank</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Avg Price</TableHead>
          <TableHead className="text-right">Growth</TableHead>
          <TableHead className="text-right">Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productData.slice(0, 10).map((product) => (
          <TableRow key={product.productId}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getRankBadge(product.rank)}
                <span className="font-medium">#{product.rank}</span>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{product.productName}</div>
                <div className="text-xs text-muted-foreground">ID: {product.productId}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{product.category}</Badge>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(product.revenue)}
            </TableCell>
            <TableCell className="text-right">{product.units.toLocaleString()}</TableCell>
            <TableCell className="text-right">{formatCurrency(product.averagePrice)}</TableCell>
            <TableCell className="text-right">{formatGrowth(product.growth)}</TableCell>
            <TableCell className="text-right">
              {product.margin ? `${product.margin.toFixed(1)}%` : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderBarChart = () => (
    <ChartContainer config={chartConfig} className="h-[400px]">
      <BarChart data={productData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="productName" 
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
          fontSize={10}
        />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" />
      </BarChart>
    </ChartContainer>
  );

  const renderPieChart = () => {
    const categoryData = productData.reduce((acc, product) => {
      const existing = acc.find(item => item.category === product.category);
      if (existing) {
        existing.revenue += product.revenue;
        existing.units += product.units;
      } else {
        acc.push({
          category: product.category,
          revenue: product.revenue,
          units: product.units,
        });
      }
      return acc;
    }, [] as { category: string; revenue: number; units: number }[]);

    return (
      <ChartContainer config={chartConfig} className="h-[400px]">
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="revenue"
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ChartContainer>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>Loading product data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>
              Top performing products by {sortBy}
              {error && (
                <Badge variant="secondary" className="ml-2">
                  Demo Data
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
            <div className="flex items-center gap-1">
              {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={selectedTimeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Sort By Selector */}
            <div className="flex items-center gap-1">
              {(['revenue', 'units', 'growth', 'margin'] as const).map((sort) => (
                <Button
                  key={sort}
                  variant={sortBy === sort ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy(sort)}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Button>
              ))}
            </div>

            {/* View Type Selector */}
            <div className="flex items-center gap-1">
              {(['table', 'chart', 'pie'] as const).map((view) => (
                <Button
                  key={view}
                  variant={viewType === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewType(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewType === 'table' && renderTable()}
        {viewType === 'chart' && renderBarChart()}
        {viewType === 'pie' && renderPieChart()}
      </CardContent>
    </Card>
  );
}

export default ProductPerformance;