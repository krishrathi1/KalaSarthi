/**
 * Service interfaces for AI-Powered Scheme Sahayak v2.0
 * Defines the contracts for all core services
 */

import {
  ArtisanProfile,
  GovernmentScheme,
  AISchemeRecommendation,
  SuccessPrediction,
  RecommendationExplanation,
  UserFeedback,
  RecommendationOptions,
  DocumentUploadResult,
  DocumentVerificationResult,
  DocumentStatusSummary,
  MissingDocumentReport,
  SchemeApplication,
  ApplicationSubmissionResult,
  ApplicationStatus,
  ApplicationTimeline,
  SyncResult,
  SmartNotification,
  NotificationResult,
  NotificationPreferences,
  NotificationAnalytics,
  UserSettings,
  LanguageAccessibilitySettings,
  PrivacySettings,
  PersonalAnalytics,
  ImprovementRecommendations,
  SchemeOpportunityPrediction,
  BusinessGrowthAnalysis
} from '../../types/scheme-sahayak';

// ============================================================================
// AI RECOMMENDATION ENGINE INTERFACE
// ============================================================================

/**
 * AI Recommendation Engine Service Interface
 * Provides intelligent scheme recommendations using machine learning models
 */
export interface IAIRecommendationEngine {
  /**
   * Generate personalized scheme recommendations for an artisan
   */
  generateRecommendations(
    artisanId: string, 
    options: RecommendationOptions
  ): Promise<AISchemeRecommendation[]>;
  
  /**
   * Predict success probability for a specific scheme application
   */
  predictSuccess(
    artisanId: string, 
    schemeId: string
  ): Promise<SuccessPrediction>;
  
  /**
   * Explain why a recommendation was made
   */
  explainRecommendation(
    recommendationId: string
  ): Promise<RecommendationExplanation>;
  
  /**
   * Update model with user feedback for continuous learning
   */
  updateModelFeedback(
    recommendationId: string, 
    feedback: UserFeedback
  ): Promise<void>;

  /**
   * Refresh recommendations based on updated profile or new schemes
   */
  refreshRecommendations(artisanId: string): Promise<AISchemeRecommendation[]>;

  /**
   * Get model performance metrics
   */
  getModelMetrics(): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    lastTrainingDate: Date;
    totalPredictions: number;
  }>;
}

// ============================================================================
// DOCUMENT MANAGER INTERFACE
// ============================================================================

/**
 * Smart Document Manager Service Interface
 * Handles document upload, processing, verification, and management
 */
export interface IDocumentManager {
  /**
   * Upload and process a document
   */
  uploadDocument(
    file: File, 
    artisanId: string, 
    documentType?: string
  ): Promise<DocumentUploadResult>;
  
  /**
   * Verify document authenticity and validity
   */
  verifyDocument(
    documentId: string, 
    verificationType: 'auto' | 'manual'
  ): Promise<DocumentVerificationResult>;
  
  /**
   * Get comprehensive document status for an artisan
   */
  getDocumentStatus(
    artisanId: string
  ): Promise<DocumentStatusSummary>;
  
  /**
   * Generate report of missing documents for specific schemes
   */
  generateMissingDocumentReport(
    artisanId: string, 
    schemeIds: string[]
  ): Promise<MissingDocumentReport>;
  
  /**
   * Schedule expiry reminders for documents
   */
  scheduleExpiryReminders(
    artisanId: string
  ): Promise<void>;

  /**
   * Delete a document and its associated data
   */
  deleteDocument(
    documentId: string,
    artisanId: string
  ): Promise<void>;

  /**
   * Get document download URL
   */
  getDocumentUrl(
    documentId: string,
    artisanId: string
  ): Promise<string>;

  /**
   * Update document metadata
   */
  updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>
  ): Promise<void>;
}

// ============================================================================
// APPLICATION TRACKER INTERFACE
// ============================================================================

/**
 * Real-time Application Tracker Service Interface
 * Monitors and manages scheme applications across government portals
 */
export interface IApplicationTracker {
  /**
   * Submit application to government portal
   */
  submitApplication(
    application: SchemeApplication
  ): Promise<ApplicationSubmissionResult>;
  
  /**
   * Track current status of an application
   */
  trackApplication(
    applicationId: string
  ): Promise<ApplicationStatus>;
  
  /**
   * Get detailed application timeline
   */
  getApplicationTimeline(
    applicationId: string
  ): Promise<ApplicationTimeline>;
  
  /**
   * Synchronize all applications for an artisan
   */
  syncAllApplications(
    artisanId: string
  ): Promise<SyncResult>;
  
  /**
   * Setup webhooks for real-time status updates
   */
  setupStatusWebhooks(
    applicationId: string
  ): Promise<void>;

  /**
   * Get all applications for an artisan
   */
  getArtisanApplications(
    artisanId: string,
    status?: string
  ): Promise<SchemeApplication[]>;

