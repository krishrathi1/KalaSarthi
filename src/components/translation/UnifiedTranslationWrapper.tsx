/**
 * Unified Translation Wrapper
 * Replaces all existing broken translation components
 */

'use client';

import React, { useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';
import { useLanguage } from '@/context/language-context';
import { usePageTranslation } from '@/hooks/usePageTranslation';
import { TranslationStatus } from './TranslationStatus';
import { LanguageSelector } from './LanguageSelector';

interface UnifiedTranslationWrapperProps {
  children: React.ReactNode;
  showStatus?: boolean;
  showLanguageSelector?: boolean;
  autoTranslate?: boolean;
}

export function UnifiedTranslationWrapper({
  children,
  showStatus = false,
  showLanguageSelector = false,
  autoTranslate = true
}: UnifiedTranslationWrapperProps) {
  const { currentLanguage, setLanguage, isEnabled, toggleTranslation } = useTranslation();
  const { language: contextLanguage, setLanguage: setContextLanguage } = useLanguage();

  // Use page translation hook
  const { translatePage, restoreOriginalText, translatedCount } = usePageTranslation({
    enabled: autoTranslate,
    excludeSelectors: [
      'script', 'style', 'code', 'pre', 'noscript',
      '[data-no-translate]', '.no-translate',
      '[contenteditable="true"]', 'input', 'textarea'
    ],
    translateAttributes: ['placeholder', 'title', 'alt', 'aria-label'],
    debounceMs: 300
  });

  // Sync language between contexts
  useEffect(() => {
    if (contextLanguage !== currentLanguage) {
      setLanguage(contextLanguage);
    }
  }, [contextLanguage, currentLanguage, setLanguage]);

  // Handle language changes from translation context
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setContextLanguage(newLanguage);
  };

  // Auto-enable translation for non-English languages - DISABLED
  // useEffect(() => {
  //   if (currentLanguage !== 'en' && !isEnabled) {
  //     toggleTranslation();
  //   } else if (currentLanguage === 'en' && isEnabled) {
  //     toggleTranslation();
  //   }
  // }, [currentLanguage, isEnabled, toggleTranslation]);

  return (
    <>
      {children}

      {/* Translation Status - Fixed position */}
      {showStatus && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <TranslationStatus showDetails={false} />
        </div>
      )}

      {/* Language Selector - If needed as floating */}
      {showLanguageSelector && (
        <div className="fixed top-4 right-4 z-50">
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            showSearch={true}
            groupByRegion={true}
          />
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
          <div>Lang: {currentLanguage}</div>
          <div>Enabled: {isEnabled ? 'Yes' : 'No'}</div>
          <div>Translated: {translatedCount}</div>
        </div>
      )}
    </>
  );
}

export default UnifiedTranslationWrapper;