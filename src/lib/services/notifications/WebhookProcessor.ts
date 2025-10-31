/**
 * Webhook Processing Service for Gupshup Notifications
 * Handles secure webhook validation, authentication, and real-time status updates
 */

import crypto from 'crypto';
import { getGupshupConfig, GupshupConfig } from '../../config/gupshup-config';
import { 
  getGupshupLogger, 
  createPerformanceTimer,
  GupshupLogger 
} from './GupshupLogger';
import { 
  DeliveryTracker, 
  GupshupWebhook,
  RealTimeStatusUpdate 
} from './DeliveryTracker';
import { 
  GupshupError, 
  GupshupErrorCode,
  handleGupshupError,
  ErrorCategory 
} from './GupshupErrorHandler';

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  payload?: ProcessedWebhookPayload;
}

export interface ProcessedWebhookPayload {
  messageId: string;
  status: string;
  timestamp: Date;
  channel: 'whatsapp' | 'sms';
  errorCode?: string;
  errorMessage?: string;
  destination?: string;
  eventType?: string;
  metadata?: Record<string, any>;
}

export interface WebhookProcessingResult {
  success: boolean;
  messageId: string;
  status: string;
  processedAt: Date;
  processingTime: number;
  error?: string;
  realTimeUpdate?: RealTimeStatusUpdate;
}

export interface WebhookSecurityConfig {
  validateSignature: boolean;
  validateTimestamp: boolean;
  timestampTolerance: number; // seconds
  requiredHeaders: string[];
  allowedIPs?: string[];
}

/**
 * Webhook Processing Service
 */
export class WebhookProcessor {
  private config: GupshupConfig;
  private logger: GupshupLogger;
  private deliveryTracker: DeliveryTracker;
  private securityConfig: WebhookSecurityConfig;

  constructor(deliveryTracker: DeliveryTracker, config?: GupshupConfig) {
    this.config = config || getGupshupConfig();
    this.logger = getGupshupLogger();
    this.deliveryTracker = deliveryTracker;
    
    this.securityConfig = {
      validateSignature: true,
      validateTimestamp: true,
      timestampTolerance: 300, // 5 minutes
      requiredHeaders: ['x-gupshup-signature', 'x-gupshup-timestamp'],
      allowedIPs: [], // Configure based on Gupshup's IP ranges
    };

    this.logger.info('webhook_processor_init', 'Webhook Processor initialized', {
      signatureValidation: this.securityConfig.validateSignature,
      timestampValidation: this.securityConfig.validateTimestamp,
      timestampTolerance: this.securityConfig.timestampTolerance,
    });
  }