  /**
   * Update application status manually
   */
  updateApplicationStatus(
    applicationId: string,
    status: string,
    notes?: string
  ): Promise<void>;

  /**
   * Cancel an application
   */
  cancelApplication(
    applicationId: string,
    reason: string
  ): Promise<void>;
}

// ============================================================================
// NOTIFICATION SYSTEM INTERFACE
// ============================================================================

/**
 * Smart Notification System Service Interface
 * Handles intelligent, multi-channel notification delivery
 */
export interface ISmartNotificationSystem {
  /**
   * Send a smart notification through optimal channels
   */
  sendNotification(
    notification: SmartNotification
  ): Promise<NotificationResult>;
  
  /**
   * Schedule a notification for future delivery
   */
  scheduleNotification(
    notification: SmartNotification, 
    scheduledFor: Date
  ): Promise<string>;
  
  /**
   * Optimize delivery timing based on user engagement patterns
   */
  optimizeDeliveryTiming(
    userId: string
  ): Promise<string>;
  
  /**
   * Update user notification preferences
   */
  updatePreferences(
    userId: string, 
    preferences: NotificationPreferences
  ): Promise<void>;
  
  /**
   * Get notification delivery analytics
   */
  getDeliveryAnalytics(
    userId: string
  ): Promise<NotificationAnalytics>;

  /**
   * Cancel a scheduled notification
   */
  cancelScheduledNotification(
    notificationId: string
  ): Promise<void>;

  /**
   * Get notification history for a user
   */
  getNotificationHistory(
    userId: string,
    limit?: number
  ): Promise<SmartNotification[]>;

  /**
   * Mark notification as read
   */
  markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void>;
}

// ============================================================================
// SCHEME SERVICE INTERFACE
// ============================================================================

/**
 * Government Scheme Service Interface
 * Manages government scheme data and discovery
 */
export interface ISchemeService {
  /**
   * Get all active schemes with optional filtering
   */
  getActiveSchemes(
    filters?: {
      category?: string;
      state?: string;
      businessType?: string;
      maxAmount?: number;
    }
  ): Promise<GovernmentScheme[]>;

  /**
   * Get scheme by ID
   */
  getSchemeById(schemeId: string): Promise<GovernmentScheme | null>;

  /**
   * Search schemes by text query
   */
  searchSchemes(
    query: string,
    filters?: Record<string, any>
  ): Promise<GovernmentScheme[]>;

  /**
   * Get schemes by category
   */
  getSchemesByCategory(category: string): Promise<GovernmentScheme[]>;

  /**
   * Get popular schemes
   */
  getPopularSchemes(limit?: number): Promise<GovernmentScheme[]>;

  /**
   * Update scheme data from government APIs
   */
  syncSchemeData(): Promise<{
    updated: number;
    added: number;
    removed: number;
    errors: string[];
  }>;

  /**
   * Get scheme statistics
   */
  getSchemeStatistics(): Promise<{
    totalSchemes: number;
    activeSchemes: number;
    categoryCounts: Record<string, number>;
    averageSuccessRate: number;
  }>;
}

// ============================================================================
// USER SERVICE INTERFACE
// ============================================================================

/**
 * User Service Interface
 * Manages artisan profiles and user data
 */
