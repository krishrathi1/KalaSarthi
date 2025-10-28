"use client";

import { useState } from 'react';
import { Star, MapPin, Clock, Award, TrendingUp, Eye, MessageCircle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MatchResult {
  artisan: {
    uid: string;
    name: string;
    artisticProfession: string;
    profileImage?: string;
    description?: string;
    artisanConnectProfile?: {
      performanceMetrics?: {
        customerSatisfaction: number;
        completionRate: number;
        responseTime: number;
        totalOrders: number;
      };
      specializations?: string[];
      availabilityStatus?: string;
    };
  };
  relevanceScore: {
    overall: number;
    breakdown: {
      skillMatch: number;
      portfolioMatch: number;
      experienceMatch: number;
      specialtyMatch: number;
      ratingBonus: number;
      locationBonus: number;
    };
    matchReasons: string[];
    confidence: number;
  };
  locationData: {
    distance: number;
    category: 'Local' | 'Regional' | 'National';
    deliveryFeasible: boolean;
    estimatedDeliveryTime?: string;
  };
  finalRank: number;
  matchExplanation: string[];
  combinedScore: number;
}

interface IntelligentArtisanCardProps {
  match: MatchResult;
  onViewProfile: (artisanId: string) => void;
  onContact: (artisanId: string) => void;
  onTrackInteraction: (artisanId: string, action: 'viewed' | 'contacted') => void;
  loading?: boolean;
}

export function IntelligentArtisanCard({
  match,
  onViewProfile,
  onContact,
  onTrackInteraction,
  loading = false
}: IntelligentArtisanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { artisan, relevanceScore, locationData, matchExplanation } = match;

  const handleViewProfile = () => {
    onTrackInteraction(artisan.uid, 'viewed');
    onViewProfile(artisan.uid);
  };

  const handleContact = () => {
    onTrackInteraction(artisan.uid, 'contacted');
    onContact(artisan.uid);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getDistanceColor = (category: string) => {
    switch (category) {
      case 'Local': return 'text-green-600 bg-green-50';
      case 'Regional': return 'text-blue-600 bg-blue-50';
      case 'National': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'busy': return 'text-yellow-600 bg-yellow-50';
      case 'unavailable': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatResponseTime = (hours?: number) => {
    if (!hours) return 'Unknown';
    if (hours < 1) return '< 1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  return (
    <TooltipProvider>
      <Card className={`transition-all duration-200 hover:shadow-lg ${
        relevanceScore.overall >= 0.8 ? 'ring-2 ring-green-200' : 
        relevanceScore.overall >= 0.6 ? 'ring-1 ring-blue-200' : ''
      }`}>
        <CardContent className="p-6">
          {/* Header with Artisan Info and Relevance Score */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <img
                  src={artisan.profileImage || '/default-avatar.png'}
                  alt={artisan.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {relevanceScore.overall >= 0.8 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">{artisan.name}</h3>
                <p className="text-gray-600 text-sm">{artisan.artisticProfession}</p>
                
                {/* Specializations */}
                {artisan.artisanConnectProfile?.specializations && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {artisan.artisanConnectProfile.specializations.slice(0, 3).map((spec, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {artisan.artisanConnectProfile.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{artisan.artisanConnectProfile.specializations.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Relevance Score */}
            <div className="text-right">
              <Tooltip>
                <TooltipTrigger>
                  <div className={`px-3 py-2 rounded-lg border ${getRelevanceColor(relevanceScore.overall)}`}>
                    <div className="text-lg font-bold">
                      {Math.round(relevanceScore.overall * 100)}%
                    </div>
                    <div className="text-xs">Match</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">Relevance Breakdown:</p>
                    <p>Skills: {Math.round(relevanceScore.breakdown.skillMatch * 100)}%</p>
                    <p>Portfolio: {Math.round(relevanceScore.breakdown.portfolioMatch * 100)}%</p>
                    <p>Experience: {Math.round(relevanceScore.breakdown.experienceMatch * 100)}%</p>
                    <p>Location: {Math.round(relevanceScore.breakdown.locationBonus * 100)}%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Match Reasons */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Why this match:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {matchExplanation.slice(0, 3).map((reason, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {reason}
                </Badge>
              ))}
              {matchExplanation.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Less' : `+${matchExplanation.length - 3} more`}
                </Button>
              )}
            </div>
            
            {isExpanded && matchExplanation.length > 3 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {matchExplanation.slice(3).map((reason, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">
                {artisan.artisanConnectProfile?.performanceMetrics?.customerSatisfaction?.toFixed(1) || 'N/A'}
                <span className="text-xs text-gray-500 ml-1">
                  ({artisan.artisanConnectProfile?.performanceMetrics?.totalOrders || 0} orders)
                </span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                {formatResponseTime(artisan.artisanConnectProfile?.performanceMetrics?.responseTime)}
              </span>
            </div>
          </div>

          {/* Location and Delivery Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {locationData.distance}km away
              </span>
              <Badge className={`text-xs ${getDistanceColor(locationData.category)}`}>
                {locationData.category}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {locationData.deliveryFeasible ? (
                <Badge className="text-xs text-green-600 bg-green-50">
                  Can deliver ({locationData.estimatedDeliveryTime})
                </Badge>
              ) : (
                <Badge className="text-xs text-red-600 bg-red-50">
                  Pickup only
                </Badge>
              )}
            </div>
          </div>

          {/* Availability Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                artisan.artisanConnectProfile?.availabilityStatus === 'available' ? 'bg-green-500' :
                artisan.artisanConnectProfile?.availabilityStatus === 'busy' ? 'bg-yellow-500' :
                'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 capitalize">
                {artisan.artisanConnectProfile?.availabilityStatus || 'Unknown'}
              </span>
            </div>
            
            {/* Completion Rate */}
            {artisan.artisanConnectProfile?.performanceMetrics?.completionRate && (
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">
                  {Math.round(artisan.artisanConnectProfile.performanceMetrics.completionRate * 100)}% completion
                </span>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t pt-4 mt-4">
              <div className="space-y-3">
                {/* Detailed Score Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Match Score Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(relevanceScore.breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Progress value={value * 100} className="w-16 h-2" />
                          <span className="text-xs text-gray-500 w-8">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {artisan.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">About</h4>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {artisan.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewProfile}
              disabled={loading}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Profile
            </Button>
            
            <Button
              size="sm"
              onClick={handleContact}
              disabled={loading}
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>

          {/* Rank Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              #{match.finalRank}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}