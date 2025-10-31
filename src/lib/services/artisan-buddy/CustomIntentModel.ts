/**
 * Custom Intent Classification Model for Artisan Buddy
 * 
 * Implements a custom intent classification model trained on artisan-specific queries.
 * Uses TF-IDF vectorization and cosine similarity for intent matching.
 */

import { IntentType } from '@/lib/types/artisan-buddy';

// Training dataset with artisan-specific queries
export interface TrainingExample {
  text: string;
  intent: IntentType;
  language: string;
}

// Training dataset
const TRAINING_DATA: TrainingExample[] = [
  // Navigation intents
  { text: 'take me to digital khata', intent: 'navigation', language: 'en' },
  { text: 'open scheme sahayak', intent: 'navigation', language: 'en' },
  { text: 'show buyer connect', intent: 'navigation', language: 'en' },
  { text: 'go to my profile', intent: 'navigation', language: 'en' },
  { text: 'navigate to product creator', intent: 'navigation', language: 'en' },
  { text: 'डिजिटल खाता खोलो', intent: 'navigation', language: 'hi' },
  { text: 'योजना सहायक दिखाओ', intent: 'navigation', language: 'hi' },
  { text: 'என் சுயவிவரத்திற்கு செல்', intent: 'navigation', language: 'ta' },

  // Profile queries
  { text: 'what is my profession', intent: 'query_profile', language: 'en' },
  { text: 'show my profile details', intent: 'query_profile', language: 'en' },
  { text: 'tell me about my experience', intent: 'query_profile', language: 'en' },
  { text: 'where am i located', intent: 'query_profile', language: 'en' },
  { text: 'मेरा पेशा क्या है', intent: 'query_profile', language: 'hi' },
  { text: 'मेरी प्रोफाइल दिखाओ', intent: 'query_profile', language: 'hi' },
  { text: 'என் தொழில் என்ன', intent: 'query_profile', language: 'ta' },

  // Product queries
  { text: 'how many products do i have', intent: 'query_products', language: 'en' },
  { text: 'show my product list', intent: 'query_products', language: 'en' },
  { text: 'what products am i selling', intent: 'query_products', language: 'en' },
  { text: 'which products are out of stock', intent: 'query_products', language: 'en' },
  { text: 'मेरे कितने उत्पाद हैं', intent: 'query_products', language: 'hi' },
  { text: 'उत्पाद सूची दिखाओ', intent: 'query_products', language: 'hi' },
  { text: 'என் தயாரிப்புகள் என்ன', intent: 'query_products', language: 'ta' },

  // Sales queries
  { text: 'how much did i sell this month', intent: 'query_sales', language: 'en' },
  { text: 'show my sales report', intent: 'query_sales', language: 'en' },
  { text: 'what is my revenue', intent: 'query_sales', language: 'en' },
  { text: 'which product sold the most', intent: 'query_sales', language: 'en' },
  { text: 'इस महीने मैंने कितना बेचा', intent: 'query_sales', language: 'hi' },
  { text: 'मेरी बिक्री रिपोर्ट दिखाओ', intent: 'query_sales', language: 'hi' },
  { text: 'என் விற்பனை என்ன', intent: 'query_sales', language: 'ta' },

  // Scheme queries
  { text: 'what schemes are available for me', intent: 'query_schemes', language: 'en' },
  { text: 'show government schemes', intent: 'query_schemes', language: 'en' },
  { text: 'am i eligible for any loans', intent: 'query_schemes', language: 'en' },
  { text: 'tell me about subsidies', intent: 'query_schemes', language: 'en' },
  { text: 'मेरे लिए कौन सी योजनाएं हैं', intent: 'query_schemes', language: 'hi' },
  { text: 'सरकारी योजनाएं दिखाओ', intent: 'query_schemes', language: 'hi' },
  { text: 'எனக்கு என்ன திட்டங்கள் உள்ளன', intent: 'query_schemes', language: 'ta' },

  // Craft knowledge queries
  { text: 'how to make pottery', intent: 'query_craft_knowledge', language: 'en' },
  { text: 'what materials do i need for weaving', intent: 'query_craft_knowledge', language: 'en' },
  { text: 'teach me about traditional techniques', intent: 'query_craft_knowledge', language: 'en' },
  { text: 'how to improve my craft quality', intent: 'query_craft_knowledge', language: 'en' },
  { text: 'मिट्टी के बर्तन कैसे बनाएं', intent: 'query_craft_knowledge', language: 'hi' },
  { text: 'बुनाई के लिए क्या चाहिए', intent: 'query_craft_knowledge', language: 'hi' },
  { text: 'மண் பாத்திரம் எப்படி செய்வது', intent: 'query_craft_knowledge', language: 'ta' },

  // Image analysis
  { text: 'analyze this product image', intent: 'image_analysis', language: 'en' },
  { text: 'what do you think of this photo', intent: 'image_analysis', language: 'en' },
  { text: 'check the quality of this image', intent: 'image_analysis', language: 'en' },
  { text: 'इस छवि को देखो', intent: 'image_analysis', language: 'hi' },
  { text: 'இந்த படத்தை பார்', intent: 'image_analysis', language: 'ta' },

  // Product creation
  { text: 'i want to add a new product', intent: 'create_product', language: 'en' },
  { text: 'create a product listing', intent: 'create_product', language: 'en' },
  { text: 'help me list my product', intent: 'create_product', language: 'en' },
  { text: 'नया उत्पाद जोड़ें', intent: 'create_product', language: 'hi' },
  { text: 'புதிய தயாரிப்பு சேர்', intent: 'create_product', language: 'ta' },

  // Buyer connection
  { text: 'show me interested buyers', intent: 'connect_buyer', language: 'en' },
  { text: 'who wants to buy my products', intent: 'connect_buyer', language: 'en' },
  { text: 'connect me with buyers', intent: 'connect_buyer', language: 'en' },
  { text: 'खरीदार दिखाओ', intent: 'connect_buyer', language: 'hi' },
  { text: 'வாங்குபவர்களை காட்டு', intent: 'connect_buyer', language: 'ta' },

  // General chat
  { text: 'hello', intent: 'general_chat', language: 'en' },
  { text: 'hi there', intent: 'general_chat', language: 'en' },
  { text: 'good morning', intent: 'general_chat', language: 'en' },
  { text: 'thank you', intent: 'general_chat', language: 'en' },
  { text: 'thanks for your help', intent: 'general_chat', language: 'en' },
  { text: 'नमस्ते', intent: 'general_chat', language: 'hi' },
  { text: 'धन्यवाद', intent: 'general_chat', language: 'hi' },
  { text: 'வணக்கம்', intent: 'general_chat', language: 'ta' },
  { text: 'நன்றி', intent: 'general_chat', language: 'ta' },

  // Help
  { text: 'what can you do', intent: 'help', language: 'en' },
  { text: 'help me', intent: 'help', language: 'en' },
  { text: 'how do i use this', intent: 'help', language: 'en' },
  { text: 'show me features', intent: 'help', language: 'en' },
  { text: 'मदद करो', intent: 'help', language: 'hi' },
  { text: 'सहायता चाहिए', intent: 'help', language: 'hi' },
  { text: 'உதவி வேண்டும்', intent: 'help', language: 'ta' },
];

