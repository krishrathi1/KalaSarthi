/**
 * Application Link Service
 * Generates direct application links for schemes, URL shortening for SMS compatibility,
 * and click tracking with conversion analytics
 */

import { 
  GovernmentScheme, 
  ArtisanProfile 
} from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';
import { 
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface ApplicationLink {
  id: string;
  originalUrl: string;
  shortUrl: string;
  schemeId: string;
  userId: string;
  channel: 'whatsapp' | 'sms' | 'email';
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata: {
    campaign: string;
    source: string;
    medium: string;
    utmParams: Record<string, string>;
  };
}

export interface LinkClick {
  id?: string;
  linkId: string;
  schemeId: string;
  userId: string;
  clickedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  deviceInfo?: {
    type: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
  };
}

export interface ConversionEvent {
  id?: string;
  linkId: string;
  schemeId: string;
  userId: string;
  eventType: 'application_started' | 'application_submitted' | 'application_approved' | 'application_rejected';
  eventData?: Record<string, any>;
  occurredAt: Date;
}

export interface LinkAnalytics {
  linkId: string;
  schemeId: string;
  totalClicks: number;
  uniqueClicks: number;
  conversionRate: number;
  clicksByChannel: Record<string, number>;
  clicksByDay: Array<{ date: string; clicks: number }>;
  topLocations: Array<{ location: string; clicks: number }>;
  deviceBreakdown: Record<string, number>;
  conversionFunnel: {
    clicks: number;
    applicationsStarted: number;
    applicationsSubmitted: number;
    applicationsApproved: number;
  };
}

export interface URLShortenerConfig {
  baseUrl: string;
  customDomain?: string;
  defaultExpiration: number; // days
  maxUrlLength: number;
  enableAnalytics: boolean;
}

/**
 * Service for managing application links with tracking and analytics
 */
export class ApplicationLinkService {
  private logger: ReturnType<typeof getGupshupLogger>;
  private config: URLShortenerConfig;
  private linkCache: Map<string, ApplicationLink> = new Map();

  constructor(config?: Partial<URLShortenerConfig>) {
    this.logger = getGupshupLogger();
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://artisan-buddy.com',
      customDomain: process.env.SHORT_URL_DOMAIN,
      defaultExpiration: 30, // 30 days
      maxUrlLength: 2048,
      enableAnalytics: true,
      ...config
    };
  }

  /**
   * Generate application link for a scheme and user
   */
  async generateApplicationLink(
    scheme: GovernmentScheme,
    user: ArtisanProfile,
    channel: 'whatsapp' | 'sms' | 'email',
    options?: {
      campaign?: string;
      source?: string;
      medium?: string;
      expirationDays?: number;
      customParams?: Record<string, string>;
    }
  ): Promise<ApplicationLink> {
    try {
      this.logger.info('link_generation_start', 'Generating application link', {
        schemeId: scheme.id,
        userId: user.id,
        channel
      });

      // Build original URL with tracking parameters
      const originalUrl = this.buildOriginalUrl(scheme, user, channel, options);
      
      // Generate short URL
      const shortUrl = await this.createShortUrl(originalUrl, scheme.id, user.id);
      
      // Create link record
      const applicationLink: ApplicationLink = {
        id: this.generateLinkId(),
        originalUrl,
        shortUrl,
        schemeId: scheme.id,
        userId: user.id,
        channel,
        createdAt: new Date(),
        expiresAt: options?.expirationDays 
          ? new Date(Date.now() + (options.expirationDays * 24 * 60 * 60 * 1000))
          : new Date(Date.now() + (this.config.defaultExpiration * 24 * 60 * 60 * 1000)),
        isActive: true,
        metadata: {
          campaign: options?.campaign || 'scheme_alert',
          source: options?.source || 'notification',
          medium: options?.medium || channel,
          utmParams: this.buildUTMParams(scheme, user, channel, options)
        }
      };

      // Save to database
      await this.saveApplicationLink(applicationLink);
      
      // Cache for quick access
      this.linkCache.set(applicationLink.id, applicationLink);

      this.logger.info('link_generation_success', 'Successfully generated application link', {
        linkId: applicationLink.id,
        shortUrl: applicationLink.shortUrl,
        schemeId: scheme.id,
        userId: user.id
      });

      return applicationLink;
    } catch (error) {
      this.logger.error('link_generation_error', 'Failed to generate application link', {
        schemeId: scheme.id,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate batch application links for multiple users
   */
  async generateBatchApplicationLinks(
    scheme: GovernmentScheme,
    users: ArtisanProfile[],
    channel: 'whatsapp' | 'sms' | 'email',
    options?: {
      campaign?: string;
      source?: string;
      medium?: string;
      expirationDays?: number;
    }
  ): Promise<Map<string, ApplicationLink>> {
    const links = new Map<string, ApplicationLink>();
    
    this.logger.info('batch_link_generation_start', 'Starting batch link generation', {
      schemeId: scheme.id,
      userCount: users.length,
      channel
    });

    const batchPromises = users.map(async (user) => {
      try {
        const link = await this.generateApplicationLink(scheme, user, channel, options);
        links.set(user.id, link);
      } catch (error) {
        this.logger.error('batch_link_generation_user_error', 'Failed to generate link for user', {
          userId: user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.all(batchPromises);

    this.logger.info('batch_link_generation_complete', 'Completed batch link generation', {
      schemeId: scheme.id,
      successfulLinks: links.size,
      totalUsers: users.length
    });

    return links;
  }

  /**
   * Track link click
   */
  async trackLinkClick(
    linkId: string,
    clickData?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      // Get link from cache or database
      let link = this.linkCache.get(linkId);
      if (!link) {
        link = await this.getApplicationLinkById(linkId);
        if (!link) {
          throw new Error('Link not found');
        }
      }

      // Check if link is still active and not expired
      if (!link.isActive || (link.expiresAt && link.expiresAt < new Date())) {
        this.logger.warn('link_click_expired', 'Attempted to click expired or inactive link', {
          linkId,
          isActive: link.isActive,
          expiresAt: link.expiresAt
        });
        return;
      }

      // Create click record
      const linkClick: LinkClick = {
        linkId,
        schemeId: link.schemeId,
        userId: link.userId,
        clickedAt: new Date(),
        ipAddress: clickData?.ipAddress,
        userAgent: clickData?.userAgent,
        referrer: clickData?.referrer,
        deviceInfo: this.parseDeviceInfo(clickData?.userAgent),
        location: await this.getLocationFromIP(clickData?.ipAddress)
      };

      // Save click record
      await this.saveLinkClick(linkClick);

      this.logger.info('link_click_tracked', 'Successfully tracked link click', {
        linkId,
        schemeId: link.schemeId,
        userId: link.userId
      });
    } catch (error) {
      this.logger.error('link_click_tracking_error', 'Failed to track link click', {
        linkId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Track conversion event
   */
  async trackConversionEvent(
    linkId: string,
    eventType: ConversionEvent['eventType'],
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      const link = this.linkCache.get(linkId) || await this.getApplicationLinkById(linkId);
      if (!link) {
        throw new Error('Link not found');
      }

      const conversionEvent: ConversionEvent = {
        linkId,
        schemeId: link.schemeId,
        userId: link.userId,
        eventType,
        eventData,
        occurredAt: new Date()
      };

      await this.saveConversionEvent(conversionEvent);

      this.logger.info('conversion_tracked', 'Successfully tracked conversion event', {
        linkId,
        eventType,
        schemeId: link.schemeId,
        userId: link.userId
      });
    } catch (error) {
      this.logger.error('conversion_tracking_error', 'Failed to track conversion event', {
        linkId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get link analytics
   */
  async getLinkAnalytics(
    linkId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<LinkAnalytics> {
    try {
      const link = await this.getApplicationLinkById(linkId);
      if (!link) {
        throw new Error('Link not found');
      }

      // Get clicks data
      const clicks = await this.getLinkClicks(linkId, dateRange);
      const conversions = await this.getLinkConversions(linkId, dateRange);

      // Calculate analytics
      const totalClicks = clicks.length;
      const uniqueClicks = new Set(clicks.map(c => c.userId)).size;
      
      const clicksByChannel = clicks.reduce((acc, click) => {
        const channel = link.channel;
        acc[channel] = (acc[channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const clicksByDay = this.groupClicksByDay(clicks);
      const topLocations = this.getTopLocations(clicks);
      const deviceBreakdown = this.getDeviceBreakdown(clicks);
      
      const conversionFunnel = this.calculateConversionFunnel(clicks, conversions);
      const conversionRate = totalClicks > 0 
        ? (conversionFunnel.applicationsSubmitted / totalClicks) * 100 
        : 0;

      return {
        linkId,
        schemeId: link.schemeId,
        totalClicks,
        uniqueClicks,
        conversionRate,
        clicksByChannel,
        clicksByDay,
        topLocations,
        deviceBreakdown,
        conversionFunnel
      };
    } catch (error) {
      this.logger.error('analytics_error', 'Failed to get link analytics', {
        linkId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get scheme-wide analytics
   */
  async getSchemeAnalytics(
    schemeId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalLinks: number;
    totalClicks: number;
    uniqueUsers: number;
    conversionRate: number;
    clicksByChannel: Record<string, number>;
    topPerformingLinks: Array<{ linkId: string; clicks: number; conversions: number }>;
  }> {
    try {
      // Get all links for the scheme
      const links = await this.getSchemeLinks(schemeId, dateRange);
      
      // Aggregate analytics across all links
      let totalClicks = 0;
      const uniqueUsers = new Set<string>();
      const clicksByChannel: Record<string, number> = {};
      const linkPerformance: Array<{ linkId: string; clicks: number; conversions: number }> = [];

      for (const link of links) {
        const analytics = await this.getLinkAnalytics(link.id, dateRange);
        totalClicks += analytics.totalClicks;
        
        // Add unique users
        const linkClicks = await this.getLinkClicks(link.id, dateRange);
        linkClicks.forEach(click => uniqueUsers.add(click.userId));
        
        // Aggregate channel data
        Object.entries(analytics.clicksByChannel).forEach(([channel, count]) => {
          clicksByChannel[channel] = (clicksByChannel[channel] || 0) + count;
        });
        
        // Track link performance
        linkPerformance.push({
          linkId: link.id,
          clicks: analytics.totalClicks,
          conversions: analytics.conversionFunnel.applicationsSubmitted
        });
      }

      // Calculate overall conversion rate
      const totalConversions = linkPerformance.reduce((sum, lp) => sum + lp.conversions, 0);
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Sort links by performance
      const topPerformingLinks = linkPerformance
        .sort((a, b) => (b.clicks + b.conversions * 2) - (a.clicks + a.conversions * 2))
        .slice(0, 10);

      return {
        totalLinks: links.length,
        totalClicks,
        uniqueUsers: uniqueUsers.size,
        conversionRate,
        clicksByChannel,
        topPerformingLinks
      };
    } catch (error) {
      this.logger.error('scheme_analytics_error', 'Failed to get scheme analytics', {
        schemeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Build original URL with tracking parameters
   */
  private buildOriginalUrl(
    scheme: GovernmentScheme,
    user: ArtisanProfile,
    channel: string,
    options?: {
      campaign?: string;
      source?: string;
      medium?: string;
      customParams?: Record<string, string>;
    }
  ): string {
    const baseUrl = scheme.application.applicationUrl || 
                   `${this.config.baseUrl}/schemes/${scheme.id}/apply`;
    
    const url = new URL(baseUrl);
    
    // Add UTM parameters
    const utmParams = this.buildUTMParams(scheme, user, channel, options);
    Object.entries(utmParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // Add custom parameters
    if (options?.customParams) {
      Object.entries(options.customParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    // Add user context for pre-filling
    url.searchParams.set('user_id', user.id);
    url.searchParams.set('prefill', 'true');
    
    return url.toString();
  }

  /**
   * Build UTM parameters for tracking
   */
  private buildUTMParams(
    scheme: GovernmentScheme,
    user: ArtisanProfile,
    channel: string,
    options?: {
      campaign?: string;
      source?: string;
      medium?: string;
    }
  ): Record<string, string> {
    return {
      utm_source: options?.source || 'artisan_buddy',
      utm_medium: options?.medium || channel,
      utm_campaign: options?.campaign || `scheme_${scheme.id}`,
      utm_content: `${scheme.category}_${user.business.type}`,
      utm_term: scheme.title.toLowerCase().replace(/\s+/g, '_')
    };
  }

  /**
   * Create short URL
   */
  private async createShortUrl(originalUrl: string, schemeId: string, userId: string): Promise<string> {
    // Generate short code
    const shortCode = this.generateShortCode();
    
    // Use custom domain if available, otherwise use base URL
    const domain = this.config.customDomain || this.config.baseUrl;
    const shortUrl = `${domain}/s/${shortCode}`;
    
    return shortUrl;
  }

  /**
   * Generate unique short code
   */
  private generateShortCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate unique link ID
   */
  private generateLinkId(): string {
    return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse device information from user agent
   */
  private parseDeviceInfo(userAgent?: string): LinkClick['deviceInfo'] {
    if (!userAgent) return undefined;

    const ua = userAgent.toLowerCase();
    
    let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (ua.includes('mobile')) type = 'mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) type = 'tablet';
    
    let os: string | undefined;
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';
    
    let browser: string | undefined;
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    
    return { type, os, browser };
  }

  /**
   * Get location from IP address (placeholder implementation)
   */
  private async getLocationFromIP(ipAddress?: string): Promise<LinkClick['location']> {
    if (!ipAddress) return undefined;
    
    // In a real implementation, this would use a geolocation service
    // For now, return undefined
    return undefined;
  }

  /**
   * Group clicks by day
   */
  private groupClicksByDay(clicks: LinkClick[]): Array<{ date: string; clicks: number }> {
    const clicksByDay = new Map<string, number>();
    
    clicks.forEach(click => {
      const date = click.clickedAt.toISOString().split('T')[0];
      clicksByDay.set(date, (clicksByDay.get(date) || 0) + 1);
    });
    
    return Array.from(clicksByDay.entries())
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top locations from clicks
   */
  private getTopLocations(clicks: LinkClick[]): Array<{ location: string; clicks: number }> {
    const locationCounts = new Map<string, number>();
    
    clicks.forEach(click => {
      if (click.location?.state) {
        const location = click.location.city 
          ? `${click.location.city}, ${click.location.state}`
          : click.location.state;
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      }
    });
    
    return Array.from(locationCounts.entries())
      .map(([location, clicks]) => ({ location, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }

  /**
   * Get device breakdown from clicks
   */
  private getDeviceBreakdown(clicks: LinkClick[]): Record<string, number> {
    const deviceCounts: Record<string, number> = {};
    
    clicks.forEach(click => {
      if (click.deviceInfo?.type) {
        deviceCounts[click.deviceInfo.type] = (deviceCounts[click.deviceInfo.type] || 0) + 1;
      }
    });
    
    return deviceCounts;
  }

  /**
   * Calculate conversion funnel
   */
  private calculateConversionFunnel(
    clicks: LinkClick[], 
    conversions: ConversionEvent[]
  ): LinkAnalytics['conversionFunnel'] {
    const applicationsStarted = conversions.filter(c => c.eventType === 'application_started').length;
    const applicationsSubmitted = conversions.filter(c => c.eventType === 'application_submitted').length;
    const applicationsApproved = conversions.filter(c => c.eventType === 'application_approved').length;
    
    return {
      clicks: clicks.length,
      applicationsStarted,
      applicationsSubmitted,
      applicationsApproved
    };
  }

  // Database operations (placeholder implementations)
  
  private async saveApplicationLink(link: ApplicationLink): Promise<void> {
    try {
      await addDoc(collection(db, 'application_links'), {
        ...link,
        createdAt: Timestamp.fromDate(link.createdAt),
        expiresAt: link.expiresAt ? Timestamp.fromDate(link.expiresAt) : null
      });
    } catch (error) {
      this.logger.error('save_link_error', 'Failed to save application link', error);
      throw error;
    }
  }

  private async getApplicationLinkById(linkId: string): Promise<ApplicationLink | null> {
    try {
      const linksQuery = query(
        collection(db, 'application_links'),
        where('id', '==', linkId),
        limit(1)
      );
      
      const querySnapshot = await getDocs(linksQuery);
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined
      } as ApplicationLink;
    } catch (error) {
      this.logger.error('get_link_error', 'Failed to get application link', error);
      return null;
    }
  }

  private async saveLinkClick(click: LinkClick): Promise<void> {
    try {
      await addDoc(collection(db, 'link_clicks'), {
        ...click,
        clickedAt: Timestamp.fromDate(click.clickedAt)
      });
    } catch (error) {
      this.logger.error('save_click_error', 'Failed to save link click', error);
    }
  }

  private async saveConversionEvent(event: ConversionEvent): Promise<void> {
    try {
      await addDoc(collection(db, 'conversion_events'), {
        ...event,
        occurredAt: Timestamp.fromDate(event.occurredAt)
      });
    } catch (error) {
      this.logger.error('save_conversion_error', 'Failed to save conversion event', error);
    }
  }

  private async getLinkClicks(linkId: string, dateRange?: { start: Date; end: Date }): Promise<LinkClick[]> {
    try {
      let clicksQuery = query(
        collection(db, 'link_clicks'),
        where('linkId', '==', linkId),
        orderBy('clickedAt', 'desc')
      );

      if (dateRange) {
        clicksQuery = query(
          clicksQuery,
          where('clickedAt', '>=', Timestamp.fromDate(dateRange.start)),
          where('clickedAt', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const querySnapshot = await getDocs(clicksQuery);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        clickedAt: doc.data().clickedAt.toDate()
      })) as LinkClick[];
    } catch (error) {
      this.logger.error('get_clicks_error', 'Failed to get link clicks', error);
      return [];
    }
  }

  private async getLinkConversions(linkId: string, dateRange?: { start: Date; end: Date }): Promise<ConversionEvent[]> {
    try {
      let conversionsQuery = query(
        collection(db, 'conversion_events'),
        where('linkId', '==', linkId),
        orderBy('occurredAt', 'desc')
      );

      if (dateRange) {
        conversionsQuery = query(
          conversionsQuery,
          where('occurredAt', '>=', Timestamp.fromDate(dateRange.start)),
          where('occurredAt', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const querySnapshot = await getDocs(conversionsQuery);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        occurredAt: doc.data().occurredAt.toDate()
      })) as ConversionEvent[];
    } catch (error) {
      this.logger.error('get_conversions_error', 'Failed to get link conversions', error);
      return [];
    }
  }

  private async getSchemeLinks(schemeId: string, dateRange?: { start: Date; end: Date }): Promise<ApplicationLink[]> {
    try {
      let linksQuery = query(
        collection(db, 'application_links'),
        where('schemeId', '==', schemeId),
        orderBy('createdAt', 'desc')
      );

      if (dateRange) {
        linksQuery = query(
          linksQuery,
          where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
          where('createdAt', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const querySnapshot = await getDocs(linksQuery);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        expiresAt: doc.data().expiresAt ? doc.data().expiresAt.toDate() : undefined
      })) as ApplicationLink[];
    } catch (error) {
      this.logger.error('get_scheme_links_error', 'Failed to get scheme links', error);
      return [];
    }
  }
}

// Singleton instance
let applicationLinkServiceInstance: ApplicationLinkService | null = null;

export function getApplicationLinkService(): ApplicationLinkService {
  if (!applicationLinkServiceInstance) {
    applicationLinkServiceInstance = new ApplicationLinkService();
  }
  return applicationLinkServiceInstance;
}

export function clearApplicationLinkServiceInstance(): void {
  applicationLinkServiceInstance = null;
}