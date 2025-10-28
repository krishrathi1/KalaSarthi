# Firestore Migration Instructions

## ✅ Completed Migrations

The following files have been successfully migrated to Firestore:

### Models

- ✅ User.ts
- ✅ Product.ts
- ✅ Cart.ts
- ✅ Order.ts
- ✅ Wishlist.ts
- ✅ LoanApplication.ts
- ✅ SalesEvent.ts
- ✅ SalesAggregate.ts

### Services

- ✅ UserService.ts
- ✅ ProductService.ts
- ✅ CartService.ts
- ✅ LoanApplicationService.ts

## ⚠️ Remaining Files to Update

### High Priority Services

These services are actively used and need immediate migration:

1. **WishlistService.ts**

   - Replace: `import Wishlist from "../models/Wishlist"`
   - With: `import { IWishlist } from "../models/Wishlist"`
   - Replace: `import connectDB from "../mongodb"`
   - With: `import { FirestoreService, COLLECTIONS, where } from "../firestore"`
   - Replace all `await connectDB()` calls
   - Replace `Wishlist.findOne()` with `FirestoreService.query()`
   - Replace `wishlist.save()` with `FirestoreService.update()`

2. **OrderService.ts**

   - Similar pattern as above
   - Replace Order model imports
   - Update all CRUD operations to use FirestoreService
   - Handle sales event emissions (SalesEventService also needs update)

3. **SalesEventService.ts**
   - Replace SalesEvent model with interface
   - Update event emission to use FirestoreService
   - Replace `salesEvent.save()` with `FirestoreService.create()`

### Medium Priority Services

These services are used for analytics and background jobs:

4. **FinanceAdvisorService.ts**

   - Replace SalesAggregate queries
   - Update aggregation logic (client-side)
   - Replace `SalesAggregate.find()` with `FirestoreService.query()`

5. **AnomalyService.ts**

   - Update to use Firestore for alert storage
   - Replace Mongoose model with interface

6. **SecurityService.ts**

   - Update security log storage
   - Replace MongoDB operations

7. **CacheService.ts**

   - Update cache storage mechanism
   - Consider using Redis instead of Firestore for caching

8. **UnifiedNotificationService.ts**

   - Update notification storage
   - Replace MongoDB operations

9. **DocumentPreparationService.ts**

   - Update document storage
   - Replace MongoDB operations

10. **ChatStorageService.ts**

    - Update chat message storage
    - Replace MongoDB operations with Firestore

11. **LoanEligibilityService.ts**

    - Update eligibility calculation storage
    - Replace MongoDB operations

12. **ObservabilityService.ts**
    - Update metrics storage
    - Consider using dedicated observability tools

### Background Jobs

13. **realtime-aggregation-service.ts**

    - Update to use Firestore for aggregation
    - Replace Order and SalesAggregate models

14. **sales-backfill-job.ts**
    - Update to use Firestore
    - Replace Order and SalesAggregate models

### API Routes

15. **finance/sales/route.ts**

    - Remove `import connectDB from '@/lib/mongodb'`
    - Remove `await connectDB()` calls
    - Replace `SalesAggregate.find()` with FirestoreService

16. **finance/forecasts/route.ts**

    - Similar updates as sales route

17. **finance/products/performance/route.ts**

    - Similar updates as sales route

18. **products/[productId]/amazon-listing/route.ts**
    - Replace `import dbConnect from '@/lib/mongodb'`
    - Update Product model usage

## Quick Migration Pattern

For each service file, follow this pattern:

### Step 1: Update Imports

```typescript
// REMOVE
import ModelName from "../models/ModelName";
import connectDB from "../mongodb";

// ADD
import { IModelName } from "../models/ModelName";
import {
  FirestoreService,
  COLLECTIONS,
  where,
  orderBy,
  limit,
} from "../firestore";
```

### Step 2: Remove connectDB Calls

```typescript
// REMOVE
await connectDB();
```

### Step 3: Replace Create Operations

```typescript
// BEFORE
const doc = new ModelName(data);
await doc.save();

// AFTER
const docId = uuidv4(); // or use a specific ID
await FirestoreService.set(COLLECTIONS.COLLECTION_NAME, docId, data);
```

### Step 4: Replace Read Operations

```typescript
// BEFORE
const doc = await ModelName.findOne({ field: value });

// AFTER
const docs = await FirestoreService.query<IModelName>(
  COLLECTIONS.COLLECTION_NAME,
  [where("field", "==", value), limit(1)]
);
const doc = docs.length > 0 ? docs[0] : null;
```

### Step 5: Replace Update Operations

```typescript
// BEFORE
await ModelName.updateOne({ id }, { $set: updates });

// AFTER
await FirestoreService.update(COLLECTIONS.COLLECTION_NAME, id, updates);
```

### Step 6: Replace Delete Operations

```typescript
// BEFORE
await ModelName.deleteOne({ id });

// AFTER
await FirestoreService.delete(COLLECTIONS.COLLECTION_NAME, id);
```

### Step 7: Replace Aggregations

```typescript
// BEFORE
const stats = await ModelName.aggregate([
  { $group: { _id: "$field", count: { $sum: 1 } } },
]);

// AFTER
const allDocs = await FirestoreService.getAll<IModelName>(
  COLLECTIONS.COLLECTION_NAME
);
const stats = allDocs.reduce((acc, doc) => {
  acc[doc.field] = (acc[doc.field] || 0) + 1;
  return acc;
}, {});
```

## Testing After Migration

For each migrated service, test:

1. Create operations
2. Read operations (single and multiple)
3. Update operations
4. Delete operations
5. Query operations with filters
6. Error handling

## Firestore Indexes

After migration, create these indexes in Firebase Console:

```
Collection: users
- role (Ascending) + createdAt (Descending)

Collection: products
- artisanId (Ascending) + createdAt (Descending)
- status (Ascending) + inventory.isAvailable (Ascending)

Collection: orders
- userId (Ascending) + createdAt (Descending)
- items.artisanId (Ascending) + createdAt (Descending)
- status (Ascending) + createdAt (Descending)

Collection: wishlists
- userId (Ascending)

Collection: carts
- userId (Ascending)

Collection: loan_applications
- userId (Ascending) + createdAt (Descending)
- status (Ascending) + updatedAt (Descending)

Collection: sales_events
- artisanId (Ascending) + eventTimestamp (Descending)
- productId (Ascending) + eventTimestamp (Descending)
- eventType (Ascending) + eventTimestamp (Descending)

Collection: sales_aggregates
- artisanId (Ascending) + period (Ascending) + periodStart (Descending)
- productId (Ascending) + period (Ascending) + periodStart (Descending)
```

## Final Cleanup

After all migrations are complete and tested:

1. Remove MongoDB dependency:

   ```bash
   npm uninstall mongoose
   ```

2. Delete mongodb.ts file:

   ```bash
   rm src/lib/mongodb.ts
   ```

3. Remove MongoDB environment variable:

   ```env
   # Remove this line from .env
   MONGODB_URI=...
   ```

4. Update package.json scripts if needed

5. Run full test suite

## Rollback Plan

If issues arise:

1. Keep MongoDB connection active during migration
2. Test each service individually
3. Use feature flags to switch between MongoDB and Firestore
4. Keep backups of all data

## Support

For questions or issues:

- Review FIRESTORE_MIGRATION_COMPLETE.md for patterns
- Check Firebase Console for Firestore errors
- Test with small datasets first
- Monitor Firestore usage and costs
