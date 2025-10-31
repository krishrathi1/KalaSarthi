# 🧪 Test Marketplace Offline - Quick Guide

## ⚡ 2-Minute Test

### Step 1: Start App (if not running)
```bash
npm run dev
```

### Step 2: Visit Marketplace
Open: `http://localhost:9003/marketplace`

### Step 3: Check Online Status
Look at the top of the page - you should see:
```
🟢 [Wifi Icon] Online [🔄 Sync Button]
```

### Step 4: Wait for Products to Load
You'll see a toast notification:
```
✅ Products Loaded
X products loaded and cached for offline use.
```

### Step 5: Go Offline
1. Press **F12** (DevTools)
2. Click **Application** tab
3. Click **Service Workers**
4. Check **☑️ Offline** checkbox

### Step 6: Check Offline Mode
You should now see:
```
🔴 [WifiOff Icon] Offline

┌─────────────────────────────────────┐
│ 🔴 Working Offline                  │
│ You're viewing cached products...   │
└─────────────────────────────────────┘
```

### Step 7: Test Browsing
- ✅ Products still visible
- ✅ Search works
- ✅ Filters work
- ✅ Categories work

### Step 8: Test Cart (Offline)
1. Click "Add to Cart" on any product
2. You should see:
```
✅ Added to Cart (Offline)
Item will sync when you're back online.
```

### Step 9: Check IndexedDB
1. DevTools → **Application** → **IndexedDB**
2. Expand **KalaBandhuOffline** → **cart**
3. You should see your cart item

### Step 10: Go Back Online
1. Uncheck **Offline** checkbox
2. Wait 5 seconds
3. You should see:
```
✅ Sync Complete
All data synchronized successfully.
```

---

## ✅ Success!

If all steps passed, your marketplace is fully offline-enabled!

---

## 🐛 Quick Troubleshooting

### Products Don't Load Offline?

**Check**:
```javascript
// In Console:
(async () => {
  const { offlineStorage } = await import('/src/lib/offline-storage.ts');
  const products = await offlineStorage.getProducts();
  console.log('Cached products:', products.length);
})();
```

**Expected**: Should show number of cached products

---

### Cart Not Working Offline?

**Check**:
```javascript
// In Console:
(async () => {
  const { offlineStorage } = await import('/src/lib/offline-storage.ts');
  const cart = await offlineStorage.getCartItems();
  console.log('Cart items:', cart);
})();
```

**Expected**: Should show cart items

---

### Sync Not Happening?

**Check**:
```javascript
// In Console:
(async () => {
  const { offlineStorage } = await import('/src/lib/offline-storage.ts');
  const queue = await offlineStorage.getSyncQueue();
  console.log('Sync queue:', queue);
})();
```

**Expected**: Should show pending sync items

---

## 📊 Visual Checklist

Look for these on the marketplace page:

### When Online:
```
✅ Green "Online" badge
✅ Sync button visible
✅ No offline banner
✅ Products load from API
✅ Toast: "Products Loaded"
```

### When Offline:
```
✅ Red "Offline" badge
✅ No sync button
✅ Yellow offline banner
✅ Products load from cache
✅ Toast: "Working Offline"
```

### When Adding to Cart Offline:
```
✅ Toast: "Added to Cart (Offline)"
✅ Item appears in cart
✅ Item in IndexedDB
✅ Item in sync queue
```

### When Back Online:
```
✅ Green "Online" badge returns
✅ Sync button appears
✅ Offline banner disappears
✅ Toast: "Sync Complete"
✅ Cart synced to server
```

---

## 🎯 One-Command Test

Paste this in Console for instant status:

```javascript
(async () => {
  console.log('=== MARKETPLACE OFFLINE STATUS ===\n');
  
  // Check products
  const { offlineStorage } = await import('/src/lib/offline-storage.ts');
  const products = await offlineStorage.getProducts();
  console.log('Cached Products:', products.length);
  
  // Check cart
  const cart = await offlineStorage.getCartItems();
  console.log('Cart Items:', cart.length);
  
  // Check wishlist
  const wishlist = await offlineStorage.getWishlistItems();
  console.log('Wishlist Items:', wishlist.length);
  
  // Check sync queue
  const queue = await offlineStorage.getSyncQueue();
  console.log('Pending Sync:', queue.length);
  
  // Online status
  console.log('Online:', navigator.onLine ? '✅' : '🔴');
  
  console.log('\n=== END STATUS ===');
})();
```

**Expected Output**:
```
=== MARKETPLACE OFFLINE STATUS ===

Cached Products: 25
Cart Items: 2
Wishlist Items: 1
Pending Sync: 0
Online: ✅

=== END STATUS ===
```

---

## 📱 Mobile Test (Optional)

1. Build: `npm run build && npm start`
2. Get IP: `ipconfig` or `ifconfig`
3. On phone: `http://YOUR_IP:8080/marketplace`
4. Enable airplane mode
5. Test browsing/cart/wishlist
6. Disable airplane mode
7. Watch sync happen

---

## 🎉 Done!

Your marketplace is now fully offline-enabled and tested!

For detailed testing, see: [MARKETPLACE_OFFLINE_IMPLEMENTED.md](./MARKETPLACE_OFFLINE_IMPLEMENTED.md)
