/**
 * Enhanced DigitalKhata Firestore Service
 * Handles all Firestore operations for the enhanced financial tracking system
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  writeBatch,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SalesEvent,
  ExpenseRecord,
  SalesAggregate,
  ProductPerformance,
  DashboardMetrics,
  EnhancedArtisanProfile,
  EnhancedProduct,
  ValidationResult,
  RealtimeSubscription
} from '@/lib/types/firestore';

export class FirestoreService {
  private static instance: FirestoreService;
  private subscriptions: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Collection References
  private get salesEventsCollection() {
    return collection(db, 'sales_events');
  }

  private get expensesCollection() {
    return collection(db, 'expenses');
  }

  private get salesAggregatesCollection() {
    return collection(db, 'sales_aggregates');
  }

  private get productPerformanceCollection() {
    return collection(db, 'product_performance');
  }

  private get dashboardMetricsCollection() {
    return collection(db, 'dashboard_metrics');
  }

  private get usersCollection() {
    return collection(db, 'users');
  }

  private get productsCollection() {
    return collection(db, 'products');
  }

  // Sales Events Operations
  async createSalesEvent(salesEvent: Omit<SalesEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = doc(this.salesEventsCollection);
    const now = Timestamp.now();
    
    const eventData: SalesEvent = {
      ...salesEvent,
      id: docRef.id,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, eventData);
    return docRef.id;
  }

  async getSalesEvents(
    artisanId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
      paymentStatus?: string;
      limit?: number;
    }
  ): Promise<SalesEvent[]> {
    const constraints: QueryConstraint[] = [
      where('artisanId', '==', artisanId),
      orderBy('timestamp', 'desc')
    ];

    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters?.paymentStatus) {
      constraints.push(where('paymentStatus', '==', filters.paymentStatus));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(this.salesEventsCollection, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as SalesEvent);
  }

  // Real-time Sales Events Subscription
  subscribeToSalesEvents(
    artisanId: string,
    callback: (events: SalesEvent[]) => void,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
    }
  ): string {
    const constraints: QueryConstraint[] = [
      where('artisanId', '==', artisanId),
      orderBy('timestamp', 'desc'),
      limit(50) // Limit for real-time performance
    ];

    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    const q = query(this.salesEventsCollection, ...constraints);
    const subscriptionId = `sales_events_${artisanId}_${Date.now()}`;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => doc.data() as SalesEvent);
      callback(events);
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return subscriptionId;
  }

  // Expense Operations
  async createExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = doc(this.expensesCollection);
    const now = Timestamp.now();
    
    const expenseData: ExpenseRecord = {
      ...expense,
      id: docRef.id,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, expenseData);
    return docRef.id;
  }

  async getExpenses(
    artisanId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
      limit?: number;
    }
  ): Promise<ExpenseRecord[]> {
    const constraints: QueryConstraint[] = [
      where('artisanId', '==', artisanId),
      orderBy('date', 'desc')
    ];

    if (filters?.startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(this.expensesCollection, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as ExpenseRecord);
  }

  async updateExpense(expenseId: string, updates: Partial<ExpenseRecord>): Promise<void> {
    const docRef = doc(this.expensesCollection, expenseId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const docRef = doc(this.expensesCollection, expenseId);
    await deleteDoc(docRef);
  }

  // Sales Aggregates Operations
  async getSalesAggregates(
    artisanId: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    limit?: number
  ): Promise<SalesAggregate[]> {
    const constraints: QueryConstraint[] = [
      where('artisanId', '==', artisanId),
      where('periodType', '==', periodType),
      orderBy('startDate', 'desc')
    ];

    if (limit) {
      constraints.push(limit);
    }

    const q = query(this.salesAggregatesCollection, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as SalesAggregate);
  }

  // Real-time Aggregates Subscription
  subscribeToSalesAggregates(
    artisanId: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    callback: (aggregates: SalesAggregate[]) => void
  ): string {
    const q = query(
      this.salesAggregatesCollection,
      where('artisanId', '==', artisanId),
      where('periodType', '==', periodType),
      orderBy('startDate', 'desc'),
      limit(12) // Last 12 periods
    );

    const subscriptionId = `aggregates_${artisanId}_${periodType}_${Date.now()}`;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const aggregates = snapshot.docs.map(doc => doc.data() as SalesAggregate);
      callback(aggregates);
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return subscriptionId;
  }

  // Product Performance Operations
  async getProductPerformance(
    artisanId: string,
    periodType: 'daily' | 'weekly' | 'monthly' | 'yearly',
    limit?: number
  ): Promise<ProductPerformance[]> {
    const constraints: QueryConstraint[] = [
      where('artisanId', '==', artisanId),
      where('periodType', '==', periodType),
      orderBy('metrics.totalRevenue', 'desc')
    ];

    if (limit) {
      constraints.push(limit);
    }

    const q = query(this.productPerformanceCollection, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as ProductPerformance);
  }

  // Dashboard Metrics Operations
  async getDashboardMetrics(artisanId: string): Promise<DashboardMetrics | null> {
    const docRef = doc(this.dashboardMetricsCollection, artisanId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as DashboardMetrics;
    }
    
    return null;
  }

  // Real-time Dashboard Metrics Subscription
  subscribeToDashboardMetrics(
    artisanId: string,
    callback: (metrics: DashboardMetrics | null) => void
  ): string {
    const docRef = doc(this.dashboardMetricsCollection, artisanId);
    const subscriptionId = `dashboard_${artisanId}_${Date.now()}`;

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as DashboardMetrics);
      } else {
        callback(null);
      }
    });

    this.subscriptions.set(subscriptionId, unsubscribe);
    return subscriptionId;
  }

  // User Operations
  async createUser(user: EnhancedArtisanProfile): Promise<void> {
    const docRef = doc(this.usersCollection, user.uid);
    await setDoc(docRef, user);
  }

  async getUser(userId: string): Promise<EnhancedArtisanProfile | null> {
    const docRef = doc(this.usersCollection, userId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as EnhancedArtisanProfile;
    }
    
    return null;
  }

  async updateUser(userId: string, updates: Partial<EnhancedArtisanProfile>): Promise<void> {
    const docRef = doc(this.usersCollection, userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  // Product Operations
  async createProduct(product: EnhancedProduct): Promise<void> {
    const docRef = doc(this.productsCollection, product.id);
    await setDoc(docRef, product);
  }

  async getProductsByArtisan(artisanId: string): Promise<EnhancedProduct[]> {
    const q = query(
      this.productsCollection,
      where('artisanId', '==', artisanId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as EnhancedProduct);
  }

  // Batch Operations
  async batchCreateSalesEvents(events: Omit<SalesEvent, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    events.forEach(event => {
      const docRef = doc(this.salesEventsCollection);
      const eventData: SalesEvent = {
        ...event,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      };
      batch.set(docRef, eventData);
    });

    await batch.commit();
  }

  async batchCreateExpenses(expenses: Omit<ExpenseRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    expenses.forEach(expense => {
      const docRef = doc(this.expensesCollection);
      const expenseData: ExpenseRecord = {
        ...expense,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      };
      batch.set(docRef, expenseData);
    });

    await batch.commit();
  }

  // Subscription Management
  unsubscribe(subscriptionId: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  // Data Validation
  validateSalesEvent(event: Partial<SalesEvent>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!event.artisanId) errors.push('Artisan ID is required');
    if (!event.productId) errors.push('Product ID is required');
    if (!event.productName) errors.push('Product name is required');
    if (!event.quantity || event.quantity <= 0) errors.push('Quantity must be greater than 0');
    if (!event.unitPrice || event.unitPrice <= 0) errors.push('Unit price must be greater than 0');
    if (!event.totalAmount || event.totalAmount <= 0) errors.push('Total amount must be greater than 0');
    if (!event.currency) errors.push('Currency is required');
    if (!event.paymentStatus) errors.push('Payment status is required');
    if (!event.paymentMethod) errors.push('Payment method is required');
    if (!event.channel) errors.push('Channel is required');

    if (event.quantity && event.unitPrice && event.totalAmount) {
      const expectedTotal = event.quantity * event.unitPrice;
      if (Math.abs(expectedTotal - event.totalAmount) > 0.01) {
        warnings.push('Total amount does not match quantity × unit price');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validateExpense(expense: Partial<ExpenseRecord>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!expense.artisanId) errors.push('Artisan ID is required');
    if (!expense.category) errors.push('Category is required');
    if (!expense.description) errors.push('Description is required');
    if (!expense.amount || expense.amount <= 0) errors.push('Amount must be greater than 0');
    if (!expense.currency) errors.push('Currency is required');
    if (!expense.date) errors.push('Date is required');

    const validCategories = ['materials', 'tools', 'marketing', 'shipping', 'other'];
    if (expense.category && !validCategories.includes(expense.category)) {
      errors.push('Invalid category');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const firestoreService = FirestoreService.getInstance();