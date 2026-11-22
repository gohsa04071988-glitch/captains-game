'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — cpt_tg.js
   ОБЁРТКА ТЕЛЕГРАМ (МИНИ-ПРИЛОЖЕНИЕ). v2.3.1 (2026-11-22)

   Зачем: игру открывают по ссылке из Telegram — из поста или
   из кнопки-меню бота «Играть». Telegram даёт API
   мини-приложения: разворот на весь экран, отключение
   свайпа-закрытия, цвета шапки и фона.

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

    /* «Я готов» + разворот окна: стандартная пара вызова Telegram. */
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
    console.log('CPT.TG v1.0: мини-приложение Telegram активно (' + wa.platform + ')');
  }

  /* Регистр в общем каркасе (R7): CPT.TG { v, active, boot }. */
  window.CPT = window.CPT || {};
  window.CPT.TG = { v: '1.0', active: false, boot: boot };
  window.CPT_TG_BOOT = boot;   /* хук стенда */
  boot();
})();
