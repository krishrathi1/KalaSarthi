/**
 * Artisan Buddy Notification System - Type Definitions
 * 
 * Types for proactive notifications and suggestions
 */

// ============================================================================
// Notification Types
// ============================================================================

export interface ArtisanNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata: NotificationMetadata;
  channels: NotificationChannel[];
  status: NotificationStatus;
  createdAt: Date;
  scheduledFor?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export type NotificationType =
  | 'buyer_inquiry'
  | 'scheme_deadline'
  | 'market_trend'
  | 'task_reminder'
  | 'milestone_celebration'
  | 'low_inventory'
  | 'sales_achievement'
  | 'profile_incomplete'
  | 'product_suggestion'
  | 'buyer_connection'
  | 'skill_certification';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface NotificationMetadata {
  source: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  aiGenerated?: boolean;
  confidence?: number;
  tags?: string[];
  [key: string]: any;
}

export interface NotificationChannel {
  type: ChannelType;
  enabled: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  errorMessage?: string;
}

export type ChannelType = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  userId: string;
  channels: ChannelPreferences;
  types: TypePreferences;
  timing: TimingPreferences;
  frequency: FrequencyPreferences;
  updatedAt: Date;
}

export interface ChannelPreferences {
  in_app: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface TypePreferences {
  buyer_inquiry: boolean;
  scheme_deadline: boolean;
  market_trend: boolean;
  task_reminder: boolean;
  milestone_celebration: boolean;
  low_inventory: boolean;
  sales_achievement: boolean;
  profile_incomplete: boolean;
  product_suggestion: boolean;
  buyer_connection: boolean;
  skill_certification: boolean;
}

export interface TimingPreferences {
  quietHoursStart?: number; // 0-23
  quietHoursEnd?: number; // 0-23
  timezone: string;
  preferredDays?: number[]; // 0-6 (Sunday-Saturday)
}

export interface FrequencyPreferences {
  maxPerDay: number;
  maxPerWeek: number;
  consolidate: boolean;
  batchDelay: number; // minutes
}

// ============================================================================
// Notification Templates
// ============================================================================

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  actionUrlTemplate?: string;
  actionLabelTemplate?: string;
  defaultChannels: ChannelType[];
  variables: string[];
  language: string;
}

// ============================================================================
// Notification Queue
// ============================================================================

export interface NotificationQueueItem {
  notification: ArtisanNotification;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  addedAt: Date;
}

// ============================================================================
// Proactive Suggestions
// ============================================================================

export interface ProactiveSuggestion {
  id: string;
  userId: string;
  type: SuggestionType;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  priority: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata: SuggestionMetadata;
  createdAt: Date;
  expiresAt?: Date;
  dismissed?: boolean;
  acted?: boolean;
}

export type SuggestionType =
  | 'product_pricing'
  | 'inventory_reorder'
  | 'buyer_response'
  | 'scheme_application'
  | 'product_creation'
  | 'skill_development'
  | 'market_opportunity'
  | 'seasonal_preparation'
  | 'cost_optimization'
  | 'quality_improvement';

export interface SuggestionMetadata {
  source: string;
  dataPoints: string[];
  expectedImpact?: string;
  estimatedValue?: number;
  timeframe?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  [key: string]: any;
}

// ============================================================================
// Opportunity Detection
// ============================================================================

export interface DetectedOpportunity {
  id: string;
  userId: string;
  type: OpportunityType;
  title: string;
  description: string;
  confidence: number;
  potentialValue: number;
  detectedAt: Date;
  expiresAt?: Date;
  context: OpportunityContext;
}

export type OpportunityType =
  | 'new_buyer'
  | 'price_increase'
  | 'seasonal_demand'
  | 'scheme_eligibility'
  | 'market_gap'
  | 'collaboration'
  | 'export_opportunity'
  | 'bulk_order';

export interface OpportunityContext {
  dataSource: string;
  relatedEntities: string[];
  marketConditions?: Record<string, any>;
  competitorAnalysis?: Record<string, any>;
  historicalData?: Record<string, any>;
}

// ============================================================================
// Milestone Tracking
// ============================================================================

