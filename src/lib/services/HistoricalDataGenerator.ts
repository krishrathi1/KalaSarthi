/**
 * Historical Data Generator for Enhanced DigitalKhata
 * Generates comprehensive historical data for Dev Bulchandani and other artisans
 */

import { Timestamp } from 'firebase/firestore';
import { firestoreService } from './FirestoreService';
import {
  EnhancedArtisanProfile,
  EnhancedProduct,
  SalesEvent,
  ExpenseRecord,
  SalesPattern
} from '@/lib/types/firestore';

export class HistoricalDataGenerator {
  private static instance: HistoricalDataGenerator;

  private constructor() {}

  public static getInstance(): HistoricalDataGenerator {
    if (!HistoricalDataGenerator.instance) {
      HistoricalDataGenerator.instance = new HistoricalDataGenerator();
    }
    return HistoricalDataGenerator.instance;
  }

  // Generate Dev Bulchandani's complete profile
  async generateDevBulchandaniProfile(): Promise<void> {
    console.log('🎨 Generating Dev Bulchandani artisan profile...');

    const devBulchandaniProfile: EnhancedArtisanProfile = {
      uid: 'dev_bulchandani_001',
      email: 'dev.bulchandani@example.com',
      name: 'Dev Bulchandani',
      phone: '+91-9876543299',
      role: 'artisan',
      artisticProfession: 'woodworking',
      description: 'Master craftsman specializing in traditional and contemporary wooden furniture, doors, and decorative items with 15+ years of experience. Known for exceptional quality and innovative designs that blend traditional Rajasthani craftsmanship with modern aesthetics.',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      address: {
        street: 'Craftsman Colony, Workshop Lane, Sector 12',
        city: 'Jodhpur',
        state: 'Rajasthan',
        zipCode: '342001',
        country: 'India'
      },
      businessInfo: {
        gstNumber: '08ABCDE1234F1Z5',
        businessName: 'Bulchandani Woodworks',
        establishedYear: 2009,
        specializations: ['furniture', 'doors', 'decorative_items', 'custom_woodwork', 'restoration']
      },
      createdAt: Timestamp.fromDate(new Date('2023-01-15')),
      updatedAt: Timestamp.now()
    };

    await firestoreService.createUser(devBulchandaniProfile);
    console.log('✅ Dev Bulchandani profile created successfully');
  }

