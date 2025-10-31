/**
 * Translation Context and Provider
 * Manages global translation state and language selection
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LanguageCode } from '@/lib/i18n';
import { unifiedTranslationService, TranslationResult } from '@/lib/services/UnifiedTranslationService';

interface TranslationState {
  currentLanguage: LanguageCode;
  isTranslating: boolean;
  isEnabled: boolean;
  error: string | null;
  cacheStats: { size: number; hitRate: number };
}

interface TranslationContextType extends TranslationState {
  setLanguage: (language: LanguageCode) => void;
  toggleTranslation: () => void;
  translateText: (text: string, targetLang?: LanguageCode, autoDetectSource?: boolean) => Promise<string>;
  detectLanguage: (text: string) => import('@/lib/services/UnifiedTranslationService').LanguageDetectionResult;
  addCustomOverride: (override: Omit<import('@/lib/services/UnifiedTranslationService').CustomTranslationOverride, 'createdAt'>) => void;
  submitQualityFeedback: (feedback: Omit<import('@/lib/services/UnifiedTranslationService').QualityFeedback, 'timestamp'>) => void;
  clearCache: () => void;
  retryTranslation: () => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: React.ReactNode;
  defaultLanguage?: LanguageCode;
  autoDetectLanguage?: boolean;
}

export function TranslationProvider({
  children,
  defaultLanguage = 'en',
  autoDetectLanguage = true
}: TranslationProviderProps) {
  const [state, setState] = useState<TranslationState>({
    currentLanguage: defaultLanguage,
    isTranslating: false,
    isEnabled: false,
    error: null,
    cacheStats: { size: 0, hitRate: 0 }
  });

  // Load saved language preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('preferred_language') as LanguageCode;
      const savedEnabled = localStorage.getItem('translation_enabled') === 'true';
      
      let initialLanguage = defaultLanguage;
      
      if (savedLanguage) {
        initialLanguage = savedLanguage;
      } else if (autoDetectLanguage) {
        // Auto-detect from browser language
        const browserLang = navigator.language.split('-')[0] as LanguageCode;
        if (unifiedTranslationService.getSupportedLanguages().includes(browserLang)) {
          initialLanguage = browserLang;
        }
      }

      setState(prev => ({
        ...prev,
        currentLanguage: initialLanguage,
        isEnabled: savedEnabled && initialLanguage !== 'en'
      }));
    }
  }, [defaultLanguage, autoDetectLanguage]);

  // Update cache stats periodically
  useEffect(() => {
    const updateCacheStats = () => {
      setState(prev => ({
        ...prev,
        cacheStats: unifiedTranslationService.getCacheStats()
      }));
    };

    updateCacheStats();
    const interval = setInterval(updateCacheStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const setLanguage = useCallback((language: LanguageCode) => {
    setState(prev => ({ ...prev, currentLanguage: language, error: null }));
    
    // Save preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_language', language);
    }
  }, []);

  const toggleTranslation = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.isEnabled;
      
      // Save preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('translation_enabled', newEnabled.toString());
      }
      
      return { ...prev, isEnabled: newEnabled, error: null };
    });
  }, []);

  const translateText = useCallback(async (
    text: string, 
    targetLang?: LanguageCode,
    autoDetectSource?: boolean
  ): Promise<string> => {
    const targetLanguage = targetLang || state.currentLanguage;
    
    if (!text || targetLanguage === 'en') {
      return text;
    }

    setState(prev => ({ ...prev, isTranslating: true, error: null }));

    try {
      const result = await unifiedTranslationService.translateText(text, targetLanguage, 'en', autoDetectSource);
      return result.translatedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      return text; // Return original text on error
    } finally {
      setState(prev => ({ ...prev, isTranslating: false }));
    }
  }, [state.currentLanguage]);

  const detectLanguage = useCallback((text: string) => {
    return unifiedTranslationService.detectLanguage(text);
  }, []);

  const addCustomOverride = useCallback((override: Omit<import('@/lib/services/UnifiedTranslationService').CustomTranslationOverride, 'createdAt'>) => {
    unifiedTranslationService.addCustomOverride(override);
  }, []);

  const submitQualityFeedback = useCallback((feedback: Omit<import('@/lib/services/UnifiedTranslationService').QualityFeedback, 'timestamp'>) => {
    unifiedTranslationService.submitQualityFeedback(feedback);
  }, []);

  const clearCache = useCallback(() => {
    unifiedTranslationService.clearCache();
    setState(prev => ({
      ...prev,
      cacheStats: { size: 0, hitRate: 0 }
    }));
  }, []);

  const retryTranslation = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const contextValue: TranslationContextType = {
    ...state,
    setLanguage,
    toggleTranslation,
    translateText,
    detectLanguage,
    addCustomOverride,
    submitQualityFeedback,
    clearCache,
    retryTranslation
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}