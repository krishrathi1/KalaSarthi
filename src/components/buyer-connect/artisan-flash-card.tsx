"use client";

import { useState } from 'react';
import { Star, MapPin, Clock, MessageCircle, Heart, ExternalLink, Award, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArtisanFlashCardProps {
  artisan: {
    artisan?: {
      uid?: string;
      name?: string;
      artisticProfession?: string;
      description?: string;
      profileImage?: string;
      address?: {
        city?: string;
        state?: string;
        country?: string;
      };
    };
    artisanId?: string;
    artisanProfile?: {
      name?: string;
      artisticProfession?: string;
      description?: string;
      profileImage?: string;
      specializations?: string[];
      availabilityStatus?: string;
      responseTimeAverage?: number;
      aiMetrics?: {
        customerSatisfactionScore?: number;
        matchSuccessRate?: number;
        completionRate?: number;
      };
      location?: {
        city?: string;
        state?: string;
        country?: string;
      };
    };
    relevanceScore?: number;
    confidenceScore?: number;
    matchReason?: string;
    matchReasons?: string[];
    professionMatch?: boolean;
    skillsMatch?: string[];
    rank?: number;
    qualityLevel?: 'excellent' | 'good' | 'fair' | 'low';
    estimatedPrice?: {
      min: number;
      max: number;
      currency: string;
    };
    estimatedTimeline?: string;
    culturalContext?: {
      authenticity: number;
      culturalSignificance?: string;
      traditionalTechniques?: string[];
    };
    recommendedActions?: string[];
    riskFactors?: string[];
  };
  onViewProfile: (artisanId: string) => void;
  onStartChat: (artisanId: string) => void;
  onToggleFavorite?: (artisanId: string) => void;
  isFavorite?: boolean;
  compact?: boolean;
}

export function ArtisanFlashCard({ 
  artisan, 
  onViewProfile, 
  onStartChat, 
  onToggleFavorite,
  isFavorite = false,
  compact = false 
}: ArtisanFlashCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Handle both data structures - from API (SemanticMatchResult) and from props
  const apiArtisan = artisan?.artisan; // From GenAI API
  const propArtisan = artisan?.artisanProfile; // From props
  
  const artisanId = artisan?.artisanId || apiArtisan?.uid || 'unknown';
  const artisanProfile = propArtisan || {
    name: apiArtisan?.name,
    artisticProfession: apiArtisan?.artisticProfession,
    description: apiArtisan?.description,
    profileImage: apiArtisan?.profileImage,
    location: apiArtisan?.address ? {
      city: apiArtisan.address.city,
      state: apiArtisan.address.state,
      country: apiArtisan.address.country
    } : undefined,
    specializations: [],
    availabilityStatus: 'available',
    responseTimeAverage: undefined,
    aiMetrics: undefined
  };
  
  const confidenceScore = artisan?.confidenceScore || artisan?.relevanceScore || 0;
  const matchReasons = artisan?.matchReasons || (artisan?.matchReason ? [artisan.matchReason] : []);
  const estimatedPrice = artisan?.estimatedPrice || { min: 1000, max: 10000, currency: 'INR' };
  const estimatedTimeline = artisan?.estimatedTimeline || 'Contact for timeline';
  const culturalContext = artisan?.culturalContext;
  const recommendedActions = artisan?.recommendedActions || [];
  const qualityLevel = artisan?.qualityLevel;

  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'busy': return 'text-yellow-600 bg-yellow-50';
      case 'unavailable': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (score: number, qualityLevel?: string) => {
    // Use quality level if available, otherwise fall back to score-based colors
    if (qualityLevel) {
      switch (qualityLevel) {
        case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
        case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
    
    // Fallback to score-based colors
    if (score >= 0.7) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.4) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.25) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getQualityLabel = (qualityLevel?: string, score?: number) => {
    if (qualityLevel) {
      switch (qualityLevel) {
        case 'excellent': return 'Excellent Match';
        case 'good': return 'Good Match';
        case 'fair': return 'Fair Match';
        case 'low': return 'Low Confidence';
        default: return 'Match';
      }
    }
    
    // Fallback to score-based labels
    const percentage = Math.round((score || 0) * 100);
    if (percentage >= 70) return 'Excellent Match';
    if (percentage >= 40) return 'Good Match';
    if (percentage >= 25) return 'Fair Match';
    return 'Low Confidence';
  };

  const formatPrice = (min: number, max: number, currency: string = 'INR') => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    });
    
    if (min === max) {
      return formatter.format(min);
    }
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Early return if essential data is missing
  if (!artisanProfile || !artisanId) {
    return null;
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewProfile(artisanId)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={!imageError ? artisanProfile?.profileImage : undefined} 
                alt={artisanProfile?.name || 'Artisan'}
                onError={() => setImageError(true)}
              />
              <AvatarFallback>{getInitials(artisanProfile?.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm truncate">{artisanProfile?.name || 'Unknown Artisan'}</h3>
                <Badge className={`text-xs ${getConfidenceColor(confidenceScore, qualityLevel)}`}>
                  {getQualityLabel(qualityLevel, confidenceScore)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{artisanProfile?.artisticProfession || 'Artisan'}</p>
              <div className="flex items-center mt-1 space-x-2 text-xs text-muted-foreground">
                <span>{estimatedPrice ? formatPrice(estimatedPrice.min, estimatedPrice.max, estimatedPrice.currency) : 'Price TBD'}</span>
                <span>•</span>
                <span>{estimatedTimeline || 'Timeline TBD'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={!imageError ? artisanProfile?.profileImage : undefined} 
                  alt={artisanProfile?.name || 'Artisan'}
                  onError={() => setImageError(true)}
                />
                <AvatarFallback>{getInitials(artisanProfile?.name)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{artisanProfile?.name || 'Unknown Artisan'}</h3>
                  {onToggleFavorite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(artisanId);
                      }}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{artisanProfile?.artisticProfession || 'Artisan'}</p>
                
                {/* Location and Availability */}
                <div className="flex items-center gap-3 mt-1">
                  {artisanProfile.location?.city && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {artisanProfile.location.city}, {artisanProfile.location.state}
                    </div>
                  )}
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getAvailabilityColor(artisanProfile?.availabilityStatus)}`}
                  >
                    {artisanProfile?.availabilityStatus || 'available'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Confidence Score */}
            <div className="text-right">
              <Tooltip>
                <TooltipTrigger>
                  <Badge className={`${getConfidenceColor(confidenceScore, qualityLevel)} font-semibold border`}>
                    <Zap className="h-3 w-3 mr-1" />
                    {getQualityLabel(qualityLevel, confidenceScore)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Match confidence: {Math.round(confidenceScore * 100)}%</p>
                  {qualityLevel && <p>Quality: {qualityLevel}</p>}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {artisanProfile?.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {artisanProfile.description}
            </p>
          )}

          {/* Specializations */}
          {artisanProfile?.specializations && artisanProfile.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {artisanProfile.specializations.slice(0, 3).map((spec, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {artisanProfile.specializations.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{artisanProfile.specializations.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Match Reasons */}
          {matchReasons && matchReasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-700">Why this is a good match:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {matchReasons.slice(0, 2).map((reason, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rating</span>
                <div className="flex items-center">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium">
                    {artisanProfile.aiMetrics?.customerSatisfactionScore?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Response</span>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                  <span className="font-medium">
                    {artisanProfile?.responseTimeAverage ? `${artisanProfile.responseTimeAverage}m` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">
                  {artisanProfile?.aiMetrics?.matchSuccessRate ? 
                    `${Math.round(artisanProfile.aiMetrics.matchSuccessRate * 100)}%` : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">
                  {artisanProfile?.aiMetrics?.completionRate ? 
                    `${Math.round(artisanProfile.aiMetrics.completionRate * 100)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Cultural Context */}
          {culturalContext && culturalContext.authenticity !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cultural Authenticity</span>
                <Badge variant="outline" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  {Math.round(culturalContext.authenticity * 100)}%
                </Badge>
              </div>
              {culturalContext.authenticity > 0 && (
                <Progress value={culturalContext.authenticity * 100} className="h-2" />
              )}
            </div>
          )}

          {/* Pricing and Timeline */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Price</span>
              <span className="font-semibold text-primary">
                {estimatedPrice ? formatPrice(estimatedPrice.min, estimatedPrice.max, estimatedPrice.currency) : 'Price TBD'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Timeline</span>
              <span className="font-medium">{estimatedTimeline || 'Timeline TBD'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onViewProfile(artisanId)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Button>
            
            <Button 
              className="flex-1"
              onClick={() => onStartChat(artisanId)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>

          {/* Recommended Actions */}
          {recommendedActions && recommendedActions.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Tip:</span> {recommendedActions[0]}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}