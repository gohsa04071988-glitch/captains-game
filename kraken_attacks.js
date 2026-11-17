'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — kraken_attacks.js  (v2.1)
   БОЙ: атаки Кракена (якорь / обломки / бочка) и удары игрока
   (выстрелы, торпеда, щит). Функции ТОЛЬКО меняют данные
   состояния B — рисование делает kraken_render.js (R3, R4).

   Состояние B, константы BN/BC/KHP_MAX и помощники объявлены
   в kraken_boss.js — этот файл их не копирует (R5, R7).
   Подключается ПОСЛЕ kraken_boss.js.
   ============================================================ */
function aliveShipCellsB(){
  const out = [];
  for (const s of B.pShips)
    for (const [r, c] of s.cells)
      if (!B.pShot[r][c]) out.push([r, c]);
  return out;
}

function lineSpots(len, live){
  const out = [];
  for (const [sr, sc] of live){
    for (const hor of [true, false]){
      for (let i = 0; i < len; i++){
        const r0 = hor ? sr : sr - i, c0 = hor ? sc - i : sc;
        if (r0 < 0 || c0 < 0) continue;
        if ((hor ? c0 + len - 1 : r0) >= BN) continue;
        if ((hor ? r0 : r0 + len - 1) >= BN) continue;
        const cells = [];
        for (let j = 0; j < len; j++) cells.push(hor ? [r0, c0 + j] : [r0 + j, c0]);
        if (cells.some(([r, c]) => r === sr && c === sc)) out.push(cells);
      }
    }
  }
  return out;
}

function boxSpots(live){
  const out = [];
  for (const [sr, sc] of live)
    for (const dr of [-1, 0])
      for (const dc of [-1, 0]){
        const r0 = sr + dr, c0 = sc + dc;
        if (r0 >= 0 && c0 >= 0 && r0 + 1 < BN && c0 + 1 < BN)
          out.push([[r0, c0], [r0, c0 + 1], [r0 + 1, c0], [r0 + 1, c0 + 1]]);
      }
  return out;
}

function krakenAttack(){
  const live = aliveShipCellsB();
  const roll = Math.random();
  if (roll < .45){                              // ⚓ ЯКОРЬ — меткий, 1 клетка
    const cell = live.length ? rnd(live)
      : [Math.floor(Math.random() * BN), Math.floor(Math.random() * BN)];
    return { kind: 'anchor', cells: [cell] };
  }
  if (roll < .78){                              // 🚢 ОБЛОМКИ — 1x3
    const spots = lineSpots(3, live);
    if (spots.length && Math.random() < .7) return { kind: 'wreck', cells: rnd(spots) };
    const hor = Math.random() < .5;
    const r = Math.floor(Math.random() * (hor ? BN : BN - 2));
    const c = Math.floor(Math.random() * (hor ? BN - 2 : BN));
    return { kind: 'wreck', cells: [0, 1, 2].map(i => hor ? [r, c + i] : [r + i, c]) };
  }
  const spots = boxSpots(live);                 // 🛢 БОЧКА — 2x2
  if (spots.length && Math.random() < .75) return { kind: 'barrel', cells: rnd(spots) };
  const r = Math.floor(Math.random() * (BN - 1));
  const c = Math.floor(Math.random() * (BN - 1));
  return { kind: 'barrel', cells: [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]] };
}

function resolveAttackCell(S, r, c){
  if (S.shield && S.shield[0] === r && S.shield[1] === c){
    S.shield = null;
    S.fxP.push({ type: 'block', r, c, t0: nowMs(), dur: 700 });
    sayB('🛡 ЩИТ удержал удар Кракена!');
    return;
  }
  const ship = S.pRef[r][c];
  if (ship && !S.pShot[r][c]){
    S.pShot[r][c] = 2;
    ship.dead++;
    S.php--;
    S.fxP.push({ type: 'boom', r, c, t0: nowMs(), dur: 620 });
    S.shakeT0 = nowMs();
    if (ship.dead === ship.cells.length)
      sayB('💀 Ваш ' + SHIP_NAMES[ship.cells.length] + ' потоплен!');
  } else if (!S.pShot[r][c]){
    S.pShot[r][c] = 1;
    S.fxP.push({ type: 'splash', r, c, t0: nowMs(), dur: 620 });
  } else {
    S.fxP.push({ type: 'splash', r, c, t0: nowMs(), dur: 620 });
  }
}

