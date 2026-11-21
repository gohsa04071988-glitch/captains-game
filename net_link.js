'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — net_link.js
   БОЙ С ДРУГОМ — РАДИОРУБКА: лобби (создать бой / войти по
   коду) и связь между двумя браузерами. Библиотека Trystero
   (WebRTC, стратегия MQTT с публичными брокерами) подгружается
   с CDN (четыре зеркала по очереди — v2.2.1) только при открытии
   лобби — остальные режимы работают и без интернета.
   Сообщения боя шлются одним каналом 'm'
   ({t: тип, d: данные}), разбор — в net_duel.js.
   Правила R11: режим = один файл + кнопка через CPT.mode().
   ============================================================ */

const NET_APP_ID = 'cpt-islands-duel-v1';
const NET_CODE_WORDS = ['АКУЛА', 'ШТОРМ', 'ВОЛНА', 'ЯКОРЬ', 'КРАБ',
                        'БУРЯ', 'ПАРУС', 'ОСТРОВ', 'ФЛОТ', 'МАЯК'];
/* Зеркала CDN по очереди: основной jsdelivr местами недоступен
   (в РФ известны блокировки на уровне провайдеров), поэтому
   библиотека пробует esm.sh, затем зеркала jsdelivr. Вся цепочка
   модулей (ядро и mqtt-клиент) грузится с одного и того же зеркала. */
const NET_LIB_URLS = [
  'https://esm.sh/@trystero-p2p/mqtt@0.27.0',
  'https://fastly.jsdelivr.net/npm/@trystero-p2p/mqtt@0.27.0/+esm',
  'https://esm.run/@trystero-p2p/mqtt@0.27.0',
  'https://gcore.jsdelivr.net/npm/@trystero-p2p/mqtt@0.27.0/+esm'
];

/* TURN-релей для мобильных сетей: два телефона в LTE сидят за
   CGNAT оператора — без TURN прямое WebRTC поднимается «через
   раз» (то соединилось, то нет — живая проверка Егора 2026-11-21).
   OpenRelay — публичный бесплатный релей проекта Metered, его
   имя/ключ открыты по дизайну (не секрет). */
const NET_RTC = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:80?transport=tcp',
      username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

const NET_ICON = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 v32"/><path d="M13 8 h15 l-4 5.5 4 5.5 H13" fill="rgba(73,216,207,.18)"/><path d="M31 12 v27"/><path d="M31 31 H17 l4 -5 -4 -5 h14" fill="rgba(245,196,81,.18)"/><path d="M4 44 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c2 -1 3 -1 4 0" opacity=".5"/></svg>';

/* ---------------- состояние радиорубки ---------------- */
let netMod = null;                       // загруженная библиотека
let link = { host: false, size: 'hard', code: '',
             room: null, act: null, peerId: null,
             setup: null, started: false };

/* мост для net_duel.js: тот регистрирует onMsg/onLeave */
CPT.net = {
  onMsg: null, onLeave: null,
  active: () => !!(link.room && link.peerId),
  isHost: () => link.host,
  send: (t, d) => { try { if (link.act) link.act.send({ t, d }); } catch (err) {} },
  close: () => netHangup(true),
  newSetup: () => netBuildSetup()
};

/* ---------------- режим в главном меню ---------------- */
CPT.mode({
  id: 'duel',
  name: 'БОЙ С ДРУГОМ',
  desc: 'по коду · интернет',
  icon: NET_ICON,
  start: function(){ netOpenLobby(); }
});

/* ---------------- стили лобби (style.css заморожен, R9) ---------------- */
(function netInjectStyle(){
  const st = document.createElement('style');
  st.textContent = [
    '.duel-title{ font-size:24px; font-weight:900; letter-spacing:2px; color:var(--ink,#1c3550); margin:2px 0 6px; }',
    '.duel-help{ font-size:13.5px; color:var(--ink-soft,#5f8299); max-width:400px; margin:0 auto 14px; line-height:1.45; }',
    '.duel-row{ display:flex; gap:8px; justify-content:center; align-items:center; flex-wrap:wrap; margin-bottom:12px; }',
    '.duel-input{ font-family:inherit; font-size:16px; font-weight:800; letter-spacing:2px; text-transform:uppercase;',
      'padding:10px 14px; border:2px solid #bfe0ef; border-radius:12px; width:230px; text-align:center;',
      'color:#1c3550; background:#f2fbff; outline:none; }',
    '.duel-input:focus{ border-color:var(--sea,#31a3c9); }',
    '.duel-code-big{ font-size:34px; font-weight:900; letter-spacing:5px; color:#1c3550;',
      'background:#fff5d8; border:2.5px dashed #f0cd77; border-radius:14px; padding:10px 22px; margin:2px 0 10px; }',
    '.duel-status{ min-height:20px; font-size:14px; font-weight:700; color:var(--ink-soft,#5f8299); margin-bottom:10px; }',
    '.duel-status.ok{ color:#2f9e63; } .duel-status.err{ color:#e05656; }'
  ].join('\n');
  document.head.appendChild(st);
})();

