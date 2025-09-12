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
    private version = 1;
    private db: IDBDatabase | null = null;
    private syncQueue: SyncQueue[] = [];

    constructor() {
        // Only initialize on client side
        if (typeof window !== 'undefined') {
            this.initDB();
            this.loadSyncQueue();
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
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('type', 'type', { unique: false });
                    productStore.createIndex('timestamp', 'timestamp', { unique: false });
                    productStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('trends')) {
                    const trendStore = db.createObjectStore('trends', { keyPath: 'id' });
                    trendStore.createIndex('timestamp', 'timestamp', { unique: false });
                    trendStore.createIndex('synced', 'synced', { unique: false });
                }

                if (!db.objectStoreNames.contains('chat')) {
                    const chatStore = db.createObjectStore('chat', { keyPath: 'id' });
                    chatStore.createIndex('timestamp', 'timestamp', { unique: false });
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
    async storeData(type: OfflineData['type'], data: any, id?: string): Promise<string> {
        if (!this.db) await this.initDB();

        const offlineData: OfflineData = {
            id: id || this.generateId(),
            type,
            data,
            timestamp: Date.now(),
            synced: false,
            version: 1
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.put(offlineData);

            request.onsuccess = () => {
                this.addToSyncQueue('create', offlineData);
                resolve(offlineData.id);
            };
            request.onerror = () => reject(request.error);
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

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.put(updatedData);

            request.onsuccess = () => {
                this.addToSyncQueue('update', updatedData);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteData(type: OfflineData['type'], id: string): Promise<void> {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const request = store.delete(id);

            request.onsuccess = () => {
                this.addToSyncQueue('delete', { id, type });
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
        return data.map(item => item.data);
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

    // Sync queue management
    private addToSyncQueue(action: SyncQueue['action'], data: any): void {
        const syncItem: SyncQueue = {
            id: this.generateId(),
            action,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        this.syncQueue.push(syncItem);
        this.saveSyncQueue();
    }

    private loadSyncQueue(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem('kalabandhu-sync-queue');
            if (stored) {
                this.syncQueue = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    private saveSyncQueue(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem('kalabandhu-sync-queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to save sync queue:', error);
        }
    }

    async getSyncQueue(): Promise<SyncQueue[]> {
        return [...this.syncQueue];
    }

    async clearSyncQueue(): Promise<void> {
        this.syncQueue = [];
        this.saveSyncQueue();
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

        const storeNames = ['products', 'trends', 'chat', 'cart', 'wishlist', 'settings'];
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
