/**
 * Core Gupshup Service Implementation
 * Provides HTTP client configuration, authentication, rate limiting, and retry logic
 */

import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import { 
  GupshupError, 
  GupshupErrorCode,
  GupshupErrorParser, 
  handleGupshupError,
  DEFAULT_RETRY_POLICIES,
  ErrorCategory,
  RetryAction
} from './GupshupErrorHandler';
import { 
  getGupshupLogger, 
  createPerformanceTimer,
  GupshupLogger 
} from './GupshupLogger';
import { 
  TemplateManager, 
  MessageTemplate,
  TemplateValidationResult,
  getTemplateManager 
} from './TemplateManager';
import { 
  DeliveryTracker, 
  DeliveryStatus,
  DeliveryReport,
  DateRange,
  GupshupWebhook,
  getDeliveryTracker 
} from './DeliveryTracker';
import {
  FallbackManager,
  FallbackDecision,
  FallbackAttempt,
  FallbackStats,
  getFallbackManager
} from './FallbackManager';
import {
  SMSTemplateManager,
  SMSTemplate,
  SMSTemplateValidationResult,
  SMSOptimizationResult,
  getSMSTemplateManager
} from './SMSTemplateManager';

export interface MessageResponse {
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  error?: string;
  errorCode?: string;
}

export interface BulkMessageResponse {
  results: MessageResponse[];
  totalSent: number;
  totalFailed: number;
  batchId: string;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookPayload {
  messageId: string;
  status: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  [key: string]: any;
}

export interface WhatsAppMessageParams {
  to: string;
  templateName: string;
  templateParams: Record<string, string>;
  language: string;
  messageType?: 'template' | 'text';
  priority?: 'high' | 'medium' | 'low';
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  text?: string;
  parameters?: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
  video?: {
    link: string;
  };
}

export interface WhatsAppValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SMSParams {
  to: string;
  message: string;
  senderId?: string;
  priority?: 'high' | 'medium' | 'low';
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface SMSValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  formattedMessage?: string;
  characterCount: number;
  smsCount: number;
}

export interface SMSFormattingOptions {
  maxLength: number;
  enableUrlShortening: boolean;
  preserveImportantInfo: boolean;
  templateName?: string;
}

export interface NotificationParams {
  to: string;
  message?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  language?: string;
  priority?: 'high' | 'medium' | 'low';
  enableFallback?: boolean;
  maxFallbackAttempts?: number;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channel: 'whatsapp' | 'sms';
  fallbackUsed: boolean;
  fallbackAttempts: number;
  error?: GupshupError;
  deliveryStatus?: DeliveryStatus;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
}

/**
 * HTTP client configuration for Gupshup API calls
 */
export interface HttpClientConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

/**
 * Rate limiter for managing API call frequency
 */
export class RateLimiter {
  private whatsappTokens: number;
  private smsTokens: number;
  private lastWhatsappRefill: Date;
  private lastSmsRefill: Date;
  private config: GupshupConfig;

  constructor(config: GupshupConfig) {
    this.config = config;
    this.whatsappTokens = config.rateLimit.whatsappPerSecond;
    this.smsTokens = config.rateLimit.smsPerSecond;
    this.lastWhatsappRefill = new Date();
    this.lastSmsRefill = new Date();
  }

  /**
   * Check if WhatsApp API call is allowed
   */
  canSendWhatsApp(): boolean {
    this.refillTokens();
    return this.whatsappTokens > 0;
  }

  /**
   * Check if SMS API call is allowed
   */
  canSendSMS(): boolean {
    this.refillTokens();
    return this.smsTokens > 0;
  }

  /**
   * Consume a WhatsApp token
   */
  consumeWhatsAppToken(): boolean {
    if (this.canSendWhatsApp()) {
      this.whatsappTokens--;
      return true;
    }
    return false;
  }

  /**
   * Consume an SMS token
   */
  consumeSMSToken(): boolean {
    if (this.canSendSMS()) {
      this.smsTokens--;
      return true;
    }
    return false;
  }

  /**
   * Get rate limit information for WhatsApp
   */
  getWhatsAppRateLimit(): RateLimitInfo {
    this.refillTokens();
    return {
      remaining: this.whatsappTokens,
      resetTime: new Date(this.lastWhatsappRefill.getTime() + 1000),
      isLimited: this.whatsappTokens === 0,
    };
  }

  /**
   * Get rate limit information for SMS
   */
  getSMSRateLimit(): RateLimitInfo {
    this.refillTokens();
    return {
      remaining: this.smsTokens,
      resetTime: new Date(this.lastSmsRefill.getTime() + 1000),
      isLimited: this.smsTokens === 0,
    };
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = new Date();
    
    // Refill WhatsApp tokens
    const whatsappElapsed = now.getTime() - this.lastWhatsappRefill.getTime();
    if (whatsappElapsed >= 1000) {
      this.whatsappTokens = this.config.rateLimit.whatsappPerSecond;
      this.lastWhatsappRefill = now;
    }

    // Refill SMS tokens
    const smsElapsed = now.getTime() - this.lastSmsRefill.getTime();
    if (smsElapsed >= 1000) {
      this.smsTokens = this.config.rateLimit.smsPerSecond;
      this.lastSmsRefill = now;
    }
  }
}

/**
 * Retry policy for failed API calls
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Core Gupshup Service class
 */
export class GupshupService {
  private config: GupshupConfig;
  private rateLimiter: RateLimiter;
  private httpConfig: HttpClientConfig;
  private retryPolicy: RetryPolicy;
  private logger: GupshupLogger;
  private templateManager: TemplateManager;
  private deliveryTracker: DeliveryTracker;
  private fallbackManager: FallbackManager;
  private smsTemplateManager: SMSTemplateManager;

