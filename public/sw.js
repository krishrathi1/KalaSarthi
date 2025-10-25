// Service Worker for KalaSarthi Offline Support
const CACHE_NAME = 'kalabandhu-v1.0.0';
const STATIC_CACHE = 'kalabandhu-static-v1.0.0';
const DYNAMIC_CACHE = 'kalabandhu-dynamic-v1.0.0';
const API_CACHE = 'kalabandhu-api-v1.0.0';

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
    '/manifest.json',
    '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/trend-spotter',
    '/api/trend-analysis',
    '/api/products',
    '/api/cart',
    '/api/wishlist',
    '/api/users'
];

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
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE &&
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName !== API_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
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
            // Cache successful API responses
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }

        throw new Error('Network response not ok');
    } catch (error) {
        console.log('Network failed, trying cache for:', request.url);

        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline fallback for specific endpoints
        return handleOfflineApiRequest(request);
    }
}

// Handle static file requests
async function handleStaticRequest(request) {
    try {
        // Try cache first for static files
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, try network
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache the response for future use
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
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
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

async function syncOfflineData() {
    // This would sync any offline changes back to the server
    // Implementation depends on specific data that needs syncing
    console.log('Syncing offline data...');
}
