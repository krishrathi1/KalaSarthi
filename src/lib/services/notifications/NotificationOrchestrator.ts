/**
 * Notification Orchestrator
 * Manages multi-channel notification delivery with intelligent channel selection
 * and message preparation pipeline
 */

import { GupshupService, NotificationParams, NotificationResult } from './GupshupService';
import { TemplateManager, MessageTemplate } from './TemplateManager';
import { UnifiedTranslationService } from '../UnifiedTranslationService';
import { UserPreferenceService, getUserPreferenceService } from './UserPreferenceService';
import { MessageLocalizationService, getMessageLocalizationService, LocalizationContext } from './MessageLocalizationService';
import { NotificationPreferences, ArtisanProfile, GovernmentScheme } from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';

export type NotificationChannel = 'whatsapp' | 'sms' | 'both' | 'none';

export interface NotificationContext {
  user: ArtisanProfile;
  scheme?: GovernmentScheme;
  application?: any; // Application type from scheme-sahayak
  language: string;
  channel: NotificationChannel;
  urgency: 'low' | 'medium' | 'high';
}

export interface PreparedMessage {
  content: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  language: string;
  channel: NotificationChannel;
  metadata: {
    originalContent: string;
    translationUsed: boolean;
    templateUsed: boolean;
    optimizedForChannel: boolean;
  };
}

export interface NotificationWorkflowResult {
  success: boolean;
  results: NotificationResult[];
  totalAttempts: number;
  channelsUsed: NotificationChannel[];
  errors: string[];
  processingTime: number;
}

export interface SchemeNotificationData {
  schemeId: string;
  schemeName: string;
  eligibilityCriteria: string[];
  applicationDeadline?: Date;
  applicationUrl?: string;
  estimatedAmount?: string;
  matchScore?: number;
  benefits: string;
}

/**
 * Core notification orchestration service
 */
export class NotificationOrchestrator {
  private gupshupService: GupshupService;
  private templateManager: TemplateManager;
  private translationService: UnifiedTranslationService;
  private userPreferenceService: UserPreferenceService;
  private localizationService: MessageLocalizationService;
  private logger: ReturnType<typeof getGupshupLogger>;

  constructor(
    gupshupService?: GupshupService,
    templateManager?: TemplateManager,
    translationService?: UnifiedTranslationService,
    userPreferenceService?: UserPreferenceService,
    localizationService?: MessageLocalizationService
  ) {
    this.gupshupService = gupshupService || new GupshupService();
    this.templateManager = templateManager || new TemplateManager();
    this.translationService = translationService || new UnifiedTranslationService();
    this.userPreferenceService = userPreferenceService || getUserPreferenceService();
    this.localizationService = localizationService || getMessageLocalizationService();
    this.logger = getGupshupLogger();
  }

