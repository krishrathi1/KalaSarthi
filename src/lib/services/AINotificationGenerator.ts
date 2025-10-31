/**
 * AI Notification Generator
 * Generates personalized WhatsApp notifications using AI
 */

interface SchemeNotification {
  schemeTitle: string;
  schemeUrl: string;
  aiScore: number;
  successProbability: number;
  benefits: string;
  urgency: 'high' | 'medium' | 'low';
}

interface DocumentNotification {
  documentType: string;
  action: 'upload' | 'renew' | 'verify';
  impact: string;
  deadline?: string;
}

export class AINotificationGenerator {
  /**
   * Generate notification for new scheme match
   */
  static generateSchemeNotification(data: SchemeNotification): string {
    const urgencyEmoji = data.urgency === 'high' ? '🔥' : data.urgency === 'medium' ? '⚡' : '💡';
    
    return `${urgencyEmoji} *New Scheme Alert!*

*${data.schemeTitle}* is now available for you!

✅ AI Match Score: ${data.aiScore}%
📊 Success Probability: ${data.successProbability}%
💰 Benefits: ${data.benefits}

${data.urgency === 'high' ? '⏰ *Limited time opportunity!* Apply soon for best results.' : 'Your profile matches perfectly with this scheme.'}

🔗 Apply Now: ${data.schemeUrl}`;
  }

  /**
   * Generate notification for document reminder
   */
  static generateDocumentNotification(data: DocumentNotification): string {
    const actionText = {
      upload: 'Upload',
      renew: 'Renew',
      verify: 'Verify'
    }[data.action];

    const actionEmoji = {
      upload: '📤',
      renew: '🔄',
      verify: '✓'
    }[data.action];

    let message = `${actionEmoji} *Document ${actionText} Required*

*${data.documentType}* needs your attention!

📋 Action: ${actionText} this document
💡 Impact: ${data.impact}`;

    if (data.deadline) {
      message += `\n⏰ Deadline: ${data.deadline}`;
    }

    message += `\n\n🔗 Upload here: https://your-app.com/scheme-sahayak`;

    return message;
  }

  /**
   * Generate notification for application status update
   */
  static generateApplicationUpdateNotification(
    schemeName: string,
    status: string,
    nextSteps: string[]
  ): string {
    const statusEmoji = {
      'submitted': '📝',
      'under_review': '🔍',
      'approved': '✅',
      'rejected': '❌',
      'pending_documents': '📄'
    }[status] || '📋';

    let message = `${statusEmoji} *Application Update*

Your *${schemeName}* application status:

Status: *${status.replace('_', ' ').toUpperCase()}*

Next Steps:`;

    nextSteps.forEach((step, index) => {
      message += `\n${index + 1}. ${step}`;
    });

    return message;
  }

  /**
   * Generate notification for deadline reminder
   */
  static generateDeadlineNotification(
    schemeName: string,
    schemeUrl: string,
    daysLeft: number
  ): string {
    const urgencyEmoji = daysLeft <= 3 ? '🚨' : daysLeft <= 7 ? '⚠️' : '⏰';

    return `${urgencyEmoji} *Deadline Alert!*

*${schemeName}* application deadline approaching!

⏰ Time Left: *${daysLeft} days*

${daysLeft <= 3 ? '🔥 *URGENT:* Apply immediately to avoid missing this opportunity!' : 'Don\'t miss out on this opportunity!'}

🔗 Apply Now: ${schemeUrl}`;
  }

  /**
   * Generate personalized weekly digest
   */
  static generateWeeklyDigest(
    newSchemes: number,
    documentsNeeded: number,
    applicationsInProgress: number
  ): string {
    return `📊 *Weekly Scheme Digest*

Here's your weekly summary:

🆕 ${newSchemes} new schemes match your profile
📄 ${documentsNeeded} documents need attention
📝 ${applicationsInProgress} applications in progress

💡 *Tip:* Upload missing documents to unlock more schemes!

🔗 View Dashboard: https://your-app.com/scheme-sahayak`;
  }
}

export default AINotificationGenerator;
