"use client";

import { useState, useMemo } from 'react';
import { Grid, List, SlidersHorizontal, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArtisanFlashCard } from './artisan-flash-card';
import { Skeleton } from '@/components/ui/skeleton';

interface ArtisanGridProps {
  artisans: any[];
  loading?: boolean;
  onViewProfile: (artisanId: string) => void;
  onStartChat: (artisanId: string) => void;
  onToggleFavorite?: (artisanId: string) => void;
  favoriteArtisans?: string[];
  searchMetadata?: {
    extractedKeywords: string[];
    categories: string[];
    confidenceThreshold: number;
    searchTime: number;
    totalMatches: number;
  };
  marketInsights?: {
    averagePricing: { min: number; max: number };
    demandLevel: 'low' | 'medium' | 'high';
    availabilityTrend: string;
    seasonalFactors: string[];
  };
  alternativeRecommendations?: Array<{
    suggestion: string;
    reasoning: string;
    actionRequired: string;
  }>;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'confidence' | 'rating' | 'price' | 'availability' | 'authenticity';

export function ArtisanGrid({
  artisans,
  loading = false,
  onViewProfile,
  onStartChat,
  onToggleFavorite,
  favoriteArtisans = [],
  searchMetadata,
  marketInsights,
  alternativeRecommendations
}: ArtisanGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [filterBy, setFilterBy] = useState<string>('all');

  // Sort and filter artisans
  const processedArtisans = useMemo(() => {
    if (!artisans || !Array.isArray(artisans)) {
      return [];
    }
    let filtered = [...artisans];

    // Apply filters
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'available':
          filtered = filtered.filter(a => a.artisanProfile.availabilityStatus === 'available');
          break;
        case 'high-confidence':
          filtered = filtered.filter(a => a.confidenceScore >= 0.8);
          break;
        case 'favorites':
          filtered = filtered.filter(a => favoriteArtisans.includes(a.artisanId));
          break;
        case 'premium':
          filtered = filtered.filter(a => a.estimatedPrice.min >= 10000);
          break;
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidenceScore - a.confidenceScore;
        case 'rating':
          return (b.artisanProfile.aiMetrics?.customerSatisfactionScore || 0) - 
                 (a.artisanProfile.aiMetrics?.customerSatisfactionScore || 0);
        case 'price':
          return a.estimatedPrice.min - b.estimatedPrice.min;
        case 'availability':
          return (a.artisanProfile.responseTimeAverage || 999) - 
                 (b.artisanProfile.responseTimeAverage || 999);
        case 'authenticity':
          return (b.culturalContext?.authenticity || 0) - (a.culturalContext?.authenticity || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [artisans, sortBy, filterBy, favoriteArtisans]);

  const formatPrice = (min: number, max: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for controls */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Loading skeleton for grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Results Summary */}
      {searchMetadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{searchMetadata.totalMatches}</div>
                <div className="text-sm text-muted-foreground">Artisans Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{searchMetadata.searchTime}ms</div>
                <div className="text-sm text-muted-foreground">Search Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {processedArtisans.length > 0 ? Math.round((processedArtisans.reduce((sum, a) => sum + a.confidenceScore, 0) / processedArtisans.length) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Match Score</div>
              </div>
            </div>

            {searchMetadata?.categories?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Categories:</span>
                  {searchMetadata?.categories?.map((category, index) => (
                    <Badge key={index} variant="secondary">{category}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Insights */}
      {marketInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Average Pricing</div>
                <div className="font-semibold">
                  {formatPrice(marketInsights.averagePricing.min, marketInsights.averagePricing.max)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Demand Level</div>
                <Badge className={getDemandColor(marketInsights.demandLevel)}>
                  {marketInsights.demandLevel} demand
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Availability</div>
                <div className="font-medium">{marketInsights.availabilityTrend}</div>
              </div>
            </div>

            {marketInsights?.seasonalFactors?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Seasonal Factors:</div>
                <ul className="text-sm space-y-1">
                  {marketInsights?.seasonalFactors?.map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {processedArtisans.length} of {artisans?.length || 0} artisans
          </div>
          
          {processedArtisans.length !== (artisans?.length || 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterBy('all')}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artisans</SelectItem>
              <SelectItem value="available">Available Now</SelectItem>
              <SelectItem value="high-confidence">High Match (80%+)</SelectItem>
              <SelectItem value="premium">Premium (₹10k+)</SelectItem>
              {favoriteArtisans?.length > 0 && (
                <SelectItem value="favorites">Favorites</SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Best Match</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price">Lowest Price</SelectItem>
              <SelectItem value="availability">Fastest Response</SelectItem>
              <SelectItem value="authenticity">Most Authentic</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Artisan Grid/List */}
      {processedArtisans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground mb-4">
              No artisans match your current filters
            </div>
            <Button variant="outline" onClick={() => setFilterBy('all')}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {processedArtisans.map((artisan, index) => (
            <ArtisanFlashCard
              key={artisan?.artisanId || `artisan-${index}`}
              artisan={artisan}
              onViewProfile={onViewProfile}
              onStartChat={onStartChat}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favoriteArtisans?.includes(artisan?.artisanId) || false}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Alternative Recommendations */}
      {alternativeRecommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alternative Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alternativeRecommendations.map((rec, index) => (
                <div key={index} className="border-l-4 border-primary pl-4">
                  <div className="font-medium text-sm">{rec.suggestion}</div>
                  <div className="text-sm text-muted-foreground mt-1">{rec.reasoning}</div>
                  <div className="text-xs text-primary mt-2 font-medium">
                    Action: {rec.actionRequired}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}