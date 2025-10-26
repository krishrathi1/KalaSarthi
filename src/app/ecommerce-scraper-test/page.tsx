'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Truck, Package, Star, ExternalLink, AlertCircle } from 'lucide-react';
interface Product {
  title: string;
  url: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  discount?: number;
  image?: string;
  platform: 'amazon' | 'flipkart' | 'meesho';
  page?: number;
  isPrime?: boolean;
  isSponsored?: boolean;
}

interface PlatformState {
  loading: boolean;
  products: Product[];
  error: string | null;
  duration: number | null;
}

const ARTISAN_PROFESSIONS = [
  { value: 'weaver', label: 'Weaver', keywords: 'handwoven textiles sarees fabrics' },
  { value: 'potter', label: 'Potter', keywords: 'handmade pottery ceramic clay' },
  { value: 'jeweler', label: 'Jeweler', keywords: 'handmade jewelry silver ornaments' },
  { value: 'carpenter', label: 'Carpenter', keywords: 'handcrafted wooden furniture' },
  { value: 'metalworker', label: 'Metalworker', keywords: 'handcrafted metal brass copper' },
  { value: 'painter', label: 'Painter', keywords: 'traditional paintings art canvas' },
  { value: 'leatherworker', label: 'Leather Worker', keywords: 'handcrafted leather bags' },
  { value: 'basketmaker', label: 'Basket Maker', keywords: 'handwoven baskets bamboo' },
];

