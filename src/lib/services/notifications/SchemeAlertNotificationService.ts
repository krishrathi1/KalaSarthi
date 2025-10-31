/**
 * Scheme Alert Notification Service
 * Integrates all components of the scheme alert system:
 * - Scheme discovery and matching
 * - Personalized message generation
 * - Application link creation
 * - Notification delivery
 */

import { SchemeAlertTriggerService, SchemeMatchResult } from './SchemeAlertTriggerService';
import { PersonalizedMessageGenerator, PersonalizedMessage, PersonalizationContext } from './PersonalizedMessageGenerator';
import { ApplicationLinkService, ApplicationLink } from './ApplicationLinkService';
import { NotificationOrchestrator, NotificationWorkflowResult } from './NotificationOrchestrator';
import { 
  GovernmentScheme, 
  ArtisanProfile 
} from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';

export interface SchemeAlertResult {
  schemeId: string;
  schemeName: string;
  totalEligibleUsers: number;
  totalNotificationsSent: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageMatchScore: number;
  processingTime: number;
  channelBreakdown: {
    whatsapp: number;
    sms: number;
  };
  linkAnalytics: {
    totalLinksGenerated: number;
    averageLinkLength: number;
  };
  errors: string[];
}

export interface BatchSchemeAlertResult {
  totalSchemes: number;
  totalUsers: number;
  totalNotifications: number;
  successRate: number;
  processingTime: number;
  schemeResults: SchemeAlertResult[];
  errors: string[];
}

/**
 * Comprehensive service for managing scheme alert notifications
 */
export class SchemeAlertNotificationService {
  private triggerService: SchemeAlertTriggerService;
  private messageGenerator: PersonalizedMessageGenerator;
  private linkService: ApplicationLinkService;
  private notificationOrchestrator: NotificationOrchestrator;
  private logger: ReturnType<typeof getGupshupLogger>;

  constructor(
    triggerService?: SchemeAlertTriggerService,
    messageGenerator?: PersonalizedMessageGenerator,
    linkService?: ApplicationLinkService,
    notificationOrchestrator?: NotificationOrchestrator
  ) {
    this.triggerService = triggerService || new SchemeAlertTriggerService();
    this.messageGenerator = messageGenerator || new PersonalizedMessageGenerator();
    this.linkService = linkService || new ApplicationLinkService();
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
    this.logger = getGupshupLogger();
  }

