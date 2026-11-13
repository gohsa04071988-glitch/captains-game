/* ============================================================
   МИР ПО КУСОЧКАМ — service worker (v1.9)
   Игра полностью работает без интернета:
   - при первом визите запоминаем всё нужное в кэш;
   - страницы: сеть, а без сети — сохранённая «/»;
   - скрипты, стили, иконки: мгновенно из кэша, обновление
     из сети в фоне (свежая версия подхватится сама);
   - /api/version не кэшируем — проверка обновлений живая.
   Меняем версию игры — меняем имя CACHE, старый кэш удаляется.
   ============================================================ */

const CACHE = 'mkpz-cache-v1.9';
const CORE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
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
  if (url.pathname.startsWith('/api/')) return;

  /* Переходы между страницами: сеть, офлайн — сохранённая «/» */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  /* Статика: из кэша сразу, обновление из сети в фоне */
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
