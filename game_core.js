'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_core.js  (v2.3)
   Меню (реестр CPT) + классический морской бой.
   Состояние (объект C) полностью отделено от отрисовки
   (drawClassic читает состояние, логика его не рисует).
   Новый режим добавляется отдельным файлом через CPT.mode()
   — механика этого ядра не переписывается.
   Новое в v2.3:
   - ВЫБОР КАРТ ДО БОЯ: капитан берёт в бой ровно ТРИ разные
     карточки из шести — выбор идёт во время расстановки;
   - ОКНО РЕАКЦИИ: бот целится до 5 секунд, и всё это время
     можно успеть сыграть «Ремонт» или «Щит»;
   - ТОРПЕДА ПО-НОВОМУ: нажал карточку — торпеда сама всплыла
     у берега, над водой рупор с гудком, и только потом
     появляются крупные стрелки направления;
   - ПЕРЕВОРОТ ЖИВЕЕ: доска влетает с замахом и всплеском
     (динамика добавляется скриптом, style.css не меняем);
   - КОРАБЛИ ЖИВЫЕ: паруса надувает ветер, флаги трепещут,
     корабли покачиваются на волне — как фигурки в старых
     стратегиях.
   Новое в v2.2:
   - КАРТЫ-АКВАТОРИИ: каждая партия — случайная карта
     («Тропики», «Лагуна», «Скалы») со своей водой;
   - ОСТРОВА: на обеих досках в одинаковых местах стоят
     островки — корабли на них не ставятся, снаряд в остров
     это промах с брызгами;
   - ОДИН ВЫСТРЕЛ — ОДИН ХОД: попал или промазал — не важно,
     ход переходит противнику; у бота тоже один выстрел;
   - СПОКОЙНЫЙ РИТМ: после выстрела результат держится на
     доске (HOLD_SHOT / HOLD_BOT), и только потом доска
     плавно переворачивается (скорость переворота — в CSS);
   - КАРТЫ КАПИТАНА: шесть одноразовых карточек в обычном
     бою — щит, торпеда, радар, ремонт, дым, залп;
   - КОРАБЛИ-СПРАЙТЫ: рисованые «псевдо-3D» корабли — палуба
     с досками, мачты с парусами, пушки, мягкая тень; флот
     противника — тёмный, с чёрными парусами;
   - светлая детская вода на полях + бейдж карты в панели.
   ============================================================ */
/* v2.4: ядро разрезано по паспорту v2.1 (не более 450 строк на файл):
   game_cards.js  — карточки капитана и торпеда,
   game_battle.js — состояние партии, расстановка, стрельба, клики,
   game_bot.js    — бот классического боя,
   game_draw.js   — доски и живые корабли,
   game_fx.js     — метки, стрелки, летящий снаряд, эффекты.
   Порядок подключения — внизу index.html. */

/* ---------------- общие утилиты ---------------- */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = a => a[Math.floor(Math.random() * a.length)];
const inB = (v, n) => v >= 0 && v < n;

/* ---------------- простые звуки (без файлов) ----------------
   Короткие сигналы WebAudio: гудок торпеды, взрыв об остров,
   пинг радара. Звук появляется только после клика игрока —
   так требует браузер; без звука игра тоже работает. */
