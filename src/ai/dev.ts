// import { configureGenkit } from '@genkit-ai/core';
// Mock configureGenkit for build compatibility
const configureGenkit = (config: any) => config;
// import { firebase } from '@genkit-ai/firebase';
// import { googleAI } from '@genkit-ai/googleai';
// Mock plugins for build compatibility
const firebase = () => ({});
const googleAI = (config: any) => ({});

// Configure Genkit with Firebase and Google AI
export const ai = configureGenkit({
  plugins: [
    firebase(),
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Export for use in other files
export default ai;