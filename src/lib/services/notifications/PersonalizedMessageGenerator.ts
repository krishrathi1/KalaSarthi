/**
 * Personalized Message Generator
 * Creates scheme-specific message templates with dynamic content,
 * match score integration, and personalization based on user profile
 */

import { 
  GovernmentScheme, 
  ArtisanProfile,
  NotificationPreferences 
} from '../../types/scheme-sahayak';
import { SchemeMatchResult } from './SchemeAlertTriggerService';
import { UnifiedTranslationService } from '../UnifiedTranslationService';
import { getGupshupLogger } from './GupshupLogger';

export interface PersonalizedMessage {
  content: string;
  templateName: string;
  templateParams: Record<string, string>;
  language: string;
  channel: 'whatsapp' | 'sms';
  personalizationLevel: 'basic' | 'standard' | 'advanced';
  metadata: {
    matchScore: number;
    personalizationFactors: string[];
    contentLength: number;
    urgencyLevel: 'low' | 'medium' | 'high';
    estimatedReadTime: number;
  };
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'scheme_alert' | 'deadline_reminder' | 'application_update';
  channel: 'whatsapp' | 'sms' | 'both';
  language: string;
  template: string;
  parameters: string[];
  maxLength?: number;
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface PersonalizationContext {
  user: ArtisanProfile;
  scheme: GovernmentScheme;
  matchResult: SchemeMatchResult;
  urgency: 'low' | 'medium' | 'high';
  channel: 'whatsapp' | 'sms';
  language: string;
}

/**
 * Service for generating personalized scheme alert messages
 */
export class PersonalizedMessageGenerator {
  private translationService: UnifiedTranslationService;
  private logger: ReturnType<typeof getGupshupLogger>;
  private messageTemplates: Map<string, MessageTemplate> = new Map();

  constructor(translationService?: UnifiedTranslationService) {
    this.translationService = translationService || new UnifiedTranslationService();
    this.logger = getGupshupLogger();
    this.initializeTemplates();
  }

