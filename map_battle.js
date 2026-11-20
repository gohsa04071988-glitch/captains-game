'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_battle.js
   ЭТАП 2: БОИ НА ОСТРОВАХ ПОХОДА (мост карта ↔ классический бой).
   Плывёшь на остров — остров даёт бой: близкие 8×8, дальние
   10×10 (поля field из map_gen.js). Бот умнее на дальних
   островах: уровень = 1 + удалённость/3 (botMove его читает).
   Карточки из трюма корабля входят в бой уже выбранными и
   тратятся в момент, когда бой начался.
   Победа — трофей в казну и галочка «✓» на острове (навсегда).
   Поражение — отступаем: остров всё ещё сопротивляется.
   Поход сохраняется ПЕРЕД боем — закрыл игру, продолжил с того
   же места. Реестр: CPT.mapBattle = { start, consume, back }.
   ============================================================ */

let MB = null;   /* остров, на котором идёт/шёл бой */

/* имя карточки в трюме → ключ карточки классического боя */
const MAP_CARD_KEYS = {
  'Радар': 'radar', 'Щит': 'shield', 'Торпеда': 'torpedo',
  'Дым': 'smoke', 'Залп': 'salvo', 'Ремонт': 'repair',
  'Гнев Кракена': 'wrath',          /* этап 3: часть силы босса */
  'Цунами': 'tsunami'               /* этап 3 блок 1b: волна Левиафана */
};

/* ---------------- прибытие на остров → бой ---------------- */
function mapBattleStart(n){
  if (typeof startClassic !== 'function'){
    mapToast('Бой недоступен: при сборке потерялся game_battle.js.');
    return;
  }
  const hold = (M && M.inv && M.inv.cards)
    ? M.inv.cards.map(nm => MAP_CARD_KEYS[nm]).filter(Boolean)
    : [];
  MB = { node: n };
  if (CPT.mapDice) CPT.mapDice.reset();   /* кости не летят сквозь бой */
  if (M){ M.ship.goal = null; mapSave(M); }   /* место боя сохранено */
  startClassic(n.field === 'easy' ? 'easy' : 'hard', {
    fromMap: true,
    lvl: n.lvl || 1,
    mapName: n.name,
    hold: hold
  });
}

/* ---------------- бой начался: трюмные карточки тратятся ----------------
   Список picked — что капитан реально взял в бой. Тратим только
   те, что есть в трюме; остальные он взял из общей колоды. */
function mapBattleConsume(picked){
  if (!M || !M.inv || !picked || !picked.length) return;
  let spent = false;
  for (const key of picked){
    for (const nm in MAP_CARD_KEYS){
      if (MAP_CARD_KEYS[nm] !== key) continue;
      const i = M.inv.cards.indexOf(nm);
      if (i >= 0){ M.inv.cards.splice(i, 1); spent = true; }
    }
  }
  if (spent){ mapUpdateCargo(); mapSave(M); }
}

/* ---------------- оверлей боя → назад в поход ----------------
   Лагуна (ключ 3/3): +200 монет и две карточки. Обычный остров:
   трофей 25–50 монет и случайная часть — КЛЮЧ или ОБРЫВОК КАРТЫ
   (выдача в map_boss.js, этап 3). */
function mapBattleBack(win){
  const n = MB ? MB.node : null;
  MB = null;
  if (win && n && M && !n.done){
    n.done = true;
    let msg = '«' + n.name + '» зачищен!';
    if (n.vault){
      M.inv.gold += 200;
      const c1 = rnd(CARD_NAMES_MAP), c2 = rnd(CARD_NAMES_MAP);
      M.inv.cards.push(c1, c2);
      msg += ' Тайник вскрыт: +200 монет, карточки «' + c1 + '» и «' + c2 + '» — в трюм!';
    } else {
      const loot = 25 + Math.floor(Math.random() * 26);   /* трофей 25–50 монет */
      M.inv.gold += loot;
      msg += ' Трофей: +' + loot + ' монет.';
      if (typeof mapPartDrop === 'function') msg += mapPartDrop();
      else msg += ' При сборке потерялся map_boss.js — части не выпадают.';
    }
    mapUpdateCargo();
    mapSave(M);
    startMapMode();
    mapToast(msg);
    sayMap(msg);                    /* трофей остаётся в статусе и не гаснет */
    if (window.mapHall) mapHall(msg, 'win');   /* этап 4: запись в журнал побед */
  } else {
    startMapMode();
    if (n && !win){
      mapToast('«' + n.name + '»: отступили с потерями. Остров всё ещё сопротивляется.');
      sayMap('«' + n.name + '»: отступили. Остров всё ещё сопротивляется.');
      if (window.mapHall) mapHall('Штурм «' + n.name + '» отбит. Отступили с потерями.', 'loss');
    }
  }
}

CPT.mapBattle = { start: mapBattleStart, consume: mapBattleConsume, back: mapBattleBack };
