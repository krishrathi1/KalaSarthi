/**
 * Security Middleware for AI-Powered Scheme Sahayak v2.0
 * Applies security headers and TLS enforcement
 * Requirements: 9.2
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers to be applied to all responses
 */
const SECURITY_HEADERS = {
  // Enforce HTTPS with HSTS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Content Security Policy
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
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Cross-domain policies
  'X-Permitted-Cross-Domain-Policies': 'none'
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Security middleware
 */
export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers
  return applySecurityHeaders(response);
}

/**
 * Enforce HTTPS in production
 */
export function enforceHTTPS(request: NextRequest): NextResponse | null {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'http';

  if (protocol !== 'https') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return null;
}
