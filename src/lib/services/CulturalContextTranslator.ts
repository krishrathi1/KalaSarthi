/**
 * Cultural Context Translator
 * Advanced translation service that preserves cultural context and craft-specific terminology
 */

import { Translate } from '@google-cloud/translate/build/src/v2';

const translate = new Translate({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: {
    conversationHistory?: any[];
    artisanSpecialization?: string;
    culturalContext?: string;
  };
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives: string[];
  culturalContext?: string;
  metadata: {
    service: string;
    craftTermsPreserved: string[];
    culturalNotesAdded: string[];
    confidence: number;
  };
}

export class CulturalContextTranslator {
  private static instance: CulturalContextTranslator;
  
  // Craft-specific terminology that should be preserved
  private craftTerminology = new Map([
    // Pottery terms
    ['pottery', { hi: 'मिट्टी के बर्तन', preserveOriginal: true }],
    ['ceramic', { hi: 'सिरेमिक', preserveOriginal: true }],
    ['kiln', { hi: 'भट्ठा', preserveOriginal: false }],
    ['glazing', { hi: 'चमकाना', preserveOriginal: false }],
    ['terracotta', { hi: 'टेराकोटा', preserveOriginal: true }],
    
    // Textile terms
    ['handloom', { hi: 'हथकरघा', preserveOriginal: false }],
    ['weaving', { hi: 'बुनाई', preserveOriginal: false }],
    ['embroidery', { hi: 'कढ़ाई', preserveOriginal: false }],
    ['silk', { hi: 'रेशम', preserveOriginal: false }],
    ['cotton', { hi: 'कपास', preserveOriginal: false }],
    
    // Jewelry terms
    ['goldsmith', { hi: 'सुनार', preserveOriginal: false }],
    ['filigree', { hi: 'तारकशी', preserveOriginal: false }],
    ['kundan', { hi: 'कुंदन', preserveOriginal: true }],
    ['meenakari', { hi: 'मीनाकारी', preserveOriginal: true }],
    
    // Woodwork terms
    ['carving', { hi: 'नक्काशी', preserveOriginal: false }],
    ['inlay', { hi: 'जड़ाई', preserveOriginal: false }],
    ['teak', { hi: 'सागौन', preserveOriginal: false }],
    ['rosewood', { hi: 'शीशम', preserveOriginal: false }],
    
    // General craft terms
    ['artisan', { hi: 'कारीगर', preserveOriginal: false }],
    ['handicraft', { hi: 'हस्तशिल्प', preserveOriginal: false }],
    ['traditional', { hi: 'पारंपरिक', preserveOriginal: false }],
    ['heritage', { hi: 'विरासत', preserveOriginal: false }]
  ]);
  
  // Cultural context patterns
  private culturalPatterns = [
    {
      pattern: /namaste|namaskar/gi,
      context: 'Traditional Indian greeting - respectful salutation',
      preserve: true
    },
    {
      pattern: /ji\b/gi,
      context: 'Respectful suffix in Hindi - shows politeness',
      preserve: true
    },
    {
      pattern: /guru|guruji/gi,
      context: 'Master craftsperson - term of respect for skilled artisan',
      preserve: true
    },
    {
      pattern: /beta|beti/gi,
      context: 'Affectionate terms (son/daughter) - shows warmth',
      preserve: true
    }
  ];
  
  static getInstance(): CulturalContextTranslator {
    if (!CulturalContextTranslator.instance) {
      CulturalContextTranslator.instance = new CulturalContextTranslator();
    }
    return CulturalContextTranslator.instance;
  }
  
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    try {
      // Pre-process text to identify craft terms and cultural elements
      const preprocessResult = this.preprocessText(request.text, request.sourceLanguage);
      
      // Perform translation with context
      const [translation, alternatives] = await Promise.all([
        this.performContextualTranslation(preprocessResult.processedText, request),
        this.getAlternativeTranslations(request.text, request.sourceLanguage, request.targetLanguage)
      ]);
      
      // Post-process to restore craft terms and add cultural context
      const postprocessResult = this.postprocessTranslation(
        translation,
        preprocessResult,
        request.targetLanguage
      );
      
      // Calculate confidence based on various factors
      const confidence = this.calculateConfidence(
        request.text,
        postprocessResult.finalText,
        preprocessResult.craftTermsFound.length,
        preprocessResult.culturalElementsFound.length
      );
      
      return {
        translatedText: postprocessResult.finalText,
        originalText: request.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence,
        alternatives: alternatives.slice(0, 3),
        culturalContext: postprocessResult.culturalNotes.join('; '),
        metadata: {
          service: 'cultural-context-translator',
          craftTermsPreserved: preprocessResult.craftTermsFound,
          culturalNotesAdded: postprocessResult.culturalNotes,
          confidence
        }
      };
      
    } catch (error) {
      console.error('Cultural translation error:', error);
      throw error;
    }
  }
  
  private preprocessText(text: string, sourceLanguage: string) {
    const craftTermsFound: string[] = [];
    const culturalElementsFound: string[] = [];
    let processedText = text;
    
    // Identify and mark craft terms
    for (const [term, translations] of this.craftTerminology.entries()) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(text)) {
        craftTermsFound.push(term);
        if (translations.preserveOriginal) {
          // Mark for preservation
          processedText = processedText.replace(regex, `[PRESERVE:${term}]`);
        }
      }
    }
    
    // Identify cultural elements
    for (const pattern of this.culturalPatterns) {
      if (pattern.pattern.test(text)) {
        const matches = text.match(pattern.pattern) || [];
        culturalElementsFound.push(...matches);
        if (pattern.preserve) {
          processedText = processedText.replace(pattern.pattern, (match) => `[CULTURAL:${match}]`);
        }
      }
    }
    
    return {
      processedText,
      craftTermsFound,
      culturalElementsFound,
      originalText: text
    };
  }
  
  private async performContextualTranslation(text: string, request: TranslationRequest): Promise<string> {
    // Add context hints for better translation
    let contextualText = text;
    
    if (request.context?.artisanSpecialization) {
      contextualText = `[Context: ${request.context.artisanSpecialization} craft] ${text}`;
    }
    
    const [translation] = await translate.translate(contextualText, {
      from: request.sourceLanguage,
      to: request.targetLanguage,
    });
    
    // Remove context hints from translation
    return translation.replace(/\[Context:.*?\]\s*/, '');
  }
  
  private async getAlternativeTranslations(text: string, from: string, to: string): Promise<string[]> {
    try {
      // Get multiple translation options by slightly modifying the input
      const variations = [
        text,
        text.replace(/\b(please|kindly)\b/gi, ''), // Remove politeness markers
        text.replace(/\b(very|really|quite)\b/gi, ''), // Remove intensifiers
      ];
      
      const translations = await Promise.all(
        variations.map(async (variation) => {
          try {
            const [result] = await translate.translate(variation, { from, to });
            return result;
          } catch {
            return null;
          }
        })
      );
      
      // Filter unique translations
      return [...new Set(translations.filter(Boolean) as string[])];
      
    } catch (error) {
      console.error('Alternative translations error:', error);
      return [];
    }
  }
  
  private postprocessTranslation(translation: string, preprocessResult: any, targetLanguage: string) {
    let finalText = translation;
    const culturalNotes: string[] = [];
    
    // Restore preserved terms
    finalText = finalText.replace(/\[PRESERVE:([^\]]+)\]/g, (match, term) => {
      culturalNotes.push(`"${term}" is a specific craft term preserved in original language`);
      return term;
    });
    
    // Restore cultural elements
    finalText = finalText.replace(/\[CULTURAL:([^\]]+)\]/g, (match, element) => {
      const pattern = this.culturalPatterns.find(p => p.pattern.test(element));
      if (pattern) {
        culturalNotes.push(pattern.context);
      }
      return element;
    });
    
    // Add craft-specific translations where appropriate
    for (const craftTerm of preprocessResult.craftTermsFound) {
      const termData = this.craftTerminology.get(craftTerm.toLowerCase());
      if (termData && !termData.preserveOriginal && termData[targetLanguage as keyof typeof termData]) {
        const localTranslation = termData[targetLanguage as keyof typeof termData] as string;
        culturalNotes.push(`"${craftTerm}" translated as "${localTranslation}" in local context`);
      }
    }
    
    return {
      finalText,
      culturalNotes
    };
  }
  
  private calculateConfidence(
    originalText: string,
    translatedText: string,
    craftTermsCount: number,
    culturalElementsCount: number
  ): number {
    let confidence = 0.8; // Base confidence
    
    // Boost confidence for craft terms handled
    confidence += craftTermsCount * 0.05;
    
    // Boost confidence for cultural elements preserved
    confidence += culturalElementsCount * 0.03;
    
    // Reduce confidence for very short texts
    if (originalText.length < 10) {
      confidence -= 0.1;
    }
    
    // Reduce confidence for very long texts (more complex)
    if (originalText.length > 200) {
      confidence -= 0.05;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }
  
  // Method to add new craft terminology
  addCraftTerm(term: string, translations: { [language: string]: string }, preserveOriginal = false) {
    this.craftTerminology.set(term.toLowerCase(), {
      ...translations,
      preserveOriginal
    });
  }
  
  // Method to get craft terminology for a specific language
  getCraftTerms(language: string): string[] {
    const terms: string[] = [];
    for (const [term, data] of this.craftTerminology.entries()) {
      if (data[language as keyof typeof data]) {
        terms.push(term);
      }
    }
    return terms;
  }
}