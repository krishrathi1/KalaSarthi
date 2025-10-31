// Service Worker for KalaSarthi Offline Support
const VERSION = '2.3.0'; // Fixed chunk loading issues completely
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
    '/offline.html',
    '/manifest.json'
];

// CRITICAL: URLs that should NEVER be cached (always fetch from network)
const NEVER_CACHE = [
    // Next.js internal files (change on every build)
    '/_next/static/',           // ALL Next.js static files
    '/_next/data/',             // Next.js data files
    '/_buildManifest.js',       // Build manifest
    '/_ssgManifest.js',         // SSG manifest
    '/_middlewareManifest.js',  // Middleware manifest
    '/next-font/',              // Next.js fonts

    // Auth-sensitive endpoints
    '/api/users/',              // User data
    '/api/auth/',               // Authentication
    '/firebase',                // Firebase auth
    '/__/auth/',                // Firebase auth helpers

    // Hot reload and development
    '/_next/webpack-hmr',       // Hot module replacement
    '/__nextjs',                // Next.js internals

    // Browser extensions
    'chrome-extension://',
    'moz-extension://',
];

// Install event - cache only essential static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching essential static files...');
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

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        Promise.all([
            // Delete ALL old caches
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
            cleanupExpiredCaches(),
            // Clear all Next.js chunks from cache
            clearNextJsChunks()
        ]).then(() => {
            console.log('Service Worker activated, all old caches cleared');
            return self.clients.claim();
        })
    );
});

// Clear all Next.js chunks from all caches
async function clearNextJsChunks() {
    try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();

            for (const request of requests) {
                const url = new URL(request.url);
                if (url.pathname.includes('/_next/')) {
                    await cache.delete(request);
                    console.log('Cleared Next.js chunk:', url.pathname);
                }
            }
        }
    } catch (error) {
        console.error('Error clearing Next.js chunks:', error);
    }
}

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

// Check if URL should never be cached
function shouldNeverCache(url) {
    return NEVER_CACHE.some(pattern => url.includes(pattern));
}

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // CRITICAL: Never cache Next.js internal files, auth endpoints, etc.
    if (shouldNeverCache(request.url)) {
        event.respondWith(fetch(request));
        return;
    }

    // Only handle http/https requests
    if (!url.protocol.startsWith('http')) {
        event.respondWith(fetch(request));
        return;
    }

    // Cache only non-auth GET API requests
    if (url.pathname.startsWith('/api/') && request.method === 'GET') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // POST/PUT/DELETE API requests - never cache (they modify data)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Handle static file requests (but not Next.js internals)
    if (request.method === 'GET') {
        event.respondWith(handleStaticRequest(request));
    }
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
    try {
        // Try network first for API calls (with short timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const networkResponse = await fetch(request, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (networkResponse.ok) {
            // Clone responses before reading
            const responseToReturn = networkResponse.clone();
            const responseToCache = networkResponse.clone();

            // Add cache timestamp
            const cachedResponse = new Response(await responseToCache.blob(), {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: new Headers(responseToCache.headers)
            });
            cachedResponse.headers.set('sw-cache-time', Date.now().toString());

            // Cache in background
            caches.open(API_CACHE).then(cache => {
                cache.put(request, cachedResponse);
            });

            return responseToReturn;
        }

        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Network failed for API, trying cache:', request.url);

        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Check if cache is still valid
            const cachedTime = cachedResponse.headers.get('sw-cache-time');
            if (cachedTime) {
                const age = Date.now() - parseInt(cachedTime);
                if (age < CACHE_EXPIRATION.api) {
                    console.log('Serving from cache:', request.url);
                    return cachedResponse;
                }
            } else {
                // No timestamp, return anyway (legacy cache)
                return cachedResponse;
            }
        }

        // Return offline fallback
        return handleOfflineApiRequest(request);
    }
}

// Handle static file requests (images, fonts, etc. - NOT Next.js chunks)
async function handleStaticRequest(request) {
    try {
        const url = new URL(request.url);

        // Try cache first for static assets
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, fetch from network
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Only cache successful responses for static assets
            // Do NOT cache HTML pages (they might have stale data)
            const contentType = networkResponse.headers.get('content-type') || '';
            const shouldCache = (
                contentType.includes('image/') ||
                contentType.includes('font/') ||
                contentType.includes('woff') ||
                url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot)$/i)
            );

            if (shouldCache) {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, networkResponse.clone());
            }
        }

        return networkResponse;
    } catch (error) {
        console.log('Network failed for static request:', request.url);

        // Try cache as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

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

    // Handle manual cache clear request
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('All caches cleared');
                event.ports[0].postMessage({ success: true });
            })
        );
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
                const response = await fetch('/api/scheme-sahayak/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(app)
                });

                if (response.ok) {
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