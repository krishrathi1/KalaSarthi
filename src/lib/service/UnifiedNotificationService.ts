import connectDB from '../mongodb';

interface NotificationTemplate {
  type: 'finance_alert' | 'loan_status' | 'payment_reminder' | 'document_request';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  data?: any;
}

interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export class UnifiedNotificationService {
  /**
   * Send finance alert notification
   */
  static async sendFinanceAlert(
    recipient: NotificationRecipient,
    alertType: 'revenue_drop' | 'payment_overdue' | 'anomaly_detected' | 'forecast_alert',
    alertData: any
  ): Promise<{ success: boolean; notifications: any[] }> {
    const template = this.getFinanceAlertTemplate(alertType, alertData);

    return await this.sendNotification(recipient, template);
  }

  /**
   * Send loan status update notification
   */
  static async sendLoanStatusUpdate(
    recipient: NotificationRecipient,
    applicationId: string,
    oldStatus: string,
    newStatus: string,
    additionalData?: any
  ): Promise<{ success: boolean; notifications: any[] }> {
    const template = this.getLoanStatusTemplate(applicationId, oldStatus, newStatus, additionalData);

    return await this.sendNotification(recipient, template);
  }

  /**
   * Send payment reminder notification
   */
  static async sendPaymentReminder(
    recipient: NotificationRecipient,
    amount: number,
    dueDate: Date,
    loanId?: string
  ): Promise<{ success: boolean; notifications: any[] }> {
    const template: NotificationTemplate = {
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Your payment of ₹${amount.toLocaleString()} is due on ${dueDate.toLocaleDateString()}. Please ensure timely payment to avoid penalties.`,
      priority: 'high',
      channels: ['email', 'sms', 'push'],
      data: { amount, dueDate, loanId }
    };

    return await this.sendNotification(recipient, template);
  }

  /**
   * Send document request notification
   */
  static async sendDocumentRequest(
    recipient: NotificationRecipient,
    applicationId: string,
    requiredDocuments: string[]
  ): Promise<{ success: boolean; notifications: any[] }> {
    const template: NotificationTemplate = {
      type: 'document_request',
      title: 'Document Request',
      message: `Please upload the following documents for your loan application ${applicationId}: ${requiredDocuments.join(', ')}`,
      priority: 'medium',
      channels: ['email', 'in_app'],
      data: { applicationId, requiredDocuments }
    };

    return await this.sendNotification(recipient, template);
  }

  /**
   * Send bulk notifications for multiple recipients
   */
  static async sendBulkNotifications(
    recipients: NotificationRecipient[],
    template: NotificationTemplate
  ): Promise<{ success: boolean; results: any[] }> {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendNotification(recipient, template);
        results.push({
          recipientId: recipient.userId,
          success: result.success,
          notifications: result.notifications
        });
      } catch (error) {
        results.push({
          recipientId: recipient.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  /**
   * Core notification sending method
   */
  private static async sendNotification(
    recipient: NotificationRecipient,
    template: NotificationTemplate
  ): Promise<{ success: boolean; notifications: any[] }> {
    try {
      await connectDB();

      const notifications = [];
      const enabledChannels = template.channels.filter(channel => {
        switch (channel) {
          case 'email': return recipient.preferences.email && recipient.email;
          case 'sms': return recipient.preferences.sms && recipient.phone;
          case 'push': return recipient.preferences.push && recipient.deviceToken;
          case 'in_app': return recipient.preferences.inApp;
          default: return false;
        }
      });

      // Send via email
      if (enabledChannels.includes('email') && recipient.email) {
        const emailResult = await this.sendEmailNotification(recipient.email, template);
        notifications.push({
          channel: 'email',
          success: emailResult.success,
          message: emailResult.message
        });
      }

      // Send via SMS
      if (enabledChannels.includes('sms') && recipient.phone) {
        const smsResult = await this.sendSMSNotification(recipient.phone, template);
        notifications.push({
          channel: 'sms',
          success: smsResult.success,
          message: smsResult.message
        });
      }

      // Send via push notification
      if (enabledChannels.includes('push') && recipient.deviceToken) {
        const pushResult = await this.sendPushNotification(recipient.deviceToken, template);
        notifications.push({
          channel: 'push',
          success: pushResult.success,
          message: pushResult.message
        });
      }

      // Send in-app notification
      if (enabledChannels.includes('in_app')) {
        const inAppResult = await this.sendInAppNotification(recipient.userId, template);
        notifications.push({
          channel: 'in_app',
          success: inAppResult.success,
          message: inAppResult.message
        });
      }

      // Log notification
      await this.logNotification(recipient.userId, template, notifications);

      return {
        success: notifications.some(n => n.success),
        notifications
      };

    } catch (error) {
      console.error('Notification sending error:', error);
      return {
        success: false,
        notifications: [{
          channel: 'error',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    email: string,
    template: NotificationTemplate
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, integrate with email service like SendGrid, AWS SES, etc.
      console.log(`📧 Sending email to ${email}: ${template.title}`);

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        message: `Email sent to ${email}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Email failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(
    phone: string,
    template: NotificationTemplate
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, integrate with SMS service like Twilio, AWS SNS, etc.
      console.log(`📱 Sending SMS to ${phone}: ${template.title}`);

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        message: `SMS sent to ${phone}`
      };
    } catch (error) {
      return {
        success: false,
        message: `SMS failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(
    deviceToken: string,
    template: NotificationTemplate
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, integrate with push service like Firebase, OneSignal, etc.
      console.log(`🔔 Sending push notification: ${template.title}`);

      // Simulate push notification
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        message: `Push notification sent`
      };
    } catch (error) {
      return {
        success: false,
        message: `Push notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    userId: string,
    template: NotificationTemplate
  ): Promise<{ success: boolean; message: string }> {
    try {
      // In a real implementation, store in database and emit via WebSocket
      console.log(`📱 Sending in-app notification to user ${userId}: ${template.title}`);

      // Simulate in-app notification
      await new Promise(resolve => setTimeout(resolve, 50));

      return {
        success: true,
        message: `In-app notification sent to user ${userId}`
      };
    } catch (error) {
      return {
        success: false,
        message: `In-app notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Log notification for audit trail
   */
  private static async logNotification(
    userId: string,
    template: NotificationTemplate,
    results: any[]
  ): Promise<void> {
    try {
      // In a real implementation, save to notification log collection
      console.log(`📝 Logging notification for user ${userId}:`, {
        type: template.type,
        title: template.title,
        results: results.map(r => ({ channel: r.channel, success: r.success }))
      });
    } catch (error) {
      console.error('Notification logging error:', error);
    }
  }

  /**
   * Get finance alert template
   */
  private static getFinanceAlertTemplate(
    alertType: 'revenue_drop' | 'payment_overdue' | 'anomaly_detected' | 'forecast_alert',
    alertData: any
  ): NotificationTemplate {
    switch (alertType) {
      case 'revenue_drop':
        return {
          type: 'finance_alert',
          title: 'Revenue Alert',
          message: `Your revenue has dropped by ${alertData.percentage}% compared to last period. Current: ₹${alertData.currentRevenue}, Previous: ₹${alertData.previousRevenue}`,
          priority: 'high',
          channels: ['email', 'push', 'in_app'],
          data: alertData
        };

      case 'payment_overdue':
        return {
          type: 'finance_alert',
          title: 'Payment Overdue',
          message: `Payment of ₹${alertData.amount} for ${alertData.description} is overdue by ${alertData.daysOverdue} days.`,
          priority: 'high',
          channels: ['email', 'sms', 'push'],
          data: alertData
        };

      case 'anomaly_detected':
        return {
          type: 'finance_alert',
          title: 'Anomaly Detected',
          message: `Unusual activity detected in your ${alertData.metric}: ${alertData.value} (expected: ${alertData.expected})`,
          priority: 'medium',
          channels: ['email', 'in_app'],
          data: alertData
        };

      case 'forecast_alert':
        return {
          type: 'finance_alert',
          title: 'Revenue Forecast',
          message: `Projected revenue for next period: ₹${alertData.forecast}. ${alertData.trend === 'up' ? '📈 Trending upward' : '📉 Trending downward'}`,
          priority: 'medium',
          channels: ['email', 'in_app'],
          data: alertData
        };

      default:
        return {
          type: 'finance_alert',
          title: 'Finance Alert',
          message: 'A finance alert has been triggered.',
          priority: 'medium',
          channels: ['in_app'],
          data: alertData
        };
    }
  }

  /**
   * Get loan status update template
   */
  private static getLoanStatusTemplate(
    applicationId: string,
    oldStatus: string,
    newStatus: string,
    additionalData?: any
  ): NotificationTemplate {
    const statusMessages = {
      submitted: 'Your loan application has been submitted successfully.',
      under_review: 'Your loan application is now under review.',
      approved: 'Congratulations! Your loan application has been approved.',
      rejected: 'Your loan application has been rejected.',
      disbursed: 'Your loan has been disbursed successfully.'
    };

    return {
      type: 'loan_status',
      title: 'Loan Application Update',
      message: `${statusMessages[newStatus as keyof typeof statusMessages] || `Your loan application status has changed from ${oldStatus} to ${newStatus}.`}`,
      priority: newStatus === 'approved' || newStatus === 'rejected' ? 'high' : 'medium',
      channels: ['email', 'sms', 'push', 'in_app'],
      data: { applicationId, oldStatus, newStatus, ...additionalData }
    };
  }
}