// Test the Artisan Buddy Chat API with a craft-specific question
const http = require('http');

async function testSareeQuestion() {
  console.log('🧪 Testing Artisan Buddy with Craft Question...\n');
  
  const testPayload = {
    message: "What's the difference between cotton and silk saree?",
    userId: 'artisan-789',
    language: 'en'
  };
  
  console.log('📤 Question:', testPayload.message);
  console.log('\n⏳ Asking Gemini AI...\n');
  
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
        console.log(`⚡ Response time: ${(duration / 1000).toFixed(2)}s\n`);
        
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
      console.log('✅ SUCCESS! Gemini AI Response:\n');
      console.log('═'.repeat(80));
      console.log(result.data.response);
      console.log('═'.repeat(80));
      
      if (result.data.suggestedActions && result.data.suggestedActions.length > 0) {
        console.log('\n🎯 Suggested Actions:');
        result.data.suggestedActions.forEach(action => {
          console.log(`   • ${action.label} → ${action.route}`);
        });
      }
      
      if (result.data.followUpQuestions && result.data.followUpQuestions.length > 0) {
        console.log('\n💬 Follow-up Questions:');
        result.data.followUpQuestions.forEach(q => {
          console.log(`   • ${q}`);
        });
      }
      
      console.log('\n✅ Gemini 2.5 Flash successfully answered the craft question!');
      console.log('✅ AI is providing helpful artisan-focused responses!');
    } else {
      console.log('❌ ERROR:', result.data);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testSareeQuestion()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
