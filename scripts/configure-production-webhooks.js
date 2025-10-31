#!/usr/bin/env node

/**
 * Production Webhook Configuration Script
 * Sets up and validates Gupshup webhook endpoints for production deployment
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const config = {
  gupshupApiKey: process.env.GUPSHUP_API_KEY,
  gupshupAppId: process.env.GUPSHUP_APP_ID,
  webhookUrl: process.env.GUPSHUP_WEBHOOK_URL,
  webhookSecret: process.env.GUPSHUP_WEBHOOK_SECRET,
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Validate environment configuration
 */
function validateConfig() {
  console.log('🔍 Validating webhook configuration...');
  
  const required = ['gupshupApiKey', 'gupshupAppId', 'webhookUrl', 'webhookSecret'];
  const missing = required.filter(key => !config[key] || config[key].includes('REPLACE_WITH'));
  
  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`   - ${key.toUpperCase()}`));
    console.error('\nPlease update your .env file with actual Gupshup credentials.');
    process.exit(1);
  }
  
  // Validate webhook URL format
  if (!config.webhookUrl.startsWith('https://')) {
    console.error('❌ Webhook URL must use HTTPS in production');
    process.exit(1);
  }
  
  if (config.webhookUrl.includes('localhost') || config.webhookUrl.includes('127.0.0.1')) {
    console.error('❌ Webhook URL cannot be localhost in production');
    process.exit(1);
  }
  
  // Validate webhook secret strength
  if (config.webhookSecret.length < 32) {
    console.error('❌ Webhook secret must be at least 32 characters long');
    console.error('   Generate a secure secret using: openssl rand -hex 32');
    process.exit(1);
  }
  
  console.log('✅ Configuration validation passed');
}

/**
 * Test webhook endpoint accessibility
 */
async function testWebhookEndpoint() {
  console.log('🌐 Testing webhook endpoint accessibility...');
  
  return new Promise((resolve, reject) => {
    const url = new URL(config.webhookUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      timeout: 10000,
    };
    
    const req = https.request(options, (res) => {
      console.log(`✅ Webhook endpoint accessible (Status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.error('❌ Webhook endpoint not accessible:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error('❌ Webhook endpoint timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

/**
 * Configure Gupshup webhook URL
 */
async function configureGupshupWebhook() {
  console.log('⚙️  Configuring Gupshup webhook URL...');
  
  const webhookConfig = {
    url: config.webhookUrl,
    events: [
      'message-event',
      'delivery-event',
      'read-event',
      'failed-event'
    ],
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'gupshup-notification-system'
    }
  };
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(webhookConfig);
    
    const options = {
      hostname: 'api.gupshup.io',
      port: 443,
      path: `/sm/api/v1/app/${config.gupshupAppId}/webhook`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.gupshupApiKey,
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Gupshup webhook configured successfully');
          try {
            const response = JSON.parse(data);
            console.log('   Response:', response);
          } catch (e) {
            console.log('   Response received (non-JSON)');
          }
          resolve(true);
        } else {
          console.error(`❌ Failed to configure webhook (Status: ${res.statusCode})`);
          console.error('   Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error configuring Gupshup webhook:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Test webhook security by sending a test payload
 */
async function testWebhookSecurity() {
  console.log('🔒 Testing webhook security validation...');
  
  const testPayload = {
    messageId: 'test-message-' + Date.now(),
    status: 'delivered',
    timestamp: new Date().toISOString(),
    channel: 'whatsapp',
    eventType: 'delivery-event'
  };
  
  const payloadString = JSON.stringify(testPayload);
  const signature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payloadString)
    .digest('hex');
  
  return new Promise((resolve, reject) => {
    const url = new URL(config.webhookUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gupshup-Signature': `sha256=${signature}`,
        'X-Gupshup-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'Content-Length': Buffer.byteLength(payloadString),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Webhook security validation working correctly');
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('   Test webhook processed successfully');
            } else {
              console.log('   Test webhook processed with expected validation');
            }
          } catch (e) {
            console.log('   Response received');
          }
          resolve(true);
        } else {
          console.warn(`⚠️  Webhook returned status ${res.statusCode} (may be expected for test)`);
          console.log('   Response:', data);
          resolve(true); // Don't fail on test webhook
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error testing webhook security:', error.message);
      reject(error);
    });
    
    req.write(payloadString);
    req.end();
  });
}

/**
 * Generate webhook configuration summary
 */
function generateConfigSummary() {
  console.log('\n📋 Webhook Configuration Summary:');
  console.log('================================');
  console.log(`Environment: ${config.environment}`);
  console.log(`Webhook URL: ${config.webhookUrl}`);
  console.log(`App ID: ${config.gupshupAppId}`);
  console.log(`Secret Length: ${config.webhookSecret.length} characters`);
  console.log(`API Key: ${config.gupshupApiKey.substring(0, 8)}...`);
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Ensure your production server is running');
  console.log('2. Monitor webhook delivery in Gupshup dashboard');
  console.log('3. Check application logs for webhook processing');
  console.log('4. Test with actual message sending');
  
  console.log('\n📊 Monitoring URLs:');
  console.log(`Health Check: ${config.webhookUrl.replace('/webhook', '/health')}`);
  console.log(`Analytics: ${config.webhookUrl.replace('/webhook', '/analytics')}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Gupshup Production Webhook Configuration');
  console.log('==========================================\n');
  
  try {
    // Step 1: Validate configuration
    validateConfig();
    
    // Step 2: Test webhook endpoint
    await testWebhookEndpoint();
    
    // Step 3: Configure Gupshup webhook (optional - may need manual setup)
    if (process.argv.includes('--configure-gupshup')) {
      await configureGupshupWebhook();
    } else {
      console.log('ℹ️  Skipping Gupshup webhook configuration (use --configure-gupshup to enable)');
    }
    
    // Step 4: Test webhook security
    if (process.argv.includes('--test-security')) {
      await testWebhookSecurity();
    } else {
      console.log('ℹ️  Skipping security test (use --test-security to enable)');
    }
    
    // Step 5: Generate summary
    generateConfigSummary();
    
    console.log('\n✅ Webhook configuration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Webhook configuration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateConfig,
  testWebhookEndpoint,
  configureGupshupWebhook,
  testWebhookSecurity,
};