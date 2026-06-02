const CACHE_NAME = 'toko-pintar-cache-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // Force the new SW to activate immediately
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For JS, CSS, image, font assets — use network first, then cache.
  // NEVER fall back to index.html for these, as it causes MIME type errors.
  const isAsset = /\.(js|mjs|ts|tsx|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)(\?.*)?$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Cache a copy of the successful response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          // If network fails, try cache — but DO NOT fall back to index.html
          return caches.match(request);
        })
    );
    return;
  }

  // For navigation requests (HTML pages), use cache-first then network,
  // and fall back to index.html for SPA routing.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For everything else, try cache then network
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Claim all open clients immediately
      self.clients.claim(),
      // Delete old caches
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => !cacheWhitelist.includes(name))
            .map(name => caches.delete(name))
        )
      )
    ])
  );
});
