// Service worker v7.5 — netwerk-eerst voor codes.json en betere fallbacks
const CACHE_NAME = 'fiets-inruil-cache-v7.5';
const ASSETS = [
  './index.html', './styles.css', './app.js', './data.json',
  './manifest.webmanifest', './favicon.ico', './logofietsserviceidtransparant-ezgif.com-resize.png',
  './404.html', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => { const cache = await caches.open(CACHE_NAME); await Promise.all(ASSETS.map(async (url)=>{ try{ const resp = await fetch(url, {cache:'no-cache'}); if(resp&&resp.ok) await cache.put(url, resp);}catch(e){} })); })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)); await self.clients.claim(); })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request; const url = new URL(req.url);
  if (url.pathname.endsWith('/codes.json')) { event.respondWith((async()=>{ try{ return await fetch(req,{cache:'no-store'});}catch(e){ const cached=await caches.match(req); return cached||Response.error(); } })()); return; }
  if (req.mode === 'navigate') { event.respondWith((async()=>{ try{ const net=await fetch(req); if(!net||!net.ok){ const cached404=await caches.match('./404.html'); return cached404||net; } return net; }catch(e){ return (await caches.match('./index.html'))||Response.error(); } })()); return; }
  event.respondWith((async()=>{ const cached=await caches.match(req); const fetchPromise=fetch(req).then(async resp=>{ try{ const copy=resp.clone(); const cache=await caches.open(CACHE_NAME); cache.put(req, copy);}catch(e){} return resp; }).catch(()=>cached); return cached||fetchPromise; })());
});
