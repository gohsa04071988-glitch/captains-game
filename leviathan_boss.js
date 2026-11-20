'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — leviathan_boss.js
   ЭТАП 3 (блок 1b): ЛЕВИАФАН — второй босс похода.
   Падь Левиафана пускает после 5 зачищенных островов И победы
   над Кракеном (гейт в map_boss.js). Бой строится на движке
   классического боя (R11: своего экрана нет — startClassic):
   поле 10×10, эскадра Левиафана 5-4-3-3-2 (флагман — новая
   палуба), флот игрока обычный 4-3-2-2, бот 3-го уровня и
   КАЖДЫЙ ТРЕТИЙ ХОД — НАКАТ ВОЛНЫ: два снаряда в один ряд
   (game_bot.js, leviWaveC). Итог боя уходит сюда через
   opts.over (крючок C.overFn в game_battle.js).
   Победа — трофей 200–260 монет и одноразовая карточка
   «Цунами» в трюм (волна бьёт 4 клетки одного ряда).
   Имя пятой палубы сидит здесь: game_core.js стоит на лимите
   450 строк. Реестр: CPT.leviBoss = { start }.
   Порядок подключения: после map_boss.js (сцена сюжета и журнал
   из этапа 4 подключаются ещё позже — map_story.js/map_hall.js).
   ============================================================ */

SHIP_NAMES[5] = 'Флагман';   /* палуба эскадры Левиафана */

const LEVI_LOOT_MIN = 200, LEVI_LOOT_SPREAD = 61;   /* 200–260 монет */

const LV = { on: false, node: null, claimMsg: null };

/* ---------------- вход в Падь: бой на движке классики ---------------- */
function startLeviathanBoss(n){
  if (!M || !n || n.done) return;
  if (typeof startClassic !== 'function'){
    mapToast('Падь молчит: при сборке потерялся game_battle.js.');
    return;
  }
  const hold = (M.inv && M.inv.cards)
    ? M.inv.cards.map(nm => MAP_CARD_KEYS[nm]).filter(Boolean)
    : [];
  LV.on = true; LV.node = n; LV.claimMsg = null;
  if (CPT.mapDice) CPT.mapDice.reset();       /* кости не летят сквозь бой */
  M.ship.goal = null; mapSave(M);             /* педь сохранена перед боем */
  startClassic('leviathan', {
    over: leviOver,                 /* итог боя уходит в поход отсюда */
    levi: true,                     /* накат волны: game_bot.js */
    lvl: 3,                         /* бот бьёт как на самом дальнем острове */
    playerFleet: [4, 3, 2, 2],      /* флот капитана обычный — растёт только эскадра Левиафана */
    mapName: n.name,
    intro: 'Падь Левиафана. Эскадра 5-4-3-3-2 против твоего флота; каждую третью атаку — НАКАТ ВОЛНЫ! Расставьте флот и выберите 3 карточки капитана.',
    hold: hold                      /* карточки трюма уже в колоде */
  });
}

/* ---------------- итог боя: трофей и возврат в поход ----------------
   Вызывается из game_battle.js по кнопке «Заново/В поход» через
   C.overFn. Трюмные карточки списываются по итогам (они были в
   колоде всей этой партии). Поражение — педь всё ещё ждёт. */
function leviOver(win){
  const n = LV.node;
  LV.on = false; LV.node = null;
  if (C && C.pick && CPT.mapBattle) CPT.mapBattle.consume([...C.pick]);
  if (win && n && M && !n.done){
    n.done = true;
    const loot = LEVI_LOOT_MIN + Math.floor(Math.random() * LEVI_LOOT_SPREAD);
    M.inv.gold += loot;
    M.inv.cards.push('Цунами');
    mapUpdateCargo();
    mapSave(M);
    if (window.mapHall) mapHall('Левиафан повержен: +' + loot + ' золота, карточка «Цунами» — в трюме.', 'win');   /* этап 4 */
    LV.claimMsg = 'Левиафан повержен! Трофей: +' + loot + ' монет и карточка «Цунами» — волна босса бьёт четыре клетки одного ряда, одноразовая.';
  }
  startMapMode();
  const msg = LV.claimMsg ||
    (n ? '«' + n.name + '»: отступили с потерями. Волна всё ещё гуляет по пади.' : '');
  LV.claimMsg = null;
  if (msg){
    mapToast(msg);
    sayMap(msg);                    /* итог остаётся в статусе и не гаснет */
  }
}

CPT.leviBoss = { start: startLeviathanBoss };
