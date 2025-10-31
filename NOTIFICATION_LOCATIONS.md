# Where Browser Notifications Appear

## Desktop Platforms

### macOS (Your System)
```
┌─────────────────────────────────────────────────────────┐
│                                          [🔔] [🕐] [🔋] │ ← Menu Bar
│                                                          │
│                                                          │
│                                    ┌──────────────────┐ │
│                                    │ 🎨 KalaBandhu    │ │ ← Notification
│                                    │ AI Design        │ │   appears here
│                                    │ Generation       │ │   (top-right)
│                                    │ Complete!        │ │
│                                    │                  │ │
│                                    │ 5 design         │ │
│                                    │ variations       │ │
│                                    │ ready to view    │ │
│                                    │                  │ │
│                                    │ [View] [Close]   │ │
│                                    └──────────────────┘ │
│                                                          │
│  [Browser Window]                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ KalaBandhu - AI Design Generator               │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Also accessible via:**
- **Notification Center**: Swipe left from right edge of trackpad
- **Menu Bar**: Click notification icon (🔔)

### Windows 10/11
```
┌─────────────────────────────────────────────────────────┐
│  [Start] [Search] [Apps]                    [🔔] [🕐]  │ ← Taskbar
│                                                          │
│                                                          │
│                                    ┌──────────────────┐ │
│                                    │ KalaBandhu       │ │ ← Notification
│                                    │ 🎨               │ │   (bottom-right)
│                                    │ AI Design        │ │
│                                    │ Generation       │ │
│                                    │ Complete!        │ │
│                                    │                  │ │
│                                    │ 5 design         │ │
│                                    │ variations       │ │
│                                    │ ready to view    │ │
│                                    └──────────────────┘ │
│                                                          │
│  [Browser Window]                                        │
└─────────────────────────────────────────────────────────┘
```

**Also accessible via:**
- **Action Center**: Click notification icon (🔔) in taskbar
- **Windows key + N**: Opens notification center

### Linux (Ubuntu/Fedora)
```
┌─────────────────────────────────────────────────────────┐
│  [Activities] [Apps]                        [🔔] [🕐]  │ ← Top Bar
│                                                          │
│                                    ┌──────────────────┐ │
│                                    │ KalaBandhu       │ │ ← Notification
│                                    │ 🎨 AI Design     │ │   (top-right)
│                                    │ Generation       │ │
│                                    │ Complete!        │ │
│                                    │                  │ │
│                                    │ 5 variations     │ │
│                                    │ ready            │ │
│                                    └──────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Mobile Platforms

### iOS (iPhone/iPad)
```
┌─────────────────────────────────┐
│ 🕐 9:41 AM              [🔋][📶]│ ← Status Bar
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🎨 KalaBandhu               │ │ ← Banner Notification
│ │ AI Design Generation        │ │   (slides down from top)
│ │ Complete!                   │ │
│ │                             │ │
│ │ 5 design variations ready   │ │
│ │ to view                     │ │
│ │                             │ │
│ │ [View] [Close]              │ │
│ └─────────────────────────────┘ │
│                                 │
│  [App Content Below]            │
│                                 │
└─────────────────────────────────┘
```

**Also appears in:**
- **Notification Center**: Swipe down from top
- **Lock Screen**: If phone is locked
- **Includes**: Vibration (buzz buzz)

### Android
```
┌─────────────────────────────────┐
│ 🕐 9:41 AM    [📶][🔋][🔔]     │ ← Status Bar
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🎨 KalaBandhu               │ │ ← Notification
│ │ AI Design Generation        │ │   (slides down)
│ │ Complete!                   │ │
│ │                             │ │
│ │ 5 design variations ready   │ │
│ │                             │ │
│ │ [OPEN] [DISMISS]            │ │
│ └─────────────────────────────┘ │
│                                 │
│  [App Content Below]            │
│                                 │
└─────────────────────────────────┘
```

**Also appears in:**
- **Notification Drawer**: Swipe down from top
- **Lock Screen**: If phone is locked
- **Includes**: Vibration pattern [buzz-pause-buzz-pause-buzz]

## Special Scenarios

### 1. Browser Minimized
```
macOS Dock:
┌─────────────────────────────────────────┐
│ [Finder] [Chrome*] [Safari] [Terminal] │ ← Red badge on Chrome icon
└─────────────────────────────────────────┘
         ↑
    Notification badge appears here
```

### 2. Tab in Background
```
Browser Tabs:
┌──────────┬──────────┬──────────┬──────────┐
│ Gmail    │ Twitter  │ KalaBandhu* │ Docs  │ ← Red dot on tab
└──────────┴──────────┴──────────┴──────────┘
                      ↑
              Notification indicator
```

### 3. Full Screen Mode
- Notification appears **over** full screen content
- Slides in from top (macOS) or corner (Windows)
- Auto-hides after 10 seconds

### 4. Do Not Disturb Mode
- **macOS**: Notifications are silenced but stored in Notification Center
- **Windows**: Notifications are hidden during Focus Assist
- **iOS/Android**: Notifications are silenced but appear on lock screen

## Notification Behavior

### Click Actions
```
User clicks notification
        ↓
Browser window comes to front
        ↓
Tab with KalaBandhu becomes active
        ↓
User sees the generated designs
```

### Auto-Close Timing
- **Connection Restored**: 10 seconds
- **Sync Complete**: 10 seconds
- **Products Cached**: 10 seconds
- **AI Generation Complete**: Stays until clicked (requireInteraction: true)

### Sound & Vibration
- **Desktop**: System notification sound
- **Mobile**: Vibration pattern: [200ms, 100ms, 200ms, 100ms, 200ms]
- **Silent Mode**: Can be enabled for non-critical notifications

## Testing Notifications

### To Test on Your Mac:
1. Open the AI Design Generator page
2. Allow notifications when prompted
3. Go offline (DevTools → Network → Offline)
4. Click "Generate Design Variations"
5. Switch to another tab or minimize browser
6. Go back online
7. **Watch top-right corner** → Notification will appear!

### To Test Different Scenarios:
```javascript
// In browser console:

// Test basic notification
notificationManager.showNotification('Test', { 
    body: 'This is a test notification' 
});

// Test AI complete notification
notifyAIGenerationComplete(5);

// Test connection restored
notificationManager.notifyConnectionRestored();
```

## Browser-Specific Differences

### Chrome/Edge (Your likely browser)
- **Location**: Top-right corner
- **Style**: Material Design
- **Duration**: 10 seconds (or until clicked)
- **Sound**: System sound
- **Actions**: View, Close buttons

### Safari (macOS)
- **Location**: Top-right corner
- **Style**: macOS native style
- **Duration**: Configurable in System Preferences
- **Sound**: System sound
- **Integration**: Full macOS Notification Center integration

### Firefox
- **Location**: Top-right corner
- **Style**: Firefox custom style
- **Duration**: 10 seconds
- **Sound**: System sound
- **Privacy**: More privacy-focused settings

## System Settings

### macOS - To Configure:
1. System Preferences → Notifications
2. Find your browser (Chrome/Safari/Firefox)
3. Choose notification style:
   - **Banners**: Auto-hide after a few seconds
   - **Alerts**: Stay until dismissed
4. Enable/disable sounds, badges, etc.

### Windows - To Configure:
1. Settings → System → Notifications
2. Find your browser
3. Configure notification behavior

### Mobile - To Configure:
1. Settings → Notifications
2. Find your browser app
3. Configure sounds, badges, lock screen display
