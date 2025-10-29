/**
 * Authentication and Authorization Middleware for Scheme Sahayak v2.0
 * Provides JWT token validation and RBAC for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, JWTPayload } from '../services/scheme-sahayak/AuthService';

/**
 * Authentication Context
 */
export interface AuthContext {
  isAuthenticated: boolean;
  artisanId?: string;
  phone?: string;
  role?: 'artisan' | 'officer' | 'admin';
  permissions?: string[];
  sessionId?: string;
  payload?: JWTPayload;
}

/**
 * Middleware Options
 */
export interface AuthMiddlewareOptions {
  requiredPermissions?: string[];
  allowedRoles?: ('artisan' | 'officer' | 'admin')[];
  requireMFA?: boolean;
  optional?: boolean; // Allow unauthenticated access
}

/**
 * Authentication Middleware
 */
export class SchemeSahayakAuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Authenticate request and extract user context
   */
  async authenticate(request: NextRequest): Promise<AuthContext> {
    try {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { isAuthenticated: false };
      }

      const token = authHeader.substring(7);
      const payload = await this.authService.verifyToken(token);

      return {
        isAuthenticated: true,
        artisanId: payload.sub,
        phone: payload.phone,
        role: payload.role,
        permissions: payload.permissions,
        sessionId: payload.session_id,
        payload
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Check if user has required permissions
   */
  hasPermission(authContext: AuthContext, requiredPermission: string): boolean {
    if (!authContext.isAuthenticated || !authContext.permissions) {
      return false;
    }

    return this.authService.hasPermission(authContext.permissions, requiredPermission);
  }

  /**
   * Check if user has required role
   */
  hasRole(authContext: AuthContext, allowedRoles: string[]): boolean {
    if (!authContext.isAuthenticated || !authContext.role) {
      return false;
    }

    return allowedRoles.includes(authContext.role);
  }

  /**
   * Authorize request based on options
   */
  authorize(authContext: AuthContext, options: AuthMiddlewareOptions): boolean {
    // If optional and not authenticated, allow access
    if (options.optional && !authContext.isAuthenticated) {
      return true;
    }

    // Check authentication
    if (!authContext.isAuthenticated) {
      return false;
    }

    // Check MFA requirement
    if (options.requireMFA && !authContext.payload?.mfa_verified) {
      return false;
    }

    // Check role requirements
    if (options.allowedRoles && !this.hasRole(authContext, options.allowedRoles)) {
      return false;
    }

    // Check permission requirements
    if (options.requiredPermissions) {
      for (const permission of options.requiredPermissions) {
        if (!this.hasPermission(authContext, permission)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create error response
   */
  createErrorResponse(message: string, code: string, status: number): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code,
          timestamp: new Date().toISOString()
        }
      },
      { status }
    );
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withSchemeSahayakAuth(
  handler: (request: NextRequest, authContext: AuthContext) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const middleware = new SchemeSahayakAuthMiddleware();

    try {
      // Authenticate request
      const authContext = await middleware.authenticate(request);

      // Authorize request
      if (!middleware.authorize(authContext, options)) {
        if (!authContext.isAuthenticated) {
          return middleware.createErrorResponse(
            'Authentication required',
            'AUTHENTICATION_REQUIRED',
            401
          );
        }

        if (options.requireMFA && !authContext.payload?.mfa_verified) {
          return middleware.createErrorResponse(
            'Multi-factor authentication required',
            'MFA_REQUIRED',
            401
          );
        }

        if (options.allowedRoles && !middleware.hasRole(authContext, options.allowedRoles)) {
          return middleware.createErrorResponse(
            'Insufficient role permissions',
            'INSUFFICIENT_ROLE',
            403
          );
        }

        if (options.requiredPermissions) {
          return middleware.createErrorResponse(
            'Insufficient permissions',
            'INSUFFICIENT_PERMISSIONS',
            403
          );
        }

        return middleware.createErrorResponse(
          'Access denied',
          'ACCESS_DENIED',
          403
        );
      }

      // Call the handler with auth context
      return await handler(request, authContext);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return middleware.createErrorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500
      );
    }
  };
}

/**
 * Predefined middleware configurations
 */
export const authConfigs = {
  // Artisan-only access
  artisanOnly: {
    allowedRoles: ['artisan'] as const,
    requireMFA: true
  },

  // Officer-only access
  officerOnly: {
    allowedRoles: ['officer'] as const,
    requireMFA: true
  },

  // Admin-only access
  adminOnly: {
    allowedRoles: ['admin'] as const,
    requireMFA: true
  },

  // Artisan or Officer access
  artisanOrOfficer: {
    allowedRoles: ['artisan', 'officer'] as const,
    requireMFA: true
  },

  // Any authenticated user
  authenticated: {
    requireMFA: true
  },

  // Optional authentication
  optional: {
    optional: true
  },

  // Profile management (artisan can only access own profile)
  profileAccess: {
    allowedRoles: ['artisan', 'officer', 'admin'] as const,
    requiredPermissions: ['read:own_profile'],
    requireMFA: true
  },

  // Scheme management
  schemeManagement: {
    allowedRoles: ['officer', 'admin'] as const,
    requiredPermissions: ['manage:schemes'],
    requireMFA: true
  },

  // Application management
  applicationManagement: {
    allowedRoles: ['artisan', 'officer'] as const,
    requiredPermissions: ['read:own_applications', 'read:assigned_applications'],
    requireMFA: true
  }
} as const;

/**
 * Helper function to extract artisan ID from request
 * Ensures artisans can only access their own data
 */
export function validateArtisanAccess(
  authContext: AuthContext,
  requestedArtisanId: string
): boolean {
  // Admin and officers can access any artisan data
  if (authContext.role === 'admin' || authContext.role === 'officer') {
    return true;
  }

  // Artisans can only access their own data
  if (authContext.role === 'artisan') {
    return authContext.artisanId === requestedArtisanId;
  }

  return false;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000 // 1 minute
  ): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    const requestData = this.requests.get(identifier);

    if (!requestData || requestData.resetTime < now) {
      // Reset or create new entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (requestData.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    requestData.count++;
    return true;
  }

  getRemainingRequests(identifier: string, maxRequests: number = 100): number {
    const requestData = this.requests.get(identifier);
    if (!requestData) return maxRequests;
    return Math.max(0, maxRequests - requestData.count);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();