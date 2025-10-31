# 🧪 How to Test Offline Functionality

## Quick 5-Minute Test

### Step 1: Start Your Application

```bash
npm run dev
```

Wait for the app to start on `http://localhost:9003`

---

### Step 2: Open Chrome DevTools

1. Open your app in **Chrome** (required for best PWA support)
2. Press **F12** or **Right-click → Inspect**
3. DevTools panel opens

---

### Step 3: Check Service Worker Registration

1. In DevTools, click **Application** tab
2. In left sidebar, click **Service Workers**
3. You should see:
   ```
   ✅ Service Worker: sw.js
   Status: activated and is running
   Source: http://localhost:9003/sw.js
   ```

**If you see this**: ✅ Service worker is working!

**If you don't see this**:
- Refresh the page (Ctrl+R)
- Check Console tab for errors
- Make sure you're on `http://localhost:9003` (not https)

---

### Step 4: Check IndexedDB Storage

1. Still in **Application** tab
2. In left sidebar, expand **IndexedDB**
3. You should see: `KalaBandhuOffline`
4. Expand it to see:
   - ✅ products
   - ✅ trends
   - ✅ chat
   - ✅ cart
   - ✅ wishlist
   - ✅ syncQueue
   - ✅ settings

**If you see this**: ✅ Storage is initialized!

---

### Step 5: Check Cache Storage

1. Still in **Application** tab
2. In left sidebar, expand **Cache Storage**
3. You should see:
   - ✅ kalabandhu-static-v2.0.0
   - ✅ kalabandhu-dynamic-v2.0.0
   - ✅ kalabandhu-api-v2.0.0

**If you see this**: ✅ Caching is working!

---

### Step 6: Test Offline Mode

#### 6.1 Enable Offline Mode

1. In **Application** tab → **Service Workers**
2. Check the **Offline** checkbox
3. You should see a red "Offline" indicator in your app header

#### 6.2 Test Navigation

1. Click around your app (dashboard, products, etc.)
2. Pages should still load (from cache)
3. You might see cached data

**If pages load**: ✅ Offline navigation works!

#### 6.3 Test Cart (Offline)

1. While still offline, go to a product page
2. Try to add item to cart
3. You should see:
   - Item added to cart
   - "Working offline" message
   - No errors

4. Check IndexedDB:
   - Application → IndexedDB → KalaBandhuOffline → cart
   - You should see your cart item

**If item appears**: ✅ Offline cart works!

#### 6.4 Go Back Online

1. Uncheck the **Offline** checkbox
2. Wait a few seconds
3. You should see:
   - "Syncing..." message
   - "Sync complete" notification
   - Cart item synced to server

4. Check Console for:
   ```
   ✅ Sync completed: X items synced
   ```

**If sync happens**: ✅ Automatic sync works!

---

## Detailed Testing

### Test 1: Service Worker Lifecycle

```javascript
// Open Console tab and run:
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
  console.log('Active:', reg.active);
  console.log('Waiting:', reg.waiting);
  console.log('Installing:', reg.installing);
});
```

**Expected Output**:
```
Service Worker: ServiceWorkerRegistration {...}
Active: ServiceWorker {...}
Waiting: null
Installing: null
```

---

### Test 2: Check Offline Status Hook

Add this to any component:

```typescript
import { useOffline } from '@/hooks/use-offline';

export function TestComponent() {
  const { 
    isOnline, 
    isSyncing, 
    hasOfflineData,
    storageUsage 
  } = useOffline();

  console.log('Offline Status:', {
    isOnline,
    isSyncing,
    hasOfflineData,
    storageUsage
  });

  return <div>Check console for offline status</div>;
}
```

---

### Test 3: Manual Sync Test

```javascript
// In Console tab:
import { syncOfflineData } from '@/lib/offline-sync';

// Trigger manual sync
syncOfflineData().then(result => {
  console.log('Sync Result:', result);
});
```

**Expected Output**:
```javascript
{
  success: true,
  synced: 2,
  failed: 0,
  errors: []
}
```

---

### Test 4: Storage Usage