// Word frequency for TF-IDF
interface WordFrequency {
  [word: string]: number;
}

// Document frequency
interface DocumentFrequency {
  [word: string]: number;
}

// Intent vectors
interface IntentVector {
  intent: IntentType;
  vector: number[];
  vocabulary: string[];
}

export class CustomIntentModel {
  private static instance: CustomIntentModel;
  private intentVectors: IntentVector[] = [];
  private vocabulary: string[] = [];
  private documentFrequency: DocumentFrequency = {};
  private totalDocuments: number = 0;
  private isTrained: boolean = false;

  private constructor() {}

  public static getInstance(): CustomIntentModel {
    if (!CustomIntentModel.instance) {
      CustomIntentModel.instance = new CustomIntentModel();
    }
    return CustomIntentModel.instance;
  }

  /**
   * Train the model on the training dataset
   */
  public train(): void {
    console.log('Custom Intent Model: Starting training...');
    
    // Group training examples by intent
    const intentGroups = new Map<IntentType, string[]>();
    
    TRAINING_DATA.forEach(example => {
      if (!intentGroups.has(example.intent)) {
        intentGroups.set(example.intent, []);
      }
      intentGroups.get(example.intent)!.push(example.text);
    });

    // Build vocabulary from all documents
    this.buildVocabulary(TRAINING_DATA.map(ex => ex.text));

    // Calculate document frequency
    this.calculateDocumentFrequency(TRAINING_DATA.map(ex => ex.text));

    // Create TF-IDF vectors for each intent
    intentGroups.forEach((texts, intent) => {
      const combinedText = texts.join(' ');
      const vector = this.createTFIDFVector(combinedText);
      
      this.intentVectors.push({
        intent,
        vector,
        vocabulary: this.vocabulary,
      });
    });

    this.isTrained = true;
    console.log(`Custom Intent Model: Training complete. ${this.intentVectors.length} intent vectors created.`);
  }

  /**
   * Build vocabulary from training documents
   */
  private buildVocabulary(documents: string[]): void {
    const wordSet = new Set<string>();
    
    documents.forEach(doc => {
      const words = this.tokenize(doc);
      words.forEach(word => wordSet.add(word));
    });

    this.vocabulary = Array.from(wordSet).sort();
    console.log(`Custom Intent Model: Vocabulary size: ${this.vocabulary.length}`);
  }

