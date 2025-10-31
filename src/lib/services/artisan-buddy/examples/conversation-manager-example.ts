/**
 * Conversation Manager - Usage Examples
 * 
 * This file demonstrates how to use the Conversation Manager service
 * for the Artisan Buddy chatbot.
 */

import { v4 as uuidv4 } from 'uuid';
import { conversationManager } from '../ConversationManager';
import { Message } from '@/lib/types/artisan-buddy';

/**
 * Example 1: Basic Conversation Flow
 */
export async function basicConversationExample(userId: string) {
  console.log('=== Basic Conversation Example ===\n');

  // 1. Initialize session
  console.log('1. Initializing session...');
  const session = await conversationManager.initializeSession(userId, 'en');
  console.log(`   Session created: ${session.id}`);
  console.log(`   User: ${session.artisanProfile.name}`);
  console.log(`   Language: ${session.language}\n`);

  // 2. Process user message
  console.log('2. Processing user message...');
  const userMessage: Message = {
    id: uuidv4(),
    sessionId: session.id,
    role: 'user',
    content: 'Show me my sales data for this month',
    language: 'en',
    timestamp: new Date(),
    metadata: {
      intent: 'query_sales',
      confidence: 0.95,
    },
  };

  await conversationManager.processMessage(session.id, userMessage);
  console.log('   User message stored\n');

  // 3. Store assistant response
  console.log('3. Storing assistant response...');
  const assistantMessage: Message = {
    id: uuidv4(),
    sessionId: session.id,
    role: 'assistant',
    content: 'Your sales this month: 25 orders, ₹45,000 revenue',
    language: 'en',
    timestamp: new Date(),
    metadata: {
      intent: 'query_sales',
      confidence: 0.95,
    },
  };

  await conversationManager.processMessage(session.id, assistantMessage);
  console.log('   Assistant response stored\n');

  // 4. Get conversation history
  console.log('4. Retrieving conversation history...');
  const history = await conversationManager.getHistory(session.id);
  console.log(`   Total messages: ${history.length}`);
  history.forEach((msg, idx) => {
    console.log(`   [${idx + 1}] ${msg.role}: ${msg.content}`);
  });
  console.log();

  // 5. End session
  console.log('5. Ending session...');
  await conversationManager.endSession(session.id);
  console.log('   Session ended\n');
}

/**
 * Example 2: Multilingual Conversation
 */
export async function multilingualConversationExample(userId: string) {
  console.log('=== Multilingual Conversation Example ===\n');

  // Initialize session in Hindi
  const session = await conversationManager.initializeSession(userId, 'hi');
  console.log(`Session created in Hindi: ${session.id}\n`);

  // User message in Hindi
  const userMessage: Message = {
    id: uuidv4(),
    sessionId: session.id,
    role: 'user',
    content: 'मेरे उत्पाद दिखाओ',
    language: 'hi',
    timestamp: new Date(),
    metadata: {
      intent: 'query_products',
      confidence: 0.92,
    },
  };

  await conversationManager.processMessage(session.id, userMessage);

  // Assistant response in Hindi
  const assistantMessage: Message = {
    id: uuidv4(),
    sessionId: session.id,
    role: 'assistant',
    content: 'आपके पास 15 उत्पाद हैं। सबसे लोकप्रिय: हस्तनिर्मित मिट्टी के बर्तन',
    language: 'hi',
    timestamp: new Date(),
  };

  await conversationManager.processMessage(session.id, assistantMessage);

  const history = await conversationManager.getHistory(session.id);
  console.log('Conversation in Hindi:');
  history.forEach((msg) => {
    console.log(`${msg.role}: ${msg.content}`);
  });
  console.log();

  await conversationManager.endSession(session.id);
}

/**
 * Example 3: Context Window Management
 */
