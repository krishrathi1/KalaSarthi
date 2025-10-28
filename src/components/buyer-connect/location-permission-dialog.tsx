"use client";

import { useState } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationGranted: () => void;
  onManualLocation: (location: string) => void;
  loading: boolean;
}

export function LocationPermissionDialog({
  open,
  onOpenChange,
  onLocationGranted,
  onManualLocation,
  loading
}: LocationPermissionDialogProps) {
  const [manualInput, setManualInput] = useState('');
  const [inputMode, setInputMode] = useState<'permission' | 'manual'>('permission');

  const handleRequestPermission = () => {
    onLocationGranted();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onManualLocation(manualInput.trim());
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Location for Better Matches
          </DialogTitle>
          <DialogDescription>
            We use your location to find nearby artisans who can deliver to you, 
            especially for large or fragile items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {inputMode === 'permission' ? (
            <>
              <Card className="border-blue-100 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Automatic Location</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Allow location access to automatically find artisans near you
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={handleRequestPermission}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Allow Location
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setInputMode('manual')}
                  disabled={loading}
                >
                  Enter Manually
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Your location is only used for finding nearby artisans</span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-location">Enter Your Location</Label>
                <Input
                  id="manual-location"
                  placeholder="e.g., Mumbai, Delhi, Bangalore..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Enter your city, area, or postal code
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleManualSubmit}
                  disabled={loading || !manualInput.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting Location...
                    </>
                  ) : (
                    'Set Location'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setInputMode('permission')}
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            </>
          )}

          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={loading}
              className="w-full text-gray-500"
            >
              Skip for now (show all artisans)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}