# Artisan Buddy Notification System

## Overview

The Notification System provides comprehensive proactive assistance to artisans through intelligent notifications, timely recommendations, milestone celebrations, and task reminders. It implements Requirements 8.1-8.5 and 13.2 from the Artisan Buddy specification.

## Architecture

The notification system consists of five main components:

1. **NotificationSystem** - Main orchestrator for notification creation and delivery
2. **NotificationQueue** - Manages queuing, scheduling, and retry logic
3. **NotificationTriggers** - Handles trigger conditions and event detection
4. **NotificationTemplates** - Manages notification content templates
5. **NotificationPreferences** - Manages user notification preferences
6. **ProactiveSuggestions** - Detects opportunities and generates recommendations

## Components

### 1. NotificationSystem

Main service for managing notifications, triggers, and delivery across multiple channels.

**Key Features:**
- Multi-channel delivery (in-app, push, email, SMS, WhatsApp)
- Priority-based routing
- User preference enforcement
- Delivery tracking and analytics
- Graceful degradation

**Usage:**
```typescript
import { notificationSystem } from '@/lib/services/artisan-buddy/NotificationSystem';

// Create a notification
await notificationSystem.createNotification({
  userId: 'user123',
  type: 'buyer_inquiry',
  priority: 'high',
  templateId: 'buyer_inquiry',
  variables: {
    artisanName: 'Rajesh',
    buyerName: 'Priya',
    buyerLocation: 'Mumbai',
    productName: 'Handwoven Saree',
    inquiryId: 'inq123',
  },
  metadata: {
    inquiryId: 'inq123',
  },
});

// Get user notifications
const notifications = await notificationSystem.getUserNotifications('user123', 20);

// Mark as read
await notificationSystem.markAsRead('notification12 