'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_battle.js
   КЛАССИЧЕСКИЙ БОЙ: состояние партии (объект C), расстановка
   флота, ход игрока (летящий снаряд), передача хода, конец боя
   и клики по доскам и кнопкам. Отрезано от game_core.js (v2.4).
   Карточки — в game_cards.js, бот — в game_bot.js.
   ============================================================ */

/* ============================================================
   КЛАССИЧЕСКИЙ БОЙ — состояние
   ============================================================ */
const FLEETS = {
  easy: { N: 8,  CELL: 54, PAD: 22, fleet: [3, 2, 2, 1] },
  hard: { N: 10, CELL: 46, PAD: 22, fleet: [4, 3, 2, 2] },
  /* этап 3 блок 1b: эскадра Левиафана на поле 10×10; флот игрока
     остаётся 4-3-2-2 — его задаёт opts.playerFleet */
  leviathan: { N: 10, CELL: 46, PAD: 22, fleet: [5, 4, 3, 3, 2] }
};

let C = null;   // состояние текущей партии классического боя

function sayG(t){ $('game-status').textContent = t; }

/* ---------------- авто-переворот досок ----------------
   place — расстановка (обе доски равны),
   me    — ход игрока: впереди доска противника,
   foe   — ход противника: впереди наша доска.
   Сам вид переключает CSS по data-turn у #boards-classic. */
function setTurnC(side){
  const el = $('boards-classic');
  if (el) el.dataset.turn = side;
}

/* бейдж карты: название акватории этой партии */
function setMapBadge(name){
  let b = $('map-badge');
  if (!b){
    b = document.createElement('span');
    b.id = 'map-badge';
    b.className = 'map-badge';
    const st = $('game-status');
    if (st && st.parentNode) st.parentNode.insertBefore(b, st);
  }
  b.textContent = '🗺 ' + name;
}

function mkGridC(n){ return Array.from({ length: n }, () => Array(n).fill(0)); }

function startClassic(mode, opts){
  const cfg = FLEETS[mode];
  opts = opts || {};               // поход передаёт lvl/имя острова/трюм, босс — over/levi/intro
  const size = cfg.N * cfg.CELL + cfg.PAD * 2;
  const mapKey = rnd(Object.keys(MAPS));
  const map = MAPS[mapKey];
  const isles = genIslesC(cfg.N, cfg.N >= 10 ? 3 : 2);
  const isleSet = new Set(isles.flat().map(([r, c]) => r + ',' + c));
  C = {
    mode, N: cfg.N, CELL: cfg.CELL, PAD: cfg.PAD, fleet: cfg.fleet,
    lvl: opts.lvl || 1,             // бот умнее на дальних островах похода
    fromMap: !!opts.fromMap,        // бой пришёл с карты похода (map_battle.js)
    mapHold: opts.hold || null,     // карточки, бывшие в трюме корабля
    mapKey, map, isles, isleSet,
    phase: 'place',                 // place | player | bot | over
    pGridC: mkGridC(cfg.N),         // занятость клеток игрока
    pRefC: mkGridC(cfg.N),          // ссылка на корабль в клетке
    pShips: [],
    pShot: mkGridC(cfg.N),          // выстрелы бота по игроку (1 мимо, 2 попадание)
    eGridC: mkGridC(cfg.N),
    eRefC: mkGridC(cfg.N),
    eShips: [],
    eShot: mkGridC(cfg.N),          // выстрелы игрока по врагу
    overFn: opts.over || null,     // босс похода забирает итог боя себе (leviathan_boss.js)
    levi: !!opts.levi,             // накат волны: каждый 3-й ход бота (game_bot.js)
    leviTurn: 0,
    queue: (opts.playerFleet || cfg.fleet).slice(), qi: 0, hor: true,
    hoverE: null, hoverP: null,
    wounded: [],                    // раненые клетки для добивания ботом
    cards: {},                      // колода в бою: три выбранные, по одной
    pick: new Set(),                // выбор карточек до боя (три разных)
    shieldOn: false, smokeNext: false, salvoLeft: 0,
    radarMarks: new Set(),
    cardMode: null, torp: null, torpSurf: 0, torpAnim: null,
    fx: [],
    t0: performance.now()
  };
  if (opts.hold) opts.hold.slice(0, 3).forEach(k => C.pick.add(k));  // трюм уже выбрал
  document.body.dataset.map = mapKey;      // акцент карты в CSS
  placeEnemyFleetC();
  $('game-over').classList.add('hidden');
  $('btn-auto').classList.remove('hidden');
  $('btn-rotate').classList.remove('hidden');
  $('place-info').classList.remove('hidden');
  if (CPT.hint) CPT.hint('b-place',
    'Расставь флот: нажми на свою доску — корабль встанет. «⟳ Повернуть» крутит корабль, «⚓ Авто» расставит всё сам.');
  initCanvasC();
  buildCardsPanelC();          // до боя: выбор трёх карточек из шести
  buildTorpPromptC();
  hideTorpPromptC();
  panelC.classList.remove('hidden');
  updateCardsC();
  setMapBadge(opts.mapName || map.name);
  updatePlaceInfo();
  setTurnC('place');
  $('btn-game-again').textContent = 'Заново';
  showScreen('game');
  sayG(opts.intro ||
       ((opts.fromMap ? 'Остров «' + opts.mapName + '». ' : 'Карта «' + map.name + '». ') +
        'Расставьте флот и выберите 3 карточки капитана.'));
}

