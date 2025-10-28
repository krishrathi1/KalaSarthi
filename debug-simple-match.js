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
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
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

async function testSimpleMatch() {
  console.log('🔍 Testing Simple Pottery Match...');
  
  const searchData = {
    buyerId: 'test_buyer_' + Date.now(),
    userInput: 'I need pottery',
    sessionId: 'test_session_' + Date.now(),
    filters: {},
    preferences: {
      maxResults: 10,
      minConfidenceScore: 0.1,
      sortBy: 'confidence',
      includeAlternatives: true
    }
  };
  
  console.log('Sending request:', JSON.stringify(searchData, null, 2));
  
  try {
    const result = await makeRequest('POST', '/api/buyer-connect/match', searchData);
    console.log('Response status:', result.status);
    console.log('Response body:', JSON.stringify(result.body, null, 2));
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testSimpleMatch();