'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_draw.js
   ОТРИСОВКА КЛАССИЧЕСКОГО БОЯ: море и острова, живые
   корабли-спрайты (паруса, пушки, флаги), потопленные корпуса.
   Читает состояние C, ничего не меняет (R3). Отрезано от ядра.
   Вид «одна доска / две рядом» — здесь же (кнопка в topbar).
   ============================================================ */

/* ============================================================
   ОТРИСОВКА КЛАССИЧЕСКОГО БОЯ
   ============================================================ */
function drawClassic(t){
  const S = C;
  if (!S) return;
  paintBoardC(S, S.gP, t, true);
  paintBoardC(S, S.gE, t, false);
}

/* статичный слой доски: вода, клетка, сетка, надписи и острова
   НЕ меняются всю партию — рисуем их один раз в офскрин-кэш, в
   кадре только накладываем. На слабом телефоне это примерно
   половина стоимости кадра (живая дуэль 2026-11-21: «тормозило»). */
function boardStaticC(S, own){
  const size = S.PAD * 2 + S.N * S.CELL;
  const key = own ? '_bgP' : '_bgE';
  if (S[key] && S[key]._size === size) return S[key];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.width = size * dpr; cv.height = size * dpr;
  cv._size = size;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const N = S.N, CELL = S.CELL, PAD = S.PAD, SZ = N * CELL, map = S.map;

  /* светлая вода карты */
  const grad = g.createLinearGradient(0, PAD, 0, PAD + SZ);
  grad.addColorStop(0, map.waterTop);
  grad.addColorStop(1, map.waterBottom);
  g.fillStyle = grad;
  g.fillRect(PAD, PAD, SZ, SZ);

  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if ((r + c) % 2){
        g.fillStyle = 'rgba(255,255,255,.14)';
        g.fillRect(PAD + c * CELL, PAD + r * CELL, CELL, CELL);
      }

  g.strokeStyle = map.gridLine;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= N; i++){
    g.moveTo(PAD + i * CELL + .5, PAD);
    g.lineTo(PAD + i * CELL + .5, PAD + SZ);
    g.moveTo(PAD, PAD + i * CELL + .5);
    g.lineTo(PAD + SZ, PAD + i * CELL + .5);
  }
  g.stroke();
  g.strokeStyle = map.frameLine;
  g.lineWidth = 1.5;
  g.strokeRect(PAD + .8, PAD + .8, SZ - 1.6, SZ - 1.6);

  g.font = 'bold 11px "Segoe UI",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = map.label;
  const L = 'АБВГДЕЖЗИК';
  for (let i = 0; i < N; i++){
    g.fillText(L[i], PAD + i * CELL + CELL / 2, PAD / 2 + 1);
    g.fillText(String(i + 1), PAD / 2, PAD + i * CELL + CELL / 2 + 1);
  }

  /* острова в кэше: пальмы видны всегда, а метки выстрелов
     (динамический слой) ложатся поверх песка — брызги в остров
     видно даже лучше, чем было */
  for (const isle of S.isles) drawIsleC(g, isle, PAD, CELL, map);

  S[key] = cv;
  return cv;
}

function paintBoardC(S, g, t, own){
  const N = S.N, CELL = S.CELL, PAD = S.PAD, SZ = N * CELL;

  g.clearRect(0, 0, PAD * 2 + SZ, PAD * 2 + SZ);
  g.drawImage(boardStaticC(S, own), 0, 0, PAD * 2 + SZ, PAD * 2 + SZ);

  if (own){
    drawFleetC(g, S, PAD, CELL, t);
    drawBurntC(g, S.pShot, PAD, CELL);
    for (const s of S.pShips)                 /* дым над потопленными */
      if (s.hits >= s.len)
        for (const [r, c] of s.cells)
          drawSmokeC(g, PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2,
                     t + (r + c) * .13, CELL);
    drawMarksC(g, S.pShot, PAD, CELL);
    drawShieldC(g, S, PAD, CELL, t);
    if (S.phase === 'place') drawPlacePreview(g, S, PAD, CELL, t);
  } else {
    drawSunkEnemyC(g, S, PAD, CELL, t);
    drawMarksC(g, S.eShot, PAD, CELL);
    drawRadarC(g, S, PAD, CELL, t);
    drawTorpC(g, S, PAD, CELL, t);
    if (S.phase === 'player' && S.hoverE) drawCrossC(g, S.hoverE, PAD, CELL);
  }

  drawFxC(g, S, own ? 'P' : 'E', PAD, CELL, t);
}
/* ============================================================
   КОРАБЛИ-СПРАЙТЫ — живые, как игрушечные фигурки в старых
   стратегиях: дощатая палуба, приподнятые борта — свет на
   кромке и тень на стенке, нос и корма подняты, мачты с
   парусами, которые надувает ветер, канаты, пушки по бортам,
   фонарь на носу, флаг на корме, мягкая тень на воде.
   Корабли чуть покачиваются, паруса дышат, флаг трепещет.
   Свой флот — тёплое коричнево-золотое дерево, противник —
   тёмный корпус и чёрные паруса, потопленные — обугленные,
   с тлеющими пробоинами и сломанными мачтами.
   ============================================================ */
