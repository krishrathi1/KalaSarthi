/**
 * Navigation Router for Artisan Buddy
 * 
 * Handles navigation requests and maps intents to application routes with
 * multilingual support, fuzzy matching, and confirmation flows.
 */

import {
  Intent,
  NavigationResult,
  RouteSuggestion,
  ArtisanContext,
  ROUTE_MAP,
} from '@/lib/types/artisan-buddy';

// Route metadata with descriptions and aliases
interface RouteMetadata {
  route: string;
  label: string;
  description: string;
  aliases: Record<string, string[]>; // language -> aliases
  requiresConfirmation: boolean;
  requiredPermissions?: string[];
  parameters?: string[];
}

// Comprehensive route mapping with multilingual aliases
const ROUTE_METADATA: Record<string, RouteMetadata> = {
  digital_khata: {
    route: '/digital-khata',
    label: 'Digital Khata',
    description: 'Manage your financial records, sales, and expenses',
    aliases: {
      en: ['digital khata', 'khata', 'ledger', 'accounts', 'finance', 'money'],
      hi: ['डिजिटल खाता', 'खाता', 'लेखा', 'हिसाब', 'वित्त'],
      ta: ['டிஜிட்டல் கணக்கு', 'கணக்கு', 'நிதி'],
      te: ['డిజిటల్ ఖాతా', 'ఖాతా', 'ఆర్థిక'],
      bn: ['ডিজিটাল খাতা', 'খাতা', 'হিসাব'],
      mr: ['डिजिटल खाते', 'खाते', 'हिशोब'],
      gu: ['ડિજિટલ ખાતું', 'ખાતું', 'હિસાબ'],
    },
    requiresConfirmation: false,
  },
  scheme_sahayak: {
    route: '/scheme-sahayak',
    label: 'Scheme Sahayak',
    description: 'Discover and apply for government schemes and benefits',
    aliases: {
      en: ['scheme sahayak', 'schemes', 'government schemes', 'benefits', 'subsidies', 'yojana'],
      hi: ['योजना सहायक', 'योजनाएं', 'सरकारी योजनाएं', 'लाभ', 'सब्सिडी'],
      ta: ['திட்ட உதவியாளர்', 'திட்டங்கள்', 'அரசு திட்டங்கள்'],
      te: ['పథకం సహాయకుడు', 'పథకాలు', 'ప్రభుత్వ పథకాలు'],
      bn: ['প্রকল্প সহায়ক', 'প্রকল্প', 'সরকারি প্রকল্প'],
      mr: ['योजना सहाय्यक', 'योजना', 'सरकारी योजना'],
      gu: ['યોજના સહાયક', 'યોજનાઓ', 'સરકારી યોજનાઓ'],
    },
    requiresConfirmation: false,
  },
  buyer_connect: {
    route: '/buyer-connect',
    label: 'Buyer Connect',
    description: 'Connect with buyers and manage inquiries',
    aliases: {
      en: ['buyer connect', 'buyers', 'customers', 'inquiries', 'orders'],
      hi: ['खरीदार कनेक्ट', 'खरीदार', 'ग्राहक', 'पूछताछ'],
      ta: ['வாங்குபவர் இணைப்பு', 'வாங்குபவர்கள்', 'வாடிக்கையாளர்கள்'],
      te: ['కొనుగోలుదారు కనెక్ట్', 'కొనుగోలుదారులు', 'వినియోగదారులు'],
      bn: ['ক্রেতা সংযোগ', 'ক্রেতা', 'গ্রাহক'],
      mr: ['खरेदीदार कनेक्ट', 'खरेदीदार', 'ग्राहक'],
      gu: ['ખરીદદાર કનેક્ટ', 'ખરીદદારો', 'ગ્રાહકો'],
    },
    requiresConfirmation: false,
  },
  product_creator: {
    route: '/product-creator',
    label: 'Product Creator',
    description: 'Create and manage your product listings',
    aliases: {
      en: ['product creator', 'add product', 'create product', 'new product', 'list product'],
      hi: ['उत्पाद निर्माता', 'उत्पाद जोड़ें', 'नया उत्पाद'],
      ta: ['தயாரிப்பு உருவாக்குபவர்', 'தயாரிப்பு சேர்', 'புதிய தயாரிப்பு'],
      te: ['ఉత్పత్తి సృష్టికర్త', 'ఉత్పత్తి జోడించు', 'కొత్త ఉత్పత్తి'],
      bn: ['পণ্য নির্মাতা', 'পণ্য যোগ করুন', 'নতুন পণ্য'],
      mr: ['उत्पादन निर्माता', 'उत्पादन जोडा', 'नवीन उत्पादन'],
      gu: ['ઉત્પાદન નિર્માતા', 'ઉત્પાદન ઉમેરો', 'નવું ઉત્પાદન'],
    },
    requiresConfirmation: false,
  },
  heritage_storytelling: {
    route: '/heritage-storytelling',
    label: 'Heritage Storytelling',
    description: 'Share the story and heritage behind your crafts',
    aliases: {
      en: ['heritage storytelling', 'heritage', 'story', 'craft story', 'tradition'],
      hi: ['विरासत कहानी', 'विरासत', 'कहानी', 'परंपरा'],
      ta: ['பாரம்பரிய கதை', 'பாரம்பரியம்', 'கதை'],
      te: ['వారసత్వ కథ', 'వారసత్వం', 'కథ'],
      bn: ['ঐতিহ্য গল্প', 'ঐতিহ্য', 'গল্প'],
      mr: ['वारसा कथा', 'वारसा', 'कथा'],
      gu: ['વારસો વાર્તા', 'વારસો', 'વાર્તા'],
    },
    requiresConfirmation: false,
  },
  profile: {
    route: '/profile',
    label: 'Profile',
    description: 'View and edit your artisan profile',
    aliases: {
      en: ['profile', 'my profile', 'account', 'settings', 'personal info'],
      hi: ['प्रोफाइल', 'मेरी प्रोफाइल', 'खाता', 'सेटिंग्स'],
      ta: ['சுயவிவரம்', 'என் சுயவிவரம்', 'கணக்கு'],
      te: ['ప్రొఫైల్', 'నా ప్రొఫైల్', 'ఖాతా'],
      bn: ['প্রোফাইল', 'আমার প্রোফাইল', 'অ্যাকাউন্ট'],
      mr: ['प्रोफाइल', 'माझे प्रोफाइल', 'खाते'],
      gu: ['પ્રોફાઇલ', 'મારી પ્રોફાઇલ', 'ખાતું'],
    },
    requiresConfirmation: false,
  },
  inventory: {
    route: '/inventory',
    label: 'Inventory',
    description: 'Manage your product inventory and stock',
    aliases: {
      en: ['inventory', 'stock', 'products', 'items', 'catalog'],
      hi: ['इन्वेंटरी', 'स्टॉक', 'उत्पाद', 'सामान'],
      ta: ['சரக்கு', 'பங்கு', 'தயாரிப்புகள்'],
      te: ['జాబితా', 'స్టాక్', 'ఉత్పత్తులు'],
      bn: ['তালিকা', 'স্টক', 'পণ্য'],
      mr: ['यादी', 'स्टॉक', 'उत्पादने'],
      gu: ['યાદી', 'સ્ટોક', 'ઉત્પાદનો'],
    },
    requiresConfirmation: false,
  },
  sales_analytics: {
    route: '/finance/dashboard',
    label: 'Sales Analytics',
    description: 'View sales reports and analytics',
    aliases: {
      en: ['sales analytics', 'sales', 'analytics', 'reports', 'dashboard', 'revenue'],
      hi: ['बिक्री विश्लेषण', 'बिक्री', 'रिपोर्ट', 'डैशबोर्ड', 'आय'],
      ta: ['விற்பனை பகுப்பாய்வு', 'விற்பனை', 'அறிக்கைகள்'],
      te: ['అమ్మకాల విశ్లేషణ', 'అమ్మకాలు', 'నివేదికలు'],
      bn: ['বিক্রয় বিশ্লেষণ', 'বিক্রয়', 'প্রতিবেদন'],
      mr: ['विक्री विश्लेषण', 'विक्री', 'अहवाल'],
      gu: ['વેચાણ વિશ્લેષણ', 'વેચાણ', 'અહેવાલો'],
    },
    requiresConfirmation: false,
  },
  marketplace: {
    route: '/marketplace',
    label: 'Marketplace',
    description: 'Browse and sell in the marketplace',
    aliases: {
      en: ['marketplace', 'market', 'shop', 'store', 'bazaar'],
      hi: ['बाज़ार', 'मार्केटप्लेस', 'दुकान'],
      ta: ['சந்தை', 'கடை'],
      te: ['మార్కెట్', 'దుకాణం'],
      bn: ['বাজার', 'দোকান'],
      mr: ['बाजार', 'दुकान'],
      gu: ['બજાર', 'દુકાન'],
    },
    requiresConfirmation: false,
  },
  notifications: {
    route: '/notifications',
    label: 'Notifications',
    description: 'View your notifications and alerts',
    aliases: {
      en: ['notifications', 'alerts', 'messages', 'updates'],
      hi: ['सूचनाएं', 'अलर्ट', 'संदेश'],
      ta: ['அறிவிப்புகள்', 'எச்சரிக்கைகள்'],
      te: ['నోటిఫికేషన్లు', 'హెచ్చరికలు'],
      bn: ['বিজ্ঞপ্তি', 'সতর্কতা'],
      mr: ['सूचना', 'इशारे'],
      gu: ['સૂચનાઓ', 'ચેતવણીઓ'],
    },
    requiresConfirmation: false,
  },
  enhanced_chat: {
    route: '/enhanced-chat',
    label: 'Enhanced Chat',
    description: 'Access the enhanced chat interface',
    aliases: {
      en: ['enhanced chat', 'chat', 'messaging', 'conversation'],
      hi: ['बेहतर चैट', 'चैट', 'बातचीत'],
      ta: ['மேம்படுத்தப்பட்ட அரட்டை', 'அரட்டை'],
      te: ['మెరుగైన చాట్', 'చాట్'],
      bn: ['উন্নত চ্যাট', 'চ্যাট'],
      mr: ['सुधारित चॅट', 'चॅट'],
      gu: ['સુધારેલ ચેટ', 'ચેટ'],
    },
    requiresConfirmation: false,
  },
};

