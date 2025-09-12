"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, ExternalLink, Eye, ShoppingBag, Search, AlertTriangle, Zap, BarChart3, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatPrice } from "@/lib/format-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ui/product-image";
import { getTopViralProducts, getViralProductsByProfession, getViralAlerts, type ViralProduct } from "@/lib/viral-products";

interface TrendSpotterProduct {
  title: string;
  price: string | number; // Can be string (₹1,234) or number
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  imageUrl: string;
  id: string;
  category?: string;
  description?: string;
}

export function TrendSpotter() {
  const { userProfile, isArtisan } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [products, setProducts] = useState<TrendSpotterProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TrendSpotterProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TrendSpotterProduct[]>([]);
  const [viralAlerts, setViralAlerts] = useState<any[]>([]);
  const [professionRecommendations, setProfessionRecommendations] = useState<TrendSpotterProduct[]>([]);
  const [viralProducts, setViralProducts] = useState<ViralProduct[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const { toast } = useToast();

  // Load trending products, viral alerts, and recommendations on component mount
  useEffect(() => {
    if (userProfile?.uid && isArtisan) {
      loadTrendingProducts();
      loadViralAlerts();
      loadProfessionRecommendations();
      loadViralProducts();
    }
  }, [userProfile, isArtisan]);

  const loadTrendingProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trend-spotter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile?.uid })
      });

      const data = await response.json();

      if (data.success && data.workflow?.globalRankedList && data.workflow.globalRankedList.length > 0) {
        setProducts(data.workflow.globalRankedList.slice(0, 10)); // Show top 10 products
      } else {
        // Use viral products as fallback instead of showing empty state
        const viralProducts = userProfile?.artisticProfession
          ? getViralProductsByProfession(userProfile.artisticProfession)
          : getTopViralProducts(10);

        const fallbackProducts = viralProducts.map(product => ({
          id: product.id,
          title: product.title,
          price: product.price,
          rating: product.rating,
          reviewCount: product.reviewCount,
          platform: product.platform,
          url: product.url,
          imageUrl: product.imageUrl,
          category: product.category,
          description: product.description
        }));

        setProducts(fallbackProducts);
        console.log('✅ Using viral products as fallback:', fallbackProducts.length);
      }
    } catch (error) {
      // Use viral products as fallback even on error
      const viralProducts = userProfile?.artisticProfession
        ? getViralProductsByProfession(userProfile.artisticProfession)
        : getTopViralProducts(10);

      const fallbackProducts = viralProducts.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        rating: product.rating,
        reviewCount: product.reviewCount,
        platform: product.platform,
        url: product.url,
        imageUrl: product.imageUrl,
        category: product.category,
        description: product.description
      }));

      setProducts(fallbackProducts);
      console.log('✅ Using viral products as error fallback:', fallbackProducts.length);
    }
    setLoading(false);
  };

  const handleViewProduct = (product: TrendSpotterProduct) => {
    setSelectedProduct(product);
  };

  const handleRedirectToStore = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter Search Term",
        description: "Please enter a product name to search",
        variant: "destructive",
      });
      return;
    }

    setSearchLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/trend-spotter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, userId: userProfile?.uid })
      });

      const data = await response.json();

      if (data.success && data.products) {
        setSearchResults(data.products);
        setLastUpdated(new Date());
        toast({
          title: "Search Complete",
          description: `Found ${data.products.length} products for "${searchQuery}"`,
        });
      } else {
        setError("No products found for your search");
        toast({
          title: "No Results",
          description: "No products found for your search",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = "Failed to search products";
      setError(errorMessage);
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setSearchLoading(false);
  };

  const loadViralAlerts = async () => {
    try {
      // Use real viral alerts data instead of API
      const alerts = getViralAlerts();
      setViralAlerts(alerts);
    } catch (error) {
      console.error('Failed to load viral alerts:', error);
    }
  };

  const loadViralProducts = async () => {
    try {
      // Load viral products based on profession
      const viralProducts = userProfile?.artisticProfession
        ? getViralProductsByProfession(userProfile.artisticProfession)
        : getTopViralProducts(10);

      setViralProducts(viralProducts);
    } catch (error) {
      console.error('Failed to load viral products:', error);
    }
  };

  const loadProfessionRecommendations = async () => {
    try {
      // Always use viral products as recommendations
      const viralProducts = userProfile?.artisticProfession
        ? getViralProductsByProfession(userProfile.artisticProfession)
        : getTopViralProducts(8);

      // Convert viral products to trend spotter format
      const recommendations = viralProducts.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        rating: product.rating,
        reviewCount: product.reviewCount,
        platform: product.platform,
        url: product.url,
        imageUrl: product.imageUrl,
        category: product.category,
        description: product.description,
        isViral: product.isViral,
        viralScore: product.viralScore,
        trendingReason: product.trendingReason
      }));

      setProfessionRecommendations(recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch('/api/trend-spotter/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.uid,
          profession: userProfile?.artisticProfession,
          timeframe: '7d'
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
        toast({
          title: "Analytics Updated",
          description: "Latest trend analytics loaded successfully",
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load trend analytics",
        variant: "destructive",
      });
    }
    setAnalyticsLoading(false);
  };

  if (!isArtisan) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <TrendingUp className="size-6 text-primary" />
            Trend Spotter
          </CardTitle>
          <CardDescription>
            Discover trending products in your craft category. Complete your artisan profile to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-lg border-0 bg-gradient-to-br from-card via-card to-card/95">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="size-6 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-xl">
              Trend Spotter
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Trending products in your craft category
            </p>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          Discover what's popular in {userProfile?.artisticProfession} and get inspired for your next creation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Analytics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <h3 className="font-semibold text-lg">Trend Analytics</h3>
            </div>
            <Button
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              variant="outline"
              size="sm"
            >
              {analyticsLoading ? "Loading..." : "Refresh Analytics"}
            </Button>
          </div>

          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="size-4 text-green-500" />
                  <span className="text-sm font-medium">Trending Up</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{analytics.summary.trendingUp}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="size-4 text-red-500" />
                  <span className="text-sm font-medium">Trending Down</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{analytics.summary.trendingDown}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="size-4 text-gray-500" />
                  <span className="text-sm font-medium">Stable</span>
                </div>
                <div className="text-2xl font-bold text-gray-600">{analytics.summary.stable}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </Card>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for any product (e.g., 'handmade bags', 'wooden toys')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searchLoading || loading}>
              <Search className="size-4 mr-2" />
              {searchLoading ? "Searching..." : "Search"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Search for specific products to see their trends, sales, reviews, and ratings across different ecommerce platforms
          </p>
        </div>

        {/* Viral Alerts */}
        {viralAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-orange-500" />
              <h3 className="font-semibold text-lg">Viral Alerts</h3>
            </div>
            <div className="space-y-2">
              {viralAlerts.map((alert, index) => (
                <Card key={index} className="p-4 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3">
                    <Zap className="size-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{alert.platform}</Badge>
                        <span className="text-xs text-muted-foreground">{alert.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Search Results</h3>
              <Badge variant="secondary">{searchResults.length} products found</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 64px, 64px"
                        fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        {typeof product.price === 'string' ? product.price : `₹${product.price.toLocaleString()}`}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}
                      <Button size="sm" onClick={() => handleRedirectToStore(product.url)} className="w-full">
                        <ExternalLink className="size-3 mr-1" />
                        View on {product.platform}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Profession-Based Recommendations */}
        {professionRecommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Viral Products for {userProfile?.artisticProfession}</h3>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                🔥 {professionRecommendations.length} Viral Products
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professionRecommendations.map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 64px, 64px"
                        fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        {typeof product.price === 'string' ? product.price : `₹${product.price.toLocaleString()}`}
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="size-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>{product.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="w-full h-48 relative rounded-lg overflow-hidden">
                                <ProductImage
                                  src={product.imageUrl}
                                  alt={product.title}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 400px"
                                  fallbackIcon={<ShoppingBag className="size-12 text-muted-foreground" />}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm text-muted-foreground">Price</div>
                                  <div className="text-lg font-bold">
                                    {typeof product.price === 'string' ? product.price : `₹${product.price.toLocaleString()}`}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">Rating</div>
                                  <div className="flex items-center gap-1">
                                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{product.rating}</span>
                                    <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Platform</div>
                                <Badge>{product.platform}</Badge>
                              </div>
                              {product.description && (
                                <div className="col-span-2">
                                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                                  <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                                </div>
                              )}
                              <Button onClick={() => handleRedirectToStore(product.url)} className="w-full">
                                <ExternalLink className="size-4 mr-2" />
                                View on {product.platform}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" onClick={() => handleRedirectToStore(product.url)} className="flex-1">
                          <ExternalLink className="size-3 mr-1" />
                          Visit Store
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                <TrendingUp className="size-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Finding trending products...</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-16 h-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Trending Products</h3>
              <Badge variant="secondary">{products.length} products found</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 64px, 64px"
                        fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {product.title}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.platform}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        {typeof product.price === 'string' ? product.price : `₹${product.price.toLocaleString()}`}
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              className="flex-1"
                            >
                              <Eye className="size-3 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>{product.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="w-full h-48 relative rounded-lg overflow-hidden">
                                <ProductImage
                                  src={product.imageUrl}
                                  alt={product.title}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 400px"
                                  fallbackIcon={<ShoppingBag className="size-12 text-muted-foreground" />}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm text-muted-foreground">Price</div>
                                  <div className="text-lg font-bold">
                                    {typeof product.price === 'string' ? product.price : `₹${product.price.toLocaleString()}`}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">Rating</div>
                                  <div className="flex items-center gap-1">
                                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-medium">{product.rating}</span>
                                    <span className="text-sm text-muted-foreground">
                                      ({product.reviewCount})
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Platform</div>
                                <Badge>{product.platform}</Badge>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Category</div>
                                <Badge variant="outline">{product.category || 'General'}</Badge>
                              </div>

                              <Button
                                onClick={() => handleRedirectToStore(product.url)}
                                className="w-full"
                              >
                                <ExternalLink className="size-4 mr-2" />
                                View on {product.platform}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          onClick={() => handleRedirectToStore(product.url)}
                          className="flex-1"
                        >
                          <ExternalLink className="size-3 mr-1" />
                          Visit Store
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Viral Products</h3>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                🔥 Trending Now
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viralProducts.slice(0, 8).map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-red-100">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 relative flex-shrink-0 rounded-lg overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 64px, 64px"
                        fallbackIcon={<ShoppingBag className="size-6 text-muted-foreground" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                        <Badge variant="destructive" className="text-xs">
                          🔥 Viral
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        {product.price}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {product.trendingReason}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRedirectToStore(product.url)}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          <ExternalLink className="size-3 mr-1" />
                          View Viral Product
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-center">
              <Button onClick={loadTrendingProducts} disabled={loading} variant="outline">
                <TrendingUp className="size-4 mr-2" />
                Refresh Trends
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}