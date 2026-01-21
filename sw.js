
/* =====================================================
   FSID SERVICE WORKER
   Offline support voor Inruilwaarde Calculator
   ===================================================== */

const CACHE_NAME = "fsid-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./logofietsserviceidtransparant-ezgif.com-resize.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* =====================================================
   INSTALL
   ===================================================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* =====================================================
   ACTIVATE
   ===================================================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* =====================================================
   FETCH
   ===================================================== */
self.addEventListener("fetch", event => {

  // Alleen GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      // ✅ Cache hit → meteen terug
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🌐 Anders: netwerk proberen
      return fetch(event.request)
        .then(networkResponse => {

          // ⚠️ Alleen succesvolle responses cachen
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // ✅ Clone voor cache
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // ❌ Offline fallback (optioneel)
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
