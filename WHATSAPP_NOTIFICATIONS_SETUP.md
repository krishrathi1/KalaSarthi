# WhatsApp Notifications Setup Guide

## 🎯 Current Status: DEMO MODE (Working)

The WhatsApp notification system is **fully functional in demo mode**. It logs notifications to the console and simulates successful sends.

---

## ✅ What's Working Now (Demo Mode)

### 1. **Test Button** ✅
- Click "Test WhatsApp" button in the header
- Sends AI-generated notification to +918630365222
- Shows success/failure message

### 2. **AI-Generated Messages** ✅
- Personalized scheme alerts
- Document reminders
- Application updates
- Deadline notifications

### 3. **API Endpoint** ✅
- `/api/notifications/whatsapp` - Send notifications
- GET endpoint for testing
- POST endpoint for production use

---

## 🚀 To Enable Real WhatsApp Notifications

### Option 1: Twilio WhatsApp API (Recommended)

#### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/
2. Sign up for free account
3. Get $15 free credit

#### Step 2: Set Up WhatsApp Sandbox
1. In Twilio Console, go to **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Follow instructions to connect your WhatsApp
3. Send "join <your-sandbox-code>" to the Twilio WhatsApp number
4. Example: Send "join happy-tiger" to +1 415 523 8886

#### Step 3: Get Credentials
```
Account SID: Found in Twilio Console Dashboard
Auth Token: Found in Twilio Console Dashboard
WhatsApp Number: Your Twilio sandbox number (e.g., +14155238886)
```

#### Step 4: Add to `.env`
```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

#### Step 5: Install Twilio SDK
```bash
npm install twilio
```

#### Step 6: Test
Click the "Test WhatsApp" button - you should receive a real WhatsApp message!

**Cost**: 
- Sandbox: FREE (for testing)
- Production: ~$0.005 per message

---

### Option 2: WhatsApp Business API (For Production)

#### Requirements:
1. Facebook Business Manager account
2. WhatsApp Business API access (requires approval)
3. Verified business
4. Dedicated phone number

#### Setup Process:
1. Apply for WhatsApp Business API access
2. Get approved by Meta
3. Set up webhook endpoints
4. Implement message templates
5. Get templates approved

**Cost**: ~$0.004-0.009 per message

---

### Option 3: Alternative Services

#### Twilio SendGrid (Email Alternative)
If WhatsApp is not available, use email notifications:
```env
SENDGRID_API_KEY=your_key_here
NOTIFICATION_EMAIL=user@example.com
```

#### SMS Notifications (Twilio)
```env
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 📱 How to Use

### 1. Test Notification
```typescript
// Click "Test WhatsApp" button in UI
// OR
// Visit: http://localhost:9003/api/notifications/whatsapp?phone=+918630365222
```

### 2. Send Custom Notification
```typescript
const response = await fetch('/api/notifications/whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+918630365222',
    message: 'Your custom message here',
    schemeUrl: 'https://scheme-url.gov.in/',
    notificationType: 'new_scheme'
  })
});
```

### 3. AI-Generated Notifications
```typescript
import AINotificationGenerator from '@/lib/services/AINotificationGenerator';

// Scheme notification
const message = AINotificationGenerator.generateSchemeNotification({
  schemeTitle: 'PM Vishwakarma',
  schemeUrl: 'https://pmvishwakarma.gov.in/',
  aiScore: 95,
  successProbability: 87,
  benefits: '₹1L - ₹3L loan at 5-8% interest',
  urgency: 'high'
});

// Send it
await fetch('/api/notifications/whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+918630365222',
    message,
    notificationType: 'new_scheme'
  })
});
```

---

## 🎨 Notification Types

### 1. **New Scheme Alert**
```
🔥 *New Scheme Alert!*

*PM Vishwakarma Scheme* is now available for you!

✅ AI Match Score: 95%
📊 Success Probability: 87%
💰 Benefits: ₹1L - ₹3L loan

🔗 Apply Now: https://pmvishwakarma.gov.in/
```

