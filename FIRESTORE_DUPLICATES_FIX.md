# Firestore Duplicate Products - FIXED

## Problem
Duplicate products were constantly being added to the Firestore database (35+ requests per page load!).

## Root Causes (FOUND!)
1. **Offline sync loop** - The offline sync manager was running every 30 seconds
2. **Caching products added them to sync queue** - When marketplace cached products for offline use, they were added to the sync queue
3. **Sync tried to POST cached products back** - The sync manager tried to create these cached products on the server, creating duplicates
4. **No duplicate detection** - ProductService wasn't checking if products already existed

## Solutions Applied

### 1. Fixed Offline Sync Loop (CRITICAL FIX)
**Problem:** Cached products were being synced back to server as new products

**Fixed:**
- Added `skipSync` parameter to `storeData()` method
- Marketplace now caches products with `skipSync=true`
- Cached products are marked as already synced, won't be added to sync queue
- Reduced sync interval from 30 seconds to 5 minutes

### 2. Added Duplicate Detection in ProductService
Updated `createProduct()` method to check for existing products before creating:
- Checks for products with same `name` + `artisanId`
- Compares price (within 10 rupees) and category
- Returns existing product instead of creating duplicate
- Logs warning when duplicate is detected

### 3. Created Cleanup Script
Created `scripts/remove-duplicate-products.ts` to clean existing duplicates:
- Groups products by `artisanId` + `name` + `category`
- Keeps the oldest product (by `createdAt`)
- Deletes all newer duplicates
- Provides detailed summary and verification

## How to Clean Up Existing Duplicates

### Run the Cleanup Script
```bash
npx tsx scripts/remove-duplicate-products.ts
```

This will:
1. Scan all products in Firestore
2. Identify duplicates (same name, artisan, category)
3. Keep the oldest version
4. Delete all duplicates
5. Verify the cleanup

### Expected Output
```
📊 CLEANUP SUMMARY
==================================================
Total products found:        500
Unique products:             50
Duplicates found:            450
Successfully deleted:        450
Errors:                      0
Remaining products:          50
==================================================
```

## Prevention

### The fix prevents future duplicates by:
1. **Skip sync for cached data** - Products fetched from API are cached with `skipSync=true`
2. **Reduced sync frequency** - Sync runs every 5 minutes instead of 30 seconds
3. **Duplicate check** - Before creating, checks if product exists
4. **Returns existing** - If duplicate found, returns existing product instead
5. **Logs warnings** - Alerts when duplicate creation is attempted

### Key Changes:
- **Marketplace caching**: `storeOffline('product', product, id, true)` - the `true` flag prevents sync
- **Sync interval**: Changed from 30 seconds to 5 minutes
- **Sync queue**: Only user-created products are added to sync queue, not fetched products

## Verification

After running the cleanup script:
1. Check Firestore console
2. Count products by artisan
3. Verify no duplicates exist
4. Monitor for new duplicates

## Monitoring

To check for duplicates manually:
```typescript
// In Firestore console, run this query:
// Group by: artisanId, name, category
// Count: > 1
```

## Next Steps

1. Run the cleanup script to remove existing duplicates
2. Monitor product creation for a few days
3. If duplicates still appear, investigate:
   - Check browser console for repeated API calls
   - Check service worker logs
   - Check offline sync behavior
   - Add request deduplication middleware
