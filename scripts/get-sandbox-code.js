/**
 * Get Twilio WhatsApp Sandbox Join Code
 * This script helps you find your sandbox join code
 */

require('dotenv').config();

console.log('📱 Twilio WhatsApp Sandbox Setup\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('🔧 PROBLEM: Messages are failing with Error 63007');
console.log('   This means you need to join the Twilio WhatsApp Sandbox\n');

console.log('✅ SOLUTION: Follow these steps:\n');

console.log('Step 1: Get Your Join Code');
console.log('───────────────────────────');
console.log('   Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
console.log('   You\'ll see a message like: "join happy-tiger" or "join blue-mountain"\n');

console.log('Step 2: Join the Sandbox');
console.log('───────────────────────────');
console.log('   1. Open WhatsApp on your phone: +918630365222');
console.log('   2. Send a message to: +1 (424) 424-5482');
console.log('   3. Type: join <your-code-from-step-1>');
console.log('   4. Send it!\n');

console.log('Step 3: Wait for Confirmation');
console.log('───────────────────────────');
console.log('   You should receive: "✅ You are all set!"\n');

console.log('Step 4: Test It');
console.log('───────────────────────────');
console.log('   Run: node scripts/test-whatsapp.js');
console.log('   Then: node scripts/check-whatsapp-status.js\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 Current Configuration:');
console.log('   From Number: ' + (process.env.TWILIO_WHATSAPP_NUMBER || 'Not set'));
console.log('   To Number: +918630365222 (hardcoded in app)\n');

console.log('⚠️  IMPORTANT:');
console.log('   - You must join from the SAME number that receives messages');
console.log('   - Sandbox is FREE but for testing only');
console.log('   - Each user must join individually');
console.log('   - Messages work immediately after joining\n');

console.log('🔗 Quick Link:');
console.log('   https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn\n');

console.log('═══════════════════════════════════════════════════════════\n');
