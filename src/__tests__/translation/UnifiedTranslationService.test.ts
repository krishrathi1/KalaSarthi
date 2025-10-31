/**
 * Unified Translation Service Tests
 * Comprehensive test suite for the new translation system
 */

import { UnifiedTranslationService } from '@/lib/services/UnifiedTranslationService';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('UnifiedTranslationService', () => {
  let service: UnifiedTranslationService;

  beforeEach(() => {
    service = UnifiedTranslationService.getInstance();
    service.clearCache();
    (fetch as jest.Mock).mockClear();
  });

  describe('translateText', () => {
    it('should return original text for empty input', async () => {
      const result = await service.translateText('', 'hi');
      
      expect(result.translatedText).toBe('');
      expect(result.originalText).toBe('');
      expect(result.cached).toBe(false);
    });

    it('should return original text when source and target languages are the same', async () => {
      const result = await service.translateText('Hello', 'en', 'en');
      
      expect(result.translatedText).toBe('Hello');
      expect(result.originalText).toBe('Hello');
      expect(result.confidence).toBe(1.0);
    });

    it('should call translation API for different languages', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translatedText: 'नमस्ते',
          confidence: 0.95
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.translateText('Hello', 'hi', 'en');
      
      expect(fetch).toHaveBeenCalledWith('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        })
      });
      
      expect(result.translatedText).toBe('नमस्ते');
      expect(result.confidence).toBe(0.95);
      expect(result.cached).toBe(false);
    });

    it('should use cached translation on second call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translatedText: 'नमस्ते',
          confidence: 0.95
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // First call
      await service.translateText('Hello', 'hi', 'en');
      
      // Second call should use cache
      const result = await service.translateText('Hello', 'hi', 'en');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(true);
      expect(result.translatedText).toBe('नमस्ते');
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.translateText('Hello', 'hi', 'en');
      
      expect(result.translatedText).toBe('Hello'); // Returns original text
      expect(result.confidence).toBe(0.0);
      expect(result.cached).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.translateText('Hello', 'hi', 'en');
      
      expect(result.translatedText).toBe('Hello'); // Returns original text
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translatedText: 'मॉक अनुवाद',
          confidence: 0.95
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const texts = ['Hello', 'World', 'Test'];
      const result = await service.translateBatch(texts, 'hi', 'en');
      
      expect(result.results).toHaveLength(3);
      expect(result.results[0].translatedText).toBe('मॉक अनुवाद');
      expect(result.totalProcessingTime).toBeGreaterThan(0);
    });

    it('should calculate cache hit rate correctly', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translatedText: 'cached',
          confidence: 0.95
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // First batch - no cache hits
      const texts1 = ['Hello', 'World'];
      const result1 = await service.translateBatch(texts1, 'hi', 'en');
      expect(result1.cacheHitRate).toBe(0);

      // Second batch - all cache hits
      const result2 = await service.translateBatch(texts1, 'hi', 'en');
      expect(result2.cacheHitRate).toBe(1);
    });
  });

  describe('caching system', () => {
    it('should clear cache correctly', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ translatedText: 'test', confidence: 0.95 })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Add something to cache
      await service.translateText('Hello', 'hi', 'en');
      
      // Clear cache
      service.clearCache();
      
      // Should call API again
      await service.translateText('Hello', 'hi', 'en');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('language support', () => {
    it('should check language pair support', () => {
      expect(service.isLanguagePairSupported('en', 'hi')).toBe(true);
      expect(service.isLanguagePairSupported('en', 'xyz' as any)).toBe(false);
    });

    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('en');
      expect(languages).toContain('hi');
      expect(languages).toContain('es');
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limit errors', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.translateText('Hello', 'hi', 'en');
      
      expect(result.translatedText).toBe('Hello'); // Fallback to original
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('performance', () => {
    it('should complete translation within reasonable time', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translatedText: 'नमस्ते',
          confidence: 0.95
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await service.translateText('Hello', 'hi', 'en');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});

describe('UnifiedTranslationCache', () => {
  let service: UnifiedTranslationService;

  beforeEach(() => {
    service = UnifiedTranslationService.getInstance();
    service.clearCache();
  });

  it('should store and retrieve cached values', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        translatedText: 'cached value',
        confidence: 0.95
      })
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    // First call - should cache
    const result1 = await service.translateText('test', 'hi', 'en');
    expect(result1.cached).toBe(false);

    // Second call - should use cache
    const result2 = await service.translateText('test', 'hi', 'en');
    expect(result2.cached).toBe(true);
    expect(result2.translatedText).toBe('cached value');
  });

  it('should handle localStorage gracefully when unavailable', () => {
    // Mock localStorage to throw error
    const originalLocalStorage = global.localStorage;
    delete (global as any).localStorage;

    expect(() => {
      service.clearCache();
    }).not.toThrow();

    // Restore localStorage
    global.localStorage = originalLocalStorage;
  });
});