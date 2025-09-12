/**
 * Service Worker Registration and Management
 */

export class ServiceWorkerManager {
    private static instance: ServiceWorkerManager;
    private registration: ServiceWorkerRegistration | null = null;
    private isSupported = false;

    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    }

    static getInstance(): ServiceWorkerManager {
        if (!ServiceWorkerManager.instance) {
            ServiceWorkerManager.instance = new ServiceWorkerManager();
        }
        return ServiceWorkerManager.instance;
    }

    async register(): Promise<ServiceWorkerRegistration | null> {
        if (!this.isSupported) {
            console.warn('Service Worker not supported in this browser');
            return null;
        }

        try {
            this.registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
            });

            console.log('Service Worker registered successfully:', this.registration);

            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration?.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, notify user
                            this.notifyUpdate();
                        }
                    });
                }
            });

            return this.registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }

    async unregister(): Promise<boolean> {
        if (!this.registration) {
            return false;
        }

        try {
            const result = await this.registration.unregister();
            console.log('Service Worker unregistered:', result);
            this.registration = null;
            return result;
        } catch (error) {
            console.error('Service Worker unregistration failed:', error);
            return false;
        }
    }

    async update(): Promise<void> {
        if (!this.registration) {
            return;
        }

        try {
            await this.registration.update();
            console.log('Service Worker update requested');
        } catch (error) {
            console.error('Service Worker update failed:', error);
        }
    }

    getRegistration(): ServiceWorkerRegistration | null {
        return this.registration;
    }

    isServiceWorkerSupported(): boolean {
        return this.isSupported;
    }

    private notifyUpdate(): void {
        // Create a custom event to notify the app about updates
        const updateEvent = new CustomEvent('sw-update-available', {
            detail: { registration: this.registration }
        });
        window.dispatchEvent(updateEvent);
    }

    // Listen for messages from service worker
    setupMessageListener(): void {
        if (!this.isSupported || typeof window === 'undefined') return;

        navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, data } = event.data;

            switch (type) {
                case 'CACHE_UPDATED':
                    console.log('Cache updated:', data);
                    break;
                case 'SYNC_COMPLETE':
                    console.log('Background sync complete:', data);
                    break;
                case 'OFFLINE_DATA_READY':
                    console.log('Offline data ready:', data);
                    break;
                default:
                    console.log('Unknown message from service worker:', event.data);
            }
        });
    }

    // Send message to service worker
    async sendMessage(type: string, data?: any): Promise<void> {
        if (!this.registration?.active) {
            console.warn('No active service worker to send message to');
            return;
        }

        try {
            this.registration.active.postMessage({ type, data });
        } catch (error) {
            console.error('Failed to send message to service worker:', error);
        }
    }

    // Check if app is running in standalone mode (PWA)
    isStandalone(): boolean {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
    }

    // Get app installation prompt
    async getInstallPrompt(): Promise<BeforeInstallPromptEvent | null> {
        if (typeof window === 'undefined') return null;

        return new Promise((resolve) => {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                resolve(e as BeforeInstallPromptEvent);
            });
        });
    }

    // Install app
    async installApp(): Promise<boolean> {
        try {
            const prompt = await this.getInstallPrompt();
            if (prompt) {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                return outcome === 'accepted';
            }
            return false;
        } catch (error) {
            console.error('App installation failed:', error);
            return false;
        }
    }
}

// Global interface for install prompt
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Auto-register service worker when module is loaded (only on client side)
if (typeof window !== 'undefined') {
    serviceWorkerManager.register().then(() => {
        serviceWorkerManager.setupMessageListener();
    });
}