let _AC = null;
function audioC(){
  if (!_AC){
    try { _AC = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (err){ _AC = null; }
  }
  if (_AC && _AC.state === 'suspended') _AC.resume().catch(() => {});
  return _AC;
}
function toneC(freq, dur, type, vol, when){
  const ac = audioC();
  if (!ac) return;
  try {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const t0 = ac.currentTime + (when || 0);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.linearRampToValueAtTime(vol || .06, t0 + .02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + .05);
  } catch (err){ /* без звука тоже играем */ }
}
const hornC   = () => { toneC(196, .28, 'sawtooth', .05); toneC(196, .34, 'sawtooth', .05, .38); };
const thumpC  = () => { toneC(82, .5, 'sine', .12); toneC(60, .6, 'triangle', .1, .05); };
const pingC   = () => { toneC(880, .16, 'sine', .05); toneC(660, .22, 'sine', .04, .14); };
const splashC = () => { toneC(520, .12, 'sine', .03); };
const boomShotC = () => { toneC(120, .16, 'square', .07); toneC(58, .22, 'triangle', .06, .02); };

/* темп боя: всё спокойное, для детей */
const HOLD_SHOT = 1500;   /* результат выстрела игрока держится до переворота */
const BOT_AIM_MIN = 2800; /* бот «прицеливается» от ~3 секунд —        */
const BOT_AIM_MAX = 5000; /* до 5: это окно на «Ремонт» и «Щит»         */
const HOLD_BOT  = 1500;   /* результат выстрела бота держится до переворота */

let activeScreen = 'menu';

function showScreen(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
  activeScreen = name;
}

function initCanvas(cv, w, h){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  cv._w = w; cv._h = h;
  return g;
}

function roundRect(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function canvasXY(cv, e){
  const rect = cv.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (cv._w / rect.width),
           y: (e.clientY - rect.top)  * (cv._h / rect.height) };
}

const SHIP_NAMES = { 4: 'Линкор', 3: 'Крейсер', 2: 'Эсминец', 1: 'Катер' };

/* ============================================================
   КАРТЫ-АКВАТОРИИ
   Каждая партия играется на случайной карте: своя вода и
   свой вид островов. Острова генерируются заново на каждую
   партию и ОДИНАКОВЫЕ на обеих досках — честно.
   ============================================================ */
const MAPS = {
  tropics: {
    name: 'Тропики', isle: 'palm',
    waterTop: '#a9e8f4', waterBottom: '#5fc0dc',
    gridLine: 'rgba(16,90,120,.30)', frameLine: 'rgba(16,90,120,.55)',
    label: 'rgba(16,90,120,.85)',
    sand: '#f6e7b6', sandLine: '#d8b877'
  },
  lagoon: {
    name: 'Лагуна', isle: 'palm',
    waterTop: '#b9efdd', waterBottom: '#6cd2b4',
    gridLine: 'rgba(12,100,80,.30)', frameLine: 'rgba(12,100,80,.55)',
    label: 'rgba(12,100,80,.85)',
    sand: '#f8eec2', sandLine: '#d6bd7c'
  },
  rocks: {
    name: 'Скалы', isle: 'rock',
    waterTop: '#c9d9f6', waterBottom: '#8db1e6',
    gridLine: 'rgba(30,60,110,.30)', frameLine: 'rgba(30,60,110,.55)',
    label: 'rgba(30,60,110,.85)',
    sand: '#d9dcea', sandLine: '#a9aec6'
  }
};

/* генератор островов: count островков по 1–2 клетки,
   острова не слипаются между собой */
function genIslesC(n, count){
  const isles = [];
  const taken = new Set();
  let guard = 0;
  while (isles.length < count && guard++ < 600){
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * n);
    if (taken.has(r + ',' + c)) continue;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++)
      for (let dc = -2; dc <= 2 && !near; dc++)
        if (taken.has((r + dr) + ',' + (c + dc))) near = true;
    if (near) continue;
    const shape = [[r, c]];
    taken.add(r + ',' + c);
    if (Math.random() < .55){                 /* половина островов — двухклеточные */
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]]
        .filter(([dr, dc]) => inB(r + dr, n) && inB(c + dc, n) && !taken.has((r + dr) + ',' + (c + dc)));
      if (dirs.length){
        const [dr, dc] = rnd(dirs);
        shape.push([r + dr, c + dc]);
        taken.add((r + dr) + ',' + (c + dc));
      }
    }
    isles.push(shape);
  }
  return isles;
}

