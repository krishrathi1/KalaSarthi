import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreService, COLLECTIONS } from '../firestore';
import { ISalesEvent } from '../models/SalesEvent';
import { ISalesAggregate } from '../models/SalesAggregate';

// Expense record interface (matching the API)
interface ExpenseRecord {
  id?: string;
  artisanId: string;
  category: 'materials' | 'tools' | 'marketing' | 'shipping' | 'utilities' | 'rent' | 'other';
  description: string;
  amount: number;
  currency: string;
  date: Date;
  receiptUrl?: string;
  vendor?: string;
  isRecurring: boolean;
  recurringPeriod?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  tags: string[];
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'other';
  businessPurpose: string;
  taxDeductible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Connection states
export type ConnectionState = 'online' | 'offline' | 'reconnecting';

// Real-time listener callback types
export type SalesEventCallback = (events: ISalesEvent[]) => void;
export type SalesAggregateCallback = (aggregate: ISalesAggregate) => void;
export type ExpenseCallback = (expenses: ExpenseRecord[]) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;

// Listener configuration
interface ListenerConfig {
  id: string;
  artisanId: string;
  callback: SalesEventCallback | SalesAggregateCallback | ExpenseCallback;
  unsubscribe?: Unsubscribe;
  lastError?: Error;
  retryCount: number;
  maxRetries: number;
}

// Offline data cache
interface OfflineCache {
  salesEvents: Map<string, ISalesEvent>;
  aggregates: Map<string, ISalesAggregate>;
  expenses: Map<string, ExpenseRecord>;
  pendingSyncs: Array<{
    id: string;
    type: 'sales_event' | 'aggregate' | 'expense';
    data: any;
    timestamp: Date;
  }>;
}

/**
 * Real-time Firestore sync service for sales events and aggregates
 * Handles real-time listeners, offline synchronization, and connection management
 */
export class RealtimeFirestoreSyncService {
  private static instance: RealtimeFirestoreSyncService;
  private connectionState: ConnectionState = 'online';
  private listeners: Map<string, ListenerConfig> = new Map();
  private connectionStateCallbacks: Set<ConnectionStateCallback> = new Set();
  private offlineCache: OfflineCache = {
    salesEvents: new Map(),
    aggregates: new Map(),
    expenses: new Map(),
    pendingSyncs: []
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second

  private constructor() {
    this.initializeConnectionMonitoring();
  }

  static getInstance(): RealtimeFirestoreSyncService {
    if (!RealtimeFirestoreSyncService.instance) {
      RealtimeFirestoreSyncService.instance = new RealtimeFirestoreSyncService();
    }
    return RealtimeFirestoreSyncService.instance;
  }

  /**
   * Initialize connection monitoring
   */
  private initializeConnectionMonitoring(): void {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleConnectionStateChange('online');
      });

      window.addEventListener('offline', () => {
        this.handleConnectionStateChange('offline');
      });
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(newState: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = newState;

    console.log(`🔌 Connection state changed: ${previousState} -> ${newState}`);

    // Notify callbacks
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });

