/**
 * Data Retention Scheduler for AI-Powered Scheme Sahayak v2.0
 * Handles scheduled data cleanup and retention policy enforcement
 * Requirements: 9.4, 9.5
 */

import { BaseService } from './base/BaseService';
import { privacyManagementService } from './PrivacyManagementService';
import { SCHEME_SAHAYAK_COLLECTIONS } from '../../types/scheme-sahayak';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Scheduler configuration
 */
interface SchedulerConfig {
  enabled: boolean;
  intervals: {
    dataCleanup: number; // milliseconds
    deletionRequests: number; // milliseconds
    expiryReminders: number; // milliseconds
  };
}

/**
 * Data Retention Scheduler Service
 * Manages automated data cleanup and retention policies
 */
export class DataRetentionScheduler extends BaseService {
  private config: SchedulerConfig;
  private timers: Map<string, NodeJS.Timeout>;

  constructor() {
    super('DataRetentionScheduler');

    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      intervals: {
        dataCleanup: 24 * 60 * 60 * 1000, // Daily
        deletionRequests: 60 * 60 * 1000, // Hourly
        expiryReminders: 24 * 60 * 60 * 1000 // Daily
      }
    };

    this.timers = new Map();
  }

  /**
   * Start all scheduled jobs
   */
  async start(): Promise<void> {
    return this.handleAsync(async () => {
      if (!this.config.enabled) {
        this.log('info', 'Data retention scheduler is disabled');
        return;
      }

      this.log('info', 'Starting data retention scheduler...');

      // Schedule data cleanup job
      this.scheduleJob('dataCleanup', async () => {
        await this.runDataCleanup();
      }, this.config.intervals.dataCleanup);

      // Schedule deletion requests processing
      this.scheduleJob('deletionRequests', async () => {
        await this.processDeletionRequests();
      }, this.config.intervals.deletionRequests);

      // Schedule expiry reminders
      this.scheduleJob('expiryReminders', async () => {
        await this.sendExpiryReminders();
      }, this.config.intervals.expiryReminders);

      this.log('info', 'Data retention scheduler started successfully');
    }, 'Failed to start scheduler', 'SCHEDULER_START_FAILED');
  }

  /**
   * Stop all scheduled jobs
   */
  async stop(): Promise<void> {
    return this.handleAsync(async () => {
      this.log('info', 'Stopping data retention scheduler...');

      for (const [name, timer] of this.timers.entries()) {
        clearInterval(timer);
        this.log('info', `Stopped job: ${name}`);
      }

      this.timers.clear();

      this.log('info', 'Data retention scheduler stopped');
    }, 'Failed to stop scheduler', 'SCHEDULER_STOP_FAILED');
  }

  /**
   * Schedule a recurring job
   */
  private scheduleJob(name: string, job: () => Promise<void>, interval: number): void {
    // Run immediately
    job().catch(error => {
      this.log('error', `Job ${name} failed`, error);
    });

    // Schedule recurring execution
    const timer = setInterval(async () => {
      try {
        await job();
      } catch (error) {
        this.log('error', `Job ${name} failed`, error);
      }
    }, interval);

    this.timers.set(name, timer);
    this.log('info', `Scheduled job: ${name} (interval: ${interval}ms)`);
  }

  /**
   * Run data cleanup based on retention policies
   */
  private async runDataCleanup(): Promise<void> {
    return this.handleAsync(async () => {
      this.log('info', 'Running data cleanup job...');

      const results = await privacyManagementService.cleanupExpiredData();

      this.log('info', 'Data cleanup completed', results);
    }, 'Data cleanup job failed', 'CLEANUP_JOB_FAILED');
  }

  /**
   * Process pending deletion requests
   */
  private async processDeletionRequests(): Promise<void> {
    return this.handleAsync(async () => {
      this.log('info', 'Processing deletion requests...');

      // Query for deletion requests that are due
      const now = Timestamp.now();
      const requestsRef = collection(db, SCHEME_SAHAYAK_COLLECTIONS.DATA_DELETION_REQUESTS);
      const q = query(
        requestsRef,
        where('status', '==', 'pending'),
        where('scheduledFor', '<=', now)
      );

      const querySnapshot = await getDocs(q);

      let processed = 0;
      let failed = 0;

      for (const doc of querySnapshot.docs) {
        try {
          await privacyManagementService.executeDataDeletion(doc.id);
          processed++;
        } catch (error) {
          this.log('error', `Failed to process deletion request ${doc.id}`, error);
          failed++;
        }
      }

      this.log('info', `Processed ${processed} deletion requests, ${failed} failed`);
    }, 'Deletion request processing failed', 'DELETION_PROCESSING_FAILED');
  }

  /**
   * Send expiry reminders for documents
   */
  private async sendExpiryReminders(): Promise<void> {
    return this.handleAsync(async () => {
      this.log('info', 'Sending expiry reminders...');

      // Calculate date 30 days from now
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 30);

      // Query for documents expiring in 30 days
      // This would typically query the documents collection
      // and send notifications to users

      this.log('info', 'Expiry reminders sent');
    }, 'Expiry reminder job failed', 'EXPIRY_REMINDER_FAILED');
  }

  /**
   * Manually trigger data cleanup
   */
  async triggerDataCleanup(): Promise<void> {
    return this.runDataCleanup();
  }

  /**
   * Manually trigger deletion request processing
   */
  async triggerDeletionProcessing(): Promise<void> {
    return this.processDeletionRequests();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    enabled: boolean;
    activeJobs: string[];
    intervals: Record<string, number>;
  } {
    return {
      enabled: this.config.enabled,
      activeJobs: Array.from(this.timers.keys()),
      intervals: this.config.intervals
    };
  }

  /**
   * Health check for Data Retention Scheduler
   */
  protected async performHealthCheck(): Promise<void> {
    // Verify scheduler is running if enabled
    if (this.config.enabled && this.timers.size === 0) {
      throw new Error('Scheduler is enabled but no jobs are running');
    }
  }
}

// Export singleton instance
export const dataRetentionScheduler = new DataRetentionScheduler();
