/**
 * Intent Classifier for Artisan Buddy
 * 
 * Analyzes user messages to determine intent and extract entities using
 * Google Cloud Natural Language API and custom classification logic.
 */

import { googleCloudAI } from './GoogleCloudAI';
import { customIntentModel } from './CustomIntentModel';
import {
  Intent,
  IntentType,
  Entity,
  ConversationContext,
  ArtisanContext,
} from '@/lib/types/artisan-buddy';

// Intent patterns for keyword-based fallback
const INTENT_PATTERNS: Record<IntentType, string[]> = {
  navigation: [
    'go to', 'take me to', 'open', 'show me', 'navigate to', 'visit',
    'जाओ', 'खोलो', 'दिखाओ', // Hindi
    'செல்', 'திற', 'காட்டு', // Tamil
  ],
  query_profile: [
    'my profile', 'my details', 'about me', 'my information',
    'मेरी प्रोफाइल', 'मेरी जानकारी', // Hindi
    'என் சுயவிவரம்', // Tamil
  ],
  query_products: [
    'my products', 'product list', 'what products', 'show products',
    'मेरे उत्पाद', 'उत्पाद सूची', // Hindi
    'என் தயாரிப்புகள்', // Tamil
  ],
  query_sales: [
    'sales', 'revenue', 'earnings', 'how much sold', 'sales report',
    'बिक्री', 'आय', 'कमाई', // Hindi
    'விற்பனை', 'வருமானம்', // Tamil
  ],
  query_schemes: [
    'schemes', 'government schemes', 'benefits', 'subsidies', 'loans',
    'योजनाएं', 'सरकारी योजनाएं', 'लाभ', // Hindi
    'திட்டங்கள்', 'அரசு திட்டங்கள்', // Tamil
  ],
  query_craft_knowledge: [
    'how to', 'technique', 'craft', 'material', 'learn', 'tutorial',
    'कैसे करें', 'तकनीक', 'शिल्प', 'सामग्री', // Hindi
    'எப்படி', 'நுட்பம்', 'கைவினை', // Tamil
  ],
  image_analysis: [
    'analyze image', 'check photo', 'look at this', 'what do you think',
    'छवि देखो', 'फोटो जांचो', // Hindi
    'படத்தை பார்', // Tamil
  ],
  create_product: [
    'create product', 'add product', 'new product', 'list product',
    'उत्पाद बनाएं', 'नया उत्पाद', // Hindi
    'தயாரிப்பு உருவாக்கு', // Tamil
  ],
  connect_buyer: [
    'buyer', 'customer', 'connect with buyer', 'find buyer',
    'खरीदार', 'ग्राहक', // Hindi
    'வாங்குபவர்', 'வாடிக்கையாளர்', // Tamil
  ],
  general_chat: [
    'hello', 'hi', 'hey', 'thanks', 'thank you', 'bye', 'goodbye',
    'नमस्ते', 'धन्यवाद', 'अलविदा', // Hindi
    'வணக்கம்', 'நன்றி', // Tamil
  ],
  help: [
    'help', 'what can you do', 'how to use', 'guide', 'support',
    'मदद', 'सहायता', 'गाइड', // Hindi
    'உதவி', 'வழிகாட்டி', // Tamil
  ],
};

// Entity types we're interested in
const RELEVANT_ENTITY_TYPES = [
  'PERSON',
  'LOCATION',
  'ORGANIZATION',
  'EVENT',
  'WORK_OF_ART',
  'CONSUMER_GOOD',
  'NUMBER',
  'PRICE',
  'DATE',
  'OTHER',
];