function initCanvasC(){
  const size = C.N * C.CELL + C.PAD * 2;
  C.gP = initCanvas($('canvas-player'), size, size);
  C.gE = initCanvas($('canvas-enemy'), size, size);
}

/* ---------------- расстановка ----------------
   На островах корабли не стоят — canPlaceC проверяет isleSet. */
function canPlaceC(grid, r, c, len, hor){
  for (let i = 0; i < len; i++){
    const rr = hor ? r : r + i, cc = hor ? c + i : c;
    if (!inB(rr, C.N) || !inB(cc, C.N)) return false;
    if (C.isleSet.has(rr + ',' + cc)) return false;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++){
        const nr = rr + dr, nc = cc + dc;
        if (inB(nr, C.N) && inB(nc, C.N) && grid[nr][nc]) return false;
      }
  }
  return true;
}

function tryPlaceC(r, c){
  const S = C;
  const len = S.queue[S.qi];
  if (!canPlaceC(S.pGridC, r, c, len, S.hor)){
    sayG('Здесь не поставить: мешает остров, берег соседа или край поля!');
    return;
  }
  const cells = [];
  for (let i = 0; i < len; i++){
    const rr = S.hor ? r : r + i, cc = S.hor ? c + i : c;
    S.pGridC[rr][cc] = 1;
    cells.push([rr, cc]);
  }
  const ship = { cells, hits: 0, len };
  cells.forEach(([rr, cc]) => S.pRefC[rr][cc] = ship);
  S.pShips.push(ship);
  S.qi++;
  if (S.qi >= S.queue.length) maybeBeginBattleC();
  else updatePlaceInfo();
}

function autoPlaceC(){
  const S = C;
  S.pGridC = mkGridC(S.N); S.pRefC = mkGridC(S.N); S.pShips = []; S.qi = 0;
  for (const len of S.queue){
    let guard = 0;
    while (guard++ < 5000){
      const hor = Math.random() < .5;
      const r = Math.floor(Math.random() * (hor ? S.N : S.N - len + 1));
      const c = Math.floor(Math.random() * (hor ? S.N - len + 1 : S.N));
      if (!canPlaceC(S.pGridC, r, c, len, hor)) continue;
      const cells = [];
      for (let i = 0; i < len; i++){
        const rr = hor ? r : r + i, cc = hor ? c + i : c;
        S.pGridC[rr][cc] = 1;
        cells.push([rr, cc]);
      }
      const ship = { cells, hits: 0, len };
      cells.forEach(([rr, cc]) => S.pRefC[rr][cc] = ship);
      S.pShips.push(ship);
      break;
    }
  }
  S.qi = S.queue.length;         // авторасстановка ставит весь флот сразу
  maybeBeginBattleC();
}

function placeEnemyFleetC(){
  const S = C;
  for (const len of S.fleet){
    let guard = 0;
    while (guard++ < 5000){
      const hor = Math.random() < .5;
      const r = Math.floor(Math.random() * (hor ? S.N : S.N - len + 1));
      const c = Math.floor(Math.random() * (hor ? S.N - len + 1 : S.N));
      if (!canPlaceC(S.eGridC, r, c, len, hor)) continue;
      const cells = [];
      for (let i = 0; i < len; i++){
        const rr = hor ? r : r + i, cc = hor ? c + i : c;
        S.eGridC[rr][cc] = 1;
        cells.push([rr, cc]);
      }
      const ship = { cells, hits: 0, len };
      cells.forEach(([rr, cc]) => S.eRefC[rr][cc] = ship);
      S.eShips.push(ship);
      break;
    }
  }
}

