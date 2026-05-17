/**
 * Service Worker — Offline Caching & PWA Support
 *
 * Caches static assets and generated workbook data via IndexedDB.
 * Strategy: Network-first for API, Cache-first for static assets.
 */

const CACHE_NAME = 'practice-packs-v1';
const STATIC_ASSETS = [
  '/dashboard',
  '/dashboard/generate',
  '/dashboard/settings',
  '/',
];

// ---- Install: cache static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => { /* offline install — ok */ }))
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch: network-first for API, cache-first for static ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API routes — network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets — cache-first
  if (event.request.method === 'GET') {
    event.respondWith(cacheFirst(event.request));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline — content not available', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}
