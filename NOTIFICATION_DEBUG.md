# Notification Debugging Guide

## Quick Test Steps

### 1. Test with Simple HTML Page
Open this URL in your browser:
```
http://localhost:3000/test-notification.html
```

Then:
1. Click "Check Support" - Should show "✅ Notifications supported!"
2. Click "Request Permission" - Browser will ask for permission
3. Click "Allow" in the permission prompt
4. Click "Test Notification" - You should see a notification in top-right corner!

### 2. Test in Browser Console
Open the AI Design Generator page, then open browser console (F12) and run:

```javascript
// Check if notifications are supported
console.log('Supported:', 'Notification' in window);

// Check current permission
console.log('Permission:', Notification.permission);

// Request permission
await Notification.requestPermission();

// Test basic notification
new Notification('Test', { body: 'Hello!' });

// Test with the notification manager
notificationManager.showNotification('Test', { body: 'Testing...' });
```

### 3. Common Issues & Solutions

#### Issue: "Notification is not defined"
**Cause**: Running in server-side context or old browser
**Solution**: 
- Make sure you're in the browser (not Node.js)
- Check browser version (needs Chrome 22+, Firefox 22+, Safari 16.4+)

#### Issue: Permission is "denied"
**Cause**: User previously denied permission
**Solution**:
1. Click the lock icon (🔒) in address bar
2. Find "Notifications" setting
3. Change from "Block" to "Allow"
4. Refresh the page

#### Issue: Permission is "default" but prompt doesn't show
**Cause**: Browser blocked the prompt (too many requests)
**Solution**:
1. Manually enable in browser settings
2. Chrome: Settings → Privacy and Security → Site Settings → Notifications
3. Add your localhost to "Allowed" list

#### Issue: Notification shows but immediately disappears
**Cause**: Auto-close is working (10 seconds)
**Solution**: This is normal! For testing, use `requireInteraction: true`

#### Issue: No notification appears at all
**Possible causes**:
1. **Do Not Disturb mode** - Check system settings
2. **Browser notifications disabled** - Check browser settings
3. **System notifications disabled** - Check OS settings
4. **Wrong icon path** - Check if `/icon-192x192.png` exists
5. **JavaScript error** - Check console for errors

### 4. Check System Settings

#### macOS:
1. System Preferences → Notifications & Focus
2. Find your browser (Chrome/Safari/Firefox)
3. Make sure "Allow Notifications" is checked
4. Check "Do Not Disturb" is OFF

#### Windows:
1. Settings → System → Notifications
2. Find your browser
3. Make sure notifications are ON
4. Check "Focus Assist" is OFF

### 5. Debug the AI Design Generator

Add this to your browser console while on the AI Design Generator page:

```javascript
// Check if notification manager is loaded
console.log('NotificationManager:', notificationManager);

// Check permission
console.log('Permission:', notificationManager.getPermission());

// Test AI complete notification
notificationManager.notifyAIGenerationComplete(5);

// Test connection restored
notificationManager.notifyConnectionRestored();
```

### 6. Enable Verbose Logging

The notification manager now has console.log statements. Check your browser console for messages like:

```
[NotificationManager] Attempting to show notification: ...
[NotificationManager] Current permission: granted
[NotificationManager] Creating notification with options: ...
[NotificationManager] ✅ Notification created successfully
```

If you don't see these logs, the notification code isn't being called.

### 7. Test the Full Flow

1. Open AI Design Generator
2. Open browser console (F12)
3. Go offline: DevTools → Network → Offline
4. Click "Generate Design Variations"
5. You should see: "Waiting for Connection..." button
6. Go online: DevTools → Network → Online
7. Watch console for logs
8. Watch top-right corner for notification!

### 8. Verify Icon Exists

Check if the icon file exists:
```
http://localhost:3000/icon-192x192.png
```

If it returns 404, create a simple icon or use a different path.

### 9. Browser-Specific Issues

#### Chrome/Edge:
- Check: chrome://settings/content/notifications
- Make sure site is in "Allowed" list

#### Firefox:
- Check: about:preferences#privacy
- Scroll to "Permissions" → "Notifications"
- Make sure site is allowed

#### Safari:
- Safari → Preferences → Websites → Notifications
- Make sure site is set to "Allow"

### 10. Still Not Working?

Run this comprehensive test:

```javascript
// Comprehensive notification test
async function testNotifications() {
    console.log('=== Notification Test ===');
    
    // 1. Check support
    const supported = 'Notification' in window;
    console.log('1. Supported:', supported);
    if (!supported) {
        console.error('❌ Notifications not supported!');
        return;
    }
    
    // 2. Check permission
    console.log('2. Permission:', Notification.permission);
    
    // 3. Request if needed
    if (Notification.permission === 'default') {
        console.log('3. Requesting permission...');
        const result = await Notification.requestPermission();
        console.log('3. Result:', result);
    }
    
    // 4. Try to show notification
    if (Notification.permission === 'granted') {
        console.log('4. Showing notification...');
        try {
            const n = new Notification('Test Success! 🎉', {
                body: 'Notifications are working!',
                requireInteraction: true
            });
            console.log('4. ✅ Notification created:', n);
        } catch (e) {
            console.error('4. ❌ Error:', e);
        }
    } else {
        console.error('4. ❌ Permission not granted');
    }
}

testNotifications();
```

### Expected Output:
```
=== Notification Test ===
1. Supported: true
2. Permission: granted
4. Showing notification...
4. ✅ Notification created: Notification {}
```

Then you should see the notification in the top-right corner!
