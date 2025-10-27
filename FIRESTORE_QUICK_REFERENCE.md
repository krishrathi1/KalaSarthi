# Firestore Quick Reference Guide

## Common Operations

### Import Firestore Utilities
```typescript
import { FirestoreService, COLLECTIONS, where, orderBy, limit } from '../firestore';
```

### Create Document
```typescript
// With auto-generated ID
const docId = uuidv4();
await FirestoreService.set(COLLECTIONS.USERS, docId, userData);

// Or use create (auto-generates ID)
const docId = await FirestoreService.create(COLLECTIONS.USERS, userData);
```

### Read Document
```typescript
// By ID
const user = await FirestoreService.getById<IUser>(COLLECTIONS.USERS, userId);

// Query with filters
const users = await FirestoreService.query<IUser>(
  COLLECTIONS.USERS,
  [
    where('role', '==', 'artisan'),
    orderBy('createdAt', 'desc'),
    limit(10)
  ]
);

// Get all documents
const allUsers = await FirestoreService.getAll<IUser>(COLLECTIONS.USERS);
```

### Update Document
```typescript
await FirestoreService.update(COLLECTIONS.USERS, userId, {
  name: 'New Name',
  updatedAt: new Date()
});
```

### Delete Document
```typescript
await FirestoreService.delete(COLLECTIONS.USERS, userId);
```

### Count Documents
```typescript
const count = await FirestoreService.count(
  COLLECTIONS.USERS,
  [where('role', '==', 'artisan')]
);
```

### Batch Operations
```typescript
await FirestoreService.batchWrite([
  { type: 'set', collection: COLLECTIONS.USERS, docId: 'user1', data: user1Data },
  { type: 'update', collection: COLLECTIONS.USERS, docId: 'user2', data: updates },
  { type: 'delete', collection: COLLECTIONS.USERS, docId: 'user3' }
]);
```

## Collection Names

```typescript
COLLECTIONS.USERS                 // 'users'
COLLECTIONS.PRODUCTS              // 'products'
COLLECTIONS.CARTS                 // 'carts'
COLLECTIONS.ORDERS                // 'orders'
COLLECTIONS.WISHLISTS             // 'wishlists'
COLLECTIONS.LOAN_APPLICATIONS     // 'loan_applications'
COLLECTIONS.SALES_EVENTS          // 'sales_events'
COLLECTIONS.SALES_AGGREGATES      // 'sales_aggregates'
```

## Query Operators

```typescript
// Equality
where('status', '==', 'active')

// Inequality
where('age', '>', 18)
where('age', '>=', 18)
where('age', '<', 65)
where('age', '<=', 65)
where('status', '!=', 'deleted')

// Array contains
where('tags', 'array-contains', 'featured')

// In array
where('status', 'in', ['active', 'pending'])

// Not in array
where('status', 'not-in', ['deleted', 'archived'])

// Ordering
orderBy('createdAt', 'desc')
orderBy('name', 'asc')

// Limiting
limit(10)
```

## Common Patterns

### Search (Client-Side)
```typescript
const allProducts = await FirestoreService.getAll<IProduct>(COLLECTIONS.PRODUCTS);
const searchResults = allProducts.filter(product =>
  product.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### Pagination
```typescript
// Get first page
const firstPage = await FirestoreService.query<IProduct>(
  COLLECTIONS.PRODUCTS,
  [orderBy('createdAt', 'desc'), limit(20)]
);

// Get next page (implement with startAfter)
// Note: Requires keeping track of last document
```

### Aggregation (Client-Side)
```typescript
const allOrders = await FirestoreService.getAll<IOrder>(COLLECTIONS.ORDERS);

