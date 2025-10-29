'use client';

import React, { ReactNode } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  showInstallPrompt?: boolean;
  showOfflineIndicator?: boolean;
  className?: string;
}

export function MobileOptimizedLayout({
  children,
  showInstallPrompt = true,
  showOfflineIndicator = true,
  className = ''
}: MobileOptimizedLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Mobile-optimized viewport */}
      <div className="w-full max-w-7xl mx-auto">
        {/* Main content with touch-optimized spacing */}
        <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>

      {/* PWA features */}
      {showOfflineIndicator && <OfflineIndicator />}
      {showInstallPrompt && <PWAInstallPrompt />}
    </div>
  );
}
