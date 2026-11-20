'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_hall.js
   ЭТАП 4: СУДОВОЙ ЖУРНАЛ КАПИТАНА (решение Егора: достижения
   и журнал боёв СОХРАНЯЮТСЯ при сбросе прогресса).
   Данные живут в ОТДЕЛЬНОМ сейве localStorage 'cpt-hall-v1':
   кнопка «Новый поход» стирает только поход (map_gen.js),
   достижения, записи и счётчики остаются. Сейв похода хранит
   лишь «День N» текущего плавания.
   Журнал: до 40 записей, «День N · событие». Пишутся:
   победа/отступление на острове, сундук (map_story.js),
   победы над Кракеном и Левиафаном, полученные достижения.
   Достижения: 9 медалей с прогрессом; проверяются после
   каждого события; открытие — тост (с задержкой, чтобы не
   заглушить тост трофея) и запись в журнал.
   Панель — кнопка «Журнал» в верхней панели карты, вкладки
   «Достижения» и «Журнал». Классы .overlay/.overlay-card из
   style.css, панель appended в #screen-map — прячется вместе
   с экраном. style.css не трогаем.
   Реестр: CPT.hall = { event, open }. window.mapHall — глобальный
   хук для map_battle.js / map_boss.js / leviathan_boss.js.
   Порядок подключения: ПОСЛЕДНИМ, после map_story.js.
   ============================================================ */

const HALL_KEY = 'cpt-hall-v1';
const HALL_LOG_MAX = 40;
let HALL = null;

/* ---------------- сейв зала славы (переживает сброс похода) ---------------- */
function hallLoad(){
  if (HALL) return HALL;
  try {
    const raw = localStorage.getItem(HALL_KEY);
    HALL = raw ? JSON.parse(raw) : null;
  } catch (err) { HALL = null; }               /* битый сейв — начинаем с чистого */
  if (!HALL || typeof HALL !== 'object') HALL = {};
  HALL.ach = HALL.ach || {};
  HALL.log = HALL.log || [];
  HALL.stats = Object.assign({ wins: 0, losses: 0, chests: 0 }, HALL.stats || {});
  return HALL;
}

function hallSave(){
  try { localStorage.setItem(HALL_KEY, JSON.stringify(hallLoad())); }
  catch (err) { /* приватный режим — играем без сохранения зала */ }
}

/* ---------------- что читаем из текущего похода ---------------- */
function hallIsles(){
  return M && M.nodes ? M.nodes.filter(n => n.kind === 'isle' && n.done).length : 0;
}
function hallBossDone(boss){
  const n = M && M.nodes ? M.nodes.find(x => x.boss === boss) : null;
  return n && n.done ? 1 : 0;
}
function hallGold(){ return M && M.inv ? M.inv.gold : 0; }
function hallCards(){ return M && M.inv && M.inv.cards ? new Set(M.inv.cards).size : 0; }
function hallFrags(){
  const p = M && M.inv && M.inv.parts;
  return p ? Math.min(3, p.map) : 0;
}
function hallDay(){ return M && M.day ? M.day : 1; }

/* ---------------- девять медалей (Game Developer: измеримые,
   «сложные, но достижимые», разных типов) ---------------- */
const ACH_DEFS = [
  { id: 'first',  name: 'Первый триумф',    desc: 'зачистить первый остров',         goal: 1,   prog: hallIsles },
  { id: 'carto',  name: 'Картеограф',       desc: 'собрать 3 обрывка карты босса',   goal: 3,   prog: hallFrags },
  { id: 'storm',  name: 'Гроза архипелага', desc: 'зачистить 5 островов в походе',   goal: 5,   prog: hallIsles },
  { id: 'kraken', name: 'Змей повержен',    desc: 'победить Кракена в его гнезде',   goal: 1,   prog: () => hallBossDone('kraken') },
  { id: 'levi',   name: 'Левиафан усмирён', desc: 'победить Левиафана в пади',       goal: 1,   prog: () => hallBossDone('leviathan') },
  { id: 'gold',   name: 'Казначей',         desc: 'собрать 300 золота в трюме',      goal: 300, prog: hallGold },
  { id: 'cards',  name: 'Коллекционер',     desc: '5 разных карточек в трюме',       goal: 5,   prog: hallCards },
  { id: 'wolf',   name: 'Морской волк',     desc: 'выиграть 10 боёв в походах',      goal: 10,  prog: () => hallLoad().stats.wins },
  { id: 'luck',   name: 'Ловец удачи',      desc: 'вскрыть 5 сундуков',              goal: 5,   prog: () => hallLoad().stats.chests }
];

/* ---------------- тост достижений: не заглушает тост трофея ----------------
   Трофей показывает свой тост ~2,8 сек; медаль ждёт своей очереди.
   Если экран карты уже покинули — медаль видна в журнале. */
let hallToastAt = 0;
function hallToastSoon(t){
  const now = Date.now();
  hallToastAt = Math.max(now, hallToastAt) + 2900;
  const at = hallToastAt;
  setTimeout(() => {
    if (typeof activeScreen !== 'undefined' && activeScreen === 'map') mapToast(t);
  }, at - now);
}

/* ---------------- запись события + проверка медалей ----------------
   kind: 'win' | 'loss' | 'chest' | undefined (просто запись). */
