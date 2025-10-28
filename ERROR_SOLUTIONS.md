# Common Errors & Solutions

## 1. ❌ "PERMISSION_DENIED: Missing or insufficient permissions"

### Cause
Firestore security rules are blocking access.

### Solution
**Quick Fix (Development):**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Firestore Database → Rules
3. Use test mode rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
4. Click Publish

**See:** [QUICK_START.md](./QUICK_START.md) for detailed steps

---

## 2. ❌ "Invalid time value"

### Cause
Firestore timestamps not being converted to JavaScript Date objects.

### Solution
✅ **Already Fixed!** The `FirestoreService` now automatically converts timestamps.

If you still see this error:

```typescript
// ❌ Don't do this
const date = new Date(user.createdAt); // Already a Date

// ✅ Do this
const date = user.createdAt; // Use directly
```

**See:** [TIMESTAMP_FIX.md](./TIMESTAMP_FIX.md) for details

---

## 3. ❌ "Index not found" or "The query requires an index"

### Cause
Firestore needs a composite index for your query.

### Solution
1. Click the link in the error message (it opens Firebase Console)
2. Or manually create index:
   - Go to Firebase Console → Firestore → Indexes
   - Click "Create Index"
   - Add the fields mentioned in the error

**Common indexes needed:**
```
users: role (Ascending) + createdAt (Descending)
products: artisanId (Ascending) + createdAt (Descending)
orders: userId (Ascending) + createdAt (Descending)
```

**See:** [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) for full list

---

## 4. ❌ "User not authenticated" or "auth.currentUser is null"

### Cause
User is not logged in.

### Solution
```typescript
import { auth } from '@/lib/firebase';

// Check authentication
if (!auth.currentUser) {
  // Redirect to login
  router.push('/login');
  return;
}

// Use authenticated user ID
const userId = auth.currentUser.uid;
```

**Listen for auth changes:**
```typescript
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User logged in:', user.uid);
    } else {
      console.log('User logged out');
    }
  });
  return unsubscribe;
}, []);
```

---

## 5. ❌ "Document not found" or "null returned"

### Cause
Document doesn't exist in Firestore.

### Solution
```typescript
const user = await FirestoreService.getById(COLLECTIONS.USERS, userId);

if (!user) {
  console.error('User not found');
  // Handle missing document
  return;
}

// Use user data
console.log(user.name);
```

**Check Firestore Console:**
1. Go to Firebase Console → Firestore → Data
2. Navigate to the collection
3. Verify the document exists with correct ID

---

## 6. ❌ "Firebase: Error (auth/invalid-api-key)"

### Cause
Firebase configuration is incorrect or missing.

### Solution
Check your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Get correct values:**
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps"
3. Copy the config values

---

## 7. ❌ "Cannot read properties of undefined"

### Cause
Trying to access nested properties that don't exist.

### Solution
Use optional chaining:

```typescript
// ❌ Might crash
const city = user.address.city;

// ✅ Safe
const city = user?.address?.city;

// ✅ With default
const city = user?.address?.city || 'Unknown';
```

---

## 8. ❌ "Quota exceeded" or "Resource exhausted"

### Cause
Too many Firestore operations (reads/writes).

### Solution
1. **Implement caching:**
```typescript
// Use React Query or similar
const { data: products } = useQuery('products', 
  () => FirestoreService.getAll(COLLECTIONS.PRODUCTS),
  { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
);
```

2. **Use pagination:**
```typescript
// Don't fetch all at once
const products = await FirestoreService.query(
  COLLECTIONS.PRODUCTS,
  [limit(20)] // Only get 20
);
```

3. **Check Firebase Console:**
   - Go to Usage tab
   - See what's consuming quota
   - Set up billing alerts

---

## 9. ❌ "Network request failed"

### Cause
No internet connection or Firebase is down.

### Solution
```typescript
try {
  const data = await FirestoreService.getAll(COLLECTIONS.PRODUCTS);
} catch (error) {
  if (error.code === 'unavailable') {
    console.error('No internet connection');
    // Show offline message
  }
}
```

**Enable offline persistence:**
```typescript
// In firebase.ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn\'t support offline');
  }
});
```

---

## 10. ❌ "Cannot find module '@/lib/firestore'"

