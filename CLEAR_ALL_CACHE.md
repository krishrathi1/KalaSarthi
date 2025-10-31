# 🧹 Clear All Cache - Complete Reset

## Quick Fix for All API Issues

If you're experiencing any API caching issues, run this complete reset.

---

## One-Command Fix

### Copy and paste this in Console (F12):

```javascript
(async () => {
    console.log('🧹 Starting complete cache clear...\n');
    
    try {
        // 1. Unregister all service workers
        console.log('1️⃣ Unregistering service workers...');
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
            await reg.unregister();
            console.log('   ✅ Unregistered:', reg.scope);
        }
        
        // 2. Clear all caches
        console.log('\n2️⃣ Clearing all caches...');
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            await caches.delete(name);
            console.log('   ✅ Deleted cache:', name);
        }
        
        // 3. Clear localStorage (optional - keeps some settings)
        console.log('\n3️⃣ Clearing localStorage...');
        const lsKeys = Object.keys(localStorage);
        for (const key of lsKeys) {
            if (key.includes('kalabandhu') || key.includes('cache') || key.includes('sync')) {
                localStorage.removeItem(key);
                console.log('   ✅ Removed:', key);
            }
        }
        
        // 4. Clear sessionStorage
        console.log('\n4️⃣ Clearing sessionStorage...');
        sessionStorage.clear();
        console.log('   ✅ Session storage cleared');
        
        // 5. Optional: Clear IndexedDB (keeps offline data if skipped)
        console.log('\n5️⃣ Checking IndexedDB...');
        const dbs = await indexedDB.databases();
        console.log('   ℹ️  Found databases:', dbs.map(db => db.name));
        console.log('   ℹ️  Keeping IndexedDB for offline data');
        console.log('   ℹ️  To clear: indexedDB.deleteDatabase("KalaBandhuOffline")');
        
        console.log('\n✅ Cache clear complete!');
        console.log('🔄 Reloading page in 2 seconds...');
        
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error during cache clear:', error);
        console.log('💡 Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
    }
})();
```

---

## What This Does

### 1. Unregisters Service Workers
- Removes all service worker registrations
- Stops them from intercepting requests
- Forces fresh registration on reload

### 2. Clears All Caches
- Deletes all cache storage
- Removes cached API responses
- Removes cached static files

### 3. Clears localStorage
- Removes sync queue
- Removes cached settings
- Keeps non-cache related data

### 4. Clears sessionStorage
- Removes temporary session data
- Fresh session on reload

### 5. Checks IndexedDB
- Shows what databases exist
- Keeps offline data by default
- Provides command to clear if needed

---

## Alternative Methods

### Method 1: Hard Refresh
**Windows/Linux**: `Ctrl + Shift + R`
**Mac**: `Cmd + Shift + R`

### Method 2: DevTools Clear
1. Press **F12**
2. **Application** tab
3. **Storage** section
4. Click **"Clear site data"**
5. Refresh page

### Method 3: Manual Clear
```javascript
// Service Workers
navigator.serviceWorker.getRegistrations().then(regs => 
    regs.forEach(reg => reg.unregister())
);

// Caches
caches.keys().then(names => 
    names.forEach(name => caches.delete(name))
);

// Storage
localStorage.clear();
sessionStorage.clear();

// Reload
location.reload();
```

---

## Clear IndexedDB (If Needed)

**Warning**: This will delete offline cart/wishlist data!

```javascript
// Clear specific database
indexedDB.deleteDatabase('KalaBandhuOffline');

// Or clear all databases
(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
        indexedDB.deleteDatabase(db.name);
        console.log('Deleted:', db.name);
    }
})();
```

---

## After Clearing Cache

### What to Expect

1. **First Load**: Slower (fetching fresh data)
2. **Service Worker**: Will re-register automatically
3. **Products**: Will be cached again on visit
4. **Auth**: Should work correctly now
5. **Cart/Wishlist**: Will use IndexedDB (not API cache)

### Verify Fix

Run this to check status:
```javascript
(async () => {
    console.log('=== CACHE STATUS ===\n');
    
    // Service Workers
    const regs = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers:', regs.length);
    
    // Caches
    const caches = await caches.keys();
    console.log('Caches:', caches.length);
    console.log('Cache names:', caches);
    
    // Storage
    console.log('localStorage items:', Object.keys(localStorage).length);
    console.log('sessionStorage items:', Object.keys(sessionStorage).length);
    
    // IndexedDB
    const dbs = await indexedDB.databases();
    console.log('IndexedDB databases:', dbs.map(db => db.name));
    
    console.log('\n=== END STATUS ===');
})();
```

**Expected After Clear**:
```
Service Workers: 0 (or 1 if re-registered)
Caches: 0 (or 3 if re-cached)
localStorage items: 0-5 (minimal)
sessionStorage items: 0
IndexedDB databases: ['KalaBandhuOffline'] (if kept)
```

---

## Troubleshooting

### Cache Won't Clear?

Try **Incognito/Private Mode**:
1. Open incognito window
2. Visit your app
3. Test if issues persist
4. If works in incognito → cache issue confirmed

### Service Worker Won't Unregister?

```javascript
// Force unregister
navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
        reg.unregister().then(success => {
            console.log('Unregister:', success ? 'Success' : 'Failed');
        });
    });
});

// Wait 2 seconds then reload
setTimeout(() => location.reload(), 2000);
```

### Still Having Issues?

1. **Close all tabs** of your app
2. **Restart browser**
3. **Clear browser cache** (Settings → Privacy → Clear browsing data)
4. **Try different browser** to isolate issue

---

## Prevention

### For Development

Add this to your workflow:
```javascript
// Add to browser console snippets
// Run before testing
async function devClear() {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(reg => reg.unregister()));
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    console.log('✅ Dev cache cleared');
}
```

### Disable Service Worker (Temporary)

In DevTools:
1. **Application** → **Service Workers**
2. Check **"Bypass for network"**
3. Service worker won't intercept requests

---

## Summary

✅ **Complete Reset**: All caches cleared
✅ **Service Workers**: Unregistered
✅ **Storage**: Cleaned
✅ **IndexedDB**: Optionally kept for offline data

**Run the script, wait for reload, test your app!**

---

**Quick Command** (copy this):
```javascript
(async()=>{const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()));const c=await caches.keys();await Promise.all(c.map(x=>caches.delete(x)));localStorage.clear();sessionStorage.clear();setTimeout(()=>location.reload(),1000)})();
```

---

**Last Updated**: October 30, 2025
**Status**: ✅ Complete Cache Clear Script Ready