// Count by status
const statusCounts = allOrders.reduce((acc, order) => {
  acc[order.status] = (acc[order.status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

// Sum revenue
const totalRevenue = allOrders.reduce((sum, order) => 
  sum + order.orderSummary.totalAmount, 0
);

// Average order value
const avgOrderValue = totalRevenue / allOrders.length;
```

### Filtering with Multiple Conditions
```typescript
let results = await FirestoreService.getAll<IProduct>(COLLECTIONS.PRODUCTS);

// Apply filters client-side
results = results.filter(product => {
  if (status && product.status !== status) return false;
  if (category && product.category !== category) return false;
  if (minPrice && product.price < minPrice) return false;
  if (maxPrice && product.price > maxPrice) return false;
  return true;
});

// Sort
results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

### Nested Field Updates
```typescript
// Update nested field
await FirestoreService.update(COLLECTIONS.PRODUCTS, productId, {
  'inventory.quantity': newQuantity,
  'inventory.isAvailable': newQuantity > 0,
  updatedAt: new Date()
});
```

### Array Operations
```typescript
import { arrayUnion, arrayRemove } from '../firestore';

// Add to array
await FirestoreService.update(COLLECTIONS.WISHLISTS, wishlistId, {
  products: arrayUnion({ productId: 'prod123', addedAt: new Date() })
});

// Remove from array
await FirestoreService.update(COLLECTIONS.WISHLISTS, wishlistId, {
  products: arrayRemove({ productId: 'prod123' })
});
```

### Increment/Decrement
```typescript
import { increment } from '../firestore';

// Increment a field
await FirestoreService.update(COLLECTIONS.PRODUCTS, productId, {
  'inventory.quantity': increment(-5) // Decrement by 5
});
```

### Server Timestamp
```typescript
import { serverTimestamp } from '../firestore';

await FirestoreService.update(COLLECTIONS.USERS, userId, {
  lastLoginAt: serverTimestamp()
});
```

## Error Handling

```typescript
try {
  const user = await FirestoreService.getById<IUser>(COLLECTIONS.USERS, userId);
  
  if (!user) {
    return {
      success: false,
      error: 'User not found'
    };
  }
  
  return {
    success: true,
    data: user
  };
} catch (error: any) {
  console.error('Error fetching user:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
```

## Best Practices

### 1. Always Handle Null Results
```typescript
const user = await FirestoreService.getById<IUser>(COLLECTIONS.USERS, userId);
if (!user) {
  // Handle not found case
}
```

### 2. Use Timestamps
```typescript
const data = {
  ...userData,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### 3. Validate Before Write
```typescript
if (!userData.email || !userData.name) {
  throw new Error('Email and name are required');
}
```

### 4. Use Batch for Multiple Operations
```typescript
// Instead of multiple individual writes
await FirestoreService.batchWrite([
  { type: 'update', collection: COLLECTIONS.PRODUCTS, docId: 'prod1', data: update1 },
  { type: 'update', collection: COLLECTIONS.PRODUCTS, docId: 'prod2', data: update2 }
]);
```

### 5. Cache Frequently Accessed Data
```typescript
// Use React Query or similar
const { data: products } = useQuery('products', () =>
  FirestoreService.getAll<IProduct>(COLLECTIONS.PRODUCTS)
);
```

### 6. Denormalize When Needed
```typescript
// Store frequently accessed data together
const order = {
  orderId: 'order123',
  userId: 'user123',
  productSnapshot: {
    name: product.name,
    price: product.price,
    image: product.images[0]
  }
};
```

## Performance Tips

1. **Minimize Reads**: Cache data, use pagination
2. **Use Indexes**: Create composite indexes for common queries
3. **Batch Operations**: Combine multiple writes
4. **Denormalize**: Store related data together
5. **Limit Results**: Always use `limit()` for large collections
6. **Client-Side Filtering**: For complex queries not supported by Firestore

## Common Gotchas

1. **No Regex Search**: Use client-side filtering or external search service
2. **Limited Query Operators**: Can't combine multiple inequality filters
3. **Array Queries**: `array-contains` only works with single values
4. **Ordering**: Must order by the same field you filter on
5. **Timestamps**: Use `serverTimestamp()` for consistent server-side timestamps

## Migration Checklist

- [ ] Replace `connectDB()` calls
- [ ] Replace Mongoose models with interfaces
- [ ] Update create operations
- [ ] Update read operations
- [ ] Update update operations
- [ ] Update delete operations
- [ ] Convert aggregations to client-side
- [ ] Convert regex searches to client-side filtering
- [ ] Add proper error handling
- [ ] Test all CRUD operations
- [ ] Create Firestore indexes
- [ ] Update security rules
