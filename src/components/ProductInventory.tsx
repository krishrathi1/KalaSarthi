'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  Search,
  Filter,
  Eye,
  IndianRupee,
  BarChart3
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  images: string[];
  totalSales?: number;
  totalRevenue?: number;
  unitsSold?: number;
}

interface ProductInventoryProps {
  artisanId?: string;
  onProductClick?: (productId: string) => void;
  className?: string;
}

export function ProductInventory({ 
  artisanId = 'artisan_001', 
  onProductClick,
  className = '' 
}: ProductInventoryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'sales'>('sales');

  useEffect(() => {
    loadProducts();
  }, [artisanId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/inventory?artisanId=${artisanId}`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'sales':
          return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        default:
          return 0;
      }
    });

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Product Inventory
          </h2>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} products • Click to view sales details
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="sales">Sort by Sales</option>
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card 
            key={product.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onProductClick?.(product.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {product.description}
                  </CardDescription>
                </div>
                {product.images && product.images[0] && (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-md ml-2"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Price and Stock */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(product.price)}
                  </div>
                  <Badge variant={product.inStock ? 'default' : 'secondary'}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                </div>

                {/* Sales Stats */}
                {product.totalRevenue !== undefined && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        Revenue
                      </span>
                      <span className="font-medium">{formatCurrency(product.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        Units Sold
                      </span>
                      <span className="font-medium">{product.unitsSold || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Orders
                      </span>
                      <span className="font-medium">{product.totalSales || 0}</span>
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProductClick?.(product.id);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Sales Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

export default ProductInventory;
