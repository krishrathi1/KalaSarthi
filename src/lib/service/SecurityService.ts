import connectDB from '../mongodb';

interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: string[];
  restrictions: {
    financeDataAccess: 'full' | 'own' | 'none';
    loanDataAccess: 'full' | 'own' | 'none';
    adminAccess: boolean;
  };
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  success: boolean;
  errorMessage?: string;
}

export class SecurityService {
  private static rolePermissions: Record<string, string[]> = {
    admin: [
      'finance:read:all',
      'finance:write:all',
      'loans:read:all',
      'loans:write:all',
      'users:read:all',
      'users:write:all',
      'audit:read:all'
    ],
    finance_manager: [
      'finance:read:all',
      'finance:write:own',
      'loans:read:all',
      'loans:write:own'
    ],
    loan_officer: [
      'loans:read:all',
      'loans:write:own',
      'finance:read:own'
    ],
    artisan: [
      'finance:read:own',
      'loans:read:own',
      'loans:write:own'
    ]
  };

  /**
   * Check if user has permission for an action
   */
  static async checkPermission(
    userId: string,
    action: string,
    resource?: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      await connectDB();

      const userPermissions = await this.getUserPermissions(userId);

      if (!userPermissions) {
        return { allowed: false, reason: 'User permissions not found' };
      }

      // Check direct permissions
      if (userPermissions.permissions.includes(action)) {
        return { allowed: true };
      }

      // Check role-based permissions
      for (const role of userPermissions.roles) {
        const rolePerms = this.rolePermissions[role] || [];
        if (rolePerms.includes(action)) {
          return { allowed: true };
        }
      }

      // Check resource-specific permissions
      if (resource && resourceId) {
        const resourcePermission = this.checkResourcePermission(userPermissions, action, resource, resourceId);
        if (resourcePermission.allowed) {
          return resourcePermission;
        }
      }

      return { allowed: false, reason: 'Insufficient permissions' };

    } catch (error) {
      console.error('Permission check error:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      // In a real implementation, fetch from database
      // For now, return mock permissions based on userId

      if (userId.startsWith('admin_')) {
        return {
          userId,
          roles: ['admin'],
          permissions: [],
          restrictions: {
            financeDataAccess: 'full',
            loanDataAccess: 'full',
            adminAccess: true
          }
        };
      }

      if (userId.startsWith('finance_')) {
        return {
          userId,
          roles: ['finance_manager'],
          permissions: [],
          restrictions: {
            financeDataAccess: 'full',
            loanDataAccess: 'own',
            adminAccess: false
          }
        };
      }

      if (userId.startsWith('loan_')) {
        return {
          userId,
          roles: ['loan_officer'],
          permissions: [],
          restrictions: {
            financeDataAccess: 'own',
            loanDataAccess: 'full',
            adminAccess: false
          }
        };
      }

      // Default artisan permissions
      return {
        userId,
        roles: ['artisan'],
        permissions: [],
        restrictions: {
          financeDataAccess: 'own',
          loanDataAccess: 'own',
          adminAccess: false
        }
      };

    } catch (error) {
      console.error('Error getting user permissions:', error);
      return null;
    }
  }

  /**
   * Check resource-specific permissions
   */
  private static checkResourcePermission(
    userPermissions: UserPermissions,
    action: string,
    resource: string,
    resourceId: string
  ): { allowed: boolean; reason?: string } {
    // Check if user owns the resource
    const isOwner = this.checkResourceOwnership(userPermissions.userId, resource, resourceId);

    if (action.includes(':own') && isOwner) {
      return { allowed: true };
    }

    if (action.includes(':all') && userPermissions.restrictions.financeDataAccess === 'full') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Resource access denied' };
  }

  /**
   * Check if user owns a resource
   */
  private static checkResourceOwnership(userId: string, resource: string, resourceId: string): boolean {
    // In a real implementation, query database to check ownership
    // For now, use simple pattern matching
    return resourceId.includes(userId) || resourceId.startsWith(userId);
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    details?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        resource,
        timestamp: new Date(),
        details,
        success,
        errorMessage
      };

      // In a real implementation, save to audit log collection
      console.log('🔐 Audit Log:', auditEntry);

    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Sanitize PII data for logging
   */
  static sanitizePII(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const piiFields = [
      'panNumber', 'aadhaarNumber', 'phoneNumber', 'email',
      'accountNumber', 'ifscCode', 'bankAccount'
    ];

    for (const field of piiFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskPII(sanitized[field]);
      }
    }

    return sanitized;
  }

  /**
   * Mask PII data
   */
  private static maskPII(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    const visibleChars = Math.min(4, Math.floor(value.length * 0.2));
    const maskedChars = value.length - visibleChars;

    return '*'.repeat(maskedChars) + value.slice(-visibleChars);
  }

  /**
   * Validate data access for finance pages
   */
  static async validateFinanceAccess(
    userId: string,
    requestedUserId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const userPermissions = await this.getUserPermissions(userId);

    if (!userPermissions) {
      return { allowed: false, reason: 'User permissions not found' };
    }

    // Admin has full access
    if (userPermissions.restrictions.adminAccess) {
      return { allowed: true };
    }

    // Finance managers have full finance access
    if (userPermissions.roles.includes('finance_manager')) {
      return { allowed: true };
    }

    // Users can only access their own data
    if (requestedUserId && requestedUserId !== userId) {
      return { allowed: false, reason: 'Can only access own finance data' };
    }

    return { allowed: true };
  }

  /**
   * Validate data access for loan pages
   */
  static async validateLoanAccess(
    userId: string,
    requestedUserId?: string,
    applicationId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const userPermissions = await this.getUserPermissions(userId);

    if (!userPermissions) {
      return { allowed: false, reason: 'User permissions not found' };
    }

    // Admin has full access
    if (userPermissions.restrictions.adminAccess) {
      return { allowed: true };
    }

    // Loan officers have full loan access
    if (userPermissions.roles.includes('loan_officer')) {
      return { allowed: true };
    }

    // Users can only access their own data
    if (requestedUserId && requestedUserId !== userId) {
      return { allowed: false, reason: 'Can only access own loan data' };
    }

    return { allowed: true };
  }

  /**
   * Encrypt sensitive data
   */
  static encryptSensitiveData(data: string): string {
    // In a real implementation, use proper encryption
    // For now, return base64 encoded
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  static decryptSensitiveData(encryptedData: string): string {
    // In a real implementation, use proper decryption
    // For now, return base64 decoded
    return Buffer.from(encryptedData, 'base64').toString();
  }

  /**
   * Check rate limiting
   */
  static async checkRateLimit(
    userId: string,
    action: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): Promise<{ allowed: boolean; remainingRequests: number; resetTime: Date }> {
    // In a real implementation, use Redis or similar for rate limiting
    // For now, return mock response
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: new Date(Date.now() + windowMs)
    };
  }
}