### Cause
Import path is incorrect or TypeScript config issue.

### Solution
Check `tsconfig.json` has path mapping:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Or use relative imports:**
```typescript
// Instead of
import { FirestoreService } from '@/lib/firestore';

// Use
import { FirestoreService } from '../lib/firestore';
```

---

## 11. ❌ "serverTimestamp is not a function"

### Cause
Incorrect import of serverTimestamp.

### Solution
```typescript
// ✅ Correct import
import { serverTimestamp } from '@/lib/firestore';

// Use it
await FirestoreService.update(COLLECTIONS.USERS, userId, {
  updatedAt: serverTimestamp()
});
```

---

## 12. ❌ "Cannot perform inequality filter on multiple properties"

### Cause
Firestore limitation - can't use multiple inequality filters.

### Solution
Fetch data and filter client-side:

```typescript
// ❌ Won't work in Firestore
const products = await FirestoreService.query(
  COLLECTIONS.PRODUCTS,
  [
    where('price', '>', 100),
    where('stock', '>', 0) // Second inequality
  ]
);

// ✅ Works - filter client-side
const allProducts = await FirestoreService.getAll(COLLECTIONS.PRODUCTS);
const filtered = allProducts.filter(p => 
  p.price > 100 && p.stock > 0
);
```

---

## 13. ❌ "Module not found: Can't resolve 'mongoose'"

### Cause
Old MongoDB imports still in code.

### Solution
Remove mongoose imports:

```typescript
// ❌ Remove this
import mongoose from 'mongoose';
import Model from '../models/Model';

// ✅ Use this
import { IModel } from '../models/Model';
import { FirestoreService, COLLECTIONS } from '../firestore';
```

**Uninstall mongoose:**
```bash
npm uninstall mongoose
```

---

## 14. ❌ "Too many arguments provided to function"

### Cause
Incorrect Firestore query syntax.

### Solution
```typescript
// ❌ Wrong
const users = await FirestoreService.query(
  COLLECTIONS.USERS,
  where('role', '==', 'artisan'),
  orderBy('createdAt', 'desc')
);

// ✅ Correct - wrap in array
const users = await FirestoreService.query(
  COLLECTIONS.USERS,
  [
    where('role', '==', 'artisan'),
    orderBy('createdAt', 'desc')
  ]
);
```

---

## 15. ❌ "Firebase: Error (auth/popup-blocked)"

### Cause
Browser blocked the authentication popup.

### Solution
Use redirect instead of popup:

```typescript
import { signInWithRedirect } from 'firebase/auth';

// Instead of signInWithPopup
await signInWithRedirect(auth, provider);
```

---

## Quick Debugging Checklist

When you encounter an error:

1. **Check browser console** - Look for detailed error messages
2. **Check Firebase Console** - Verify data exists
3. **Check authentication** - Is user logged in?
4. **Check security rules** - Are they published?
5. **Check indexes** - Are they created?
6. **Check environment variables** - Are they set correctly?
7. **Check network tab** - Are requests failing?
8. **Clear cache** - Try hard refresh (Ctrl+Shift+R)

---

## Getting Help

### Check Documentation
- [QUICK_START.md](./QUICK_START.md) - Fix permission errors
- [TIMESTAMP_FIX.md](./TIMESTAMP_FIX.md) - Fix timestamp errors
- [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) - Full migration guide
- [FIRESTORE_QUICK_REFERENCE.md](./FIRESTORE_QUICK_REFERENCE.md) - Code examples

### Firebase Resources
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Common Errors](https://firebase.google.com/docs/firestore/troubleshooting)

### Debug Mode
Enable detailed logging:

```typescript
// In firebase.ts
import { setLogLevel } from 'firebase/firestore';

if (process.env.NODE_ENV === 'development') {
  setLogLevel('debug');
}
```

---

## Still Stuck?

1. Check the error message carefully
2. Search for the error in Firebase docs
3. Check if it's a known Firestore limitation
4. Try the operation in Firebase Console directly
5. Check if your data structure matches your interfaces

Most errors are related to:
- ✅ Security rules (see QUICK_START.md)
- ✅ Missing indexes (create in Firebase Console)
- ✅ Authentication (check auth.currentUser)
- ✅ Data structure (verify in Firestore Console)

Good luck! 🚀
