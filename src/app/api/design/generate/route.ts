/**
 * Design Generation API
 * Generates designs using AI based on conversation context
 */

import { NextRequest, NextResponse } from 'next/server';
import { DesignGenerator, DesignGenerationRequest } from '@/lib/services/DesignGenerator';

export async function POST(request: NextRequest) {
  try {
    const body: DesignGenerationRequest = await request.json();
    
    // Validate required fields
    if (!body.prompt || !body.artisanSpecialization) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: prompt, artisanSpecialization'
      }, { status: 400 });
    }

    // Initialize design generator
    const designGenerator = DesignGenerator.getInstance();
    
    // Generate designs
    const designs = await designGenerator.generateDesigns(body);
    
    return NextResponse.json({
      success: true,
      designs,
      metadata: {
        generatedAt: new Date(),
        prompt: body.prompt,
        specialization: body.artisanSpecialization,
        variations: designs.length
      }
    });
    
  } catch (error) {
    console.error('Design generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate designs'
    }, { status: 500 });
  }
}