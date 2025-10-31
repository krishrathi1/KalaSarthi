/**
 * Notification Templates Service
 * 
 * Manages notification templates and content generation
 */

import {
  NotificationTemplate,
  NotificationType,
  NotificationPriority,
  ChannelType,
  PRIORITY_CHANNELS,
} from '@/lib/types/artisan-buddy-notifications';

export class NotificationTemplates {
  private static instance: NotificationTemplates;
  private templates: Map<string, NotificationTemplate>;

  private constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  public static getInstance(): NotificationTemplates {
    if (!NotificationTemplates.instance) {
      NotificationTemplates.instance = new NotificationTemplates();
    }
    return NotificationTemplates.instance;
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // Buyer Inquiry Template
    this.registerTemplate({
      id: 'buyer_inquiry',
      type: 'buyer_inquiry',
      priority: 'high',
      titleTemplate: 'New Buyer Inquiry from {{buyerName}}',
      messageTemplate: 'Hi {{artisanName}}, {{buyerName}} from {{buyerLocation}} is interested in your {{productName}}. They would like to know more about pricing and availability.',
      actionUrlTemplate: '/buyer-connect/inquiries/{{inquiryId}}',
      actionLabelTemplate: 'View Inquiry',
      defaultChannels: ['in_app', 'push', 'email'],
      variables: ['artisanName', 'buyerName', 'buyerLocation', 'productName', 'inquiryId'],
      language: 'en',
    });

    // Scheme Deadline Template
    this.registerTemplate({
      id: 'scheme_deadline',
      type: 'scheme_deadline',
      priority: 'urgent',
      titleTemplate: 'Scheme Deadline Approaching: {{schemeName}}',
      messageTemplate: 'Hi {{artisanName}}, the application deadline for {{schemeName}} is in {{daysRemaining}} days. Don\'t miss this opportunity!',
      actionUrlTemplate: '/scheme-sahayak/schemes/{{schemeId}}',
      actionLabelTemplate: 'Apply Now',
      defaultChannels: ['in_app', 'push', 'email', 'sms'],
      variables: ['artisanName', 'schemeName', 'daysRemaining', 'schemeId'],
      language: 'en',
    });

    // Market Trend Template
    this.registerTemplate({
      id: 'market_trend',
      type: 'market_trend',
      priority: 'medium',
      titleTemplate: 'Market Opportunity: {{trendTitle}}',
      messageTemplate: 'Hi {{artisanName}}, we\'ve noticed {{trendDescription}}. This could be a great opportunity for your {{craftType}} products!',
      actionUrlTemplate: '/marketplace/trends/{{trendId}}',
      actionLabelTemplate: 'Learn More',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'trendTitle', 'trendDescription', 'craftType', 'trendId'],
      language: 'en',
    });

