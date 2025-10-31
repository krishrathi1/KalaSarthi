/**
 * Offline Storage Management for KalaBandhu
 * Handles local storage, IndexedDB, and offline data synchronization
 */

export interface OfflineData {
    id: string;
    type: 'product' | 'trend' | 'chat' | 'cart' | 'wishlist' | 'profile';
    data: any;
    timestamp: number;
    synced: boolean;
    version: number;
}

export interface SyncQueue {
    id: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retries: number;
}

class OfflineStorageManager {
    private dbName = 'KalaBandhuOffline';
    private version = 2; // Bumped version to add missing stores
    private db: IDBDatabase | null = null;
    private syncQueue: SyncQueue[] = [];

    constructor() {
        // Only initialize on client side
        if (typeof window !== 'undefined') {
            this.initDB();
        }
    }

    private async initDB(): Promise<void> {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || !('indexedDB' in window)) {
            throw new Error('IndexedDB not available in this environment');
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores for different data types
                if (!db.objectStoreNames.contains('product')) {
                    const productStore = db.createObjectStore('product', { keyPath: 'id' });
                    productStore.createIndex('type', 'type', { unique: false });
                    productStore.createIndex('timestamp', 'timestamp', { unique: false });
                    productStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('trend')) {
                    const trendStore = db.createObjectStore('trend', { keyPath: 'id' });
                    trendStore.createIndex('timestamp', 'timestamp', { unique: false });
                    trendStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('chat')) {
                    const chatStore = db.createObjectStore('chat', { keyPath: 'id' });
                    chatStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
                    cartStore.createIndex('timestamp', 'timestamp', { unique: false });
                    cartStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('wishlist')) {
                    const wishlistStore = db.createObjectStore('wishlist', { keyPath: 'id' });
                    wishlistStore.createIndex('timestamp', 'timestamp', { unique: false });
                    wishlistStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('profile')) {
                    const profileStore = db.createObjectStore('profile', { keyPath: 'id' });
                    profileStore.createIndex('timestamp', 'timestamp', { unique: false });
                    profileStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Generic data storage methods
    async storeData(type: OfflineData['type'], data: any, id?: string, skipSync: boolean = false): Promise<string> {
        if (!this.db) await this.initDB();

        const offlineData: OfflineData = {
            id: id || this.generateId(),
            type,
            data,
            timestamp: Date.now(),
            synced: skipSync, // If skipSync is true, mark as already synced
            version: 1
        };

        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db!.transaction([type], 'readwrite');
                const store = transaction.objectStore(type);
                const request = store.put(offlineData);

                request.onsuccess = async () => {
                    // Only add to sync queue if not skipping sync
                    if (!skipSync) {
                        await this.addToSyncQueue('create', offlineData);
                    }
                    resolve(offlineData.id);
                };
                request.onerror = () => reject(request.error);
            } catch (error) {
                // Handle quota exceeded error
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    console.error('Storage quota exceeded. Cleaning up old data...');
                    await this.cleanupOldData();
                    reject(new Error('Storage quota exceeded. Please try again.'));
                } else {
                    reject(error);
                }
            }
        });
    }

    async getData(type: OfflineData['type'], id?: string): Promise<OfflineData | OfflineData[]> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readonly');
            const store = transaction.objectStore(type);

            if (id) {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    }

    async updateData(type: OfflineData['type'], id: string, data: any): Promise<void> {
        if (!this.db) await this.initDB();

        const existing = await this.getData(type, id) as OfflineData;
        if (!existing) throw new Error('Data not found');

        const updatedData: OfflineData = {
            ...existing,
            data: { ...existing.data, ...data },
            timestamp: Date.now(),
            synced: false,
            version: existing.version + 1
        };

        return new Promise(async (resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.put(updatedData);

            request.onsuccess = async () => {
                await this.addToSyncQueue('update', updatedData);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteData(type: OfflineData['type'], id: string): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise(async (resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.delete(id);

            request.onsuccess = async () => {
                await this.addToSyncQueue('delete', { id, type });
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Specific methods for different data types
    async storeProduct(product: any): Promise<string> {
        return this.storeData('product', product);
    }

    async getProducts(): Promise<any[]> {
        const data = await this.getData('product') as OfflineData[];
        const products = data.map(item => item.data);
        return products;
    }

    async storeTrendData(trendData: any): Promise<string> {
        return this.storeData('trend', trendData);
    }

    async getTrendData(): Promise<any[]> {
        const data = await this.getData('trend') as OfflineData[];
        return data.map(item => item.data);
    }

    async storeChatMessage(message: any): Promise<string> {
        return this.storeData('chat', message);
    }

    async getChatMessages(): Promise<any[]> {
        const data = await this.getData('chat') as OfflineData[];
        return data.map(item => item.data).sort((a, b) => a.timestamp - b.timestamp);
    }

    async storeCartItem(item: any): Promise<string> {
        return this.storeData('cart', item);
    }

    async getCartItems(): Promise<any[]> {
        const data = await this.getData('cart') as OfflineData[];
        return data.map(item => item.data);
    }

    async storeWishlistItem(item: any): Promise<string> {
        return this.storeData('wishlist', item);
    }

    async getWishlistItems(): Promise<any[]> {
        const data = await this.getData('wishlist') as OfflineData[];
        return data.map(item => item.data);
    }

    // Sync queue management - Now using IndexedDB for consistency
    private async addToSyncQueue(action: SyncQueue['action'], data: any): Promise<void> {
        if (!this.db) await this.initDB();

        const syncItem: SyncQueue = {
            id: this.generateId(),
            action,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.put(syncItem);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncQueue(): Promise<SyncQueue[]> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async removeSyncQueueItem(id: string): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateSyncQueueItem(id: string, updates: Partial<SyncQueue>): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise(async (resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');

            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    const updated = { ...item, ...updates };
                    const putRequest = store.put(updated);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async clearSyncQueue(): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Settings management
    async setSetting(key: string, value: any): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value, timestamp: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key: string): Promise<any> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility methods
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async clearAllData(): Promise<void> {
        if (!this.db) await this.initDB();

        const storeNames = ['product', 'trend', 'chat', 'cart', 'wishlist', 'profile', 'settings'];
        const transaction = this.db!.transaction(storeNames, 'readwrite');

        await Promise.all(
            storeNames.map(storeName => {
                return new Promise<void>((resolve, reject) => {
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            })
        );

        this.clearSyncQueue();
    }

    async clearDataByType(type: OfflineData['type']): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Check if data is stale (older than specified minutes)
    isDataStale(timestamp: number, maxAgeMinutes: number = 30): boolean {
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        return (now - timestamp) > maxAge;
    }

    // Get storage usage estimate
    async getStorageUsage(): Promise<{ used: number; available: number }> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                available: estimate.quota || 0
            };
        }
        return { used: 0, available: 0 };
    }

    // Clean up old data to free space
    private async cleanupOldData(): Promise<void> {
        if (!this.db) await this.initDB();

        const storeNames = ['product', 'trend', 'chat'];
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const cutoff = Date.now() - maxAge;

        for (const storeName of storeNames) {
            try {
                const transaction = this.db!.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const index = store.index('timestamp');
                const range = IDBKeyRange.upperBound(cutoff);
                const request = index.openCursor(range);

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            } catch (error) {
                console.error(`Failed to cleanup ${storeName}:`, error);
            }
        }
    }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

// Export utility functions
export const isOnline = (): boolean => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
};

export const waitForOnline = (): Promise<void> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve();
            return;
        }

        if (navigator.onLine) {
            resolve();
            return;
        }

        const handleOnline = () => {
            window.removeEventListener('online', handleOnline);
            resolve();
        };

        window.addEventListener('online', handleOnline);
    });
};

export const getOfflineStatus = (): { online: boolean; lastSync?: number } => {
    if (typeof window === 'undefined') {
        return { online: true };
    }

    const online = navigator.onLine;
    const lastSync = localStorage.getItem('kalabandhu-last-sync');

    return {
        online,
        lastSync: lastSync ? parseInt(lastSync) : undefined
    };
};

export const setLastSync = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('kalabandhu-last-sync', Date.now().toString());
};
