/**
 * Scheme Alert Trigger Service
 * Integrates with SchemeDiscoveryService to trigger automated notifications
 * when new schemes are discovered or updated
 */

import { SchemeDiscoveryService } from '../scheme-sahayak/SchemeDiscoveryService';
import { EnhancedSchemeService } from '../scheme-sahayak/EnhancedSchemeService';
import { UserService } from '../scheme-sahayak/UserService';
import { NotificationOrchestrator } from './NotificationOrchestrator';
import { 
  GovernmentScheme, 
  ArtisanProfile,
  NotificationPreferences 
} from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';
import { 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface SchemeMatchResult {
  user: ArtisanProfile;
  scheme: GovernmentScheme;
  matchScore: number;
  eligibilityMatch: number;
  reasons: string[];
  missingRequirements: string[];
}

export interface AlertTriggerEvent {
  id?: string;
  schemeId: string;
  schemeName: string;
  eventType: 'new_scheme' | 'scheme_updated' | 'deadline_reminder';
  triggeredAt: Date;
  eligibleUsers: number;
  notificationsSent: number;
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface UserEligibilityFilter {
  businessTypes: string[];
  states: string[];
  districts?: string[];
  ageRange?: { min: number; max: number };
  incomeRange?: { min: number; max: number };
  excludeApplied?: boolean;
}

/**
 * Service for triggering scheme alerts based on new scheme discoveries
 */
export class SchemeAlertTriggerService {
  private schemeDiscoveryService: SchemeDiscoveryService;
  private enhancedSchemeService: EnhancedSchemeService;
  private userService: UserService;
  private notificationOrchestrator: NotificationOrchestrator;
  private logger: ReturnType<typeof getGupshupLogger>;
  private isProcessing: boolean = false;
  private lastProcessedTime: Date | null = null;

  constructor(
    schemeDiscoveryService?: SchemeDiscoveryService,
    enhancedSchemeService?: EnhancedSchemeService,
    userService?: UserService,
    notificationOrchestrator?: NotificationOrchestrator
  ) {
    this.schemeDiscoveryService = schemeDiscoveryService || new SchemeDiscoveryService();
    this.enhancedSchemeService = enhancedSchemeService || new EnhancedSchemeService();
    this.userService = userService || new UserService();
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
    this.logger = getGupshupLogger();
  }

  /**
   * Process new scheme events and trigger notifications within 5-minute SLA
   */
  async processNewSchemeEvents(): Promise<AlertTriggerEvent[]> {
    if (this.isProcessing) {
      this.logger.warn('scheme_alert_processing', 'Scheme alert processing already in progress');
      return [];
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const events: AlertTriggerEvent[] = [];

    try {
      this.logger.info('scheme_alert_start', 'Starting scheme alert processing');

      // Get new schemes since last processing
      const newSchemes = await this.getNewSchemes();
      
      if (newSchemes.length === 0) {
        this.logger.info('scheme_alert_no_new', 'No new schemes found');
        return [];
      }

      this.logger.info('scheme_alert_found', `Found ${newSchemes.length} new schemes to process`);

      // Process each new scheme
      for (const scheme of newSchemes) {
        try {
          const event = await this.processSchemeForAlerts(scheme, 'new_scheme');
          events.push(event);
        } catch (error) {
          this.logger.error('scheme_alert_error', 'Failed to process scheme for alerts', {
            schemeId: scheme.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Create failed event record
          events.push({
            schemeId: scheme.id,
            schemeName: scheme.title,
            eventType: 'new_scheme',
            triggeredAt: new Date(),
            eligibleUsers: 0,
            notificationsSent: 0,
            processingTime: Date.now() - startTime,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update last processed time
      this.lastProcessedTime = new Date();

      const totalProcessingTime = Date.now() - startTime;
      this.logger.info('scheme_alert_complete', 'Scheme alert processing completed', {
        eventsProcessed: events.length,
        totalProcessingTime,
        successfulEvents: events.filter(e => e.status === 'completed').length,
        failedEvents: events.filter(e => e.status === 'failed').length
      });

      return events;
    } catch (error) {
      this.logger.error('scheme_alert_fatal', 'Fatal error in scheme alert processing', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single scheme for alert notifications
   */
  async processSchemeForAlerts(
    scheme: GovernmentScheme,
    eventType: AlertTriggerEvent['eventType']
  ): Promise<AlertTriggerEvent> {
    const startTime = Date.now();
    
    const event: AlertTriggerEvent = {
      schemeId: scheme.id,
      schemeName: scheme.title,
      eventType,
      triggeredAt: new Date(),
      eligibleUsers: 0,
      notificationsSent: 0,
      processingTime: 0,
      status: 'processing'
    };

    try {
      this.logger.info('scheme_alert_process', 'Processing scheme for alerts', {
        schemeId: scheme.id,
        schemeName: scheme.title,
        eventType
      });

      // Create eligibility filter from scheme criteria
      const eligibilityFilter = this.createEligibilityFilter(scheme);

      // Find eligible users
      const eligibleUsers = await this.findEligibleUsers(eligibilityFilter);
      event.eligibleUsers = eligibleUsers.length;

      if (eligibleUsers.length === 0) {
        this.logger.info('scheme_alert_no_users', 'No eligible users found for scheme', {
          schemeId: scheme.id
        });
        event.status = 'completed';
        event.processingTime = Date.now() - startTime;
        return event;
      }

      // Calculate match scores for each user
      const matchResults = await this.calculateUserMatches(scheme, eligibleUsers);

      // Filter users with good match scores (>= 60%)
      const qualifiedUsers = matchResults.filter(match => match.matchScore >= 60);

      if (qualifiedUsers.length === 0) {
        this.logger.info('scheme_alert_no_qualified', 'No qualified users found for scheme', {
          schemeId: scheme.id,
          eligibleUsers: eligibleUsers.length
        });
        event.status = 'completed';
        event.processingTime = Date.now() - startTime;
        return event;
      }

      this.logger.info('scheme_alert_qualified', 'Found qualified users for scheme', {
        schemeId: scheme.id,
        qualifiedUsers: qualifiedUsers.length,
        eligibleUsers: eligibleUsers.length
      });

      // Send notifications to qualified users
      const notificationResults = await this.notificationOrchestrator.sendSchemeAlert(
        scheme,
        qualifiedUsers.map(match => match.user)
      );

      // Count successful notifications
      const successfulNotifications = notificationResults.filter(result => result.success).length;
      event.notificationsSent = successfulNotifications;

      // Save event record
      await this.saveAlertEvent(event);

      event.status = 'completed';
      event.processingTime = Date.now() - startTime;

      this.logger.info('scheme_alert_success', 'Successfully processed scheme alerts', {
        schemeId: scheme.id,
        notificationsSent: successfulNotifications,
        processingTime: event.processingTime
      });

      return event;
    } catch (error) {
      event.status = 'failed';
      event.error = error instanceof Error ? error.message : 'Unknown error';
      event.processingTime = Date.now() - startTime;

      this.logger.error('scheme_alert_failed', 'Failed to process scheme alerts', {
        schemeId: scheme.id,
        error: event.error
      });

      // Still save the failed event for tracking
      try {
        await this.saveAlertEvent(event);
      } catch (saveError) {
        this.logger.error('scheme_alert_save_failed', 'Failed to save alert event', saveError);
      }

      return event;
    }
  }

  /**
   * Get new schemes since last processing
   */
  private async getNewSchemes(): Promise<GovernmentScheme[]> {
    try {
      // Calculate cutoff time (5 minutes ago to ensure we don't miss anything)
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 5);

      // Use last processed time if available, otherwise use cutoff time
      const sinceTime = this.lastProcessedTime || cutoffTime;

      // Get schemes updated since the last processing
      const schemesQuery = query(
        collection(db, 'schemes'),
        where('status', '==', 'active'),
        where('metadata.lastUpdated', '>=', Timestamp.fromDate(sinceTime)),
        orderBy('metadata.lastUpdated', 'desc'),
        limit(50) // Process max 50 schemes at once
      );

      const querySnapshot = await getDocs(schemesQuery);
      const schemes = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GovernmentScheme[];

      return schemes;
    } catch (error) {
      this.logger.error('scheme_alert_get_new', 'Failed to get new schemes', error);
      throw new Error('Failed to retrieve new schemes');
    }
  }

  /**
   * Create eligibility filter from scheme criteria
   */
  private createEligibilityFilter(scheme: GovernmentScheme): UserEligibilityFilter {
    return {
      businessTypes: scheme.eligibility.businessType || [],
      states: scheme.eligibility.location.states || [],
      districts: scheme.eligibility.location.districts,
      ageRange: scheme.eligibility.age.min || scheme.eligibility.age.max ? {
        min: scheme.eligibility.age.min || 0,
        max: scheme.eligibility.age.max || 100
      } : undefined,
      incomeRange: scheme.eligibility.income.min || scheme.eligibility.income.max ? {
        min: scheme.eligibility.income.min || 0,
        max: scheme.eligibility.income.max || Number.MAX_SAFE_INTEGER
      } : undefined,
      excludeApplied: true
    };
  }

  /**
   * Find eligible users based on filter criteria
   */
  private async findEligibleUsers(filter: UserEligibilityFilter): Promise<ArtisanProfile[]> {
    try {
      // Build Firestore query for eligible users
      let usersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );

      // Add business type filter if specified
      if (filter.businessTypes.length > 0) {
        usersQuery = query(
          usersQuery,
          where('business.type', 'in', filter.businessTypes.slice(0, 10)) // Firestore 'in' limit
        );
      }

      // Add state filter if specified
      if (filter.states.length > 0) {
        usersQuery = query(
          usersQuery,
          where('location.state', 'in', filter.states.slice(0, 10)) // Firestore 'in' limit
        );
      }

      const querySnapshot = await getDocs(usersQuery);
      let users = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as ArtisanProfile[];

      // Apply additional client-side filters
      users = users.filter(user => {
        // Age filter
        if (filter.ageRange) {
          const userAge = this.calculateAge(user.personalInfo.dateOfBirth);
          if (userAge < filter.ageRange.min || userAge > filter.ageRange.max) {
            return false;
          }
        }

        // Income filter
        if (filter.incomeRange) {
          const annualIncome = user.business.monthlyIncome * 12;
          if (annualIncome < filter.incomeRange.min || annualIncome > filter.incomeRange.max) {
            return false;
          }
        }

        // District filter
        if (filter.districts && filter.districts.length > 0) {
          if (!filter.districts.includes(user.location.district)) {
            return false;
          }
        }

        // Check notification preferences
        if (!user.preferences?.notifications?.schemeAlerts) {
          return false;
        }

        return true;
      });

      return users;
    } catch (error) {
      this.logger.error('scheme_alert_find_users', 'Failed to find eligible users', error);
      throw new Error('Failed to find eligible users');
    }
  }

  /**
   * Calculate match scores for users against a scheme
   */
  private async calculateUserMatches(
    scheme: GovernmentScheme,
    users: ArtisanProfile[]
  ): Promise<SchemeMatchResult[]> {
    const matches: SchemeMatchResult[] = [];

    for (const user of users) {
      try {
        const matchResult = this.calculateUserSchemeMatch(user, scheme);
        matches.push(matchResult);
      } catch (error) {
        this.logger.error('scheme_alert_match_error', 'Failed to calculate user match', {
          userId: user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return matches;
  }

  /**
   * Calculate match score between a user and scheme
   */
  private calculateUserSchemeMatch(user: ArtisanProfile, scheme: GovernmentScheme): SchemeMatchResult {
    let matchScore = 100;
    let eligibilityMatch = 100;
    const reasons: string[] = [];
    const missingRequirements: string[] = [];

    // Business type match (30% weight)
    if (scheme.eligibility.businessType.length > 0) {
      const hasBusinessTypeMatch = scheme.eligibility.businessType.some(type =>
        type.toLowerCase().includes(user.business.type.toLowerCase()) ||
        user.business.type.toLowerCase().includes(type.toLowerCase())
      );
      if (!hasBusinessTypeMatch) {
        matchScore -= 30;
        eligibilityMatch -= 30;
        missingRequirements.push(`Business type: ${scheme.eligibility.businessType.join(', ')}`);
      } else {
        reasons.push('Business type matches');
      }
    }

    // Location match (25% weight)
    if (scheme.eligibility.location.states && scheme.eligibility.location.states.length > 0) {
      if (!scheme.eligibility.location.states.includes(user.location.state)) {
        matchScore -= 25;
        eligibilityMatch -= 25;
        missingRequirements.push(`State: ${scheme.eligibility.location.states.join(', ')}`);
      } else {
        reasons.push('Location matches');
        
        // District bonus if specified
        if (scheme.eligibility.location.districts && 
            scheme.eligibility.location.districts.includes(user.location.district)) {
          matchScore += 5;
          reasons.push('District matches');
        }
      }
    }

    // Age match (15% weight)
    if (scheme.eligibility.age.min || scheme.eligibility.age.max) {
      const userAge = this.calculateAge(user.personalInfo.dateOfBirth);
      if (scheme.eligibility.age.min && userAge < scheme.eligibility.age.min) {
        matchScore -= 15;
        eligibilityMatch -= 15;
        missingRequirements.push(`Minimum age: ${scheme.eligibility.age.min}`);
      } else if (scheme.eligibility.age.max && userAge > scheme.eligibility.age.max) {
        matchScore -= 15;
        eligibilityMatch -= 15;
        missingRequirements.push(`Maximum age: ${scheme.eligibility.age.max}`);
      } else {
        reasons.push('Age criteria met');
      }
    }

    // Income match (20% weight)
    if (scheme.eligibility.income.min || scheme.eligibility.income.max) {
      const annualIncome = user.business.monthlyIncome * 12;
      if (scheme.eligibility.income.min && annualIncome < scheme.eligibility.income.min) {
        matchScore -= 20;
        eligibilityMatch -= 20;
        missingRequirements.push(`Minimum income: ₹${scheme.eligibility.income.min.toLocaleString()}`);
      } else if (scheme.eligibility.income.max && annualIncome > scheme.eligibility.income.max) {
        matchScore -= 20;
        eligibilityMatch -= 20;
        missingRequirements.push(`Maximum income: ₹${scheme.eligibility.income.max.toLocaleString()}`);
      } else {
        reasons.push('Income criteria met');
      }
    }

    // Scheme attractiveness bonuses (10% weight)
    if (scheme.metadata.successRate > 80) {
      matchScore += 5;
      reasons.push('High success rate');
    }
    if (scheme.application.onlineApplication) {
      matchScore += 3;
      reasons.push('Online application available');
    }
    if (scheme.metadata.averageProcessingTime <= 30) {
      matchScore += 2;
      reasons.push('Fast processing');
    }

    return {
      user,
      scheme,
      matchScore: Math.max(0, Math.min(100, matchScore)),
      eligibilityMatch: Math.max(0, Math.min(100, eligibilityMatch)),
      reasons,
      missingRequirements
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date | string): number {
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Save alert event to database for tracking
   */
  private async saveAlertEvent(event: AlertTriggerEvent): Promise<void> {
    try {
      const eventData = {
        ...event,
        triggeredAt: Timestamp.fromDate(event.triggeredAt),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'scheme_alert_events'), eventData);
    } catch (error) {
      this.logger.error('scheme_alert_save', 'Failed to save alert event', error);
      // Don't throw here as this is just for tracking
    }
  }

  /**
   * Get recent alert events for monitoring
   */
  async getRecentAlertEvents(limit: number = 50): Promise<AlertTriggerEvent[]> {
    try {
      const eventsQuery = query(
        collection(db, 'scheme_alert_events'),
        orderBy('triggeredAt', 'desc'),
        limit(limit)
      );

      const querySnapshot = await getDocs(eventsQuery);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        triggeredAt: doc.data().triggeredAt.toDate()
      })) as AlertTriggerEvent[];
    } catch (error) {
      this.logger.error('scheme_alert_get_events', 'Failed to get recent alert events', error);
      return [];
    }
  }

  /**
   * Get alert statistics for monitoring
   */
  async getAlertStatistics(days: number = 7): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    totalNotificationsSent: number;
    averageProcessingTime: number;
    averageMatchRate: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const eventsQuery = query(
        collection(db, 'scheme_alert_events'),
        where('triggeredAt', '>=', Timestamp.fromDate(cutoffDate))
      );

      const querySnapshot = await getDocs(eventsQuery);
      const events = querySnapshot.docs.map(doc => doc.data()) as AlertTriggerEvent[];

      const totalEvents = events.length;
      const successfulEvents = events.filter(e => e.status === 'completed').length;
      const failedEvents = events.filter(e => e.status === 'failed').length;
      const totalNotificationsSent = events.reduce((sum, e) => sum + e.notificationsSent, 0);
      const averageProcessingTime = events.length > 0 
        ? events.reduce((sum, e) => sum + e.processingTime, 0) / events.length 
        : 0;
      
      // Calculate average match rate (notifications sent / eligible users)
      const eventsWithUsers = events.filter(e => e.eligibleUsers > 0);
      const averageMatchRate = eventsWithUsers.length > 0
        ? eventsWithUsers.reduce((sum, e) => sum + (e.notificationsSent / e.eligibleUsers), 0) / eventsWithUsers.length * 100
        : 0;

      return {
        totalEvents,
        successfulEvents,
        failedEvents,
        totalNotificationsSent,
        averageProcessingTime,
        averageMatchRate
      };
    } catch (error) {
      this.logger.error('scheme_alert_stats', 'Failed to get alert statistics', error);
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        totalNotificationsSent: 0,
        averageProcessingTime: 0,
        averageMatchRate: 0
      };
    }
  }

  /**
   * Check if service is healthy and processing within SLA
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    lastProcessedTime: Date | null;
    timeSinceLastProcess: number;
    withinSLA: boolean;
    isProcessing: boolean;
  }> {
    const now = new Date();
    const timeSinceLastProcess = this.lastProcessedTime 
      ? now.getTime() - this.lastProcessedTime.getTime()
      : 0;
    
    // SLA is 5 minutes (300,000 ms)
    const withinSLA = timeSinceLastProcess <= 300000;
    const healthy = !this.isProcessing && (this.lastProcessedTime === null || withinSLA);

    return {
      healthy,
      lastProcessedTime: this.lastProcessedTime,
      timeSinceLastProcess,
      withinSLA,
      isProcessing: this.isProcessing
    };
  }
}

// Singleton instance
let schemeAlertTriggerServiceInstance: SchemeAlertTriggerService | null = null;

export function getSchemeAlertTriggerService(): SchemeAlertTriggerService {
  if (!schemeAlertTriggerServiceInstance) {
    schemeAlertTriggerServiceInstance = new SchemeAlertTriggerService();
  }
  return schemeAlertTriggerServiceInstance;
}

export function clearSchemeAlertTriggerServiceInstance(): void {
  schemeAlertTriggerServiceInstance = null;
}