'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — kraken_boss.js  (v2.1)
   Босс-режим: Кракен (зона 3x3, 9 HP) против флота 4-3-2-2.

   ГЛАВНЫЙ ФАЙЛ БОССА: состояние партии (объект B), старт,
   ход Кракена (rise/glide/full/dive/under, показ dual), карточки,
   все слушатели событий.

   Код разделён по паспорту v2.1 (R10):
     kraken_attacks.js — бой (атаки Кракена, выстрелы, торпеда, щит)
     kraken_render.js  — рисование (море, флот, Кракен, эффекты)
   Файлы связаны ТОЛЬКО через общие объявления этого файла
   (B, g, bgP/bgK, константы, помощники) — копий состояния нет (R5, R7).
   Порядок подключения: game_core.js -> game_cards.js ->
   game_battle.js -> game_bot.js -> game_draw.js -> game_fx.js ->
   kraken_boss.js -> kraken_attacks.js -> kraken_body.js ->
   kraken_render.js.
   ============================================================ */
const BN = 10;                 // размер поля
const BC = 30;                 // клетка в пикселях
const BPAD = 16;               // поле под координатные подписи
const BSZ = BN * BC;           // сторона доски (300)
const KHP_MAX = 9;             // здоровье Кракена (9 клеток зоны)
const PHP_MAX = 11;            // здоровье флота (4+3+2+2 клетки)

let B = null;                  // состояние партии босса
let g = null;                  // текущий контекст рисования
let bgP, bgK;                  // контексты двух канвасов

bgP = initCanvas($('canvas-boss-player'), BSZ + BPAD * 2, BSZ + BPAD * 2);
bgK = initCanvas($('canvas-boss-kraken'), BSZ + BPAD * 2, BSZ + BPAD * 2);

const nowMs = () => performance.now();
const inZone = (r, c) => !!B &&
  r >= B.kraken.row && r < B.kraken.row + 3 &&
  c >= B.kraken.col && c < B.kraken.col + 3;

function sayB(t){ $('boss-status').textContent = t; }

function mk2(){ return Array.from({ length: BN }, () => Array(BN).fill(0)); }

/* ---------------- авто-переворот досок ----------------
   me  — ход игрока: впереди море Кракена,
   foe — ход Кракена: впереди наш флот.
   Вид переключает CSS по data-turn у #boards-boss. */
function setTurnB(side){
  const el = $('boards-boss');
  if (el) el.dataset.turn = side;
}

/* ---------------- регистрация режима в меню каркаса ---------------- */
const ICON_KRAKEN = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 27 a9 9 0 0 1 18 0 v3 H15 Z" fill="rgba(201,155,245,.16)"/><circle cx="20.5" cy="25" r="1.5" fill="currentColor" stroke="none"/><circle cx="27.5" cy="25" r="1.5" fill="currentColor" stroke="none"/><path d="M15 30 c-3 3 -5 6 -9 8 c5 1 9 -1 11 -5"/><path d="M33 30 c3 3 5 6 9 8 c-5 1 -9 -1 -11 -5"/><path d="M21 31 c-1 5 -3 8 -7 11 c5 0 9 -3 10 -8"/><path d="M27 31 c1 5 3 8 7 11 c-5 0 -9 -3 -10 -8"/></svg>';

CPT.mode({
  id: 'kraken',
  name: 'БОСС: КРАКЕН',
  desc: '10×10 · карточки',
  cls: 'boss',
  icon: ICON_KRAKEN,
  start: function(){ startKrakenBoss(); }
});

/* ============================================================
   СТАРТ ПАРТИИ
   ============================================================ */
