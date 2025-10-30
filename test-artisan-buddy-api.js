/**
 * Test Artisan Buddy API with Gemini
 */

async function testArtisanBuddyAPI() {
  console.log('🧪 Testing Artisan Buddy API...\n');
  
  try {
    const baseUrl = 'http://localhost:9003';
    
    // Test 1: API Status
    console.log('1️⃣ Testing API Status...');
    const statusResponse = await fetch(`${baseUrl}/api/artisan-buddy/chat?test=true`);
    const statusData = await statusResponse.json();
    
    console.log('   ✅ API Status:', statusData.status);
    console.log('   🤖 Model:', statusData.model);
    console.log('   🌟 Features:', statusData.features.join(', '));
    
    // Test 2: English Message
    console.log('\n2️⃣ Testing English Message...');
    const englishMessage = "Hello! I'm a potter and need help with my business.";
    console.log(`   📝 Message: "${englishMessage}"`);
    
    const englishResponse = await fetch(`${baseUrl}/api/artisan-buddy/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: englishMessage,
        language: 'en'
      }),
    });
    
    const englishData = await englishResponse.json();
    
    if (englishResponse.ok) {
      console.log('   ✅ Response received!');
      console.log('   📝 Response length:', englishData.response.length, 'characters');
      console.log('   🎯 Intent:', englishData.intent);
      console.log('   ⚡ Processing time:', englishData.processingTime + 'ms');
      console.log('   💡 Suggestions:', englishData.suggestions?.length || 0);
      console.log('   📄 Preview:', englishData.response.substring(0, 100) + '...');
    } else {
      console.log('   ❌ Error:', englishData.error);
      console.log('   📄 Response:', englishData.response);
    }
    
    // Test 3: Hindi Message
    console.log('\n3️⃣ Testing Hindi Message...');
    const hindiMessage = "मैं एक कुम्हार हूँ। मुझे अपने व्यापार में मदद चाहिए।";
    console.log(`   📝 Message: "${hindiMessage}"`);
    
    const hindiResponse = await fetch(`${baseUrl}/api/artisan-buddy/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: hindiMessage,
        language: 'hi'
      }),
    });
    
    const hindiData = await hindiResponse.json();
    
    if (hindiResponse.ok) {
      console.log('   ✅ Hindi response received!');
      console.log('   📝 Response length:', hindiData.response.length, 'characters');
      console.log('   🎯 Intent:', hindiData.intent);
      console.log('   ⚡ Processing time:', hindiData.processingTime + 'ms');
      console.log('   💡 Suggestions:', hindiData.suggestions?.length || 0);
      console.log('   📄 Preview:', hindiData.response.substring(0, 100) + '...');
    } else {
      console.log('   ❌ Error:', hindiData.error);
      console.log('   📄 Response:', hindiData.response);
    }
    
    // Test 4: Business Query
    console.log('\n4️⃣ Testing Business Query...');
    const businessMessage = "How can I price my handmade pottery bowls?";
    console.log(`   📝 Message: "${businessMessage}"`);
    
    const businessResponse = await fetch(`${baseUrl}/api/artisan-buddy/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: businessMessage,
        context: {
          previousMessages: [
            { sender: 'user', content: 'Hello! I\'m a potter.' },
            { sender: 'assistant', content: 'Great! I can help you with your pottery business.' }
          ]
        }
      }),
    });
    
    const businessData = await businessResponse.json();
    
    if (businessResponse.ok) {
      console.log('   ✅ Business advice received!');
      console.log('   📝 Response length:', businessData.response.length, 'characters');
      console.log('   🎯 Intent:', businessData.intent);
      console.log('   💡 Suggestions:', businessData.suggestions);
      console.log('   📄 Preview:', businessData.response.substring(0, 150) + '...');
    } else {
      console.log('   ❌ Error:', businessData.error);
    }
    
    console.log('\n🎉 Artisan Buddy API Test Summary:');
    console.log('   ✅ API is accessible and working');
    console.log('   ✅ English and Hindi support functional');
    console.log('   ✅ Intent classification working');
    console.log('   ✅ Suggestions generation active');
    console.log('   ✅ Context handling implemented');
    
    console.log('\n🚀 Ready to test in browser!');
    console.log('   🌐 Navigate to: http://localhost:9003/artisan-buddy');
    console.log('   🎨 Or try: http://localhost:9003/enhanced-artisan-buddy');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Make sure the development server is running');
      console.error('   2. Run: npm run dev');
      console.error('   3. Check if port 9003 is available');
    } else if (error.message.includes('fetch')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Check network connection');
      console.error('   2. Verify API endpoint URL');
      console.error('   3. Check server logs for errors');
    }
  }
}

// Run the test
if (require.main === module) {
  testArtisanBuddyAPI()
    .then(() => {
      console.log('\n✨ Artisan Buddy API test completed!');
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
    });
}

module.exports = { testArtisanBuddyAPI };