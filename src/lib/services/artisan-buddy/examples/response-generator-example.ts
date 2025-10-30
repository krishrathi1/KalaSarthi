/**
 * Response Generator Usage Example
 * 
 * Demonstrates how to use the Response Generator service for generating
 * context-aware responses with caching and optimization.
 */

import { responseGenerator } from '../ResponseGenerator';
import { contextEngine } from '../ContextEngine';
import { intentClassifier } from '../IntentClassifier';
import { conversationManager } from '../ConversationManager';
import type { ResponseGenerationRequest } from '../ResponseGenerator';

/**
 * Example 1: Basic Response Generation
 */
export async function basicResponseGeneration() {
  console.log('=== Example 1: Basic Response Generation ===\n');

  // Initialize session
  const session = await conversationManager.initializeSession('artisan-123', 'en');
  
  // Load artisan context
  const context = await contextEngine.loadArtisanContext('artisan-123');
  
  // Classify user intent
  const userMessage = 'Tell me about my products';
  const intent = await intentClassifier.classifyIntent(userMessage, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  // Get conversation history
  const history = await conversationManager.getHistory(session.id, 5);
  
  // Generate response
  const request: ResponseGenerationRequest = {
    intent,
    context,
    history,
    userMessage,
    language: 'en',
    sessionId: session.id,
  };
  
  const response = await responseGenerator.generateResponse(request);
  
  console.log('User:', userMessage);
  console.log('Response:', response.text);
  console.log('Confidence:', response.confidence);
  console.log('Suggested Actions:', response.suggestedActions);
  console.log('Follow-up Questions:', response.followUpQuestions);
  console.log('\n');
}

/**
 * Example 2: Context-Aware Response with Personalization
 */
export async function contextAwareResponse() {
  console.log('=== Example 2: Context-Aware Response with Personalization ===\n');

  const session = await conversationManager.initializeSession('artisan-456', 'hi');
  const context = await contextEngine.loadArtisanContext('artisan-456');
  
  // Update preferences for formal style and short responses
  context.preferences.communicationStyle = 'formal';
  context.preferences.responseLength = 'short';
  
  const userMessage = 'मेरी बिक्री कैसी चल रही है?'; // How are my sales going?
  const intent = await intentClassifier.classifyIntent(userMessage, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const history = await conversationManager.getHistory(session.id, 5);
  
  const request: ResponseGenerationRequest = {
    intent,
    context,
    history,
    userMessage,
    language: 'hi',
    sessionId: session.id,
  };
  
  const response = await responseGenerator.generateResponse(request, {
    useCache: true,
    includeActions: true,
    includeFollowUps: true,
    maxLength: 200, // Short response
  });
  
  console.log('User:', userMessage);
  console.log('Response:', response.text);
  console.log('Language:', response.language);
  console.log('Style: Formal, Length: Short');
  console.log('\n');
}

/**
 * Example 3: Response with Caching
 */
export async function cachedResponse() {
  console.log('=== Example 3: Response with Caching ===\n');

  const session = await conversationManager.initializeSession('artisan-789', 'en');
  const context = await contextEngine.loadArtisanContext('artisan-789');
  
  const userMessage = 'Hello';
  const intent = await intentClassifier.classifyIntent(userMessage, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const request: ResponseGenerationRequest = {
    intent,
    context,
    history: [],
    userMessage,
    language: 'en',
    sessionId: session.id,
  };
  
  // First call - will generate and cache
  console.log('First call (generating and caching)...');
  const startTime1 = Date.now();
  const response1 = await responseGenerator.generateResponse(request, {
    useCache: true,
  });
  const time1 = Date.now() - startTime1;
  console.log(`Response: ${response1.text}`);
  console.log(`Time: ${time1}ms\n`);
  
  // Second call - will use cache
  console.log('Second call (using cache)...');
  const startTime2 = Date.now();
  const response2 = await responseGenerator.generateResponse(request, {
    useCache: true,
  });
  const time2 = Date.now() - startTime2;
  console.log(`Response: ${response2.text}`);
  console.log(`Time: ${time2}ms`);
  console.log(`Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);
}

/**
 * Example 4: Multi-turn Conversation with History
 */
export async function multiTurnConversation() {
  console.log('=== Example 4: Multi-turn Conversation with History ===\n');

  const session = await conversationManager.initializeSession('artisan-101', 'en');
  const context = await contextEngine.loadArtisanContext('artisan-101');
  
  // Turn 1
  const message1 = 'What products do I have?';
  const intent1 = await intentClassifier.classifyIntent(message1, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const response1 = await responseGenerator.generateResponse({
    intent: intent1,
    context,
    history: [],
    userMessage: message1,
    language: 'en',
    sessionId: session.id,
  });
  
  console.log('Turn 1:');
  console.log('User:', message1);
  console.log('Assistant:', response1.text);
  console.log('\n');
  
  // Store messages
  await conversationManager.processMessage(session.id, {
    id: 'msg-1',
    sessionId: session.id,
    role: 'user',
    content: message1,
    language: 'en',
    timestamp: new Date(),
  });
  
  await conversationManager.processMessage(session.id, {
    id: 'msg-2',
    sessionId: session.id,
    role: 'assistant',
    content: response1.text,
    language: 'en',
    timestamp: new Date(),
  });
  
  // Turn 2 - with context from previous turn
  const message2 = 'Tell me more about the first one';
  const history = await conversationManager.getHistory(session.id, 5);
  const intent2 = await intentClassifier.classifyIntent(message2, {
    recentTopics: ['query_products'],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const response2 = await responseGenerator.generateResponse({
    intent: intent2,
    context,
    history,
    userMessage: message2,
    language: 'en',
    sessionId: session.id,
  });
  
  console.log('Turn 2:');
  console.log('User:', message2);
  console.log('Assistant:', response2.text);
  console.log('(Response uses context from previous turn)');
  console.log('\n');
}

/**
 * Example 5: Response Quality Monitoring
 */
export async function responseQualityMonitoring() {
  console.log('=== Example 5: Response Quality Monitoring ===\n');

  const session = await conversationManager.initializeSession('artisan-202', 'en');
  const context = await contextEngine.loadArtisanContext('artisan-202');
  
  // Generate multiple responses
  const messages = [
    'Show my products',
    'What are my sales?',
    'Tell me about schemes',
  ];
  
  for (const message of messages) {
    const intent = await intentClassifier.classifyIntent(message, {
      recentTopics: [],
      userPreferences: context.preferences,
      pendingActions: [],
    });
    
    await responseGenerator.generateResponse({
      intent,
      context,
      history: [],
      userMessage: message,
      language: 'en',
      sessionId: session.id,
    });
  }
  
  // Get metrics
  const metrics = responseGenerator.getResponseMetrics(session.id);
  
  console.log('Response Quality Metrics:');
  console.log('- Total Responses:', metrics?.totalResponses);
  console.log('- Average Processing Time:', `${metrics?.averageProcessingTime.toFixed(2)}ms`);
  console.log('- Average Confidence:', `${(metrics?.averageConfidence * 100).toFixed(1)}%`);
  console.log('- Cache Hit Rate:', `${(metrics?.cacheHitRate * 100).toFixed(1)}%`);
  console.log('- Average Sources Used:', metrics?.averageSourcesUsed.toFixed(1));
  console.log('\n');
}

/**
 * Example 6: Streaming Response (for long content)
 */
export async function streamingResponse() {
  console.log('=== Example 6: Streaming Response ===\n');

  const session = await conversationManager.initializeSession('artisan-303', 'en');
  const context = await contextEngine.loadArtisanContext('artisan-303');
  
  const userMessage = 'Tell me about traditional pottery techniques in detail';
  const intent = await intentClassifier.classifyIntent(userMessage, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const request: ResponseGenerationRequest = {
    intent,
    context,
    history: [],
    userMessage,
    language: 'en',
    sessionId: session.id,
  };
  
  console.log('User:', userMessage);
  console.log('Assistant (streaming): ');
  
  // Stream response chunks
  for await (const chunk of responseGenerator.streamResponse(request)) {
    process.stdout.write(chunk);
  }
  
  console.log('\n\n');
}

/**
 * Example 7: Fallback Response on Error
 */
export async function fallbackResponse() {
  console.log('=== Example 7: Fallback Response on Error ===\n');

  const session = await conversationManager.initializeSession('artisan-404', 'en');
  const context = await contextEngine.loadArtisanContext('artisan-404');
  
  // Simulate an error scenario
  const userMessage = 'Complex query that might fail';
  const intent = await intentClassifier.classifyIntent(userMessage, {
    recentTopics: [],
    userPreferences: context.preferences,
    pendingActions: [],
  });
  
  const request: ResponseGenerationRequest = {
    intent,
    context,
    history: [],
    userMessage,
    language: 'en',
    sessionId: session.id,
  };
  
  try {
    const response = await responseGenerator.generateResponse(request);
    console.log('Response:', response.text);
    console.log('Confidence:', response.confidence);
    
    if (response.confidence < 0.7) {
      console.log('⚠️ Low confidence - fallback response used');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await basicResponseGeneration();
    await contextAwareResponse();
    await cachedResponse();
    await multiTurnConversation();
    await responseQualityMonitoring();
    await streamingResponse();
    await fallbackResponse();
    
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
