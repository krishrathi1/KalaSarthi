import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '../service/SecurityService';

interface SecurityContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export class SecurityMiddleware {
  /**
   * Middleware for finance API routes
   */
  static async financeAccessControl(
    request: NextRequest,
    userId: string,
    requestedUserId?: string
  ): Promise<{ allowed: boolean; response?: NextResponse }> {
    const accessCheck = await SecurityService.validateFinanceAccess(userId, requestedUserId);

    if (!accessCheck.allowed) {
      await SecurityService.logAuditEvent(
        userId,
        'finance:access:denied',
        request.url,
        { requestedUserId },
        false,
        accessCheck.reason
      );

      return {
        allowed: false,
        response: NextResponse.json({
          success: false,
          error: accessCheck.reason
        }, { status: 403 })
      };
    }

    // Log successful access
    await SecurityService.logAuditEvent(
      userId,
      'finance:access:granted',
      request.url,
      { requestedUserId },
      true
    );

    return { allowed: true };
  }

  /**
   * Middleware for loan API routes
   */
  static async loanAccessControl(
    request: NextRequest,
    userId: string,
    requestedUserId?: string,
    applicationId?: string
  ): Promise<{ allowed: boolean; response?: NextResponse }> {
    const accessCheck = await SecurityService.validateLoanAccess(userId, requestedUserId, applicationId);

    if (!accessCheck.allowed) {
      await SecurityService.logAuditEvent(
        userId,
        'loans:access:denied',
        request.url,
        { requestedUserId, applicationId },
        false,
        accessCheck.reason
      );

      return {
        allowed: false,
        response: NextResponse.json({
          success: false,
          error: accessCheck.reason
        }, { status: 403 })
      };
    }

    // Log successful access
    await SecurityService.logAuditEvent(
      userId,
      'loans:access:granted',
      request.url,
      { requestedUserId, applicationId },
      true
    );

    return { allowed: true };
  }

  /**
   * General permission check middleware
   */
  static async checkPermission(
    request: NextRequest,
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; response?: NextResponse }> {
    const permissionCheck = await SecurityService.checkPermission(userId, action, resource, resourceId);

    if (!permissionCheck.allowed) {
      await SecurityService.logAuditEvent(
        userId,
        action,
        resource || request.url,
        { resourceId },
        false,
        permissionCheck.reason
      );

      return {
        allowed: false,
        response: NextResponse.json({
          success: false,
          error: permissionCheck.reason
        }, { status: 403 })
      };
    }

    return { allowed: true };
  }

  /**
   * Rate limiting middleware
   */
  static async rateLimit(
    request: NextRequest,
    userId: string,
    action: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): Promise<{ allowed: boolean; response?: NextResponse }> {
    const rateLimitCheck = await SecurityService.checkRateLimit(userId, action, maxRequests, windowMs);

    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        response: NextResponse.json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitCheck.resetTime.getTime() - Date.now()) / 1000)
        }, {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitCheck.resetTime.getTime() - Date.now()) / 1000).toString()
          }
        })
      };
    }

    return { allowed: true };
  }

  /**
   * PII sanitization middleware
   */
  static sanitizeRequestData(request: NextRequest): void {
    // This would be implemented as a request interceptor
    // For now, it's a placeholder
  }

  /**
   * Audit logging middleware
   */
  static async auditLog(
    request: NextRequest,
    userId: string,
    action: string,
    details?: any
  ): Promise<void> {
    await SecurityService.logAuditEvent(
      userId,
      action,
      request.url,
      SecurityService.sanitizePII(details),
      true
    );
  }

  /**
   * Extract user context from request
   */
  static extractUserContext(request: NextRequest): SecurityContext | null {
    // In a real implementation, extract from JWT token or session
    // For now, return mock context
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return null;
    }

    // Mock user extraction - in reality, decode JWT
    const userId = authHeader.replace('Bearer ', '');

    return {
      userId,
      roles: userId.startsWith('admin_') ? ['admin'] : ['artisan'],
      permissions: []
    };
  }
}

/**
 * Higher-order function to wrap API routes with security
 */
export function withSecurity(
  handler: (request: NextRequest, context: SecurityContext) => Promise<NextResponse>,
  options: {
    requiredPermission?: string;
    rateLimit?: { maxRequests: number; windowMs: number };
    auditAction?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = SecurityMiddleware.extractUserContext(request);

    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check rate limiting
    if (options.rateLimit) {
      const rateLimitResult = await SecurityMiddleware.rateLimit(
        request,
        context.userId,
        options.auditAction || 'api:access',
        options.rateLimit.maxRequests,
        options.rateLimit.windowMs
      );

      if (!rateLimitResult.allowed) {
        return rateLimitResult.response!;
      }
    }

    // Check permissions
    if (options.requiredPermission) {
      const permissionResult = await SecurityMiddleware.checkPermission(
        request,
        context.userId,
        options.requiredPermission
      );

      if (!permissionResult.allowed) {
        return permissionResult.response!;
      }
    }

    // Audit log
    if (options.auditAction) {
      await SecurityMiddleware.auditLog(request, context.userId, options.auditAction);
    }

    // Execute handler
    return await handler(request, context);
  };
}