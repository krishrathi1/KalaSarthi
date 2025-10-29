'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  IndianRupee,
  BarChart3,
  Link as LinkIcon
} from 'lucide-react';

interface ProductSalesDetailProps {
  productId: string;
  artisanId?: string;
  onBack?: () => void;
  className?: string;
}

interface ProductSale {
  id: string;
  buyerName: string;
  quantity: number;
  totalAmount: number;
  timestamp: Date;
  paymentStatus: string;
  bundledWith?: string[]; // Other products in the same order
}

interface BundleAnalysis {
  productId: string;
  productName: string;
  timesOrderedTogether: number;
  totalRevenue: number;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  totalRevenue: number;
  totalSales: number;
  unitsSold: number;
  averageOrderValue: number;
  sales: ProductSale[];
  bundleAnalysis: BundleAnalysis[];
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    units: number;
  }>;
}

export function ProductSalesDetail({ 
  productId, 
  artisanId = 'artisan_001',
  onBack,
  className = '' 
}: ProductSalesDetailProps) {
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductDetail();
  }, [productId, artisanId]);

  const loadProductDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/products/sales-detail?productId=${productId}&artisanId=${artisanId}`
      );
      const result = await response.json();

      if (result.success) {
        setProductDetail(result.data);
      } else {
        setError(result.error || 'Failed to load product details');
      }
    } catch (err: any) {
      console.error('Error loading product detail:', err);
      setError(err.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !productDetail) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Product not found'}</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{productDetail.name}</h2>
          <p className="text-muted-foreground">{productDetail.description}</p>
        </div>
        {productDetail.images && productDetail.images[0] && (
          <img 
            src={productDetail.images[0]} 
            alt={productDetail.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(productDetail.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {productDetail.totalSales} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productDetail.unitsSold}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(productDetail.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(productDetail.price)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="bundles">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Sales History Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>All transactions for this product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productDetail.sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{sale.buyerName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sale.quantity} unit{sale.quantity > 1 ? 's' : ''} • {formatDate(sale.timestamp)}
                      </p>
                      {sale.bundledWith && sale.bundledWith.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <LinkIcon className="h-3 w-3 text-blue-600" />
                          <p className="text-xs text-blue-600">
                            Ordered with {sale.bundledWith.length} other product{sale.bundledWith.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(sale.totalAmount)}</p>
                      <Badge
                        variant={sale.paymentStatus === 'completed' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {sale.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundle Analysis Tab */}
        <TabsContent value="bundles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Bought Together</CardTitle>
              <CardDescription>
                Products that customers often purchase with {productDetail.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productDetail.bundleAnalysis.length > 0 ? (
                <div className="space-y-3">
                  {productDetail.bundleAnalysis.map((bundle, index) => (
                    <div key={bundle.productId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{bundle.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            Ordered together {bundle.timesOrderedTogether} time{bundle.timesOrderedTogether > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(bundle.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">Bundle revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    This product hasn't been ordered with other products yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {productDetail.bundleAnalysis.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Bundle Opportunity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800">
                  💡 Consider creating a bundle offer with the top products to increase sales!
                  Customers who buy {productDetail.name} often purchase these items together.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Monthly performance for this product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productDetail.monthlyTrend.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.month}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.units} units</span>
                      <span className="font-bold">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProductSalesDetail;