// Navigation history entry
interface NavigationHistoryEntry {
  route: string;
  timestamp: Date;
  parameters: Record<string, any>;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

export class NavigationRouter {
  private static instance: NavigationRouter;
  private navigationHistory: Map<string, NavigationHistoryEntry[]> = new Map();
  private breadcrumbs: Map<string, string[]> = new Map();

  private constructor() {}

  public static getInstance(): NavigationRouter {
    if (!NavigationRouter.instance) {
      NavigationRouter.instance = new NavigationRouter();
    }
    return NavigationRouter.instance;
  }

  // ============================================================================
  // Core Navigation Methods
  // ============================================================================

  /**
   * Get route for navigation intent
   */
  public async getRoute(
    intent: Intent,
    context: ArtisanContext,
    language: string = 'en'
  ): Promise<NavigationResult> {
    try {
      console.log('Navigation Router: Processing navigation intent');

      // Extract destination from intent parameters
      const destination = intent.parameters.destination || 
                         this.extractDestinationFromEntities(intent.entities);

      if (!destination) {
        throw new Error('No destination specified in navigation intent');
      }

      // Resolve route using multilingual matching
      const routeKey = await this.resolveRoute(destination, language);

      if (!routeKey) {
        throw new Error(`Could not resolve route for destination: ${destination}`);
      }

      const metadata = ROUTE_METADATA[routeKey];

      // Extract parameters for dynamic routes
      const parameters = this.extractRouteParameters(intent, metadata);

      // Check if confirmation is required
      const requiresConfirmation = this.shouldRequireConfirmation(
        metadata,
        context,
        parameters
      );

      const confirmationMessage = requiresConfirmation
        ? this.generateConfirmationMessage(metadata, parameters, language)
        : undefined;

      console.log(`Navigation Router: Resolved route - ${metadata.route}`);

      return {
        route: metadata.route,
        parameters,
        requiresConfirmation,
        confirmationMessage,
      };
    } catch (error) {
      console.error('Navigation Router: Error getting route:', error);
      throw error;
    }
  }