/* ---------------- лобби-экран (DOM строится скриптом) ---------------- */
function netOpenLobby(){
  let sc = $('screen-duel');
  if (!sc){
    sc = document.createElement('section');
    sc.id = 'screen-duel';
    sc.className = 'screen';
    sc.innerHTML =
      '<div class="menu-card">' +
        '<h2 class="duel-title">БОЙ С ДРУГОМ</h2>' +
        '<p class="duel-help">Один капитан создаёт бой и называет код другу. Друг вводит код — ' +
        'и оба оказываются в одном море на разных устройствах. ' +
        '<b>Для этого боя интернет нужен у обоих</b> — все остальные режимы работают и без сети.</p>' +
        '<div class="duel-row" id="duel-size-row">' +
          '<button type="button" class="btn-small gold" data-size="easy">Поле 8×8</button>' +
          '<button type="button" class="btn-small gold sel" data-size="hard">Поле 10×10</button>' +
        '</div>' +
        '<div class="duel-row"><button id="duel-create" type="button" class="btn-gold">СОЗДАТЬ БОЙ</button></div>' +
        '<div class="duel-row">' +
          '<input id="duel-code" class="duel-input" maxlength="12" placeholder="НАПРИМЕР ШТОРМ-1234" autocomplete="off">' +
          '<button id="duel-join" type="button" class="btn-gold">ВОЙТИ</button>' +
        '</div>' +
        '<div id="duel-status" class="duel-status"></div>' +
        '<div class="duel-code-big hidden" id="duel-code-big"></div>' +
        '<button id="duel-back" type="button" class="btn-small">← В меню</button>' +
      '</div>';
    document.body.appendChild(sc);
    $('duel-create').addEventListener('click', netCreate);
    $('duel-join').addEventListener('click', netJoinClick);
    $('duel-code').addEventListener('keydown', e => { if (e.key === 'Enter') netJoinClick(); });
    $('duel-back').addEventListener('click', () => { netHangup(true); showScreen('menu'); });
    $('duel-size-row').querySelectorAll('[data-size]').forEach(b => {
      b.addEventListener('click', () => {
        link.size = b.dataset.size;
        $('duel-size-row').querySelectorAll('[data-size]').forEach(x => x.classList.toggle('sel', x === b));
      });
    });
  }
  netLobbyReset();
  showScreen('duel');
}

function netSay(t, cls){
  const el = $('duel-status');
  if (!el) return;
  el.textContent = t;
  el.className = 'duel-status' + (cls ? ' ' + cls : '');
}

function netLobbyReset(){
  netSay('');
  const big = $('duel-code-big');
  if (big) big.classList.add('hidden');
  const inp = $('duel-code');
  if (inp) inp.value = '';
}

/* ---------------- библиотека связи ---------------- */
async function netLoadLib(){
  if (netMod) return netMod;
  if (window.CPT_NET_SRC){                 // стенд подсовывает свой модуль
    netMod = await import(window.CPT_NET_SRC);
    return netMod;
  }
  let last = null;
  for (const url of NET_LIB_URLS){
    try { netMod = await import(url); return netMod; }
    catch (err){ last = err; }
  }
  throw last || new Error('ни одно зеркало CDN не ответило');
}

/* адаптер: свежая библиотека возвращает объект действия,
   старая — пару [send, onMessage]; поддерживаем обе */
function netAction(room, name){
  const a = room.makeAction(name);
  if (Array.isArray(a)) return { send: d => a[0](d), onMessage: fn => a[1](fn) };
  return { send: d => { const r = a.send(d); if (r && r.catch) r.catch(() => {}); },
           onMessage: fn => a.onMessage(x => fn(x)) };
}

function netAdaptRoom(room){
  const joinEv = room.onUserJoin || room.onPeerJoin;
  const leaveEv = room.onUserLeave || room.onPeerLeave;
  const norm = p => (p && typeof p === 'object' && p.userId) ? p.userId : p;
  return {
    onJoin: fn => joinEv.call(room, p => fn(norm(p))),
    onLeave: fn => leaveEv.call(room, p => fn(norm(p))),
    action: name => netAction(room, name),
    leave: () => { try { if (room.leave) room.leave(); } catch (err) {} }
  };
}

/* ---------------- создать бой (капитан-хозяин) ---------------- */
function netNormCode(s){
  return String(s || '').toUpperCase().replace(/\s+/g, '')
    .replace(/Ё/g, 'Е').replace(/[^А-Я0-9-]/g, '');
}

