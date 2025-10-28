"use client";

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Users, TrendingUp, Award, MapPin, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RequirementsInput } from '@/components/buyer-connect/requirements-input';
import { ArtisanGrid } from '@/components/buyer-connect/artisan-grid';
import { ArtisanProfileViewer } from '@/components/buyer-connect/artisan-profile-viewer';
import { ChatInterface } from '@/components/buyer-connect/chat-interface';
import { LocationPermissionDialog } from '@/components/buyer-connect/location-permission-dialog';
import { DistanceFilterControls } from '@/components/buyer-connect/distance-filter-controls';
import { GoogleMapsProvider } from '@/components/providers/google-maps-provider';

interface SearchRequirements {
  userInput: string;
  filters: {
    priceRange?: { min: number; max: number };
    maxDistance?: number;
    minRelevanceScore?: number;
    artisanRating?: number;
    experienceLevel?: string[];
    materials?: string[];
    verifiedOnly?: boolean;
  };
  preferences: {
    maxResults: number;
    sortBy: 'relevance' | 'distance' | 'rating' | 'price';
    includeAlternatives: boolean;
  };
}

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: {
    city: string;
    state: string;
    country: string;
  };
  accuracy: number;
  source: 'gps' | 'network' | 'manual';
}

interface MatchingResult {
  matches: any[];
  totalMatches: number;
  searchMetadata: {
    extractedKeywords: string[];
    categories: string[];
    confidenceThreshold: number;
    searchTime: number;
    aiAnalysisTime: number;
    timestamp: string;
  };
  requirementAnalysis: any;
  alternativeRecommendations: Array<{
    suggestion: string;
    reasoning: string;
    actionRequired: string;
  }>;
  marketInsights: {
    averagePricing: { min: number; max: number };
    demandLevel: 'low' | 'medium' | 'high';
    availabilityTrend: string;
    seasonalFactors: string[];
  };
  improvementSuggestions: Array<{
    area: string;
    suggestion: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}

type ViewState = 'search' | 'results' | 'profile' | 'chat';

export default function BuyerConnectPage() {
  const [viewState, setViewState] = useState<ViewState>('search');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<MatchingResult | null>(null);
  const [selectedArtisanId, setSelectedArtisanId] = useState<string | null>(null);
  const [favoriteArtisans, setFavoriteArtisans] = useState<string[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  
  // Location-related state
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState('');
  
  // Filter state
  const [distanceFilter, setDistanceFilter] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();

  // Check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      setShowLocationDialog(true);
      return;
    }

    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          setLocationPermission('granted');
          await getCurrentLocation();
        } else if (permission.state === 'denied') {
          setLocationPermission('denied');
          setShowLocationDialog(true);
        } else {
          setLocationPermission('unknown');
          setShowLocationDialog(true);
        }
      } else {
        setShowLocationDialog(true);
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setShowLocationDialog(true);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const locationData: LocationData = {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        accuracy: position.coords.accuracy,
        source: 'gps'
      };

      // Get address from coordinates using Google Maps Geocoding
      try {
        const address = await reverseGeocode(locationData.coordinates);
        locationData.address = address;
      } catch (error) {
        console.error('Error getting address:', error);
      }

      setUserLocation(locationData);
      setLocationPermission('granted');
      
      toast({
        title: "Location detected",
        description: `Found your location${locationData.address ? ` in ${locationData.address.city}` : ''}`,
      });

    } catch (error: any) {
      console.error('Error getting location:', error);
      
      let errorMessage = 'Unable to detect your location';
      if (error.code === 1) {
        errorMessage = 'Location access denied. You can enter your location manually.';
        setLocationPermission('denied');
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Using approximate location.';
        await getApproximateLocation();
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setShowLocationDialog(true);
    } finally {
      setLocationLoading(false);
    }
  };

  const getApproximateLocation = async () => {
    try {
      // Use IP-based location as fallback
      const response = await fetch('/api/location/ip-location');
      const data = await response.json();
      
      if (data.success) {
        setUserLocation({
          coordinates: data.coordinates,
          address: data.address,
          accuracy: 10000, // 10km accuracy for IP-based location
          source: 'network'
        });
        
        toast({
          title: "Approximate location detected",
          description: `Using approximate location: ${data.address?.city || 'Unknown'}`,
        });
      }
    } catch (error) {
      console.error('Error getting IP location:', error);
    }
  };

  const reverseGeocode = async (coordinates: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(`/api/location/reverse-geocode?lat=${coordinates.latitude}&lng=${coordinates.longitude}`);
      const data = await response.json();
      
      if (data.success) {
        return data.address;
      }
      throw new Error('Geocoding failed');
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return undefined;
    }
  };

  const handleManualLocation = async (locationInput: string) => {
    if (!locationInput.trim()) return;
    
    setLocationLoading(true);
    
    try {
      const response = await fetch('/api/location/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationInput })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUserLocation(data.location);
        setShowLocationDialog(false);
        setManualLocationInput('');
        
        toast({
          title: "Location set",
          description: `Location set to ${data.location.address?.city || locationInput}`,
        });
      } else {
        throw new Error(data.error || 'Failed to geocode address');
      }
    } catch (error) {
      console.error('Error setting manual location:', error);
      toast({
        title: "Location Error",
        description: "Unable to find that location. Please try a different address.",
        variant: "destructive"
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSearch = useCallback(async (requirements: SearchRequirements) => {
    try {
      setLoading(true);
      setLastSearchQuery(requirements.userInput);
      
      // Mock user session - in real implementation, get from auth context
      const mockUserId = 'buyer_sample_1';
      const mockSessionId = `session_${Date.now()}`;
      
      // Try intelligent matching API first, fallback to simple search
      let response;
      try {
        response = await fetch('/api/intelligent-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: requirements.userInput,
            maxResults: requirements.preferences.maxResults || 20,
            buyerId: mockUserId
          }),
        });
        
        // If intelligent match fails, use simple search
        if (!response.ok) {
          console.log('Intelligent match failed, using simple search...');
          response = await fetch('/api/search-artisans', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: requirements.userInput,
              maxResults: requirements.preferences.maxResults || 20
            }),
          });
        }
      } catch (error) {
        console.log('Intelligent match error, using simple search...', error);
        response = await fetch('/api/search-artisans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: requirements.userInput,
            maxResults: requirements.preferences.maxResults || 20
          }),
        });
      }

      const data = await response.json();
      console.log('Search API Response:', data);

      if (!response.ok) {
        if (data.error?.code === 'NO_MATCHES') {
          toast({
            title: "No matches found",
            description: data.error.message + " Try broadening your search criteria.",
            variant: "destructive"
          });
          setSearchResults(null);
          return;
        }
        throw new Error(data.error?.message || 'Failed to find artisan matches');
      }

      if (data.success) {
        // Handle both intelligent match and simple search response formats
        const searchData = data.data || data;
        const matches = searchData.matches || [];
        
        // Convert simple search format to expected format if needed
        const formattedMatches = matches.map((match: any) => ({
          // Transform the match format to what ArtisanGrid expects
          artisanId: match.artisan?.uid || match.artisan?.id,
          artisan: match.artisan,
          artisanProfile: {
            name: match.artisan?.name,
            profession: match.artisan?.artisticProfession,
            specializations: match.artisan?.artisanConnectProfile?.specializations || [match.artisan?.artisticProfession],
            location: match.artisan?.address ? `${match.artisan.address.city}, ${match.artisan.address.state}` : 
                     match.artisan?.artisanConnectProfile?.locationData?.address ? 
                     `${match.artisan.artisanConnectProfile.locationData.address.city}, ${match.artisan.artisanConnectProfile.locationData.address.state}` : 
                     'Unknown',
            rating: match.artisan?.artisanConnectProfile?.performanceMetrics?.customerSatisfaction || 4.0,
            completedOrders: match.artisan?.artisanConnectProfile?.performanceMetrics?.totalOrders || 0,
            responseTime: match.artisan?.artisanConnectProfile?.performanceMetrics?.responseTime || 24,
            responseTimeAverage: match.artisan?.artisanConnectProfile?.performanceMetrics?.responseTime || 24,
            availabilityStatus: match.artisan?.artisanConnectProfile?.availabilityStatus || 'available',
            profileImage: match.artisan?.profileImage,
            description: match.artisan?.description,
            verificationStatus: match.artisan?.artisanConnectProfile?.matchingData?.verificationStatus || {
              skillsVerified: false,
              portfolioVerified: false,
              identityVerified: false
            },
            aiMetrics: {
              customerSatisfactionScore: match.artisan?.artisanConnectProfile?.performanceMetrics?.customerSatisfaction || 4.0,
              matchSuccessRate: match.artisan?.artisanConnectProfile?.aiMetrics?.matchSuccessRate || 0.8,
              averageOrderValue: match.artisan?.artisanConnectProfile?.performanceMetrics?.averageOrderValue || 5000,
              completionRate: match.artisan?.artisanConnectProfile?.performanceMetrics?.completionRate || 0.95
            }
          },
          confidenceScore: match.relevanceScore || 0.5,
          matchReasons: match.matchReasons || [],
          // Enhanced match explanation data
          matchExplanation: match.explanation ? {
            summary: match.explanation.summary,
            keyStrengths: match.explanation.keyStrengths || [],
            matchHighlights: match.explanation.matchHighlights || {
              profession: null,
              skills: [],
              materials: [],
              techniques: [],
              experience: null,
              location: null,
              performance: null
            },
            confidenceIndicator: match.explanation.confidenceIndicator || {
              level: match.relevanceScore > 0.7 ? 'high' : match.relevanceScore > 0.4 ? 'medium' : 'low',
              percentage: Math.round((match.relevanceScore || 0.5) * 100),
              description: 'Match confidence based on query analysis'
            },
            whyThisArtisan: match.explanation.whyThisArtisan || 'Good match for your requirements',
            potentialConcerns: match.explanation.potentialConcerns || [],
            nextSteps: match.explanation.nextSteps || ['View profile', 'Send message', 'Request quote']
          } : null,
          // Match quality indicators
          matchQuality: {
            professionMatch: match.professionMatch || false,
            materialMatch: match.materialMatch || false,
            techniqueMatch: match.techniqueMatch || false,
            specializationMatch: match.specializationMatch || false,
            locationMatch: match.locationMatch || false,
            overallQuality: match.qualityLevel || (match.relevanceScore > 0.7 ? 'high' : match.relevanceScore > 0.4 ? 'medium' : 'low')
          },
          estimatedPrice: {
            min: 1000,
            max: 10000,
            currency: 'INR'
          },
          deliveryTime: match.artisan?.artisanConnectProfile?.matchingData?.typicalTimeline || '7-14 days',
          distance: null, // We don't have distance data yet
          rank: match.rank || 0,
          culturalContext: {
            authenticity: match.relevanceScore || 0.5,
            culturalAlignment: 0.8,
            traditionalTechniques: true
          }
        }));
        
        const formattedResults = {
          matches: formattedMatches,
          totalMatches: searchData.totalFound || matches.length,
          searchMetadata: {
            extractedKeywords: searchData.queryAnalysis?.extractedSkills || [],
            extractedMaterials: searchData.queryAnalysis?.extractedMaterials || [],
            extractedProducts: searchData.queryAnalysis?.extractedProducts || [],
            categories: [searchData.queryAnalysis?.detectedProfession || 'unknown'],
            confidenceThreshold: 0.3,
            searchTime: searchData.processingTime || 0,
            aiAnalysisTime: 0,
            timestamp: new Date().toISOString(),
            searchMethod: searchData.searchMethod || searchData.searchType || 'unknown',
            systemHealth: searchData.systemHealth,
            analytics: searchData.analytics
          },
          requirementAnalysis: {
            ...searchData.queryAnalysis,
            intent: searchData.queryAnalysis?.intent,
            contextualFactors: searchData.queryAnalysis?.contextualFactors,
            confidence: searchData.queryAnalysis?.confidence || 0.5
          },
          alternativeRecommendations: [],
          marketInsights: {
            averagePricing: { min: 1000, max: 10000 },
            demandLevel: 'medium' as const,
            availabilityTrend: 'stable',
            seasonalFactors: []
          },
          improvementSuggestions: searchData.analytics ? [
            {
              area: 'Query Complexity',
              suggestion: `Your query was classified as ${searchData.analytics.queryComplexity}. ${
                searchData.analytics.queryComplexity === 'simple' ? 
                'Try adding more specific details for better matches.' :
                searchData.analytics.queryComplexity === 'complex' ?
                'Great detail! This helps us find more precise matches.' :
                'Good balance of detail for effective matching.'
              }`,
              impact: 'medium' as const
            },
            {
              area: 'Match Quality',
              suggestion: `Average relevance score: ${(searchData.analytics.averageRelevanceScore * 100).toFixed(0)}%. ${
                searchData.analytics.averageRelevanceScore > 0.7 ?
                'Excellent matches found!' :
                searchData.analytics.averageRelevanceScore > 0.4 ?
                'Good matches. Consider refining your search for better results.' :
                'Consider using different keywords or broadening your criteria.'
              }`,
              impact: searchData.analytics.averageRelevanceScore > 0.6 ? 'low' as const : 'high' as const
            }
          ] : []
        };
        
        console.log('Formatted Results:', formattedResults);
        setSearchResults(formattedResults);
        setViewState('results');
        
        // Show enhanced quality-based feedback
        let qualityMessage = `Found ${matches.length} matching artisans`;
        let searchMethodMessage = '';
        
        if (matches.length > 0) {
          const highQualityMatches = matches.filter((m: any) => m.relevanceScore > 0.7).length;
          const mediumQualityMatches = matches.filter((m: any) => m.relevanceScore > 0.4 && m.relevanceScore <= 0.7).length;
          
          if (highQualityMatches > 0) {
            qualityMessage += ` (${highQualityMatches} high-quality matches)`;
          } else if (mediumQualityMatches > 0) {
            qualityMessage += ` (${mediumQualityMatches} good matches)`;
          }
          
          // Add search method info
          if (searchData.searchMethod) {
            const methodNames = {
              'intelligent': 'AI-powered matching',
              'vector': 'Semantic search',
              'hybrid': 'Hybrid AI search',
              'fallback': 'Keyword matching',
              'simple': 'Basic search'
            };
            searchMethodMessage = ` using ${methodNames[searchData.searchMethod as keyof typeof methodNames] || searchData.searchMethod}`;
          }
          
          // Add system health indicator
          if (searchData.systemHealth?.fallbackUsed) {
            searchMethodMessage += ' (backup system)';
          }
        }
        
        toast({
          title: "Search Complete",
          description: qualityMessage + searchMethodMessage,
        });
      } else {
        throw new Error(data.error || 'Search failed');
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleViewProfile = useCallback((artisanId: string) => {
    setSelectedArtisanId(artisanId);
    setViewState('profile');
  }, []);

  const handleStartChat = useCallback((artisanId: string) => {
    const sessionId = `chat_${Date.now()}_${artisanId}`;
    setSelectedArtisanId(artisanId);
    setChatSessionId(sessionId);
    setViewState('chat');
    
    toast({
      title: "Chat Started",
      description: "Starting conversation with artisan",
    });
  }, [toast]);

  const handleToggleFavorite = useCallback((artisanId: string) => {
    setFavoriteArtisans(prev => 
      prev.includes(artisanId)
        ? prev.filter(id => id !== artisanId)
        : [...prev, artisanId]
    );
    
    toast({
      title: favoriteArtisans.includes(artisanId) ? "Removed from Favorites" : "Added to Favorites",
      description: favoriteArtisans.includes(artisanId) 
        ? "Artisan removed from your favorites" 
        : "Artisan added to your favorites",
    });
  }, [favoriteArtisans, toast]);

  const handleBackToResults = useCallback(() => {
    setViewState('results');
    setSelectedArtisanId(null);
    setChatSessionId(null);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setViewState('search');
    setSearchResults(null);
    setSelectedArtisanId(null);
    setChatSessionId(null);
  }, []);

  const handleBackToProfile = useCallback(() => {
    setViewState('profile');
    setChatSessionId(null);
  }, []);

  // Render different views based on state
  if (viewState === 'chat' && selectedArtisanId && chatSessionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ChatInterface
          sessionId={chatSessionId}
          currentUserId="buyer_sample_1" // In real app, get from auth context
          otherParticipant={{
            id: selectedArtisanId,
            name: "Artisan", // In real app, get from artisan data
            language: "en",
            isOnline: true
          }}
          onClose={handleBackToResults}
        />
      </div>
    );
  }

  if (viewState === 'profile' && selectedArtisanId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ArtisanProfileViewer
          artisanId={selectedArtisanId}
          onBack={handleBackToResults}
          onStartChat={handleStartChat}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={favoriteArtisans.includes(selectedArtisanId)}
        />
      </div>
    );
  }

  if (viewState === 'results' && searchResults) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Search Results</h1>
              <p className="text-muted-foreground">
                Results for: "{lastSearchQuery}"
              </p>
              
              {/* Search Quality Indicator */}
              {searchResults?.searchMetadata && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      searchResults.requirementAnalysis?.confidence > 0.7 ? 'bg-green-500' :
                      searchResults.requirementAnalysis?.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-muted-foreground">
                      {searchResults.requirementAnalysis?.confidence > 0.7 ? 'High' :
                       searchResults.requirementAnalysis?.confidence > 0.4 ? 'Medium' : 'Low'} confidence match
                    </span>
                  </div>
                  
                  {searchResults.searchMetadata.searchMethod && (
                    <Badge variant="outline" className="text-xs">
                      {searchResults.searchMetadata.searchMethod === 'intelligent' ? '🧠 AI Matching' :
                       searchResults.searchMetadata.searchMethod === 'vector' ? '🔬 Semantic Search' :
                       searchResults.searchMetadata.searchMethod === 'hybrid' ? '🔄 Hybrid Search' :
                       searchResults.searchMetadata.searchMethod === 'fallback' ? '⚡ Quick Search' :
                       '🔍 Basic Search'}
                    </Badge>
                  )}
                  
                  {searchResults.searchMetadata.systemHealth?.fallbackUsed && (
                    <Badge variant="secondary" className="text-xs">
                      Backup System
                    </Badge>
                  )}
                  
                  <span className="text-muted-foreground">
                    {searchResults.searchMetadata.searchTime}ms
                  </span>
                </div>
              )}
              
              {/* Query Analysis Summary */}
              {searchResults?.requirementAnalysis && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm space-y-1">
                    {searchResults.requirementAnalysis.detectedProfession && (
                      <div>
                        <span className="font-medium">Detected profession:</span> {searchResults.requirementAnalysis.detectedProfession}
                      </div>
                    )}
                    
                    {searchResults.searchMetadata.extractedMaterials?.length > 0 && (
                      <div>
                        <span className="font-medium">Materials:</span> {searchResults.searchMetadata.extractedMaterials.join(', ')}
                      </div>
                    )}
                    
                    {searchResults.searchMetadata.extractedKeywords?.length > 0 && (
                      <div>
                        <span className="font-medium">Techniques:</span> {searchResults.searchMetadata.extractedKeywords.join(', ')}
                      </div>
                    )}
                    
                    {searchResults.requirementAnalysis.intent && (
                      <div>
                        <span className="font-medium">Intent:</span> {
                          searchResults.requirementAnalysis.intent.action === 'buy' ? 'Looking to purchase' :
                          searchResults.requirementAnalysis.intent.action === 'commission' ? 'Custom commission' :
                          'Browsing options'
                        }
                        {searchResults.requirementAnalysis.intent.urgency !== 'exploring' && 
                         ` (${searchResults.requirementAnalysis.intent.urgency})`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <RequirementsInput
                onSearch={handleSearch}
                loading={loading}
                initialValue={lastSearchQuery}
              />
            </div>
          </div>

          {/* Results Grid */}
          <ArtisanGrid
            artisans={searchResults?.matches || []}
            loading={loading}
            onViewProfile={handleViewProfile}
            onStartChat={handleStartChat}
            onToggleFavorite={handleToggleFavorite}
            favoriteArtisans={favoriteArtisans}
            searchMetadata={searchResults?.searchMetadata ? {
              ...searchResults.searchMetadata,
              totalMatches: searchResults.totalMatches || 0
            } : undefined}
            marketInsights={searchResults?.marketInsights}
            alternativeRecommendations={searchResults?.alternativeRecommendations}
          />
        </div>
      </div>
    );
  }

  // Default search view
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Buyer Connect</h1>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with skilled artisans using AI-powered matching. 
            Describe your needs and find the perfect craftsperson for your project.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Smart Matching</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                AI analyzes your requirements to find artisans with the perfect skills and experience
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Market Insights</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Get real-time pricing, availability trends, and market intelligence for informed decisions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Award className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Cultural Authenticity</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Discover authentic traditional crafts with verified cultural significance and techniques
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Interface */}
        <RequirementsInput
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Recent Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                'Traditional Pottery',
                'Handwoven Textiles',
                'Silver Jewelry',
                'Wood Carving',
                'Block Printing',
                'Ceramic Art',
                'Embroidery',
                'Metal Craft'
              ].map((category) => (
                <Badge 
                  key={category} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleSearch({
                    userInput: `I'm looking for ${category.toLowerCase()} for my project`,
                    filters: {},
                    preferences: {
                      maxResults: 10,
                      minConfidenceScore: 0.3,
                      sortBy: 'confidence',
                      includeAlternatives: true
                    }
                  })}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                  1
                </div>
                <h3 className="font-semibold">Describe Your Needs</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us what you're looking for in natural language
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                  2
                </div>
                <h3 className="font-semibold">Get AI Matches</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI finds the best artisans based on your requirements
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">
                  3
                </div>
                <h3 className="font-semibold">Connect & Collaborate</h3>
                <p className="text-sm text-muted-foreground">
                  Chat with artisans, view their work, and place orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}