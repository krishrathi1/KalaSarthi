/**
 * Notification Triggers Service
 * 
 * Manages notification triggers and conditions
 */

import {
  NotificationTrigger,
  TriggerType,
  TriggerCondition,
  NotificationTemplate,
} from '@/lib/types/artisan-buddy-notifications';
import { redisClient } from './RedisClient';

export class NotificationTriggers {
  private static instance: NotificationTriggers;
  private readonly TRIGGERS_KEY = 'artisan_buddy:notification_triggers';

  private constructor() {}

  public static getInstance(): NotificationTriggers {
    if (!NotificationTriggers.instance) {
      NotificationTriggers.instance = new NotificationTriggers();
    }
    return NotificationTriggers.instance;
  }

  /**
   * Register a new trigger
   */
  async registerTrigger(trigger: NotificationTrigger): Promise<void> {
    try {
      const triggers = await this.getAllTriggers();
      triggers.push(trigger);
      await redisClient.cacheJSON(this.TRIGGERS_KEY, triggers, 0); // No expiry
      console.log(`Trigger ${trigger.id} registered`);
    } catch (error) {
      console.error('Error registering trigger:', error);
      throw error;
    }
  }

  /**
   * Get all triggers
   */
  async getAllTriggers(): Promise<NotificationTrigger[]> {
    try {
      const triggers = await redisClient.getCachedJSON<NotificationTrigger[]>(
        this.TRIGGERS_KEY
      );
      return triggers || [];
    } catch (error) {
      console.error('Error getting triggers:', error);
      return [];
    }
  }

  /**
   * Get triggers by type
   */
  async getTriggersByType(type: TriggerType): Promise<NotificationTrigger[]> {
    try {
      const triggers = await this.getAllTriggers();
      return triggers.filter(t => t.type === type && t.enabled);
    } catch (error) {
      console.error('Error getting triggers by type:', error);
      return [];
    }
  }

  /**
   * Check if trigger should fire
   */
  async shouldTrigger(
    trigger: NotificationTrigger,
    context: Record<string, any>
  ): Promise<boolean> {
    try {
      // Check if trigger is enabled
      if (!trigger.enabled) return false;

      // Check cooldown period
      if (trigger.lastTriggered) {
        const cooldownMs = trigger.cooldownPeriod * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - trigger.lastTriggered.getTime();
        if (timeSinceLastTrigger < cooldownMs) {
          return false;
        }
      }

      // Check condition based on trigger type
      return await this.evaluateCondition(trigger.condition, context);
    } catch (error) {
      console.error('Error checking trigger:', error);
      return false;
    }
  }

  /**
   * Evaluate trigger condition
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    context: Record<string, any>
  ): Promise<boolean> {
    try {
      // Event-based trigger
      if (condition.eventType) {
        return context.eventType === condition.eventType;
      }

      // Threshold-based trigger
      if (condition.threshold) {
        const { metric, operator, value } = condition.threshold;
        const metricValue = context[metric];

        if (metricValue === undefined) return false;

        switch (operator) {
          case 'gt': return metricValue > value;
          case 'lt': return metricValue < value;
          case 'eq': return metricValue === value;
          case 'gte': return metricValue >= value;
          case 'lte': return metricValue <= value;
          default: return false;
        }
      }

      // Pattern-based trigger
      if (condition.pattern) {
        const { metric, trend, duration } = condition.pattern;
        const historicalData = context[`${metric}_history`] as number[];

        if (!historicalData || historicalData.length < 2) return false;

        return this.detectTrend(historicalData, trend, duration);
      }

      return false;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Detect trend in historical data
   */
  private detectTrend(
    data: number[],
    expectedTrend: 'increasing' | 'decreasing' | 'stable',
    duration: number
  ): boolean {
    if (data.length < duration) return false;

    const recentData = data.slice(-duration);
    const first = recentData[0];
    const last = recentData[recentData.length - 1];
    const change = ((last - first) / first) * 100;

    switch (expectedTrend) {
      case 'increasing':
        return change > 5; // 5% increase
      case 'decreasing':
        return change < -5; // 5% decrease
      case 'stable':
        return Math.abs(change) <= 5; // Within 5%
      default:
        return false;
    }
  }

  /**
   * Update trigger last triggered time
   */
  async updateLastTriggered(triggerId: string): Promise<void> {
    try {
      const triggers = await this.getAllTriggers();
      const trigger = triggers.find(t => t.id === triggerId);

      if (trigger) {
        trigger.lastTriggered = new Date();
        await redisClient.cacheJSON(this.TRIGGERS_KEY, triggers, 0);
      }
    } catch (error) {
      console.error('Error updating last triggered:', error);
    }
  }

  /**
   * Enable/disable trigger
   */
  async setTriggerEnabled(triggerId: string, enabled: boolean): Promise<void> {
    try {
      const triggers = await this.getAllTriggers();
      const trigger = triggers.find(t => t.id === triggerId);

      if (trigger) {
        trigger.enabled = enabled;
        await redisClient.cacheJSON(this.TRIGGERS_KEY, triggers, 0);
        console.log(`Trigger ${triggerId} ${enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error setting trigger enabled:', error);
      throw error;
    }
  }

  /**
   * Delete trigger
   */
  async deleteTrigger(triggerId: string): Promise<void> {
    try {
      const triggers = await this.getAllTriggers();
      const filtered = triggers.filter(t => t.id !== triggerId);
      await redisClient.cacheJSON(this.TRIGGERS_KEY, filtered, 0);
      console.log(`Trigger ${triggerId} deleted`);
    } catch (error) {
      console.error('Error deleting trigger:', error);
      throw error;
    }
  }
}

export const notificationTriggers = NotificationTriggers.getInstance();
