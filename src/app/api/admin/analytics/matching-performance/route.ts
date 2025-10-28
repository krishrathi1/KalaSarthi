/**
 * Matching Performance Analytics API
 * Provides comprehensive analytics for intelligent matching system using Google Analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAnalyticsService } from '@/lib/services/GoogleAnalyticsService';
import { GoogleCloudLoggingService } from '@/lib/services/GoogleCloudLoggingService';
import { LearningEngine } from '@/lib/services/LearningEngine';
import { BuyerInteractionHistory, MatchHistory } from '@/lib/models/IntelligentMatching';
import connectDB from '@/lib/mongodb';

interface AnalyticsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<AnalyticsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    const metric = searchParams.get('metric') || 'overview';
    
    await connectDB();
    
    const analyticsService = GoogleAnalyticsService.getInstance();
    const loggingService = GoogleCloudLoggingService.getInstance();
    const learningEngine = LearningEngine.getInstance();

    let analyticsData;

    switch (metric) {
      case 'overview':
        analyticsData = await getOverviewMetrics(timeRange, analyticsService);
        break;
        
      case 'matching':
        analyticsData = await getMatchingMetrics(timeRange, analyticsService);
        break;
        
      case 'user-behavior':
        analyticsData = await getUserBehaviorMetrics(timeRange);
        break;
        
      case 'performance':
        analyticsData = await getPerformanceMetrics(timeRange);
        break;
        
      case 'learning':
        analyticsData = await getLearningMetrics(learningEngine);
        break;
        
      case 'geographic':
        analyticsData = await getGeographicMetrics(timeRange);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid metric. Use: overview, matching, user-behavior, performance, learning, geographic'
        }, { status: 400 });
    }

    // Log analytics request
    await loggingService.logPerformance({
      operation: 'analytics_request',
      duration: 0,
      success: true,
      metadata: {
        metric,
        timeRange,
        dataPoints: Array.isArray(analyticsData) ? analyticsData.length : Object.keys(analyticsData).length
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        metric,
        timeRange,
        analytics: analyticsData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in matching performance analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve analytics data'
    }, { status: 500 });
  }
}

/**
 * Get overview metrics combining Google Analytics and database data
 */
async function getOverviewMetrics(timeRange: string, analyticsService: GoogleAnalyticsService) {
  const [gaMetrics, dbMetrics] = await Promise.all([
    analyticsService.getMatchingPerformanceAnalytics(timeRange),
    getOverviewFromDatabase(timeRange)
  ]);

  return {
    totalSearches: gaMetrics.totalSearches || dbMetrics.totalSearches,
    totalMatches: dbMetrics.totalMatches,
    averageRelevanceScore: dbMetrics.averageRelevanceScore,
    conversionRate: gaMetrics.conversionRate || dbMetrics.conversionRate,
    topCategories: gaMetrics.topPerformingCategories || dbMetrics.topCategories,
    dailyTrends: gaMetrics.dailyTrends || dbMetrics.dailyTrends,
    userEngagement: {
      activeUsers: gaMetrics.activeUsers || 0,
      averageSessionDuration: gaMetrics.averageSessionDuration || 0,
      bounceRate: gaMetrics.bounceRate || 0
    }
  };
}

/**
 * Get matching-specific metrics
 */
async function getMatchingMetrics(timeRange: string, analyticsService: GoogleAnalyticsService) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    case '90d': startDate.setDate(endDate.getDate() - 90); break;
    default: startDate.setDate(endDate.getDate() - 7);
  }

  // Get matching data from database
  const matchingData = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        averageResults: { $avg: '$searchMetadata.resultsCount' },
        averageRelevanceScore: { $avg: '$results.relevanceScore.overall' },
        averageSearchTime: { $avg: '$searchMetadata.searchTime' },
        locationUsage: {
          $sum: {
            $cond: [{ $ne: ['$searchMetadata.userLocation', null] }, 1, 0]
          }
        }
      }
    }
  ]);

  const data = matchingData[0] || {};

  // Get filter usage statistics
  const filterStats = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$filters.maxDistance',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Get category performance
  const categoryStats = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $unwind: '$requirementAnalysis.extractedCriteria.productType'
    },
    {
      $group: {
        _id: '$requirementAnalysis.extractedCriteria.productType',
        searchCount: { $sum: 1 },
        averageRelevanceScore: { $avg: '$results.relevanceScore.overall' },
        averageResults: { $avg: '$searchMetadata.resultsCount' }
      }
    },
    {
      $sort: { searchCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  return {
    searchMetrics: {
      totalSearches: data.totalSearches || 0,
      averageResultsPerSearch: Math.round((data.averageResults || 0) * 100) / 100,
      averageRelevanceScore: Math.round((data.averageRelevanceScore || 0) * 100) / 100,
      averageSearchTime: Math.round((data.averageSearchTime || 0) * 100) / 100,
      locationUsageRate: data.totalSearches > 0 ? (data.locationUsage / data.totalSearches) : 0
    },
    filterUsage: filterStats.map(stat => ({
      distance: stat._id || 'No limit',
      usage: stat.count
    })),
    categoryPerformance: categoryStats.map(stat => ({
      category: stat._id,
      searchCount: stat.searchCount,
      averageRelevanceScore: Math.round(stat.averageRelevanceScore * 100) / 100,
      averageResults: Math.round(stat.averageResults * 100) / 100
    }))
  };
}

/**
 * Get user behavior metrics
 */
async function getUserBehaviorMetrics(timeRange: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    case '90d': startDate.setDate(endDate.getDate() - 90); break;
    default: startDate.setDate(endDate.getDate() - 7);
  }

  // Get interaction patterns
  const interactionData = await BuyerInteractionHistory.aggregate([
    {
      $match: {
        'interactions.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $unwind: '$interactions'
    },
    {
      $match: {
        'interactions.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$interactions.action',
        count: { $sum: 1 },
        averageRelevanceScore: { $avg: '$interactions.relevanceScore' }
      }
    }
  ]);

  // Get user engagement metrics
  const engagementData = await BuyerInteractionHistory.aggregate([
    {
      $match: {
        updatedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        averageInteractions: { $avg: { $size: '$interactions' } },
        averageContactRate: { $avg: '$successMetrics.contactRate' },
        averageHireRate: { $avg: '$successMetrics.hireRate' },
        averageSatisfactionScore: { $avg: '$successMetrics.satisfactionScore' }
      }
    }
  ]);

  const engagement = engagementData[0] || {};

  return {
    interactionBreakdown: interactionData.map(item => ({
      action: item._id,
      count: item.count,
      averageRelevanceScore: Math.round(item.averageRelevanceScore * 100) / 100
    })),
    userEngagement: {
      totalActiveUsers: engagement.totalUsers || 0,
      averageInteractionsPerUser: Math.round((engagement.averageInteractions || 0) * 100) / 100,
      averageContactRate: Math.round((engagement.averageContactRate || 0) * 100) / 100,
      averageHireRate: Math.round((engagement.averageHireRate || 0) * 100) / 100,
      averageSatisfactionScore: Math.round((engagement.averageSatisfactionScore || 0) * 100) / 100
    }
  };
}

/**
 * Get system performance metrics
 */
async function getPerformanceMetrics(timeRange: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    default: startDate.setDate(endDate.getDate() - 7);
  }

  // Get performance data from match history
  const performanceData = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$searchMetadata.timestamp'
          }
        },
        averageSearchTime: { $avg: '$searchMetadata.searchTime' },
        searchCount: { $sum: 1 },
        averageResults: { $avg: '$searchMetadata.resultsCount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return {
    dailyPerformance: performanceData.map(day => ({
      date: day._id,
      averageSearchTime: Math.round(day.averageSearchTime * 100) / 100,
      searchCount: day.searchCount,
      averageResults: Math.round(day.averageResults * 100) / 100
    })),
    overallMetrics: {
      averageSearchTime: performanceData.length > 0 
        ? Math.round((performanceData.reduce((sum, day) => sum + day.averageSearchTime, 0) / performanceData.length) * 100) / 100
        : 0,
      totalSearches: performanceData.reduce((sum, day) => sum + day.searchCount, 0)
    }
  };
}

