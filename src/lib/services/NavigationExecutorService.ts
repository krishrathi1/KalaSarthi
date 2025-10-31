/**
 * Navigation Executor Service
 * Handles route changes with Next.js router integration
 * Provides navigation history and context preservation
 */

import { NavigationIntentMappingService, RouteValidationResult, NavigationPermissionContext } from './NavigationIntentMappingService';
import { UserProfile } from '@/context/auth-context';

export interface NavigationExecutionResult {
    success: boolean;
    executed: boolean;
    route?: string;
    message: string;
    error?: string;
    redirected?: boolean;
    redirectRoute?: string;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
}

export interface NavigationHistoryEntry {
    route: string;
    timestamp: Date;
    method: 'voice' | 'manual' | 'redirect';
    intent?: string;
    parameters?: Record<string, any>;
    success: boolean;
}

export interface NavigationContext {
    currentRoute: string;
    previousRoute?: string;
    userProfile?: UserProfile;
    sessionData?: Record<string, any>;
    language?: string;
    navigationHistory: NavigationHistoryEntry[];
}

export interface NavigationExecutorConfig {
    maxHistoryEntries: number;
    enableContextPreservation: boolean;
    enableNavigationLogging: boolean;
    confirmationTimeout: number; // milliseconds
    fallbackRoute: string;
}

export class NavigationExecutorService {
    private static instance: NavigationExecutorService;
    private mappingService: NavigationIntentMappingService;
    private navigationContext: NavigationContext;
    private config: NavigationExecutorConfig;
    private pendingConfirmations: Map<string, {
        route: string;
        intent: string;
        parameters: Record<string, any>;
        timestamp: Date;
        resolve: (confirmed: boolean) => void;
    }>;
    private routerInstance: any = null; // Will be set from Next.js router

    private constructor() {
        this.mappingService = NavigationIntentMappingService.getInstance();
        this.navigationContext = {
            currentRoute: '/',
            navigationHistory: []
        };
        this.config = this.getDefaultConfig();
        this.pendingConfirmations = new Map();
    }

    public static getInstance(): NavigationExecutorService {
        if (!NavigationExecutorService.instance) {
            NavigationExecutorService.instance = new NavigationExecutorService();
        }
        return NavigationExecutorService.instance;
    }

    /**
     * Initialize the service with Next.js router and context
     */
    public initialize(router: any, initialContext?: Partial<NavigationContext>): void {
        this.routerInstance = router;

        if (initialContext) {
            this.navigationContext = {
                ...this.navigationContext,
                ...initialContext
            };
        }

        // Set current route from router
        if (router && router.pathname) {
            this.navigationContext.currentRoute = router.pathname;
        }

        this.log('NavigationExecutorService initialized', 'info');
    }

