'use server';
/**
 * @fileOverview Implements the Voice Scheme Enrollment flow for interactive voice-based scheme registration.
 *
 * - handleVoiceEnrollment - A function that handles voice-based scheme enrollment conversations.
 * - HandleVoiceEnrollmentInput - The input type for the handleVoiceEnrollment function.
 * - HandleVoiceEnrollmentOutput - The return type for the handleVoiceEnrollment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceEnrollmentInputSchema = z.object({
  userMessage: z.string().describe('The user\'s voice message or text input'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    message: z.string(),
    timestamp: z.string(),
  })).optional().describe('Previous conversation messages'),
  artisanProfile: z.object({
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
  }).optional().describe('Artisan profile if available'),
  currentStep: z.enum(['greeting', 'scheme_info', 'eligibility_check', 'document_collection', 'confirmation', 'registration']).optional(),
});

export type VoiceEnrollmentInput = z.infer<typeof VoiceEnrollmentInputSchema>;

const VoiceEnrollmentOutputSchema = z.object({
  response: z.string().describe('The voice assistant\'s response message'),
  nextStep: z.enum(['greeting', 'scheme_info', 'eligibility_check', 'document_collection', 'confirmation', 'registration', 'complete']),
  suggestedSchemes: z.array(z.string()).optional(),
  collectedData: z.object({
    interestedSchemes: z.array(z.string()).optional(),
    missingDocuments: z.array(z.string()).optional(),
    confirmationGiven: z.boolean().optional(),
  }).optional(),
  shouldTriggerAutomation: z.boolean().optional(),
});

export type VoiceEnrollmentOutput = z.infer<typeof VoiceEnrollmentOutputSchema>;

export async function handleVoiceEnrollment(input: VoiceEnrollmentInput): Promise<VoiceEnrollmentOutput> {
  return voiceEnrollmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceSchemeEnrollmentPrompt',
  input: {schema: VoiceEnrollmentInputSchema},
  output: {schema: VoiceEnrollmentOutputSchema},
  prompt: `You are a friendly voice assistant helping artisans enroll in government schemes.
  You speak in a conversational, helpful tone and provide step-by-step guidance for manual enrollment.

  Current conversation context:
  User Message: {{{userMessage}}}
  Conversation History: {{{conversationHistory}}}
  Current Step: {{{currentStep}}}
  Artisan Profile: {{{artisanProfile}}}

  Based on the user's message and context, determine:
  1. What step we're in (greeting, scheme_info, eligibility_check, document_collection, step_by_step_guide, confirmation)
  2. What schemes might interest them based on their profile and message
  3. What information you need to collect
  4. Provide detailed step-by-step enrollment instructions

  Available schemes with detailed information:

  MUDRA (Micro Units Development & Refinance Agency):
  - Benefits: Loans up to ₹10 lakh for working capital and equipment
  - Eligibility: Any Indian citizen with business plan for non-farm activities
  - Documents: Aadhaar, PAN, Bank account, Business plan
  - Process: Apply online at mudra.org.in, get loan within 7-10 days

  PMEGP (Prime Minister's Employment Generation Programme):
  - Benefits: Subsidy up to ₹25 lakh for new enterprises, 35% for urban, 25% for rural
  - Eligibility: Age 18-40, VIII pass, Project cost ₹5 lakh-₹25 lakh
  - Documents: Aadhaar, PAN, Bank account, Project report, Caste certificate
  - Process: Apply through KVIC/DIC, get approval within 30-45 days

  Skill India Mission:
  - Benefits: Free training, certification, job placement assistance
  - Eligibility: Age 15-35, Indian citizen
  - Documents: Aadhaar, Education certificates
  - Process: Register at skillindia.gov.in, choose course, attend training

  Response guidelines:
  - Speak in simple Hindi/English mix for better understanding
  - Provide clear, numbered steps for enrollment
  - Include exact website URLs and phone numbers
  - Ask one question at a time
  - Be patient and encouraging
  - Focus on guidance, not automation
  - End each response with what the user should do next

  When providing step-by-step guide, include:
  - Exact website URL
  - Required documents list
  - Step-by-step process
  - Helpline numbers
  - Expected timeline
  - What to do if they face problems`,
});

const voiceEnrollmentFlow = ai.defineFlow(
  {
    name: 'voiceSchemeEnrollmentFlow',
    inputSchema: VoiceEnrollmentInputSchema,
    outputSchema: VoiceEnrollmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);