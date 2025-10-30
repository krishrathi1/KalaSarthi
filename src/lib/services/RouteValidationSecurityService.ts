/**
 * Route Validation and Security Service
 * Implements route access control based on user authentication
 * Validates route parameters and user permissions
 * Provides fallback handling for invalid or restricted routes
 */

import { UserProfile } from '@/context/auth-context';
import { NavigationRoute, NavigationPermissionContext } from './NavigationIntentMappingService';

export interface SecurityValidationResult {
    isValid: boolean;
    hasAccess: boolean;
    requiresAuth: boolean;
    requiresRole?: string[];
    error?: string;
    reason?: string;
    fallbackRoute?: string;
    securityLevel: 'public' | 'authenticated' | 'role-restricted' | 'admin-only';
}

export interface RouteSecurityConfig {
    path: string;
    requiresAuth: boolean;
    allowedRoles?: string[];
    requiredPermissions?: string[];
    businessRules?: string[];
    fallbackRoute?: string;
    securityLevel: 'public' | 'authenticated' | 'role-restricted' | 'admin-only';
}

export interface SecurityAuditLog {
    timestamp: Date;
    userId?: string;
    userRole?: string;
    route: string;
    action: 'access_granted' | 'access_denied' | 'redirect' | 'validation_failed';
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface BusinessRule {
    name: string;
    description: string;
    validator: (context: NavigationPermissionContext, route: NavigationRoute) => Promise<SecurityValidationResult>;
    priority: number;
}

export class RouteValidationSecurityService {
    private static instance: RouteValidationSecurityService;
    private routeSecurityConfigs: Map<string, RouteSecurityConfig>;
    private businessRules: Map<string, BusinessRule>;
    private auditLogs: SecurityAuditLog[];
    private maxAuditLogs: number = 1000;
    private enableAuditLogging: boolean = true;

    private constructor() {
        this.routeSecurityConfigs = new Map();
        this.businessRules = new Map();
        this.auditLogs = [];
        this.initializeDefaultSecurityConfigs();
        this.initializeBusinessRules();
    }

    public static getInstance(): RouteValidationSecurityService {
        if (!RouteValidationSecurityService.instance) {
            RouteValidationSecurityService.instance = new RouteValidationSecurityService();
        }
        return RouteValidationSecurityService.instance;
    }

    /**
     * Validate route access with comprehensive security checks
     */
    public async validateRouteAccess(
        route: NavigationRoute,
        context?: NavigationPermissionContext
    ): Promise<SecurityValidationResult> {
        try {
            const securityConfig = this.getRouteSecurityConfig(route.path);

            // Basic route validation
            const basicValidation = this.performBasicValidation(route, securityConfig, context);
            if (!basicValidation.isValid) {
                await this.logSecurityEvent(route.path, 'validation_failed', basicValidation.reason, context);
                return basicValidation;
            }

            // Authentication validation
            const authValidation = this.validateAuthentication(securityConfig, context);
            if (!authValidation.isValid) {
                await this.logSecurityEvent(route.path, 'access_denied', authValidation.reason, context);
                return authValidation;
            }

            // Role-based validation
            const roleValidation = this.validateRoleAccess(securityConfig, context);
            if (!roleValidation.isValid) {
                await this.logSecurityEvent(route.path, 'access_denied', roleValidation.reason, context);
                return roleValidation;
            }

            // Permission validation
            const permissionValidation = this.validatePermissions(securityConfig, context);
            if (!permissionValidation.isValid) {
                await this.logSecurityEvent(route.path, 'access_denied', permissionValidation.reason, context);
                return permissionValidation;
            }

            // Business rules validation
            const businessValidation = await this.validateBusinessRules(route, context);
            if (!businessValidation.isValid) {
                await this.logSecurityEvent(route.path, 'access_denied', businessValidation.reason, context);
                return businessValidation;
            }

            // All validations passed
            await this.logSecurityEvent(route.path, 'access_granted', 'All security checks passed', context);

            return {
                isValid: true,
                hasAccess: true,
                requiresAuth: securityConfig.requiresAuth,
                requiresRole: securityConfig.allowedRoles,
                securityLevel: securityConfig.securityLevel
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            await this.logSecurityEvent(route.path, 'validation_failed', errorMessage, context);

            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: false,
                error: errorMessage,
                reason: 'Security validation failed due to system error',
                securityLevel: 'public'
            };
        }
    }

