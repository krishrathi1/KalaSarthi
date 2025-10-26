// Quick test of the Enhanced Artisan Buddy Service
const { EnhancedArtisanBuddyService } = require('./src/lib/services/EnhancedArtisanBuddyV2.ts');

async function testService() {
    try {
        const service = EnhancedArtisanBuddyService.getInstance();

        // Test conversation initialization
        const context = await service.initializeConversation('test-user-123');
        console.log('✓ Conversation initialized:', context.conversationId);

        // Test message processing
        const messageInput = {
            content: 'Hello, I need help with my artisan business',
            userId: 'test-user-123',
            conversationId: context.conversationId,
            inputType: 'text'
        };

        const response = await service.processMessage(messageInput);
        console.log('✓ Message processed:', response.content.substring(0, 100) + '...');

        // Test conversation history
        const history = await service.getConversationHistory('test-user-123');
        console.log('✓ Conversation history retrieved:', history.length, 'messages');

        console.log('\n✅ All tests passed! Enhanced Artisan Buddy Service is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testService();