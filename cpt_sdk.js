'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — cpt_sdk.js
   ОБЁРТКА SDK ЯНДЕКС ИГР. v2.3.0 (2026-11-22)

   Зачем: модерация Яндекса требует встроенный SDK с тремя
   обязательными вызовами — LoadingAPI.ready(), GameplayAPI
   start/stop и обработка паузы платформы.

   ПРАВИЛА ОБЁРТКИ:
   1. Активна ТОЛЬКО на доменах Яндекса. На GitHub Pages и в
      локальной папке молчит и ничего не меняет — сайт живёт
      как раньше (проверено: скрипт SDK не подгружается вовсе).
   2. Игра без SDK полностью работоспособна — все вызовы в
      try/catch, обрыв связи SDK ничего не ломает.
   3. Единственные точки соприкосновения с игрой:
      - audioC()   (game_core.js)  — ловим общий аудиоконтекст;
      - showScreen (game_core.js)  — вход/выход из геймплея;
      - btn-start  (index.html)    — старт геймплея по кнопке.
   Ничего не переписываем, только обёртки поверх готовых функций.
   ============================================================ */

(function(){
  /* 1. Где мы? На чужих доменах (GitHub, localhost) обёртка молчит */
  var host = (location.hostname || '').toLowerCase();
  var onYandex = /(^|\.)yandex\.(ru|com|kz|by|net)$/.test(host) ||
                 /(^|\.)games\.s3\./.test(host);
  if (!onYandex) return;

  var sdk = null;        /* ysdk после YaGames.init()           */
  var readySent = false; /* LoadingAPI.ready() отправлен один раз */
  var loaded = false;    /* окно целиком догрузилось             */

  /* 2. Звук: общий контекст игры создаёт фабрика audioC().
     Оборачиваем её, чтобы поймать контекст и уметь глушить
     весь звук одним движением при паузе платформы. */
  var actx = null;
  if (typeof window.audioC === 'function'){
    var origAudioC = window.audioC;
    window.audioC = function(){
      var c = origAudioC();
      if (c && !actx) actx = c;
      return c;
    };
  }
  function soundOff(){ if (actx){ try { actx.suspend(); } catch (e){} } }
  function soundOn(){ if (actx){ try { actx.resume(); } catch (e){} } }

  /* 3. Геймплей: Яндекс хочет знать, когда игрок реально играет.
     Старт — кнопка «В БОЙ!» и любой боевой экран; стоп — меню.
     Защита от дубля: клик по кнопке и смена экрана происходят
     в один клик — стартуем/останавливаем строго по одному разу. */
  var playing = false;
  /* ВАЖНО: в SDK Яндекса GameplayAPI живёт как ysdk.features.GameplayAPI
     (поймано стендом с фальшивым SDK — путь ysdk.GameplayAPI молча пуст) */
  function gpApi(){
    return (sdk && sdk.features && sdk.features.GameplayAPI) || null;
  }
  function gpStart(){
    var g = gpApi();
    if (playing || !g) return;
    playing = true;
    try { g.start(); } catch (e){ playing = false; }
  }
  function gpStop(){
    var g = gpApi();
    if (!playing || !g) return;
    playing = false;
    try { g.stop(); } catch (e){}
  }

  var btn = document.getElementById('btn-start');
  if (btn) btn.addEventListener('click', gpStart);

  /* showScreen объявлена в game_core.js как function — она
     глобальна, поэтому обёртка ставится поверх без правок файла */
  if (typeof window.showScreen === 'function'){
    var origShow = window.showScreen;
    window.showScreen = function(name){
      if (name === 'menu') gpStop(); else gpStart();
      return origShow.apply(this, arguments);
    };
  }

  /* 4. Пауза платформы: игрок свернул игру, реклама, смена вкладки.
     Кадр в скрытом iframe браузер тормозит сам; глушим звук. */
  function onPause(){ soundOff(); }
  function onResume(){ soundOn(); }

  /* 5. LoadingAPI.ready(): «игра готова, можно играть» — отправляем
     один раз, когда И init прошёл, И окно целиком догрузилось. */
  function tryReady(){
    if (readySent || !loaded || !sdk) return;
    readySent = true;
    try {
      if (sdk.features && sdk.features.LoadingAPI) sdk.features.LoadingAPI.ready();
    } catch (e){}
  }
  window.addEventListener('load', function(){
    loaded = true;
    tryReady();
  });

  /* 6. Подключение SDK Яндекса — динамически, только на Яндексе */
  function boot(){
    var s = document.createElement('script');
    s.src = 'https://yandex.ru/games/sdk/v2';
    s.onload = function(){
      if (typeof window.YaGames !== 'function') return;
      window.YaGames.init().then(function(ysdk){
        sdk = ysdk;
        try {
          if (sdk.on){
            sdk.on('game_api_pause', onPause);
            sdk.on('game_api_resume', onResume);
          }
        } catch (e){}
        tryReady();
      }).catch(function(){ /* без SDK игра тоже работает */ });
    };
    s.onerror = function(){ /* SDK не отвечает — молча играем дальше */ };
    document.head.appendChild(s);
  }
  boot();
})();
