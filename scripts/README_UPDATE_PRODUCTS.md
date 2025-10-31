# Update Products Status Script

## Purpose

This script ensures all products in Firestore are properly configured for the marketplace by:
1. Adding `status: 'published'` to products without a status field
2. Setting `inventory.isAvailable: true` to make products visible in the marketplace

**Important**: Products need BOTH fields to appear in the Global Bazaar marketplace!

---

## Usage

### Option 1: Using npm script (Recommended)

```bash
npm run update:products-status
```

### Option 2: Using TypeScript version

```bash
npm run update:products-status:ts
```

### Option 3: Direct execution

```bash
# JavaScript
node scripts/update-products-status.js

# TypeScript
npx tsx scripts/update-products-status.ts
```

---

## What It Does

1. **Fetches all products** from Firestore `products` collection
2. **Checks each product** for:
   - `status: 'published'` field
   - `inventory.isAvailable: true` field
3. **Skips products** that are already properly configured
4. **Updates products** to set:
   - `status: 'published'`
   - `inventory.isAvailable: true`
   - `inventory.quantity: 1` (if inventory doesn't exist)
5. **Updates `updatedAt`** timestamp
6. **Verifies** the update after completion

## Why Both Fields Are Required

The marketplace API (`/api/products?status=published`) filters products using:

```typescript
where('status', '==', 'published'),
where('inventory.isAvailable', '==', true)
```

If either field is missing or false, products won't appear in the Global Bazaar!

---

## Output Example

```
==================================================
🔧 FIRESTORE PRODUCT STATUS UPDATER
==================================================

⚠️  This will update ALL products in Firestore
⚠️  Adding status: "published" to products without status

🚀 Starting product status update...

📥 Fetching all products from Firestore...
✅ Found 25 products

⏭️  Skipping prod-001 - already has status: published
✏️  Queued prod-002 for update (1/20)
✏️  Queued prod-003 for update (2/20)
...

💾 Committing batch of 20 updates...
✅ Batch committed successfully

==================================================
📊 UPDATE SUMMARY
==================================================
Total products found:        25
Already had status:          5
Successfully updated:        20
Errors:                      0
==================================================

✅ All products updated successfully!

🔍 Verifying updates...

📊 Verification Results:
Total products:                        25
Fully configured (published + available): 25
Missing status only:                   0
Missing inventory.isAvailable only:   0
Missing both:                          0

✅ Verification passed! All products are properly configured.

✅ Script completed!
```

---

## Requirements

### Environment Variables

Make sure you have these set in your `.env` file:

```env
GOOGLE_CLOUD_PROJECT=your-project-id
# OR
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Path to service account key
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Service Account Key

Ensure `google-credentials.json` exists in your project root with Firestore write permissions.

---

## Safety Features

### 1. Skips Existing Status

Products that already have a `status` field are skipped:

```javascript
if (data.status) {
    console.log(`⏭️  Skipping ${doc.id} - already has status: ${data.status}`);
    continue;
}
```

### 2. Batch Processing

Updates are processed in batches of 500 to respect Firestore limits:

```javascript
const BATCH_SIZE = 500;
```

### 3. Error Handling

Each batch is wrapped in try-catch to prevent total failure:

```javascript
try {
    await batch.commit();
} catch (error) {
    console.error('❌ Batch commit failed:', error);
    errors += batchCount;
}
```

### 4. Verification

After update, the script verifies all products have status:

```javascript
const withStatus = await productsRef.where('status', '==', 'published').get();
console.log(`Products with status 'published': ${withStatus.size}`);
```

---

## What Gets Updated

### Before

```json
{
  "productId": "prod-001",
  "name": "Handwoven Saree",
  "price": 2500,
  "category": "textiles",
  "createdAt": "2024-10-15T10:00:00Z",
  "updatedAt": "2024-10-15T10:00:00Z"
  // Missing status and inventory fields
}
```

### After

```json
{
  "productId": "prod-001",
  "name": "Handwoven Saree",
  "price": 2500,
  "category": "textiles",
  "inventory": {
    "quantity": 1,
    "isAvailable": true              // Added
  },
  "createdAt": "2024-10-15T10:00:00Z",
  "updatedAt": "2024-10-30T15:30:00Z",  // Updated
  "status": "published"                   // Added
}
```

---

## Troubleshooting

### Error: "No products found"

**Cause**: Collection is empty or wrong collection name

**Fix**: Check that products exist in Firestore and collection name is correct

---

### Error: "Permission denied"

**Cause**: Service account doesn't have write permissions

**Fix**: 
1. Check `google-credentials.json` exists
2. Verify service account has Firestore write permissions
3. Check environment variables are set correctly

---

### Error: "Batch commit failed"

**Cause**: Network issue or Firestore quota exceeded

**Fix**:
1. Check internet connection
2. Check Firestore quotas in Firebase console
3. Run script again (it will skip already updated products)

---

### Some products not updated

**Cause**: Partial batch failure

**Fix**: Run the script again - it will only update products without status

---

## Advanced Usage

### Update to Different Status

Edit the script to change the status value:

```javascript
// Change this line
batch.update(doc.ref, {
    status: 'draft',  // or 'archived', 'pending', etc.
    updatedAt: new Date()
});
```

### Update Specific Products

Add a filter before processing:

```javascript
// Only update products from specific artisan
const snapshot = await productsRef
    .where('artisanId', '==', 'specific-artisan-id')
    .get();
```

### Dry Run (Preview Only)

Comment out the batch commit to see what would be updated:

```javascript
// await batch.commit();  // Comment this out
console.log('DRY RUN - No changes made');
```

---

## Files

- `scripts/update-products-status.js` - JavaScript version
- `scripts/update-products-status.ts` - TypeScript version
- `scripts/README_UPDATE_PRODUCTS.md` - This file

---

## Notes

- Script is **idempotent** - safe to run multiple times
- Only updates products **without** status field
- Updates are **atomic** per batch
- **Verification** runs automatically after update
- **No data loss** - only adds fields, doesn't remove anything

---

## Support

If you encounter issues:

1. Check environment variables
2. Verify service account permissions
3. Check Firestore console for products
4. Review error messages in console
5. Run script again (safe to retry)

---

**Last Updated**: October 31, 2025
**Version**: 2.0.0
**Status**: ✅ Ready to use

## Changelog

### v2.0.0 (Oct 31, 2025)
- Added `inventory.isAvailable` field update
- Added `inventory.quantity` default value
- Enhanced verification to check both fields
- Fixed marketplace visibility issue
