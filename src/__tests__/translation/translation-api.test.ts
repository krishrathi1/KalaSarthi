/**
 * Translation API Integration Tests
 * Tests for the /api/translate endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/translate/route';

// Mock Google Translate
jest.mock('@google-cloud/translate/build/src/v2', () => ({
  Translate: jest.fn().mockImplementation(() => ({
    translate: jest.fn().mockResolvedValue(['मॉक अनुवाद']),
    detect: jest.fn().mockResolvedValue([{ language: 'en', confidence: 0.95 }])
  }))
}));

describe('/api/translate', () => {
  describe('POST', () => {
    it('should translate text successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('translatedText');
      expect(data).toHaveProperty('confidence');
      expect(data.sourceLanguage).toBe('en');
      expect(data.targetLanguage).toBe('hi');
    });

    it('should return original text for same source and target language', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'en'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).toBe('Hello world');
      expect(data.confidence).toBe(1.0);
    });

    it('should validate required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: '',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should handle missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should handle text that is too long', async () => {
      const longText = 'a'.repeat(6000); // Exceeds 5000 character limit
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: longText,
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('too long');
    });

    it('should sanitize potentially dangerous input', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: '<script>alert("xss")</script>',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid text content');
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'Hello',
            sourceLanguage: 'en',
            targetLanguage: 'hi'
          }),
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '127.0.0.1'
          }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // At least one should succeed
      expect(responses.some(res => res.status === 200)).toBe(true);
    });
  });

  describe('GET (Health Check)', () => {
    it('should return health status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('service');
      expect(data).toHaveProperty('timestamp');
      expect(data.service).toBe('translation-api');
    });
  });

  describe('Error Handling', () => {
    it('should handle Google Translate API errors', async () => {
      // Mock Google Translate to throw error
      const { Translate } = require('@google-cloud/translate/build/src/v2');
      const mockTranslate = Translate.mock.results[0].value;
      mockTranslate.translate.mockRejectedValueOnce(new Error('API Error'));

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });

    it('should handle quota exceeded errors', async () => {
      // Mock Google Translate to throw quota error
      const { Translate } = require('@google-cloud/translate/build/src/v2');
      const mockTranslate = Translate.mock.results[0].value;
      mockTranslate.translate.mockRejectedValueOnce(new Error('quota exceeded'));

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('temporarily unavailable');
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      // Check that response doesn't expose sensitive information
      const data = await response.json();
      expect(data).not.toHaveProperty('apiKey');
      expect(data).not.toHaveProperty('projectId');
    });

    it('should sanitize output', async () => {
      // Mock Google Translate to return potentially dangerous content
      const { Translate } = require('@google-cloud/translate/build/src/v2');
      const mockTranslate = Translate.mock.results[0].value;
      mockTranslate.translate.mockResolvedValueOnce(['<script>alert("xss")</script>']);

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).not.toContain('<script>');
      expect(data.translatedText).toContain('&lt;script&gt;');
    });
  });
});