'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — net_duel.js
   БОЙ С ДРУГОМ — СЕТОВАЯ ДУЭЛЬ: два капитана на разных
   устройствах в одном море. Правила классики: один выстрел —
   один ход, острова одинаковые у обоих (их генерирует хозяин
   и пересылает по коду), флоты приватны: выстрел разрешает
   тот, в кого попали, и шлёт результат обратно.
   Ходы: shot/shotRes, радар radar/radarRes, карточки card,
   готовность go, реванш again/setup. Карточки и торпеда —
   в net_cards.js (зеркало game_cards.js).
   Отрисовка и звук — общие с классикой: дуэльное состояние D
   становится глобальным C, и drawClassic рисует его сам (R6).
   Фазы D: duel-place | duel-me | duel-them | duel-fire |
   duel-torp | duel-over — чужие обработчики классики спят.
   ============================================================ */

let D = null;                    // дуэльное состояние (оно же C)
const DUEL_WAIT = {};            // ожидания ответов shotRes/torpRes/radarRes

/* художник-добавка: призрак постановки и прицел на чужой доске
   (у дуэли свои фазы — классический preview не включается) */
CPT.painter(t => {
  if (!D || C !== D || activeScreen !== 'game') return;
  if (D.phase === 'duel-place' && D.hoverP && D.qi < D.queue.length)
    drawPlacePreview(D.gP, D, D.PAD, D.CELL, t);
  if (D.phase === 'duel-me' && D.hoverE)
    drawCrossC(D.gE, D.hoverE, D.PAD, D.CELL);
});

/* ---------------- старт дуэли (вызывает net_link.js) ---------------- */
window.duelStart = function(setup){
  duelCleanup();
  const cfg = FLEETS[setup.size] || FLEETS.hard;
  D = {
    size: setup.size, N: cfg.N, CELL: cfg.CELL, PAD: cfg.PAD,
    fleet: cfg.fleet.slice(), isHost: !!setup.isHost,
    myTurn: (setup.first === (setup.isHost ? 'host' : 'guest')),
    mapKey: setup.mapKey, map: MAPS[setup.mapKey] || MAPS.tropics,
    isles: setup.isles,
    isleSet: new Set(setup.isles.flat().map(([r, c]) => r + ',' + c)),
    phase: 'duel-place',
    pGridC: mkGridC(cfg.N), pRefC: mkGridC(cfg.N), pShips: [],
    pShot: mkGridC(cfg.N),
    eGridC: mkGridC(cfg.N), eRefC: mkGridC(cfg.N), eShips: [],
    eShot: mkGridC(cfg.N),
    queue: cfg.fleet.slice(), qi: 0, hor: true,
    hoverE: null, hoverP: null,
    cards: {}, pick: new Set(),
    shieldOn: false, forcedBlind: false, salvoLeft: 0,
    radarMarks: new Set(),
    cardMode: null, torp: null, torpSurf: 0, torpAnim: null,
    fx: [], t0: performance.now(),
    myReady: false, theirReady: false, goSent: false,
    myAgain: false, theirAgain: false, disconnected: false,
    _mapWin: null, overFn: null
  };
  C = D;
  document.body.dataset.map = D.mapKey;
  $('game-over').classList.add('hidden');
  $('btn-auto').classList.remove('hidden');
  $('btn-rotate').classList.remove('hidden');
  $('place-info').classList.remove('hidden');
  if (panelC) panelC.classList.add('hidden');
  hideTorpPromptC();
  initCanvasC();
  duelBuildCards(null);
  duelBuildTorp();
  setMapBadge('Дуэль · ' + D.map.name);
  updatePlaceInfo();
  setTurnC('place');
  showScreen('game');
  sayG('Расставьте флот и выберите 3 карточки. Друг делает то же самое у себя.');
};

/* ---------------- выход и уборка ---------------- */
function duelCleanup(){
  duelCardsTeardown();
  for (const k of Object.keys(DUEL_WAIT)) delete DUEL_WAIT[k];
  D = null;
}

function duelQuit(){
  if (!D || C !== D) return;
  CPT.net.close();
  duelCleanup();
  C = null;
}
$('btn-quit-game').addEventListener('click', duelQuit);
$('btn-game-menu').addEventListener('click', duelQuit);