function shipPalC(enemy, sunk){
  if (sunk) return {
    hullTop:'#4d4238', hullBot:'#221c16', deckTop:'#3b332a', deckBot:'#272019',
    gunwale:'rgba(214,200,180,.18)', side:'rgba(0,0,0,.45)', plank:'rgba(0,0,0,.45)',
    flag:'#241f1b', outline:'#120e0a', ember:'rgba(255,122,32,.6)'
  };
  if (enemy) return {
    hullTop:'#5c4a3d', hullBot:'#261e17', deckTop:'#6e5d4e', deckBot:'#443729',
    gunwale:'rgba(216,206,190,.30)', side:'rgba(0,0,0,.42)', plank:'rgba(18,10,4,.38)',
    sail:'#2b303c', sailShade:'#14171f', sailFold:'rgba(0,0,0,.4)',
    flag:'#161922', outline:'#201510', lantern:'#ffd76e', skull:'rgba(238,238,238,.9)'
  };
  return {
    hullTop:'#a87542', hullBot:'#5c3a1d', deckTop:'#e9c489', deckBot:'#c08f52',
    gunwale:'rgba(255,232,168,.55)', side:'rgba(118,72,30,.5)', plank:'rgba(122,78,32,.32)',
    sail:'#f9efd6', sailShade:'#dbb97d', sailFold:'rgba(158,108,48,.3)',
    flag:'#d64541', outline:'#38220e', lantern:'#ffd76e'
  };
}

