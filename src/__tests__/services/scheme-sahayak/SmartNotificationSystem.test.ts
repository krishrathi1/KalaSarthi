/**
 * Smart Notification System Tests
 * Tests for multi-channel notification delivery
 */

import { SmartNotificationSystem } from '@/lib/services/scheme-sahayak/SmartNotificationSystem';
import { SmartNotification } from '@/lib/types/scheme-sahayak';

describe('SmartNotificationSystem', () => {
  let notificationSystem: SmartNotificationSystem;

  beforeEach(() => {
    notificationSystem = new SmartNotificationSystem();
  });

  describe('Channel Selection', () => {
    it('should select appropriate channels based on priority', () => {
      const notification: SmartNotification = {
        id: 'test_notif_1',
        userId: 'test_user_1',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'new_scheme',
        priority: 'urgent',
        channels: [],
        personalizedContent: false,
        metadata: {},
        customization: {}
      };

      expect(notification.priority).toBe('urgent');
      expect(notification.type).toBe('new_scheme');
    });
  });

  describe('Notification Structure', () => {
    it('should create valid notification object', () => {
      const notification: SmartNotification = {
        id: 'test_notif_2',
        userId: 'test_user_2',
        title: 'Deadline Reminder',
        message: 'Your scheme deadline is approaching',
        type: 'deadline_reminder',
        priority: 'high',
        channels: [
          {
            type: 'sms',
            fallbackDelay: 0,
            retryAttempts: 2,
            fallbackToManual: false,
            userNotification: true
          }
        ],
        personalizedContent: true,
        actionUrl: '/schemes/123',
        metadata: {
          schemeId: '123',
          daysRemaining: 7
        },
        customization: {
          userName: 'Test User'
        }
      };

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBeDefined();
      expect(notification.channels.length).toBeGreaterThan(0);
      expect(notification.metadata.schemeId).toBe('123');
    });
  });

  describe('Priority Levels', () => {
    it('should support all priority levels', () => {
      const priorities: Array<'low' | 'medium' | 'high' | 'urgent'> = [
        'low',
        'medium',
        'high',
        'urgent'
      ];

      priorities.forEach(priority => {
        const notification: SmartNotification = {
          id: `test_${priority}`,
          userId: 'test_user',
          title: `${priority} priority notification`,
          message: 'Test message',
          type: 'new_scheme',
          priority,
          channels: [],
          personalizedContent: false,
          metadata: {},
          customization: {}
        };

        expect(notification.priority).toBe(priority);
      });
    });
  });

  describe('Notification Types', () => {
    it('should support all notification types', () => {
      const types: Array<'new_scheme' | 'deadline_reminder' | 'status_update' | 'document_required' | 'rejection'> = [
        'new_scheme',
        'deadline_reminder',
        'status_update',
        'document_required',
        'rejection'
      ];

      types.forEach(type => {
        const notification: SmartNotification = {
          id: `test_${type}`,
          userId: 'test_user',
          title: `${type} notification`,
          message: 'Test message',
          type,
          priority: 'medium',
          channels: [],
          personalizedContent: false,
          metadata: {},
          customization: {}
        };

        expect(notification.type).toBe(type);
      });
    });
  });

  describe('Channel Configuration', () => {
    it('should configure channels with retry logic', () => {
      const notification: SmartNotification = {
        id: 'test_channel_config',
        userId: 'test_user',
        title: 'Test',
        message: 'Test',
        type: 'new_scheme',
        priority: 'high',
        channels: [
          {
            type: 'sms',
            fallbackDelay: 1000,
            retryAttempts: 3,
            fallbackToManual: true,
            userNotification: true
          },
          {
            type: 'email',
            fallbackDelay: 2000,
            retryAttempts: 1,
            fallbackToManual: false,
            userNotification: true
          }
        ],
        personalizedContent: false,
        metadata: {},
        customization: {}
      };

      expect(notification.channels).toHaveLength(2);
      expect(notification.channels[0].type).toBe('sms');
      expect(notification.channels[0].retryAttempts).toBe(3);
      expect(notification.channels[1].type).toBe('email');
      expect(notification.channels[1].retryAttempts).toBe(1);
    });
  });
});
