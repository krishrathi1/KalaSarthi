/**
 * Artisan Buddy API - Main Message Handling Endpoint
 * 
 * POST /api/artisan-buddy - Process incoming messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { conversationManager } from '@/lib/services/artisan-buddy/ConversationManager';
import { intentClassifier } from '@/lib/services/artisan-buddy/IntentClassifier';
import { responseGenerator } from '@/lib/services/artisan-buddy/ResponseGenerator';
import { navigationRouter } from '@/lib/services/artisan-buddy/NavigationRouter';
import { translationService } from '@/lib/services/artisan-buddy/TranslationService';
import { visionService } from '@/lib/services/artisan-buddy/VisionService';
import { contextEngine } from '@/lib/services/artisan-buddy/ContextEngine';
import { Message } from '@/lib/types/enhanced-artisan-buddy';
import { withAuth, AuthContext } from '@/lib/middleware/artisan-buddy-auth';
import {
  ArtisanBuddyError,
  ErrorType,
  ErrorSeverity,
  createErrorResponse,
  validateInput,
  GracefulDegradation,
} from '@/lib/utils/artisan-buddy-errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/artisan-buddy
 * Process incoming message and generate response
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, authContext) => {
    return handlePost(req, authContext);
  }, {
    requireAuth: false, // Allow unauthenticated for demo
    rateLimit: true,
    logging: true,
  });
}

async function handlePost(request: NextRequest, authContext: AuthContext) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      message,
      sessionId,
      userId,
      language = 'en',
      imageUrl,
      metadata = {},
    } = body;

    // Validate required fields
    const validation = validateInput(body, ['message', 'userId']);
    if (!validation.valid) {
      throw new ArtisanBuddyError(
        ErrorType.VALIDATION_ERROR,
        validation.errors.join(', '),
        {
          severity: ErrorSeverity.LOW,
          statusCode: 400,
          details: { errors: validation.errors },
          requestId: authContext.requestId,
          userId,
        }
      );
    }

    // Get or create session
    let activeSessionId = sessionId;
    let session;

    if (activeSessionId) {
      session = await conversationManager.getSession(activeSessionId);
      if (!session) {
        // Session expired or invalid, create new one
        session = await conversationManager.initializeSession(userId, language);
        activeSessionId = session.id;
      }
    } else {
      // Create new session
      session = await conversationManager.initializeSession(userId, language);
      activeSessionId = session.id;
    }

    // Detect language if not provided or if message is in different language
    let detectedLanguage = language;
    try {
      const detection = await translationService.detectLanguage(message);
      if (detection.confidence > 0.7) {
        detectedLanguage = detection.language;
      }
    } catch (error) {
      console.error('Language detection error:', error);
      // Graceful degradation - use provided language
      detectedLanguage = language;
    }

    // Create user message object
    const userMessage: Message = {
      id: uuidv4(),
      sessionId: activeSessionId,
      role: 'user',
      content: message,
      language: detectedLanguage,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        imageUrl,
      },
    };

    // Store user message
    await conversationManager.processMessage(activeSessionId, userMessage);

    // Get conversation history for context
    const history = await conversationManager.getHistory(activeSessionId, 20);

    // Load artisan context with error handling
    let artisanContext;
    try {
      artisanContext = await contextEngine.loadArtisanContext(userId);
    } catch (error) {
      throw new ArtisanBuddyError(
        ErrorType.CONTEXT_LOAD_ERROR,
        'Failed to load user context',
        {
          severity: ErrorSeverity.HIGH,
          statusCode: 500,
          details: { originalError: error },
          requestId: authContext.requestId,
          userId,
        }
      );
    }

    // Handle image analysis if image is provided
    if (imageUrl) {
      try {
        const visionResult = await visionService.analyzeImage(imageUrl, {
          includeCraftDetection: true,
          includeTextExtraction: false,
        });
        
        // Create response with image analysis
        const analysisResponse = await responseGenerator.generateResponse({
          intent: {
            type: 'image_analysis',
            confidence: 1.0,
            entities: [],
            parameters: { 
              imageAnalysis: visionResult.imageAnalysis,
              craftDetection: visionResult.craftDetection,
              processingTime: visionResult.processingTime,
            },
          },
          context: artisanContext,
          history,
          userMessage: message,
          language: detectedLanguage,
          sessionId: activeSessionId,
        });

        // Store assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          sessionId: activeSessionId,
          role: 'assistant',
          content: analysisResponse.text,
          language: detectedLanguage,
          timestamp: new Date(),
          metadata: {
            intent: 'image_analysis',
            confidence: 1.0,
            processingTime: Date.now() - startTime,
            source: 'assistant',
          },
        };

        await conversationManager.processMessage(activeSessionId, assistantMessage);

        const responseTime = Date.now() - startTime;

        return NextResponse.json({
          response: analysisResponse.text,
          sessionId: activeSessionId,
          messageId: assistantMessage.id,
          language: detectedLanguage,
          suggestedActions: analysisResponse.suggestedActions,
          followUpQuestions: analysisResponse.followUpQuestions,
          metadata: {
            intent: 'image_analysis',
            confidence: 1.0,
            responseTime,
            imageAnalysis: visionResult.imageAnalysis,
          },
        });
      } catch (error) {
        console.error('Image analysis error:', error);
        // Graceful degradation for vision service
        try {
          const { analysis } = await GracefulDegradation.handleVisionFailure(imageUrl);
          
          const fallbackMessage: Message = {
            id: uuidv4(),
            sessionId: activeSessionId,
            role: 'assistant',
            content: analysis.message,
            language: detectedLanguage,
            timestamp: new Date(),
            metadata: {
              intent: 'image_analysis',
              confidence: 0.5,
              source: 'assistant',
            },
          };

          await conversationManager.processMessage(activeSessionId, fallbackMessage);

          return NextResponse.json({
            response: analysis.message,
            sessionId: activeSessionId,
            messageId: fallbackMessage.id,
            language: detectedLanguage,
            degraded: true,
            metadata: {
              intent: 'image_analysis',
              responseTime: Date.now() - startTime,
            },
          });
        } catch (fallbackError) {
          console.error('Vision fallback error:', fallbackError);
          // Continue to normal flow if fallback also fails
        }
      }
    }

    // Classify intent with error handling
    let intent;
    try {
      intent = await intentClassifier.classifyIntent(message, {
        currentIntent: session.context.currentIntent,
        entities: session.context.entities,
        profileContext: session.context.profileContext,
      });
    } catch (error) {
      console.error('Intent classification error:', error);
      // Graceful degradation for intent classification
      const { intent: fallbackIntent } = GracefulDegradation.handleIntentClassificationFailure(message);
      intent = fallbackIntent;
    }

    // Handle navigation intent
    if (intent.type === 'navigation') {
      try {
        const navigationResult = await navigationRouter.getRoute(intent, artisanContext);

        const navResponse = `I'll take you to ${navigationResult.route}. ${
          navigationResult.confirmationMessage || ''
        }`;

        // Store assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          sessionId: activeSessionId,
          role: 'assistant',
          content: navResponse,
          language: detectedLanguage,
          timestamp: new Date(),
          metadata: {
            intent: intent.type,
            confidence: intent.confidence,
            processingTime: Date.now() - startTime,
            source: 'assistant',
          },
        };

        await conversationManager.processMessage(activeSessionId, assistantMessage);

        const responseTime = Date.now() - startTime;

        return NextResponse.json({
          response: navResponse,
          sessionId: activeSessionId,
          messageId: assistantMessage.id,
          language: detectedLanguage,
          shouldNavigate: true,
          navigationTarget: navigationResult.route,
          navigationParameters: navigationResult.parameters,
          requiresConfirmation: navigationResult.requiresConfirmation,
          metadata: {
            intent: intent.type,
            confidence: intent.confidence,
            responseTime,
          },
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fall through to general response generation
      }
    }

    // Generate response using RAG pipeline with error handling
    let generatedResponse;
    try {
      generatedResponse = await responseGenerator.generateResponse({
        intent,
        context: artisanContext,
        history,
        userMessage: message,
        language: detectedLanguage,
        sessionId: activeSessionId,
      });
    } catch (error) {
      console.error('Response generation error:', error);
      // Graceful degradation for response generation
      const { response: fallbackResponse } = GracefulDegradation.handleResponseGenerationFailure(message);
      generatedResponse = {
        text: fallbackResponse,
        language: detectedLanguage,
        confidence: 0.5,
        sources: [],
        suggestedActions: [],
        followUpQuestions: [],
      };
    }

    // Translate response if needed with error handling
    let finalResponse = generatedResponse.text;
    let translationDegraded = false;
    if (detectedLanguage !== 'en' && detectedLanguage !== language) {
      try {
        const translation = await translationService.translate({
          text: generatedResponse.text,
          sourceLanguage: 'en' as any,
          targetLanguage: detectedLanguage as any
        });
        finalResponse = translation.translatedText;
      } catch (error) {
        console.error('Translation error:', error);
        // Graceful degradation for translation
        const { text, degraded } = await GracefulDegradation.handleTranslationFailure(
          generatedResponse.text,
          detectedLanguage
        );
        finalResponse = text;
        translationDegraded = degraded;
      }
    }

    // Store assistant message
    const assistantMessage: Message = {
      id: uuidv4(),
      sessionId: activeSessionId,
      role: 'assistant',
      content: finalResponse,
      language: detectedLanguage,
      timestamp: new Date(),
      metadata: {
        intent: intent.type,
        confidence: intent.confidence,
        processingTime: Date.now() - startTime,
        source: 'assistant',
      },
    };

    await conversationManager.processMessage(activeSessionId, assistantMessage);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      response: finalResponse,
      sessionId: activeSessionId,
      messageId: assistantMessage.id,
      language: detectedLanguage,
      suggestedActions: generatedResponse.suggestedActions,
      followUpQuestions: generatedResponse.followUpQuestions,
      degraded: translationDegraded,
      metadata: {
        intent: intent.type,
        confidence: intent.confidence,
        responseTime,
      },
    });

  } catch (error) {
    console.error('Artisan Buddy API error:', error);
    
    // Use comprehensive error handling
    if (error instanceof ArtisanBuddyError) {
      return createErrorResponse(error, authContext.requestId);
    }
    
    // Handle unexpected errors
    const unexpectedError = new ArtisanBuddyError(
      ErrorType.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Internal server error',
      {
        severity: ErrorSeverity.HIGH,
        statusCode: 500,
        requestId: authContext.requestId,
      }
    );
    
    return createErrorResponse(unexpectedError, authContext.requestId);
  }
}