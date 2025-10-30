/**
 * Buyer Connect Integration Service for Artisan Buddy
 * 
 * Integrates with Buyer Connect (Intelligent Buyer-Artisan Matching System) to provide:
 * - Buyer inquiry management
 * - Buyer profile retrieval
 * - Buyer matching suggestions
 * - Response template drafting
 * 
 * Requirements: 14.3
 */

import { firestoreRepository } from './FirestoreRepository';

// ============================================================================
// INTERFACES
// ============================================================================

export interface BuyerInquiry {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerLocation: string;
  artisanId: string;
  productId?: string;
  productName?: string;
  inquiryType: 'product' | 'custom_order' | 'bulk_order' | 'general';
  message: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  quantity?: number;
  deadline?: Date;
  status: 'new' | 'read' | 'responded' | 'negotiating' | 'closed' | 'converted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source: string;
    matchScore?: number;
    aiGenerated?: boolean;
  };
}

export interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'individual' | 'business' | 'retailer' | 'wholesaler';
  location: {
    city: string;
    state: string;
    country: string;
  };
  interests: string[];
  purchaseHistory: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    categories: string[];
  };
  preferences: {
    language: string;
    communicationChannel: 'email' | 'phone' | 'whatsapp' | 'in_app';
    priceRange: {
      min: number;
      max: number;
    };
  };
  reputation: {
    rating: number;
    reviewCount: number;
    reliabilityScore: number;
  };
  lastActive: Date;
  createdAt: Date;
}

export interface BuyerMatch {
  buyer: BuyerProfile;
  matchScore: number;
  matchReasons: string[];
  potentialValue: number;
  compatibility: {
    productMatch: number;
    priceMatch: number;
    locationMatch: number;
    styleMatch: number;
  };
  recommendedProducts: Array<{
    productId: string;
    productName: string;
    matchScore: number;
    reason: string;
  }>;
  suggestedApproach: string;
}

export interface ResponseTemplate {
  inquiryId: string;
  template: string;
  tone: 'formal' | 'friendly' | 'professional';
  keyPoints: string[];
  suggestedPricing?: {
    basePrice: number;
    negotiationRange: {
      min: number;
      max: number;
    };
  };
  nextSteps: string[];
  estimatedResponseTime: string;
}

export interface InquirySummary {
  total: number;
  new: number;
  responded: number;
  converted: number;
  urgent: number;
  recentInquiries: BuyerInquiry[];
  topBuyers: Array<{
    buyerId: string;
    buyerName: string;
    inquiryCount: number;
    conversionRate: number;
  }>;
}

// ============================================================================
// BUYER CONNECT INTEGRATION SERVICE
// ============================================================================

export class BuyerConnectIntegration {
  private static instance: BuyerConnectIntegration;

  private constructor() {}

  public static getInstance(): BuyerConnectIntegration {
    if (!BuyerConnectIntegration.instance) {
      BuyerConnectIntegration.instance = new BuyerConnectIntegration();
    }
    return BuyerConnectIntegration.instance;
  }

  // ============================================================================
  // BUYER INQUIRIES (Requirement 14.3)
  // ============================================================================

  /**
   * Fetch all buyer inquiries for an artisan
   */
  async getBuyerInquiries(
    artisanId: string,
    filters?: {
      status?: BuyerInquiry['status'];
      priority?: BuyerInquiry['priority'];
      limit?: number;
    }
  ): Promise<BuyerInquiry[]> {
    try {
      // In a real implementation, this would query Firestore or MongoDB
      // For now, we'll return mock data structure
      const inquiries = await this.fetchInquiriesFromDatabase(artisanId, filters);
      
      return inquiries;
    } catch (error) {
      console.error('Error fetching buyer inquiries:', error);
      throw new Error('Failed to fetch buyer inquiries');
    }
  }

