# Translation Service Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install redis
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Redis Configuration (Optional - will use memory cache if not provided)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password_here
REDIS_DB=1

# Google Translate API (Required)
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

### 3. Import and Use

```typescript
import { translationService } from '@/lib/services/artisan-buddy/TranslationService';

// Single translation
const result = await translationService.translate({
  text: 'Hello, how can I help you?',
  sourceLanguage: 'en',
  targetLanguage: 'hi'
});

console.log(result.translatedText); // "नमस्ते, मैं आपकी कैसे मदद कर सकता हूं?"
```

## Integration with Artisan Buddy Components

### 1. Conversation Manager Integration

```typescript
// src/lib/services/artisan-buddy/ConversationManager.ts

import { translationService } from './TranslationService';

export class ConversationManager {
  async processMessage(sessionId: string, message: Message): Promise<Response> {
    // Get user's preferred language
    const userLanguage = await this.getUserLanguage(sessionId);
    
    // Translate incoming message to English for processing
    const translatedMessage = await translationService.translate({
      text: message.content,
      sourceLanguage: message.language,
      targetLanguage: 'en'
    });
    
    // Process message...
    const response = await this.generateResponse(translatedMessage.translatedText);
    
    // Translate response back to user's language
    const translatedResponse = await translationService.translate({
      text: response,
      sourceLanguage: 'en',
      targetLanguage: userLanguage
    });
    
    return {
      content: translatedResponse.translatedText,
      language: userLanguage,
      confidence: translatedResponse.confidence
    };
  }
}
```

### 2. Response Generator Integration

```typescript
// src/lib/services/artisan-buddy/ResponseGenerator.ts

import { translationService } from './TranslationService';

export class ResponseGenerator {
  async generateResponse(
    intent: Intent,
    context: ArtisanContext,
    targetLanguage: LanguageCode
  ): Promise<GeneratedResponse> {
    // Generate response in English
    const englishResponse = await this.generateEnglishResponse(intent, context);
    
    // Batch translate all text elements
    const textsToTranslate = [
      englishResponse.text,
      ...englishResponse.suggestedActions.map(a => a.label),
      ...englishResponse.followUpQuestions
    ];
    
    const batchResult = await translationService.translateBatch(
      textsToTranslate.map(text => ({
        text,
        sourceLanguage: 'en',
        targetLanguage
      }))
    );
    
    // Reconstruct response with translations
    return {
      text: batchResult.results[0].translatedText,
      language: targetLanguage,
      confidence: batchResult.averageConfidence,
      suggestedActions: englishResponse.suggestedActions.map((action, i) => ({
        ...action,
        label: batchResult.results[i + 1].translatedText
      })),
      followUpQuestions: batchResult.results
        .slice(1 + englishResponse.suggestedActions.length)
        .map(r => r.translatedText)
    };
  }
}
```

### 3. Navigation Router Integration

```typescript
// src/lib/services/artisan-buddy/NavigationRouter.ts

import { translationService } from './TranslationService';

export class NavigationRouter {
  async getRoute(
    intent: Intent,
    userLanguage: LanguageCode
  ): Promise<NavigationResult> {
    // Translate navigation intent to English for processing
    const translatedIntent = await translationService.translate({
      text: intent.parameters.destination,
      sourceLanguage: userLanguage,
      targetLanguage: 'en'
    });
    
    // Find route...
    const route = this.findRoute(translatedIntent.translatedText);
    
    // Translate confirmation message
    const confirmationMessage = await translationService.translate({
      text: `Navigate to ${route.label}?`,
      sourceLanguage: 'en',
      targetLanguage: userLanguage
    });
    
    return {
      route: route.path,
      confirmationMessage: confirmationMessage.translatedText,
      requiresConfirmation: true
    };
  }
}
```

### 4. Context Engine Integration

```typescript
// src/lib/services/artisan-buddy/ContextEngine.ts

import { translationService } from './TranslationService';

export class ContextEngine {
  async loadArtisanContext(
    userId: string,
    targetLanguage: LanguageCode
  ): Promise<ArtisanContext> {
    // Load context from database
    const context = await this.fetchContextFromDB(userId);
    
    // Translate product descriptions if needed
    if (targetLanguage !== 'en') {
      const productDescriptions = context.products.map(p => p.description);
      
      const batchResult = await translationService.translateBatch(
        productDescriptions.map(desc => ({
          text: desc,
          sourceLanguage: 'en',
          targetLanguage
        }))
      );
      
      context.products = context.products.map((product, i) => ({
        ...product,
        description: batchResult.results[i].translatedText
      }));
    }
    
    return context;
  }
}
```

## Advanced Usage Patterns

### 1. Pre-warming Cache

```typescript
// Pre-warm cache with common phrases on application startup
async function prewarmTranslationCache() {
  const commonPhrases = [
    'Hello',
    'Goodbye',
    'Thank you',
    'Please',
    'Yes',
    'No',
    'Help',
    'How can I assist you?',
    'What would you like to know?'
  ];
  
  const languages: LanguageCode[] = ['hi', 'ta', 'bn', 'te', 'gu'];
  
  for (const lang of languages) {
    const requests = commonPhrases.map(text => ({
      text,
      sourceLanguage: 'en' as LanguageCode,
      targetLanguage: lang
    }));
    
    await translationService.translateBatch(requests);
  }
  
  console.log('Translation cache pre-warmed');
}

// Call on application startup
prewarmTranslationCache();
```

### 2. Monitoring Integration