export interface Milestone {
  id: string;
  userId: string;
  type: MilestoneType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  achievedAt?: Date;
  celebrated: boolean;
  metadata: Record<string, any>;
}

export type MilestoneType =
  | 'sales_revenue'
  | 'product_count'
  | 'buyer_connections'
  | 'positive_reviews'
  | 'scheme_approvals'
  | 'skill_certifications'
  | 'platform_tenure'
  | 'order_fulfillment';

// ============================================================================
// Task Reminders
// ============================================================================

export interface TaskReminder {
  id: string;
  userId: string;
  taskType: TaskType;
  title: string;
  description: string;
  dueDate: Date;
  priority: NotificationPriority;
  completed: boolean;
  completedAt?: Date;
  reminderSchedule: ReminderSchedule;
  metadata: Record<string, any>;
}

export type TaskType =
  | 'complete_profile'
  | 'upload_product_images'
  | 'respond_to_buyer'
  | 'submit_documents'
  | 'update_inventory'
  | 'renew_certification'
  | 'review_pricing'
  | 'check_orders';

export interface ReminderSchedule {
  intervals: number[]; // days before due date
  lastReminderSent?: Date;
  nextReminderAt?: Date;
}

// ============================================================================
// Notification Analytics
// ============================================================================

export interface NotificationAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month';
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalActioned: number;
  deliveryRate: number;
  readRate: number;
  actionRate: number;
  byType: Record<NotificationType, TypeAnalytics>;
  byChannel: Record<ChannelType, ChannelAnalytics>;
  optimalTiming: OptimalTiming;
}

export interface TypeAnalytics {
  sent: number;
  delivered: number;
  read: number;
  actioned: number;
  averageTimeToRead: number; // minutes
  averageTimeToAction: number; // minutes
}

export interface ChannelAnalytics {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  averageDeliveryTime: number; // seconds
}

export interface OptimalTiming {
  bestHours: number[];
  bestDays: number[];
  averageEngagementTime: number; // hour of day
}

// ============================================================================
// Notification Triggers
// ============================================================================

export interface NotificationTrigger {
  id: string;
  type: TriggerType;
  condition: TriggerCondition;
  notificationTemplate: NotificationTemplate;
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
}

export type TriggerType =
  | 'event_based'
  | 'time_based'
  | 'threshold_based'
  | 'pattern_based';

export interface TriggerCondition {
  eventType?: string;
  schedule?: string; // cron expression
  threshold?: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  };
  pattern?: {
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    duration: number; // days
  };
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'updatedAt'> = {
  channels: {
    in_app: true,
    push: true,
    email: true,
    sms: false,
    whatsapp: false,
  },
  types: {
    buyer_inquiry: true,
    scheme_deadline: true,
    market_trend: true,
    task_reminder: true,
    milestone_celebration: true,
    low_inventory: true,
    sales_achievement: true,
    profile_incomplete: true,
    product_suggestion: true,
    buyer_connection: true,
    skill_certification: true,
  },
  timing: {
    quietHoursStart: 22,
    quietHoursEnd: 8,
    timezone: 'Asia/Kolkata',
    preferredDays: [1, 2, 3, 4, 5], // Monday-Friday
  },
  frequency: {
    maxPerDay: 10,
    maxPerWeek: 50,
    consolidate: true,
    batchDelay: 30, // 30 minutes
  },
};

export const NOTIFICATION_EXPIRY_DAYS: Record<NotificationType, number> = {
  buyer_inquiry: 7,
  scheme_deadline: 1,
  market_trend: 14,
  task_reminder: 30,
  milestone_celebration: 30,
  low_inventory: 7,
  sales_achievement: 30,
  profile_incomplete: 90,
  product_suggestion: 30,
  buyer_connection: 14,
  skill_certification: 60,
};

export const PRIORITY_CHANNELS: Record<NotificationPriority, ChannelType[]> = {
  low: ['in_app'],
  medium: ['in_app', 'push'],
  high: ['in_app', 'push', 'email'],
  urgent: ['in_app', 'push', 'email', 'sms'],
};