  /**
   * Get inquiry summary for an artisan
   */
  async getInquirySummary(artisanId: string): Promise<InquirySummary> {
    try {
      const allInquiries = await this.getBuyerInquiries(artisanId);

      const summary: InquirySummary = {
        total: allInquiries.length,
        new: allInquiries.filter(i => i.status === 'new').length,
        responded: allInquiries.filter(i => i.status === 'responded').length,
        converted: allInquiries.filter(i => i.status === 'converted').length,
        urgent: allInquiries.filter(i => i.priority === 'urgent').length,
        recentInquiries: allInquiries.slice(0, 5),
        topBuyers: this.calculateTopBuyers(allInquiries),
      };

      return summary;
    } catch (error) {
      console.error('Error generating inquiry summary:', error);
      throw new Error('Failed to generate inquiry summary');
    }
  }

  /**
   * Get a specific inquiry by ID
   */
  async getInquiryById(inquiryId: string): Promise<BuyerInquiry | null> {
    try {
      // Query database for specific inquiry
      const inquiry = await this.fetchInquiryFromDatabase(inquiryId);
      return inquiry;
    } catch (error) {
      console.error('Error fetching inquiry:', error);
      throw new Error('Failed to fetch inquiry');
    }
  }

  // ============================================================================
  // BUYER PROFILES (Requirement 14.3)
  // ============================================================================

  /**
   * Retrieve buyer profile information
   */
  async getBuyerProfile(buyerId: string): Promise<BuyerProfile | null> {
    try {
      // Fetch buyer profile from database
      const profile = await this.fetchBuyerProfileFromDatabase(buyerId);
      return profile;
    } catch (error) {
      console.error('Error fetching buyer profile:', error);
      throw new Error('Failed to fetch buyer profile');
    }
  }

  /**
   * Get multiple buyer profiles
   */
  async getBuyerProfiles(buyerIds: string[]): Promise<BuyerProfile[]> {
    try {
      const profiles = await Promise.all(
        buyerIds.map(id => this.getBuyerProfile(id))
      );

      return profiles.filter(p => p !== null) as BuyerProfile[];
    } catch (error) {
      console.error('Error fetching buyer profiles:', error);
      throw new Error('Failed to fetch buyer profiles');
    }
  }

  // ============================================================================
  // BUYER MATCHING (Requirement 14.3)
  // ============================================================================

  /**
   * Get buyer matching suggestions for an artisan
   */
  async getBuyerMatchingSuggestions(
    artisanId: string,
    limit: number = 5
  ): Promise<BuyerMatch[]> {
    try {
      // Get artisan profile and products
      const artisanProfile = await firestoreRepository.getArtisanProfile(artisanId);
      const products = await firestoreRepository.getArtisanProducts(artisanId);

      // Find potential buyer matches
      const potentialBuyers = await this.findPotentialBuyers(artisanProfile, products);

      // Calculate match scores and create suggestions
      const matches: BuyerMatch[] = [];

      for (const buyer of potentialBuyers.slice(0, limit)) {
        const matchScore = this.calculateMatchScore(artisanProfile, products, buyer);
        const compatibility = this.calculateCompatibility(artisanProfile, products, buyer);
        const recommendedProducts = this.getRecommendedProducts(products, buyer);

        matches.push({
          buyer,
          matchScore,
          matchReasons: this.generateMatchReasons(artisanProfile, buyer, compatibility),
          potentialValue: this.estimatePotentialValue(buyer, products),
          compatibility,
          recommendedProducts,
          suggestedApproach: this.generateSuggestedApproach(buyer, matchScore),
        });
      }

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return matches;
    } catch (error) {
      console.error('Error generating buyer matching suggestions:', error);
      throw new Error('Failed to generate buyer matching suggestions');
    }
  }

  /**
   * Find buyers interested in specific product categories
   */
  async findInterestedBuyers(
    categories: string[],
    limit: number = 10
  ): Promise<BuyerProfile[]> {
    try {
      const buyers = await this.searchBuyersByInterests(categories);
      return buyers.slice(0, limit);
    } catch (error) {
      console.error('Error finding interested buyers:', error);
      throw new Error('Failed to find interested buyers');
    }
  }

