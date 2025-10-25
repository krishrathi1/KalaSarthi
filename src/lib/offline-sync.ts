/**
 * Offline Sync Manager for KalaBandhu
 * Handles synchronization of offline data when connection is restored
 */

import { offlineStorage, setLastSync, waitForOnline } from './offline-storage';
import type { SyncQueue } from './offline-storage';

export interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
}

class OfflineSyncManager {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private retryDelay = 5000; // 5 seconds
    private maxRetries = 3;

    constructor() {
        // Only setup event listeners on client side
        if (typeof window !== 'undefined') {
            this.setupEventListeners();
            this.startPeriodicSync();
        }
    }

    private setupEventListeners(): void {
        // Only setup if window is available
        if (typeof window === 'undefined') return;

        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Connection restored, starting sync...');
            this.syncAll();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost, switching to offline mode');
            this.stopPeriodicSync();
        });

        // Listen for visibility change to sync when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                this.syncAll();
            }
        });
    }

    private startPeriodicSync(): void {
        if (this.syncInterval || typeof window === 'undefined') return;

        // Sync every 30 seconds when online
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncAll();
            }
        }, 30000);
    }

    private stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncAll(): Promise<SyncResult> {
        if (this.isSyncing || !navigator.onLine) {
            return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress or offline'] };
        }

        this.isSyncing = true;
        console.log('Starting offline data sync...');

        try {
            const syncQueue = await offlineStorage.getSyncQueue();
            const result: SyncResult = {
                success: true,
                synced: 0,
                failed: 0,
                errors: []
            };

            for (const item of syncQueue) {
                try {
                    await this.syncItem(item);
                    result.synced++;
                } catch (error) {
                    result.failed++;
                    result.errors.push(`Failed to sync ${item.id}: ${error}`);

                    // Increment retry count
                    item.retries++;
                    if (item.retries >= this.maxRetries) {
                        console.warn(`Max retries reached for sync item ${item.id}, removing from queue`);
                        await this.removeSyncItem(item.id);
                    }
                }
            }

            if (result.synced > 0) {
                setLastSync();
                console.log(`Sync completed: ${result.synced} items synced, ${result.failed} failed`);
            }

            return result;
        } catch (error) {
            console.error('Sync failed:', error);
            return {
                success: false,
                synced: 0,
                failed: 0,
                errors: [error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown sync error']
            };
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncItem(item: SyncQueue): Promise<void> {
        const { action, data } = item;

        switch (action) {
            case 'create':
                await this.syncCreate(data);
                break;
            case 'update':
                await this.syncUpdate(data);
                break;
            case 'delete':
                await this.syncDelete(data);
                break;
            default:
                throw new Error(`Unknown sync action: ${action}`);
        }

        // Remove from sync queue after successful sync
        await this.removeSyncItem(item.id);
    }

    private async syncCreate(data: any): Promise<void> {
        const { type, data: itemData } = data;

        switch (type) {
            case 'product':
                await this.syncProductCreate(itemData);
                break;
            case 'trend':
                await this.syncTrendCreate(itemData);
                break;
            case 'chat':
                await this.syncChatCreate(itemData);
                break;
            case 'cart':
                await this.syncCartCreate(itemData);
                break;
            case 'wishlist':
                await this.syncWishlistCreate(itemData);
                break;
            default:
                console.warn(`Unknown data type for sync: ${type}`);
        }
    }

    private async syncUpdate(data: any): Promise<void> {
        const { type, data: itemData } = data;

        switch (type) {
            case 'product':
                await this.syncProductUpdate(itemData);
                break;
            case 'trend':
                await this.syncTrendUpdate(itemData);
                break;
            case 'chat':
                await this.syncChatUpdate(itemData);
                break;
            case 'cart':
                await this.syncCartUpdate(itemData);
                break;
            case 'wishlist':
                await this.syncWishlistUpdate(itemData);
                break;
            default:
                console.warn(`Unknown data type for sync: ${type}`);
        }
    }

    private async syncDelete(data: any): Promise<void> {
        const { type, id } = data;

        switch (type) {
            case 'product':
                await this.syncProductDelete(id);
                break;
            case 'trend':
                await this.syncTrendDelete(id);
                break;
            case 'chat':
                await this.syncChatDelete(id);
                break;
            case 'cart':
                await this.syncCartDelete(id);
                break;
            case 'wishlist':
                await this.syncWishlistDelete(id);
                break;
            default:
                console.warn(`Unknown data type for sync: ${type}`);
        }
    }

    // Specific sync methods for different data types
    private async syncProductCreate(data: any): Promise<void> {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to create product: ${response.statusText}`);
        }
    }

    private async syncProductUpdate(data: any): Promise<void> {
        const response = await fetch(`/api/products/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to update product: ${response.statusText}`);
        }
    }

    private async syncProductDelete(id: string): Promise<void> {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete product: ${response.statusText}`);
        }
    }

    private async syncTrendCreate(data: any): Promise<void> {
        // Trends are typically read-only, so we might just cache them
        console.log('Trend data created offline:', data);
    }

    private async syncTrendUpdate(data: any): Promise<void> {
        // Trends are typically read-only
        console.log('Trend data updated offline:', data);
    }

    private async syncTrendDelete(id: string): Promise<void> {
        // Trends are typically read-only
        console.log('Trend data deleted offline:', id);
    }

    private async syncChatCreate(data: any): Promise<void> {
        // Chat messages might be sent to a chat API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync chat message: ${response.statusText}`);
        }
    }

    private async syncChatUpdate(data: any): Promise<void> {
        // Chat messages are typically immutable
        console.log('Chat message updated offline:', data);
    }

    private async syncChatDelete(id: string): Promise<void> {
        // Chat messages are typically immutable
        console.log('Chat message deleted offline:', id);
    }

    private async syncCartCreate(data: any): Promise<void> {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync cart item: ${response.statusText}`);
        }
    }

    private async syncCartUpdate(data: any): Promise<void> {
        const response = await fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync cart update: ${response.statusText}`);
        }
    }

    private async syncCartDelete(id: string): Promise<void> {
        const response = await fetch(`/api/cart/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to sync cart deletion: ${response.statusText}`);
        }
    }

    private async syncWishlistCreate(data: any): Promise<void> {
        const response = await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync wishlist item: ${response.statusText}`);
        }
    }

    private async syncWishlistUpdate(data: any): Promise<void> {
        const response = await fetch('/api/wishlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync wishlist update: ${response.statusText}`);
        }
    }

    private async syncWishlistDelete(id: string): Promise<void> {
        const response = await fetch(`/api/wishlist/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to sync wishlist deletion: ${response.statusText}`);
        }
    }

    private async removeSyncItem(id: string): Promise<void> {
        const syncQueue = await offlineStorage.getSyncQueue();
        const updatedQueue = syncQueue.filter(item => item.id !== id);

        // Update the sync queue in storage
        localStorage.setItem('kalabandhu-sync-queue', JSON.stringify(updatedQueue));
    }

    // Public methods
    async forceSync(): Promise<SyncResult> {
        return this.syncAll();
    }

    async waitForSync(): Promise<void> {
        if (navigator.onLine) {
            await this.syncAll();
        } else {
            await waitForOnline();
            await this.syncAll();
        }
    }

    getSyncStatus(): { isSyncing: boolean; queueLength: number } {
        return {
            isSyncing: this.isSyncing,
            queueLength: 0 // This would need to be tracked
        };
    }

    destroy(): void {
        this.stopPeriodicSync();
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.syncAll);
            window.removeEventListener('offline', this.stopPeriodicSync);
        }
    }
}

// Export singleton instance
export const offlineSync = new OfflineSyncManager();

// Export utility functions
export const syncOfflineData = () => offlineSync.forceSync();
export const waitForDataSync = () => offlineSync.waitForSync();
export const getSyncStatus = () => offlineSync.getSyncStatus();
