'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { pwaManager } from '@/lib/pwa/pwa-manager';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if can install
    const checkInstallStatus = () => {
      setIsInstalled(pwaManager.getInstallStatus());
      setShowPrompt(pwaManager.canInstall());
    };

    checkInstallStatus();

    // Listen for install events
    const handleInstallAvailable = () => {
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('pwa:installAvailable', handleInstallAvailable);
    window.addEventListener('pwa:installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa:installAvailable', handleInstallAvailable);
      window.removeEventListener('pwa:installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const success = await pwaManager.promptInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Install Scheme Sahayak
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get quick access and work offline. Install our app for the best experience.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