  /**
   * Process incoming webhook with full validation and security checks
   */
  async processWebhook(
    payload: any, 
    headers: Record<string, string>, 
    sourceIP?: string
  ): Promise<WebhookProcessingResult> {
    const timer = createPerformanceTimer('process_webhook_secure');
    const startTime = Date.now();
    
    try {
      this.logger.info('webhook_processing_start', 'Starting webhook processing', {
        hasPayload: !!payload,
        headerCount: Object.keys(headers).length,
        sourceIP: sourceIP ? this.maskIP(sourceIP) : undefined,
      });

      // Step 1: Validate webhook security
      const securityValidation = await this.validateWebhookSecurity(payload, headers, sourceIP);
      if (!securityValidation.isValid) {
        throw new GupshupError(
          GupshupErrorCode.UNAUTHORIZED,
          `Webhook security validation failed: ${securityValidation.error}`,
          { category: ErrorCategory.AUTHENTICATION }
        );
      }

      // Step 2: Validate and process payload
      const payloadValidation = this.validateWebhookPayload(payload);
      if (!payloadValidation.isValid || !payloadValidation.payload) {
        throw new GupshupError(
          GupshupErrorCode.INVALID_PARAMETERS,
          `Webhook payload validation failed: ${payloadValidation.error}`,
          { category: ErrorCategory.VALIDATION }
        );
      }

      const processedPayload = payloadValidation.payload;

      // Step 3: Update delivery status
      await this.updateDeliveryStatus(processedPayload);

      // Step 4: Generate real-time update
      const realTimeUpdate = await this.generateRealTimeUpdate(processedPayload);

      const processingTime = Date.now() - startTime;
      const duration = timer.end(true, null, { 
        messageId: processedPayload.messageId,
        status: processedPayload.status,
        processingTime 
      });

      const result: WebhookProcessingResult = {
        success: true,
        messageId: processedPayload.messageId,
        status: processedPayload.status,
        processedAt: new Date(),
        processingTime,
        realTimeUpdate,
      };

      this.logger.info('webhook_processed_successfully', 'Webhook processed successfully', {
        messageId: processedPayload.messageId,
        status: processedPayload.status,
        channel: processedPayload.channel,
        processingTime,
        hasRealTimeUpdate: !!realTimeUpdate,
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const duration = timer.end(false, error);
      const gupshupError = handleGupshupError(error, { 
        payload, 
        headers: Object.keys(headers),
        sourceIP: sourceIP ? this.maskIP(sourceIP) : undefined 
      });
      
      this.logger.error('webhook_processing_error', 'Webhook processing failed', {
        ...gupshupError,
        processingTime,
      });

      return {
        success: false,
        messageId: payload?.messageId || 'unknown',
        status: payload?.status || 'unknown',
        processedAt: new Date(),
        processingTime,
        error: gupshupError.message,
      };
    }
  }

  /**
   * Validate webhook security (signature, timestamp, IP)
   */
  async validateWebhookSecurity(
    payload: any, 
    headers: Record<string, string>, 
    sourceIP?: string
  ): Promise<WebhookValidationResult> {
    try {
      // Check required headers
      for (const requiredHeader of this.securityConfig.requiredHeaders) {
        if (!headers[requiredHeader] && !headers[requiredHeader.toLowerCase()]) {
          return {
            isValid: false,
            error: `Missing required header: ${requiredHeader}`,
          };
        }
      }

      // Validate IP address if configured
      if (this.securityConfig.allowedIPs && this.securityConfig.allowedIPs.length > 0 && sourceIP) {
        if (!this.securityConfig.allowedIPs.includes(sourceIP)) {
          return {
            isValid: false,
            error: `Source IP ${this.maskIP(sourceIP)} not in allowed list`,
          };
        }
      }

      // Validate timestamp if enabled
      if (this.securityConfig.validateTimestamp) {
        const timestampHeader = headers['x-gupshup-timestamp'] || headers['x-gupshup-timestamp'];
        if (timestampHeader) {
          const webhookTimestamp = parseInt(timestampHeader, 10);
          const currentTimestamp = Math.floor(Date.now() / 1000);
          const timeDiff = Math.abs(currentTimestamp - webhookTimestamp);
          
          if (timeDiff > this.securityConfig.timestampTolerance) {
            return {
              isValid: false,
              error: `Webhook timestamp too old or too far in future (${timeDiff}s difference)`,
            };
          }
        }
      }

      // Validate signature if enabled
      if (this.securityConfig.validateSignature) {
        const signatureValidation = await this.validateWebhookSignature(payload, headers);
        if (!signatureValidation.isValid) {
          return signatureValidation;
        }
      }

      return { isValid: true };

    } catch (error) {
      this.logger.error('webhook_security_validation_error', 'Error during webhook security validation', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        isValid: false,
        error: 'Security validation failed due to internal error',
      };
    }
  }

  /**
   * Validate webhook signature using HMAC
   */
  async validateWebhookSignature(payload: any, headers: Record<string, string>): Promise<WebhookValidationResult> {
    try {
      const signature = headers['x-gupshup-signature'] || headers['x-gupshup-signature'];
      if (!signature) {
        return {
          isValid: false,
          error: 'Missing webhook signature',
        };
      }

      // Create payload string for signature verification
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhook.secret)
        .update(payloadString)
        .digest('hex');

      // Compare signatures (constant-time comparison)
      const providedSignature = signature.replace('sha256=', '');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid webhook signature',
        };
      }

      return { isValid: true };

    } catch (error) {
      this.logger.error('webhook_signature_validation_error', 'Error during signature validation', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        isValid: false,
        error: 'Signature validation failed due to internal error',
      };
    }
  }

  /**
   * Validate and normalize webhook payload
   */
  validateWebhookPayload(payload: any): WebhookValidationResult {
    try {
      // Check required fields
      if (!payload || typeof payload !== 'object') {
        return {
          isValid: false,
          error: 'Payload must be a valid JSON object',
        };
      }

      if (!payload.messageId) {
        return {
          isValid: false,
          error: 'Missing required field: messageId',
        };
      }

      if (!payload.status) {
        return {
          isValid: false,
          error: 'Missing required field: status',
        };
      }

      // Normalize and validate fields
      const processedPayload: ProcessedWebhookPayload = {
        messageId: String(payload.messageId).trim(),
        status: String(payload.status).toLowerCase().trim(),
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        channel: this.determineChannel(payload),
        errorCode: payload.errorCode ? String(payload.errorCode) : undefined,
        errorMessage: payload.errorMessage ? String(payload.errorMessage) : undefined,
        destination: payload.destination ? String(payload.destination) : undefined,
        eventType: payload.eventType ? String(payload.eventType) : undefined,
        metadata: payload.metadata || {},
      };

      // Validate messageId format
      if (processedPayload.messageId.length < 1 || processedPayload.messageId.length > 100) {
        return {
          isValid: false,
          error: 'Invalid messageId format',
        };
      }

      // Validate status
      const validStatuses = ['sent', 'delivered', 'read', 'failed', 'rejected', 'error'];
      if (!validStatuses.includes(processedPayload.status)) {
        return {
          isValid: false,
          error: `Invalid status: ${processedPayload.status}. Must be one of: ${validStatuses.join(', ')}`,
        };
      }

      // Validate timestamp
      if (isNaN(processedPayload.timestamp.getTime())) {
        processedPayload.timestamp = new Date(); // Fallback to current time
      }

      return {
        isValid: true,
        payload: processedPayload,
      };

    } catch (error) {
      this.logger.error('webhook_payload_validation_error', 'Error during payload validation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: typeof payload === 'object' ? Object.keys(payload || {}) : typeof payload,
      });
      
      return {
        isValid: false,
        error: 'Payload validation failed due to internal error',
      };
    }
  }

  /**
   * Update delivery status in the tracker
   */
  private async updateDeliveryStatus(payload: ProcessedWebhookPayload): Promise<void> {
    try {
      // Map Gupshup status to our standard status
      const mappedStatus = this.mapGupshupStatus(payload.status);
      
      // Prepare error info if present
      const errorInfo = payload.errorCode || payload.errorMessage ? {
        code: payload.errorCode,
        message: payload.errorMessage,
      } : undefined;

      // Update status in delivery tracker
      await this.deliveryTracker.updateStatus(payload.messageId, mappedStatus, errorInfo);

      this.logger.debug('delivery_status_updated_from_webhook', 'Delivery status updated from webhook', {
        messageId: payload.messageId,
        originalStatus: payload.status,
        mappedStatus,
        channel: payload.channel,
        hasError: !!errorInfo,
      });

    } catch (error) {
      this.logger.error('delivery_status_update_error', 'Failed to update delivery status from webhook', {
        messageId: payload.messageId,
        status: payload.status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate real-time update for the processed webhook
   */
  private async generateRealTimeUpdate(payload: ProcessedWebhookPayload): Promise<RealTimeStatusUpdate | undefined> {
    try {
      // Get current delivery status to extract user info
      const currentStatus = await this.deliveryTracker.getDeliveryStats();
      
      // For now, we'll create a basic real-time update
      // In a full implementation, we'd need to store user mapping with message IDs
      const realTimeUpdate: RealTimeStatusUpdate = {
        messageId: payload.messageId,
        userId: 'unknown', // Would need to be stored with the original message
        status: this.mapGupshupStatus(payload.status),
        timestamp: payload.timestamp,
        channel: payload.channel,
        errorInfo: payload.errorCode || payload.errorMessage ? {
          code: payload.errorCode || 'unknown',
          message: payload.errorMessage || 'Unknown error',
        } : undefined,
      };

      return realTimeUpdate;

    } catch (error) {
      this.logger.error('realtime_update_generation_error', 'Failed to generate real-time update', {
        messageId: payload.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Determine channel from webhook payload
   */
  private determineChannel(payload: any): 'whatsapp' | 'sms' {
    // Check various fields that might indicate the channel
    if (payload.channel) {
      const channel = String(payload.channel).toLowerCase();
      if (channel.includes('whatsapp') || channel.includes('wa')) {
        return 'whatsapp';
      }
      if (channel.includes('sms') || channel.includes('text')) {
        return 'sms';
      }
    }

    // Check event type
    if (payload.eventType) {
      const eventType = String(payload.eventType).toLowerCase();
      if (eventType.includes('whatsapp')) {
        return 'whatsapp';
      }
      if (eventType.includes('sms')) {
        return 'sms';
      }
    }

    // Check destination format (WhatsApp typically uses different format)
    if (payload.destination) {
      const destination = String(payload.destination);
      if (destination.includes('@') || destination.includes('whatsapp')) {
        return 'whatsapp';
      }
    }

    // Default to WhatsApp (most common)
    return 'whatsapp';
  }

  /**
   * Map Gupshup status to our standard status
   */
  private mapGupshupStatus(gupshupStatus: string): 'sent' | 'delivered' | 'read' | 'failed' {
    switch (gupshupStatus.toLowerCase()) {
      case 'sent':
      case 'submitted':
      case 'queued':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
      case 'rejected':
      case 'error':
      case 'undelivered':
        return 'failed';
      default:
        this.logger.warn('unknown_gupshup_status', 'Unknown Gupshup status received', { 
          status: gupshupStatus 
        });
        return 'sent'; // Default to sent for unknown statuses
    }
  }

  /**
   * Mask IP address for logging privacy
   */
  private maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(config: Partial<WebhookSecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
    
    this.logger.info('webhook_security_config_updated', 'Webhook security configuration updated', {
      validateSignature: this.securityConfig.validateSignature,
      validateTimestamp: this.securityConfig.validateTimestamp,
      timestampTolerance: this.securityConfig.timestampTolerance,
    });
  }

  /**
   * Get current security configuration
   */
  getSecurityConfig(): WebhookSecurityConfig {
    return { ...this.securityConfig };
  }
}

/**
 * Singleton instance for global use
 */
let webhookProcessorInstance: WebhookProcessor | null = null;

export function getWebhookProcessor(deliveryTracker: DeliveryTracker): WebhookProcessor {
  if (!webhookProcessorInstance) {
    webhookProcessorInstance = new WebhookProcessor(deliveryTracker);
  }
  return webhookProcessorInstance;
}

/**
 * Clear singleton instance (useful for testing)
 */
export function clearWebhookProcessorInstance(): void {
  webhookProcessorInstance = null;
}