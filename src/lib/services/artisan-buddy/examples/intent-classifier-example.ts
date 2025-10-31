/**
 * Intent Classifier Usage Examples
 * 
 * Demonstrates how to use the Intent Classifier service
 */

import { intentClassifier } from '../IntentClassifier';
import { customIntentModel } from '../CustomIntentModel';

async function runExamples() {
  console.log('='.repeat(80));
  console.log('Intent Classifier Examples');
  console.log('='.repeat(80));

  try {
    // Initialize the classifier
    console.log('\n1. Initializing Intent Classifier...');
    await intentClassifier.initialize();
    console.log('✓ Initialized successfully');

    // Example 1: Basic intent classification
    console.log('\n2. Basic Intent Classification:');
    console.log('-'.repeat(80));
    
    const testMessages = [
      'take me to digital khata',
      'how many products do i have',
      'show my sales report',
      'what schemes are available for me',
      'how to make pottery',
      'hello',
      'help me',
    ];

    for (const message of testMessages) {
      const intent = await intentClassifier.classifyIntent(message);
      console.log(`\nMessage: "${message}"`);
      console.log(`Intent: ${intent.type}`);
      console.log(`Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
      console.log(`Entities: ${intent.entities.length}`);
    }

    // Example 2: Entity extraction
    console.log('\n\n3. Entity Extraction:');
    console.log('-'.repeat(80));
    
    const entityMessage = 'Show me products from Mumbai that cost less than 5000 rupees';
    const entities = await intentClassifier.extractEntities(entityMessage);
    
    console.log(`\nMessage: "${entityMessage}"`);
    console.log(`Extracted ${entities.length} entities:`);
    entities.forEach(entity => {
      console.log(`  - ${entity.type}: "${entity.value}" (confidence: ${(entity.confidence * 100).toFixed(1)}%)`);
    });

    // Example 3: Sentiment analysis
    console.log('\n\n4. Sentiment Analysis:');
    console.log('-'.repeat(80));
    
    const sentimentMessages = [
      'I love this platform, it helps me so much!',
      'This is not working properly',
      'The sales report looks okay',
    ];

    for (const message of sentimentMessages) {
      const sentiment = await intentClassifier.analyzeSentiment(message);
      console.log(`\nMessage: "${message}"`);
      console.log(`Sentiment: ${sentiment.sentiment}`);
      console.log(`Score: ${sentiment.score.toFixed(2)}`);
      console.log(`Magnitude: ${sentiment.magnitude.toFixed(2)}`);
    }

    // Example 4: Syntax analysis
    console.log('\n\n5. Syntax Analysis:');
    console.log('-'.repeat(80));
    
    const syntaxMessage = 'How can I improve my pottery techniques?';
    const syntax = await intentClassifier.analyzeSyntax(syntaxMessage);
    
    console.log(`\nMessage: "${syntaxMessage}"`);
    console.log(`Is Question: ${syntax.isQuestion}`);
    console.log(`Is Command: ${syntax.isCommand}`);
    console.log(`Tokens: ${syntax.tokens.length}`);
    console.log('First 5 tokens:');
    syntax.tokens.slice(0, 5).forEach(token => {
      console.log(`  - "${token.text}" (${token.partOfSpeech})`);
    });

    // Example 5: Model statistics
    console.log('\n\n6. Model Statistics:');
    console.log('-'.repeat(80));
    
    const stats = intentClassifier.getModelStatistics();
    console.log(`\nTotal Training Examples: ${stats.totalExamples}`);
    console.log(`Vocabulary Size: ${stats.vocabularySize}`);
    console.log(`Intent Count: ${stats.intentCount}`);
    console.log('\nExamples per Intent:');
    Object.entries(stats.examplesPerIntent).forEach(([intent, count]) => {
      console.log(`  - ${intent}: ${count}`);
    });

    // Example 6: Model evaluation
    console.log('\n\n7. Model Evaluation:');
    console.log('-'.repeat(80));
    
    const evaluation = intentClassifier.evaluateModel();
    console.log(`\nModel Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);

    // Example 7: Multilingual classification
    console.log('\n\n8. Multilingual Classification:');
    console.log('-'.repeat(80));
    
    const multilingualMessages = [
      { text: 'मेरे उत्पाद दिखाओ', lang: 'hi' },
      { text: 'என் விற்பனை என்ன', lang: 'ta' },
      { text: 'योजनाएं दिखाओ', lang: 'hi' },
    ];

    for (const { text, lang } of multilingualMessages) {
      const intent = await intentClassifier.classifyIntent(text);
      console.log(`\nMessage: "${text}" (${lang})`);
      console.log(`Intent: ${intent.type}`);
      console.log(`Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
    }

    // Example 8: Batch classification
    console.log('\n\n9. Batch Classification:');
    console.log('-'.repeat(80));
    
    const batchMessages = [
      'show my profile',
      'what products do i sell',
      'how much did i earn',
    ];

    const batchIntents = await intentClassifier.classifyBatch(batchMessages);
    console.log(`\nClassified ${batchIntents.length} messages:`);
    batchIntents.forEach((intent, index) => {
      console.log(`  ${index + 1}. "${batchMessages[index]}" → ${intent.type}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('All examples completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export { runExamples };
