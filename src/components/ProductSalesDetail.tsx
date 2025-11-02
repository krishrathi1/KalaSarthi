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
    <div className={`space-y-6 w-full ${className}`}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="border-blue-200 hover:bg-blue-50 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900 truncate">{productDetail.name}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{productDetail.description}</p>
          </div>
          {productDetail.images && productDetail.images[0] && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-blue-200 shadow-md">
              <img 
                src={productDetail.images[0]} 
                alt={productDetail.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900 truncate">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-blue-900 truncate">{formatCurrency(productDetail.totalRevenue)}</div>
            <p className="text-xs text-blue-700 mt-1 truncate">
              From {productDetail.totalSales} orders
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-900 truncate">Units Sold</CardTitle>
            <Package className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-purple-900">{productDetail.unitsSold}</div>
            <p className="text-xs text-purple-700 mt-1 truncate">
              Total units
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-900 truncate">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-900 truncate">{formatCurrency(productDetail.averageOrderValue)}</div>
            <p className="text-xs text-green-700 mt-1 truncate">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 min-w-0 col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-orange-900 truncate">Unit Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-orange-900 truncate">{formatCurrency(productDetail.price)}</div>
            <p className="text-xs text-orange-700 mt-1 truncate">
              Current price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4 w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-[400px] bg-white/80 backdrop-blur-sm border shadow-sm">
            <TabsTrigger value="sales" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Sales History
            </TabsTrigger>
            <TabsTrigger value="bundles" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Bundle Analysis
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Trends
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sales History Tab */}
        <TabsContent value="sales" className="space-y-4 w-full">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 shadow-sm">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-blue-900">Recent Sales</CardTitle>
              <CardDescription className="text-xs sm:text-sm">All transactions for this product</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 w-full">
                {productDetail.sales.map((sale) => (
                  <div key={sale.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <p className="font-medium text-sm sm:text-base truncate">{sale.buyerName}</p>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {sale.quantity} unit{sale.quantity > 1 ? 's' : ''} • {formatDate(sale.timestamp)}
                      </p>
                      {sale.bundledWith && sale.bundledWith.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <LinkIcon className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <p className="text-xs text-blue-600">
                            Ordered with {sale.bundledWith.length} other product{sale.bundledWith.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                      <p className="font-bold text-base sm:text-lg text-blue-900">{formatCurrency(sale.totalAmount)}</p>
                      <Badge
                        variant={sale.paymentStatus === 'completed' ? 'default' : 'secondary'}
                        className={`mt-1 ${sale.paymentStatus === 'completed' ? 'bg-green-500' : ''}`}
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
        <TabsContent value="bundles" className="space-y-4 w-full">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 shadow-sm">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-blue-900">Frequently Bought Together</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Products that customers often purchase with {productDetail.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {productDetail.bundleAnalysis.length > 0 ? (
                <div className="space-y-3 w-full">
                  {productDetail.bundleAnalysis.map((bundle, index) => (
                    <div key={bundle.productId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm sm:text-base flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{bundle.productName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Ordered together {bundle.timesOrderedTogether} time{bundle.timesOrderedTogether > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
                        <p className="font-bold text-base sm:text-lg text-blue-900">{formatCurrency(bundle.totalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">Bundle revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <LinkIcon className="h-12 w-12 sm:h-16 sm:w-16 text-blue-300 mx-auto mb-3" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    This product hasn't been ordered with other products yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {productDetail.bundleAnalysis.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg text-blue-900 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">💡</span>
                  Bundle Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
                  Consider creating a bundle offer with the top products to increase sales!
                  Customers who buy {productDetail.name} often purchase these items together.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4 w-full">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 shadow-sm">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-blue-900">Sales Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Monthly performance for this product</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4 w-full">
                {productDetail.monthlyTrend.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">{item.month}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{item.units} units</span>
                      <span className="font-bold text-base sm:text-lg text-blue-900 whitespace-nowrap">{formatCurrency(item.revenue)}</span>
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
