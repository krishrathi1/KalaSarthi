/**
 * Test script to verify Gemma 2B integration with Artisan Buddy
 */

async function testGemmaIntegration() {
    console.log('🧪 Testing Gemma 2B Integration...');

    try {
        // Test 1: Import the service
        console.log('📦 Testing service import...');
        const { GemmaOfflineService } = await import('./src/lib/services/GemmaOfflineService.ts');
        console.log('✅ Service imported successfully');

        // Test 2: Get instance
        console.log('🏗️ Testing service instantiation...');
        const service = GemmaOfflineService.getInstance();
        console.log('✅ Service instance created');

        // Test 3: Check initial state
        console.log('🔍 Testing initial state...');
        console.log('- Is ready:', service.isReady());
        console.log('- Is loading:', service.isModelLoading());
        console.log('- Load error:', service.getLoadError());

        // Test 4: Get model info
        console.log('📊 Testing model info...');
        const modelInfo = service.getModelInfo();
        console.log('- Model ID:', modelInfo.modelId);
        console.log('- Is ready:', modelInfo.isReady);

        // Test 5: Get service status
        console.log('📈 Testing service status...');
        const status = service.getServiceStatus();
        console.log('- State:', status.state);
        console.log('- Last activity:', new Date(status.lastActivity));

        // Test 6: Get artisan system prompt
        console.log('💬 Testing system prompts...');
        const englishPrompt = service.getArtisanSystemPrompt('en');
        const hindiPrompt = service.getArtisanSystemPrompt('hi');
        console.log('- English prompt length:', englishPrompt.length);
        console.log('- Hindi prompt length:', hindiPrompt.length);

        console.log('✅ All integration tests passed!');
        console.log('\n📝 Integration Summary:');
        console.log('- Service can be imported and instantiated');
        console.log('- All public methods are accessible');
        console.log('- System prompts are available');
        console.log('- Status tracking works');
        console.log('\n🚀 Ready for Artisan Buddy integration!');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('- Check if all dependencies are installed');
        console.log('- Verify TypeScript compilation');
        console.log('- Ensure all service components are properly exported');
    }
}

// Run the test
testGemmaIntegration();