/* ---------------- расстановка ---------------- */
$('canvas-player').addEventListener('pointerdown', e => {
  if (!D || C !== D || D.phase !== 'duel-place') return;
  const p = canvasXY($('canvas-player'), e);
  const r = Math.floor((p.y - D.PAD) / D.CELL);
  const c = Math.floor((p.x - D.PAD) / D.CELL);
  if (inB(r, D.N) && inB(c, D.N)){ tryPlaceC(r, c); duelPlaceCheck(); }
});
$('btn-auto').addEventListener('click', () => {
  if (!D || C !== D || D.phase !== 'duel-place') return;
  autoPlaceC();
  duelPlaceCheck();
});
$('btn-rotate').addEventListener('click', duelRotate);
window.addEventListener('keydown', e => {
  if (activeScreen !== 'game') return;
  if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') duelRotate();
});

function duelRotate(){
  if (!D || C !== D || D.phase !== 'duel-place') return;
  D.hor = !D.hor;
  updatePlaceInfo();
}

function duelPlaceCheck(){
  if (!D || D.qi < D.queue.length) return;
  if (D.pick.size < 3){ sayG('Флот готов! Выберите 3 карточки капитана.'); return; }
  if (D.goSent) return;
  D.goSent = true;
  D.myReady = true;
  CPT.net.send('go', {});
  if (D.theirReady) duelBegin();
  else sayG('Ждём друга: он расставляет флот и выбирает карточки...');
}

/* ---------------- старт боя ---------------- */
function duelBegin(){
  D.cards = {};
  D.pick.forEach(k => D.cards[k] = 1);
  $('btn-auto').classList.add('hidden');
  $('btn-rotate').classList.add('hidden');
  $('place-info').classList.add('hidden');
  duelBuildCards([...D.pick]);
  setTurnC(D.myTurn ? 'me' : 'foe');
  D.phase = D.myTurn ? 'duel-me' : 'duel-them';
  sayG(D.myTurn
    ? 'Бой! Ваш выстрел первый: стреляйте по морю друга или сыграйте карточкой.'
    : 'Бой! Первый выстрел за другом... Он целится!');
}

/* ---------------- мой выстрел ---------------- */
$('canvas-enemy').addEventListener('pointerdown', e => {
  if (!D || C !== D || D.phase !== 'duel-me') return;
  const p = canvasXY($('canvas-enemy'), e);
  const r = Math.floor((p.y - D.PAD) / D.CELL);
  const c = Math.floor((p.x - D.PAD) / D.CELL);
  if (!inB(r, D.N) || !inB(c, D.N)) return;
  if (D.cardMode === 'torpedo'){ duelTorpPlace(r, c); return; }
  if (D.eShot[r][c]) return;
  duelFire(r, c);
});

async function duelFire(r, c){
  if (D.forcedBlind){
    const free = duelFreeEnemy();
    if (free.length){ const p = rnd(free); r = p[0]; c = p[1]; }
    D.forcedBlind = false;
    sayG('Дым противника! Снаряд летит наугад...');
  }
  if (D.eShot[r][c]) return;
  D.phase = 'duel-fire';
  const flight = shellPushC('E', r, c, 'me');
  boomShotC();
  CPT.net.send('shot', { r, c, end: D.salvoLeft <= 1, left: D.salvoLeft });
  const res = await duelWait('shotRes');
  await sleep(flight);
  if (!D || C !== D || D.phase !== 'duel-fire') return;
  if (!res){ duelOver(null); return; }
  D.eShot[res.r][res.c] = res.blocked || !res.hit ? 1 : 2;
  if (res.blocked){
    fxPushC('E', res.r, res.c, 'shield');
    toneC(330, .3, 'triangle', .07);
  } else if (res.hit){
    fxPushC('E', res.r, res.c, 'boom');
    toneC(140, .2, 'square', .06);
    if (res.sunk) D.eShips.push({ cells: res.sunk, hits: res.sunk.length, len: res.sunk.length });
  } else {
    fxPushC('E', res.r, res.c, 'splash');
    splashC();
  }
  if (res.lost){ duelOver(true); return; }
  const isle = D.isleSet.has(res.r + ',' + res.c);
  const msg = res.blocked ? 'Щит друга принял выстрел!'
    : res.hit ? (res.sunk ? '💥 Потопил: ' + SHIP_NAMES[res.sunk.length] + '!' : 'Попадание!')
    : isle ? 'Снаряд врезался в остров!' : 'Мимо!';
  if (D.salvoLeft > 1){
    D.salvoLeft--;
    D.phase = 'duel-me';
    sayG(msg + ' Осталось выстрелов залпа: ' + D.salvoLeft + '.');
    return;
  }
  D.salvoLeft = 0;
  duelEndTurn(msg + ' Ход переходит другу.');
}