/**
 * Get learning system metrics
 */
async function getLearningMetrics(learningEngine: LearningEngine) {
  const learningStats = await learningEngine.getLearningStats();
  
  // Get learning effectiveness data
  const effectivenessData = await BuyerInteractionHistory.aggregate([
    {
      $match: {
        'interactions.5': { $exists: true } // Users with at least 5 interactions
      }
    },
    {
      $project: {
        buyerId: 1,
        totalInteractions: { $size: '$interactions' },
        successRate: '$successMetrics.contactRate',
        improvementRate: {
          $subtract: [
            '$successMetrics.contactRate',
            { $divide: [1, { $size: '$interactions' }] } // Baseline success rate
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageImprovement: { $avg: '$improvementRate' },
        usersWithImprovement: {
          $sum: {
            $cond: [{ $gt: ['$improvementRate', 0] }, 1, 0]
          }
        },
        totalEligibleUsers: { $sum: 1 }
      }
    }
  ]);

  const effectiveness = effectivenessData[0] || {};

  return {
    learningStats,
    effectiveness: {
      averageImprovement: Math.round((effectiveness.averageImprovement || 0) * 100) / 100,
      improvementRate: effectiveness.totalEligibleUsers > 0 
        ? effectiveness.usersWithImprovement / effectiveness.totalEligibleUsers 
        : 0,
      eligibleUsers: effectiveness.totalEligibleUsers || 0
    }
  };
}

/**
 * Get geographic distribution metrics
 */
async function getGeographicMetrics(timeRange: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    default: startDate.setDate(endDate.getDate() - 7);
  }

  // Get geographic distribution from match history
  const geoData = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        },
        'searchMetadata.userLocation': { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          city: '$searchMetadata.userLocation.address.city',
          state: '$searchMetadata.userLocation.address.state'
        },
        searchCount: { $sum: 1 },
        averageResults: { $avg: '$searchMetadata.resultsCount' },
        averageRelevanceScore: { $avg: '$results.relevanceScore.overall' }
      }
    },
    {
      $sort: { searchCount: -1 }
    },
    {
      $limit: 20
    }
  ]);

  return {
    topLocations: geoData.map(location => ({
      city: location._id.city || 'Unknown',
      state: location._id.state || 'Unknown',
      searchCount: location.searchCount,
      averageResults: Math.round(location.averageResults * 100) / 100,
      averageRelevanceScore: Math.round(location.averageRelevanceScore * 100) / 100
    }))
  };
}

/**
 * Get overview metrics from database
 */
async function getOverviewFromDatabase(timeRange: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    default: startDate.setDate(endDate.getDate() - 7);
  }

  const overviewData = await MatchHistory.aggregate([
    {
      $match: {
        'searchMetadata.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        totalMatches: { $sum: '$searchMetadata.resultsCount' },
        averageRelevanceScore: { $avg: '$results.relevanceScore.overall' }
      }
    }
  ]);

  const data = overviewData[0] || {};
  
  return {
    totalSearches: data.totalSearches || 0,
    totalMatches: data.totalMatches || 0,
    averageRelevanceScore: Math.round((data.averageRelevanceScore || 0) * 100) / 100,
    conversionRate: 0, // Would need interaction data to calculate
    topCategories: [],
    dailyTrends: []
  };
}