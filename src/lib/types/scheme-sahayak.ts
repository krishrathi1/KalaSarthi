/**
 * Core TypeScript interfaces for AI-Powered Scheme Sahayak v2.0
 * Based on the design document specifications
 */

// ============================================================================
// CORE DATA MODELS
// ============================================================================

/**
 * Comprehensive artisan profile containing business, personal, and preference data
 */
export interface ArtisanProfile {
  id: string;
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    aadhaarHash: string; // Hashed for privacy
    panNumber?: string;
    dateOfBirth: Date;
  };
  location: {
    state: string;
    district: string;
    pincode: string;
    address: string;
    coordinates?: [number, number]; // [latitude, longitude]
  };
  business: {
    type: string;
    category: string;
    subCategory: string;
    registrationNumber?: string;
    establishmentYear: number;
    employeeCount: number;
    monthlyIncome: number;
    experienceYears: number;
  };
  preferences: {
    language: string;
    notificationChannels: string[];
    timeHorizon: 'short_term' | 'medium_term' | 'long_term';
    riskTolerance: 'low' | 'medium' | 'high';
    interestedCategories: string[];
  };
  documents: Record<string, DocumentInfo>;
  applicationHistory: ApplicationSummary[];
  aiProfile: {
    features: Record<string, number>;
    successProbability: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Government scheme data structure with comprehensive metadata
 */
export interface GovernmentScheme {
  id: string;
  title: string;
  description: string;
  category: 'loan' | 'grant' | 'subsidy' | 'training' | 'insurance';
  subCategory: string;
  provider: {
    name: string;
    department: string;
    level: 'central' | 'state' | 'district' | 'local';
    website: string;
    contactInfo: ContactInfo;
  };
  eligibility: {
    age: { min?: number; max?: number };
    income: { min?: number; max?: number };
    businessType: string[];
    location: {
      states?: string[];
      districts?: string[];
      pincodes?: string[];
    };
    otherCriteria: string[];
  };
  benefits: {
    amount: { min: number; max: number; currency: string };
    type: 'loan' | 'grant' | 'subsidy' | 'training' | 'insurance';
    paymentPeriod?: number;
    interestRate?: number;
    coverageDetails: string;
  };
  application: {
    onlineApplication: boolean;
    requiredDocuments: string[];
    applicationSteps: ApplicationStep[];
    processingTime: { min: number; max: number }; // days
    deadline?: Date;
    website?: string;
  };
  metadata: {
    popularity: number;
    successRate: number;
    averageProcessingTime: number;
    aiFeatures: Record<string, number>;
    lastUpdated: Date;
  };
  status: 'active' | 'inactive' | 'suspended' | 'closed';
}

/**
 * Document information and metadata
 */
export interface DocumentInfo {
  id: string;
  type: string;
  filename: string;
  uploadDate: Date;
  status: 'uploaded' | 'processing' | 'verified' | 'rejected' | 'expired' | 'needs_review';
  verificationResult?: DocumentVerificationResult;
  expiryDate?: Date;
  extractedData?: Record<string, any>;
  qualityScore?: number;
}

/**
 * Application summary for tracking history
 */
export interface ApplicationSummary {
  id: string;
  schemeId: string;
  schemeName: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  submittedAt: Date;
  lastUpdated: Date;
  outcome?: 'approved' | 'rejected';
  rejectionReason?: string;
  approvedAmount?: number;
}

/**
 * Contact information structure
 */
export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  helplineNumber?: string;
}

/**
 * Application step definition
 */
export interface ApplicationStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  estimatedTime: number; // minutes
  documents?: string[];
  instructions?: string[];
}

// ============================================================================
// AI RECOMMENDATION SYSTEM
// ============================================================================

/**
 * AI-powered scheme recommendation with detailed scoring
 */
export interface AISchemeRecommendation {
  id: string;
  scheme: GovernmentScheme;
  aiScore: number; // 0-100
  eligibilityMatch: number; // 0-100
  benefitPotential: number; // 0-100
  urgencyScore: number; // 0-10
  personalizedReason: string;
  actionPlan: {
    immediateActions: string[];
    documentPreparation: string[];
    timelineEstimate: string;
  };
  riskFactors: string[];
  alternativeSchemes: string[];
  confidenceInterval: [number, number]; // 0-1
  successProbability: number;
  lastUpdated: Date;
}

/**
 * Success prediction with detailed analysis
 */
export interface SuccessPrediction {
  probability: number; // 0-1
  confidenceInterval: [number, number];
  factors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  improvementSuggestions: string[];
  benchmarkComparison: {
    similarArtisans: number;
    averageSuccessRate: number;
    yourPosition: 'below_average' | 'average' | 'above_average';
  };
}

