'use server';

/**
 * @fileOverview Implements the Finance Advisor Agent flow for answering monetary questions and suggesting actions.
 *
 * - consultFinanceAdvisor - A function that handles financial queries and provides actionable insights.
 * - ConsultFinanceAdvisorInput - The input type for the consultFinanceAdvisor function.
 * - ConsultFinanceAdvisorOutput - The return type for the consultFinanceAdvisor function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ConsultFinanceAdvisorInputSchema = z.object({
  userId: z.string().describe('The unique identifier of the user seeking financial advice.'),
  query: z.string().describe('The natural language financial query from the user.'),
  context: z.object({
    artisanId: z.string().optional().describe('The artisan ID if query is artisan-specific.'),
    productId: z.string().optional().describe('The product ID if query is product-specific.'),
    timeRange: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional().describe('Time range for analysis.'),
    category: z.string().optional().describe('Product category for analysis.'),
  }).optional().describe('Additional context for the financial analysis.'),
});

export type ConsultFinanceAdvisorInput = z.infer<typeof ConsultFinanceAdvisorInputSchema>;

const ConsultFinanceAdvisorOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the financial query.'),
  insights: z.array(z.string()).describe('Key financial insights and observations.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for the user.'),
  dataPoints: z.object({
    revenue: z.number().optional().describe('Revenue data if relevant.'),
    units: z.number().optional().describe('Units sold if relevant.'),
    growth: z.number().optional().describe('Growth percentage if relevant.'),
    margin: z.number().optional().describe('Profit margin if relevant.'),
  }).optional().describe('Relevant financial data points.'),
  nextSteps: z.array(z.string()).describe('Suggested next steps for the user.'),
  confidence: z.number().describe('Confidence score for the analysis (0-1).'),
});

export type ConsultFinanceAdvisorOutput = z.infer<typeof ConsultFinanceAdvisorOutputSchema>;

export async function consultFinanceAdvisor(input: ConsultFinanceAdvisorInput): Promise<ConsultFinanceAdvisorOutput> {
  return consultFinanceAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financeAdvisorPrompt',
  input: { schema: ConsultFinanceAdvisorInputSchema },
  output: { schema: ConsultFinanceAdvisorOutputSchema },
  prompt: `You are a Financial Advisor Agent for KalaBandhu, an artisan marketplace platform. Your role is to provide financial insights, analysis, and actionable recommendations to artisans and buyers.

USER QUERY: {{{query}}}

USER CONTEXT:
- User ID: {{{userId}}}
- Artisan ID: {{{context.artisanId}}}
- Product ID: {{{context.productId}}}
- Time Range: {{{context.timeRange}}}
- Category: {{{context.category}}}

Your task is to:
1. Analyze the financial query and provide a comprehensive response
2. Identify key financial insights and trends
3. Provide actionable recommendations
4. Suggest next steps for financial improvement
5. Assess confidence in your analysis

Focus on:
- Revenue and sales performance
- Product performance and rankings
- Market trends and opportunities
- Cost optimization and margin improvement
- Growth strategies and scaling advice
- Risk assessment and mitigation

Provide practical, actionable advice that artisans can implement immediately. Use clear, simple language and focus on business impact.`,
});

const consultFinanceAdvisorFlow = ai.defineFlow(
  {
    name: 'consultFinanceAdvisorFlow',
    inputSchema: ConsultFinanceAdvisorInputSchema,
    outputSchema: ConsultFinanceAdvisorOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

// Tool definitions for the Finance Advisor Agent
export const financeAdvisorTools = {
  fetch_timeseries: {
    name: 'fetch_timeseries',
    description: 'Fetch time-series sales data for analysis',
    parameters: {
      type: 'object',
      properties: {
        artisanId: { type: 'string', description: 'Artisan ID for filtering' },
        productId: { type: 'string', description: 'Product ID for filtering' },
        timeRange: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
      required: ['timeRange'],
    },
  },

  top_products: {
    name: 'top_products',
    description: 'Get top-performing products by revenue or units',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Product category' },
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
        limit: { type: 'number', description: 'Number of products to return' },
        sortBy: { type: 'string', enum: ['revenue', 'units', 'growth', 'margin'] },
      },
      required: ['timeRange', 'sortBy'],
    },
  },

  bottom_products: {
    name: 'bottom_products',
    description: 'Get underperforming products for improvement opportunities',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Product category' },
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
        limit: { type: 'number', description: 'Number of products to return' },
        minRevenue: { type: 'number', description: 'Minimum revenue threshold' },
      },
      required: ['timeRange'],
    },
  },

  forecast_revenue: {
    name: 'forecast_revenue',
    description: 'Generate revenue forecasts based on historical data',
    parameters: {
      type: 'object',
      properties: {
        artisanId: { type: 'string', description: 'Artisan ID for forecasting' },
        productId: { type: 'string', description: 'Product ID for forecasting' },
        horizon: { type: 'string', enum: ['week', 'month', 'quarter'] },
        confidence: { type: 'number', description: 'Confidence level (0.8-0.95)' },
      },
      required: ['horizon'],
    },
  },

  detect_anomalies: {
    name: 'detect_anomalies',
    description: 'Detect unusual patterns in sales or financial data',
    parameters: {
      type: 'object',
      properties: {
        artisanId: { type: 'string', description: 'Artisan ID for analysis' },
        metric: { type: 'string', enum: ['revenue', 'units', 'orders', 'margin'] },
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter'] },
        threshold: { type: 'number', description: 'Anomaly detection threshold' },
      },
      required: ['metric', 'timeRange'],
    },
  },

  simulate_discount: {
    name: 'simulate_discount',
    description: 'Simulate the impact of discount strategies on revenue and margin',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID for simulation' },
        discountPercent: { type: 'number', description: 'Discount percentage (0-100)' },
        expectedVolumeIncrease: { type: 'number', description: 'Expected volume increase percentage' },
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter'] },
      },
      required: ['productId', 'discountPercent'],
    },
  },

  sales_summary: {
    name: 'sales_summary',
    description: 'Get comprehensive sales summary and performance metrics',
    parameters: {
      type: 'object',
      properties: {
        artisanId: { type: 'string', description: 'Artisan ID for summary' },
        timeRange: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
        includeComparisons: { type: 'boolean', description: 'Include period-over-period comparisons' },
        includeProjections: { type: 'boolean', description: 'Include future projections' },
      },
      required: ['timeRange'],
    },
  },
};

// Example usage scenarios
export const financeAdvisorExamples = {
  revenueAnalysis: {
    query: "How is my revenue performing this month compared to last month?",
    expectedTools: ['fetch_timeseries', 'sales_summary'],
  },
  productOptimization: {
    query: "Which of my products are underperforming and what should I do about them?",
    expectedTools: ['bottom_products', 'sales_summary'],
  },
  growthStrategy: {
    query: "What discount should I offer to increase sales by 20%?",
    expectedTools: ['simulate_discount', 'top_products'],
  },
  marketInsights: {
    query: "What are the top trends in my category this quarter?",
    expectedTools: ['top_products', 'detect_anomalies'],
  },
  financialPlanning: {
    query: "How much revenue can I expect next month?",
    expectedTools: ['forecast_revenue', 'sales_summary'],
  },
};
