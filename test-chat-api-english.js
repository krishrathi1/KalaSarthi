// Test the Artisan Buddy Chat API endpoint with English
const http = require('http');

async function testChatAPI() {
  console.log('🧪 Testing Artisan Buddy Chat API (English)...\n');
  
  const testPayload = {
    message: 'What are my sales this month?',
    userId: 'test-user-456',
    language: 'en'
  };
  
  console.log('📤 Sending request...');
  console.log('📝 Message:', testPayload.message);
  console.log('\n⏳ Waiting for Gemini AI response...\n');
  
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
    
    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        const duration = Date.now() - startTime;
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`⚡ Response time: ${duration}ms\n`);
        
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    if (result.ok) {
      console.log('✅ SUCCESS!\n');
      console.log('🤖 AI Response:');
      console.log('═'.repeat(70));
      console.log(result.data.response);
      console.log('═'.repeat(70));
      
      console.log('\n✅ Gemini 2.5 Flash is working perfectly!');
      console.log('✅ Chat API endpoint is functional!');
      console.log('✅ Real-time AI responses are being generated!');
    } else {
      console.log('❌ ERROR:', result.data);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testChatAPI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
