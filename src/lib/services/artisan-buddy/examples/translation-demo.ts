/**
 * Translation Service Demo
 * Demonstrates all features of the 22+ language support implementation
 */

import {
  TranslationService,
  EnhancedTranslationService,
  LanguageFormatter,
  CodeMixedTextHandler,
  LanguagePreferenceManager,
  LanguageCode,
  LANGUAGE_NAMES,
} from '../TranslationService';

/**
 * Demo 1: Basic Translation
 */
export async function demoBasicTranslation() {
  console.log('\n=== Demo 1: Basic Translation ===\n');

  const translationService = TranslationService.getInstance();

  // Translate to Hindi
  const result1 = await translationService.translate(
    'Welcome to KalaSarthi',
    'hi',
    'en'
  );
  console.log(`English → Hindi: "${result1.translatedText}"`);
  console.log(`Confidence: ${(result1.confidence * 100).toFixed(1)}%\n`);

  // Translate to Tamil
  const result2 = await translationService.translate(
    'Welcome to KalaSarthi',
    'ta',
    'en'
  );
  console.log(`English → Tamil: "${result2.translatedText}"`);
  console.log(`Confidence: ${(result2.confidence * 100).toFixed(1)}%\n`);

  // Translate to Telugu
  const result3 = await translationService.translate(
    'Welcome to KalaSarthi',
    'te',
    'en'
  );
  console.log(`English → Telugu: "${result3.translatedText}"`);
  console.log(`Confidence: ${(result3.confidence * 100).toFixed(1)}%\n`);
}

/**
 * Demo 2: Language Detection
 */
export async function demoLanguageDetection() {
  console.log('\n=== Demo 2: Language Detection ===\n');

  const translationService = TranslationService.getInstance();

  const texts = [
    'नमस्ते, मैं एक कारीगर हूं',
    'வணக்கம், நான் ஒரு கைவினைஞர்',
    'Hello, I am an artisan',
    'হ্যালো, আমি একজন কারিগর',
  ];

  for (const text of texts) {
    const detection = await translationService.detectLanguage(text);
    console.log(`Text: "${text}"`);
    console.log(`Detected: ${detection.language} (${LANGUAGE_NAMES[detection.language as LanguageCode]})`);
    console.log(`Confidence: ${(detection.confidence * 100).toFixed(1)}%\n`);
  }
}

/**
 * Demo 3: Batch Translation
 */
export async function demoBatchTranslation() {
  console.log('\n=== Demo 3: Batch Translation ===\n');

  const translationService = TranslationService.getInstance();

  const texts = [
    'Hello',
    'Thank you',
    'How are you?',
    'I am a weaver',
    'Beautiful handmade products',
  ];

  console.log('Translating 5 texts to Hindi...\n');

  const result = await translationService.translateBatch(texts, 'hi', 'en');

  texts.forEach((original, index) => {
    console.log(`"${original}" → "${result.translations[index].translatedText}"`);
  });

  console.log(`\nTotal time: ${result.totalTime}ms`);
  console.log(`Cache hits: ${result.cacheHits}`);
  console.log(`API calls: ${result.apiCalls}`);
}

/**
 * Demo 4: Language-Specific Formatting
 */
export async function demoLanguageFormatting() {
  console.log('\n=== Demo 4: Language-Specific Formatting ===\n');

  const texts = {
    hi: 'नमस्ते । आप कैसे हैं ।',
    ta: 'வணக்கம் । நீங்கள் எப்படி இருக்கிறீர்கள் ।',
    ur: 'سلام ۔ آپ کیسے ہیں ۔',
    bn: 'নমস্কার । আপনি কেমন আছেন ।',
  };

  for (const [lang, text] of Object.entries(texts)) {
    const formatted = LanguageFormatter.formatText(text, lang as LanguageCode);
    console.log(`${LANGUAGE_NAMES[lang as LanguageCode]}:`);
    console.log(`Original: "${text}"`);
    console.log(`Formatted: "${formatted}"\n`);
  }
}

/**
 * Demo 5: Code-Mixed Text Handling
 */
export async function demoCodeMixedText() {
  console.log('\n=== Demo 5: Code-Mixed Text Handling ===\n');

  const translationService = TranslationService.getInstance();

  const hinglishTexts = [
    'Mera product bahut acha hai',
    'Main ek weaver hoon from Kanchipuram',
    'Yeh handmade saree hai very beautiful',
  ];

  for (const text of hinglishTexts) {
    const isCodeMixed = CodeMixedTextHandler.isCodeMixed(text);
    const dominantLang = CodeMixedTextHandler.detectDominantLanguage(text);

    console.log(`Text: "${text}"`);
    console.log(`Code-mixed: ${isCodeMixed ? 'Yes' : 'No'}`);
    console.log(`Dominant language: ${dominantLang}`);

    // Translate to English
    const result = await CodeMixedTextHandler.translateCodeMixed(
      text,
      'en',
      translationService
    );
    console.log(`Translation: "${result.translatedText}"\n`);
  }
}

/**
 * Demo 6: Language Preference Management
 */
