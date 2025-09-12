/**
 * Custom hook for offline functionality
 * Provides offline state management and data persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, isOnline, getOfflineStatus } from '@/lib/offline-storage';
import { syncOfflineData } from '@/lib/offline-sync';
import { useToast } from '@/hooks/use-toast';

export interface OfflineState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync?: number;
    hasOfflineData: boolean;
    storageUsage: { used: number; available: number };
}

export function useOffline() {
    const [state, setState] = useState<OfflineState>({
        isOnline: true,
        isSyncing: false,
        hasOfflineData: false,
        storageUsage: { used: 0, available: 0 }
    });

    const { toast } = useToast();

    // Update offline state
    const updateState = useCallback(async () => {
        const onlineStatus = getOfflineStatus();
        const storageUsage = await offlineStorage.getStorageUsage();

        // Check if there's any offline data
        const products = await offlineStorage.getProducts();
        const trends = await offlineStorage.getTrendData();
        const cart = await offlineStorage.getCartItems();
        const wishlist = await offlineStorage.getWishlistItems();

        const hasOfflineData = products.length > 0 || trends.length > 0 || cart.length > 0 || wishlist.length > 0;

        setState(prev => ({
            ...prev,
            isOnline: onlineStatus.online,
            lastSync: onlineStatus.lastSync,
            hasOfflineData,
            storageUsage
        }));
    }, []);

    // Sync offline data
    const sync = useCallback(async () => {
        if (!state.isOnline) {
            toast({
                title: "No Connection",
                description: "Please check your internet connection and try again.",
                variant: "destructive",
            });
            return false;
        }

        setState(prev => ({ ...prev, isSyncing: true }));

        try {
            const result = await syncOfflineData();

            if (result.success) {
                toast({
                    title: "Sync Complete",
                    description: `Successfully synced ${result.synced} items.`,
                    duration: 3000,
                });
                await updateState();
                return true;
            } else {
                toast({
                    title: "Sync Failed",
                    description: result.errors[0] || "Failed to sync offline data.",
                    variant: "destructive",
                });
                return false;
            }
        } catch (error) {
            toast({
                title: "Sync Error",
                description: "An error occurred while syncing data.",
                variant: "destructive",
            });
            return false;
        } finally {
            setState(prev => ({ ...prev, isSyncing: false }));
        }
    }, [state.isOnline, toast, updateState]);

    // Store data offline
    const storeOffline = useCallback(async (type: 'product' | 'trend' | 'chat' | 'cart' | 'wishlist', data: any, id?: string) => {
        try {
            const storedId = await offlineStorage.storeData(type, data, id);
            await updateState();
            return storedId;
        } catch (error) {
            console.error('Failed to store offline data:', error);
            toast({
                title: "Storage Error",
                description: "Failed to save data offline.",
                variant: "destructive",
            });
            throw error;
        }
    }, [toast, updateState]);

    // Get offline data
    const getOfflineData = useCallback(async (type: 'product' | 'trend' | 'chat' | 'cart' | 'wishlist') => {
        try {
            switch (type) {
                case 'product':
                    return await offlineStorage.getProducts();
                case 'trend':
                    return await offlineStorage.getTrendData();
                case 'chat':
                    return await offlineStorage.getChatMessages();
                case 'cart':
                    return await offlineStorage.getCartItems();
                case 'wishlist':
                    return await offlineStorage.getWishlistItems();
                default:
                    return [];
            }
        } catch (error) {
            console.error('Failed to get offline data:', error);
            return [];
        }
    }, []);

    // Update offline data
    const updateOffline = useCallback(async (type: 'product' | 'trend' | 'chat' | 'cart' | 'wishlist', id: string, data: any) => {
        try {
            await offlineStorage.updateData(type, id, data);
            await updateState();
        } catch (error) {
            console.error('Failed to update offline data:', error);
            toast({
                title: "Update Error",
                description: "Failed to update offline data.",
                variant: "destructive",
            });
            throw error;
        }
    }, [toast, updateState]);

    // Delete offline data
    const deleteOffline = useCallback(async (type: 'product' | 'trend' | 'chat' | 'cart' | 'wishlist', id: string) => {
        try {
            await offlineStorage.deleteData(type, id);
            await updateState();
        } catch (error) {
            console.error('Failed to delete offline data:', error);
            toast({
                title: "Delete Error",
                description: "Failed to delete offline data.",
                variant: "destructive",
            });
            throw error;
        }
    }, [toast, updateState]);

    // Clear all offline data
    const clearOfflineData = useCallback(async () => {
        try {
            await offlineStorage.clearAllData();
            await updateState();
            toast({
                title: "Data Cleared",
                description: "All offline data has been cleared.",
                duration: 3000,
            });
        } catch (error) {
            console.error('Failed to clear offline data:', error);
            toast({
                title: "Clear Error",
                description: "Failed to clear offline data.",
                variant: "destructive",
            });
        }
    }, [toast, updateState]);

    // Check if data is stale
    const isDataStale = useCallback((timestamp: number, maxAgeMinutes: number = 30) => {
        return offlineStorage.isDataStale(timestamp, maxAgeMinutes);
    }, []);

    // Set offline setting
    const setOfflineSetting = useCallback(async (key: string, value: any) => {
        try {
            await offlineStorage.setSetting(key, value);
        } catch (error) {
            console.error('Failed to set offline setting:', error);
        }
    }, []);

    // Get offline setting
    const getOfflineSetting = useCallback(async (key: string) => {
        try {
            return await offlineStorage.getSetting(key);
        } catch (error) {
            console.error('Failed to get offline setting:', error);
            return null;
        }
    }, []);

    // Event listeners
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            setState(prev => ({ ...prev, isOnline: true }));
            updateState();
        };

        const handleOffline = () => {
            setState(prev => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial state update
        updateState();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [updateState]);

    return {
        ...state,
        sync,
        storeOffline,
        getOfflineData,
        updateOffline,
        deleteOffline,
        clearOfflineData,
        isDataStale,
        setOfflineSetting,
        getOfflineSetting,
        updateState
    };
}
