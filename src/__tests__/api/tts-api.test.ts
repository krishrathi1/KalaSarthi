/**
 * TTS API Integration Tests
 * Tests the Google Cloud TTS API endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/google-cloud-tts/route';

// Mock the TTSProcessor
jest.mock('@/lib/services/TTSProcessor', () => ({
  TTSProcessor: {
    getInstance: jest.fn(() => ({
      synthesizeSpeech: jest.fn().mockResolvedValue({
        audioContent: Buffer.from('mock-audio-content'),
        audioFormat: 'mp3',
        language: 'en',
        voiceName: 'en-IN-Wavenet-A',
        voiceGender: 'female',
        duration: 3.2,
        metadata: {
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
          culturalContext: 'business'
        }
      }),
      getSupportedLanguages: jest.fn().mockReturnValue([
        'en', 'hi', 'ta', 'bn'
      ])
    }))
  }
}));

describe('/api/google-cloud-tts', () => {
  describe('POST', () => {
    it('should synthesize speech successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-cloud-tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Welcome to our pottery workshop',
          language: 'en',
          voiceGender: 'female',
          culturalContext: 'business',
          audioFormat: 'mp3'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audioContent).toBeDefined();
      expect(data.audioFormat).toBe('mp3');
      expect(data.language).toBe('en');
      expect(data.voiceName).toBe('en-IN-Wavenet-A');
      expect(data.voiceGender).toBe('female');
      expect(data.duration).toBe(3.2);
      expect(data.metadata).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return 400 for missing text', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-cloud-tts', {
        method: 'POST',
        body: JSON.stringify({
          language: 'en'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Text is required');
    });

    it('should handle synthesis errors gracefully', async () => {
      // Mock error
      const { TTSProcessor } = require('@/lib/services/TTSProcessor');
      TTSProcessor.getInstance.mockReturnValueOnce({
        synthesizeSpeech: jest.fn().mockRejectedValue(new Error('Synthesis failed'))
      });

      const request = new NextRequest('http://localhost:3000/api/google-cloud-tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test text',
          language: 'en'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Text-to-speech processing failed');
      expect(data.details).toBe('Synthesis failed');
    });

    it('should use default values for optional parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-cloud-tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Simple test'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.audioContent).toBeDefined();
      // Should use default values
      expect(data.language).toBe('en');
      expect(data.audioFormat).toBe('mp3');
    });
  });

  describe('GET', () => {
    it('should return health check information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('google-cloud-tts');
      expect(data.supportedLanguages).toBeDefined();
      expect(data.features).toContain('multilingual-synthesis');
      expect(data.timestamp).toBeDefined();
    });
  });
});