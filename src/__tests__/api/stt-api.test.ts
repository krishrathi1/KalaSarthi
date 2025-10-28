/**
 * STT API Integration Tests
 * Tests the Google Cloud STT API endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/google-cloud-stt/route';

// Mock the STTProcessor
jest.mock('@/lib/services/STTProcessor', () => ({
  STTProcessor: {
    getInstance: jest.fn(() => ({
      processAudio: jest.fn().mockResolvedValue({
        text: 'Hello, I would like to buy some pottery',
        confidence: 0.95,
        language: 'en-US',
        alternatives: [],
        wordTimeOffsets: [],
        audioQuality: {
          duration: 2.5,
          noiseLevel: 'low',
          clarity: 'good'
        }
      }),
      getSupportedLanguages: jest.fn().mockReturnValue([
        { code: 'en', name: 'English', region: 'US' },
        { code: 'hi', name: 'Hindi', region: 'IN' }
      ])
    }))
  }
}));

describe('/api/google-cloud-stt', () => {
  describe('POST', () => {
    it('should process audio data successfully', async () => {
      const mockAudioData = Buffer.from('mock-audio-data').toString('base64');
      
      const request = new NextRequest('http://localhost:3000/api/google-cloud-stt', {
        method: 'POST',
        body: JSON.stringify({
          audioData: mockAudioData,
          language: 'en',
          audioFormat: 'webm',
          sampleRate: 48000,
          userId: 'test-user',
          sessionId: 'test-session'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Hello, I would like to buy some pottery');
      expect(data.confidence).toBe(0.95);
      expect(data.language).toBe('en-US');
      expect(data.audioQuality).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return 400 for missing audio data', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-cloud-stt', {
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
      expect(data.error).toBe('Audio data is required');
    });

    it('should handle processing errors gracefully', async () => {
      // Mock error
      const { STTProcessor } = require('@/lib/services/STTProcessor');
      STTProcessor.getInstance.mockReturnValueOnce({
        processAudio: jest.fn().mockRejectedValue(new Error('Processing failed'))
      });

      const mockAudioData = Buffer.from('invalid-audio-data').toString('base64');
      
      const request = new NextRequest('http://localhost:3000/api/google-cloud-stt', {
        method: 'POST',
        body: JSON.stringify({
          audioData: mockAudioData,
          language: 'en'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Speech-to-text processing failed');
      expect(data.details).toBe('Processing failed');
    });
  });

  describe('GET', () => {
    it('should return health check information', async () => {
      const request = new NextRequest('http://localhost:3000/api/google-cloud-stt', {
        method: 'GET'
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('google-cloud-stt');
      expect(data.supportedLanguages).toBeDefined();
      expect(data.features).toContain('multilingual-recognition');
      expect(data.timestamp).toBeDefined();
    });
  });
});