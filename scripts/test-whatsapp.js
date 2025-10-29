/**
 * Test WhatsApp Notification Script
 * Sends a test message to +918630365222
 */

require('dotenv').config();
const twilio = require('twilio');

async function sendTestWhatsApp() {
  try {
    console.log('🚀 Starting WhatsApp notification test...\n');

    // Check if credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      console.error('❌ Twilio credentials not found in .env file!');
      console.log('\nPlease add these to your .env file:');
      console.log('TWILIO_ACCOUNT_SID=your_account_sid');
      console.log('TWILIO_AUTH_TOKEN=your_auth_token');
      console.log('TWILIO_WHATSAPP_NUMBER=+14155238886');
      process.exit(1);
    }

    console.log('✅ Twilio credentials found');
    console.log(`📱 From: ${whatsappNumber}`);
    console.log(`📱 To: +918630365222\n`);

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // AI-generated message
    const message = `🎯 *Scheme Sahayak Test Message*

Hello! This is a test notification from your AI-Powered Scheme Sahayak system.

✅ WhatsApp integration is working!
🤖 AI notifications are active
📱 Your number: +918630365222

*Top Scheme for You:*
PM Vishwakarma Scheme
- AI Match: 95%
- Success Rate: 87%
- Loan: ₹1L - ₹3L

🔗 Apply: https://pmvishwakarma.gov.in/

This is an automated test message. Your notification system is ready! 🎉`;

    console.log('📤 Sending WhatsApp message...\n');

    // Send message
    // Note: For Twilio Sandbox, use the sandbox number format
    const result = await client.messages.create({
      from: `whatsapp:+14155238886`, // Twilio Sandbox number
      to: 'whatsapp:+918630365222',
      body: message
    });

    console.log('✅ Message sent successfully!');
    console.log(`📋 Message SID: ${result.sid}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`📅 Sent at: ${new Date().toLocaleString()}\n`);
    console.log('🎉 Check your WhatsApp for the message!');

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    
    if (error.code === 20003) {
      console.log('\n💡 Tip: Make sure you have joined the Twilio WhatsApp sandbox!');
      console.log('Send this message to your Twilio WhatsApp number:');
      console.log('join <your-sandbox-code>');
    } else if (error.code === 21608) {
      console.log('\n💡 Tip: The recipient may not have joined the sandbox yet.');
      console.log('Make sure +918630365222 has sent "join <code>" to Twilio.');
    } else {
      console.log('\n💡 Check your Twilio console for more details:');
      console.log('https://console.twilio.com/');
    }
  }
}

// Run the test
sendTestWhatsApp();
