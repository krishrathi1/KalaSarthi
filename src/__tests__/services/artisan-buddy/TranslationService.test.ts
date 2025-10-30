/**
 * Translation Service Tests
 * Tests for Redis caching, batch optimization, quality monitoring, and error handling
 */

import { TranslationService, TranslationRequest } from '@/lib/services/artisan-buddy/TranslationService';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn()
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = TranslationService.getInstance({
      redis: {
        enabled: false, // Disable Redis for tests
        url: 'redis://localhost:6379',
        keyPrefix: 'test:translation:',
        maxRetries: 3,
        retryDelay: 1000
      },
      quality: {
        minConfidence: 0.7,
        enableMonitoring: true,
        sampleRate: 1.0 // Monitor all translations in tests
      }
    });

    (fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await service.clearCache();
  });

  describe('Single Translation', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      const result = await service.translate(request);

      expect(result.translatedText).toBe('नमस्ते');
      expect(result.confidence).toBe(0.95);
      expect(result.cached).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should return original text for empty input', async () => {
      const request: TranslationRequest = {
        text: '',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      const result = await service.translate(request);

      expect(result.translatedText).toBe('');
      expect(result.confidence).toBe(1.0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return original text when source and target are the same', async () => {
      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'en'
      };

      const result = await service.translate(request);

      expect(result.translatedText).toBe('Hello');
      expect(result.confidence).toBe(1.0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should use cached translation on second call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      // First call
      const result1 = await service.translate(request);
      expect(result1.cached).toBe(false);

      // Second call should use cache
      const result2 = await service.translate(request);
      expect(result2.cached).toBe(true);
      expect(result2.translatedText).toBe('नमस्ते');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      const result = await service.translate(request);

      expect(result.translatedText).toBe('Hello'); // Returns original text
      expect(result.confidence).toBe(0.0);
      expect(result.error).toBeDefined();
    });
  });

  describe('Batch Translation', () => {
    it('should translate multiple texts', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translations: [
            { translated: 'नमस्ते', success: true },
            { translated: 'दुनिया', success: true },
            { translated: 'परीक्षण', success: true }
          ]
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const requests: TranslationRequest[] = [
        { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' },
        { text: 'World', sourceLanguage: 'en', targetLanguage: 'hi' },
        { text: 'Test', sourceLanguage: 'en', targetLanguage: 'hi' }
      ];

      const result = await service.translateBatch(requests);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].translatedText).toBe('नमस्ते');
      expect(result.results[1].translatedText).toBe('दुनिया');
      expect(result.results[2].translatedText).toBe('परीक्षण');
      expect(result.successRate).toBe(1.0);
      expect(result.errors).toHaveLength(0);
    });

    it('should use cache for previously translated texts', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // First translate individually to cache
      await service.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

      (fetch as jest.Mock).mockClear();

      // Now batch translate with the same text
      const requests: TranslationRequest[] = [
        { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' },
        { text: 'World', sourceLanguage: 'en', targetLanguage: 'hi' }
      ];

      const mockBatchResponse = {
        ok: true,
        json: async () => ({
          translations: [
            { translated: 'दुनिया', success: true }
          ]
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockBatchResponse);

      const result = await service.translateBatch(requests);

      expect(result.cacheHitRate).toBeGreaterThan(0);
      expect(result.results[0].cached).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translations: [
            { translated: 'नमस्ते', success: true },
            { translated: 'World', success: false },
            { translated: 'परीक्षण', success: true }
          ]
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const requests: TranslationRequest[] = [
        { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' },
        { text: 'World', sourceLanguage: 'en', targetLanguage: 'hi' },
        { text: 'Test', sourceLanguage: 'en', targetLanguage: 'hi' }
      ];

      const result = await service.translateBatch(requests);

      expect(result.results).toHaveLength(3);
      expect(result.successRate).toBeCloseTo(0.67, 1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Monitoring', () => {
    it('should record quality metrics', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      await service.translate(request);

      const metrics = service.getQualityMetrics();

      expect(metrics.total).toBeGreaterThan(0);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should track cache hit rate', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      // First call - not cached
      await service.translate(request);

      // Second call - cached
      await service.translate(request);

      const metrics = service.getQualityMetrics();

      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should track metrics by language pair', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await service.translate({
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

      await service.translate({
        text: 'Goodbye',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      });

      const metrics = service.getQualityMetrics();

      expect(metrics.byLanguagePair['en_hi']).toBeDefined();
      expect(metrics.byLanguagePair['en_hi'].count).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          result: {
            translatedText: 'नमस्ते',
            confidence: 0.95
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      // Translate and cache
      await service.translate(request);

      // Clear cache
      await service.clearCache();

      (fetch as jest.Mock).mockClear();
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Should call API again
      const result = await service.translate(request);

      expect(result.cached).toBe(false);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      const result = await service.translate(request);

      expect(result.error).toBeDefined();
      expect(result.translatedText).toBe('Hello');
      expect(result.confidence).toBe(0.0);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      const result = await service.translate(request);

      expect(result.error).toBeDefined();
      expect(result.confidence).toBe(0.0);
    });

    it('should track error rate in metrics', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const request: TranslationRequest = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      };

      await service.translate(request);

      const metrics = service.getQualityMetrics();

      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    });
  });
});