    // Handle state-specific logic
    switch (newState) {
      case 'online':
        this.reconnectAttempts = 0;
        this.syncCachedData();
        this.reestablishListeners();
        break;
      case 'offline':
        this.cacheCurrentData();
        break;
      case 'reconnecting':
        this.attemptReconnection();
        break;
    }
  }

  /**
   * Subscribe to real-time sales events for an artisan
   */
  subscribeToSalesEvents(
    artisanId: string, 
    callback: SalesEventCallback,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): string {
    const listenerId = `sales_events_${artisanId}_${Date.now()}`;

    try {
      // Build query
      const salesEventsRef = collection(db, COLLECTIONS.SALES_EVENTS);
      let q = query(
        salesEventsRef,
        where('artisanId', '==', artisanId),
        orderBy('eventTimestamp', 'desc')
      );

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          try {
            const events: ISalesEvent[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              const event: ISalesEvent = {
                ...data,
                id: doc.id,
                eventTimestamp: data.eventTimestamp?.toDate() || new Date(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
              } as ISalesEvent;
              
              // Apply date filters if specified
              if (options?.startDate && event.eventTimestamp < options.startDate) return;
              if (options?.endDate && event.eventTimestamp > options.endDate) return;
              
              events.push(event);
            });

            // Cache events for offline access
            events.forEach(event => {
              this.offlineCache.salesEvents.set(event.orderId, event);
            });

            // Call the callback
            callback(events);

            console.log(`📡 Sales events updated for artisan ${artisanId}: ${events.length} events`);
          } catch (error) {
            console.error('Error processing sales events snapshot:', error);
            this.handleListenerError(listenerId, error as Error);
          }
        },
        (error) => {
          console.error('Sales events listener error:', error);
          this.handleListenerError(listenerId, error);
        }
      );

      // Store listener configuration
      const listenerConfig: ListenerConfig = {
        id: listenerId,
        artisanId,
        callback,
        unsubscribe,
        retryCount: 0,
        maxRetries: 3
      };

      this.listeners.set(listenerId, listenerConfig);

      console.log(`📡 Subscribed to sales events for artisan ${artisanId} (listener: ${listenerId})`);
      return listenerId;

    } catch (error) {
      console.error('Error setting up sales events listener:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time sales aggregates for an artisan
   */
  subscribeToSalesAggregates(
    artisanId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    callback: SalesAggregateCallback,
    options?: {
      productId?: string;
      limit?: number;
    }
  ): string {
    const listenerId = `sales_aggregates_${artisanId}_${period}_${Date.now()}`;

    try {
      // Build query
      const aggregatesRef = collection(db, COLLECTIONS.SALES_AGGREGATES);
      let q = query(
        aggregatesRef,
        where('artisanId', '==', artisanId),
        where('period', '==', period),
        orderBy('periodStart', 'desc')
      );

      if (options?.productId) {
        q = query(q, where('productId', '==', options.productId));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          try {
            snapshot.forEach(doc => {
              const data = doc.data();
              const aggregate: ISalesAggregate = {
                ...data,
                id: doc.id,
                periodStart: data.periodStart?.toDate() || new Date(),
                periodEnd: data.periodEnd?.toDate() || new Date(),
                lastUpdated: data.lastUpdated?.toDate() || new Date(),
                watermark: data.watermark?.toDate() || new Date(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
              } as ISalesAggregate;

              // Cache aggregate for offline access
              const cacheKey = `${artisanId}_${period}_${aggregate.periodKey}`;
              this.offlineCache.aggregates.set(cacheKey, aggregate);

              // Call the callback for each aggregate
              callback(aggregate);
            });

            console.log(`📊 Sales aggregates updated for artisan ${artisanId} (${period}): ${snapshot.size} aggregates`);
          } catch (error) {
            console.error('Error processing sales aggregates snapshot:', error);
            this.handleListenerError(listenerId, error as Error);
          }
        },
        (error) => {
          console.error('Sales aggregates listener error:', error);
          this.handleListenerError(listenerId, error);
        }
      );

      // Store listener configuration
      const listenerConfig: ListenerConfig = {
        id: listenerId,
        artisanId,
        callback,
        unsubscribe,
        retryCount: 0,
        maxRetries: 3
      };

      this.listeners.set(listenerId, listenerConfig);

      console.log(`📊 Subscribed to sales aggregates for artisan ${artisanId} (${period}, listener: ${listenerId})`);
      return listenerId;

    } catch (error) {
      console.error('Error setting up sales aggregates listener:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time expenses for an artisan
   */
  subscribeToExpenses(
    artisanId: string, 
    callback: ExpenseCallback,
    options?: {
      limit?: number;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): string {
    const listenerId = `expenses_${artisanId}_${Date.now()}`;

    try {
      // Build query
      const expensesRef = collection(db, COLLECTIONS.EXPENSES);
      let q = query(
        expensesRef,
        where('artisanId', '==', artisanId),
        orderBy('date', 'desc')
      );

      if (options?.category) {
        q = query(q, where('category', '==', options.category));
      }

      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          try {
            const expenses: ExpenseRecord[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              const expense: ExpenseRecord = {
                ...data,
                id: doc.id,
                date: data.date?.toDate() || new Date(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
              } as ExpenseRecord;
              
              // Apply date filters if specified
              if (options?.startDate && expense.date < options.startDate) return;
              if (options?.endDate && expense.date > options.endDate) return;
              
              expenses.push(expense);
            });

            // Cache expenses for offline access
            expenses.forEach(expense => {
              if (expense.id) {
                this.offlineCache.expenses.set(expense.id, expense);
              }
            });

            // Call the callback
            callback(expenses);

            console.log(`💰 Expenses updated for artisan ${artisanId}: ${expenses.length} expenses`);
          } catch (error) {
            console.error('Error processing expenses snapshot:', error);
            this.handleListenerError(listenerId, error as Error);
          }
        },
        (error) => {
          console.error('Expenses listener error:', error);
          this.handleListenerError(listenerId, error);
        }
      );

      // Store listener configuration
      const listenerConfig: ListenerConfig = {
        id: listenerId,
        artisanId,
        callback,
        unsubscribe,
        retryCount: 0,
        maxRetries: 3
      };

      this.listeners.set(listenerId, listenerConfig);

      console.log(`💰 Subscribed to expenses for artisan ${artisanId} (listener: ${listenerId})`);
      return listenerId;

    } catch (error) {
      console.error('Error setting up expenses listener:', error);
      throw error;
    }
  }

  /**
   * Sync new sales event to Firestore
   * Note: Disabled since we're using pre-populated Firestore data
   */
  async syncSalesEvent(event: ISalesEvent): Promise<void> {
    try {
      console.log(`📝 Sales event sync skipped (using existing Firestore data): ${event.id || event.orderId}`);
      // Sync disabled to prevent write errors - using existing Firestore data
      return;
      
      /* Original sync code disabled:
      if (this.connectionState === 'offline') {
        this.offlineCache.pendingSyncs.push({
          id: event.orderId,
          type: 'sales_event',
          data: event,
          timestamp: new Date()
        });
        console.log(`💾 Sales event cached for offline sync: ${event.orderId}`);
        return;
      }

      const firestoreEvent = {
        ...event,
        eventTimestamp: Timestamp.fromDate(event.eventTimestamp),
        createdAt: Timestamp.fromDate(event.createdAt),
        updatedAt: Timestamp.fromDate(event.updatedAt)
      };

      await FirestoreService.set(COLLECTIONS.SALES_EVENTS, event.orderId, firestoreEvent);
      console.log(`✅ Sales event synced to Firestore: ${event.orderId}`);
      */

    } catch (error) {
      console.error('Error in sales event sync (disabled):', error);
    }
  }

  /**
   * Sync expense record to Firestore
   * Note: Disabled to prevent write errors - using read-only mode
   */
  async syncExpense(expense: ExpenseRecord): Promise<void> {
    try {
      console.log(`📝 Expense sync skipped (read-only mode): ${expense.id}`);
      // Sync disabled to prevent write errors
      return;
      
      /* Original sync code disabled:
      if (this.connectionState === 'offline') {
        this.offlineCache.pendingSyncs.push({
          id: expense.id || `expense_${Date.now()}`,
          type: 'expense',
          data: expense,
          timestamp: new Date()
        });
        console.log(`💾 Expense cached for offline sync: ${expense.id}`);
        return;
      }

      const firestoreExpense = {
        ...expense,
        date: Timestamp.fromDate(expense.date),
        createdAt: Timestamp.fromDate(expense.createdAt),
        updatedAt: Timestamp.fromDate(expense.updatedAt)
      };

      let expenseId: string;
      if (expense.id) {
        await FirestoreService.set(COLLECTIONS.EXPENSES, expense.id, firestoreExpense);
        expenseId = expense.id;
      } else {
        expenseId = await FirestoreService.create(COLLECTIONS.EXPENSES, firestoreExpense);
      }

      const cachedExpense = { ...expense, id: expenseId };
      this.offlineCache.expenses.set(expenseId, cachedExpense);
      console.log(`✅ Expense synced to Firestore: ${expenseId}`);
      */

    } catch (error) {
      console.error('Error in expense sync (disabled):', error);
      // No longer throwing errors since sync is disabled
    }
  }

  /**
   * Unsubscribe from a real-time listener
   */
  unsubscribe(listenerId: string): void {
    const listener = this.listeners.get(listenerId);
    if (listener) {
      if (listener.unsubscribe) {
        listener.unsubscribe();
      }
      this.listeners.delete(listenerId);
      console.log(`🔇 Unsubscribed from listener: ${listenerId}`);
    }
  }

  /**
   * Unsubscribe from all listeners for an artisan
   */
  unsubscribeArtisan(artisanId: string): void {
    const artisanListeners = Array.from(this.listeners.entries())
      .filter(([_, config]) => config.artisanId === artisanId);

    artisanListeners.forEach(([listenerId, _]) => {
      this.unsubscribe(listenerId);
    });

    console.log(`🔇 Unsubscribed all listeners for artisan: ${artisanId}`);
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.connectionStateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionStateCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get cached data for offline access
   */
  getCachedSalesEvents(artisanId: string): ISalesEvent[] {
    const cached = Array.from(this.offlineCache.salesEvents.values())
      .filter(event => event.artisanId === artisanId);
    
    // If no cached data, try to populate from API
    if (cached.length === 0) {
      this.populateCacheFromAPI(artisanId);
    }
    
    return cached;
  }

  /**
   * Populate cache from API (for initial load)
   */
  private async populateCacheFromAPI(artisanId: string): Promise<void> {
    try {
      const response = await fetch(`/api/sales-events?artisanId=${artisanId}&limit=50`);
      const result = await response.json();
      
      if (result.success && result.data) {
        result.data.forEach((eventData: any) => {
          const event: ISalesEvent = {
            ...eventData,
            eventTimestamp: new Date(eventData.eventTimestamp),
            createdAt: new Date(eventData.createdAt),
            updatedAt: new Date(eventData.updatedAt)
          };
          
          this.offlineCache.salesEvents.set(event.id, event);
        });
        
        console.log(`📦 Populated cache with ${result.data.length} sales events for ${artisanId}`);
      }
    } catch (error) {
      console.error('Error populating cache from API:', error);
    }
  }

  /**
   * Get cached aggregates for offline access
   */
  getCachedAggregates(artisanId: string, period?: string): ISalesAggregate[] {
    return Array.from(this.offlineCache.aggregates.values())
      .filter(aggregate => 
        aggregate.artisanId === artisanId && 
        (!period || aggregate.period === period)
      );
  }

  /**
   * Get cached expenses for offline access
   */
  getCachedExpenses(artisanId: string): ExpenseRecord[] {
    return Array.from(this.offlineCache.expenses.values())
      .filter(expense => expense.artisanId === artisanId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Remove expense from cache
   */
  async removeExpenseFromCache(artisanId: string, expenseId: string): Promise<void> {
    this.offlineCache.expenses.delete(expenseId);
    
    // Also remove from pending syncs if it exists
    this.offlineCache.pendingSyncs = this.offlineCache.pendingSyncs.filter(
      sync => !(sync.type === 'expense' && sync.id === expenseId)
    );

    console.log(`🗑️ Removed expense from cache: ${expenseId}`);
  }

  /**
   * Handle listener errors with retry logic
   */
  private handleListenerError(listenerId: string, error: Error): void {
    const listener = this.listeners.get(listenerId);
    if (!listener) return;

    listener.lastError = error;
    listener.retryCount++;

    console.error(`❌ Listener error (${listener.retryCount}/${listener.maxRetries}):`, error);

    if (listener.retryCount < listener.maxRetries) {
      // Retry after delay
      setTimeout(() => {
        this.retryListener(listenerId);
      }, Math.pow(2, listener.retryCount) * 1000); // Exponential backoff
    } else {
      console.error(`❌ Max retries exceeded for listener ${listenerId}, removing`);
      this.unsubscribe(listenerId);
    }
  }

  /**
   * Retry a failed listener
   */
  private retryListener(listenerId: string): void {
    const listener = this.listeners.get(listenerId);
    if (!listener) return;

    console.log(`🔄 Retrying listener: ${listenerId}`);

    // Remove old listener
    if (listener.unsubscribe) {
      listener.unsubscribe();
    }

    // Create new listener based on type
    if (listenerId.includes('sales_events')) {
      this.subscribeToSalesEvents(listener.artisanId, listener.callback as SalesEventCallback);
    } else if (listenerId.includes('sales_aggregates')) {
      // Extract period from listener ID
      const period = listenerId.split('_')[3] as 'daily' | 'weekly' | 'monthly' | 'yearly';
      this.subscribeToSalesAggregates(listener.artisanId, period, listener.callback as SalesAggregateCallback);
    } else if (listenerId.includes('expenses')) {
      this.subscribeToExpenses(listener.artisanId, listener.callback as ExpenseCallback);
    }
  }

  /**
   * Sync cached data when connection is restored
   * Note: Disabled since we're using pre-populated Firestore data
   */
  private async syncCachedData(): Promise<void> {
    console.log(`📝 Cached data sync skipped (using existing Firestore data)`);
    // Clear any pending syncs since we're not syncing
    this.offlineCache.pendingSyncs = [];
    return;
    
    /* Original sync code disabled:
    if (this.offlineCache.pendingSyncs.length === 0) return;

    console.log(`🔄 Syncing ${this.offlineCache.pendingSyncs.length} cached items...`);

    const syncPromises = this.offlineCache.pendingSyncs.map(async (item) => {
      try {
        if (item.type === 'sales_event') {
          await this.syncSalesEvent(item.data);
        } else if (item.type === 'expense') {
          await this.syncExpense(item.data);
        }
        return item.id;
      } catch (error) {
        console.error(`Failed to sync cached item ${item.id}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(syncPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

    this.offlineCache.pendingSyncs = this.offlineCache.pendingSyncs.filter((item, index) => {
      const result = results[index];
      return result.status === 'rejected' || result.value === null;
    });

    console.log(`✅ Synced ${successful} cached items, ${this.offlineCache.pendingSyncs.length} remaining`);
    */
  }

  /**
   * Cache current data for offline access
   */
  private cacheCurrentData(): void {
    console.log('💾 Caching current data for offline access...');
    // Data is already cached in real-time as it comes in
  }

  /**
   * Re-establish listeners after connection is restored
   */
  private reestablishListeners(): void {
    console.log('🔄 Re-establishing listeners...');
    
    // Reset retry counts
    this.listeners.forEach(listener => {
      listener.retryCount = 0;
      listener.lastError = undefined;
    });
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.handleConnectionStateChange('offline');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      // Test connection by making a simple Firestore query
      this.testConnection()
        .then(() => {
          this.handleConnectionStateChange('online');
        })
        .catch(() => {
          this.attemptReconnection();
        });
    }, delay);
  }

  /**
   * Test Firestore connection
   */
  private async testConnection(): Promise<void> {
    const testRef = collection(db, 'connection_test');
    const testQuery = query(testRef, limit(1));
    await FirestoreService.query('connection_test', []);
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: any): boolean {
    const connectionErrorCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal',
      'unknown'
    ];

    return connectionErrorCodes.includes(error?.code) || 
           error?.message?.includes('network') ||
           error?.message?.includes('connection');
  }

  /**
   * Clean up all listeners and resources
   */
  destroy(): void {
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Unsubscribe from all listeners
    this.listeners.forEach((_, listenerId) => {
      this.unsubscribe(listenerId);
    });

    // Clear callbacks
    this.connectionStateCallbacks.clear();

    // Clear cache
    this.offlineCache.salesEvents.clear();
    this.offlineCache.aggregates.clear();
    this.offlineCache.expenses.clear();
    this.offlineCache.pendingSyncs = [];

    console.log('🧹 RealtimeFirestoreSyncService destroyed');
  }
}

export default RealtimeFirestoreSyncService;