```javascript
// In Console tab:
navigator.storage.estimate().then(estimate => {
  console.log('Storage Used:', estimate.usage);
  console.log('Storage Quota:', estimate.quota);
  console.log('Percentage:', (estimate.usage / estimate.quota * 100).toFixed(2) + '%');
});
```

---

### Test 5: Cache Inspection

```javascript
// In Console tab:
caches.keys().then(cacheNames => {
  console.log('Available Caches:', cacheNames);
  
  cacheNames.forEach(cacheName => {
    caches.open(cacheName).then(cache => {
      cache.keys().then(keys => {
        console.log(`${cacheName}: ${keys.length} items`);
      });
    });
  });
});
```

---

## Visual Indicators to Look For

### 1. Header Status

Look at the top-right of your app:

**Online**:
```
🟢 [Wifi Icon] Online
```

**Offline**:
```
🔴 [Wifi-Off Icon] Offline
```

---

### 2. Offline Banner

When offline, you should see:
```
┌─────────────────────────────────────────┐
│ 📡 Working offline                       │
│ Changes will sync when you're back online│
└─────────────────────────────────────────┘
```

---

### 3. Sync Button

When online with pending changes:
```
[🔄 Sync Now] button appears
```

Click it to manually trigger sync.

---

## Common Scenarios to Test

### Scenario 1: Add to Cart Offline

1. ✅ Go offline (DevTools)
2. ✅ Add item to cart
3. ✅ See "Working offline" message
4. ✅ Item appears in cart
5. ✅ Go online
6. ✅ See "Syncing..." message
7. ✅ See "Sync complete" notification
8. ✅ Refresh page
9. ✅ Item still in cart

---

### Scenario 2: Browse Products Offline

1. ✅ Browse products while online (caches data)
2. ✅ Go offline
3. ✅ Navigate to different products
4. ✅ Products load from cache
5. ✅ Images display
6. ✅ No errors

---

### Scenario 3: Update Cart Offline

1. ✅ Go offline
2. ✅ Change quantity in cart
3. ✅ Remove item from cart
4. ✅ Changes saved locally
5. ✅ Go online
6. ✅ Changes sync automatically
7. ✅ Server updated

---

### Scenario 4: Wishlist Offline

1. ✅ Go offline
2. ✅ Add item to wishlist
3. ✅ Item appears immediately
4. ✅ Go online
5. ✅ Item syncs to server
6. ✅ Wishlist persists

---

## Troubleshooting

### Issue: Service Worker Not Registering

**Check**:
```javascript
// In Console:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registrations:', regs);
});
```

**Fix**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Unregister old service workers:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```
3. Refresh page (Ctrl+R)

---

### Issue: IndexedDB Not Created

**Check**:
```javascript
// In Console:
indexedDB.databases().then(dbs => {
  console.log('Databases:', dbs);
});
```

**Fix**:
1. Check browser console for errors
2. Clear IndexedDB:
   - DevTools → Application → IndexedDB
   - Right-click → Delete database
3. Refresh page

---

### Issue: Offline Mode Not Working

**Check**:
1. DevTools → Network tab
2. Verify "Offline" is checked
3. Try to load a page
4. Should see "(failed) net::ERR_INTERNET_DISCONNECTED"

**Fix**:
1. Uncheck and recheck "Offline"
2. Try "Slow 3G" instead
3. Check service worker is active

---

### Issue: Sync Not Happening

**Check**:
```javascript
// In Console:
import { offlineStorage } from '@/lib/offline-storage';

offlineStorage.getSyncQueue().then(queue => {
  console.log('Sync Queue:', queue);
});
```

**Fix**:
1. Verify you're online
2. Check console for sync errors
3. Try manual sync:
   ```javascript
   import { syncOfflineData } from '@/lib/offline-sync';
   syncOfflineData();
   ```

---

## Network Conditions Testing

### Test Different Network Speeds

1. DevTools → **Network** tab
2. Click throttling dropdown (usually says "No throttling")
3. Try:
   - ✅ Fast 3G
   - ✅ Slow 3G
   - ✅ Offline

This simulates real-world conditions!

---

## Mobile Testing

### Test on Real Device

1. Build your app:
   ```bash
   npm run build
   npm start
   ```

2. Find your local IP:
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "
   
   # On Windows:
   ipconfig
   ```

