'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_bot.js
   БОТ классического боя: окно прицеливания 3-5 секунд (за это
   время можно сыграть «Ремонт» или «Щит»), рандом с добиванием
   раненых, выстрел вслепую сквозь дым. Отрезано от game_core.js.
   ============================================================ */

/* ---------------- бот: рандом + добивание раненых ----------------
   Острова бот не обстреливает — там никого не бывает. */
function botPick(){
  const S = C;
  if (S.wounded.length){
    let cand = [];
    if (S.wounded.length === 1){
      const [r, c] = S.wounded[0];
      cand = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    } else {
      const rs = S.wounded.map(p => p[0]), cs = S.wounded.map(p => p[1]);
      const sameR = rs.every(v => v === rs[0]);
      const lo = Math.min(...(sameR ? cs : rs));
      const hi = Math.max(...(sameR ? cs : rs));
      if (sameR) cand = [[rs[0], lo - 1], [rs[0], hi + 1]];
      else       cand = [[lo - 1, cs[0]], [hi + 1, cs[0]]];
    }
    cand = cand.filter(([r, c]) => inB(r, S.N) && inB(c, S.N) && !S.pShot[r][c] && !S.isleSet.has(r + ',' + c));
    if (cand.length) return rnd(cand);
  }
  const free = [];
  for (let r = 0; r < S.N; r++)
    for (let c = 0; c < S.N; c++)
      if (!S.pShot[r][c] && !S.isleSet.has(r + ',' + c)) free.push([r, c]);
  return rnd(free);
}

/* выстрел вслепую (карта «Дым»): только рандом, без добивания */
function botPickBlindC(){
  const S = C;
  const free = [];
  for (let r = 0; r < S.N; r++)
    for (let c = 0; c < S.N; c++)
      if (!S.pShot[r][c] && !S.isleSet.has(r + ',' + c)) free.push([r, c]);
  return rnd(free);
}

async function botMove(){
  const S = C;
  await sleep(BOT_AIM_MIN + Math.random() * (BOT_AIM_MAX - BOT_AIM_MIN));
  if (!S || S !== C || S.phase !== 'bot') return;
  const blind = S.smokeNext;
  S.smokeNext = false;
  const [r, c] = blind ? botPickBlindC() : botPick();
  const ship = S.pRefC[r][c];
  const blocked = !!ship && S.shieldOn;
  const flight = shellPushC('P', r, c, 'foe');
  boomShotC();
  await sleep(flight);                 /* снаряд противника летит к нам */
  if (!S || S !== C || S.phase !== 'bot') return;
  if (blocked){
    /* щит принял выстрел на себя и рассыпался */
    S.shieldOn = false;
    S.pShot[r][c] = 1;
    fxPushC('P', r, c, 'shield');
    toneC(330, .3, 'triangle', .07);
  } else if (ship){
    S.pShot[r][c] = 2;
    ship.hits++;
    S.wounded.push([r, c]);
    fxPushC('P', r, c, 'boom');
  } else {
    S.pShot[r][c] = 1;
    fxPushC('P', r, c, 'splash');
    splashC();
  }
  await sleep(HOLD_BOT);                 /* результат видно на нашей доске */
  if (!S || S !== C || S.phase !== 'bot') return;
  if (allSunk(S.pShips)){ gameOverC(false); return; }
  if (ship && !blocked && ship.hits === ship.len) S.wounded = [];
  sayG(blocked
    ? 'Щит принял выстрел на себя и рассыпался! Ваш ход.'
    : ship
      ? (ship.hits === ship.len
          ? 'Противник потопил ваш ' + SHIP_NAMES[ship.len] + '! Ваш ход.'
          : 'Противник попал! Ваш ход.')
      : (blind
          ? 'Сквозь дым противник бил наугад и промахнулся. Ваш ход!'
          : 'Противник промахнулся. Ваш ход!'));
  S.phase = 'player';
  setTurnC('me');
}
