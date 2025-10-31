# 🔧 How to Fix WhatsApp Notifications

## ❌ Problem Identified
**Error Code: 63007** - Recipient has not joined Twilio WhatsApp Sandbox

Your messages are being sent successfully, but they're failing because **you haven't joined the Twilio WhatsApp Sandbox yet**.

## ✅ Solution (Takes 2 minutes)

### Step 1: Get Your Sandbox Code
1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Login with your Twilio account
3. You'll see a message like: **"join <some-word>"**
4. Copy that exact message (including "join")

Example: `join happy-tiger` or `join blue-mountain`

### Step 2: Join the Sandbox
1. Open WhatsApp on your phone (+918630365222)
2. Send a message to: **+1 (424) 424-5482**
3. Type the exact message from Step 1: `join <your-code>`
4. Send it

### Step 3: Wait for Confirmation
You should receive a message from Twilio saying:
```
✅ You are all set! Your sandbox is ready to use.
```

### Step 4: Test Again
Once you receive the confirmation:

```bash
# Run the test script
node scripts/test-whatsapp.js

# Check status
node scripts/check-whatsapp-status.js
```

Or click the "Test WhatsApp" button on your website!

## 📱 Visual Guide

```
Your Phone (+918630365222)
    ↓
Send to: +1 (424) 424-5482
    ↓
Message: "join <your-code>"
    ↓
Receive: "✅ You are all set!"
    ↓
Now you can receive messages! 🎉
```

## 🔍 Verify It's Working

After joining the sandbox, run:
```bash
node scripts/check-whatsapp-status.js
```

You should see:
- Status: **delivered** ✅ (instead of failed ❌)
- No error codes

## ⚠️ Important Notes

1. **Sandbox is for Testing Only**
   - Free to use
   - Anyone who wants to receive messages must join
   - Messages expire after 24 hours of inactivity

2. **For Production**
   - You'll need to apply for WhatsApp Business API approval
   - No sandbox joining required
   - Costs money per message

3. **Multiple Users**
   - Each phone number must join the sandbox individually
   - They use the same join code
   - Send from their WhatsApp to +1 (424) 424-5482

## 🎯 What Happens After Joining

Once you join the sandbox, you'll automatically receive:

1. **Scheme Notifications** - When AI finds matching schemes
2. **Document Upload Confirmations** - After uploading documents
3. **Test Messages** - When you click "Test WhatsApp" button

## 🐛 Still Not Working?

If you still don't receive messages after joining:

1. **Check you joined with the correct number**
   - Must be +918630365222
   - Must be the same number registered with WhatsApp

2. **Verify sandbox status**
   - Go to Twilio Console
   - Check "WhatsApp Sandbox" section
   - Your number should be listed

3. **Try sending again**
   ```bash
   node scripts/test-whatsapp.js
   ```

4. **Check message status**
   ```bash
   node scripts/check-whatsapp-status.js
   ```
   - Should show "delivered" not "failed"

## 📞 Need Help?

If you're still having issues:
1. Check Twilio Console: https://console.twilio.com
2. Verify your phone number is correct
3. Make sure WhatsApp is installed and active
4. Try with a different phone number

## 🎉 Success Checklist

- [ ] Went to Twilio WhatsApp Sandbox page
- [ ] Got the join code (e.g., "join happy-tiger")
- [ ] Sent message to +1 (424) 424-5482 from +918630365222
- [ ] Received confirmation from Twilio
- [ ] Ran test script: `node scripts/test-whatsapp.js`
- [ ] Checked status: `node scripts/check-whatsapp-status.js`
- [ ] Status shows "delivered" ✅
- [ ] Received test message on WhatsApp! 🎉

---

**Quick Link:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
