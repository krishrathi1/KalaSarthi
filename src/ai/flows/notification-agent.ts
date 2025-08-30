'use server';
/**
 * @fileOverview Implements the Notification Agent flow for sending scheme alerts.
 *
 * - sendNotifications - A function that sends notifications about matched schemes.
 * - SendNotificationsInput - The input type for the sendNotifications function.
 * - SendNotificationsOutput - The return type for the sendNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslatedSchemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string(),
  category: z.string(),
  publishedDate: z.string(),
  enrichedDescription: z.string(),
  keywords: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  matchScore: z.number(),
  eligibilityMatch: z.boolean(),
  reasons: z.array(z.string()),
  translatedTitle: z.string(),
  translatedDescription: z.string(),
  translatedEligibility: z.string(),
  translatedEnrichedDescription: z.string(),
});

const SendNotificationsInputSchema = z.object({
  translatedSchemes: z.array(TranslatedSchemeSchema),
  artisanId: z.string(),
  notificationMethods: z.array(z.enum(['push', 'text', 'voice'])),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    deviceToken: z.string().optional(),
  }),
});
export type SendNotificationsInput = z.infer<typeof SendNotificationsInputSchema>;

const NotificationResultSchema = z.object({
  schemeId: z.string(),
  method: z.string(),
  status: z.enum(['sent', 'failed', 'pending']),
  message: z.string(),
});

const SendNotificationsOutputSchema = z.object({
  notifications: z.array(NotificationResultSchema).describe('Results of notification attempts.'),
});
export type SendNotificationsOutput = z.infer<typeof SendNotificationsOutputSchema>;

export async function sendNotifications(input: SendNotificationsInput): Promise<SendNotificationsOutput> {
  const { translatedSchemes, notificationMethods, contactInfo } = input;

  const notifications: z.infer<typeof NotificationResultSchema>[] = [];

  for (const scheme of translatedSchemes) {
    for (const method of notificationMethods) {
      let status: 'sent' | 'failed' | 'pending' = 'pending';
      let message = '';

      try {
        switch (method) {
          case 'push':
            if (contactInfo.deviceToken) {
              // Simulate push notification
              status = 'sent';
              message = `Push notification sent for ${scheme.translatedTitle}`;
            } else {
              status = 'failed';
              message = 'No device token available';
            }
            break;
          case 'text':
            if (contactInfo.phone) {
              // Simulate SMS
              status = 'sent';
              message = `SMS sent to ${contactInfo.phone} for ${scheme.translatedTitle}`;
            } else {
              status = 'failed';
              message = 'No phone number available';
            }
            break;
          case 'voice':
            if (contactInfo.phone) {
              // Simulate voice call
              status = 'sent';
              message = `Voice notification initiated to ${contactInfo.phone} for ${scheme.translatedTitle}`;
            } else {
              status = 'failed';
              message = 'No phone number available';
            }
            break;
        }
      } catch (error) {
        status = 'failed';
        message = `Error sending ${method} notification: ${error}`;
      }

      notifications.push({
        schemeId: scheme.id,
        method,
        status,
        message,
      });
    }
  }

  return { notifications };
}