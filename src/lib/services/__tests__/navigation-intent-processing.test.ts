/**
 * Navigation Intent Processing Tests
 * Tests for the navigation intent mapping and execution services
 */

import { NavigationIntentMappingService } from '../NavigationIntentMappingService';
import { NavigationExecutorService } from '../NavigationExecutorService';
import { RouteValidationSecurityService } from '../RouteValidationSecurityService';
import { VoiceNavigationIntegrationService } from '../VoiceNavigationIntegrationService';

describe('Navigation Intent Processing', () => {
    let intentMappingService: NavigationIntentMappingService;
    let executorService: NavigationExecutorService;
    let securityService: RouteValidationSecurityService;
    let integrationService: VoiceNavigationIntegrationService;

    beforeEach(() => {
        intentMappingService = NavigationIntentMappingService.getInstance();
        executorService = NavigationExecutorService.getInstance();
        securityService = RouteValidationSecurityService.getInstance();
        integrationService = VoiceNavigationIntegrationService.getInstance();
    });

    describe('NavigationIntentMappingService', () => {
        test('should get route from valid intent', () => {
            const mockUserProfile = {
                uid: 'test-user',
                name: 'Test User',
                phone: '1234567890',
                role: 'artisan' as const,
                artisticProfession: 'pottery',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = intentMappingService.getRouteFromIntent('navigate_dashboard', {}, {
                userProfile: mockUserProfile
            });

            expect(result.isValid).toBe(true);
            expect(result.hasAccess).toBe(true);
            expect(result.route?.path).toBe('/dashboard');
        });

        test('should handle invalid intent', () => {
            const result = intentMappingService.getRouteFromIntent('invalid_intent');

            expect(result.isValid).toBe(false);
            expect(result.hasAccess).toBe(false);
            expect(result.error).toBe('Intent not found');
        });

        test('should validate route access for authenticated routes', () => {
            const mockUserProfile = {
                uid: 'test-user',
                name: 'Test User',
                phone: '1234567890',
                role: 'artisan' as const,
                artisticProfession: 'pottery',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = intentMappingService.getRouteFromIntent('navigate_dashboard', {}, {
                userProfile: mockUserProfile
            });

            expect(result.isValid).toBe(true);
            expect(result.hasAccess).toBe(true);
        });

        test('should get available routes for user', () => {
            const mockUserProfile = {
                uid: 'test-user',
                name: 'Test User',
                phone: '1234567890',
                role: 'buyer' as const,
                artisticProfession: 'none',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const routes = intentMappingService.getAvailableRoutes({
                userProfile: mockUserProfile
            });

            expect(routes.length).toBeGreaterThan(0);
            expect(routes.some(route => route.path === '/marketplace')).toBe(true);
        });

        test('should get navigation suggestions', () => {
            const suggestions = intentMappingService.getNavigationSuggestions();

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.length).toBeLessThanOrEqual(5);
        });
    });

    describe('RouteValidationSecurityService', () => {
        test('should validate public route access', async () => {
            const mockRoute = {
                path: '/marketplace',
                name: 'Marketplace',
                aliases: ['marketplace'],
                category: 'marketplace' as const,
                requiresAuth: false,
                multilingual: {
                    'en-US': {
                        name: 'Marketplace',
                        aliases: ['marketplace'],
                        description: 'Browse products'
                    }
                }
            };

            const result = await securityService.validateRouteAccess(mockRoute);

            expect(result.isValid).toBe(true);
            expect(result.hasAccess).toBe(true);
            expect(result.securityLevel).toBe('public');
        });

        test('should deny access to authenticated route without user', async () => {
            const mockRoute = {
                path: '/dashboard',
                name: 'Dashboard',
                aliases: ['dashboard'],
                category: 'main' as const,
                requiresAuth: true,
                multilingual: {
                    'en-US': {
                        name: 'Dashboard',
                        aliases: ['dashboard'],
                        description: 'Main dashboard'
                    }
                }
            };

            const result = await securityService.validateRouteAccess(mockRoute);

            expect(result.isValid).toBe(false);
            expect(result.hasAccess).toBe(false);
            expect(result.fallbackRoute).toBe('/auth');
        });

        test('should validate route parameters', () => {
            const result = securityService.validateRouteParameters('/profile', {
                section: 'overview',
                tab: 'general'
            });

            expect(result.isValid).toBe(true);
            expect(result.sanitizedParams).toBeDefined();
            expect(result.sanitizedParams?.section).toBe('overview');
        });

        test('should reject invalid parameters', () => {
            const result = securityService.validateRouteParameters('/profile', {
                'invalid<script>': 'malicious',
                section: 'invalid_section'
            });

            expect(result.isValid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
        });
    });

    describe('NavigationExecutorService', () => {
        test('should initialize with mock router', () => {
            const mockRouter = {
                push: jest.fn(),
                pathname: '/test'
            };

            executorService.initialize(mockRouter);
            const context = executorService.getContext();

            expect(context.currentRoute).toBe('/test');
        });

        test('should get navigation suggestions', () => {
            const suggestions = executorService.getNavigationSuggestions(3);

            expect(suggestions.length).toBeLessThanOrEqual(3);
            expect(Array.isArray(suggestions)).toBe(true);
        });

        test('should update context', () => {
            const mockUserProfile = {
                uid: 'test-user',
                name: 'Test User',
                phone: '1234567890',
                role: 'artisan' as const,
                artisticProfession: 'pottery',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            executorService.updateContext({
                userProfile: mockUserProfile,
                currentRoute: '/dashboard'
            });

            const context = executorService.getContext();
            expect(context.userProfile?.uid).toBe('test-user');
            expect(context.currentRoute).toBe('/dashboard');
        });
    });

    describe('VoiceNavigationIntegrationService', () => {
        test('should initialize successfully', async () => {
            const mockRouter = {
                push: jest.fn(),
                pathname: '/'
            };

            await integrationService.initialize(mockRouter);
            const status = integrationService.getServiceStatus();

            expect(status.isInitialized).toBe(true);
            expect(status.servicesReady.intentMapping).toBe(true);
            expect(status.servicesReady.executor).toBe(true);
            expect(status.servicesReady.security).toBe(true);
        });

        test('should get help information', () => {
            const help = integrationService.getHelpInformation('en-US');

            expect(help.availableCommands.length).toBeGreaterThan(0);
            expect(help.examples.length).toBeGreaterThan(0);
            expect(help.tips.length).toBeGreaterThan(0);
        });

        test('should get help information in Hindi', () => {
            const help = integrationService.getHelpInformation('hi-IN');

            expect(help.availableCommands.length).toBeGreaterThan(0);
            expect(help.tips.length).toBeGreaterThan(0);
            expect(help.tips[0]).toContain('डैशबोर्ड');
        });

        test('should get available routes for user', () => {
            const mockUserProfile = {
                uid: 'test-user',
                name: 'Test User',
                phone: '1234567890',
                role: 'artisan' as const,
                artisticProfession: 'pottery',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const routes = integrationService.getAvailableRoutes(mockUserProfile);

            expect(routes.length).toBeGreaterThan(0);
            expect(routes.includes('Dashboard')).toBe(true);
        });
    });
});