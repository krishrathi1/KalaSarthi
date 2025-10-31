/**
 * Message Localization Service
 * Handles multi-language message preparation with translation system integration
 * and language-specific template selection
 */

import { UnifiedTranslationService, TranslationResult } from '../UnifiedTranslationService';
import { TemplateManager, MessageTemplate } from './TemplateManager';
import { NotificationPreferences } from '../../types/scheme-sahayak';
import { getGupshupLogger } from './GupshupLogger';

export interface LocalizationContext {
  userId: string;
  targetLanguage: string;
  sourceLanguage?: string;
  fallbackLanguage?: string;
  preferences: NotificationPreferences;
  messageType: 'scheme_alert' | 'deadline_reminder' | 'application_update' | 'document_request';
  channel: 'whatsapp' | 'sms';
}

export interface LocalizedMessage {
  content: string;
  language: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  metadata: {
    originalLanguage: string;
    translationUsed: boolean;
    templateUsed: boolean;
    fallbackUsed: boolean;
    confidence: number;
    processingTime: number;
  };
}

export interface LanguageSupport {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  hasTemplates: boolean;
  translationSupported: boolean;
  priority: number; // Higher number = higher priority
}

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  channel: 'whatsapp' | 'sms';
  category: 'scheme_alert' | 'deadline_reminder' | 'application_update' | 'document_request';
  content: string;
  parameters: string[];
  metadata: {
    characterCount: number;
    smsCount?: number;
    approved: boolean;
    lastUpdated: Date;
  };
}

/**
 * Supported languages with their characteristics
 */
export const SUPPORTED_LANGUAGES: Record<string, LanguageSupport> = {
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 10,
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 9,
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 8,
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 8,
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 8,
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 7,
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    rtl: false,
    hasTemplates: true,
    translationSupported: true,
    priority: 7,
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    rtl: false,
    hasTemplates: false,
    translationSupported: true,
    priority: 6,
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    rtl: false,
    hasTemplates: false,
    translationSupported: true,
    priority: 6,
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    rtl: false,
    hasTemplates: false,
    translationSupported: true,
    priority: 6,
  },
  or: {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    rtl: false,
    hasTemplates: false,
    translationSupported: true,
    priority: 5,
  },
  as: {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    rtl: false,
    hasTemplates: false,
    translationSupported: true,
    priority: 5,
  },
};

/**
 * Message Localization Service Implementation
 */
export class MessageLocalizationService {
  private translationService: UnifiedTranslationService;
  private templateManager: TemplateManager;
  private logger: ReturnType<typeof getGupshupLogger>;
  private templateCache: Map<string, MessageTemplate[]>;

  constructor(
    translationService?: UnifiedTranslationService,
    templateManager?: TemplateManager
  ) {
    this.translationService = translationService || new UnifiedTranslationService();
    this.templateManager = templateManager || new TemplateManager();
    this.logger = getGupshupLogger();
    this.templateCache = new Map();
  }

