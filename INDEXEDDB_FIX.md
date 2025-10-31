# IndexedDB Schema Error - FIXED

## Problem
```
NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': 
One of the specified object stores was not found.
```

This was caused by:
1. **Naming mismatch**: Schema created stores as `products`, `trends` (plural) but code accessed them as `product`, `trend` (singular)
2. **Missing stores**: `cart`, `wishlist`, and `profile` stores were never created but code tried to use them

## Solution Applied

1. **Fixed store names** - Changed schema to use singular names matching the code:
   - `products` → `product`
   - `trends` → `trend`
   - Added missing: `cart`, `wishlist`, `profile`

2. **Bumped database version** from 1 to 2 to trigger schema upgrade

3. **Fixed all references** in cleanup and clear methods

## How to Clear the Error

The database will auto-upgrade on next page load, but to be safe:

### Option 1: Clear IndexedDB (Recommended)
1. Open DevTools (F12)
2. Go to Application tab
3. Expand "IndexedDB" in left sidebar
4. Right-click "KalaBandhuOffline"
5. Select "Delete database"
6. Refresh the page

### Option 2: Clear All Site Data
1. Open DevTools (F12)
2. Application tab → Clear storage
3. Check all boxes
4. Click "Clear site data"
5. Refresh

## Verification
After refresh, check DevTools → Application → IndexedDB → KalaBandhuOffline:
- Version should be: `2`
- Object stores: `product`, `trend`, `chat`, `cart`, `wishlist`, `profile`, `syncQueue`, `settings`

The errors should be gone and offline storage will work properly.
