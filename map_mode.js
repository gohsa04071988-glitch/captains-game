'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_mode.js
   РЕЖИМ «ПОХОД ПО КАРТЕ» (этап 1.5).
   Гибридная карта на канвасе: порт, боссовые гнёзда на своих
   местах, остальные куски — полная колода (map_gen.js):
   острова, сундуки, штормы и отмели без пустого моря.
   Корабль плывёт сам: клик по морю — курс с плавным
   поворотом и пенным следом. Кости (map_dice.js) швыряют
   корабль в случайное место. Сундук — карточка, ремонт или
   золото. Острова дают бой (map_battle.js): поле и бот — по
   удалённости острова.
   Поход сохраняется в localStorage (закрыл — продолжил).
   Отрисовка: острова переиспользуют drawIsleC из game_core,
   style.css не трогаем — экран собирается кодом.
   ============================================================ */

const MAP_SPD = 100;            /* скорость корабля, px/с        */
const MAP_STOP = { sea: 8, chest: 30, isle: 46, boss: 50, port: 44 };
const MAP_WATER = { top: '#bfeef7', mid: '#7cc9de', deep: '#3e97b8' };

const ICON_MAP = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 8 l9 -3 10 3 9 -3 v34 l-9 3 -10 -3 -9 3 Z"/><path d="M19 5 v34"/><path d="M29 8 v34"/><circle cx="24" cy="21" r="4.5"/><path d="M24 25 v7"/></svg>';

CPT.mode({
  id: 'map',
  name: 'ПОХОД ПО КАРТЕ',
  desc: 'сундуки · боссы · золото',
  row: 'duo',
  icon: ICON_MAP,
  start: function(){ startMapMode(); }
});

/* ---------------- экран похода ----------------
   Собирается кодом при первом старте: классы .screen/.topbar/
   .status/.btn-small берут вид из style.css — сам файл не
   меняется. */
let M = null, Mg = null;

function ensureMapScreen(){
  if ($('screen-map')) return;
  const s = document.createElement('section');
  s.id = 'screen-map';
  s.className = 'screen';
  s.innerHTML =
    '<div class="topbar">' +
      '<button id="btn-quit-map" class="btn-small">← Меню</button>' +
      '<div id="map-status" class="status">Поход</div>' +
      '<button id="btn-newmap" class="btn-small gold" style="font-size:17px;font-weight:800;' +
        'padding:10px 22px;box-shadow:0 3px 12px rgba(226,168,43,.5);">🧭 Новый поход</button>' +
    '</div>' +
    '<div id="map-wrap" style="position:relative;display:inline-block;">' +
      '<canvas id="canvas-map"></canvas>' +
      '<button id="btn-dice" class="btn-small gold" style="position:absolute;right:12px;bottom:12px;' +
        'font-size:20px;font-weight:800;padding:14px 26px;border-radius:16px;cursor:pointer;' +
        'box-shadow:0 4px 16px rgba(5,18,35,.4);z-index:5;">🎲 Кости</button>' +
    '</div>' +
    '<div id="map-cargo" style="margin-top:10px;font-weight:700;font-size:14px;' +
      'color:#0d5a75;background:rgba(255,255,255,.75);border:2px solid #c6e4f2;' +
      'border-radius:12px;padding:8px 16px;letter-spacing:.4px;">Трюм пуст</div>' +
    '<div id="map-toast" style="margin-top:8px;font-weight:700;font-size:15px;' +
      'color:#7a3d10;min-height:22px;transition:opacity .35s;opacity:0;"></div>';
  document.body.appendChild(s);
  /* style.css заморожен: max-width:600px у canvas написано для досок
     боя на телефоне — для карты перекрываем скриптом (R9 не трогаем) */
  s.style.maxWidth = 'none';
  const st = document.createElement('style');
  st.textContent = '#screen-map canvas{ max-width:none !important; }';
  document.head.appendChild(st);
}

function sayMap(t){ $('map-status').textContent = t; }

