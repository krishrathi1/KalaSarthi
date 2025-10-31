# 🚀 Offline Features - Quick Start Guide

## 5-Minute Integration

### Step 1: Import the Hook

```typescript
import { useOffline } from '@/hooks/use-offline';
```

### Step 2: Use in Your Component

```typescript
export function MyComponent() {
  const { isOnline, storeOffline, getOfflineData } = useOffline();
  
  // Your component logic
}
```

### Step 3: Handle Online/Offline

```typescript
const loadData = async () => {
  if (isOnline) {
    // Fetch from API
    const data = await fetch('/api/data').then(r => r.json());
    await storeOffline('product', data); // Cache it
    return data;
  } else {
    // Load from cache
    return await getOfflineData('product');
  }
};
```

That's it! Your component now works offline. 🎉

---

## Common Patterns

### Pattern 1: Load with Fallback

```typescript
const loadData = async () => {
  try {
    // Try API first
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Cache for offline use
    await storeOffline('product', data);
    return data;
  } catch (error) {
    // Fallback to offline
    return await getOfflineData('product');
  }
};
```

### Pattern 2: Save with Queue

```typescript
const saveData = async (item) => {
  if (isOnline) {
    // Save to API
    await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  } else {
    // Queue for later sync
    await storeOffline('product', item);
  }
};
```

### Pattern 3: Show Offline UI

```typescript
return (
  <div>
    {!isOnline && (
      <div className="offline-banner">
        📡 Working offline. Changes will sync when online.
      </div>
    )}
    {/* Your content */}
  </div>
);
```

---

## Available Data Types

Store any of these types offline:

- `'product'` - Product data
- `'trend'` - Trend analysis
- `'cart'` - Shopping cart
- `'wishlist'` - Wishlist items
- `'chat'` - Chat messages
- `'profile'` - User profile

---

## Hook API Reference

```typescript
const {
  // Status
  isOnline,          // boolean - Connection status
  isSyncing,         // boolean - Currently syncing
  hasOfflineData,    // boolean - Has cached data
  lastSync,          // number - Last sync timestamp
  storageUsage,      // { used, available } - Storage info
  
  // Methods
  sync,              // () => Promise<boolean> - Manual sync
  storeOffline,      // (type, data, id?) => Promise<string>
  getOfflineData,    // (type) => Promise<any[]>
  updateOffline,     // (type, id, data) => Promise<void>
  deleteOffline,     // (type, id) => Promise<void>
  clearOfflineData,  // () => Promise<void>
  isDataStale,       // (timestamp, maxAge) => boolean
} = useOffline();
```

---

## Testing

### Test Offline Mode

1. Open Chrome DevTools (F12)
2. Application tab → Service Workers
3. Check "Offline"
4. Test your features

### Test Sync

1. Make changes while offline
2. Uncheck "Offline"
3. Watch changes sync automatically

---

## Example: Complete Cart Component

See `src/components/examples/OfflineCartExample.tsx` for a full working example.

---

## Need Help?

- Check `OFFLINE_INTEGRATION_COMPLETE.md` for detailed docs
- See `OFFLINE_COMPATIBILITY_REPORT.md` for architecture
- Look at example components in `src/components/examples/`

---

**Quick Tip**: The offline system works automatically. Just use the hook and handle online/offline states. Everything else (caching, syncing, storage) is handled for you! 🚀
