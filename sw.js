// Service Worker v9.9 – root scope met 'zoals-het-was' gedrag voor codes/data
const CACHE_NAME = 'fiets-inruil-cache-v9.9';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js',
  '/manifest.webmanifest', '/favicon.ico',
  '/logofietsserviceidtransparant-ezgif.com-resize.png',
  '/icon-192.png', '/icon-512.png',
  '/data.json'
];

async function safePut(cache, req, resp) {
  try {
    const sameOrigin = new URL(req.url).origin === self.location.origin;
    if (resp && resp.ok && sameOrigin) await cache.put(req, resp.clone());
  } catch {}
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request; 
  const url = new URL(req.url);

  // 'Vers proberen' voor codes.json en data.json; bij fout -> fallback op cache
  if (url.pathname.endsWith('/codes.json') || url.pathname.endsWith('/data.json')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        await safePut(cache, req, fresh);
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // SPA navigatie: netwerk eerst, offline -> index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch { return (await caches.match('/index.html')) || new Response('', { status: 503 }); }
    })());
    return;
  }

  // Overig: cache-first + achtergrond update
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetching = fetch(req).then(async (resp) => {
      const cache = await caches.open(CACHE_NAME);
      await safePut(cache, req, resp);
      return resp;
    }).catch(() => cached);
    return cached || fetching;
  })());
});
