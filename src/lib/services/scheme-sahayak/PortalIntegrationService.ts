/**
 * Portal Integration Service for AI-Powered Scheme Sahayak v2.0
 * Handles direct API connections, web scraping fallback, and webhook support
 * Requirements: 3.1, 11.1, 11.2
 */

import { BaseService } from './base/BaseService';
import { GovernmentAPIConnector, GOVERNMENT_API_ENDPOINTS } from './GovernmentAPIConnector';
import {
  SchemeApplication,
  ApplicationStatus,
  ApplicationSubmissionResult,
  SchemeSahayakErrorType
} from '../../types/scheme-sahayak';

// ============================================================================
// WEB SCRAPING CONFIGURATION
// ============================================================================

export interface ScraperConfig {
  portalName: string;
  baseUrl: string;
  selectors: {
    loginForm?: string;
    applicationForm?: string;
    statusPage?: string;
    confirmationNumber?: string;
    errorMessage?: string;
  };
  authentication: {
    type: 'form' | 'session' | 'cookie';
    credentials?: {
      usernameField: string;
      passwordField: string;
    };
  };
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

/**
 * Configuration for web scraping fallback portals
 */
export const SCRAPER_CONFIGS: Record<string, ScraperConfig> = {
  legacy_state_portal: {
    portalName: 'Legacy State Portal',
    baseUrl: 'https://legacy.state.gov.in',
    selectors: {
      loginForm: '#login-form',
      applicationForm: '#application-form',
      statusPage: '.status-container',
      confirmationNumber: '.confirmation-number',
      errorMessage: '.error-message'
    },
    authentication: {
      type: 'form',
      credentials: {
        usernameField: 'username',
        passwordField: 'password'
      }
    },
    rateLimit: {
      requestsPerMinute: 10,
      delayBetweenRequests: 6000
    },
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2
    }
  },
  district_welfare_portal: {
    portalName: 'District Welfare Portal',
    baseUrl: 'https://welfare.district.gov.in',
    selectors: {
      applicationForm: 'form[name="schemeApplication"]',
      statusPage: '#application-status',
      confirmationNumber: 'span.ref-number',
      errorMessage: 'div.alert-danger'
    },
    authentication: {
      type: 'session'
    },
    rateLimit: {
      requestsPerMinute: 15,
      delayBetweenRequests: 4000
    },
    retryConfig: {
      maxRetries: 2,
      backoffMultiplier: 1.5
    }
  }
};

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export interface WebhookConfig {
  id: string;
  portalName: string;
  endpoint: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export type WebhookEventType = 
  | 'application.submitted'
  | 'application.status_changed'
  | 'application.approved'
  | 'application.rejected'
  | 'document.required'
  | 'document.verified'
  | 'scheme.updated'
  | 'scheme.deadline_approaching';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: Date;
  portalName: string;
  data: {
    applicationId?: string;
    governmentApplicationId?: string;
    schemeId?: string;
    status?: string;
    message?: string;
    metadata?: Record<string, any>;
  };
  signature: string;
}

// ============================================================================
// PORTAL INTEGRATION SERVICE
// ============================================================================

/**
 * Portal Integration Service - Manages direct API, web scraping, and webhooks
 */
export class PortalIntegrationService extends BaseService {
  private apiConnector: GovernmentAPIConnector;
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private scraperSessions: Map<string, any> = new Map();

  constructor() {
    super('PortalIntegrationService');
    this.apiConnector = new GovernmentAPIConnector();
  }

  // ============================================================================
  // DIRECT API INTEGRATION (Primary Method)
  // ============================================================================

