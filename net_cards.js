'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — net_cards.js
   БОЙ С ДРУГОМ — КАРТОЧКИ И ТОРПЕДА ДУЭЛИ (зеркало
   game_cards.js): панель карточек, выбор трёх из шести,
   щит/ремонт/дым/радар/залп/торпеда. В сетевом бою карточки
   играют только в свой ход (окна реакции бота нет); дым
   случайным делает следующий выстрел САМОГО стреляющего —
   его обманывает сообщение card{key:'smoke'} от друга.
   Состояние D объявлено в net_duel.js, ходы передаёт
   duelEndTurn, ответы ждут duelWait (DUEL_WAIT).
   ============================================================ */

let duelPanel = null;
let duelTorpP = null;

/* ---------------- панель карточек дуэли ---------------- */
function duelBuildCards(keys){
  if (duelPanel) duelPanel.remove();
  duelPanel = document.createElement('div');
  duelPanel.id = 'cards-panel-d';
  duelPanel.className = 'cards-panel';
  if (!keys){
    /* до боя: выбор трёх разных из шести (боссовских нет) */
    keys = Object.keys(CLASSIC_CARDS).filter(k => k !== 'wrath' && k !== 'tsunami');
    const hint = document.createElement('span');
    hint.className = 'cards-hint';
    hint.id = 'duel-cards-hint';
    duelPanel.appendChild(hint);
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
    b.addEventListener('click', () => duelUseCard(key));
    duelPanel.appendChild(b);
  }
  const host = $('screen-game'), boards = $('boards-classic');
  if (boards && boards.nextSibling) host.insertBefore(duelPanel, boards.nextSibling);
  else if (host) host.appendChild(duelPanel);
  duelUpdateCards();
}

function duelUpdateCards(){
  if (!duelPanel || !D) return;
  const hint = $('duel-cards-hint');
  if (hint)
    hint.textContent = 'Выберите 3 карточки капитана (' +
      Math.min(D.pick.size, 3) + ' из 3)';
  duelPanel.querySelectorAll('.card-btn').forEach(b => {
    const key = b.dataset.card;
    if (D.phase === 'duel-place'){
      b.classList.toggle('sel', D.pick.has(key));
      b.classList.remove('used');
      b.querySelector('.card-state').textContent = D.pick.has(key) ? 'в бою' : 'выбрать';
      return;
    }
    const left = D.cards[key] || 0;
    b.classList.toggle('used', left <= 0);
    b.classList.toggle('sel', D.cardMode === key);
    b.querySelector('.card-state').textContent = left > 0 ? 'готова' : '—';
  });
}

function duelCardsTeardown(){
  if (duelPanel){ duelPanel.remove(); duelPanel = null; }
  if (duelTorpP){ duelTorpP.remove(); duelTorpP = null; }
}

