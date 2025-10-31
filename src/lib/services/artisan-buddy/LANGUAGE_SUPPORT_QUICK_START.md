# Language Support Quick Start Guide

## Quick Start

### 1. Basic Translation

```typescript
import { TranslationService } from '@/lib/services/artisan-buddy/TranslationService';

const translationService = TranslationService.getInstance();

// Translate to Hindi
const result = await translationService.translate(
  'Welcome to KalaSarthi',
  'hi',  // target language
  'en'   // source language (optional)
);

console.log(result.translatedText); // "कलासार्थी में आपका स्वागत है"
console.log(result.confidence);     // 0.95
```

### 2. Auto-Detect Source Language

```typescript
// Let the service detect the source language
const result = await translationService.translate(
  'नमस्ते',
  'en'  // target language only
);

console.log(result.translatedText);  // "Hello"
console.log(result.sourceLanguage);  // "hi"
```

### 3. Batch Translation

```typescript
const texts = [
  'Hello',
  'Thank you',
  'How are you?'
];

const result = await translationService.translateBatch(texts, 'ta', 'en');

result.translations.forEach((t, i) => {
  console.log(`${texts[i]} → ${t.translatedText}`);
});

console.log(`Cache hits: ${result.cacheHits}`);
console.log(`API calls: ${result.apiCalls}`);
```

### 4. Language Detection

```typescript
const detection = await translationService.detectLanguage('नमस्ते');

console.log(detection.language);    // "hi"
console.log(detection.confidence);  // 0.95
console.log(detection.alternatives); // [{ language: "mr", confidence: 0.3 }]
```

### 5. Code-Mixed Text (Hinglish)

```typescript
import { CodeMixedTextHandler } from '@/lib/services/artisan-buddy/TranslationService';

const text = 'Mera product bahut acha hai';

// Check if code-mixed
const isCodeMixed = CodeMixedTextHandler.isCodeMixed(text);
console.log(isCodeMixed); // true

// Detect dominant language
const dominantLang = CodeMixedTextHandler.detectDominantLanguage(text);
console.log(dominantLang); // "hi"

// Translate intelligently
const result = await CodeMixedTextHandler.translateCodeMixed(
  text,
  'en',
  translationService
);
console.log(result.translatedText); // "My product is very good"
```

### 6. Language-Specific Formatting

```typescript
import { LanguageFormatter } from '@/lib/services/artisan-buddy/TranslationService';

const text = 'नमस्ते । आप कैसे हैं ।';
const formatted = LanguageFormatter.formatText(text, 'hi');

console.log(formatted); // Properly formatted with correct spacing
```

### 7. User Language Preferences

```typescript
import { LanguagePreferenceManager } from '@/lib/services/artisan-buddy/TranslationService';

const preferenceManager = new LanguagePreferenceManager();
const userId = 'user-123';

// Set preference
await preferenceManager.setUserLanguagePreference(userId, 'hi');

// Get preference
const preference = await preferenceManager.getUserLanguagePreference(userId);
console.log(preference); // "hi"

// Track usage
await preferenceManager.addToLanguageHistory(userId, 'ta');

// Get most frequent
const mostFrequent = await preferenceManager.getMostFrequentLanguage(userId);
console.log(mostFrequent); // "hi"
```

### 8. Enhanced Translation with Quality Monitoring

```typescript
import { EnhancedTranslationService } from '@/lib/services/artisan-buddy/TranslationService';

const enhancedService = EnhancedTranslationService.getEnhancedInstance();

const result = await enhancedService.translateWithMonitoring(
  'I am a skilled artisan',
  'hi',
  'en'
);

console.log(result.translatedText);  // Translation
console.log(result.confidence);      // API confidence
console.log(result.qualityScore);    // Calculated quality score

// Get metrics
const metrics = await enhancedService.getQualityMetrics('en', 'hi');
console.log(metrics.averageQuality);
console.log(metrics.averageConfidence);
console.log(metrics.averageLatency);
console.log(metrics.errorRate);
```

### 9. Optimized Batch Translation

```typescript
// Automatically deduplicates and optimizes
const result = await enhancedService.translateBatchOptimized(
  ['Hello', 'Hello', 'Thank you', 'Hello'], // Duplicates handled efficiently
  'hi',
  'en'
);

console.log(result.qualityMetrics.averageQuality);
```

## Supported Languages

### All 23 Languages

```typescript
const languages = translationService.getSupportedLanguages();
// ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'ks', 'sd', 'ne', 'si', 'sa', 'mai', 'bho', 'raj', 'kok', 'mni']

// Check if supported
const isSupported = translationService.isLanguageSupported('hi');
console.log(isSupported); // true

// Get display name
const name = translationService.getLanguageName('hi');
console.log(name); // "हिन्दी (Hindi)"
```

### Language Codes Reference

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| hi | Hindi | हिन्दी |
| ta | Tamil | தமிழ் |
| te | Telugu | తెలుగు |
| bn | Bengali | বাংলা |
| mr | Marathi | मराठी |
| gu | Gujarati | ગુજરાતી |
| kn | Kannada | ಕನ್ನಡ |
| ml | Malayalam | മലയാളം |
| pa | Punjabi | ਪੰਜਾਬੀ |
| or | Odia | ଓଡ଼ିଆ |
| as | Assamese | অসমীয়া |
| ur | Urdu | اردو |
| ks | Kashmiri | कॉशुर |
| sd | Sindhi | سنڌي |
| ne | Nepali | नेपाली |
| si | Sinhala | සිංහල |
| sa | Sanskrit | संस्कृत |
| mai | Maithili | मैथिली |
| bho | Bhojpuri | भोजपुरी |
| raj | Rajasthani | राजस्थानी |
| kok | Konkani | कोंकणी |
| mni | Manipuri | মৈতৈলোন্ |

