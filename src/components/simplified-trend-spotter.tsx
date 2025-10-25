"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, ExternalLink, WifiOff, Clock, Zap, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { formatPrice } from "@/lib/format-utils";
import { TrendCardGrid } from "@/components/trend-card";
import { ProfessionSelector, QuickProfessionSelector } from "@/components/profession-selector";
import { MarketInsights } from "@/components/market-insights";
import { DataSourceIndicator } from "@/components/ui/data-source-indicator";

// Import types from centralized type definitions
import {
  TrendingProduct,
  MarketInsight,
  ConnectivityStatus,
  ProfessionCategory,
  TREND_TYPES,
  PROFESSION_CATEGORIES,
  DEFAULT_PRICE_RANGES
} from '@/lib/types/simplified-trend-spotter';

export function SimplifiedTrendSpotter() {
  const { userProfile, isArtisan } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [connectivityStatus, setConnectivityStatus] = useState<ConnectivityStatus>({
    isOnline: navigator.onLine,
    lastUpdated: new Date(),
    dataSource: 'mock'
  });
  const [userProfession, setUserProfession] = useState<ProfessionCategory>('handmade');
  const { toast } = useToast();

  // Helper function to map user profession to our ProfessionCategory type
  const mapToProfessionCategory = (profession: string): ProfessionCategory => {
    const professionLower = profession.toLowerCase();
    
    // Direct matches
    if (professionLower in PROFESSION_CATEGORIES) {
      return professionLower as ProfessionCategory;
    }
    
    // Fuzzy matching for common variations
    const mappings: Record<string, ProfessionCategory> = {
      'potter': 'pottery',
      'ceramic artist': 'ceramics',
      'wood worker': 'woodworking',
      'carpenter': 'woodworking',
      'jeweler': 'jewelry',
      'jewelry maker': 'jewelry',
      'textile artist': 'textiles',
      'weaver': 'weaving',
      'metal worker': 'metalwork',
      'glass artist': 'glasswork',
      'leather worker': 'leatherwork',
      'painter': 'painting',
      'sculptor': 'sculpture',
      'embroiderer': 'embroidery',
      'craft maker': 'crafts',
      'artisan': 'handmade'
    };
    
    return mappings[professionLower] || 'handmade';
  };

  // Detect connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      setConnectivityStatus(prev => ({ ...prev, isOnline: true }));
      loadTrendingData(); // Refresh data when coming online
    };

    const handleOffline = () => {
      setConnectivityStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user profession
  useEffect(() => {
    if (userProfile?.artisticProfession) {
      // Map the user's profession to our ProfessionCategory type
      const mappedProfession = mapToProfessionCategory(userProfile.artisticProfession);
      setUserProfession(mappedProfession);
    } else {
      // Fallback to localStorage for non-authenticated users
      const savedProfession = (localStorage.getItem('userProfession') as ProfessionCategory) || 'handmade';
      setUserProfession(savedProfession);
    }
  }, [userProfile]);

  // Load trending data when component mounts or profession changes
  useEffect(() => {
    if (userProfession) {
      // Add a small delay to show loading state
      const timer = setTimeout(() => {
        loadTrendingData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userProfession]);

  const loadTrendingData = async () => {
    setLoading(true);
    
    try {
      // Use the new API service with fallback
      const { trendAPI } = await import('@/lib/services/simplified-trend-api');
      
      // Clear cache to ensure fresh data with updated URLs
      trendAPI.clearCache();
      
      const response = await trendAPI.getTrendingData(userProfession, {
        maxProducts: 6,
        includeInsights: true,
        forceRefresh: true // Force refresh to get updated URLs
      });

      if (response.success) {
        setTrendingProducts(response.data.products);
        setMarketInsights(response.data.insights);
        
        const newStatus: ConnectivityStatus = {
          isOnline: navigator.onLine,
          lastUpdated: response.data.metadata.lastUpdated,
          dataSource: response.data.metadata.dataSource
        };
        setConnectivityStatus(newStatus);

        toast({
          title: newStatus.dataSource === 'api' ? "Live Data Updated" : 
                 newStatus.dataSource === 'cache' ? "Cached Data Loaded" : "Offline Mode",
          description: newStatus.dataSource === 'api' 
            ? "Latest trending products loaded successfully!"
            : newStatus.dataSource === 'cache'
            ? "Using cached data for faster loading"
            : "Showing offline data. Connect to internet for live updates.",
          duration: 2000,
        });
      } else {
        throw new Error('Failed to load trending data');
      }

    } catch (error) {
      console.error('Failed to load trending data:', error);
      toast({
        title: "Error",
        description: "Failed to load trending data. Please try again.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleProductClick = (product: TrendingProduct) => {
    // Open product link in new tab
    window.open(product.url, '_blank');
    
    // Track engagement if needed
    console.log('Product clicked:', product.title);
  };



  // Show products to all users, but with different messaging for non-artisans

  return (
    <Card 
      className="h-full shadow-lg border-0 bg-gradient-to-br from-card via-card to-card/95"
      role="main"
      aria-label="Trend Spotter Dashboard"
    >
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10" aria-hidden="true">
            <TrendingUp className="size-7 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle 
              className="font-headline text-xl sm:text-2xl"
              id="trend-spotter-title"
            >
              Trend Spotter
              <Badge 
                className="ml-2 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1"
                aria-label={`Current profession: ${userProfession}`}
              >
                {userProfession}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <DataSourceIndicator 
                source={connectivityStatus.dataSource}
                className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-full"
              />
              <div 
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-label={`Last updated at ${connectivityStatus.lastUpdated.toLocaleTimeString()}`}
              >
                <Clock className="size-4" aria-hidden="true" />
                <span>Updated {connectivityStatus.lastUpdated.toLocaleTimeString()}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadTrendingData();
                }}
                disabled={loading}
                className="min-h-[44px] px-3 py-2 text-sm"
                aria-label="Refresh trending data"
              >
                <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
        <CardDescription className="text-base sm:text-lg leading-relaxed mt-4">
          <p className="mb-3">
            {isArtisan 
              ? `Discover trending products in ${userProfession} and get inspired for your next creation.`
              : `Explore trending handmade products and discover what's popular in the artisan marketplace.`
            }
          </p>
          <p className="text-orange-600 font-medium text-sm sm:text-base">
            {isArtisan 
              ? "These products are popular on major e-commerce platforms!"
              : "Click on any product to view it on the original e-commerce platform!"
            }
          </p>
          {!isArtisan && (
            <p className="text-blue-600 text-sm mt-2">
              💡 Complete your artisan profile to get personalized recommendations for your craft!
            </p>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Profession Selector */}
        <section 
          className="space-y-4"
          aria-labelledby="craft-selection-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 
              id="craft-selection-heading"
              className="font-semibold text-lg sm:text-xl"
            >
              Your Craft
            </h2>
            <Badge 
              variant="outline" 
              className="text-sm px-3 py-1"
              aria-label="This section is personalized for your profession"
            >
              Personalized for you
            </Badge>
          </div>
          
          <ProfessionSelector
            selectedProfession={userProfession}
            onProfessionChange={(profession) => {
              setUserProfession(profession);
              // Save to localStorage for non-authenticated users
              if (!userProfile) {
                localStorage.setItem('userProfession', profession);
              }
            }}
            isSimpleMode={true}
            aria-label="Select your craft profession to see relevant trending products"
          />
        </section>

        {/* Trending Products */}
        <section 
          aria-labelledby="trending-products-heading"
          className="space-y-6"
        >
          {loading ? (
            <div className="space-y-6">
              <div className="text-center">
                <div 
                  className="inline-flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6 shadow-sm min-h-[60px]"
                  role="status"
                  aria-label="Loading trending products"
                >
                  <div className="animate-spin" aria-hidden="true">
                    <TrendingUp className="size-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-semibold text-blue-800">Loading Trending Products</div>
                    <div className="text-sm text-blue-600">Discovering what's popular right now...</div>
                  </div>
                </div>
              </div>
              <TrendCardGrid
                products={[]}
                loading={true}
                isSimpleMode={true}
              />
            </div>
          ) : trendingProducts.length > 0 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 
                  id="trending-products-heading"
                  className="font-semibold text-lg sm:text-xl"
                >
                  Trending Products
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge 
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-sm px-3 py-2"
                    aria-label={`${trendingProducts.length} trending products found`}
                  >
                    {trendingProducts.length} Products
                  </Badge>
                  <Button
                    onClick={loadTrendingData}
                    disabled={loading}
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] px-6 text-base font-medium"
                    aria-label="Refresh trending products data"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              <TrendCardGrid
                products={trendingProducts}
                onProductClick={handleProductClick}
                isSimpleMode={true}
                loading={false}
                emptyMessage="No trending products found for your profession"
              />
            </div>
          ) : (
            <div className="text-center py-16">
              <TrendingUp className="size-16 text-muted-foreground mx-auto mb-6" aria-hidden="true" />
              <h3 className="font-medium text-xl mb-4">No trending products available</h3>
              <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto leading-relaxed">
                We're updating our trending products collection. Please try again later.
              </p>
              <Button 
                onClick={loadTrendingData} 
                disabled={loading}
                size="lg"
                className="min-h-[48px] px-8 text-base font-medium"
                aria-label="Refresh to load trending products"
              >
                Refresh Products
              </Button>
            </div>
          )}
        </section>

        {/* Market Insights */}
        <section 
          aria-labelledby="market-insights-heading"
          className="space-y-4"
        >
          <MarketInsights 
            insights={marketInsights}
            profession={userProfession}
            isSimpleMode={true}
          />
        </section>
      </CardContent>
    </Card>
  );
}