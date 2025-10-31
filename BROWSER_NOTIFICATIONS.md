# Browser Push Notifications - Implementation Guide

## Overview
Implemented Web Push API for browser notifications to alert users when background tasks complete, especially useful when they switch tabs or minimize the browser.

## Features

### 1. Notification Manager (`src/lib/notifications.ts`)
A singleton class that handles all browser notification functionality:

- **Permission Management** - Request and check notification permissions
- **Smart Notifications** - Auto-close after 10 seconds (unless requireInteraction is true)
- **Vibration Support** - Haptic feedback on mobile devices
- **Custom Icons** - Uses app icons for branding
- **Tag System** - Prevents duplicate notifications

### 2. Notification Types

#### AI Generation Complete
```typescript
notifyAIGenerationComplete(count: number)
```
- **Title**: "AI Design Generation Complete! 🎨"
- **Body**: "X design variations ready to view"
- **Requires Interaction**: Yes (stays until clicked)
- **Vibration**: [200, 100, 200, 100, 200]

#### Connection Restored
```typescript
notifyConnectionRestored()
```
- **Title**: "Connection Restored 🌐"
- **Body**: "You're back online! Syncing your data..."
- **Auto-close**: 10 seconds

#### Sync Complete
```typescript
notifySyncComplete(itemCount: number)
```
- **Title**: "Sync Complete ✅"
- **Body**: "Successfully synced X items"
- **Auto-close**: 10 seconds

#### Products Cached
```typescript
notifyProductsCached(count: number)
```
- **Title**: "Products Cached 💾"
- **Body**: "X products saved for offline viewing"
- **Silent**: Yes (no sound)
- **Auto-close**: 10 seconds

#### Generic Task Complete
```typescript
notifyTaskComplete(taskName: string, details?: string)
```
- **Title**: "{taskName} Complete ✓"
- **Body**: Custom details
- **Auto-close**: 10 seconds

## User Experience Flow

### 1. Permission Request
- **When**: 2 seconds after page load (non-intrusive)
- **Where**: AI Design Generator page
- **Fallback**: Blue banner with "Enable Notifications" button if not granted

### 2. Offline Request Flow
1. User clicks "Generate" while offline
2. Request is queued
3. User can switch tabs or minimize browser
4. When connection restores:
   - **Browser Notification**: "Connection Restored 🌐"
   - Generation starts automatically
5. When generation completes:
   - **Browser Notification**: "AI Design Generation Complete! 🎨"
   - User clicks notification → returns to tab
   - Results are displayed

### 3. Permission States

#### Default (Not Asked)
- Blue banner appears: "Enable Notifications"
- Button to request permission
- Auto-request after 2 seconds

#### Granted
- Notifications work seamlessly
- No banner shown
- All task completions trigger notifications

#### Denied
- No notifications shown
- No banner (respects user choice)
- App still works normally with toast messages

## Technical Implementation

### Permission Request
```typescript
// Auto-request on mount (delayed)
useEffect(() => {
    if (notificationManager.isSupported() && 
        notificationManager.getPermission() === 'default') {
        setTimeout(() => {
            notificationManager.requestPermission();
        }, 2000);
    }
}, []);
```

### Show Notification on Task Complete
```typescript
if (result.success) {
    // Show toast (always)
    toast({
        title: 'Success!',
        description: `Generated ${result.count} design variations`,
    });
    
    // Show browser notification (if permitted)
    if (notificationManager.getPermission() === 'granted') {
        await notifyAIGenerationComplete(result.count);
    }
}
```

### Connection Restoration
```typescript
useEffect(() => {
    if (isOnline && waitingForConnection && pendingRequest) {
        // Show notification
        if (notificationManager.getPermission() === 'granted') {
            notificationManager.notifyConnectionRestored();
        }
        
        // Execute pending request
        await executeGeneration(pendingRequest);
    }
}, [isOnline, waitingForConnection, pendingRequest]);
```

## Browser Support

### Supported Browsers
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile - iOS 16.4+)
- ✅ Opera
- ✅ Samsung Internet

### Unsupported Browsers
- ❌ Internet Explorer
- ❌ Older Safari versions (< 16.4)

### Graceful Degradation
- `isSupported()` check before any notification operation
- Falls back to toast messages if not supported
- No errors thrown, just console warnings

## Configuration

### Notification Options
```typescript
{
    icon: '/icon-192x192.png',        // App icon
    badge: '/icon-192x192.png',       // Badge icon
    body: 'Notification message',     // Message text
    tag: 'unique-tag',                // Prevents duplicates
    requireInteraction: false,        // Auto-close or not
    silent: false,                    // Play sound or not
    vibrate: [200, 100, 200],        // Vibration pattern
}
```

### Auto-Close Timing
- **Default**: 10 seconds
- **requireInteraction: true**: Never auto-closes
- **User can close manually**: Always

## Benefits

1. **Better UX** - Users don't need to stay on the tab
2. **Productivity** - Can work on other tasks while waiting
3. **Engagement** - Brings users back when task completes
4. **Professional** - Modern app behavior
5. **Accessibility** - Visual + haptic feedback
6. **Non-Intrusive** - Respects user preferences

## Privacy & Permissions

- **No Data Collection** - Notifications are local only
- **User Control** - Can deny or revoke anytime
- **Respects Choice** - No repeated prompts if denied
- **Transparent** - Clear explanation of why we need permission

## Testing

### Test Scenarios
1. **Grant Permission** → Verify notifications appear
2. **Deny Permission** → Verify app works with toasts only
3. **Switch Tabs** → Verify notification brings you back
4. **Minimize Browser** → Verify notification appears in system tray
5. **Mobile** → Verify vibration works
6. **Multiple Tabs** → Verify tag system prevents duplicates

### Test Commands
```javascript
// In browser console
notificationManager.showNotification('Test', { body: 'Testing notifications' });
notifyAIGenerationComplete(5);
notifyConnectionRestored();
```

## Future Enhancements

1. **Service Worker Notifications** - For background notifications
2. **Action Buttons** - "View Results", "Dismiss" buttons
3. **Rich Notifications** - Images in notifications
4. **Notification History** - Track past notifications
5. **Custom Sounds** - Different sounds for different events
6. **Notification Preferences** - User settings for which events to notify
