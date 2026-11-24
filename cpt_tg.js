'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — cpt_tg.js
   ОБЁРТКА ТЕЛЕГРАМ (МИНИ-ПРИЛОЖЕНИЕ). v2.3.2 (2026-11-24)

   Зачем: игру открывают по ссылке из Telegram — из поста или
   из кнопки-меню бота «Играть». Telegram даёт API мини-приложения:
   разворот на весь экран, отключение свайпа-закрытия, цвета
   шапки и фона.

   ЧТО ИЗМЕНИЛОСЬ В v2.3.2 (БЫСТРЫЙ СТАРТ):
   Раньше официальный скрипт telegram-web-app.js (~125 КБ) стоял
   в index.html СИНХРОННЫМ тегом и качался у КАЖДОГО игрока —
   даже в обычном браузере, где Telegram не нужен. На мобильном
   интернете он тормозил всю страницу, а если CDN telegram.org
   в сети оператора медленный — держал заставку до таймаута
   («иконка висит и всё»). Теперь: тихий детект «мы внутри
   Telegram?», и только там скрипт Telegram подгружается
   динамически, игру не блокируя. В обычном браузере — ни одного
   байта с telegram.org.

   ПРИЗНАК ТЕЛЕГРАМА: мини-приложение всегда открывается с
   параметрами в адресе страницы (location.hash начинается с
   tgWebAppData / tgWebAppVersion). В обычном браузере их нет —
   запасной признак: подпись Telegram в UserAgent.

   ПРАВИЛА ОБЁРТКИ (те же, что у cpt_sdk.js):
   1. Активна ТОЛЬКО внутри Telegram. В обычном браузере,
      на GitHub Pages и локально молчит — игра живёт как раньше.
   2. Все вызовы в try/catch: старые версии Telegram не знают
      новых методов — обёртка молча пропускает.
   3. С игрой не соприкасается: ничего не переписывает,
      только настраивает окно платформы.
   Хук стенда: window.CPT_TG_BOOT — можно позвать повторно
   с фальшивым window.Telegram (проверка в «чёрном окне»).
   ============================================================ */

(function(){
  var booted = false;   /* защита от повторного запуска        */
  var wa = null;        /* Telegram.WebApp, когда он обнаружен */

  function boot(){
    if (booted) return;
    wa = (window.Telegram && window.Telegram.WebApp) || null;
    /* Внутри Telegram скрипт telegram-web-app.js отдаёт платформу
       (android / ios / tdesktop / macos / web). В обычном браузере
       платформа 'unknown' или её нет — там обёртка молчит. */
    if (!wa || !wa.platform || wa.platform === 'unknown') return;
    booted = true;

    /* «Я готов» + разворот окна: стандартная пара вызова Telegram.
       ready() закрывает заставку бота — теперь она уходит, как
       только скрипт доехал, без ожидания чужого CDN. */
    try { wa.ready(); } catch (e){}
    try { wa.expand(); } catch (e){}

    /* Вертикальный свайп вниз закрывает мини-приложение — гасим,
       чтобы случайный жест не выкинул капитана из боя (7.7+). */
    try { if (wa.disableVerticalSwipes) wa.disableVerticalSwipes(); } catch (e){}

    /* Настоящий полный экран на телефонах (8.0+). Часть платформ
       разрешает его только после касания: если сразу не вышло,
       добиваемся первым тапом по игре. На старых версиях остаётся
       разворот expand() — этого достаточно. */
    try {
      if (wa.requestFullscreen && wa.isFullscreen !== true){
        wa.requestFullscreen();
        document.addEventListener('pointerdown', function tgFullOnce(){
          try { if (wa.isFullscreen !== true) wa.requestFullscreen(); } catch (e){}
        }, { once: true });
      }
    } catch (e){}

    /* Шапка и фон — под палитру игры (светлое небо и глубокое море). */
    try { if (wa.setHeaderColor) wa.setHeaderColor('#bfe3f7'); } catch (e){}
    try { if (wa.setBackgroundColor) wa.setBackgroundColor('#0e3c5f'); } catch (e){}

    if (window.CPT && window.CPT.TG) window.CPT.TG.active = true;
    console.log('CPT.TG v2.3.2: мини-приложение Telegram активно (' + wa.platform + ')');
  }

  /* Детект Telegram: hash мини-приложения или подпись в UserAgent. */
  function isTelegram(){
    try {
      if (/tgWebApp/.test(location.hash)) return true;
      if (/Telegram(\/|Desktop|Android|iOS)/i.test(navigator.userAgent)) return true;
    } catch (e){}
    return false;
  }

  /* Динамическая загрузка официального скрипта — только внутри
     Telegram и только не мешая игре: страница к этому моменту
     уже собрана, menu не ждёт чужой CDN. */
  function loadTelegramApi(){
    var s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.async = true;
    s.onload = function(){ boot(); };
    s.onerror = function(){
      /* CDN не доехал — игра работает без обёртки, это не поломка. */
      console.log('CPT.TG: API Telegram недоступен, играем без обёртки');
    };
    (document.body || document.head).appendChild(s);
  }

  /* Регистр в общем каркасе (R7): CPT.TG { v, active, boot }. */
  window.CPT = window.CPT || {};
  window.CPT.TG = { v: '2.3.2', active: false, boot: boot };
  window.CPT_TG_BOOT = boot;   /* хук стенда */

  if (isTelegram()) loadTelegramApi();
})();