    /**
     * Validate route parameters for security
     */
    public validateRouteParameters(
        route: string,
        parameters: Record<string, any>
    ): { isValid: boolean; sanitizedParams?: Record<string, any>; errors?: string[] } {
        const errors: string[] = [];
        const sanitizedParams: Record<string, any> = {};

        try {
            for (const [key, value] of Object.entries(parameters)) {
                // Sanitize parameter key
                const sanitizedKey = this.sanitizeParameterKey(key);
                if (!sanitizedKey) {
                    errors.push(`Invalid parameter key: ${key}`);
                    continue;
                }

                // Sanitize parameter value
                const sanitizedValue = this.sanitizeParameterValue(value);
                if (sanitizedValue === null) {
                    errors.push(`Invalid parameter value for ${key}: ${value}`);
                    continue;
                }

                sanitizedParams[sanitizedKey] = sanitizedValue;
            }

            // Route-specific parameter validation
            const routeSpecificErrors = this.validateRouteSpecificParameters(route, sanitizedParams);
            errors.push(...routeSpecificErrors);

            return {
                isValid: errors.length === 0,
                sanitizedParams: errors.length === 0 ? sanitizedParams : undefined,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [`Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }

    /**
     * Get fallback route for access denied scenarios
     */
    public getFallbackRoute(
        deniedRoute: string,
        context?: NavigationPermissionContext
    ): string {
        const securityConfig = this.getRouteSecurityConfig(deniedRoute);

        // Use route-specific fallback if available
        if (securityConfig.fallbackRoute) {
            return securityConfig.fallbackRoute;
        }

        // Determine fallback based on user role and authentication status
        if (!context?.userProfile) {
            return '/auth'; // Redirect to authentication
        }

        const userRole = context.userProfile.role;
        switch (userRole) {
            case 'artisan':
                return '/dashboard';
            case 'buyer':
                return '/marketplace';
            case 'admin':
                return '/admin';
            default:
                return '/';
        }
    }

    /**
     * Check if user has required permissions for route
     */
    public hasRequiredPermissions(
        route: string,
        userPermissions: string[]
    ): boolean {
        const securityConfig = this.getRouteSecurityConfig(route);

        if (!securityConfig.requiredPermissions || securityConfig.requiredPermissions.length === 0) {
            return true; // No specific permissions required
        }

        // Check if user has all required permissions
        return securityConfig.requiredPermissions.every(permission =>
            userPermissions.includes(permission) || userPermissions.includes('*')
        );
    }

    /**
     * Get security audit logs
     */
    public getAuditLogs(
        filters?: {
            userId?: string;
            route?: string;
            action?: string;
            startDate?: Date;
            endDate?: Date;
        }
    ): SecurityAuditLog[] {
        let logs = [...this.auditLogs];

        if (filters) {
            if (filters.userId) {
                logs = logs.filter(log => log.userId === filters.userId);
            }
            if (filters.route) {
                logs = logs.filter(log => log.route.includes(filters.route!));
            }
            if (filters.action) {
                logs = logs.filter(log => log.action === filters.action);
            }
            if (filters.startDate) {
                logs = logs.filter(log => log.timestamp >= filters.startDate!);
            }
            if (filters.endDate) {
                logs = logs.filter(log => log.timestamp <= filters.endDate!);
            }
        }

        return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Add custom business rule
     */
    public addBusinessRule(rule: BusinessRule): void {
        this.businessRules.set(rule.name, rule);
    }

    /**
     * Remove business rule
     */
    public removeBusinessRule(ruleName: string): void {
        this.businessRules.delete(ruleName);
    }

    /**
     * Update route security configuration
     */
    public updateRouteSecurityConfig(route: string, config: Partial<RouteSecurityConfig>): void {
        const existingConfig = this.getRouteSecurityConfig(route);
        const updatedConfig = { ...existingConfig, ...config };
        this.routeSecurityConfigs.set(route, updatedConfig);
    }

    /**
     * Perform basic route validation
     */
    private performBasicValidation(
        route: NavigationRoute,
        securityConfig: RouteSecurityConfig,
        context?: NavigationPermissionContext
    ): SecurityValidationResult {
        // Check if route exists and is properly configured
        if (!route || !route.path) {
            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: false,
                error: 'Invalid route',
                reason: 'Route is not properly defined',
                securityLevel: 'public'
            };
        }

        // Check if route is temporarily disabled (could be added to config)
        // This is a placeholder for future functionality

        return {
            isValid: true,
            hasAccess: true,
            requiresAuth: securityConfig.requiresAuth,
            securityLevel: securityConfig.securityLevel
        };
    }

    /**
     * Validate authentication requirements
     */
    private validateAuthentication(
        securityConfig: RouteSecurityConfig,
        context?: NavigationPermissionContext
    ): SecurityValidationResult {
        if (!securityConfig.requiresAuth) {
            return {
                isValid: true,
                hasAccess: true,
                requiresAuth: false,
                securityLevel: securityConfig.securityLevel
            };
        }

        if (!context?.userProfile) {
            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: true,
                reason: 'Authentication required',
                fallbackRoute: '/auth',
                securityLevel: securityConfig.securityLevel
            };
        }

        return {
            isValid: true,
            hasAccess: true,
            requiresAuth: true,
            securityLevel: securityConfig.securityLevel
        };
    }

    /**
     * Validate role-based access
     */
    private validateRoleAccess(
        securityConfig: RouteSecurityConfig,
        context?: NavigationPermissionContext
    ): SecurityValidationResult {
        if (!securityConfig.allowedRoles || securityConfig.allowedRoles.length === 0) {
            return {
                isValid: true,
                hasAccess: true,
                requiresAuth: securityConfig.requiresAuth,
                securityLevel: securityConfig.securityLevel
            };
        }

        if (!context?.userProfile) {
            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: true,
                reason: 'Authentication required for role validation',
                fallbackRoute: '/auth',
                securityLevel: securityConfig.securityLevel
            };
        }

        const userRole = context.userProfile.role;
        if (!securityConfig.allowedRoles.includes(userRole)) {
            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: true,
                requiresRole: securityConfig.allowedRoles,
                reason: `Access denied. Required role: ${securityConfig.allowedRoles.join(' or ')}`,
                fallbackRoute: this.getFallbackRoute(securityConfig.path, context),
                securityLevel: securityConfig.securityLevel
            };
        }

        return {
            isValid: true,
            hasAccess: true,
            requiresAuth: securityConfig.requiresAuth,
            requiresRole: securityConfig.allowedRoles,
            securityLevel: securityConfig.securityLevel
        };
    }

    /**
     * Validate permissions
     */
    private validatePermissions(
        securityConfig: RouteSecurityConfig,
        context?: NavigationPermissionContext
    ): SecurityValidationResult {
        if (!securityConfig.requiredPermissions || securityConfig.requiredPermissions.length === 0) {
            return {
                isValid: true,
                hasAccess: true,
                requiresAuth: securityConfig.requiresAuth,
                securityLevel: securityConfig.securityLevel
            };
        }

        // For now, we'll use role-based permissions
        // This can be extended to use a more granular permission system
        const userRole = context?.userProfile?.role;
        const rolePermissions = this.getRolePermissions(userRole);

        const hasAllPermissions = securityConfig.requiredPermissions.every(permission =>
            rolePermissions.includes(permission) || rolePermissions.includes('*')
        );

        if (!hasAllPermissions) {
            return {
                isValid: false,
                hasAccess: false,
                requiresAuth: securityConfig.requiresAuth,
                reason: `Insufficient permissions. Required: ${securityConfig.requiredPermissions.join(', ')}`,
                fallbackRoute: this.getFallbackRoute(securityConfig.path, context),
                securityLevel: securityConfig.securityLevel
            };
        }

        return {
            isValid: true,
            hasAccess: true,
            requiresAuth: securityConfig.requiresAuth,
            securityLevel: securityConfig.securityLevel
        };
    }

    /**
     * Validate business rules
     */
    private async validateBusinessRules(
        route: NavigationRoute,
        context?: NavigationPermissionContext
    ): Promise<SecurityValidationResult> {
        const applicableRules = Array.from(this.businessRules.values())
            .sort((a, b) => b.priority - a.priority); // Higher priority first

        for (const rule of applicableRules) {
            try {
                const result = await rule.validator(context, route);
                if (!result.isValid) {
                    return result;
                }
            } catch (error) {
                // Log business rule error but don't fail validation
                console.warn(`Business rule '${rule.name}' failed:`, error);
            }
        }

        return {
            isValid: true,
            hasAccess: true,
            requiresAuth: route.requiresAuth,
            securityLevel: this.getRouteSecurityConfig(route.path).securityLevel
        };
    }

    /**
     * Get route security configuration
     */
    private getRouteSecurityConfig(route: string): RouteSecurityConfig {
        const config = this.routeSecurityConfigs.get(route);
        if (config) {
            return config;
        }

        // Return default configuration for unknown routes
        return {
            path: route,
            requiresAuth: false,
            securityLevel: 'public'
        };
    }

    /**
     * Get permissions for a user role
     */
    private getRolePermissions(role?: string): string[] {
        switch (role) {
            case 'admin':
                return ['*']; // Admin has all permissions
            case 'artisan':
                return [
                    'create_product',
                    'manage_profile',
                    'view_finance',
                    'access_tools',
                    'view_trends',
                    'access_schemes'
                ];
            case 'buyer':
                return [
                    'browse_marketplace',
                    'manage_profile',
                    'manage_cart',
                    'manage_wishlist'
                ];
            default:
                return ['browse_marketplace']; // Public permissions
        }
    }

    /**
     * Sanitize parameter key
     */
    private sanitizeParameterKey(key: string): string | null {
        // Allow only alphanumeric characters, underscores, and hyphens
        const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '');
        return sanitized.length > 0 && sanitized.length <= 50 ? sanitized : null;
    }

    /**
     * Sanitize parameter value
     */
    private sanitizeParameterValue(value: any): any {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            // Remove potentially dangerous characters
            const sanitized = value.replace(/[<>\"'&]/g, '');
            return sanitized.length <= 1000 ? sanitized : null;
        }

        if (typeof value === 'number') {
            return isFinite(value) ? value : null;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        // For other types, convert to string and sanitize
        return this.sanitizeParameterValue(String(value));
    }

    /**
     * Validate route-specific parameters
     */
    private validateRouteSpecificParameters(route: string, parameters: Record<string, any>): string[] {
        const errors: string[] = [];

        // Add route-specific validation rules here
        switch (route) {
            case '/profile':
                if (parameters.section && !['overview', 'settings', 'security'].includes(parameters.section)) {
                    errors.push('Invalid profile section');
                }
                break;
            case '/marketplace':
                if (parameters.category && typeof parameters.category !== 'string') {
                    errors.push('Invalid marketplace category');
                }
                break;
            // Add more route-specific validations as needed
        }

        return errors;
    }

    /**
     * Log security event
     */
    private async logSecurityEvent(
        route: string,
        action: SecurityAuditLog['action'],
        reason?: string,
        context?: NavigationPermissionContext
    ): Promise<void> {
        if (!this.enableAuditLogging) {
            return;
        }

        const logEntry: SecurityAuditLog = {
            timestamp: new Date(),
            userId: context?.userProfile?.uid,
            userRole: context?.userProfile?.role,
            route,
            action,
            reason,
            // ipAddress and userAgent would be available in a real browser environment
        };

        this.auditLogs.push(logEntry);

        // Limit audit log size
        if (this.auditLogs.length > this.maxAuditLogs) {
            this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
        }
    }

    /**
     * Initialize default security configurations
     */
    private initializeDefaultSecurityConfigs(): void {
        const configs: RouteSecurityConfig[] = [
            {
                path: '/',
                requiresAuth: false,
                securityLevel: 'public'
            },
            {
                path: '/auth',
                requiresAuth: false,
                securityLevel: 'public'
            },
            {
                path: '/marketplace',
                requiresAuth: false,
                securityLevel: 'public'
            },
            {
                path: '/dashboard',
                requiresAuth: true,
                securityLevel: 'authenticated',
                fallbackRoute: '/auth'
            },
            {
                path: '/profile',
                requiresAuth: true,
                securityLevel: 'authenticated',
                fallbackRoute: '/auth'
            },
            {
                path: '/smart-product-creator',
                requiresAuth: true,
                allowedRoles: ['artisan'],
                requiredPermissions: ['create_product'],
                securityLevel: 'role-restricted',
                fallbackRoute: '/marketplace'
            },
            {
                path: '/finance',
                requiresAuth: true,
                allowedRoles: ['artisan'],
                requiredPermissions: ['view_finance'],
                securityLevel: 'role-restricted',
                fallbackRoute: '/marketplace'
            },
            {
                path: '/yojana-mitra',
                requiresAuth: true,
                allowedRoles: ['artisan'],
                requiredPermissions: ['access_schemes'],
                securityLevel: 'role-restricted',
                fallbackRoute: '/marketplace'
            },
            {
                path: '/trend-spotter',
                requiresAuth: true,
                allowedRoles: ['artisan', 'buyer'],
                requiredPermissions: ['view_trends'],
                securityLevel: 'role-restricted',
                fallbackRoute: '/marketplace'
            },
            {
                path: '/admin',
                requiresAuth: true,
                allowedRoles: ['admin'],
                securityLevel: 'admin-only',
                fallbackRoute: '/dashboard'
            }
        ];

        for (const config of configs) {
            this.routeSecurityConfigs.set(config.path, config);
        }
    }

    /**
     * Initialize business rules
     */
    private initializeBusinessRules(): void {
        // Profile completion rule
        this.addBusinessRule({
            name: 'profile_completion',
            description: 'Ensure user has completed their profile for certain routes',
            priority: 10,
            validator: async (context, route) => {
                if (route.category === 'tools' && context?.userProfile) {
                    const profile = context.userProfile;
                    if (!profile.artisticProfession || !profile.description) {
                        return {
                            isValid: false,
                            hasAccess: false,
                            requiresAuth: true,
                            reason: 'Please complete your profile to access this feature',
                            fallbackRoute: '/profile',
                            securityLevel: 'authenticated'
                        };
                    }
                }
                return {
                    isValid: true,
                    hasAccess: true,
                    requiresAuth: route.requiresAuth,
                    securityLevel: 'authenticated'
                };
            }
        });

        // Account verification rule (placeholder for future implementation)
        this.addBusinessRule({
            name: 'account_verification',
            description: 'Check if account is verified for sensitive operations',
            priority: 5,
            validator: async (context, route) => {
                // Placeholder - could check email verification, phone verification, etc.
                return {
                    isValid: true,
                    hasAccess: true,
                    requiresAuth: route.requiresAuth,
                    securityLevel: 'authenticated'
                };
            }
        });
    }
}