## Common Use Cases

### Use Case 1: Chatbot Message Translation

```typescript
// User sends message in Hindi
const userMessage = 'मुझे एक साड़ी चाहिए';

// Detect language
const detection = await translationService.detectLanguage(userMessage);

// Translate to English for processing
const toEnglish = await translationService.translate(
  userMessage,
  'en',
  detection.language
);

// Process in English...
const response = 'We have beautiful handmade sarees available';

// Translate response back to user's language
const toUserLanguage = await translationService.translate(
  response,
  detection.language,
  'en'
);

console.log(toUserLanguage.translatedText);
// "हमारे पास सुंदर हस्तनिर्मित साड़ियां उपलब्ध हैं"
```

### Use Case 2: Product Listing Translation

```typescript
const productData = {
  name: 'Handwoven Silk Saree',
  description: 'Beautiful traditional saree with intricate patterns',
  materials: ['Silk', 'Gold thread', 'Natural dyes'],
};

// Translate to multiple languages
const languages = ['hi', 'ta', 'te', 'bn'];

for (const lang of languages) {
  const translatedName = await translationService.translate(
    productData.name,
    lang,
    'en'
  );
  
  const translatedDesc = await translationService.translate(
    productData.description,
    lang,
    'en'
  );
  
  const translatedMaterials = await translationService.translateBatch(
    productData.materials,
    lang,
    'en'
  );
  
  console.log(`${lang}:`, {
    name: translatedName.translatedText,
    description: translatedDesc.translatedText,
    materials: translatedMaterials.translations.map(t => t.translatedText),
  });
}
```

### Use Case 3: Buyer-Artisan Communication

```typescript
// Buyer sends message in English
const buyerMessage = 'Can you make this in blue color?';

// Get artisan's preferred language
const artisanLanguage = await preferenceManager.getUserLanguagePreference(artisanId);

// Translate to artisan's language
const toArtisan = await translationService.translate(
  buyerMessage,
  artisanLanguage,
  'en'
);

// Send to artisan
console.log(`To artisan (${artisanLanguage}): ${toArtisan.translatedText}`);

// Artisan responds in their language
const artisanResponse = 'हां, मैं इसे नीले रंग में बना सकता हूं';

// Translate back to English for buyer
const toBuyer = await translationService.translate(
  artisanResponse,
  'en',
  artisanLanguage
);

console.log(`To buyer (en): ${toBuyer.translatedText}`);
// "Yes, I can make it in blue color"
```

## Performance Tips

### 1. Use Batch Translation for Multiple Texts

```typescript
// ❌ Slow - Multiple API calls
for (const text of texts) {
  await translationService.translate(text, 'hi', 'en');
}

// ✅ Fast - Single API call
await translationService.translateBatch(texts, 'hi', 'en');
```

### 2. Leverage Caching

```typescript
// First call - hits API
await translationService.translate('Hello', 'hi', 'en');

// Second call - uses cache (10x faster)
await translationService.translate('Hello', 'hi', 'en');
```

### 3. Use Optimized Batch for Duplicates

```typescript
// Automatically deduplicates
const texts = ['Hello', 'Hello', 'Thank you', 'Hello'];

const enhancedService = EnhancedTranslationService.getEnhancedInstance();
await enhancedService.translateBatchOptimized(texts, 'hi', 'en');
// Only translates 2 unique texts instead of 4
```

### 4. Clear Cache When Needed

```typescript
// Clear all cached translations
await translationService.clearCache();
```

## Error Handling

```typescript
import { TranslationErrorHandler } from '@/lib/services/artisan-buddy/TranslationService';

try {
  const result = await translationService.translate(text, 'hi', 'en');
  console.log(result.translatedText);
} catch (error) {
  // Automatic retry with exponential backoff
  const result = await TranslationErrorHandler.executeWithRetry(
    () => translationService.translate(text, 'hi', 'en')
  );
  
  // Or handle gracefully with fallback
  const fallback = TranslationErrorHandler.handleError(
    error as Error,
    text // Return original text as fallback
  );
  console.log(fallback.translatedText);
}
```

## Testing

```typescript
// Run demo to test all features
import { runAllDemos } from '@/lib/services/artisan-buddy/examples/translation-demo';

await runAllDemos();
```

## Integration with Artisan Buddy

```typescript
// In ConversationManager
import { TranslationService } from '@/lib/services/artisan-buddy/TranslationService';

class ConversationManager {
  private translationService: TranslationService;
  
  constructor() {
    this.translationService = TranslationService.getInstance();
  }
  
  async processMessage(message: string, userId: string) {
    // Detect user's language
    const detection = await this.translationService.detectLanguage(message);
    
    // Translate to English for processing
    const toEnglish = await this.translationService.translate(
      message,
      'en',
      detection.language
    );
    
    // Process message...
    const response = await this.generateResponse(toEnglish.translatedText);
    
    // Translate response back to user's language
    const toUserLanguage = await this.translationService.translate(
      response,
      detection.language,
      'en'
    );
    
    return toUserLanguage.translatedText;
  }
}
```

## Next Steps

1. **Read Full Documentation**: See `TRANSLATION_SERVICE_README.md` for detailed API reference
2. **Run Demos**: Execute `translation-demo.ts` to see all features in action
3. **Check Implementation**: Review `TranslationService.ts` for implementation details
4. **View Summary**: Read `LANGUAGE_SUPPORT_SUMMARY.md` for complete feature overview

## Support

For issues or questions:
- Check `TRANSLATION_IMPLEMENTATION_SUMMARY.md` for troubleshooting
- Review `TRANSLATION_SERVICE_README.md` for API details
- Run demos in `examples/translation-demo.ts` for examples