  /**
   * Validate route accessibility for user
   */
  public async validateRoute(
    route: string,
    userId: string,
    context?: ArtisanContext
  ): Promise<boolean> {
    try {
      // Find route metadata
      const routeKey = Object.keys(ROUTE_METADATA).find(
        key => ROUTE_METADATA[key].route === route
      );

      if (!routeKey) {
        console.warn(`Navigation Router: Unknown route - ${route}`);
        return false;
      }

      const metadata = ROUTE_METADATA[routeKey];

      // Check if route requires specific permissions
      if (metadata.requiredPermissions && metadata.requiredPermissions.length > 0) {
        // In a real implementation, check user permissions
        // For now, assume all routes are accessible
        console.log(`Navigation Router: Checking permissions for ${route}`);
      }

      // Additional validation based on context
      if (context) {
        // Example: Check if user has products before accessing inventory
        if (routeKey === 'inventory' && context.products.length === 0) {
          console.warn('Navigation Router: User has no products for inventory');
          // Still allow access, but could return false if needed
        }
      }

      return true;
    } catch (error) {
      console.error('Navigation Router: Error validating route:', error);
      return false;
    }
  }

  /**
   * Get route suggestions based on query
   */
  public async suggestRoutes(
    query: string,
    language: string = 'en',
    limit: number = 5
  ): Promise<RouteSuggestion[]> {
    try {
      const queryLower = query.toLowerCase();
      const suggestions: RouteSuggestion[] = [];

      // Calculate relevance for each route
      for (const [key, metadata] of Object.entries(ROUTE_METADATA)) {
        let maxRelevance = 0;

        // Check label similarity
        const labelSimilarity = calculateSimilarity(queryLower, metadata.label.toLowerCase());
        maxRelevance = Math.max(maxRelevance, labelSimilarity);

        // Check aliases for the specified language
        const aliases = metadata.aliases[language] || metadata.aliases['en'];
        for (const alias of aliases) {
          const aliasSimilarity = calculateSimilarity(queryLower, alias.toLowerCase());
          maxRelevance = Math.max(maxRelevance, aliasSimilarity);

          // Exact match or contains
          if (alias.toLowerCase().includes(queryLower) || queryLower.includes(alias.toLowerCase())) {
            maxRelevance = Math.max(maxRelevance, 0.9);
          }
        }

        // Check description similarity
        const descSimilarity = calculateSimilarity(queryLower, metadata.description.toLowerCase());
        maxRelevance = Math.max(maxRelevance, descSimilarity * 0.7);

        // Only include if relevance is above threshold
        if (maxRelevance > 0.3) {
          suggestions.push({
            route: metadata.route,
            label: metadata.label,
            description: metadata.description,
            relevance: maxRelevance,
          });
        }
      }

      // Sort by relevance and limit results
      suggestions.sort((a, b) => b.relevance - a.relevance);
      const limitedSuggestions = suggestions.slice(0, limit);

      console.log(`Navigation Router: Found ${limitedSuggestions.length} route suggestions`);
      return limitedSuggestions;
    } catch (error) {
      console.error('Navigation Router: Error suggesting routes:', error);
      return [];
    }
  }

