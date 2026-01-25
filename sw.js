// Service worker v7.4 — netwerk-eerst voor codes.json en betere fallbacks
const CACHE_NAME = 'fiets-inruil-cache-v7.4';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './data.json',
  './manifest.webmanifest',
  './favicon.svg',
  './logofietsserviceidtransparant-ezgif.com-resize.png',
  './404.html',
  './icon-192.png',
  './icon-512.png'
  // Let op: GEEN './codes.json' hier!
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (resp && resp.ok) await cache.put(url, resp);
      } catch (e) { /* overslaan */ }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) codes.json: altijd netwerk-eerst (no-store), zodat wijzigingen in GitHub direct gelden
  if (url.pathname.endsWith('/codes.json')) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch (e) {
        // optionele fallback naar cache
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // 2) Navigaties: netwerk eerst; bij 404 toon 404.html; bij offline val terug op index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (!net || !net.ok) {
          const cached404 = await caches.match('./404.html');
          return cached404 || net;
        }
        return net;
      } catch (e) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 3) Overig: stale-while-revalidate
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(async resp => {
      try {
        const copy = resp.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, copy);
      } catch {}
      return resp;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
