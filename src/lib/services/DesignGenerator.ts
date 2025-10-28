/**
 * Design Generator Service
 * AI-powered design generation for artisans based on conversation context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface DesignGenerationRequest {
  prompt: string;
  artisanSpecialization: string;
  conversationContext: ConversationContext;
  stylePreferences?: StylePreferences;
  variations?: number;
}

export interface ConversationContext {
  buyerRequirements: string[];
  discussedMaterials: string[];
  mentionedColors: string[];
  sizePreferences: string[];
  culturalReferences: string[];
  priceRange?: { min: number; max: number };
}

export interface StylePreferences {
  style: 'traditional' | 'modern' | 'fusion' | 'minimalist' | 'ornate';
  colorPalette: string[];
  materials: string[];
  techniques: string[];
}

export interface GeneratedDesign {
  id: string;
  imageUrl: string;
  prompt: string;
  description: string;
  specifications: {
    dimensions: string;
    materials: string[];
    techniques: string[];
    estimatedTime: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  metadata: DesignMetadata;
  variations?: GeneratedDesign[];
}

export interface DesignMetadata {
  generatedAt: Date;
  model: string;
  confidence: number;
  artisanSpecialization: string;
  culturalContext: string[];
  estimatedCost: { min: number; max: number };
}

export class DesignGenerator {
  private static instance: DesignGenerator;
  
  // Craft-specific prompt templates
  private promptTemplates = new Map([
    ['pottery', {
      base: 'Create a {style} pottery design for {item} using {materials}',
      details: 'Include traditional pottery techniques, glazing patterns, and functional aspects',
      cultural: 'Incorporate Indian pottery traditions and regional styles'
    }],
    ['jewelry', {
      base: 'Design {style} jewelry piece - {item} using {materials}',
      details: 'Focus on intricate metalwork, stone settings, and wearability',
      cultural: 'Include traditional Indian jewelry motifs and craftsmanship'
    }],
    ['textiles', {
      base: 'Create {style} textile design for {item} using {materials}',
      details: 'Include weaving patterns, embroidery details, and fabric draping',
      cultural: 'Incorporate traditional Indian textile arts and regional patterns'
    }],
    ['woodwork', {
      base: 'Design {style} wooden {item} using {materials}',
      details: 'Include carving details, joinery techniques, and finishing',
      cultural: 'Incorporate traditional Indian woodworking and architectural elements'
    }]
  ]);
  
  static getInstance(): DesignGenerator {
    if (!DesignGenerator.instance) {
      DesignGenerator.instance = new DesignGenerator();
    }
    return DesignGenerator.instance;
  }
  
  async generateDesigns(request: DesignGenerationRequest): Promise<GeneratedDesign[]> {
    try {
      // Generate enhanced prompt
      const enhancedPrompt = await this.generateEnhancedPrompt(request);
      
      // Generate designs using Gemini
      const designs = await this.generateWithGemini(enhancedPrompt, request);
      
      return designs;
      
    } catch (error) {
      console.error('Design generation error:', error);
      throw new Error(`Failed to generate designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async generateAutoPrompt(conversationHistory: any[], artisanSpecialization: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const conversationText = conversationHistory.slice(-10).map(msg => 
      `${msg.senderId}: "${msg.text}"`
    ).join('\n');
    
    const promptGenerationPrompt = `
    Based on this conversation between a buyer and ${artisanSpecialization} artisan, generate a detailed design prompt:
    
    ${conversationText}
    
    Extract:
    1. What the buyer wants (item type, purpose)
    2. Style preferences mentioned
    3. Materials discussed
    4. Size/dimensions mentioned
    5. Colors or patterns mentioned
    6. Cultural or traditional elements
    7. Budget considerations
    
    Generate a comprehensive design prompt for ${artisanSpecialization} that includes:
    - Specific item description
    - Style and aesthetic preferences
    - Materials and techniques
    - Cultural context
    - Functional requirements
    
    Format as a single detailed prompt suitable for AI image generation.
    `;
    
    const result = await model.generateContent(promptGenerationPrompt);
    const response = await result.response;
    
    return response.text().trim();
  }
  
  private async generateEnhancedPrompt(request: DesignGenerationRequest): Promise<string> {
    const template = this.promptTemplates.get(request.artisanSpecialization.toLowerCase());
    if (!template) {
      return request.prompt; // Fallback to original prompt
    }
    
    // Extract context elements
    const context = request.conversationContext;
    const style = request.stylePreferences?.style || 'traditional';
    const materials = context.discussedMaterials.join(', ') || 'traditional materials';
    const colors = context.mentionedColors.join(', ') || 'natural colors';
    
    // Build enhanced prompt
    let enhancedPrompt = template.base
      .replace('{style}', style)
      .replace('{materials}', materials)
      .replace('{item}', this.extractItemType(context.buyerRequirements));
    
    // Add details and cultural context
    enhancedPrompt += `. ${template.details}. ${template.cultural}.`;
    
    // Add specific requirements from conversation
    if (context.buyerRequirements.length > 0) {
      enhancedPrompt += ` Specific requirements: ${context.buyerRequirements.join(', ')}.`;
    }
    
    if (colors !== 'natural colors') {
      enhancedPrompt += ` Color scheme: ${colors}.`;
    }
    
    if (context.culturalReferences.length > 0) {
      enhancedPrompt += ` Cultural elements: ${context.culturalReferences.join(', ')}.`;
    }
    
    // Add quality and style modifiers
    enhancedPrompt += ' High quality, detailed, professional craftsmanship, photorealistic rendering.';
    
    return enhancedPrompt;
  }
  
  private extractItemType(requirements: string[]): string {
    // Extract the main item type from requirements
    const itemKeywords = [
      'bowl', 'vase', 'pot', 'plate', 'cup', // pottery
      'necklace', 'ring', 'bracelet', 'earrings', // jewelry
      'saree', 'scarf', 'cushion', 'tapestry', // textiles
      'table', 'chair', 'box', 'frame', 'sculpture' // woodwork
    ];
    
    for (const requirement of requirements) {
      for (const keyword of itemKeywords) {
        if (requirement.toLowerCase().includes(keyword)) {
          return keyword;
        }
      }
    }
    
    return 'handcrafted item';
  }
  
  private async generateWithGemini(prompt: string, request: DesignGenerationRequest): Promise<GeneratedDesign[]> {
    // For now, we'll simulate design generation since Gemini doesn't directly generate images
    // In production, this would integrate with image generation APIs like DALL-E, Midjourney, or Stable Diffusion
    
    const designs: GeneratedDesign[] = [];
    const variations = request.variations || 3;
    
    for (let i = 0; i < variations; i++) {
      const design: GeneratedDesign = {
        id: `design_${Date.now()}_${i}`,
        imageUrl: `/api/design-placeholder/${request.artisanSpecialization}/${i}`, // Placeholder
        prompt: prompt,
        description: await this.generateDesignDescription(prompt, request.artisanSpecialization),
        specifications: await this.generateSpecifications(request),
        metadata: {
          generatedAt: new Date(),
          model: 'gemini-pro',
          confidence: 0.85,
          artisanSpecialization: request.artisanSpecialization,
          culturalContext: request.conversationContext.culturalReferences,
          estimatedCost: this.estimateCost(request)
        }
      };
      
      designs.push(design);
    }
    
    return designs;
  }
  
  private async generateDesignDescription(prompt: string, specialization: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const descriptionPrompt = `
    Based on this design prompt for ${specialization}: "${prompt}"
    
    Generate a detailed description of the resulting design that includes:
    1. Visual appearance and aesthetics
    2. Materials and textures
    3. Functional aspects
    4. Cultural significance
    5. Craftsmanship details
    
    Keep it concise but informative (2-3 sentences).
    `;
    
    const result = await model.generateContent(descriptionPrompt);
    const response = await result.response;
    
    return response.text().trim();
  }
  
  private async generateSpecifications(request: DesignGenerationRequest): Promise<GeneratedDesign['specifications']> {
    const context = request.conversationContext;
    
    // Extract dimensions from context or use defaults
    const dimensions = context.sizePreferences.length > 0 
      ? context.sizePreferences[0] 
      : this.getDefaultDimensions(request.artisanSpecialization);
    
    // Determine materials
    const materials = context.discussedMaterials.length > 0
      ? context.discussedMaterials
      : this.getDefaultMaterials(request.artisanSpecialization);
    
    // Get techniques for specialization
    const techniques = this.getTechniques(request.artisanSpecialization);
    
    // Estimate time and difficulty
    const estimatedTime = this.estimateTime(request.artisanSpecialization, context);
    const difficultyLevel = this.assessDifficulty(request);
    
    return {
      dimensions,
      materials,
      techniques,
      estimatedTime,
      difficultyLevel
    };
  }
  
  private getDefaultDimensions(specialization: string): string {
    const defaults: { [key: string]: string } = {
      'pottery': '15cm diameter x 10cm height',
      'jewelry': '2cm x 2cm pendant',
      'textiles': '100cm x 150cm fabric piece',
      'woodwork': '30cm x 20cm x 15cm'
    };
    
    return defaults[specialization] || 'Medium size';
  }
  
  private getDefaultMaterials(specialization: string): string[] {
    const materials: { [key: string]: string[] } = {
      'pottery': ['clay', 'glaze', 'natural pigments'],
      'jewelry': ['silver', 'gemstones', 'traditional alloys'],
      'textiles': ['cotton', 'silk', 'natural dyes'],
      'woodwork': ['teak', 'rosewood', 'natural finish']
    };
    
    return materials[specialization] || ['traditional materials'];
  }
  
  private getTechniques(specialization: string): string[] {
    const techniques: { [key: string]: string[] } = {
      'pottery': ['wheel throwing', 'glazing', 'firing'],
      'jewelry': ['metalworking', 'stone setting', 'polishing'],
      'textiles': ['handloom weaving', 'natural dyeing', 'embroidery'],
      'woodwork': ['hand carving', 'joinery', 'finishing']
    };
    
    return techniques[specialization] || ['traditional crafting'];
  }
  
  private estimateTime(specialization: string, context: ConversationContext): string {
    // Base time estimates by specialization
    const baseTimes: { [key: string]: number } = {
      'pottery': 5, // days
      'jewelry': 7,
      'textiles': 10,
      'woodwork': 14
    };
    
    let baseTime = baseTimes[specialization] || 7;
    
    // Adjust based on complexity indicators in context
    if (context.buyerRequirements.some(req => 
      req.includes('intricate') || req.includes('detailed') || req.includes('complex')
    )) {
      baseTime *= 1.5;
    }
    
    if (context.buyerRequirements.some(req => 
      req.includes('simple') || req.includes('basic') || req.includes('minimal')
    )) {
      baseTime *= 0.7;
    }
    
    return `${Math.round(baseTime)} days`;
  }
  
  private assessDifficulty(request: DesignGenerationRequest): 'beginner' | 'intermediate' | 'advanced' {
    const context = request.conversationContext;
    
    // Check for complexity indicators
    const complexityIndicators = [
      'intricate', 'detailed', 'complex', 'advanced', 'masterpiece',
      'जटिल', 'विस्तृत', 'कठिन'
    ];
    
    const simplicityIndicators = [
      'simple', 'basic', 'easy', 'minimal', 'beginner',
      'सरल', 'आसान', 'बुनियादी'
    ];
    
    const allRequirements = context.buyerRequirements.join(' ').toLowerCase();
    
    const hasComplexity = complexityIndicators.some(indicator => 
      allRequirements.includes(indicator)
    );
    
    const hasSimplicity = simplicityIndicators.some(indicator => 
      allRequirements.includes(indicator)
    );
    
    if (hasComplexity) return 'advanced';
    if (hasSimplicity) return 'beginner';
    return 'intermediate';
  }
  
  private estimateCost(request: DesignGenerationRequest): { min: number; max: number } {
    const context = request.conversationContext;
    
    // Base costs by specialization (in INR)
    const baseCosts: { [key: string]: { min: number; max: number } } = {
      'pottery': { min: 500, max: 2000 },
      'jewelry': { min: 2000, max: 15000 },
      'textiles': { min: 1000, max: 5000 },
      'woodwork': { min: 1500, max: 8000 }
    };
    
    let cost = baseCosts[request.artisanSpecialization] || { min: 1000, max: 5000 };
    
    // Adjust based on materials mentioned
    const expensiveMaterials = ['gold', 'silver', 'silk', 'teak', 'rosewood'];
    const hasExpensiveMaterials = context.discussedMaterials.some(material =>
      expensiveMaterials.some(expensive => material.toLowerCase().includes(expensive))
    );
    
    if (hasExpensiveMaterials) {
      cost.min *= 2;
      cost.max *= 3;
    }
    
    // Adjust based on buyer's price range if mentioned
    if (context.priceRange) {
      cost.min = Math.max(cost.min, context.priceRange.min);
      cost.max = Math.min(cost.max, context.priceRange.max);
    }
    
    return cost;
  }
  
  /**
   * Share design in chat
   */
  async shareDesignInChat(design: GeneratedDesign, sessionId: string, artisanId: string): Promise<void> {
    // This would integrate with the chat system to send the design as a message
    console.log(`Sharing design ${design.id} in chat session ${sessionId}`);
    
    // TODO: Implement actual chat integration
    // await chatService.sendDesignMessage(sessionId, artisanId, design);
  }
  
  /**
   * Get design suggestions based on artisan specialization
   */
  getDesignSuggestions(specialization: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'pottery': [
        'Traditional terracotta water pot with intricate patterns',
        'Modern ceramic dinnerware set with minimalist design',
        'Decorative vase with traditional Indian motifs'
      ],
      'jewelry': [
        'Traditional kundan necklace with precious stones',
        'Modern silver bracelet with contemporary design',
        'Ethnic earrings with traditional filigree work'
      ],
      'textiles': [
        'Handwoven silk saree with traditional border',
        'Cotton cushion covers with block print designs',
        'Embroidered wall hanging with cultural motifs'
      ],
      'woodwork': [
        'Carved wooden jewelry box with traditional patterns',
        'Modern coffee table with clean lines',
        'Decorative wall panel with intricate carvings'
      ]
    };
    
    return suggestions[specialization] || [
      'Custom handcrafted item based on your requirements',
      'Traditional design with modern functionality',
      'Unique piece showcasing local craftsmanship'
    ];
  }
}