/* отрисовка одного острова: пляж, пальма или скалы */
function drawIsleC(g, cells, PAD, CELL, map){
  const xs = cells.map(p => p[1]), ys = cells.map(p => p[0]);
  const cx = PAD + (Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) / 2 + .5) * CELL;
  const cy = PAD + (Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) / 2 + .5) * CELL;
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * CELL;
  const h = (Math.max(...ys) - Math.min(...ys) + 1) * CELL;
  const u = CELL / 54;                        /* масштаб под размер клетки */

  /* прибой и песок */
  g.fillStyle = 'rgba(255,255,255,.4)';
  g.beginPath(); g.ellipse(cx, cy, w * .46, h * .44, 0, 0, 7); g.fill();
  g.fillStyle = map.sand; g.strokeStyle = map.sandLine; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(cx, cy, w * .36, h * .34, 0, 0, 7); g.fill(); g.stroke();

  if (map.isle === 'palm'){
    const px = cx + 3 * u, py = cy - 10 * u;          /* верхушка ствола */
    g.strokeStyle = '#8a5a34'; g.lineWidth = 2.4 * u; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 3 * u, cy + 5 * u);
    g.quadraticCurveTo(cx - 2 * u, cy - 4 * u, px, py);
    g.stroke();
    g.strokeStyle = '#2f9e63'; g.lineWidth = 2.6 * u;
    for (let i = 0; i < 5; i++){
      const a = -Math.PI / 2 + (i - 2) * .55;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a) * 9 * u, py + Math.sin(a) * 9 * u,
                         px + Math.cos(a) * 13 * u, py + Math.sin(a) * 13 * u + 3 * u);
      g.stroke();
    }
    g.fillStyle = '#7a4a26';
    g.beginPath(); g.arc(cx + 1.5 * u, cy - 8 * u, 1.8 * u, 0, 7); g.fill();
  } else {
    g.fillStyle = '#a9a4bd'; g.strokeStyle = '#6f6a86'; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(cx - 5 * u, cy + 3 * u, 9 * u, 6.5 * u, .3, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cx + 7 * u, cy - 3 * u, 7 * u, 5 * u, -.2, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath(); g.ellipse(cx - 7 * u, cy + 1 * u, 3.2 * u, 2 * u, .3, 0, 7); g.fill();
  }
}

/* ============================================================
   ГЛАВНОЕ МЕНЮ — режимы регистрируются в общий реестр CPT.
   Кнопки строит каркас (CPT.buildMenu), здесь только данные.
   ============================================================ */
const ICON_SCHOONER = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6 v24"/><path d="M25 9 C33 13 36 19 37 25 L25 25 Z" fill="rgba(245,196,81,.16)"/><path d="M23 12 C17 16 14 20 13 25 L23 25"/><path d="M8 31 h32 l-5 8 H13 Z" fill="rgba(73,216,207,.14)"/><path d="M4 43 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c2 -1 3 -1 4 0" opacity=".5"/></svg>';

const ICON_BATTLESHIP = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 32 h36 l-6 9 H12 Z" fill="rgba(245,196,81,.14)"/><path d="M13 32 v-7 h22 v7"/><rect x="17" y="19" width="14" height="6" rx="1.5"/><path d="M21 19 v-4 h6 v4"/><path d="M24 15 v-5"/><path d="M24 10 l7 2.5 -7 2.5 Z" fill="rgba(245,196,81,.5)"/><path d="M4 43 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c3 -2 5 -2 8 0 c3 2 5 2 8 0 c2 -1 3 -1 4 0" opacity=".5"/></svg>';

CPT.mode({
  id: 'easy',
  name: 'ПРОСТОЙ БОЙ',
  desc: '8×8 · острова · бот',
  icon: ICON_SCHOONER,
  start: function(){ startClassic('easy'); }
});

CPT.mode({
  id: 'hard',
  name: 'СЛОЖНЫЙ БОЙ',
  desc: '10×10 · острова · бот',
  icon: ICON_BATTLESHIP,
  start: function(){ startClassic('hard'); }
});