  /**
   * Calculate document frequency for each word
   */
  private calculateDocumentFrequency(documents: string[]): void {
    this.totalDocuments = documents.length;
    this.documentFrequency = {};

    documents.forEach(doc => {
      const words = new Set(this.tokenize(doc));
      words.forEach(word => {
        this.documentFrequency[word] = (this.documentFrequency[word] || 0) + 1;
      });
    });
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Calculate term frequency
   */
  private calculateTF(text: string): WordFrequency {
    const words = this.tokenize(text);
    const tf: WordFrequency = {};
    
    words.forEach(word => {
      tf[word] = (tf[word] || 0) + 1;
    });

    // Normalize by document length
    const totalWords = words.length;
    Object.keys(tf).forEach(word => {
      tf[word] = tf[word] / totalWords;
    });

    return tf;
  }

  /**
   * Calculate IDF for a word
   */
  private calculateIDF(word: string): number {
    const df = this.documentFrequency[word] || 0;
    if (df === 0) return 0;
    return Math.log(this.totalDocuments / df);
  }

  /**
   * Create TF-IDF vector for text
   */
  private createTFIDFVector(text: string): number[] {
    const tf = this.calculateTF(text);
    const vector: number[] = [];

    this.vocabulary.forEach(word => {
      const tfValue = tf[word] || 0;
      const idfValue = this.calculateIDF(word);
      vector.push(tfValue * idfValue);
    });

    return this.normalizeVector(vector);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    
    return dotProduct;
  }

  /**
   * Predict intent for a given text
   */
  public predict(text: string): {
    intent: IntentType;
    confidence: number;
    scores: Array<{ intent: IntentType; score: number }>;
  } {
    if (!this.isTrained) {
      this.train();
    }

    // Create TF-IDF vector for input text
    const inputVector = this.createTFIDFVector(text);

    // Calculate similarity with each intent vector
    const scores = this.intentVectors.map(intentVector => ({
      intent: intentVector.intent,
      score: this.cosineSimilarity(inputVector, intentVector.vector),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Get best match
    const bestMatch = scores[0];

    console.log(`Custom Intent Model: Predicted "${bestMatch.intent}" with confidence ${bestMatch.confidence}`);

    return {
      intent: bestMatch.intent,
      confidence: bestMatch.score,
      scores,
    };
  }

  /**
   * Get training data for a specific intent
   */
  public getTrainingExamples(intent: IntentType): TrainingExample[] {
    return TRAINING_DATA.filter(ex => ex.intent === intent);
  }

  /**
   * Get all training data
   */
  public getAllTrainingData(): TrainingExample[] {
    return TRAINING_DATA;
  }

  /**
   * Add new training example (for online learning)
   */
  public addTrainingExample(example: TrainingExample): void {
    TRAINING_DATA.push(example);
    // Retrain model
    this.isTrained = false;
    this.train();
    console.log(`Custom Intent Model: Added new training example for intent "${example.intent}"`);
  }

  /**
   * Get model statistics
   */
  public getStatistics(): {
    totalExamples: number;
    vocabularySize: number;
    intentCount: number;
    examplesPerIntent: Record<IntentType, number>;
  } {
    const examplesPerIntent: Record<string, number> = {};
    
    TRAINING_DATA.forEach(ex => {
      examplesPerIntent[ex.intent] = (examplesPerIntent[ex.intent] || 0) + 1;
    });

    return {
      totalExamples: TRAINING_DATA.length,
      vocabularySize: this.vocabulary.length,
      intentCount: this.intentVectors.length,
      examplesPerIntent: examplesPerIntent as Record<IntentType, number>,
    };
  }

  /**
   * Evaluate model accuracy (for testing)
   */
  public evaluate(): {
    accuracy: number;
    confusionMatrix: Record<IntentType, Record<IntentType, number>>;
  } {
    if (!this.isTrained) {
      this.train();
    }

    let correct = 0;
    const confusionMatrix: Record<string, Record<string, number>> = {};

    TRAINING_DATA.forEach(example => {
      const prediction = this.predict(example.text);
      
      if (!confusionMatrix[example.intent]) {
        confusionMatrix[example.intent] = {};
      }
      
      confusionMatrix[example.intent][prediction.intent] = 
        (confusionMatrix[example.intent][prediction.intent] || 0) + 1;

      if (prediction.intent === example.intent) {
        correct++;
      }
    });

    const accuracy = correct / TRAINING_DATA.length;

    console.log(`Custom Intent Model: Evaluation accuracy: ${(accuracy * 100).toFixed(2)}%`);

    return {
      accuracy,
      confusionMatrix: confusionMatrix as Record<IntentType, Record<IntentType, number>>,
    };
  }
}

// Export singleton instance
export const customIntentModel = CustomIntentModel.getInstance();
