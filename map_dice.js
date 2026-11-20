'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_dice.js
   КОСТИ ПОХОДА (этап 1.5, идея Егора): кнопка «Кости» на
   экране похода. Два кубика стрекочут, выпадает сумма — и
   штормовой вихрь ШВЫРЯЕТ корабль в неожиданное место карты.
   Иногда кости бросают прямо к узлу: сундук откроется сам,
   у острова всплывёт подсказка боя, шторм окатит волной.
   Карта и рупор берутся у map_mode.js через CPT.mapHook,
   рисуем поверх карты в общем художнике. style.css не трогаем.
   ============================================================ */

const DICE = { phase: 'idle', t: 0, d1: 1, d2: 1, sum: 0, _f: -1 };

/* точки-пипсы на грани кости (координаты -1..1) */
const DICE_PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
};

const DICE_PHRASES = [
  'вихрь подхватил корабль и понёс неведомо куда!',
  'морское течение-гонец швырнуло корабль в новые воды!',
  'шторм крутанул корабль и выбросил на другом конце карты!',
  'морской дьявол играет костями — корабль перенесло!'
];

/* одна кость: светлая плашка с тёмными пипсами */
function drawDieC(g, x, y, s, n, rot){
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(s / 46, s / 46);
  g.fillStyle = 'rgba(255,250,235,.96)';
  g.strokeStyle = '#a9853f'; g.lineWidth = 2.5;
  roundRect(g, -23, -23, 46, 46, 10); g.fill(); g.stroke();
  g.fillStyle = '#2e2a24';
  for (const p of DICE_PIPS[n]){
    g.beginPath(); g.arc(p[0] * 12, p[1] * 12, 4.6, 0, 7); g.fill();
  }
  g.restore();
}

/* бросок: пока корабль в пути — кости не перебрасываем */
function mapDiceRoll(){
  const hook = CPT.mapHook;
  if (!hook) return;
  const M = hook.M();
  if (!M || !M.ship) return;
  if (DICE.phase !== 'idle'){ hook.say('Кости уже летят, капитан!'); return; }
  if (M.ship.goal){ hook.say('Сначала доплыви до места — потом кости!'); return; }
  DICE.phase = 'rolling'; DICE.t = 0; DICE._f = -1;
  if (window.splashC) splashC();
}

/* тик анимации: стрекот кубиков, затем выброс */
function mapDiceTick(dt){
  if (DICE.phase === 'idle') return;
  DICE.t += dt;
  if (DICE.phase === 'rolling'){
    const f = Math.floor(DICE.t / 0.09);
    if (f !== DICE._f){
      DICE._f = f;
      DICE.d1 = 1 + Math.floor(Math.random() * 6);
      DICE.d2 = 1 + Math.floor(Math.random() * 6);
      if (window.splashC) splashC();
    }
    if (DICE.t >= 0.95){
      DICE.d1 = 1 + Math.floor(Math.random() * 6);
      DICE.d2 = 1 + Math.floor(Math.random() * 6);
      DICE.sum = DICE.d1 + DICE.d2;
      mapDiceThrow();
      DICE.phase = 'fly'; DICE.t = 0;
    }
  } else if (DICE.t > 1.6){
    DICE.phase = 'idle';
  }
}

/* куда кости швыряют корабль */
function mapDiceTarget(M){
  const sh = M.ship;
  const nodes = M.nodes.filter(n => Math.hypot(n.x - sh.x, n.y - sh.y) > 60);
  for (let i = 0; i < 10; i++){
    const x = 46 + Math.random() * (MAP_W - 92);
    const y = 46 + Math.random() * (MAP_H - 92);
    if (Math.hypot(x - sh.x, y - sh.y) < 150) continue;   /* прочь отсюда */
    const near = nodes.find(n => Math.hypot(x - n.x, y - n.y) <= 34);
    if (near) return { x: near.x, y: near.y, goal: { kind: near.kind, node: near } };
    if (i > 5 || Math.random() < 0.5)
      return { x, y, goal: { kind: 'sea', node: null } };
  }
  return { x: MAP_W / 2, y: MAP_H / 2, goal: { kind: 'sea', node: null } };
}

/* сам выброс: ускорение, тряска, брызги, рупор */
function mapDiceThrow(){
  const hook = CPT.mapHook;
  const M = hook && hook.M();
  if (!M || !M.ship){ DICE.phase = 'idle'; return; }
  const t = mapDiceTarget(M);
  const sh = M.ship;
  M.diceBoost = true;
  M.shake = 0.45;
  sh.goal = t.goal; sh.tx = t.x; sh.ty = t.y;
  for (let i = 0; i < 8; i++){          /* брызги на месте старта */
    sh.foam.push({ x: sh.x + (Math.random() * 36 - 18),
                   y: sh.y + (Math.random() * 36 - 18),
                   t0: performance.now() / 1000, dur: 1.1 });
  }
  hook.say('Кости: ' + DICE.d1 + ' + ' + DICE.d2 + ' = ' + DICE.sum + '. ' +
           rnd(DICE_PHRASES));
  if (window.pingC) pingC();
}

/* кости поверх карты */
function mapDiceDraw(g){
  if (DICE.phase === 'idle') return;
  const cx = MAP_W / 2, cy = 86;
  let alpha = 1, hop = 0, wob = 0;
  if (DICE.phase === 'rolling'){
    hop = -Math.abs(Math.sin(DICE.t * 16)) * 14;
    wob = Math.sin(DICE.t * 22) * 0.3;
  } else {
    alpha = Math.max(0, 1 - (DICE.t - 1.0) / 0.6);
    if (DICE.t < 0.25) hop = -(0.25 - DICE.t) * 44;
  }
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(5,18,35,.42)';
  g.beginPath(); g.ellipse(cx, cy + 36, 96, 26, 0, 0, 7); g.fill();
  drawDieC(g, cx - 36, cy + hop, 52, DICE.d1, wob);
  drawDieC(g, cx + 36, cy + hop, 52, DICE.d2, -wob);
  if (DICE.phase === 'fly'){
    const s = DICE.d1 + ' + ' + DICE.d2 + ' = ' + DICE.sum;
    g.font = 'bold 22px Verdana, sans-serif'; g.textAlign = 'center';
    g.strokeStyle = 'rgba(5,18,35,.75)'; g.lineWidth = 4;
    g.strokeText(s, cx, cy + 88); g.fillStyle = '#ffd257';
    g.fillText(s, cx, cy + 88);
  }
  g.restore();
}

function mapDiceReset(){ DICE.phase = 'idle'; DICE.t = 0; }

/* мост для map_mode.js: кнопка, тик и рисование */
CPT.mapDice = {
  roll: mapDiceRoll,
  tick: mapDiceTick,
  draw: mapDiceDraw,
  busy: function(){ return DICE.phase !== 'idle'; },
  reset: mapDiceReset
};
window.mapDiceRoll = mapDiceRoll;
