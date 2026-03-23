const CACHE_NAME = 'r5-plan-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for APIs and map tiles
  const url = new URL(req.url);
  const networkFirstHosts = [
    'nominatim.openstreetmap.org',
    'router.project-osrm.org',
    'api.open-meteo.com',
    'geocoding-api.open-meteo.com',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'tile.openstreetmap.org'
  ];
  if (networkFirstHosts.includes(url.host) || url.pathname.includes('/tile/')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for app shell and static assets
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
