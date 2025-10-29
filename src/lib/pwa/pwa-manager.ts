/**
 * PWA Manager - Handles Progressive Web App functionality
 * Implements offline capabilities, service worker management, and install prompts
 */

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: any = null;
  private isInstalled = false;
  private isOnline = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private initialize() {
    // Register service worker
    this.registerServiceWorker();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyInstallAvailable();
    });

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyInstalled();
    });

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyOnlineStatusChange(false);
    });

    // Check initial install status
    this.checkInstallStatus();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service Worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.notifyUpdateAvailable();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private checkInstallStatus() {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSStandalone = (window.navigator as any).standalone === true;

    this.isInstalled = isStandalone || (isIOS && isIOSStandalone);
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      this.deferredPrompt = null;
      return true;
    }

    return false;
  }

  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  getInstallStatus(): boolean {
    return this.isInstalled;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Event notifications
  private notifyInstallAvailable() {
    window.dispatchEvent(new CustomEvent('pwa:installAvailable'));
  }

  private notifyInstalled() {
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  }

  private notifyUpdateAvailable() {
    window.dispatchEvent(new CustomEvent('pwa:updateAvailable'));
  }

  private notifyOnlineStatusChange(isOnline: boolean) {
    window.dispatchEvent(new CustomEvent('pwa:onlineStatusChange', {
      detail: { isOnline }
    }));
  }

  // Cache management
  async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  async getCacheSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }
}

export const pwaManager = PWAManager.getInstance();
