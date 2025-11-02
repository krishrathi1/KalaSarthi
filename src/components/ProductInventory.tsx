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
    <div className={`space-y-6 w-full ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-blue-900">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">Product Inventory</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} • Click to view sales details
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-blue-200 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-blue-200 rounded-md text-sm bg-white/80 backdrop-blur-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
            className="flex-1 sm:flex-none px-3 py-2 border border-blue-200 rounded-md text-sm bg-white/80 backdrop-blur-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="sales">Sort by Sales</option>
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
        {filteredProducts.map((product) => (
          <Card 
            key={product.id} 
            className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-white/80 backdrop-blur-sm border-blue-100 overflow-hidden group"
            onClick={() => onProductClick?.(product.id)}
          >
            <CardHeader className="pb-3 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1.5 text-xs sm:text-sm">
                    {product.description}
                  </CardDescription>
                </div>
                {product.images && product.images[0] && (
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 border-blue-100 group-hover:border-blue-300 transition-colors">
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                {/* Price and Stock */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatCurrency(product.price)}
                  </div>
                  <Badge 
                    variant={product.inStock ? 'default' : 'secondary'}
                    className={product.inStock ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                    {product.category}
                  </Badge>
                </div>

                {/* Sales Stats */}
                {product.totalRevenue !== undefined && (
                  <div className="pt-3 border-t border-blue-100 space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <IndianRupee className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Revenue</span>
                      </span>
                      <span className="font-medium text-blue-600 truncate ml-2">{formatCurrency(product.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShoppingCart className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Units Sold</span>
                      </span>
                      <span className="font-medium truncate ml-2">{product.unitsSold || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <BarChart3 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Orders</span>
                      </span>
                      <span className="font-medium truncate ml-2">{product.totalSales || 0}</span>
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3 border-blue-200 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent transition-all"
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
        <div className="bg-white/80 backdrop-blur-sm border border-blue-100 rounded-xl p-8 sm:p-12 text-center shadow-sm">
          <Package className="h-16 w-16 sm:h-20 sm:w-20 text-blue-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-2">No products found</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

export default ProductInventory;
