# AI Design Generator - Offline Mode with Smart Queueing

## Features Added

### 1. Offline Product Viewing
- Products are cached when fetched online
- Cached products are displayed when offline
- Only artisan's own products are shown from cache

### 2. Online/Offline Indicators
- **Online Badge** - Green badge with WiFi icon
- **Offline Badge** - Red badge with WiFi-off icon
- **Sync Button** - Manual sync when online
- **Offline Banner** - Yellow warning banner explaining limitations

### 3. Smart Caching
- Products cached with `skipSync=true` to prevent sync loop
- Only published products with images are cached
- Filtered by artisan ID when loading from cache

### 4. Smart Request Queueing (NEW!)
- **Queue requests when offline** - User can click generate even when offline
- **Auto-execute when online** - Request automatically executes when connection is restored
- **Visual feedback** - Button shows "Waiting for Connection..." state
- **Queue info card** - Blue card shows request is queued with cancel option
- **Connection restoration toast** - Notifies user when generating starts

### 5. Fallback Behavior
- If online fetch fails, automatically falls back to cached data
- Shows appropriate toast messages for each scenario
- Graceful degradation of features

## User Experience

### When Online:
- Full functionality available
- Products fetched from API
- AI generation works immediately
- Products cached in background

### When Offline:
- View cached products
- Browse product details
- Select colors and styles
- **Click generate button** - Request is queued
- **See "Waiting for Connection" state** - Visual feedback
- **Auto-generation when online** - No need to click again!
- Option to cancel queued request

### Connection Restoration Flow:
1. User clicks "Generate" while offline
2. Request is queued, button shows "Waiting for Connection..."
3. Blue info card appears with queue status
4. When connection is restored:
   - Toast notification: "Connection Restored! Generating your AI designs now..."
   - Request automatically executes
   - Results display when complete
5. User can cancel queued request anytime

## Technical Implementation

### Imports Added:
```typescript
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOffline } from '@/hooks/use-offline';
```

### Offline Hook Usage:
```typescript
const {
    isOnline,
    isSyncing,
    storeOffline,
    getOfflineData,
    sync,
} = useOffline();
```

### Caching Strategy:
- Cache products with `skipSync=true` to prevent duplicate creation
- Filter cached products by artisan ID
- Only cache published products with images

### Error Handling:
- Try online fetch first
- Fall back to cache on error
- Show appropriate toast messages
- Prevent AI generation when offline

## Benefits

1. **Better UX** - Users can view products even without internet
2. **Smart Queueing** - Users don't need to remember to retry when online
3. **Clear Communication** - Users know when they're offline and what's happening
4. **No Duplicate Issues** - Using `skipSync=true` prevents sync loop
5. **Graceful Degradation** - Features work as much as possible offline
6. **Automatic Execution** - Request runs automatically when connection is restored
7. **User Control** - Can cancel queued request if they change their mind
8. **Consistent with Marketplace** - Same offline patterns across the app

## Limitations (By Design)

- AI generation requires internet (external API dependency)
- Cannot save new products offline
- Cannot update products offline
- Sync queue not used for read-only operations

## Testing

1. **Online Mode**: Load page, verify products load and AI generation works
2. **Go Offline**: Toggle offline in DevTools, verify cached products show
3. **Try AI Generation Offline**: Verify error message appears
4. **Go Back Online**: Verify sync button works and fresh data loads