  // Generate comprehensive product catalog for Dev Bulchandani
  async generateDevBulchandaniProducts(): Promise<void> {
    console.log('🛍️ Generating Dev Bulchandani product catalog...');

    const products: Omit<EnhancedProduct, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'dev_bulchandani_product_1',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Handcrafted Teak Dining Table',
        description: 'Premium teak wood dining table with traditional joinery techniques, seats 6 people comfortably. Features intricate carved legs and a smooth, durable finish that highlights the natural wood grain.',
        price: 45000,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'
        ],
        category: 'furniture',
        materials: ['teak_wood', 'brass_hardware', 'natural_finish'],
        dimensions: '180cm x 90cm x 75cm',
        weight: '65kg',
        customizable: true,
        inStock: true,
        craftingTime: '25-30 days',
        tags: ['dining_table', 'teak', 'handcrafted', 'traditional', 'premium'],
        rating: 4.8,
        reviewCount: 23,
        featured: true,
        shippingInfo: {
          freeShipping: true,
          estimatedDays: 7,
          shippingCost: 0
        }
      },
      {
        id: 'dev_bulchandani_product_2',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Carved Wooden Door Set',
        description: 'Traditional Rajasthani carved wooden doors with brass fittings, perfect for heritage homes. Features intricate peacock and floral motifs with antique brass hardware.',
        price: 85000,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
        ],
        category: 'doors',
        materials: ['sheesham_wood', 'brass_fittings', 'traditional_carving'],
        dimensions: '210cm x 120cm x 5cm (pair)',
        weight: '120kg',
        customizable: true,
        inStock: false,
        craftingTime: '40-45 days',
        tags: ['doors', 'carved', 'traditional', 'rajasthani', 'heritage'],
        rating: 4.9,
        reviewCount: 15,
        featured: true,
        shippingInfo: {
          freeShipping: true,
          estimatedDays: 10,
          shippingCost: 0
        }
      },
      {
        id: 'dev_bulchandani_product_3',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Wooden Coffee Table with Storage',
        description: 'Contemporary coffee table with hidden storage compartments. Made from sustainable mango wood with a rich walnut finish.',
        price: 18000,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'
        ],
        category: 'furniture',
        materials: ['mango_wood', 'walnut_finish', 'soft_close_hinges'],
        dimensions: '120cm x 60cm x 45cm',
        weight: '25kg',
        customizable: true,
        inStock: true,
        craftingTime: '15-20 days',
        tags: ['coffee_table', 'storage', 'contemporary', 'mango_wood'],
        rating: 4.6,
        reviewCount: 31,
        featured: false,
        shippingInfo: {
          freeShipping: true,
          estimatedDays: 5,
          shippingCost: 0
        }
      },
      {
        id: 'dev_bulchandani_product_4',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Decorative Wall Shelf Set',
        description: 'Set of 3 floating wall shelves with traditional Rajasthani motifs. Perfect for displaying decorative items and books.',
        price: 8500,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'
        ],
        category: 'decorative_items',
        materials: ['pine_wood', 'carved_details', 'wall_brackets'],
        dimensions: 'Large: 80cm, Medium: 60cm, Small: 40cm',
        weight: '8kg (set)',
        customizable: true,
        inStock: true,
        craftingTime: '10-12 days',
        tags: ['wall_shelf', 'decorative', 'floating', 'set_of_3'],
        rating: 4.4,
        reviewCount: 18,
        featured: false,
        shippingInfo: {
          freeShipping: false,
          estimatedDays: 4,
          shippingCost: 250
        }
      },
      {
        id: 'dev_bulchandani_product_5',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Custom Wooden Wardrobe',
        description: 'Large custom wardrobe with multiple compartments, drawers, and hanging space. Made to order with premium quality wood and fittings.',
        price: 125000,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop'
        ],
        category: 'furniture',
        materials: ['teak_wood', 'plywood_backing', 'premium_hardware'],
        dimensions: '240cm x 60cm x 220cm',
        weight: '180kg',
        customizable: true,
        inStock: false,
        craftingTime: '45-60 days',
        tags: ['wardrobe', 'custom', 'large', 'storage', 'premium'],
        rating: 4.9,
        reviewCount: 8,
        featured: true,
        shippingInfo: {
          freeShipping: true,
          estimatedDays: 14,
          shippingCost: 0
        }
      },
      {
        id: 'dev_bulchandani_product_6',
        artisanId: 'dev_bulchandani_001',
        artisanName: 'Dev Bulchandani',
        name: 'Wooden Study Desk',
        description: 'Ergonomic study desk with built-in drawers and cable management. Perfect for home office or student use.',
        price: 22000,
        currency: 'INR',
        images: [
          'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=400&fit=crop'
        ],
        category: 'furniture',
        materials: ['oak_wood', 'metal_legs', 'drawer_slides'],
        dimensions: '140cm x 70cm x 75cm',
        weight: '35kg',
        customizable: true,
        inStock: true,
        craftingTime: '18-22 days',
        tags: ['study_desk', 'office', 'ergonomic', 'drawers'],
        rating: 4.5,
        reviewCount: 27,
        featured: false,
        shippingInfo: {
          freeShipping: true,
          estimatedDays: 6,
          shippingCost: 0
        }
      }
    ];

    // Create products with timestamps
    for (const product of products) {
      const productWithTimestamps: EnhancedProduct = {
        ...product,
        createdAt: Timestamp.fromDate(new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)), // Random date within last year
        updatedAt: Timestamp.now()
      };
      
      await firestoreService.createProduct(productWithTimestamps);
    }

    console.log(`✅ Generated ${products.length} products for Dev Bulchandani`);
  }

  // Generate realistic sales patterns
  private generateSalesPattern(): SalesPattern {
    return {
      pattern: 'seasonal_growth',
      baseMonthlyRevenue: 180000, // Base monthly revenue for Dev Bulchandani
      growthRate: 0.12, // 12% annual growth
      seasonalMultipliers: {
        jan: 0.8,  // Post-holiday slowdown
        feb: 0.9,  // Valentine's Day boost
        mar: 1.1,  // Spring season
        apr: 1.2,  // Wedding season starts
        may: 1.0,  // Steady
        jun: 0.9,  // Summer slowdown
        jul: 0.8,  // Monsoon impact
        aug: 0.9,  // Festival preparations
        sep: 1.1,  // Post-monsoon recovery
        oct: 1.3,  // Festival season (Diwali)
        nov: 1.4,  // Wedding season peak
        dec: 1.2   // Holiday season
      },
      productMix: {
        furniture: 0.65,      // 65% furniture (main business)
        doors: 0.20,          // 20% doors (high value)
        decorative_items: 0.15 // 15% decorative items
      }
    };
  }

  // Generate buyer profiles for realistic transactions
  private generateBuyerProfiles(): Array<{id: string, name: string, type: 'individual' | 'business'}> {
    return [
      { id: 'buyer_hotel_001', name: 'Rajmahal Palace Hotel', type: 'business' },
      { id: 'buyer_individual_001', name: 'Priya Sharma', type: 'individual' },
      { id: 'buyer_individual_002', name: 'Amit Gupta', type: 'individual' },
      { id: 'buyer_business_001', name: 'Heritage Homes Pvt Ltd', type: 'business' },
      { id: 'buyer_individual_003', name: 'Sunita Agarwal', type: 'individual' },
      { id: 'buyer_business_002', name: 'Royal Interiors', type: 'business' },
      { id: 'buyer_individual_004', name: 'Vikram Singh', type: 'individual' },
      { id: 'buyer_individual_005', name: 'Meera Joshi', type: 'individual' },
      { id: 'buyer_business_003', name: 'Luxury Resorts Group', type: 'business' },
      { id: 'buyer_individual_006', name: 'Rahul Mehta', type: 'individual' }
    ];
  }

  // Get product by category for realistic sales distribution
  private getProductsByCategory(products: EnhancedProduct[]): {[key: string]: EnhancedProduct[]} {
    return products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {} as {[key: string]: EnhancedProduct[]});
  }

  // Generate random sales event
  private generateSalesEvent(
    products: EnhancedProduct[],
    buyers: Array<{id: string, name: string, type: 'individual' | 'business'}>,
    date: Date,
    pattern: SalesPattern
  ): Omit<SalesEvent, 'id' | 'createdAt' | 'updatedAt'> {
    const productsByCategory = this.getProductsByCategory(products);
    
    // Select category based on product mix
    const rand = Math.random();
    let selectedCategory = 'furniture';
    let cumulative = 0;
    
    for (const [category, percentage] of Object.entries(pattern.productMix)) {
      cumulative += percentage;
      if (rand <= cumulative) {
        selectedCategory = category;
        break;
      }
    }

    // Select random product from category
    const categoryProducts = productsByCategory[selectedCategory] || products;
    const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
    
    // Select random buyer
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    
    // Generate quantity (business buyers tend to order more)
    const quantity = buyer.type === 'business' 
      ? Math.floor(Math.random() * 3) + 1  // 1-3 for business
      : 1; // Usually 1 for individuals
    
    // Add some price variation (±10%)
    const priceVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    const unitPrice = Math.round(product.price * priceVariation);
    const totalAmount = unitPrice * quantity;

    // Payment methods distribution
    const paymentMethods = ['bank_transfer', 'upi', 'cash', 'card'];
    const paymentWeights = [0.4, 0.3, 0.2, 0.1]; // Bank transfer most common for high-value items
    
    let paymentMethod = 'bank_transfer';
    const paymentRand = Math.random();
    let paymentCumulative = 0;
    
    for (let i = 0; i < paymentMethods.length; i++) {
      paymentCumulative += paymentWeights[i];
      if (paymentRand <= paymentCumulative) {
        paymentMethod = paymentMethods[i];
        break;
      }
    }

    // Channel distribution
    const channels: Array<'web' | 'mobile' | 'marketplace' | 'direct'> = ['web', 'mobile', 'marketplace', 'direct'];
    const channelWeights = [0.4, 0.2, 0.1, 0.3]; // Direct sales common for custom furniture
    
    let channel: 'web' | 'mobile' | 'marketplace' | 'direct' = 'web';
    const channelRand = Math.random();
    let channelCumulative = 0;
    
    for (let i = 0; i < channels.length; i++) {
      channelCumulative += channelWeights[i];
      if (channelRand <= channelCumulative) {
        channel = channels[i];
        break;
      }
    }

    return {
      artisanId: 'dev_bulchandani_001',
      productId: product.id,
      productName: product.name,
      category: product.category,
      buyerId: buyer.id,
      buyerName: buyer.name,
      quantity,
      unitPrice,
      totalAmount,
      currency: 'INR',
      paymentStatus: Math.random() > 0.05 ? 'completed' : 'pending', // 95% completed
      paymentMethod,
      channel,
      timestamp: Timestamp.fromDate(date),
      metadata: {
        orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        location: 'Jodhpur, Rajasthan',
        notes: buyer.type === 'business' ? 'Bulk order for commercial project' : 'Custom order as per specifications'
      }
    };
  }

  // Main method to generate all data for Dev Bulchandani
  async generateCompleteDataForDevBulchandani(): Promise<void> {
    try {
      console.log('🚀 Starting complete data generation for Dev Bulchandani...');
      
      // Step 1: Generate profile
      await this.generateDevBulchandaniProfile();
      
      // Step 2: Generate products
      await this.generateDevBulchandaniProducts();
      
      console.log('✅ Dev Bulchandani profile and products generated successfully!');
      
    } catch (error) {
      console.error('❌ Error generating Dev Bulchandani data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const historicalDataGenerator = HistoricalDataGenerator.getInstance();