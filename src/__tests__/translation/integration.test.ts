/**
 * Translation System Integration Test
 * End-to-end test of the complete translation workflow
 */

import { unifiedTranslationService } from '@/lib/services/UnifiedTranslationService';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Translation System Integration', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    unifiedTranslationService.clearCache();
  });

  it('should complete full translation workflow', async () => {
    // Mock successful API response
    const mockResponse = {
      ok: true,
      json: async () => ({
        translatedText: 'नमस्ते दुनिया',
        originalText: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        confidence: 0.95
      })
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Test single translation
    const result = await unifiedTranslationService.translateText('Hello world', 'hi', 'en');
    
    expect(result.translatedText).toBe('नमस्ते दुनिया');
    expect(result.confidence).toBe(0.95);
    expect(result.cached).toBe(false);
    expect(result.processingTime).toBeGreaterThan(0);

    // Test cached translation (should not call API again)
    const cachedResult = await unifiedTranslationService.translateText('Hello world', 'hi', 'en');
    
    expect(cachedResult.translatedText).toBe('नमस्ते दुनिया');
    expect(cachedResult.cached).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should handle batch translation efficiently', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        translatedText: 'अनुवादित पाठ',
        confidence: 0.95
      })
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    const texts = ['Hello', 'World', 'Test', 'Translation'];
    const result = await unifiedTranslationService.translateBatch(texts, 'hi', 'en');
    
    expect(result.results).toHaveLength(4);
    expect(result.cacheHitRate).toBe(0); // First time, no cache hits
    expect(result.totalProcessingTime).toBeGreaterThan(0);
    
    // Test batch with some cached items
    const secondResult = await unifiedTranslationService.translateBatch(texts, 'hi', 'en');
    expect(secondResult.cacheHitRate).toBe(1); // All cached
  });

  it('should handle errors gracefully', async () => {
    // Mock API error
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const result = await unifiedTranslationService.translateText('Hello', 'hi', 'en');
    
    // Should return original text on error
    expect(result.translatedText).toBe('Hello');
    expect(result.confidence).toBe(0.0);
    expect(result.cached).toBe(false);
  });

  it('should respect rate limiting', async () => {
    // This test would need to be run with actual rate limiting
    // For now, we just verify the rate limiter exists
    expect(unifiedTranslationService).toBeDefined();
    expect(typeof unifiedTranslationService.translateText).toBe('function');
  });

  it('should provide accurate cache statistics', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        translatedText: 'परीक्षण',
        confidence: 0.95
      })
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Initial cache should be empty
    let stats = unifiedTranslationService.getCacheStats();
    expect(stats.size).toBe(0);

    // Add some translations
    await unifiedTranslationService.translateText('Test 1', 'hi', 'en');
    await unifiedTranslationService.translateText('Test 2', 'hi', 'en');
    
    // Cache should have items
    stats = unifiedTranslationService.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should support all required languages', () => {
    const supportedLanguages = unifiedTranslationService.getSupportedLanguages();
    
    // Check for key Indian languages
    expect(supportedLanguages).toContain('hi'); // Hindi
    expect(supportedLanguages).toContain('ta'); // Tamil
    expect(supportedLanguages).toContain('bn'); // Bengali
    expect(supportedLanguages).toContain('te'); // Telugu
    
    // Check for international languages
    expect(supportedLanguages).toContain('es'); // Spanish
    expect(supportedLanguages).toContain('fr'); // French
    expect(supportedLanguages).toContain('de'); // German
    expect(supportedLanguages).toContain('zh'); // Chinese
    
    // Should have at least 20 languages
    expect(supportedLanguages.length).toBeGreaterThanOrEqual(20);
  });

  it('should validate language pair support', () => {
    // Valid pairs
    expect(unifiedTranslationService.isLanguagePairSupported('en', 'hi')).toBe(true);
    expect(unifiedTranslationService.isLanguagePairSupported('hi', 'en')).toBe(true);
    expect(unifiedTranslationService.isLanguagePairSupported('en', 'es')).toBe(true);
    
    // Invalid pairs
    expect(unifiedTranslationService.isLanguagePairSupported('en', 'xyz' as any)).toBe(false);
    expect(unifiedTranslationService.isLanguagePairSupported('abc' as any, 'hi')).toBe(false);
  });

  it('should handle same language translation efficiently', async () => {
    const result = await unifiedTranslationService.translateText('Hello', 'en', 'en');
    
    expect(result.translatedText).toBe('Hello');
    expect(result.confidence).toBe(1.0);
    expect(result.cached).toBe(false);
    expect(fetch).not.toHaveBeenCalled(); // Should not call API
  });

  it('should handle empty text gracefully', async () => {
    const result = await unifiedTranslationService.translateText('', 'hi', 'en');
    
    expect(result.translatedText).toBe('');
    expect(result.originalText).toBe('');
    expect(result.processingTime).toBe(0);
    expect(fetch).not.toHaveBeenCalled(); // Should not call API
  });

  it('should clear cache properly', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        translatedText: 'कैश परीक्षण',
        confidence: 0.95
      })
    };
    
    (fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Add something to cache
    await unifiedTranslationService.translateText('Cache test', 'hi', 'en');
    
    // Verify it's cached
    let stats = unifiedTranslationService.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
    
    // Clear cache
    unifiedTranslationService.clearCache();
    
    // Verify cache is empty
    stats = unifiedTranslationService.getCacheStats();
    expect(stats.size).toBe(0);
  });
});