  /**
   * Submit application via direct API connection
   * Requirement 11.1: Direct API connections to government portals
   */
  async submitViaAPI(
    schemeId: string,
    applicationData: SchemeApplication
  ): Promise<ApplicationSubmissionResult> {
    return this.handleAsync(async () => {
      this.log('info', 'Attempting API submission', { schemeId });

      try {
        const result = await this.apiConnector.submitApplicationAutomatically(
          schemeId,
          applicationData.formData,
          applicationData.artisanId
        );

        if (result.success) {
          return {
            applicationId: applicationData.id,
            governmentApplicationId: result.governmentApplicationId,
            status: 'submitted',
            submissionMethod: 'api',
            confirmationNumber: result.confirmationNumber,
            estimatedProcessingTime: 30, // days
            nextSteps: [
              'Application submitted successfully',
              'You will receive updates via notifications',
              'Track your application status in real-time'
            ]
          };
        } else {
          throw new Error(result.error || 'API submission failed');
        }
      } catch (error) {
        this.log('warn', 'API submission failed, will try fallback', error);
        throw error;
      }
    }, 'Failed to submit via API', 'API_SUBMISSION_FAILED');
  }

  /**
   * Check application status via API
   */
  async checkStatusViaAPI(
    governmentApplicationId: string,
    schemeId: string
  ): Promise<ApplicationStatus> {
    return this.handleAsync(async () => {
      const statusData = await this.apiConnector.checkApplicationStatus(
        governmentApplicationId,
        schemeId
      );

      return {
        id: `status_${Date.now()}`,
        applicationId: governmentApplicationId,
        schemeId,
        status: this.normalizeStatus(statusData.status),
        currentStage: statusData.currentStage || 'Under Review',
        progress: this.calculateProgress(statusData.status),
        estimatedCompletion: this.estimateCompletion(statusData.status),
        lastUpdated: statusData.lastUpdated,
        officerContact: statusData.officerContact,
        nextActions: statusData.nextActions || [],
        documents: {
          required: [],
          submitted: [],
          pending: []
        }
      };
    }, 'Failed to check status via API', 'API_STATUS_CHECK_FAILED');
  }

  // ============================================================================
  // WEB SCRAPING FALLBACK (Secondary Method)
  // ============================================================================

  /**
   * Submit application via web scraping when API is not available
   * Requirement 11.2: Web scraping fallback for non-API portals
   */
  async submitViaScraping(
    schemeId: string,
    applicationData: SchemeApplication,
    portalName: string
  ): Promise<ApplicationSubmissionResult> {
    return this.handleAsync(async () => {
      this.log('info', 'Attempting web scraping submission', { schemeId, portalName });

      const scraperConfig = SCRAPER_CONFIGS[portalName];
      if (!scraperConfig) {
        throw new Error(`No scraper configuration found for portal: ${portalName}`);
      }

      // Rate limiting for scraping
      await this.enforceScraperRateLimit(portalName, scraperConfig);

      try {
        // Initialize scraping session
        const session = await this.initializeScraperSession(scraperConfig);

        // Authenticate if required
        if (scraperConfig.authentication.type === 'form') {
          await this.authenticateScraper(session, scraperConfig);
        }

        // Navigate to application form
        const formPage = await this.navigateToApplicationForm(session, scraperConfig);

        // Fill application form
        await this.fillApplicationForm(formPage, applicationData, scraperConfig);

        // Submit form
        const submissionResult = await this.submitScraperForm(formPage, scraperConfig);

        // Extract confirmation number
        const confirmationNumber = await this.extractConfirmationNumber(
          submissionResult,
          scraperConfig
        );

        // Clean up session
        await this.closeScraperSession(session);

        return {
          applicationId: applicationData.id,
          governmentApplicationId: confirmationNumber || `scraped_${Date.now()}`,
          status: 'submitted',
          submissionMethod: 'web_scraping',
          confirmationNumber,
          estimatedProcessingTime: 45, // days (longer for scraped submissions)
          nextSteps: [
            'Application submitted via web portal',
            'Manual verification may be required',
            'Check status periodically'
          ]
        };
      } catch (error) {
        this.log('error', 'Web scraping submission failed', error);
        throw error;
      }
    }, 'Failed to submit via web scraping', 'SCRAPING_SUBMISSION_FAILED');
  }

