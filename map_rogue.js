'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_rogue.js
   ЭТАП 5 (блок 3 — море, идея Егора о блуждающем боссе):
   БЛУЖДАЮЩИЙ КОРСАР. С третьего дня похода в море выходит
   пиратский корабль: медленно бродит от узла к узлу по своим
   делам. Сблизился с капитаном на дистанцию перехвата —
   карточка «Корсар на абордаж!»: В БОЙ или Отойти.
   Бой — на движке классики (R11): 8×8, бот 3-го уровня, как
   на дальнем острове. Победа — трофей 45–90 монет и с 40%
   шансом карточка в трюм; корсар уходит за горизонт на три
   дня (cool в сейве похода). Поражение — трюм цел, корсар
   дрейфует день. «Отойти» — он просто уплывает в другую
   сторону: наказания нет, это выбор капитана.
   Позиция корсара и остывание хранятся в сейве похода
   (map_gen.js: sea). Старые сейвы: корсар появится сам с 3-го
   дня. Если map_rogue.js потерян — плавание как раньше.
   style.css не трогаем: карточка на .overlay/.overlay-card.
   Реестр: CPT.rogue = { fight }.
   Порядок подключения: последним, после map_sea.js.
   ============================================================ */

const ROGUE_GATE_DAY = 3;      /* с какого дня корсар выходит на охоту */
const ROGUE_CATCH = 46;        /* дистанция перехвата, px карты */
const ROGUE_SPD = 46;          /* скорость корсара, px/с — медленней капитана */
const ROGUE_WIN_MIN = 45, ROGUE_WIN_SPREAD = 46;   /* трофей 45–90 */
const ROGUE_CARD_CHANCE = 0.4; /* шанс карточки к трофею */

const ROG = { on: false };

/* ---------------- место подальше от корабля и узлов ---------------- */
function rogueFarPoint(){
  let best = null, bestD = -1;
  for (let i = 0; i < 40; i++){
    const x = 60 + Math.random() * (MAP_W - 120);
    const y = 60 + Math.random() * (MAP_H - 120);
    const ds = Math.hypot(M.ship.x - x, M.ship.y - y);
    if (ds < 260) continue;
    if (M.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 70)) continue;
    return { x: Math.round(x), y: Math.round(y) };
  }
  /* запасной перебор сеткой: самое дальнее от корабля место */
  for (let x = 60; x <= MAP_W - 60; x += 45){
    for (let y = 60; y <= MAP_H - 60; y += 45){
      const d = Math.hypot(M.ship.x - x, M.ship.y - y);
      if (d > bestD){ bestD = d; best = { x: x, y: y }; }
    }
  }
  return best;
}

function rogueSpawn(){
  const p = rogueFarPoint();
  M.sea = { x: p.x, y: p.y, tx: p.x, ty: p.y, cool: 0 };
}

function rogueRepose(){
  if (!M.sea) return;
  const p = rogueFarPoint();
  M.sea.x = p.x; M.sea.y = p.y;
  M.sea.tx = p.x; M.sea.ty = p.y;
}

/* ---------------- карточка перехвата ---------------- */
let rogueBox = null;
function rogueEnsure(){
  if (rogueBox) return rogueBox;
  const scr = $('screen-map');
  if (!scr) return null;
  rogueBox = document.createElement('div');
  rogueBox.id = 'rogue-overlay';
  rogueBox.className = 'overlay hidden';
  rogueBox.innerHTML =
    '<div class="overlay-card">' +
      '<div class="overlay-emoji">☠</div>' +
      '<h2>Корсар на абордаж!</h2>' +
      '<p id="rogue-text" style="font-size:15px;line-height:1.6;text-align:left;color:#3d3222;' +
        'font-weight:600;max-width:420px;">Чёрный парус шёл наперерез: на корме — ' +
        'пиратский флаг и орудийные стволы. Корсар требует твоё золото, а лучше — весь корабль.' +
        '</p>' +
      '<div class="overlay-btns">' +
        '<button id="rogue-go" class="btn-gold">В БОЙ</button>' +
        '<button id="rogue-away" class="btn-ghost">Отойти</button>' +
      '</div>' +
    '</div>';
  scr.appendChild(rogueBox);
  return rogueBox;
}

function rogueOverlaysOpen(){
  return !!document.querySelector(
    '#story-overlay:not(.hidden), #chest-overlay:not(.hidden), ' +
    '#shop-overlay:not(.hidden), #hall-overlay:not(.hidden), ' +
    '#rogue-overlay:not(.hidden)');
}

function rogueShow(){
  const box = rogueEnsure();
  if (!box) return;
  M.ship.goal = null;                    /* корабль останавливается */
  $('rogue-go').onclick = () => { box.classList.add('hidden'); rogueFight(); };
  $('rogue-away').onclick = () => {
    box.classList.add('hidden');
    rogueRepose();
    mapSave(M);
    mapToast('Отрыв от корсара: он ушёл в другую сторону моря.');
  };
  box.classList.remove('hidden');
}

/* ---------------- бой с корсаром на движке классики ---------------- */
function rogueFight(){
  if (!M || ROG.on) return;
  if (typeof startClassic !== 'function'){
    mapToast('Корсар смеётся: при сборке потерялся game_battle.js.');
    rogueRepose();
    mapSave(M);
    return;
  }
  const hold = (M.inv && M.inv.cards)
    ? M.inv.cards.map(nm => MAP_CARD_KEYS[nm]).filter(Boolean)
    : [];
  ROG.on = true;
  if (CPT.mapDice) CPT.mapDice.reset();   /* кости не летят сквозь бой */
  M.ship.goal = null;
  mapSave(M);
  startClassic('easy', {
    over: rogueOver,                /* итог боя уходит в поход отсюда */
    lvl: 3,                         /* бот бьёт как на дальнем острове */
    mapName: 'Корсар',
    intro: 'Корсар! Пиратский флот атакует на открытой воде. Расставьте флот и выберите 3 карточки капитана.',
    hold: hold                      /* карточки трюма уже в колоде */
  });
}

