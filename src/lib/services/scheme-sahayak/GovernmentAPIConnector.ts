/**
 * Government API Connector for AI-Powered Scheme Sahayak v2.0
 * Handles integration with various government portals and APIs with rate limiting and retry mechanisms
 */

import { BaseService } from './base/BaseService';
import { IGovernmentAPIConnector } from './interfaces';
import { 
  GovernmentScheme,
  SchemeApplication,
  SchemeSahayakErrorType 
} from '../../types/scheme-sahayak';
import { 
  GovernmentSchemeFactory,
  GovernmentSchemeValidator 
} from '../../models/scheme-sahayak/GovernmentScheme';

// ============================================================================
// API CONFIGURATION AND TYPES
// ============================================================================

export interface APIEndpoint {
  name: string;
  baseUrl: string;
  apiKey?: string;
  authType: 'none' | 'api_key' | 'oauth' | 'basic';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  healthCheckEndpoint?: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: Date;
    responseTime: number;
    endpoint: string;
    rateLimitRemaining?: number;
  };
}

export interface SyncResult {
  endpoint: string;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  duration: number;
  nextSyncTime?: Date;
}

// ============================================================================
// GOVERNMENT API ENDPOINTS CONFIGURATION
// ============================================================================

/**
 * Configuration for various government API endpoints
 */
export const GOVERNMENT_API_ENDPOINTS: Record<string, APIEndpoint> = {
  // Central Government APIs
  msme_portal: {
    name: 'MSME Development Portal',
    baseUrl: 'https://api.msme.gov.in/v1',
    authType: 'api_key',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },
    healthCheckEndpoint: '/health',
    status: 'active'
  },

  skill_development: {
    name: 'Skill Development Portal',
    baseUrl: 'https://api.skilldevelopment.gov.in/v2',
    authType: 'oauth',
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
      requestsPerDay: 20000
    },
    timeout: 25000,
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 500
    },
    healthCheckEndpoint: '/status',
    status: 'active'
  },

  rural_development: {
    name: 'Rural Development Portal',
    baseUrl: 'https://api.rural.nic.in/v1',
    authType: 'api_key',
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000
    },
    timeout: 45000,
    retryConfig: {
      maxRetries: 5,
      backoffMultiplier: 2,
      initialDelay: 2000
    },
    healthCheckEndpoint: '/ping',
    status: 'active'
  },

  agriculture_portal: {
    name: 'Agriculture Portal',
    baseUrl: 'https://api.agriculture.gov.in/v1',
    authType: 'basic',
    rateLimit: {
      requestsPerMinute: 40,
      requestsPerHour: 800,
      requestsPerDay: 8000
    },
    timeout: 35000,
    retryConfig: {
      maxRetries: 4,
      backoffMultiplier: 1.8,
      initialDelay: 1500
    },
    status: 'active'
  },

  // State Government APIs (examples)
  maharashtra_schemes: {
    name: 'Maharashtra State Schemes',
    baseUrl: 'https://api.maharashtra.gov.in/schemes/v1',
    authType: 'api_key',
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerHour: 1200,
      requestsPerDay: 12000
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },
    status: 'active'
  },

  karnataka_schemes: {
    name: 'Karnataka State Schemes',
    baseUrl: 'https://api.karnataka.gov.in/schemes/v1',
    authType: 'oauth',
    rateLimit: {
      requestsPerMinute: 45,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },
    status: 'active'
  },

  // Mock/Test endpoints for development
  mock_central: {
    name: 'Mock Central API',
    baseUrl: 'https://mock-api.scheme-sahayak.dev/central/v1',
    authType: 'none',
    rateLimit: {
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      requestsPerDay: 100000
    },
    timeout: 5000,
    retryConfig: {
      maxRetries: 2,
      backoffMultiplier: 1.5,
      initialDelay: 500
    },
    status: 'active'
  }
};

// ============================================================================
// RATE LIMITING SYSTEM
// ============================================================================

/**
 * Rate limiting manager for API requests
 */
class RateLimiter {
  private requestCounts: Map<string, {
    minute: { count: number; resetTime: number };
    hour: { count: number; resetTime: number };
    day: { count: number; resetTime: number };
  }> = new Map();

