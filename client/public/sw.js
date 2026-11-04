/* Service worker: makes the app installable and opens fast on mobile.
   - API calls (/api) and uploads are never cached: data is always live.
   - Hashed build files (/assets/*) are cached after first load (their names change on every deploy).
   - Pages are fetched from the network first; the cached app shell is used only when offline. */
const CACHE = 'intra-erp-v1';
const scope = new URL(self.registration.scope).pathname; // e.g. /

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([scope, `${scope}logo-192.png`])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(scope)) return;
  const path = url.pathname.slice(scope.length);
  if (path.startsWith('api/') || path.startsWith('uploads/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(scope, copy));
          return res;
        })
        .catch(() => caches.match(scope)),
    );
    return;
  }

  if (path.startsWith('assets/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
  }
});
