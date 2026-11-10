/* Network first, with an offline fallback. Never freeze contact/tracking fixes. */
const CACHE_NAME = 'bms-cache-v3';
const CORE_ASSETS = [
  '/', '/index.html',
  '/css/style.css?v=bms-20261026-1',
  '/js/consent.js?v=bms-20261026-1',
  '/js/script.js?v=bms-20261026-1',
  '/site.webmanifest', '/android-chrome-192x192.png',
  '/android-chrome-512x512.png', '/favicon-32x32.png', '/favicon-16x16.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(CORE_ASSETS))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith('bms-cache-') && name !== CACHE_NAME)
    .map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (_) { /* A full or unavailable cache must not break online navigation. */ }
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await caches.match('/index.html')) || Response.error();
      return Response.error();
    }
  })());
});
