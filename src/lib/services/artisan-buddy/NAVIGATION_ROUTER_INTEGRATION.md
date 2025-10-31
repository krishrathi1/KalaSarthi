# Navigation Router - Integration Guide

## Quick Start

### 1. Import the Service

```typescript
import { navigationRouter } from '@/lib/services/artisan-buddy';
```

### 2. Basic Usage in a Chat Handler

```typescript
import { navigationRouter, intentClassifier } from '@/lib/services/artisan-buddy';

async function handleChatMessage(
  message: string,
  userId: string,
  artisanContext: ArtisanContext,
  language: string = 'en'
) {
  // Classify the intent
  const intent = await intentClassifier.classifyIntent(message);
  
  // Check if it's a navigation intent
  if (intent.type === 'navigation') {
    try {
      // Get the navigation route
      const result = await navigationRouter.getRoute(
        intent,
        artisanContext,
        language
      );
      
      // Check if confirmation is needed
      if (result.requiresConfirmation) {
        return {
          type: 'confirmation_required',
          message: result.confirmationMessage,
          preview: navigationRouter.createNavigationPreview(result, language),
          pendingNavigation: result,
        };
      }
      
      // Navigate directly
      return {
        type: 'navigate',
        route: result.route,
        parameters: result.parameters,
      };
      
    } catch (error) {
      // Handle navigation error
      const errorMessage = navigationRouter.handleNavigationError(
        error as Error,
        message,
        language
      );
      
      // Get suggestions
      const suggestions = await navigationRouter.suggestRoutes(
        message,
        language,
        3
      );
      
      return {
        type: 'error',
        message: errorMessage,
        suggestions,
      };
    }
  }
  
  // Handle other intent types...
}
```


### 3. Integration with Next.js Router

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { navigationRouter } from '@/lib/services/artisan-buddy';

export function ChatInterface() {
  const router = useRouter();
  
  const handleNavigation = async (intent: Intent) => {
    const result = await navigationRouter.getRoute(
      intent,
      artisanContext,
      userLanguage
    );
    
    // Add to history
    navigationRouter.addToHistory(userId, result.route, result.parameters);
    navigationRouter.addBreadcrumb(userId, result.route);
    
    // Navigate using Next.js router
    if (Object.keys(result.parameters).length > 0) {
      const queryString = new URLSearchParams(result.parameters).toString();
      router.push(`${result.route}?${queryString}`);
    } else {
      router.push(result.route);
    }
  };
  
  return (
    // Your chat UI
  );
}
```

### 4. Confirmation Dialog Component

```typescript
'use client';

import { useState } from 'react';
import { NavigationResult } from '@/lib/types/artisan-buddy';
import { navigationRouter } from '@/lib/services/artisan-buddy';