export class IntentClassifier {
  private static instance: IntentClassifier;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): IntentClassifier {
    if (!IntentClassifier.instance) {
      IntentClassifier.instance = new IntentClassifier();
    }
    return IntentClassifier.instance;
  }

  /**
   * Initialize the intent classifier
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Google Cloud AI services
      await googleCloudAI.initialize();
      
      // Train custom intent model
      customIntentModel.train();
      
      this.isInitialized = true;
      console.log('Intent Classifier: Initialized successfully');
    } catch (error) {
      console.error('Intent Classifier: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure classifier is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Intent Classifier not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Intent Classification
  // ============================================================================

  /**
   * Classify user intent from message
   */
  public async classifyIntent(
    message: string,
    context?: ConversationContext
  ): Promise<Intent> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Extract entities using Google Cloud Natural Language API
      const entities = await this.extractEntities(message);

      // Determine intent type using hybrid approach
      const intentType = await this.determineIntentType(message, entities, context);

      // Calculate confidence score
      const confidence = this.calculateConfidence(message, intentType, entities);

      // Extract parameters from entities
      const parameters = this.extractParameters(entities, intentType);

      const processingTime = Date.now() - startTime;
      console.log(`Intent Classifier: Classified intent "${intentType}" in ${processingTime}ms`);

      return {
        type: intentType,
        confidence,
        entities,
        parameters,
      };
    } catch (error) {
      console.error('Intent Classifier: Error classifying intent:', error);
      
      // Fallback to keyword-based classification
      return this.fallbackClassification(message);
    }
  }

  /**
   * Determine intent type using hybrid approach
   */
  private async determineIntentType(
    message: string,
    entities: Entity[],
    context?: ConversationContext
  ): Promise<IntentType> {
    const messageLower = message.toLowerCase();

    // First, try custom ML model
    const modelPrediction = customIntentModel.predict(message);
    
    // If model is confident, use its prediction
    if (modelPrediction.confidence > 0.7) {
      console.log(`Intent Classifier: Using ML model prediction - ${modelPrediction.intent}`);
      return modelPrediction.intent;
    }

    // Otherwise, fall back to keyword-based matching
    console.log(`Intent Classifier: ML confidence low (${modelPrediction.confidence}), using keyword matching`);

    // Check for image analysis intent (if context has imageUrl)
    if (message.includes('image') || message.includes('photo') || message.includes('picture')) {
      return 'image_analysis';
    }

    // Check for navigation keywords
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.navigation)) {
      return 'navigation';
    }

    // Check for profile queries
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.query_profile)) {
      return 'query_profile';
    }

    // Check for product queries
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.query_products)) {
      return 'query_products';
    }

    // Check for sales queries
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.query_sales)) {
      return 'query_sales';
    }

    // Check for scheme queries
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.query_schemes)) {
      return 'query_schemes';
    }

    // Check for craft knowledge queries
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.query_craft_knowledge)) {
      return 'query_craft_knowledge';
    }

    // Check for product creation
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.create_product)) {
      return 'create_product';
    }

    // Check for buyer connection
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.connect_buyer)) {
      return 'connect_buyer';
    }

    // Check for help
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.help)) {
      return 'help';
    }

    // Check for general chat
    if (this.matchesPattern(messageLower, INTENT_PATTERNS.general_chat)) {
      return 'general_chat';
    }

    // Use context to infer intent
    if (context?.recentTopics && context.recentTopics.length > 0) {
      const lastTopic = context.recentTopics[context.recentTopics.length - 1];
      if (lastTopic && lastTopic in INTENT_PATTERNS) {
        return lastTopic as IntentType;
      }
    }

    // If keyword matching also fails, use ML model prediction anyway
    if (modelPrediction.confidence > 0.3) {
      console.log(`Intent Classifier: Using ML model as final fallback - ${modelPrediction.intent}`);
      return modelPrediction.intent;
    }

    // Default to general chat
    return 'general_chat';
  }

  /**
   * Check if message matches any pattern
   */
  private matchesPattern(message: string, patterns: string[]): boolean {
    return patterns.some(pattern => message.includes(pattern.toLowerCase()));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    message: string,
    intentType: IntentType,
    entities: Entity[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if entities are found
    if (entities.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if pattern match is strong
    const messageLower = message.toLowerCase();
    const patterns = INTENT_PATTERNS[intentType];
    const matchCount = patterns.filter(p => messageLower.includes(p.toLowerCase())).length;
    
    if (matchCount > 0) {
      confidence += Math.min(0.3, matchCount * 0.1);
    }

    // Cap confidence at 1.0
    return Math.min(1.0, confidence);
  }

  /**
   * Extract parameters from entities
   */
  private extractParameters(entities: Entity[], intentType: IntentType): Record<string, any> {
    const parameters: Record<string, any> = {};

    entities.forEach(entity => {
      switch (entity.type) {
        case 'LOCATION':
          parameters.location = entity.value;
          break;
        case 'DATE':
          parameters.date = entity.value;
          break;
        case 'NUMBER':
          parameters.number = entity.value;
          break;
        case 'PRICE':
          parameters.price = entity.value;
          break;
        case 'PERSON':
          parameters.person = entity.value;
          break;
        case 'ORGANIZATION':
          parameters.organization = entity.value;
          break;
        case 'CONSUMER_GOOD':
          parameters.product = entity.value;
          break;
      }
    });

    // Intent-specific parameter extraction
    if (intentType === 'navigation') {
      parameters.destination = this.extractNavigationDestination(entities);
    }

    return parameters;
  }

  /**
   * Extract navigation destination from entities
   */
  private extractNavigationDestination(entities: Entity[]): string | undefined {
    // Look for specific feature names in entities
    const featureNames = [
      'digital khata', 'scheme sahayak', 'buyer connect',
      'product creator', 'heritage storytelling', 'profile',
      'inventory', 'sales', 'marketplace', 'notifications'
    ];

    for (const entity of entities) {
      const valueLower = entity.value.toLowerCase();
      for (const feature of featureNames) {
        if (valueLower.includes(feature)) {
          return feature;
        }
      }
    }

    return undefined;
  }

  /**
   * Fallback classification using keyword matching
   */
  private fallbackClassification(message: string): Intent {
    const messageLower = message.toLowerCase();
    
    // Try to match against patterns
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (this.matchesPattern(messageLower, patterns)) {
        return {
          type: intentType as IntentType,
          confidence: 0.6,
          entities: [],
          parameters: {},
        };
      }
    }

    // Default to general chat
    return {
      type: 'general_chat',
      confidence: 0.5,
      entities: [],
      parameters: {},
    };
  }

  // ============================================================================
  // Entity Extraction (Google Cloud Natural Language API)
  // ============================================================================

  /**
   * Extract entities from message using Google Cloud Natural Language API
   */
  public async extractEntities(message: string): Promise<Entity[]> {
    this.ensureInitialized();

    try {
      const gcpEntities = await googleCloudAI.analyzeEntities(message);
      
      // Convert GCP entities to our Entity format
      const entities: Entity[] = gcpEntities
        .filter((entity: any) => RELEVANT_ENTITY_TYPES.includes(entity.type))
        .map((entity: any) => ({
          type: entity.type,
          value: entity.name,
          confidence: entity.salience || 0.5,
          start: entity.mentions?.[0]?.text?.beginOffset || 0,
          end: (entity.mentions?.[0]?.text?.beginOffset || 0) + (entity.name?.length || 0),
        }));

      console.log(`Intent Classifier: Extracted ${entities.length} entities`);
      return entities;
    } catch (error) {
      console.error('Intent Classifier: Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Extract entities with multilingual support
   */
  public async extractEntitiesMultilingual(
    message: string,
    language: string
  ): Promise<Entity[]> {
    this.ensureInitialized();

    try {
      // If not English, translate to English first for better entity extraction
      let textToAnalyze = message;
      
      if (language !== 'en') {
        const translation = await googleCloudAI.translate(message, 'en', language);
        textToAnalyze = translation.translatedText;
      }

      // Extract entities from English text
      const entities = await this.extractEntities(textToAnalyze);

      console.log(`Intent Classifier: Extracted ${entities.length} entities (multilingual)`);
      return entities;
    } catch (error) {
      console.error('Intent Classifier: Error extracting multilingual entities:', error);
      return [];
    }
  }

  // ============================================================================
  // Sentiment Analysis
  // ============================================================================

  /**
   * Analyze sentiment of message
   */
  public async analyzeSentiment(message: string): Promise<{
    score: number;
    magnitude: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }> {
    this.ensureInitialized();

    try {
      const sentiment = await googleCloudAI.analyzeSentiment(message);
      
      const score = sentiment?.score || 0;
      const magnitude = sentiment?.magnitude || 0;
      
      let sentimentLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (score > 0.25) {
        sentimentLabel = 'positive';
      } else if (score < -0.25) {
        sentimentLabel = 'negative';
      }

      console.log(`Intent Classifier: Sentiment analysis - ${sentimentLabel} (score: ${score})`);
      
      return {
        score,
        magnitude,
        sentiment: sentimentLabel,
      };
    } catch (error) {
      console.error('Intent Classifier: Error analyzing sentiment:', error);
      return {
        score: 0,
        magnitude: 0,
        sentiment: 'neutral',
      };
    }
  }

  // ============================================================================
  // Syntax Analysis
  // ============================================================================

  /**
   * Analyze syntax for complex queries
   */
  public async analyzeSyntax(message: string): Promise<{
    tokens: Array<{
      text: string;
      partOfSpeech: string;
      lemma: string;
    }>;
    isQuestion: boolean;
    isCommand: boolean;
  }> {
    this.ensureInitialized();

    try {
      const tokens = await googleCloudAI.analyzeSyntax(message);
      
      const processedTokens = tokens.map((token: any) => ({
        text: token.text?.content || '',
        partOfSpeech: token.partOfSpeech?.tag || 'UNKNOWN',
        lemma: token.lemma || token.text?.content || '',
      }));

      // Detect if it's a question
      const isQuestion = message.trim().endsWith('?') || 
                        message.toLowerCase().startsWith('what') ||
                        message.toLowerCase().startsWith('how') ||
                        message.toLowerCase().startsWith('why') ||
                        message.toLowerCase().startsWith('when') ||
                        message.toLowerCase().startsWith('where') ||
                        message.toLowerCase().startsWith('who');

      // Detect if it's a command
      const isCommand = processedTokens.length > 0 && 
                       processedTokens[0].partOfSpeech === 'VERB';

      console.log(`Intent Classifier: Syntax analysis - Question: ${isQuestion}, Command: ${isCommand}`);
      
      return {
        tokens: processedTokens,
        isQuestion,
        isCommand,
      };
    } catch (error) {
      console.error('Intent Classifier: Error analyzing syntax:', error);
      return {
        tokens: [],
        isQuestion: false,
        isCommand: false,
      };
    }
  }

  // ============================================================================
  // Context-Aware Classification
  // ============================================================================

  /**
   * Classify intent with full context awareness
   */
  public async classifyWithContext(
    message: string,
    conversationContext: ConversationContext,
    artisanContext: ArtisanContext
  ): Promise<Intent> {
    this.ensureInitialized();

    try {
      // Get base intent
      const intent = await this.classifyIntent(message, conversationContext);

      // Enhance with sentiment
      const sentiment = await this.analyzeSentiment(message);
      intent.parameters.sentiment = sentiment;

      // Enhance with syntax analysis
      const syntax = await this.analyzeSyntax(message);
      intent.parameters.isQuestion = syntax.isQuestion;
      intent.parameters.isCommand = syntax.isCommand;

      // Add artisan-specific context
      intent.parameters.artisanProfession = artisanContext.profile.profession;
      intent.parameters.artisanSpecializations = artisanContext.profile.specializations;

      console.log(`Intent Classifier: Context-aware classification complete`);
      
      return intent;
    } catch (error) {
      console.error('Intent Classifier: Error in context-aware classification:', error);
      return this.fallbackClassification(message);
    }
  }

  // ============================================================================
  // Batch Processing
  // ============================================================================

  /**
   * Classify multiple messages in batch
   */
  public async classifyBatch(
    messages: string[],
    context?: ConversationContext
  ): Promise<Intent[]> {
    this.ensureInitialized();

    try {
      const intents = await Promise.all(
        messages.map(message => this.classifyIntent(message, context))
      );

      console.log(`Intent Classifier: Batch classified ${intents.length} messages`);
      return intents;
    } catch (error) {
      console.error('Intent Classifier: Error in batch classification:', error);
      return messages.map(msg => this.fallbackClassification(msg));
    }
  }

  // ============================================================================
  // Model Management
  // ============================================================================

  /**
   * Get custom model statistics
   */
  public getModelStatistics(): {
    totalExamples: number;
    vocabularySize: number;
    intentCount: number;
    examplesPerIntent: Record<IntentType, number>;
  } {
    return customIntentModel.getStatistics();
  }

  /**
   * Evaluate model accuracy
   */
  public evaluateModel(): {
    accuracy: number;
    confusionMatrix: Record<IntentType, Record<IntentType, number>>;
  } {
    return customIntentModel.evaluate();
  }

  /**
   * Add training example for online learning
   */
  public addTrainingExample(text: string, intent: IntentType, language: string = 'en'): void {
    customIntentModel.addTrainingExample({ text, intent, language });
    console.log(`Intent Classifier: Added training example for intent "${intent}"`);
  }

  /**
   * Get all training data
   */
  public getTrainingData(): Array<{ text: string; intent: IntentType; language: string }> {
    return customIntentModel.getAllTrainingData();
  }
}

// Export singleton instance
export const intentClassifier = IntentClassifier.getInstance();