/* ---------------- судовой журнал: живые справки ----------------
   Справка = шапка (название + дата), подзаголовок, абзацы,
   которые всплывают по очереди, числа и концовка.
   Каркас при клике просто показывает текст, а этот обработчик
   (фаза перехвата) подменяет показ на журнал — index.html
   при этом не меняется. */
const LORE = {
  trafalgar: {
    title: 'Трафальгар',
    date: '21 октября 1805 года',
    sub: 'Атлантика · мыс Трафальгар · Британия против франко-испанского флота',
    paras: [
      'Эскадра адмирала Нельсона — <span class="lore-num">27</span> линейных кораблей — атаковала в двух колоннах, перпендикулярно строю, франко-испанский флот адмирала Вильнева (<span class="lore-num">33</span> корабля) у мыса Трафальгар.',
      'Пять часов боя — и <span class="lore-num">18</span> вражеских кораблей захвачены или уничтожены. Ни один британский корабль не потерян.',
      'Сам Нельсон погиб от пули мушкета в разгар боя, но победа отдала Британии господство на морях на столетие вперёд.'
    ],
    end: '⚓ сигнал Нельсона перед боем: «Англия ждёт, что каждый выполнит свой долг» ⚓'
  },
  sinop: {
    title: 'Синоп',
    date: '18 (30) ноября 1853 года',
    sub: 'Чёрное море · Синопская бухта · эскадра Нахимова против турецкой',
    paras: [
      'Эскадра вице-адмирала Нахимова — всего <span class="lore-num">6</span> линейных кораблей — подошла к Синопской бухте, где стояла турецкая эскадра Осман-паши.',
      'За три часа боя турки потеряли <span class="lore-num">7</span> фрегатов, <span class="lore-num">3</span> корвета и суда поменьше — около <span class="lore-num">3000</span> человек. Осман-паша попал в плен.',
      'Это последняя в истории великая битва парусных флотов: бомбические пушки Нахимова пробивали деревянные борта насквозь, и вскоре паруса уступили место пару и броне.'
    ],
    end: '⚓ после Синопа море изменилось навсегда: за парусами пришли пар и броня ⚓'
  },
  chesma: {
    title: 'Чесма',
    date: '5–7 июля 1770 года',
    sub: 'Эгейское море · Чесменская бухта · русская эскадра против османской',
    paras: [
      'Русская эскадра под флагом графа Алексея Орлова — около <span class="lore-num">9</span> линейных кораблей и фрегатов — заперла османский флот в Чесменской бухте: у турок было вдвое больше кораблей и пушек.',
      'Ночью в бухту пошли брандеры — суда, набитые горючим. Брандер лейтенанта Ильина закрепился прямо у османского флагмана и поджёг его.',
      'К утру османский флот сгорел: погибли почти все его линейные корабли и фрегаты. В честь Чесмы отлита знаменитая колонна в Царском Селе.'
    ],
    end: '⚓ знак Чесмы: берёт даже малый флот, если капитаны решительны ⚓'
  },
  lepanto: {
    title: 'Лепанто',
    date: '7 октября 1571 года',
    sub: 'Греция · залив Лепанто · Священная лига против османского флота',
    paras: [
      'У входа в залив встретились два огромных гребных флота: Священная лига — около <span class="lore-num">200</span> галер под флагом дона Хуана Австрийского — и османский флот Али-паши, почти <span class="lore-num">270</span> галер.',
      'Сошлись борт к борту: пушки, абордажные крючья, яростная давка галер. Центр сражения решил подрыв османского флагмана, а крылья лиги обошли противника с флангов.',
      'Победа остановила османское наступление в Средиземном море. Это была последняя великая битва гребных флотов: уже поднимала паруса эпоха парусов.'
    ],
    end: '⚓ на галере «Маркеса» сражался Мигель Сервантес — будущий автор «Дон Кихота» ⚓'
  }
};

