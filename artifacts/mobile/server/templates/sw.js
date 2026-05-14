const CACHE_NAME = 'taximeter-v29';
const BASE_PATH = 'BASE_PATH_PLACEHOLDER';

// ── Install: skip waiting immediately ─────────────────────────────────────────
// Calling skipWaiting() here (not after pre-caching) means the new SW takes
// control the instant it finishes installing, without waiting for all tabs to
// close. Combined with Network-First fetching, every page load gets fresh code.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── Activate: wipe every old cache, claim all tabs ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME })
          );
        })
      )
  );
});

// ── Messages ──────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// ── Fetch: Network-First for every request ────────────────────────────────────
// Always hit the network first. If the network succeeds the response is also
// written into the cache so it is available for offline fallback on the next
// load. If the network fails (offline) the cached version is returned instead.
// This guarantees users always receive the latest deployed code as long as they
// have a connection — no stale bundles, no stuck installations.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
