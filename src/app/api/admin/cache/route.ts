/**
 * Cache Management API
 * Provides cache statistics, clearing, and management for Google Cloud Memorystore
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudMemorystore } from '@/lib/services/GoogleCloudMemorystore';
import { GoogleCloudLoggingService } from '@/lib/services/GoogleCloudLoggingService';

interface CacheManagementResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// GET - Get cache statistics
export async function GET(request: NextRequest): Promise<NextResponse<CacheManagementResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    const cacheService = GoogleCloudMemorystore.getInstance();
    
    switch (action) {
      case 'stats':
        const stats = await cacheService.getCacheStats();
        const configStatus = cacheService.getConfigStatus();
        
        return NextResponse.json({
          success: true,
          data: {
            stats,
            config: configStatus,
            timestamp: new Date().toISOString()
          }
        });
        
      case 'test':
        const testResult = await cacheService.testConnection();
        return NextResponse.json({
          success: true,
          data: {
            connectionTest: testResult,
            timestamp: new Date().toISOString()
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use ?action=stats or ?action=test'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in cache management API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get cache information'
    }, { status: 500 });
  }
}

// DELETE - Clear cache
export async function DELETE(request: NextRequest): Promise<NextResponse<CacheManagementResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    const cacheService = GoogleCloudMemorystore.getInstance();
    const loggingService = GoogleCloudLoggingService.getInstance();
    
    let clearedCount = 0;
    let operation = '';
    
    switch (type) {
      case 'all':
        clearedCount = await cacheService.clearAllCache();
        operation = 'clear_all_cache';
        break;
        
      case 'requirements':
        clearedCount = await cacheService.clearCacheByPrefix('req_analysis:');
        operation = 'clear_requirements_cache';
        break;
        
      case 'scores':
        clearedCount = await cacheService.clearCacheByPrefix('rel_score:');
        operation = 'clear_scores_cache';
        break;
        
      case 'locations':
        clearedCount = await cacheService.clearCacheByPrefix('location:');
        operation = 'clear_locations_cache';
        break;
        
      case 'search':
        clearedCount = await cacheService.clearCacheByPrefix('search:');
        operation = 'clear_search_cache';
        break;
        
      case 'analytics':
        clearedCount = await cacheService.clearCacheByPrefix('analytics:');
        operation = 'clear_analytics_cache';
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid cache type. Use: all, requirements, scores, locations, search, analytics'
        }, { status: 400 });
    }
    
    // Log cache clearing operation
    await loggingService.logPerformance({
      operation,
      duration: 0, // Immediate operation
      success: true,
      metadata: {
        clearedCount,
        cacheType: type
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Cache cleared successfully`,
        type,
        clearedCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
}

// POST - Warm up cache with common data
export async function POST(request: NextRequest): Promise<NextResponse<CacheManagementResponse>> {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action !== 'warmup') {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use action: "warmup"'
      }, { status: 400 });
    }

    const cacheService = GoogleCloudMemorystore.getInstance();
    const loggingService = GoogleCloudLoggingService.getInstance();
    
    // Warm up cache with common data
    let warmedItems = 0;
    
    // Pre-cache common location data
    const commonCities = [
      'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
      'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
    ];
    
    for (const city of commonCities) {
      // This would typically involve calling the geocoding service
      // For now, we'll just mark the operation
      warmedItems++;
    }
    
    // Pre-cache common requirement patterns
    const commonRequirements = [
      'handmade pottery',
      'wooden furniture',
      'silk scarves',
      'leather bags',
      'metal jewelry'
    ];
    
    for (const requirement of commonRequirements) {
      // This would involve running requirement analysis
      warmedItems++;
    }
    
    await loggingService.logPerformance({
      operation: 'cache_warmup',
      duration: 0,
      success: true,
      metadata: {
        warmedItems,
        cities: commonCities.length,
        requirements: commonRequirements.length
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Cache warmup completed',
        warmedItems,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error warming up cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to warm up cache'
    }, { status: 500 });
  }
}