const PLATFORMS = [
  { 
    id: 'amazon', 
    name: 'Amazon', 
    icon: ShoppingCart, 
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  { 
    id: 'flipkart', 
    name: 'Flipkart', 
    icon: Truck, 
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  { 
    id: 'meesho', 
    name: 'Meesho', 
    icon: Package, 
    color: 'bg-pink-500',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  },
];

export default function EcommerceScraperTestPage() {
  const [selectedProfession, setSelectedProfession] = useState<string>('weaver');
  const [platformStates, setPlatformStates] = useState<Record<string, PlatformState>>({
    amazon: { loading: false, products: [], error: null, duration: null },
    flipkart: { loading: false, products: [], error: null, duration: null },
    meesho: { loading: false, products: [], error: null, duration: null },
  });

  const getSearchQuery = (profession: string): string => {
    const prof = ARTISAN_PROFESSIONS.find(p => p.value === profession);
    return prof?.keywords || 'handmade crafts';
  };

  const handleScrape = async (platform: string) => {
    const query = getSearchQuery(selectedProfession);
    
    setPlatformStates(prev => ({
      ...prev,
      [platform]: { loading: true, products: [], error: null, duration: null }
    }));

    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        query: query,
        minPrice: '500',
        maxPrice: '50000',
        maxResults: '20',
        maxPages: '2'
      });

      const response = await fetch(`/api/scrape-products?query=${encodeURIComponent(query)}&platform=${platform}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to scrape ${platform}`);
      }

      // Extract products from the platform-specific data
      const platformProducts = data.data[platform] || [];

      setPlatformStates(prev => ({
        ...prev,
        [platform]: { 
          loading: false, 
          products: platformProducts, 
          error: null,
          duration 
        }
      }));
    } catch (err) {
      const duration = Date.now() - startTime;
      setPlatformStates(prev => ({
        ...prev,
        [platform]: { 
          loading: false, 
          products: [], 
          error: err instanceof Error ? err.message : 'An unknown error occurred',
          duration
        }
      }));
    }
  };

  const handleScrapeAll = async () => {
    await Promise.all(PLATFORMS.map(platform => handleScrape(platform.id)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            E-commerce Product Scraper
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Test product scraping from Amazon, Flipkart, and Meesho based on artisan professions.
            Select a profession and scrape products from each platform individually or all at once.
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Scraping Controls</CardTitle>
            <CardDescription>
              Select an artisan profession to scrape relevant products from e-commerce platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Artisan Profession</label>
                <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profession" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTISAN_PROFESSIONS.map(prof => (
                      <SelectItem key={prof.value} value={prof.value}>
                        {prof.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Search keywords: {getSearchQuery(selectedProfession)}
                </p>
              </div>
              
              <Button 
                onClick={handleScrapeAll}
                size="lg"
                className="w-full md:w-auto"
                disabled={Object.values(platformStates).some(state => state.loading)}
              >
                {Object.values(platformStates).some(state => state.loading) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Scrape All Platforms'
                )}
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              {PLATFORMS.map(platform => {
                const state = platformStates[platform.id];
                return (
                  <div key={platform.id} className="text-center">
                    <div className={`text-2xl font-bold ${platform.textColor}`}>
                      {state.products.length}
                    </div>
                    <div className="text-sm text-muted-foreground">{platform.name} Products</div>
                    {state.duration && (
                      <div className="text-xs text-muted-foreground">{state.duration}ms</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLATFORMS.map(platform => {
            const state = platformStates[platform.id];
            const Icon = platform.icon;

            return (
              <Card key={platform.id} className={`border-2 ${platform.borderColor}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded ${platform.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {platform.name}
                    </CardTitle>
                    <Button
                      onClick={() => handleScrape(platform.id)}
                      disabled={state.loading}
                      size="sm"
                    >
                      {state.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Scrape'
                      )}
                    </Button>
                  </div>
                  {state.products.length > 0 && (
                    <Badge variant="secondary" className="w-fit">
                      {state.products.length} products found
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  {/* Loading State */}
                  {state.loading && (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Scraping {platform.name}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This may take 10-30 seconds
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {state.error && !state.loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">Scraping Failed</p>
                          <p className="text-sm text-red-700 mt-1">{state.error}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleScrape(platform.id)}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Products List */}
                  {state.products.length > 0 && !state.loading && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {state.products.map((product, index) => (
                        <div 
                          key={index} 
                          className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                        >
                          <div className="flex gap-3">
                            {/* Product Image */}
                            {product.image && (
                              <div className="flex-shrink-0">
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-20 h-20 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium line-clamp-2 mb-2">
                                {product.title}
                              </h4>

                              {/* Price */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-green-600">
                                  ₹{product.price.toLocaleString()}
                                </span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <>
                                    <span className="text-sm text-gray-500 line-through">
                                      ₹{product.originalPrice.toLocaleString()}
                                    </span>
                                    <Badge variant="destructive" className="text-xs">
                                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                    </Badge>
                                  </>
                                )}
                              </div>

                              {/* Rating */}
                              {product.rating && (
                                <div className="flex items-center gap-1 mb-2">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">{product.rating}</span>
                                  {product.reviewCount && (
                                    <span className="text-xs text-muted-foreground">
                                      ({product.reviewCount.toLocaleString()} reviews)
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {product.platform}
                                </Badge>
                                {product.page && (
                                  <Badge variant="secondary" className="text-xs">
                                    Page {product.page}
                                  </Badge>
                                )}
                                {product.isPrime && (
                                  <Badge className="text-xs bg-blue-600">
                                    Prime
                                  </Badge>
                                )}
                                {product.isSponsored && (
                                  <Badge variant="outline" className="text-xs text-orange-600">
                                    Sponsored
                                  </Badge>
                                )}
                              </div>

                              {/* View Product Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => window.open(product.url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View on {platform.name}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!state.loading && !state.error && state.products.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No products scraped yet</p>
                      <p className="text-xs mt-1">Click "Scrape" to fetch products</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overall Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Scraping Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {Object.values(platformStates).reduce((sum, state) => sum + state.products.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Products</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {Object.values(platformStates).filter(state => state.products.length > 0).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Successful Scrapes</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {Object.values(platformStates).filter(state => state.error).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Failed Scrapes</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(
                    Object.values(platformStates)
                      .filter(state => state.duration)
                      .reduce((sum, state) => sum + (state.duration || 0), 0) / 
                    Object.values(platformStates).filter(state => state.duration).length || 0
                  )}ms
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg Response Time</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Selected Profession: <strong>{ARTISAN_PROFESSIONS.find(p => p.value === selectedProfession)?.label}</strong></span>
                <span>Search Query: <strong>{getSearchQuery(selectedProfession)}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
