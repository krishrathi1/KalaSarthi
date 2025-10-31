/**
 * Firestore Data Access Layer for Artisan Buddy
 * 
 * Provides repositories for accessing user profiles, products, and sales data
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  ArtisanProfile,
  Product,
  SalesMetrics,
  InventoryStatus,
  SchemeRecommendation,
  BuyerConnection,
  Location,
} from '@/lib/types/artisan-buddy';

export class FirestoreRepository {
  private static instance: FirestoreRepository;

  private constructor() {}

  public static getInstance(): FirestoreRepository {
    if (!FirestoreRepository.instance) {
      FirestoreRepository.instance = new FirestoreRepository();
    }
    return FirestoreRepository.instance;
  }

  // ============================================================================
  // User Profile Repository
  // ============================================================================

  async getUserProfile(userId: string): Promise<ArtisanProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      
      return {
        id: userDoc.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        profession: data.profile?.profession || '',
        specializations: data.profile?.specializations || [],
        location: data.profile?.location || { city: '', state: '', country: 'India' },
        experience: data.profile?.experience || 0,
        certifications: data.profile?.certifications || [],
        languages: data.profile?.languages || ['en'],
        bio: data.profile?.bio,
        profileImage: data.profile?.profileImage,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // ============================================================================
  // Product Repository
  // ============================================================================

  async getArtisanProducts(artisanId: string): Promise<Product[]> {
    try {
      const productsQuery = query(
        collection(db, 'products'),
        where('artisanId', '==', artisanId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(productsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        artisanId: doc.data().artisanId,
        name: doc.data().name,
        description: doc.data().description,
        category: doc.data().category,
        craftType: doc.data().craftType,
        materials: doc.data().materials || [],
        price: doc.data().price,
        currency: doc.data().currency || 'INR',
        images: doc.data().images || [],
        inventory: doc.data().inventory || 0,
        status: doc.data().status || 'active',
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      
      if (!productDoc.exists()) {
        return null;
      }

      const data = productDoc.data();
      
      return {
        id: productDoc.id,
        artisanId: data.artisanId,
        name: data.name,
        description: data.description,
        category: data.category,
        craftType: data.craftType,
        materials: data.materials || [],
        price: data.price,
        currency: data.currency || 'INR',
        images: data.images || [],
        inventory: data.inventory || 0,
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // ============================================================================
  // Sales Data Repository
  // ============================================================================

  async getSalesMetrics(artisanId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<SalesMetrics> {
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Query sales data
      const salesQuery = query(
        collection(db, 'sales'),
        where('artisanId', '==', artisanId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(salesQuery);
      
      let totalSales = 0;
      let totalRevenue = 0;
      const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
      const dailySales: Record<string, { sales: number; revenue: number }> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalSales++;
        totalRevenue += data.amount || 0;

        // Track product sales
        const productId = data.productId;
        const productName = data.productName || 'Unknown';
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, count: 0, revenue: 0 };
        }
        productSales[productId].count++;
        productSales[productId].revenue += data.amount || 0;

        // Track daily sales
        const date = data.createdAt?.toDate().toISOString().split('T')[0] || '';
        if (!dailySales[date]) {
          dailySales[date] = { sales: 0, revenue: 0 };
        }
        dailySales[date].sales++;
        dailySales[date].revenue += data.amount || 0;
      });

      // Get top products
      const topProducts = Object.entries(productSales)
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          salesCount: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get sales trend
      const salesTrend = Object.entries(dailySales)
        .map(([date, data]) => ({
          date,
          sales: data.sales,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalSales,
        totalRevenue,
        averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
        topProducts,
        salesTrend,
        period,
      };
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        topProducts: [],
        salesTrend: [],
        period,
      };
    }
  }

  // ============================================================================
  // Inventory Repository
  // ============================================================================

  async getInventoryStatus(artisanId: string): Promise<InventoryStatus> {
    try {
      const products = await this.getArtisanProducts(artisanId);
      
      const lowStockThreshold = 5;
      const lowStockProducts = products
        .filter(p => p.inventory > 0 && p.inventory <= lowStockThreshold)
        .map(p => ({
          productId: p.id,
          productName: p.name,
          currentStock: p.inventory,
          reorderLevel: lowStockThreshold,
        }));

      const outOfStockProducts = products
        .filter(p => p.inventory === 0)
        .map(p => p.name);

      const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.inventory), 0);

      return {
        totalProducts: products.length,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue,
      };
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      return {
        totalProducts: 0,
        lowStockProducts: [],
        outOfStockProducts: [],
        totalInventoryValue: 0,
      };
    }
  }

  // ============================================================================
  // Scheme Repository
  // ============================================================================

  async getSchemeRecommendations(artisanId: string): Promise<SchemeRecommendation[]> {
    try {
      const profile = await this.getUserProfile(artisanId);
      if (!profile) {
        return [];
      }

      // Query schemes that match artisan's profile
      const schemesQuery = query(
        collection(db, 'schemes'),
        where('status', '==', 'active'),
        limit(10)
      );

      const snapshot = await getDocs(schemesQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Calculate match score based on eligibility
        let matchScore = 0.5;
        if (data.targetProfessions?.includes(profile.profession)) {
          matchScore += 0.3;
        }
        if (data.targetStates?.includes(profile.location.state)) {
          matchScore += 0.2;
        }

        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          eligibility: data.eligibility || [],
          benefits: data.benefits || [],
          applicationDeadline: data.applicationDeadline?.toDate(),
          matchScore: Math.min(matchScore, 1.0),
        };
      }).sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error fetching scheme recommendations:', error);
      return [];
    }
  }

  // ============================================================================
  // Buyer Connection Repository
  // ============================================================================

  async getBuyerConnections(artisanId: string): Promise<BuyerConnection[]> {
    try {
      const connectionsQuery = query(
        collection(db, 'buyer_connections'),
        where('artisanId', '==', artisanId),
        orderBy('lastContact', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(connectionsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          buyerName: data.buyerName,
          buyerLocation: data.buyerLocation,
          interestedProducts: data.interestedProducts || [],
          lastContact: data.lastContact?.toDate() || new Date(),
          status: data.status || 'pending',
        };
      });
    } catch (error) {
      console.error('Error fetching buyer connections:', error);
      return [];
    }
  }
}

export const firestoreRepository = FirestoreRepository.getInstance();