function rogueOver(win){
  ROG.on = false;
  if (C && C.pick && CPT.mapBattle) CPT.mapBattle.consume([...C.pick]);
  if (win && M && M.inv){
    const loot = ROGUE_WIN_MIN + Math.floor(Math.random() * ROGUE_WIN_SPREAD);
    M.inv.gold += loot;
    let extra = '';
    if (Math.random() < ROGUE_CARD_CHANCE){
      const c = rnd(CARD_NAMES_MAP);
      M.inv.cards.push(c);
      extra = ', карточка «' + c + '»';
    }
    if (M.sea){ M.sea.cool = 3; rogueRepose(); }
    mapUpdateCargo();
    mapSave(M);
    startMapMode();
    const msg = 'Корсар отогнан! Трофей: +' + loot + ' монет' + extra +
      '. Три дня он не сунется.';
    mapToast(msg);
    sayMap(msg);                    /* итог остаётся в статусе и не гаснет */
    if (window.mapHall) mapHall('Корсар отогнан: +' + loot + ' золота' + extra + '.', 'win');
  } else {
    if (M && M.sea){ M.sea.cool = 1; rogueRepose(); }
    if (M) mapSave(M);
    startMapMode();
    mapToast('Корсар отбился и ушёл за горизонт. Трюм цел, но день потрачен.');
    sayMap('Корсар отбился. Он снова выйдет на охоту — наберись сил, капитан.');
    if (window.mapHall) mapHall('Стычка с корсаром: отступили в открытом море.', 'loss');
  }
}

/* ---------------- ход и перехват (художник в общий цикл) ---------------- */
function rogueDraw(g, ts){
  const s = M.sea;
  const bob = Math.sin(ts * 2.1) * 2.2;
  g.save();
  g.translate(s.x, s.y + bob);
  const ang = Math.atan2(s.ty - s.y, s.tx - s.x);
  g.rotate(ang);
  g.scale(1.35, 1.35);
  g.fillStyle = 'rgba(0,0,0,.14)';
  g.beginPath(); g.ellipse(-2, 4, 15, 6, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2f3e'; g.strokeStyle = '#241c28'; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-15, -5); g.quadraticCurveTo(0, -9, 16, -4);
  g.quadraticCurveTo(11, 7, 0, 7); g.quadraticCurveTo(-11, 7, -15, -5);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#241c28'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -8); g.lineTo(0, -24); g.stroke();
  g.fillStyle = '#43525e';
  g.beginPath();
  g.moveTo(1, -23); g.quadraticCurveTo(12, -16, 10, -7);
  g.lineTo(1, -7); g.closePath(); g.fill();
  g.fillStyle = '#1d2229';
  g.beginPath();
  g.moveTo(-1, -20); g.quadraticCurveTo(-9, -14, -8, -7);
  g.lineTo(-1, -7); g.closePath(); g.fill();
  g.fillStyle = '#d84343';
  g.beginPath();
  g.moveTo(0, -24); g.lineTo(9, -21); g.lineTo(0, -18); g.closePath(); g.fill();
  g.restore();
  mapLabel(g, s.x, s.y + 26, 'КОРСАР', 'rgba(122,32,32,.9)');
}

function rogueTick(ts){
  if (typeof activeScreen === 'undefined' || activeScreen !== 'map' || !M || !M.ship) return;
  if (ROG.on) return;
  const dt = Math.min(.05, ts - (M._rLast === undefined ? ts : M._rLast));
  M._rLast = ts;
  if (M._rDay === undefined){
    M._rDay = M.day;                        /* свежий поход/возврат из боя: только синхронизация,
                                               без списания — иначе каждый бой съедал день покоя */
  } else if (M._rDay !== M.day){            /* новый день — корсар остывает */
    M._rDay = M.day;
    if (M.sea && M.sea.cool > 0){ M.sea.cool--; mapSave(M); }
  }
  if (!M.sea){
    if ((M.day || 1) < ROGUE_GATE_DAY) return;
    rogueSpawn();
    mapSave(M);
  }
  const s = M.sea;
  if (s.cool > 0) return;                 /* отбился — гуляет за горизонтом */
  const g = $('canvas-map') ? $('canvas-map').getContext('2d') : null;
  if (g) rogueDraw(g, ts);                /* корсар виден всегда, даже за панелью */
  const blocked = rogueOverlaysOpen() || (CPT.mapDice && CPT.mapDice.busy());
  if (blocked) return;
  /* бродит: дошёл до цели — выбирает следующий узел */
  const drem = Math.hypot(s.tx - s.x, s.ty - s.y);
  if (drem < 8){
    const n = M.nodes[Math.floor(Math.random() * M.nodes.length)];
    s.tx = n.x + (Math.random() - .5) * 28;
    s.ty = n.y + (Math.random() - .5) * 28;
  } else {
    const step = Math.min(ROGUE_SPD * dt, drem);
    const a = Math.atan2(s.ty - s.y, s.tx - s.x);
    s.x += Math.cos(a) * step;
    s.y += Math.sin(a) * step;
  }
  /* перехват: сблизился с кораблём — карточка */
  if (Math.hypot(M.ship.x - s.x, M.ship.y - s.y) < ROGUE_CATCH){
    rogueShow();
    return;
  }
}

CPT.painter(rogueTick);
CPT.rogue = { fight: rogueFight };
