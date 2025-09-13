
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { LanguageCode } from '@/lib/i18n';
import { preloadCriticalTranslations } from '@/lib/i18n';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = async (newLanguage: LanguageCode) => {
    if (newLanguage === language) return;

    setLanguageState(newLanguage);
    setIsTranslating(true);

    try {
      // Preload critical translations in background
      await preloadCriticalTranslations(newLanguage);
    } catch (error) {
      console.error('Failed to preload translations:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Preload English translations on mount (no-op but ensures cache is ready)
  useEffect(() => {
    preloadCriticalTranslations('en').catch(console.error);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
