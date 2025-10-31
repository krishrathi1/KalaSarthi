// Service Worker for KalaSarthi Offline Support
const VERSION = '2.2.0'; // Fixed Next.js chunk caching issue
const CACHE_NAME = `kalabandhu-v${VERSION}`;
const STATIC_CACHE = `kalabandhu-static-v${VERSION}`;
const DYNAMIC_CACHE = `kalabandhu-dynamic-v${VERSION}`;
const API_CACHE = `kalabandhu-api-v${VERSION}`;

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
    static: Infinity, // Never expire
    dynamic: 24 * 60 * 60 * 1000, // 24 hours
    api: 30 * 60 * 1000, // 30 minutes
};

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/dashboard',
    '/trend-spotter',
    '/smart-product-creator',
    '/artisan-buddy',
    '/matchmaking',
    '/multi-marketplace',
    '/profile',
    '/auth',
    '/scheme-sahayak',
    '/manifest.json',
    '/offline.html'
];

// Auth-sensitive endpoints that should NEVER be cached
const AUTH_ENDPOINTS = [
    '/api/users/',           // User data (auth-sensitive)
    '/api/auth/',            // Authentication
    '/firebase',             // Firebase auth
    '/__/auth/',             // Firebase auth helpers
];

// Next.js internal files that should NEVER be cached (they change on every build)
const NEXTJS_INTERNAL = [
    '/_next/static/chunks/',  // Code chunks
    '/_next/static/css/',     // CSS chunks
    '/_buildManifest.js',     // Build manifest
    '/_ssgManifest.js',       // SSG manifest
];

// All other GET API endpoints will be cached for offline support
// POST/PUT/DELETE requests are never cached (they modify data)

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete caches that don't match current version
                        if (!cacheName.includes(VERSION)) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Clean up expired cache entries
            cleanupExpiredCaches()
        ]).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Clean up expired cache entries
async function cleanupExpiredCaches() {
    try {
        const cache = await caches.open(API_CACHE);
        const requests = await cache.keys();
        const now = Date.now();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const cachedTime = response.headers.get('sw-cache-time');
                if (cachedTime) {
                    const age = now - parseInt(cachedTime);
                    if (age > CACHE_EXPIRATION.api) {
                        await cache.delete(request);
                        console.log('Deleted expired cache entry:', request.url);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up expired caches:', error);
    }
}

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Check if this is a Next.js internal file - NEVER cache these
    const isNextJsInternal = NEXTJS_INTERNAL.some(pattern =>
        url.pathname.includes(pattern)
    );

    if (isNextJsInternal) {
        // Always fetch fresh from network, no caching
        event.respondWith(fetch(request));
        return;
    }

    // Check if this is an auth-sensitive endpoint
    const isAuthEndpoint = AUTH_ENDPOINTS.some(endpoint =>
        url.pathname.includes(endpoint)
    );

    // Never cache auth endpoints - always fetch fresh
    if (isAuthEndpoint) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache all other GET API requests (now that body bug is fixed)
    if (url.pathname.startsWith('/api/') && request.method === 'GET') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // POST/PUT/DELETE API requests - never cache (they modify data)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Handle static file requests
    if (request.method === 'GET') {
        event.respondWith(handleStaticRequest(request));
    }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
    try {
        // Try network first for API calls
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Clone the response BEFORE reading the body
            const responseToReturn = networkResponse.clone();
            const responseToCache = networkResponse.clone();

            // Add cache timestamp to the cached version
            const cachedResponse = new Response(await responseToCache.blob(), {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: new Headers(responseToCache.headers)
            });
            cachedResponse.headers.set('sw-cache-time', Date.now().toString());

            // Cache the response (don't await - cache in background)
            const cache = await caches.open(API_CACHE);
            cache.put(request, cachedResponse);

            // Return the original cloned response with intact body
            return responseToReturn;
        }

        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Network failed, trying cache for:', request.url);

        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Check if cache is still valid
            const cachedTime = cachedResponse.headers.get('sw-cache-time');
            if (cachedTime) {
                const age = Date.now() - parseInt(cachedTime);
                if (age < CACHE_EXPIRATION.api) {
                    return cachedResponse;
                }
            } else {
                // No timestamp, return anyway (legacy cache)
                return cachedResponse;
            }
        }

        // Return offline fallback for specific endpoints
        return handleOfflineApiRequest(request);
    }
}

