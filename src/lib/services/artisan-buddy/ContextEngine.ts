/**
 * Context Engine for Artisan Buddy
 * 
 * Fetches and maintains artisan profile data, product information, and business metrics
 */

import { firestoreRepository } from './FirestoreRepository';
import { redisClient } from './RedisClient';
import {
  ArtisanContext,
  ArtisanProfile,
  Product,
  SalesMetrics,
  InventoryStatus,
  SchemeRecommendation,
  BuyerConnection,
  UserPreferences,
  ContextType,
} from '@/lib/types/artisan-buddy';

export class ContextEngine {
  private static instance: ContextEngine;
  private readonly CONTEXT_CACHE_TTL = 3600; // 1 hour

  private constructor() {}

  public static getInstance(): ContextEngine {
    if (!ContextEngine.instance) {
      ContextEngine.instance = new ContextEngine();
    }
    return ContextEngine.instance;
  }

  /**
   * Load complete artisan context
   */
  async loadArtisanContext(userId: string): Promise<ArtisanContext> {
    try {
      // Try to get from cache first
      const cacheKey = `artisan_context:${userId}`;
      const cached = await redisClient.getCachedJSON<ArtisanContext>(cacheKey);
      
      if (cached) {
        console.log('Context Engine: Loaded from cache');
        return cached;
      }

      // Fetch from Firestore
      console.log('Context Engine: Loading from Firestore');
      
      const [profile, products, salesMetrics, inventory, schemes, buyers] = await Promise.all([
        firestoreRepository.getUserProfile(userId),
        firestoreRepository.getArtisanProducts(userId),
        firestoreRepository.getSalesMetrics(userId, 'month'),
        firestoreRepository.getInventoryStatus(userId),
        firestoreRepository.getSchemeRecommendations(userId),
        firestoreRepository.getBuyerConnections(userId),
      ]);

      if (!profile) {
        throw new Error(`User profile not found for userId: ${userId}`);
      }

      const context: ArtisanContext = {
        profile,
        products,
        salesMetrics,
        inventory,
        schemes,
        buyers,
        preferences: this.getDefaultPreferences(profile),
      };

      // Cache the context
      await redisClient.cacheJSON(cacheKey, context, this.CONTEXT_CACHE_TTL);

      return context;
    } catch (error) {
      console.error('Context Engine: Error loading context:', error);
      throw error;
    }
  }

  /**
   * Refresh context with latest data
   */
  async refreshContext(userId: string): Promise<ArtisanContext> {
    try {
      // Clear cache
      const cacheKey = `artisan_context:${userId}`;
      await redisClient.deleteCached(cacheKey);

      // Load fresh data
      return await this.loadArtisanContext(userId);
    } catch (error) {
      console.error('Context Engine: Error refreshing context:', error);
      throw error;
    }
  }

  /**
   * Get specific context subset
   */
  async getContextSubset(
    userId: string,
    type: ContextType
  ): Promise<Partial<ArtisanContext>> {
    try {
      // Try to get full context from cache
      const cacheKey = `artisan_context:${userId}`;
      const cached = await redisClient.getCachedJSON<ArtisanContext>(cacheKey);

      if (cached) {
        return this.extractSubset(cached, type);
      }

      // Fetch only the requested subset
      switch (type) {
        case 'profile':
          const profile = await firestoreRepository.getUserProfile(userId);
          return { profile: profile || undefined };

        case 'products':
          const products = await firestoreRepository.getArtisanProducts(userId);
          return { products };

        case 'sales':
          const salesMetrics = await firestoreRepository.getSalesMetrics(userId);
          return { salesMetrics };

        case 'inventory':
          const inventory = await firestoreRepository.getInventoryStatus(userId);
          return { inventory };

        case 'schemes':
          const schemes = await firestoreRepository.getSchemeRecommendations(userId);
          return { schemes };

        case 'buyers':
          const buyers = await firestoreRepository.getBuyerConnections(userId);
          return { buyers };

        default:
          return {};
      }
    } catch (error) {
      console.error('Context Engine: Error getting context subset:', error);
      return {};
    }
  }

  /**
   * Extract subset from full context
   */
  private extractSubset(context: ArtisanContext, type: ContextType): Partial<ArtisanContext> {
    switch (type) {
      case 'profile':
        return { profile: context.profile };
      case 'products':
        return { products: context.products };
      case 'sales':
        return { salesMetrics: context.salesMetrics };
      case 'inventory':
        return { inventory: context.inventory };
      case 'schemes':
        return { schemes: context.schemes };
      case 'buyers':
        return { buyers: context.buyers };
      default:
        return {};
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(profile: ArtisanProfile): UserPreferences {
    return {
      language: profile.languages[0] || 'en',
      responseLength: 'medium',
      communicationStyle: 'casual',
      notificationsEnabled: true,
      voiceEnabled: false,
      theme: 'light',
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const context = await this.loadArtisanContext(userId);
      context.preferences = { ...context.preferences, ...preferences };

      // Update cache
      const cacheKey = `artisan_context:${userId}`;
      await redisClient.cacheJSON(cacheKey, context, this.CONTEXT_CACHE_TTL);
    } catch (error) {
      console.error('Context Engine: Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get context summary for prompt injection
   */
  getContextSummary(context: ArtisanContext): string {
    const { profile, products, salesMetrics, inventory } = context;

    const summary = `
Artisan Profile:
- Name: ${profile.name}
- Profession: ${profile.profession}
- Specializations: ${profile.specializations.join(', ')}
- Location: ${profile.location.city}, ${profile.location.state}
- Experience: ${profile.experience} years

Products:
- Total Products: ${products.length}
- Active Products: ${products.filter(p => p.status === 'active').length}
- Categories: ${[...new Set(products.map(p => p.category))].join(', ')}

Business Metrics:
- Total Sales (${salesMetrics.period}): ${salesMetrics.totalSales}
- Total Revenue: ₹${salesMetrics.totalRevenue.toLocaleString('en-IN')}
- Average Order Value: ₹${salesMetrics.averageOrderValue.toFixed(2)}

Inventory:
- Total Products: ${inventory.totalProducts}
- Low Stock Items: ${inventory.lowStockProducts.length}
- Out of Stock Items: ${inventory.outOfStockProducts.length}
- Total Inventory Value: ₹${inventory.totalInventoryValue.toLocaleString('en-IN')}
    `.trim();

    return summary;
  }
}

export const contextEngine = ContextEngine.getInstance();
