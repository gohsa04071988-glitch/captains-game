'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_story.js
   ЭТАП 4: СЮЖЕТ ПОХОДА (решение Егора: «боссов тоже в сюжеты»).
   Прибыл на остров — сначала КАРТОЧКА-СОБЫТИЕ: имя, история,
   выбор «В бой / Отойти». Один остров — одна история навсегда:
   текст привязан к ИМЕНИ узла, мир не противоречит сам себе.
   Боссовые гнёзда и Скрытая лагуна рассказывают свои истории
   тем же способом. Зачищенные узлы и открытые сундуки сюжета
   не показывают (там уже ничего не происходит).
   Сундук вместо мгновенного тоста раскрывается сценкой:
   тряска ~1,1–1,6 сек → крышка → лут → «Забрать» (исследование
   предвкушения: отклик растёт ещё ДО вскрытия). Правила выплаты
   не дублируются: лут выдаёт map_mode.js как раньше, а мы на
   время вскрытия перехватываем его тост и показываем текст
   в сценке. Каждый визит (остров/сундук/гнездо) продвигает
   «День N» — он попадает в журнал (map_hall.js).
   style.css не трогаем: классы .overlay/.overlay-card уже есть,
   анимации добавляем своим <style> (прецедент — map_mode.js).
   Хуки через переприсвоение mapArrive/mapToast — тот же приём,
   что map_boss.js использует для bossOver.
   Реестр: CPT.mapStory = { open, chestSeq }.
   Порядок подключения: после leviathan_boss.js, перед map_hall.js.
   ============================================================ */

/* ---------------- истории: один остров — одна история ---------------- */
const STORIES = {
  'Остров Скелетов':
    'На отмели лежит китовый скелет длиной с двухпалубник. В рёбрах обустроили лагерь костобои: режут, чистят и торгуют с материком через перекупщиков. Их вышка на лопатке уже подняла флаг — чужим кораблям причаливать нельзя. Придётся доказывать обратное.',
  'Бухта Рифов':
    'Между рифами узкий фарватер, а поперёк него — цепь: так дозор закрывает бухту для всех, кто не заплатил. С баркаса машут дубинами: мол, разворачивайся, чужак. Дозорные уверены, что ты из команды контрабандиста Лысого Фрица, обобравшего их склад на прошлой неделе.',
  'Мыс Попутного Ветра':
    'Маяк на мысу погас двадцать лет назад, но клянутся: в безлунные ночи в фонаре снова вспыхивает огонь. Смотритель исчез ещё при твоём отце. Береговой дозор встретил тебя натянутыми тетивами — в темноте у берега видели чужой корабль, и твой силуэт совпал с приметами.',
  'Пальмовый берег':
    'Деревня на сваях платит дань шайке с подмостков у лагуны: за «охрану» скупщики забирают треть улова. Старейшина шепнул: шайка сидит у костра и дремлет, но корабль они всё равно попробуют отнять. Твоего флота они не боятся — зря.',
  'Остров Крабов':
    'Гигантские крабы норят песок целыми отмелями, а рыбаки бьются с ними за мели каждое утро. Вчера крабы порвали последнюю сеть, и рыбаки решили: всё, что приходит с моря, виновато. Твой корабль подходит под это определение.',
  'Скалистый клык':
    'На острие скалы стоит старый форт, забытый материком. Гарнизон остался без жалованья и три года живёт тем, что берёт дань с проходных кораблей. Труба форта дала дым: сигнальщики уже прикидывают, сколько с тебя взять.',
  'Тихая гавань':
    'Гавань тихая, потому что все, кто мог бы драться, ушли в лес за ромом. Рыбаки торгуются быстро: пропустят в бухту за долю добычи. Но у костра сидят двенадцать штыков, которым мирная сделка не нравится, — они уже поднимаются к пирсу.',
  'Остров Попугая':
    'Попугаи здесь таскают блестящее: монеты, пряжки, даже подзорную трубу боцмана с прошлого сезона. Охотники за птицами считают эти сокровища своими и чужаков с сачками не любят. Твой китель с латунными пуговицами они уже записали в добычу.',
  'Скрытая лагуна':
    'Плоты за рифом указали вход, который искали три поколения капитанов. Лагуна тёплая и пустая, на дне — бочки и сундуки корабля, которого не нашла ни одна карта. На берегу всё ещё стоит его стража: она уверена, что клад принадлежит ей.',
  'Гнездо Кракена':
    'Вода здесь чернее, чем на любой карте. Рыбацкие лодки всплывают пустыми: сети порваны, вёсла обглоданы. Старый боцман шептал: «Там, под килем, восемь рук и вечный голод». Гнездо ждёт капитана, которого хватит на всю его свиту.',
  'Падь Левиафана':
    'Море в пади дышит: раз в минуту по воде идёт вал высотой с мачту — без ветра. Чайки не летают здесь даже в ясный день. Тот, кто поднимает эти валы, спит на дне и не любит, когда над ним плывут. Но ты пришёл за его головой.'
};
const STORY_FALLBACK =
  'Зелёный бугор посреди моря. На берегу тебя встречают не с хлебом-солью: кто-то уже решил, что твой корабль — его добыча.';

