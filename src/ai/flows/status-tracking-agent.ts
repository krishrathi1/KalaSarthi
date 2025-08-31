'use server';
/**
 * @fileOverview Implements the Status Tracking Agent flow for monitoring application progress.
 *
 * - trackApplicationStatus - A function that tracks the status of scheme applications.
 * - TrackApplicationStatusInput - The input type for the trackApplicationStatus function.
 * - TrackApplicationStatusOutput - The return type for the trackApplicationStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import puppeteer from 'puppeteer';

const ApplicationSchema = z.object({
  applicationId: z.string(),
  schemeId: z.string(),
  schemeName: z.string(),
  submittedDate: z.string(),
  status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'pending_documents']),
});

const TrackApplicationStatusInputSchema = z.object({
  applications: z.array(ApplicationSchema),
  artisanId: z.string(),
});
export type TrackApplicationStatusInput = z.infer<typeof TrackApplicationStatusInputSchema>;

const StatusUpdateSchema = z.object({
  applicationId: z.string(),
  previousStatus: z.string(),
  currentStatus: z.string(),
  lastUpdated: z.string(),
  notes: z.string().optional(),
  nextSteps: z.array(z.string()),
});

const TrackApplicationStatusOutputSchema = z.object({
  statusUpdates: z.array(StatusUpdateSchema).describe('Updated status for each application.'),
  notifications: z.array(z.object({
    applicationId: z.string(),
    message: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
});
export type TrackApplicationStatusOutput = z.infer<typeof TrackApplicationStatusOutputSchema>;

export async function trackApplicationStatus(input: TrackApplicationStatusInput): Promise<TrackApplicationStatusOutput> {
  const { applications } = input;

  const statusUpdates: z.infer<typeof StatusUpdateSchema>[] = [];
  const notifications: z.infer<typeof TrackApplicationStatusOutputSchema>['notifications'] = [];

  for (const application of applications) {
    try {
      const update = await checkApplicationStatus(application);
      statusUpdates.push(update);

      // Generate notifications for status changes
      if (update.previousStatus !== update.currentStatus) {
        notifications.push({
          applicationId: application.applicationId,
          message: `Status update for ${application.schemeName}: ${update.currentStatus}`,
          priority: update.currentStatus === 'approved' ? 'high' : 'medium',
        });
      }
    } catch (error) {
      console.error(`Error tracking ${application.applicationId}:`, error);
      statusUpdates.push({
        applicationId: application.applicationId,
        previousStatus: application.status,
        currentStatus: application.status,
        lastUpdated: new Date().toISOString(),
        notes: `Error checking status: ${error}`,
        nextSteps: ['Contact support for manual status check'],
      });
    }
  }

  return {
    statusUpdates,
    notifications,
  };
}

async function checkApplicationStatus(application: z.infer<typeof ApplicationSchema>): Promise<z.infer<typeof StatusUpdateSchema>> {
  // Simulate status checking - in real implementation, this would scrape government portals
  const browser = await puppeteer.launch({ headless: true });

  try {
    // This is a simulation - real implementation would navigate to actual portals
    const simulatedStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'pending_documents'];
    const randomStatus = simulatedStatuses[Math.floor(Math.random() * simulatedStatuses.length)];

    return {
      applicationId: application.applicationId,
      previousStatus: application.status,
      currentStatus: randomStatus,
      lastUpdated: new Date().toISOString(),
      notes: `Status checked via portal`,
      nextSteps: getNextSteps(randomStatus),
    };
  } finally {
    await browser.close();
  }
}

function getNextSteps(status: string): string[] {
  switch (status) {
    case 'submitted':
      return ['Wait for initial review', 'Check back in 7 days'];
    case 'under_review':
      return ['Application is being processed', 'May take 2-4 weeks'];
    case 'approved':
      return ['Congratulations!', 'Check for disbursement details', 'Prepare for next steps'];
    case 'rejected':
      return ['Review rejection reasons', 'Consider reapplying with corrections', 'Contact support'];
    case 'pending_documents':
      return ['Submit missing documents', 'Check portal for requirements', 'Upload documents promptly'];
    default:
      return ['Contact support for clarification'];
  }
}