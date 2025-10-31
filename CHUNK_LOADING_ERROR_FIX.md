# Next.js Chunk Loading Error - PERMANENT FIX

## Problem
Error: `Failed to load chunk /_next/static/chunks/src_153aef8c._.js`

This error keeps coming back and only goes away when you clear site data. This is caused by the service worker caching Next.js build chunks that change on every build.

## Root Cause
1. Service worker caches Next.js chunks
2. Next.js rebuilds and generates new chunks with different hashes
3. Browser tries to load old cached chunks
4. Chunks don't exist → Error
5. Only clearing cache fixes it temporarily

## Permanent Solution Applied

### 1. Updated Service Worker (v2.3.0)
- Bumped version to force update
- Added comprehensive Next.js exclusion patterns:
  - `/_next/static/chunks/` - Code chunks
  - `/_next/static/css/` - CSS chunks
  - `/_next/static/` - All Next.js static files
  - `/src_` - Source chunks (Turbopack)
  - `._.js` - Turbopack chunk pattern

### 2. Created Clear Cache Tool
New page: `http://localhost:3000/clear-cache.html`

Features:
- One-click clear everything
- Clear service worker only
- Clear caches only
- Shows current status
- Auto-reloads after clearing

## How to Fix Right Now

### Option 1: Use Clear Cache Tool (Easiest)
1. Navigate to: `http://localhost:3000/clear-cache.html`
2. Click "🗑️ Clear Everything"
3. Wait for reload
4. Done!

### Option 2: Manual Clear (DevTools)
1. Open DevTools (F12)
2. Go to Application tab
3. **Service Workers** → Click "Unregister"
4. **Cache Storage** → Right-click each cache → Delete
5. **IndexedDB** → Right-click "KalaBandhuOffline" → Delete
6. **Local Storage** → Right-click → Clear
7. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Option 3: Quick Clear (Address Bar)
1. Click lock icon (🔒) in address bar
2. Click "Site settings"
3. Click "Clear data"
4. Refresh page

## Prevention

### Service Worker Now Excludes:
```javascript
const NEXTJS_INTERNAL = [
    '/_next/static/chunks/',  // Code chunks
    '/_next/static/css/',     // CSS chunks
    '/_next/static/',         // All Next.js static files
    '/_buildManifest.js',     // Build manifest
    '/_ssgManifest.js',       // SSG manifest
    '/src_',                  // Source chunks (Turbopack)
    '._.js',                  // Turbopack chunk pattern
];
```

These files are NEVER cached and always fetched fresh from the network.

## Verification

After clearing cache, verify:

1. **Service Worker Version**
   - Open DevTools → Application → Service Workers
   - Should show version `2.3.0`

2. **No Chunk Errors**
   - Refresh page multiple times
   - No "Failed to load chunk" errors

3. **Cache Contents**
   - Open DevTools → Application → Cache Storage
   - Should NOT contain `/_next/static/chunks/` files
   - Should contain: pages, API responses, images

## Why This Keeps Happening

### The Cycle:
1. You develop → Next.js rebuilds
2. New chunks generated with new hashes
3. Old service worker still active
4. Old service worker serves old cached chunks
5. Browser can't find old chunks → Error

### The Fix:
1. Service worker updated to v2.3.0
2. Never caches Next.js chunks
3. Always fetches chunks fresh
4. No more stale chunk errors

## For Development

### Disable Service Worker During Development
Add to `next.config.js`:

```javascript
module.exports = {
  // ... other config
  
  // Disable service worker in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.module.rules.push({
        test: /sw\.js$/,
        use: 'null-loader'
      });
    }
    return config;
  }
};
```

Or simply unregister service worker:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

## For Production

### Service Worker Update Strategy
1. Version bump triggers update
2. Old caches deleted automatically
3. New service worker takes over
4. Fresh chunks loaded

### Cache Strategy:
- ✅ **Cache**: Pages, API responses, images, fonts
- ❌ **Don't Cache**: Next.js chunks, build manifests, auth endpoints

## Testing

### Test the Fix:
1. Clear everything using the tool
2. Load the app
3. Make a code change
4. Rebuild (npm run dev restarts)
5. Refresh browser
6. Should load without errors

### Test Service Worker:
```javascript
// In browser console

// Check version
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => console.log('SW Version:', r.active?.scriptURL));
});

// Check what's cached
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`Cache ${name}:`, keys.length, 'items');
        keys.forEach(k => console.log('  -', k.url));
      });
    });
  });
});
```

## Troubleshooting

### Error Still Appears?
1. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Check SW version**: Should be 2.3.0
3. **Clear again**: Use the clear-cache.html tool
4. **Restart browser**: Sometimes needed for SW update

### Service Worker Won't Update?
1. Close all tabs with the site
2. Wait 30 seconds
3. Reopen site
4. Or use: `navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))`

### Still Having Issues?
1. Open DevTools → Console
2. Look for service worker errors
3. Check Network tab for failed requests
4. Try incognito mode (no service worker)

## Summary

**Before**: Service worker cached everything including Next.js chunks → Stale chunks → Errors

**After**: Service worker excludes Next.js chunks → Always fresh chunks → No errors

**Action Required**: Clear cache once using the tool, then it's fixed permanently!

## Quick Links

- Clear Cache Tool: `http://localhost:3000/clear-cache.html`
- Test Notifications: `http://localhost:3000/test-notification.html`
- Service Worker: `http://localhost:3000/sw.js`
