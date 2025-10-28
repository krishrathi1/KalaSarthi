"use client";

import { useState } from 'react';
import { MapPin, Sliders, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';

interface DistanceFilterControlsProps {
  currentDistance?: number;
  onDistanceChange: (distance: number | undefined) => void;
  userLocation?: {
    address?: {
      city: string;
      state: string;
    };
  } | null;
  disabled?: boolean;
}

const DISTANCE_OPTIONS = [
  { value: 25, label: '25km', description: 'Very Local' },
  { value: 50, label: '50km', description: 'Local Area' },
  { value: 100, label: '100km', description: 'Regional' },
  { value: 200, label: '200km', description: 'Extended Area' },
  { value: undefined, label: 'No Limit', description: 'Nationwide' }
];

export function DistanceFilterControls({
  currentDistance,
  onDistanceChange,
  userLocation,
  disabled = false
}: DistanceFilterControlsProps) {
  const [open, setOpen] = useState(false);

  const handleDistanceSelect = (distance: number | undefined) => {
    onDistanceChange(distance);
    setOpen(false);
  };

  const getCurrentLabel = () => {
    if (currentDistance === undefined) return 'No Limit';
    return `${currentDistance}km`;
  };

  const getCurrentDescription = () => {
    const option = DISTANCE_OPTIONS.find(opt => opt.value === currentDistance);
    return option?.description || 'Custom';
  };

  if (!userLocation) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-amber-700">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Enable location to filter by distance</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4" />
        <span>
          Your location: {userLocation.address?.city || 'Unknown'}, {userLocation.address?.state || ''}
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              <span>Distance: {getCurrentLabel()}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {getCurrentDescription()}
            </Badge>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <h4 className="font-medium mb-3">Maximum Distance</h4>
            <div className="space-y-2">
              {DISTANCE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleDistanceSelect(option.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    currentDistance === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                  {currentDistance === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Why distance matters?</p>
                  <p className="mt-1">
                    Nearby artisans can deliver large or fragile items more easily and cost-effectively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}