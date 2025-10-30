// Test the Artisan Buddy Chat API endpoint
const https = require('https');
const http = require('http');

async function testChatAPI() {
  console.log('🧪 Testing Artisan Buddy Chat API...\n');
  
  const apiUrl = 'http://localhost:9003/api/artisan-buddy/chat';
  
  const testPayload = {
    message: 'Hello! Can you tell me about my products?',
    userId: 'test-user-123',
    language: 'en'
  };
  
  console.log('📤 Sending request to:', apiUrl);
  console.log('📝 Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Waiting for response...\n');
  
  try {
    const startTime = Date.now();
    
    const postData = JSON.stringify(testPayload);
    
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: '/api/artisan-buddy/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const data = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        const duration = Date.now() - startTime;
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`⚡ Response time: ${duration}ms\n`);
        
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode === 200, data: JSON.parse(body), statusCode: res.statusCode });
          } catch (e) {
            reject(new Error('Failed to parse response: ' + body));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    const response = { ok: data.ok, status: data.statusCode };
    const responseData = data.data;
    
    if (response.ok) {
      console.log('✅ SUCCESS! API is working!\n');
      console.log('📨 Response:');
      console.log('─'.repeat(60));
      console.log(responseData.response);
      console.log('─'.repeat(60));
      console.log('\n📋 Metadata:');
      console.log(`   Session ID: ${responseData.sessionId}`);
      console.log(`   Message ID: ${responseData.messageId}`);
      console.log(`   Language: ${responseData.language}`);
      console.log(`   Intent: ${responseData.metadata?.intent}`);
      console.log(`   Confidence: ${responseData.metadata?.confidence}`);
      
      if (responseData.suggestedActions && responseData.suggestedActions.length > 0) {
        console.log('\n🎯 Suggested Actions:');
        responseData.suggestedActions.forEach(action => {
          console.log(`   - ${action.label} (${action.route})`);
        });
      }
      
      if (responseData.followUpQuestions && responseData.followUpQuestions.length > 0) {
        console.log('\n💬 Follow-up Questions:');
        responseData.followUpQuestions.forEach(q => {
          console.log(`   - ${q}`);
        });
      }
      
      console.log('\n🎉 Gemini API integration is working perfectly!');
    } else {
      console.log('❌ ERROR: API returned an error\n');
      console.log('Error details:', JSON.stringify(responseData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERROR: Failed to call API\n');
    console.error('Error message:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure the dev server is running (npm run dev)');
    console.error('   2. Check that the server is on port 9003');
    console.error('   3. Verify the API route exists at /api/artisan-buddy/chat');
  }
}

// Run the test
testChatAPI()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