function drawShipSpriteC(g, x, y, w, h, hor, len, CELL, opt){
  const enemy = !!(opt && opt.enemy), sunk = !!(opt && opt.sunk);
  const ghost = !!(opt && opt.ghost);
  const t = (opt && opt.t) || 0;
  const pal = shipPalC(enemy, sunk);
  const u = CELL / 54;
  const L = hor ? w : h, T = hor ? h : w;   /* длина и толщина корпуса */
  const ph = x * .021 + y * .017;           /* у каждого корабля своя фаза */

  g.save();
  if (ghost) g.globalAlpha = .6;
  if (!sunk) g.translate(0, Math.sin(t * 2 + ph) * 1.5 * u);  /* живое покачивание */
  if (hor) g.translate(x, y);
  else { g.translate(x + T, y); g.rotate(Math.PI / 2); }      /* всегда рисуем носом вправо */

  /* локальная коробка: длина L, толщина T */
  const m = 5.2 * u;
  const hx0 = m, hx1 = L - m, hy0 = m, hy1 = T - m;
  const W = hx1 - hx0, H = hy1 - hy0;

  /* мягкая тень на воде под корпусом */
  g.fillStyle = 'rgba(18,60,92,.26)';
  g.beginPath();
  g.ellipse(hx0 + W * .5, hy0 + H * .66, W * .52, H * .40, 0, 0, 7);
  g.fill();

  /* корпус: острый нос, круглая корма, стенка темнеет книзу */
  const hull = new Path2D();
  hull.moveTo(hx0 + W * .16, hy0);
  hull.quadraticCurveTo(hx0 + W * .55, hy0 - 1.2, hx1 - H * .28, hy0 + H * .12);
  hull.quadraticCurveTo(hx1 - H * .05, hy0 + H * .27, hx1 + H * .12, hy0 + H * .5);
  hull.quadraticCurveTo(hx1 - H * .05, hy0 + H * .73, hx1 - H * .28, hy0 + H * .88);
  hull.quadraticCurveTo(hx0 + W * .55, hy1 + 1.2, hx0 + W * .16, hy1);
  hull.quadraticCurveTo(hx0 - H * .15, hy1 - H * .2, hx0 - H * .12, hy0 + H * .5);
  hull.quadraticCurveTo(hx0 - H * .15, hy0 + H * .2, hx0 + W * .16, hy0);
  hull.closePath();
  const hg = g.createLinearGradient(0, hy0, 0, hy1);
  hg.addColorStop(0, pal.hullTop);
  hg.addColorStop(.42, pal.hullTop);
  hg.addColorStop(.6, pal.hullBot);
  hg.addColorStop(1, pal.hullBot);
  g.fillStyle = hg; g.fill(hull);
  g.strokeStyle = pal.outline; g.lineWidth = 1.7; g.stroke(hull);

  /* обшивка: доски вдоль стенки корпуса */
  g.strokeStyle = pal.side; g.lineWidth = 1; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(hx0 + W * .12, hy0 + H * .70); g.lineTo(hx1 - H * .16, hy0 + H * .74);
  g.moveTo(hx0 + W * .08, hy0 + H * .84); g.lineTo(hx1 - H * .24, hy0 + H * .86);
  g.stroke();

  /* свет на кромке борта */
  g.strokeStyle = pal.gunwale; g.lineWidth = 1.6 * u;
  g.beginPath();
  g.moveTo(hx0 + W * .17, hy0 + 1.4);
  g.quadraticCurveTo(hx0 + W * .55, hy0 + .3, hx1 - H * .28, hy0 + H * .13);
  g.stroke();

  /* палуба: светлое дерево, доски (лаги) поперёк хода */
  const din = H * .17;
  const dx0 = hx0 + W * .16, dx1 = hx1 - H * .20;
  const dy0 = hy0 + din, dy1 = hy1 - din;
  const dg = g.createLinearGradient(0, dy0, 0, dy1);
  dg.addColorStop(0, pal.deckTop); dg.addColorStop(1, pal.deckBot);
  g.beginPath();
  g.moveTo(dx0, dy0);
  g.quadraticCurveTo((dx0 + dx1) / 2, dy0 - 2, dx1, dy0 + 1);
  g.lineTo(dx1, dy1 - 1);
  g.quadraticCurveTo((dx0 + dx1) / 2, dy1 + 2, dx0, dy1);
  g.closePath();
  g.fillStyle = dg; g.fill();
  g.strokeStyle = pal.side; g.lineWidth = 1; g.stroke();
  g.strokeStyle = pal.plank; g.lineWidth = 1;
  g.beginPath();
  const step = Math.max(5.5, 6.5 * u);
  for (let px = dx0 + step; px < dx1 - 2; px += step){
    g.moveTo(px, dy0 + 2.5); g.lineTo(px, dy1 - 2.5);
  }
  g.stroke();

  /* приподнятая корма: ют с дверцей, бушприт на носу */
  g.fillStyle = pal.hullBot;
  roundRect(g, hx0 - H * .05, hy0 + H * .24, H * .3, H * .52, 2.5 * u);
  g.fill();
  g.strokeStyle = pal.outline; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = pal.deckTop;
  roundRect(g, hx0 - H * .02, hy0 + H * .3, H * .2, H * .4, 1.8 * u);
  g.fill();
  g.strokeStyle = pal.outline; g.lineWidth = 2 * u; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(hx1 - H * .06, hy0 + H * .5);
  g.lineTo(hx1 + H * .2, hy0 + H * .5);
  g.stroke();

  /* пушки: стволы торчат из обоих бортов в каждой клетке */
  g.fillStyle = pal.outline;
  for (let i = 0; i < len; i++){
    const px = hx0 + W * ((i + .5) / len);
    g.fillRect(px - 1.3 * u, hy0 - 2.2 * u, 2.6 * u, 4.6 * u);
    g.fillRect(px - 1.3 * u, hy1 - 2.4 * u, 2.6 * u, 4.6 * u);
  }

  const nM = len >= 3 ? 2 : 1;
  if (sunk){
    /* сломанные мачты и тлеющие пробоины */
    g.strokeStyle = '#141009'; g.lineWidth = 2.3 * u; g.lineCap = 'round';
    for (let i = 0; i < nM; i++){
      const mx = hx0 + W * (nM === 1 ? .52 : .40 + i * .26);
      g.beginPath();
      g.moveTo(mx, hy0 + H * .74);
      g.lineTo(mx + 5.5 * u, hy0 + H * .3);
      g.stroke();
    }
    g.fillStyle = pal.ember;
    for (let i = 0; i < len; i++){
      const px = hx0 + W * ((i + .32) / len);
      g.beginPath(); g.arc(px, hy0 + H * .52, 1.7 * u, 0, 7); g.fill();
    }
  } else {
    /* канаты от мачт к носу и корме */
    const mA = hx0 + W * (nM === 1 ? .52 : .40) - 1.2 * u;
    const mB = hx0 + W * (nM === 1 ? .52 : .66) - 1.2 * u;
    g.strokeStyle = pal.side; g.lineWidth = .9;
    g.beginPath();
    g.moveTo(mA, hy0 + H * .5); g.lineTo(hx1 - H * .04, hy0 + H * .5);
    g.moveTo(mB, hy0 + H * .5); g.lineTo(hx0 + W * .04, hy0 + H * .5);
    g.stroke();

    /* мачты с парусами: ветер надувает парус к носу, парус дышит */
    const bl = H * (.7 + Math.sin(t * 2.3 + ph) * .09);   /* контроль раздува */
    const bk = H * .12;                                   /* отклонение к корме */
    for (let i = 0; i < nM; i++){
      const mx = hx0 + W * (nM === 1 ? .52 : .40 + i * .26) - 1.2 * u;
      const sy0 = hy0 - .4 * u, sy1 = hy1 + .4 * u;
      const sg = g.createLinearGradient(mx - bk, 0, mx + bl, 0);
      sg.addColorStop(0, pal.sail);
      sg.addColorStop(1, pal.sailShade);
      g.beginPath();
      g.moveTo(mx, sy0);
      g.quadraticCurveTo(mx + bl, (sy0 + sy1) / 2, mx, sy1);
      g.quadraticCurveTo(mx - bk, (sy0 + sy1) / 2, mx, sy0);
      g.closePath();
      g.fillStyle = sg; g.fill();
      g.strokeStyle = pal.outline; g.lineWidth = 1; g.stroke();
      g.strokeStyle = pal.sailFold; g.lineWidth = .9;
      g.beginPath();
      g.moveTo(mx + bl * .1, sy0 + (sy1 - sy0) * .2);
      g.quadraticCurveTo(mx + bl * .55, (sy0 + sy1) / 2, mx + bl * .1, sy1 - (sy1 - sy0) * .2);
      g.stroke();
      g.fillStyle = pal.outline;
      g.beginPath(); g.arc(mx, (sy0 + sy1) / 2, 1.6 * u, 0, 7); g.fill();
    }

    /* флаг на корме: трепещет на ветру */
    const fx0 = hx0 - H * .02, fy = hy0 + H * .5;
    g.strokeStyle = pal.outline; g.lineWidth = 1.4 * u; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fx0, fy); g.lineTo(fx0, fy - 10 * u); g.stroke();
    const wave = Math.sin(t * 5.4 + ph) * 1.7 * u;
    g.fillStyle = pal.flag;
    g.beginPath();
    g.moveTo(fx0, fy - 10 * u);
    g.quadraticCurveTo(fx0 + 4.5 * u, fy - 9.2 * u + wave * .4, fx0 + 7.6 * u, fy - 7.4 * u + wave);
    g.lineTo(fx0, fy - 4.8 * u);
    g.closePath(); g.fill();
    if (pal.skull){
      g.fillStyle = pal.skull;
      g.beginPath(); g.arc(fx0 + 2.7 * u, fy - 7.4 * u, 1.15 * u, 0, 7); g.fill();
    }

    /* фонарь на носу */
    g.fillStyle = 'rgba(255,215,110,.35)';
    g.beginPath(); g.arc(hx1 + H * .2, hy0 + H * .5 - 2 * u, 3.4 * u, 0, 7); g.fill();
    g.fillStyle = pal.lantern;
    g.beginPath(); g.arc(hx1 + H * .2, hy0 + H * .5 - 2 * u, 1.6 * u, 0, 7); g.fill();
  }
  g.restore();
}

