# Navigation Router - Implementation Guide

## Overview

The Navigation Router is a sophisticated service that handles navigation requests in the Artisan Buddy chatbot. It provides multilingual support, fuzzy matching, route suggestions, and navigation confirmation flows.

## Features

### 1. Route Resolution
- Maps user intents to application routes
- Supports dynamic route parameters
- Validates route accessibility

### 2. Multilingual Support
- Route aliases in 7+ Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, English)
- Fuzzy matching for typos and variations
- Language-specific error messages

### 3. Navigation Confirmation
- Configurable confirmation for sensitive routes
- Navigation preview with route details
- Confirmation messages in multiple languages

### 4. Navigation History
- Tracks user navigation history
- Breadcrumb trail support
- History management (last 50 entries)

## Usage

### Basic Navigation

```typescript
import { navigationRouter } from '@/lib/services/artisan-buddy';

// Get route from navigation intent
const result = await navigationRouter.getRoute(
  intent,
  artisanContext,
  'hi' // language
);

console.log(result);
// {
//   route: '/digital-khata',
//   parameters: {},
//   requiresConfirmation: false
// }
```


### Route Validation

```typescript
// Validate if user can access a route
const isValid = await navigationRouter.validateRoute(
  '/digital-khata',
  userId,
  artisanContext
);

if (isValid) {
  // Proceed with navigation
}
```

### Route Suggestions

```typescript
// Get route suggestions based on user query
const suggestions = await navigationRouter.suggestRoutes(
  'खाता', // Hindi for "account"
  'hi',   // language
  5       // limit
);

suggestions.forEach(suggestion => {
  console.log(`${suggestion.label}: ${suggestion.description}`);
  console.log(`Relevance: ${suggestion.relevance}`);
});
```

### Navigation History

```typescript
// Add to navigation history
navigationRouter.addToHistory(userId, '/digital-khata', { view: 'dashboard' });

// Get navigation history
const history = navigationRouter.getHistory(userId, 10);

history.forEach(entry => {
  console.log(`${entry.route} at ${entry.timestamp}`);
});

// Clear history
navigationRouter.clearHistory(userId);
```

### Breadcrumbs

```typescript
// Add breadcrumb
navigationRouter.addBreadcrumb(userId, '/digital-khata');
navigationRouter.addBreadcrumb(userId, '/digital-khata/transactions');

// Get breadcrumbs
const breadcrumbs = navigationRouter.getBreadcrumbs(userId);
console.log(breadcrumbs); // ['/digital-khata', '/digital-khata/transactions']

// Clear breadcrumbs
navigationRouter.clearBreadcrumbs(userId);
```


### Navigation Preview

```typescript
// Create navigation preview
const preview = navigationRouter.createNavigationPreview(
  navigationResult,
  'hi'
);

console.log(preview);
// 📍 गंतव्य: Digital Khata
// 📝 विवरण: Manage your financial records, sales, and expenses
```

### Error Handling

```typescript
try {
  const result = await navigationRouter.getRoute(intent, context, 'hi');
  // Handle successful navigation
} catch (error) {
  const errorMessage = navigationRouter.handleNavigationError(
    error,
    'unknown destination',
    'hi'
  );
  console.log(errorMessage);
  // मुझे "unknown destination" पेज नहीं मिला। क्या आप उपलब्ध विकल्प देखना चाहेंगे?
}
```

## Supported Routes

The Navigation Router supports the following routes:

| Route Key | Path | Description |
|-----------|------|-------------|
| `digital_khata` | `/digital-khata` | Financial records and ledger |
| `scheme_sahayak` | `/scheme-sahayak` | Government schemes and benefits |
| `buyer_connect` | `/buyer-connect` | Buyer connections and inquiries |
| `product_creator` | `/product-creator` | Product listing management |
| `heritage_storytelling` | `/heritage-storytelling` | Craft heritage and stories |
| `profile` | `/profile` | User profile management |
| `inventory` | `/inventory` | Product inventory |
| `sales_analytics` | `/finance/dashboard` | Sales reports and analytics |
| `marketplace` | `/marketplace` | Marketplace browsing |
| `notifications` | `/notifications` | Notifications and alerts |
| `enhanced_chat` | `/enhanced-chat` | Enhanced chat interface |


## Multilingual Aliases

Each route has aliases in multiple languages. Examples:

### Digital Khata
- **English**: digital khata, khata, ledger, accounts, finance, money
- **Hindi**: डिजिटल खाता, खाता, लेखा, हिसाब, वित्त
- **Tamil**: டிஜிட்டல் கணக்கு, கணக்கு, நிதி
- **Telugu**: డిజిటల్ ఖాతా, ఖాతా, ఆర్థిక
- **Bengali**: ডিজিটাল খাতা, খাতা, হিসাব
- **Marathi**: डिजिटल खाते, खाते, हिशोब
- **Gujarati**: ડિજિટલ ખાતું, ખાતું, હિસાબ

### Scheme Sahayak
- **English**: scheme sahayak, schemes, government schemes, benefits, subsidies, yojana
- **Hindi**: योजना सहायक, योजनाएं, सरकारी योजनाएं, लाभ, सब्सिडी
- **Tamil**: திட்ட உதவியாளர், திட்டங்கள், அரசு திட்டங்கள்
- **Telugu**: పథకం సహాయకుడు, పథకాలు, ప్రభుత్వ పథకాలు

