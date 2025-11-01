# Gemma 2B Offline Service - Error Handling & Fallback Guide

This guide covers the comprehensive error handling and fallback mechanisms implemented for the Gemma 2B Offline AI Service.

## Overview

The error handling system provides:
- **Graceful degradation** to demo mode when the AI model fails
- **Intelligent retry mechanisms** with exponential backoff
- **User-friendly error messages** with troubleshooting steps
- **Resource constraint handling** to prevent system overload
- **Multilingual support** for error messages (English/Hindi)

## Key Components

### 1. Gemma2BErrorHandler

Central error handling service that manages all error scenarios.

```typescript
import { Gemma2BErrorHandler } from './gemma-2b-offline';

const errorHandler = new Gemma2BErrorHandler();

// Retry operations with exponential backoff
const result = await errorHandler.retryOperation(
    async () => await riskyOperation(),
    'operation-id',
    3, // max retries
    1000 // base delay ms
);

// Enable fallback mode
await errorHandler.enableFallbackMode('Critical error occurred');

// Generate user-friendly error responses
const errorResponse = errorHandler.generateUserFriendlyErrorResponse(error);
```

### 2. FallbackService

Provides demo responses when the main AI service is unavailable.

```typescript
import { FallbackService } from './gemma-2b-offline';

const fallbackService = new FallbackService();

// Generate fallback response
const response = await fallbackService.generateFallbackResponse(
    'How should I price my pottery?',
    SupportedLanguage.ENGLISH,
    'session-id'
);
```

### 3. ErrorNotificationService

Manages user-facing error notifications with recovery actions.

```typescript
import { getErrorNotificationService } from './gemma-2b-offline';

const notificationService = getErrorNotificationService();

// Show error notification with recovery actions
notificationService.showError(error, SupportedLanguage.ENGLISH, {
    retry: async () => await retryOperation(),
    fallback: async () => await enableFallbackMode(),
    clearCache: async () => await clearBrowserCache()
});
```

## Error Types

### Model Load Errors
- **Cause**: Network issues, insufficient storage, corrupted model files
- **Recovery**: Retry with exponential backoff, clear cache, fallback to demo mode
- **User Action**: Check internet connection, free up storage space

### Inference Errors
- **Cause**: Processing failures, context too long, model corruption
- **Recovery**: Retry with shorter context, restart inference engine
- **User Action**: Rephrase message, try shorter input

### Resource Errors
- **Cause**: Insufficient memory, CPU throttling, storage quota exceeded
- **Recovery**: Pause operations, suggest closing other apps, fallback mode
- **User Action**: Close browser tabs, restart browser, use more powerful device

### Browser Compatibility Errors
- **Cause**: Missing WebGL/WebAssembly support, outdated browser
- **Recovery**: Graceful degradation to demo mode
- **User Action**: Update browser, enable required features

### Network Errors
- **Cause**: Connection timeouts, DNS issues, firewall blocking
- **Recovery**: Retry with backoff, use cached model if available
- **User Action**: Check internet connection, try different network

## Usage Examples

### Basic Error Handling

```typescript
import { GemmaOfflineService } from './GemmaOfflineService';

const service = GemmaOfflineService.getInstance();

try {
    // Initialize with automatic error handling
    const initialized = await service.initialize();
    
    if (!initialized) {
        // Service will automatically fall back to demo mode
        console.log('Service running in fallback mode');
    }
    
    // Generate response with error handling
    const response = await service.generateResponse('Hello');
    
} catch (error) {
    // Error is already handled internally
    console.error('Service error:', error.message);
}
```

### Advanced Error Handling

```typescript
// Get detailed error information
const errorInfo = service.getErrorInfo();

if (errorInfo.isInFallbackMode) {
    console.log('Service is in fallback mode');
    console.log('Troubleshooting steps:', errorInfo.troubleshooting);
    console.log('Recovery strategies:', errorInfo.recoveryStrategies);
}

// Attempt manual recovery
const recovered = await service.attemptRecovery();
if (recovered) {
    console.log('Service recovered successfully');
}

// Force fallback mode (for testing)
await service.enableFallbackMode('Manual override');
```

### Notification Handling

```typescript
import { getErrorNotificationService } from './gemma-2b-offline';

const notificationService = getErrorNotificationService();

// Subscribe to notifications
const unsubscribe = notificationService.subscribe((notifications) => {
    notifications.forEach(notification => {
        console.log(`${notification.type}: ${notification.message}`);
        
        // Handle notification actions
        notification.actions.forEach(action => {
            if (action.id === 'retry') {
                // Show retry button in UI
            }
        });
    });
});

// Show custom error notification
notificationService.showError(
    {
        type: Gemma2BErrorType.RESOURCE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'System resources low',
        timestamp: Date.now(),
        recoverable: true
    },
    SupportedLanguage.ENGLISH,
    {
        retry: async () => {
            // Custom retry logic
            await service.attemptRecovery();
        }
    }
);
```

## Fallback Mode

When the AI model cannot be loaded or fails critically, the service automatically switches to fallback mode:

### Features
- **Demo responses** tailored to artisan needs
- **Domain detection** (pottery, textiles, woodwork, etc.)
- **Multilingual support** (English/Hindi)
- **Conversation context** maintained across interactions
- **Clear indicators** that responses are from demo mode

