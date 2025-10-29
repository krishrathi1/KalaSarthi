/**
 * TLS Configuration for AI-Powered Scheme Sahayak v2.0
 * Ensures TLS 1.3 for all data transmission
 * Requirements: 9.2
 */

import https from 'https';
import { BaseService } from './base/BaseService';

/**
 * TLS Configuration options
 */
interface TLSOptions {
  minVersion: string;
  maxVersion: string;
  ciphers: string[];
  honorCipherOrder: boolean;
  rejectUnauthorized: boolean;
}

/**
 * TLS Configuration Service
 * Manages secure communication settings
 */
export class TLSConfigService extends BaseService {
  private tlsOptions: TLSOptions;

  constructor() {
    super('TLSConfigService');

    this.tlsOptions = {
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256'
      ],
      honorCipherOrder: true,
      rejectUnauthorized: true
    };

    this.log('info', 'TLS 1.3 configuration initialized');
  }

  /**
   * Get HTTPS agent with TLS 1.3 configuration
   */
  getSecureAgent(): https.Agent {
    return new https.Agent({
      minVersion: this.tlsOptions.minVersion,
      maxVersion: this.tlsOptions.maxVersion,
      ciphers: this.tlsOptions.ciphers.join(':'),
      honorCipherOrder: this.tlsOptions.honorCipherOrder,
      rejectUnauthorized: this.tlsOptions.rejectUnauthorized,
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000
    });
  }

  /**
   * Get fetch options with TLS 1.3 configuration
   */
  getSecureFetchOptions(): RequestInit {
    return {
      // Note: In browser environments, TLS is handled by the browser
      // In Node.js environments, we use the agent
      ...(typeof window === 'undefined' && {
        // @ts-ignore - Node.js specific
        agent: this.getSecureAgent()
      }),
      headers: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'"
      }
    };
  }

  /**
   * Validate TLS connection
   */
  async validateTLSConnection(url: string): Promise<boolean> {
    return this.handleAsync(async () => {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          ...this.getSecureFetchOptions()
        });

        return response.ok;
      } catch (error) {
        this.log('error', `TLS validation failed for ${url}`, error);
        return false;
      }
    }, 'Failed to validate TLS connection', 'TLS_VALIDATION_FAILED');
  }

  /**
   * Get security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://firestore.googleapis.com https://*.googleapis.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none'
    };
  }

  /**
   * Get TLS configuration for Next.js API routes
   */
  getNextJSSecurityConfig() {
    return {
      headers: async () => {
        const securityHeaders = this.getSecurityHeaders();
        return Object.entries(securityHeaders).map(([key, value]) => ({
          key,
          value
        }));
      }
    };
  }

  /**
   * Health check for TLS Configuration Service
   */
  protected async performHealthCheck(): Promise<void> {
    // Verify TLS options are properly configured
    if (this.tlsOptions.minVersion !== 'TLSv1.3') {
      throw new Error('TLS 1.3 not properly configured');
    }
  }
}

// Export singleton instance
export const tlsConfigService = new TLSConfigService();