## Fuzzy Matching

The Navigation Router uses Levenshtein distance algorithm for fuzzy matching:

```typescript
// These will all match to 'digital_khata':
"digital khata"  // Exact match
"dijital khata"  // Typo
"khata"          // Partial match
"खाता"           // Hindi alias
"डिजिटल"         // Hindi partial
```

Matching threshold: 0.6 (60% similarity required)

## Confirmation Flow

Routes can be configured to require confirmation:

```typescript
const ROUTE_METADATA = {
  sensitive_route: {
    route: '/sensitive',
    requiresConfirmation: true,
    // ...
  }
};
```

When confirmation is required:
1. `requiresConfirmation` flag is set to `true`
2. `confirmationMessage` is generated in user's language
3. Application should show confirmation dialog before navigation


## Integration with Intent Classifier

The Navigation Router works seamlessly with the Intent Classifier:

```typescript
import { intentClassifier, navigationRouter } from '@/lib/services/artisan-buddy';

// User message: "मुझे खाता दिखाओ" (Show me the account)
const intent = await intentClassifier.classifyIntent(message, context);

if (intent.type === 'navigation') {
  const navigationResult = await navigationRouter.getRoute(
    intent,
    artisanContext,
    'hi'
  );
  
  if (navigationResult.requiresConfirmation) {
    // Show confirmation dialog
    console.log(navigationResult.confirmationMessage);
  } else {
    // Navigate directly
    router.push(navigationResult.route);
  }
}
```

## Advanced Features

### Custom Route Parameters

```typescript
// Intent with parameters
const intent = {
  type: 'navigation',
  parameters: {
    destination: 'product',
    productId: '123',
    action: 'edit'
  }
};

const result = await navigationRouter.getRoute(intent, context);
// result.route: '/product-creator'
// result.parameters: { productId: '123', action: 'edit' }
```

### Route Metadata Access

```typescript
// Get all routes
const allRoutes = navigationRouter.getAllRoutes();

// Get specific route metadata
const metadata = navigationRouter.getRouteMetadata('digital_khata');

// Get metadata by path
const metadata2 = navigationRouter.getRouteMetadataByPath('/digital-khata');

// Get route aliases
const aliases = navigationRouter.getRouteAliases('digital_khata');
console.log(aliases.hi); // ['डिजिटल खाता', 'खाता', 'लेखा', ...]

// Get supported languages
const languages = navigationRouter.getSupportedLanguages();
console.log(languages); // ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu']
```


## Performance Considerations

### Caching
- Route metadata is stored in memory (no database calls)
- Fuzzy matching is optimized with early termination
- History is limited to 50 entries per user
- Breadcrumbs are limited to 10 entries per user

### Memory Usage
- Minimal memory footprint
- History and breadcrumbs stored in Map structures
- Automatic cleanup of old entries

## Testing

```typescript
import { navigationRouter } from '@/lib/services/artisan-buddy';

describe('NavigationRouter', () => {
  it('should resolve route from Hindi alias', async () => {
    const intent = {
      type: 'navigation',
      parameters: { destination: 'खाता' },
      entities: [],
      confidence: 0.9
    };
    
    const result = await navigationRouter.getRoute(intent, context, 'hi');
    expect(result.route).toBe('/digital-khata');
  });

  it('should handle fuzzy matching', async () => {
    const suggestions = await navigationRouter.suggestRoutes('khata', 'en', 5);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].route).toBe('/digital-khata');
  });

  it('should track navigation history', () => {
    navigationRouter.addToHistory('user123', '/digital-khata');
    const history = navigationRouter.getHistory('user123');
    expect(history.length).toBe(1);
    expect(history[0].route).toBe('/digital-khata');
  });
});
```

## Error Scenarios

The Navigation Router handles various error scenarios:

1. **Unknown Destination**: Returns user-friendly error message with suggestions
2. **Permission Denied**: Informs user about access restrictions
3. **Invalid Parameters**: Validates and reports parameter issues
4. **Service Unavailable**: Graceful degradation with fallback behavior

## Best Practices

1. **Always specify language**: Pass the user's preferred language for better matching
2. **Handle confirmation**: Check `requiresConfirmation` flag before navigation
3. **Track history**: Use history tracking for better UX (back button, etc.)
4. **Use breadcrumbs**: Implement breadcrumb navigation for complex flows
5. **Error handling**: Always wrap navigation calls in try-catch blocks
6. **Validate routes**: Use `validateRoute()` before navigation for security

## Future Enhancements

- [ ] Add route permissions based on user roles
- [ ] Implement route analytics and tracking
- [ ] Add support for more languages
- [ ] Dynamic route registration
- [ ] Route middleware support
- [ ] Navigation animations and transitions

## Related Services

- **Intent Classifier**: Determines navigation intent from user messages
- **Translation Service**: Translates route labels and descriptions
- **Context Engine**: Provides artisan context for route validation
- **Conversation Manager**: Orchestrates navigation within conversations

