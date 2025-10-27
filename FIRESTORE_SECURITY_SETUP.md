# Firestore Security Rules Setup

## 🔒 The Permission Error

You're seeing `PERMISSION_DENIED: Missing or insufficient permissions` because Firestore has strict security rules by default. This is a **good thing** - it means your data is protected!

## 🚀 Quick Fix (Development Only)

### Option 1: Use Test Mode Rules (Development Only - NOT FOR PRODUCTION!)

For **development and testing only**, you can temporarily allow all reads and writes:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Replace with these **TEMPORARY** rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ DEVELOPMENT ONLY!
    }
  }
}
```

5. Click **Publish**

⚠️ **WARNING**: These rules allow anyone to read/write your database. Only use for development!

### Option 2: Use Production-Ready Rules (Recommended)

I've created a `firestore.rules` file in your project root with proper security rules. To deploy it:

#### Method A: Via Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from your project
5. Paste into the Firebase Console
6. Click **Publish**

#### Method B: Via Firebase CLI (Automated)

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## 📋 What the Rules Do

The production rules (`firestore.rules`) provide:

### Public Access
- ✅ Anyone can read user profiles (for browsing artisans)
- ✅ Anyone can read products (public catalog)

### Authenticated Access
- ✅ Users can create/update their own profile
- ✅ Users can manage their own cart
- ✅ Users can manage their own wishlist
- ✅ Users can create orders
- ✅ Users can view their own orders
- ✅ Users can create loan applications
- ✅ Artisans can manage their own products
- ✅ Users can view sales data

### Protected Operations
- 🔒 Only admins can delete users
- 🔒 Only product owners can update/delete products
- 🔒 Only order owners can view orders
- 🔒 Sales events and aggregates are read-only (server writes only)

## 🔑 Authentication Required

Most operations require authentication. Make sure users are logged in via Firebase Auth:

```typescript
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Sign in user
await signInWithEmailAndPassword(auth, email, password);

// Now Firestore operations will work
```

## 🧪 Testing the Rules

### Test in Firebase Console

1. Go to **Firestore Database** → **Rules**
2. Click **Rules Playground**
3. Test different scenarios:
   - Authenticated user reading their cart
   - Unauthenticated user reading products
   - User trying to access another user's cart

### Test in Your App

```typescript
// This should work (public read)
const products = await FirestoreService.getAll(COLLECTIONS.PRODUCTS);

// This requires authentication
const user = await FirestoreService.getById(COLLECTIONS.USERS, userId);

// This requires user to be authenticated and own the cart
const cart = await FirestoreService.query(
  COLLECTIONS.CARTS,
  [where('userId', '==', currentUserId)]
);
```

## 🔧 Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions" on read

**Cause**: User is not authenticated or trying to access data they don't own.

**Solution**:
```typescript
// Make sure user is authenticated
import { auth } from '@/lib/firebase';

if (!auth.currentUser) {
  // Redirect to login
  router.push('/login');
  return;
}

// Use authenticated user's ID
const userId = auth.currentUser.uid;
```

### Issue 2: "Missing or insufficient permissions" on write

**Cause**: Trying to write to a collection that requires server-side writes (like sales_events).

**Solution**: Use Firebase Admin SDK on the server:

```typescript
// Server-side only (API route)
import admin from 'firebase-admin';

const db = admin.firestore();
await db.collection('sales_events').add(eventData);
```

### Issue 3: Can't write sales events from client

**Cause**: Sales events are protected (server-write only).

**Solution**: This is intentional! Sales events should only be created by your server to prevent tampering. The `SalesEventService` should be called from API routes, not directly from the client.

## 🏗️ Server-Side Operations

For operations that need to bypass security rules (like creating sales events), use Firebase Admin SDK:

### Setup Firebase Admin (Server-Side)

1. Create `src/lib/firebase-admin.ts`:

```typescript
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
```

2. Add to `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. Get service account credentials:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file
   - Copy the values to your `.env`

### Use Admin SDK in API Routes

```typescript
// src/app/api/orders/route.ts
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  // Create order...
  
  // Create sales event (bypasses security rules)
  await adminDb.collection('sales_events').add({
    orderId: order.orderId,
    // ... event data
  });
  
  return Response.json({ success: true });
}
```

## 📊 Rule Testing Checklist

Test these scenarios:

- [ ] Unauthenticated user can read products
- [ ] Unauthenticated user can read user profiles
- [ ] Unauthenticated user CANNOT read carts
- [ ] Authenticated user can read their own cart
- [ ] Authenticated user CANNOT read another user's cart
- [ ] Authenticated user can create products
- [ ] Authenticated user can update their own products
- [ ] Authenticated user CANNOT update other users' products
- [ ] Authenticated user can create orders
- [ ] Authenticated user can read their own orders
- [ ] Authenticated user CANNOT read other users' orders

## 🔐 Security Best Practices

1. **Never use test mode rules in production**
2. **Always validate data on the server**
3. **Use Firebase Admin SDK for sensitive operations**
4. **Implement rate limiting**
5. **Monitor Firestore usage for suspicious activity**
6. **Use environment variables for sensitive data**
7. **Regularly review and update security rules**

## 📚 Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Security Rules Testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Security Rules Best Practices](https://firebase.google.com/docs/firestore/security/rules-conditions)

## 🆘 Still Having Issues?

1. Check Firebase Console → Firestore → Rules to see current rules
2. Check browser console for detailed error messages
3. Verify user is authenticated: `console.log(auth.currentUser)`
4. Test rules in Firebase Console Rules Playground
5. Check that Firebase config is correct in `firebase.ts`

## ✅ Quick Start

For immediate development access:

1. Go to Firebase Console → Firestore → Rules
2. Use test mode rules (shown in Option 1 above)
3. Click Publish
4. Start developing
5. **Before production**: Replace with production rules from `firestore.rules`

Your Firestore is now properly secured! 🎉
