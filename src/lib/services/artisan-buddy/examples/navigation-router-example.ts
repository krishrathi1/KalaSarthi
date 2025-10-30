/**
 * Navigation Router - Usage Examples
 * 
 * This file demonstrates how to use the Navigation Router service
 * in various scenarios.
 */

import { 
  navigationRouter,
  intentClassifier,
  type Intent,
  type ArtisanContext,
} from '@/lib/services/artisan-buddy';

// ============================================================================
// Example 1: Basic Navigation
// ============================================================================

export async function basicNavigationExample(
  userMessage: string,
  artisanContext: ArtisanContext,
  language: string = 'en'
) {
  console.log('=== Basic Navigation Example ===');
  
  // Classify user intent
  const intent = await intentClassifier.classifyIntent(userMessage);
  
  if (intent.type === 'navigation') {
    // Get navigation route
    const result = await navigationRouter.getRoute(intent, artisanContext, language);
    
    console.log(`Navigating to: ${result.route}`);
    console.log(`Parameters:`, result.parameters);
    console.log(`Requires confirmation: ${result.requiresConfirmation}`);
    
    if (result.requiresConfirmation) {
      console.log(`Confirmation message: ${result.confirmationMessage}`);
    }
    
    return result;
  }
}

// ============================================================================
// Example 2: Multilingual Navigation
// ============================================================================

export async function multilingualNavigationExample() {
  console.log('=== Multilingual Navigation Example ===');
  
  const testCases = [
    { message: 'take me to digital khata', language: 'en' },
    { message: 'मुझे खाता दिखाओ', language: 'hi' },
    { message: 'என்னை கணக்குக்கு அழைத்துச் செல்', language: 'ta' },
    { message: 'నన్ను ఖాతాకు తీసుకెళ్లు', language: 'te' },
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: "${testCase.message}" (${testCase.language})`);
    
    const intent: Intent = {
      type: 'navigation',
      confidence: 0.9,
      entities: [],
      parameters: { destination: testCase.message.split(' ').pop() || '' },
    };
    
    try {
      const result = await navigationRouter.getRoute(
        intent,
        {} as ArtisanContext,
        testCase.language
      );
      console.log(`✓ Resolved to: ${result.route}`);
    } catch (error) {
      const errorMsg = navigationRouter.handleNavigationError(
        error as Error,
        testCase.message,
        testCase.language
      );
      console.log(`✗ Error: ${errorMsg}`);
    }
  }
}


// ============================================================================
// Example 3: Route Suggestions with Fuzzy Matching
// ============================================================================

export async function routeSuggestionsExample() {
  console.log('=== Route Suggestions Example ===');
  
  const queries = [
    'khata',      // Partial match
    'scheme',     // English
    'योजना',      // Hindi
    'buyer',      // English
    'product',    // Partial
  ];
  
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const suggestions = await navigationRouter.suggestRoutes(query, 'en', 3);
    
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.label} (${(suggestion.relevance * 100).toFixed(0)}%)`);
      console.log(`     ${suggestion.description}`);
      console.log(`     Route: ${suggestion.route}`);
    });
  }
}

// ============================================================================
// Example 4: Navigation History and Breadcrumbs
// ============================================================================