function startKrakenBoss(){
  $('boss-over').classList.add('hidden');
  $('torpedo-prompt').classList.add('hidden');
  showKrakenSea(false);           // сброс вида (если вышли посреди хода Кракена)
  const f = placeFleetB();
  B = {
    phase: 'player',            // player | kraken | over
    shots: 2,                   // выстрелы игрока в текущем ходу
    turn: 0,                    // номер хода Кракена
    php: PHP_MAX,
    pRef: f.ref, pShips: f.ships,
    pShot: mk2(),               // удары Кракена по флоту (1 мимо, 2 пожар)
    kShot: mk2(),               // выстрелы игрока по морю (1 всплеск, 2 рана)
    kraken: { row: Math.floor(Math.random() * (BN - 2)),
              col: Math.floor(Math.random() * (BN - 2)),
              hp: KHP_MAX, mode: 'under', t0: nowMs(), flash: 0 },
    cards: { radar: 1, torpedo: 1, shield: 1 },
    cardMode: null,             // null | 'torpedo' | 'shield'
    torpDir: 'row',
    shield: null,               // [r, c] клетка под щитом
    radarT: 0,                  // до какого времени светим зону
    fxP: [], fxK: [],
    shakeT0: 0,
    hover: null
  };
  updateHPUI();
  refreshCards();
  setTurnB('me');
  showScreen('boss');
  sayB('Ваш ход: 2 выстрела. Ищите зону 3×3, где прячется Кракен!');
}

function placeFleetB(){
  const ref = Array.from({ length: BN }, () => Array(BN).fill(null));
  const ships = [];
  for (const len of [4, 3, 2, 2]){
    let guard = 0;
    while (guard++ < 5000){
      const hor = Math.random() < .5;
      const r = Math.floor(Math.random() * (hor ? BN : BN - len + 1));
      const c = Math.floor(Math.random() * (hor ? BN - len + 1 : BN));
      const cells = []; let ok = true;
      for (let i = 0; i < len; i++){
        const rr = hor ? r : r + i, cc = hor ? c + i : c;
        for (let dr = -1; dr <= 1 && ok; dr++)
          for (let dc = -1; dc <= 1 && ok; dc++){
            const nr = rr + dr, nc = cc + dc;
            if (nr >= 0 && nr < BN && nc >= 0 && nc < BN && ref[nr][nc]) ok = false;
          }
        cells.push([rr, cc]);
      }
      if (ok){
        const ship = { cells, dead: 0 };
        cells.forEach(([rr, cc]) => ref[rr][cc] = ship);
        ships.push(ship);
        break;
      }
    }
  }
  return { ref, ships };
}

/* заплыв должен быть ВИДЕН: на время хода Кракена ставим обе
   доски рядом (data-view="dual" из style.css), море Кракена —
   передним планом. После ныряния возвращаем вид, выбранный
   игроком (кнопка «две доски»). style.css не трогаем. */
function showKrakenSea(show){
  const el = $('boards-boss');
  if (!el) return;
  if (show) el.setAttribute('data-view', 'dual');
  else if (readView() !== 'dual') el.removeAttribute('data-view');
}

/* ============================================================
   ХОД КРАКЕНА: всплытие → видный заплыв → атака → погружение
   ============================================================ */


function moveKrakenB(){
  const S = B, k = S.kraken;
  const cur = k.row + ',' + k.col, cand = [];
  for (let r = 0; r <= BN - 3; r++)
    for (let c = 0; c <= BN - 3; c++){
      if (r + ',' + c === cur) continue;
      let clean = true;
      for (let i = 0; i < 3 && clean; i++)
        for (let j = 0; j < 3 && clean; j++)
          if (S.kShot[r + i][c + j]) clean = false;
      if (clean) cand.push([r, c]);
    }
  if (!cand.length)
    for (let r = 0; r <= BN - 3; r++)
      for (let c = 0; c <= BN - 3; c++)
        if (r + ',' + c !== cur) cand.push([r, c]);
  const [r, c] = rnd(cand);
  k.row = r; k.col = c;
}

/* заплыв: Кракен ВИДНО скользит по воде к точке атаки (глиссер
   с пенным следом). Скрытый переезд moveKrakenB после погружения
   остаётся — охота по двум выстрелам продолжает работать */
