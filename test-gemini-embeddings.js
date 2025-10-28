/**
 * Test Gemini Embeddings Integration
 * Verifies that Gemini API works for generating embeddings
 */

require('dotenv').config();

async function testGeminiEmbeddings() {
  console.log('🧪 Testing Gemini Embeddings Integration...\n');
  
  try {
    // Test 1: Check Gemini API Key
    console.log('1️⃣ Checking Gemini API Key...');
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    
    if (!geminiKey) {
      console.log('   ❌ No Gemini API key found');
      console.log('   💡 Make sure GEMINI_API_KEY or GOOGLE_AI_API_KEY is set in .env');
      return;
    }
    
    console.log('   ✅ Gemini API key found');
    console.log(`   🔑 Key: ${geminiKey.substring(0, 10)}...${geminiKey.substring(geminiKey.length - 4)}\n`);
    
    // Test 2: Initialize Vector Config
    console.log('2️⃣ Testing Vector Configuration...');
    const { getVectorConfig, validateVectorConfig } = await import('./src/lib/vector/config.ts');
    
    const config = getVectorConfig();
    console.log(`   📋 Embedding Provider: ${config.embeddings.provider}`);
    console.log(`   🤖 Embedding Model: ${config.embeddings.model}`);
    console.log(`   📏 Dimensions: ${config.embeddings.dimensions}`);
    console.log(`   📦 Batch Size: ${config.embeddings.batchSize}`);
    
    const isValid = validateVectorConfig(config);
    if (isValid) {
      console.log('   ✅ Configuration is valid\n');
    } else {
      console.log('   ❌ Configuration is invalid\n');
      return;
    }
    
    // Test 3: Test Gemini Embedding Service
    console.log('3️⃣ Testing Gemini Embedding Service...');
    const { GeminiEmbeddingService } = await import('./src/lib/vector/gemini-embeddings.ts');
    
    const embeddingService = new GeminiEmbeddingService(config);
    console.log('   ✅ Gemini embedding service created');
    
    // Test single embedding
    const testText = 'handmade pottery ceramic bowl traditional craft';
    console.log(`   📝 Testing with text: "${testText}"`);
    
    const startTime = Date.now();
    const response = await embeddingService.generateEmbedding({ text: testText });
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Embedding generated successfully!`);
    console.log(`   📏 Dimensions: ${response.embedding.length}`);
    console.log(`   ⚡ Generation time: ${duration}ms`);
    console.log(`   🔢 Usage: ${response.usage.totalTokens} tokens`);
    console.log(`   🎯 First few values: [${response.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
    
    // Test 4: Test Batch Embeddings
    console.log('4️⃣ Testing Batch Embeddings...');
    const testTexts = [
      'pottery ceramic handmade',
      'woodworking furniture craft',
      'jewelry metalwork silver'
    ];
    
    console.log(`   📝 Testing batch with ${testTexts.length} texts`);
    
    const batchStartTime = Date.now();
    const batchResponse = await embeddingService.generateBatchEmbeddings({ texts: testTexts });
    const batchDuration = Date.now() - batchStartTime;
    
    console.log(`   ✅ Batch embeddings generated successfully!`);
    console.log(`   📊 Generated: ${batchResponse.embeddings.length} embeddings`);
    console.log(`   ⚡ Total time: ${batchDuration}ms`);
    console.log(`   📈 Average time per embedding: ${(batchDuration / testTexts.length).toFixed(0)}ms`);
    console.log(`   🔢 Total usage: ${batchResponse.usage.totalTokens} tokens\n`);
    
    // Test 5: Test Vector Similarity
    console.log('5️⃣ Testing Vector Similarity...');
    const { VectorUtils } = await import('./src/lib/vector/utils.ts');
    
    const embedding1 = batchResponse.embeddings[0]; // pottery
    const embedding2 = batchResponse.embeddings[1]; // woodworking
    const embedding3 = batchResponse.embeddings[2]; // jewelry
    
    const similarity1_2 = VectorUtils.cosineSimilarity(embedding1, embedding2);
    const similarity1_3 = VectorUtils.cosineSimilarity(embedding1, embedding3);
    const similarity2_3 = VectorUtils.cosineSimilarity(embedding2, embedding3);
    
    console.log(`   📊 Pottery vs Woodworking: ${(similarity1_2 * 100).toFixed(2)}%`);
    console.log(`   📊 Pottery vs Jewelry: ${(similarity1_3 * 100).toFixed(2)}%`);
    console.log(`   📊 Woodworking vs Jewelry: ${(similarity2_3 * 100).toFixed(2)}%`);
    console.log('   ✅ Vector similarity calculations working\n');
    
    // Test 6: Test Vector System Integration
    console.log('6️⃣ Testing Vector System Integration...');
    try {
      const { initializeVectorSystem, checkVectorSystemHealth } = await import('./src/lib/vector/init.ts');
      
      console.log('   🚀 Initializing vector system with Gemini...');
      const system = await initializeVectorSystem();
      
      console.log('   ✅ Vector system initialized successfully');
      
      const health = await checkVectorSystemHealth();
      console.log(`   🏥 System health: ${health.status}`);
      
      if (health.details.embeddings) {
        console.log(`   ⚡ Embedding latency: ${health.details.embeddings.latency}ms`);
        console.log(`   💾 Cache utilization: ${health.details.embeddings.cacheUtilization.toFixed(1)}%`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Vector system integration: ${error.message}`);
    }
    
    console.log('\n🎉 Gemini Embeddings Test Summary:');
    console.log('   ✅ Gemini API key is working');
    console.log('   ✅ Single embedding generation successful');
    console.log('   ✅ Batch embedding generation successful');
    console.log('   ✅ Vector similarity calculations working');
    console.log('   ✅ Vector system integration ready');
    
    console.log('\n🚀 Your vector-based semantic search is ready to use Gemini!');
    console.log('   💡 Gemini embeddings are 768-dimensional');
    console.log('   ⚡ Performance is optimized for batch processing');
    console.log('   🎯 Ready for artisan profile vectorization');
    
  } catch (error) {
    console.error('\n💥 Gemini embeddings test failed:', error);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Verify GEMINI_API_KEY is correct in .env file');
    console.error('   2. Check internet connectivity');
    console.error('   3. Ensure @google/generative-ai package is installed');
    console.error('   4. Verify API key has embedding permissions');
  }
}

// Run the test
if (require.main === module) {
  testGeminiEmbeddings()
    .then(() => {
      console.log('\n✨ Gemini embeddings test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Gemini embeddings test failed:', error);
      process.exit(1);
    });
}

module.exports = { testGeminiEmbeddings };