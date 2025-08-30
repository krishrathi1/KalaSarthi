'use client';

import { useGlobalTranslation } from '@/hooks/use-global-translation';

// This component initializes the global translation functionality
// It should be added to the main layout to enable page-wide translation
export function GlobalTranslationProvider() {
  // Initialize the global translation hook
  useGlobalTranslation();

  // This component doesn't render anything, it just initializes the functionality
  return null;
}