export function navigationHistoryExample(userId: string) {
  console.log('=== Navigation History Example ===');
  
  // Simulate user navigation
  const routes = [
    '/marketplace',
    '/product-creator',
    '/digital-khata',
    '/scheme-sahayak',
    '/profile',
  ];
  
  routes.forEach(route => {
    navigationRouter.addToHistory(userId, route);
    navigationRouter.addBreadcrumb(userId, route);
  });
  
  // Get history
  console.log('\nNavigation History:');
  const history = navigationRouter.getHistory(userId, 5);
  history.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.route} at ${entry.timestamp.toLocaleString()}`);
  });
  
  // Get breadcrumbs
  console.log('\nBreadcrumbs:');
  const breadcrumbs = navigationRouter.getBreadcrumbs(userId);
  console.log(`  ${breadcrumbs.join(' > ')}`);
  
  // Clear history
  navigationRouter.clearHistory(userId);
  navigationRouter.clearBreadcrumbs(userId);
  console.log('\n✓ History and breadcrumbs cleared');
}

// ============================================================================
// Example 5: Navigation with Confirmation
// ============================================================================

export async function navigationWithConfirmationExample(
  intent: Intent,
  artisanContext: ArtisanContext,
  language: string = 'en'
) {
  console.log('=== Navigation with Confirmation Example ===');
  
  const result = await navigationRouter.getRoute(intent, artisanContext, language);
  
  if (result.requiresConfirmation) {
    console.log('\n⚠️  Confirmation Required');
    console.log(`Message: ${result.confirmationMessage}`);
    
    // Create preview
    const preview = navigationRouter.createNavigationPreview(result, language);
    console.log('\nPreview:');
    console.log(preview);
    
    // Simulate user confirmation
    const userConfirmed = true; // In real app, get from user
    
    if (userConfirmed) {
      console.log('\n✓ User confirmed, proceeding with navigation');
      return result;
    } else {
      console.log('\n✗ User cancelled navigation');
      return null;
    }
  } else {
    console.log('\n✓ No confirmation required, navigating directly');
    return result;
  }
}


// ============================================================================
// Example 6: Route Validation
// ============================================================================

export async function routeValidationExample(
  userId: string,
  artisanContext: ArtisanContext
) {
  console.log('=== Route Validation Example ===');
  
  const routesToValidate = [
    '/digital-khata',
    '/scheme-sahayak',
    '/inventory',
    '/unknown-route',
  ];
  
  for (const route of routesToValidate) {
    const isValid = await navigationRouter.validateRoute(route, userId, artisanContext);
    console.log(`${route}: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
  }
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

export async function errorHandlingExample(language: string = 'en') {
  console.log('=== Error Handling Example ===');
  
  const invalidIntent: Intent = {
    type: 'navigation',
    confidence: 0.9,
    entities: [],
    parameters: { destination: 'nonexistent-page' },
  };
  
  try {
    await navigationRouter.getRoute(invalidIntent, {} as ArtisanContext, language);
  } catch (error) {
    const errorMessage = navigationRouter.handleNavigationError(
      error as Error,
      'nonexistent-page',
      language
    );
    console.log(`Error handled: ${errorMessage}`);
    
    // Suggest alternatives
    console.log('\nSuggesting alternatives...');
    const suggestions = await navigationRouter.suggestRoutes('page', language, 3);
    suggestions.forEach(s => {
      console.log(`  - ${s.label}: ${s.description}`);
    });
  }
}

// ============================================================================
// Example 8: Complete Navigation Flow
// ============================================================================

export async function completeNavigationFlow(
  userMessage: string,
  userId: string,
  artisanContext: ArtisanContext,
  language: string = 'en'
) {
  console.log('=== Complete Navigation Flow ===');
  console.log(`User message: "${userMessage}"`);
  console.log(`Language: ${language}\n`);
  
  try {
    // Step 1: Classify intent
    console.log('Step 1: Classifying intent...');
    const intent = await intentClassifier.classifyIntent(userMessage);
    console.log(`Intent: ${intent.type} (confidence: ${intent.confidence})`);
    
    if (intent.type !== 'navigation') {
      console.log('Not a navigation intent, skipping navigation');
      return null;
    }
    
    // Step 2: Get navigation route
    console.log('\nStep 2: Resolving route...');
    const result = await navigationRouter.getRoute(intent, artisanContext, language);
    console.log(`Route: ${result.route}`);
    
    // Step 3: Validate route
    console.log('\nStep 3: Validating route...');
    const isValid = await navigationRouter.validateRoute(result.route, userId, artisanContext);
    
    if (!isValid) {
      console.log('Route validation failed');
      return null;
    }
    console.log('Route is valid');
    
    // Step 4: Check confirmation
    if (result.requiresConfirmation) {
      console.log('\nStep 4: Confirmation required');
      const preview = navigationRouter.createNavigationPreview(result, language);
      console.log(preview);
      console.log(`\n${result.confirmationMessage}`);
      
      // In real app, wait for user confirmation
      // For demo, assume confirmed
      console.log('User confirmed: Yes');
    } else {
      console.log('\nStep 4: No confirmation required');
    }
    
    // Step 5: Add to history
    console.log('\nStep 5: Adding to navigation history...');
    navigationRouter.addToHistory(userId, result.route, result.parameters);
    navigationRouter.addBreadcrumb(userId, result.route);
    
    // Step 6: Navigate
    console.log('\nStep 6: Navigation complete!');
    console.log(`✓ Navigated to: ${result.route}`);
    
    return result;
    
  } catch (error) {
    console.log('\n✗ Navigation failed');
    const errorMessage = navigationRouter.handleNavigationError(
      error as Error,
      userMessage,
      language
    );
    console.log(`Error: ${errorMessage}`);
    return null;
  }
}

