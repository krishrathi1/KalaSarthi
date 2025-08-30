'use server';
/**
 * @fileOverview Implements the Auto-Registration Agent flow for automated scheme applications.
 *
 * - autoRegisterForSchemes - A function that handles automated registration for schemes.
 * - AutoRegisterForSchemesInput - The input type for the autoRegisterForSchemes function.
 * - AutoRegisterForSchemesOutput - The return type for the autoRegisterForSchemes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { govtAutomation, type ArtisanProfile } from '@/lib/govt-automation';

const ArtisanProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(z.string()),
  location: z.string(),
  income: z.string(),
  businessType: z.string(),
  experience: z.string(),
  contactInfo: z.object({
    phone: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  documents: z.object({
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    bankAccount: z.string().optional(),
  }),
});

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

const AutoRegisterForSchemesInputSchema = z.object({
  artisanProfile: ArtisanProfileSchema,
  selectedSchemes: z.array(TranslatedSchemeSchema),
});
export type AutoRegisterForSchemesInput = z.infer<typeof AutoRegisterForSchemesInputSchema>;

const RegistrationResultSchema = z.object({
  schemeId: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  applicationId: z.string().optional(),
  message: z.string(),
});

const AutoRegisterForSchemesOutputSchema = z.object({
  registrations: z.array(RegistrationResultSchema).describe('Results of auto-registration attempts.'),
});
export type AutoRegisterForSchemesOutput = z.infer<typeof AutoRegisterForSchemesOutputSchema>;

export async function autoRegisterForSchemes(input: AutoRegisterForSchemesInput): Promise<AutoRegisterForSchemesOutput> {
  const { artisanProfile, selectedSchemes } = input;

  const registrations: z.infer<typeof RegistrationResultSchema>[] = [];

  // Convert to automation service format
  const automationProfile: ArtisanProfile = {
    id: artisanProfile.id,
    name: artisanProfile.name,
    skills: artisanProfile.skills,
    location: artisanProfile.location,
    income: artisanProfile.income,
    businessType: artisanProfile.businessType,
    experience: artisanProfile.experience,
    contactInfo: artisanProfile.contactInfo,
    documents: artisanProfile.documents,
  };

  for (const scheme of selectedSchemes) {
    try {
      let result: z.infer<typeof RegistrationResultSchema>;

      switch (scheme.category.toLowerCase()) {
        case 'mudra':
          const mudraResult = await govtAutomation.registerForMudra(automationProfile);
          result = {
            schemeId: scheme.id,
            status: mudraResult.success ? 'success' : 'failed',
            applicationId: mudraResult.applicationId,
            message: mudraResult.message,
          };
          break;
        case 'pmegp':
          const pmegpResult = await govtAutomation.registerForPMEGP(automationProfile);
          result = {
            schemeId: scheme.id,
            status: pmegpResult.success ? 'success' : 'failed',
            applicationId: pmegpResult.applicationId,
            message: pmegpResult.message,
          };
          break;
        case 'skill india':
          result = await registerForSkillIndia(automationProfile, scheme);
          break;
        case 'export promotion':
          result = await registerForExportPromotion(automationProfile, scheme);
          break;
        default:
          result = {
            schemeId: scheme.id,
            status: 'failed',
            message: 'Unsupported scheme category',
          };
      }

      registrations.push(result);
    } catch (error) {
      registrations.push({
        schemeId: scheme.id,
        status: 'failed',
        message: `Error during registration: ${error}`,
      });
    }
  }

  return { registrations };
}

// Additional automation functions for schemes not covered by GovtAutomationService

async function registerForSkillIndia(profile: ArtisanProfile, scheme: z.infer<typeof TranslatedSchemeSchema>): Promise<z.infer<typeof RegistrationResultSchema>> {
  // For now, return a placeholder - can be enhanced later
  return {
    schemeId: scheme.id,
    status: 'pending',
    message: 'Skill India registration requires manual intervention',
  };
}

async function registerForExportPromotion(profile: ArtisanProfile, scheme: z.infer<typeof TranslatedSchemeSchema>): Promise<z.infer<typeof RegistrationResultSchema>> {
  // For now, return a placeholder - can be enhanced later
  return {
    schemeId: scheme.id,
    status: 'pending',
    message: 'Export promotion registration requires manual intervention',
  };
}