/**
 * Recommendation explanation for transparency
 */
export interface RecommendationExplanation {
  recommendationId: string;
  primaryFactors: string[];
  secondaryFactors: string[];
  dataPoints: Record<string, any>;
  modelVersion: string;
  confidence: number;
  alternatives: string[];
}

/**
 * User feedback for model improvement
 */
export interface UserFeedback {
  recommendationId: string;
  rating: number; // 1-5
  helpful: boolean;
  applied: boolean;
  outcome?: 'approved' | 'rejected' | 'pending';
  comments?: string;
  timestamp: Date;
}

/**
 * Recommendation options for customization
 */
export interface RecommendationOptions {
  maxResults?: number;
  categories?: string[];
  urgencyFilter?: 'low' | 'medium' | 'high';
  includeAlternatives?: boolean;
  explainRecommendations?: boolean;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * Document upload result with processing details
 */
export interface DocumentUploadResult {
  documentId: string;
  extractedText: string;
  detectedType: string;
  confidence: number;
  qualityScore: number;
  issues: DocumentIssue[];
  processingTime: number;
  suggestions?: string[];
  expiryDate?: Date;
  extractedData?: Record<string, any>;
}

/**
 * Document verification result
 */
export interface DocumentVerificationResult {
  isValid: boolean;
  verificationMethod: 'government_api' | 'ocr_validation' | 'manual_review';
  confidence: number;
  verificationDetails: {
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    documentNumber: string;
  };
  status: 'valid' | 'invalid' | 'expired' | 'pending';
  recommendations: string[];
}

/**
 * Document status summary
 */
export interface DocumentStatusSummary {
  totalDocuments: number;
  verified: number;
  pending: number;
  expired: number;
  missing: number;
  overallCompleteness: number; // 0-100
  documentsByType: Record<string, DocumentStatus>;
  nextActions: string[];
}

/**
 * Document status by type
 */
export interface DocumentStatus {
  type: string;
  required: boolean;
  status: 'missing' | 'uploaded' | 'verified' | 'expired';
  lastUpdated?: Date;
  expiryDate?: Date;
}

/**
 * Document issue identification
 */
export interface DocumentIssue {
  type: 'quality' | 'format' | 'content' | 'expiry' | 'size' | 'orientation' | 'authenticity' | 'completeness';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

/**
 * Missing document report
 */
export interface MissingDocumentReport {
  artisanId: string;
  schemes: string[];
  missingDocuments: {
    documentType: string;
    requiredFor: string[];
    priority: 'high' | 'medium' | 'low';
    description: string;
    whereToObtain: string;
  }[];
  completionPercentage: number;
  estimatedTimeToComplete: number; // days
}

// ============================================================================
// APPLICATION TRACKING
// ============================================================================

/**
 * Scheme application data structure
 */
export interface SchemeApplication {
  id: string;
  artisanId: string;
  schemeId: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  formData: Record<string, any>;
  submittedDocuments: string[];
  submittedAt?: Date;
  lastUpdated: Date;
  governmentApplicationId?: string;
  officerAssigned?: string;
  estimatedDecisionDate?: Date;
  notes?: string[];
}

/**
 * Application submission result
 */
export interface ApplicationSubmissionResult {
  applicationId: string;
  governmentApplicationId?: string;
  status: 'submitted' | 'failed' | 'pending';
  submissionMethod: 'api' | 'web_scraping' | 'manual';
  confirmationNumber?: string;
  estimatedProcessingTime: number; // days
  nextSteps: string[];
  errors?: string[];
}

/**
 * Application status with detailed tracking
 */
export interface ApplicationStatus {
  id: string;
  applicationId: string;
  schemeId: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'on_hold';
  currentStage: string;
  progress: number; // 0-100
  estimatedCompletion: Date;
  lastUpdated: Date;
  officerContact?: {
    name: string;
    phone: string;
    email: string;
  };
  nextActions: string[];
  documents: {
    required: string[];
    submitted: string[];
    pending: string[];
  };
}

/**
 * Application timeline with stages
 */
export interface ApplicationTimeline {
  stages: ApplicationStage[];
  currentStageIndex: number;
  estimatedDuration: number; // days
  actualDuration?: number; // days
}

/**
 * Individual application stage
 */
export interface ApplicationStage {
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  startDate?: Date;
  completionDate?: Date;
  estimatedDuration: number;
  requirements: string[];
  notes?: string;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  success: boolean;
  applicationsUpdated: number;
  errors: string[];
  lastSyncTime: Date;
  nextSyncTime: Date;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Smart notification with intelligent routing
 */
export interface SmartNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_scheme' | 'deadline_reminder' | 'status_update' | 'document_required' | 'rejection';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  personalizedContent: boolean;
  actionUrl?: string;
  metadata: Record<string, any>;
  customization: Record<string, any>;
}

/**
 * Notification delivery channel configuration
 */
export interface NotificationChannel {
  type: 'sms' | 'email' | 'push' | 'whatsapp';
  fallbackDelay: number;
  retryAttempts: number;
  fallbackToManual: boolean;
  userNotification: boolean;
}

/**
 * Notification delivery result
 */
export interface NotificationResult {
  notificationId: string;
  deliveryResults: ChannelDeliveryResult[];
  overallSuccess: boolean;
  userEngagement?: {
    opened: boolean;
    clicked: boolean;
    actionTaken: boolean;
  };
}

/**
 * Channel-specific delivery result
 */
export interface ChannelDeliveryResult {
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  success: boolean;
  deliveredAt?: Date;
  error?: string;
  messageId?: string;
  cost?: number;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  channels: {
    sms: boolean;
    email: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  timing: {
    preferredHours: [number, number]; // [start, end] in 24h format
    timezone: string;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  types: {
    newSchemes: boolean;
    deadlineReminders: boolean;
    statusUpdates: boolean;
    documentRequests: boolean;
    rejectionNotices: boolean;
  };
}

/**
 * Language and accessibility settings
 */
export interface LanguageAccessibilitySettings {
  language: {
    primary: string; // ISO 639-1 code (e.g., 'hi', 'en', 'ta')
    secondary?: string;
    autoDetect: boolean;
    rtlSupport: boolean;
  };
  accessibility: {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
    keyboardNavigation: boolean;
    voiceAssistance: boolean;
    reducedMotion: boolean;
    colorBlindSupport: boolean;
  };
  contentPreferences: {
    simplifiedLanguage: boolean; // For low digital literacy
    audioContent: boolean;
    visualAids: boolean;
    stepByStepGuidance: boolean;
  };
}

/**
 * Privacy controls and consent management
 */
export interface PrivacySettings {
  dataCollection: {
    analytics: boolean;
    personalizedRecommendations: boolean;
    locationTracking: boolean;
    behaviorTracking: boolean;
    thirdPartySharing: boolean;
  };
  dataRetention: {
    profileData: '1y' | '3y' | '5y' | '7y' | '10y';
    applicationHistory: '3y' | '5y' | '7y' | '10y';
    documents: '1y' | '3y' | '5y' | '7y';
    communicationLogs: '6m' | '1y' | '2y';
  };
  consent: {
    termsAccepted: boolean;
    privacyPolicyAccepted: boolean;
    marketingConsent: boolean;
    dataProcessingConsent: boolean;
    thirdPartyConsent: boolean;
    consentDate: Date;
    consentVersion: string;
  };
  visibility: {
    profileVisibility: 'private' | 'limited' | 'public';
    shareSuccessStories: boolean;
    allowContactFromOfficers: boolean;
    showInAnalytics: boolean;
  };
}

/**
 * Comprehensive user settings combining all preferences
 */
export interface UserSettings {
  id: string;
  artisanId: string;
  notifications: NotificationPreferences;
  languageAccessibility: LanguageAccessibilitySettings;
  privacy: PrivacySettings;
  createdAt: Date;
  updatedAt: Date;
  version: string; // For settings migration
}

/**
 * Notification analytics
 */
export interface NotificationAnalytics {
  userId: string;
  period: { start: Date; end: Date };
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  engagementRate: number;
  channelPerformance: Record<string, {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  optimalTiming: {
    hour: number;
    dayOfWeek: number;
    confidence: number;
  };
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * Firestore collection names
 */
export const SCHEME_SAHAYAK_COLLECTIONS = {
  ARTISANS: 'artisans',
  SCHEMES: 'schemes',
  APPLICATIONS: 'applications',
  RECOMMENDATIONS: 'recommendations',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  ML_FEATURES: 'ml_features',
  FEEDBACK: 'feedback',
  USER_PREFERENCES: 'user_preferences',
  USER_SETTINGS: 'user_settings',
  SYNC_STATUS: 'sync_status',
  PRIVACY_SETTINGS: 'privacy_settings',
  DATA_DELETION_REQUESTS: 'data_deletion_requests',
  CONSENT_AUDIT_LOG: 'consent_audit_log'
} as const;

/**
 * Error types for the system
 */
export enum SchemeSahayakErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  ML_MODEL_ERROR = 'ML_MODEL_ERROR',
  DOCUMENT_PROCESSING_ERROR = 'DOCUMENT_PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * System error response
 */
export interface SchemeSahayakErrorResponse {
  error: {
    type: SchemeSahayakErrorType;
    code: string;
    message: string; // User-friendly message
    details?: any;
    timestamp: Date;
    requestId: string;
    suggestedActions: string[];
  };
}

/**
 * API response wrapper
 */
export interface SchemeSahayakApiResponse<T> {
  success: boolean;
  data?: T;
  error?: SchemeSahayakErrorResponse['error'];
  metadata?: {
    requestId: string;
    timestamp: Date;
    processingTime: number;
    version: string;
  };
}

// ============================================================================
// ANALYTICS AND INSIGHTS
// ============================================================================

/**
 * Personal analytics dashboard data
 */
export interface PersonalAnalytics {
  artisanId: string;
  period: { start: Date; end: Date };
  applicationSuccessRate: number; // 0-100
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageProcessingTime: number; // days
  topCategories: Array<{
    category: string;
    count: number;
    successRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    applications: number;
    approvals: number;
    rejections: number;
    successRate: number;
  }>;
  comparativeAnalytics: ComparativeAnalytics;
  successFactors: SuccessFactors;
  lastUpdated: Date;
}

/**
 * Comparative analytics with similar profiles
 */
export interface ComparativeAnalytics {
  similarArtisansCount: number;
  yourSuccessRate: number;
  averageSuccessRate: number;
  position: 'below_average' | 'average' | 'above_average' | 'top_performer';
  percentile: number; // 0-100
  comparison: {
    applications: {
      yours: number;
      average: number;
      top10Percent: number;
    };
    processingTime: {
      yours: number;
      average: number;
      best: number;
    };
    approvalRate: {
      yours: number;
      average: number;
      top10Percent: number;
    };
  };
  similarProfiles: Array<{
    businessType: string;
    location: string;
    experienceRange: string;
    averageSuccessRate: number;
    sampleSize: number;
  }>;
}

/**
 * Success and failure factor identification
 */
export interface SuccessFactors {
  positiveFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    frequency: number;
    correlationScore: number; // 0-1
  }>;
  negativeFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    frequency: number;
    correlationScore: number; // 0-1
  }>;
  neutralFactors: Array<{
    factor: string;
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Improvement recommendations
 */
export interface ImprovementRecommendations {
  artisanId: string;
  generatedAt: Date;
  period: 'monthly' | 'quarterly' | 'yearly';
  overallScore: number; // 0-100
  recommendations: Array<{
    id: string;
    category: 'documentation' | 'profile' | 'timing' | 'scheme_selection' | 'application_quality';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    actionSteps: string[];
    estimatedTimeToImplement: number; // days
    potentialSuccessRateIncrease: number; // percentage points
  }>;
  quickWins: string[]; // Easy improvements with high impact
  longTermGoals: string[];
}

/**
 * Future scheme opportunity prediction
 */
export interface SchemeOpportunityPrediction {
  artisanId: string;
  predictedOpportunities: Array<{
    schemeId: string;
    schemeName: string;
    category: string;
    predictedAvailability: Date;
    eligibilityProbability: number; // 0-1
    successProbability: number; // 0-1
    estimatedBenefit: {
      min: number;
      max: number;
      currency: string;
    };
    preparationRequired: string[];
    timeToPrep: number; // days
    confidence: number; // 0-1
    reasoning: string;
  }>;
  upcomingDeadlines: Array<{
    schemeId: string;
    schemeName: string;
    deadline: Date;
    daysRemaining: number;
    readinessScore: number; // 0-100
    missingRequirements: string[];
  }>;
  seasonalTrends: Array<{
    month: string;
    typicalSchemeCount: number;
    categories: string[];
    historicalSuccessRate: number;
  }>;
}

/**
 * Business growth pattern analysis
 */
export interface BusinessGrowthAnalysis {
  artisanId: string;
  analysisDate: Date;
  growthMetrics: {
    revenueGrowth: {
      current: number;
      previous: number;
      percentageChange: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    employeeGrowth: {
      current: number;
      previous: number;
      percentageChange: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    schemeUtilization: {
      schemesApplied: number;
      schemesApproved: number;
      totalBenefitsReceived: number;
      utilizationRate: number; // 0-100
    };
  };
  patterns: Array<{
    pattern: string;
    description: string;
    confidence: number; // 0-1
    implications: string[];
  }>;
  projections: {
    nextQuarter: {
      expectedRevenue: { min: number; max: number };
      recommendedSchemes: string[];
      growthOpportunities: string[];
    };
    nextYear: {
      expectedRevenue: { min: number; max: number };
      milestones: string[];
      strategicRecommendations: string[];
    };
  };
  benchmarking: {
    industryAverage: number;
    yourPosition: 'below_average' | 'average' | 'above_average';
    topPerformers: number;
    gapAnalysis: string[];
  };
}