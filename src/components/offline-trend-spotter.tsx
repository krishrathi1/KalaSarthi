"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, ExternalLink, Eye, ShoppingBag, Search, AlertTriangle, Zap, BarChart3, TrendingDown, Minus, WifiOff, Clock } from "lucide-react";
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
import { useOffline } from "@/hooks/use-offline";

interface TrendSpotterProduct {
  title: string;
  price: string | number;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  imageUrl: string;
  id: string;
  category?: string;
  description?: string;
  timestamp?: number;
  isOffline?: boolean;
}

export function OfflineTrendSpotter() {
  const { userProfile, isArtisan } = useAuth();
  const { isOnline, storeOffline, getOfflineData, isDataStale, sync } = useOffline();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [products, setProducts] = useState<TrendSpotterProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TrendSpotterProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TrendSpotterProduct[]>([]);
  const [viralAlerts, setViralAlerts] = useState<any[]>([]);
  const [professionRecommendations, setProfessionRecommendations] = useState<TrendSpotterProduct[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    if (userProfile?.uid && isArtisan) {
      loadTrendingProducts();
      loadViralAlerts();
      loadProfessionRecommendations();
    }
  }, [userProfile, isArtisan]);

  const loadTrendingProducts = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Try to fetch fresh data online
        const response = await fetch(`/api/trend-spotter?t=${Date.now()}&r=${Math.random()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({
            userId: userProfile?.uid,
            forceRefresh: true,
            timestamp: Date.now(),
            random: Math.random()
          })
        });

        const data = await response.json();
        
        if (data.success && data.workflow?.globalRankedList) {
          const freshProducts = data.workflow.globalRankedList.slice(0, 10).map((product: any) => ({
            ...product,
            timestamp: Date.now(),
            isOffline: false
          }));
          
          setProducts(freshProducts);
          setLastUpdated(new Date());
          
          // Store fresh data offline
          await storeOffline('trend', {
            products: freshProducts,
            timestamp: Date.now(),
            type: 'trending_products'
          });
          
          console.log('✅ Fresh products loaded and cached');
        } else {
          throw new Error('No fresh data available');
        }
      } else {
        // Load cached data when offline
        const cachedData = await getOfflineData('trend');
        const trendingData = cachedData.find((item: any) => item.type === 'trending_products');
        
        if (trendingData && !isDataStale(trendingData.timestamp, 60)) { // 1 hour cache
          setProducts(trendingData.products);
          setLastUpdated(new Date(trendingData.timestamp));
          console.log('✅ Cached products loaded (offline)');
        } else {
          // Show fallback data or empty state
          setProducts([]);
          console.log('❌ No cached data available');
        }
      }
    } catch (error) {
      console.error('Failed to load trending products:', error);
      
      // Try to load cached data as fallback
      try {
        const cachedData = await getOfflineData('trend');
        const trendingData = cachedData.find((item: any) => item.type === 'trending_products');
        
        if (trendingData) {
          setProducts(trendingData.products);
          setLastUpdated(new Date(trendingData.timestamp));
          console.log('✅ Fallback to cached data');
        } else {
          setProducts([]);
        }
      } catch (cacheError) {
        console.error('Failed to load cached data:', cacheError);
        setProducts([]);
      }
      
      if (isOnline) {
        toast({
          title: "Connection Error",
          description: "Using cached data. Some features may be limited.",
          variant: "destructive",
        });
      }
    }
    setLoading(false);
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
      if (isOnline) {
        const response = await fetch('/api/trend-spotter/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, userId: userProfile?.uid })
        });

        const data = await response.json();

        if (data.success && data.products) {
          const searchProducts = data.products.map((product: any) => ({
            ...product,
            timestamp: Date.now(),
            isOffline: false
          }));
          
          setSearchResults(searchProducts);
          setLastUpdated(new Date());
          
          // Cache search results
          await storeOffline('trend', {
            products: searchProducts,
            timestamp: Date.now(),
            type: 'search_results',
            query: searchQuery
          });
        } else {
          throw new Error('No search results');
        }
      } else {
        // Search cached data when offline
        const cachedData = await getOfflineData('trend');
        const searchData = cachedData.find((item: any) => 
          item.type === 'search_results' && 
          item.query?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (searchData && !isDataStale(searchData.timestamp, 30)) { // 30 min cache
          setSearchResults(searchData.products);
          setLastUpdated(new Date(searchData.timestamp));
        } else {
          setError("No cached search results found. Please connect to internet for fresh results.");
        }
      }
    } catch (error) {
      const errorMessage = isOnline ? "Failed to search products" : "No cached search results found";
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
      if (isOnline) {
        const response = await fetch('/api/trend-spotter/viral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userProfile?.uid, profession: userProfile?.artisticProfession })
        });

        const data = await response.json();
        if (data.success) {
          setViralAlerts(data.alerts || []);
          // Cache viral alerts
          await storeOffline('trend', {
            alerts: data.alerts || [],
            timestamp: Date.now(),
            type: 'viral_alerts'
          });
        }
      } else {
        // Load cached viral alerts
        const cachedData = await getOfflineData('trend');
        const viralData = cachedData.find((item: any) => item.type === 'viral_alerts');
        if (viralData && !isDataStale(viralData.timestamp, 120)) { // 2 hour cache
          setViralAlerts(viralData.alerts || []);
        }
      }
    } catch (error) {
      console.error('Failed to load viral alerts:', error);
    }
  };

  const loadProfessionRecommendations = async () => {
    try {
      if (isOnline) {
        const response = await fetch(`/api/trend-spotter/recommendations?t=${Date.now()}&r=${Math.random()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({
            userId: userProfile?.uid,
            profession: userProfile?.artisticProfession,
            timestamp: Date.now(),
            random: Math.random()
          })
        });

        const data = await response.json();
        
        if (data.success) {
          const recommendations = (data.recommendations || []).map((product: any) => ({
            ...product,
            timestamp: Date.now(),
            isOffline: false
          }));
          
          setProfessionRecommendations(recommendations);
          
          // Cache recommendations
          await storeOffline('trend', {
            recommendations,
            timestamp: Date.now(),
            type: 'profession_recommendations'
          });
        }
      } else {
        // Load cached recommendations
        const cachedData = await getOfflineData('trend');
        const recData = cachedData.find((item: any) => item.type === 'profession_recommendations');
        if (recData && !isDataStale(recData.timestamp, 120)) { // 2 hour cache
          setProfessionRecommendations(recData.recommendations || []);
        }
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleViewProduct = (product: TrendSpotterProduct) => {
    setSelectedProduct(product);
  };

  const handleRedirectToStore = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: "No Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sync();
      await loadTrendingProducts();
      await loadViralAlerts();
      await loadProfessionRecommendations();
      
      toast({
        title: "Sync Complete",
        description: "All data has been synchronized successfully.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize data. Please try again.",
        variant: "destructive",
      });
    }
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
              {!isOnline && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  <WifiOff className="size-3 mr-1" />
                  Offline
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Trending products in your craft category
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  <Clock className="size-3 inline mr-1" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          Discover what's popular in {userProfile?.artisticProfession} and get inspired for your next creation.
          {!isOnline && (
            <span className="block mt-2 text-yellow-600 font-medium">
              ⚠️ Working offline with cached data. Some features may be limited.
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Offline Status and Sync Controls */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <WifiOff className="size-4" />
                <span className="text-sm font-medium">Offline Mode</span>
              </div>
            )}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {isOnline && (
            <Button
              onClick={handleSync}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <TrendingUp className="size-3 mr-1" />
              Refresh Data
            </Button>
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
              disabled={!isOnline && searchResults.length === 0}
            />
            <Button 
              onClick={handleSearch} 
              disabled={searchLoading || loading || (!isOnline && searchResults.length === 0)}
            >
              <Search className="size-4 mr-2" />
              {searchLoading ? "Searching..." : "Search"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOnline 
              ? "Search for specific products to see their trends, sales, reviews, and ratings across different ecommerce platforms"
              : "Search is limited to cached results when offline. Connect to internet for fresh search results."
            }
          </p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Rest of the component remains the same as original TrendSpotter */}
        {/* ... (keeping the existing product display logic) ... */}
        
        {loading ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                <TrendingUp className="size-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  {isOnline ? "Finding trending products..." : "Loading cached data..."}
                </span>
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
              <h3 className="font-semibold text-lg">
                Trending Products
                {!isOnline && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Cached
                  </Badge>
                )}
              </h3>
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
                        {product.isOffline && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="size-3 mr-1" />
                            Cached
                          </Badge>
                        )}
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
          <div className="text-center py-12">
            <TrendingUp className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No trending products found</h3>
            <p className="text-muted-foreground mb-4">
              {isOnline 
                ? "We couldn't find trending products for your profession right now."
                : "No cached data available. Connect to internet to load fresh data."
              }
            </p>
            <Button onClick={loadTrendingProducts} disabled={loading}>
              {isOnline ? "Try Again" : "Connect to Internet"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