/* дымок над потопленным: клубки поднимаются и тают */
function drawSmokeC(g, x, y, t, CELL){
  const u = CELL / 54;
  for (let i = 0; i < 3; i++){
    const ph = (t * .45 + i * .37) % 1;
    const py = y - 3 * u - ph * 13 * u;
    const px = x + Math.sin((t + i * 2.1) * 2.2) * 2.6 * u;
    g.fillStyle = 'rgba(238,238,238,' + (.32 * (1 - ph)) + ')';
    g.beginPath(); g.arc(px, py, (2.4 + ph * 3.6) * u, 0, 7); g.fill();
  }
}

function drawFleetC(g, S, PAD, CELL, t){
  for (const s of S.pShips){
    const hor = s.len === 1 ? true : s.cells[0][0] === s.cells[1][0];
    const rs = s.cells.map(p => p[0]), cs = s.cells.map(p => p[1]);
    const x = PAD + Math.min(...cs) * CELL, y = PAD + Math.min(...rs) * CELL;
    const w = (hor ? s.len : 1) * CELL, h = (hor ? 1 : s.len) * CELL;
    drawShipSpriteC(g, x, y, w, h, hor, s.len, CELL,
                    { enemy: false, sunk: s.hits >= s.len, t });
  }
}

/* пробоины на своих кораблях: обугленность и огонёк */
function drawBurntC(g, marks, PAD, CELL){
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let r = 0; r < marks.length; r++)
    for (let c = 0; c < marks.length; c++)
      if (marks[r][c] === 2){
        const x = PAD + c * CELL + CELL / 2, y = PAD + r * CELL + CELL / 2;
        g.fillStyle = 'rgba(255,124,36,.4)';
        g.beginPath(); g.arc(x, y, CELL * .26, 0, 7); g.fill();
        g.fillStyle = 'rgba(24,12,4,.9)';
        g.beginPath(); g.arc(x, y, CELL * .16, 0, 7); g.fill();
        g.font = Math.floor(CELL * .4) + 'px serif';
        g.fillText('🔥', x, y + 1);
      }
}

