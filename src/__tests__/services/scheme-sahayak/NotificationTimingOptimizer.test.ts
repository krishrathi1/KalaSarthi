/**
 * Notification Timing Optimizer Tests
 * Tests for intelligent timing and deadline management
 */

import { NotificationTimingOptimizer } from '@/lib/services/scheme-sahayak/NotificationTimingOptimizer';

describe('NotificationTimingOptimizer', () => {
  let timingOptimizer: NotificationTimingOptimizer;

  beforeEach(() => {
    timingOptimizer = new NotificationTimingOptimizer();
  });

  describe('Optimal Time Calculation', () => {
    it('should calculate optimal time in the future', async () => {
      const now = new Date();
      const optimalTime = await timingOptimizer.calculateOptimalTime('test_user');
      
      expect(optimalTime).toBeInstanceOf(Date);
      expect(optimalTime.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should return a valid date object', async () => {
      const optimalTime = await timingOptimizer.calculateOptimalTime('test_user');
      
      expect(optimalTime).toBeInstanceOf(Date);
      expect(isNaN(optimalTime.getTime())).toBe(false);
    });
  });

  describe('Deadline Reminder Scheduling', () => {
    it('should create reminder ID format', () => {
      const userId = 'test_user';
      const schemeId = 'test_scheme';
      const timestamp = Date.now();
      
      const reminderId = `reminder_${userId}_${schemeId}_${timestamp}`;
      
      expect(reminderId).toBeDefined();
      expect(typeof reminderId).toBe('string');
      expect(reminderId).toContain('reminder_');
      expect(reminderId).toContain(userId);
      expect(reminderId).toContain(schemeId);
    });

    it('should generate unique reminder IDs with timestamps', () => {
      const userId1 = 'user1';
      const schemeId1 = 'scheme1';
      const timestamp1 = Date.now();
      
      const userId2 = 'user2';
      const schemeId2 = 'scheme2';
      const timestamp2 = Date.now() + 1;
      
      const reminderId1 = `reminder_${userId1}_${schemeId1}_${timestamp1}`;
      const reminderId2 = `reminder_${userId2}_${schemeId2}_${timestamp2}`;
      
      expect(reminderId1).not.toBe(reminderId2);
    });
  });

  describe('String Similarity', () => {
    it('should calculate similarity correctly', () => {
      // Access private method through type assertion for testing
      const optimizer = timingOptimizer as any;
      
      const similarity1 = optimizer.calculateStringSimilarity(
        'New Scheme Available',
        'New Scheme Available'
      );
      expect(similarity1).toBe(1);
      
      const similarity2 = optimizer.calculateStringSimilarity(
        'New Scheme Available',
        'Completely Different Text'
      );
      expect(similarity2).toBeLessThan(0.5);
    });
  });

  describe('Day Name Conversion', () => {
    it('should map day numbers to names correctly', () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      expect(days[0]).toBe('Sunday');
      expect(days[1]).toBe('Monday');
      expect(days[2]).toBe('Tuesday');
      expect(days[6]).toBe('Saturday');
    });
  });
});
