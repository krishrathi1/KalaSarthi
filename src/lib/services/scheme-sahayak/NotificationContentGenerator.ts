/**
 * Notification Content Generator
 * Dynamic content generation with personalization and escalation management
 * 
 * Requirements: 4.1, 4.3
 */

import { 
  SmartNotification,
  ArtisanProfile,
  GovernmentScheme,
  ApplicationStatus,
  SCHEME_SAHAYAK_COLLECTIONS 
} from '../../types/scheme-sahayak';
import { db } from '../../config/scheme-sahayak-firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Notification template structure
 */
interface NotificationTemplate {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  titleTemplate: string;
  messageTemplate: string;
  actionText?: string;
  variables: string[];
}

/**
 * Personalization context for content generation
 */
interface PersonalizationContext {
  artisan: ArtisanProfile;
  scheme?: GovernmentScheme;
  application?: ApplicationStatus;
  metadata?: Record<string, any>;
}

/**
 * Escalation rule configuration
 */
interface EscalationRule {
  type: string;
  condition: (notification: SmartNotification, attempts: number) => boolean;
  escalateTo: 'high' | 'urgent';
  additionalChannels: ('sms' | 'email' | 'push' | 'whatsapp')[];
  escalationMessage: string;
}

/**
 * Notification Content Generator Implementation
 */
export class NotificationContentGenerator {
  private templates: Map<string, NotificationTemplate>;
  private escalationRules: EscalationRule[];

  constructor() {
    this.templates = this.initializeTemplates();
    this.escalationRules = this.initializeEscalationRules();
  }

  /**
   * Generate personalized notification content
   * Requirements: 4.1, 4.3
   */
  async generatePersonalizedNotification(
    userId: string,
    type: string,
    context: Partial<PersonalizationContext>
  ): Promise<SmartNotification> {
    try {
      // Get artisan profile
      const artisan = context.artisan || await this.getArtisanProfile(userId);
      
      // Get template for notification type
      const template = this.templates.get(type);
      if (!template) {
        throw new Error(`Template not found for type: ${type}`);
      }

      // Build personalization context
      const fullContext: PersonalizationContext = {
        artisan,
        scheme: context.scheme,
        application: context.application,
        metadata: context.metadata || {}
      };

      // Generate personalized content
      const title = this.personalizeContent(template.titleTemplate, fullContext);
      const message = this.personalizeContent(template.messageTemplate, fullContext);

      // Determine priority based on context
      const priority = this.determinePriority(type, fullContext);

      // Select appropriate channels
      const channels = this.selectChannelsForPriority(priority);

      // Create notification
      const notification: SmartNotification = {
        id: `notif_${userId}_${Date.now()}`,
        userId,
        title,
        message,
        type: type as any,
        priority,
        channels,
        personalizedContent: true,
        actionUrl: this.generateActionUrl(type, fullContext),
        metadata: {
          ...fullContext.metadata,
          generatedAt: new Date().toISOString(),
          language: artisan.preferences.language || 'en'
        },
        customization: {
          userName: artisan.personalInfo.name,
          businessType: artisan.business.type
        }
      };

      return notification;
    } catch (error) {
      console.error('[NotificationContentGenerator] Generate notification failed:', error);
      throw error;
    }
  }

  /**
   * Generate notification from template with variables
   */
  async generateFromTemplate(
    userId: string,
    templateType: string,
    variables: Record<string, any>
  ): Promise<SmartNotification> {
    try {
      const template = this.templates.get(templateType);
      if (!template) {
        throw new Error(`Template not found: ${templateType}`);
      }

      const artisan = await this.getArtisanProfile(userId);
      
      // Replace variables in template
      let title = template.titleTemplate;
      let message = template.messageTemplate;
      
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), String(value));
        message = message.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Add personalization
      title = title.replace('{{userName}}', artisan.personalInfo.name);
      message = message.replace('{{userName}}', artisan.personalInfo.name);

      const notification: SmartNotification = {
        id: `notif_${userId}_${Date.now()}`,
        userId,
        title,
        message,
        type: templateType as any,
        priority: template.priority,
        channels: this.selectChannelsForPriority(template.priority),
        personalizedContent: true,
        actionUrl: variables.actionUrl,
        metadata: variables,
        customization: {
          userName: artisan.personalInfo.name
        }
      };

