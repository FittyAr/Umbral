// Minimal service worker — cache shell + offline fallback.
const CACHE = 'hp-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache admin or API
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;

  // Network-first, fall back to cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.pathname === '/' || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_astro/'))) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => null);
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/'))),
  );
});
