/**
 * Translation Context Tests
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TranslationProvider, useTranslation } from '@/context/TranslationContext';

// Mock the unified translation service
jest.mock('@/lib/services/UnifiedTranslationService', () => ({
  unifiedTranslationService: {
    translateText: jest.fn().mockResolvedValue({
      translatedText: 'मॉक अनुवाद',
      originalText: 'mock text',
      confidence: 0.95,
      cached: false,
      processingTime: 100
    }),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({ size: 0, hitRate: 0 }),
    getSupportedLanguages: jest.fn().mockReturnValue(['en', 'hi', 'es'])
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Test component that uses the translation context
const TestComponent = () => {
  const {
    currentLanguage,
    isTranslating,
    isEnabled,
    error,
    setLanguage,
    toggleTranslation,
    translateText,
    clearCache,
    retryTranslation
  } = useTranslation();

  return (
    <div>
      <div data-testid="current-language">{currentLanguage}</div>
      <div data-testid="is-translating">{isTranslating.toString()}</div>
      <div data-testid="is-enabled">{isEnabled.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      
      <button onClick={() => setLanguage('hi')}>Set Hindi</button>
      <button onClick={toggleTranslation}>Toggle Translation</button>
      <button onClick={() => translateText('test')}>Translate</button>
      <button onClick={clearCache}>Clear Cache</button>
      <button onClick={retryTranslation}>Retry</button>
    </div>
  );
};

describe('TranslationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should provide default values', () => {
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    expect(screen.getByTestId('is-translating')).toHaveTextContent('false');
    expect(screen.getByTestId('is-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should use custom default language', () => {
    render(
      <TranslationProvider defaultLanguage="hi">
        <TestComponent />
      </TranslationProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('hi');
  });

  it('should load saved language preference', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'preferred_language') return 'es';
      if (key === 'translation_enabled') return 'true';
      return null;
    });

    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('es');
    expect(screen.getByTestId('is-enabled')).toHaveTextContent('true');
  });

  it('should auto-detect browser language when enabled', () => {
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'hi-IN',
      configurable: true
    });

    render(
      <TranslationProvider autoDetectLanguage={true}>
        <TestComponent />
      </TranslationProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('hi');
  });

  it('should change language when setLanguage is called', async () => {
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const setHindiButton = screen.getByText('Set Hindi');
    
    await act(async () => {
      setHindiButton.click();
    });

    expect(screen.getByTestId('current-language')).toHaveTextContent('hi');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('preferred_language', 'hi');
  });

  it('should toggle translation state', async () => {
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const toggleButton = screen.getByText('Toggle Translation');
    
    await act(async () => {
      toggleButton.click();
    });

    expect(screen.getByTestId('is-enabled')).toHaveTextContent('true');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('translation_enabled', 'true');
  });

  it('should translate text and update state', async () => {
    const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
    
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const translateButton = screen.getByText('Translate');
    
    await act(async () => {
      translateButton.click();
    });

    expect(unifiedTranslationService.translateText).toHaveBeenCalledWith('test', 'en', 'en');
  });

  it('should handle translation errors', async () => {
    const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
    unifiedTranslationService.translateText.mockRejectedValueOnce(new Error('Translation failed'));

    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const translateButton = screen.getByText('Translate');
    
    await act(async () => {
      translateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Translation failed');
    });
  });

  it('should clear cache when clearCache is called', async () => {
    const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
    
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const clearCacheButton = screen.getByText('Clear Cache');
    
    await act(async () => {
      clearCacheButton.click();
    });

    expect(unifiedTranslationService.clearCache).toHaveBeenCalled();
  });

  it('should retry translation when retryTranslation is called', async () => {
    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    // First set an error
    const translateButton = screen.getByText('Translate');
    const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
    unifiedTranslationService.translateText.mockRejectedValueOnce(new Error('Test error'));

    await act(async () => {
      translateButton.click();
    });

    // Then retry
    const retryButton = screen.getByText('Retry');
    
    await act(async () => {
      retryButton.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTranslation must be used within a TranslationProvider');

    consoleSpy.mockRestore();
  });

  it('should update cache stats periodically', async () => {
    const { unifiedTranslationService } = require('@/lib/services/UnifiedTranslationService');
    unifiedTranslationService.getCacheStats.mockReturnValue({ size: 5, hitRate: 0.8 });

    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    // Wait for initial cache stats update
    await waitFor(() => {
      expect(unifiedTranslationService.getCacheStats).toHaveBeenCalled();
    });
  });

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    render(
      <TranslationProvider>
        <TestComponent />
      </TranslationProvider>
    );

    const setHindiButton = screen.getByText('Set Hindi');
    
    expect(() => {
      act(() => {
        setHindiButton.click();
      });
    }).not.toThrow();
  });
});