export async function contextWindowExample(userId: string) {
  console.log('=== Context Window Management Example ===\n');

  const session = await conversationManager.initializeSession(userId, 'en');

  // Simulate a long conversation
  console.log('Simulating 30 messages...');
  for (let i = 1; i <= 30; i++) {
    const message: Message = {
      id: uuidv4(),
      sessionId: session.id,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message ${i}`,
      language: 'en',
      timestamp: new Date(),
    };

    await conversationManager.processMessage(session.id, message);
  }

  // Get context window (last 20 messages)
  console.log('\nGetting context window...');
  const contextWindow = await conversationManager.getContextWindow(session.id);
  console.log(`Context window size: ${contextWindow.length}`);
  console.log(`First message in window: ${contextWindow[0].content}`);
  console.log(`Last message in window: ${contextWindow[contextWindow.length - 1].content}\n`);

  // Get effective context
  const effectiveContext = await conversationManager.getEffectiveContext(session.id);
  console.log('Effective context:');
  console.log(`  Total messages: ${effectiveContext.totalMessages}`);
  console.log(`  Recent messages: ${effectiveContext.recentMessages.length}`);
  console.log(`  Has summary: ${!!effectiveContext.summary}\n`);

  await conversationManager.endSession(session.id);
}

/**
 * Example 4: Message Search
 */
export async function messageSearchExample(userId: string) {
  console.log('=== Message Search Example ===\n');

  const session = await conversationManager.initializeSession(userId, 'en');

  // Add various messages
  const messages = [
    'Show me my sales data',
    'What are my top products?',
    'How much inventory do I have?',
    'Tell me about government schemes',
    'Show me buyer inquiries',
  ];

  for (const content of messages) {
    const message: Message = {
      id: uuidv4(),
      sessionId: session.id,
      role: 'user',
      content,
      language: 'en',
      timestamp: new Date(),
    };
    await conversationManager.processMessage(session.id, message);
  }

  // Search for messages containing "sales"
  console.log('Searching for "sales"...');
  const salesResults = await conversationManager.searchMessages(session.id, 'sales');
  console.log(`Found ${salesResults.length} messages:`);
  salesResults.forEach((msg) => {
    console.log(`  - ${msg.content}`);
  });
  console.log();

  // Search for user messages only
  console.log('Searching for user messages containing "show"...');
  const userResults = await conversationManager.searchMessages(
    session.id,
    'show',
    { role: 'user', limit: 5 }
  );
  console.log(`Found ${userResults.length} user messages:`);
  userResults.forEach((msg) => {
    console.log(`  - ${msg.content}`);
  });
  console.log();

  await conversationManager.endSession(session.id);
}

/**
 * Example 5: Conversation Export
 */
export async function conversationExportExample(userId: string) {
  console.log('=== Conversation Export Example ===\n');

  const session = await conversationManager.initializeSession(userId, 'en');

  // Add some messages
  const messages = [
    { role: 'user' as const, content: 'Hello!' },
    { role: 'assistant' as const, content: 'Hi! How can I help you today?' },
    { role: 'user' as const, content: 'Show me my products' },
    { role: 'assistant' as const, content: 'You have 15 products...' },
  ];

  for (const { role, content } of messages) {
    const message: Message = {
      id: uuidv4(),
      sessionId: session.id,
      role,
      content,
      language: 'en',
      timestamp: new Date(),
    };
    await conversationManager.processMessage(session.id, message);
  }

  // Export as JSON
  console.log('Exporting as JSON...');
  const jsonExport = await conversationManager.exportMessages(session.id, 'json');
  console.log('JSON Export (first 200 chars):');
  console.log(jsonExport.substring(0, 200) + '...\n');

  // Export as text
  console.log('Exporting as text...');
  const textExport = await conversationManager.exportMessages(session.id, 'text');
  console.log('Text Export (first 300 chars):');
  console.log(textExport.substring(0, 300) + '...\n');

  await conversationManager.endSession(session.id);
}

/**
 * Example 6: Context Statistics
 */
export async function contextStatisticsExample(userId: string) {
  console.log('=== Context Statistics Example ===\n');

  const session = await conversationManager.initializeSession(userId, 'en');

  // Add messages
  for (let i = 1; i <= 25; i++) {
    const message: Message = {
      id: uuidv4(),
      sessionId: session.id,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message ${i}`,
      language: 'en',
      timestamp: new Date(),
      metadata: {
        intent: i % 3 === 0 ? 'query_sales' : 'query_products',
      },
    };
    await conversationManager.processMessage(session.id, message);
  }

  // Get statistics
  const stats = await conversationManager.getContextStatistics(session.id);
  console.log('Context Statistics:');
  console.log(`  Total messages: ${stats.totalMessages}`);
  console.log(`  Context window size: ${stats.contextWindowSize}`);
  console.log(`  Has summary: ${stats.hasSummary}`);
  console.log(`  Last activity: ${stats.lastActivity?.toISOString()}`);
  console.log(`  Quality score: ${stats.qualityScore.toFixed(2)}\n`);

  await conversationManager.endSession(session.id);
}

/**
 * Example 7: Session Management
 */
export async function sessionManagementExample(userId: string) {
  console.log('=== Session Management Example ===\n');

  // Create multiple sessions
  console.log('Creating 3 sessions...');
  const session1 = await conversationManager.initializeSession(userId, 'en');
  const session2 = await conversationManager.initializeSession(userId, 'hi');
  const session3 = await conversationManager.initializeSession(userId, 'ta');

  console.log(`Session 1: ${session1.id} (${session1.language})`);
  console.log(`Session 2: ${session2.id} (${session2.language})`);
  console.log(`Session 3: ${session3.id} (${session3.language})\n`);

  // Get active session count
  const activeCount = await conversationManager.getActiveSessionCount();
  console.log(`Active sessions: ${activeCount}\n`);

  // Retrieve a session
  console.log('Retrieving session 1...');
  const retrievedSession = await conversationManager.getSession(session1.id);
  if (retrievedSession) {
    console.log(`Retrieved: ${retrievedSession.id}`);
    console.log(`User: ${retrievedSession.artisanProfile.name}`);
    console.log(`Language: ${retrievedSession.language}\n`);
  }

  // End all sessions
  console.log('Ending all sessions...');
  await conversationManager.endSession(session1.id);
  await conversationManager.endSession(session2.id);
  await conversationManager.endSession(session3.id);
  console.log('All sessions ended\n');
}

/**
 * Run all examples
 */
export async function runAllExamples(userId: string) {
  try {
    await basicConversationExample(userId);
    await multilingualConversationExample(userId);
    await contextWindowExample(userId);
    await messageSearchExample(userId);
    await conversationExportExample(userId);
    await contextStatisticsExample(userId);
    await sessionManagementExample(userId);

    console.log('=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export individual examples for selective testing
export default {
  basicConversationExample,
  multilingualConversationExample,
  contextWindowExample,
  messageSearchExample,
  conversationExportExample,
  contextStatisticsExample,
  sessionManagementExample,
  runAllExamples,
};
