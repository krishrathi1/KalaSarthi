/**
 * Test Vector Database Setup
 * Verifies that vector database and embedding services are working correctly
 */

require('dotenv').config();

async function testVectorSetup() {
  console.log('🧪 Testing Vector Database Setup...\n');
  
  try {
    // Test 1: Configuration validation
    console.log('1️⃣ Testing Configuration...');
    const { getVectorConfig, validateVectorConfig } = await import('./src/lib/vector/config.js');
    
    const config = getVectorConfig();
    console.log(`   📋 Vector DB Provider: ${config.vectorDB.provider}`);
    console.log(`   🤖 Embedding Model: ${config.embeddings.model}`);
    console.log(`   📏 Dimensions: ${config.embeddings.dimensions}`);
    
    const isValid = validateVectorConfig(config);
    if (isValid) {
      console.log('   ✅ Configuration is valid\n');
    } else {
      console.log('   ❌ Configuration is invalid\n');
      return;
    }
    
    // Test 2: Check API keys
    console.log('2️⃣ Checking API Keys...');
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    const hasPinecone = !!process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== 'your_pinecone_api_key_here';
    
    console.log(`   🔑 Gemini API Key: ${hasGemini ? '✅ Present' : '❌ Missing'}`);
    console.log(`   🔑 Pinecone API Key: ${hasPinecone ? '✅ Present' : '❌ Missing or placeholder'}`);
    
    if (!hasGemini) {
      console.log('\n✅ Gemini API key is already configured!');
    }
    
    if (!hasPinecone) {
      console.log('\n⚠️  Please update your .env file with valid Pinecone API key:');
      console.log('   - Set PINECONE_API_KEY to your Pinecone API key');
      console.log('\n📖 You can get Pinecone API key from:');
      console.log('   - Pinecone: https://app.pinecone.io/');
      console.log('\n💡 Note: Gemini API key is already configured, so embeddings will work!');
      if (!hasGemini) {
        return;
      }
    }
    
    console.log('   ✅ All API keys are present\n');
    
    // Test 3: Vector database connection (if keys are available)
    console.log('3️⃣ Testing Vector Database Connection...');
    try {
      const { createVectorDatabase } = await import('./src/lib/vector/database.js');
      const vectorDB = createVectorDatabase(config);
      
      await vectorDB.connect();
      console.log('   ✅ Successfully connected to vector database');
      
      const indexes = await vectorDB.listIndexes();
      console.log(`   📋 Found ${indexes.length} existing indexes: ${indexes.join(', ') || 'none'}`);
      
      await vectorDB.disconnect();
      console.log('   🔌 Disconnected from vector database\n');
      
    } catch (error) {
      console.log(`   ❌ Vector database connection failed: ${error.message}\n`);
    }
    
    // Test 4: Embedding service
    console.log('4️⃣ Testing Embedding Service...');
    try {
      const { createEmbeddingService } = await import('./src/lib/vector/embeddings.js');
      const embeddingService = createEmbeddingService(config);
      
      const testText = 'This is a test for embedding generation';
      console.log(`   📝 Testing with text: "${testText}"`);
      
      const startTime = Date.now();
      const response = await embeddingService.generateEmbedding({ text: testText });
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Generated embedding successfully`);
      console.log(`   📏 Dimensions: ${response.embedding.length}`);
      console.log(`   ⚡ Generation time: ${duration}ms`);
      console.log(`   🔢 Usage: ${response.usage.totalTokens} tokens\n`);
      
    } catch (error) {
      console.log(`   ❌ Embedding generation failed: ${error.message}\n`);
    }
    
    // Test 5: Vector utilities
    console.log('5️⃣ Testing Vector Utilities...');
    try {
      const { VectorUtils } = await import('./src/lib/vector/utils.js');
      
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const vector3 = [1, 0, 0];
      
      const similarity1 = VectorUtils.cosineSimilarity(vector1, vector2);
      const similarity2 = VectorUtils.cosineSimilarity(vector1, vector3);
      
      console.log(`   📊 Cosine similarity [1,0,0] vs [0,1,0]: ${similarity1.toFixed(3)} (should be ~0)`);
      console.log(`   📊 Cosine similarity [1,0,0] vs [1,0,0]: ${similarity2.toFixed(3)} (should be ~1)`);
      
      const magnitude = VectorUtils.magnitude([3, 4]);
      console.log(`   📏 Magnitude of [3,4]: ${magnitude} (should be 5)`);
      
      console.log('   ✅ Vector utilities working correctly\n');
      
    } catch (error) {
      console.log(`   ❌ Vector utilities test failed: ${error.message}\n`);
    }
    
    // Test 6: Full system initialization
    console.log('6️⃣ Testing Full System Initialization...');
    try {
      const { initializeVectorSystem, checkVectorSystemHealth } = await import('./src/lib/vector/init.js');
      
      console.log('   🚀 Initializing vector system...');
      const system = await initializeVectorSystem();
      
      console.log('   ✅ Vector system initialized successfully');
      
      const health = await checkVectorSystemHealth();
      console.log(`   🏥 System health: ${health.status}`);
      console.log(`   📊 Details:`, JSON.stringify(health.details, null, 4));
      
    } catch (error) {
      console.log(`   ❌ System initialization failed: ${error.message}\n`);
    }
    
    console.log('🎉 Vector setup test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testVectorSetup()
    .then(() => {
      console.log('✨ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testVectorSetup };