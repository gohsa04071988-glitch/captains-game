'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_cards.js
   КАРТЫ КАПИТАНА классического боя: выбор трёх из шести до боя,
   панель карточек, щит/радар/ремонт/дым/залп и ТОРПЕДА:
   капитан сам выбирает воду у любого края моря противника —
   торпеда всплывает там, рупор с гудком, стрелки подстраиваются
   под выбранный край. Отрезано от game_core.js (v2.4, R10).
   Состояние C, утилиты и звук объявлены в game_core.js (R5, R7).
   ============================================================ */

/* ============================================================
   КАРТЫ КАПИТАНА — до боя капитан выбирает ТРИ разные из шести,
   в бою лежат только они, каждая срабатывает один раз.
   Сыграть карточкой = потратить ход (залп сам состоит из трёх
   выстрелов). Пока бот целится — успевают «Ремонт» и «Щит».
   Торпеда: нажал карточку — она сама всплывает у берега с
   гудком рупора, потом появляются стрелки направления — и она
   идёт по всей линии до края: все корабли на пути получают
   пробоины, об остров — гаснет. Панель строится скриптом рядом
   с досками, index.html не трогаем; кнопки используют те же
   стили, что и карточки босса.
   ============================================================ */
function svgCardIcon(d){
  return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" ' +
         'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}
const CARD_ICONS = {
  shield:  svgCardIcon('<path d="M24 6 L38 11 V23 C38 32 32 38.5 24 42 C16 38.5 10 32 10 23 V11 Z"/><path d="M17 24 L22 29 L31.5 18.5"/>'),
  torpedo: svgCardIcon('<path d="M7 24 C7 20.5 10 18.5 14 18.5 H32 C37.5 18.5 41.5 20.8 41.5 24 C41.5 27.2 37.5 29.5 32 29.5 H14 C10 29.5 7 27.5 7 24 Z"/><path d="M7 24 L2.5 19.5 M7 24 L2.5 28.5"/><circle cx="35" cy="21.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="38" cy="26" r="1.1" fill="currentColor" stroke="none"/>'),
  radar:   svgCardIcon('<circle cx="24" cy="27" r="4.5"/><path d="M24 27 L34 17"/><path d="M31 10 A17 17 0 0 1 41 20"/><path d="M27 4.5 A22 22 0 0 1 43.5 21"/><path d="M24 40 v3 M14 38 l-2.5 2.5 M34 38 l2.5 2.5" opacity=".55"/>'),
  repair:  svgCardIcon('<path d="M13 8 H29 V16 H13 Z"/><path d="M21 16 V38"/><path d="M15.5 41.5 C18 39 24 39 26.5 41.5"/><circle cx="21" cy="30" r="1.4" fill="currentColor" stroke="none"/>'),
  smoke:   svgCardIcon('<path d="M11 33 a6.5 6.5 0 0 1 2-12.7 A8.5 8.5 0 0 1 29.5 18 a7 7 0 0 1 8.5 9 A5.6 5.6 0 0 1 36.5 33 Z"/><path d="M16 39 h1 M25 41.5 h1 M33 39 h1" opacity=".6"/>'),
  salvo:   svgCardIcon('<circle cx="13" cy="13.5" r="4.2"/><circle cx="34.5" cy="11.5" r="3.4"/><circle cx="24" cy="32" r="5.2"/><path d="M24 23.5 v-4.5 M33.5 36 l3.5 3 M14 36.5 l-3.5 3 M32.5 28.5 l4.5 1.5 M15.5 28.5 l-4.5 1.5" opacity=".7"/>'),
  wrath:   svgCardIcon('<path d="M12 6 c4 6 -1 9 3 14 c3 4 9 2 11 8"/><path d="M24 4 c1 7 -4 10 0 16"/><path d="M36 8 c-4 6 1 9 -3 14"/><circle cx="20" cy="36" r="1.6" fill="currentColor" stroke="none"/><circle cx="28" cy="37" r="1.6" fill="currentColor" stroke="none"/><circle cx="24" cy="31" r="1.6" fill="currentColor" stroke="none"/>'),
  tsunami: svgCardIcon('<path d="M4 30 q6 -10 12 0 q6 -10 12 0 q6 -10 12 0"/><path d="M8 38 q5 -7 10 0 q5 -7 10 0 q5 -7 10 0" opacity=".65"/><path d="M30 8 c-4 6 0 9 0 13"/><path d="M22 12 c-2 4 0 6 0 9" opacity=".7"/>')
};
const CLASSIC_CARDS = {
  shield:  { name: 'Щит',     desc: 'Примет один выстрел на себя', tip: 'Щит висит над флотом; первый снаряд противника он примет на себя — и исчезнет навсегда.' },
  torpedo: { name: 'Торпеда', desc: 'Бьёт всю линию до края',      tip: 'Нажмите карточку и выберите воду у любого края моря противника — торпеда всплывёт там, появится рупор. Выберите направление — она пройдёт всю линию, круша корабли, а об остров гаснет.' },
  radar:   { name: 'Радар',   desc: 'Покажет клетку корабля',      tip: 'Пинг укажет одну клетку уцелевшего корабля противника — золотой глаз останется на карте.' },
  repair:  { name: 'Ремонт',  desc: 'Залечит одну пробоину',       tip: 'Мастера заделают одну пробоину на вашем корабле.' },
  smoke:   { name: 'Дым',     desc: 'Выстрел противника вслепую',  tip: 'Дымовая завеса: следующий выстрел противника — случайный, без добивания раненых.' },
  salvo:   { name: 'Залп',    desc: 'Три выстрела за один ход',    tip: 'Залп из трёх выстрелов подряд за один ход.' },
  wrath:   { name: 'Гнев Кракена', desc: 'Щупальца бьют трижды',    tip: 'Часть силы поверженного Кракена: щупальца сами хлещут три случайные клетки моря противника. Одноразовая.' },
  tsunami: { name: 'Цунами', desc: 'Волна бьёт четыре клетки',       tip: 'Часть силы поверженного Левиафана: волна накрывает четыре клетки одного ряда моря противника. Одноразовая.' }
};

let panelC = null;
let pickHintC = null;
function buildCardsPanelC(keys){
  if (panelC) panelC.remove();
  panelC = document.createElement('div');
  panelC.id = 'cards-panel-c';
  panelC.className = 'cards-panel hidden';
  if (keys){                       /* в бою: только выбранные карточки */
    pickHintC = null;
  } else {                         /* до боя: выбор трёх из шести */
    keys = Object.keys(CLASSIC_CARDS).filter(k => k !== 'wrath' && k !== 'tsunami');   /* карточки боссов не выбирают — они приходят из трюма за победы */
    pickHintC = document.createElement('span');
    pickHintC.className = 'cards-hint';
    panelC.appendChild(pickHintC);
    if (CPT.hint) CPT.hint('b-cards',
      'Карточки — секретное оружие: выбери ТРИ из шести. Щит и ремонт можно сыграть, даже когда бот целится в тебя!');
  }
  for (const key of keys){
    const d = CLASSIC_CARDS[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card-btn';
    b.dataset.card = key;
    b.title = d.tip;
    b.innerHTML =
      '<span class="card-icon">' + CARD_ICONS[key] + '</span>' +
      '<span class="card-name">' + d.name + '</span>' +
      '<span class="card-desc">' + d.desc + '</span>' +
      '<span class="card-state">готова</span>';
    b.addEventListener('click', () => useCardC(key));
    panelC.appendChild(b);
  }
  const host = $('screen-game'), boards = $('boards-classic');
  if (boards && boards.nextSibling) host.insertBefore(panelC, boards.nextSibling);
  else if (host) host.appendChild(panelC);
}

function updateCardsC(){
  if (!panelC) return;
  const picking = !!C && C.phase === 'place';
  if (pickHintC)
    pickHintC.textContent = 'Выберите 3 карточки капитана (' +
      (C ? Math.min(C.pick.size, 3) : 0) + ' из 3)';
  panelC.querySelectorAll('.card-btn').forEach(b => {
    const key = b.dataset.card;
    if (picking){
      const on = C.pick.has(key);
      b.classList.toggle('sel', on);
      b.classList.remove('used');
      b.querySelector('.card-state').textContent = on ? 'в бою' : 'выбрать';
      return;
    }
    const left = C ? C.cards[key] : 0;
    b.classList.toggle('used', left <= 0);
    b.classList.toggle('sel', !!C && C.cardMode === key);
    b.querySelector('.card-state').textContent = left > 0 ? 'готова' : '—';
  });
}

/* подсказка направления торпеды */
let torpPromptC = null;
function buildTorpPromptC(){
  if (torpPromptC || !$('screen-game')) return;
  torpPromptC = document.createElement('div');
  torpPromptC.id = 'torp-prompt-c';
  torpPromptC.className = 'torpedo-prompt hidden';
  const lab = document.createElement('span');
  lab.textContent = 'Торпеда всплыла! Куда пойдёт?';
  torpPromptC.appendChild(lab);
  const cx = document.createElement('button');
  cx.type = 'button';
  cx.className = 'btn-small';
  cx.textContent = 'отмена';
  cx.addEventListener('click', () => {
    if (!C) return;
    C.torp = null; C.cardMode = null;
    hideTorpPromptC(); updateCardsC();
    sayG('Торпеда отложена — карточка не потрачена. Ваш ход.');
  });
  torpPromptC.appendChild(cx);
  $('screen-game').appendChild(torpPromptC);
}
/* стрелки подстраиваются под выбранный край: показываем те,
   что ведут ВНУТРЬ поля (у угла — две) */
function showTorpPromptC(){
  if (!torpPromptC) return;
  torpPromptC.querySelectorAll('[data-dir]').forEach(b => b.remove());
  const cancel = torpPromptC.querySelector('.btn-small:not(.gold)');
  for (const [dr, dc, lab] of torpArrowsC()){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-small gold';
    b.textContent = lab;
    b.dataset.dir = dc + ',' + dr;
    b.addEventListener('click', () => {
      if (C && C.torp) fireTorpedoC(C.torp[0], C.torp[1], dr, dc);
    });
    if (cancel) torpPromptC.insertBefore(b, cancel);
    else torpPromptC.appendChild(b);
  }
  torpPromptC.classList.remove('hidden');
}
function hideTorpPromptC(){ if (torpPromptC) torpPromptC.classList.add('hidden'); }

/* возможные направления из клетки, где всплыла торпеда */
function torpArrowsC(){
  const S = C;
  if (!S || !S.torp) return [];
  return [[0, -1, '←'], [-1, 0, '↑'], [0, 1, '→'], [1, 0, '↓']]
    .filter(([dr, dc]) => inB(S.torp[0] + dr, S.N) && inB(S.torp[1] + dc, S.N));
}

/* ---------------- применение карточки ----------------
   place — собираем колоду: три разные из шести;
   bot   — окно реакции: пока бот целится, успевают
           «Ремонт» и «Щит»;
   player — обычный ход. */
function togglePickC(key){
  const S = C;
  if (!S || S.phase !== 'place') return;
  if (S.pick.has(key)) S.pick.delete(key);
  else if (S.pick.size >= 3){
    sayG('Уже выбрано три! Нажмите выбранную карточку ещё раз, чтобы заменить.');
    return;
  } else S.pick.add(key);
  updateCardsC();
  maybeBeginBattleC();
}

/* щит: общий код своего хода и окна прицеливания бота */
function doShieldC(S, reactive){
  S.cards.shield = 0; S.shieldOn = true;
  updateCardsC();
  if (reactive) sayG('Щит поднят! Первый снаряд противника примет на себя он.');
  else handOverToFoeC('Щит поднят над флотом: первый снаряд противника примет на себя он. Ход переходит противнику.');
}

function doRepairC(S, reactive){
  const wounds = [];
  for (let r = 0; r < S.N; r++)
    for (let c = 0; c < S.N; c++)
      if (S.pShot[r][c] === 2 && S.pRefC[r][c] && S.pRefC[r][c].hits < S.pRefC[r][c].len)
        wounds.push([r, c]);
  if (!wounds.length){ sayG('Пробоин нет — ремонт не нужен, карточка остаётся при вас.'); return; }
  S.cards.repair = 0;
  const [r, c] = rnd(wounds);
  S.pShot[r][c] = 0;
  S.pRefC[r][c].hits--;
  S.wounded = S.wounded.filter(([wr, wc]) => wr !== r || wc !== c);
  fxPushC('P', r, c, 'repair');
  pingC();
  updateCardsC();
  if (reactive) sayG('Пробоина заделана — и как раз вовремя!');
  else handOverToFoeC('Пробоина заделана! Ход переходит противнику.');
}

function useCardC(key){
  const S = C;
  if (!S) return;
  if (S.phase === 'place'){ togglePickC(key); return; }
  if (!S.cards[key]) return;
  if (S.phase === 'bot'){
    /* окно реакции: пока противник целится */
    if (key === 'repair'){ doRepairC(S, true); return; }
    if (key === 'shield'){ doShieldC(S, true); return; }
    sayG('Противник целится! Сейчас успевают только «Ремонт» и «Щит».');
    return;
  }
  if (S.phase !== 'player') return;
  if (S.salvoLeft > 0 && key !== 'salvo'){ sayG('Сначала завершите залп!'); return; }
  if (S.cardMode === 'torpedo' && key !== 'torpedo'){ sayG('Сначала завершите торпеду или отмените её.'); return; }
  if (key === 'shield'){
    doShieldC(S, false);
  } else if (key === 'radar'){
    S.cards.radar = 0;
    const alive = S.eShips.filter(s => s.hits < s.len);
    if (alive.length){
      const ship = rnd(alive);
      const free = ship.cells.filter(([r, c]) => !S.eShot[r][c]);
      const cell = free.length ? rnd(free) : rnd(ship.cells);
      S.radarMarks.add(cell[0] + ',' + cell[1]);
      fxPushC('E', cell[0], cell[1], 'ping');
      pingC();
    }
    updateCardsC();
    handOverToFoeC('Пинг! Клетка корабля отмечена золотым глазом. Ход переходит противнику.');
  } else if (key === 'repair'){
    doRepairC(S, false);
  } else if (key === 'smoke'){
    S.cards.smoke = 0; S.smokeNext = true;
    updateCardsC();
    handOverToFoeC('Дымовая завеса поставлена: противник выстрелит наугад. Ход переходит ему.');
  } else if (key === 'salvo'){
    S.cards.salvo = 0; S.salvoLeft = 3;
    updateCardsC();
    sayG('ЗАЛП! Три выстрела за один ход — стреляйте!');
  } else if (key === 'wrath'){
    S.cards.wrath = 0;             /* одноразовая, ход не переходит — бьют щупальца */
    updateCardsC();
    krakenWrathC(S);
  } else if (key === 'tsunami'){
    S.cards.tsunami = 0;           /* одноразовая, ход не переходит — бьёт волна */
    updateCardsC();
    leviTsunamiC(S);
  } else if (key === 'torpedo'){
    if (S.cardMode === 'torpedo'){
      S.cardMode = null; S.torp = null;
      hideTorpPromptC(); updateCardsC();
      sayG('Торпеда отложена. Ваш ход.');
    } else {
      /* порядок: карта → капитан выбирает воду у любого края →
         торпеда всплывает → рупор над водой → стрелки направления */
      S.cardMode = 'torpedo';
      S.torp = null;
      updateCardsC();
      sayG('Ру-у-упор! Выберите воду у ЛЮБОГО края моря противника — торпеда всплывёт там.');
    }
  }
}

/* ---------------- «ГНЕВ КРАКЕНА» — часть силы босса ----------------
   Три щупальца сами хлещут по трём случайным клеткам моря
   противника. Ход не переходит между ударами; после третьего —
   обычная передача хода. Если флот выбит — победа. */
async function krakenWrathC(S){
  S.phase = 'fire';
  sayG('ГНЕВ КРАКЕНА! Щупальца хлещут по морю противника!');
  let hits = 0;
  for (let i = 0; i < 3; i++){
    const cands = [];
    for (let r = 0; r < S.N; r++)
      for (let c = 0; c < S.N; c++)
        if (!S.eShot[r][c] && !S.isleSet.has(r + ',' + c)) cands.push([r, c]);
    if (!cands.length) break;
    const [r, c] = rnd(cands);
    const ship = S.eRefC[r][c];
    const flight = shellPushC('E', r, c, 'me');
    boomShotC();
    await sleep(flight);
    if (!S || S !== C || S.phase !== 'fire') return;
    S.eShot[r][c] = ship ? 2 : 1;
    if (ship){
      ship.hits++; hits++;
      fxPushC('E', r, c, 'boom');
      toneC(140, .2, 'square', .06);
    } else {
      fxPushC('E', r, c, 'splash');
      splashC();
    }
    await sleep(340);
    if (!S || S !== C || S.phase !== 'fire') return;
    if (allSunk(S.eShips)){
      S.phase = 'over';
      setTimeout(() => { if (S === C) gameOverC(true); }, 900);
      return;
    }
  }
  handOverToFoeC(hits
    ? 'Щупальца пробили ' + (hits === 1 ? 'одну клетку' : hits + ' клетки') + '! Ход переходит противнику.'
    : 'Щупальца били впустую! Ход переходит противнику.');
}

/* ---------------- «ЦУНАМИ» — часть силы Левиафана ----------------
   Волна накрывает один ряд моря противника: четыре клетки
   этого ряда. Ход не переходит между ударами; после волны —
   обычная передача хода. Если флот выбит — победа. */
async function leviTsunamiC(S){
  S.phase = 'fire';
  sayG('ЦУНАМИ! Волна Левиафана накрывает ряд противника!');
  let hits = 0;
  const rows = [];
  for (let r = 0; r < S.N; r++){
    const free = [];
    for (let c = 0; c < S.N; c++)
      if (!S.eShot[r][c] && !S.isleSet.has(r + ',' + c)) free.push(c);
    if (free.length) rows.push({ r, free });
  }
  if (!rows.length) return;
  rows.sort((a, b) => b.free.length - a.free.length);
  const row = rows[0].free.length >= 4
    ? rows.find(x => x.free.length >= 4) || rows[0]
    : rows[0];
  const pool = row.free.slice();
  const cells = [];
  for (let k = 0; k < 4 && pool.length; k++)
    cells.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  for (const c of cells){
    const ship = S.eRefC[row.r][c];
    const flight = shellPushC('E', row.r, c, 'me');
    boomShotC();
    await sleep(flight);
    if (!S || S !== C || S.phase !== 'fire') return;
    S.eShot[row.r][c] = ship ? 2 : 1;
    if (ship){
      ship.hits++; hits++;
      fxPushC('E', row.r, c, 'boom');
      toneC(140, .2, 'square', .06);
    } else {
      fxPushC('E', row.r, c, 'splash');
      splashC();
    }
    await sleep(340);
    if (!S || S !== C || S.phase !== 'fire') return;
    if (allSunk(S.eShips)){
      S.phase = 'over';
      setTimeout(() => { if (S === C) gameOverC(true); }, 900);
      return;
    }
  }
  handOverToFoeC(hits
    ? 'Волна пробила ' + (hits === 1 ? 'одну клетку' : hits + ' клетки') + ' в ряду ' + (row.r + 1) + '! Ход переходит противнику.'
    : 'Волна прокатилась впустую! Ход переходит противнику.');
}

/* торпеда всплывает там, где капитан ткнул: вода у ЛЮБОГО края
   моря противника; в остров нельзя — вода только у берега */
function torpPlaceC(S, r, c){
  if (S.isleSet.has(r + ',' + c)){
    sayG('Это остров! Торпеда всплывает только в воде — выберите клетку моря.');
    splashC();
    return;
  }
  if (r !== 0 && r !== S.N - 1 && c !== 0 && c !== S.N - 1){
    sayG('Торпеда всплывает у берега — выберите воду у края моря противника.');
    return;
  }
  S.torp = [r, c];
  S.torpSurf = performance.now();
  hornC();
  fxPushC('E', r, c, 'ring');
  sayG('Ру-у-упор! Торпеда всплыла...');
  setTimeout(() => {
    if (!C || C !== S || S.cardMode !== 'torpedo' || !S.torp) return;
    showTorpPromptC();
    sayG('Торпеда всплыла! Выберите направление — стрелки под доской.');
  }, 1000);
}

/* торпеда: всплытие → ход по линии → край или остров */
async function fireTorpedoC(r0, c0, dr, dc){
  const S = C;
  if (!S || S.phase !== 'player' || !S.torp) return;
  S.cards.torpedo = 0;
  S.salvoLeft = 0;
  S.cardMode = null; S.torp = null;
  hideTorpPromptC(); updateCardsC();
  S.phase = 'torpedo';
  hornC();
  S.torpAnim = { r: r0, c: c0, dr, dc };
  await sleep(560);                        /* всплыла, навелась */
  if (!S || S !== C || S.phase !== 'torpedo') return;
  let r = r0, c = c0, died = false;
  for (;;){
    r += dr; c += dc;
    if (!inB(r, S.N) || !inB(c, S.N)) break;
    S.torpAnim = { r, c, dr, dc };
    if (S.isleSet.has(r + ',' + c)){       /* гаснет об остров */
      fxPushC('E', r, c, 'boom');
      thumpC();
      died = true;
      await sleep(430);
      break;
    }
    const ship = S.eRefC[r][c];
    if (ship){
      if (S.eShot[r][c] !== 2){ S.eShot[r][c] = 2; ship.hits++; }
      fxPushC('E', r, c, 'boom');
      toneC(140, .2, 'square', .06);
    } else {
      fxPushC('E', r, c, 'splash');
    }
    await sleep(175);
    if (!S || S !== C || S.phase !== 'torpedo') return;
  }
  S.torpAnim = null;
  if (!died) fxPushC('E', r - dr, c - dc, 'splash');
  await sleep(620);
  if (!S || S !== C || S.phase !== 'torpedo') return;
  if (allSunk(S.eShips)){
    S.phase = 'over';
    setTimeout(() => { if (S === C) gameOverC(true); }, 900);
    return;
  }
  handOverToFoeC(died
    ? 'Торпеда разбилась об остров! Ход переходит противнику.'
    : 'Торпеда прошла по всей линии! Ход переходит противнику.');
}