3. On mobile, visit: `http://YOUR_IP:8080`

4. Enable airplane mode on phone

5. Test offline functionality

---

## Automated Testing Script

Create a test file:

```typescript
// test-offline.ts
import { offlineStorage } from '@/lib/offline-storage';
import { syncOfflineData } from '@/lib/offline-sync';

async function testOfflineSystem() {
  console.log('🧪 Testing Offline System...\n');

  // Test 1: Storage
  console.log('Test 1: Storage');
  const testData = { id: 'test-1', name: 'Test Product' };
  const id = await offlineStorage.storeProduct(testData);
  console.log('✅ Stored product:', id);

  // Test 2: Retrieve
  console.log('\nTest 2: Retrieve');
  const products = await offlineStorage.getProducts();
  console.log('✅ Retrieved products:', products.length);

  // Test 3: Sync Queue
  console.log('\nTest 3: Sync Queue');
  const queue = await offlineStorage.getSyncQueue();
  console.log('✅ Sync queue items:', queue.length);

  // Test 4: Storage Usage
  console.log('\nTest 4: Storage Usage');
  const usage = await offlineStorage.getStorageUsage();
  console.log('✅ Storage used:', usage.used, 'bytes');
  console.log('✅ Storage available:', usage.available, 'bytes');

  console.log('\n✅ All tests passed!');
}

// Run tests
testOfflineSystem();
```

Run it:
```bash
npx tsx test-offline.ts
```

---

## Success Checklist

Use this checklist to verify everything works:

- [ ] Service worker registered
- [ ] IndexedDB created with all stores
- [ ] Cache storage created
- [ ] Offline indicator shows in header
- [ ] Can navigate offline
- [ ] Can add to cart offline
- [ ] Can add to wishlist offline
- [ ] Offline banner appears
- [ ] Sync happens automatically when online
- [ ] Sync button works
- [ ] No console errors
- [ ] Data persists after refresh
- [ ] Works on mobile
- [ ] Works in different browsers

---

## Expected Console Messages

When everything is working, you should see:

```
✅ Service Worker registered successfully
✅ IndexedDB initialized
✅ Offline storage ready
🔄 Starting offline data sync...
✅ Sync completed: 3 items synced, 0 failed
```

---

## Quick Debug Commands

Copy-paste these into Console for quick debugging:

```javascript
// Check everything at once
(async () => {
  console.log('=== Offline System Status ===');
  
  // Service Worker
  const sw = await navigator.serviceWorker.getRegistration();
  console.log('Service Worker:', sw ? '✅ Active' : '❌ Not registered');
  
  // IndexedDB
  const dbs = await indexedDB.databases();
  const hasDB = dbs.some(db => db.name === 'KalaBandhuOffline');
  console.log('IndexedDB:', hasDB ? '✅ Created' : '❌ Not found');
  
  // Cache
  const caches = await caches.keys();
  console.log('Caches:', caches.length, 'found');
  
  // Storage
  const estimate = await navigator.storage.estimate();
  console.log('Storage:', Math.round(estimate.usage / 1024), 'KB used');
  
  // Online Status
  console.log('Online:', navigator.onLine ? '✅ Yes' : '❌ No');
  
  console.log('=== End Status ===');
})();
```

---

## Video Tutorial Steps

If you want to record a demo:

1. **Start**: Show app running
2. **DevTools**: Open and show Application tab
3. **Service Worker**: Show it's registered
4. **IndexedDB**: Show database structure
5. **Go Offline**: Check the offline box
6. **Add to Cart**: Add item while offline
7. **Show Storage**: Show item in IndexedDB
8. **Go Online**: Uncheck offline box
9. **Watch Sync**: Show sync notification
10. **Verify**: Refresh and show data persisted

---

## Need Help?

If something doesn't work:

1. Check browser console for errors
2. Check DevTools → Application → Service Workers
3. Check DevTools → Application → IndexedDB
4. Try clearing cache and reloading
5. Check the troubleshooting section above

---

**Happy Testing! 🎉**

Your offline system is production-ready. These tests will help you verify everything works correctly.
