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
import { interactWithArtisanDigitalTwin } from '@/lib/actions';

// Language detection function
function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const hindiWords = ['मैं', 'मुझे', 'है', 'हैं', 'का', 'की', 'के', 'को', 'से', 'पर', 'में', 'नया', 'बनाना', 'चाहिए', 'करना', 'होना', 'ek', 'hai', 'karna', 'karna', 'mujhe'];
  const englishWords = ['i', 'me', 'my', 'you', 'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'create', 'make', 'new', 'product'];
  
  const lowerText = text.toLowerCase();
  const hindiCount = hindiWords.filter(word => lowerText.includes(word)).length;
  const englishCount = englishWords.filter(word => lowerText.includes(word)).length;
  
  // If it's a close call, check for specific Hindi patterns
  if (Math.abs(hindiCount - englishCount) <= 2) {
    if (lowerText.includes('mujhe') || lowerText.includes('hai') || lowerText.includes('karna')) {
      return 'hi';
    }
  }
  
  return hindiCount > englishCount ? 'hi' : 'en';
}

// Dynamic response generation function with language support and actions
async function generateDynamicResponse(message: string, language: string): Promise<{response: string, shouldNavigate?: boolean, navigationTarget?: string}> {
  const detectedLang = detectLanguage(message);
  const lowerMessage = message.toLowerCase();
  
  // Hindi responses
  if (detectedLang === 'hi') {
    if ((lowerMessage.includes('नया') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('प्रोडक्ट') || lowerMessage.includes('product')) && 
        (lowerMessage.includes('बनाना') || lowerMessage.includes('create') || lowerMessage.includes('करना') || lowerMessage.includes('karna'))) {
      return {
        response: 'बहुत अच्छा! मैं आपको नया प्रोडक्ट बनाने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Smart Product Creator पर ले जाऊं?',
        shouldNavigate: true,
        navigationTarget: '/smart-product-creator'
      };
    }
    
    // Also check for mixed Hindi-English patterns
    if ((lowerMessage.includes('product') && lowerMessage.includes('create')) || 
        (lowerMessage.includes('product') && lowerMessage.includes('karna')) ||
        (lowerMessage.includes('नया') && lowerMessage.includes('product'))) {
      return {
        response: 'बहुत अच्छा! मैं आपको नया प्रोडक्ट बनाने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Smart Product Creator पर ले जाऊं?',
        shouldNavigate: true,
        navigationTarget: '/smart-product-creator'
      };
    }
    
    if (lowerMessage.includes('सेल्स') || lowerMessage.includes('sales') || lowerMessage.includes('कमाई') || lowerMessage.includes('earnings')) {
      return {
        response: 'मैं आपकी सेल्स और कमाई को ट्रैक करने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Finance Dashboard दिखाऊं?',
        shouldNavigate: true,
        navigationTarget: '/finance/dashboard'
      };
    }
    
    if (lowerMessage.includes('ट्रेंड') || lowerMessage.includes('trend') || lowerMessage.includes('लोकप्रिय') || lowerMessage.includes('popular')) {
      return {
        response: 'मैं आपको ट्रेंडिंग डिज़ाइन और लोकप्रिय प्रोडक्ट्स दिखा सकता हूं। क्या आप चाहते हैं कि मैं आपको Trend Spotter पर ले जाऊं?',
        shouldNavigate: true,
        navigationTarget: '/trend-spotter'
      };
    }
    
    if (lowerMessage.includes('बायर') || lowerMessage.includes('buyer') || lowerMessage.includes('ग्राहक') || lowerMessage.includes('customer')) {
      return {
        response: 'मैं आपको संभावित बायर्स से जोड़ने में मदद कर सकता हूं। क्या आप चाहते हैं कि मैं आपको Matchmaking पेज दिखाऊं?',
        shouldNavigate: true,
        navigationTarget: '/matchmaking'
      };
    }
    
    if (lowerMessage.includes('हैलो') || lowerMessage.includes('hello') || lowerMessage.includes('नमस्ते') || lowerMessage.includes('namaste')) {
      return {
        response: 'नमस्ते! मैं आपका Artisan Buddy हूं। मैं आपकी क्राफ्ट बिज़नेस में मदद कर सकता हूं। आज आप क्या करना चाहते हैं?'
      };
    }
    
    return {
      response: `मैं समझ गया कि आपने कहा: "${message}"। मैं आपका Artisan Buddy हूं और मैं आपकी क्राफ्ट बिज़नेस में मदद कर सकता हूं। आप क्या करना चाहते हैं?`
    };
  }
  
  // English responses
  if (lowerMessage.includes('new') && (lowerMessage.includes('product') || lowerMessage.includes('create') || lowerMessage.includes('make'))) {
    return {
      response: 'Great! I can help you create a new product. Would you like me to take you to the Smart Product Creator?',
      shouldNavigate: true,
      navigationTarget: '/smart-product-creator'
    };
  }
  
  if (lowerMessage.includes('sales') || lowerMessage.includes('earnings') || lowerMessage.includes('revenue')) {
    return {
      response: 'I can help you track your sales and earnings. Would you like me to show you the Finance Dashboard?',
      shouldNavigate: true,
      navigationTarget: '/finance/dashboard'
    };
  }
  
  if (lowerMessage.includes('trend') || lowerMessage.includes('popular') || lowerMessage.includes('fashion')) {
    return {
      response: 'I can help you discover trending designs and popular products. Would you like me to take you to the Trend Spotter?',
      shouldNavigate: true,
      navigationTarget: '/trend-spotter'
    };
  }
  
  if (lowerMessage.includes('buyer') || lowerMessage.includes('customer') || lowerMessage.includes('match')) {
    return {
      response: 'I can help you connect with potential buyers. Would you like me to show you the Matchmaking page?',
      shouldNavigate: true,
      navigationTarget: '/matchmaking'
    };
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      response: 'Hello! I\'m your Artisan Buddy. I can help you with your craft business. What would you like to work on today?'
    };
  }
  
  return {
    response: `I understand you said: "${message}". I'm your Artisan Buddy and I can help you with your craft business. What would you like to work on?`
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, language, enableTranslation, enableVoice, isVoice, userId, fastMode } = await request.json();

    // For now, use a default userId if not provided (in production, this should come from proper auth)
    const currentUserId = userId || 'default-user';

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const speechToTextService = SpeechToTextService.getInstance();
    const textToSpeechService = TextToSpeechService.getInstance();
    const enhancedTtsService = EnhancedTextToSpeechService.getInstance();
    const actionAwareTtsService = ActionAwareTTSService.getInstance();
    const translationService = TranslationService.getInstance();
    const chatStorageService = ChatStorageService.getInstance();
    const fastResponseCache = FastResponseCache.getInstance();
    const fastResponseGenerator = FastResponseGenerator.getInstance();
    const dialogflowService = DialogflowService.getInstance();
    const navigationService = NavigationService.getInstance();

    let processedMessage = message;
    let responseLanguage = language || 'en-US';

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
        // Continue with original message if translation fails
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

    // Process the message using Dialogflow intent detection
    let response = '';
    let shouldNavigate = false;
    let navigationTarget = '';
    let actionData: any = null;

    try {
      // Detect intent using Dialogflow service
      const detectedLang = detectLanguage(processedMessage);
      const intentResult = await dialogflowService.detectIntent(processedMessage, detectedLang);
      
      console.log('Intent detected:', intentResult);
      
      // Execute action based on intent
      const taskResult = await navigationService.executeAction(intentResult.intent, intentResult.parameters);
      
      response = intentResult.fulfillmentText;
      shouldNavigate = taskResult.action?.type === 'navigate';
      navigationTarget = taskResult.action?.target || '';
      actionData = taskResult.action;
      
      // Update response language based on detected language
      if (detectedLang === 'hi') {
        responseLanguage = 'hi-IN';
      } else {
        responseLanguage = 'en-US';
      }

      // Cache the response for future use
      if (fastMode) {
        fastResponseCache.set(message, responseLanguage, response);
      }
    } catch (error) {
      console.error('Intent detection error:', error);
      // Fallback to old method
      try {
        const aiResponse = await generateDynamicResponse(processedMessage, language);
        response = aiResponse.response;
        shouldNavigate = aiResponse.shouldNavigate || false;
        navigationTarget = aiResponse.navigationTarget || '';
        
        const detectedLang = detectLanguage(processedMessage);
        if (detectedLang === 'hi') {
          responseLanguage = 'hi-IN';
        } else {
          responseLanguage = 'en-US';
        }
      } catch (fallbackError) {
        console.error('Fallback response generation error:', fallbackError);
        response = `I heard you say: "${processedMessage}". I'm your Artisan Buddy and I'm here to help you with your craft business. How can I assist you today?`;
      }
    }

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
        // Continue with English response if translation fails
      }
    }

    // Save assistant message
    const assistantMessage = await chatStorageService.saveMessage({
      userId: currentUserId,
      type: 'assistant',
      text: response,
      language: responseLanguage,
      isVoice: false
    });

    // Add assistant message to session
    await chatStorageService.addMessageToSession(activeSession.id, assistantMessage);

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
      actionData: actionData,
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