function updatePlaceInfo(){
  const S = C;
  if (S.qi >= S.queue.length) return;
  const len = S.queue[S.qi];
  const num = S.qi + 1, total = S.queue.length;
  $('place-info').textContent =
    'Корабль ' + num + ' из ' + total + ': ' + SHIP_NAMES[len] + ' (' + len +
    (len === 1 ? ' палуба' : ' палубы') + '). Клик — поставить, ПКМ или R — повернуть. На острова корабли не ставятся.';
}

/* в бой — когда и флот расставлен, и три карточки выбраны */
function maybeBeginBattleC(){
  const S = C;
  if (!S || S.phase !== 'place') return;
  if (S.qi < S.queue.length){ updatePlaceInfo(); return; }
  if (S.pick.size < 3){ sayG('Флот готов! Теперь выберите 3 карточки капитана — и в бой.'); return; }
  beginBattleC();
}

function beginBattleC(){
  const S = C;
  S.phase = 'player';
  S.cards = {};
  S.pick.forEach(k => S.cards[k] = 1);   // колода: те три, что выбрал капитан
  if (S.fromMap && CPT.mapBattle) CPT.mapBattle.consume([...S.pick]);  // трюмные — потрачены
  $('btn-auto').classList.add('hidden');
  $('btn-rotate').classList.add('hidden');
  $('place-info').classList.add('hidden');
  buildCardsPanelC([...S.pick]);         // в бою только выбранные карточки
  panelC.classList.remove('hidden');
  updateCardsC();
  setTurnC('me');
  sayG('Бой! Стреляйте по флоту противника или сыграйте карточкой.');
  if (CPT.hint) CPT.hint('b-fire',
    'Твой выстрел: нажми клетку на доске «Флот противника». Огонь — попал, всплеск — промазал. Один выстрел — один ход.');
}

function rotateC(){
  const S = C;
  if (!S || S.phase !== 'place') return;
  S.hor = !S.hor;
  updatePlaceInfo();
}

/* ---------------- стрельба ----------------
   ОДИН ВЫСТРЕЛ — ОДИН ХОД: попал или промазал — не важно,
   после выстрела ход переходит другому капитану.
   Выстрел в остров — промах с брызгами.
   Залп — исключение: три выстрела за один ход.
   Торпеда всплывает сама — капитан только направляет. */
function allSunk(ships){ return ships.every(s => s.hits >= s.len); }

function fxPushC(board, r, c, type){
  C.fx.push({ board, r, c, type, t0: performance.now() });
}

/* снаряд летит через поле: с края доски (со стороны стреляющего)
   в клетку падения. Возвращает время полёта в мс — взрыв/брызги
   откладываются ровно на него. */
function shellPushC(board, r, c, side){
  const fc = side === 'me' ? -0.65 : C.N - 0.35;
  /* полёт неспешный, ~0.6–1.1 с: комету с хвостом видно издалека */
  const dist = Math.abs(c - fc);
  const dur = Math.min(1150, 620 + dist * 48);
  C.fx.push({ board, type: 'shell', t0: performance.now(), dur, fr: r, fc, r, c });
  shellWhistleC(dur, dist);     /* свист полёта — длиннее и ниже, чем дальше летит */
  return dur;
}

/* ход или карточка сыграны: даём разглядеть результат,
   потом спокойный переворот и выстрел противника */
function handOverToFoeC(msg){
  const S = C;
  S.phase = 'bot';
  sayG(msg);
  setTimeout(() => {
    if (!S || S !== C || S.phase !== 'bot') return;
    setTurnC('foe');
    const canReact = S.cards.repair > 0 || S.cards.shield > 0;
    sayG(canReact
      ? 'Противник целится... Успей сыграть «Ремонт» или «Щит»!'
      : 'Противник целится...');
    botMove();
  }, HOLD_SHOT);
}