      return notification;
    } catch (error) {
      console.error('[NotificationContentGenerator] Generate from template failed:', error);
      throw error;
    }
  }

  /**
   * Apply escalation rules to notification
   * Requirements: 4.3
   */
  async applyEscalation(
    notification: SmartNotification,
    attempts: number
  ): Promise<SmartNotification> {
    try {
      // Check escalation rules
      for (const rule of this.escalationRules) {
        if (rule.type === notification.type && rule.condition(notification, attempts)) {
          console.log(`[NotificationContentGenerator] Escalating notification ${notification.id}`);
          
          // Escalate priority
          notification.priority = rule.escalateTo;
          
          // Add additional channels
          for (const channelType of rule.additionalChannels) {
            const existingChannel = notification.channels.find(c => c.type === channelType);
            if (!existingChannel) {
              notification.channels.push({
                type: channelType,
                fallbackDelay: 0,
                retryAttempts: 2,
                fallbackToManual: true,
                userNotification: true
              });
            }
          }
          
          // Update message with escalation notice
          notification.message = `${rule.escalationMessage}\n\n${notification.message}`;
          notification.metadata.escalated = true;
          notification.metadata.escalationAttempt = attempts;
          
          break;
        }
      }
      
      return notification;
    } catch (error) {
      console.error('[NotificationContentGenerator] Apply escalation failed:', error);
      return notification;
    }
  }

  /**
   * Generate multi-language notification
   */
  async generateMultiLanguageNotification(
    userId: string,
    type: string,
    context: Partial<PersonalizationContext>,
    language: string
  ): Promise<SmartNotification> {
    try {
      const notification = await this.generatePersonalizedNotification(userId, type, context);
      
      // Translate content if not in English
      if (language !== 'en') {
        notification.title = await this.translateContent(notification.title, language);
        notification.message = await this.translateContent(notification.message, language);
        notification.metadata.language = language;
      }
      
      return notification;
    } catch (error) {
      console.error('[NotificationContentGenerator] Generate multi-language notification failed:', error);
      throw error;
    }
  }

  /**
   * Create notification for new scheme match
   */
  async createNewSchemeNotification(
    userId: string,
    scheme: GovernmentScheme,
    aiScore: number
  ): Promise<SmartNotification> {
    return this.generatePersonalizedNotification(userId, 'new_scheme', {
      scheme,
      metadata: {
        schemeId: scheme.id,
        aiScore,
        category: scheme.category
      }
    });
  }

  /**
   * Create notification for deadline reminder
   */
  async createDeadlineReminderNotification(
    userId: string,
    scheme: GovernmentScheme,
    daysRemaining: number
  ): Promise<SmartNotification> {
    return this.generatePersonalizedNotification(userId, 'deadline_reminder', {
      scheme,
      metadata: {
        schemeId: scheme.id,
        daysRemaining,
        deadline: scheme.application.deadline
      }
    });
  }

  /**
   * Create notification for status update
   */
  async createStatusUpdateNotification(
    userId: string,
    application: ApplicationStatus
  ): Promise<SmartNotification> {
    return this.generatePersonalizedNotification(userId, 'status_update', {
      application,
      metadata: {
        applicationId: application.applicationId,
        schemeId: application.schemeId,
        status: application.status,
        currentStage: application.currentStage
      }
    });
  }

  /**
   * Create notification for document requirement
   */
  async createDocumentRequiredNotification(
    userId: string,
    scheme: GovernmentScheme,
    missingDocuments: string[]
  ): Promise<SmartNotification> {
    return this.generatePersonalizedNotification(userId, 'document_required', {
      scheme,
      metadata: {
        schemeId: scheme.id,
        missingDocuments,
        documentCount: missingDocuments.length
      }
    });
  }

  /**
   * Create notification for application rejection
   */
  async createRejectionNotification(
    userId: string,
    application: ApplicationStatus,
    reason: string
  ): Promise<SmartNotification> {
    return this.generatePersonalizedNotification(userId, 'rejection', {
      application,
      metadata: {
        applicationId: application.applicationId,
        schemeId: application.schemeId,
        reason
      }
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): Map<string, NotificationTemplate> {
    const templates = new Map<string, NotificationTemplate>();

    templates.set('new_scheme', {
      type: 'new_scheme',
      priority: 'medium',
      titleTemplate: 'New Scheme Match: {{schemeName}}',
      messageTemplate: 'Hi {{userName}}, we found a scheme that matches your {{businessType}} business with {{aiScore}}% compatibility. Check it out now!',
      actionText: 'View Scheme',
      variables: ['userName', 'businessType', 'schemeName', 'aiScore']
    });

    templates.set('deadline_reminder', {
      type: 'deadline_reminder',
      priority: 'high',
      titleTemplate: 'Deadline Alert: {{schemeName}}',
      messageTemplate: 'Hi {{userName}}, the deadline for "{{schemeName}}" is in {{daysRemaining}} days. Don\'t miss this opportunity!',
      actionText: 'Apply Now',
      variables: ['userName', 'schemeName', 'daysRemaining']
    });

    templates.set('status_update', {
      type: 'status_update',
      priority: 'medium',
      titleTemplate: 'Application Update: {{schemeName}}',
      messageTemplate: 'Hi {{userName}}, your application for "{{schemeName}}" has been updated to: {{status}}. Current stage: {{currentStage}}.',
      actionText: 'View Details',
      variables: ['userName', 'schemeName', 'status', 'currentStage']
    });

    templates.set('document_required', {
      type: 'document_required',
      priority: 'high',
      titleTemplate: 'Documents Required: {{schemeName}}',
      messageTemplate: 'Hi {{userName}}, you need to upload {{documentCount}} documents to complete your application for "{{schemeName}}". Upload them now to avoid delays.',
      actionText: 'Upload Documents',
      variables: ['userName', 'schemeName', 'documentCount']
    });

    templates.set('rejection', {
      type: 'rejection',
      priority: 'medium',
      titleTemplate: 'Application Status: {{schemeName}}',
      messageTemplate: 'Hi {{userName}}, unfortunately your application for "{{schemeName}}" was not approved. Reason: {{reason}}. We can help you find alternative schemes.',
      actionText: 'Find Alternatives',
      variables: ['userName', 'schemeName', 'reason']
    });

    return templates;
  }

  /**
   * Initialize escalation rules
   */
  private initializeEscalationRules(): EscalationRule[] {
    return [
      {
        type: 'deadline_reminder',
        condition: (notification, attempts) => {
          const daysRemaining = notification.metadata?.daysRemaining || 0;
          return daysRemaining <= 1 && attempts >= 1;
        },
        escalateTo: 'urgent',
        additionalChannels: ['sms', 'whatsapp'],
        escalationMessage: '⚠️ URGENT: Deadline is tomorrow!'
      },
      {
        type: 'document_required',
        condition: (notification, attempts) => attempts >= 2,
        escalateTo: 'urgent',
        additionalChannels: ['sms'],
        escalationMessage: '⚠️ URGENT: Missing documents may delay your application!'
      },
      {
        type: 'status_update',
        condition: (notification, attempts) => {
          const status = notification.metadata?.status;
          return status === 'on_hold' && attempts >= 1;
        },
        escalateTo: 'high',
        additionalChannels: ['sms'],
        escalationMessage: '⚠️ Action Required: Your application needs attention!'
      }
    ];
  }

  /**
   * Personalize content with context variables
   */
  private personalizeContent(template: string, context: PersonalizationContext): string {
    let content = template;

    // Replace artisan variables
    content = content.replace('{{userName}}', context.artisan.personalInfo.name);
    content = content.replace('{{businessType}}', context.artisan.business.type);
    content = content.replace('{{location}}', context.artisan.location.district);

    // Replace scheme variables
    if (context.scheme) {
      content = content.replace('{{schemeName}}', context.scheme.title);
      content = content.replace('{{schemeCategory}}', context.scheme.category);
      content = content.replace('{{benefitAmount}}', 
        `₹${context.scheme.benefits.amount.min.toLocaleString('en-IN')} - ₹${context.scheme.benefits.amount.max.toLocaleString('en-IN')}`
      );
    }

    // Replace application variables
    if (context.application) {
      content = content.replace('{{status}}', this.formatStatus(context.application.status));
      content = content.replace('{{currentStage}}', context.application.currentStage);
      content = content.replace('{{progress}}', `${context.application.progress}%`);
    }

    // Replace metadata variables
    if (context.metadata) {
      for (const [key, value] of Object.entries(context.metadata)) {
        content = content.replace(`{{${key}}}`, String(value));
      }
    }

    return content;
  }

  /**
   * Determine notification priority based on context
   */
  private determinePriority(
    type: string,
    context: PersonalizationContext
  ): 'low' | 'medium' | 'high' | 'urgent' {
    // Deadline reminders
    if (type === 'deadline_reminder') {
      const daysRemaining = context.metadata?.daysRemaining || 30;
      if (daysRemaining <= 1) return 'urgent';
      if (daysRemaining <= 7) return 'high';
      return 'medium';
    }

    // Status updates
    if (type === 'status_update') {
      const status = context.application?.status;
      if (status === 'approved') return 'high';
      if (status === 'rejected' || status === 'on_hold') return 'high';
      return 'medium';
    }

    // Document requirements
    if (type === 'document_required') {
      return 'high';
    }

    // New scheme matches
    if (type === 'new_scheme') {
      const aiScore = context.metadata?.aiScore || 0;
      if (aiScore >= 90) return 'high';
      return 'medium';
    }

    return 'medium';
  }

  /**
   * Select channels based on priority
   */
  private selectChannelsForPriority(priority: string): any[] {
    switch (priority) {
      case 'urgent':
        return [
          { type: 'sms', fallbackDelay: 0, retryAttempts: 3, fallbackToManual: true, userNotification: true },
          { type: 'whatsapp', fallbackDelay: 1000, retryAttempts: 2, fallbackToManual: false, userNotification: true },
          { type: 'push', fallbackDelay: 0, retryAttempts: 1, fallbackToManual: false, userNotification: true }
        ];
      case 'high':
        return [
          { type: 'sms', fallbackDelay: 0, retryAttempts: 2, fallbackToManual: false, userNotification: true },
          { type: 'email', fallbackDelay: 2000, retryAttempts: 1, fallbackToManual: false, userNotification: true }
        ];
      case 'medium':
        return [
          { type: 'email', fallbackDelay: 5000, retryAttempts: 1, fallbackToManual: false, userNotification: true },
          { type: 'push', fallbackDelay: 0, retryAttempts: 1, fallbackToManual: false, userNotification: true }
        ];
      default:
        return [
          { type: 'push', fallbackDelay: 0, retryAttempts: 1, fallbackToManual: false, userNotification: true }
        ];
    }
  }

  /**
   * Generate action URL based on notification type
   */
  private generateActionUrl(type: string, context: PersonalizationContext): string | undefined {
    switch (type) {
      case 'new_scheme':
        return context.scheme ? `/schemes/${context.scheme.id}` : '/schemes';
      case 'deadline_reminder':
        return context.scheme ? `/schemes/${context.scheme.id}/apply` : '/schemes';
      case 'status_update':
        return context.application ? `/applications/${context.application.applicationId}` : '/applications';
      case 'document_required':
        return context.scheme ? `/schemes/${context.scheme.id}/documents` : '/documents';
      case 'rejection':
        return '/schemes?filter=alternatives';
      default:
        return '/dashboard';
    }
  }

  /**
   * Get artisan profile from database
   */
  private async getArtisanProfile(userId: string): Promise<ArtisanProfile> {
    try {
      const artisanRef = doc(db, SCHEME_SAHAYAK_COLLECTIONS.ARTISANS, userId);
      const artisanDoc = await getDoc(artisanRef);

      if (!artisanDoc.exists()) {
        throw new Error(`Artisan profile not found: ${userId}`);
      }

      return artisanDoc.data() as ArtisanProfile;
    } catch (error) {
      console.error('[NotificationContentGenerator] Get artisan profile failed:', error);
      throw error;
    }
  }

  /**
   * Translate content to target language
   */
  private async translateContent(content: string, targetLanguage: string): Promise<string> {
    // In production, integrate with Google Translate API or similar
    // For now, return original content with language marker
    console.log(`[NotificationContentGenerator] Translation to ${targetLanguage} requested`);
    
    // Mock translation - in production, use actual translation service
    return content;
  }

  /**
   * Format application status for display
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved': 'Approved ✓',
      'rejected': 'Not Approved',
      'on_hold': 'On Hold'
    };

    return statusMap[status] || status;
  }
}

// Export singleton instance
export const notificationContentGenerator = new NotificationContentGenerator();