export interface IUserService {
  /**
   * Create a new artisan profile
   */
  createArtisanProfile(profile: Omit<ArtisanProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  /**
   * Get artisan profile by ID
   */
  getArtisanProfile(artisanId: string): Promise<ArtisanProfile | null>;

  /**
   * Update artisan profile
   */
  updateArtisanProfile(
    artisanId: string,
    updates: Partial<ArtisanProfile>
  ): Promise<void>;

  /**
   * Delete artisan profile and all associated data
   */
  deleteArtisanProfile(artisanId: string): Promise<void>;

  /**
   * Get artisan by phone number
   */
  getArtisanByPhone(phone: string): Promise<ArtisanProfile | null>;

  /**
   * Update AI profile features
   */
  updateAIProfile(
    artisanId: string,
    features: Record<string, number>,
    successProbability: number
  ): Promise<void>;

  /**
   * Get artisans by location
   */
  getArtisansByLocation(
    state: string,
    district?: string
  ): Promise<ArtisanProfile[]>;

  /**
   * Get user preferences
   */
  getUserPreferences(artisanId: string): Promise<NotificationPreferences>;

  /**
   * Update user preferences
   */
  updateUserPreferences(
    artisanId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void>;

  /**
   * Get comprehensive user settings
   */
  getUserSettings(artisanId: string): Promise<UserSettings>;

  /**
   * Update user settings
   */
  updateUserSettings(
    artisanId: string,
    settings: Partial<UserSettings>
  ): Promise<void>;

  /**
   * Update language and accessibility settings
   */
  updateLanguageAccessibilitySettings(
    artisanId: string,
    settings: Partial<LanguageAccessibilitySettings>
  ): Promise<void>;

  /**
   * Update privacy settings
   */
  updatePrivacySettings(
    artisanId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void>;

  /**
   * Get privacy settings
   */
  getPrivacySettings(artisanId: string): Promise<PrivacySettings>;

  /**
   * Record consent for data processing
   */
  recordConsent(
    artisanId: string,
    consentType: string,
    granted: boolean,
    version: string
  ): Promise<void>;

  /**
   * Get consent history
   */
  getConsentHistory(artisanId: string): Promise<Array<{
    type: string;
    granted: boolean;
    date: Date;
    version: string;
  }>>;

  /**
   * Delete user data (GDPR compliance)
   */
  deleteUserData(
    artisanId: string,
    dataTypes: string[]
  ): Promise<void>;

  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(artisanId: string): Promise<Record<string, any>>;
}

// ============================================================================
// ANALYTICS SERVICE INTERFACE
// ============================================================================

/**
 * Analytics Service Interface
 * Provides insights and analytics for the system
 */
export interface IAnalyticsService {
  /**
   * Get comprehensive personal analytics for an artisan
   * Requirement 8.1: Track and display personal application success rate over time
   * Requirement 8.2: Provide comparative analytics with similar artisan profiles
   * Requirement 8.3: Identify factors contributing to application success or failure
   */
  getPersonalAnalytics(
    artisanId: string,
    period?: { start: Date; end: Date }
  ): Promise<PersonalAnalytics>;

  /**
   * Generate monthly improvement recommendations
   * Requirement 8.4: Generate personalized improvement recommendations monthly
   */
  generateImprovementRecommendations(
    artisanId: string
  ): Promise<ImprovementRecommendations>;

  /**
   * Predict future scheme opportunities
   * Requirement 8.5: Predict future scheme opportunities based on business growth patterns
   */
  predictSchemeOpportunities(
    artisanId: string
  ): Promise<SchemeOpportunityPrediction>;

  /**
   * Analyze business growth patterns
   * Requirement 8.5: Predict future scheme opportunities based on business growth patterns
   */
  analyzeBusinessGrowth(
    artisanId: string
  ): Promise<BusinessGrowthAnalysis>;

  /**
   * Get system-wide analytics
   */
  getSystemAnalytics(): Promise<{
    totalUsers: number;
    totalApplications: number;
    overallSuccessRate: number;
    popularSchemes: Array<{
      schemeId: string;
      name: string;
      applications: number;
    }>;
    performanceMetrics: {
      averageRecommendationTime: number;
      averageDocumentProcessingTime: number;
      systemUptime: number;
    };
  }>;

  /**
   * Track user action for analytics
   */
  trackUserAction(
    artisanId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Generate insights report
   */
  generateInsightsReport(
    artisanId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    insights: string[];
    recommendations: string[];
    trends: Record<string, any>;
  }>;

  /**
   * Calculate comparative analytics with similar profiles
   */
  calculateComparativeAnalytics(
    artisanId: string
  ): Promise<PersonalAnalytics['comparativeAnalytics']>;

  /**
   * Identify success and failure factors
   */
  identifySuccessFactors(
    artisanId: string
  ): Promise<PersonalAnalytics['successFactors']>;
}

// ============================================================================
// GOVERNMENT API CONNECTOR INTERFACE
// ============================================================================

/**
 * Government API Connector Interface
 * Handles integration with various government portals and APIs
 */
export interface IGovernmentAPIConnector {
  /**
   * Submit application to government portal
   */
  submitToGovernmentPortal(
    schemeId: string,
    applicationData: Record<string, any>
  ): Promise<{
    success: boolean;
    governmentApplicationId?: string;
    confirmationNumber?: string;
    error?: string;
  }>;

  /**
   * Check application status from government portal
   */
  checkApplicationStatus(
    governmentApplicationId: string,
    schemeId: string
  ): Promise<{
    status: string;
    lastUpdated: Date;
    currentStage?: string;
    officerContact?: {
      name: string;
      phone: string;
      email: string;
    };
    nextActions?: string[];
  }>;

  /**
   * Verify document with government database
   */
  verifyDocumentWithGovernment(
    documentType: string,
    documentNumber: string,
    additionalData?: Record<string, any>
  ): Promise<{
    isValid: boolean;
    details?: Record<string, any>;
    error?: string;
  }>;

  /**
   * Get latest scheme data from government APIs
   */
  fetchLatestSchemes(): Promise<GovernmentScheme[]>;

  /**
   * Test API connectivity
   */
  testConnectivity(): Promise<{
    [portalName: string]: {
      status: 'connected' | 'error';
      responseTime?: number;
      error?: string;
    };
  }>;
}