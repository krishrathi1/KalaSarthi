"use client";

import { useState, useCallback } from 'react';
import { Search, Loader2, Sparkles, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface RequirementsInputProps {
  onSearch: (requirements: SearchRequirements) => void;
  loading?: boolean;
  initialValue?: string;
}

interface SearchRequirements {
  userInput: string;
  filters: {
    priceRange?: { min: number; max: number };
    location?: string;
    specializations?: string[];
    availability?: string;
    rating?: number;
    culturalPreferences?: string[];
  };
  preferences: {
    maxResults: number;
    minConfidenceScore: number;
    sortBy: 'confidence' | 'rating' | 'price' | 'availability';
    includeAlternatives: boolean;
  };
}

const SPECIALIZATIONS = [
  'Pottery', 'Textiles', 'Jewelry', 'Woodwork', 'Metalwork', 
  'Painting', 'Sculpture', 'Weaving', 'Embroidery', 'Carving'
];

const CULTURAL_PREFERENCES = [
  'Traditional Indian', 'Rajasthani', 'Bengali', 'South Indian', 
  'Gujarati', 'Punjabi', 'Kashmiri', 'Tribal Art', 'Folk Art'
];

const SAMPLE_PROMPTS = [
  "I need wooden doors for my hotel with traditional Indian carvings",
  "Looking for handwoven silk sarees for a wedding collection",
  "Want custom pottery dinnerware for my restaurant",
  "Need silver jewelry with traditional motifs for my store"
];

export function RequirementsInput({ onSearch, loading = false, initialValue = '' }: RequirementsInputProps) {
  const [userInput, setUserInput] = useState(initialValue);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchRequirements['filters']>({
    priceRange: { min: 1000, max: 50000 },
    specializations: [],
    culturalPreferences: []
  });
  const [preferences, setPreferences] = useState<SearchRequirements['preferences']>({
    maxResults: 10,
    minConfidenceScore: 0.3,
    sortBy: 'confidence',
    includeAlternatives: true
  });
  
  const { toast } = useToast();

  const handleSearch = useCallback(() => {
    if (!userInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe what you're looking for",
        variant: "destructive"
      });
      return;
    }

    const searchRequirements: SearchRequirements = {
      userInput: userInput.trim(),
      filters,
      preferences
    };

    onSearch(searchRequirements);
  }, [userInput, filters, preferences, onSearch, toast]);

  const handleSamplePrompt = (prompt: string) => {
    setUserInput(prompt);
  };

  const toggleSpecialization = (spec: string) => {
    setFilters(prev => ({
      ...prev,
      specializations: prev.specializations?.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...(prev.specializations || []), spec]
    }));
  };

  const toggleCulturalPreference = (pref: string) => {
    setFilters(prev => ({
      ...prev,
      culturalPreferences: prev.culturalPreferences?.includes(pref)
        ? prev.culturalPreferences.filter(p => p !== pref)
        : [...(prev.culturalPreferences || []), pref]
    }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: { min: 1000, max: 50000 },
      specializations: [],
      culturalPreferences: []
    });
  };

  const hasActiveFilters = 
    (filters.specializations?.length || 0) > 0 || 
    (filters.culturalPreferences?.length || 0) > 0 ||
    filters.location ||
    filters.availability ||
    filters.rating;

  return (
    <div className="space-y-6">
      {/* Main Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Describe Your Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample Prompts */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Try these examples:</Label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => handleSamplePrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Main Input */}
          <div className="space-y-2">
            <Label htmlFor="requirements">What are you looking for?</Label>
            <Textarea
              id="requirements"
              placeholder="Describe your product needs in detail. Include materials, style, quantity, timeline, and any specific requirements..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSearch} 
              disabled={loading || !userInput.trim()}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding Artisans...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find Artisans
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {(filters.specializations?.length || 0) + (filters.culturalPreferences?.length || 0)}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Range */}
            <div className="space-y-3">
              <Label>Price Range (₹)</Label>
              <div className="px-3">
                <Slider
                  value={[filters.priceRange?.min || 1000, filters.priceRange?.max || 50000]}
                  onValueChange={([min, max]) => 
                    setFilters(prev => ({ ...prev, priceRange: { min, max } }))
                  }
                  max={100000}
                  min={500}
                  step={500}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>₹{filters.priceRange?.min?.toLocaleString()}</span>
                  <span>₹{filters.priceRange?.max?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="space-y-3">
              <Label>Craft Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => (
                  <Badge
                    key={spec}
                    variant={filters.specializations?.includes(spec) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleSpecialization(spec)}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cultural Preferences */}
            <div className="space-y-3">
              <Label>Cultural Traditions</Label>
              <div className="flex flex-wrap gap-2">
                {CULTURAL_PREFERENCES.map((pref) => (
                  <Badge
                    key={pref}
                    variant={filters.culturalPreferences?.includes(pref) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleCulturalPreference(pref)}
                  >
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Location and Availability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Location</Label>
                <Select
                  value={filters.location || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, location: value || undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any location</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Jaipur">Jaipur</SelectItem>
                    <SelectItem value="Varanasi">Varanasi</SelectItem>
                    <SelectItem value="Chennai">Chennai</SelectItem>
                    <SelectItem value="Kolkata">Kolkata</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={filters.availability || ''}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, availability: value || undefined }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any availability</SelectItem>
                    <SelectItem value="available">Available now</SelectItem>
                    <SelectItem value="busy">Busy but accepting orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-3">
              <Label>Minimum Rating</Label>
              <div className="px-3">
                <Slider
                  value={[filters.rating || 0]}
                  onValueChange={([rating]) => 
                    setFilters(prev => ({ ...prev, rating: rating > 0 ? rating : undefined }))
                  }
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>Any rating</span>
                  <span>{filters.rating ? `${filters.rating}+ stars` : 'Any rating'}</span>
                </div>
              </div>
            </div>

            {/* Search Preferences */}
            <div className="border-t pt-4 space-y-4">
              <Label className="text-base font-medium">Search Preferences</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Sort Results By</Label>
                  <Select
                    value={preferences.sortBy}
                    onValueChange={(value: any) => 
                      setPreferences(prev => ({ ...prev, sortBy: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confidence">Best Match</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="price">Lowest Price</SelectItem>
                      <SelectItem value="availability">Fastest Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Maximum Results</Label>
                  <Select
                    value={preferences.maxResults.toString()}
                    onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, maxResults: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 results</SelectItem>
                      <SelectItem value="10">10 results</SelectItem>
                      <SelectItem value="20">20 results</SelectItem>
                      <SelectItem value="50">50 results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="alternatives"
                  checked={preferences.includeAlternatives}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, includeAlternatives: !!checked }))
                  }
                />
                <Label htmlFor="alternatives" className="text-sm">
                  Include alternative recommendations
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}