async function netCreate(){
  netSay('Поднимаем радиорубку...');
  let mod;
  try { mod = await netLoadLib(); }
  catch (err){ netSay('Нет связи с сетевой рубкой — для боя с другом нужен интернет.', 'err'); return; }
  try {
    link.host = true;
    link.code = rnd(NET_CODE_WORDS) + '-' + String(1000 + Math.floor(Math.random() * 9000));
    const room = netAdaptRoom(mod.joinRoom(
      { appId: NET_APP_ID, identity: 'none', rtcConfig: NET_RTC },
      netNormCode(link.code)));
    link.room = room;
    link.act = room.action('m');
    link.act.onMessage((msg, pid) => netRecv(msg, pid));
    room.onJoin(pid => {
      if (link.peerId){ CPT.net.send('busy', {}); return; }
      link.peerId = pid;
      netGreetHost();
    });
    room.onLeave(pid => { if (pid === link.peerId) netPeerGone(); });
    const big = $('duel-code-big');
    big.textContent = link.code;
    big.classList.remove('hidden');
    netSay('Ждём друга... Назовите ему код: ' + link.code, 'ok');
  } catch (err){
    netSay('Радиорубка не открылась: ' + err.message, 'err');
  }
}

function netGreetHost(){
  if (!link.setup) link.setup = netBuildSetup();
  netSay('Друг на связи! Готовим море...', 'ok');
  /* приветствие шлём с повторами: первый пакет на мобильном
     интернете иногда теряется — без hello гость так и стоит в лобби */
  let tries = 0;
  const greet = () => {
    if (link.started || !link.room || !link.peerId) return;
    CPT.net.send('hello', link.setup);
    if (++tries < 5) setTimeout(greet, 2500);
  };
  greet();
  setTimeout(() => { if (link.peerId && !link.started) netStartDuel(); }, 800);
}

/* ---------------- войти по коду (второй капитан) ---------------- */
async function netJoinClick(){
  const code = netNormCode($('duel-code').value);
  if (!code || code.length < 3){ netSay('Введите код, который назвал друг!', 'err'); return; }
  netSay('Ищем море по коду ' + code + '...');
  let mod;
  try { mod = await netLoadLib(); }
  catch (err){ netSay('Нет связи с сетевой рубкой — для боя с другом нужен интернет.', 'err'); return; }
  try {
    link.host = false;
    link.code = code;
    const room = netAdaptRoom(mod.joinRoom(
      { appId: NET_APP_ID, identity: 'none', rtcConfig: NET_RTC }, code));
    link.room = room;
    link.act = room.action('m');
    link.act.onMessage((msg, pid) => netRecv(msg, pid));
    room.onJoin(pid => {
      if (!link.peerId){ link.peerId = pid; netSay('Нашли капитана! Налаживаем прямую связь...', 'ok'); }
    });
    room.onLeave(pid => { if (pid === link.peerId) netPeerGone(); });
    /* мобильный интернет налаживает связь до минуты — не пугаем
       раньше времени, просто подсказываем */
    setTimeout(() => {
      if (link.room && !link.setup && !link.started && activeScreen === 'duel')
        netSay('Пока тихо. Проверьте код — и подождите: на мобильном интернете связь налаживается до минуты.');
    }, 12000);
  } catch (err){
    netSay('Радиорубка не открылась: ' + err.message, 'err');
  }
}

/* ---------------- приём сообщений ---------------- */
function netRecv(msg, pid){
  if (!msg || typeof msg !== 'object' || !msg.t) return;
  if (msg.t === 'busy'){ netSay('В этой комнате уже идёт дуэль — создайте свою!', 'err'); return; }
  if (msg.t === 'bye'){ netPeerGone(); return; }
  if (msg.t === 'hello' && !link.host && !link.setup){
    link.setup = msg.d;
    netSay('Море готово! Капитан ждёт вас...', 'ok');
    setTimeout(() => { if (link.setup && !link.started) netStartDuel(); }, 800);
    return;
  }
  if (link.started && CPT.net.onMsg) CPT.net.onMsg(msg.t, msg.d);
}

/* ---------------- сборка моря (только хозяин) ---------------- */
function netBuildSetup(){
  const cfg = FLEETS[link.size] || FLEETS.hard;
  const mapKey = rnd(Object.keys(MAPS));
  return {
    v: 1, size: link.size, mapKey,
    isles: genIslesC(cfg.N, cfg.N >= 10 ? 3 : 2),
    first: Math.random() < .5 ? 'host' : 'guest'
  };
}

function netStartDuel(){
  if (link.started || !link.setup) return;
  if (!link.peerId){ netSay('Друг ещё не в комнате...', 'err'); return; }
  if (typeof duelStart !== 'function'){
    netSay('Потерялся net_duel.js — проверь низ index.html.', 'err');
    return;
  }
  link.started = true;
  duelStart(Object.assign({}, link.setup, { isHost: link.host }));
}

/* ---------------- разрыв связи ---------------- */
function netPeerGone(){
  if (link.started){
    if (CPT.net.onLeave) CPT.net.onLeave();
    return;
  }
  link.peerId = null;
  if (activeScreen === 'duel') netSay('Друг вышел. Назовите код ещё раз — и ждите!', 'err');
}

function netHangup(withBye){
  if (withBye && link.act && link.peerId) CPT.net.send('bye', {});
  if (link.room){
    link.room.leave();
    link.room = null;
  }
  link.act = null;
  link.peerId = null;
  link.setup = null;
  link.started = false;
}