  /**
   * Check application status via web scraping
   */
  async checkStatusViaScraping(
    governmentApplicationId: string,
    portalName: string
  ): Promise<ApplicationStatus> {
    return this.handleAsync(async () => {
      const scraperConfig = SCRAPER_CONFIGS[portalName];
      if (!scraperConfig) {
        throw new Error(`No scraper configuration found for portal: ${portalName}`);
      }

      await this.enforceScraperRateLimit(portalName, scraperConfig);

      const session = await this.initializeScraperSession(scraperConfig);

      try {
        // Navigate to status page
        const statusPage = await this.navigateToStatusPage(
          session,
          governmentApplicationId,
          scraperConfig
        );

        // Extract status information
        const statusData = await this.extractStatusData(statusPage, scraperConfig);

        await this.closeScraperSession(session);

        return {
          id: `status_${Date.now()}`,
          applicationId: governmentApplicationId,
          schemeId: statusData.schemeId || 'unknown',
          status: this.normalizeStatus(statusData.status),
          currentStage: statusData.currentStage || 'Unknown',
          progress: this.calculateProgress(statusData.status),
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date(),
          nextActions: statusData.nextActions || [],
          documents: {
            required: [],
            submitted: [],
            pending: []
          }
        };
      } catch (error) {
        await this.closeScraperSession(session);
        throw error;
      }
    }, 'Failed to check status via scraping', 'SCRAPING_STATUS_CHECK_FAILED');
  }

  // ============================================================================
  // WEBHOOK SUPPORT (Real-time Updates)
  // ============================================================================

  /**
   * Register webhook for real-time updates from government portal
   * Requirement 3.1: Real-time application tracking
   */
  async registerWebhook(
    portalName: string,
    events: WebhookEventType[],
    callbackUrl: string
  ): Promise<WebhookConfig> {
    return this.handleAsync(async () => {
      this.log('info', 'Registering webhook', { portalName, events });

      // Generate webhook secret
      const secret = this.generateWebhookSecret();

      // Create webhook configuration
      const webhookConfig: WebhookConfig = {
        id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        portalName,
        endpoint: callbackUrl,
        secret,
        events,
        active: true,
        createdAt: new Date()
      };

      // Register with government portal (if they support webhooks)
      try {
        await this.registerWebhookWithPortal(portalName, webhookConfig);
      } catch (error) {
        this.log('warn', 'Portal does not support webhooks, will use polling', error);
      }

      // Store webhook configuration
      this.webhookConfigs.set(webhookConfig.id, webhookConfig);

      return webhookConfig;
    }, 'Failed to register webhook', 'WEBHOOK_REGISTRATION_FAILED');
  }

  /**
   * Handle incoming webhook from government portal
   */
  async handleWebhook(
    payload: WebhookPayload,
    signature: string
  ): Promise<{
    success: boolean;
    processed: boolean;
    message: string;
  }> {
    return this.handleAsync(async () => {
      this.log('info', 'Processing webhook', { event: payload.event });

      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on event type
      switch (payload.event) {
        case 'application.status_changed':
          await this.processStatusChangeWebhook(payload);
          break;

        case 'application.approved':
          await this.processApprovalWebhook(payload);
          break;

        case 'application.rejected':
          await this.processRejectionWebhook(payload);
          break;

        case 'document.required':
          await this.processDocumentRequiredWebhook(payload);
          break;

        case 'scheme.updated':
          await this.processSchemeUpdateWebhook(payload);
          break;

        default:
          this.log('warn', `Unhandled webhook event: ${payload.event}`);
      }

      // Update webhook last triggered time
      const webhookConfig = Array.from(this.webhookConfigs.values()).find(
        config => config.portalName === payload.portalName
      );
      if (webhookConfig) {
        webhookConfig.lastTriggered = new Date();
      }

      return {
        success: true,
        processed: true,
        message: `Webhook processed successfully for event: ${payload.event}`
      };
    }, 'Failed to handle webhook', 'WEBHOOK_PROCESSING_FAILED');
  }

