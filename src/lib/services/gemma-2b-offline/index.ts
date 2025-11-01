/**
 * Gemma 2B Offline Service - Core Infrastructure
 * 
 * This module provides the core infrastructure for running Google's Gemma 2B model
 * offline in the browser using Transformers.js. It includes:
 * 
 * - TypeScript interfaces for all service components
 * - Error handling classes and utilities
 * - Model constants and default configurations
 * - System requirements and browser compatibility checks
 */

// Export all types and interfaces
export * from '../../types/gemma-2b-offline';

// Export error handling classes
export * from './errors';

// Export constants and configurations
export * from './constants';

// Re-export commonly used types for convenience
export type {
    IGemma2BOfflineService,
    IModelLoader,
    IInferenceEngine,
    IContextManager,
    IResourceMonitor,
    ModelConfig,
    GenerationConfig,
    GenerationOptions,
    SystemRequirements,
    LoadProgress,
    ModelInfo,
    SystemCheck,
    MemoryStats,
    PerformanceMetrics,
    Gemma2BError,
    ServiceStatus
} from '../../types/gemma-2b-offline';

// Re-export error classes for convenience
export {
    Gemma2BBaseError,
    ModelLoadError,
    InferenceError,
    ResourceError,
    BrowserCompatibilityError,
    NetworkError,
    CacheError,
    ValidationError,
    Gemma2BErrorHandler
} from './errors';

// Re-export key constants
export {
    DEFAULT_MODEL_CONFIG,
    DEFAULT_GENERATION_CONFIG,
    SYSTEM_REQUIREMENTS,
    BROWSER_SUPPORT,
    SYSTEM_PROMPTS,
    ERROR_MESSAGES
} from './constants';

// Export utility functions
export * from './utils';

// Export service components
export { ResourceMonitor, createResourceMonitor, getResourceMonitor } from './ResourceMonitor';
export { ModelLoader, createModelLoader, getModelLoader } from './ModelLoader';
export { InferenceEngine, createInferenceEngine, getInferenceEngine } from './InferenceEngine';
export { ContextManager, createContextManager, getContextManager, resetContextManager } from './ContextManager';
export { FallbackService } from './FallbackService';
export { ErrorNotificationService, getErrorNotificationService } from './ErrorNotificationService';
export type { ErrorNotification, NotificationAction, NotificationType } from './ErrorNotificationService';

// Performance optimization components removed for stability