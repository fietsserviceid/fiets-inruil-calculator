
// Service Worker v8.0 – PWA scope voor GitHub Pages submap
const CACHE_NAME = 'fiets-inruil-cache-v8.0';

// Alles wat je offline wilt hebben
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.json',
  './manifest.webmanifest',
  './favicon.ico',
  './logofietsserviceidtransparant-ezgif.com-resize.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      ASSETS.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (resp && resp.ok) await cache.put(url, resp.clone());
        } catch {}
      })
    );
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Netwerk-strategie:
// - data.json / codes.json: netwerk-eerst (altijd vers), val terug op cache
// - navigatie: netwerk met fallback naar cache of  offline index
// - overige assets: cache met update
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Vers houden
  if (url.pathname.endsWith('/data.json') || url.pathname.endsWith('/codes.json')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Navigaties
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        return net;
      } catch {
        return (await caches.match('./index.html')) || new Response('', { status: 503 });
      }
    })());
    return;
  }

  // Overig: cache-first met update
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetching = fetch(req).then(async (resp) => {
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, resp.clone());
      } catch {}
      return resp;
    }).catch(() => cached);
    return cached || fetching;
  })());
});