  /**
   * Send scheme alert notification to multiple users
   */
  async sendSchemeAlert(
    scheme: GovernmentScheme,
    users: ArtisanProfile[]
  ): Promise<NotificationWorkflowResult[]> {
    const startTime = Date.now();
    const results: NotificationWorkflowResult[] = [];

    this.logger.info('scheme_alert_batch_start', 'Starting scheme alert batch', {
      schemeId: scheme.id,
      schemeName: scheme.title,
      userCount: users.length,
    });

    for (const user of users) {
      try {
        const schemeData: SchemeNotificationData = {
          schemeId: scheme.id,
          schemeName: scheme.title,
          eligibilityCriteria: scheme.eligibility.otherCriteria,
          applicationDeadline: scheme.application.deadline,
          applicationUrl: scheme.application.website,
          estimatedAmount: `₹${scheme.benefits.amount.min.toLocaleString()} - ₹${scheme.benefits.amount.max.toLocaleString()}`,
          benefits: scheme.benefits.coverageDetails,
        };

        const result = await this.sendSchemeAlertToUser(user, schemeData);
        results.push(result);

        // Add small delay between notifications to respect rate limits
        await this.delay(100);

      } catch (error) {
        this.logger.error('scheme_alert_user_failed', 'Failed to send scheme alert to user', {
          userId: user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          success: false,
          results: [],
          totalAttempts: 0,
          channelsUsed: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: Date.now() - startTime,
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    this.logger.info('scheme_alert_batch_complete', 'Scheme alert batch completed', {
      schemeId: scheme.id,
      totalUsers: users.length,
      successCount,
      failureCount: users.length - successCount,
      totalProcessingTime,
    });

    return results;
  }

  /**
   * Send scheme alert to a single user
   */
  async sendSchemeAlertToUser(
    user: ArtisanProfile,
    schemeData: SchemeNotificationData
  ): Promise<NotificationWorkflowResult> {
    const startTime = Date.now();
    const results: NotificationResult[] = [];
    const channelsUsed: NotificationChannel[] = [];
    const errors: string[] = [];

    try {
      // Get user preferences (will implement in task 4.2)
      const preferences = await this.getUserPreferences(user.id);
      
      // Select notification channel based on preferences
      const selectedChannel = this.selectChannel(user, preferences);
      
      if (selectedChannel === 'none') {
        this.logger.info('notification_skipped', 'User has disabled notifications', {
          userId: user.id,
        });
        
        return {
          success: true,
          results: [],
          totalAttempts: 0,
          channelsUsed: [],
          errors: [],
          processingTime: Date.now() - startTime,
        };
      }

      // Prepare message with localization
      const preparedMessage = await this.prepareSchemeAlertMessage(
        user,
        schemeData,
        selectedChannel,
        preferences
      );

      // Send notification with fallback
      const notificationParams: NotificationParams = {
        to: user.personalInfo.phone,
        templateName: preparedMessage.templateName,
        templateParams: preparedMessage.templateParams,
        message: preparedMessage.content,
        language: preparedMessage.language,
        priority: 'high', // Scheme alerts are high priority
        enableFallback: true,
        maxFallbackAttempts: 2,
      };

      const result = await this.gupshupService.sendNotificationWithFallback(notificationParams);
      results.push(result);
      channelsUsed.push(result.channel);

      return {
        success: result.success,
        results,
        totalAttempts: result.fallbackAttempts + 1,
        channelsUsed,
        errors: result.error ? [result.error.message] : [],
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      this.logger.error('scheme_alert_failed', 'Failed to send scheme alert', {
        userId: user.id,
        schemeId: schemeData.schemeId,
        error: errorMessage,
      });

      return {
        success: false,
        results,
        totalAttempts: 1,
        channelsUsed,
        errors,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Send deadline reminder notifications
   */
  async sendDeadlineReminder(
    scheme: GovernmentScheme,
    users: ArtisanProfile[]
  ): Promise<NotificationWorkflowResult[]> {
    const startTime = Date.now();
    const results: NotificationWorkflowResult[] = [];

    this.logger.info('deadline_reminder_batch_start', 'Starting deadline reminder batch', {
      schemeId: scheme.id,
      schemeName: scheme.title,
      deadline: scheme.application.deadline,
      userCount: users.length,
    });

    for (const user of users) {
      try {
        const preferences = await this.getUserPreferences(user.id);
        
        // Check if user wants deadline reminders
        if (!preferences.types.deadlineReminders) {
          this.logger.debug('deadline_reminder_skipped', 'User has disabled deadline reminders', {
            userId: user.id,
          });
          continue;
        }

        const selectedChannel = this.selectChannel(user, preferences);
        
        if (selectedChannel === 'none') {
          continue;
        }

        // Calculate days remaining
        const daysRemaining = scheme.application.deadline 
          ? Math.ceil((scheme.application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;

        const reminderData = {
          ...scheme,
          daysRemaining,
          urgency: daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
        };

        const preparedMessage = await this.prepareDeadlineReminderMessage(
          user,
          reminderData,
          selectedChannel,
          preferences
        );

        const notificationParams: NotificationParams = {
          to: user.personalInfo.phone,
          templateName: preparedMessage.templateName,
          templateParams: preparedMessage.templateParams,
          message: preparedMessage.content,
          language: preparedMessage.language,
          priority: reminderData.urgency as 'high' | 'medium' | 'low',
          enableFallback: true,
          maxFallbackAttempts: 1,
        };

        const result = await this.gupshupService.sendNotificationWithFallback(notificationParams);
        
        results.push({
          success: result.success,
          results: [result],
          totalAttempts: result.fallbackAttempts + 1,
          channelsUsed: [result.channel],
          errors: result.error ? [result.error.message] : [],
          processingTime: Date.now() - startTime,
        });

        // Add delay between notifications
        await this.delay(200);

      } catch (error) {
        this.logger.error('deadline_reminder_failed', 'Failed to send deadline reminder', {
          userId: user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          success: false,
          results: [],
          totalAttempts: 1,
          channelsUsed: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Send application status update notification
   */
  async sendApplicationUpdate(
    application: any, // Application type from scheme-sahayak
    user: ArtisanProfile
  ): Promise<NotificationWorkflowResult> {
    const startTime = Date.now();

    try {
      const preferences = await this.getUserPreferences(user.id);
      
      // Check if user wants status updates
      if (!preferences.types.statusUpdates) {
        return {
          success: true,
          results: [],
          totalAttempts: 0,
          channelsUsed: [],
          errors: [],
          processingTime: Date.now() - startTime,
        };
      }

      const selectedChannel = this.selectChannel(user, preferences);
      
      if (selectedChannel === 'none') {
        return {
          success: true,
          results: [],
          totalAttempts: 0,
          channelsUsed: [],
          errors: [],
          processingTime: Date.now() - startTime,
        };
      }

      const preparedMessage = await this.prepareApplicationUpdateMessage(
        user,
        application,
        selectedChannel,
        preferences
      );

      const notificationParams: NotificationParams = {
        to: user.personalInfo.phone,
        templateName: preparedMessage.templateName,
        templateParams: preparedMessage.templateParams,
        message: preparedMessage.content,
        language: preparedMessage.language,
        priority: application.status === 'approved' || application.status === 'rejected' ? 'high' : 'medium',
        enableFallback: true,
        maxFallbackAttempts: 1,
      };

      const result = await this.gupshupService.sendNotificationWithFallback(notificationParams);

      return {
        success: result.success,
        results: [result],
        totalAttempts: result.fallbackAttempts + 1,
        channelsUsed: [result.channel],
        errors: result.error ? [result.error.message] : [],
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('application_update_failed', 'Failed to send application update', {
        userId: user.id,
        applicationId: application.id,
        error: errorMessage,
      });

      return {
        success: false,
        results: [],
        totalAttempts: 1,
        channelsUsed: [],
        errors: [errorMessage],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Select appropriate notification channel based on user preferences
   */
  selectChannel(user: ArtisanProfile, preferences: NotificationPreferences): NotificationChannel {
    // Check if notifications are enabled
    const hasEnabledChannels = preferences.channels.whatsapp || 
                              preferences.channels.sms || 
                              preferences.channels.email || 
                              preferences.channels.push;

    if (!hasEnabledChannels) {
      return 'none';
    }

    // Prefer WhatsApp if enabled and user has WhatsApp-compatible phone
    if (preferences.channels.whatsapp && this.isWhatsAppCompatible(user.personalInfo.phone)) {
      return 'whatsapp';
    }

    // Fall back to SMS if enabled
    if (preferences.channels.sms) {
      return 'sms';
    }

    // If only email/push are enabled, we can't send via Gupshup
    // This would need integration with email/push services
    return 'none';
  }

  /**
   * Check if phone number is WhatsApp compatible
   */
  private isWhatsAppCompatible(phoneNumber: string): boolean {
    // Basic validation - in production, this could check against WhatsApp Business API
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    return /^\+[1-9]\d{9,14}$/.test(cleaned) || /^[6-9]\d{9}$/.test(cleaned);
  }

  /**
   * Prepare scheme alert message with localization and template integration
   */
  private async prepareSchemeAlertMessage(
    user: ArtisanProfile,
    schemeData: SchemeNotificationData,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<PreparedMessage> {
    const targetLanguage = user.preferences.language || 'hi';
    
    // Create base message content
    const baseMessage = this.createPlainSchemeAlertMessage(user, schemeData, 'hi');
    
    // Create localization context
    const localizationContext: LocalizationContext = {
      userId: user.id,
      targetLanguage,
      sourceLanguage: 'hi',
      preferences,
      messageType: 'scheme_alert',
      channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
    };

    // Localize the message
    const localizedMessage = await this.localizationService.localizeMessage(
      baseMessage,
      localizationContext
    );

    return {
      content: localizedMessage.content,
      templateName: localizedMessage.templateName,
      templateParams: localizedMessage.templateParams,
      language: localizedMessage.language,
      channel,
      metadata: {
        originalContent: baseMessage,
        translationUsed: localizedMessage.metadata.translationUsed,
        templateUsed: localizedMessage.metadata.templateUsed,
        optimizedForChannel: channel === 'sms',
      },
    };
  }

  /**
   * Create plain text scheme alert message
   */
  private createPlainSchemeAlertMessage(
    user: ArtisanProfile,
    schemeData: SchemeNotificationData,
    language: string
  ): string {
    const baseMessage = `नमस्ते ${user.personalInfo.name}! 

आपके लिए एक नई योजना उपलब्ध है:
📋 योजना: ${schemeData.schemeName}
💰 राशि: ${schemeData.estimatedAmount}
📅 अंतिम तिथि: ${schemeData.applicationDeadline ? this.formatDate(schemeData.applicationDeadline, language) : 'जल्द आवेदन करें'}
🎯 लाभ: ${schemeData.benefits}

आवेदन करने के लिए: ${schemeData.applicationUrl || 'संपर्क करें'}

- कला सारथी टीम`;

    return baseMessage;
  }

  /**
   * Prepare deadline reminder message
   */
  private async prepareDeadlineReminderMessage(
    user: ArtisanProfile,
    reminderData: any,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<PreparedMessage> {
    const targetLanguage = user.preferences.language || 'hi';
    
    const urgencyText = reminderData.urgency === 'high' ? '⚠️ अंतिम चेतावनी' : 
                       reminderData.urgency === 'medium' ? '⏰ महत्वपूर्ण' : '📅 अनुस्मारक';

    const baseMessage = `${urgencyText}

नमस्ते ${user.personalInfo.name}!

योजना "${reminderData.title}" के लिए आवेदन की अंतिम तिथि केवल ${reminderData.daysRemaining} दिन बाकी है।

जल्दी आवेदन करें: ${reminderData.application.website || 'संपर्क करें'}

- कला सारथी टीम`;

    // Create localization context
    const localizationContext: LocalizationContext = {
      userId: user.id,
      targetLanguage,
      sourceLanguage: 'hi',
      preferences,
      messageType: 'deadline_reminder',
      channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
    };

    // Localize the message
    const localizedMessage = await this.localizationService.localizeMessage(
      baseMessage,
      localizationContext
    );

    return {
      content: localizedMessage.content,
      templateName: localizedMessage.templateName,
      templateParams: localizedMessage.templateParams,
      language: localizedMessage.language,
      channel,
      metadata: {
        originalContent: baseMessage,
        translationUsed: localizedMessage.metadata.translationUsed,
        templateUsed: localizedMessage.metadata.templateUsed,
        optimizedForChannel: channel === 'sms',
      },
    };
  }

  /**
   * Prepare application update message
   */
  private async prepareApplicationUpdateMessage(
    user: ArtisanProfile,
    application: any,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<PreparedMessage> {
    const targetLanguage = user.preferences.language || 'hi';
    
    const statusText = this.getStatusText(application.status, 'hi');
    const statusEmoji = this.getStatusEmoji(application.status);

    const baseMessage = `${statusEmoji} आवेदन अपडेट

नमस्ते ${user.personalInfo.name}!

आपके आवेदन "${application.schemeName}" की स्थिति अपडेट हुई है:

स्थिति: ${statusText}
${application.outcome === 'approved' && application.approvedAmount ? 
  `स्वीकृत राशि: ₹${application.approvedAmount.toLocaleString()}` : ''}
${application.rejectionReason ? `कारण: ${application.rejectionReason}` : ''}

अधिक जानकारी के लिए ऐप देखें।

- कला सारथी टीम`;

    // Create localization context
    const localizationContext: LocalizationContext = {
      userId: user.id,
      targetLanguage,
      sourceLanguage: 'hi',
      preferences,
      messageType: 'application_update',
      channel: channel === 'whatsapp' ? 'whatsapp' : 'sms',
    };

    // Localize the message
    const localizedMessage = await this.localizationService.localizeMessage(
      baseMessage,
      localizationContext
    );

    return {
      content: localizedMessage.content,
      templateName: localizedMessage.templateName,
      templateParams: localizedMessage.templateParams,
      language: localizedMessage.language,
      channel,
      metadata: {
        originalContent: baseMessage,
        translationUsed: localizedMessage.metadata.translationUsed,
        templateUsed: localizedMessage.metadata.templateUsed,
        optimizedForChannel: channel === 'sms',
      },
    };
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return this.userPreferenceService.getUserPreferences(userId);
  }

  /**
   * Optimize message for SMS character limits
   */
  private optimizeForSMS(message: string): string {
    if (message.length <= 160) {
      return message;
    }

    // Remove extra whitespace and line breaks
    let optimized = message.replace(/\n\s*\n/g, '\n').trim();
    
    // If still too long, truncate intelligently
    if (optimized.length > 160) {
      // Find the last complete sentence within limit
      const truncated = optimized.substring(0, 157);
      const lastPeriod = truncated.lastIndexOf('।');
      const lastNewline = truncated.lastIndexOf('\n');
      
      const cutPoint = Math.max(lastPeriod, lastNewline);
      if (cutPoint > 100) {
        optimized = truncated.substring(0, cutPoint + 1) + '...';
      } else {
        optimized = truncated + '...';
      }
    }

    return optimized;
  }

  /**
   * Format date for display in specified language
   */
  private formatDate(date: Date, language: string): string {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };

    try {
      return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', options);
    } catch {
      return date.toLocaleDateString('hi-IN', options);
    }
  }

  /**
   * Extract language from timezone (simple heuristic)
   */
  private extractLanguageFromTimezone(timezone: string): string {
    if (timezone.includes('Kolkata') || timezone.includes('Delhi')) {
      return 'hi';
    }
    return 'en';
  }

  /**
   * Get status text in specified language
   */
  private getStatusText(status: string, language: string): string {
    const statusMap: Record<string, Record<string, string>> = {
      hi: {
        draft: 'मसौदा',
        submitted: 'जमा किया गया',
        under_review: 'समीक्षाधीन',
        approved: 'स्वीकृत',
        rejected: 'अस्वीकृत',
        on_hold: 'रोक पर',
      },
      en: {
        draft: 'Draft',
        submitted: 'Submitted',
        under_review: 'Under Review',
        approved: 'Approved',
        rejected: 'Rejected',
        on_hold: 'On Hold',
      },
    };

    return statusMap[language]?.[status] || statusMap.hi[status] || status;
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      draft: '📝',
      submitted: '📤',
      under_review: '🔍',
      approved: '✅',
      rejected: '❌',
      on_hold: '⏸️',
    };

    return emojiMap[status] || '📋';
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for global use
 */
let notificationOrchestratorInstance: NotificationOrchestrator | null = null;

export function getNotificationOrchestrator(): NotificationOrchestrator {
  if (!notificationOrchestratorInstance) {
    notificationOrchestratorInstance = new NotificationOrchestrator();
  }
  return notificationOrchestratorInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearNotificationOrchestratorInstance(): void {
  notificationOrchestratorInstance = null;
}