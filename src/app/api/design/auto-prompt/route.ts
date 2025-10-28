/**
 * Auto Prompt Generation API
 * Generates design prompts based on conversation context
 */

import { NextRequest, NextResponse } from 'next/server';
import { DesignGenerator } from '@/lib/services/DesignGenerator';

interface AutoPromptRequest {
  conversationContext: any;
  artisanSpecialization: string;
  conversationHistory?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AutoPromptRequest = await request.json();
    
    // Validate required fields
    if (!body.conversationContext || !body.artisanSpecialization) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationContext, artisanSpecialization'
      }, { status: 400 });
    }

    // Initialize design generator
    const designGenerator = DesignGenerator.getInstance();
    
    // Generate auto prompt from conversation context
    let prompt = '';
    
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      // Use conversation history if available
      prompt = await designGenerator.generateAutoPrompt(
        body.conversationHistory, 
        body.artisanSpecialization
      );
    } else {
      // Generate from conversation context
      prompt = generatePromptFromContext(body.conversationContext, body.artisanSpecialization);
    }
    
    return NextResponse.json({
      success: true,
      prompt,
      metadata: {
        generatedAt: new Date(),
        specialization: body.artisanSpecialization,
        contextElements: {
          requirements: body.conversationContext.buyerRequirements?.length || 0,
          materials: body.conversationContext.discussedMaterials?.length || 0,
          colors: body.conversationContext.mentionedColors?.length || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Auto prompt generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate prompt'
    }, { status: 500 });
  }
}

function generatePromptFromContext(context: any, specialization: string): string {
  const {
    buyerRequirements = [],
    discussedMaterials = [],
    mentionedColors = [],
    sizePreferences = [],
    culturalReferences = [],
    priceRange
  } = context;

  // Base prompt templates by specialization
  const basePrompts: { [key: string]: string } = {
    pottery: 'Create a beautiful pottery piece',
    jewelry: 'Design an elegant jewelry item',
    textiles: 'Create a traditional textile design',
    woodwork: 'Design a handcrafted wooden item',
    metalwork: 'Create a metal craft piece',
    painting: 'Design an artistic painting',
    sculpture: 'Create a sculptural piece'
  };

  let prompt = basePrompts[specialization.toLowerCase()] || 'Create a handcrafted item';

  // Add buyer requirements
  if (buyerRequirements.length > 0) {
    const mainRequirement = buyerRequirements[0];
    prompt += ` that ${mainRequirement.toLowerCase()}`;
  }

  // Add materials
  if (discussedMaterials.length > 0) {
    prompt += ` using ${discussedMaterials.slice(0, 3).join(', ')}`;
  }

  // Add colors
  if (mentionedColors.length > 0) {
    prompt += ` with ${mentionedColors.slice(0, 2).join(' and ')} colors`;
  }

  // Add size preferences
  if (sizePreferences.length > 0) {
    prompt += ` in ${sizePreferences[0]} size`;
  }

  // Add cultural context
  if (culturalReferences.length > 0) {
    prompt += ` incorporating ${culturalReferences.slice(0, 2).join(' and ')} elements`;
  }

  // Add style based on specialization
  const styleModifiers: { [key: string]: string } = {
    pottery: 'with traditional Indian pottery techniques and glazing patterns',
    jewelry: 'with intricate metalwork and traditional Indian jewelry motifs',
    textiles: 'with handwoven patterns and traditional Indian textile arts',
    woodwork: 'with detailed carving and traditional Indian woodworking',
    metalwork: 'with traditional metalworking techniques and Indian designs',
    painting: 'in traditional Indian art style with cultural motifs',
    sculpture: 'with traditional Indian sculptural elements'
  };

  prompt += ` ${styleModifiers[specialization.toLowerCase()] || 'with traditional craftsmanship'}`;

  // Add quality modifiers
  prompt += '. High quality, detailed craftsmanship, photorealistic rendering, professional presentation.';

  // Add price consideration if mentioned
  if (priceRange) {
    if (priceRange.max > 10000) {
      prompt += ' Premium quality with luxury finishing.';
    } else if (priceRange.max < 2000) {
      prompt += ' Simple, elegant design with cost-effective materials.';
    }
  }

  return prompt;
}