function duelFreeEnemy(){
  const free = [];
  for (let r = 0; r < D.N; r++)
    for (let c = 0; c < D.N; c++)
      if (!D.eShot[r][c] && !D.isleSet.has(r + ',' + c)) free.push([r, c]);
  return free;
}

function duelEndTurn(msg){
  D.phase = 'duel-them';
  setTurnC('foe');
  sayG(msg);
}

/* ---------------- выстрел друга (разрешает наша доска) ---------------- */
async function duelIncomingShot(d){
  if (!D || C !== D || D.phase !== 'duel-them') return;
  D.phase = 'duel-fire';
  const flight = shellPushC('P', d.r, d.c, 'foe');
  boomShotC();
  await sleep(flight);
  if (!D || C !== D || D.phase !== 'duel-fire') return;
  const ship = D.pRefC[d.r][d.c];
  const blocked = !!ship && D.shieldOn;
  const res = { r: d.r, c: d.c, hit: false, blocked: false, lost: false, sunk: null };
  if (blocked){
    D.shieldOn = false;
    D.pShot[d.r][d.c] = 1;
    res.blocked = true;
    fxPushC('P', d.r, d.c, 'shield');
    toneC(330, .3, 'triangle', .07);
  } else if (ship){
    D.pShot[d.r][d.c] = 2;
    ship.hits++;
    res.hit = true;
    fxPushC('P', d.r, d.c, 'boom');
    if (ship.hits >= ship.len) res.sunk = ship.cells.map(p => p.slice());
  } else {
    D.pShot[d.r][d.c] = 1;
    fxPushC('P', d.r, d.c, 'splash');
    splashC();
  }
  res.lost = allSunk(D.pShips);
  CPT.net.send('shotRes', res);
  await sleep(HOLD_BOT);
  if (!D || C !== D || D.phase !== 'duel-fire') return;
  if (res.lost){ duelOver(false); return; }
  if (!d.end){
    /* залп противника продолжается: очередь остаётся у него */
    D.phase = 'duel-them';
    sayG((blocked
        ? 'Щит принял выстрел! '
        : ship
          ? (ship.hits >= ship.len
              ? 'Друг потопил ваш ' + SHIP_NAMES[ship.len] + '! '
              : 'Друг попал! ')
        : 'Друг промахнулся! ') +
      'ЗАЛП противника: выстрелов осталось ' + (d.left - 1) + '.');
    return;
  }
  D.phase = 'duel-me';
  setTurnC('me');
  sayG(blocked
    ? 'Щит принял выстрел и рассыпался! Ваш ход.'
    : ship
      ? (ship.hits >= ship.len
          ? 'Друг потопил ваш ' + SHIP_NAMES[ship.len] + '! Ваш ход.'
          : 'Друг попал! Ваш ход.')
      : 'Друг промахнулся. Ваш ход!');
}

/* ---------------- радар друга ---------------- */
async function duelIncomingRadar(){
  if (!D || C !== D || D.phase !== 'duel-them') return;
  sayG('У друга радар! Он выведывает ваш флот...');
  const alive = D.pShips.filter(s => s.hits < s.len);
  let cell = null;
  if (alive.length){
    const ship = rnd(alive);
    const free = ship.cells.filter(([r, c]) => !D.pShot[r][c]);
    cell = (free.length ? rnd(free) : rnd(ship.cells)).slice();
  }
  CPT.net.send('radarRes', cell ? { r: cell[0], c: cell[1] } : { r: null, c: null });
  D.phase = 'duel-me';
  setTurnC('me');
  sayG('Друг запустил радар — ваш ход!');
}

/* ---------------- сообщения друга ----------------
   Щит, ремонт и дым съедают ход сыгравшего — получатель
   забирает очередь себе. Залп и торпеда только анонсируют:
   выстрелы и пуск придут отдельными сообщениями. */
