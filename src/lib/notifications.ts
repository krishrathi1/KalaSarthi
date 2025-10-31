/**
 * Browser Push Notifications Utility
 * Handles Web Push API for browser notifications
 */

export class NotificationManager {
    private static instance: NotificationManager;
    private permission: NotificationPermission = 'default';

    private constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Check if notifications are supported
     */
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) {
            console.warn('Notifications not supported in this browser');
            return 'denied';
        }

        if (this.permission === 'granted') {
            return 'granted';
        }



        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    /**
     * Show a browser notification
     */
    async showNotification(
        title: string,
        options?: {
            body?: string;
            icon?: string;
            badge?: string;
            tag?: string;
            data?: any;
            requireInteraction?: boolean;
            silent?: boolean;
            vibrate?: number[];
            url?: string;
        }
    ): Promise<Notification | null> {
        if (!this.isSupported()) {
            console.warn('Notifications not supported');
            return null;
        }

        // Request permission if not granted
        if (this.permission !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                console.warn('Notification permission denied');
                return null;
            }
        }

        try {
            const defaultIcon = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
            <path fill="none" d="M0 0h256v256H0z" />
            <path fill="#000000" d="M128 24a104 104 0 1 0 104 104A104.1 104.1 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Z" opacity="0.2" />
            <path fill="#000000" d="m164.4 91.6-32.2 24.1a8 8 0 0 0-4.4 7.2v58.2a8 8 0 0 0 16 0v-53l26.2-19.6a8 8 0 1 0-8.8-14.8Z" />
            <path fill="#000000" d="m91.6 91.6 40.8 30.5a8 8 0 0 1 4.4 7.2v22.2a8 8 0 0 1-16 0v-19l-34.8-26a8 8 0 1 1 8.8-14.8Z" />
        </svg>
    `)}`;

            const notification = new Notification(title, {
                icon: options?.icon || defaultIcon,
                badge: options?.badge || defaultIcon,
                body: options?.body,
                tag: options?.tag,
                data: options?.data,
                requireInteraction: options?.requireInteraction || false,
                silent: options?.silent || false,
            });

            notification.onclick = (event) => {
            event.preventDefault(); // Prevent default behavior
            
            // Focus the window if it exists
            if (window) {
                window.focus();
            }
            
            // Navigate to specific URL if provided
            if (options?.url) {
                window.location.href = options.url;
            }
            
            // Close the notification
            notification.close();
        };

            // Auto-close after 10 seconds if not requireInteraction
            if (!options?.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 10000);
            }

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }

    /**
     * Show AI generation complete notification
     */
    async notifyAIGenerationComplete(count: number): Promise<void> {
        await this.showNotification('AI Design Generation Complete! 🎨', {
            body: `${count} design variation${count > 1 ? 's' : ''} ready to view`,
            tag: 'ai-generation-complete',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
        });
    }

    /**
     * Show sync complete notification
     */
    async notifySyncComplete(itemCount: number): Promise<void> {
        await this.showNotification('Sync Complete ✅', {
            body: `Successfully synced ${itemCount} item${itemCount > 1 ? 's' : ''}`,
            tag: 'sync-complete',
            requireInteraction: false,
        });
    }

    /**
     * Show connection restored notification
     */
    async notifyConnectionRestored(): Promise<void> {
        await this.showNotification('Connection Restored 🌐', {
            body: 'You\'re back online! Syncing your data...',
            tag: 'connection-restored',
            requireInteraction: false,
        });
    }

    /**
     * Show product cached notification
     */
    async notifyProductsCached(count: number): Promise<void> {
        await this.showNotification('Products Cached 💾', {
            body: `${count} products saved for offline viewing`,
            tag: 'products-cached',
            requireInteraction: false,
            silent: true,
        });
    }

    /**
     * Show generic task complete notification
     */
    async notifyTaskComplete(taskName: string, details?: string): Promise<void> {
        await this.showNotification(`${taskName} Complete ✓`, {
            body: details || 'Your task has been completed successfully',
            tag: `task-${taskName.toLowerCase().replace(/\s+/g, '-')}`,
            requireInteraction: false,
        });
    }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Export utility functions
export const requestNotificationPermission = () => notificationManager.requestPermission();
export const showNotification = (title: string, options?: any) => notificationManager.showNotification(title, options);
export const notifyAIGenerationComplete = (count: number) => notificationManager.notifyAIGenerationComplete(count);
export const notifySyncComplete = (itemCount: number) => notificationManager.notifySyncComplete(itemCount);
export const notifyConnectionRestored = () => notificationManager.notifyConnectionRestored();
export const notifyProductsCached = (count: number) => notificationManager.notifyProductsCached(count);
export const notifyTaskComplete = (taskName: string, details?: string) => notificationManager.notifyTaskComplete(taskName, details);