// Handle static file requests
async function handleStaticRequest(request) {
    try {
        // Ignore chrome-extension and other non-http(s) schemes
        const url = new URL(request.url);
        if (!url.protocol.startsWith('http')) {
            return fetch(request);
        }

        // Try cache first for static files
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, try network
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache the response for future use (only for http/https)
            try {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, networkResponse.clone());
            } catch (cacheError) {
                // Silently fail if caching fails (e.g., for unsupported schemes)
                console.log('Could not cache request:', request.url);
            }
        }

        return networkResponse;
    } catch (error) {
        console.log('Network failed, serving offline page for:', request.url);

        // For navigation requests, serve offline page
        if (request.mode === 'navigate') {
            return caches.match('/offline.html') || new Response('Offline', { status: 503 });
        }

        // For other requests, return a basic offline response
        return new Response('Offline', { status: 503 });
    }
}

// Handle offline API requests with fallback data
async function handleOfflineApiRequest(request) {
    const url = new URL(request.url);

    // Return cached data or fallback responses for different endpoints
    switch (true) {
        case url.pathname.startsWith('/api/trend-spotter'):
            return new Response(JSON.stringify({
                success: true,
                offline: true,
                message: 'Working offline with cached data',
                data: await getCachedTrendData()
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        case url.pathname.startsWith('/api/cart'):
            return new Response(JSON.stringify({
                success: true,
                offline: true,
                cart: await getCachedCartData()
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        case url.pathname.startsWith('/api/wishlist'):
            return new Response(JSON.stringify({
                success: true,
                offline: true,
                wishlist: await getCachedWishlistData()
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        default:
            return new Response(JSON.stringify({
                success: false,
                offline: true,
                message: 'This feature requires internet connection'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
    }
}

// Helper functions to get cached data
async function getCachedTrendData() {
    try {
        const cache = await caches.open(API_CACHE);
        const response = await cache.match('/api/trend-spotter');
        if (response) {
            const data = await response.json();
            return data.workflow?.globalRankedList || [];
        }
    } catch (error) {
        console.error('Error getting cached trend data:', error);
    }
    return [];
}

async function getCachedCartData() {
    try {
        const cache = await caches.open(API_CACHE);
        const response = await cache.match('/api/cart');
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting cached cart data:', error);
    }
    return { items: [], total: 0 };
}

async function getCachedWishlistData() {
    try {
        const cache = await caches.open(API_CACHE);
        const response = await cache.match('/api/wishlist');
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting cached wishlist data:', error);
    }
    return { items: [] };
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        console.log('Performing background sync...');
        // Sync offline data when connection is restored
        await syncOfflineData();

        // Notify all clients that sync is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                data: { timestamp: Date.now() }
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

async function syncOfflineData() {
    // Open IndexedDB to get pending sync items
    const db = await openDatabase();
    if (!db) return;

    const transaction = db.transaction(['applications'], 'readonly');
    const store = transaction.objectStore('applications');
    const index = store.index('status');
    const request = index.getAll('pending_sync');

    request.onsuccess = async () => {
        const pendingApps = request.result || [];
        
        for (const app of pendingApps) {
            try {
                // Attempt to sync each application
                const response = await fetch('/api/scheme-sahayak/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(app)
                });

                if (response.ok) {
                    // Remove from IndexedDB after successful sync
                    const deleteTransaction = db.transaction(['applications'], 'readwrite');
                    const deleteStore = deleteTransaction.objectStore('applications');
                    deleteStore.delete(app.id);
                }
            } catch (error) {
                console.error('Failed to sync application:', app.id, error);
            }
        }
    };
}

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('scheme-sahayak-offline', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('Failed to open database');
            resolve(null);
        };
    });
}

// Cache scheme data with 7-day expiration
async function cacheSchemeData(request, response) {
    const cache = await caches.open(SCHEME_CACHE);
    const clonedResponse = response.clone();
    
    // Add timestamp to response headers
    const headers = new Headers(clonedResponse.headers);
    headers.set('sw-cache-timestamp', Date.now().toString());
    
    const modifiedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers
    });
    
    await cache.put(request, modifiedResponse);
}

// Check if cached scheme data is still valid (within 7 days)
async function isSchemeDataValid(response) {
    const timestamp = response.headers.get('sw-cache-timestamp');
    if (!timestamp) return false;
    
    const age = Date.now() - parseInt(timestamp);
    return age < SCHEME_CACHE_DURATION;
}
