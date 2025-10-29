/**
 * Enhanced DigitalKhata Firestore Type Definitions
 * Defines all document interfaces for the enhanced financial tracking system
 */

import { Timestamp } from 'firebase/firestore';

// Base interface for all Firestore documents
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Sales Events Collection
export interface SalesEvent extends FirestoreDocument {
  artisanId: string;
  productId: string;
  productName: string;
  category: string;
  buyerId?: string;
  buyerName?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  channel: 'web' | 'mobile' | 'marketplace' | 'direct';
  timestamp: Timestamp;
  metadata: {
    orderId?: string;
    transactionId?: string;
    location?: string;
    notes?: string;
  };
}

// Expenses Collection
export interface ExpenseRecord extends FirestoreDocument {
  artisanId: string;
  category: 'materials' | 'tools' | 'marketing' | 'shipping' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: Timestamp;
  receiptUrl?: string;
  vendor?: string;
  isRecurring: boolean;
  tags: string[];
}

// Sales Aggregates Collection
export interface SalesAggregate extends FirestoreDocument {
  artisanId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodKey: string;
  startDate: Timestamp;
  endDate: Timestamp;
  metrics: {
    totalRevenue: number;
    totalUnits: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
      units: number;
    }>;
  };
  lastUpdated: Timestamp;
}

// Product Performance Collection
export interface ProductPerformance extends FirestoreDocument {
  artisanId: string;
  productId: string;
  productName: string;
  category: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodKey: string;
  metrics: {
    totalRevenue: number;
    totalUnits: number;
    totalOrders: number;
    averagePrice: number;
    growthRate: number;
    rank: number;
  };
}

// Enhanced User Profile (extending existing user interface)
export interface EnhancedArtisanProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: 'artisan' | 'buyer' | 'admin';
  artisticProfession: string;
  description: string;
  profileImage: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessInfo?: {
    gstNumber?: string;
    businessName?: string;
    establishedYear?: number;
    specializations?: string[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Enhanced Product (extending existing product interface)
export interface EnhancedProduct extends FirestoreDocument {
  artisanId: string;
  artisanName: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  materials: string[];
  dimensions: string;
  weight: string;
  customizable: boolean;
  inStock: boolean;
  craftingTime: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  shippingInfo: {
    freeShipping: boolean;
    estimatedDays: number;
    shippingCost: number;
  };
}

// Real-time Dashboard Data
export interface DashboardMetrics {
  artisanId: string;
  currentPeriod: {
    revenue: number;
    orders: number;
    units: number;
    averageOrderValue: number;
  };
  previousPeriod: {
    revenue: number;
    orders: number;
    units: number;
    averageOrderValue: number;
  };
  growthRates: {
    revenue: number;
    orders: number;
    units: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    units: number;
  }>;
  lastUpdated: Timestamp;
}

// Historical Data Generation Patterns
export interface SalesPattern {
  pattern: 'seasonal_growth' | 'steady' | 'declining' | 'volatile';
  baseMonthlyRevenue: number;
  growthRate: number;
  seasonalMultipliers: {
    jan: number;
    feb: number;
    mar: number;
    apr: number;
    may: number;
    jun: number;
    jul: number;
    aug: number;
    sep: number;
    oct: number;
    nov: number;
    dec: number;
  };
  productMix: {
    [category: string]: number;
  };
}

// API Response Types
export interface SalesDataResponse {
  success: boolean;
  data: SalesEvent[];
  summary: {
    totalRevenue: number;
    totalUnits: number;
    totalOrders: number;
    averageOrderValue: number;
    growthRate: number;
  };
  metadata: {
    resolution: string;
    timeRange: string;
    dataPoints: number;
    lastUpdated: Timestamp;
    cacheStatus: 'fresh' | 'stale';
  };
}

export interface ProductPerformanceResponse {
  success: boolean;
  data: {
    products: ProductPerformance[];
  };
}

// Validation Result Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Connection State Types
export type ConnectionState = 'online' | 'offline' | 'reconnecting';

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: 'revenue' | 'sales_count' | 'top_products' | 'trends' | 'expenses' | 'profit';
  title: string;
  data: any;
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
}

// Real-time Subscription Types
export interface RealtimeSubscription {
  id: string;
  collection: string;
  query: any;
  callback: (data: any) => void;
  unsubscribe: () => void;
}