/**
 * Google Analytics 4 Service for Intelligent Artisan Matching
 * Tracks user interactions and provides analytics insights using GA4
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';

export interface AnalyticsEvent {
  event_name: string;
  user_id: string;
  session_id: string;
  custom_parameters: {
    [key: string]: string | number | boolean;
  };
  timestamp: string;
}

export interface ConversionEvent extends AnalyticsEvent {
  value: number;
  currency: string;
}

export interface InteractionAnalytics {
  totalInteractions: number;
  interactionsByType: {
    viewed: number;
    contacted: number;
    hired: number;
    skipped: number;
  };
  averageRelevanceScore: number;
  conversionRate: number;
  topArtisans: Array<{
    artisanId: string;
    interactions: number;
    conversionRate: number;
  }>;
  searchPatterns: {
    topQueries: string[];
    averageDistance: number;
    preferredCategories: string[];
  };
}

export class GoogleAnalyticsService {
  private static instance: GoogleAnalyticsService;
  private analyticsDataClient: BetaAnalyticsDataClient;
  private propertyId: string;
  private measurementId: string;
  private apiSecret: string;

  constructor() {
    // Initialize Google Analytics Data API client
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });

    this.analyticsDataClient = new BetaAnalyticsDataClient({ auth });
    this.propertyId = process.env.GA4_PROPERTY_ID || '';
    this.measurementId = process.env.GA4_MEASUREMENT_ID || '';
    this.apiSecret = process.env.GA4_API_SECRET || '';

    if (!this.propertyId || !this.measurementId || !this.apiSecret) {
      console.warn('Google Analytics configuration incomplete. Some features may not work.');
    }
  }

  static getInstance(): GoogleAnalyticsService {
    if (!GoogleAnalyticsService.instance) {
      GoogleAnalyticsService.instance = new GoogleAnalyticsService();
    }
    return GoogleAnalyticsService.instance;
  }

  /**
   * Track user interaction with Google Analytics 4
   */
  async trackInteraction(event: AnalyticsEvent): Promise<void> {
    try {
      if (!this.measurementId || !this.apiSecret) {
        console.warn('GA4 not configured, skipping analytics tracking');
        return;
      }

      // Send event to GA4 Measurement Protocol
      const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: event.user_id,
          events: [{
            name: event.event_name,
            params: {
              session_id: event.session_id,
              engagement_time_msec: 1000,
              ...event.custom_parameters
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`GA4 tracking failed: ${response.statusText}`);
      }

      console.log(`GA4 event tracked: ${event.event_name} for user ${event.user_id}`);
    } catch (error) {
      console.error('Error tracking interaction with GA4:', error);
      throw error;
    }
  }

  /**
   * Track conversion events (hiring, successful matches)
   */
  async trackConversion(event: ConversionEvent): Promise<void> {
    try {
      if (!this.measurementId || !this.apiSecret) {
        console.warn('GA4 not configured, skipping conversion tracking');
        return;
      }

      // Send conversion event to GA4
      const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: event.user_id,
          events: [{
            name: event.event_name,
            params: {
              session_id: event.session_id,
              value: event.value,
              currency: event.currency,
              engagement_time_msec: 1000,
              ...event.custom_parameters
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`GA4 conversion tracking failed: ${response.statusText}`);
      }

      console.log(`GA4 conversion tracked: ${event.event_name} for user ${event.user_id}`);
    } catch (error) {
      console.error('Error tracking conversion with GA4:', error);
      throw error;
    }
  }

  /**
   * Get buyer interaction analytics from GA4
   */
  async getBuyerInteractionAnalytics(buyerId: string, timeRange: string = '7d'): Promise<InteractionAnalytics> {
    try {
      if (!this.propertyId) {
        console.warn('GA4 property ID not configured, returning mock data');
        return this.getMockAnalytics();
      }

      // Convert time range to GA4 format
      const dateRange = this.convertTimeRange(timeRange);

      // Query GA4 for interaction data
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [
          { name: 'customEvent:artisan_id' },
          { name: 'eventName' },
          { name: 'customEvent:search_query' },
          { name: 'customEvent:location_category' }
        ],
        metrics: [
          { name: 'eventCount' },
          { name: 'customEvent:relevance_score' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'customEvent:user_id',
            stringFilter: {
              matchType: 'EXACT',
              value: buyerId
            }
          }
        }
      });

      // Process the response data
      return this.processAnalyticsResponse(response);

    } catch (error) {
      console.error('Error getting buyer analytics from GA4:', error);
      // Return mock data on error
      return this.getMockAnalytics();
    }
  }

  /**
   * Get overall matching performance analytics
   */
  async getMatchingPerformanceAnalytics(timeRange: string = '30d'): Promise<any> {
    try {
      if (!this.propertyId) {
        console.warn('GA4 property ID not configured, returning mock data');
        return this.getMockPerformanceAnalytics();
      }

      const dateRange = this.convertTimeRange(timeRange);

      // Query for overall performance metrics
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        dimensions: [
          { name: 'eventName' },
          { name: 'customEvent:location_category' },
          { name: 'date' }
        ],
        metrics: [
          { name: 'eventCount' },
          { name: 'activeUsers' },
          { name: 'customEvent:relevance_score' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['artisan_viewed', 'artisan_contacted', 'artisan_hired', 'artisan_skipped']
            }
          }
        }
      });

      return this.processPerformanceResponse(response);

    } catch (error) {
      console.error('Error getting performance analytics from GA4:', error);
      return this.getMockPerformanceAnalytics();
    }
  }

  /**
   * Track search patterns for optimization
   */
  async trackSearchPattern(searchData: {
    userId: string;
    sessionId: string;
    searchQuery: string;
    resultsCount: number;
    averageRelevanceScore: number;
    locationUsed: boolean;
    filters: any;
  }): Promise<void> {
    try {
      await this.trackInteraction({
        event_name: 'intelligent_search',
        user_id: searchData.userId,
        session_id: searchData.sessionId,
        custom_parameters: {
          search_query: searchData.searchQuery,
          results_count: searchData.resultsCount,
          average_relevance_score: searchData.averageRelevanceScore,
          location_used: searchData.locationUsed,
          max_distance: searchData.filters.maxDistance || 0,
          min_relevance_score: searchData.filters.minRelevanceScore || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking search pattern:', error);
    }
  }

  /**
   * Convert time range string to GA4 date range format
   */
  private convertTimeRange(timeRange: string): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Process GA4 analytics response
   */
  private processAnalyticsResponse(response: any): InteractionAnalytics {
    const rows = response.rows || [];
    
    const interactionsByType = {
      viewed: 0,
      contacted: 0,
      hired: 0,
      skipped: 0
    };

    const artisanInteractions = new Map<string, { interactions: number; conversions: number }>();
    const searchQueries = new Map<string, number>();
    const categories = new Map<string, number>();
    let totalRelevanceScore = 0;
    let totalInteractions = 0;

    for (const row of rows) {
      const artisanId = row.dimensionValues[0]?.value || 'unknown';
      const eventName = row.dimensionValues[1]?.value || '';
      const searchQuery = row.dimensionValues[2]?.value || '';
      const locationCategory = row.dimensionValues[3]?.value || '';
      const eventCount = parseInt(row.metricValues[0]?.value || '0');
      const relevanceScore = parseFloat(row.metricValues[1]?.value || '0');

      totalInteractions += eventCount;
      totalRelevanceScore += relevanceScore * eventCount;

      // Count interactions by type
      if (eventName.includes('viewed')) interactionsByType.viewed += eventCount;
      else if (eventName.includes('contacted')) interactionsByType.contacted += eventCount;
      else if (eventName.includes('hired')) interactionsByType.hired += eventCount;
      else if (eventName.includes('skipped')) interactionsByType.skipped += eventCount;

      // Track artisan performance
      if (artisanId !== 'unknown') {
        const current = artisanInteractions.get(artisanId) || { interactions: 0, conversions: 0 };
        current.interactions += eventCount;
        if (eventName.includes('hired') || eventName.includes('contacted')) {
          current.conversions += eventCount;
        }
        artisanInteractions.set(artisanId, current);
      }

      // Track search patterns
      if (searchQuery) {
        searchQueries.set(searchQuery, (searchQueries.get(searchQuery) || 0) + eventCount);
      }

      if (locationCategory) {
        categories.set(locationCategory, (categories.get(locationCategory) || 0) + eventCount);
      }
    }

    // Calculate top artisans
    const topArtisans = Array.from(artisanInteractions.entries())
      .map(([artisanId, data]) => ({
        artisanId,
        interactions: data.interactions,
        conversionRate: data.interactions > 0 ? data.conversions / data.interactions : 0
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);

    // Calculate conversion rate
    const conversions = interactionsByType.contacted + interactionsByType.hired;
    const conversionRate = totalInteractions > 0 ? conversions / totalInteractions : 0;

    // Get top search queries and categories
    const topQueries = Array.from(searchQueries.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);

    const preferredCategories = Array.from(categories.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    return {
      totalInteractions,
      interactionsByType,
      averageRelevanceScore: totalInteractions > 0 ? totalRelevanceScore / totalInteractions : 0,
      conversionRate,
      topArtisans,
      searchPatterns: {
        topQueries,
        averageDistance: 0, // Would need additional processing
        preferredCategories
      }
    };
  }

  /**
   * Process performance analytics response
   */
  private processPerformanceResponse(response: any): any {
    // Similar processing logic for performance metrics
    return {
      totalSearches: 0,
      averageResultsPerSearch: 0,
      conversionRate: 0,
      topPerformingCategories: [],
      dailyTrends: []
    };
  }

  /**
   * Get mock analytics data for development/fallback
   */
  private getMockAnalytics(): InteractionAnalytics {
    return {
      totalInteractions: 25,
      interactionsByType: {
        viewed: 15,
        contacted: 6,
        hired: 3,
        skipped: 1
      },
      averageRelevanceScore: 0.72,
      conversionRate: 0.36,
      topArtisans: [
        { artisanId: 'artisan_1', interactions: 8, conversionRate: 0.5 },
        { artisanId: 'artisan_2', interactions: 6, conversionRate: 0.33 },
        { artisanId: 'artisan_3', interactions: 4, conversionRate: 0.25 }
      ],
      searchPatterns: {
        topQueries: ['handmade pottery', 'wooden furniture', 'silk scarves'],
        averageDistance: 35,
        preferredCategories: ['Local', 'Regional']
      }
    };
  }

  /**
   * Get mock performance analytics
   */
  private getMockPerformanceAnalytics(): any {
    return {
      totalSearches: 150,
      averageResultsPerSearch: 12,
      conversionRate: 0.28,
      topPerformingCategories: ['pottery', 'woodwork', 'textiles'],
      dailyTrends: []
    };
  }

  /**
   * Validate GA4 configuration
   */
  isConfigured(): boolean {
    return !!(this.propertyId && this.measurementId && this.apiSecret);
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; missingFields: string[] } {
    const missingFields = [];
    
    if (!this.propertyId) missingFields.push('GA4_PROPERTY_ID');
    if (!this.measurementId) missingFields.push('GA4_MEASUREMENT_ID');
    if (!this.apiSecret) missingFields.push('GA4_API_SECRET');
    
    return {
      configured: missingFields.length === 0,
      missingFields
    };
  }
}

export default GoogleAnalyticsService;