/* ---------------- применение карточки ---------------- */
async function duelUseCard(key){
  if (!D || C !== D) return;
  if (D.phase === 'duel-place'){
    if (D.pick.has(key)) D.pick.delete(key);
    else if (D.pick.size >= 3){
      sayG('Уже выбрано три! Нажмите выбранную ещё раз, чтобы заменить.');
      return;
    } else D.pick.add(key);
    duelUpdateCards();
    duelPlaceCheck();
    return;
  }
  if (!D.cards[key]) return;
  if (D.phase !== 'duel-me'){
    sayG('В сетевом бою карточки играют в ваш ход — ждите своей очереди!');
    return;
  }
  if (D.salvoLeft > 0 && key !== 'salvo'){ sayG('Сначала завершите залп!'); return; }
  if (D.cardMode === 'torpedo' && key !== 'torpedo'){ sayG('Сначала завершите торпеду или отмените её.'); return; }
  if (key === 'shield'){
    D.cards.shield = 0; D.shieldOn = true;
    CPT.net.send('card', { key });
    duelUpdateCards();
    duelEndTurn('Щит поднят над флотом: первый снаряд друга примет на себя он. Ход переходит другу.');
  } else if (key === 'repair'){
    const wounds = [];
    for (let r = 0; r < D.N; r++)
      for (let c = 0; c < D.N; c++)
        if (D.pShot[r][c] === 2 && D.pRefC[r][c] && D.pRefC[r][c].hits < D.pRefC[r][c].len)
          wounds.push([r, c]);
    if (!wounds.length){ sayG('Пробоин нет — ремонт не нужен, карточка остаётся при вас.'); return; }
    D.cards.repair = 0;
    const [r, c] = rnd(wounds);
    D.pShot[r][c] = 0;
    D.pRefC[r][c].hits--;
    fxPushC('P', r, c, 'repair');
    pingC();
    CPT.net.send('card', { key });
    duelUpdateCards();
    duelEndTurn('Пробоина заделана! Ход переходит другу.');
  } else if (key === 'smoke'){
    D.cards.smoke = 0;
    CPT.net.send('card', { key });
    duelUpdateCards();
    duelEndTurn('Дымовая завеса: следующий выстрел друга — наугад. Ход переходит ему.');
  } else if (key === 'radar'){
    D.cards.radar = 0;
    duelUpdateCards();
    sayG('Пинг! Ищем корабль друга...');
    D.phase = 'duel-fire';           /* замок: пока пинг летит, кликов нет */
    CPT.net.send('radar', {});
    const res = await duelWait('radarRes');
    if (!D || C !== D) return;
    if (res && res.r != null){
      D.radarMarks.add(res.r + ',' + res.c);
      fxPushC('E', res.r, res.c, 'ping');
      pingC();
    }
    duelEndTurn(res && res.r != null
      ? 'Пинг! Клетка корабля друга отмечена золотым глазом. Ход переходит ему.'
      : 'Пинг ушёл впустую. Ход переходит другу.');
  } else if (key === 'salvo'){
    D.cards.salvo = 0; D.salvoLeft = 3;
    CPT.net.send('card', { key });
    duelUpdateCards();
    sayG('ЗАЛП! Три выстрела за один ход — стреляйте!');
  } else if (key === 'torpedo'){
    if (D.cardMode === 'torpedo'){
      D.cardMode = null; D.torp = null;
      duelHideTorp(); duelUpdateCards();
      sayG('Торпеда отложена. Ваш ход.');
    } else {
      D.cardMode = 'torpedo'; D.torp = null;
      CPT.net.send('card', { key });
      duelUpdateCards();
      sayG('Ру-у-упор! Выберите воду у ЛЮБОГО края моря противника — торпеда всплывёт там.');
    }
  }
}

/* ---------------- торпеда: всплытие и стрелки ---------------- */
function duelTorpPlace(r, c){
  if (D.isleSet.has(r + ',' + c)){
    sayG('Это остров! Торпеда всплывает только в воде — выберите клетку моря.');
    splashC();
    return;
  }
  if (r !== 0 && r !== D.N - 1 && c !== 0 && c !== D.N - 1){
    sayG('Торпеда всплывает у берега — выберите воду у края моря противника.');
    return;
  }
  D.torp = [r, c];
  D.torpSurf = performance.now();
  hornC();
  fxPushC('E', r, c, 'ring');
  sayG('Ру-у-упор! Торпеда всплыла...');
  setTimeout(() => {
    if (D && C === D && D.cardMode === 'torpedo' && D.torp){
      duelShowTorp();
      sayG('Торпеда всплыла! Выберите направление — стрелки под доской.');
    }
  }, 1000);
}

function duelShowTorp(){
  if (!duelTorpP) return;
  duelTorpP.querySelectorAll('[data-dir]').forEach(b => b.remove());
  const cancel = duelTorpP.querySelector('.btn-small');
  for (const [dr, dc, lab] of torpArrowsC()){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-small gold';
    b.textContent = lab;
    b.dataset.dir = dc + ',' + dr;
    b.addEventListener('click', () => duelFireTorp(D.torp[0], D.torp[1], dr, dc));
    if (cancel) duelTorpP.insertBefore(b, cancel);
    else duelTorpP.appendChild(b);
  }
  duelTorpP.classList.remove('hidden');
}

function duelHideTorp(){ if (duelTorpP) duelTorpP.classList.add('hidden'); }

function duelBuildTorp(){
  if (duelTorpP){ duelTorpP.remove(); duelTorpP = null; }
  duelTorpP = document.createElement('div');
  duelTorpP.id = 'torp-prompt-d';
  duelTorpP.className = 'torpedo-prompt hidden';
  const lab = document.createElement('span');
  lab.textContent = 'Торпеда всплыла! Куда пойдёт?';
  duelTorpP.appendChild(lab);
  const cx = document.createElement('button');
  cx.type = 'button';
  cx.className = 'btn-small';
  cx.textContent = 'отмена';
  cx.addEventListener('click', () => {
    if (!D) return;
    D.torp = null; D.cardMode = null;
    duelHideTorp(); duelUpdateCards();
    sayG('Торпеда отложена — карточка не потрачена. Ваш ход.');
  });
  duelTorpP.appendChild(cx);
  $('screen-game').appendChild(duelTorpP);
}

