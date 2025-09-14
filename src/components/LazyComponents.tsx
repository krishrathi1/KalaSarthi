'use client';

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
export const LazyStoryRecordingMic = lazy(() => import('./ui/StoryRecordingMic').then(m => ({ default: m.StoryRecordingMic })));
export const LazySmartProductCreator = lazy(() => import('./smart-product-creator').then(m => ({ default: m.SmartProductCreator })));
export const LazyVoiceDemo = lazy(() => import('./voice/VoiceDemo').then(m => ({ default: m.VoiceDemo })));
export const LazyVoiceIntegration = lazy(() => import('./voice/VoiceIntegration').then(m => ({ default: m.VoiceIntegration })));
export const LazyPerformanceMonitor = lazy(() => import('./PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })));

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin mr-2" />
    <span className="text-sm text-gray-600">{message}</span>
  </div>
);

// Lazy wrapper with loading state
export function LazyWrapper({ 
  children, 
  fallback, 
  message 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  message?: string;
}) {
  return (
    <Suspense fallback={fallback || <LoadingFallback message={message} />}>
      {children}
    </Suspense>
  );
}

// Preload critical components
export function preloadComponents() {
  if (typeof window !== 'undefined') {
    // Preload heavy components in the background
    import('./ui/StoryRecordingMic');
    import('./smart-product-creator');
    import('./voice/VoiceDemo');
  }
}