let mapToastTimer = null;
function mapToast(t){
  const el = $('map-toast');
  if (!el) return;
  el.textContent = t;
  el.style.opacity = '1';
  clearTimeout(mapToastTimer);
  mapToastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

/* мост для map_dice.js: кости берут карту и рупор отсюда */
CPT.mapHook = { M: () => M, say: mapToast };

function mapUpdateCargo(){
  const c = M ? M.inv.cards : [];
  const p = (M && M.inv && M.inv.parts) || { key: 0, map: 0 };   /* этап 3: части */
  $('map-cargo').textContent =
    '🪙 ' + (M ? M.inv.gold : 0) + '   ·   🔧 ремонт: ' + (M ? M.inv.repair : 0) +
    '   ·   🃏 ' + (c.length ? c.join(', ') : 'карточек нет') +
    '   ·   🗝 ' + Math.min(3, p.key) + '/3 · 🗺 ' + Math.min(3, p.map) + '/3';
}

/* ---------------- старт и новый поход ---------------- */
function mapNew(){
  const M2 = mapGenerate(Math.floor(Math.random() * 1e9));
  const port = M2.nodes.find(n => n.kind === 'port');
  M2.ship = { x: port.x, y: port.y + 20, a: -Math.PI / 2, goal: null, tx: 0, ty: 0, foam: [] };
  M2.inv = { gold: 0, repair: 2, cards: [], parts: { key: 0, map: 0 } };
  return M2;
}

/* ---------------- размер карты: тянем на всё окно ----------------
   Координаты узлов всегда 900×520 (их даёт генератор), но канва
   показывается с масштабом k: на большом окне карта крупная, на
   телефоне сжимается. canvasXY сам делит на масштаб, клики не
   ломаются. Высоту не задаём: правило height:auto держит пропорции. */
function fitMapCanvas(){
  const cv = $('canvas-map');
  if (!cv || !Mg) return;
  const availW = Math.max(340, window.innerWidth - 26);
  const availH = Math.max(300, window.innerHeight - 172);   /* верхняя панель + трюм */
  const k = Math.max(.55, Math.min(2.4, Math.min(availW / MAP_W, availH / MAP_H)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(MAP_W * dpr * k);
  cv.height = Math.round(MAP_H * dpr * k);
  cv.style.width = Math.round(MAP_W * k) + 'px';
  cv._w = MAP_W; cv._h = MAP_H;
  Mg.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
}

function startMapMode(){
  ensureMapScreen();
  M = mapLoad() || mapNew();
  M.ship.goal = null;
  if (CPT.mapDice) CPT.mapDice.reset();
  if (!isFinite(M.ship.x) || !isFinite(M.ship.y)){   /* страховка от битого сейва */
    const port = M.nodes.find(n => n.kind === 'port');
    M.ship.x = port.x; M.ship.y = port.y + 20; M.ship.a = -Math.PI / 2;
  }
  Mg = initCanvas($('canvas-map'), MAP_W, MAP_H);
  fitMapCanvas();
  mapBindOnce();
  mapUpdateCargo();
  showScreen('map');
  sayMap('Карта похода. Клик по морю — корабль плывёт сам. Кости швыряют корабль куда попало!');
  if (CPT.hint) CPT.hint('m-map',
    'Золото тратится в порту (лавка), обрывки карт открывают гнёзда боссов, а кнопка «Журнал» хранит медали.');
  mapSave(M);
}

let mapBound = false;
function mapBindOnce(){
  if (mapBound) return;
  mapBound = true;
  $('canvas-map').addEventListener('pointerdown', mapClick);
  window.addEventListener('resize', fitMapCanvas);   /* окно растянули — карта тоже */
  $('btn-quit-map').addEventListener('click', () => { if (M) mapSave(M); showScreen('menu'); });
  $('btn-dice').addEventListener('click', () => { if (CPT.mapDice) CPT.mapDice.roll(); });
  $('btn-newmap').addEventListener('click', () => {
    mapForget();
    if (CPT.mapDice) CPT.mapDice.reset();
    M = mapNew();
    mapUpdateCargo();
    mapSave(M);
    sayMap('Свежая карта собрана, капитан. Ветер попутный!');
    mapToast('Новый поход начат: карта собрана заново.');
  });
}

/* ---------------- клики: куда плывём ---------------- */
function mapClick(e){
  if (!M) return;
  if (CPT.mapDice && CPT.mapDice.busy()) return;  /* кости летят — курс не перебиваем */
  const p = canvasXY($('canvas-map'), e);
  const pick = MAP_STOP;
  let best = null, bestD = 1e9;
  for (const n of M.nodes){
    const r = n.kind === 'isle' ? pick.isle : n.kind === 'chest' ? pick.chest :
              n.kind === 'boss' ? pick.boss : n.kind === 'port' ? pick.port : 0;
    if (!r) continue;
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    if (d < r + 6 && d < bestD){ best = n; bestD = d; }
  }
  if (best){
    M.ship.goal = { kind: best.kind, node: best };
    M.ship.tx = best.x; M.ship.ty = best.y;
    sayMap('Курс на «' + best.name + '».');
  } else {
    const tx = Math.max(24, Math.min(MAP_W - 24, p.x));
    const ty = Math.max(24, Math.min(MAP_H - 24, p.y));
    M.ship.goal = { kind: 'sea', node: null };
    M.ship.tx = tx; M.ship.ty = ty;
  }
}

/* ---------------- ход корабля ----------------
   Плавный поворот к курсу + пенный след: тот же приём, что в
   заплыве Кракена, только скромнее. */
function mapLerpA(a, b, k){
  const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * k;
}

function mapStep(ts, dt){
  const sh = M.ship;
  if (!sh.goal) return;
  const dx = sh.tx - sh.x, dy = sh.ty - sh.y;
  const dist = Math.hypot(dx, dy);
  const stop = MAP_STOP[sh.goal.kind] || 8;
  if (dist <= stop){ const goal = sh.goal; sh.goal = null; mapArrive(goal); return; }
  const want = Math.atan2(dy, dx);
  sh.a = mapLerpA(sh.a, want, Math.min(1, dt * 4.5));
  const step = Math.min(MAP_SPD * (M.diceBoost ? 2.6 : 1) * dt, dist); /* кости гонят быстрее */
  sh.x += Math.cos(sh.a) * step;
  sh.y += Math.sin(sh.a) * step;
  sh._run = (sh._run || 0) + step;
  if (sh._run > 38){
    sh._run = 0;
    sh.foam.push({ x: sh.x - Math.cos(sh.a) * 14, y: sh.y - Math.sin(sh.a) * 14,
                   t0: ts, dur: 1.0 });
    if (sh.foam.length > 60) sh.foam.shift();
  }
}

function mapArrive(g){
  if (!g) return;
  const n = g.node;
  M.diceBoost = false;               /* выброс костями завершён */
  if (g.kind === 'chest'){
    if (n.opened){ mapToast('Сундук уже пуст, капитан.'); return; }
    n.opened = true;
    if (n.type === 'card'){
      const c = rnd(CARD_NAMES_MAP);
      M.inv.cards.push(c);
      mapToast('Сундук открыт: карточка «' + c + '» — в трюме!');
    } else if (n.type === 'repair'){
      M.inv.repair++;
      mapToast('Сундук открыт: ремонт флота (+1).');
    } else {
      const gld = 20 + Math.floor(Math.random() * 35);
      M.inv.gold += gld;
      mapToast('Сундук открыт: +' + gld + ' монет в казну!');
    }
    pingC();
    mapUpdateCargo();
    mapSave(M);
  } else if (g.kind === 'isle'){
    if (n.done){ mapToast('«' + n.name + '»: остров уже зачищен.'); return; }
    if (typeof mapBattleStart === 'function') mapBattleStart(n);  /* этап 2: бой */
    else mapToast('Бой не открылся: при сборке потерялся map_battle.js!');
  } else if (g.kind === 'boss'){
    if (typeof mapBossEnter === 'function') mapBossEnter(n);   /* этап 3: гнездо */
    else mapToast('Гнездо молчит: при сборке потерялся map_boss.js.');
  } else if (g.kind === 'port'){
    if (M.inv.repair < 2) M.inv.repair = 2;
    mapToast('Родной порт: отдохнули, ремонт пополнен.');
    mapUpdateCargo();
    mapSave(M);
  } else if (g.kind === 'storm' || g.kind === 'shallow'){
    mapToast(g.kind === 'storm'
      ? 'Выбросило прямо в шторм! Палубу залило, но корпус цел.'
      : 'Мель! Едва не задели днищем дна — повезло, капитан.');
    mapSave(M);
  } else if (g.kind === 'sea'){
    mapSave(M);
  }
}

/* ============================================================
   ОТРИСОВКА (художник в общий цикл CPT)
   ============================================================ */
function mapFrame(ts){
  if (activeScreen !== 'map' || !M) return;
  const dt = Math.min(.05, ts - (M._last === undefined ? ts : M._last));
  M._last = ts;
  if (CPT.mapDice) CPT.mapDice.tick(dt);
  mapStep(ts, dt);
  const g = Mg;
  g.save();
  if (M.shake > 0){                  /* тряска после хода костями */
    M.shake = Math.max(0, M.shake - dt);
    g.translate((Math.random() - .5) * 9, (Math.random() - .5) * 9);
  }
  mapWater(g, ts);
  for (const n of M.nodes){
    if (n.kind === 'shallow') mapShallow(g, n);
    if (n.kind === 'storm') mapStorm(g, n, ts);
    if (n.kind === 'port') mapPort(g, n);
    if (n.kind === 'isle') mapIsle(g, n);
    if (n.kind === 'chest') mapChest(g, n, ts);
    if (n.kind === 'boss') mapBoss(g, n, ts);
  }
  mapFoam(g, ts);
  mapShip(g, ts);
  if (CPT.mapDice) CPT.mapDice.draw(g, ts);
  g.restore();
}

function mapWater(g, ts){
  const gr = g.createLinearGradient(0, 0, 0, MAP_H);
  gr.addColorStop(0, MAP_WATER.top);
  gr.addColorStop(.55, MAP_WATER.mid);
  gr.addColorStop(1, MAP_WATER.deep);
  g.fillStyle = gr;
  g.fillRect(0, 0, MAP_W, MAP_H);
  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 12; i++){
    const x = ((i * 173 + ts * 14) % (MAP_W + 60)) - 30;
    const y = (i * 97 + (i % 3) * 60) % MAP_H;
    g.beginPath();
    g.arc(x, y, 9 + (i % 3) * 3, Math.PI * .15, Math.PI * .85);
    g.stroke();
  }
}

function mapShallow(g, n){
  g.fillStyle = 'rgba(246,231,182,.5)';
  g.beginPath(); g.ellipse(n.x, n.y, 46, 30, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(246,231,182,.6)';
  g.beginPath(); g.ellipse(n.x, n.y, 28, 18, 0, 0, 7); g.fill();
}

function mapStorm(g, n, ts){
  const pulse = 1 + Math.sin(ts * 1.6) * .06;
  g.fillStyle = 'rgba(70,90,110,.30)';
  g.beginPath(); g.ellipse(n.x, n.y, 62 * pulse, 40 * pulse, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.4;
  const drops = n.heavy ? 9 : 5;
  for (let i = 0; i < drops; i++){
    const rx = n.x - 40 + ((i * 23 + ts * 160) % 80);
    const ry = n.y - 22 + ((i * 31 + ts * 210) % 44);
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 9); g.stroke();
  }
}

function mapLabel(g, x, y, text, col){
  g.font = 'bold 10px Verdana, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = col || 'rgba(16,90,120,.85)';
  g.fillText(text, Math.max(64, Math.min(MAP_W - 64, x)), y);  /* края карты не режем */
}

function mapPort(g, n){
  g.fillStyle = 'rgba(246,231,182,.8)';
  g.beginPath(); g.ellipse(n.x, n.y + 6, 52, 30, 0, 0, 7); g.fill();
  g.fillStyle = '#b0563a';
  g.fillRect(n.x - 16, n.y - 12, 14, 12);
  g.beginPath(); g.moveTo(n.x - 18, n.y - 12); g.lineTo(n.x - 9, n.y - 22);
  g.lineTo(n.x, n.y - 12); g.closePath(); g.fill();
  g.strokeStyle = '#0d5a75'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(n.x + 18, n.y - 18); g.lineTo(n.x + 18, n.y - 2);
  g.arc(n.x + 12, n.y - 2, 6, 0, Math.PI, false);
  g.moveTo(n.x + 14, n.y - 18); g.lineTo(n.x + 22, n.y - 18);
  g.stroke();
  mapLabel(g, n.x, n.y + 30, n.name.toUpperCase());
}

function mapIsle(g, n){
  /* тело в узле: drawIsleC использует PAD для обеих осей — рисуем в нуле и переносим контекст */
  const S = 56, cells = n.cells === 2 ? [[0, 0], [0, 1]] : [[0, 0]];
  const cxb = (n.cells === 2 ? 1 : .5) * S, cyb = S / 2;
  g.save(); g.translate(n.x - cxb, n.y - cyb);
  drawIsleC(g, cells, 0, S, MAPS.tropics);
  g.restore();
  if (n.done){
    g.fillStyle = '#e9b53a';
    g.beginPath(); g.arc(n.x, n.y - 34, 8, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 10px Verdana'; g.textAlign = 'center';
    g.fillText('✓', n.x, n.y - 30);
  }
  mapLabel(g, n.x, n.y + (n.cells === 2 ? 40 : 34), n.name + ' · ' + (n.field === 'easy' ? '8×8' : '10×10'));
}

function mapChest(g, n, ts){
  const u = 1.15, w = 30 * u, h = 20 * u;
  if (!n.opened){
    const glow = .3 + .22 * Math.sin(ts * 3 + n.x);
    g.fillStyle = 'rgba(255,215,90,' + glow + ')';
    g.beginPath(); g.arc(n.x, n.y, w * .9, 0, 7); g.fill();
  }
  g.fillStyle = n.opened ? '#a98d64' : '#8a5a34';
  g.strokeStyle = '#5f3d20'; g.lineWidth = 1.6;
  if (n.opened){
    g.fillRect(n.x - w / 2, n.y - h / 4, w, h * .6);
    g.strokeRect(n.x - w / 2, n.y - h / 4, w, h * .6);
    g.fillRect(n.x - w / 2, n.y - h * .95, w, h * .45);
    g.strokeRect(n.x - w / 2, n.y - h * .95, w, h * .45);
  } else {
    g.fillRect(n.x - w / 2, n.y - h / 2, w, h);
    g.strokeRect(n.x - w / 2, n.y - h / 2, w, h);
    g.fillStyle = '#e9b53a';
    g.beginPath(); g.arc(n.x, n.y, 3 * u, 0, 7); g.fill();
  }
  mapLabel(g, n.x, n.y + h / 2 + 12, n.opened ? 'сундук пуст' :
    (n.type === 'card' ? 'сундук: карточка' : n.type === 'repair' ? 'сундук: ремонт' : 'сундук: золото'));
}

function mapBoss(g, n, ts){
  const col = n.boss === 'kraken' ? 'rgba(90,40,120,.75)' : 'rgba(20,80,100,.75)';
  g.fillStyle = 'rgba(15,25,45,.55)';
  g.beginPath(); g.ellipse(n.x, n.y, 40, 26, 0, 0, 7); g.fill();
  g.strokeStyle = col; g.lineWidth = 2.6; g.lineCap = 'round';
  for (let i = 0; i < 4; i++){
    const a = ts * .6 + i * Math.PI / 2;
    g.beginPath();
    g.moveTo(n.x + Math.cos(a) * 8, n.y + Math.sin(a) * 5);
    g.quadraticCurveTo(n.x + Math.cos(a + .7) * 24, n.y + Math.sin(a + .7) * 16,
                       n.x + Math.cos(a + .3) * 34, n.y + Math.sin(a + .3) * 22);
    g.stroke();
  }
  g.fillStyle = col;
  g.beginPath(); g.arc(n.x, n.y, 6, 0, 7); g.fill();
  mapLabel(g, n.x, n.y + 40, n.name.toUpperCase(), col);
}

function mapFoam(g, ts){
  const keep = [];
  for (const f of M.ship.foam){
    const k = (ts - f.t0) / f.dur;
    if (k >= 1 || k < 0){ if (k < 0) keep.push(f); continue; }
    g.fillStyle = 'rgba(255,255,255,' + (.55 * (1 - k)) + ')';
    g.beginPath(); g.arc(f.x, f.y, 3 + k * 7, 0, 7); g.fill();
    keep.push(f);
  }
  M.ship.foam = keep;
}

function mapShip(g, ts){
  const sh = M.ship;
  const bob = Math.sin(ts * 1.9) * 2.6;   /* корабль крупнее — качка плавнее */
  const rock = Math.sin(ts * 1.6) * .09;
  g.save();
  g.translate(sh.x, sh.y + bob);
  g.rotate(sh.a + rock);
  g.scale(1.55, 1.55);
  g.fillStyle = 'rgba(0,0,0,.14)';
  g.beginPath(); g.ellipse(-2, 4, 16, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#8a5a34'; g.strokeStyle = '#5f3d20'; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-16, -5); g.quadraticCurveTo(0, -9, 17, -4);
  g.quadraticCurveTo(12, 7, 0, 7); g.quadraticCurveTo(-12, 7, -16, -5);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#6b4426'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -8); g.lineTo(0, -26); g.stroke();
  g.fillStyle = '#fdf6e3';
  g.beginPath();
  g.moveTo(1, -25); g.quadraticCurveTo(13, -18, 11, -8);
  g.lineTo(1, -8); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(-1, -22); g.quadraticCurveTo(-10, -16, -9, -8);
  g.lineTo(-1, -8); g.closePath(); g.fill();
  g.fillStyle = '#d84343';
  g.beginPath();
  g.moveTo(0, -26); g.lineTo(9, -23); g.lineTo(0, -20); g.closePath(); g.fill();
  g.restore();
}

CPT.painter(mapFrame);