async function playerFire(r, c){
  const S = C;
  if (!S || S.phase !== 'player') return;
  if (S.cardMode === 'torpedo'){
    if (S.torp){ sayG('Торпеда уже всплыла — выберите направление стрелкой под доской!'); return; }
    torpPlaceC(S, r, c);            /* капитан сам выбирает воду у края */
    return;
  }
  if (S.eShot[r][c]) return;
  S.phase = 'fire';                 /* замок: пока снаряд летит, кликов нет */
  const ship = S.eRefC[r][c];
  const flight = shellPushC('E', r, c, 'me');
  boomShotC();
  await sleep(flight);
  if (!S || S !== C || S.phase !== 'fire') return;
  S.eShot[r][c] = ship ? 2 : 1;
  if (ship){
    ship.hits++;
    fxPushC('E', r, c, 'boom');
    toneC(140, .2, 'square', .06);
    if (allSunk(S.eShips)){
      S.phase = 'over';
      setTimeout(() => { if (S === C) gameOverC(true); }, 900);
      return;
    }
  } else {
    fxPushC('E', r, c, 'splash');
    splashC();
  }
  /* залп: остались выстрелы — ход не переходит */
  if (S.salvoLeft > 1){
    S.salvoLeft--;
    S.phase = 'player';
    sayG((ship ? 'Попадание! ' : 'Мимо! ') +
         'Осталось выстрелов залпа: ' + S.salvoLeft + '.');
    return;
  }
  S.salvoLeft = 0;
  handOverToFoeC(ship
    ? (ship.hits === ship.len
        ? '💥 Потопил: ' + SHIP_NAMES[ship.len] + '! Ход переходит противнику.'
        : 'Попадание! Ход переходит противнику.')
    : (S.isleSet.has(r + ',' + c)
        ? 'Снаряд врезался в остров! Ход переходит противнику.'
        : 'Мимо! Ход переходит противнику.'));
}

/* ---------------- конец боя ---------------- */
function gameOverC(win){
  const S = C;
  if (!S) return;
  S.phase = 'over';
  S._mapWin = win;                     // результат ждёт map_battle.js
  $('go-emoji').textContent = win ? '🏆' : '💀';
  $('go-title').textContent = win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
  $('go-text').textContent = win
    ? 'Флот противника уничтожен. Море наше, капитан!'
    : 'Ваш флот ушёл на дно... В следующий раз держите корабли в строю.';
  $('game-over').classList.remove('hidden');
  $('btn-game-again').textContent = (S.fromMap || S.overFn) ? '🧭 В поход' : 'Заново';
  sayG(win ? '🏆 Победа!' : '💀 Поражение...');
  setTurnC('me');
}

/* ---------------- клики классического боя ---------------- */
$('canvas-enemy').addEventListener('pointerdown', e => {
  const S = C;
  if (!S || S.phase !== 'player') return;
  const p = canvasXY($('canvas-enemy'), e);
  const c = Math.floor((p.x - S.PAD) / S.CELL);
  const r = Math.floor((p.y - S.PAD) / S.CELL);
  if (inB(r, S.N) && inB(c, S.N)) playerFire(r, c);
});
$('canvas-enemy').addEventListener('pointermove', e => {
  const S = C;
  if (!S) return;
  const p = canvasXY($('canvas-enemy'), e);
  const c = Math.floor((p.x - S.PAD) / S.CELL);
  const r = Math.floor((p.y - S.PAD) / S.CELL);
  S.hoverE = (inB(r, S.N) && inB(c, S.N)) ? [r, c] : null;
});
$('canvas-enemy').addEventListener('pointerleave', () => { if (C) C.hoverE = null; });

$('canvas-player').addEventListener('pointerdown', e => {
  const S = C;
  if (!S || S.phase !== 'place') return;
  const p = canvasXY($('canvas-player'), e);
  const c = Math.floor((p.x - S.PAD) / S.CELL);
  const r = Math.floor((p.y - S.PAD) / S.CELL);
  if (inB(r, S.N) && inB(c, S.N)) tryPlaceC(r, c);
});
$('canvas-player').addEventListener('pointermove', e => {
  const S = C;
  if (!S) return;
  const p = canvasXY($('canvas-player'), e);
  const c = Math.floor((p.x - S.PAD) / S.CELL);
  const r = Math.floor((p.y - S.PAD) / S.CELL);
  S.hoverP = (inB(r, S.N) && inB(c, S.N)) ? [r, c] : null;
});
$('canvas-player').addEventListener('pointerleave', () => { if (C) C.hoverP = null; });
$('canvas-player').addEventListener('contextmenu', e => { e.preventDefault(); rotateC(); });
window.addEventListener('keydown', e => {
  if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && C && C.phase === 'place') rotateC();
});

$('btn-auto').addEventListener('click', () => { if (C && C.phase === 'place') autoPlaceC(); });
$('btn-rotate').addEventListener('click', rotateC);
$('btn-quit-game').addEventListener('click', () => { if (C) C.phase = 'over'; showScreen('menu'); });
$('btn-game-again').addEventListener('click', () => {
  if (C && C.fromMap){ CPT.mapBattle.back(C._mapWin); return; }   // остров → назад в поход
  if (C && typeof C.overFn === 'function'){                       // босс похода → его итог
    const fn = C.overFn, win = C._mapWin;
    C.overFn = null;
    fn(win);
    return;
  }
  startClassic(C ? C.mode : 'easy');
});
$('btn-game-menu').addEventListener('click', () => showScreen('menu'));