  // ============================================================================
  // RESPONSE TEMPLATES (Requirement 14.3)
  // ============================================================================

  /**
   * Draft response template for an inquiry
   */
  async draftResponseTemplate(inquiryId: string): Promise<ResponseTemplate> {
    try {
      const inquiry = await this.getInquiryById(inquiryId);
      
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // Get artisan profile for context
      const artisanProfile = await firestoreRepository.getArtisanProfile(inquiry.artisanId);

      // Generate response template
      const template = this.generateResponseTemplate(inquiry, artisanProfile);

      return template;
    } catch (error) {
      console.error('Error drafting response template:', error);
      throw new Error('Failed to draft response template');
    }
  }

  /**
   * Generate multiple response variations
   */
  async generateResponseVariations(
    inquiryId: string,
    count: number = 3
  ): Promise<ResponseTemplate[]> {
    try {
      const baseTemplate = await this.draftResponseTemplate(inquiryId);
      const variations: ResponseTemplate[] = [baseTemplate];

      // Generate variations with different tones
      const tones: Array<'formal' | 'friendly' | 'professional'> = ['formal', 'friendly', 'professional'];
      
      for (let i = 1; i < count && i < tones.length; i++) {
        const variation = { ...baseTemplate };
        variation.tone = tones[i];
        variation.template = this.adjustTemplateForTone(baseTemplate.template, tones[i]);
        variations.push(variation);
      }

      return variations;
    } catch (error) {
      console.error('Error generating response variations:', error);
      throw new Error('Failed to generate response variations');
    }
  }