// ============================================================================
// Example 9: Metadata Access
// ============================================================================

export function metadataAccessExample() {
  console.log('=== Metadata Access Example ===');
  
  // Get all routes
  console.log('\nAll Available Routes:');
  const allRoutes = navigationRouter.getAllRoutes();
  allRoutes.forEach(route => {
    console.log(`  - ${route.label}: ${route.route}`);
  });
  
  // Get specific route metadata
  console.log('\nDigital Khata Metadata:');
  const metadata = navigationRouter.getRouteMetadata('digital_khata');
  if (metadata) {
    console.log(`  Label: ${metadata.label}`);
    console.log(`  Route: ${metadata.route}`);
    console.log(`  Description: ${metadata.description}`);
    console.log(`  Requires Confirmation: ${metadata.requiresConfirmation}`);
  }
  
  // Get route aliases
  console.log('\nDigital Khata Aliases:');
  const aliases = navigationRouter.getRouteAliases('digital_khata');
  Object.entries(aliases).forEach(([lang, aliasList]) => {
    console.log(`  ${lang}: ${aliasList.join(', ')}`);
  });
  
  // Get supported languages
  console.log('\nSupported Languages:');
  const languages = navigationRouter.getSupportedLanguages();
  console.log(`  ${languages.join(', ')}`);
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  const userId = 'demo-user-123';
  const artisanContext: ArtisanContext = {
    profile: {
      id: userId,
      name: 'Demo Artisan',
      email: 'demo@example.com',
      phone: '+91-1234567890',
      profession: 'Potter',
      specializations: ['Clay Pottery', 'Terracotta'],
      location: {
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
      },
      experience: 10,
      certifications: [],
      languages: ['hi', 'en'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    products: [],
    salesMetrics: {} as any,
    inventory: {} as any,
    schemes: [],
    buyers: [],
    preferences: {
      language: 'hi',
      responseLength: 'medium',
      communicationStyle: 'casual',
      notificationsEnabled: true,
      voiceEnabled: false,
      theme: 'light',
    },
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('NAVIGATION ROUTER - COMPREHENSIVE EXAMPLES');
  console.log('='.repeat(60) + '\n');
  
  await multilingualNavigationExample();
  console.log('\n' + '-'.repeat(60) + '\n');
  
  await routeSuggestionsExample();
  console.log('\n' + '-'.repeat(60) + '\n');
  
  navigationHistoryExample(userId);
  console.log('\n' + '-'.repeat(60) + '\n');
  
  await routeValidationExample(userId, artisanContext);
  console.log('\n' + '-'.repeat(60) + '\n');
  
  await errorHandlingExample('hi');
  console.log('\n' + '-'.repeat(60) + '\n');
  
  metadataAccessExample();
  console.log('\n' + '-'.repeat(60) + '\n');
  
  await completeNavigationFlow(
    'मुझे डिजिटल खाता दिखाओ',
    userId,
    artisanContext,
    'hi'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('ALL EXAMPLES COMPLETED');
  console.log('='.repeat(60) + '\n');
}

