/**
 * Sync Manager
 * Handles automatic synchronization when connectivity is restored
 */

import { offlineStorage, OfflineApplication } from './offline-storage';

export interface SyncQueueItem {
  id: string;
  type: 'application' | 'document' | 'data';
  action: 'create' | 'update' | 'delete';
  data: any;
  retryCount: number;
  maxRetries: number;
}

export class SyncManager {
  private static instance: SyncManager;
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private initialize() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      this.registerBackgroundSync();
    }

    // Load pending sync items from storage
    this.loadPendingSyncItems();
  }

  private async registerBackgroundSync() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  private async loadPendingSyncItems() {
    try {
      const pendingApplications = await offlineStorage.getPendingSyncApplications();
      
      pendingApplications.forEach(app => {
        this.addToQueue({
          id: app.id,
          type: 'application',
          action: 'create',
          data: app,
          retryCount: 0,
          maxRetries: 3
        });
      });
    } catch (error) {
      console.error('Failed to load pending sync items:', error);
    }
  }

  private handleOnline() {
    this.notifyListeners({
      isOnline: true,
      isSyncing: false,
      queueLength: this.syncQueue.length,
      message: 'Connection restored'
    });

    // Start syncing after a short delay
    setTimeout(() => {
      this.startSync();
    }, 1000);
  }

  addToQueue(item: SyncQueueItem) {
    // Check if item already exists
    const existingIndex = this.syncQueue.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      this.syncQueue[existingIndex] = item;
    } else {
      this.syncQueue.push(item);
    }

    this.saveSyncQueue();
  }

  removeFromQueue(id: string) {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
    this.saveSyncQueue();
  }

  async startSync(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      this.notifyListeners({
        isOnline: false,
        isSyncing: false,
        queueLength: this.syncQueue.length,
        message: 'Waiting for connection'
      });
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({
      isOnline: true,
      isSyncing: true,
      queueLength: this.syncQueue.length,
      message: 'Syncing data...'
    });

    const itemsToSync = [...this.syncQueue];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        
        // Increment retry count
        item.retryCount++;
        
        if (item.retryCount >= item.maxRetries) {
          // Remove from queue after max retries
          this.removeFromQueue(item.id);
          this.notifyListeners({
            isOnline: true,
            isSyncing: true,
            queueLength: this.syncQueue.length,
            message: `Failed to sync item ${item.id}`,
            error: error as Error
          });
        }
      }
    }

    this.isSyncing = false;
    this.notifyListeners({
      isOnline: true,
      isSyncing: false,
      queueLength: this.syncQueue.length,
      message: this.syncQueue.length === 0 ? 'All data synced' : 'Sync completed with errors'
    });
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'application':
        return this.syncApplication(item);
      case 'document':
        return this.syncDocument(item);
      case 'data':
        return this.syncData(item);
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  private async syncApplication(item: SyncQueueItem): Promise<void> {
    const application = item.data as OfflineApplication;

    const response = await fetch('/api/scheme-sahayak/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        schemeId: application.schemeId,
        artisanId: application.artisanId,
        formData: application.formData
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync application: ${response.statusText}`);
    }

    // Delete from offline storage after successful sync
    await offlineStorage.deleteApplicationDraft(application.id);
  }

  private async syncDocument(item: SyncQueueItem): Promise<void> {
    // Implement document sync logic
    const formData = new FormData();
    formData.append('document', item.data.blob);
    formData.append('metadata', JSON.stringify(item.data.metadata));

    const response = await fetch('/api/scheme-sahayak/documents', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to sync document: ${response.statusText}`);
    }
  }

  private async syncData(item: SyncQueueItem): Promise<void> {
    // Implement generic data sync logic
    const response = await fetch(item.data.endpoint, {
      method: item.action === 'delete' ? 'DELETE' : item.action === 'update' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item.data.payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync data: ${response.statusText}`);
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private loadSyncQueue() {
    try {
      const saved = localStorage.getItem('sync-queue');
      if (saved) {
        this.syncQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  getQueueLength(): number {
    return this.syncQueue.length;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  message: string;
  error?: Error;
}

export const syncManager = SyncManager.getInstance();
