# 🔧 Clear Auth Cache - Quick Fix

## Problem
Auth showing signup form even though user exists in database.

## Quick Fix (30 seconds)

### Step 1: Open Console
Press **F12** → Click **Console** tab

### Step 2: Run This Command
```javascript
(async () => {
    console.log('🧹 Clearing auth cache...');
    
    // Unregister service worker
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
        await reg.unregister();
        console.log('✅ Service worker unregistered');
    }
    
    // Clear all caches
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
        await caches.delete(name);
        console.log('✅ Cache deleted:', name);
    }
    
    // Clear IndexedDB (optional - keeps offline data)
    // indexedDB.deleteDatabase('KalaBandhuOffline');
    
    console.log('✅ Done! Reloading...');
    
    // Reload page
    setTimeout(() => location.reload(), 1000);
})();
```

### Step 3: Wait
Page will reload automatically in 1 second.

### Step 4: Test
1. Logout
2. Login again
3. Should go directly to dashboard ✅

---

## Alternative: Hard Refresh

If the script doesn't work:

**Windows/Linux**: `Ctrl + Shift + R`
**Mac**: `Cmd + Shift + R`

Then login again.

---

## Verify Fix

After clearing cache, check:

1. **Login** → Should work normally
2. **Network Tab** → `/api/users/[uid]` should NOT show "(from ServiceWorker)"
3. **Products** → Should still work offline
4. **Cart** → Should still work offline

---

## What Was Fixed

✅ Auth endpoints excluded from caching
✅ User API returns no-cache headers
✅ Service worker version bumped to 2.0.1

See [AUTH_CACHE_FIX.md](./AUTH_CACHE_FIX.md) for details.

---

**Status**: 🟢 Ready to test!
