/**
 * Google Generative AI Service for Intelligent Profession Matching
 * 
 * This service provides AI-powered query analysis, profession detection,
 * and requirement extraction using Google's Generative AI API.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProfessionMappingService, ProfessionMapping } from './ProfessionMappingService';

export interface QueryAnalysis {
  intent: string;
  context: string;
  confidence: number;
  extractedEntities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface Entity {
  name: string;
  type: 'product' | 'material' | 'technique' | 'style' | 'location' | 'other';
  confidence: number;
}

export interface RequirementExtraction {
  products: string[];
  materials: string[];
  techniques: string[];
  styles: string[];
  endUse: string;
  specifications: Record<string, string>;
}

export interface ProfessionDetection {
  primaryProfession: string;
  secondaryProfessions: string[];
  confidence: number;
  reasoning: string;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
}

export class GoogleGenerativeAIService {
  private static instance: GoogleGenerativeAIService;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private apiKey: string;
  private isInitialized: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private professionMapper: ProfessionMappingService;

  private constructor() {
    this.apiKey = this.getApiKey();
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.professionMapper = ProfessionMappingService.getInstance();
    this.isInitialized = true;
  }

  public static getInstance(): GoogleGenerativeAIService {
    if (!GoogleGenerativeAIService.instance) {
      GoogleGenerativeAIService.instance = new GoogleGenerativeAIService();
    }
    return GoogleGenerativeAIService.instance;
  }

  private getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_AI_API_KEY || 
                   process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google AI API key not found. Please set GEMINI_API_KEY, GOOGLE_AI_API_KEY, or NEXT_PUBLIC_GOOGLE_AI_API_KEY in environment variables.');
    }
    
    return apiKey;
  }

  /**
   * Perform health check to verify API connectivity and authentication
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Simple test query to verify API connectivity
      const testPrompt = "Respond with 'OK' if you can process this request.";
      const result = await this.model.generateContent(testPrompt);
      const response = result.response.text();
      
      const responseTime = Date.now() - startTime;
      
      if (response && response.toLowerCase().includes('ok')) {
        return {
          isHealthy: true,
          responseTime
        };
      } else {
        return {
          isHealthy: false,
          responseTime,
          error: 'Unexpected response from API'
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze a buyer query to extract intent, context, and entities
   */
  public async analyzeQuery(query: string): Promise<QueryAnalysis> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildQueryAnalysisPrompt(query);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      if (!response) {
        throw new Error('Empty response from Google AI API');
      }
      
      return this.parseQueryAnalysisResponse(response);
    }, 'analyze query');
  }

  /**
   * Extract specific requirements from a buyer query
   */
  public async extractRequirements(query: string): Promise<RequirementExtraction> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildRequirementExtractionPrompt(query);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      if (!response) {
        throw new Error('Empty response from Google AI API');
      }
      
      return this.parseRequirementExtractionResponse(response);
    }, 'extract requirements');
  }

  /**
   * Detect artisan professions needed for a query
   */
  public async detectProfessions(requirements: RequirementExtraction): Promise<ProfessionDetection> {
    if (!requirements) {
      throw new Error('Requirements cannot be null or undefined');
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildProfessionDetectionPrompt(requirements);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      if (!response) {
        throw new Error('Empty response from Google AI API');
      }
      
      return this.parseProfessionDetectionResponse(response);
    }, 'detect professions');
  }

  /**
   * Enhanced profession detection that combines AI analysis with rule-based mapping
   */
  public async detectProfessionsEnhanced(requirements: RequirementExtraction): Promise<{
    aiDetection: ProfessionDetection;
    mappingResult: ProfessionMapping;
    combinedResult: ProfessionDetection;
  }> {
    if (!requirements) {
      throw new Error('Requirements cannot be null or undefined');
    }

    // Get AI-based detection
    const aiDetection = await this.detectProfessions(requirements);
    
    // Get rule-based mapping
    const mappingResult = this.professionMapper.mapRequirementsToProfessions(requirements);
    
    // Combine results for better accuracy
    const combinedResult = this.combineProfessionResults(aiDetection, mappingResult);
    
    return {
      aiDetection,
      mappingResult,
      combinedResult
    };
  }

  /**
   * Analyze complete query and return comprehensive results
   */
  public async analyzeQueryComplete(query: string): Promise<{
    analysis: QueryAnalysis;
    requirements: RequirementExtraction;
    professions: ProfessionDetection;
    mapping: ProfessionMapping;
  }> {
    const validatedQuery = this.validateQuery(query);
    
    // Run analysis and requirement extraction in parallel
    const [analysis, requirements] = await Promise.all([
      this.analyzeQuery(validatedQuery),
      this.extractRequirements(validatedQuery)
    ]);
    
    // Get enhanced profession detection
    const enhancedResult = await this.detectProfessionsEnhanced(requirements);
    
    return {
      analysis,
      requirements,
      professions: enhancedResult.combinedResult,
      mapping: enhancedResult.mappingResult
    };
  }

  private buildQueryAnalysisPrompt(query: string): string {
    return `
You are an expert artisan marketplace analyst. Analyze the following buyer query and extract key information in JSON format.

Query: "${query}"

EXAMPLES OF GOOD ANALYSIS:
Query: "wooden doors for my hotel"
{
  "intent": "buy",
  "context": "commercial hotel setting requiring durable wooden doors",
  "confidence": 0.9,
  "extractedEntities": [
    {"name": "doors", "type": "product", "confidence": 0.95},
    {"name": "wooden", "type": "material", "confidence": 0.9},
    {"name": "hotel", "type": "location", "confidence": 0.85}
  ],
  "sentiment": "positive"
}

Query: "silver oxidizing earrings"
{
  "intent": "buy",
  "context": "jewelry purchase with specific metalwork technique",
  "confidence": 0.85,
  "extractedEntities": [
    {"name": "earrings", "type": "product", "confidence": 0.95},
    {"name": "silver", "type": "material", "confidence": 0.9},
    {"name": "oxidizing", "type": "technique", "confidence": 0.8}
  ],
  "sentiment": "positive"
}

Now analyze the given query and return a JSON object with this exact structure:
{
  "intent": "buy|commission|browse",
  "context": "brief description of the context or setting",
  "confidence": 0.0-1.0,
  "extractedEntities": [
    {
      "name": "entity name",
      "type": "product|material|technique|style|location|other",
      "confidence": 0.0-1.0
    }
  ],
  "sentiment": "positive|neutral|negative"
}

ANALYSIS GUIDELINES:
- Intent: "buy" for immediate purchase, "commission" for custom work, "browse" for exploration
- Context: Include setting, purpose, or use case mentioned
- Confidence: Higher for clear, specific queries; lower for vague ones
- Entities: Extract all products, materials, techniques, styles, and locations
- Sentiment: Positive for enthusiastic/specific, neutral for factual, negative for complaints

Return ONLY the JSON object, no additional text or formatting.
`;
  }

  private buildRequirementExtractionPrompt(query: string): string {
    return `
You are an expert at extracting detailed requirements from buyer queries for artisan products. Extract specific requirements from this buyer query.

Query: "${query}"

EXAMPLES OF GOOD EXTRACTION:
Query: "handwoven silk sarees for wedding ceremony"
{
  "products": ["sarees"],
  "materials": ["silk"],
  "techniques": ["handwoven"],
  "styles": ["traditional", "ceremonial"],
  "endUse": "wedding ceremony",
  "specifications": {
    "occasion": "wedding",
    "fabric_type": "silk",
    "production_method": "handwoven"
  }
}

Query: "carved wooden dining table for 6 people"
{
  "products": ["dining table"],
  "materials": ["wood"],
  "techniques": ["carved"],
  "styles": [],
  "endUse": "dining room furniture",
  "specifications": {
    "seating_capacity": "6 people",
    "furniture_type": "dining table",
    "decoration": "carved"
  }
}

Query: "wooden doors for my hotel"
{
  "products": ["doors"],
  "materials": ["wood", "wooden"],
  "techniques": ["carpentry", "joinery"],
  "styles": ["commercial"],
  "endUse": "hotel",
  "specifications": {
    "setting": "commercial",
    "purpose": "hotel doors",
    "context": "hospitality business"
  }
}

EXTRACTION GUIDELINES:
- Products: Specific items mentioned (doors, earrings, table, etc.)
- Materials: Raw materials (wood, silver, clay, silk, leather, etc.)
- Techniques: Production methods (carving, weaving, oxidizing, embroidery, etc.)
- Styles: Design styles (traditional, modern, vintage, contemporary, etc.)
- End Use: Purpose, setting, or context (hotel, wedding, kitchen, office, etc.)
- Specifications: Detailed requirements (size, color, quantity, capacity, etc.)

Extract and return a JSON object with this exact structure:
{
  "products": ["list of specific products mentioned"],
  "materials": ["list of materials mentioned"],
  "techniques": ["list of techniques mentioned"],
  "styles": ["list of styles mentioned"],
  "endUse": "intended use or setting",
  "specifications": {
    "key": "value pairs of specific requirements"
  }
}

Be thorough but accurate. If something is not mentioned, use empty arrays or empty strings.
Return ONLY the JSON object, no additional text or formatting.
`;
  }

  private buildProfessionDetectionPrompt(requirements: RequirementExtraction): string {
    return `
Based on the extracted requirements, determine which artisan professions are needed:

Requirements:
- Products: ${requirements.products.join(', ')}
- Materials: ${requirements.materials.join(', ')}
- Techniques: ${requirements.techniques.join(', ')}
- Styles: ${requirements.styles.join(', ')}
- End Use: ${requirements.endUse}
- Specifications: ${JSON.stringify(requirements.specifications)}

Available artisan professions:
- pottery (clay work, ceramics, earthenware, bowls, vases, tiles)
- woodworking (furniture, doors, windows, carpentry, custom woodwork, commercial doors)
- jewelry (precious metals, stones, accessories, rings, necklaces, earrings)
- textiles (weaving, embroidery, fabric work, sarees, carpets, clothing)
- leather work (bags, accessories, decorative items, wallets, belts)
- metalwork (iron, steel, brass work, gates, railings, decorative items)
- painting (canvas, decorative painting, murals, artwork)
- embroidery (thread work, decorative stitching, needlework)

EXAMPLES:
Query: "wooden doors for hotel"
{
  "primaryProfession": "woodworking",
  "secondaryProfessions": [],
  "confidence": 0.95,
  "reasoning": "Clear match for woodworking based on wooden material and doors product. Commercial hotel context confirms need for professional carpentry skills."
}

Query: "silver oxidized earrings"
{
  "primaryProfession": "jewelry",
  "secondaryProfessions": [],
  "confidence": 0.9,
  "reasoning": "Perfect match for jewelry making with silver material, oxidizing technique, and earrings product."
}

Return a JSON object with this structure:
{
  "primaryProfession": "most relevant profession",
  "secondaryProfessions": ["other relevant professions"],
  "confidence": 0.0-1.0,
  "reasoning": "explanation of why these professions were selected"
}

Return only valid JSON without any additional text or formatting.
`;
  }

  private parseQueryAnalysisResponse(response: string): QueryAnalysis {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and provide defaults
      return {
        intent: parsed.intent || 'browse',
        context: parsed.context || '',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        extractedEntities: Array.isArray(parsed.extractedEntities) ? parsed.extractedEntities : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral'
      };
    } catch (error) {
      console.error('Error parsing query analysis response:', error);
      // Return fallback analysis
      return {
        intent: 'browse',
        context: '',
        confidence: 0.3,
        extractedEntities: [],
        sentiment: 'neutral'
      };
    }
  }

  private parseRequirementExtractionResponse(response: string): RequirementExtraction {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and provide defaults
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
        techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
        styles: Array.isArray(parsed.styles) ? parsed.styles : [],
        endUse: parsed.endUse || '',
        specifications: typeof parsed.specifications === 'object' ? parsed.specifications : {}
      };
    } catch (error) {
      console.error('Error parsing requirement extraction response:', error);
      // Return fallback extraction
      return {
        products: [],
        materials: [],
        techniques: [],
        styles: [],
        endUse: '',
        specifications: {}
      };
    }
  }

  private parseProfessionDetectionResponse(response: string): ProfessionDetection {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and provide defaults
      return {
        primaryProfession: parsed.primaryProfession || 'pottery',
        secondaryProfessions: Array.isArray(parsed.secondaryProfessions) ? parsed.secondaryProfessions : [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'Default profession assignment'
      };
    } catch (error) {
      console.error('Error parsing profession detection response:', error);
      // Return fallback detection
      return {
        primaryProfession: 'pottery',
        secondaryProfessions: [],
        confidence: 0.3,
        reasoning: 'Fallback profession assignment due to parsing error'
      };
    }
  }

  /**
   * Execute a function with retry logic for handling API failures
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        console.warn(`Attempt ${attempt}/${this.maxRetries} failed for ${operationName}:`, lastError.message);
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Failed to ${operationName} after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry on authentication errors, invalid API keys, or malformed requests
    return message.includes('api key') ||
           message.includes('authentication') ||
           message.includes('unauthorized') ||
           message.includes('forbidden') ||
           message.includes('invalid request') ||
           message.includes('quota exceeded');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and sanitize query input
   */
  private validateQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new Error('Query cannot be empty or only whitespace');
    }
    
    if (trimmed.length > 5000) {
      throw new Error('Query is too long (maximum 5000 characters)');
    }
    
    return trimmed;
  }

  /**
   * Get service configuration information
   */
  public getConfiguration(): { model: string; isInitialized: boolean; hasApiKey: boolean; maxRetries: number } {
    return {
      model: 'gemini-1.5-flash',
      isInitialized: this.isInitialized,
      hasApiKey: !!this.apiKey,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Combine AI detection results with rule-based mapping for better accuracy
   */
  private combineProfessionResults(
    aiDetection: ProfessionDetection,
    mappingResult: ProfessionMapping
  ): ProfessionDetection {
    // If mapping has high-confidence results, prefer them
    const topMapping = mappingResult.professions[0];
    
    if (topMapping && topMapping.confidence > 0.7) {
      return {
        primaryProfession: topMapping.name,
        secondaryProfessions: mappingResult.professions.slice(1, 3).map(p => p.name),
        confidence: Math.min(0.95, topMapping.confidence + 0.1),
        reasoning: `Combined analysis: ${mappingResult.reasoning}. AI also suggested: ${aiDetection.primaryProfession}`
      };
    }
    
    // If AI has high confidence and mapping agrees, boost confidence
    if (aiDetection.confidence > 0.7 && 
        mappingResult.professions.some(p => p.name === aiDetection.primaryProfession)) {
      return {
        ...aiDetection,
        confidence: Math.min(0.95, aiDetection.confidence + 0.15),
        reasoning: `High confidence from both AI analysis and rule-based mapping. ${aiDetection.reasoning}`
      };
    }
    
    // If AI and mapping disagree, use mapping if it has better factors
    if (topMapping && topMapping.matchingFactors.length > 2) {
      return {
        primaryProfession: topMapping.name,
        secondaryProfessions: [aiDetection.primaryProfession, ...aiDetection.secondaryProfessions].slice(0, 3),
        confidence: (topMapping.confidence + aiDetection.confidence) / 2,
        reasoning: `Rule-based mapping preferred due to strong factor matches: ${topMapping.matchingFactors.join(', ')}`
      };
    }
    
    // Default to AI result with slight confidence boost if mapping supports it
    const confidenceBoost = mappingResult.professions.length > 0 ? 0.05 : 0;
    return {
      ...aiDetection,
      confidence: Math.min(0.95, aiDetection.confidence + confidenceBoost),
      reasoning: aiDetection.reasoning + (mappingResult.professions.length > 0 ? 
        ` (Supported by rule-based analysis)` : ` (Limited rule-based support)`)
    };
  }

  /**
   * Get profession mapping service instance
   */
  public getProfessionMapper(): ProfessionMappingService {
    return this.professionMapper;
  }

  /**
   * Update service configuration
   */
  public updateConfiguration(config: { maxRetries?: number; retryDelay?: number }): void {
    if (config.maxRetries !== undefined && config.maxRetries > 0) {
      this.maxRetries = config.maxRetries;
    }
    
    if (config.retryDelay !== undefined && config.retryDelay > 0) {
      this.retryDelay = config.retryDelay;
    }
  }
}