function renderLore(def){
  const box = $('lore-box');
  if (!box) return;
  let html = '<div class="lore-head"><span class="lore-title">' + def.title + '</span>' +
             '<span class="lore-date">' + def.date + '</span></div>' +
             '<div class="lore-sub">' + def.sub + '</div>';
  for (const p of def.paras) html += '<p class="lore-para">' + p + '</p>';
  html += '<div class="lore-divider">' + def.end + '</div>';
  box.innerHTML = html;
  const closer = document.createElement('button');
  closer.type = 'button';
  closer.className = 'lore-close';
  closer.textContent = '✕ закрыть';
  closer.style.cssText = 'position:absolute;top:9px;right:10px;cursor:pointer;' +
    'font-family:inherit;background:#fff;color:#5f8299;font-weight:600;' +
    'border:1.5px solid #c6e4f2;border-radius:8px;font-size:11px;padding:3px 10px;';
  closer.addEventListener('click', () => box.classList.add('hidden'));
  box.appendChild(closer);
  box.classList.remove('hidden');
}

CPT.lore({ id: 'trafalgar', title: LORE.trafalgar.title, journal: LORE.trafalgar });
CPT.lore({ id: 'sinop', title: LORE.sinop.title, journal: LORE.sinop });
CPT.lore({ id: 'chesma', title: LORE.chesma.title, journal: LORE.chesma });
CPT.lore({ id: 'lepanto', title: LORE.lepanto.title, journal: LORE.lepanto });

document.addEventListener('click', e => {
  const btn = e.target.closest('.lore-btn');
  if (!btn) return;
  const def = CPT._lore.find(l => l.title === btn.textContent);
  if (!def || !def.journal) return;   // чужие справки без журнала живут по-старому
  e.stopImmediatePropagation();       // каркасу не даём затирать журнал плоским текстом
  renderLore(def.journal);
}, true);

$('btn-start').addEventListener('click', () => {
  const id = CPT._sel;
  if (!id) return;
  const def = CPT._modes.find(m => m.id === id);
  if (!def) return;
  $('lore-box').classList.add('hidden');
  def.start();
});

/* ============================================================
   ГЛАВНЫЙ ЦИКЛ (requestAnimationFrame)
   ============================================================ */
function masterFrame(t){
  const ts = t / 1000;
  if (activeScreen === 'game' && C) drawClassic(ts);
  if (activeScreen === 'boss' && typeof window.BossRender === 'function') window.BossRender(ts);
  /* художники из подключённых модулей (задел под «живые корабли»):
     чужая ошибка не уронит общий цикл */
  if (window.CPT && CPT._painters.length){
    for (let i = 0; i < CPT._painters.length; i++){
      try { CPT._painters[i](ts); } catch (err) { /* пропускаем сбойный кадр */ }
    }
  }
  requestAnimationFrame(masterFrame);
}
requestAnimationFrame(masterFrame);

/* ============================================================
   ДИНАМИЧЕСКИЕ ШТРИХИ — добавляются скриптом, style.css не
   трогаем: живой переворот доски (замах, отскок и всплеск
   воды), крупные стрелки направления торпеды и подсказка
   выбора карт. Пользователям с «меньше движения» оставляем
   спокойную версию из style.css.
   ============================================================ */