```typescript
// Set up periodic monitoring
setInterval(() => {
  const metrics = translationService.getQualityMetrics();
  
  // Log to monitoring service
  console.log('Translation Metrics:', {
    total: metrics.total,
    cacheHitRate: metrics.cacheHitRate,
    averageConfidence: metrics.averageConfidence,
    errorRate: metrics.errorRate,
    avgProcessingTime: metrics.averageProcessingTime
  });
  
  // Alert if metrics are concerning
  if (metrics.errorRate > 0.05) {
    console.error('⚠️ High translation error rate:', metrics.errorRate);
    // Send alert to monitoring system
  }
  
  if (metrics.cacheHitRate < 0.5) {
    console.warn('⚠️ Low cache hit rate:', metrics.cacheHitRate);
    // Consider increasing cache TTL
  }
}, 60000); // Every minute
```

### 3. Graceful Shutdown

```typescript
// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down translation service...');
  
  // Get final metrics
  const metrics = translationService.getQualityMetrics();
  console.log('Final metrics:', metrics);
  
  // Disconnect from Redis
  await translationService.disconnect();
  
  console.log('Translation service shut down gracefully');
  process.exit(0);
});
```

### 4. Error Handling Middleware

```typescript
// Wrapper function with error handling
async function translateWithFallback(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
  fallbackText?: string
): Promise<string> {
  try {
    const result = await translationService.translate({
      text,
      sourceLanguage,
      targetLanguage
    });
    
    // Check confidence threshold
    if (result.confidence < 0.7) {
      console.warn('Low confidence translation:', result.confidence);
      return fallbackText || text;
    }
    
    return result.translatedText;
  } catch (error) {
    console.error('Translation failed:', error);
    return fallbackText || text;
  }
}
```

## Testing Integration

### Unit Tests

```typescript
import { translationService } from '@/lib/services/artisan-buddy/TranslationService';

describe('MyComponent', () => {
  beforeEach(() => {
    // Clear cache before each test
    await translationService.clearCache();
  });
  
  it('should translate user message', async () => {
    // Mock translation API
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { translatedText: 'नमस्ते', confidence: 0.95 }
      })
    });
    
    const result = await myComponent.processMessage('Hello', 'hi');
    
    expect(result).toContain('नमस्ते');
  });
});
```

### Integration Tests

```typescript
describe('Translation Integration', () => {
  it('should handle full conversation flow', async () => {
    // Start conversation
    const session = await conversationManager.initializeSession('user123', 'hi');
    
    // Send message in Hindi
    const response = await conversationManager.processMessage(
      session.id,
      { content: 'नमस्ते', language: 'hi' }
    );
    
    // Verify response is in Hindi
    expect(response.language).toBe('hi');
    expect(response.content).toBeTruthy();
  });
});
```

## Performance Optimization Tips

### 1. Use Batch Translation

```typescript
// ❌ Bad: Multiple individual calls
for (const text of texts) {
  await translationService.translate({
    text,
    sourceLanguage: 'en',
    targetLanguage: 'hi'
  });
}

// ✅ Good: Single batch call
const requests = texts.map(text => ({
  text,
  sourceLanguage: 'en',
  targetLanguage: 'hi'
}));
await translationService.translateBatch(requests);
```

### 2. Cache Common Phrases

```typescript
// Cache frequently used phrases
const COMMON_PHRASES = {
  greeting: 'Hello, how can I help you?',
  goodbye: 'Thank you for chatting with me!',
  error: 'I apologize, but I encountered an error.'
};

// Pre-translate and cache
async function cacheCommonPhrases(targetLanguage: LanguageCode) {
  const requests = Object.values(COMMON_PHRASES).map(text => ({
    text,
    sourceLanguage: 'en' as LanguageCode,
    targetLanguage
  }));
  
  await translationService.translateBatch(requests);
}
```

### 3. Lazy Load Translations

```typescript
// Only translate when needed
async function getLocalizedContent(
  content: any,
  userLanguage: LanguageCode
): Promise<any> {
  // Return English content if user prefers English
  if (userLanguage === 'en') {
    return content;
  }
  
  // Check cache first
  const cacheKey = `content_${content.id}_${userLanguage}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Translate only if not cached
  const translated = await translationService.translate({
    text: content.text,
    sourceLanguage: 'en',
    targetLanguage: userLanguage
  });
  
  const localizedContent = {
    ...content,
    text: translated.translatedText
  };
  
  await cache.set(cacheKey, localizedContent);
  return localizedContent;
}
```

## Troubleshooting

### Redis Connection Issues

```typescript
// The service automatically falls back to memory cache
// Check connection status in logs:
// [TranslationService] Redis connected
// [TranslationService] Redis disconnected
```

### High Latency

```typescript
// Check metrics to identify bottlenecks
const metrics = translationService.getQualityMetrics();

if (metrics.averageProcessingTime > 500) {
  console.warn('High latency detected');
  
  // Possible solutions:
  // 1. Enable Redis caching
  // 2. Increase batch size
  // 3. Pre-warm cache
  // 4. Check network connectivity
}
```

### Memory Issues

```typescript
// Monitor cache size
const stats = await translationService.getCacheStats();

if (stats.memory.size > 50 * 1024 * 1024) { // 50MB
  console.warn('High memory usage');
  
  // Clear old cache entries
  await translationService.clearCache();
}
```

## Support

For issues or questions:
1. Check the [README](./TRANSLATION_SERVICE_README.md)
2. Review the [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
3. Check test examples in `src/__tests__/services/artisan-buddy/TranslationService.test.ts`