async function glideKrakenB(atk){
  const S = B, k = S.kraken;
  const tgt = atk.cells[Math.floor(atk.cells.length / 2)];
  const toR = Math.max(0, Math.min(BN - 3, tgt[0] - 1));
  const toC = Math.max(0, Math.min(BN - 3, tgt[1] - 1));
  const from = [k.col + 1.5, k.row + 1.5], to = [toC + 1.5, toR + 1.5];
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  k.row = toR; k.col = toC;                 // зона сразу у цели: рисуем по следу
  if (dist < 1){ k.mode = 'full'; k.t0 = nowMs(); return; }
  const dur = Math.round(Math.min(2400, 700 + dist * 120));
  k.mode = 'glide'; k.t0 = nowMs();
  k.gDur = dur; k.gFrom = from; k.gTo = to;
  sayB('🐙 Кракен скользит по воде к добыче!');
  for (let i = 1; i <= 7; i++){             // пенный след за кормой
    const u = i / 8;
    S.fxK.push({ type: 'splash',
                 r: from[1] + (to[1] - from[1]) * u - .5,
                 c: from[0] + (to[0] - from[0]) * u - .5,
                 t0: nowMs() + u * dur - 160, dur: 560 });
  }
  await sleep(dur);
  if (!S || S !== B || S.phase === 'over') return;
  k.mode = 'full'; k.t0 = nowMs();
}

async function krakenTurn(){
  const S = B;
  if (!S || S.phase === 'over') return;
  S.phase = 'kraken';
  showKrakenSea(true);              // обе доски: заплыв видно
  setTurnB('me');                   // море Кракена впереди
  S.turn++;
  const k = S.kraken;

  k.mode = 'rise'; k.t0 = nowMs();
  sayB('🐙 Кракен всплывает из пучины!');
  await sleep(900);
  if (!S || S !== B || S.phase === 'over') return;
  k.mode = 'full';
  sayB('Кракен на поверхности — выбирает цель. Держитесь!');
  await sleep(1100);                            // ≈2 секунды на виду
  if (!S || S !== B || S.phase === 'over') return;

  const atk = krakenAttack();
  await glideKrakenB(atk);            // видный заплыв к точке атаки
  if (!S || S !== B || S.phase === 'over') return;
  setTurnB('foe');                    // флот впереди: падают обломки
  sayB(atk.kind === 'anchor' ? '⚓ Кракен мечет ЯКОРЬ!'
     : atk.kind === 'barrel' ? '🛢 Кракен пускает БОЧКУ!'
                             : '🚢 Кракен бросает ОБЛОМКИ!');
  for (const [r, c] of atk.cells){
    S.fxP.push({ type: 'drop', r, c, t0: nowMs(), dur: 620,
                 emoji: atk.kind === 'anchor' ? '⚓' : atk.kind === 'barrel' ? '🛢' : '🚢' });
    await sleep(420);
    if (!S || S !== B || S.phase === 'over') return;
    resolveAttackCell(S, r, c);
    await sleep(380);
    if (!S || S !== B || S.phase === 'over') return;
  }

  if (S.php <= 0){ bossOver(false); return; }

  k.mode = 'dive'; k.t0 = nowMs();
  sayB('Кракен погружается и меняет позицию...');
  await sleep(650);
  if (!S || S !== B || S.phase === 'over') return;
  moveKrakenB();
  showKrakenSea(false);               // вернуть выбранный вид досок
  S.shots = 2;
  S.phase = 'player';
  setTurnB('me');
  sayB('Ваш ход — 2 выстрела по морю Кракена!');
}


/* ============================================================
   КАРТОЧКИ — настоящие игровые карты: иконка, имя, описание,
   счётчик. Строятся из CARD_DEFS; добавить новую карту =
   дописать один объект в список. Каждая — 1 раз за бой.
   ============================================================ */
