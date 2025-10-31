/**
 * Navigation Intent Mapping Service
 * Comprehensive intent-to-route mapping system with multilingual support
 * Handles route validation, user permissions, and navigation context
 */

import { UserProfile } from '@/context/auth-context';

export interface NavigationRoute {
    path: string;
    name: string;
    aliases: string[];
    category: 'main' | 'profile' | 'marketplace' | 'finance' | 'tools' | 'admin';
    requiresAuth: boolean;
    roleRestrictions?: ('artisan' | 'buyer' | 'admin')[];
    parameters?: string[];
    multilingual: {
        [language: string]: {
            name: string;
            aliases: string[];
            description: string;
        };
    };
}

export interface NavigationIntentMapping {
    [intentName: string]: {
        routes: string[];
        aliases: string[];
        parameters?: string[];
        confirmationRequired?: boolean;
        category: 'navigation' | 'action' | 'query';
        priority: number; // Higher priority intents are matched first
        multilingual: {
            [language: string]: {
                patterns: string[];
                responses: string[];
                confirmationMessages?: string[];
            };
        };
    };
}

export interface RouteValidationResult {
    isValid: boolean;
    hasAccess: boolean;
    route?: NavigationRoute;
    redirectRoute?: string;
    error?: string;
    reason?: string;
}

export interface NavigationPermissionContext {
    userProfile?: UserProfile;
    currentRoute?: string;
    sessionData?: Record<string, any>;
    language?: string;
}

export class NavigationIntentMappingService {
    private static instance: NavigationIntentMappingService;
    private navigationRoutes: Map<string, NavigationRoute>;
    private intentMappings: NavigationIntentMapping;
    private supportedLanguages: string[];

    private constructor() {
        this.navigationRoutes = new Map();
        this.intentMappings = this.initializeIntentMappings();
        this.supportedLanguages = [
            'en-US', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN',
            'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'
        ];
        this.initializeNavigationRoutes();
    }

    public static getInstance(): NavigationIntentMappingService {
        if (!NavigationIntentMappingService.instance) {
            NavigationIntentMappingService.instance = new NavigationIntentMappingService();
        }
        return NavigationIntentMappingService.instance;
    }

    /**
     * Get navigation route from intent with validation
     */
    public getRouteFromIntent(
        intent: string,
        parameters: Record<string, any> = {},
        context?: NavigationPermissionContext
    ): RouteValidationResult {
        const mapping = this.intentMappings[intent];
        if (!mapping) {
            return {
                isValid: false,
                hasAccess: false,
                error: 'Intent not found',
                reason: `Navigation intent '${intent}' is not recognized`
            };
        }

        // Get primary route
        const routePath = mapping.routes[0];
        const route = this.navigationRoutes.get(routePath);

        if (!route) {
            return {
                isValid: false,
                hasAccess: false,
                error: 'Route not found',
                reason: `Route '${routePath}' is not defined`
            };
        }

        // Apply parameters to route if needed
        const processedRoute = this.applyParametersToRoute(route, parameters);

        // Validate route access
        const accessValidation = this.validateRouteAccess(processedRoute, context);

        return {
            isValid: true,
            hasAccess: accessValidation.hasAccess,
            route: processedRoute,
            redirectRoute: accessValidation.redirectRoute,
            error: accessValidation.error,
            reason: accessValidation.reason
        };
    }