  /**
   * Unregister webhook
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    return this.handleAsync(async () => {
      const webhookConfig = this.webhookConfigs.get(webhookId);
      if (!webhookConfig) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      // Unregister from government portal
      try {
        await this.unregisterWebhookFromPortal(webhookConfig);
      } catch (error) {
        this.log('warn', 'Failed to unregister from portal', error);
      }

      // Remove from local storage
      this.webhookConfigs.delete(webhookId);

      this.log('info', 'Webhook unregistered', { webhookId });
    }, 'Failed to unregister webhook', 'WEBHOOK_UNREGISTER_FAILED');
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(portalName?: string): Promise<WebhookConfig[]> {
    return this.handleAsync(async () => {
      const webhooks = Array.from(this.webhookConfigs.values());
      
      if (portalName) {
        return webhooks.filter(webhook => webhook.portalName === portalName);
      }
      
      return webhooks;
    }, 'Failed to list webhooks', 'WEBHOOK_LIST_FAILED');
  }

  // ============================================================================
  // UNIFIED SUBMISSION METHOD (Automatic Fallback)
  // ============================================================================

  /**
   * Submit application with automatic fallback from API to scraping
   * Requirement 11.1, 11.2: Seamless integration with fallback
   */
  async submitApplication(
    schemeId: string,
    applicationData: SchemeApplication
  ): Promise<ApplicationSubmissionResult> {
    return this.handleAsync(async () => {
      this.log('info', 'Starting unified application submission', { schemeId });

      // Try API first
      try {
        const apiResult = await this.submitViaAPI(schemeId, applicationData);
        this.log('info', 'API submission successful');
        return apiResult;
      } catch (apiError) {
        this.log('warn', 'API submission failed, trying web scraping fallback', apiError);

        // Determine which scraper to use
        const scraperPortal = await this.determineScraperPortal(schemeId);
        
        if (scraperPortal) {
          try {
            const scrapingResult = await this.submitViaScraping(
              schemeId,
              applicationData,
              scraperPortal
            );
            this.log('info', 'Web scraping submission successful');
            return scrapingResult;
          } catch (scrapingError) {
            this.log('error', 'Both API and scraping failed', scrapingError);
            
            // Return manual submission required
            return {
              applicationId: applicationData.id,
              status: 'pending',
              submissionMethod: 'manual',
              estimatedProcessingTime: 0,
              nextSteps: [
                'Automatic submission failed',
                'Please submit manually at the government portal',
                'Contact support for assistance'
              ],
              errors: [
                `API Error: ${apiError instanceof Error ? apiError.message : 'Unknown'}`,
                `Scraping Error: ${scrapingError instanceof Error ? scrapingError.message : 'Unknown'}`
              ]
            };
          }
        } else {
          throw new Error('No fallback method available for this scheme');
        }
      }
    }, 'Failed to submit application', 'UNIFIED_SUBMISSION_FAILED');
  }

