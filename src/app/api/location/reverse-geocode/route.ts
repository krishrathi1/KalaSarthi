/**
 * Reverse Geocoding API Route using Google Maps Geocoding API
 * Converts coordinates to addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

const googleMapsClient = new Client({});

interface ReverseGeocodeResponse {
  success: boolean;
  address?: {
    city: string;
    state: string;
    country: string;
    postalCode: string;
    formattedAddress: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ReverseGeocodeResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    if (!lat || !lng) {
      return NextResponse.json({
        success: false,
        error: 'Latitude and longitude are required'
      }, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid coordinates'
      }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured, using fallback reverse geocoding');
      return NextResponse.json({
        success: true,
        address: await fallbackReverseGeocode(latitude, longitude)
      });
    }

    // Use Google Maps Reverse Geocoding API
    const response = await googleMapsClient.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: apiKey,
        language: 'en' as any,
        result_type: ['locality', 'administrative_area_level_1', 'administrative_area_level_2'] as any
      }
    });

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Address not found for these coordinates'
      }, { status: 404 });
    }

    const result = response.data.results[0];
    const addressComponents = result.address_components;
    
    const address = {
      city: getAddressComponent(addressComponents, 'locality') || 
            getAddressComponent(addressComponents, 'administrative_area_level_2') || '',
      state: getAddressComponent(addressComponents, 'administrative_area_level_1') || '',
      country: getAddressComponent(addressComponents, 'country') || 'India',
      postalCode: getAddressComponent(addressComponents, 'postal_code') || '',
      formattedAddress: result.formatted_address
    };

    return NextResponse.json({
      success: true,
      address
    });

  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Reverse geocoding service temporarily unavailable'
    }, { status: 500 });
  }
}

function getAddressComponent(components: any[], type: string): string | null {
  const component = components.find(comp => comp.types.includes(type));
  return component ? component.long_name : null;
}

// Fallback reverse geocoding for development/when Google Maps API is not available
async function fallbackReverseGeocode(lat: number, lng: number) {
  // Simple approximation based on major Indian cities
  const cities = [
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 }
  ];

  // Find closest city
  let closestCity = cities[0];
  let minDistance = calculateDistance(lat, lng, closestCity.lat, closestCity.lng);

  for (const city of cities) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }

  return {
    city: closestCity.name,
    state: closestCity.state,
    country: 'India',
    postalCode: '',
    formattedAddress: `${closestCity.name}, ${closestCity.state}, India`
  };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}