function duelIncomingCard(d){
  if (!D || C !== D) return;
  if (d.key === 'smoke'){
    D.forcedBlind = true;
    D.phase = 'duel-me';
    setTurnC('me');
    sayG('Друг поставил дымовую завесу: ваш следующий выстрел — наугад. Ваш ход!');
    return;
  }
  if (d.key === 'shield'){
    sayG('Друг поднял щит над флотом. Ваш ход!');
  } else if (d.key === 'repair'){
    sayG('Друг заделывает пробоину. Ваш ход!');
  } else if (d.key === 'salvo'){
    sayG('Друг готовит ЗАЛП!');
    return;
  } else if (d.key === 'torpedo'){
    sayG('Друг заряжает торпеду!');
    return;
  }
  D.phase = 'duel-me';
  setTurnC('me');
}

/* ---------------- почта боя ---------------- */
function duelWait(type){
  return new Promise(resolve => {
    const timer = setTimeout(() => { delete DUEL_WAIT[type]; resolve(null); }, 15000);
    DUEL_WAIT[type] = v => { clearTimeout(timer); delete DUEL_WAIT[type]; resolve(v); };
  });
}

function duelOnMsg(t, d){
  if (!D || C !== D) return;
  if ((t === 'shotRes' || t === 'torpRes' || t === 'radarRes') && DUEL_WAIT[t]){
    DUEL_WAIT[t](d);
    return;
  }
  if (t === 'go'){
    D.theirReady = true;
    if (D.myReady) duelBegin();
    else sayG('Флот друга готов! Расставьте свой и выберите карточки.');
  }
  else if (t === 'shot') duelIncomingShot(d);
  else if (t === 'torp') duelIncomingTorp(d);
  else if (t === 'radar') duelIncomingRadar();
  else if (t === 'card') duelIncomingCard(d);
  else if (t === 'again'){
    D.theirAgain = true;
    if (D.myAgain) duelRematchStart();
    else sayG('Друг хочет реванш! Нажмите «Заново».');
  }
  else if (t === 'setup' && !D.isHost)
    duelStart(Object.assign({}, d, { isHost: false }));
  else if (t === 'bye') duelPeerGone();
}

function duelPeerGone(){
  if (!D || C !== D) return;
  if (D.phase === 'duel-over'){ D.disconnected = true; return; }
  duelOver(null);
}

/* ---------------- конец боя и реванш ---------------- */
function duelOver(win){
  if (!D || C !== D) return;
  D.phase = 'duel-over';
  D._mapWin = win;
  $('go-emoji').textContent = win === true ? '🏆' : win === false ? '💀' : '⚓';
  $('go-title').textContent =
    win === true ? 'ПОБЕДА!' : win === false ? 'ПОРАЖЕНИЕ' : 'СОЕДИНЕНИЕ ПОТЕРЯНО';
  $('go-text').textContent = win === true
    ? 'Флот друга уничтожен. Море наше, капитан!'
    : win === false
      ? 'Ваш флот ушёл на дно... Друг сыграл сильнее — берите реванш!'
      : 'Друг покинул бой. Нажмите «Заново», когда он вернётся, или сыграйте новый бой из меню.';
  $('btn-game-again').textContent = 'Заново';
  $('game-over').classList.remove('hidden');
  sayG(win === true ? '🏆 Победа!' : win === false ? '💀 Поражение...' : '⚓ Друг вышел из боя.');
  setTurnC('me');
  D.overFn = duelRematchClick;
}

function duelRematchClick(){
  if (!D || C !== D) return;
  if (D.disconnected){ sayG('Друг не в сети. «← Меню» — и создайте новый бой.'); return; }
  $('game-over').classList.add('hidden');
  if (!D.myAgain){
    D.myAgain = true;
    CPT.net.send('again', {});
  }
  if (D.theirAgain){ duelRematchStart(); return; }
  D.phase = 'duel-over';
  sayG('Ждём друга: он тоже должен нажать «Заново»...');
}

function duelRematchStart(){
  if (!D || C !== D) return;
  if (D.isHost){
    const s = CPT.net.newSetup();
    CPT.net.send('setup', s);
    duelStart(Object.assign({}, s, { isHost: true }));
  }
  /* гость перестраивается, когда придёт 'setup' от хозяина */
}

/* мост от радиорубки */
CPT.net.onMsg = duelOnMsg;
CPT.net.onLeave = duelPeerGone;
