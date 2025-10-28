/**
 * IP-based Location API Route
 * Provides approximate location based on IP address as fallback
 */

import { NextRequest, NextResponse } from 'next/server';

interface IPLocationResponse {
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    city: string;
    state: string;
    country: string;
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<IPLocationResponse>> {
  try {
    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';
    
    // For development/localhost, return Delhi coordinates
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({
        success: true,
        coordinates: {
          latitude: 28.7041,
          longitude: 77.1025
        },
        address: {
          city: 'Delhi',
          state: 'Delhi',
          country: 'India'
        }
      });
    }

    // Try to use a free IP geolocation service
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success') {
          return NextResponse.json({
            success: true,
            coordinates: {
              latitude: data.lat,
              longitude: data.lon
            },
            address: {
              city: data.city || 'Unknown',
              state: data.regionName || 'Unknown',
              country: data.country || 'India'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching IP location:', error);
    }

    // Fallback to major Indian cities based on common IP ranges (simplified)
    const fallbackLocation = getFallbackLocationByIP(ip);
    
    return NextResponse.json({
      success: true,
      coordinates: fallbackLocation.coordinates,
      address: fallbackLocation.address
    });

  } catch (error) {
    console.error('Error in IP location service:', error);
    
    return NextResponse.json({
      success: false,
      error: 'IP location service temporarily unavailable'
    }, { status: 500 });
  }
}

function getFallbackLocationByIP(ip: string) {
  // Very simplified IP-to-location mapping for Indian cities
  // In production, you'd use a proper IP geolocation database
  
  const ipNum = ipToNumber(ip);
  
  // Simplified ranges for major Indian cities (not accurate, just for demo)
  const cityRanges = [
    { min: 0, max: 1000000000, city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { min: 1000000001, max: 2000000000, city: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { min: 2000000001, max: 3000000000, city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { min: 3000000001, max: 4000000000, city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { min: 4000000001, max: 4294967295, city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 }
  ];
  
  for (const range of cityRanges) {
    if (ipNum >= range.min && ipNum <= range.max) {
      return {
        coordinates: {
          latitude: range.lat,
          longitude: range.lng
        },
        address: {
          city: range.city,
          state: range.state,
          country: 'India'
        }
      };
    }
  }
  
  // Default to Delhi
  return {
    coordinates: {
      latitude: 28.7041,
      longitude: 77.1025
    },
    address: {
      city: 'Delhi',
      state: 'Delhi',
      country: 'India'
    }
  };
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  
  return (
    (parseInt(parts[0]) << 24) +
    (parseInt(parts[1]) << 16) +
    (parseInt(parts[2]) << 8) +
    parseInt(parts[3])
  ) >>> 0; // Convert to unsigned 32-bit integer
}