'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_boss.js
   ЭТАП 3 (блок 1): БОССЫ ПОХОДА.
   Гнездо Кракена на карте открывается после трёх зачищенных
   островов И трёх обрывков карты босса (решение Егора).
   За победу на острове выпадает случайная часть: кусок КЛЮЧА
   (3/3 — на карте открывается «Скрытая лагуна», тайник с
   крупным трофеем) или ОБРЫВОК КАРТЫ (3/3 — вход в гнездо).
   Кракен переиспользует классический босс-бой (kraken_boss.js,
   файлы босса не тронуты): слушатели его кнопок пересаживаются
   на походные и восстанавливаются при выходе. Победа — трофей
   120–160 монет и уникальная одноразовая карточка «Гнев
   Кракена» в трюм (часть силы босса).
   Реестр: CPT.mapBoss = { enter, partDrop }.
   Порядок подключения: ПОСЛЕДНИМ, после map_battle.js.
   ============================================================ */

const BOSS_LOOT_MIN = 120, BOSS_LOOT_SPREAD = 41;   /* 120–160 монет */
const GATE_ISLES = 3, GATE_MAP = 3;                 /* гейт гнезда  */
const LEVI_GATE_ISLES = 5;                          /* гейт пади: 5 островов + Кракен */

const KR = { on: false, node: null, result: null, claimMsg: null };

/* ---------------- выпадение части: КЛЮЧ или ОБРЫВОК КАРТЫ ----------------
   Вызывается из map_battle.js после победы на обычном острове.
   Лишняя часть не пропадает: если обе коллекции полны — +10 монет. */
function mapPartDrop(){
  if (!M || !M.inv) return '';
  if (!M.inv.parts) M.inv.parts = { key: 0, map: 0 };
  const p = M.inv.parts;
  let which = Math.random() < .5 ? 'key' : 'map';
  if (p[which] >= 3) which = which === 'key' ? 'map' : 'key';
  if (p[which] >= 3){
    M.inv.gold += 10;
    return ' Части собраны все — нашлась казённая монета: +10 золота.';
  }
  p[which]++;
  if (which === 'map' && p.map >= 3){
    return ' ОБРЫВОК карты босса (3/3)! Гнездо Кракена теперь впустит.';
  }
  if (which === 'key' && p.key >= 3){
    M.inv.vaultOpen = 1;
    if (typeof insertVaultNode === 'function') insertVaultNode(M);
    return ' Последний кусок КЛЮЧА (3/3)! На карте открылась «Скрытая лагуна».';
  }
  return which === 'key'
    ? ' Часть КЛЮЧА (' + p.key + '/3).'
    : ' ОБРЫВОК карты босса (' + p.map + '/3).';
}

/* ---------------- гейт и вход в гнездо ---------------- */
function bossGateReport(){
  const isles = M ? M.nodes.filter(n => n.kind === 'isle' && n.done).length : 0;
  const p = (M && M.inv && M.inv.parts) || { key: 0, map: 0 };
  return { isles, map: Math.min(GATE_MAP, p.map) };
}

function mapBossEnter(n){
  if (!M) return;
  if (n.done){
    mapToast('Гнездо разорено: ' + (n.boss === 'kraken' ? 'Кракен' : 'Левиафан') + ' уже повержен.');
    return;
  }
  if (n.boss !== 'kraken'){
    /* этап 3 блок 1b: Падь Левиафана — второй босс похода.
       Гейт: 5 зачищенных островов И поверженный Кракен. */
    const isles = M.nodes.filter(x => x.kind === 'isle' && x.done).length;
    if (isles < LEVI_GATE_ISLES){
      mapToast('Падь не пускает: зачищено островов ' + isles + ' из ' + LEVI_GATE_ISLES + '.');
      return;
    }
    const kr = M.nodes.find(x => x.boss === 'kraken');
    if (!kr || !kr.done){
      mapToast('Падь молчит: сначала повергни Кракена в его гнезде.');
      return;
    }
    if (typeof startLeviathanBoss !== 'function'){
      mapToast('Падь молчит: при сборке потерялся leviathan_boss.js.');
      return;
    }
    startLeviathanBoss(n);
    return;
  }
  if (typeof startKrakenBoss !== 'function'){
    mapToast('Гнездо молчит: при сборке потерялся kraken_boss.js.');
    return;
  }
  const g = bossGateReport();
  if (g.isles < GATE_ISLES){
    mapToast('Гнездо не пускает: зачищено островов ' + g.isles + ' из ' + GATE_ISLES + '.');
    return;
  }
  if (g.map < GATE_MAP){
    mapToast('Без карты босса не войти: обрывков ' + g.map + ' из ' + GATE_MAP +
             ' (падают за острова).');
    return;
  }
  KR.on = true; KR.node = n; KR.result = null; KR.claimMsg = null;
  if (CPT.mapDice) CPT.mapDice.reset();          /* кости не летят сквозь бой */
  M.ship.goal = null; mapSave(M);                /* гнездо сохранено перед боем */
  mapBossBindMapUI();
  startKrakenBoss();
  sayB('🐙 Гнездо Кракена: зона 3×3 против флота 4-3-2-2. Победа — карточка «Гнев Кракена»!');
}

