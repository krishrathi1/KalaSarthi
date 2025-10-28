#!/usr/bin/env node

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9003,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            body: jsonBody,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
            rawBody: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testChatAPI() {
  console.log('🔍 Testing Chat API in detail...');
  
  const chatData = {
    sessionId: 'test_chat_session_' + Date.now(),
    senderId: 'test_buyer_123',
    receiverId: 'test_artisan_456',
    message: 'Hello, I am interested in your pottery work',
    senderLanguage: 'en',
    receiverLanguage: 'hi'
  };
  
  console.log('Sending request:', JSON.stringify(chatData, null, 2));
  
  try {
    const result = await makeRequest('POST', '/api/buyer-connect/chat', chatData);
    console.log('Response status:', result.status);
    console.log('Response body:', JSON.stringify(result.body, null, 2));
    
    if (result.status !== 200) {
      console.log('❌ Chat API failed');
      console.log('Raw response:', result.rawBody);
    } else {
      console.log('✅ Chat API succeeded');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testChatAPI();