    /**
     * Execute navigation based on intent
     */
    public async executeNavigation(
        intent: string,
        parameters: Record<string, any> = {},
        context?: NavigationPermissionContext
    ): Promise<NavigationExecutionResult> {
        try {
            this.log(`Executing navigation for intent: ${intent}`, 'info');

            // Get route from intent with validation
            const routeValidation = this.mappingService.getRouteFromIntent(intent, parameters, context);

            if (!routeValidation.isValid) {
                return {
                    success: false,
                    executed: false,
                    message: routeValidation.reason || 'Invalid navigation intent',
                    error: routeValidation.error
                };
            }

            if (!routeValidation.hasAccess) {
                // Handle access denied with potential redirect
                if (routeValidation.redirectRoute) {
                    const redirectResult = await this.performNavigation(
                        routeValidation.redirectRoute,
                        {},
                        'redirect',
                        intent
                    );

                    return {
                        success: true,
                        executed: true,
                        route: routeValidation.redirectRoute,
                        message: routeValidation.reason || 'Redirected to accessible page',
                        redirected: true,
                        redirectRoute: routeValidation.redirectRoute
                    };
                } else {
                    return {
                        success: false,
                        executed: false,
                        message: routeValidation.reason || 'Access denied',
                        error: routeValidation.error
                    };
                }
            }

            const targetRoute = routeValidation.route!.path;

            // Check if confirmation is required
            if (this.mappingService.requiresConfirmation(intent)) {
                const confirmationMessage = this.mappingService.getConfirmationMessage(
                    intent,
                    targetRoute,
                    context?.language || 'en-US'
                );

                return {
                    success: true,
                    executed: false,
                    route: targetRoute,
                    message: 'Confirmation required',
                    requiresConfirmation: true,
                    confirmationMessage
                };
            }

            // Handle special navigation cases
            if (targetRoute === 'back') {
                return await this.executeBackNavigation();
            }

            // Execute the navigation
            const navigationResult = await this.performNavigation(targetRoute, parameters, 'voice', intent);

            return {
                success: navigationResult.success,
                executed: navigationResult.success,
                route: targetRoute,
                message: navigationResult.success
                    ? `Successfully navigated to ${targetRoute}`
                    : `Failed to navigate to ${targetRoute}`,
                error: navigationResult.success ? undefined : navigationResult.error
            };

        } catch (error) {
            this.log(`Navigation execution error: ${error}`, 'error');
            return {
                success: false,
                executed: false,
                message: 'Navigation execution failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Execute navigation with confirmation
     */
    public async executeWithConfirmation(
        intent: string,
        parameters: Record<string, any> = {},
        context?: NavigationPermissionContext
    ): Promise<string> {
        return new Promise((resolve) => {
            const confirmationId = this.generateConfirmationId();
            const routeValidation = this.mappingService.getRouteFromIntent(intent, parameters, context);

            if (!routeValidation.isValid || !routeValidation.hasAccess) {
                resolve('navigation_failed');
                return;
            }

            const targetRoute = routeValidation.route!.path;

            // Store pending confirmation
            this.pendingConfirmations.set(confirmationId, {
                route: targetRoute,
                intent,
                parameters,
                timestamp: new Date(),
                resolve: (confirmed: boolean) => {
                    if (confirmed) {
                        this.performNavigation(targetRoute, parameters, 'voice', intent)
                            .then(() => resolve('navigation_confirmed'))
                            .catch(() => resolve('navigation_failed'));
                    } else {
                        resolve('navigation_cancelled');
                    }
                }
            });

            // Set timeout for confirmation
            setTimeout(() => {
                if (this.pendingConfirmations.has(confirmationId)) {
                    this.pendingConfirmations.delete(confirmationId);
                    resolve('confirmation_timeout');
                }
            }, this.config.confirmationTimeout);

            resolve(confirmationId);
        });
    }

    /**
     * Confirm or cancel pending navigation
     */
    public confirmNavigation(confirmationId: string, confirmed: boolean): boolean {
        const pending = this.pendingConfirmations.get(confirmationId);
        if (!pending) {
            return false;
        }

        this.pendingConfirmations.delete(confirmationId);
        pending.resolve(confirmed);
        return true;
    }

    /**
     * Execute back navigation
     */
    public async executeBackNavigation(): Promise<NavigationExecutionResult> {
        try {
            // Try browser back first
            if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();

                // Add to navigation history
                this.addToNavigationHistory('back', 'voice', undefined, {}, true);

                return {
                    success: true,
                    executed: true,
                    route: 'back',
                    message: 'Navigated back to previous page'
                };
            }

            // Fallback to previous route from history
            const previousRoute = this.getPreviousRoute();
            if (previousRoute) {
                const result = await this.performNavigation(previousRoute, {}, 'voice', 'navigate_back');
                return {
                    success: result.success,
                    executed: result.success,
                    route: previousRoute,
                    message: result.success
                        ? `Navigated back to ${previousRoute}`
                        : 'Failed to navigate back'
                };
            }

            // Final fallback to default route
            const fallbackResult = await this.performNavigation(this.config.fallbackRoute, {}, 'voice', 'navigate_back');
            return {
                success: fallbackResult.success,
                executed: fallbackResult.success,
                route: this.config.fallbackRoute,
                message: 'Navigated to home page'
            };

        } catch (error) {
            this.log(`Back navigation error: ${error}`, 'error');
            return {
                success: false,
                executed: false,
                message: 'Failed to navigate back',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Update navigation context
     */
    public updateContext(updates: Partial<NavigationContext>): void {
        this.navigationContext = {
            ...this.navigationContext,
            ...updates
        };

        // Preserve navigation history
        if (updates.navigationHistory) {
            this.navigationContext.navigationHistory = [
                ...this.navigationContext.navigationHistory,
                ...updates.navigationHistory
            ].slice(-this.config.maxHistoryEntries);
        }
    }

    /**
     * Get current navigation context
     */
    public getContext(): NavigationContext {
        return { ...this.navigationContext };
    }

    /**
     * Get navigation history
     */
    public getNavigationHistory(): NavigationHistoryEntry[] {
        return [...this.navigationContext.navigationHistory];
    }

    /**
     * Clear navigation history
     */
    public clearNavigationHistory(): void {
        this.navigationContext.navigationHistory = [];
    }

    /**
     * Get available navigation suggestions
     */
    public getNavigationSuggestions(limit: number = 5): string[] {
        const context: NavigationPermissionContext = {
            userProfile: this.navigationContext.userProfile,
            currentRoute: this.navigationContext.currentRoute,
            sessionData: this.navigationContext.sessionData,
            language: this.navigationContext.language
        };

        const suggestions = this.mappingService.getNavigationSuggestions(context, limit);
        return suggestions.map(route => route.name);
    }

    /**
     * Check if route is accessible
     */
    public canAccessRoute(route: string): boolean {
        const context: NavigationPermissionContext = {
            userProfile: this.navigationContext.userProfile,
            currentRoute: this.navigationContext.currentRoute,
            sessionData: this.navigationContext.sessionData,
            language: this.navigationContext.language
        };

        const routeObj = this.mappingService.getAllRoutes().get(route);
        if (!routeObj) {
            return false;
        }

        const validation = this.mappingService.validateRouteAccess(routeObj, context);
        return validation.hasAccess;
    }

    /**
     * Perform the actual navigation
     */
    private async performNavigation(
        route: string,
        parameters: Record<string, any>,
        method: 'voice' | 'manual' | 'redirect',
        intent?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Store previous route
            const previousRoute = this.navigationContext.currentRoute;

            // Use Next.js router if available
            if (this.routerInstance && this.routerInstance.push) {
                // Build route with parameters
                const routeWithParams = this.buildRouteWithParameters(route, parameters);

                await this.routerInstance.push(routeWithParams);

                // Update context
                this.navigationContext.previousRoute = previousRoute;
                this.navigationContext.currentRoute = route;

                // Add to navigation history
                this.addToNavigationHistory(route, method, intent, parameters, true);

                this.log(`Successfully navigated to ${route}`, 'info');
                return { success: true };
            }

            // Fallback to window.location
            if (typeof window !== 'undefined') {
                const routeWithParams = this.buildRouteWithParameters(route, parameters);
                window.location.href = routeWithParams;

                // Add to navigation history
                this.addToNavigationHistory(route, method, intent, parameters, true);

                return { success: true };
            }

            throw new Error('No navigation method available');

        } catch (error) {
            this.log(`Navigation failed: ${error}`, 'error');

            // Add failed navigation to history
            this.addToNavigationHistory(route, method, intent, parameters, false);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Build route with parameters
     */
    private buildRouteWithParameters(route: string, parameters: Record<string, any>): string {
        if (!parameters || Object.keys(parameters).length === 0) {
            return route;
        }

        const url = new URL(route, 'http://localhost'); // Base URL for parsing
        Object.entries(parameters).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
        });

        return url.pathname + url.search;
    }

    /**
     * Add entry to navigation history
     */
    private addToNavigationHistory(
        route: string,
        method: 'voice' | 'manual' | 'redirect',
        intent?: string,
        parameters?: Record<string, any>,
        success: boolean = true
    ): void {
        const entry: NavigationHistoryEntry = {
            route,
            timestamp: new Date(),
            method,
            intent,
            parameters,
            success
        };

        this.navigationContext.navigationHistory.push(entry);

        // Limit history size
        if (this.navigationContext.navigationHistory.length > this.config.maxHistoryEntries) {
            this.navigationContext.navigationHistory = this.navigationContext.navigationHistory
                .slice(-this.config.maxHistoryEntries);
        }
    }

    /**
     * Get previous route from history
     */
    private getPreviousRoute(): string | null {
        const history = this.navigationContext.navigationHistory;
        if (history.length < 2) {
            return null;
        }

        // Find the last successful navigation that's different from current route
        for (let i = history.length - 2; i >= 0; i--) {
            const entry = history[i];
            if (entry.success && entry.route !== this.navigationContext.currentRoute) {
                return entry.route;
            }
        }

        return null;
    }

    /**
     * Generate unique confirmation ID
     */
    private generateConfirmationId(): string {
        return `nav_confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): NavigationExecutorConfig {
        return {
            maxHistoryEntries: 50,
            enableContextPreservation: true,
            enableNavigationLogging: process.env.NODE_ENV === 'development',
            confirmationTimeout: 10000, // 10 seconds
            fallbackRoute: '/'
        };
    }

    /**
     * Update configuration
     */
    public updateConfig(updates: Partial<NavigationExecutorConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    /**
     * Get current configuration
     */
    public getConfig(): NavigationExecutorConfig {
        return { ...this.config };
    }

    /**
     * Logging utility
     */
    private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        if (this.config.enableNavigationLogging || level === 'error') {
            const timestamp = new Date().toISOString();
            console[level](`[NavigationExecutorService] ${timestamp}: ${message}`);
        }
    }
}