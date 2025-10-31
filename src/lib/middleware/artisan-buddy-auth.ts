/**
 * Authentication and Authorization Middleware for Artisan Buddy API
 * 
 * Handles JWT token validation, user role checking, rate limiting, and request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

// Request log store (use proper logging service in production)
const requestLogs: Array<{
  requestId: string;
  userId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  responseTime?: number;
  statusCode?: number;
}> = [];

/**
 * Extract user ID from request
 * In production, this should validate JWT token and extract user ID
 */
export function extractUserId(request: NextRequest): string | null {
  try {
    // Check for userId in Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // In production, validate JWT token here
      // For now, we'll accept the token as userId
      if (token) {
        return token;
      }
    }

    // Check for userId in request body (for POST requests)
    // This is handled in the API route itself

    // Check for userId in query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (userId) {
      return userId;
    }

    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Validate JWT token
 * In production, implement proper JWT validation
 */
export function validateToken(token: string): { valid: boolean; userId?: string; role?: string } {
  try {
    // In production, use proper JWT library to validate token
    // For now, we'll do basic validation
    
    if (!token || token.length < 10) {
      return { valid: false };
    }

    // Mock validation - in production, decode and verify JWT
    return {
      valid: true,
      userId: token,
      role: 'artisan', // Default role
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false };
  }
}

/**
 * Check user role
 */
export function checkUserRole(role: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(role);
}

/**
 * Rate limiting middleware
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Log request
 */
export function logRequest(data: {
  requestId: string;
  userId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
}): void {
  requestLogs.push({
    ...data,
    timestamp: new Date(),
  });

  // Keep only last 1000 logs in memory
  if (requestLogs.length > 1000) {
    requestLogs.shift();
  }

  // In production, send to logging service
  console.log(`[API Request] ${data.method} ${data.endpoint} - User: ${data.userId} - ID: ${data.requestId}`);
}

/**
 * Log response
 */
export function logResponse(requestId: string, statusCode: number, responseTime: number): void {
  const log = requestLogs.find(l => l.requestId === requestId);
  if (log) {
    log.statusCode = statusCode;
    log.responseTime = responseTime;
  }

  // In production, send to logging service
  console.log(`[API Response] ${statusCode} - ${responseTime}ms - ID: ${requestId}`);
}

/**
 * Get request logs
 */
export function getRequestLogs(limit: number = 100): typeof requestLogs {
  return requestLogs.slice(-limit);
}

/**
 * Authentication middleware wrapper
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: AuthOptions = {}
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    // Extract authentication info
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userRole: string = 'guest';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const validation = validateToken(token);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      userId = validation.userId || null;
      userRole = validation.role || 'artisan';
    } else if (!options.requireAuth) {
      // Allow unauthenticated access if not required
      userId = 'anonymous';
    } else {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user role
    if (options.allowedRoles && !checkUserRole(userRole, options.allowedRoles)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (options.rateLimit !== false && userId) {
      const rateLimit = checkRateLimit(userId);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            },
          }
        );
      }
    }

    // Log request
    if (options.logging !== false && userId) {
      logRequest({
        requestId,
        userId,
        endpoint: new URL(request.url).pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
    }

    // Create auth context
    const authContext: AuthContext = {
      userId: userId || 'anonymous',
      userRole,
      requestId,
    };

    // Call handler
    const response = await handler(request, authContext);

    // Log response
    if (options.logging !== false && userId) {
      const responseTime = Date.now() - startTime;
      logResponse(requestId, response.status, responseTime);
    }

    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);

    return response;

  } catch (error) {
    console.error('Auth middleware error:', error);

    const responseTime = Date.now() - startTime;
    logResponse(requestId, 500, responseTime);

    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Auth context passed to handlers
 */
export interface AuthContext {
  userId: string;
  userRole: string;
  requestId: string;
}

/**
 * Auth options
 */
export interface AuthOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  rateLimit?: boolean;
  logging?: boolean;
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup rate limits every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
