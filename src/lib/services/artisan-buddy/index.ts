/**
 * Artisan Buddy Services - Main Export
 * 
 * Exports all core services for the Artisan Buddy chatbot system.
 */

export { redisClient, RedisClient } from './RedisClient';
export { contextEngine, ContextEngine } from './ContextEngine';
export { firestoreRepository, FirestoreRepository } from './FirestoreRepository';
export { conversationManager, ConversationManager } from './ConversationManager';
export { 
  conversationContextManager, 
  ConversationContextManager,
  type ConversationState,
  type ConversationFlowState,
  type ContextWindowOptions,
  type SummarizationOptions,
} from './ConversationContextManager';
export { intentClassifier, IntentClassifier } from './IntentClassifier';
export { customIntentModel, CustomIntentModel } from './CustomIntentModel';
export { googleCloudAI, GoogleCloudAI } from './GoogleCloudAI';
export { 
  TranslationService,
  EnhancedTranslationService,
  LanguageFormatter,
  CodeMixedTextHandler,
  LanguagePreferenceManager,
  TranslationQualityMonitor,
  BatchTranslationOptimizer,
  TranslationErrorHandler,
  LANGUAGE_NAMES,
  type LanguageCode,
  type TranslationResult,
  type LanguageDetection,
  type BatchTranslationResult,
  type TranslationQualityMetrics,
} from './TranslationService';

// Knowledge Base and RAG Services
export { VectorStore } from './VectorStore';
export { KnowledgeBaseService } from './KnowledgeBaseService';
export { RAGPipelineService } from './RAGPipelineService';
export { KnowledgeBaseSeeder } from './KnowledgeBaseSeeder';

// Response Generation Service
export { responseGenerator, ResponseGenerator } from './ResponseGenerator';
export type {
  ResponseGenerationRequest,
  ResponseGenerationOptions,
} from './ResponseGenerator';

// Navigation Router Service
export { navigationRouter, NavigationRouter } from './NavigationRouter';

// Vision Service
export { visionService, VisionService } from './VisionService';
export type {
  ImageUploadOptions,
  ImagePreprocessingOptions,
  CraftAnalysisOptions,
  VisionAnalysisResult,
} from './VisionService';

// Digital Khata Integration Service
export { digitalKhataIntegration, DigitalKhataIntegration } from './DigitalKhataIntegration';
export type {
  FinancialInsights,
  InventoryInsights,
  SalesTrendAnalysis,
  FinancialSummary,
} from './DigitalKhataIntegration';

// Scheme Sahayak Integration Service
export { schemeSahayakIntegration, SchemeSahayakIntegration } from './SchemeSahayakIntegration';
export type {
  SchemeRecommendation as SchemeRecommendationDetail,
  ApplicationStatus,
  EligibilityCheck,
  SchemeComparison,
} from './SchemeSahayakIntegration';

// Buyer Connect Integration Service
export { buyerConnectIntegration, BuyerConnectIntegration } from './BuyerConnectIntegration';
export type {
  BuyerInquiry,
  BuyerProfile,
  BuyerMatch,
  ResponseTemplate,
  InquirySummary,
} from './BuyerConnectIntegration';

// Knowledge Base Types
export type {
  KnowledgeDocument,
  KnowledgeMetadata,
  KnowledgeCategory,
  CraftInfo,
  Material,
  PriceRange,
  TechniqueInfo,
  Step,
  MarketInsights,
  SeasonalTrend,
  CompetitorInfo,
  SearchFilters,
  KnowledgeResult,
} from './types/knowledge-base';

// RAG Pipeline Types
export type {
  RAGRequest,
  RAGResponse,
  Document,
} from './RAGPipelineService';

// Re-export types for convenience
export type {
  Session,
  Message,
  MessageMetadata,
  ConversationContext,
  ArtisanContext,
  ArtisanProfile,
  Product,
  SalesMetrics,
  InventoryStatus,
  SchemeRecommendation,
  BuyerConnection,
  UserPreferences,
  ContextType,
} from '@/lib/types/artisan-buddy';
