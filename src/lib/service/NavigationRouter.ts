import { NavigationAction } from './VoiceNavigationService';

export interface NavigationResult {
  success: boolean;
  message: string;
  data?: any;
}

export class NavigationRouter {
  private static instance: NavigationRouter;
  private navigationHandlers: Map<string, Function> = new Map();
  private actionHandlers: Map<string, Function> = new Map();
  private queryHandlers: Map<string, Function> = new Map();

  private constructor() {
    this.initializeDefaultHandlers();
  }

  public static getInstance(): NavigationRouter {
    if (!NavigationRouter.instance) {
      NavigationRouter.instance = new NavigationRouter();
    }
    return NavigationRouter.instance;
  }

  private initializeDefaultHandlers(): void {
    // Navigation handlers
    this.registerNavigationHandler('/', this.handleHomeNavigation);
    this.registerNavigationHandler('/finance/dashboard', this.handleFinanceNavigation);
    this.registerNavigationHandler('/marketplace', this.handleMarketplaceNavigation);
    this.registerNavigationHandler('/profile', this.handleProfileNavigation);
    this.registerNavigationHandler('/loans', this.handleLoansNavigation);
    this.registerNavigationHandler('/trend-spotter', this.handleTrendsNavigation);

    // Action handlers
    this.registerActionHandler('help', this.handleHelpAction);
    this.registerActionHandler('search', this.handleSearchAction);

    // Query handlers
    this.registerQueryHandler('search', this.handleSearchQuery);
    this.registerQueryHandler('info', this.handleInfoQuery);
  }

  public async navigate(target: string, params?: Record<string, any>): Promise<NavigationResult> {
    const handler = this.navigationHandlers.get(target);
    if (handler) {
      return await handler(params);
    }

    // Default navigation using window.location or router
    return this.defaultNavigation(target, params);
  }

  public async executeAction(target: string, params?: Record<string, any>): Promise<NavigationResult> {
    const handler = this.actionHandlers.get(target);
    if (handler) {
      return await handler(params);
    }

    return {
      success: false,
      message: `Unknown action: ${target}`
    };
  }

  public async handleQuery(target: string, params?: Record<string, any>): Promise<string> {
    const handler = this.queryHandlers.get(target);
    if (handler) {
      return await handler(params);
    }

    return `I don't have information about ${target}`;
  }

  // Navigation handlers
  private async handleHomeNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      // Use Next.js router or window.location
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return {
        success: true,
        message: 'Navigating to home page'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to navigate to home'
      };
    }
  }

  private async handleFinanceNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/finance/dashboard';
      }
      return {
        success: true,
        message: 'Opening finance dashboard'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open finance dashboard'
      };
    }
  }

  private async handleMarketplaceNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/marketplace';
      }
      return {
        success: true,
        message: 'Opening marketplace'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open marketplace'
      };
    }
  }

  private async handleProfileNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/profile';
      }
      return {
        success: true,
        message: 'Opening your profile'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open profile'
      };
    }
  }

  private async handleLoansNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/loans';
      }
      return {
        success: true,
        message: 'Opening loans section'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open loans section'
      };
    }
  }

  private async handleTrendsNavigation(params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/trend-spotter';
      }
      return {
        success: true,
        message: 'Opening trend analysis'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to open trend analysis'
      };
    }
  }

  // Action handlers
  private async handleHelpAction(params?: Record<string, any>): Promise<NavigationResult> {
    return {
      success: true,
      message: 'Here are some things you can ask me: navigate to finance, go to marketplace, show my profile, search for products, or ask for help',
      data: {
        commands: [
          'Navigate to finance dashboard',
          'Go to marketplace',
          'Show my profile',
          'Search for products',
          'Open loans section',
          'View trends'
        ]
      }
    };
  }

  private async handleSearchAction(params?: Record<string, any>): Promise<NavigationResult> {
    const query = params?.query || '';
    try {
      if (typeof window !== 'undefined') {
        window.location.href = `/marketplace?search=${encodeURIComponent(query)}`;
      }
      return {
        success: true,
        message: `Searching for ${query}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to perform search'
      };
    }
  }

  // Query handlers
  private async handleSearchQuery(params?: Record<string, any>): Promise<string> {
    const query = params?.query || '';
    return `Searching for ${query} in our marketplace. You can also browse categories or ask me to navigate to specific sections.`;
  }

  private async handleInfoQuery(params?: Record<string, any>): Promise<string> {
    const topic = params?.topic || 'general';
    switch (topic.toLowerCase()) {
      case 'finance':
        return 'Our finance section includes sales tracking, revenue forecasting, product performance analysis, and financial insights to help you manage your business better.';
      case 'marketplace':
        return 'Browse our marketplace to find handcrafted products from skilled artisans across India. You can search by category, price, or location.';
      case 'loans':
        return 'Apply for business loans with our AI-powered eligibility assessment. We support various loan types for artisans and small businesses.';
      default:
        return 'I can help you navigate to finance, marketplace, profile, loans, and trend analysis sections. Just tell me where you want to go!';
    }
  }

  private async defaultNavigation(target: string, params?: Record<string, any>): Promise<NavigationResult> {
    try {
      if (typeof window !== 'undefined') {
        const url = params ? `${target}?${new URLSearchParams(params)}` : target;
        window.location.href = url;
      }
      return {
        success: true,
        message: `Navigating to ${target}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to navigate to ${target}`
      };
    }
  }

  // Registration methods
  public registerNavigationHandler(route: string, handler: Function): void {
    this.navigationHandlers.set(route, handler);
  }

  public registerActionHandler(action: string, handler: Function): void {
    this.actionHandlers.set(action, handler);
  }

  public registerQueryHandler(query: string, handler: Function): void {
    this.queryHandlers.set(query, handler);
  }

  public unregisterNavigationHandler(route: string): void {
    this.navigationHandlers.delete(route);
  }

  public unregisterActionHandler(action: string): void {
    this.actionHandlers.delete(action);
  }

  public unregisterQueryHandler(query: string): void {
    this.queryHandlers.delete(query);
  }

  // Utility methods
  public getRegisteredRoutes(): string[] {
    return Array.from(this.navigationHandlers.keys());
  }

  public getRegisteredActions(): string[] {
    return Array.from(this.actionHandlers.keys());
  }

  public getRegisteredQueries(): string[] {
    return Array.from(this.queryHandlers.keys());
  }
}