/* потопленный флот противника: тёмные обугленные корпуса */
function drawSunkEnemyC(g, S, PAD, CELL, t){
  for (const s of S.eShips){
    if (s.hits < s.len) continue;
    const hor = s.len === 1 ? true : s.cells[0][0] === s.cells[1][0];
    const rs = s.cells.map(p => p[0]), cs = s.cells.map(p => p[1]);
    const x = PAD + Math.min(...cs) * CELL, y = PAD + Math.min(...rs) * CELL;
    const w = (hor ? s.len : 1) * CELL, h = (hor ? 1 : s.len) * CELL;
    drawShipSpriteC(g, x, y, w, h, hor, s.len, CELL, { enemy: true, sunk: true, t });
    for (const [r, c] of s.cells)
      drawSmokeC(g, PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2,
                 t + (r + c) * .13, CELL);
  }
}

/* ---------------- вариант показа досок: одна / две ----------------
   По умолчанию одна доска с авто-переворотом (CSS подхватывает
   сам), «две рядом» — по кнопке. Выбор запоминается. Кнопка
   добавляется скриптом в обе верхние панели, каркас не трогаем. */
const VIEW_KEY = 'cpt-board-view';

function readView(){
  try { return localStorage.getItem(VIEW_KEY) === 'dual' ? 'dual' : 'single'; }
  catch (err){ return 'single'; }
}
function storeView(v){
  try { localStorage.setItem(VIEW_KEY, v); } catch (err){ /* приватный режим */ }
}

function applyBoardView(){
  const v = readView();
  document.querySelectorAll('.boards').forEach(b => {
    if (v === 'dual') b.setAttribute('data-view', 'dual');
    else b.removeAttribute('data-view');   // одна доска — поведение по умолчанию
  });
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('on', v === 'dual');
    btn.textContent = v === 'dual' ? '▯ Одна доска' : '▦ Две доски';
  });
}

function makeViewButton(){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-small view-btn';
  b.addEventListener('click', () => {
    storeView(readView() === 'dual' ? 'single' : 'dual');
    applyBoardView();
  });
  return b;
}

function initBoardView(){
  document.querySelectorAll('.topbar').forEach(tb => {
    if (!tb.querySelector('.view-btn')) tb.appendChild(makeViewButton());
  });
  applyBoardView();
}
initBoardView();

/* тапы по доскам не должны двигать страницу и зумить: на телефоне
   из-за pan/zoom тапы по клеткам иногда «пропадали» — и бой шёл
   «со скрипом» (style.css заморожен, R9 — добавка скриптом) */
(function injectBoardTouchC(){
  const st = document.createElement('style');
  st.textContent = '#canvas-player,#canvas-enemy{touch-action:none}';
  document.head.appendChild(st);
})();
