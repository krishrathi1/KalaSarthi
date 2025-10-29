/**
 * Offline Storage Manager
 * Implements 7-day caching for scheme data and offline application drafts
 */

export interface CachedData<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface OfflineApplication {
  id: string;
  schemeId: string;
  artisanId: string;
  formData: Record<string, any>;
  status: 'draft' | 'pending_sync';
  createdAt: number;
  updatedAt: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const DB_NAME = 'scheme-sahayak-offline';
const DB_VERSION = 1;

export class OfflineStorage {
  private static instance: OfflineStorage;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initPromise = this.initialize();
    }
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('schemes')) {
          db.createObjectStore('schemes', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('applications')) {
          const appStore = db.createObjectStore('applications', { keyPath: 'id' });
          appStore.createIndex('status', 'status', { unique: false });
          appStore.createIndex('artisanId', 'artisanId', { unique: false });
        }

        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // Cache Management
  async setCache<T>(key: string, data: T, duration: number = CACHE_DURATION): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const timestamp = Date.now();
    const cachedData: CachedData<T> = {
      data,
      timestamp,
      expiresAt: timestamp + duration
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, ...cachedData });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as (CachedData<T> & { key: string }) | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > result.expiresAt) {
          this.deleteCache(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Application Drafts
  async saveApplicationDraft(application: OfflineApplication): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['applications'], 'readwrite');
      const store = transaction.objectStore('applications');
      const request = store.put(application);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getApplicationDraft(id: string): Promise<OfflineApplication | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['applications'], 'readonly');
      const store = transaction.objectStore('applications');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllApplicationDrafts(artisanId: string): Promise<OfflineApplication[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['applications'], 'readonly');
      const store = transaction.objectStore('applications');
      const index = store.index('artisanId');
      const request = index.getAll(artisanId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncApplications(): Promise<OfflineApplication[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['applications'], 'readonly');
      const store = transaction.objectStore('applications');
      const index = store.index('status');
      const request = index.getAll('pending_sync');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteApplicationDraft(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['applications'], 'readwrite');
      const store = transaction.objectStore('applications');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Document Storage
  async saveDocument(id: string, blob: Blob, metadata: any): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put({ id, blob, metadata, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(id: string): Promise<{ blob: Blob; metadata: any } | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({ blob: result.blob, metadata: result.metadata });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Storage Info
  async getStorageInfo(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const stores = ['schemes', 'applications', 'documents', 'cache'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      stores.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = OfflineStorage.getInstance();
