/**
 * Notification Services Index
 * Exports all notification-related services and utilities
 */

// Core Services
export { GupshupService, getGupshupService } from './GupshupService';
export { NotificationOrchestrator, getNotificationOrchestrator } from './NotificationOrchestrator';
export { UserPreferenceService, getUserPreferenceService } from './UserPreferenceService';
export { MessageLocalizationService, getMessageLocalizationService } from './MessageLocalizationService';

// Supporting Services
export { TemplateManager, getTemplateManager } from './TemplateManager';
export { DeliveryTracker, getDeliveryTracker } from './DeliveryTracker';
export { FallbackManager, getFallbackManager } from './FallbackManager';
export { SMSTemplateManager, getSMSTemplateManager } from './SMSTemplateManager';

// Analytics and Reporting
export { AnalyticsService, getAnalyticsService } from './AnalyticsService';
export { WebhookProcessor, getWebhookProcessor } from './WebhookProcessor';

// Error Handling
export { GupshupErrorHandler, handleGupshupError } from './GupshupErrorHandler';

// Logging
export { GupshupLogger, getGupshupLogger } from './GupshupLogger';

// Message Queue and Batch Processing
export { MessageQueue, getMessageQueue, clearMessageQueueInstance } from './MessageQueue';
export { RateLimitManager, getRateLimitManager, clearRateLimitManagerInstance } from './RateLimitManager';
export { BatchProcessor, getBatchProcessor, clearBatchProcessorInstance } from './BatchProcessor';

// Types and Interfaces
export type {
  // Core Types
  NotificationChannel,
  NotificationContext,
  PreparedMessage,
  NotificationWorkflowResult,
  SchemeNotificationData,
  
  // User Preferences
  UserPreferenceRecord,
  ConsentRecord,
  OptOutRequest,
  PreferenceValidationResult,
  PreferenceUpdateRequest,
  
  // Localization
  LocalizationContext,
  LocalizedMessage,
  LanguageSupport,
  
  // Gupshup Service
  MessageResponse,
  BulkMessageResponse,
  WhatsAppMessageParams,
  SMSParams,
  NotificationParams,
  NotificationResult,
  RateLimitInfo,
} from './NotificationOrchestrator';

export type {
  UserPreferenceRecord,
  ConsentRecord,
  OptOutRequest,
  PreferenceValidationResult,
  PreferenceUpdateRequest,
} from './UserPreferenceService';

export type {
  LocalizationContext,
  LocalizedMessage,
  LanguageSupport,
} from './MessageLocalizationService';

// Message Queue Types
export type {
  QueuedMessage,
  QueueStatus,
  QueueHealthCheck,
  ProcessingResult,
} from './MessageQueue';

// Rate Limiting Types
export type {
  RateLimitConfig,
  RateLimitStatus,
  QuotaAlert,
  SchedulingRecommendation,
} from './RateLimitManager';

// Batch Processing Types
export type {
  BatchConfig,
  RetryConfig,
  DeadLetterConfig,
  BatchResult,
  BatchError,
  RetryAttempt,
  DeadLetterMessage,
  BatchProcessingStats,
} from './BatchProcessor';

// Delivery Tracking Types
export type {
  DeliveryStatus,
  DeliveryReport,
  DeliveryAnalytics,
  UserNotificationHistory,
  DeliveryTimeline,
  DeliveryEvent,
  RealTimeStatusUpdate,
  GupshupWebhook,
} from './DeliveryTracker';

// Analytics Types
export type {
  AnalyticsReport,
  AnalyticsSummary,
  DeliveryMetrics,
  CostAnalytics,
  PerformanceMetrics,
  TrendAnalysis,
  OptimizationRecommendation,
} from './AnalyticsService';

// Webhook Processing Types
export type {
  WebhookValidationResult,
  ProcessedWebhookPayload,
  WebhookProcessingResult,
  WebhookSecurityConfig,
} from './WebhookProcessor';

// Constants
export { DEFAULT_NOTIFICATION_PREFERENCES } from './UserPreferenceService';
export { SUPPORTED_LANGUAGES } from './MessageLocalizationService';