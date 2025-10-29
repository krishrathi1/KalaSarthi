'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pwaManager } from '@/lib/pwa/pwa-manager';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    setIsOnline(pwaManager.getOnlineStatus());

    const handleOnlineStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOnline: boolean }>;
      const newStatus = customEvent.detail.isOnline;
      
      setIsOnline(newStatus);
      setShowNotification(true);

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    };

    window.addEventListener('pwa:onlineStatusChange', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('pwa:onlineStatusChange', handleOnlineStatusChange);
    };
  }, []);

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Alert className={isOnline ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-600" />
          )}
          <AlertDescription className={isOnline ? 'text-green-800' : 'text-yellow-800'}>
            {isOnline
              ? 'You are back online. Syncing data...'
              : 'You are offline. Some features may be limited.'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