export async function demoLanguagePreferences() {
  console.log('\n=== Demo 6: Language Preference Management ===\n');

  const preferenceManager = new LanguagePreferenceManager();
  const userId = 'demo-user-123';

  // Set preference
  await preferenceManager.setUserLanguagePreference(userId, 'hi');
  console.log('Set user preference to Hindi\n');

  // Get preference
  const preference = await preferenceManager.getUserLanguagePreference(userId);
  console.log(`User preference: ${preference} (${LANGUAGE_NAMES[preference]})\n`);

  // Add to history
  await preferenceManager.addToLanguageHistory(userId, 'hi');
  await preferenceManager.addToLanguageHistory(userId, 'ta');
  await preferenceManager.addToLanguageHistory(userId, 'hi');
  await preferenceManager.addToLanguageHistory(userId, 'te');
  await preferenceManager.addToLanguageHistory(userId, 'hi');

  // Get history
  const history = await preferenceManager.getUserLanguageHistory(userId);
  console.log('Language history (most recent first):');
  history.forEach((lang, index) => {
    console.log(`  ${index + 1}. ${lang} (${LANGUAGE_NAMES[lang as LanguageCode]})`);
  });

  // Get most frequent
  const mostFrequent = await preferenceManager.getMostFrequentLanguage(userId);
  console.log(`\nMost frequently used: ${mostFrequent} (${LANGUAGE_NAMES[mostFrequent]})`);
}

/**
 * Demo 7: All Supported Languages
 */
export async function demoAllLanguages() {
  console.log('\n=== Demo 7: All Supported Languages (23 Total) ===\n');

  const translationService = TranslationService.getInstance();
  const supportedLanguages = translationService.getSupportedLanguages();

  console.log(`Total supported languages: ${supportedLanguages.length}\n`);

  supportedLanguages.forEach((lang, index) => {
    const name = translationService.getLanguageName(lang);
    const isSupported = translationService.isLanguageSupported(lang);
    console.log(`${index + 1}. ${lang} - ${name} ${isSupported ? '✓' : '✗'}`);
  });
}

/**
 * Demo 8: Enhanced Translation with Quality Monitoring
 */
export async function demoEnhancedTranslation() {
  console.log('\n=== Demo 8: Enhanced Translation with Quality Monitoring ===\n');

  const enhancedService = EnhancedTranslationService.getEnhancedInstance();

  const result = await enhancedService.translateWithMonitoring(
    'I am a skilled artisan from Kanchipuram',
    'hi',
    'en'
  );

  console.log(`Original: "I am a skilled artisan from Kanchipuram"`);
  console.log(`Translation: "${result.translatedText}"`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Quality Score: ${(result.qualityScore * 100).toFixed(1)}%\n`);

  // Get quality metrics
  const metrics = await enhancedService.getQualityMetrics('en', 'hi');
  console.log('Quality Metrics for English → Hindi:');
  console.log(`  Average Quality: ${(metrics.averageQuality * 100).toFixed(1)}%`);
  console.log(`  Average Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`);
  console.log(`  Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
  console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
  console.log(`  Total Translations: ${metrics.totalTranslations}`);
}

/**
 * Demo 9: Optimized Batch Translation
 */
export async function demoOptimizedBatch() {
  console.log('\n=== Demo 9: Optimized Batch Translation ===\n');

  const enhancedService = EnhancedTranslationService.getEnhancedInstance();

  // Create a batch with duplicates
  const texts = [
    'Hello',
    'Thank you',
    'Hello', // Duplicate
    'Beautiful product',
    'Thank you', // Duplicate
    'Handmade with love',
    'Hello', // Duplicate
  ];

  console.log(`Translating ${texts.length} texts (with duplicates) to Tamil...\n`);

  const result = await enhancedService.translateBatchOptimized(texts, 'ta', 'en');

  texts.forEach((original, index) => {
    console.log(`"${original}" → "${result.translations[index].translatedText}"`);
  });

  console.log(`\nTotal time: ${result.totalTime}ms`);
  console.log(`Cache hits: ${result.cacheHits}`);
  console.log(`API calls: ${result.apiCalls}`);
  console.log(`\nQuality Metrics:`);
  console.log(`  Average: ${(result.qualityMetrics.averageQuality * 100).toFixed(1)}%`);
  console.log(`  Min: ${(result.qualityMetrics.minQuality * 100).toFixed(1)}%`);
  console.log(`  Max: ${(result.qualityMetrics.maxQuality * 100).toFixed(1)}%`);
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Translation Service Demo - 22+ Indian Languages Support  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await demoBasicTranslation();
    await demoLanguageDetection();
    await demoBatchTranslation();
    await demoLanguageFormatting();
    await demoCodeMixedText();
    await demoLanguagePreferences();
    await demoAllLanguages();
    await demoEnhancedTranslation();
    await demoOptimizedBatch();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              All Demos Completed Successfully!             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  }
}

// Export individual demos for selective testing
export {
  demoBasicTranslation,
  demoLanguageDetection,
  demoBatchTranslation,
  demoLanguageFormatting,
  demoCodeMixedText,
  demoLanguagePreferences,
  demoAllLanguages,
  demoEnhancedTranslation,
  demoOptimizedBatch,
};
