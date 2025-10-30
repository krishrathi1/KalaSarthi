/**
 * Proactive Suggestions Service
 * 
 * Detects opportunities and generates timely recommendations for artisans
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ProactiveSuggestion,
  SuggestionType,
  DetectedOpportunity,
  OpportunityType,
  Milestone,
  MilestoneType,
  TaskReminder,
  TaskType,
  NotificationPriority,
  ReminderSchedule,
} from '@/lib/types/artisan-buddy-notifications';
import { ArtisanContext } from '@/lib/types/artisan-buddy';
import { notificationSystem } from './NotificationSystem';
import { redisClient } from './RedisClient';

export class ProactiveSuggestions {
  private static instance: ProactiveSuggestions;
  private readonly CACHE_TTL = 3600; // 1 hour

  private constructor() {}

  public static getInstance(): ProactiveSuggestions {
    if (!ProactiveSuggestions.instance) {
      ProactiveSuggestions.instance = new ProactiveSuggestions();
    }
    return ProactiveSuggestions.instance;
  }

  /**
   * Detect opportunities from artisan context
   */
  async detectOpportunities(context: ArtisanContext): Promise<DetectedOpportunity[]> {
    try {
      const opportunities: DetectedOpportunity[] = [];

      // Detect low inventory opportunities
      const inventoryOpps = await this.detectInventoryOpportunities(context);
      opportunities.push(...inventoryOpps);

      // Detect pricing opportunities
      const pricingOpps = await this.detectPricingOpportunities(context);
      opportunities.push(...pricingOpps);

      // Detect buyer engagement opportunities
      const buyerOpps = await this.detectBuyerOpportunities(context);
      opportunities.push(...buyerOpps);

      // Detect scheme eligibility opportunities
      const schemeOpps = await this.detectSchemeOpportunities(context);
      opportunities.push(...schemeOpps);

      // Detect market trend opportunities
      const marketOpps = await this.detectMarketOpportunities(context);
      opportunities.push(...marketOpps);

      // Cache opportunities
      const cacheKey = `opportunities:${context.profile.id}`;
      await redisClient.cacheJSON(cacheKey, opportunities, this.CACHE_TTL);

      return opportunities;
    } catch (error) {
      console.error('Error detecting opportunities:', error);
      return [];
    }
  }

  /**
   * Detect inventory-related opportunities
   */
  private async detectInventoryOpportunities(
    context: ArtisanContext
  ): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    try {
      if (!context.inventory) return opportunities;

      // Check for low stock items
      const lowStockProducts = context.products.filter(
        p => p.inventory && p.inventory < 5 && p.status === 'active'
      );

      for (const product of lowStockProducts) {
        opportunities.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'bulk_order',
          title: `Restock ${product.name}`,
          description: `Your ${product.name} is running low (${product.inventory} remaining). Consider restocking to avoid missing sales.`,
          confidence: 0.85,
          potentialValue: product.price * 10, // Estimate 10 units
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          context: {
            dataSource: 'inventory_analysis',
            relatedEntities: [product.id],
          },
        });
      }
    } catch (error) {
      console.error('Error detecting inventory opportunities:', error);
    }

    return opportunities;
  }

  /**
   * Detect pricing-related opportunities
   */
  private async detectPricingOpportunities(
    context: ArtisanContext
  ): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    try {
      if (!context.salesMetrics) return opportunities;

      // Check for products with high demand but low pricing
      const highDemandProducts = context.products.filter(
        p => p.status === 'active' && context.salesMetrics?.topProducts?.includes(p.id)
      );

      for (const product of highDemandProducts) {
        // Suggest price increase if product is selling well
        opportunities.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'price_increase',
          title: `Consider price adjustment for ${product.name}`,
          description: `${product.name} is performing well. Market analysis suggests you could increase the price by 10-15% without affecting demand.`,
          confidence: 0.75,
          potentialValue: product.price * 0.15 * 10, // 15% increase on 10 units
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          context: {
            dataSource: 'sales_analysis',
            relatedEntities: [product.id],
          },
        });
      }
    } catch (error) {
      console.error('Error detecting pricing opportunities:', error);
    }

    return opportunities;
  }

  /**
   * Detect buyer engagement opportunities
   */
  private async detectBuyerOpportunities(
    context: ArtisanContext
  ): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    try {
      if (!context.buyers || context.buyers.length === 0) return opportunities;

      // Check for buyers who haven't been contacted recently
      const inactiveBuyers = context.buyers.filter(
        b => b.lastContactedAt && 
        (Date.now() - new Date(b.lastContactedAt).getTime()) > 30 * 24 * 60 * 60 * 1000
      );

      if (inactiveBuyers.length > 0) {
        opportunities.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'new_buyer',
          title: 'Re-engage with past buyers',
          description: `You have ${inactiveBuyers.length} buyers you haven't contacted in over 30 days. Consider reaching out with new product updates.`,
          confidence: 0.70,
          potentialValue: 5000, // Estimated value
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          context: {
            dataSource: 'buyer_analysis',
            relatedEntities: inactiveBuyers.map(b => b.id),
          },
        });
      }
    } catch (error) {
      console.error('Error detecting buyer opportunities:', error);
    }

    return opportunities;
  }

  /**
   * Detect scheme eligibility opportunities
   */
  private async detectSchemeOpportunities(
    context: ArtisanContext
  ): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    try {
      if (!context.schemes || context.schemes.length === 0) return opportunities;

      // Check for schemes with approaching deadlines
      const urgentSchemes = context.schemes.filter(
        s => s.deadline && 
        (new Date(s.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 &&
        !s.applied
      );

      for (const scheme of urgentSchemes) {
        opportunities.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'scheme_eligibility',
          title: `Apply for ${scheme.name}`,
          description: `The deadline for ${scheme.name} is approaching. You're eligible for benefits up to ₹${scheme.maxBenefit}.`,
          confidence: 0.90,
          potentialValue: scheme.maxBenefit || 0,
          detectedAt: new Date(),
          expiresAt: new Date(scheme.deadline),
          context: {
            dataSource: 'scheme_analysis',
            relatedEntities: [scheme.id],
          },
        });
      }
    } catch (error) {
      console.error('Error detecting scheme opportunities:', error);
    }

    return opportunities;
  }

  /**
   * Detect market trend opportunities
   */
  private async detectMarketOpportunities(
    context: ArtisanContext
  ): Promise<DetectedOpportunity[]> {
    const opportunities: DetectedOpportunity[] = [];

    try {
      // This would integrate with market trend analysis
      // For now, return empty array
      // In production, this would analyze market data and suggest opportunities
    } catch (error) {
      console.error('Error detecting market opportunities:', error);
    }

    return opportunities;
  }

  /**
   * Generate timely recommendations
   */
  async generateRecommendations(context: ArtisanContext): Promise<ProactiveSuggestion[]> {
    try {
      const suggestions: ProactiveSuggestion[] = [];

      // Detect opportunities first
      const opportunities = await this.detectOpportunities(context);

      // Convert opportunities to suggestions
      for (const opp of opportunities) {
        const suggestion = await this.opportunityToSuggestion(opp, context);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      // Add profile completion suggestions
      const profileSuggestions = await this.generateProfileSuggestions(context);
      suggestions.push(...profileSuggestions);

      // Add product improvement suggestions
      const productSuggestions = await this.generateProductSuggestions(context);
      suggestions.push(...productSuggestions);

      // Sort by priority and confidence
      suggestions.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      return suggestions.slice(0, 10); // Return top 10
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Convert opportunity to suggestion
   */
  private async opportunityToSuggestion(
    opportunity: DetectedOpportunity,
    context: ArtisanContext
  ): Promise<ProactiveSuggestion | null> {
    try {
      const suggestionTypeMap: Record<OpportunityType, SuggestionType> = {
        new_buyer: 'buyer_response',
        price_increase: 'product_pricing',
        seasonal_demand: 'seasonal_preparation',
        scheme_eligibility: 'scheme_application',
        market_gap: 'product_creation',
        collaboration: 'skill_development',
        export_opportunity: 'market_opportunity',
        bulk_order: 'inventory_reorder',
      };

      const priorityMap: Record<OpportunityType, NotificationPriority> = {
        new_buyer: 'high',
        price_increase: 'medium',
        seasonal_demand: 'medium',
        scheme_eligibility: 'urgent',
        market_gap: 'medium',
        collaboration: 'low',
        export_opportunity: 'high',
        bulk_order: 'high',
      };

      return {
        id: uuidv4(),
        userId: opportunity.userId,
        type: suggestionTypeMap[opportunity.type],
        title: opportunity.title,
        description: opportunity.description,
        reasoning: `Based on ${opportunity.context.dataSource}, we detected this opportunity with ${Math.round(opportunity.confidence * 100)}% confidence.`,
        confidence: opportunity.confidence,
        priority: priorityMap[opportunity.type],
        metadata: {
          source: 'proactive_suggestions',
          dataPoints: [opportunity.context.dataSource],
          expectedImpact: `Potential value: ₹${opportunity.potentialValue}`,
          estimatedValue: opportunity.potentialValue,
        },
        createdAt: new Date(),
        expiresAt: opportunity.expiresAt,
      };
    } catch (error) {
      console.error('Error converting opportunity to suggestion:', error);
      return null;
    }
  }

  /**
   * Generate profile completion suggestions
   */
  private async generateProfileSuggestions(
    context: ArtisanContext
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    try {
      const profile = context.profile;
      const missingFields: string[] = [];

      if (!profile.bio || profile.bio.length < 50) missingFields.push('bio');
      if (!profile.profileImage) missingFields.push('profile image');
      if (!profile.certifications || profile.certifications.length === 0) missingFields.push('certifications');
      if (!profile.specializations || profile.specializations.length === 0) missingFields.push('specializations');

      if (missingFields.length > 0) {
        const completionPercentage = Math.round(
          ((4 - missingFields.length) / 4) * 100
        );

        suggestions.push({
          id: uuidv4(),
          userId: profile.id,
          type: 'skill_development',
          title: 'Complete Your Profile',
          description: `Your profile is ${completionPercentage}% complete. Add ${missingFields.join(', ')} to attract more buyers.`,
          reasoning: 'Complete profiles receive 3x more buyer inquiries.',
          confidence: 1.0,
          priority: 'medium',
          actionUrl: '/profile/edit',
          actionLabel: 'Complete Profile',
          metadata: {
            source: 'profile_analysis',
            dataPoints: ['profile_completeness'],
            expectedImpact: '3x more buyer inquiries',
          },
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error generating profile suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Generate product improvement suggestions
   */
  private async generateProductSuggestions(
    context: ArtisanContext
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    try {
      // Check for products without images
      const productsWithoutImages = context.products.filter(
        p => !p.images || p.images.length === 0
      );

      if (productsWithoutImages.length > 0) {
        suggestions.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'quality_improvement',
          title: 'Add Product Images',
          description: `${productsWithoutImages.length} products don't have images. Products with images sell 5x better.`,
          reasoning: 'Visual content significantly increases buyer engagement and conversion rates.',
          confidence: 1.0,
          priority: 'high',
          actionUrl: '/products',
          actionLabel: 'Add Images',
          metadata: {
            source: 'product_analysis',
            dataPoints: ['product_images'],
            expectedImpact: '5x better sales',
          },
          createdAt: new Date(),
        });
      }

      // Check for products with incomplete descriptions
      const productsWithShortDesc = context.products.filter(
        p => !p.description || p.description.length < 100
      );

      if (productsWithShortDesc.length > 0) {
        suggestions.push({
          id: uuidv4(),
          userId: context.profile.id,
          type: 'quality_improvement',
          title: 'Improve Product Descriptions',
          description: `${productsWithShortDesc.length} products have short descriptions. Detailed descriptions help buyers make decisions.`,
          reasoning: 'Comprehensive product descriptions increase buyer confidence and reduce inquiries.',
          confidence: 0.90,
          priority: 'medium',
          actionUrl: '/products',
          actionLabel: 'Update Descriptions',
          metadata: {
            source: 'product_analysis',
            dataPoints: ['product_descriptions'],
            expectedImpact: 'Higher conversion rate',
          },
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error generating product suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Create milestone celebrations
   */
  async celebrateMilestone(milestone: Milestone): Promise<void> {
    try {
      if (milestone.celebrated) {
        console.log(`Milestone ${milestone.id} already celebrated`);
        return;
      }

      // Create celebration notification
      await notificationSystem.createNotification({
        userId: milestone.userId,
        type: 'milestone_celebration',
        priority: 'low',
        templateId: 'milestone_celebration',
        variables: {
          artisanName: milestone.metadata.artisanName || 'Artisan',
          milestoneTitle: milestone.title,
          milestoneDescription: milestone.description,
        },
        metadata: {
          milestoneId: milestone.id,
          milestoneType: milestone.type,
        },
      });

      // Mark as celebrated
      milestone.celebrated = true;
      await this.saveMilestone(milestone);

      console.log(`Milestone ${milestone.id} celebrated`);
    } catch (error) {
      console.error('Error celebrating milestone:', error);
    }
  }

  /**
   * Track milestone progress
   */
  async trackMilestoneProgress(
    userId: string,
    type: MilestoneType,
    currentValue: number
  ): Promise<void> {
    try {
      const milestones = await this.getUserMilestones(userId, type);

      for (const milestone of milestones) {
        milestone.currentValue = currentValue;

        // Check if milestone is achieved
        if (currentValue >= milestone.targetValue && !milestone.achievedAt) {
          milestone.achievedAt = new Date();
          await this.celebrateMilestone(milestone);
        }

        await this.saveMilestone(milestone);
      }
    } catch (error) {
      console.error('Error tracking milestone progress:', error);
    }
  }

  /**
   * Add task reminders
   */
  async addTaskReminder(reminder: Omit<TaskReminder, 'id'>): Promise<TaskReminder> {
    try {
      const taskReminder: TaskReminder = {
        id: uuidv4(),
        ...reminder,
      };

      // Calculate next reminder time
      const nextReminder = this.calculateNextReminder(
        taskReminder.dueDate,
        taskReminder.reminderSchedule
      );

      if (nextReminder) {
        taskReminder.reminderSchedule.nextReminderAt = nextReminder;
      }

      // Save reminder
      await this.saveTaskReminder(taskReminder);

      // Schedule notification if due soon
      if (nextReminder && nextReminder.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        await this.scheduleReminderNotification(taskReminder);
      }

      console.log(`Task reminder ${taskReminder.id} created`);
      return taskReminder;
    } catch (error) {
      console.error('Error adding task reminder:', error);
      throw error;
    }
  }

  /**
   * Calculate next reminder time
   */
  private calculateNextReminder(
    dueDate: Date,
    schedule: ReminderSchedule
  ): Date | null {
    const now = new Date();
    const dueTime = dueDate.getTime();

    // Find the next interval that hasn't passed
    for (const interval of schedule.intervals.sort((a, b) => b - a)) {
      const reminderTime = new Date(dueTime - interval * 24 * 60 * 60 * 1000);
      if (reminderTime > now) {
        return reminderTime;
      }
    }

    return null;
  }

  /**
   * Schedule reminder notification
   */
  private async scheduleReminderNotification(reminder: TaskReminder): Promise<void> {
    try {
      const daysRemaining = Math.ceil(
        (reminder.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      await notificationSystem.createNotification({
        userId: reminder.userId,
        type: 'task_reminder',
        priority: reminder.priority,
        templateId: 'task_reminder',
        variables: {
          artisanName: reminder.metadata.artisanName || 'Artisan',
          taskTitle: reminder.title,
          taskDescription: reminder.description,
          daysRemaining: daysRemaining.toString(),
          taskId: reminder.id,
        },
        metadata: {
          taskId: reminder.id,
          taskType: reminder.taskType,
        },
        scheduledFor: reminder.reminderSchedule.nextReminderAt,
      });

      // Update last reminder sent
      reminder.reminderSchedule.lastReminderSent = new Date();
      await this.saveTaskReminder(reminder);
    } catch (error) {
      console.error('Error scheduling reminder notification:', error);
    }
  }

  /**
   * Process due reminders
   */
  async processDueReminders(): Promise<void> {
    try {
      const allReminders = await this.getAllTaskReminders();
      const now = new Date();

      for (const reminder of allReminders) {
        if (reminder.completed) continue;

        const nextReminder = reminder.reminderSchedule.nextReminderAt;
        if (nextReminder && nextReminder <= now) {
          await this.scheduleReminderNotification(reminder);

          // Calculate next reminder
          const next = this.calculateNextReminder(
            reminder.dueDate,
            reminder.reminderSchedule
          );
          reminder.reminderSchedule.nextReminderAt = next || undefined;
          await this.saveTaskReminder(reminder);
        }
      }
    } catch (error) {
      console.error('Error processing due reminders:', error);
    }
  }

  /**
   * Complete task reminder
   */
  async completeTaskReminder(reminderId: string): Promise<void> {
    try {
      const reminder = await this.getTaskReminder(reminderId);
      if (reminder) {
        reminder.completed = true;
        reminder.completedAt = new Date();
        await this.saveTaskReminder(reminder);
        console.log(`Task reminder ${reminderId} completed`);
      }
    } catch (error) {
      console.error('Error completing task reminder:', error);
    }
  }

  // ============================================================================
  // Storage Methods
  // ============================================================================

  /**
   * Save milestone
   */
  private async saveMilestone(milestone: Milestone): Promise<void> {
    try {
      const key = `milestone:${milestone.id}`;
      await redisClient.cacheJSON(key, milestone, 0); // No expiry

      // Also add to user's milestone list
      const userKey = `user_milestones:${milestone.userId}`;
      const milestones = await redisClient.getCachedJSON<Milestone[]>(userKey) || [];
      const index = milestones.findIndex(m => m.id === milestone.id);
      
      if (index >= 0) {
        milestones[index] = milestone;
      } else {
        milestones.push(milestone);
      }

      await redisClient.cacheJSON(userKey, milestones, 0);
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  }

  /**
   * Get user milestones
   */
  private async getUserMilestones(
    userId: string,
    type?: MilestoneType
  ): Promise<Milestone[]> {
    try {
      const key = `user_milestones:${userId}`;
      const milestones = await redisClient.getCachedJSON<Milestone[]>(key) || [];

      if (type) {
        return milestones.filter(m => m.type === type);
      }

      return milestones;
    } catch (error) {
      console.error('Error getting user milestones:', error);
      return [];
    }
  }

  /**
   * Save task reminder
   */
  private async saveTaskReminder(reminder: TaskReminder): Promise<void> {
    try {
      const key = `task_reminder:${reminder.id}`;
      await redisClient.cacheJSON(key, reminder, 0); // No expiry

      // Also add to user's reminder list
      const userKey = `user_reminders:${reminder.userId}`;
      const reminders = await redisClient.getCachedJSON<TaskReminder[]>(userKey) || [];
      const index = reminders.findIndex(r => r.id === reminder.id);
      
      if (index >= 0) {
        reminders[index] = reminder;
      } else {
        reminders.push(reminder);
      }

      await redisClient.cacheJSON(userKey, reminders, 0);
    } catch (error) {
      console.error('Error saving task reminder:', error);
    }
  }

  /**
   * Get task reminder
   */
  private async getTaskReminder(reminderId: string): Promise<TaskReminder | null> {
    try {
      const key = `task_reminder:${reminderId}`;
      return await redisClient.getCachedJSON<TaskReminder>(key);
    } catch (error) {
      console.error('Error getting task reminder:', error);
      return null;
    }
  }

  /**
   * Get all task reminders
   */
  private async getAllTaskReminders(): Promise<TaskReminder[]> {
    try {
      // In production, this would query all users' reminders
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting all task reminders:', error);
      return [];
    }
  }

  /**
   * Get user task reminders
   */
  async getUserTaskReminders(
    userId: string,
    includeCompleted: boolean = false
  ): Promise<TaskReminder[]> {
    try {
      const key = `user_reminders:${userId}`;
      const reminders = await redisClient.getCachedJSON<TaskReminder[]>(key) || [];

      if (includeCompleted) {
        return reminders;
      }

      return reminders.filter(r => !r.completed);
    } catch (error) {
      console.error('Error getting user task reminders:', error);
      return [];
    }
  }

  /**
   * Get user suggestions
   */
  async getUserSuggestions(userId: string): Promise<ProactiveSuggestion[]> {
    try {
      const key = `user_suggestions:${userId}`;
      const suggestions = await redisClient.getCachedJSON<ProactiveSuggestion[]>(key) || [];
      
      // Filter out expired and dismissed suggestions
      const now = new Date();
      return suggestions.filter(
        s => !s.dismissed && (!s.expiresAt || s.expiresAt > now)
      );
    } catch (error) {
      console.error('Error getting user suggestions:', error);
      return [];
    }
  }

  /**
   * Dismiss suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    try {
      // This would update the suggestion in storage
      console.log(`Suggestion ${suggestionId} dismissed`);
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  }

  /**
   * Mark suggestion as acted upon
   */
  async actOnSuggestion(suggestionId: string): Promise<void> {
    try {
      // This would update the suggestion in storage
      console.log(`Suggestion ${suggestionId} acted upon`);
    } catch (error) {
      console.error('Error acting on suggestion:', error);
    }
  }
}

export const proactiveSuggestions = ProactiveSuggestions.getInstance();
