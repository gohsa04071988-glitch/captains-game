'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — cpt-sw.js
   КЭШ-ПАМЯТЬ ИГРЫ (Service Worker). v2.3.2 (2026-11-24)

   Зачем: раньше каждый заход качал игру заново — на мобильном
   интернете меню «думало». Теперь Worker держит копии файлов
   в телефоне: со второго захода меню открывается мгновенно,
   а свежие версии доезжают в фоне.

   ПРАВИЛА (осторожно, как с картой):
   1. Кэшируем ТОЛЬКО файлы этого сайта (same-origin, GET).
      Чужие домены (telegram.org, зеркала CDN дуэли) не трогаем.
   2. index.html — СЕТЬ-ПЕРВЫЙ: свежая версия всегда, кэш —
      запасной путь (офлайн). Остальные файлы — «сначала кэш,
      обновление в фоне»: мгновенно, и к следующему заходу
      копия уже свежая.
   3. Обновление: новая версия игры = новое имя кэша (CACHE),
      старые чистятся при активации. Зависший старый кэш
      не переживёт ни одного захода новой версии.
   4. Ошибки молча пропускаем: Worker не должен ломать игру.
   ============================================================ */

var CACHE = 'cpt-v2.3.2';
var CORE = [   /* обогрев кэша: вход, оформление, значки */
  'index.html', 'style.css', 'fonts.css', 'favicon.ico',
  'favicon-192.png', 'apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(CORE).catch(function(){});   /* недокачали — не беда */
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err){ return; }
  if (url.origin !== location.origin) return;   /* чужие домены — мимо */

  /* Вход игры: сначала сеть, кэш — запасной путь (офлайн). */
  if (url.pathname.endsWith('/') || url.pathname.indexOf('index.html') !== -1){
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.ok){
          var cp = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, cp); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('index.html');
        });
      })
    );
    return;
  }

  /* Остальные файлы своего сайта: сначала кэш, обновление в фоне. */
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if (res && res.ok){
          var cp = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, cp); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
