/**
 * TrustChecker Service Worker — Offline-First Mode
 * Caches critical assets, enables offline QR validation, queues sync requests
 */

const CACHE_NAME = 'trustchecker-v2';
const API_CACHE = 'trustchecker-api-v1';
const SYNC_QUEUE = 'trustchecker-sync-queue';

// Assets to cache for offline access
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/main.js',
    '/style.css',
];

// API endpoints to cache for offline reading
const CACHEABLE_API = [
    '/api/products',
    '/api/qr/dashboard-stats',
    '/api/qr/scan-history',
    '/api/health',
    '/api/public/stats',
];

// ─── Install: Pre-cache static assets ───────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// ─── Activate: Clean up old caches + force reload stale pages ──
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(async (keys) => {
            // Delete ALL old caches
            await Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== API_CACHE)
                    .map(key => caches.delete(key))
            );
            // Force reload all open pages to pick up new HTML
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(client => client.navigate(client.url));
        })
    );
    self.clients.claim();
});

// ─── Fetch: Network-first for API + navigation, Cache-first for static ──
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests except for sync queue
    if (event.request.method !== 'GET') {
        // Queue POST/PUT/DELETE for sync when offline
        if (!navigator.onLine) {
            event.respondWith(handleOfflineWrite(event.request));
            return;
        }
        return;
    }

    // API requests: Network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // Navigation requests (HTML pages): Network-first to prevent stale cache
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // Static assets (JS/CSS/fonts/images): Cache-first with network fallback
    event.respondWith(cacheFirstStrategy(event.request));
});

// ─── Cache-First Strategy ───────────────────────────────────
async function cacheFirstStrategy(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return new Response(offlineHTML(), {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// ─── Network-First Strategy ─────────────────────────────────
async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Cache successful API responses
            const url = new URL(request.url);
            if (CACHEABLE_API.some(path => url.pathname.startsWith(path))) {
                const cache = await caches.open(API_CACHE);
                cache.put(request, response.clone());
            }
        }
        return response;
    } catch (err) {
        // Return cached API response if available
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({
            error: 'You are offline. This data is not available in cache.',
            offline: true,
            cached_at: null
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ─── Handle offline write requests ──────────────────────────
async function handleOfflineWrite(request) {
    try {
        const body = await request.clone().text();
        const syncItem = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body,
            timestamp: Date.now()
        };

        // Store in IndexedDB via message to client
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'OFFLINE_QUEUE',
                data: syncItem
            });
        });

        return new Response(JSON.stringify({
            queued: true,
            message: 'Request queued for sync when online',
            sync_id: `sync_${Date.now()}`
        }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to queue request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ─── Background Sync ────────────────────────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === 'trustchecker-sync') {
        event.waitUntil(processQueue());
    }
});

async function processQueue() {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_START' });
    });

    // Notify clients to flush their queue
    clients.forEach(client => {
        client.postMessage({ type: 'FLUSH_QUEUE' });
    });
}

// ─── Push notifications ─────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'TrustChecker', {
            body: data.body || 'New notification',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: data.url || '/'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    // Security: validate URL is same-origin or relative before opening
    let targetUrl = event.notification.data || '/';
    try {
        const parsed = new URL(targetUrl, self.location.origin);
        if (parsed.origin !== self.location.origin) {
            targetUrl = '/'; // Block cross-origin redirect
        }
    } catch {
        targetUrl = '/';
    }
    event.waitUntil(
        self.clients.openWindow(targetUrl)
    );
});

// ─── Offline HTML fallback ──────────────────────────────────
function offlineHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrustChecker — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #0a0a1a; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #00ffcc; margin-bottom: 0.5rem; }
    p { color: #888; margin-bottom: 1rem; }
    .status { background: rgba(255,165,0,0.1); border: 1px solid rgba(255,165,0,0.3); border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #ffa500; }
    button { background: linear-gradient(135deg, #00ffcc, #0088ff); border: none; color: #000; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>TrustChecker is running in offline mode. Some features are limited.</p>
    <div class="status">
      <p>✅ Cached product data available</p>
      <p>✅ QR scans will be queued and synced</p>
      <p>⚠️ Real-time features unavailable</p>
    </div>
    <button onclick="location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;
}
