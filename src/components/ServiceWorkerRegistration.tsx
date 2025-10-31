'use client';

import { useEffect, useState } from 'react';
import { serviceWorkerManager } from '@/lib/service-worker';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function ServiceWorkerRegistration() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Register service worker
    const registerSW = async () => {
      try {
        const reg = await serviceWorkerManager.register();
        if (reg) {
          setRegistration(reg);
          console.log('✅ Service Worker registered successfully');
        }
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    };

    registerSW();

    // Listen for service worker updates
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Service Worker update available');
      setShowUpdatePrompt(true);
      setRegistration(customEvent.detail.registration);
    };

    window.addEventListener('sw-update-available', handleUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  const handleUpdate = async () => {
    if (!registration?.waiting) return;

    // Tell the waiting service worker to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload the page when the new service worker activates
    registration.waiting.addEventListener('statechange', (e) => {
      const target = e.target as ServiceWorker;
      if (target.state === 'activated') {
        window.location.reload();
      }
    });

    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    toast({
      title: "Update Available",
      description: "A new version is available. Refresh to update.",
      duration: 5000,
    });
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <RefreshCw className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Update Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              A new version of KalaSarthi is available. Update now for the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
