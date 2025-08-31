'use server';
/**
 * @fileOverview Implements the Government API Monitoring flow for fetching new schemes.
 *
 * - monitorGovtAPIs - A function that monitors government APIs for new schemes.
 * - MonitorGovtAPIsInput - The input type for the monitorGovtAPIs function.
 * - MonitorGovtAPIsOutput - The return type for the monitorGovtAPIs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MonitorGovtAPIsInputSchema = z.object({
  lastChecked: z.string().optional().describe('The last time schemes were checked, in ISO format.'),
});
export type MonitorGovtAPIsInput = z.infer<typeof MonitorGovtAPIsInputSchema>;

const SchemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  eligibility: z.string(),
  link: z.string(),
  category: z.string(),
  publishedDate: z.string(),
});

const MonitorGovtAPIsOutputSchema = z.object({
  newSchemes: z.array(SchemeSchema).describe('List of new schemes discovered.'),
});
export type MonitorGovtAPIsOutput = z.infer<typeof MonitorGovtAPIsOutputSchema>;

export async function monitorGovtAPIs(input: MonitorGovtAPIsInput): Promise<MonitorGovtAPIsOutput> {
  return monitorGovtAPIsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'govtAPIMonitoringPrompt',
  input: {schema: MonitorGovtAPIsInputSchema},
  output: {schema: MonitorGovtAPIsOutputSchema},
  prompt: `You are a government API monitoring agent for artisan schemes in India.
  Your task is to check for new government schemes that could benefit artisans.

  Last checked: {{{lastChecked}}}

  Simulate checking APIs from:
  - Ministry of MSME (PMEGP, Mudra)
  - Ministry of Skill Development (Skill India)
  - Ministry of Commerce (Export promotion)
  - Ministry of Textiles (Handicrafts schemes)

  Return a list of new schemes discovered since the last check. Include realistic scheme details.

  Output format: JSON array of schemes with id, title, description, eligibility, link, category, publishedDate.`,
});

const monitorGovtAPIsFlow = ai.defineFlow(
  {
    name: 'monitorGovtAPIsFlow',
    inputSchema: MonitorGovtAPIsInputSchema,
    outputSchema: MonitorGovtAPIsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);