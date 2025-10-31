'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { syncManager, SyncStatus as Status } from '@/lib/offline/sync-manager';

export function SyncStatus() {
  const [status, setStatus] = useState<Status>({
    isOnline: navigator.onLine,
    isSyncing: false,
    queueLength: 0,
    message: ''
  });
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setShowStatus(true);

      // Auto-hide after 5 seconds if no errors
      if (!newStatus.error && !newStatus.isSyncing) {
        setTimeout(() => {
          setShowStatus(false);
        }, 5000);
      }
    });

    return unsubscribe;
  }, []);

  const handleManualSync = () => {
    syncManager.startSync();
  };

  if (!showStatus && status.queueLength === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className={
        status.error ? 'bg-red-50 border-red-200' :
        status.isSyncing ? 'bg-blue-50 border-blue-200' :
        status.queueLength > 0 ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {status.error ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : status.isSyncing ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            ) : status.queueLength > 0 ? (
              <CloudOff className="w-5 h-5 text-yellow-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <AlertDescription className={
              status.error ? 'text-red-800' :
              status.isSyncing ? 'text-blue-800' :
              status.queueLength > 0 ? 'text-yellow-800' :
              'text-green-800'
            }>
              <div className="font-medium mb-1">
                {status.error ? 'Sync Error' :
                 status.isSyncing ? 'Syncing...' :
                 status.queueLength > 0 ? 'Pending Sync' :
                 'Synced'}
              </div>
              <div className="text-sm">
                {status.message}
              </div>
              {status.queueLength > 0 && (
                <div className="text-sm mt-1">
                  {status.queueLength} item{status.queueLength !== 1 ? 's' : ''} waiting to sync
                </div>
              )}
            </AlertDescription>
          </div>

          {status.queueLength > 0 && !status.isSyncing && status.isOnline && (
            <Button
              onClick={handleManualSync}
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Sync Now
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}
