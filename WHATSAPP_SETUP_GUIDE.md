# 📱 WhatsApp Setup Guide - Fix Error 63007

## 🚨 Current Issue
**Error 63007**: "Twilio could not find a Channel with the specified From address"

This means your WhatsApp number `+14244245482` is not configured as a WhatsApp channel in Twilio.

## ✅ Quick Fix Steps

### 1. Use Twilio WhatsApp Sandbox
I've updated your `.env` file to use the standard Twilio WhatsApp Sandbox number:
```
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 2. Activate WhatsApp Sandbox
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** > **Try it out** > **Send a WhatsApp message**
3. You'll see a sandbox with number `+1 415 523 8886`
4. Send a message to this number from your phone: `join <your-sandbox-keyword>`
5. You'll get a confirmation message

### 3. Test the API
```bash
# Test the configuration
GET /api/notifications/whatsapp/test?phone=+919876543210

# Send a test message
POST /api/notifications/whatsapp
{
  "phoneNumber": "+919876543210",
  "message": "Test message from KalaSarthi",
  "notificationType": "test"
}
```

## 🔧 Alternative Solutions

### Option A: Use Your Own WhatsApp Business Number
1. Go to Twilio Console > Phone Numbers > Manage > WhatsApp senders
2. Add your business WhatsApp number `+14244245482`
3. Complete the verification process
4. Update `.env` back to your number

### Option B: Dem
o Mode (No Twilio Required)
If you want to test without setting up WhatsApp, the API will automatically fall back to demo mode when Twilio credentials are missing.

## 🧪 Testing Commands

```bash
# Check if WhatsApp is working
curl "http://localhost:9003/api/notifications/whatsapp/test?phone=+919876543210"

# Send test notification
curl -X POST "http://localhost:9003/api/notifications/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "message": "🎯 Test notification from KalaSarthi!",
    "notificationType": "test"
  }'
```

## 📋 Troubleshooting

### Error 63007 - Channel not found
- **Cause**: WhatsApp number not configured in Twilio
- **Fix**: Use sandbox number `+14155238886` or configure your business number

### Error 21614 - Number not verified  
- **Cause**: Phone number not in Twilio verified list
- **Fix**: Add recipient numbers to verified caller IDs in Twilio Console

### Error 21211 - Invalid number
- **Cause**: Wrong phone number format
- **Fix**: Use international format `+91XXXXXXXXXX`

## 🎯 Next Steps
1. Try the API now with the sandbox number
2. If it works, you can either:
   - Continue using sandbox for development
   - Set up your business WhatsApp number for production
3. Test with your actual phone number to receive messages

The WhatsApp API should now work correctly! 🚀