    /**
     * Validate user access to a specific route
     */
    public validateRouteAccess(
        route: NavigationRoute,
        context?: NavigationPermissionContext
    ): RouteValidationResult {
        // Check authentication requirement
        if (route.requiresAuth && !context?.userProfile) {
            return {
                isValid: true,
                hasAccess: false,
                redirectRoute: '/auth',
                error: 'Authentication required',
                reason: 'This page requires you to be logged in'
            };
        }

        // Check role restrictions
        if (route.roleRestrictions && context?.userProfile) {
            const userRole = context.userProfile.role;
            if (!route.roleRestrictions.includes(userRole)) {
                // Determine appropriate redirect based on user role
                const redirectRoute = this.getDefaultRouteForRole(userRole);
                return {
                    isValid: true,
                    hasAccess: false,
                    redirectRoute,
                    error: 'Access denied',
                    reason: `This page is not available for ${userRole}s`
                };
            }
        }

        // Additional business logic validations
        const businessValidation = this.validateBusinessRules(route, context);
        if (!businessValidation.hasAccess) {
            return businessValidation;
        }

        return {
            isValid: true,
            hasAccess: true,
            route
        };
    }

    /**
     * Get all available routes for a user based on their permissions
     */
    public getAvailableRoutes(context?: NavigationPermissionContext): NavigationRoute[] {
        const availableRoutes: NavigationRoute[] = [];

        for (const route of this.navigationRoutes.values()) {
            const validation = this.validateRouteAccess(route, context);
            if (validation.hasAccess) {
                availableRoutes.push(route);
            }
        }

        return availableRoutes.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Get navigation suggestions based on current context
     */
    public getNavigationSuggestions(
        context?: NavigationPermissionContext,
        limit: number = 5
    ): NavigationRoute[] {
        const availableRoutes = this.getAvailableRoutes(context);
        const currentRoute = context?.currentRoute;

        // Filter out current route and prioritize by category
        const suggestions = availableRoutes
            .filter(route => route.path !== currentRoute)
            .sort((a, b) => {
                // Prioritize main category routes
                if (a.category === 'main' && b.category !== 'main') return -1;
                if (b.category === 'main' && a.category !== 'main') return 1;
                return a.name.localeCompare(b.name);
            });

        return suggestions.slice(0, limit);
    }

    /**
     * Get intent mappings for a specific language
     */
    public getIntentMappingsForLanguage(language: string = 'en-US'): NavigationIntentMapping {
        const filteredMappings: NavigationIntentMapping = {};

        for (const [intent, mapping] of Object.entries(this.intentMappings)) {
            if (mapping.multilingual[language] || mapping.multilingual['en-US']) {
                filteredMappings[intent] = mapping;
            }
        }

        return filteredMappings;
    }

    /**
     * Add or update a navigation route
     */
    public addNavigationRoute(routePath: string, route: NavigationRoute): void {
        this.navigationRoutes.set(routePath, route);
    }

    /**
     * Add or update an intent mapping
     */
    public addIntentMapping(intentName: string, mapping: NavigationIntentMapping[string]): void {
        this.intentMappings[intentName] = mapping;
    }

    /**
     * Get all navigation routes
     */
    public getAllRoutes(): Map<string, NavigationRoute> {
        return new Map(this.navigationRoutes);
    }

    /**
     * Get all intent mappings
     */
    public getAllIntentMappings(): NavigationIntentMapping {
        return { ...this.intentMappings };
    }

    /**
     * Check if intent requires confirmation
     */
    public requiresConfirmation(intent: string): boolean {
        const mapping = this.intentMappings[intent];
        return mapping?.confirmationRequired || false;
    }

    /**
     * Get confirmation message for intent
     */
    public getConfirmationMessage(
        intent: string,
        targetRoute: string,
        language: string = 'en-US'
    ): string {
        const mapping = this.intentMappings[intent];
        if (!mapping || !mapping.multilingual[language]) {
            return `Do you want to navigate to ${targetRoute}?`;
        }

        const confirmationMessages = mapping.multilingual[language].confirmationMessages;
        if (confirmationMessages && confirmationMessages.length > 0) {
            return confirmationMessages[0].replace('{route}', targetRoute);
        }

        const responses = mapping.multilingual[language].responses;
        return responses[0] || `Do you want to navigate to ${targetRoute}?`;
    }

    /**
     * Get supported languages
     */
    public getSupportedLanguages(): string[] {
        return [...this.supportedLanguages];
    }

    /**
     * Apply parameters to route path
     */
    private applyParametersToRoute(route: NavigationRoute, parameters: Record<string, any>): NavigationRoute {
        let processedPath = route.path;

        // Replace parameter placeholders in route path
        for (const [key, value] of Object.entries(parameters)) {
            const placeholder = `{${key}}`;
            if (processedPath.includes(placeholder)) {
                processedPath = processedPath.replace(placeholder, String(value));
            }
        }

        return {
            ...route,
            path: processedPath
        };
    }

    /**
     * Validate business rules for route access
     */
    private validateBusinessRules(
        route: NavigationRoute,
        context?: NavigationPermissionContext
    ): RouteValidationResult {
        // Example business rules - can be extended

        // Check if user has completed profile setup for certain routes
        if (route.category === 'tools' && context?.userProfile) {
            if (!context.userProfile.artisticProfession || !context.userProfile.description) {
                return {
                    isValid: true,
                    hasAccess: false,
                    redirectRoute: '/profile',
                    error: 'Profile incomplete',
                    reason: 'Please complete your profile to access this feature'
                };
            }
        }

        // Check for admin routes
        if (route.category === 'admin' && context?.userProfile?.role !== 'admin') {
            return {
                isValid: true,
                hasAccess: false,
                redirectRoute: this.getDefaultRouteForRole(context?.userProfile?.role || 'buyer'),
                error: 'Admin access required',
                reason: 'This page is only available to administrators'
            };
        }

        return {
            isValid: true,
            hasAccess: true,
            route
        };
    }

    /**
     * Get default route for user role
     */
    private getDefaultRouteForRole(role: string): string {
        switch (role) {
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
     * Initialize navigation routes registry
     */
    private initializeNavigationRoutes(): void {
        const routes: Array<[string, NavigationRoute]> = [
            ['/dashboard', {
                path: '/dashboard',
                name: 'Dashboard',
                aliases: ['home', 'main', 'dashboard'],
                category: 'main',
                requiresAuth: true,
                multilingual: {
                    'en-US': {
                        name: 'Dashboard',
                        aliases: ['home', 'main page', 'dashboard'],
                        description: 'Main dashboard with overview and quick actions'
                    },
                    'hi-IN': {
                        name: 'डैशबोर्ड',
                        aliases: ['होम', 'मुख्य पृष्ठ', 'डैशबोर्ड'],
                        description: 'मुख्य डैशबोर्ड जिसमें अवलोकन और त्वरित कार्य हैं'
                    }
                }
            }],
            ['/profile', {
                path: '/profile',
                name: 'Profile',
                aliases: ['profile', 'account', 'my account'],
                category: 'profile',
                requiresAuth: true,
                multilingual: {
                    'en-US': {
                        name: 'Profile',
                        aliases: ['profile', 'account', 'my account', 'user profile'],
                        description: 'User profile and account settings'
                    },
                    'hi-IN': {
                        name: 'प्रोफाइल',
                        aliases: ['प्रोफाइल', 'खाता', 'मेरा खाता', 'उपयोगकर्ता प्रोफाइल'],
                        description: 'उपयोगकर्ता प्रोफाइल और खाता सेटिंग्स'
                    }
                }
            }],
            ['/marketplace', {
                path: '/marketplace',
                name: 'Marketplace',
                aliases: ['marketplace', 'market', 'shop', 'products'],
                category: 'marketplace',
                requiresAuth: false,
                multilingual: {
                    'en-US': {
                        name: 'Marketplace',
                        aliases: ['marketplace', 'market', 'shop', 'products', 'browse'],
                        description: 'Browse and purchase artisan products'
                    },
                    'hi-IN': {
                        name: 'मार्केटप्लेस',
                        aliases: ['मार्केटप्लेस', 'बाजार', 'दुकान', 'उत्पाद', 'ब्राउज़'],
                        description: 'कारीगर उत्पादों को ब्राउज़ करें और खरीदें'
                    }
                }
            }],
            ['/smart-product-creator', {
                path: '/smart-product-creator',
                name: 'Product Creator',
                aliases: ['create product', 'add product', 'new product', 'product creator'],
                category: 'tools',
                requiresAuth: true,
                roleRestrictions: ['artisan'],
                multilingual: {
                    'en-US': {
                        name: 'Product Creator',
                        aliases: ['create product', 'add product', 'new product', 'product creator'],
                        description: 'Create and list new products'
                    },
                    'hi-IN': {
                        name: 'उत्पाद निर्माता',
                        aliases: ['उत्पाद बनाएं', 'उत्पाद जोड़ें', 'नया उत्पाद', 'उत्पाद निर्माता'],
                        description: 'नए उत्पाद बनाएं और सूचीबद्ध करें'
                    }
                }
            }],
            ['/trend-spotter', {
                path: '/trend-spotter',
                name: 'Trend Analysis',
                aliases: ['trends', 'trend analysis', 'market trends', 'trend spotter'],
                category: 'tools',
                requiresAuth: true,
                multilingual: {
                    'en-US': {
                        name: 'Trend Analysis',
                        aliases: ['trends', 'trend analysis', 'market trends', 'trend spotter'],
                        description: 'Analyze market trends and opportunities'
                    },
                    'hi-IN': {
                        name: 'ट्रेंड विश्लेषण',
                        aliases: ['ट्रेंड्स', 'ट्रेंड विश्लेषण', 'बाजार के रुझान', 'ट्रेंड स्पॉटर'],
                        description: 'बाजार के रुझान और अवसरों का विश्लेषण करें'
                    }
                }
            }],
            ['/finance', {
                path: '/finance',
                name: 'Finance Dashboard',
                aliases: ['finance', 'financial', 'sales', 'earnings', 'revenue'],
                category: 'finance',
                requiresAuth: true,
                roleRestrictions: ['artisan'],
                multilingual: {
                    'en-US': {
                        name: 'Finance Dashboard',
                        aliases: ['finance', 'financial', 'sales', 'earnings', 'revenue'],
                        description: 'Financial dashboard with sales and earnings data'
                    },
                    'hi-IN': {
                        name: 'वित्त डैशबोर्ड',
                        aliases: ['वित्त', 'वित्तीय', 'बिक्री', 'आय', 'राजस्व'],
                        description: 'बिक्री और आय डेटा के साथ वित्तीय डैशबोर्ड'
                    }
                }
            }],
            ['/yojana-mitra', {
                path: '/yojana-mitra',
                name: 'Yojana Mitra',
                aliases: ['yojana', 'schemes', 'government schemes', 'yojana mitra'],
                category: 'tools',
                requiresAuth: true,
                roleRestrictions: ['artisan'],
                multilingual: {
                    'en-US': {
                        name: 'Yojana Mitra',
                        aliases: ['yojana', 'schemes', 'government schemes', 'yojana mitra'],
                        description: 'Government schemes and benefits information'
                    },
                    'hi-IN': {
                        name: 'योजना मित्र',
                        aliases: ['योजना', 'स्कीम', 'सरकारी योजनाएं', 'योजना मित्र'],
                        description: 'सरकारी योजनाओं और लाभों की जानकारी'
                    }
                }
            }]
        ];

        for (const [path, route] of routes) {
            this.navigationRoutes.set(path, route);
        }
    }

    /**
     * Initialize intent mappings with comprehensive multilingual support
     */
    private initializeIntentMappings(): NavigationIntentMapping {
        return {
            'navigate_dashboard': {
                routes: ['/dashboard'],
                aliases: ['home', 'main', 'dashboard'],
                category: 'navigation',
                priority: 10,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to dashboard', 'open dashboard', 'show dashboard', 'navigate to dashboard',
                            'go home', 'go to home', 'take me home', 'home page', 'main page',
                            'dashboard', 'home', 'main'
                        ],
                        responses: ['Navigating to dashboard', 'Opening dashboard', 'Going to home page'],
                        confirmationMessages: ['Do you want to go to the dashboard?']
                    },
                    'hi-IN': {
                        patterns: [
                            'डैशबोर्ड पर जाओ', 'डैशबोर्ड खोलो', 'होम पेज दिखाओ', 'मुख्य पृष्ठ',
                            'घर जाओ', 'होम', 'डैशबोर्ड', 'मुख्य'
                        ],
                        responses: ['डैशबोर्ड पर जा रहे हैं', 'होम पेज खोल रहे हैं'],
                        confirmationMessages: ['क्या आप डैशबोर्ड पर जाना चाहते हैं?']
                    }
                }
            },
            'navigate_profile': {
                routes: ['/profile'],
                aliases: ['profile', 'account', 'my account'],
                category: 'navigation',
                priority: 8,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to profile', 'open profile', 'show profile', 'my profile',
                            'account settings', 'my account', 'user profile', 'profile', 'account'
                        ],
                        responses: ['Opening your profile', 'Navigating to profile page'],
                        confirmationMessages: ['Do you want to open your profile?']
                    },
                    'hi-IN': {
                        patterns: [
                            'प्रोफाइल पर जाओ', 'प्रोफाइल खोलो', 'मेरा प्रोफाइल', 'खाता सेटिंग्स',
                            'प्रोफाइल', 'खाता', 'मेरा खाता'
                        ],
                        responses: ['प्रोफाइल खोल रहे हैं', 'प्रोफाइल पेज पर जा रहे हैं'],
                        confirmationMessages: ['क्या आप अपना प्रोफाइल खोलना चाहते हैं?']
                    }
                }
            },
            'navigate_marketplace': {
                routes: ['/marketplace'],
                aliases: ['marketplace', 'market', 'shop', 'products'],
                category: 'navigation',
                priority: 9,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to marketplace', 'open marketplace', 'show marketplace', 'browse products',
                            'go shopping', 'show products', 'market place', 'marketplace', 'shop', 'products'
                        ],
                        responses: ['Opening marketplace', 'Navigating to product marketplace'],
                        confirmationMessages: ['Do you want to browse the marketplace?']
                    },
                    'hi-IN': {
                        patterns: [
                            'मार्केटप्लेस पर जाओ', 'बाजार दिखाओ', 'उत्पाद देखो', 'खरीदारी करो',
                            'मार्केटप्लेस', 'बाजार', 'दुकान', 'उत्पाद'
                        ],
                        responses: ['मार्केटप्लेस खोल रहे हैं', 'बाजार दिखा रहे हैं'],
                        confirmationMessages: ['क्या आप मार्केटप्लेस ब्राउज़ करना चाहते हैं?']
                    }
                }
            },
            'navigate_create_product': {
                routes: ['/smart-product-creator'],
                aliases: ['create product', 'add product', 'new product'],
                category: 'action',
                priority: 7,
                confirmationRequired: true,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'create product', 'add product', 'new product', 'make product',
                            'product creator', 'add new item', 'create new product'
                        ],
                        responses: ['Opening product creator', 'Starting product creation'],
                        confirmationMessages: ['Do you want to create a new product?']
                    },
                    'hi-IN': {
                        patterns: [
                            'उत्पाद बनाओ', 'नया उत्पाद', 'प्रोडक्ट बनाओ', 'आइटम जोड़ो',
                            'उत्पाद निर्माता', 'नया आइटम बनाओ'
                        ],
                        responses: ['उत्पाद निर्माता खोल रहे हैं', 'नया उत्पाद बना रहे हैं'],
                        confirmationMessages: ['क्या आप नया उत्पाद बनाना चाहते हैं?']
                    }
                }
            },
            'navigate_trends': {
                routes: ['/trend-spotter'],
                aliases: ['trends', 'trend analysis', 'market trends'],
                category: 'navigation',
                priority: 6,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to trends', 'show trends', 'trend analysis', 'market trends',
                            'trend spotter', 'analyze trends', 'trends', 'market analysis'
                        ],
                        responses: ['Opening trend analysis', 'Showing market trends'],
                        confirmationMessages: ['Do you want to view trend analysis?']
                    },
                    'hi-IN': {
                        patterns: [
                            'ट्रेंड्स दिखाओ', 'बाजार के रुझान', 'ट्रेंड एनालिसिस',
                            'ट्रेंड स्पॉटर', 'ट्रेंड्स', 'बाजार विश्लेषण'
                        ],
                        responses: ['ट्रेंड एनालिसिस खोल रहे हैं', 'बाजार के रुझान दिखा रहे हैं'],
                        confirmationMessages: ['क्या आप ट्रेंड विश्लेषण देखना चाहते हैं?']
                    }
                }
            },
            'navigate_finance': {
                routes: ['/finance'],
                aliases: ['finance', 'financial', 'sales', 'earnings'],
                category: 'navigation',
                priority: 6,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to finance', 'show finance', 'financial dashboard', 'sales data',
                            'earnings', 'revenue', 'financial reports', 'finance', 'sales'
                        ],
                        responses: ['Opening financial dashboard', 'Showing sales data'],
                        confirmationMessages: ['Do you want to view your financial dashboard?']
                    },
                    'hi-IN': {
                        patterns: [
                            'वित्त डैशबोर्ड', 'बिक्री डेटा', 'आय की जानकारी', 'वित्तीय रिपोर्ट',
                            'वित्त', 'बिक्री', 'आय', 'राजस्व'
                        ],
                        responses: ['वित्तीय डैशबोर्ड खोल रहे हैं', 'बिक्री डेटा दिखा रहे हैं'],
                        confirmationMessages: ['क्या आप अपना वित्तीय डैशबोर्ड देखना चाहते हैं?']
                    }
                }
            },
            'navigate_yojana': {
                routes: ['/yojana-mitra'],
                aliases: ['yojana', 'schemes', 'government schemes'],
                category: 'navigation',
                priority: 5,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go to yojana', 'show schemes', 'government schemes', 'yojana mitra',
                            'schemes', 'benefits', 'government benefits'
                        ],
                        responses: ['Opening Yojana Mitra', 'Showing government schemes'],
                        confirmationMessages: ['Do you want to view government schemes?']
                    },
                    'hi-IN': {
                        patterns: [
                            'योजना मित्र', 'सरकारी योजनाएं', 'स्कीम दिखाओ', 'योजना',
                            'सरकारी लाभ', 'योजनाएं', 'स्कीम'
                        ],
                        responses: ['योजना मित्र खोल रहे हैं', 'सरकारी योजनाएं दिखा रहे हैं'],
                        confirmationMessages: ['क्या आप सरकारी योजनाएं देखना चाहते हैं?']
                    }
                }
            },
            'navigate_back': {
                routes: ['back'],
                aliases: ['back', 'previous', 'go back'],
                category: 'navigation',
                priority: 4,
                multilingual: {
                    'en-US': {
                        patterns: [
                            'go back', 'back', 'previous page', 'return', 'go to previous',
                            'previous', 'back page'
                        ],
                        responses: ['Going back', 'Returning to previous page'],
                        confirmationMessages: ['Do you want to go back?']
                    },
                    'hi-IN': {
                        patterns: [
                            'वापस जाओ', 'पिछला पेज', 'वापस', 'पहले वाला पेज',
                            'पिछला', 'रिटर्न'
                        ],
                        responses: ['वापस जा रहे हैं', 'पिछले पेज पर जा रहे हैं'],
                        confirmationMessages: ['क्या आप वापस जाना चाहते हैं?']
                    }
                }
            }
        };
    }
}