### 2. **Document Reminder**
```
📤 *Document Upload Required*

*Income Certificate* needs your attention!

📋 Action: Upload this document
💡 Impact: Improve loan eligibility by 25%

🔗 Upload here: https://your-app.com/scheme-sahayak
```

### 3. **Deadline Alert**
```
🚨 *Deadline Alert!*

*MUDRA Loan* application deadline approaching!

⏰ Time Left: *3 days*

🔥 *URGENT:* Apply immediately!

🔗 Apply Now: https://www.mudra.org.in/
```

### 4. **Application Update**
```
✅ *Application Update*

Your *PM Vishwakarma* application status:

Status: *APPROVED*

Next Steps:
1. Visit nearest bank branch
2. Submit original documents
3. Complete verification process
```

---

## 🔧 Configuration Options

### Environment Variables
```env
# Required for production
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Optional
WHATSAPP_NOTIFICATION_ENABLED=true
DEFAULT_NOTIFICATION_PHONE=+918630365222
NOTIFICATION_RATE_LIMIT=10  # per hour
```

### Notification Settings
```typescript
// In your code
const notificationSettings = {
  enabled: true,
  phoneNumber: '+918630365222',
  types: ['new_scheme', 'deadline', 'document_reminder'],
  frequency: 'immediate', // or 'daily_digest', 'weekly_digest'
  quietHours: { start: 22, end: 8 } // 10 PM to 8 AM
};
```

---

## 🐛 Troubleshooting

### Issue: "Twilio not configured"
**Solution**: Add Twilio credentials to `.env` file

### Issue: "Message not received"
**Solution**: 
1. Check if you joined the Twilio sandbox
2. Verify phone number format (+918630365222)
3. Check Twilio console for error logs

### Issue: "Rate limit exceeded"
**Solution**: Twilio sandbox has limits. Upgrade to paid account.

### Issue: "Invalid phone number"
**Solution**: Ensure number includes country code (+91 for India)

---

## 📊 Testing Checklist

- [ ] Click "Test WhatsApp" button
- [ ] Check console for notification log
- [ ] Verify API response shows success
- [ ] (With Twilio) Receive actual WhatsApp message
- [ ] Test different notification types
- [ ] Verify URL links work in messages
- [ ] Test with different phone numbers

---

## 🎯 Current Implementation

### Files Created:
1. `/api/notifications/whatsapp/route.ts` - API endpoint
2. `/lib/services/AINotificationGenerator.ts` - AI message generator
3. Updated UI with "Test WhatsApp" button

### Features:
✅ Demo mode (working now)
✅ AI-generated messages
✅ Multiple notification types
✅ URL inclusion in messages
✅ Error handling
✅ Console logging

### To Enable Production:
1. Add Twilio credentials to `.env`
2. Install `twilio` package
3. Test with sandbox
4. Deploy!

---

## 💡 Best Practices

### 1. **Respect User Preferences**
- Allow users to opt-in/opt-out
- Provide notification frequency settings
- Honor quiet hours

### 2. **Keep Messages Concise**
- WhatsApp has 1600 character limit
- Use emojis for visual appeal
- Include clear call-to-action

### 3. **Rate Limiting**
- Don't spam users
- Batch notifications when possible
- Use daily/weekly digests

### 4. **Track Engagement**
- Monitor delivery rates
- Track link clicks
- Measure conversion rates

---

## 📞 Summary

**Current Status**: ✅ Working in demo mode

**To Enable Real WhatsApp**:
1. Create Twilio account (free)
2. Join WhatsApp sandbox
3. Add credentials to `.env`
4. Install `twilio` package
5. Test!

**Cost**: FREE for testing, ~$0.005/message in production

**Your Number**: +918630365222 (configured and ready!)

Click "Test WhatsApp" button to see it in action! 🎉