/* ---------------- кнопки босса в режиме похода ----------------
   Файлы Кракена не трогаем (R11): слушатели пересаживаем
   клоном узла, при выходе в классику — восстанавливаем. */
function mapBossRetake(id, fn){
  const b = $(id);
  if (!b || !b.parentNode) return;
  const nb = b.cloneNode(true);
  b.parentNode.replaceChild(nb, b);
  nb.addEventListener('click', fn);
}

function mapBossBindMapUI(){
  mapBossRetake('btn-boss-again', () => {
    if (KR.result === true) mapBossBack();
    else startKrakenBoss();                      /* после поражения — снова */
  });
  mapBossRetake('btn-quit-boss', () => {         /* уйти посреди боя = отступить */
    if (B) B.phase = 'over';
    mapBossRetreat();
  });
  mapBossRetake('btn-boss-menu', () => {
    if (KR.result === true){ mapBossBack(); return; }
    if (B) B.phase = 'over';
    KR.on = false; KR.node = null; KR.result = null; KR.claimMsg = null;
    mapBossBindClassicUI();
    showScreen('menu');
  });
}

function mapBossBindClassicUI(){
  mapBossRetake('btn-boss-again', () => startKrakenBoss());
  const again = $('btn-boss-again');
  if (again) again.textContent = 'Заново';
  mapBossRetake('btn-quit-boss', () => { if (B) B.phase = 'over'; showScreen('menu'); });
  mapBossRetake('btn-boss-menu', () => showScreen('menu'));
}

/* ---------------- конец боя босса: результат уходит в поход ----------------
   bossOver — объявление из kraken_boss.js; перекрываем привязку
   один раз при загрузке, классика зовёт уже обёртку. */
const _bossOverOrig = bossOver;
bossOver = function(win){
  _bossOverOrig(win);
  if (!KR.on || !KR.node) return;                /* классический босс — без изменений */
  KR.result = !!win;
  const btn = $('btn-boss-again');
  if (btn) btn.textContent = win ? '🧭 В поход' : 'Заново';
  if (win) mapBossClaim();
};

function mapBossClaim(){
  const n = KR.node;
  if (!M || !n || n.done) return;
  n.done = true;
  const loot = BOSS_LOOT_MIN + Math.floor(Math.random() * BOSS_LOOT_SPREAD);
  M.inv.gold += loot;
  M.inv.cards.push('Гнев Кракена');
  mapUpdateCargo();
  mapSave(M);
  if (window.mapHall) mapHall('Кракен повержен: +' + loot + ' золота, карточка «Гнев Кракена» — в трюме.', 'win');   /* этап 4 */
  KR.claimMsg = 'Кракен повержен! Трофей: +' + loot + ' монет и карточка «Гнев Кракена» — часть силы босса, срабатывает один раз за бой.';
}

function mapBossBack(){
  const msg = KR.claimMsg ||
    'Отступили от гнезда Кракена с потерями. Он всё ещё ждёт.';
  KR.on = false; KR.node = null; KR.result = null; KR.claimMsg = null;
  mapBossBindClassicUI();
  startMapMode();
  mapToast(msg);
  sayMap(msg);                     /* трофей остаётся в статусе и не гаснет */
}

function mapBossRetreat(){
  const lost = KR.result !== true;
  const msg = lost ? 'Отступили от гнезда Кракена. Он всё ещё ждёт.' : '';
  KR.on = false; KR.node = null; KR.result = null; KR.claimMsg = null;
  mapBossBindClassicUI();
  startMapMode();
  if (msg) mapToast(msg);
}

CPT.mapBoss = { enter: mapBossEnter, partDrop: mapPartDrop };