### Demo Response Categories
- **Pricing advice** for craft products
- **Business development** strategies
- **Technical guidance** for craft techniques
- **Material sourcing** recommendations
- **General artisan support**

### Example Fallback Responses

**English:**
```
For pricing your crafts, consider: material costs + labor time + overhead + profit margin (20-30%). Research similar products in your local market.

[Demo Mode - AI model loading]
```

**Hindi:**
```
अपने शिल्प का मूल्य निर्धारण: सामग्री लागत + श्रम समय + अन्य खर्च + लाभ (20-30%)। स्थानीय बाजार में समान उत्पादों की जांच करें।

[डेमो मोड - AI मॉडल लोड हो रहा है]
```

## Resource Monitoring

The system continuously monitors resources to prevent overload:

### Memory Monitoring
- **70% usage**: Warning logged
- **80% usage**: Performance degradation warning
- **90% usage**: Critical alert, fallback mode activated

### CPU Throttling Detection
- Measures computation time for simple operations
- Detects browser/system throttling
- Adjusts processing accordingly

### Storage Quota Management
- Monitors browser storage usage
- Prevents quota exceeded errors
- Suggests cache cleanup when needed

## Recovery Strategies

### Immediate Actions
- Refresh the page
- Try again in a moment
- Close other browser tabs
- Switch network connection

### Short-term Actions
- Clear browser cache
- Restart browser
- Close other applications
- Free up storage space

### Long-term Actions
- Update browser to latest version
- Upgrade device memory (RAM)
- Use more powerful device
- Contact technical support

## Configuration

### Error Retry Settings
```typescript
const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000,
    BACKOFF_MULTIPLIER: 2,
    TIMEOUT_MS: 30000
};
```

### Resource Thresholds
```typescript
const PERFORMANCE_LIMITS = {
    MEMORY_WARNING_THRESHOLD: 0.7,   // 70%
    MEMORY_CRITICAL_THRESHOLD: 0.9,  // 90%
    MAX_INFERENCE_TIME_MS: 30000,    // 30 seconds
    MIN_TOKENS_PER_SECOND: 0.5       // Minimum speed
};
```

### Fallback Configuration
```typescript
const FALLBACK_CONFIG = {
    AUTO_ENABLE_ON_CRITICAL: true,
    DEMO_RESPONSE_DELAY: 500,        // Simulate processing
    MAX_CONVERSATION_HISTORY: 10,    // Messages to keep
    DOMAIN_DETECTION_ENABLED: true
};
```

## Testing

Run the comprehensive test suite:

```bash
npm test -- --testPathPatterns=error-handling.test.ts
```

Run the interactive demo:

```typescript
import { runErrorHandlingDemo } from './examples/error-handling-demo';
await runErrorHandlingDemo();
```

## Best Practices

### For Developers

1. **Always handle errors gracefully**
   ```typescript
   try {
       const result = await service.generateResponse(message);
   } catch (error) {
       // Service handles errors internally, but you can add custom logic
       console.log('Custom error handling:', error.message);
   }
   ```

2. **Monitor service status**
   ```typescript
   const status = service.getServiceStatus();
   if (status.state === ServiceState.ERROR) {
       // Handle error state
   }
   ```

3. **Provide user feedback**
   ```typescript
   const errorInfo = service.getErrorInfo();
   if (errorInfo.isInFallbackMode) {
       // Show fallback mode indicator in UI
   }
   ```

### For Users

1. **Keep browser updated** for best compatibility
2. **Close unnecessary tabs** to free up memory
3. **Use stable internet connection** for model loading
4. **Clear cache periodically** to prevent storage issues

## Troubleshooting

### Common Issues

**Service won't initialize:**
- Check browser compatibility (Chrome 90+, Firefox 89+, Safari 14+, Edge 90+)
- Ensure WebGL and WebAssembly are enabled
- Free up memory by closing other applications
- Clear browser cache and cookies

**Slow responses:**
- Close other browser tabs
- Check for CPU throttling (battery saver mode)
- Use a more powerful device
- Enable fallback mode for faster demo responses

**Storage errors:**
- Clear browser cache and data
- Free up disk space
- Check storage quota in browser settings
- Use incognito/private mode as temporary workaround

**Network issues:**
- Check internet connection
- Try different network (WiFi/mobile data)
- Disable VPN or proxy temporarily
- Check firewall settings

### Debug Information

Enable debug logging:
```typescript
// Set environment variable
process.env.NODE_ENV = 'development';

// Or enable manually
const DEBUG_CONFIG = {
    ENABLE_CONSOLE_LOGS: true,
    ENABLE_PERFORMANCE_LOGS: true
};
```

Get detailed error statistics:
```typescript
const errorStats = service.getErrorInfo();
console.log('Error statistics:', errorStats.errorStats);
console.log('Last error:', errorStats.lastError);
console.log('Recovery strategies:', errorStats.recoveryStrategies);
```

## Support

For additional support:
1. Check the console for detailed error messages
2. Review the troubleshooting steps provided by the error handler
3. Use the fallback mode as a temporary solution
4. Report persistent issues with error logs and system information

The error handling system is designed to provide a smooth user experience even when things go wrong, ensuring that artisans can always get help with their craft and business needs.