  constructor(config?: GupshupConfig) {
    this.config = config || getGupshupConfig();
    this.rateLimiter = new RateLimiter(this.config);
    this.logger = getGupshupLogger();
    this.templateManager = getTemplateManager();
    this.deliveryTracker = getDeliveryTracker();
    this.fallbackManager = getFallbackManager();
    this.smsTemplateManager = getSMSTemplateManager();
    
    this.httpConfig = {
      timeout: 30000, // 30 seconds
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.apiKey,
        'User-Agent': 'KalaSarthi-GupshupClient/1.0',
      },
    };

    this.retryPolicy = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    // Log service initialization
    this.logger.info('gupshup_service_init', 'Gupshup service initialized', {
      baseUrl: this.config.baseUrl,
      whatsappRateLimit: this.config.rateLimit.whatsappPerSecond,
      smsRateLimit: this.config.rateLimit.smsPerSecond,
      templateManagerEnabled: true,
      deliveryTrackingEnabled: true,
    });
  }

  /**
   * Send WhatsApp template message with enhanced validation and error handling
   */
  async sendWhatsAppMessage(params: WhatsAppMessageParams): Promise<MessageResponse> {
    const timer = createPerformanceTimer('send_whatsapp_message');
    
    try {
      // Validate WhatsApp message parameters
      const validation = this.validateWhatsAppMessage(params);
      if (!validation.isValid) {
        throw handleGupshupError(
          new Error(`WhatsApp message validation failed: ${validation.errors.join(', ')}`),
          { channel: 'whatsapp', validation, ...params }
        );
      }

      // Get and validate template
      const template = await this.templateManager.getTemplate(params.templateName, params.language);
      const templateValidation = this.templateManager.validateTemplate(template, params.templateParams);
      
      if (!templateValidation.isValid) {
        throw handleGupshupError(
          new Error(`Template validation failed: ${templateValidation.errors.join(', ')}`),
          { channel: 'whatsapp', templateValidation, ...params }
        );
      }

      // Log validation warnings if any
      const allWarnings = [...validation.warnings, ...templateValidation.warnings];
      if (allWarnings.length > 0) {
        this.logger.warn('whatsapp_validation_warnings', 'WhatsApp message has warnings', {
          warnings: allWarnings,
          templateName: params.templateName,
          to: params.to,
        });
      }

      // Check rate limit
      if (!this.rateLimiter.consumeWhatsAppToken()) {
        const rateLimitInfo = this.rateLimiter.getWhatsAppRateLimit();
        this.logger.logRateLimit('whatsapp', rateLimitInfo.remaining, rateLimitInfo.isLimited);
        throw handleGupshupError(
          new Error('WhatsApp rate limit exceeded. Please try again later.'),
          { channel: 'whatsapp', ...params }
        );
      }

      // Format phone number for WhatsApp
      const formattedPhoneNumber = this.formatWhatsAppPhoneNumber(params.to);

      const payload = {
        channel: 'whatsapp',
        source: this.config.whatsapp.phoneNumberId,
        destination: formattedPhoneNumber,
        'src.name': this.config.whatsapp.businessAccountId,
        message: {
          type: params.messageType || 'template',
          template: {
            name: params.templateName,
            language: {
              code: params.language,
            },
            components: this.buildTemplateComponents(params.templateParams),
          },
        },
      };

      this.logger.debug('whatsapp_send_request', 'Sending WhatsApp message', {
        templateName: params.templateName,
        language: params.language,
        to: formattedPhoneNumber,
        paramCount: Object.keys(params.templateParams).length,
        templateStatus: template.status,
      });

      const result = await this.makeApiCall('/msg', 'POST', payload);
      const duration = timer.end(true, null, { messageId: result.messageId });
      
      // Start tracking the message delivery
      await this.deliveryTracker.trackMessage(
        result.messageId, 
        params.to, // Using phone number as userId for now
        'whatsapp',
        formattedPhoneNumber
      );
      
      this.logger.logMessageSent('whatsapp', result.messageId, params.to, true, duration);
      return result;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = this.handleWhatsAppError(error, { channel: 'whatsapp', ...params });
      this.logger.logMessageSent('whatsapp', 'failed', params.to, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Send WhatsApp text message (for interactive messages)
   */
  async sendWhatsAppTextMessage(to: string, text: string): Promise<MessageResponse> {
    const timer = createPerformanceTimer('send_whatsapp_text_message');
    
    try {
      // Validate text message
      if (!text || text.trim().length === 0) {
        throw handleGupshupError(
          new Error('WhatsApp text message cannot be empty'),
          { channel: 'whatsapp', to, text }
        );
      }

      if (text.length > 4096) {
        throw handleGupshupError(
          new Error('WhatsApp text message exceeds 4096 character limit'),
          { channel: 'whatsapp', to, text, length: text.length }
        );
      }

      // Check rate limit
      if (!this.rateLimiter.consumeWhatsAppToken()) {
        const rateLimitInfo = this.rateLimiter.getWhatsAppRateLimit();
        this.logger.logRateLimit('whatsapp', rateLimitInfo.remaining, rateLimitInfo.isLimited);
        throw handleGupshupError(
          new Error('WhatsApp rate limit exceeded. Please try again later.'),
          { channel: 'whatsapp', to, text }
        );
      }

      const formattedPhoneNumber = this.formatWhatsAppPhoneNumber(to);

      const payload = {
        channel: 'whatsapp',
        source: this.config.whatsapp.phoneNumberId,
        destination: formattedPhoneNumber,
        'src.name': this.config.whatsapp.businessAccountId,
        message: {
          type: 'text',
          text: text.trim(),
        },
      };

      const result = await this.makeApiCall('/msg', 'POST', payload);
      const duration = timer.end(true, null, { messageId: result.messageId });
      
      // Start tracking the message delivery
      await this.deliveryTracker.trackMessage(
        result.messageId, 
        to, // Using phone number as userId for now
        'whatsapp',
        formattedPhoneNumber
      );
      
      this.logger.logMessageSent('whatsapp', result.messageId, to, true, duration);
      return result;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = this.handleWhatsAppError(error, { channel: 'whatsapp', to, text });
      this.logger.logMessageSent('whatsapp', 'failed', to, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Send SMS message with enhanced validation and formatting
   */
  async sendSMS(params: SMSParams): Promise<MessageResponse> {
    const timer = createPerformanceTimer('send_sms_message');
    
    try {
      // Validate and format SMS message
      const validation = this.validateAndFormatSMS(params);
      if (!validation.isValid) {
        throw handleGupshupError(
          new Error(`SMS validation failed: ${validation.errors.join(', ')}`),
          { channel: 'sms', validation, ...params }
        );
      }

      // Log validation warnings if any
      if (validation.warnings.length > 0) {
        this.logger.warn('sms_validation_warnings', 'SMS message has warnings', {
          warnings: validation.warnings,
          to: params.to,
          characterCount: validation.characterCount,
          smsCount: validation.smsCount,
        });
      }

      // Check rate limit
      if (!this.rateLimiter.consumeSMSToken()) {
        const rateLimitInfo = this.rateLimiter.getSMSRateLimit();
        this.logger.logRateLimit('sms', rateLimitInfo.remaining, rateLimitInfo.isLimited);
        throw handleGupshupError(
          new Error('SMS rate limit exceeded. Please try again later.'),
          { channel: 'sms', ...params }
        );
      }

      // Format phone number for SMS
      const formattedPhoneNumber = this.formatSMSPhoneNumber(params.to);

      const payload = {
        channel: 'sms',
        source: params.senderId || this.config.sms.senderId,
        destination: formattedPhoneNumber,
        message: validation.formattedMessage || params.message,
        'src.name': this.config.sms.senderId,
        route: this.config.sms.route,
      };

      this.logger.debug('sms_send_request', 'Sending SMS message', {
        to: formattedPhoneNumber,
        characterCount: validation.characterCount,
        smsCount: validation.smsCount,
        senderId: payload.source,
        route: payload.route,
      });

      const result = await this.makeApiCall('/msg', 'POST', payload);
      const duration = timer.end(true, null, { messageId: result.messageId });
      
      // Start tracking the message delivery
      await this.deliveryTracker.trackMessage(
        result.messageId, 
        params.to, // Using phone number as userId for now
        'sms',
        formattedPhoneNumber
      );
      
      this.logger.logMessageSent('sms', result.messageId, params.to, true, duration);
      return result;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = this.handleSMSError(error, { channel: 'sms', ...params });
      this.logger.logMessageSent('sms', 'failed', params.to, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSParams[]): Promise<BulkMessageResponse> {
    const results: MessageResponse[] = [];
    let totalSent = 0;
    let totalFailed = 0;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (const message of messages) {
      try {
        const result = await this.sendSMS(message);
        results.push(result);
        if (result.status === 'sent') {
          totalSent++;
        } else {
          totalFailed++;
        }
      } catch (error) {
        const errorResult: MessageResponse = {
          messageId: `error_${Date.now()}`,
          status: 'failed',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.push(errorResult);
        totalFailed++;
      }

      // Add small delay between bulk messages to respect rate limits
      await this.delay(100);
    }

    return {
      results,
      totalSent,
      totalFailed,
      batchId,
    };
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<DeliveryStatus> {
    const response = await this.makeApiCall(`/msg/${messageId}`, 'GET');
    
    return {
      messageId,
      status: this.mapGupshupStatus(response.status),
      timestamp: new Date(response.timestamp || Date.now()),
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
    };
  }

  /**
   * Handle incoming webhook from Gupshup
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const timer = createPerformanceTimer('webhook_processing');
    
    try {
      this.logger.info('webhook_received', 'Received Gupshup webhook', {
        messageId: payload.messageId,
        status: payload.status,
        timestamp: payload.timestamp,
      });

      // Process webhook through delivery tracker
      const gupshupWebhook: GupshupWebhook = {
        messageId: payload.messageId,
        status: payload.status,
        timestamp: payload.timestamp,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
        ...payload, // Include any additional fields
      };

      await this.deliveryTracker.processWebhook(gupshupWebhook);
      
      const duration = timer.end(true);
      this.logger.logWebhook(payload.messageId, payload.status, duration, true);

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = this.handleWhatsAppError(error, { webhook: payload });
      this.logger.logWebhook(payload.messageId, payload.status, duration, false, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Get rate limit information
   */
  getWhatsAppRateLimit(): RateLimitInfo {
    return this.rateLimiter.getWhatsAppRateLimit();
  }

  /**
   * Get SMS rate limit information
   */
  getSMSRateLimit(): RateLimitInfo {
    return this.rateLimiter.getSMSRateLimit();
  }

  /**
   * Get WhatsApp template by name and language
   */
  async getTemplate(name: string, language: string): Promise<MessageTemplate> {
    return this.templateManager.getTemplate(name, language);
  }

  /**
   * Validate template with parameters
   */
  validateTemplate(template: MessageTemplate, params: Record<string, string>): TemplateValidationResult {
    return this.templateManager.validateTemplate(template, params);
  }

  /**
   * Synchronize templates with Gupshup API
   */
  async syncTemplates() {
    return this.templateManager.syncTemplates();
  }

  /**
   * Get all approved templates
   */
  async getApprovedTemplates(): Promise<MessageTemplate[]> {
    return this.templateManager.getApprovedTemplates();
  }

  /**
   * Clear template cache
   */
  clearTemplateCache(): void {
    this.templateManager.clearCache();
  }

  /**
   * Get template cache statistics
   */
  getTemplateCacheStats() {
    return this.templateManager.getCacheStats();
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<DeliveryStatus> {
    // First try to get from delivery tracker
    const trackedStatus = this.deliveryTracker.getDeliveryStats();
    
    // If not found locally, fetch from API
    const response = await this.makeApiCall(`/msg/${messageId}`, 'GET');
    
    return {
      messageId,
      status: this.mapGupshupStatus(response.status),
      timestamp: new Date(response.timestamp || Date.now()),
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
      channel: response.channel || 'whatsapp',
    };
  }

  /**
   * Get delivery report for date range
   */
  async getDeliveryReport(dateRange: DateRange): Promise<DeliveryReport> {
    return this.deliveryTracker.getDeliveryReport(dateRange);
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(dateRange: DateRange) {
    return this.deliveryTracker.getDeliveryAnalytics(dateRange);
  }

  /**
   * Get current delivery statistics
   */
  getDeliveryStats() {
    return this.deliveryTracker.getDeliveryStats();
  }

  /**
   * Clear delivery tracking data
   */
  clearDeliveryData(): void {
    this.deliveryTracker.clearDeliveryData();
  }

  /**
   * Send notification with intelligent fallback mechanism
   * Attempts WhatsApp first, then falls back to SMS based on error type
   */
  async sendNotificationWithFallback(params: NotificationParams): Promise<NotificationResult> {
    const maxAttempts = params.maxFallbackAttempts || 2;
    let fallbackAttempts = 0;
    let lastError: GupshupError | null = null;
    
    // Start with WhatsApp if template is provided, otherwise SMS
    let currentChannel: 'whatsapp' | 'sms' = params.templateName ? 'whatsapp' : 'sms';
    
    this.logger.info('notification_with_fallback_start', 'Starting notification with fallback', {
      to: params.to,
      initialChannel: currentChannel,
      enableFallback: params.enableFallback !== false,
      maxAttempts,
    });

    while (fallbackAttempts <= maxAttempts) {
      try {
        let result: MessageResponse;
        
        if (currentChannel === 'whatsapp') {
          // Attempt WhatsApp delivery
          if (!params.templateName) {
            throw new GupshupError(
              GupshupErrorCode.INVALID_TEMPLATE,
              'Template name is required for WhatsApp messages'
            );
          }
          
          result = await this.sendWhatsAppMessage({
            to: params.to,
            templateName: params.templateName,
            templateParams: params.templateParams || {},
            language: params.language || 'en',
            priority: params.priority,
          });
        } else {
          // Attempt SMS delivery
          if (params.templateName && params.templateParams) {
            // Use SMS template if available
            result = await this.sendSMSWithTemplate(
              params.templateName,
              params.templateParams,
              params.to,
              params.language || 'en'
            );
          } else if (params.message) {
            // Use direct message
            result = await this.sendSMS({
              to: params.to,
              message: params.message,
              priority: params.priority,
            });
          } else {
            throw new GupshupError(
              GupshupErrorCode.INVALID_PARAMETERS,
              'Either message content or template name with parameters is required for SMS'
            );
          }
        }

        // Success - record successful delivery
        if (fallbackAttempts > 0) {
          this.fallbackManager.recordFallbackAttempt({
            originalChannel: 'whatsapp',
            fallbackChannel: currentChannel,
            originalError: lastError!,
            success: true,
            messageId: result.messageId,
          });
        }

        this.logger.info('notification_with_fallback_success', 'Notification delivered successfully', {
          to: params.to,
          channel: currentChannel,
          fallbackUsed: fallbackAttempts > 0,
          fallbackAttempts,
          messageId: result.messageId,
        });

        return {
          success: true,
          messageId: result.messageId,
          channel: currentChannel,
          fallbackUsed: fallbackAttempts > 0,
          fallbackAttempts,
        };

      } catch (error) {
        const gupshupError = error instanceof GupshupError ? error : handleGupshupError(error);
        lastError = gupshupError;

        this.logger.warn('notification_attempt_failed', 'Notification attempt failed', {
          to: params.to,
          channel: currentChannel,
          attempt: fallbackAttempts + 1,
          errorCode: gupshupError.code,
          errorMessage: gupshupError.message,
        });

        // Check if fallback is enabled and appropriate
        if (params.enableFallback === false || fallbackAttempts >= maxAttempts) {
          this.logger.error('notification_with_fallback_failed', 'Notification failed without fallback', {
            to: params.to,
            finalChannel: currentChannel,
            totalAttempts: fallbackAttempts + 1,
            finalError: gupshupError.code,
          });

          return {
            success: false,
            channel: currentChannel,
            fallbackUsed: fallbackAttempts > 0,
            fallbackAttempts,
            error: gupshupError,
          };
        }

        // Determine fallback strategy
        const fallbackDecision = this.fallbackManager.decideFallback(
          gupshupError,
          currentChannel,
          fallbackAttempts
        );

        if (!fallbackDecision.shouldFallback || fallbackDecision.fallbackChannel === 'none') {
          this.logger.info('notification_no_fallback', 'No fallback available for error', {
            to: params.to,
            channel: currentChannel,
            errorCode: gupshupError.code,
            reason: fallbackDecision.reason,
          });

          return {
            success: false,
            channel: currentChannel,
            fallbackUsed: fallbackAttempts > 0,
            fallbackAttempts,
            error: gupshupError,
          };
        }

        // Record failed attempt
        this.fallbackManager.recordFallbackAttempt({
          originalChannel: currentChannel === 'sms' ? 'whatsapp' : currentChannel,
          fallbackChannel: fallbackDecision.fallbackChannel,
          originalError: gupshupError,
          success: false,
          errorMessage: gupshupError.message,
        });

        // Apply fallback delay if specified
        if (fallbackDecision.delay && fallbackDecision.delay > 0) {
          this.logger.debug('notification_fallback_delay', 'Applying fallback delay', {
            delay: fallbackDecision.delay,
            reason: fallbackDecision.reason,
          });
          await this.delay(fallbackDecision.delay);
        }

        // Switch to fallback channel
        currentChannel = fallbackDecision.fallbackChannel as 'sms';
        fallbackAttempts++;

        this.logger.info('notification_fallback_attempt', 'Attempting fallback delivery', {
          to: params.to,
          fromChannel: currentChannel === 'sms' ? 'whatsapp' : 'sms',
          toChannel: currentChannel,
          attempt: fallbackAttempts,
          reason: fallbackDecision.reason,
        });
      }
    }

    // All attempts failed
    this.logger.error('notification_all_attempts_failed', 'All notification attempts failed', {
      to: params.to,
      totalAttempts: fallbackAttempts,
      finalError: lastError?.code,
    });

    return {
      success: false,
      channel: currentChannel,
      fallbackUsed: fallbackAttempts > 0,
      fallbackAttempts,
      error: lastError!,
    };
  }

  /**
   * Get fallback statistics and success rates
   */
  getFallbackStats(timeRange?: { start: Date; end: Date }): FallbackStats {
    return this.fallbackManager.getFallbackStats(timeRange);
  }

  /**
   * Get recent fallback attempts for monitoring
   */
  getRecentFallbackAttempts(limit: number = 10): FallbackAttempt[] {
    return this.fallbackManager.getRecentFallbackAttempts(limit);
  }

  /**
   * Update fallback configuration
   */
  updateFallbackConfig(config: any): void {
    this.fallbackManager.updateConfig(config);
  }

  /**
   * Clear fallback tracking data
   */
  clearFallbackData(): void {
    this.fallbackManager.clearFallbackData();
  }

  /**
   * Send SMS using template with optimization
   */
  async sendSMSWithTemplate(
    templateName: string,
    parameters: Record<string, string>,
    to: string,
    language: string = 'en'
  ): Promise<MessageResponse> {
    const timer = createPerformanceTimer('send_sms_with_template');
    
    try {
      // Validate and format template
      const templateResult = await this.smsTemplateManager.validateAndFormatTemplate(
        templateName,
        parameters,
        language
      );

      if (!templateResult.isValid) {
        throw handleGupshupError(
          new Error(`SMS template validation failed: ${templateResult.errors.join(', ')}`),
          { channel: 'sms', templateName, parameters, language }
        );
      }

      // Log template warnings if any
      if (templateResult.warnings.length > 0) {
        this.logger.warn('sms_template_warnings', 'SMS template has warnings', {
          warnings: templateResult.warnings,
          templateName,
          to,
          characterCount: templateResult.characterCount,
          smsCount: templateResult.smsCount,
        });
      }

      // Send SMS with formatted content
      const result = await this.sendSMS({
        to,
        message: templateResult.formattedContent,
        templateName,
        templateParams: parameters,
      });

      const duration = timer.end(true, null, { messageId: result.messageId });
      
      this.logger.info('sms_template_sent', 'SMS sent using template', {
        templateName,
        language,
        to,
        characterCount: templateResult.characterCount,
        smsCount: templateResult.smsCount,
        urlsShortened: templateResult.urlsShortened,
        messageId: result.messageId,
      });

      return result;

    } catch (error) {
      const duration = timer.end(false, error);
      const gupshupError = this.handleSMSError(error, { 
        channel: 'sms', 
        templateName, 
        parameters, 
        language 
      });
      this.logger.logMessageSent('sms', 'failed', to, false, duration, gupshupError);
      throw gupshupError;
    }
  }

  /**
   * Optimize SMS content for better delivery and cost efficiency
   */
  async optimizeSMSContent(content: string, maxLength: number = 160): Promise<SMSOptimizationResult> {
    return this.smsTemplateManager.optimizeContent(content, maxLength);
  }

  /**
   * Get SMS template by name and language
   */
  getSMSTemplate(name: string, language: string = 'en'): SMSTemplate | null {
    return this.smsTemplateManager.getTemplate(name, language);
  }

  /**
   * Get all SMS templates for a category
   */
  getSMSTemplatesByCategory(category: string): SMSTemplate[] {
    return this.smsTemplateManager.getTemplatesByCategory(category);
  }

  /**
   * Add or update SMS template
   */
  addSMSTemplate(template: SMSTemplate): void {
    this.smsTemplateManager.addTemplate(template);
  }

  /**
   * Remove SMS template
   */
  removeSMSTemplate(name: string, language: string): boolean {
    return this.smsTemplateManager.removeTemplate(name, language);
  }

  /**
   * Get all available SMS templates
   */
  getAllSMSTemplates(): SMSTemplate[] {
    return this.smsTemplateManager.getAllTemplates();
  }

  /**
   * Make HTTP API call with retry logic
   */
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    payload?: any
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: GupshupError | null = null;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      try {
        this.logger.debug('api_call', `Making ${method} request to ${endpoint}`, {
          attempt: attempt + 1,
          maxRetries: this.retryPolicy.maxRetries + 1,
          payload: payload ? 'present' : 'none',
        });

        const response = await fetch(url, {
          method,
          headers: this.httpConfig.headers,
          body: payload ? JSON.stringify(payload) : undefined,
          signal: AbortSignal.timeout(this.httpConfig.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = GupshupErrorParser.parseHttpError(response, errorData, {
            endpoint,
            method,
            attempt: attempt + 1,
          });
          throw lastError;
        }

        const data = await response.json();
        
        this.logger.debug('api_call_success', `${method} request to ${endpoint} successful`, {
          attempt: attempt + 1,
          responseStatus: response.status,
        });

        // Return successful response
        return {
          messageId: data.messageId || `msg_${Date.now()}`,
          status: this.mapGupshupStatus(data.status || 'sent'),
          timestamp: new Date(),
          ...data,
        };

      } catch (error) {
        if (error instanceof GupshupError) {
          lastError = error;
        } else {
          lastError = GupshupErrorParser.parseSystemError(
            error instanceof Error ? error : new Error('Unknown error'),
            { endpoint, method, attempt: attempt + 1 }
          );
        }
        
        this.logger.warn('api_call_error', `${method} request to ${endpoint} failed`, {
          attempt: attempt + 1,
          error: lastError.code,
          message: lastError.message,
        });

        // Don't retry on certain errors
        if (!lastError.isRetryable || this.isNonRetryableError(lastError)) {
          this.logger.debug('api_call_no_retry', 'Error is not retryable, stopping attempts', {
            errorCode: lastError.code,
            category: lastError.category,
          });
          break;
        }

        // Calculate delay for next retry
        if (attempt < this.retryPolicy.maxRetries) {
          const delay = Math.min(
            this.retryPolicy.baseDelay * Math.pow(this.retryPolicy.backoffMultiplier, attempt),
            this.retryPolicy.maxDelay
          );
          
          this.logger.debug('api_call_retry', `Retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.retryPolicy.maxRetries,
            delay,
          });
          
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    this.logger.error('api_call_failed', `All retry attempts failed for ${method} ${endpoint}`, lastError);
    throw lastError || handleGupshupError(new Error('API call failed after all retries'));
  }

  /**
   * Validate WhatsApp message parameters
   */
  private validateWhatsAppMessage(params: WhatsAppMessageParams): WhatsAppValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate phone number
    if (!params.to) {
      errors.push('Phone number is required');
    } else if (!this.isValidWhatsAppPhoneNumber(params.to)) {
      errors.push('Invalid phone number format. Use international format (e.g., +919876543210)');
    }

    // Validate template name
    if (!params.templateName || params.templateName.trim().length === 0) {
      errors.push('Template name is required');
    } else if (!/^[a-z0-9_]+$/.test(params.templateName)) {
      errors.push('Template name must contain only lowercase letters, numbers, and underscores');
    }

    // Validate language code
    if (!params.language) {
      errors.push('Language code is required');
    } else if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(params.language)) {
      warnings.push('Language code should follow ISO format (e.g., en, hi, en_US)');
    }

    // Validate template parameters
    if (params.templateParams) {
      const paramCount = Object.keys(params.templateParams).length;
      if (paramCount > 10) {
        warnings.push('Template has more than 10 parameters, which may cause issues');
      }

      // Check parameter values
      for (const [key, value] of Object.entries(params.templateParams)) {
        if (typeof value !== 'string') {
          errors.push(`Template parameter '${key}' must be a string`);
        } else if (value.length > 1024) {
          warnings.push(`Template parameter '${key}' is very long (${value.length} chars)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate WhatsApp phone number format
   */
  private isValidWhatsAppPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Must start with + and have 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(cleaned);
  }

  /**
   * Format phone number for WhatsApp API
   */
  private formatWhatsAppPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      // If it starts with 91 (India), add +
      if (cleaned.startsWith('91') && cleaned.length >= 12) {
        cleaned = '+' + cleaned;
      }
      // If it's a 10-digit Indian number, add +91
      else if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      }
      // Otherwise, assume it needs + prefix
      else {
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Build WhatsApp template components from parameters
   */
  private buildTemplateComponents(params: Record<string, string>): WhatsAppTemplateComponent[] {
    const components: WhatsAppTemplateComponent[] = [];
    
    // Build body component with parameters
    if (Object.keys(params).length > 0) {
      const parameters: WhatsAppTemplateParameter[] = Object.values(params).map(value => ({
        type: 'text',
        text: value,
      }));

      components.push({
        type: 'body',
        parameters,
      });
    }

    return components;
  }

  /**
   * Build advanced template components with different parameter types
   */
  private buildAdvancedTemplateComponents(
    components: WhatsAppTemplateComponent[]
  ): WhatsAppTemplateComponent[] {
    return components.map(component => {
      // Validate component structure
      if (!component.type || !['header', 'body', 'footer', 'button'].includes(component.type)) {
        throw new Error(`Invalid template component type: ${component.type}`);
      }

      // Process parameters if present
      if (component.parameters) {
        component.parameters = component.parameters.map(param => {
          // Validate parameter type
          if (!param.type || !['text', 'currency', 'date_time', 'image', 'document', 'video'].includes(param.type)) {
            throw new Error(`Invalid template parameter type: ${param.type}`);
          }

          return param;
        });
      }

      return component;
    });
  }

  /**
   * Map Gupshup status to our standard status
   */
  private mapGupshupStatus(gupshupStatus: string): 'sent' | 'delivered' | 'read' | 'failed' {
    switch (gupshupStatus?.toLowerCase()) {
      case 'sent':
      case 'submitted':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
      case 'rejected':
      case 'error':
        return 'failed';
      default:
        return 'sent';
    }
  }

  /**
   * Handle WhatsApp-specific errors
   */
  private handleWhatsAppError(error: any, context: Record<string, any>): GupshupError {
    // Map common WhatsApp Business API errors
    if (error.message?.includes('template not found')) {
      return new GupshupError(
        GupshupErrorCode.INVALID_TEMPLATE,
        `WhatsApp template '${context.templateName}' not found or not approved`,
        {
          category: ErrorCategory.VALIDATION,
          retryAction: RetryAction.NO_RETRY,
          context,
        }
      );
    }

    if (error.message?.includes('user not opted in')) {
      return new GupshupError(
        GupshupErrorCode.WHATSAPP_USER_NOT_OPTED_IN,
        'User has not opted in to receive WhatsApp messages',
        {
          category: ErrorCategory.USER_ERROR,
          retryAction: RetryAction.FALLBACK,
          context,
        }
      );
    }

    if (error.message?.includes('user blocked')) {
      return new GupshupError(
        GupshupErrorCode.WHATSAPP_USER_BLOCKED,
        'User has blocked WhatsApp messages',
        {
          category: ErrorCategory.USER_ERROR,
          retryAction: RetryAction.FALLBACK,
          context,
        }
      );
    }

    if (error.message?.includes('business account restricted')) {
      return new GupshupError(
        GupshupErrorCode.WHATSAPP_BUSINESS_ACCOUNT_RESTRICTED,
        'WhatsApp Business account is restricted',
        {
          category: ErrorCategory.CONFIGURATION,
          retryAction: RetryAction.ESCALATE,
          context,
        }
      );
    }

    if (error.message?.includes('invalid phone number')) {
      return new GupshupError(
        GupshupErrorCode.INVALID_PHONE_NUMBER,
        'Invalid WhatsApp phone number format',
        {
          category: ErrorCategory.VALIDATION,
          retryAction: RetryAction.NO_RETRY,
          context,
        }
      );
    }

    // Default to generic error handling
    return handleGupshupError(error, context);
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: GupshupError): boolean {
    // Use the retry policy from error handler
    const policy = DEFAULT_RETRY_POLICIES[error.category];
    return !policy.retryableCategories.includes(error.category);
  }

  /**
   * Validate and format SMS message with character limit handling
   */
  private validateAndFormatSMS(params: SMSParams, options?: SMSFormattingOptions): SMSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const maxLength = options?.maxLength || 160;
    
    // Validate phone number
    if (!params.to) {
      errors.push('Phone number is required');
    } else if (!this.isValidSMSPhoneNumber(params.to)) {
      errors.push('Invalid phone number format. Use 10-digit Indian format or international format');
    }

    // Validate message content
    if (!params.message || params.message.trim().length === 0) {
      errors.push('SMS message cannot be empty');
    }

    let formattedMessage = params.message?.trim() || '';
    let characterCount = formattedMessage.length;
    let smsCount = Math.ceil(characterCount / maxLength);

    // Apply SMS formatting if message is too long
    if (characterCount > maxLength && options?.preserveImportantInfo) {
      formattedMessage = this.formatSMSForLength(formattedMessage, maxLength, options);
      characterCount = formattedMessage.length;
      smsCount = Math.ceil(characterCount / maxLength);
    }

    // Validate sender ID
    if (params.senderId && !/^[A-Z0-9]{1,6}$/.test(params.senderId)) {
      warnings.push('Sender ID should be 1-6 alphanumeric characters (uppercase)');
    }

    // Character count warnings
    if (characterCount > maxLength) {
      if (smsCount > 3) {
        warnings.push(`Message will be split into ${smsCount} SMS parts, which may be expensive`);
      } else {
        warnings.push(`Message exceeds ${maxLength} characters and will be split into ${smsCount} parts`);
      }
    }

    // Unicode character detection
    if (this.containsUnicodeCharacters(formattedMessage)) {
      warnings.push('Message contains Unicode characters, which may reduce character limit to 70 per SMS');
      smsCount = Math.ceil(characterCount / 70);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      formattedMessage,
      characterCount,
      smsCount,
    };
  }

  /**
   * Format SMS message to fit within character limits while preserving important information
   */
  private formatSMSForLength(message: string, maxLength: number, options?: SMSFormattingOptions): string {
    if (message.length <= maxLength) {
      return message;
    }

    // Apply URL shortening if enabled
    if (options?.enableUrlShortening) {
      message = this.shortenUrlsInMessage(message);
    }

    // If still too long, truncate intelligently
    if (message.length > maxLength) {
      // Try to preserve important information (scheme names, deadlines, etc.)
      const importantPatterns = [
        /योजना|scheme/gi,
        /आवेदन|application/gi,
        /अंतिम तिथि|deadline/gi,
        /₹|\d+\s*रुपए|\d+\s*rupees/gi,
        /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/g, // dates
      ];

      let preservedInfo = '';
      for (const pattern of importantPatterns) {
        const matches = message.match(pattern);
        if (matches) {
          preservedInfo += matches.join(' ') + ' ';
        }
      }

      // Calculate remaining space for other content
      const remainingSpace = maxLength - preservedInfo.length - 3; // 3 for "..."
      
      if (remainingSpace > 20) {
        // Extract first part of message
        const firstPart = message.substring(0, remainingSpace);
        return `${firstPart}... ${preservedInfo}`.trim();
      } else {
        // Just truncate with ellipsis
        return message.substring(0, maxLength - 3) + '...';
      }
    }

    return message;
  }

  /**
   * Shorten URLs in SMS message for better character utilization
   */
  private shortenUrlsInMessage(message: string): string {
    // Simple URL shortening simulation (in production, integrate with actual URL shortener)
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return message.replace(urlPattern, (url) => {
      // For now, just replace with a placeholder short URL
      // In production, this would call an actual URL shortening service
      return `https://short.ly/${this.generateShortCode()}`;
    });
  }

  /**
   * Generate a short code for URL shortening
   */
  private generateShortCode(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  /**
   * Check if message contains Unicode characters
   */
  private containsUnicodeCharacters(message: string): boolean {
    // Check for characters outside basic ASCII range
    return /[^\x00-\x7F]/.test(message);
  }

  /**
   * Validate SMS phone number format
   */
  private isValidSMSPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Indian mobile number patterns
    const indianMobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
    // International format
    const internationalRegex = /^\+[1-9]\d{9,14}$/;
    
    return indianMobileRegex.test(cleaned) || internationalRegex.test(cleaned);
  }

  /**
   * Format phone number for SMS API
   */
  private formatSMSPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it's a 10-digit Indian number, add 91 prefix
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      cleaned = '91' + cleaned;
    }
    // If it starts with +91, remove the +
    else if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(1);
    }
    // If it starts with +, remove it for SMS API
    else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Handle SMS-specific errors
   */
  private handleSMSError(error: any, context: Record<string, any>): GupshupError {
    // Map common SMS API errors
    if (error.message?.includes('invalid mobile number')) {
      return new GupshupError(
        GupshupErrorCode.INVALID_PHONE_NUMBER,
        'Invalid SMS phone number format',
        {
          category: ErrorCategory.VALIDATION,
          retryAction: RetryAction.NO_RETRY,
          context,
        }
      );
    }

    if (error.message?.includes('sender id not approved')) {
      return new GupshupError(
        GupshupErrorCode.INVALID_SENDER_ID,
        'SMS sender ID is not approved or invalid',
        {
          category: ErrorCategory.CONFIGURATION,
          retryAction: RetryAction.NO_RETRY,
          context,
        }
      );
    }

    if (error.message?.includes('insufficient balance')) {
      return new GupshupError(
        GupshupErrorCode.INSUFFICIENT_BALANCE,
        'Insufficient SMS balance in Gupshup account',
        {
          category: ErrorCategory.CONFIGURATION,
          retryAction: RetryAction.ESCALATE,
          context,
        }
      );
    }

    if (error.message?.includes('dnd number')) {
      return new GupshupError(
        GupshupErrorCode.SMS_DND_NUMBER,
        'Phone number is registered for Do Not Disturb (DND)',
        {
          category: ErrorCategory.USER_ERROR,
          retryAction: RetryAction.NO_RETRY,
          context,
        }
      );
    }

    // Default to generic error handling
    return handleGupshupError(error, context);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for global use
 */
let gupshupServiceInstance: GupshupService | null = null;

export function getGupshupService(): GupshupService {
  if (!gupshupServiceInstance) {
    gupshupServiceInstance = new GupshupService();
  }
  return gupshupServiceInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearGupshupServiceInstance(): void {
  gupshupServiceInstance = null;
}