    // Task Reminder Template
    this.registerTemplate({
      id: 'task_reminder',
      type: 'task_reminder',
      priority: 'medium',
      titleTemplate: 'Reminder: {{taskTitle}}',
      messageTemplate: 'Hi {{artisanName}}, don\'t forget to {{taskDescription}}. This is due in {{daysRemaining}} days.',
      actionUrlTemplate: '/tasks/{{taskId}}',
      actionLabelTemplate: 'Complete Task',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'taskTitle', 'taskDescription', 'daysRemaining', 'taskId'],
      language: 'en',
    });

    // Milestone Celebration Template
    this.registerTemplate({
      id: 'milestone_celebration',
      type: 'milestone_celebration',
      priority: 'low',
      titleTemplate: '🎉 Congratulations {{artisanName}}!',
      messageTemplate: 'You\'ve achieved a milestone: {{milestoneTitle}}! {{milestoneDescription}}. Keep up the great work!',
      actionUrlTemplate: '/profile/achievements',
      actionLabelTemplate: 'View Achievements',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'milestoneTitle', 'milestoneDescription'],
      language: 'en',
    });

    // Low Inventory Template
    this.registerTemplate({
      id: 'low_inventory',
      type: 'low_inventory',
      priority: 'high',
      titleTemplate: 'Low Stock Alert: {{productName}}',
      messageTemplate: 'Hi {{artisanName}}, your {{productName}} is running low ({{currentStock}} remaining). Consider restocking to avoid missing sales.',
      actionUrlTemplate: '/inventory/products/{{productId}}',
      actionLabelTemplate: 'Update Inventory',
      defaultChannels: ['in_app', 'push', 'email'],
      variables: ['artisanName', 'productName', 'currentStock', 'productId'],
      language: 'en',
    });

    // Sales Achievement Template
    this.registerTemplate({
      id: 'sales_achievement',
      type: 'sales_achievement',
      priority: 'low',
      titleTemplate: '🎊 Sales Milestone Reached!',
      messageTemplate: 'Congratulations {{artisanName}}! You\'ve reached {{achievementValue}} in sales this {{period}}. That\'s {{percentageIncrease}}% more than last {{period}}!',
      actionUrlTemplate: '/digital-khata/analytics',
      actionLabelTemplate: 'View Analytics',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'achievementValue', 'period', 'percentageIncrease'],
      language: 'en',
    });

    // Profile Incomplete Template
    this.registerTemplate({
      id: 'profile_incomplete',
      type: 'profile_incomplete',
      priority: 'medium',
      titleTemplate: 'Complete Your Profile',
      messageTemplate: 'Hi {{artisanName}}, your profile is {{completionPercentage}}% complete. Add {{missingFields}} to attract more buyers and opportunities.',
      actionUrlTemplate: '/profile/edit',
      actionLabelTemplate: 'Complete Profile',
      defaultChannels: ['in_app'],
      variables: ['artisanName', 'completionPercentage', 'missingFields'],
      language: 'en',
    });

    // Product Suggestion Template
    this.registerTemplate({
      id: 'product_suggestion',
      type: 'product_suggestion',
      priority: 'medium',
      titleTemplate: 'Product Suggestion: {{suggestedProduct}}',
      messageTemplate: 'Hi {{artisanName}}, based on market trends, {{suggestedProduct}} is in high demand. Consider adding it to your catalog!',
      actionUrlTemplate: '/product-creator',
      actionLabelTemplate: 'Create Product',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'suggestedProduct'],
      language: 'en',
    });

    // Buyer Connection Template
    this.registerTemplate({
      id: 'buyer_connection',
      type: 'buyer_connection',
      priority: 'high',
      titleTemplate: 'New Buyer Connection: {{buyerName}}',
      messageTemplate: 'Hi {{artisanName}}, {{buyerName}} has connected with you on KalaSarthi. They are interested in {{interestArea}}.',
      actionUrlTemplate: '/buyer-connect/connections/{{connectionId}}',
      actionLabelTemplate: 'View Connection',
      defaultChannels: ['in_app', 'push', 'email'],
      variables: ['artisanName', 'buyerName', 'interestArea', 'connectionId'],
      language: 'en',
    });

    // Skill Certification Template
    this.registerTemplate({
      id: 'skill_certification',
      type: 'skill_certification',
      priority: 'medium',
      titleTemplate: 'Certification Opportunity: {{certificationName}}',
      messageTemplate: 'Hi {{artisanName}}, a new certification program for {{certificationName}} is available. This could enhance your credibility and attract more buyers.',
      actionUrlTemplate: '/certifications/{{certificationId}}',
      actionLabelTemplate: 'Learn More',
      defaultChannels: ['in_app', 'push'],
      variables: ['artisanName', 'certificationName', 'certificationId'],
      language: 'en',
    });
  }

  /**
   * Register a template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template by type
   */
  getTemplateByType(type: NotificationType): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.type === type);
  }

  /**
   * Render template with variables
   */
  renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): { title: string; message: string; actionUrl?: string; actionLabel?: string } | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    return {
      title: this.replaceVariables(template.titleTemplate, variables),
      message: this.replaceVariables(template.messageTemplate, variables),
      actionUrl: template.actionUrlTemplate
        ? this.replaceVariables(template.actionUrlTemplate, variables)
        : undefined,
      actionLabel: template.actionLabelTemplate
        ? this.replaceVariables(template.actionLabelTemplate, variables)
        : undefined,
    };
  }

  /**
   * Replace variables in template string
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get default channels for priority
   */
  getDefaultChannels(priority: NotificationPriority): ChannelType[] {
    return PRIORITY_CHANNELS[priority];
  }

  /**
   * Get all templates
   */
  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by priority
   */
  getTemplatesByPriority(priority: NotificationPriority): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.priority === priority);
  }

  /**
   * Validate template variables
   */
  validateVariables(templateId: string, variables: Record<string, string>): {
    valid: boolean;
    missing: string[];
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, missing: [] };
    }

    const missing = template.variables.filter(v => !variables[v]);
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const notificationTemplates = NotificationTemplates.getInstance();