  // ============================================================================
  // Multilingual Navigation Support
  // ============================================================================

  /**
   * Resolve route using multilingual fuzzy matching
   */
  private async resolveRoute(
    destination: string,
    language: string = 'en'
  ): Promise<string | null> {
    const destLower = destination.toLowerCase();
    let bestMatch: { key: string; score: number } | null = null;

    for (const [key, metadata] of Object.entries(ROUTE_METADATA)) {
      // Check exact match with route key
      if (key === destLower || key.replace('_', ' ') === destLower) {
        return key;
      }

      // Check aliases for the specified language
      const aliases = metadata.aliases[language] || metadata.aliases['en'];
      
      for (const alias of aliases) {
        // Exact match
        if (alias.toLowerCase() === destLower) {
          return key;
        }

        // Fuzzy match
        const similarity = calculateSimilarity(destLower, alias.toLowerCase());
        
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = { key, score: similarity };
        }

        // Contains match
        if (alias.toLowerCase().includes(destLower) || destLower.includes(alias.toLowerCase())) {
          const containsScore = Math.max(similarity, 0.85);
          if (!bestMatch || containsScore > bestMatch.score) {
            bestMatch = { key, score: containsScore };
          }
        }
      }

      // Check label fuzzy match
      const labelSimilarity = calculateSimilarity(destLower, metadata.label.toLowerCase());
      if (!bestMatch || labelSimilarity > bestMatch.score) {
        bestMatch = { key, score: labelSimilarity };
      }
    }

    // Return best match if score is above threshold
    if (bestMatch && bestMatch.score > 0.6) {
      console.log(`Navigation Router: Fuzzy matched "${destination}" to "${bestMatch.key}" (score: ${bestMatch.score.toFixed(2)})`);
      return bestMatch.key;
    }

    console.warn(`Navigation Router: Could not resolve destination "${destination}"`);
    return null;
  }

  /**
   * Get route aliases in multiple languages
   */
  public getRouteAliases(routeKey: string): Record<string, string[]> {
    const metadata = ROUTE_METADATA[routeKey];
    return metadata ? metadata.aliases : {};
  }

  /**
   * Get all supported languages for navigation
   */
  public getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    
    for (const metadata of Object.values(ROUTE_METADATA)) {
      Object.keys(metadata.aliases).forEach(lang => languages.add(lang));
    }