const CARD_DEFS = [
  {
    id: 'radar',
    name: 'РАДАР',
    desc: 'Засвечивает зону Кракена на 2 секунды',
    icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="21" cy="24" r="13" opacity=".45"/><path d="M21 24 L30 15"/><path d="M21 24 L12 33" opacity=".35"/><circle cx="21" cy="24" r="3" fill="currentColor" stroke="none"/><path d="M30 10 a16 16 0 0 1 7 8"/><path d="M35 4 a22 22 0 0 1 8 9" opacity=".5"/><path d="M7 42 h28"/></svg>'
  },
  {
    id: 'torpedo',
    name: 'ТОРПЕДА',
    desc: 'Бьёт всю строку или столбец насквозь',
    icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="20" width="25" height="9" rx="4.5"/><path d="M32 20 L42 24.5 L32 29 Z" fill="currentColor" stroke="none"/><path d="M12 20 L8 15 M12 29 L8 34"/><circle cx="40" cy="12" r="1.8" fill="currentColor" stroke="none" opacity=".8"/><circle cx="44" cy="7" r="1.3" fill="currentColor" stroke="none" opacity=".5"/></svg>'
  },
  {
    id: 'shield',
    name: 'ЩИТ',
    desc: 'Один удар Кракена по клетке — в никуда',
    icon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5 L38 10 V22 C38 31 32 37 24 41 C16 37 10 31 10 22 V10 Z" fill="rgba(110,226,255,.12)"/><path d="M24 14 v14 M17 21 h14"/></svg>'
  }
];

function buildCards(){
  const panel = $('cards-panel');
  if (!panel) return;
  panel.innerHTML = '';
  for (const cd of CARD_DEFS){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card-btn';
    b.dataset.card = cd.id;
    b.innerHTML =
      '<span class="card-icon">' + cd.icon + '</span>' +
      '<span class="card-name">' + cd.name + '</span>' +
      '<span class="card-desc">' + cd.desc + '</span>' +
      '<span class="card-state">готова</span>';
    panel.appendChild(b);
  }
}
buildCards();

function refreshCards(){
  const S = B;
  const panel = $('cards-panel');
  if (!panel) return;
  for (const cd of CARD_DEFS){
    const el = panel.querySelector('[data-card="' + cd.id + '"]');
    if (!el) continue;
    const ready = !S || !!S.cards[cd.id];
    el.classList.toggle('used', !ready);
    el.classList.toggle('sel', !!S && S.cardMode === cd.id);
    el.querySelector('.card-state').textContent = ready ? 'готова' : 'сработала';
  }
}

function updateHPUI(){
  const S = B;
  if (!S) return;
  $('hp-kraken-fill').style.width = Math.max(0, S.kraken.hp) / KHP_MAX * 100 + '%';
  $('hp-kraken-num').textContent = Math.max(0, S.kraken.hp) + '/' + KHP_MAX;
  $('hp-player-fill').style.width = Math.max(0, S.php) / PHP_MAX * 100 + '%';
  $('hp-player-num').textContent = Math.max(0, S.php) + '/' + PHP_MAX;
}