  /**
   * Get quick summary for chatbot responses
   */
  async getQuickBuyerConnectSummary(artisanId: string): Promise<string> {
    try {
      const summary = await this.getInquirySummary(artisanId);
      const matches = await this.getBuyerMatchingSuggestions(artisanId, 3);

      let summaryText = '🤝 Buyer Connect Summary:\n\n';

      // Inquiries
      summaryText += '📬 Inquiries:\n';
      summaryText += `- Total: ${summary.total}\n`;
      summaryText += `- New: ${summary.new}\n`;
      summaryText += `- Urgent: ${summary.urgent}\n`;
      
      if (summary.new > 0) {
        summaryText += `\n⚠️ You have ${summary.new} new inquiries waiting for response!\n`;
      }

      // Recent inquiries
      if (summary.recentInquiries.length > 0) {
        summaryText += '\n📋 Recent Inquiries:\n';
        summary.recentInquiries.slice(0, 3).forEach(inquiry => {
          summaryText += `- ${inquiry.buyerName}: ${inquiry.inquiryType}\n`;
          summaryText += `  Status: ${inquiry.status}, Priority: ${inquiry.priority}\n`;
        });
      }

      // Buyer matches
      if (matches.length > 0) {
        summaryText += '\n💡 Potential Buyer Matches:\n';
        matches.slice(0, 3).forEach(match => {
          summaryText += `- ${match.buyer.name} (${match.matchScore}% match)\n`;
          summaryText += `  ${match.matchReasons[0]}\n`;
        });
      }

      return summaryText.trim();
    } catch (error) {
      console.error('Error generating quick buyer connect summary:', error);
      return 'Unable to fetch buyer connect information at this time.';
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async fetchInquiriesFromDatabase(
    artisanId: string,
    filters?: any
  ): Promise<BuyerInquiry[]> {
    // Mock implementation - replace with actual database query
    // This would query Firestore collection: buyer_inquiries
    return [];
  }

  private async fetchInquiryFromDatabase(inquiryId: string): Promise<BuyerInquiry | null> {
    // Mock implementation - replace with actual database query
    return null;
  }

  private async fetchBuyerProfileFromDatabase(buyerId: string): Promise<BuyerProfile | null> {
    // Mock implementation - replace with actual database query
    // This would query Firestore collection: users where role = 'buyer'
    return null;
  }

  private async findPotentialBuyers(artisanProfile: any, products: any[]): Promise<BuyerProfile[]> {
    // Mock implementation - replace with actual matching algorithm
    // This would use intelligent matching to find compatible buyers
    return [];
  }

  private async searchBuyersByInterests(categories: string[]): Promise<BuyerProfile[]> {
    // Mock implementation - replace with actual search
    return [];
  }

  private calculateTopBuyers(inquiries: BuyerInquiry[]): InquirySummary['topBuyers'] {
    const buyerStats = new Map<string, { name: string; count: number; converted: number }>();

    inquiries.forEach(inquiry => {
      const existing = buyerStats.get(inquiry.buyerId) || {
        name: inquiry.buyerName,
        count: 0,
        converted: 0,
      };

      existing.count++;
      if (inquiry.status === 'converted') {
        existing.converted++;
      }

      buyerStats.set(inquiry.buyerId, existing);
    });

    return Array.from(buyerStats.entries())
      .map(([buyerId, stats]) => ({
        buyerId,
        buyerName: stats.name,
        inquiryCount: stats.count,
        conversionRate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.inquiryCount - a.inquiryCount)
      .slice(0, 5);
  }

  private calculateMatchScore(artisanProfile: any, products: any[], buyer: BuyerProfile): number {
    // Simplified match score calculation
    let score = 0;

    // Location match (30%)
    if (artisanProfile.location?.state === buyer.location.state) {
      score += 30;
    } else if (artisanProfile.location?.country === buyer.location.country) {
      score += 15;
    }

    // Interest match (40%)
    const artisanCategories = products.map(p => p.category?.toLowerCase() || '');
    const matchingInterests = buyer.interests.filter(interest =>
      artisanCategories.some(cat => cat.includes(interest.toLowerCase()))
    );
    score += (matchingInterests.length / Math.max(buyer.interests.length, 1)) * 40;

    // Price compatibility (30%)
    const avgProductPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;
    if (avgProductPrice >= buyer.preferences.priceRange.min && 
        avgProductPrice <= buyer.preferences.priceRange.max) {
      score += 30;
    } else if (avgProductPrice < buyer.preferences.priceRange.max * 1.2) {
      score += 15;
    }

    return Math.round(score);
  }

  private calculateCompatibility(artisanProfile: any, products: any[], buyer: BuyerProfile) {
    return {
      productMatch: this.calculateProductMatch(products, buyer),
      priceMatch: this.calculatePriceMatch(products, buyer),
      locationMatch: this.calculateLocationMatch(artisanProfile, buyer),
      styleMatch: this.calculateStyleMatch(products, buyer),
    };
  }

  private calculateProductMatch(products: any[], buyer: BuyerProfile): number {
    const categories = products.map(p => p.category?.toLowerCase() || '');
    const matches = buyer.interests.filter(interest =>
      categories.some(cat => cat.includes(interest.toLowerCase()))
    );
    return Math.round((matches.length / Math.max(buyer.interests.length, 1)) * 100);
  }

  private calculatePriceMatch(products: any[], buyer: BuyerProfile): number {
    const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;
    const { min, max } = buyer.preferences.priceRange;
    
    if (avgPrice >= min && avgPrice <= max) return 100;
    if (avgPrice < min) return Math.round((avgPrice / min) * 100);
    if (avgPrice > max) return Math.round((max / avgPrice) * 100);
    return 50;
  }

  private calculateLocationMatch(artisanProfile: any, buyer: BuyerProfile): number {
    if (artisanProfile.location?.state === buyer.location.state) return 100;
    if (artisanProfile.location?.country === buyer.location.country) return 60;
    return 30;
  }

  private calculateStyleMatch(products: any[], buyer: BuyerProfile): number {
    // Simplified style matching - would use ML in production
    return 70;
  }

  private getRecommendedProducts(products: any[], buyer: BuyerProfile) {
    return products
      .filter(p => {
        const price = p.price || 0;
        return price >= buyer.preferences.priceRange.min && 
               price <= buyer.preferences.priceRange.max;
      })
      .slice(0, 3)
      .map(p => ({
        productId: p.id,
        productName: p.name,
        matchScore: 85,
        reason: `Matches buyer's interest in ${p.category}`,
      }));
  }

  private generateMatchReasons(artisanProfile: any, buyer: BuyerProfile, compatibility: any): string[] {
    const reasons: string[] = [];

    if (compatibility.productMatch > 70) {
      reasons.push('Strong product category match');
    }

    if (compatibility.priceMatch > 80) {
      reasons.push('Price range aligns with buyer budget');
    }

    if (compatibility.locationMatch > 80) {
      reasons.push('Same location - easier logistics');
    }

    if (buyer.reputation.rating >= 4.0) {
      reasons.push('Highly rated buyer with good reputation');
    }

    if (buyer.purchaseHistory.totalOrders > 10) {
      reasons.push('Experienced buyer with purchase history');
    }

    return reasons.length > 0 ? reasons : ['Potential match based on profile'];
  }

  private estimatePotentialValue(buyer: BuyerProfile, products: any[]): number {
    const avgProductPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;
    const estimatedOrders = Math.min(buyer.purchaseHistory.totalOrders / 10, 5);
    return Math.round(avgProductPrice * estimatedOrders);
  }

  private generateSuggestedApproach(buyer: BuyerProfile, matchScore: number): string {
    if (matchScore >= 80) {
      return 'Reach out proactively with your best products. High compatibility suggests strong potential.';
    } else if (matchScore >= 60) {
      return 'Send a personalized introduction highlighting products matching their interests.';
    } else {
      return 'Consider reaching out if you have products that specifically match their needs.';
    }
  }

  private generateResponseTemplate(inquiry: BuyerInquiry, artisanProfile: any): ResponseTemplate {
    const greeting = `Dear ${inquiry.buyerName},`;
    const introduction = `Thank you for your interest in ${inquiry.productName || 'our products'}.`;
    
    let body = '';
    switch (inquiry.inquiryType) {
      case 'product':
        body = `I would be happy to provide more details about this product. `;
        break;
      case 'custom_order':
        body = `I specialize in custom orders and would love to create something unique for you. `;
        break;
      case 'bulk_order':
        body = `I can accommodate bulk orders and offer competitive pricing for larger quantities. `;
        break;
      default:
        body = `I would be delighted to assist you with your requirements. `;
    }

    const pricing = inquiry.budget 
      ? `Based on your budget range, I can offer options that meet your needs. `
      : `I can provide detailed pricing information upon request. `;

    const closing = `Please let me know if you have any specific questions or requirements.\n\nBest regards,\n${artisanProfile.name}`;

    const template = `${greeting}\n\n${introduction} ${body}${pricing}\n\n${closing}`;

    return {
      inquiryId: inquiry.id,
      template,
      tone: 'professional',
      keyPoints: [
        'Acknowledge inquiry',
        'Express interest',
        'Mention relevant capabilities',
        'Invite further discussion',
      ],
      suggestedPricing: inquiry.budget ? {
        basePrice: (inquiry.budget.min + inquiry.budget.max) / 2,
        negotiationRange: {
          min: inquiry.budget.min,
          max: inquiry.budget.max,
        },
      } : undefined,
      nextSteps: [
        'Send response within 24 hours',
        'Follow up if no reply in 3 days',
        'Prepare product samples or portfolio',
      ],
      estimatedResponseTime: '24 hours',
    };
  }

  private adjustTemplateForTone(template: string, tone: 'formal' | 'friendly' | 'professional'): string {
    // Simple tone adjustment - would use NLP in production
    switch (tone) {
      case 'formal':
        return template.replace(/I would/g, 'I should').replace(/happy/g, 'pleased');
      case 'friendly':
        return template.replace(/Dear/g, 'Hi').replace(/Best regards/g, 'Warm regards');
      default:
        return template;
    }
  }
}

export const buyerConnectIntegration = BuyerConnectIntegration.getInstance();