function mapHall(text, kind){
  const h = hallLoad();
  h.log.unshift({ d: hallDay(), t: text });
  if (h.log.length > HALL_LOG_MAX) h.log.length = HALL_LOG_MAX;
  if (kind === 'win') h.stats.wins++;
  if (kind === 'loss') h.stats.losses++;
  if (kind === 'chest') h.stats.chests++;
  hallSave();                              /* запись сразу, не только с медалью */
  hallCheck();
}
window.mapHall = mapHall;

function hallCheck(){
  const h = hallLoad();
  let changed = false;
  for (const a of ACH_DEFS){
    if (!h.ach[a.id] && a.prog() >= a.goal){
      h.ach[a.id] = 1;
      changed = true;
      const msg = 'Достижение: «' + a.name + '»!';
      h.log.unshift({ d: hallDay(), t: msg });
      if (h.log.length > HALL_LOG_MAX) h.log.length = HALL_LOG_MAX;
      hallToastSoon(msg);
    }
  }
  if (changed) hallSave();
}

/* ---------------- панель: вкладки «Достижения» и «Журнал» ---------------- */
function hallRenderAch(){
  const h = hallLoad();
  let done = 0, html = '';
  for (const a of ACH_DEFS){
    const ok = !!h.ach[a.id];
    if (ok) done++;
    const p = a.prog();
    const prog = ok ? 'выполнено'
      : (a.goal > 1 ? ' · ' + Math.min(p, a.goal) + '/' + a.goal : ' · не выполнено');
    html +=
      '<div style="padding:7px 2px;border-bottom:1px solid #e4eef4;font-size:14px;">' +
        '<b style="color:' + (ok ? '#2f8f4e' : '#28506b') + ';">' + a.name + (ok ? ' ✓' : '') + '</b>' +
        '<span style="color:#5f8299;"> — ' + a.desc + prog + '</span>' +
      '</div>';
  }
  return '<div style="font-size:13px;color:#5f8299;margin-bottom:6px;">' +
    'Открыто ' + done + ' из ' + ACH_DEFS.length + '</div>' + html;
}

function hallRenderLog(){
  const h = hallLoad();
  const s = h.stats;
  let html = '<div style="font-size:13px;color:#5f8299;margin-bottom:6px;">Побед: ' + s.wins +
    ' · Отступлений: ' + s.losses + ' · Сундуков: ' + s.chests + '</div>';
  if (!h.log.length){
    html += '<div style="color:#5f8299;padding:10px 2px;">Журнал пуст: ни одного события ещё не было.</div>';
  }
  for (const e of h.log){
    html += '<div style="padding:6px 2px;border-bottom:1px solid #e4eef4;font-size:14px;">' +
      '<span style="color:#b0563a;font-weight:700;">День ' + e.d + '</span> · ' + e.t + '</div>';
  }
  return html;
}

function hallRender(tab){
  const ach = tab === 'ach';
  $('hall-tab-ach').classList.toggle('gold', ach);
  $('hall-tab-log').classList.toggle('gold', !ach);
  $('hall-body').innerHTML = ach ? hallRenderAch() : hallRenderLog();
}

function hallOpen(tab){
  const scr = $('screen-map');
  if (!scr) return;
  let o = $('hall-overlay');
  if (!o){
    o = document.createElement('div');
    o.id = 'hall-overlay';
    o.className = 'overlay hidden';
    o.innerHTML =
      '<div class="overlay-card" style="max-width:560px;">' +
        '<div class="overlay-emoji">📜</div>' +
        '<h2>Судовой журнал капитана</h2>' +
        '<div style="display:flex;gap:10px;justify-content:center;margin:8px 0;">' +
          '<button id="hall-tab-ach" class="btn-small" style="padding:8px 16px;">Достижения</button>' +
          '<button id="hall-tab-log" class="btn-small" style="padding:8px 16px;">Журнал</button>' +
        '</div>' +
        '<div id="hall-body" style="max-height:300px;overflow:auto;text-align:left;margin:6px 0 12px;"></div>' +
        '<div class="overlay-btns"><button id="hall-close" class="btn-gold">Закрыть</button></div>' +
      '</div>';
    scr.appendChild(o);
    $('hall-tab-ach').addEventListener('click', () => hallRender('ach'));
    $('hall-tab-log').addEventListener('click', () => hallRender('log'));
    $('hall-close').addEventListener('click', () => o.classList.add('hidden'));
  }
  hallRender(tab || 'log');
  o.classList.remove('hidden');            /* панель видима — иначе рендер в тёмную */
}

/* ---------------- хуки: кнопка «Журнал» и «День N» ---------------- */
const _startMapModeOrig = startMapMode;
startMapMode = function(){
  _startMapModeOrig();
  if (M && !M.day) M.day = 1;              /* старые сейвы без дня */
  if (!$('btn-hall') && $('btn-newmap')){
    const b = document.createElement('button');
    b.id = 'btn-hall';
    b.className = 'btn-small';
    b.textContent = 'Журнал';
    b.style.marginRight = '8px';
    b.addEventListener('click', () => hallOpen('log'));
    $('btn-newmap').parentNode.insertBefore(b, $('btn-newmap'));
  }
};

const _mapNewOrig = mapNew;
mapNew = function(){
  const M2 = _mapNewOrig();
  M2.day = 1;                              /* новый поход — снова день первый */
  return M2;
};

CPT.hall = { event: mapHall, open: hallOpen };
