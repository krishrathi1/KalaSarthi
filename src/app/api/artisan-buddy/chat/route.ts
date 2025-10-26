import { NextRequest, NextResponse } from 'next/server';
import { SpeechToTextService } from '@/lib/service/SpeechToTextService';
import { TextToSpeechService } from '@/lib/service/TextToSpeechService';
import { EnhancedTextToSpeechService } from '@/lib/service/EnhancedTextToSpeechService';
import { ActionAwareTTSService } from '@/lib/service/ActionAwareTTSService';
import { TranslationService } from '@/lib/service/TranslationService';
import { ChatStorageService } from '@/lib/service/ChatStorageService';
import { FastResponseCache } from '@/lib/service/FastResponseCache';
import { FastResponseGenerator } from '@/lib/service/FastResponseGenerator';
import { DialogflowService } from '@/lib/service/DialogflowService';
import { NavigationService } from '@/lib/service/NavigationService';
import { VectorStoreService } from '@/lib/service/VectorStoreService';
import { EnhancedChatbotService } from '@/lib/service/EnhancedChatbotService';

// Language detection function
function detectLanguage(text: string): string {
  const hindiWords = ['मैं', 'मुझे', 'है', 'हैं', 'का', 'की', 'के', 'को', 'से', 'पर', 'में', 'नया', 'बनाना', 'चाहिए', 'करना', 'होना', 'ek', 'hai', 'karna', 'mujhe'];
  const englishWords = ['i', 'me', 'my', 'you', 'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'create', 'make', 'new', 'product'];

  const lowerText = text.toLowerCase();
  const hindiCount = hindiWords.filter(word => lowerText.includes(word)).length;
  const englishCount = englishWords.filter(word => lowerText.includes(word)).length;

  if (Math.abs(hindiCount - englishCount) <= 2) {
    if (lowerText.includes('mujhe') || lowerText.includes('hai') || lowerText.includes('karna')) {
      return 'hi';
    }
  }

  return hindiCount > englishCount ? 'hi' : 'en';
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      language,
      enableTranslation,
      enableVoice,
      isVoice,
      userId,
      fastMode,
      artisanId,
      useDialogflow = true,
      useVectorSearch = true
    } = await request.json();

    const currentUserId = userId || 'default-user';

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const enhancedChatbotService = EnhancedChatbotService.getInstance();
    const chatStorageService = ChatStorageService.getInstance();
    const fastResponseCache = FastResponseCache.getInstance();
    const fastResponseGenerator = FastResponseGenerator.getInstance();
    const actionAwareTtsService = ActionAwareTTSService.getInstance();
    const translationService = TranslationService.getInstance();

    let processedMessage = message;
    let responseLanguage = language || 'en-US';

    // Detect language if not provided
    if (!language) {
      const detectedLang = detectLanguage(message);
      responseLanguage = detectedLang === 'hi' ? 'hi-IN' : 'en-US';
    }

    // Check cache first for fast responses
    if (fastMode) {
      const cachedResponse = fastResponseCache.get(message, responseLanguage);
      if (cachedResponse) {
        console.log('⚡ Fast cache response');
        return NextResponse.json({
          response: cachedResponse.response,
          language: cachedResponse.language,
          audio: cachedResponse.audioUrl,
          isFast: true,
          fromCache: true
        });
      }

      // Try fast response generator
      const fastResponse = fastResponseGenerator.getFastResponse(message, responseLanguage);
      if (fastResponse) {
        console.log('⚡ Fast generated response');

        // Cache the response
        fastResponseCache.set(message, responseLanguage, fastResponse.response);

        return NextResponse.json({
          response: fastResponse.response,
          language: responseLanguage,
          shouldNavigate: fastResponse.shouldNavigate,
          navigationTarget: fastResponse.navigationTarget,
          isFast: true,
          fromGenerator: true
        });
      }
    }

    // Handle translation if enabled
    if (enableTranslation && language !== 'en-US') {
      try {
        const translationResult = await translationService.translateText(
          message,
          language,
          'en-US'
        );
        processedMessage = translationResult.translatedText;
      } catch (error) {
        console.error('Translation error:', error);
      }
    }

    // Get or create active chat session
    let activeSession = await chatStorageService.getActiveChatSession(currentUserId);
    if (!activeSession) {
      activeSession = await chatStorageService.createChatSession(
        currentUserId,
        'Artisan Buddy Chat'
      );
    }

    // Save user message
    const userMessage = await chatStorageService.saveMessage({
      userId: currentUserId,
      type: 'user',
      text: message,
      language: responseLanguage,
      isVoice: isVoice || false
    });

    // Add user message to session
    await chatStorageService.addMessageToSession(activeSession.id, userMessage);

    // Process message with enhanced chatbot service
    const chatResponse = await enhancedChatbotService.processMessage(
      processedMessage,
      currentUserId,
      {
        language: responseLanguage,
        artisanId: artisanId,
        useDialogflow: useDialogflow,
        useVectorSearch: useVectorSearch
      }
    );

    let response = chatResponse.response;
    let shouldNavigate = chatResponse.shouldNavigate || false;
    let navigationTarget = chatResponse.navigationTarget || '';

    // Handle translation of response if needed
    if (enableTranslation && language !== 'en-US') {
      try {
        const responseTranslation = await translationService.translateText(
          response,
          'en-US',
          language
        );
        response = responseTranslation.translatedText;
        responseLanguage = language;
      } catch (error) {
        console.error('Response translation error:', error);
      }
    }

    // Save assistant message
    const assistantMessage = await chatStorageService.saveMessage({
      userId: currentUserId,
      type: 'assistant',
      text: response,
      language: responseLanguage,
      isVoice: false,
      metadata: {
        intent: chatResponse.intent,
        confidence: chatResponse.confidence,
        contextUsed: chatResponse.contextUsed,
        sources: chatResponse.sources
      }
    });

    // Add assistant message to session
    await chatStorageService.addMessageToSession(activeSession.id, assistantMessage);

    // Cache the response for future use
    if (fastMode && chatResponse.confidence && chatResponse.confidence > 0.8) {
      fastResponseCache.set(message, responseLanguage, response);
    }

    // Generate voice output if enabled (async, don't block response)
    let audioPromise: Promise<string> | null = null;
    if (enableVoice) {
      audioPromise = (async () => {
        try {
          console.log('Action-Aware TTS Language:', responseLanguage);

          const ttsResult = await actionAwareTtsService.synthesizeWithAction(
            response,
            {
              language: responseLanguage,
              gender: 'FEMALE',
              quality: 'Neural2',
              speed: 1.0,
              pitch: 0.0,
              volume: 1.0,
              enableActions: true
            }
          );

          return Buffer.from(ttsResult.audioBuffer).toString('base64');
        } catch (error) {
          console.error('Action-Aware TTS error:', error);
          return '';
        }
      })();
    }

    // Return response immediately, audio will be generated in background
    const responseData = {
      response,
      language: responseLanguage,
      shouldNavigate: shouldNavigate,
      navigationTarget: navigationTarget,
      intent: chatResponse.intent,
      confidence: chatResponse.confidence,
      contextUsed: chatResponse.contextUsed,
      sources: chatResponse.sources,
      messageId: assistantMessage.id,
      sessionId: activeSession.id,
      isFast: fastMode || false
    };

    // If audio is being generated, add it to the response
    if (audioPromise) {
      try {
        const audio = await audioPromise;
        if (audio) {
          (responseData as any).audio = audio;
        }
      } catch (error) {
        console.error('Audio generation failed:', error);
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Artisan Buddy chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId') || 'default-user';

    const chatStorageService = ChatStorageService.getInstance();
    const messages = await chatStorageService.getChatHistory(userId, limit);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}