/* ---------------- стили сцен (в своих <style>, css-файл цел) ---------------- */
const STORY_CSS =
  '@keyframes cpt-shake{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(-3px,0) rotate(-1.4deg)}' +
  '50%{transform:translate(0,0) rotate(0)}75%{transform:translate(3px,0) rotate(1.4deg)}100%{transform:translate(0,0) rotate(0)}}' +
  '@keyframes cpt-pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}' +
  '.cpt-story-text{font-size:15px;line-height:1.6;text-align:left;color:#3d3222;max-width:420px;font-weight:600;}' +
  '.cpt-chest{position:relative;width:130px;height:96px;margin:8px auto 12px;}' +
  '.cpt-glow{position:absolute;left:-25px;top:-25px;width:180px;height:146px;border-radius:50%;' +
  'background:radial-gradient(circle,rgba(255,215,90,.55),rgba(255,215,90,0) 70%);opacity:0;transition:opacity .4s;}' +
  '.cpt-chest.open .cpt-glow{opacity:1;}' +
  '.cpt-chest-lid{position:absolute;left:0;top:0;width:130px;height:36px;background:#8a5a34;' +
  'border:2px solid #5f3d20;border-radius:10px 10px 2px 2px;transform-origin:18px 34px;' +
  'transition:transform .5s ease;z-index:1;}' +
  '.cpt-chest-lock{position:absolute;left:57px;top:26px;width:16px;height:16px;background:#e9b53a;' +
  'border:2px solid #b8860b;border-radius:4px;z-index:2;}' +
  '.cpt-chest-box{position:absolute;left:0;top:36px;width:130px;height:54px;background:#a9723f;' +
  'border:2px solid #5f3d20;border-radius:2px 2px 10px 10px;}' +
  '.cpt-chest.shaking .cpt-chest-lid,.cpt-chest.shaking .cpt-chest-box,' +
  '.cpt-chest.shaking .cpt-chest-lock{animation:cpt-shake .16s linear infinite;}' +
  '.cpt-chest.open .cpt-chest-lid{transform:rotate(-72deg) translate(-4px,-6px);}' +
  '.cpt-chest.open .cpt-chest-lock{background:#fff2c4;}';

let storyCssDone = false;
function storyCssOnce(){
  if (storyCssDone) return;
  storyCssDone = true;
  const st = document.createElement('style');
  st.textContent = STORY_CSS;
  document.head.appendChild(st);
}

/* ---------------- карточка-событие (остров / гнездо босса) ---------------- */
let storyBox = null;
function storyEnsure(){
  if (storyBox) return storyBox;
  const scr = $('screen-map');
  if (!scr) return null;
  storyCssOnce();
  storyBox = document.createElement('div');
  storyBox.id = 'story-overlay';
  storyBox.className = 'overlay hidden';
  storyBox.innerHTML =
    '<div class="overlay-card">' +
      '<div id="story-emoji" class="overlay-emoji"></div>' +
      '<h2 id="story-title"></h2>' +
      '<p id="story-text" class="cpt-story-text"></p>' +
      '<div class="overlay-btns">' +
        '<button id="story-go" class="btn-gold"></button>' +
        '<button id="story-away" class="btn-ghost"></button>' +
      '</div>' +
    '</div>';
  scr.appendChild(storyBox);
  return storyBox;
}

function storyShow(title, text, goLabel, onGo, awayLabel, emoji){
  const box = storyEnsure();
  if (!box){ onGo(); return; }               /* экрана нет — не блокируем поход */
  storyCssOnce();
  $('story-emoji').textContent = emoji || '🗺';
  $('story-title').textContent = title;
  $('story-text').textContent = text;
  $('story-go').textContent = goLabel;
  $('story-away').textContent = awayLabel;
  $('story-go').onclick = () => { box.classList.add('hidden'); onGo(); };
  $('story-away').onclick = () => { box.classList.add('hidden'); mapToast('Курс уведён от берега.'); };
  box.classList.remove('hidden');
}

/* ---------------- классы сундуков: медь · серебро · золото ----------------
   ЭТАП 5 (блок 2 — сокровища). Тир узла назначает map_gen.js
   (восстанавливается из seed). Базовую награду выдаёт map_mode.js
   (карточка/ремонт/золото по типу узла), тир добавляет бонус поверх:
   серебро — монеты, золото — монеты и, если база без карточки,
   ещё карточку. Один источник выплаты: база в map_mode, бонус здесь,
   задвоения нет; при потере map_story.js база всё равно выпадает. */
const CHEST_TIERS = [
  { name: 'Медный сундук',     lid: '#b87333', box: '#a9723f', lock: '#e9b53a' },
  { name: 'Серебряный сундук', lid: '#cdd6dd', box: '#9fb0bb', lock: '#f2e9c9' },
  { name: 'Золотой сундук',    lid: '#e9b53a', box: '#d9a02b', lock: '#fff2c4' }
];

