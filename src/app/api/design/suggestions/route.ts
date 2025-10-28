/**
 * Design Suggestions API
 * Provides design suggestions based on artisan specialization
 */

import { NextRequest, NextResponse } from 'next/server';
import { DesignGenerator } from '@/lib/services/DesignGenerator';

interface SuggestionsRequest {
  specialization: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionsRequest = await request.json();
    
    // Validate required fields
    if (!body.specialization) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: specialization'
      }, { status: 400 });
    }

    // Initialize design generator
    const designGenerator = DesignGenerator.getInstance();
    
    // Get design suggestions
    const suggestions = designGenerator.getDesignSuggestions(body.specialization);
    
    return NextResponse.json({
      success: true,
      suggestions,
      specialization: body.specialization,
      count: suggestions.length
    });
    
  } catch (error) {
    console.error('Design suggestions error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get suggestions'
    }, { status: 500 });
  }
}