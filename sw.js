
// FSID PWA Service Worker (safe cache)
const CACHE_NAME = 'fsid-cache-v20260124-2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js?v=20260124-2',
  './license_mailto_naw.js?v=20260124-2',
  './license_codes.js?v=20260124-2',
  './data.json?v=20260124-2',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // addAll faalt als één request 404 geeft → daarom per stuk met try/catch
      for (const url of ASSETS) {
        try {
          const res = await fetch(url, {cache: 'no-cache'});
          if (res.ok) await cache.put(url, res.clone());
        } catch(e) {
          console.warn('[SW] Skip cache for', url, e);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network-first voor API; cache-first voor overige assets
  if (new URL(req.url).pathname.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req, {ignoreSearch: true}).then(cached => {
      return cached || fetch(req);
    })
  );
});
