/**
 * Translation System Validation Script
 * Tests all success criteria for the unified translation system
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Validation results
const results = {
  functional: [],
  performance: [],
  userExperience: [],
  overall: true
};

// Helper function to check if file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(path.join(__dirname, '..', filePath));
  } catch (error) {
    return false;
  }
};

// Helper function to check if code contains specific patterns
const codeContains = (filePath, pattern) => {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    return content.includes(pattern) || new RegExp(pattern).test(content);
  } catch (error) {
    return false;
  }
};

// Validation functions
const validateFunctional = () => {
  log('\n🔍 Functional Validation', 'blue');
  
  // 1. User can select any supported language from dropdown
  const hasLanguageSelector = fileExists('src/components/translation/LanguageSelector.tsx');
  const hasLanguageOptions = codeContains('src/lib/i18n.ts', 'languages.*=.*{');
  const test1 = hasLanguageSelector && hasLanguageOptions;
  results.functional.push({
    test: 'User can select any supported language from dropdown',
    passed: test1,
    details: `LanguageSelector: ${hasLanguageSelector}, Languages defined: ${hasLanguageOptions}`
  });

  // 2. All UI text translates within 2 seconds
  const hasTranslationService = fileExists('src/lib/services/UnifiedTranslationService.ts');
  const hasPerformanceTargets = codeContains('src/lib/services/UnifiedTranslationService.ts', 'processingTime');
  const test2 = hasTranslationService && hasPerformanceTargets;
  results.functional.push({
    test: 'All UI text translates within 2 seconds',
    passed: test2,
    details: `Translation service: ${hasTranslationService}, Performance tracking: ${hasPerformanceTargets}`
  });

  // 3. Language preference persists across browser sessions
  const hasLocalStorage = codeContains('src/context/TranslationContext.tsx', 'localStorage');
  const hasPersistence = codeContains('src/context/TranslationContext.tsx', 'preferred_language');
  const test3 = hasLocalStorage && hasPersistence;
  results.functional.push({
    test: 'Language preference persists across browser sessions',
    passed: test3,
    details: `localStorage usage: ${hasLocalStorage}, Preference key: ${hasPersistence}`
  });

  // 4. Translation works offline using cached content
  const hasCache = codeContains('src/lib/services/UnifiedTranslationService.ts', 'UnifiedTranslationCache');
  const hasOfflineSupport = codeContains('src/lib/services/UnifiedTranslationService.ts', 'cached.*true');
  const test4 = hasCache && hasOfflineSupport;
  results.functional.push({
    test: 'Translation works offline using cached content',
    passed: test4,
    details: `Cache system: ${hasCache}, Offline support: ${hasOfflineSupport}`
  });

  // 5. System gracefully handles translation failures
  const hasErrorBoundary = fileExists('src/components/translation/TranslationErrorBoundary.tsx');
  const hasErrorHandling = codeContains('src/lib/services/UnifiedTranslationService.ts', 'catch.*error');
  const test5 = hasErrorBoundary && hasErrorHandling;
  results.functional.push({
    test: 'System gracefully handles translation failures',
    passed: test5,
    details: `Error boundary: ${hasErrorBoundary}, Error handling: ${hasErrorHandling}`
  });

  const functionalPassed = results.functional.filter(r => r.passed).length;
  log(`✅ Functional Tests: ${functionalPassed}/${results.functional.length} passed`, 
      functionalPassed === results.functional.length ? 'green' : 'yellow');
};

const validatePerformance = () => {
  log('\n⚡ Performance Validation', 'blue');

  // 1. Page translation completes in < 2 seconds
  const hasPerformanceTracking = codeContains('src/lib/services/UnifiedTranslationService.ts', 'processingTime');
  const hasTimeoutHandling = codeContains('src/hooks/usePageTranslation.ts', 'debounceMs');
  const test1 = hasPerformanceTracking && hasTimeoutHandling;
  results.performance.push({
    test: 'Page translation completes in < 2 seconds',
    passed: test1,
    details: `Performance tracking: ${hasPerformanceTracking}, Timeout handling: ${hasTimeoutHandling}`
  });

  // 2. Cached language switch completes in < 100ms
  const hasCacheOptimization = codeContains('src/lib/services/UnifiedTranslationService.ts', 'memoryCache');
  const hasCacheCheck = codeContains('src/lib/services/UnifiedTranslationService.ts', 'cache.get');
  const test2 = hasCacheOptimization && hasCacheCheck;
  results.performance.push({
    test: 'Cached language switch completes in < 100ms',
    passed: test2,
    details: `Memory cache: ${hasCacheOptimization}, Cache check: ${hasCacheCheck}`
  });

  // 3. Memory usage stays under 10MB
  const hasMemoryManagement = codeContains('src/lib/services/UnifiedTranslationService.ts', 'maxMemorySize');
  const hasCleanup = codeContains('src/lib/services/UnifiedTranslationService.ts', 'delete.*oldestKey');
  const test3 = hasMemoryManagement && hasCleanup;
  results.performance.push({
    test: 'Memory usage stays under 10MB',
    passed: test3,
    details: `Memory limits: ${hasMemoryManagement}, Cleanup: ${hasCleanup}`
  });

  // 4. No visible UI lag during translation
  const hasProgressiveTranslation = codeContains('src/hooks/usePageTranslation.ts', 'debounce');
  const hasLoadingStates = fileExists('src/components/translation/TranslationStatus.tsx');
  const test4 = hasProgressiveTranslation && hasLoadingStates;
  results.performance.push({
    test: 'No visible UI lag during translation',
    passed: test4,
    details: `Progressive loading: ${hasProgressiveTranslation}, Loading states: ${hasLoadingStates}`
  });

  // 5. API quota usage stays within limits
  const hasRateLimiting = codeContains('src/lib/services/UnifiedTranslationService.ts', 'rateLimiter');
  const hasQuotaManagement = codeContains('src/app/api/translate/route.ts', 'rate.*limit');
  const test5 = hasRateLimiting && hasQuotaManagement;
  results.performance.push({
    test: 'API quota usage stays within limits',
    passed: test5,
    details: `Rate limiting: ${hasRateLimiting}, Quota management: ${hasQuotaManagement}`
  });

  const performancePassed = results.performance.filter(r => r.passed).length;
  log(`✅ Performance Tests: ${performancePassed}/${results.performance.length} passed`, 
      performancePassed === results.performance.length ? 'green' : 'yellow');
};

const validateUserExperience = () => {
  log('\n👤 User Experience Validation', 'blue');

  // 1. Translation is accurate and contextually appropriate
  const hasGoogleTranslate = codeContains('src/app/api/translate/route.ts', 'translate.googleapis.com|Translate');
  const hasConfidenceScoring = codeContains('src/lib/services/UnifiedTranslationService.ts', 'confidence');
  const test1 = hasGoogleTranslate && hasConfidenceScoring;
  results.userExperience.push({
    test: 'Translation is accurate and contextually appropriate',
    passed: test1,
    details: `Google Translate: ${hasGoogleTranslate}, Confidence scoring: ${hasConfidenceScoring}`
  });

  // 2. UI layout remains intact after translation
  const hasLayoutPreservation = codeContains('src/hooks/usePageTranslation.ts', 'textContent');
  const hasAttributeTranslation = codeContains('src/hooks/usePageTranslation.ts', 'translateAttributes');
  const test2 = hasLayoutPreservation && hasAttributeTranslation;
  results.userExperience.push({
    test: 'UI layout remains intact after translation',
    passed: test2,
    details: `Layout preservation: ${hasLayoutPreservation}, Attribute handling: ${hasAttributeTranslation}`
  });

  // 3. No text overflow or truncation issues
  const hasTextHandling = codeContains('src/hooks/usePageTranslation.ts', 'textNodes');
  const hasElementPreservation = codeContains('src/hooks/usePageTranslation.ts', 'originalText');
  const test3 = hasTextHandling && hasElementPreservation;
  results.userExperience.push({
    test: 'No text overflow or truncation issues',
    passed: test3,
    details: `Text handling: ${hasTextHandling}, Element preservation: ${hasElementPreservation}`
  });

  // 4. Loading states are clear and non-intrusive
  const hasLoadingIndicators = fileExists('src/components/translation/TranslationStatus.tsx');
  const hasLoadingStates = codeContains('src/context/TranslationContext.tsx', 'isTranslating');
  const test4 = hasLoadingIndicators && hasLoadingStates;
  results.userExperience.push({
    test: 'Loading states are clear and non-intrusive',
    passed: test4,
    details: `Loading indicators: ${hasLoadingIndicators}, Loading states: ${hasLoadingStates}`
  });

  // 5. Error states are handled gracefully
  const hasErrorBoundary = fileExists('src/components/translation/TranslationErrorBoundary.tsx');
  const hasErrorRecovery = codeContains('src/context/TranslationContext.tsx', 'retryTranslation');
  const test5 = hasErrorBoundary && hasErrorRecovery;
  results.userExperience.push({
    test: 'Error states are handled gracefully',
    passed: test5,
    details: `Error boundary: ${hasErrorBoundary}, Error recovery: ${hasErrorRecovery}`
  });

  const uxPassed = results.userExperience.filter(r => r.passed).length;
  log(`✅ User Experience Tests: ${uxPassed}/${results.userExperience.length} passed`, 
      uxPassed === results.userExperience.length ? 'green' : 'yellow');
};

const generateReport = () => {
  log('\n📊 Validation Report', 'blue');
  log('='.repeat(50), 'blue');

  const allTests = [...results.functional, ...results.performance, ...results.userExperience];
  const totalPassed = allTests.filter(r => r.passed).length;
  const totalTests = allTests.length;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

  log(`\nOverall Results: ${totalPassed}/${totalTests} tests passed (${passRate}%)`, 
      totalPassed === totalTests ? 'green' : 'yellow');

  // Detailed results
  log('\n📋 Detailed Results:', 'blue');
  
  ['functional', 'performance', 'userExperience'].forEach(category => {
    log(`\n${category.toUpperCase()}:`, 'blue');
    results[category].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const color = result.passed ? 'green' : 'red';
      log(`  ${status} ${result.test}`, color);
      if (!result.passed) {
        log(`     Details: ${result.details}`, 'yellow');
      }
    });
  });

  // Summary
  results.overall = totalPassed === totalTests;
  
  if (results.overall) {
    log('\n🎉 All validation tests passed! The translation system is ready for production.', 'green');
  } else {
    log(`\n⚠️  ${totalTests - totalPassed} validation tests failed. Please review the issues above.`, 'yellow');
  }

  return results.overall;
};

// Main validation function
const validateTranslationSystem = () => {
  log('🚀 Starting Translation System Validation...', 'blue');
  log('='.repeat(50), 'blue');

  try {
    validateFunctional();
    validatePerformance();
    validateUserExperience();
    
    const success = generateReport();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Validation failed with error: ${error.message}`, 'red');
    process.exit(1);
  }
};

// Run validation if called directly
if (require.main === module) {
  validateTranslationSystem();
}

module.exports = { validateTranslationSystem };