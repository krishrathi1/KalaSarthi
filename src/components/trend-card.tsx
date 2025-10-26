"use client";

import React from 'react';
import { Star, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ui/product-image';
import { formatPrice } from '@/lib/format-utils';
import { TrendingProduct, TREND_TYPES } from '@/lib/types/simplified-trend-spotter';

interface TrendCardProps {
  product: TrendingProduct;
  onClick?: (product: TrendingProduct) => void;
  showFullDetails?: boolean;
  className?: string;
  isSimpleMode?: boolean; // For artisan-friendly simple view
}

export function TrendCard({ 
  product, 
  onClick, 
  showFullDetails = false, 
  className = "",
  isSimpleMode = true // Default to simple mode for artisans
}: TrendCardProps) {
  
  const handleClick = () => {
    if (onClick) {
      onClick(product);
    } else {
      // Default behavior: open product link
      window.open(product.url, '_blank');
    }
  };

  const getTrendIcon = (trendType: TrendingProduct['trendType']) => {
    switch (trendType) {
      case 'hot':
        return <TrendingUp className="size-3 text-red-500" />;
      case 'rising':
        return <TrendingUp className="size-3 text-green-500" />;
      case 'cooling':
        return <TrendingDown className="size-3 text-gray-500" />;
      default:
        return <Minus className="size-3 text-blue-500" />;
    }
  };

  const getTrendBadgeColor = (trendType: TrendingProduct['trendType']) => {
    switch (trendType) {
      case 'hot':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'rising':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'seasonal':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'cooling':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const formatRating = (rating: number) => {
    return Math.round(rating * 10) / 10; // Round to 1 decimal place
  };

  if (isSimpleMode) {
    // Simple mode for artisans - large, clear, easy to understand
    return (
      <Card 
        className={`
          p-6 hover:shadow-lg transition-all duration-200 cursor-pointer 
          border-2 hover:border-primary/30 bg-gradient-to-br from-white to-gray-50/30
          focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
          min-h-[280px] sm:min-h-[320px]
          ${className}
        `}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`View ${product.title} on ${product.platform} - ${formatPrice(product.price)} - ${formatRating(product.rating)} stars`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <CardContent className="p-0 space-y-4">
          {/* Product Image - Large and prominent */}
          <div className="w-full h-36 sm:h-40 relative rounded-lg overflow-hidden bg-gray-100">
            <ProductImage
              src={product.imageUrl}
              alt={`${product.title} - trending ${product.category} product`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              className="object-cover"
              fallbackIcon={<TrendingUp className="size-12 text-gray-400" />}
            />
            
            {/* Trend Badge - Top right corner */}
            <div className="absolute top-3 right-3">
              <Badge 
                className={`text-sm font-medium px-3 py-1 ${getTrendBadgeColor(product.trendType)}`}
                aria-label={`Trend status: ${TREND_TYPES[product.trendType]?.label || product.trendType}`}
              >
                {getTrendIcon(product.trendType)}
                <span className="ml-1">{TREND_TYPES[product.trendType]?.label || product.trendType}</span>
              </Badge>
            </div>

            {/* Trend Score - Top left corner */}
            <div className="absolute top-2 left-2">
              <Badge className="bg-white/90 text-gray-800 text-xs font-bold">
                {product.trendScore}
              </Badge>
            </div>
          </div>

          {/* Product Title - Large and readable */}
          <div>
            <h3 
              className="font-semibold text-lg sm:text-xl leading-tight line-clamp-2 text-gray-900"
              title={product.title}
            >
              {product.title}
            </h3>
          </div>

          {/* Price - Very prominent */}
          <div 
            className="text-2xl sm:text-3xl font-bold text-primary"
            aria-label={`Price: ${typeof product.price === 'number' ? formatPrice(product.price) : product.price}`}
          >
            {typeof product.price === 'number' ? formatPrice(product.price) : product.price}
          </div>

          {/* Rating and Platform - Simple row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-full min-h-[36px]"
                aria-label={`Rating: ${formatRating(product.rating)} out of 5 stars`}
              >
                <Star className="size-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-base font-medium text-gray-700">
                  {formatRating(product.rating)}
                </span>
              </div>
              <span 
                className="text-sm text-gray-500"
                aria-label={`${product.reviewCount} customer reviews`}
              >
                ({product.reviewCount} reviews)
              </span>
            </div>
            
            <Badge 
              variant="outline" 
              className="text-sm font-medium px-3 py-1"
              aria-label={`Available on ${product.platform}`}
            >
              {product.platform}
            </Badge>
          </div>

          {/* Trending Reason - Simple explanation */}
          {product.trendingReason && (
            <div 
              className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-200"
              role="note"
              aria-label="Why this product is trending"
            >
              <p className="text-sm sm:text-base text-blue-800 leading-relaxed">
                <span aria-hidden="true">💡 </span>
                {product.trendingReason}
              </p>
            </div>
          )}

          {/* Action Button - Large and clear */}
          <Button 
            className="w-full min-h-[48px] text-base sm:text-lg font-medium bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              window.open(product.url, '_blank');
            }}
            aria-label={`Open ${product.title} product page on ${product.platform} in new tab`}
          >
            <ExternalLink className="size-5 mr-3" aria-hidden="true" />
            View Product
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Compact mode for advanced users
  return (
    <Card 
      className={`
        p-4 hover:shadow-md transition-shadow cursor-pointer 
        border hover:border-primary/50
        ${className}
      `}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex gap-4">
          {/* Product Image - Compact */}
          <div className="w-20 h-20 relative flex-shrink-0 rounded-lg overflow-hidden">
            <ProductImage
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="80px"
              className="object-cover"
              fallbackIcon={<TrendingUp className="size-6 text-muted-foreground" />}
            />
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title and Trend Badge */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                {product.title}
              </h4>
              <Badge className={`text-xs shrink-0 ${getTrendBadgeColor(product.trendType)}`}>
                {getTrendIcon(product.trendType)}
                <span className="ml-1">{product.trendScore}</span>
              </Badge>
            </div>

            {/* Rating and Platform */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                <span>{formatRating(product.rating)}</span>
              </div>
              <span className="text-muted-foreground">({product.reviewCount})</span>
              <Badge variant="outline" className="text-xs">
                {product.platform}
              </Badge>
            </div>

            {/* Price */}
            <div className="text-lg font-bold text-primary">
              {typeof product.price === 'number' ? formatPrice(product.price) : product.price}
            </div>

            {/* Trending Reason - Compact */}
            {showFullDetails && product.trendingReason && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {product.trendingReason}
              </p>
            )}

            {/* Action Button - Compact */}
            <Button 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                window.open(product.url, '_blank');
              }}
            >
              <ExternalLink className="size-3 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export additional components for flexibility
export function TrendCardSkeleton({ isSimpleMode = true }: { isSimpleMode?: boolean }) {
  if (isSimpleMode) {
    return (
      <Card className="p-6">
        <CardContent className="p-0 space-y-4">
          <div className="w-full h-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="flex justify-between">
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid component for displaying multiple trend cards
interface TrendCardGridProps {
  products: TrendingProduct[];
  onProductClick?: (product: TrendingProduct) => void;
  isSimpleMode?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function TrendCardGrid({ 
  products, 
  onProductClick, 
  isSimpleMode = true,
  loading = false,
  emptyMessage = "No trending products available",
  className = ""
}: TrendCardGridProps) {
  
  if (loading) {
    const skeletonCount = isSimpleMode ? 6 : 8;
    return (
      <div 
        className={`
          grid gap-6 sm:gap-8
          ${isSimpleMode 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }
          ${className}
        `}
        role="status"
        aria-label="Loading trending products"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <TrendCardSkeleton key={index} isSimpleMode={isSimpleMode} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div 
        className="text-center py-16"
        role="status"
        aria-label="No trending products found"
      >
        <TrendingUp className="size-16 text-muted-foreground mx-auto mb-6" aria-hidden="true" />
        <h3 className="font-medium text-xl sm:text-2xl mb-4">No Products Found</h3>
        <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`
        grid gap-6 sm:gap-8
        ${isSimpleMode 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }
        ${className}
      `}
      role="grid"
      aria-label={`${products.length} trending products`}
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          role="gridcell"
          aria-posinset={index + 1}
          aria-setsize={products.length}
        >
          <TrendCard
            product={product}
            onClick={onProductClick}
            isSimpleMode={isSimpleMode}
            showFullDetails={!isSimpleMode}
          />
        </div>
      ))}
    </div>
  );
}