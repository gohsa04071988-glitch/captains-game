'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_bot.js
   БОТ классического боя: окно прицеливания 3-5 секунд (за это
   время можно сыграть «Ремонт» или «Щит»), рандом с добиванием
   раненых, выстрел вслепую сквозь дым. Отрезано от game_core.js.
   ============================================================ */

/* ---------------- бот: рандом + добивание раненых ----------------
   Острова бот не обстреливает — там никого не бывает.
   В походе бот получает уровень (1–3) — см. botPick. */
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
  const free = botFreeCellsC();
  if (!free.length) return [0, 0];   /* всё обстреляно — страховка, до боя не доходит */
  /* УРОВНИ БОТА ПОХОДА (bot level растёт с удалённостью острова):
     2 — стреляет только там, где ещё может стоять корабль;
     3 — сверху и шахматный шаблон: соседние клетки не жжёт зря. */
  const lvl = S.lvl || 1;
  if (lvl >= 2){
    let pool = free.filter(([r, c]) => botSpanC(r, c, true) >= 2 || botSpanC(r, c, false) >= 2);
    if (!pool.length) pool = free;
    if (lvl >= 3){
      const par = pool.filter(([r, c]) => (r + c) % 2 === 0);
      if (par.length) pool = par;
    }
    return rnd(pool);
  }
  return rnd(free);
}

/* выстрел вслепую (карта «Дым»): только рандом, без добивания */
function botPickBlindC(){
  return rnd(botFreeCellsC());
}

/* свободные клетки: не обстреляны и не острова */
function botFreeCellsC(){
  const S = C, free = [];
  for (let r = 0; r < S.N; r++)
    for (let c = 0; c < S.N; c++)
      if (!S.pShot[r][c] && !S.isleSet.has(r + ',' + c)) free.push([r, c]);
  return free;
}

/* сколько подряд свободных клеток проходит через (r, c):
   корабль на такую линию ещё может встать — для умного бота */
function botSpanC(r, c, hor){
  const dr = hor ? 0 : 1, dc = hor ? 1 : 0;
  let n = 1;
  for (let k = 1; k <= 4; k++){
    const rr = r + dr * k, cc = c + dc * k;
    if (!inB(rr, C.N) || !inB(cc, C.N) || C.pShot[rr][cc] || C.isleSet.has(rr + ',' + cc)) break;
    n++;
  }
  for (let k = 1; k <= 4; k++){
    const rr = r - dr * k, cc = c - dc * k;
    if (!inB(rr, C.N) || !inB(cc, C.N) || C.pShot[rr][cc] || C.isleSet.has(rr + ',' + cc)) break;
    n++;
  }
  return n;
}

async function botMove(){
  const S = C;
  /* этап 3 блок 1b: у Левиафана каждый 3-й ход — НАКАТ ВОЛНЫ;
     волне некуда ударить — обычный выстрел */
  if (S && S.levi && ((S.leviTurn = (S.leviTurn || 0) + 1) % LEVI_WAVE_EVERY === 0)){
    if (await leviWaveC(S)) return;
  }
  return botShotC(S);
}

async function botShotC(S){
  /* дальний остров — бот опытнее и целится быстрее */
  const aimMin = Math.max(1200, BOT_AIM_MIN - ((S.lvl || 1) - 1) * 800);
  await sleep(aimMin + Math.random() * (BOT_AIM_MAX - BOT_AIM_MIN));
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

/* каждый 3-й ход Левиафана */
const LEVI_WAVE_EVERY = 3;

/* ---------------- «НАКАТ ВОЛНЫ» — атака Левиафана ----------------
   Волна накрывает целый ряд нашей доски: два снаряда в один ряд.
   Щит принимает первый на себя; дым потрачен впустую — волна и
   так бьёт жребием, без добивания раненых. Возвращает true,
   если волна состоялась (ход передан игроку внутри). */
async function leviWaveC(S){
  const rows = [];
  for (let r = 0; r < S.N; r++){
    const free = [];
    for (let c = 0; c < S.N; c++)
      if (!S.pShot[r][c] && !S.isleSet.has(r + ',' + c)) free.push(c);
    if (free.length >= 2) rows.push({ r, free });
  }
  if (!rows.length) return false;
  const aimMin = Math.max(1200, BOT_AIM_MIN - 2 * 800);   /* бьёт как бот 3-го уровня */
  sayG('Левиафан поднимает волну...');
  await sleep(aimMin + Math.random() * (BOT_AIM_MAX - BOT_AIM_MIN));
  if (!S || S !== C || S.phase !== 'bot') return true;
  const row = rnd(rows);
  const pool = row.free.slice(), cells = [];
  for (let k = 0; k < 2 && pool.length; k++)
    cells.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  sayG('НАКАТ ВОЛНЫ! Два снаряда в ряд ' + (row.r + 1) + '!');
  for (const c of cells){
    const ship = S.pRefC[row.r][c];
    const blocked = !!ship && S.shieldOn;
    const flight = shellPushC('P', row.r, c, 'foe');
    boomShotC();
    await sleep(flight);
    if (!S || S !== C || S.phase !== 'bot') return true;
    if (blocked){
      S.shieldOn = false;
      S.pShot[row.r][c] = 1;
      fxPushC('P', row.r, c, 'shield');
      toneC(330, .3, 'triangle', .07);
    } else if (ship){
      S.pShot[row.r][c] = 2;
      ship.hits++;
      S.wounded.push([row.r, c]);
      fxPushC('P', row.r, c, 'boom');
      if (ship.hits === ship.len) S.wounded = [];
    } else {
      S.pShot[row.r][c] = 1;
      fxPushC('P', row.r, c, 'splash');
      splashC();
    }
    await sleep(HOLD_BOT);
    if (!S || S !== C || S.phase !== 'bot') return true;
    if (allSunk(S.pShips)){ gameOverC(false); return true; }
  }
  S.smokeNext = false;              /* дым волну не обманывает */
  sayG('Волна отхлынула. Ваш ход.');
  S.phase = 'player';
  setTurnC('me');
  return true;
}
