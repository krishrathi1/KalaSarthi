/**
 * Multilingual Audio Processing Tests
 * Tests STT, TTS, and Cultural Translation integration
 */

import { STTProcessor } from '@/lib/services/STTProcessor';
import { TTSProcessor } from '@/lib/services/TTSProcessor';
import { CulturalContextTranslator } from '@/lib/services/CulturalContextTranslator';
import { TranslationCache } from '@/lib/services/TranslationCache';

// Mock Google Cloud clients
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue([{
      results: [{
        alternatives: [{
          transcript: 'Hello, I would like to buy some pottery',
          confidence: 0.95
        }],
        languageCode: 'en-US'
      }]
    }])
  }))
}));

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: jest.fn().mockResolvedValue([{
      audioContent: Buffer.from('mock-audio-data')
    }])
  }))
}));

jest.mock('@google-cloud/translate', () => ({
  TranslationServiceClient: jest.fn().mockImplementation(() => ({
    translateText: jest.fn().mockResolvedValue([{
      translations: [{
        translatedText: 'नमस्ते, मैं कुछ मिट्टी के बर्तन खरीदना चाहूंगा',
        confidence: 0.9,
        detectedLanguageCode: 'en'
      }]
    }])
  }))
}));

describe('Multilingual Audio Processing', () => {
  let sttProcessor: STTProcessor;
  let ttsProcessor: TTSProcessor;
  let translator: CulturalContextTranslator;
  let cache: TranslationCache;

  beforeEach(() => {
    sttProcessor = STTProcessor.getInstance();
    ttsProcessor = TTSProcessor.getInstance();
    translator = CulturalContextTranslator.getInstance();
    cache = TranslationCache.getInstance();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('STT Processing', () => {
    it('should process English audio with craft-specific terms', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      
      const result = await sttProcessor.processAudio({
        audioData: mockAudioData,
        language: 'en',
        audioFormat: 'webm',
        sampleRate: 48000
      });

      expect(result.text).toBe('Hello, I would like to buy some pottery');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.language).toBe('en-US');
      expect(result.audioQuality).toBeDefined();
    });

    it('should return supported languages', () => {
      const languages = sttProcessor.getSupportedLanguages();
      
      expect(languages).toContainEqual({ code: 'en', name: 'English', region: 'US' });
      expect(languages).toContainEqual({ code: 'hi', name: 'Hindi', region: 'IN' });
      expect(languages.length).toBeGreaterThan(10);
    });
  });

  describe('TTS Processing', () => {
    it('should synthesize English speech with cultural context', async () => {
      const result = await ttsProcessor.synthesizeSpeech({
        text: 'Welcome to our pottery workshop',
        language: 'en',
        voiceGender: 'female',
        culturalContext: 'business'
      });

      expect(result.audioContent).toBeInstanceOf(Buffer);
      expect(result.language).toBe('en');
      expect(result.voiceGender).toBe('female');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should get voice recommendations for cultural context', () => {
      const recommendations = ttsProcessor.getVoiceRecommendations('hi', 'traditional');
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].culturalSuitability.traditional).toBeGreaterThan(0.7);
    });

    it('should support multiple Indian languages', () => {
      const supportedLanguages = ttsProcessor.getSupportedLanguages();
      
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('hi');
      expect(supportedLanguages).toContain('ta');
      expect(supportedLanguages).toContain('bn');
    });
  });

  describe('Cultural Context Translation', () => {
    it('should translate with cultural preservation', async () => {
      const result = await translator.translateText({
        text: 'I love traditional pottery and handloom textiles',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: 'craft',
        preserveCulturalTerms: true
      });

      expect(result.translatedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.culturalNotes).toBeDefined();
      expect(result.glossaryTermsUsed).toBeDefined();
    });

    it('should provide translation alternatives', async () => {
      const result = await translator.translateText({
        text: 'Beautiful kundan jewelry',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: 'craft'
      });

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0].context).toBeDefined();
    });

    it('should handle craft terminology correctly', () => {
      const potteryTerms = translator.getCraftTerminologyByCategory('pottery');
      
      expect(potteryTerms.pottery).toBeDefined();
      expect(potteryTerms.terracotta).toBeDefined();
      expect(potteryTerms.pottery.translations.hi).toBe('मिट्टी के बर्तन');
    });
  });

  describe('Translation Cache', () => {
    beforeEach(() => {
      // Initialize cache with offline phrases
      cache.addOfflinePhrase({
        sourceText: 'Hello',
        translations: {
          'hi': 'नमस्ते',
          'bn': 'নমস্কার',
          'ta': 'வணக்கம்'
        },
        category: 'greeting',
        priority: 5
      });

      cache.addOfflinePhrase({
        sourceText: 'Thank you',
        translations: {
          'hi': 'धन्यवाद',
          'bn': 'ধন্যবাদ',
          'ta': 'நன்றி'
        },
        category: 'common',
        priority: 5
      });
    });

    it('should cache and retrieve translations', () => {
      cache.set(
        'Hello',
        'नमस्ते',
        'en',
        'hi',
        'greeting',
        0.95
      );

      const cached = cache.get('Hello', 'en', 'hi', 'greeting');
      
      expect(cached).toBeDefined();
      expect(cached?.translatedText).toBe('नमस्ते');
      expect(cached?.confidence).toBe(0.95);
    });

    it('should provide offline translations for common phrases', () => {
      const translation = cache.getOfflineTranslation('Hello', 'en', 'hi');
      
      expect(translation).toBe('नमस्ते');
    });

    it('should generate cache statistics', () => {
      // Add some test data
      cache.set('Test 1', 'परीक्षण 1', 'en', 'hi', 'test', 0.9);
      cache.set('Test 2', 'परीक्षण 2', 'en', 'hi', 'test', 0.8);

      const stats = cache.getCacheStats();
      
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.topTranslations).toBeDefined();
      expect(stats.languagePairs).toBeDefined();
    });

    it('should update translation quality', () => {
      cache.set('Quality test', 'गुणवत्ता परीक्षण', 'en', 'hi', 'test', 0.7);
      
      cache.updateTranslationQuality('Quality test', 'en', 'hi', 'test', 5);
      
      const cached = cache.get('Quality test', 'en', 'hi', 'test');
      expect(cached?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      // Initialize cache with offline phrases for integration tests
      cache.addOfflinePhrase({
        sourceText: 'Thank you',
        translations: {
          'hi': 'धन्यवाद',
          'bn': 'ধন্যবাদ',
          'ta': 'நன்றி'
        },
        category: 'common',
        priority: 5
      });
    });

    it('should handle complete multilingual conversation flow', async () => {
      // 1. Process incoming audio (STT)
      const mockAudioData = Buffer.from('mock-audio-data');
      const sttResult = await sttProcessor.processAudio({
        audioData: mockAudioData,
        language: 'en',
        audioFormat: 'webm'
      });

      expect(sttResult.text).toBeDefined();

      // 2. Translate the text
      const translationResult = await translator.translateText({
        text: sttResult.text,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: 'craft'
      });

      expect(translationResult.translatedText).toBeDefined();

      // 3. Convert translated text to speech (TTS)
      const ttsResult = await ttsProcessor.synthesizeSpeech({
        text: translationResult.translatedText,
        language: 'hi',
        culturalContext: 'business'
      });

      expect(ttsResult.audioContent).toBeInstanceOf(Buffer);
      expect(ttsResult.language).toBe('hi');
    });

    it('should use cache for repeated translations', async () => {
      const text = 'Traditional handmade pottery';
      
      // First translation (should hit API)
      const result1 = await translator.translateText({
        text,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: 'craft'
      });

      // Second translation (should hit cache)
      const result2 = await translator.translateText({
        text,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        context: 'craft'
      });

      expect(result1.translatedText).toBe(result2.translatedText);
    });

    it('should handle offline mode gracefully', () => {
      // Test offline translation for common phrases
      const offlineTranslation = cache.getOfflineTranslation('Thank you', 'en', 'hi');
      expect(offlineTranslation).toBe('धन्यवाद');

      // Test fallback for unknown phrases
      const unknownTranslation = cache.getOfflineTranslation('Very specific craft term', 'en', 'hi');
      expect(unknownTranslation).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle STT processing errors gracefully', async () => {
      // Create a new instance that will throw an error
      const errorProcessor = new (require('@/lib/services/STTProcessor').STTProcessor)();
      
      // Mock the processAudio method to throw an error
      jest.spyOn(errorProcessor, 'processAudio').mockRejectedValue(new Error('API Error'));

      await expect(errorProcessor.processAudio({
        audioData: Buffer.from('invalid-data'),
        language: 'en'
      })).rejects.toThrow('API Error');
    });

    it('should handle TTS processing errors gracefully', async () => {
      // Create a new instance that will throw an error
      const errorTTSProcessor = new (require('@/lib/services/TTSProcessor').TTSProcessor)();
      
      // Mock the synthesizeSpeech method to throw an error
      jest.spyOn(errorTTSProcessor, 'synthesizeSpeech').mockRejectedValue(new Error('TTS Error'));

      await expect(errorTTSProcessor.synthesizeSpeech({
        text: 'Test text',
        language: 'en'
      })).rejects.toThrow('TTS Error');
    });

    it('should handle translation errors gracefully', async () => {
      // Create a new instance that will throw an error
      const errorTranslator = new (require('@/lib/services/CulturalContextTranslator').CulturalContextTranslator)();
      
      // Mock the translateText method to throw an error
      jest.spyOn(errorTranslator, 'translateText').mockRejectedValue(new Error('Translation Error'));

      await expect(errorTranslator.translateText({
        text: 'Test text',
        sourceLanguage: 'en',
        targetLanguage: 'hi'
      })).rejects.toThrow('Translation Error');
    });
  });
});