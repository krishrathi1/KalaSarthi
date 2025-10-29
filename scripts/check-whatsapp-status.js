/**
 * Check WhatsApp Message Status
 * This script checks the delivery status of recent WhatsApp messages
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkRecentMessages() {
  try {
    console.log('🔍 Checking recent WhatsApp messages...\n');

    const messages = await client.messages.list({
      from: `whatsapp:${whatsappNumber}`,
      limit: 10
    });

    if (messages.length === 0) {
      console.log('📭 No messages found');
      return;
    }

    console.log(`📨 Found ${messages.length} recent messages:\n`);

    messages.forEach((msg, index) => {
      const statusEmoji = {
        'queued': '⏳',
        'sent': '📤',
        'delivered': '✅',
        'failed': '❌',
        'undelivered': '⚠️'
      }[msg.status] || '❓';

      console.log(`${index + 1}. ${statusEmoji} Message ${msg.sid}`);
      console.log(`   To: ${msg.to}`);
      console.log(`   Status: ${msg.status}`);
      console.log(`   Date: ${msg.dateCreated.toLocaleString()}`);
      console.log(`   Price: ${msg.price || 'N/A'} ${msg.priceUnit || ''}`);
      
      if (msg.errorCode) {
        console.log(`   ❌ Error Code: ${msg.errorCode}`);
        console.log(`   ❌ Error Message: ${msg.errorMessage}`);
      }
      
      console.log('');
    });

    // Check for common issues
    const failedMessages = messages.filter(m => m.status === 'failed' || m.status === 'undelivered');
    if (failedMessages.length > 0) {
      console.log('⚠️  ISSUES DETECTED:');
      console.log('   Some messages failed to deliver. Common reasons:');
      console.log('   1. Recipient has not joined Twilio WhatsApp Sandbox');
      console.log('   2. Invalid phone number format');
      console.log('   3. WhatsApp account not active');
      console.log('');
      console.log('   To join sandbox, send this message to +1 (424) 424-5482:');
      console.log('   join <your-sandbox-code>');
      console.log('');
    }

    const queuedMessages = messages.filter(m => m.status === 'queued');
    if (queuedMessages.length > 0) {
      console.log('⏳ QUEUED MESSAGES:');
      console.log(`   ${queuedMessages.length} message(s) are still queued`);
      console.log('   This usually means:');
      console.log('   1. Message is being processed (wait a few seconds)');
      console.log('   2. Recipient needs to join sandbox');
      console.log('');
    }

    const deliveredMessages = messages.filter(m => m.status === 'delivered');
    if (deliveredMessages.length > 0) {
      console.log(`✅ SUCCESS: ${deliveredMessages.length} message(s) delivered successfully!`);
    }

  } catch (error) {
    console.error('❌ Error checking messages:', error.message);
    
    if (error.code === 20003) {
      console.log('\n⚠️  Authentication failed. Please check:');
      console.log('   1. TWILIO_ACCOUNT_SID is correct');
      console.log('   2. TWILIO_AUTH_TOKEN is correct');
      console.log('   3. Credentials are from the same Twilio account');
    }
  }
}

// Run the check
checkRecentMessages();