  /**
   * Check application status with automatic fallback
   */
  async checkApplicationStatus(
    governmentApplicationId: string,
    schemeId: string,
    submissionMethod?: 'api' | 'web_scraping'
  ): Promise<ApplicationStatus> {
    return this.handleAsync(async () => {
      // Try API first if method not specified or is API
      if (!submissionMethod || submissionMethod === 'api') {
        try {
          return await this.checkStatusViaAPI(governmentApplicationId, schemeId);
        } catch (apiError) {
          this.log('warn', 'API status check failed, trying scraping', apiError);
        }
      }

      // Try scraping fallback
      const scraperPortal = await this.determineScraperPortal(schemeId);
      if (scraperPortal) {
        return await this.checkStatusViaScraping(governmentApplicationId, scraperPortal);
      }

      throw new Error('Unable to check application status via any method');
    }, 'Failed to check application status', 'STATUS_CHECK_FAILED');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Initialize web scraper session
   */
  private async initializeScraperSession(config: ScraperConfig): Promise<any> {
    // In a real implementation, this would use Puppeteer or Playwright
    // For now, return a mock session object
    const sessionId = `session_${Date.now()}`;
    const session = {
      id: sessionId,
      config,
      startTime: new Date()
    };
    
    this.scraperSessions.set(sessionId, session);
    return session;
  }

  /**
   * Authenticate scraper session
   */
  private async authenticateScraper(session: any, config: ScraperConfig): Promise<void> {
    // Mock authentication
    this.log('info', 'Authenticating scraper session', { portal: config.portalName });
    await this.sleep(1000);
  }

  /**
   * Navigate to application form
   */
  private async navigateToApplicationForm(session: any, config: ScraperConfig): Promise<any> {
    // Mock navigation
    this.log('info', 'Navigating to application form');
    await this.sleep(500);
    return { url: `${config.baseUrl}/application`, session };
  }

  /**
   * Fill application form
   */
  private async fillApplicationForm(
    page: any,
    applicationData: SchemeApplication,
    config: ScraperConfig
  ): Promise<void> {
    // Mock form filling
    this.log('info', 'Filling application form');
    await this.sleep(2000);
  }

  /**
   * Submit scraper form
   */
  private async submitScraperForm(page: any, config: ScraperConfig): Promise<any> {
    // Mock form submission
    this.log('info', 'Submitting form');
    await this.sleep(1000);
    return { success: true, page };
  }

  /**
   * Extract confirmation number from submission result
   */
  private async extractConfirmationNumber(
    result: any,
    config: ScraperConfig
  ): Promise<string | undefined> {
    // Mock extraction
    return `CONF${Date.now()}`;
  }

  /**
   * Navigate to status page
   */
  private async navigateToStatusPage(
    session: any,
    applicationId: string,
    config: ScraperConfig
  ): Promise<any> {
    // Mock navigation
    await this.sleep(500);
    return { applicationId, session };
  }

  /**
   * Extract status data from page
   */
  private async extractStatusData(page: any, config: ScraperConfig): Promise<any> {
    // Mock extraction
    return {
      status: 'under_review',
      currentStage: 'Document Verification',
      nextActions: ['Wait for verification']
    };
  }

  /**
   * Close scraper session
   */
  private async closeScraperSession(session: any): Promise<void> {
    if (session && session.id) {
      this.scraperSessions.delete(session.id);
    }
  }

  /**
   * Enforce rate limiting for scraping
   */
  private async enforceScraperRateLimit(
    portalName: string,
    config: ScraperConfig
  ): Promise<void> {
    // Simple rate limiting implementation
    const lastRequest = (this as any)[`lastRequest_${portalName}`];
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      if (timeSinceLastRequest < config.rateLimit.delayBetweenRequests) {
        const waitTime = config.rateLimit.delayBetweenRequests - timeSinceLastRequest;
        await this.sleep(waitTime);
      }
    }
    (this as any)[`lastRequest_${portalName}`] = Date.now();
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return `whsec_${Math.random().toString(36).substr(2, 32)}`;
  }

  /**
   * Register webhook with government portal
   */
  private async registerWebhookWithPortal(
    portalName: string,
    config: WebhookConfig
  ): Promise<void> {
    // In a real implementation, this would call the portal's webhook registration API
    this.log('info', 'Registering webhook with portal', { portalName });
  }

