"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, TrendingUp, Star, Users, ShoppingCart, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { formatPrice } from "@/lib/format-utils";

interface ProductStats {
  title: string;
  price: string;
  rating: string;
  reviews: number;
  platform: string;
  url: string;
  imageUrl?: string;
  category?: string;
}

interface AggregatedStats {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalReviews: number;
  averageRating: number;
  platforms: string[];
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
}

interface ProductStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductStats | null;
  similarProducts?: ProductStats[];
}

export function ProductStatsModal({ isOpen, onClose, product, similarProducts = [] }: ProductStatsModalProps) {
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);

  useEffect(() => {
    if (product && similarProducts.length > 0) {
      // Calculate aggregated statistics
      const allProducts = [product, ...similarProducts];
      const prices = allProducts.map(p => parseFloat(p.price.replace(/[^\d.]/g, '')) || 0);
      const ratings = allProducts.map(p => parseFloat(p.rating) || 0);
      const reviews = allProducts.map(p => p.reviews || 0);

      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const totalReviews = reviews.reduce((a, b) => a + b, 0);
      const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const platforms = [...new Set(allProducts.map(p => p.platform))];

      setAggregatedStats({
        averagePrice,
        minPrice,
        maxPrice,
        totalReviews,
        averageRating,
        platforms,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          average: averagePrice
        }
      });
    } else if (product) {
      // Single product stats
      const price = parseFloat(product.price.replace(/[^\d.]/g, '')) || 0;
      setAggregatedStats({
        averagePrice: price,
        minPrice: price,
        maxPrice: price,
        totalReviews: product.reviews || 0,
        averageRating: parseFloat(product.rating) || 0,
        platforms: [product.platform],
        priceRange: {
          min: price,
          max: price,
          average: price
        }
      });
    }
  }, [product, similarProducts]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="size-5 text-primary" />
            Product Statistics & Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Product Display */}
          <div className="flex gap-6">
            <div className="w-48 h-48 relative flex-shrink-0 rounded-xl overflow-hidden bg-muted">
              {product.imageUrl && product.imageUrl.trim() !== '' ? (
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center';
                      fallback.innerHTML = '<span class="text-4xl opacity-60">🖼️</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                  unoptimized={true} // Allow external images
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl opacity-60">🖼️</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
                  {product.title}
                </h2>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-sm">
                    {product.platform}
                  </Badge>
                  {product.category && (
                    <Badge variant="secondary" className="text-sm">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-lg">{product.rating}</span>
                    <span className="text-muted-foreground">({product.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-4 text-green-600" />
                    <span className="font-bold text-2xl text-primary rupee-symbol">{product.price}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button asChild className="gap-2">
                    <a 
                      href={product.url && product.url.trim() !== '' ? product.url : '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!product.url || product.url.trim() === '') {
                          e.preventDefault();
                          alert('Product link not available');
                        }
                      }}
                    >
                      <ExternalLink className="size-4" />
                      View on {product.platform}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregated Statistics */}
          {aggregatedStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="size-5 text-primary" />
                    Price Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {formatPrice(aggregatedStats.averagePrice)}
                    </div>
                    <p className="text-sm text-muted-foreground">Average Price</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Price Range:</span>
                      <span className="font-medium">
                        {formatPrice(aggregatedStats.minPrice)} - {formatPrice(aggregatedStats.maxPrice)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Min Price:</span>
                        <span className="font-medium text-green-600">
                          {formatPrice(aggregatedStats.minPrice)}
                        </span>
                      </div>
                      <Progress
                        value={(aggregatedStats.averagePrice - aggregatedStats.minPrice) /
                               (aggregatedStats.maxPrice - aggregatedStats.minPrice) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm">
                        <span>Max Price:</span>
                        <span className="font-medium text-red-600">
                          {formatPrice(aggregatedStats.maxPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="size-5 text-primary" />
                    Customer Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {aggregatedStats.averageRating.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Reviews:</span>
                      <span className="font-medium">{aggregatedStats.totalReviews.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Platforms:</span>
                      <div className="flex gap-1">
                        {aggregatedStats.platforms.map(platform => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {aggregatedStats.averageRating >= 4.5
                          ? "🌟 Excellent product with outstanding customer satisfaction!"
                          : aggregatedStats.averageRating >= 4.0
                          ? "👍 Well-received product with good customer feedback"
                          : aggregatedStats.averageRating >= 3.5
                          ? "👌 Decent product with mixed customer reviews"
                          : "⚠️ Product has room for improvement based on customer feedback"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Products from Other Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similarProducts.slice(0, 4).map((similarProduct, index) => (
                    <div key={index} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                              <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {similarProduct.imageUrl && similarProduct.imageUrl.trim() !== '' ? (
                            <Image
                              src={similarProduct.imageUrl}
                              alt={similarProduct.title}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center';
                                  fallback.innerHTML = '<span class="text-2xl opacity-60">🖼️</span>';
                                  parent.appendChild(fallback);
                                }
                              }}
                              unoptimized={true} // Allow external images
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <span className="text-2xl opacity-60">🖼️</span>
                            </div>
                          )}
                        </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">
                          {similarProduct.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {similarProduct.platform}
                            </Badge>
                            <span className="text-sm font-medium text-primary">
                              {similarProduct.price}
                            </span>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a 
                              href={similarProduct.url && similarProduct.url.trim() !== '' ? similarProduct.url : '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!similarProduct.url || similarProduct.url.trim() === '') {
                                  e.preventDefault();
                                  alert('Product link not available');
                                }
                              }}
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {aggregatedStats ? Math.round((aggregatedStats.averagePrice - aggregatedStats.minPrice) / aggregatedStats.averagePrice * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Potential Savings</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {aggregatedStats?.platforms.length || 1}
                  </div>
                  <p className="text-sm text-muted-foreground">Available Platforms</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {aggregatedStats?.totalReviews ? Math.round(aggregatedStats.totalReviews / (aggregatedStats.platforms.length || 1)) : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Reviews per Platform</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}