/* ---------------- мой пуск торпеды ---------------- */
async function duelFireTorp(r0, c0, dr, dc){
  if (!D || C !== D || D.phase !== 'duel-me' || !D.torp) return;
  D.cards.torpedo = 0;
  D.salvoLeft = 0;
  D.cardMode = null; D.torp = null;
  duelHideTorp(); duelUpdateCards();
  D.phase = 'duel-torp';
  hornC();
  CPT.net.send('torp', { r0, c0, dr, dc });
  const res = await duelWait('torpRes');
  if (!D || C !== D || D.phase !== 'duel-torp') return;
  if (!res){ duelOver(null); return; }
  D.torpAnim = { r: r0, c: c0, dr, dc };
  await sleep(560);
  if (!D || C !== D) return;
  let last = [r0, c0];
  for (const cell of res.cells){
    D.torpAnim = { r: cell.r, c: cell.c, dr, dc };
    last = [cell.r, cell.c];
    if (cell.isle){
      fxPushC('E', cell.r, cell.c, 'boom');
      thumpC();
      await sleep(430);
      break;
    }
    if (cell.shot) D.eShot[cell.r][cell.c] = 2;
    if (cell.hit){ fxPushC('E', cell.r, cell.c, 'boom'); toneC(140, .2, 'square', .06); }
    else fxPushC('E', cell.r, cell.c, 'splash');
    await sleep(175);
    if (!D || C !== D || D.phase !== 'duel-torp') return;
  }
  D.torpAnim = null;
  if (res.sunkWrecks)
    for (const w of res.sunkWrecks)
      D.eShips.push({ cells: w.cells, hits: w.cells.length, len: w.cells.length });
  if (!res.died) fxPushC('E', last[0] - dr, last[1] - dc, 'splash');
  await sleep(620);
  if (!D || C !== D || D.phase !== 'duel-torp') return;
  if (res.lost){ duelOver(true); return; }
  duelEndTurn(res.died
    ? 'Торпеда разбилась об остров! Ход переходит другу.'
    : 'Торпеда прошла по всей линии! Ход переходит другу.');
}

/* ---------------- торпеда друга (разрешает наша доска) ---------------- */
async function duelIncomingTorp(d){
  if (!D || C !== D || D.phase !== 'duel-them') return;
  D.phase = 'duel-fire';
  hornC();
  const cells = [];
  const wrecks = [];
  let r = d.r0, c = d.c0, died = false;
  for (;;){
    r += d.dr; c += d.dc;
    if (!inB(r, D.N) || !inB(c, D.N)) break;
    if (D.isleSet.has(r + ',' + c)){
      cells.push({ r, c, hit: false, isle: true });
      fxPushC('P', r, c, 'boom');
      thumpC();
      died = true;
      await sleep(430);
      break;
    }
    const ship = D.pRefC[r][c];
    if (ship){
      let shot = false;
      if (D.pShot[r][c] !== 2){ D.pShot[r][c] = 2; ship.hits++; shot = true; }
      cells.push({ r, c, hit: true, shot });
      fxPushC('P', r, c, 'boom');
      toneC(140, .2, 'square', .06);
      if (ship.hits >= ship.len && !wrecks.some(w => w.cells[0][0] === ship.cells[0][0]))
        wrecks.push({ cells: ship.cells.map(p => p.slice()) });
    } else {
      cells.push({ r, c, hit: false });
      fxPushC('P', r, c, 'splash');
    }
    await sleep(175);
    if (!D || C !== D || D.phase !== 'duel-fire') return;
  }
  const res = { cells, died, lost: allSunk(D.pShips), sunkWrecks: wrecks };
  CPT.net.send('torpRes', res);
  if (res.lost){ duelOver(false); return; }
  D.phase = 'duel-me';
  setTurnC('me');
  sayG(died
    ? 'Торпеда друга разбилась об остров! Ваш ход.'
    : 'Торпеда друга прошла по линии! Ваш ход.');
}
