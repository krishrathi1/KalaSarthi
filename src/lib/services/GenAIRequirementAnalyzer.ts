/**
 * GenAI-based Requirement Analyzer
 * Uses generative AI to understand buyer requirements and extract profession/craft intent
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GenAIRequirementAnalysis {
  originalText: string;
  extractedIntent: {
    primaryProfession: string;
    secondaryProfessions: string[];
    productTypes: string[];
    materials: string[];
    techniques: string[];
    style: string[];
    sentiment: 'positive' | 'neutral' | 'urgent' | 'specific';
    urgency: 'low' | 'medium' | 'high';
    budgetIndication: 'budget' | 'standard' | 'premium' | 'luxury' | 'unspecified';
  };
  searchKeywords: string[];
  semanticEmbedding: string; // Processed text for semantic search
  processingTime: number;
}

export class GenAIRequirementAnalyzer {
  private static instance: GenAIRequirementAnalyzer;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not found. Please set GEMINI_API_KEY or GOOGLE_AI_API_KEY in environment variables.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  static getInstance(): GenAIRequirementAnalyzer {
    if (!GenAIRequirementAnalyzer.instance) {
      GenAIRequirementAnalyzer.instance = new GenAIRequirementAnalyzer();
    }
    return GenAIRequirementAnalyzer.instance;
  }

  /**
   * Analyze buyer requirements using GenAI
   */
  async analyzeRequirements(requirementText: string): Promise<GenAIRequirementAnalysis> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Analyzing requirements with GenAI: "${requirementText}"`);
      
      const prompt = this.buildAnalysisPrompt(requirementText);
      const result = await this.model.generateContent(prompt);
   