$('cards-panel').addEventListener('click', e => {
  const btn = e.target.closest('[data-card]');
  if (!btn) return;
  const S = B;
  if (!S || S.phase !== 'player') return;
  const id = btn.dataset.card;
  if (!S.cards[id]) return;
  if (id === 'radar'){
    S.cards.radar = 0;
    S.radarT = nowMs() + 2000;
    sayB('📡 РАДАР: зона Кракена засвечена на 2 секунды!');
  } else if (id === 'torpedo'){
    S.cardMode = S.cardMode === 'torpedo' ? null : 'torpedo';
    $('torpedo-prompt').classList.toggle('hidden', S.cardMode !== 'torpedo');
    sayB(S.cardMode ? '🚀 Выберите направление и кликните по морю Кракена.'
                    : 'Торпеда отменена.');
  } else if (id === 'shield'){
    S.cardMode = S.cardMode === 'shield' ? null : 'shield';
    sayB(S.cardMode ? '🛡 Кликните по клетке СВОЕГО флота — там встанет щит.'
                    : 'Щит отменён.');
  }
  refreshCards();
});
$('btn-t-row').addEventListener('click', () => {
  if (B){ B.torpDir = 'row'; sayB('↔ Строка выбрана — кликните по клетке на море Кракена.'); }
});
$('btn-t-col').addEventListener('click', () => {
  if (B){ B.torpDir = 'col'; sayB('↕ Столбец выбран — кликните по клетке на море Кракена.'); }
});
$('btn-t-cancel').addEventListener('click', () => {
  if (B){ B.cardMode = null; $('torpedo-prompt').classList.add('hidden'); refreshCards(); }
});
$('btn-refleet').addEventListener('click', () => {
  const S = B;
  if (!S || S.phase !== 'player' || S.turn > 0){
    sayB('Переставить флот можно только до первого хода Кракена.');
    return;
  }
  const f = placeFleetB();
  S.pRef = f.ref; S.pShips = f.ships;
  S.pShot = mk2(); S.php = PHP_MAX;
  updateHPUI();
  sayB('Флот перестроен. 2 выстрела — в вашем распоряжении!');
});
$('btn-quit-boss').addEventListener('click', () => { if (B) B.phase = 'over'; showScreen('menu'); });
$('btn-boss-again').addEventListener('click', () => startKrakenBoss());
$('btn-boss-menu').addEventListener('click', () => showScreen('menu'));

/* ---------------- клики по канвасам ---------------- */
const cvK = $('canvas-boss-kraken');
const cvP = $('canvas-boss-player');

cvK.addEventListener('pointerdown', e => {
  const S = B;
  if (!S || S.phase === 'over') return;
  const p = canvasXY(cvK, e);
  const c = Math.floor((p.x - BPAD) / BC);
  const r = Math.floor((p.y - BPAD) / BC);
  if (!inB(r, BN) || !inB(c, BN)) return;
  if (S.cardMode === 'torpedo'){ fireTorpedo(r, c); return; }
  bossShot(r, c);
});
cvK.addEventListener('pointermove', e => {
  if (!B) return;
  const p = canvasXY(cvK, e);
  B.hover = { x: p.x, y: p.y };
});
cvK.addEventListener('pointerleave', () => { if (B) B.hover = null; });

cvP.addEventListener('pointerdown', e => {
  const S = B;
  if (!S || S.phase !== 'player') return;
  const p = canvasXY(cvP, e);
  const c = Math.floor((p.x - BPAD) / BC);
  const r = Math.floor((p.y - BPAD) / BC);
  if (!inB(r, BN) || !inB(c, BN)) return;
  if (S.cardMode === 'shield'){ placeShield(r, c); return; }
  sayB('Это ВАШ флот. Стрелять нужно по морю Кракена — справа.');
});

/* ---------------- конец боя ---------------- */
function bossOver(win){
  const S = B;
  if (!S || S.phase === 'over') return;
  S.phase = 'over';
  showKrakenSea(false);           // вернуть обычный вид досок
  S.kraken.mode = win ? 'dead' : 'full';
  S.kraken.t0 = nowMs();
  $('bo-emoji').textContent = win ? '🏆' : '💀';
  $('bo-title').textContent = win ? 'ПОБЕДА!' : 'ФЛОТ ПОТОПЛЕН';
  $('bo-text').textContent = win
    ? 'Кракен повержен и навсегда ушёл в пучину. Острова спасены!'
    : 'Кракен уничтожил все ваши корабли... Морская пучина забрала флот.';
  $('boss-over').classList.remove('hidden');
  sayB(win ? '🏆 Победа!' : '💀 Поражение...');
  refreshCards();
  setTurnB('me');
}