interface ConfirmationDialogProps {
  navigationResult: NavigationResult;
  language: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NavigationConfirmationDialog({
  navigationResult,
  language,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const preview = navigationRouter.createNavigationPreview(
    navigationResult,
    language
  );
  
  return (
    <div className="confirmation-dialog">
      <h3>{navigationResult.confirmationMessage}</h3>
      <pre className="preview">{preview}</pre>
      <div className="actions">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

### 5. Route Suggestions Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { navigationRouter } from '@/lib/services/artisan-buddy';
import { RouteSuggestion } from '@/lib/types/artisan-buddy';

interface RouteSuggestionsProps {
  query: string;
  language: string;
  onSelect: (route: string) => void;
}

export function RouteSuggestions({
  query,
  language,
  onSelect,
}: RouteSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
  
  useEffect(() => {
    if (query.length > 2) {
      navigationRouter.suggestRoutes(query, language, 5)
        .then(setSuggestions);
    }
  }, [query, language]);
  
  return (
    <div className="route-suggestions">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="suggestion"
          onClick={() => onSelect(suggestion.route)}
        >
          <h4>{suggestion.label}</h4>
          <p>{suggestion.description}</p>
          <span className="relevance">
            {(suggestion.relevance * 100).toFixed(0)}% match
          </span>
        </div>
      ))}
    </div>
  );
}
```


### 6. Breadcrumb Navigation Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { navigationRouter } from '@/lib/services/artisan-buddy';

interface BreadcrumbProps {
  userId: string;
}

export function Breadcrumb({ userId }: BreadcrumbProps) {
  const router = useRouter();
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  
  useEffect(() => {
    const crumbs = navigationRouter.getBreadcrumbs(userId);
    setBreadcrumbs(crumbs);
  }, [userId]);
  
  const handleBreadcrumbClick = (route: string) => {
    router.push(route);
  };
  
  return (
    <nav className="breadcrumb">
      {breadcrumbs.map((route, index) => (
        <span key={index}>
          <button onClick={() => handleBreadcrumbClick(route)}>
            {getRouteLabel(route)}
          </button>
          {index < breadcrumbs.length - 1 && <span> &gt; </span>}
        </span>
      ))}
    </nav>
  );
}

function getRouteLabel(route: string): string {
  const metadata = navigationRouter.getRouteMetadataByPath(route);
  return metadata?.label || route;
}
```

### 7. Navigation History Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { navigationRouter } from '@/lib/services/artisan-buddy';

interface NavigationHistoryProps {
  userId: string;
  limit?: number;
}

export function NavigationHistory({ userId, limit = 10 }: NavigationHistoryProps) {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    const entries = navigationRouter.getHistory(userId, limit);
    setHistory(entries);
  }, [userId, limit]);
  
  const handleHistoryClick = (route: string, parameters: any) => {
    if (Object.keys(parameters).length > 0) {
      const queryString = new URLSearchParams(parameters).toString();
      router.push(`${route}?${queryString}`);
    } else {
      router.push(route);
    }
  };
  
  return (
    <div className="navigation-history">
      <h3>Recent Navigation</h3>
      <ul>
        {history.map((entry, index) => (
          <li key={index}>
            <button onClick={() => handleHistoryClick(entry.route, entry.parameters)}>
              {getRouteLabel(entry.route)}
            </button>
            <span className="timestamp">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```


### 8. API Route Handler

```typescript
// app/api/artisan-buddy/navigate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { navigationRouter, intentClassifier } from '@/lib/services/artisan-buddy';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, language, artisanContext } = await request.json();
    
    // Classify intent
    const intent = await intentClassifier.classifyIntent(message);
    
    if (intent.type !== 'navigation') {
      return NextResponse.json({
        success: false,
        error: 'Not a navigation intent',
      });
    }
    
    // Get navigation route
    const result = await navigationRouter.getRoute(
      intent,
      artisanContext,
      language
    );
    
    // Validate route
    const isValid = await navigationRouter.validateRoute(
      result.route,
      userId,
      artisanContext
    );
    
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Route validation failed',
      });
    }
    
    // Add to history
    navigationRouter.addToHistory(userId, result.route, result.parameters);
    navigationRouter.addBreadcrumb(userId, result.route);
    
    return NextResponse.json({
      success: true,
      navigationResult: result,
    });
    
  } catch (error) {
    console.error('Navigation API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Navigation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### 9. Complete Chat Component Example

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { navigationRouter, intentClassifier } from '@/lib/services/artisan-buddy';
import { NavigationResult } from '@/lib/types/artisan-buddy';

export function ArtisanBuddyChat() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState<NavigationResult | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  const handleSendMessage = async () => {
    try {
      // Classify intent
      const intent = await intentClassifier.classifyIntent(message);
      
      if (intent.type === 'navigation') {
        const result = await navigationRouter.getRoute(
          intent,
          artisanContext,
          userLanguage
        );
        
        if (result.requiresConfirmation) {
          setPendingNavigation(result);
        } else {
          navigateToRoute(result);
        }
      }
    } catch (error) {
      const errorMessage = navigationRouter.handleNavigationError(
        error as Error,
        message,
        userLanguage
      );
      
      // Show error and suggestions
      const routeSuggestions = await navigationRouter.suggestRoutes(
        message,
        userLanguage,
        3
      );
      setSuggestions(routeSuggestions);
    }
  };
  
  const navigateToRoute = (result: NavigationResult) => {
    navigationRouter.addToHistory(userId, result.route, result.parameters);
    navigationRouter.addBreadcrumb(userId, result.route);
    
    if (Object.keys(result.parameters).length > 0) {
      const queryString = new URLSearchParams(result.parameters).toString();
      router.push(`${result.route}?${queryString}`);
    } else {
      router.push(result.route);
    }
  };
  
  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      navigateToRoute(pendingNavigation);
      setPendingNavigation(null);
    }
  };
  
  const handleCancelNavigation = () => {
    setPendingNavigation(null);
  };
  
  return (
    <div className="chat-container">
      {/* Chat messages */}
      
      {/* Confirmation dialog */}
      {pendingNavigation && (
        <div className="confirmation-dialog">
          <p>{pendingNavigation.confirmationMessage}</p>
          <pre>
            {navigationRouter.createNavigationPreview(
              pendingNavigation,
              userLanguage
            )}
          </pre>
          <button onClick={handleConfirmNavigation}>Confirm</button>
          <button onClick={handleCancelNavigation}>Cancel</button>
        </div>
      )}
      
      {/* Route suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions">
          <h4>Did you mean:</h4>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => router.push(s.route)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Input */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}
```

## Testing Integration

```typescript
import { navigationRouter } from '@/lib/services/artisan-buddy';

describe('Navigation Router Integration', () => {
  it('should integrate with chat flow', async () => {
    const intent = {
      type: 'navigation' as const,
      confidence: 0.9,
      entities: [],
      parameters: { destination: 'digital khata' },
    };
    
    const result = await navigationRouter.getRoute(
      intent,
      mockArtisanContext,
      'en'
    );
    
    expect(result.route).toBe('/digital-khata');
  });
});
```

## Best Practices

1. **Always handle errors**: Wrap navigation calls in try-catch
2. **Validate routes**: Use `validateRoute()` before navigation
3. **Track history**: Add to history for better UX
4. **Show confirmations**: Respect `requiresConfirmation` flag
5. **Provide suggestions**: Show alternatives on errors
6. **Use breadcrumbs**: Implement breadcrumb navigation
7. **Support multilingual**: Pass user's language to all methods

## Common Patterns

### Pattern 1: Navigation with Fallback
```typescript
try {
  const result = await navigationRouter.getRoute(intent, context, lang);
  navigate(result.route);
} catch (error) {
  const suggestions = await navigationRouter.suggestRoutes(query, lang);
  showSuggestions(suggestions);
}
```

### Pattern 2: Confirmation Flow
```typescript
const result = await navigationRouter.getRoute(intent, context, lang);
if (result.requiresConfirmation) {
  const confirmed = await showConfirmationDialog(result);
  if (confirmed) navigate(result.route);
} else {
  navigate(result.route);
}
```

### Pattern 3: History-Based Navigation
```typescript
const history = navigationRouter.getHistory(userId, 5);
const lastRoute = history[0]?.route;
if (lastRoute) {
  router.push(lastRoute);
}
```

## Troubleshooting

### Issue: Route not found
**Solution**: Check if route exists in ROUTE_METADATA, use `suggestRoutes()` for alternatives

### Issue: Fuzzy matching not working
**Solution**: Ensure similarity threshold is appropriate (default 0.6), check language parameter

### Issue: History not persisting
**Solution**: History is in-memory only, implement Redis/database for persistence

### Issue: Confirmation not showing
**Solution**: Check `requiresConfirmation` flag in route metadata