(function injectCptStyleC(){
  const st = document.createElement('style');
  st.textContent = [
    '@media (prefers-reduced-motion: no-preference){',
      '.boards:not([data-view="dual"])[data-turn="place"] .board-block.own,',
      '.boards:not([data-view="dual"])[data-turn="me"] .board-block.foe,',
      '.boards:not([data-view="dual"])[data-turn="foe"] .board-block.own',
      '{ animation:cptFlip 1.3s cubic-bezier(.34,1.2,.4,1) both; }',
      '@keyframes cptFlip{',
        '0%{ transform:perspective(1100px) rotateY(84deg) rotateZ(-3deg) scale(.86); opacity:0; }',
        '34%{ transform:perspective(1100px) rotateY(-13deg) rotateZ(1.4deg) scale(1.035); opacity:1; }',
        '58%{ transform:perspective(1100px) rotateY(7deg) rotateZ(-.5deg) scale(.995); }',
        '80%{ transform:perspective(1100px) rotateY(-2.6deg) scale(1); }',
        '100%{ transform:perspective(1100px) rotateY(0deg) scale(1); opacity:1; }',
      '}',
      '.board-block{ position:relative; }',
      '.board-block::after{ content:""; position:absolute; left:50%; top:50%;',
        'width:62%; aspect-ratio:1/1; transform:translate(-50%,-50%) scale(.12);',
        'border-radius:50%; pointer-events:none; opacity:0;',
        'background:radial-gradient(circle, rgba(255,255,255,0) 52%, rgba(255,255,255,.8) 62%, rgba(255,255,255,0) 70%); }',
      '.boards:not([data-view="dual"])[data-turn="place"] .board-block.own::after,',
      '.boards:not([data-view="dual"])[data-turn="me"] .board-block.foe::after,',
      '.boards:not([data-view="dual"])[data-turn="foe"] .board-block.own::after',
      '{ animation:cptSplash 1.05s ease-out .1s both; }',
      '@keyframes cptSplash{',
        '0%{ opacity:.85; transform:translate(-50%,-50%) scale(.12); }',
        '70%{ opacity:.35; }',
        '100%{ opacity:0; transform:translate(-50%,-50%) scale(1.7); }',
      '}',
    '}',
    '.cards-hint{ flex-basis:100%; text-align:center; font-weight:800;',
      'letter-spacing:1.5px; font-size:12px; text-transform:uppercase; color:#b3541e; }',
    '#torp-prompt-c{ font-size:15px; padding:10px 16px; }',
    '#torp-prompt-c .btn-small{ font-size:20px; padding:8px 18px; min-width:56px;',
      'min-height:46px; line-height:1; border-radius:14px; }'
  ].join('\n');
  document.head.appendChild(st);
})();

/* ---------------- самопроверка сборки ----------------
   Файлы собираются вручную: забытый тег в index.html, не тот
   порядок или файл «*.js.txt» — в меню появится красная
   плашка с именем потерявшегося файла. */
window.addEventListener('load', function(){
  const crew = [
    ['game_cards.js',   ['buildCardsPanelC', 'fireTorpedoC']],
    ['game_battle.js',  ['startClassic', 'playerFire']],
    ['game_bot.js',     ['botMove']],
    ['game_draw.js',    ['drawClassic', 'drawShipSpriteC']],
    ['game_fx.js',      ['drawFxC', 'drawShellC']],
    ['kraken_boss.js',    ['startKrakenBoss', 'krakenTurn']],
    ['kraken_attacks.js', ['krakenAttack', 'bossShot']],
    ['kraken_body.js',    ['drawKraken']],
    ['kraken_render.js',  []],     /* BossRender проверяем отдельно */
    ['map_gen.js',        ['mapGenerate', 'mapLoad']],
    ['map_mode.js',       ['startMapMode']],
    ['map_dice.js',       ['mapDiceRoll']]
  ];
  const lost = crew.filter(r => !r[1].every(fn => typeof window[fn] === 'function')).map(r => r[0]);
  if (typeof window.BossRender !== 'function') lost.push('kraken_render.js');
  if (!window.CPT || !window.CPT.TG) lost.push('cpt_tg.js');
  if (!lost.length) return;                    /* экипаж в сборе — тихо */
  console.warn('Капитаны Островов: не подключены —', lost.join(', '));
  const ml = document.getElementById('modes-list');
  if (!ml) return;
  const warn = document.createElement('div');
  warn.className = 'crew-warn';
  warn.style.cssText = 'margin:10px 0;padding:10px 14px;border:2px solid #e05656;' +
    'border-radius:12px;background:rgba(224,86,86,.12);color:#ffb3b3;font-size:13px;font-weight:600;';
  warn.textContent = 'Потерялись файлы: ' + lost.join(', ') +
    '. Проверь низ index.html (порядок скриптов) и что файлы не сохранились как «*.js.txt».';
  ml.parentNode.insertBefore(warn, ml);
});