function setChestSkin(tier){
  const t = CHEST_TIERS[tier] || CHEST_TIERS[0];
  $('chest-title').textContent = t.name;
  const lid = document.querySelector('#chest-vis .cpt-chest-lid');
  const box = document.querySelector('#chest-vis .cpt-chest-box');
  const lock = document.querySelector('#chest-vis .cpt-chest-lock');
  if (lid) lid.style.background = t.lid;
  if (box) box.style.background = t.box;
  if (lock) lock.style.background = t.lock;
}

/* ---------------- сундук: тряска → вскрытие → лут ---------------- */
let chestBox = null;
function chestEnsure(){
  if (chestBox) return chestBox;
  const scr = $('screen-map');
  if (!scr) return null;
  storyCssOnce();
  chestBox = document.createElement('div');
  chestBox.id = 'chest-overlay';
  chestBox.className = 'overlay hidden';
  chestBox.innerHTML =
    '<div class="overlay-card">' +
      '<h2 id="chest-title">Сундук со дна</h2>' +
      '<div id="chest-vis" class="cpt-chest">' +
        '<div class="cpt-glow"></div>' +
        '<div class="cpt-chest-lid"></div>' +
        '<div class="cpt-chest-lock"></div>' +
        '<div class="cpt-chest-box"></div>' +
      '</div>' +
      '<p id="chest-text" class="cpt-story-text" style="min-height:48px;"></p>' +
      '<div class="overlay-btns">' +
        '<button id="chest-take" class="btn-gold hidden">Забрать</button>' +
      '</div>' +
    '</div>';
  scr.appendChild(chestBox);
  return chestBox;
}

/* лут-тост map_mode.js на время вскрытия уходит в сценку, не на карту */
let chestCapture = null;
const _mapToastOrig = mapToast;
mapToast = function(t){
  if (chestCapture !== null){ chestCapture = t; return; }
  _mapToastOrig(t);
};

function chestReveal(loot){
  const vis = $('chest-vis');
  vis.classList.remove('shaking');
  vis.classList.add('open');
  const p = $('chest-text');
  p.textContent = loot;
  p.style.animation = 'none';
  void p.offsetWidth;                        /* перезапуск анимации появления */
  p.style.animation = '';
  $('chest-take').classList.remove('hidden');
}

function chestSequence(g){
  const box = chestEnsure();
  if (!box){ _mapArriveOrig(g); return; }
  const vis = $('chest-vis');
  setChestSkin(g.node ? g.node.tier : 0);
  vis.classList.remove('open', 'shaking');
  $('chest-text').textContent = 'Сундук тяжёлый. Замок поддаётся...';
  $('chest-take').classList.add('hidden');
  box.classList.remove('hidden');
  vis.classList.add('shaking');
  chestCapture = '';
  setTimeout(function(){
    if (chestCapture === null) return;               /* сцену уже закрыли */
    if (!M || typeof activeScreen === 'undefined' || activeScreen !== 'map'){
      chestCapture = null; return;                   /* ушли с экрана — сундук цел */
    }
    _mapArriveOrig(g);                               /* лут выдаёт map_mode.js */
    let loot = chestCapture || 'Сундук оказался пуст.';
    const tr = g.node && g.node.tier ? g.node.tier : 0;
    if (tr > 0 && M && M.inv){
      const bonus = (tr === 1 ? 25 : 70) + Math.floor(Math.random() * (tr === 1 ? 21 : 41));
      M.inv.gold += bonus;
      if (tr === 1){
        loot += ' Серебро прибавило +' + bonus + ' монет!';
      } else {
        loot += ' ЗОЛОТОЙ бонус: +' + bonus + ' монет';
        if (g.node.type !== 'card'){
          const c = rnd(CARD_NAMES_MAP);
          M.inv.cards.push(c);
          loot += ' и карточка «' + c + '»!';
        } else {
          loot += '!';
        }
      }
      mapUpdateCargo();
      mapSave(M);
    }
    chestCapture = null;
    chestReveal(loot);
    $('chest-take').onclick = () => {
      box.classList.add('hidden');
      if (window.mapHall) mapHall(loot, 'chest');    /* запись в журнал */
    };
  }, 1050 + Math.random() * 550);
}

/* ---------------- перехват прибытия: сюжет вместо мгновенного боя ---------------- */
const _mapArriveOrig = mapArrive;
mapArrive = function(g){
  if (!g || !M || !g.node){ _mapArriveOrig(g); return; }
  const n = g.node;
  if (g.kind === 'isle' || g.kind === 'boss' || g.kind === 'chest'){
    M.day = (M.day || 1) + 1;                /* каждый важный визит — новый день */
  }
  if (g.kind === 'isle' && !n.done){
    storyShow(n.name, STORIES[n.name] || STORY_FALLBACK,
      'В БОЙ', () => _mapArriveOrig(g), 'Отойти');
    return;
  }
  if (g.kind === 'boss' && !n.done){
    storyShow(n.name, STORIES[n.name] || STORY_FALLBACK,
      'В БОЙ', () => _mapArriveOrig(g), 'Отойти');
    return;
  }
  if (g.kind === 'chest' && !n.opened){ chestSequence(g); return; }
  _mapArriveOrig(g);
};

CPT.mapStory = { open: storyShow, chestSeq: chestSequence };
