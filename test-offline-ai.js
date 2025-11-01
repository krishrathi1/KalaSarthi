/**
 * Test script to verify offline AI model functionality
 */

async function testOfflineAI() {
    console.log('🧪 Testing Offline AI Model...\n');

    try {
        // Test 1: Check if WebLLM is available
        console.log('1️⃣ Testing WebLLM availability...');
        try {
            const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
            console.log('✅ WebLLM imported successfully');
        } catch (error) {
            console.log('❌ WebLLM import failed:', error.message);
            console.log('🔄 Falling back to rule-based system...');
        }

        // Test 2: Test our SimpleOfflineAI service
        console.log('\n2️⃣ Testing SimpleOfflineAI service...');

        // Import our service (using dynamic import for Node.js compatibility)
        const SimpleOfflineAI = (await import('./src/lib/services/SimpleOfflineAI.ts')).SimpleOfflineAI;
        const aiService = SimpleOfflineAI.getInstance();

        console.log('✅ SimpleOfflineAI service imported');

        // Test 3: Check initial status
        console.log('\n3️⃣ Checking initial status...');
        const initialStatus = aiService.getStatus();
        console.log('Status:', initialStatus);

        // Test 4: Initialize the AI (this will likely fall back to rule-based)
        console.log('\n4️⃣ Initializing AI service...');
        const initSuccess = await aiService.initialize((progress, stage) => {
            console.log(`   Progress: ${progress}% - ${stage}`);
        });

        if (initSuccess) {
            console.log('✅ AI service initialized successfully');

            // Test 5: Get model info
            console.log('\n5️⃣ Getting model information...');
            const modelInfo = aiService.getModelInfo();
            console.log('Model Info:', modelInfo);

            // Test 6: Test responses
            console.log('\n6️⃣ Testing AI responses...');

            const testQueries = [
                'Hello, how can you help me?',
                'मैं एक कारीगर हूँ, मुझे व्यापार में मदद चाहिए',
                'How do I price my handmade products?',
                'मेरे उत्पादों को ऑनलाइन कैसे बेचूं?'
            ];

            for (let i = 0; i < testQueries.length; i++) {
                const query = testQueries[i];
                console.log(`\n   Query ${i + 1}: "${query}"`);

                try {
                    const startTime = Date.now();
                    const response = await aiService.generateResponse(query);
                    const endTime = Date.now();

                    console.log(`   ✅ Response (${endTime - startTime}ms, confidence: ${response.confidence}):`);
                    console.log(`   "${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}"`);
                } catch (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }

            console.log('\n🎉 All tests completed!');

        } else {
            console.log('❌ AI service initialization failed');
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testOfflineAI().then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
});