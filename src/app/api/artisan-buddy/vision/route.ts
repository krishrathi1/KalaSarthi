/**
 * Vision Service API Endpoint
 * 
 * Handles image analysis requests for Artisan Buddy
 */

import { NextRequest, NextResponse } from 'next/server';
import { visionService } from '@/lib/services/artisan-buddy';
import { googleCloudAI } from '@/lib/services/artisan-buddy/GoogleCloudAI';

// Initialize Google Cloud AI
googleCloudAI.initialize().catch(console.error);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, options = {} } = body;

    // Validate input
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Analyze image
    const result = await visionService.analyzeImage(imageUrl, {
      includeCraftDetection: options.includeCraftDetection !== false,
      includeTextExtraction: options.includeTextExtraction || false,
      craftAnalysisOptions: options.craftAnalysisOptions || {},
    });

    // Generate improvement suggestions if craft detection was performed
    let suggestions: string[] = [];
    if (result.craftDetection) {
      suggestions = visionService.generateImprovementSuggestions(
        result.imageAnalysis,
        result.craftDetection
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        suggestions,
      },
    });
  } catch (error) {
    console.error('[Vision API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Vision Service API',
    endpoints: {
      POST: {
        description: 'Analyze an image',
        body: {
          imageUrl: 'string (required)',
          options: {
            includeCraftDetection: 'boolean (default: true)',
            includeTextExtraction: 'boolean (default: false)',
            craftAnalysisOptions: {
              detectMaterials: 'boolean (default: true)',
              detectTechniques: 'boolean (default: true)',
              detectRegion: 'boolean (default: true)',
              generateSuggestions: 'boolean (default: true)',
            },
          },
        },
      },
    },
  });
}
