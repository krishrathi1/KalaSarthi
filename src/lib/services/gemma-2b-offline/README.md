# Gemma 2B Offline Service - Core Infrastructure

This directory contains the core infrastructure for implementing Google's Gemma 2B model as an offline AI service in the browser.

## Overview

The infrastructure provides a complete foundation for running Gemma 2B locally using Transformers.js, including:

- **Type-safe interfaces** for all service components
- **Comprehensive error handling** with recovery strategies  
- **Configurable constants** for model settings and system requirements
- **Utility functions** for system capability detection and performance monitoring

## Architecture

```
src/lib/services/gemma-2b-offline/
├── index.ts           # Main exports and public API
├── constants.ts       # Model configs, system requirements, defaults
├── errors.ts          # Error classes and handling strategies
├── utils.ts           # System detection and helper utilities
└── README.md          # This documentation
```

## Key Components

### 1. Type Definitions (`src/lib/types/gemma-2b-offline.ts`)

Comprehensive TypeScript interfaces for:
- Service components (ModelLoader, InferenceEngine, ContextManager, etc.)
- Configuration objects (ModelConfig, GenerationConfig, etc.)
- Status and progress tracking (LoadProgress, PerformanceMetrics, etc.)
- Error handling (Gemma2BError, ErrorSeverity, etc.)

### 2. Error Handling (`errors.ts`)

Structured error handling with:
- **Specific error classes** for different failure modes
- **Recovery strategies** and suggested actions
- **Error severity levels** and recoverability flags
- **Central error handler** with logging and statistics

### 3. Constants and Configuration (`constants.ts`)

Pre-configured settings for:
- **Model configurations** (high-performance, low-resource, balanced)
- **Generation presets** (creative, factual, quick responses)
- **System requirements** and browser compatibility
- **Performance limits** and optimization settings
- **Language support** and artisan domain detection

### 4. Utility Functions (`utils.ts`)

Helper functions for:
- **System capability detection** (WebGL, WebAssembly, memory)
- **Browser compatibility checking**
- **Language and domain detection**
- **Performance measurement** and throttling
- **Storage quota management**

## Usage

```typescript
import {
  IGemma2BOfflineService,
  DEFAULT_MODEL_CONFIG,
  Gemma2BErrorHandler,
  checkSystemCapabilities
} from '@/lib/services/gemma-2b-offline';

// Check if system supports Gemma 2B
const systemCheck = checkSystemCapabilities();
if (!systemCheck.isSupported) {
  console.warn('System not supported:', systemCheck.warnings);
}

// Use error handler
const errorHandler = new Gemma2BErrorHandler();
try {
  // ... model operations
} catch (error) {
  const shouldFallback = errorHandler.shouldFallbackToDemo(error);
  if (shouldFallback) {
    // Switch to demo mode
  }
}
```

## System Requirements

- **Memory**: 2GB minimum, 4GB recommended
- **Browser**: Chrome 90+, Firefox 89+, Safari 14+, Edge 90+
- **Features**: WebGL and WebAssembly support required
- **Storage**: ~1.5GB for quantized model, ~8GB max cache

## Error Recovery

The infrastructure includes automatic error recovery for:
- **Network failures** during model download
- **Memory constraints** during inference
- **Browser compatibility** issues
- **Storage quota** exceeded
- **Model corruption** or validation failures

## Performance Optimization

Built-in optimizations include:
- **Device-specific** model configurations
- **Memory usage** monitoring and throttling
- **Context window** management
- **Response caching** for common queries
- **Progressive loading** with user feedback

## Next Steps

This infrastructure is ready for implementation of the actual service components:

1. **ModelLoader** - Download and cache Gemma 2B model
2. **InferenceEngine** - Execute text generation
3. **ContextManager** - Handle conversation context
4. **ResourceMonitor** - Monitor system performance
5. **Gemma2BOfflineService** - Main service orchestrator

Each component should implement the corresponding interface defined in the type definitions.