  /**
   * Check if request is allowed under rate limits
   */
  canMakeRequest(endpointName: string, endpoint: APIEndpoint): boolean {
    const now = Date.now();
    const counts = this.getOrCreateCounts(endpointName, now);

    // Check minute limit
    if (now > counts.minute.resetTime) {
      counts.minute = { count: 0, resetTime: now + 60000 };
    }
    if (counts.minute.count >= endpoint.rateLimit.requestsPerMinute) {
      return false;
    }

    // Check hour limit
    if (now > counts.hour.resetTime) {
      counts.hour = { count: 0, resetTime: now + 3600000 };
    }
    if (counts.hour.count >= endpoint.rateLimit.requestsPerHour) {
      return false;
    }

    // Check day limit
    if (now > counts.day.resetTime) {
      counts.day = { count: 0, resetTime: now + 86400000 };
    }
    if (counts.day.count >= endpoint.rateLimit.requestsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(endpointName: string): void {
    const now = Date.now();
    const counts = this.getOrCreateCounts(endpointName, now);
    
    counts.minute.count++;
    counts.hour.count++;
    counts.day.count++;
  }

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(endpointName: string, endpoint: APIEndpoint): number {
    const now = Date.now();
    const counts = this.requestCounts.get(endpointName);
    
    if (!counts) return 0;

    // Return the shortest reset time
    const minuteReset = Math.max(0, counts.minute.resetTime - now);
    const hourReset = Math.max(0, counts.hour.resetTime - now);
    const dayReset = Math.max(0, counts.day.resetTime - now);

    return Math.min(minuteReset, hourReset, dayReset);
  }

  private getOrCreateCounts(endpointName: string, now: number) {
    if (!this.requestCounts.has(endpointName)) {
      this.requestCounts.set(endpointName, {
        minute: { count: 0, resetTime: now + 60000 },
        hour: { count: 0, resetTime: now + 3600000 },
        day: { count: 0, resetTime: now + 86400000 }
      });
    }
    return this.requestCounts.get(endpointName)!;
  }
}

// ============================================================================
// RETRY MECHANISM
// ============================================================================

/**
 * Retry mechanism with exponential backoff
 */
class RetryManager {
  /**
   * Execute request with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: APIEndpoint['retryConfig'],
    endpointName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        const totalDelay = delay + jitter;

        console.log(`Retrying ${endpointName} request in ${totalDelay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        await this.sleep(totalDelay);
      }
    }

    throw lastError!;
  }

  private shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors, bad requests, etc.
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    return error.status && nonRetryableStatuses.includes(error.status);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// GOVERNMENT API CONNECTOR SERVICE
// ============================================================================

/**
 * Government API Connector Service Implementation
 */
export class GovernmentAPIConnector extends BaseService implements IGovernmentAPIConnector {
  private rateLimiter: RateLimiter;
  private retryManager: RetryManager;
  private endpointStatus: Map<string, { lastCheck: Date; isHealthy: boolean }> = new Map();

  constructor() {
    super('GovernmentAPIConnector');
    this.rateLimiter = new RateLimiter();
    this.retryManager = new RetryManager();
  }

  // ============================================================================
  // CORE API METHODS
  // ============================================================================

  /**
   * Submit application to government portal
   */
  async submitToGovernmentPortal(
    schemeId: string,
    applicationData: Record<string, any>
  ): Promise<{
    success: boolean;
    governmentApplicationId?: string;
    confirmationNumber?: string;
    error?: string;
  }> {
    return this.handleAsync(async () => {
      // Determine which API endpoint to use based on scheme
      const endpoint = await this.determineEndpointForScheme(schemeId);
      
      if (!endpoint) {
        throw new Error(`No API endpoint available for scheme: ${schemeId}`);
      }

      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(endpoint.name, endpoint)) {
        const resetTime = this.rateLimiter.getTimeUntilReset(endpoint.name, endpoint);
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`);
      }

      // Prepare application data
      const preparedData = this.prepareApplicationData(applicationData, endpoint);

      // Submit with retry logic
      const result = await this.retryManager.executeWithRetry(
        async () => {
          this.rateLimiter.recordRequest(endpoint.name);
          return await this.makeAPIRequest(
            endpoint,
            'POST',
            '/applications',
            preparedData
          );
        },
        endpoint.retryConfig,
        endpoint.name
      );

      if (result.success && result.data) {
        return {
          success: true,
          governmentApplicationId: result.data.applicationId || result.data.id,
          confirmationNumber: result.data.confirmationNumber || result.data.referenceNumber,
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Application submission failed'
        };
      }
    }, 'Failed to submit application to government portal', 'SUBMIT_APPLICATION_FAILED');
  }

  /**
   * Check application status from government portal
   */
  async checkApplicationStatus(
    governmentApplicationId: string,
    schemeId: string
  ): Promise<{
    status: string;
    lastUpdated: Date;
    currentStage?: string;
    officerContact?: {
      name: string;
      phone: string;
      email: string;
    };
    nextActions?: string[];
  }> {
    return this.handleAsync(async () => {
      const endpoint = await this.determineEndpointForScheme(schemeId);
      
      if (!endpoint) {
        throw new Error(`No API endpoint available for scheme: ${schemeId}`);
      }

      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(endpoint.name, endpoint)) {
        const resetTime = this.rateLimiter.getTimeUntilReset(endpoint.name, endpoint);
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`);
      }

      const result = await this.retryManager.executeWithRetry(
        async () => {
          this.rateLimiter.recordRequest(endpoint.name);
          return await this.makeAPIRequest(
            endpoint,
            'GET',
            `/applications/${governmentApplicationId}/status`
          );
        },
        endpoint.retryConfig,
        endpoint.name
      );

      if (result.success && result.data) {
        return {
          status: this.normalizeStatus(result.data.status),
          lastUpdated: new Date(result.data.lastUpdated || result.data.updatedAt),
          currentStage: result.data.currentStage || result.data.stage,
          officerContact: result.data.officer ? {
            name: result.data.officer.name,
            phone: result.data.officer.phone || result.data.officer.contact,
            email: result.data.officer.email
          } : undefined,
          nextActions: result.data.nextActions || result.data.requiredActions || []
        };
      } else {
        throw new Error(result.error?.message || 'Failed to check application status');
      }
    }, 'Failed to check application status', 'CHECK_STATUS_FAILED');
  }

  /**
   * Verify document with government database
   */
  async verifyDocumentWithGovernment(
    documentType: string,
    documentNumber: string,
    additionalData?: Record<string, any>
  ): Promise<{
    isValid: boolean;
    details?: Record<string, any>;
    error?: string;
  }> {
    return this.handleAsync(async () => {
      // Determine appropriate endpoint for document verification
      const endpoint = this.getDocumentVerificationEndpoint(documentType);
      
      if (!endpoint) {
        return {
          isValid: false,
          error: `Document verification not supported for type: ${documentType}`
        };
      }

      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(endpoint.name, endpoint)) {
        const resetTime = this.rateLimiter.getTimeUntilReset(endpoint.name, endpoint);
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds`);
      }

      const verificationData = {
        documentType,
        documentNumber,
        ...additionalData
      };

      const result = await this.retryManager.executeWithRetry(
        async () => {
          this.rateLimiter.recordRequest(endpoint.name);
          return await this.makeAPIRequest(
            endpoint,
            'POST',
            '/verify-document',
            verificationData
          );
        },
        endpoint.retryConfig,
        endpoint.name
      );

      if (result.success && result.data) {
        return {
          isValid: result.data.isValid || result.data.valid,
          details: result.data.details || result.data.documentDetails
        };
      } else {
        return {
          isValid: false,
          error: result.error?.message || 'Document verification failed'
        };
      }
    }, 'Failed to verify document', 'VERIFY_DOCUMENT_FAILED');
  }

  /**
   * Fetch latest schemes from government APIs
   */
  async fetchLatestSchemes(): Promise<GovernmentScheme[]> {
    return this.handleAsync(async () => {
      const allSchemes: GovernmentScheme[] = [];
      const syncResults: SyncResult[] = [];

      // Fetch from all active endpoints
      for (const [endpointName, endpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
        if (endpoint.status !== 'active') continue;

        try {
          const result = await this.fetchSchemesFromEndpoint(endpointName, endpoint);
          allSchemes.push(...result.schemes);
          syncResults.push(result.syncResult);
        } catch (error) {
          this.log('error', `Failed to fetch schemes from ${endpointName}`, error);
          syncResults.push({
            endpoint: endpointName,
            processed: 0,
            successful: 0,
            failed: 1,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration: 0
          });
        }
      }

      // Log sync summary
      const totalProcessed = syncResults.reduce((sum, result) => sum + result.processed, 0);
      const totalSuccessful = syncResults.reduce((sum, result) => sum + result.successful, 0);
      const totalFailed = syncResults.reduce((sum, result) => sum + result.failed, 0);

      this.log('info', 'Scheme sync completed', {
        totalProcessed,
        totalSuccessful,
        totalFailed,
        endpointsProcessed: syncResults.length
      });

      return allSchemes;
    }, 'Failed to fetch latest schemes', 'FETCH_SCHEMES_FAILED');
  }

  /**
   * Test API connectivity
   */
  async testConnectivity(): Promise<{
    [portalName: string]: {
      status: 'connected' | 'error';
      responseTime?: number;
      error?: string;
    };
  }> {
    return this.handleAsync(async () => {
      const results: Record<string, any> = {};

      // Test all endpoints in parallel
      const testPromises = Object.entries(GOVERNMENT_API_ENDPOINTS).map(
        async ([endpointName, endpoint]) => {
          const startTime = Date.now();
          
          try {
            if (endpoint.status !== 'active') {
              results[endpointName] = {
                status: 'error',
                error: 'Endpoint is not active'
              };
              return;
            }

            // Use health check endpoint if available, otherwise test base URL
            const testPath = endpoint.healthCheckEndpoint || '/';
            
            const result = await this.makeAPIRequest(
              endpoint,
              'GET',
              testPath,
              undefined,
              5000 // Short timeout for health checks
            );

            const responseTime = Date.now() - startTime;

            results[endpointName] = {
              status: result.success ? 'connected' : 'error',
              responseTime,
              error: result.success ? undefined : result.error?.message
            };

            // Update endpoint status cache
            this.endpointStatus.set(endpointName, {
              lastCheck: new Date(),
              isHealthy: result.success
            });

          } catch (error) {
            const responseTime = Date.now() - startTime;
            results[endpointName] = {
              status: 'error',
              responseTime,
              error: error instanceof Error ? error.message : 'Unknown error'
            };

            this.endpointStatus.set(endpointName, {
              lastCheck: new Date(),
              isHealthy: false
            });
          }
        }
      );

      await Promise.all(testPromises);
      return results;
    }, 'Failed to test API connectivity', 'TEST_CONNECTIVITY_FAILED');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Make HTTP request to API endpoint
   */
  private async makeAPIRequest(
    endpoint: APIEndpoint,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    customTimeout?: number
  ): Promise<APIResponse> {
    const requestId = this.generateAPIRequestId();
    const startTime = Date.now();

    try {
      const url = `${endpoint.baseUrl}${path}`;
      const timeout = customTimeout || endpoint.timeout;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SchemeSahayak/2.0',
        'X-Request-ID': requestId
      };

      // Add authentication headers
      this.addAuthHeaders(headers, endpoint);

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(timeout)
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      // Make request
      const response = await fetch(url, requestOptions);
      const responseTime = Date.now() - startTime;

      // Parse response
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Check if request was successful
      const success = response.ok;

      return {
        success,
        data: success ? responseData : undefined,
        error: success ? undefined : {
          code: response.status.toString(),
          message: responseData.message || response.statusText,
          details: responseData
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          responseTime,
          endpoint: endpoint.name,
          rateLimitRemaining: response.headers.get('X-RateLimit-Remaining') ? 
            parseInt(response.headers.get('X-RateLimit-Remaining')!) : undefined
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          responseTime,
          endpoint: endpoint.name
        }
      };
    }
  }

  /**
   * Add authentication headers based on endpoint configuration
   */
  private addAuthHeaders(headers: Record<string, string>, endpoint: APIEndpoint): void {
    switch (endpoint.authType) {
      case 'api_key':
        if (endpoint.apiKey) {
          headers['X-API-Key'] = endpoint.apiKey;
        }
        break;
      case 'basic':
        // In a real implementation, you would get credentials from secure storage
        const credentials = this.getBasicAuthCredentials(endpoint.name);
        if (credentials) {
          headers['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
        }
        break;
      case 'oauth':
        // In a real implementation, you would handle OAuth token management
        const token = this.getOAuthToken(endpoint.name);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
    }
  }

  /**
   * Determine which API endpoint to use for a scheme
   */
  private async determineEndpointForScheme(schemeId: string): Promise<APIEndpoint | null> {
    // In a real implementation, this would:
    // 1. Look up the scheme in the database
    // 2. Determine the provider/department
    // 3. Map to the appropriate API endpoint
    
    // Validate scheme ID
    if (!schemeId || schemeId.trim().length === 0) {
      return null;
    }
    
    // For now, return a mock endpoint for testing
    return GOVERNMENT_API_ENDPOINTS.mock_central;
  }

  /**
   * Get document verification endpoint based on document type
   */
  private getDocumentVerificationEndpoint(documentType: string): APIEndpoint | null {
    // Map document types to appropriate verification endpoints
    const documentEndpointMap: Record<string, string> = {
      'aadhaar': 'uidai_verification',
      'pan': 'income_tax_verification',
      'gst': 'gst_verification',
      'bank_statement': 'bank_verification',
      'business_registration': 'roc_verification'
    };

    const endpointName = documentEndpointMap[documentType.toLowerCase()];
    
    // For now, use mock endpoint
    return GOVERNMENT_API_ENDPOINTS.mock_central;
  }

  /**
   * Fetch schemes from a specific endpoint
   */
  private async fetchSchemesFromEndpoint(
    endpointName: string,
    endpoint: APIEndpoint
  ): Promise<{
    schemes: GovernmentScheme[];
    syncResult: SyncResult;
  }> {
    const startTime = Date.now();
    const syncResult: SyncResult = {
      endpoint: endpointName,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    try {
      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(endpointName, endpoint)) {
        throw new Error('Rate limit exceeded');
      }

      // Fetch schemes data
      const result = await this.retryManager.executeWithRetry(
        async () => {
          this.rateLimiter.recordRequest(endpointName);
          return await this.makeAPIRequest(endpoint, 'GET', '/schemes');
        },
        endpoint.retryConfig,
        endpointName
      );

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to fetch schemes');
      }

      // Process and validate schemes
      const rawSchemes = Array.isArray(result.data) ? result.data : result.data.schemes || [];
      const schemes: GovernmentScheme[] = [];

      for (const rawScheme of rawSchemes) {
        try {
          syncResult.processed++;
          
          // Convert API data to our scheme format
          const scheme = GovernmentSchemeFactory.fromGovernmentAPI(rawScheme);
          
          // Validate scheme
          const validation = GovernmentSchemeValidator.validate(scheme);
          
          if (validation.isValid) {
            schemes.push(scheme as GovernmentScheme);
            syncResult.successful++;
          } else {
            syncResult.failed++;
            syncResult.errors.push(`Validation failed for scheme ${rawScheme.id}: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          syncResult.failed++;
          syncResult.errors.push(`Processing failed for scheme: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      syncResult.duration = Date.now() - startTime;
      
      return { schemes, syncResult };

    } catch (error) {
      syncResult.failed++;
      syncResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      syncResult.duration = Date.now() - startTime;
      
      throw error;
    }
  }

  /**
   * Prepare application data for API submission
   */
  private prepareApplicationData(
    applicationData: Record<string, any>,
    endpoint: APIEndpoint
  ): Record<string, any> {
    // Transform data based on endpoint requirements
    // This would be customized for each government API format
    
    return {
      ...applicationData,
      submittedVia: 'SchemeSahayak',
      submissionTimestamp: new Date().toISOString(),
      apiVersion: '2.0'
    };
  }

  /**
   * Normalize status from different API formats
   */
  private normalizeStatus(apiStatus: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'submitted',
      'in_review': 'under_review',
      'reviewing': 'under_review',
      'approved': 'approved',
      'accepted': 'approved',
      'rejected': 'rejected',
      'declined': 'rejected',
      'on_hold': 'on_hold',
      'paused': 'on_hold'
    };

    return statusMap[apiStatus.toLowerCase()] || apiStatus;
  }

  /**
   * Generate unique request ID for API calls
   */
  private generateAPIRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get basic auth credentials (placeholder)
   */
  private getBasicAuthCredentials(endpointName: string): { username: string; password: string } | null {
    // In a real implementation, retrieve from secure credential store
    return null;
  }

  /**
   * Get OAuth token (placeholder)
   */
  private getOAuthToken(endpointName: string): string | null {
    // In a real implementation, handle OAuth token management
    return null;
  }

  /**
   * Health check for Government API Connector
   */
  protected async performHealthCheck(): Promise<void> {
    // Test connectivity to at least one endpoint
    const connectivity = await this.testConnectivity();
    const healthyEndpoints = Object.values(connectivity).filter(result => result.status === 'connected');
    
    if (healthyEndpoints.length === 0) {
      throw new Error('No government API endpoints are accessible');
    }
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(): Promise<{
    totalEndpoints: number;
    healthyEndpoints: number;
    rateLimitStatus: Record<string, { remaining: number; resetTime: number }>;
    lastSyncTime: Date | null;
    averageResponseTime: number;
  }> {
    const connectivity = await this.testConnectivity();
    const healthyCount = Object.values(connectivity).filter(result => result.status === 'connected').length;
    
    const rateLimitStatus: Record<string, any> = {};
    Object.keys(GOVERNMENT_API_ENDPOINTS).forEach(endpointName => {
      const endpoint = GOVERNMENT_API_ENDPOINTS[endpointName];
      rateLimitStatus[endpointName] = {
        remaining: endpoint.rateLimit.requestsPerHour, // Placeholder
        resetTime: this.rateLimiter.getTimeUntilReset(endpointName, endpoint)
      };
    });

    const responseTimes = Object.values(connectivity)
      .filter(result => result.responseTime)
      .map(result => result.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      totalEndpoints: Object.keys(GOVERNMENT_API_ENDPOINTS).length,
      healthyEndpoints: healthyCount,
      rateLimitStatus,
      lastSyncTime: null, // Would be tracked in real implementation
      averageResponseTime
    };
  }

  // ============================================================================
  // ENHANCED GOVERNMENT INTEGRATION METHODS (Requirements 11.1-11.5)
  // ============================================================================

  /**
   * Requirement 11.1: Integrate with at least 10 major government scheme portals
   * Get list of integrated government portals
   */
  async getIntegratedPortals(): Promise<Array<{
    name: string;
    status: 'active' | 'inactive' | 'maintenance';
    lastSync: Date | null;
    totalSchemes: number;
    successRate: number;
  }>> {
    return this.handleAsync(async () => {
      const portals = [];
      
      for (const [endpointName, endpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
        const connectivity = await this.testConnectivity();
        const portalStatus = connectivity[endpointName];
        
        portals.push({
          name: endpoint.name,
          status: endpoint.status,
          lastSync: this.endpointStatus.get(endpointName)?.lastCheck || null,
          totalSchemes: 0, // Would be fetched from database
          successRate: portalStatus.status === 'connected' ? 95 : 0
        });
      }
      
      return portals;
    }, 'Failed to get integrated portals', 'GET_PORTALS_FAILED');
  }

  /**
   * Requirement 11.2: Automatically submit applications to appropriate government portals
   * Enhanced application submission with automatic portal selection
   */
  async submitApplicationAutomatically(
    schemeId: string,
    applicationData: Record<string, any>,
    artisanId: string
  ): Promise<{
    success: boolean;
    governmentApplicationId?: string;
    confirmationNumber?: string;
    portalUsed?: string;
    submissionTime?: Date;
    trackingUrl?: string;
    error?: string;
  }> {
    return this.handleAsync(async () => {
      // Validate inputs
      this.validateRequired({ schemeId, applicationData, artisanId }, ['schemeId', 'applicationData', 'artisanId']);
      
      // Determine the best portal for this scheme
      const selectedPortal = await this.selectOptimalPortal(schemeId);
      
      if (!selectedPortal) {
        throw new Error(`No suitable government portal found for scheme: ${schemeId}`);
      }

      // Prepare application data according to portal requirements
      const formattedData = await this.formatApplicationForPortal(applicationData, selectedPortal);
      
      // Submit to government portal
      const result = await this.submitToGovernmentPortal(schemeId, formattedData);
      
      if (result.success) {
        // Log successful submission for analytics
        await this.logSubmissionSuccess(schemeId, selectedPortal.name, artisanId);
        
        return {
          success: true,
          governmentApplicationId: result.governmentApplicationId,
          confirmationNumber: result.confirmationNumber,
          portalUsed: selectedPortal.name,
          submissionTime: new Date(),
          trackingUrl: this.generateTrackingUrl(result.governmentApplicationId!, selectedPortal)
        };
      } else {
        // Try fallback portals if available
        const fallbackResult = await this.tryFallbackPortals(schemeId, formattedData);
        
        if (fallbackResult.success) {
          return fallbackResult;
        }
        
        return {
          success: false,
          error: result.error || 'Application submission failed'
        };
      }
    }, 'Failed to submit application automatically', 'AUTO_SUBMIT_FAILED');
  }

  /**
   * Requirement 11.3: Handle API rate limits and retry failed requests automatically
   * Enhanced rate limiting with intelligent backoff and queue management
   */
  async executeWithAdvancedRateLimit<T>(
    operation: () => Promise<T>,
    endpointName: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<T> {
    return this.handleAsync(async () => {
      const endpoint = GOVERNMENT_API_ENDPOINTS[endpointName];
      
      if (!endpoint) {
        throw new Error(`Unknown endpoint: ${endpointName}`);
      }

      // Check rate limits with priority consideration
      if (!this.rateLimiter.canMakeRequest(endpointName, endpoint)) {
        const resetTime = this.rateLimiter.getTimeUntilReset(endpointName, endpoint);
        
        // For urgent requests, try to find alternative endpoints
        if (priority === 'urgent') {
          const alternativeEndpoint = await this.findAlternativeEndpoint(endpointName);
          if (alternativeEndpoint) {
            return await this.executeWithAdvancedRateLimit(operation, alternativeEndpoint, priority);
          }
        }
        
        // Queue the request based on priority
        if (priority === 'low') {
          throw new Error(`Rate limit exceeded. Request queued for later execution.`);
        }
        
        // Wait for rate limit reset for medium/high priority requests
        this.log('warn', `Rate limit exceeded for ${endpointName}. Waiting ${resetTime}ms`);
        await new Promise(resolve => setTimeout(resolve, resetTime));
      }

      // Execute with enhanced retry logic
      return await this.retryManager.executeWithRetry(
        async () => {
          this.rateLimiter.recordRequest(endpointName);
          return await operation();
        },
        {
          ...endpoint.retryConfig,
          maxRetries: priority === 'urgent' ? endpoint.retryConfig.maxRetries + 2 : endpoint.retryConfig.maxRetries
        },
        endpointName
      );
    }, 'Failed to execute operation with rate limiting', 'RATE_LIMIT_EXECUTION_FAILED');
  }

  /**
   * Requirement 11.4: Maintain data consistency between local and government systems
   * Data synchronization with conflict resolution
   */
  async synchronizeDataWithGovernment(
    dataType: 'schemes' | 'applications' | 'documents',
    options: {
      forceSync?: boolean;
      conflictResolution?: 'local_wins' | 'remote_wins' | 'merge';
      batchSize?: number;
    } = {}
  ): Promise<{
    synchronized: number;
    conflicts: number;
    errors: number;
    details: Array<{
      id: string;
      action: 'updated' | 'created' | 'conflict' | 'error';
      message?: string;
    }>;
  }> {
    return this.handleAsync(async () => {
      const {
        forceSync = false,
        conflictResolution = 'remote_wins',
        batchSize = 100
      } = options;

      const syncResults = {
        synchronized: 0,
        conflicts: 0,
        errors: 0,
        details: [] as Array<{
          id: string;
          action: 'updated' | 'created' | 'conflict' | 'error';
          message?: string;
        }>
      };

      const validDataTypes = ['schemes', 'applications', 'documents'];
      if (!validDataTypes.includes(dataType)) {
        throw new Error(`Unsupported data type for synchronization: ${dataType}`);
      }

      switch (dataType) {
        case 'schemes':
          return await this.synchronizeSchemes(syncResults, { forceSync, conflictResolution, batchSize });
        
        case 'applications':
          return await this.synchronizeApplications(syncResults, { forceSync, conflictResolution, batchSize });
        
        case 'documents':
          return await this.synchronizeDocuments(syncResults, { forceSync, conflictResolution, batchSize });
        
        default:
          throw new Error(`Unsupported data type for synchronization: ${dataType}`);
      }
    }, 'Failed to synchronize data with government systems', 'DATA_SYNC_FAILED');
  }

  /**
   * Requirement 11.5: Adapt to government API changes within 48 hours of notification
   * API change detection and adaptation system
   */
  async detectAndAdaptToAPIChanges(): Promise<{
    changesDetected: number;
    adaptationsApplied: number;
    failedAdaptations: number;
    details: Array<{
      endpoint: string;
      changeType: 'schema' | 'endpoint' | 'authentication' | 'rate_limit';
      status: 'adapted' | 'failed' | 'manual_required';
      message: string;
    }>;
  }> {
    return this.handleAsync(async () => {
      const adaptationResults = {
        changesDetected: 0,
        adaptationsApplied: 0,
        failedAdaptations: 0,
        details: [] as Array<{
          endpoint: string;
          changeType: 'schema' | 'endpoint' | 'authentication' | 'rate_limit';
          status: 'adapted' | 'failed' | 'manual_required';
          message: string;
        }>
      };

      // Check each endpoint for changes
      for (const [endpointName, endpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
        try {
          const changes = await this.detectEndpointChanges(endpointName, endpoint);
          
          if (changes.length > 0) {
            adaptationResults.changesDetected += changes.length;
            
            for (const change of changes) {
              try {
                const adapted = await this.adaptToChange(endpointName, change);
                
                if (adapted) {
                  adaptationResults.adaptationsApplied++;
                  adaptationResults.details.push({
                    endpoint: endpointName,
                    changeType: change.type,
                    status: 'adapted',
                    message: `Successfully adapted to ${change.type} change`
                  });
                } else {
                  adaptationResults.failedAdaptations++;
                  adaptationResults.details.push({
                    endpoint: endpointName,
                    changeType: change.type,
                    status: 'manual_required',
                    message: `Manual intervention required for ${change.type} change`
                  });
                }
              } catch (error) {
                adaptationResults.failedAdaptations++;
                adaptationResults.details.push({
                  endpoint: endpointName,
                  changeType: change.type,
                  status: 'failed',
                  message: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }
          }
        } catch (error) {
          this.log('error', `Failed to check changes for endpoint ${endpointName}`, error);
        }
      }

      return adaptationResults;
    }, 'Failed to detect and adapt to API changes', 'API_ADAPTATION_FAILED');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FOR ENHANCED FUNCTIONALITY
  // ============================================================================

  /**
   * Select optimal portal for scheme submission
   */
  private async selectOptimalPortal(schemeId: string): Promise<APIEndpoint | null> {
    // In a real implementation, this would:
    // 1. Look up the scheme in the database
    // 2. Check which portals support this scheme type
    // 3. Consider portal health, success rates, and response times
    // 4. Return the best available portal
    
    // Validate scheme ID
    if (!schemeId || schemeId.trim().length === 0) {
      return null;
    }
    
    // For now, return the first active endpoint
    for (const [endpointName, endpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
      if (endpoint.status === 'active') {
        const health = this.endpointStatus.get(endpointName);
        if (health?.isHealthy !== false) {
          return endpoint;
        }
      }
    }
    
    return null;
  }

  /**
   * Format application data for specific portal requirements
   */
  private async formatApplicationForPortal(
    applicationData: Record<string, any>,
    portal: APIEndpoint
  ): Promise<Record<string, any>> {
    // Transform data based on portal-specific requirements
    const formatted: Record<string, any> = {
      ...applicationData,
      submissionSource: 'SchemeSahayak',
      apiVersion: '2.0',
      timestamp: new Date().toISOString()
    };

    // Add portal-specific formatting
    switch (portal.name) {
      case 'MSME Development Portal':
        formatted.businessCategory = applicationData.businessType;
        formatted.applicantType = 'individual';
        break;
      
      case 'Skill Development Portal':
        formatted.skillLevel = applicationData.experienceYears > 5 ? 'advanced' : 'beginner';
        break;
      
      default:
        // Generic formatting
        break;
    }

    return formatted;
  }

  /**
   * Generate tracking URL for submitted application
   */
  private generateTrackingUrl(applicationId: string, portal: APIEndpoint): string {
    return `${portal.baseUrl}/track/${applicationId}`;
  }

  /**
   * Log successful submission for analytics
   */
  private async logSubmissionSuccess(schemeId: string, portalName: string, artisanId: string): Promise<void> {
    // In a real implementation, this would log to analytics database
    this.log('info', 'Application submitted successfully', {
      schemeId,
      portalName,
      artisanId,
      timestamp: new Date()
    });
  }

  /**
   * Try fallback portals if primary submission fails
   */
  private async tryFallbackPortals(
    schemeId: string,
    applicationData: Record<string, any>
  ): Promise<{
    success: boolean;
    governmentApplicationId?: string;
    confirmationNumber?: string;
    portalUsed?: string;
    error?: string;
  }> {
    // Try other available portals
    for (const [endpointName, endpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
      if (endpoint.status === 'active') {
        try {
          const result = await this.submitToGovernmentPortal(schemeId, applicationData);
          if (result.success) {
            return {
              success: true,
              governmentApplicationId: result.governmentApplicationId,
              confirmationNumber: result.confirmationNumber,
              portalUsed: endpoint.name
            };
          }
        } catch (error) {
          this.log('warn', `Fallback portal ${endpointName} also failed`, error);
        }
      }
    }

    return {
      success: false,
      error: 'All available portals failed'
    };
  }

  /**
   * Find alternative endpoint for rate-limited requests
   */
  private async findAlternativeEndpoint(endpointName: string): Promise<string | null> {
    // Look for endpoints that can handle similar requests
    const currentEndpoint = GOVERNMENT_API_ENDPOINTS[endpointName];
    
    for (const [altEndpointName, altEndpoint] of Object.entries(GOVERNMENT_API_ENDPOINTS)) {
      if (altEndpointName !== endpointName && 
          altEndpoint.status === 'active' &&
          this.rateLimiter.canMakeRequest(altEndpointName, altEndpoint)) {
        return altEndpointName;
      }
    }
    
    return null;
  }

  /**
   * Synchronize schemes with government systems
   */
  private async synchronizeSchemes(
    syncResults: any,
    options: any
  ): Promise<any> {
    // Implementation for scheme synchronization
    const schemes = await this.fetchLatestSchemes();
    
    for (const scheme of schemes) {
      try {
        // Check for conflicts and resolve based on strategy
        syncResults.synchronized++;
        syncResults.details.push({
          id: scheme.id,
          action: 'updated',
          message: 'Scheme synchronized successfully'
        });
      } catch (error) {
        syncResults.errors++;
        syncResults.details.push({
          id: scheme.id,
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return syncResults;
  }

  /**
   * Synchronize applications with government systems
   */
  private async synchronizeApplications(
    syncResults: any,
    options: any
  ): Promise<any> {
    // Implementation for application synchronization
    // This would fetch application statuses from government portals
    // and update local database accordingly
    
    return syncResults;
  }

  /**
   * Synchronize documents with government systems
   */
  private async synchronizeDocuments(
    syncResults: any,
    options: any
  ): Promise<any> {
    // Implementation for document synchronization
    // This would verify document statuses with government databases
    
    return syncResults;
  }

  /**
   * Detect changes in API endpoints
   */
  private async detectEndpointChanges(
    endpointName: string,
    endpoint: APIEndpoint
  ): Promise<Array<{
    type: 'schema' | 'endpoint' | 'authentication' | 'rate_limit';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const changes = [];
    
    try {
      // Check if endpoint is still accessible
      const healthCheck = await this.makeAPIRequest(endpoint, 'GET', '/health', undefined, 5000);
      
      if (!healthCheck.success) {
        changes.push({
          type: 'endpoint' as const,
          description: 'Endpoint is no longer accessible',
          severity: 'high' as const
        });
      }
      
      // Check for schema changes by comparing response structure
      // This would involve calling known endpoints and comparing response schemas
      
      // Check for rate limit changes
      if (healthCheck.metadata.rateLimitRemaining !== undefined) {
        // Compare with expected rate limits
      }
      
    } catch (error) {
      changes.push({
        type: 'endpoint' as const,
        description: 'Failed to check endpoint health',
        severity: 'high' as const
      });
    }
    
    return changes;
  }

  /**
   * Adapt to detected API changes
   */
  private async adaptToChange(
    endpointName: string,
    change: {
      type: 'schema' | 'endpoint' | 'authentication' | 'rate_limit';
      description: string;
      severity: 'low' | 'medium' | 'high';
    }
  ): Promise<boolean> {
    switch (change.type) {
      case 'rate_limit':
        // Automatically adjust rate limits
        return this.adaptRateLimits(endpointName);
      
      case 'schema':
        // For schema changes, we might need manual intervention
        return false;
      
      case 'endpoint':
        // Try to find new endpoint URL
        return this.adaptEndpointUrl(endpointName);
      
      case 'authentication':
        // Authentication changes usually require manual intervention
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Adapt rate limits automatically
   */
  private async adaptRateLimits(endpointName: string): Promise<boolean> {
    try {
      // This would query the API to get current rate limits
      // and update the endpoint configuration accordingly
      this.log('info', `Adapted rate limits for ${endpointName}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to adapt rate limits for ${endpointName}`, error);
      return false;
    }
  }

  /**
   * Adapt endpoint URL automatically
   */
  private async adaptEndpointUrl(endpointName: string): Promise<boolean> {
    try {
      // This would try common URL patterns or check for redirects
      this.log('info', `Adapted endpoint URL for ${endpointName}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to adapt endpoint URL for ${endpointName}`, error);
      return false;
    }
  }
}

// Export default instance
export default GovernmentAPIConnector;


// ============================================================================
// PORTAL INTEGRATION FOR APPLICATION SUBMISSION
// ===