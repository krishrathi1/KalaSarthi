/**
 * Geocoding API Route using Google Maps Geocoding API
 * Converts addresses to coordinates
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

const googleMapsClient = new Client({});

interface GeocodeRequest {
  address: string;
}

interface GeocodeResponse {
  success: boolean;
  location?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: {
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    accuracy: number;
    source: 'manual';
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GeocodeResponse>> {
  try {
    const body: GeocodeRequest = await request.json();
    
    if (!body.address || body.address.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Address is required'
      }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured, using fallback geocoding');
      return NextResponse.json({
        success: true,
        location: await fallbackGeocode(body.address)
      });
    }

    // Use Google Maps Geocoding API
    const response = await googleMapsClient.geocode({
      params: {
        address: body.address,
        key: apiKey,
        region: 'in', // Bias towards India
        language: 'en'
      }
    });

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Address not found'
      }, { status: 404 });
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    
    // Extract address components
    const addressComponents = result.address_components;
    const address = {
      city: getAddressComponent(addressComponents, 'locality') || 
            getAddressComponent(addressComponents, 'administrative_area_level_2') || '',
      state: getAddressComponent(addressComponents, 'administrative_area_level_1') || '',
      country: getAddressComponent(addressComponents, 'country') || 'India',
      postalCode: getAddressComponent(addressComponents, 'postal_code') || ''
    };

    return NextResponse.json({
      success: true,
      location: {
        coordinates: {
          latitude: location.lat,
          longitude: location.lng
        },
        address,
        accuracy: getLocationAccuracy(result.geometry.location_type || 'APPROXIMATE'),
        source: 'manual' as const
      }
    });

  } catch (error) {
    console.error('Error in geocoding:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Geocoding service temporarily unavailable'
    }, { status: 500 });
  }
}

function getAddressComponent(components: any[], type: string): string | null {
  const component = components.find(comp => comp.types.includes(type));
  return component ? component.long_name : null;
}

function getLocationAccuracy(locationType: string): number {
  switch (locationType) {
    case 'ROOFTOP': return 10; // 10m accuracy
    case 'RANGE_INTERPOLATED': return 50; // 50m accuracy
    case 'GEOMETRIC_CENTER': return 100; // 100m accuracy
    case 'APPROXIMATE': return 1000; // 1km accuracy
    default: return 1000;
  }
}

// Fallback geocoding for development/when Google Maps API is not available
async function fallbackGeocode(address: string) {
  const addressLower = address.toLowerCase();
  
  // Major Indian cities coordinates
  const cityCoordinates: { [key: string]: { lat: number; lng: number; state: string } } = {
    'mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
    'delhi': { lat: 28.7041, lng: 77.1025, state: 'Delhi' },
    'bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
    'hyderabad': { lat: 17.3850, lng: 78.4867, state: 'Telangana' },
    'chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
    'kolkata': { lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
    'pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
    'jaipur': { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
    'lucknow': { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
    'kanpur': { lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh' },
    'nagpur': { lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
    'indore': { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
    'thane': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
    'bhopal': { lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
    'pimpri': { lat: 18.6298, lng: 73.7997, state: 'Maharashtra' },
    'patna': { lat: 25.5941, lng: 85.1376, state: 'Bihar' },
    'vadodara': { lat: 22.3072, lng: 73.1812, state: 'Gujarat' }
  };

  // Find matching city
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (addressLower.includes(city)) {
      return {
        coordinates: {
          latitude: coords.lat,
          longitude: coords.lng
        },
        address: {
          city: city.charAt(0).toUpperCase() + city.slice(1),
          state: coords.state,
          country: 'India',
          postalCode: ''
        },
        accuracy: 5000, // 5km accuracy for fallback
        source: 'manual' as const
      };
    }
  }

  // Default to Delhi if no match found
  return {
    coordinates: {
      latitude: 28.7041,
      longitude: 77.1025
    },
    address: {
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      postalCode: ''
    },
    accuracy: 10000, // 10km accuracy for default
    source: 'manual' as const
  };
}