/* ============================================================
   ВЫСТРЕЛЫ ИГРОКА
   ============================================================ */
function bossShot(r, c){
  const S = B;
  if (!S || S.phase !== 'player' || S.shots <= 0) return;
  if (S.kShot[r][c]){ sayB('Здесь уже стреляли — выберите другую клетку.'); return; }
  S.shots--;
  const hit = inZone(r, c);
  S.kShot[r][c] = hit ? 2 : 1;
  S.fxK.push({ type: hit ? 'ink' : 'splash', r, c, t0: nowMs(), dur: hit ? 900 : 620 });
  const k = S.kraken;
  if (hit){
    k.hp--;
    k.flash = 1;
    updateHPUI();
    sayB('💥 РАНА КРАКЕНУ! HP: ' + Math.max(0, k.hp) + '/' + KHP_MAX +
         (S.shots ? ' — остался 1 выстрел' : ''));
  } else {
    sayB('💧 Мимо...' + (S.shots ? ' Остался 1 выстрел.' : ''));
  }
  if (k.hp <= 0){
    k.mode = 'dead'; k.t0 = nowMs();
    sayB('☠️ Кракен повержен — уходит в пучину навсегда!');
    (async () => {
      await sleep(1600);
      if (B === S && S.phase === 'over') return;
      if (B === S) bossOver(true);
    })();
    return;
  }
  if (S.shots <= 0){
    (async () => {
      await sleep(700);
      if (B === S && S.phase === 'player') krakenTurn();
    })();
  }
}

function fireTorpedo(r, c){
  const S = B;
  if (!S || !S.cards.torpedo) return;
  const k = S.kraken;
  const line = [];
  for (let i = 0; i < BN; i++)
    line.push(S.torpDir === 'row' ? [r, i] : [i, c]);
  S.cards.torpedo = 0;
  S.cardMode = null;
  $('torpedo-prompt').classList.add('hidden');
  refreshCards();
  let dmg = 0;
  for (let i = 0; i < line.length; i++){
    const [rr, cc] = line[i];
    if (S.kShot[rr][cc]) continue;
    const inZ = inZone(rr, cc);
    S.kShot[rr][cc] = inZ ? 2 : 1;
    S.fxK.push({ type: inZ ? 'ink' : 'splash', r: rr, c: cc,
                 t0: nowMs() + i * 70, dur: inZ ? 900 : 620 });
    if (inZ) dmg++;
  }
  if (dmg > 0){
    k.hp -= dmg;
    k.flash = 1;
    S.shakeT0 = nowMs();
    updateHPUI();
    sayB('🚀 ТОРПЕДА достала Кракена: ' + dmg +
         (dmg === 1 ? ' повреждение' : ' повреждения') +
         '! HP: ' + Math.max(0, k.hp) + '/' + KHP_MAX);
  } else {
    sayB('🚀 Торпеда прошла мимо зоны Кракена...');
  }
  if (k.hp <= 0){
    k.mode = 'dead'; k.t0 = nowMs();
    sayB('☠️ Кракен повержен!');
    (async () => {
      await sleep(1600);
      if (B === S && S.phase !== 'over') bossOver(true);
    })();
  }
}

function placeShield(r, c){
  const S = B;
  if (!S || !S.cards.shield) return;
  S.shield = [r, c];
  S.cards.shield = 0;
  S.cardMode = null;
  refreshCards();
  sayB('🛡 ЩИТ поднят. Следующий удар Кракена по этой клетке заблокирован!');
}
