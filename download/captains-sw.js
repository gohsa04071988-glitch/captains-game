/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — service worker (область: /captains.html)
   Морской бой работает без интернета:
   - при первом визите запоминаем игру и иконки в кэш;
   - страница игры: сеть, без сети — сохранённая копия;
   - остальной кэш не трогаем: у «Мира по кусочкам» свой SW.
   Меняем игру — меняем имя CACHE, старый кэш удаляется.
   ============================================================ */

const CACHE = 'captains-cache-v7';
const CORE = [
  '/captains.html',
  '/captains.webmanifest',
  '/captains-icon-192.png',
  '/captains-icon-512.png',
  '/captains-icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== '/captains.html' && !url.pathname.startsWith('/captains-')) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/captains.html', copy));
          return res;
        })
        .catch(() => caches.match('/captains.html')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