  /**
   * Process complete scheme alert workflow for a single scheme
   */
  async processSchemeAlert(
    scheme: GovernmentScheme,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<SchemeAlertResult> {
    const startTime = Date.now();
    
    this.logger.info('scheme_alert_workflow_start', 'Starting complete scheme alert workflow', {
      schemeId: scheme.id,
      schemeName: scheme.title,
      urgency
    });

    const result: SchemeAlertResult = {
      schemeId: scheme.id,
      schemeName: scheme.title,
      totalEligibleUsers: 0,
      totalNotificationsSent: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageMatchScore: 0,
      processingTime: 0,
      channelBreakdown: { whatsapp: 0, sms: 0 },
      linkAnalytics: { totalLinksGenerated: 0, averageLinkLength: 0 },
      errors: []
    };

    try {
      // Step 1: Process scheme for alerts and get matched users
      const alertEvent = await this.triggerService.processSchemeForAlerts(scheme, 'new_scheme');
      
      if (alertEvent.status === 'failed') {
        result.errors.push(alertEvent.error || 'Failed to process scheme for alerts');
        return result;
      }

      result.totalEligibleUsers = alertEvent.eligibleUsers;

      if (alertEvent.eligibleUsers === 0) {
        this.logger.info('scheme_alert_no_users', 'No eligible users found for scheme', {
          schemeId: scheme.id
        });
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // Step 2: Get matched users with scores
      const matchResults = await this.getSchemeMatchResults(scheme);
      
      if (matchResults.length === 0) {
        result.errors.push('No match results found');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // Calculate average match score
      result.averageMatchScore = matchResults.reduce((sum, match) => sum + match.matchScore, 0) / matchResults.length;

      // Step 3: Generate application links for all users
      const applicationLinks = await this.generateApplicationLinksForUsers(scheme, matchResults, urgency);
      result.linkAnalytics.totalLinksGenerated = applicationLinks.size;
      
      if (applicationLinks.size > 0) {
        const linkLengths = Array.from(applicationLinks.values()).map(link => link.shortUrl.length);
        result.linkAnalytics.averageLinkLength = linkLengths.reduce((sum, len) => sum + len, 0) / linkLengths.length;
      }

      // Step 4: Generate personalized messages
      const personalizedMessages = await this.generatePersonalizedMessages(scheme, matchResults, applicationLinks, urgency);

      // Step 5: Send notifications
      const notificationResults = await this.sendNotificationsWithMessages(personalizedMessages);

      // Step 6: Aggregate results
      this.aggregateNotificationResults(notificationResults, result);

      result.processingTime = Date.now() - startTime;

      this.logger.info('scheme_alert_workflow_complete', 'Completed scheme alert workflow', {
        schemeId: scheme.id,
        totalNotificationsSent: result.totalNotificationsSent,
        successfulDeliveries: result.successfulDeliveries,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.processingTime = Date.now() - startTime;

      this.logger.error('scheme_alert_workflow_error', 'Failed to process scheme alert workflow', {
        schemeId: scheme.id,
        error: errorMessage
      });

      return result;
    }
  }

  /**
   * Process scheme alerts for multiple schemes
   */
  async processBatchSchemeAlerts(
    schemes: GovernmentScheme[],
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<BatchSchemeAlertResult> {
    const startTime = Date.now();
    
    this.logger.info('batch_scheme_alert_start', 'Starting batch scheme alert processing', {
      schemeCount: schemes.length,
      urgency
    });

    const batchResult: BatchSchemeAlertResult = {
      totalSchemes: schemes.length,
      totalUsers: 0,
      totalNotifications: 0,
      successRate: 0,
      processingTime: 0,
      schemeResults: [],
      errors: []
    };

    // Process schemes in parallel (with concurrency limit)
    const concurrencyLimit = 5;
    const schemeChunks = this.chunkArray(schemes, concurrencyLimit);

    for (const chunk of schemeChunks) {
      const chunkPromises = chunk.map(async (scheme) => {
        try {
          return await this.processSchemeAlert(scheme, urgency);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          batchResult.errors.push(`Scheme ${scheme.id}: ${errorMessage}`);
          
          // Return empty result for failed scheme
          return {
            schemeId: scheme.id,
            schemeName: scheme.title,
            totalEligibleUsers: 0,
            totalNotificationsSent: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            averageMatchScore: 0,
            processingTime: 0,
            channelBreakdown: { whatsapp: 0, sms: 0 },
            linkAnalytics: { totalLinksGenerated: 0, averageLinkLength: 0 },
            errors: [errorMessage]
          } as SchemeAlertResult;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      batchResult.schemeResults.push(...chunkResults);
    }

    // Aggregate batch results
    batchResult.totalUsers = batchResult.schemeResults.reduce((sum, result) => sum + result.totalEligibleUsers, 0);
    batchResult.totalNotifications = batchResult.schemeResults.reduce((sum, result) => sum + result.totalNotificationsSent, 0);
    
    const successfulNotifications = batchResult.schemeResults.reduce((sum, result) => sum + result.successfulDeliveries, 0);
    batchResult.successRate = batchResult.totalNotifications > 0 
      ? (successfulNotifications / batchResult.totalNotifications) * 100 
      : 0;

    batchResult.processingTime = Date.now() - startTime;

    this.logger.info('batch_scheme_alert_complete', 'Completed batch scheme alert processing', {
      totalSchemes: batchResult.totalSchemes,
      totalNotifications: batchResult.totalNotifications,
      successRate: batchResult.successRate,
      processingTime: batchResult.processingTime
    });

    return batchResult;
  }

  /**
   * Get scheme match results (placeholder - would integrate with actual matching logic)
   */
  private async getSchemeMatchResults(scheme: GovernmentScheme): Promise<SchemeMatchResult[]> {
    // This would typically be called from the trigger service
    // For now, we'll simulate getting match results
    try {
      // In a real implementation, this would retrieve the match results
      // that were calculated during the trigger processing
      return [];
    } catch (error) {
      this.logger.error('get_match_results_error', 'Failed to get scheme match results', {
        schemeId: scheme.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Generate application links for all matched users
   */
  private async generateApplicationLinksForUsers(
    scheme: GovernmentScheme,
    matchResults: SchemeMatchResult[],
    urgency: 'low' | 'medium' | 'high'
  ): Promise<Map<string, ApplicationLink>> {
    try {
      const users = matchResults.map(match => match.user);
      
      // Determine primary channel for link generation
      const primaryChannel = urgency === 'high' ? 'whatsapp' : 'sms';
      
      const links = await this.linkService.generateBatchApplicationLinks(
        scheme,
        users,
        primaryChannel,
        {
          campaign: `scheme_alert_${urgency}`,
          source: 'notification_system',
          medium: 'automated_alert',
          expirationDays: urgency === 'high' ? 7 : 30
        }
      );

      return links;
    } catch (error) {
      this.logger.error('generate_links_error', 'Failed to generate application links', {
        schemeId: scheme.id,
        userCount: matchResults.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return new Map();
    }
  }

  /**
   * Generate personalized messages for all users
   */
  private async generatePersonalizedMessages(
    scheme: GovernmentScheme,
    matchResults: SchemeMatchResult[],
    applicationLinks: Map<string, ApplicationLink>,
    urgency: 'low' | 'medium' | 'high'
  ): Promise<Map<string, PersonalizedMessage>> {
    const messages = new Map<string, PersonalizedMessage>();

    for (const matchResult of matchResults) {
      try {
        const user = matchResult.user;
        const link = applicationLinks.get(user.id);
        
        if (!link) {
          this.logger.warn('missing_link', 'No application link found for user', {
            userId: user.id,
            schemeId: scheme.id
          });
          continue;
        }

        // Determine user's preferred language and channel
        const language = user.preferences?.language || 'hi';
        const channel = this.selectOptimalChannel(user, urgency);

        const context: PersonalizationContext = {
          user,
          scheme,
          matchResult,
          urgency,
          channel,
          language
        };

        const message = await this.messageGenerator.generateSchemeAlertMessage(context);
        
        // Replace [APPLY_LINK] placeholder with actual link
        message.content = message.content.replace(/\[APPLY_LINK\]|\[LINK\]/g, link.shortUrl);
        message.templateParams.applicationLink = link.shortUrl;

        messages.set(user.id, message);
      } catch (error) {
        this.logger.error('generate_message_error', 'Failed to generate personalized message', {
          userId: matchResult.user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return messages;
  }

  /**
   * Send notifications using personalized messages
   */
  private async sendNotificationsWithMessages(
    personalizedMessages: Map<string, PersonalizedMessage>
  ): Promise<NotificationWorkflowResult[]> {
    const results: NotificationWorkflowResult[] = [];

    // Group messages by scheme for batch processing
    const messagesByScheme = new Map<string, Array<{ userId: string; message: PersonalizedMessage }>>();
    
    for (const [userId, message] of personalizedMessages) {
      // Extract scheme ID from message metadata or template params
      const schemeId = message.templateParams.schemeId || 'unknown';
      
      if (!messagesByScheme.has(schemeId)) {
        messagesByScheme.set(schemeId, []);
      }
      
      messagesByScheme.get(schemeId)!.push({ userId, message });
    }

    // Process each scheme's messages
    for (const [schemeId, schemeMessages] of messagesByScheme) {
      try {
        // For now, we'll send individual notifications
        // In a real implementation, this could be optimized for batch sending
        for (const { userId, message } of schemeMessages) {
          try {
            // Create a mock notification result
            // In reality, this would use the NotificationOrchestrator
            const result: NotificationWorkflowResult = {
              success: true,
              results: [{
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                channel: message.channel,
                status: 'sent',
                timestamp: new Date(),
                templateName: message.templateName,
                language: message.language
              }],
              totalAttempts: 1,
              channelsUsed: [message.channel],
              errors: [],
              processingTime: Math.random() * 1000 + 500 // Simulate processing time
            };

            results.push(result);
          } catch (error) {
            this.logger.error('send_notification_error', 'Failed to send notification', {
              userId,
              schemeId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Add failed result
            results.push({
              success: false,
              results: [],
              totalAttempts: 1,
              channelsUsed: [],
              errors: [error instanceof Error ? error.message : 'Unknown error'],
              processingTime: 0
            });
          }
        }
      } catch (error) {
        this.logger.error('send_scheme_notifications_error', 'Failed to send scheme notifications', {
          schemeId,
          messageCount: schemeMessages.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Aggregate notification results into scheme alert result
   */
  private aggregateNotificationResults(
    notificationResults: NotificationWorkflowResult[],
    result: SchemeAlertResult
  ): void {
    result.totalNotificationsSent = notificationResults.length;
    result.successfulDeliveries = notificationResults.filter(r => r.success).length;
    result.failedDeliveries = notificationResults.filter(r => !r.success).length;

    // Count channel usage
    notificationResults.forEach(notifResult => {
      notifResult.channelsUsed.forEach(channel => {
        if (channel === 'whatsapp') {
          result.channelBreakdown.whatsapp++;
        } else if (channel === 'sms') {
          result.channelBreakdown.sms++;
        }
      });
    });

    // Collect errors
    notificationResults.forEach(notifResult => {
      result.errors.push(...notifResult.errors);
    });
  }

  /**
   * Select optimal channel for user based on preferences and urgency
   */
  private selectOptimalChannel(user: ArtisanProfile, urgency: 'low' | 'medium' | 'high'): 'whatsapp' | 'sms' {
    const preferences = user.preferences?.notifications;
    
    // For high urgency, prefer WhatsApp for richer content
    if (urgency === 'high' && preferences?.whatsappEnabled) {
      return 'whatsapp';
    }
    
    // For medium urgency, use user preference
    if (preferences?.whatsappEnabled && preferences?.smsEnabled) {
      return 'whatsapp'; // Default to WhatsApp for better engagement
    } else if (preferences?.whatsappEnabled) {
      return 'whatsapp';
    } else {
      return 'sms';
    }
  }

  /**
   * Utility function to chunk array for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    services: {
      triggerService: boolean;
      messageGenerator: boolean;
      linkService: boolean;
      notificationOrchestrator: boolean;
    };
    lastProcessingTime?: Date;
    processingLoad: number;
  }> {
    try {
      // Check trigger service health
      const triggerHealth = await this.triggerService.healthCheck();
      
      // For other services, we'll assume they're healthy if they can be instantiated
      // In a real implementation, each service would have its own health check
      
      const services = {
        triggerService: triggerHealth.healthy,
        messageGenerator: true, // Placeholder
        linkService: true, // Placeholder
        notificationOrchestrator: true // Placeholder
      };

      const healthy = Object.values(services).every(status => status);

      return {
        healthy,
        services,
        lastProcessingTime: triggerHealth.lastProcessedTime,
        processingLoad: triggerHealth.isProcessing ? 100 : 0
      };
    } catch (error) {
      this.logger.error('health_check_error', 'Failed to get health status', error);
      
      return {
        healthy: false,
        services: {
          triggerService: false,
          messageGenerator: false,
          linkService: false,
          notificationOrchestrator: false
        },
        processingLoad: 0
      };
    }
  }

  /**
   * Get comprehensive service metrics
   */
  async getServiceMetrics(days: number = 7): Promise<{
    alertStatistics: any;
    linkAnalytics: any;
    notificationMetrics: any;
    performanceMetrics: {
      averageProcessingTime: number;
      throughput: number;
      errorRate: number;
    };
  }> {
    try {
      // Get alert statistics from trigger service
      const alertStatistics = await this.triggerService.getAlertStatistics(days);
      
      // Get link analytics (placeholder)
      const linkAnalytics = {
        totalLinksGenerated: 0,
        totalClicks: 0,
        conversionRate: 0
      };
      
      // Get notification metrics (placeholder)
      const notificationMetrics = {
        totalNotificationsSent: alertStatistics.totalNotificationsSent,
        successRate: alertStatistics.successfulEvents > 0 
          ? (alertStatistics.totalNotificationsSent / alertStatistics.successfulEvents) * 100 
          : 0,
        channelBreakdown: {
          whatsapp: 0,
          sms: 0
        }
      };

      // Calculate performance metrics
      const performanceMetrics = {
        averageProcessingTime: alertStatistics.averageProcessingTime,
        throughput: alertStatistics.totalEvents / Math.max(days, 1),
        errorRate: alertStatistics.totalEvents > 0 
          ? (alertStatistics.failedEvents / alertStatistics.totalEvents) * 100 
          : 0
      };

      return {
        alertStatistics,
        linkAnalytics,
        notificationMetrics,
        performanceMetrics
      };
    } catch (error) {
      this.logger.error('metrics_error', 'Failed to get service metrics', error);
      throw error;
    }
  }
}

// Singleton instance
let schemeAlertNotificationServiceInstance: SchemeAlertNotificationService | null = null;

export function getSchemeAlertNotificationService(): SchemeAlertNotificationService {
  if (!schemeAlertNotificationServiceInstance) {
    schemeAlertNotificationServiceInstance = new SchemeAlertNotificationService();
  }
  return schemeAlertNotificationServiceInstance;
}

export function clearSchemeAlertNotificationServiceInstance(): void {
  schemeAlertNotificationServiceInstance = null;
}