  /**
   * Generate personalized message for scheme alert
   */
  async generateSchemeAlertMessage(context: PersonalizationContext): Promise<PersonalizedMessage> {
    try {
      this.logger.info('message_generation_start', 'Starting personalized message generation', {
        userId: context.user.id,
        schemeId: context.scheme.id,
        matchScore: context.matchResult.matchScore,
        channel: context.channel,
        language: context.language
      });

      // Select appropriate template
      const template = this.selectTemplate(context);
      
      // Generate personalized content
      const personalizedContent = await this.generatePersonalizedContent(context, template);
      
      // Apply channel-specific optimizations
      const optimizedMessage = this.optimizeForChannel(personalizedContent, context.channel);
      
      // Calculate metadata
      const metadata = this.calculateMessageMetadata(optimizedMessage, context);

      const message: PersonalizedMessage = {
        content: optimizedMessage.content,
        templateName: template.name,
        templateParams: optimizedMessage.templateParams,
        language: context.language,
        channel: context.channel,
        personalizationLevel: this.determinePersonalizationLevel(context),
        metadata
      };

      this.logger.info('message_generation_success', 'Successfully generated personalized message', {
        userId: context.user.id,
        schemeId: context.scheme.id,
        contentLength: message.content.length,
        personalizationLevel: message.personalizationLevel
      });

      return message;
    } catch (error) {
      this.logger.error('message_generation_error', 'Failed to generate personalized message', {
        userId: context.user.id,
        schemeId: context.scheme.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return fallback message
      return this.generateFallbackMessage(context);
    }
  }

  /**
   * Generate batch of personalized messages for multiple users
   */
  async generateBatchMessages(
    scheme: GovernmentScheme,
    matchResults: SchemeMatchResult[],
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<PersonalizedMessage[]> {
    const messages: PersonalizedMessage[] = [];
    
    this.logger.info('batch_generation_start', 'Starting batch message generation', {
      schemeId: scheme.id,
      userCount: matchResults.length,
      urgency
    });

    for (const matchResult of matchResults) {
      try {
        // Determine user's preferred language and channel
        const language = matchResult.user.preferences?.language || 'hi';
        const channel = this.selectOptimalChannel(matchResult.user);

        const context: PersonalizationContext = {
          user: matchResult.user,
          scheme,
          matchResult,
          urgency,
          channel,
          language
        };

        const message = await this.generateSchemeAlertMessage(context);
        messages.push(message);
      } catch (error) {
        this.logger.error('batch_generation_user_error', 'Failed to generate message for user', {
          userId: matchResult.user.id,
          schemeId: scheme.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.info('batch_generation_complete', 'Completed batch message generation', {
      schemeId: scheme.id,
      successfulMessages: messages.length,
      totalUsers: matchResults.length
    });

    return messages;
  }

  /**
   * Select appropriate template based on context
   */
  private selectTemplate(context: PersonalizationContext): MessageTemplate {
    const templateKey = `scheme_alert_${context.channel}_${context.language}_${context.urgency}`;
    
    // Try specific template first
    let template = this.messageTemplates.get(templateKey);
    
    if (!template) {
      // Fallback to general template
      const fallbackKey = `scheme_alert_${context.channel}_${context.language}_medium`;
      template = this.messageTemplates.get(fallbackKey);
    }
    
    if (!template) {
      // Final fallback to English template
      const englishKey = `scheme_alert_${context.channel}_en_medium`;
      template = this.messageTemplates.get(englishKey);
    }
    
    if (!template) {
      // Create emergency fallback template
      template = this.createFallbackTemplate(context.channel, context.language);
    }

    return template;
  }

  /**
   * Generate personalized content using template and context
   */
  private async generatePersonalizedContent(
    context: PersonalizationContext,
    template: MessageTemplate
  ): Promise<{ content: string; templateParams: Record<string, string> }> {
    const { user, scheme, matchResult } = context;
    
    // Build template parameters
    const templateParams: Record<string, string> = {
      userName: user.personalInfo.name,
      schemeName: scheme.title,
      schemeAmount: this.formatAmount(scheme.benefits.amount.max),
      matchScore: Math.round(matchResult.matchScore).toString(),
      businessType: user.business.type,
      location: `${user.location.district}, ${user.location.state}`,
      benefits: this.summarizeBenefits(scheme),
      eligibilityHighlight: this.getEligibilityHighlight(matchResult),
      urgencyIndicator: this.getUrgencyIndicator(context.urgency, scheme),
      applicationDeadline: this.formatDeadline(scheme.application.deadline),
      processingTime: this.formatProcessingTime(scheme.metadata.averageProcessingTime),
      successRate: `${scheme.metadata.successRate}%`,
      personalizedReasons: this.formatPersonalizedReasons(matchResult.reasons)
    };

    // Replace template placeholders
    let content = template.template;
    for (const [key, value] of Object.entries(templateParams)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Apply language-specific formatting
    if (context.language !== 'en') {
      content = await this.applyLanguageFormatting(content, context.language);
    }

    return { content, templateParams };
  }

  /**
   * Optimize message for specific channel
   */
  private optimizeForChannel(
    message: { content: string; templateParams: Record<string, string> },
    channel: 'whatsapp' | 'sms'
  ): { content: string; templateParams: Record<string, string> } {
    if (channel === 'sms') {
      return this.optimizeForSMS(message);
    } else {
      return this.optimizeForWhatsApp(message);
    }
  }

  /**
   * Optimize message for SMS (160 character limit)
   */
  private optimizeForSMS(
    message: { content: string; templateParams: Record<string, string> }
  ): { content: string; templateParams: Record<string, string> } {
    let { content } = message;
    
    // If content is within SMS limit, return as is
    if (content.length <= 160) {
      return message;
    }

    // Apply SMS optimizations
    content = content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Use abbreviations
      .replace(/Government/gi, 'Govt')
      .replace(/Scheme/gi, 'Yojana')
      .replace(/Application/gi, 'Apply')
      .replace(/Registration/gi, 'Reg')
      .replace(/Information/gi, 'Info')
      // Remove less critical information if still too long
      .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content
      .replace(/\s*-[^.]*\./g, '.'); // Remove dash-separated clauses

    // If still too long, truncate and add continuation indicator
    if (content.length > 155) {
      content = content.substring(0, 152) + '...';
    }

    return {
      content,
      templateParams: message.templateParams
    };
  }

  /**
   * Optimize message for WhatsApp (richer formatting)
   */
  private optimizeForWhatsApp(
    message: { content: string; templateParams: Record<string, string> }
  ): { content: string; templateParams: Record<string, string> } {
    let { content } = message;
    
    // Add WhatsApp formatting
    content = content
      // Bold important information
      .replace(/₹[\d,]+/g, '*$&*') // Bold amounts
      .replace(/\d+%/g, '*$&*') // Bold percentages
      // Add emojis for better engagement
      .replace(/🎯/g, '🎯') // Keep existing emojis
      .replace(/💰/g, '💰')
      .replace(/⏰/g, '⏰')
      .replace(/✅/g, '✅');

    return {
      content,
      templateParams: message.templateParams
    };
  }

  /**
   * Calculate message metadata
   */
  private calculateMessageMetadata(
    message: { content: string; templateParams: Record<string, string> },
    context: PersonalizationContext
  ): PersonalizedMessage['metadata'] {
    const personalizationFactors: string[] = [];
    
    // Analyze personalization factors
    if (context.matchResult.matchScore >= 90) personalizationFactors.push('High match score');
    if (context.matchResult.reasons.length > 3) personalizationFactors.push('Multiple eligibility matches');
    if (context.user.business.type) personalizationFactors.push('Business type specific');
    if (context.user.location.state) personalizationFactors.push('Location specific');
    if (context.scheme.metadata.successRate > 80) personalizationFactors.push('High success rate highlight');

    // Estimate reading time (average 200 words per minute, 5 characters per word)
    const estimatedReadTime = Math.ceil(message.content.length / (200 * 5 / 60));

    return {
      matchScore: context.matchResult.matchScore,
      personalizationFactors,
      contentLength: message.content.length,
      urgencyLevel: context.urgency,
      estimatedReadTime
    };
  }

  /**
   * Determine personalization level based on available data
   */
  private determinePersonalizationLevel(context: PersonalizationContext): 'basic' | 'standard' | 'advanced' {
    let score = 0;
    
    // Check available personalization data
    if (context.user.personalInfo.name) score += 1;
    if (context.user.business.type) score += 1;
    if (context.user.location.state && context.user.location.district) score += 1;
    if (context.matchResult.matchScore >= 80) score += 1;
    if (context.matchResult.reasons.length >= 3) score += 1;
    if (context.scheme.metadata.successRate > 70) score += 1;

    if (score >= 5) return 'advanced';
    if (score >= 3) return 'standard';
    return 'basic';
  }

  /**
   * Select optimal channel for user
   */
  private selectOptimalChannel(user: ArtisanProfile): 'whatsapp' | 'sms' {
    const preferences = user.preferences?.notifications;
    
    if (preferences?.whatsappEnabled && preferences?.smsEnabled) {
      // Prefer WhatsApp for richer content
      return 'whatsapp';
    } else if (preferences?.whatsappEnabled) {
      return 'whatsapp';
    } else {
      return 'sms';
    }
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: number): string {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1)} करोड़`;
    } else if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1)} लाख`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)} हजार`;
    } else {
      return `₹${amount.toLocaleString('hi-IN')}`;
    }
  }

  /**
   * Summarize scheme benefits
   */
  private summarizeBenefits(scheme: GovernmentScheme): string {
    const benefits: string[] = [];
    
    if (scheme.benefits.type === 'loan') {
      benefits.push('ऋण सहायता');
    } else if (scheme.benefits.type === 'grant') {
      benefits.push('अनुदान');
    } else if (scheme.benefits.type === 'subsidy') {
      benefits.push('सब्सिडी');
    }
    
    if (scheme.application.onlineApplication) {
      benefits.push('ऑनलाइन आवेदन');
    }
    
    if (scheme.metadata.averageProcessingTime <= 30) {
      benefits.push('तेज़ प्रक्रिया');
    }
    
    return benefits.join(', ');
  }

  /**
   * Get eligibility highlight based on match result
   */
  private getEligibilityHighlight(matchResult: SchemeMatchResult): string {
    if (matchResult.matchScore >= 90) {
      return '✅ आप पूर्णतः योग्य हैं';
    } else if (matchResult.matchScore >= 70) {
      return '🎯 आप योग्य हैं';
    } else {
      return '📋 योग्यता की जांच करें';
    }
  }

  /**
   * Get urgency indicator
   */
  private getUrgencyIndicator(urgency: 'low' | 'medium' | 'high', scheme: GovernmentScheme): string {
    if (urgency === 'high' || this.isDeadlineUrgent(scheme.application.deadline)) {
      return '⏰ तुरंत आवेदन करें';
    } else if (urgency === 'medium') {
      return '📅 जल्दी आवेदन करें';
    } else {
      return '📝 आवेदन करें';
    }
  }

  /**
   * Check if deadline is urgent (within 7 days)
   */
  private isDeadlineUrgent(deadline?: Date): boolean {
    if (!deadline) return false;
    
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 7 && daysDiff > 0;
  }

  /**
   * Format deadline for display
   */
  private formatDeadline(deadline?: Date): string {
    if (!deadline) return 'कोई समय सीमा नहीं';
    
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) {
      return 'समय सीमा समाप्त';
    } else if (daysDiff === 1) {
      return 'कल तक';
    } else if (daysDiff <= 7) {
      return `${daysDiff} दिन बचे`;
    } else {
      return deadline.toLocaleDateString('hi-IN');
    }
  }

  /**
   * Format processing time
   */
  private formatProcessingTime(days: number): string {
    if (days <= 7) {
      return `${days} दिन में`;
    } else if (days <= 30) {
      return `${Math.ceil(days / 7)} सप्ताह में`;
    } else {
      return `${Math.ceil(days / 30)} महीने में`;
    }
  }

  /**
   * Format personalized reasons
   */
  private formatPersonalizedReasons(reasons: string[]): string {
    if (reasons.length === 0) return '';
    
    const translatedReasons = reasons.map(reason => {
      // Simple translation mapping
      const translations: Record<string, string> = {
        'Business type matches': 'व्यवसाय प्रकार मैच',
        'Location matches': 'स्थान मैच',
        'Age criteria met': 'आयु मानदंड पूरे',
        'Income criteria met': 'आय मानदंड पूरे',
        'High success rate': 'उच्च सफलता दर',
        'Online application available': 'ऑनलाइन आवेदन उपलब्ध',
        'Fast processing': 'तेज़ प्रक्रिया'
      };
      
      return translations[reason] || reason;
    });
    
    return translatedReasons.slice(0, 3).join(', ');
  }

  /**
   * Apply language-specific formatting
   */
  private async applyLanguageFormatting(content: string, language: string): Promise<string> {
    try {
      // Use translation service for proper formatting
      if (language === 'hi') {
        // Hindi-specific formatting is already applied in templates
        return content;
      } else if (language !== 'en') {
        // Translate to target language
        return await this.translationService.translateText(content, 'hi', language);
      }
      
      return content;
    } catch (error) {
      this.logger.error('language_formatting_error', 'Failed to apply language formatting', error);
      return content; // Return original content on error
    }
  }

  /**
   * Generate fallback message when personalization fails
   */
  private generateFallbackMessage(context: PersonalizationContext): PersonalizedMessage {
    const fallbackContent = context.channel === 'sms' 
      ? `नई योजना: ${context.scheme.title}। आवेदन करें: [LINK]`
      : `🎯 *नई सरकारी योजना*\n\n${context.scheme.title}\n\n💰 राशि: ${this.formatAmount(context.scheme.benefits.amount.max)}\n\n📝 आवेदन करें: [LINK]`;

    return {
      content: fallbackContent,
      templateName: 'fallback_scheme_alert',
      templateParams: {
        schemeName: context.scheme.title,
        schemeAmount: this.formatAmount(context.scheme.benefits.amount.max)
      },
      language: context.language,
      channel: context.channel,
      personalizationLevel: 'basic',
      metadata: {
        matchScore: context.matchResult.matchScore,
        personalizationFactors: ['Fallback message'],
        contentLength: fallbackContent.length,
        urgencyLevel: context.urgency,
        estimatedReadTime: 1
      }
    };
  }

  /**
   * Create fallback template when no template is found
   */
  private createFallbackTemplate(channel: 'whatsapp' | 'sms', language: string): MessageTemplate {
    const template = channel === 'sms'
      ? 'नई योजना: {{schemeName}}। राशि: {{schemeAmount}}। आवेदन: [LINK]'
      : '🎯 *नई योजना*\n\n{{schemeName}}\n\n💰 {{schemeAmount}}\n{{eligibilityHighlight}}\n\n{{urgencyIndicator}}: [LINK]';

    return {
      id: `fallback_${channel}_${language}`,
      name: `fallback_scheme_alert_${channel}_${language}`,
      category: 'scheme_alert',
      channel,
      language,
      template,
      parameters: ['schemeName', 'schemeAmount', 'eligibilityHighlight', 'urgencyIndicator'],
      maxLength: channel === 'sms' ? 160 : undefined,
      urgencyLevel: 'medium'
    };
  }

  /**
   * Initialize message templates
   */
  private initializeTemplates(): void {
    // WhatsApp templates in Hindi
    this.messageTemplates.set('scheme_alert_whatsapp_hi_high', {
      id: 'scheme_alert_whatsapp_hi_high',
      name: 'scheme_alert_whatsapp_hi_high',
      category: 'scheme_alert',
      channel: 'whatsapp',
      language: 'hi',
      template: `🚨 *तुरंत आवेदन करें* 🚨

नमस्ते {{userName}} जी,

🎯 *{{schemeName}}*

💰 राशि: *{{schemeAmount}}*
📊 मैच स्कोर: *{{matchScore}}%*
{{eligibilityHighlight}}

✅ आपके लिए विशेष:
{{personalizedReasons}}

⏰ *{{applicationDeadline}}*
🏃‍♂️ प्रक्रिया समय: {{processingTime}}
📈 सफलता दर: *{{successRate}}*

{{urgencyIndicator}}: [APPLY_LINK]

❌ रुकना = अवसर खोना`,
      parameters: ['userName', 'schemeName', 'schemeAmount', 'matchScore', 'eligibilityHighlight', 'personalizedReasons', 'applicationDeadline', 'processingTime', 'successRate', 'urgencyIndicator'],
      urgencyLevel: 'high'
    });

    this.messageTemplates.set('scheme_alert_whatsapp_hi_medium', {
      id: 'scheme_alert_whatsapp_hi_medium',
      name: 'scheme_alert_whatsapp_hi_medium',
      category: 'scheme_alert',
      channel: 'whatsapp',
      language: 'hi',
      template: `🎯 *नई सरकारी योजना*

नमस्ते {{userName}} जी,

📋 *{{schemeName}}*

💰 राशि: {{schemeAmount}}
{{eligibilityHighlight}}
📍 स्थान: {{location}}

✅ लाभ: {{benefits}}
⏱️ प्रक्रिया: {{processingTime}}
📊 सफलता: {{successRate}}

{{urgencyIndicator}}: [APPLY_LINK]

ℹ️ अधिक जानकारी के लिए लिंक पर क्लिक करें`,
      parameters: ['userName', 'schemeName', 'schemeAmount', 'eligibilityHighlight', 'location', 'benefits', 'processingTime', 'successRate', 'urgencyIndicator'],
      urgencyLevel: 'medium'
    });

    // SMS templates in Hindi
    this.messageTemplates.set('scheme_alert_sms_hi_high', {
      id: 'scheme_alert_sms_hi_high',
      name: 'scheme_alert_sms_hi_high',
      category: 'scheme_alert',
      channel: 'sms',
      language: 'hi',
      template: '🚨{{userName}}: {{schemeName}} ({{schemeAmount}}) {{applicationDeadline}} तक। तुरंत आवेदन: [LINK]',
      parameters: ['userName', 'schemeName', 'schemeAmount', 'applicationDeadline'],
      maxLength: 160,
      urgencyLevel: 'high'
    });

    this.messageTemplates.set('scheme_alert_sms_hi_medium', {
      id: 'scheme_alert_sms_hi_medium',
      name: 'scheme_alert_sms_hi_medium',
      category: 'scheme_alert',
      channel: 'sms',
      language: 'hi',
      template: '{{userName}}: नई योजना {{schemeName}} ({{schemeAmount}})। {{eligibilityHighlight}} आवेदन: [LINK]',
      parameters: ['userName', 'schemeName', 'schemeAmount', 'eligibilityHighlight'],
      maxLength: 160,
      urgencyLevel: 'medium'
    });

    // English templates
    this.messageTemplates.set('scheme_alert_whatsapp_en_medium', {
      id: 'scheme_alert_whatsapp_en_medium',
      name: 'scheme_alert_whatsapp_en_medium',
      category: 'scheme_alert',
      channel: 'whatsapp',
      language: 'en',
      template: `🎯 *New Government Scheme*

Hello {{userName}},

📋 *{{schemeName}}*

💰 Amount: {{schemeAmount}}
{{eligibilityHighlight}}
📍 Location: {{location}}

✅ Benefits: {{benefits}}
⏱️ Processing: {{processingTime}}
📊 Success Rate: {{successRate}}

{{urgencyIndicator}}: [APPLY_LINK]

ℹ️ Click link for more details`,
      parameters: ['userName', 'schemeName', 'schemeAmount', 'eligibilityHighlight', 'location', 'benefits', 'processingTime', 'successRate', 'urgencyIndicator'],
      urgencyLevel: 'medium'
    });

    this.messageTemplates.set('scheme_alert_sms_en_medium', {
      id: 'scheme_alert_sms_en_medium',
      name: 'scheme_alert_sms_en_medium',
      category: 'scheme_alert',
      channel: 'sms',
      language: 'en',
      template: '{{userName}}: New scheme {{schemeName}} ({{schemeAmount}}). {{eligibilityHighlight}} Apply: [LINK]',
      parameters: ['userName', 'schemeName', 'schemeAmount', 'eligibilityHighlight'],
      maxLength: 160,
      urgencyLevel: 'medium'
    });
  }
}

// Singleton instance
let personalizedMessageGeneratorInstance: PersonalizedMessageGenerator | null = null;

export function getPersonalizedMessageGenerator(): PersonalizedMessageGenerator {
  if (!personalizedMessageGeneratorInstance) {
    personalizedMessageGeneratorInstance = new PersonalizedMessageGenerator();
  }
  return personalizedMessageGeneratorInstance;
}

export function clearPersonalizedMessageGeneratorInstance(): void {
  personalizedMessageGeneratorInstance = null;
}