  /**
   * Localize message content for the target language
   */
  async localizeMessage(
    content: string,
    context: LocalizationContext
  ): Promise<LocalizedMessage> {
    const startTime = Date.now();
    let translationUsed = false;
    let templateUsed = false;
    let fallbackUsed = false;
    let confidence = 1.0;

    try {
      // Determine source and target languages
      const sourceLanguage = context.sourceLanguage || this.detectContentLanguage(content);
      const targetLanguage = this.normalizeLanguageCode(context.targetLanguage);
      const fallbackLanguage = context.fallbackLanguage || this.getFallbackLanguage(targetLanguage);

      this.logger.debug('localization_start', 'Starting message localization', {
        userId: context.userId,
        sourceLanguage,
        targetLanguage,
        fallbackLanguage,
        messageType: context.messageType,
        channel: context.channel,
      });

      // Try template-based localization first
      const templateResult = await this.tryTemplateLocalization(content, context, targetLanguage);
      if (templateResult) {
        return {
          ...templateResult,
          metadata: {
            ...templateResult.metadata,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // Fall back to translation-based localization
      let localizedContent = content;
      
      if (sourceLanguage !== targetLanguage) {
        try {
          const translationResult = await this.translationService.translateText(
            content,
            targetLanguage as any,
            sourceLanguage as any
          );
          
          localizedContent = translationResult.translatedText;
          confidence = translationResult.confidence;
          translationUsed = true;

          this.logger.debug('translation_success', 'Content translated successfully', {
            sourceLanguage,
            targetLanguage,
            confidence,
            originalLength: content.length,
            translatedLength: localizedContent.length,
          });

        } catch (translationError) {
          this.logger.warn('translation_failed', 'Translation failed, trying fallback', {
            sourceLanguage,
            targetLanguage,
            error: translationError instanceof Error ? translationError.message : 'Unknown error',
          });

          // Try fallback language
          if (fallbackLanguage && fallbackLanguage !== targetLanguage) {
            try {
              const fallbackResult = await this.translationService.translateText(
                content,
                fallbackLanguage as any,
                sourceLanguage as any
              );
              
              localizedContent = fallbackResult.translatedText;
              confidence = fallbackResult.confidence * 0.8; // Reduce confidence for fallback
              translationUsed = true;
              fallbackUsed = true;

              this.logger.info('fallback_translation_success', 'Fallback translation successful', {
                sourceLanguage,
                targetLanguage,
                fallbackLanguage,
                confidence,
              });

            } catch (fallbackError) {
              this.logger.error('fallback_translation_failed', 'Fallback translation also failed', {
                fallbackLanguage,
                error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
              });
              
              // Use original content as last resort
              confidence = 0.5;
            }
          }
        }
      }

      // Optimize content for the channel
      const optimizedContent = this.optimizeForChannel(localizedContent, context.channel, targetLanguage);

      return {
        content: optimizedContent,
        language: fallbackUsed ? fallbackLanguage! : targetLanguage,
        metadata: {
          originalLanguage: sourceLanguage,
          translationUsed,
          templateUsed,
          fallbackUsed,
          confidence,
          processingTime: Date.now() - startTime,
        },
      };

    } catch (error) {
      this.logger.error('localization_failed', 'Message localization failed', {
        userId: context.userId,
        targetLanguage: context.targetLanguage,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return original content with minimal metadata
      return {
        content,
        language: context.sourceLanguage || 'hi',
        metadata: {
          originalLanguage: context.sourceLanguage || 'hi',
          translationUsed: false,
          templateUsed: false,
          fallbackUsed: false,
          confidence: 0.5,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Try template-based localization
   */
  private async tryTemplateLocalization(
    content: string,
    context: LocalizationContext,
    targetLanguage: string
  ): Promise<LocalizedMessage | null> {
    try {
      // Check if we have templates for this language and message type
      const languageSupport = SUPPORTED_LANGUAGES[targetLanguage];
      if (!languageSupport?.hasTemplates) {
        return null;
      }

      // Get template name based on message type and channel
      const templateName = this.getTemplateName(context.messageType, context.channel);
      
      // Try to get template from template manager
      const template = await this.templateManager.getTemplate(templateName, targetLanguage);
      
      if (template) {
        // Extract parameters from content (this is a simplified approach)
        const templateParams = this.extractTemplateParameters(content, template);
        
        // Format message using template
        const formattedMessage = this.templateManager.formatMessage(template, templateParams);
        
        this.logger.debug('template_localization_success', 'Template localization successful', {
          templateName,
          targetLanguage,
          paramCount: Object.keys(templateParams).length,
        });

        return {
          content: formattedMessage,
          language: targetLanguage,
          templateName,
          templateParams,
          metadata: {
            originalLanguage: targetLanguage,
            translationUsed: false,
            templateUsed: true,
            fallbackUsed: false,
            confidence: 0.95,
            processingTime: 0, // Will be set by caller
          },
        };
      }

    } catch (templateError) {
      this.logger.debug('template_localization_failed', 'Template localization failed', {
        targetLanguage,
        messageType: context.messageType,
        error: templateError instanceof Error ? templateError.message : 'Unknown error',
      });
    }

    return null;
  }

  /**
   * Get template name based on message type and channel
   */
  private getTemplateName(messageType: string, channel: string): string {
    return `${messageType}_${channel}`;
  }

  /**
   * Extract template parameters from content (simplified implementation)
   */
  private extractTemplateParameters(content: string, template: any): Record<string, string> {
    // This is a simplified implementation
    // In a real system, you'd have more sophisticated parameter extraction
    const params: Record<string, string> = {};
    
    // Extract common parameters
    const nameMatch = content.match(/नमस्ते\s+([^!]+)!/);
    if (nameMatch) {
      params.user_name = nameMatch[1].trim();
    }

    const schemeMatch = content.match(/योजना[:\s]+([^\n]+)/);
    if (schemeMatch) {
      params.scheme_name = schemeMatch[1].trim();
    }

    const amountMatch = content.match(/राशि[:\s]+(₹[^\n]+)/);
    if (amountMatch) {
      params.amount = amountMatch[1].trim();
    }

    const deadlineMatch = content.match(/अंतिम तिथि[:\s]+([^\n]+)/);
    if (deadlineMatch) {
      params.deadline = deadlineMatch[1].trim();
    }

    return params;
  }

  /**
   * Detect content language using simple heuristics
   */
  private detectContentLanguage(content: string): string {
    // Use the translation service's language detection
    try {
      const detection = this.translationService.detectLanguage(content);
      return detection.detectedLanguage;
    } catch {
      // Default to Hindi if detection fails
      return 'hi';
    }
  }

  /**
   * Normalize language code to supported format
   */
  private normalizeLanguageCode(languageCode: string): string {
    // Handle common variations
    const normalized = languageCode.toLowerCase().split('-')[0].split('_')[0];
    
    // Map common variations
    const mappings: Record<string, string> = {
      'hindi': 'hi',
      'english': 'en',
      'tamil': 'ta',
      'telugu': 'te',
      'bengali': 'bn',
      'gujarati': 'gu',
      'marathi': 'mr',
      'kannada': 'kn',
      'malayalam': 'ml',
      'punjabi': 'pa',
      'odia': 'or',
      'assamese': 'as',
    };

    return mappings[normalized] || normalized;
  }

  /**
   * Get fallback language for unsupported languages
   */
  private getFallbackLanguage(targetLanguage: string): string {
    const languageSupport = SUPPORTED_LANGUAGES[targetLanguage];
    
    if (languageSupport?.translationSupported) {
      return targetLanguage;
    }

    // Regional fallbacks
    const regionalFallbacks: Record<string, string> = {
      // South Indian languages fall back to English, then Hindi
      'kn': 'en',
      'ml': 'en',
      'te': 'en',
      'ta': 'en',
      
      // North Indian languages fall back to Hindi
      'pa': 'hi',
      'ur': 'hi',
      
      // Eastern languages fall back to Bengali, then Hindi
      'as': 'bn',
      'or': 'hi',
      
      // Western languages fall back to Hindi
      'gu': 'hi',
      'mr': 'hi',
    };

    return regionalFallbacks[targetLanguage] || 'hi';
  }

  /**
   * Optimize content for specific channel
   */
  private optimizeForChannel(content: string, channel: string, language: string): string {
    if (channel === 'sms') {
      return this.optimizeForSMS(content, language);
    }
    
    return content;
  }

  /**
   * Optimize content for SMS character limits
   */
  private optimizeForSMS(content: string, language: string): string {
    const maxLength = this.getSMSCharacterLimit(language);
    
    if (content.length <= maxLength) {
      return content;
    }

    // Remove extra whitespace
    let optimized = content.replace(/\s+/g, ' ').trim();
    
    // Remove emojis if still too long
    if (optimized.length > maxLength) {
      optimized = optimized.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    }

    // Truncate if still too long
    if (optimized.length > maxLength) {
      optimized = optimized.substring(0, maxLength - 3) + '...';
    }

    return optimized;
  }

  /**
   * Get SMS character limit for language
   */
  private getSMSCharacterLimit(language: string): number {
    // Unicode languages have lower character limits
    const unicodeLanguages = ['hi', 'ta', 'te', 'bn', 'gu', 'mr', 'kn', 'ml', 'pa', 'or', 'as'];
    
    return unicodeLanguages.includes(language) ? 70 : 160;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageSupport[] {
    return Object.values(SUPPORTED_LANGUAGES).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    const normalized = this.normalizeLanguageCode(languageCode);
    return normalized in SUPPORTED_LANGUAGES;
  }

  /**
   * Get language support information
   */
  getLanguageSupport(languageCode: string): LanguageSupport | null {
    const normalized = this.normalizeLanguageCode(languageCode);
    return SUPPORTED_LANGUAGES[normalized] || null;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

/**
 * Singleton instance for global use
 */
let messageLocalizationServiceInstance: MessageLocalizationService | null = null;

export function getMessageLocalizationService(): MessageLocalizationService {
  if (!messageLocalizationServiceInstance) {
    messageLocalizationServiceInstance = new MessageLocalizationService();
  }
  return messageLocalizationServiceInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearMessageLocalizationServiceInstance(): void {
  messageLocalizationServiceInstance = null;
}