    return Array.from(languages);
  }

  // ============================================================================
  // Navigation Confirmation Flow
  // ============================================================================

  /**
   * Determine if confirmation is required
   */
  private shouldRequireConfirmation(
    metadata: RouteMetadata,
    context: ArtisanContext,
    parameters: Record<string, any>
  ): boolean {
    // Check metadata flag
    if (metadata.requiresConfirmation) {
      return true;
    }

    // Require confirmation for sensitive operations
    const sensitiveRoutes = ['profile', 'sales_analytics'];
    const routeKey = Object.keys(ROUTE_METADATA).find(
      key => ROUTE_METADATA[key] === metadata
    );

    if (routeKey && sensitiveRoutes.includes(routeKey)) {
      // Could add additional logic based on context
      return false; // For now, don't require confirmation
    }

    // Require confirmation if parameters suggest data modification
    if (parameters.action === 'delete' || parameters.action === 'remove') {
      return true;
    }

    return false;
  }

  /**
   * Generate confirmation message
   */
  private generateConfirmationMessage(
    metadata: RouteMetadata,
    parameters: Record<string, any>,
    language: string = 'en'
  ): string {
    const confirmationTemplates: Record<string, Record<string, string>> = {
      en: {
        default: `Are you sure you want to navigate to ${metadata.label}?`,
        with_params: `Are you sure you want to navigate to ${metadata.label} with the specified parameters?`,
      },
      hi: {
        default: `क्या आप ${metadata.label} पर जाना चाहते हैं?`,
        with_params: `क्या आप निर्दिष्ट पैरामीटर के साथ ${metadata.label} पर जाना चाहते हैं?`,
      },
      ta: {
        default: `நீங்கள் ${metadata.label} க்கு செல்ல விரும்புகிறீர்களா?`,
        with_params: `குறிப்பிட்ட அளவுருக்களுடன் ${metadata.label} க்கு செல்ல விரும்புகிறீர்களா?`,
      },
    };

    const templates = confirmationTemplates[language] || confirmationTemplates['en'];
    const hasParams = Object.keys(parameters).length > 0;

    return hasParams ? templates.with_params : templates.default;
  }

  /**
   * Create navigation preview
   */
  public createNavigationPreview(
    navigationResult: NavigationResult,
    language: string = 'en'
  ): string {
    const routeKey = Object.keys(ROUTE_METADATA).find(
      key => ROUTE_METADATA[key].route === navigationResult.route
    );

    if (!routeKey) {
      return `Navigating to ${navigationResult.route}`;
    }

    const metadata = ROUTE_METADATA[routeKey];
    const previewTemplates: Record<string, string> = {
      en: `📍 Destination: ${metadata.label}\n📝 Description: ${metadata.description}`,
      hi: `📍 गंतव्य: ${metadata.label}\n📝 विवरण: ${metadata.description}`,
      ta: `📍 இலக்கு: ${metadata.label}\n📝 விளக்கம்: ${metadata.description}`,
    };

    let preview = previewTemplates[language] || previewTemplates['en'];

    // Add parameters if present
    if (Object.keys(navigationResult.parameters).length > 0) {
      const paramsStr = Object.entries(navigationResult.parameters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      preview += `\n🔧 Parameters: ${paramsStr}`;
    }

    return preview;
  }

  // ============================================================================
  // Navigation History and Breadcrumbs
  // ============================================================================

  /**
   * Add navigation to history
   */
  public addToHistory(
    userId: string,
    route: string,
    parameters: Record<string, any> = {}
  ): void {
    if (!this.navigationHistory.has(userId)) {
      this.navigationHistory.set(userId, []);
    }

    const history = this.navigationHistory.get(userId)!;
    history.push({
      route,
      timestamp: new Date(),
      parameters,
    });

    // Keep only last 50 entries
    if (history.length > 50) {
      history.shift();
    }

    console.log(`Navigation Router: Added to history - ${route}`);
  }

  /**
   * Get navigation history
   */
  public getHistory(userId: string, limit: number = 10): NavigationHistoryEntry[] {
    const history = this.navigationHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Clear navigation history
   */
  public clearHistory(userId: string): void {
    this.navigationHistory.delete(userId);
    console.log(`Navigation Router: Cleared history for user ${userId}`);
  }

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(userId: string, route: string): void {
    if (!this.breadcrumbs.has(userId)) {
      this.breadcrumbs.set(userId, []);
    }

    const crumbs = this.breadcrumbs.get(userId)!;
    
    // Don't add duplicate consecutive breadcrumbs
    if (crumbs.length === 0 || crumbs[crumbs.length - 1] !== route) {
      crumbs.push(route);
    }

    // Keep only last 10 breadcrumbs
    if (crumbs.length > 10) {
      crumbs.shift();
    }
  }

  /**
   * Get breadcrumbs
   */
  public getBreadcrumbs(userId: string): string[] {
    return this.breadcrumbs.get(userId) || [];
  }

  /**
   * Clear breadcrumbs
   */
  public clearBreadcrumbs(userId: string): void {
    this.breadcrumbs.delete(userId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract destination from entities
   */
  private extractDestinationFromEntities(entities: any[]): string | undefined {
    // Look for location or organization entities that might indicate a feature
    for (const entity of entities) {
      if (entity.type === 'OTHER' || entity.type === 'ORGANIZATION') {
        return entity.value;
      }
    }

    // If no specific entity found, try to extract from first entity
    if (entities.length > 0) {
      return entities[0].value;
    }

    return undefined;
  }

  /**
   * Extract route parameters from intent
   */
  private extractRouteParameters(
    intent: Intent,
    metadata: RouteMetadata
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Copy relevant parameters from intent
    if (intent.parameters) {
      // Filter out internal parameters
      const internalParams = ['destination', 'sentiment', 'isQuestion', 'isCommand'];
      
      for (const [key, value] of Object.entries(intent.parameters)) {
        if (!internalParams.includes(key)) {
          parameters[key] = value;
        }
      }
    }

    // Extract parameters based on route metadata
    if (metadata.parameters) {
      for (const paramName of metadata.parameters) {
        if (intent.parameters[paramName]) {
          parameters[paramName] = intent.parameters[paramName];
        }
      }
    }

    return parameters;
  }

  /**
   * Handle navigation errors gracefully
   */
  public handleNavigationError(
    error: Error,
    destination: string,
    language: string = 'en'
  ): string {
    console.error('Navigation Router: Navigation error:', error);

    const errorMessages: Record<string, Record<string, string>> = {
      en: {
        not_found: `I couldn't find the page "${destination}". Would you like to see available options?`,
        permission_denied: `You don't have permission to access "${destination}".`,
        invalid_params: `The navigation parameters are invalid. Please try again.`,
        default: `I encountered an error while trying to navigate to "${destination}". Please try again.`,
      },
      hi: {
        not_found: `मुझे "${destination}" पेज नहीं मिला। क्या आप उपलब्ध विकल्प देखना चाहेंगे?`,
        permission_denied: `आपके पास "${destination}" तक पहुंचने की अनुमति नहीं है।`,
        invalid_params: `नेविगेशन पैरामीटर अमान्य हैं। कृपया पुनः प्रयास करें।`,
        default: `"${destination}" पर जाने का प्रयास करते समय मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।`,
      },
      ta: {
        not_found: `"${destination}" பக்கத்தை என்னால் கண்டுபிடிக்க முடியவில்லை। கிடைக்கும் விருப்பங்களைப் பார்க்க விரும்புகிறீர்களா?`,
        permission_denied: `"${destination}" அணுக உங்களுக்கு அனுமதி இல்லை.`,
        invalid_params: `வழிசெலுத்தல் அளவுருக்கள் தவறானவை. மீண்டும் முயற்சிக்கவும்.`,
        default: `"${destination}" க்கு செல்ல முயற்சிக்கும்போது பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.`,
      },
    };

    const messages = errorMessages[language] || errorMessages['en'];

    // Determine error type
    if (error.message.includes('not found') || error.message.includes('resolve')) {
      return messages.not_found;
    } else if (error.message.includes('permission')) {
      return messages.permission_denied;
    } else if (error.message.includes('parameter')) {
      return messages.invalid_params;
    }

    return messages.default;
  }

  /**
   * Get all available routes
   */
  public getAllRoutes(): RouteMetadata[] {
    return Object.values(ROUTE_METADATA);
  }

  /**
   * Get route metadata by key
   */
  public getRouteMetadata(routeKey: string): RouteMetadata | undefined {
    return ROUTE_METADATA[routeKey];
  }

  /**
   * Get route metadata by path
   */
  public getRouteMetadataByPath(path: string): RouteMetadata | undefined {
    return Object.values(ROUTE_METADATA).find(metadata => metadata.route === path);
  }
}

// Export singleton instance
export const navigationRouter = NavigationRouter.getInstance();