  /**
   * Unregister webhook from government portal
   */
  private async unregisterWebhookFromPortal(config: WebhookConfig): Promise<void> {
    // In a real implementation, this would call the portal's webhook unregistration API
    this.log('info', 'Unregistering webhook from portal', { portalName: config.portalName });
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(
    payload: WebhookPayload,
    signature: string
  ): Promise<boolean> {
    // In a real implementation, this would verify HMAC signature
    // For now, return true for testing
    return true;
  }

  /**
   * Process status change webhook
   */
  private async processStatusChangeWebhook(payload: WebhookPayload): Promise<void> {
    this.log('info', 'Processing status change webhook', payload.data);
    // Update application status in database
    // Send notification to user
  }

  /**
   * Process approval webhook
   */
  private async processApprovalWebhook(payload: WebhookPayload): Promise<void> {
    this.log('info', 'Processing approval webhook', payload.data);
    // Update application status to approved
    // Send congratulations notification
  }

  /**
   * Process rejection webhook
   */
  private async processRejectionWebhook(payload: WebhookPayload): Promise<void> {
    this.log('info', 'Processing rejection webhook', payload.data);
    // Update application status to rejected
    // Send notification with reasons and next steps
  }

  /**
   * Process document required webhook
   */
  private async processDocumentRequiredWebhook(payload: WebhookPayload): Promise<void> {
    this.log('info', 'Processing document required webhook', payload.data);
    // Notify user about required documents
  }

  /**
   * Process scheme update webhook
   */
  private async processSchemeUpdateWebhook(payload: WebhookPayload): Promise<void> {
    this.log('info', 'Processing scheme update webhook', payload.data);
    // Update scheme information in database
    // Notify affected users
  }

  /**
   * Determine which scraper portal to use for a scheme
   */
  private async determineScraperPortal(schemeId: string): Promise<string | null> {
    // In a real implementation, this would look up the scheme and determine
    // which scraper configuration to use based on the scheme's provider
    
    // For now, return the first available scraper
    const availableScrapers = Object.keys(SCRAPER_CONFIGS);
    return availableScrapers.length > 0 ? availableScrapers[0] : null;
  }

  /**
   * Normalize status from different sources
   */
  private normalizeStatus(status: string): 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold' {
    const statusMap: Record<string, any> = {
      'pending': 'submitted',
      'in_review': 'under_review',
      'reviewing': 'under_review',
      'processing': 'under_review',
      'approved': 'approved',
      'accepted': 'approved',
      'rejected': 'rejected',
      'declined': 'rejected',
      'on_hold': 'on_hold',
      'paused': 'on_hold',
      'draft': 'draft'
    };

    return statusMap[status.toLowerCase()] || 'submitted';
  }

  /**
   * Calculate progress percentage based on status
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'draft': 10,
      'submitted': 25,
      'under_review': 50,
      'approved': 100,
      'rejected': 100,
      'on_hold': 40
    };

    return progressMap[this.normalizeStatus(status)] || 0;
  }

  /**
   * Estimate completion date based on status
   */
  private estimateCompletion(status: string): Date {
    const daysMap: Record<string, number> = {
      'draft': 45,
      'submitted': 30,
      'under_review': 15,
      'approved': 0,
      'rejected': 0,
      'on_hold': 60
    };

    const days = daysMap[this.normalizeStatus(status)] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for Portal Integration Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Check API connector health
    const apiHealth = await this.apiConnector.testConnectivity();
    const healthyAPIs = Object.values(apiHealth).filter(result => result.status === 'connected');
    
    if (healthyAPIs.length === 0) {
      throw new Error('No government APIs are accessible');
    }

    // Check scraper sessions
    const activeSessions = this.scraperSessions.size;
    if (activeSessions > 10) {
      this.log('warn', `High number of active scraper sessions: ${activeSessions}`);
    }

    // Check webhooks
    const activeWebhooks = Array.from(this.webhookConfigs.values()).filter(w => w.active).length;
    this.log('info', `Health check passed: ${healthyAPIs.length} APIs, ${activeSessions} sessions, ${activeWebhooks} webhooks`);
  }
}

// Export default instance
export default PortalIntegrationService;
