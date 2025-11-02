/**
 * Test Gemini Chat API (not embeddings)
 */

require('dotenv').config();

async function testGeminiChat() {
  console.log('🧪 Testing Gemini Chat API...\n');
  
  try {
    // Test 1: Check API Key
    console.log('1️⃣ Checking Gemini API Key...');
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    
    if (!geminiKey) {
      console.log('   ❌ No Gemini API key found');
      return;
    }
    
    console.log('   ✅ Gemini API key found');
    console.log(`   🔑 Key: ${geminiKey.substring(0, 10)}...${geminiKey.substring(geminiKey.length - 4)}\n`);
    
    // Test 2: Import and Test Gemini Chat API
    console.log('2️⃣ Testing Gemini Chat API...');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Try different models
    const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro', 'gemini-2.5-flash'];
    
    for (const modelName of models) {
      console.log(`\n3️⃣ Testing model: ${modelName}`);
      
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = "Hello! I'm an Indian artisan who makes pottery. Can you help me with my business?";
        console.log(`   📝 Prompt: "${prompt}"`);
        
        const startTime = Date.now();
        const result = await model.generateContent(prompt);
        const duration = Date.now() - startTime;
        
        const response = result.response.text();
        
        console.log(`   ✅ Response generated successfully!`);
        console.log(`   ⚡ Generation time: ${duration}ms`);
        console.log(`   📝 Response length: ${response.length} characters`);
        console.log(`   🎯 Response preview: "${response.substring(0, 100)}..."`);
        
        // Test Hindi support
        console.log(`\n4️⃣ Testing Hindi support with ${modelName}...`);
        const hindiPrompt = "मैं एक कुम्हार हूँ। मुझे अपने व्यापार में मदद चाहिए।";
        console.log(`   📝 Hindi Prompt: "${hindiPrompt}"`);
        
        const hindiStartTime = Date.now();
        const hindiResult = await model.generateContent(hindiPrompt);
        const hindiDuration = Date.now() - hindiStartTime;
        
        const hindiResponse = hindiResult.response.text();
        
        console.log(`   ✅ Hindi response generated!`);
        console.log(`   ⚡ Generation time: ${hindiDuration}ms`);
        console.log(`   📝 Response length: ${hindiResponse.length} characters`);
        console.log(`   🎯 Hindi response preview: "${hindiResponse.substring(0, 100)}..."`);
        
        console.log(`\n🎉 Model ${modelName} is working perfectly!`);
        break; // If one model works, we're good
        
      } catch (error) {
        console.log(`   ❌ Model ${modelName} failed: ${error.message}`);
        if (error.message.includes('quota') || error.message.includes('429')) {
          console.log(`   💡 Quota issue with ${modelName}, trying next model...`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n💥 Gemini chat test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check GEMINI_API_KEY in .env file');
    console.error('   2. Verify internet connection');
    console.error('   3. Check quota limits in Google AI Studio');
    console.error('   4. Try different model names');
  }
}

// Run the test
if (require.main === module) {
  testGeminiChat()
    .then(() => {
      console.log('\n✨ Gemini chat test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testGeminiChat };