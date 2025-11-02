import { NextRequest, NextResponse } from 'next/server';
import { FastResponseCache } from '@/lib/service/FastResponseCache';
import { FastResponseGenerator } from '@/lib/service/FastResponseGenerator';

export async function POST(request: NextRequest) {
  try {
    const { message, language, userId, artisanId, useDialogflow, useVectorSearch } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const fastResponseCache = FastResponseCache.getInstance();
    const fastResponseGenerator = FastResponseGenerator.getInstance();

    // Check cache first
    const cachedResponse = fastResponseCache.get(message, language);
    if (cachedResponse) {
      console.log('⚡ Stream: Cache hit');
      return NextResponse.json({
        response: cachedResponse.response,
        language: cachedResponse.language,
        isFast: true,
        fromCache: true
      });
    }

    // Try fast response generator
    const fastResponse = fastResponseGenerator.getFastResponse(message, language);
    if (fastResponse) {
      console.log('⚡ Stream: Fast generated response');

      // Cache the response
      fastResponseCache.set(message, language, fastResponse.response);

      return NextResponse.json({
        response: fastResponse.response,
        language: language,
        shouldNavigate: fastResponse.shouldNavigate,
        navigationTarget: fastResponse.navigationTarget,
        isFast: true,
        fromGenerator: true
      });
    }

    // If no fast response available, return a contextual generic response
    let genericResponse = language === 'hi'
      ? 'मैं आपकी बात समझ रहा हूं। कृपया थोड़ा इंतज़ार करें...'
      : 'I understand what you\'re saying. Please wait a moment...';

    // Add context if artisan profile is available
    if (artisanId && useVectorSearch) {
      try {
        const { VectorStoreService } = await import('@/lib/service/VectorStoreService');
        const vectorStore = VectorStoreService.getInstance();
        const profile = vectorStore.getArtisanProfile(artisanId);

        if (profile) {
          const craftName = profile.skills.primary[0] || 'crafts';
          genericResponse = language === 'hi'
            ? `नमस्ते! मैं ${profile.personalInfo.name} का AI असिस्टेंट हूं। मैं ${craftName} के बारे में जानकारी दे सकता हूं। कृपया थोड़ा इंतज़ार करें...`
            : `Hello! I'm ${profile.personalInfo.name}'s AI assistant. I can help with information about ${craftName}. Please wait a moment...`;
        }
      } catch (error) {
        console.error('Error loading artisan context:', error);
      }
    }

    return NextResponse.json({
      response: genericResponse,
      language: language,
      isFast: false,
      needsProcessing: true,
      contextAvailable: !!artisanId
    });

  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
