# ⚡ Quick Test Guide - 2 Minutes

## The Fastest Way to Test Offline Features

### 1️⃣ Start App (30 seconds)

```bash
npm run dev
```

Open: `http://localhost:9003`

---

### 2️⃣ Open DevTools (5 seconds)

Press **F12** or **Ctrl+Shift+I**

---

### 3️⃣ Check Service Worker (10 seconds)

1. Click **Application** tab
2. Click **Service Workers** in sidebar
3. Look for: ✅ **"activated and is running"**

**✅ If you see this, service worker is working!**

---

### 4️⃣ Go Offline (5 seconds)

In the Service Workers section:
- ☑️ Check the **"Offline"** checkbox

**You should see a red offline indicator in your app header**

---

### 5️⃣ Test Cart (30 seconds)

1. Navigate to a product
2. Click "Add to Cart"
3. Item should be added
4. You should see "Working offline" message

---

### 6️⃣ Check Storage (10 seconds)

1. Still in **Application** tab
2. Expand **IndexedDB** → **KalaBandhuOffline** → **cart**
3. You should see your cart item

**✅ If you see the item, offline storage works!**

---

### 7️⃣ Go Online & Sync (20 seconds)

1. Uncheck the **"Offline"** checkbox
2. Wait 5 seconds
3. You should see "Syncing..." then "Sync complete"

---

### 8️⃣ Verify (10 seconds)

1. Refresh the page (Ctrl+R)
2. Check cart - item should still be there
3. Check console - should see "Sync completed"

**✅ If item persists, sync works!**

---

## ✅ Success!

If all steps passed, your offline system is working perfectly!

---

## 🐛 Quick Troubleshooting

### Service Worker Not Showing?

```javascript
// Paste in Console:
navigator.serviceWorker.getRegistration().then(reg => 
  console.log(reg ? '✅ Registered' : '❌ Not registered')
);
```

### IndexedDB Not Created?

1. Clear cache (Ctrl+Shift+Delete)
2. Refresh page
3. Check again

### Sync Not Working?

```javascript
// Paste in Console:
import { syncOfflineData } from '@/lib/offline-sync';
syncOfflineData().then(r => console.log('Sync:', r));
```

---

## 📊 Visual Checklist

Look for these in your app:

```
Header (top-right):
┌─────────────────┐
│ 🟢 Online       │  ← When online
│ 🔴 Offline      │  ← When offline
└─────────────────┘

Offline Banner:
┌──────────────────────────────────┐
│ 📡 Working offline               │
│ Changes will sync when online    │
└──────────────────────────────────┘

Sync Button:
┌──────────────┐
│ 🔄 Sync Now  │  ← Click to sync manually
└──────────────┘
```

---

## 🎯 One-Line Test

Paste this in Console for instant status:

```javascript
(async()=>{const sw=await navigator.serviceWorker.getRegistration();const dbs=await indexedDB.databases();console.log('SW:',sw?'✅':'❌','DB:',dbs.some(d=>d.name==='KalaBandhuOffline')?'✅':'❌','Online:',navigator.onLine?'✅':'❌')})();
```

Expected output: `SW: ✅ DB: ✅ Online: ✅`

---

## 📱 Mobile Quick Test

1. Build: `npm run build && npm start`
2. Get IP: `ipconfig` or `ifconfig`
3. On phone: Visit `http://YOUR_IP:8080`
4. Enable airplane mode
5. Test cart/wishlist
6. Disable airplane mode
7. Watch sync happen

---

## ⏱️ Total Time: ~2 Minutes

That's it! Your offline system is tested and working.

For detailed testing, see: [HOW_TO_TEST_OFFLINE.md](./HOW_TO_TEST_OFFLINE.md)
