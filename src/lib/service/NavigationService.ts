interface NavigationAction {
  type: 'navigate' | 'open_modal' | 'execute_function' | 'show_message';
  target: string;
  parameters?: Record<string, any>;
  confirmation?: boolean;
  message?: string;
}

interface TaskCompletionResult {
  success: boolean;
  message: string;
  action?: NavigationAction;
  data?: any;
}

export class NavigationService {
  private static instance: NavigationService;

  private constructor() {}

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Execute navigation action based on intent
   */
  public async executeAction(intent: string, parameters: Record<string, any> = {}): Promise<TaskCompletionResult> {
    switch (intent) {
      case 'product_creation':
        return this.handleProductCreation(parameters);
      
      case 'sales_inquiry':
        return this.handleSalesInquiry(parameters);
      
      case 'trend_analysis':
        return this.handleTrendAnalysis(parameters);
      
      case 'buyer_matching':
        return this.handleBuyerMatching(parameters);
      
      case 'profile_management':
        return this.handleProfileManagement(parameters);
      
      case 'help_request':
        return this.handleHelpRequest(parameters);
      
      case 'greeting':
        return this.handleGreeting(parameters);
      
      default:
        return this.handleUnknownIntent(parameters);
    }
  }

  private async handleProductCreation(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Taking you to Smart Product Creator to create a new product...',
      action: {
        type: 'navigate',
        target: '/smart-product-creator',
        parameters: {
          productType: parameters.product_type || 'general',
          category: parameters.category || 'handmade'
        }
      }
    };
  }

  private async handleSalesInquiry(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Opening Finance Dashboard to show your sales and earnings...',
      action: {
        type: 'navigate',
        target: '/finance/dashboard',
        parameters: {
          metricType: parameters.metric_type || 'revenue',
          timePeriod: parameters.time_period || 'monthly'
        }
      }
    };
  }

  private async handleTrendAnalysis(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Opening Trend Spotter to show trending designs and popular products...',
      action: {
        type: 'navigate',
        target: '/trend-spotter',
        parameters: {
          category: parameters.category || 'general',
          timeRange: parameters.time_range || 'weekly'
        }
      }
    };
  }

  private async handleBuyerMatching(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Opening Matchmaking to connect you with potential buyers...',
      action: {
        type: 'navigate',
        target: '/matchmaking',
        parameters: {
          productType: parameters.product_type || 'general',
          location: parameters.location || 'all'
        }
      }
    };
  }

  private async handleProfileManagement(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Opening your profile for management...',
      action: {
        type: 'navigate',
        target: '/profile',
        parameters: {
          section: parameters.section || 'overview'
        }
      }
    };
  }

  private async handleHelpRequest(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Here\'s how I can help you with your craft business...',
      action: {
        type: 'show_message',
        target: 'help_modal',
        parameters: {
          topic: parameters.topic || 'general'
        }
      }
    };
  }

  private async handleGreeting(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: true,
      message: 'Hello! I\'m your Artisan Buddy. I can help you with your craft business. What would you like to work on today?',
      action: {
        type: 'show_message',
        target: 'greeting_response'
      }
    };
  }

  private async handleUnknownIntent(parameters: Record<string, any>): Promise<TaskCompletionResult> {
    return {
      success: false,
      message: 'I didn\'t quite understand that. Could you please rephrase or ask for help?',
      action: {
        type: 'show_message',
        target: 'clarification_request'
      }
    };
  }

  /**
   * Navigate to a specific page
   */
  public navigateToPage(target: string, parameters: Record<string, any> = {}): void {
    if (typeof window !== 'undefined') {
      // Add parameters to URL if any
      const url = new URL(target, window.location.origin);
      Object.entries(parameters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      
      window.location.href = url.toString();
    }
  }

  /**
   * Show a modal or overlay
   */
  public showModal(target: string, parameters: Record<string, any> = {}): void {
    // Dispatch custom event for modal handling
    const event = new CustomEvent('showModal', {
      detail: { target, parameters }
    });
    window.dispatchEvent(event);
  }

  /**
   * Execute a specific function
   */
  public executeFunction(functionName: string, parameters: Record<string, any> = {}): void {
    // Dispatch custom event for function execution
    const event = new CustomEvent('executeFunction', {
      detail: { functionName, parameters }
    });
    window.dispatchEvent(event);
  }
}
