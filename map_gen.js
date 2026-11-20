'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_gen.js
   ГЕНЕРАТОР КАРТЫ-ПОХОДА (этап 1: болванка).
   Гибрид по решению Егора: боссовые гнёзда и родной порт
   всегда на своих местах, остальные 21 кусок — полная колода
   (8 островов, 5 сундуков, 3 шторма, 5 отмелей), тасуется
   заново на каждый поход по seed. Seed и состояние похода
   хранятся в localStorage:
   закрыл игру — продолжил с того же места (mapSave/mapLoad).
   Отрисовка и режим — в map_mode.js; бои на островах и боссы
   в море — этапы 2 и 3 (поля field/lvl уже готовят почву).
   ============================================================ */

const MAP_KEY_SAVE = 'cpt-map-v1';
const MAP_COLS = 6, MAP_ROWS = 4;
const MAP_W = 900, MAP_H = 520;
const CHUNK_W = MAP_W / MAP_COLS, CHUNK_H = MAP_H / MAP_ROWS;

const ISLE_NAMES = [
  'Остров Скелетов', 'Бухта Рифов', 'Мыс Попутного Ветра',
  'Пальмовый берег', 'Остров Крабов', 'Скалистый клык',
  'Тихая гавань', 'Остров Попугая'
];
const CARD_NAMES_MAP = ['Радар', 'Щит', 'Торпеда', 'Дым', 'Залп', 'Ремонт'];

/* ---------------- seeded ГПСЧ ----------------
   Карта одного seed всегда одинаковая — поэтому сохранение
   хранит только seed и пометки, а узлы восстанавливаются. */
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* расстояние от порта в кусках (порт — левый нижний угол):
   по нему этап 2 назначит размер поля и уровень бота */
function mapDist(col, row){
  return col + (MAP_ROWS - 1 - row);
}

/* узел внутри своего куска: небольшие блуждания, чтобы карта
   не выглядела сеткой */
function mapNode(kind, col, row, R, extra){
  const x = col * CHUNK_W + CHUNK_W * (0.3 + R() * 0.4);
  const y = row * CHUNK_H + CHUNK_H * (0.32 + R() * 0.36);
  return Object.assign({ kind, x, y }, extra || {});
}

/* ============================================================
   ГЕНЕРАЦИЯ ПОХОДА — ПОЛНАЯ КАРТА (решение Егора)
   Фиксированные места: порт (0,3), Гнездо Кракена (5,0),
   Падь Левиафана (2,0). Остальные 21 кусок добирает колода:
   8 островов (все имена), 5 сундуков, 3 шторма, 5 отмелей —
   пустого моря между кусками не остаётся. Порядок — по seed.
   ============================================================ */
function mapGenerate(seed){
  const R = mulberry32(seed);
  const nodes = [];

  nodes.push({ kind: 'port', x: CHUNK_W * 0.5, y: MAP_H - CHUNK_H * 0.5,
               name: 'Родной порт' });
  nodes.push({ kind: 'boss', boss: 'kraken',
               x: MAP_W - CHUNK_W * 0.5, y: CHUNK_H * 0.5,
               name: 'Гнездо Кракена' });
  nodes.push({ kind: 'boss', boss: 'leviathan',
               x: CHUNK_W * 2.5, y: CHUNK_H * 0.45,
               name: 'Падь Левиафана' });

  /* колода свободных кусков: тасуем Фишером—Йетсом по seed */
  const deck = [];
  for (let i = 0; i < 8; i++) deck.push('isle');
  for (let i = 0; i < 5; i++) deck.push('chest');
  for (let i = 0; i < 3; i++) deck.push('storm');
  for (let i = 0; i < 5; i++) deck.push('shallow');
  for (let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(R() * (i + 1));
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }

  const names = ISLE_NAMES.slice();          /* имена без повторов */
  let di = 0;
  for (let row = 0; row < MAP_ROWS; row++){
    for (let col = 0; col < MAP_COLS; col++){
      const fixed = (row === MAP_ROWS - 1 && col === 0) ||
                    (row === 0 && col === MAP_COLS - 1) ||
                    (row === 0 && col === 2);
      if (fixed) continue;
      const kind = deck[di++];
      const dist = mapDist(col, row);
      if (kind === 'isle'){
        nodes.push(mapNode('isle', col, row, R, {
          name: names.splice(Math.floor(R() * names.length), 1)[0] || 'Безымянный клочок суши',
          cells: R() < 0.4 ? 2 : 1,              /* 1 или 2 клетки острова */
          field: dist <= 3 ? 'easy' : 'hard',     /* этап 2: 8×8 или 10×10 */
          lvl: 1 + Math.floor(dist / 3),          /* этап 2: уровень бота  */
          done: false
        }));
      } else if (kind === 'chest'){
        const t = R();
        nodes.push(mapNode('chest', col, row, R, {
          type: t < 0.45 ? 'card' : t < 0.75 ? 'repair' : 'gold',
          opened: false
        }));
      } else if (kind === 'storm'){
        nodes.push(mapNode('storm', col, row, R, { heavy: R() < 0.5 }));
      } else {
        nodes.push(mapNode('shallow', col, row, R, {}));
      }
    }
  }

  /* ЭТАП 5: класс сундука — медь/серебро/золото. Броски ГПСЧ идут
     ПОСЛЕ раскладки колоды: прежние броски не сдвигаются, позиции
     узлов и старые сейвы остаются прежними. Тир восстанавливается
     из seed при каждой загрузке — в сейв его писать не нужно. */
  nodes.forEach(n => {
    if (n.kind !== 'chest') return;
    const tr = R();
    n.tier = tr < 0.5 ? 0 : tr < 0.85 ? 1 : 2;   /* 50% медь · 35% серебро · 15% золото */
  });
  return { seed, W: MAP_W, H: MAP_H, nodes };
}

/* ---------------- сохранение похода ----------------
   Храним только малое: seed, место корабля, трюм и пометки
   «сундук открыт». Карта восстанавливается из seed. */
function mapSave(M){
  try {
    const opened = {};
    M.nodes.forEach(n => { if (n.kind === 'chest' && n.opened) opened[n.x + ',' + n.y] = 1; });
    const done = {};
    /* этап 3: в done попадают и гнёзда боссов — иначе после победы
       над Кракеном гнездо открывается заново и трофей можно фармить */
    M.nodes.forEach(n => { if ((n.kind === 'isle' || n.kind === 'boss') && n.done) done[n.x + ',' + n.y] = 1; });
    localStorage.setItem(MAP_KEY_SAVE, JSON.stringify({
      seed: M.seed,
      ship: { x: M.ship.x, y: M.ship.y },
      inv: M.inv,
      day: M.day || 1,          /* этап 4: «День N» плавания — для журнала */
      sea: M.sea || null,       /* этап 5: блуждающий корсар (позиция и остывание) */
      opened, done
    }));
  } catch (err) { /* приватный режим — играем без сохранения */ }
}

function mapLoad(){
  try {
    const raw = localStorage.getItem(MAP_KEY_SAVE);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.seed !== 'number' || !s.ship) return null;
    const M = mapGenerate(s.seed);
    /* курс, пена и цель не сохраняются — даём дефолты, иначе NaN */
    M.ship = Object.assign({ a: 0, goal: null, tx: 0, ty: 0, foam: [] }, s.ship);
    M.day = s.day || 1;         /* этап 4: день плавания (старые сейвы — день 1) */
    M.inv = Object.assign({ gold: 0, repair: 2, cards: [] }, s.inv || {});
    /* этап 3: части ключа/карты в старых сейвах отсутствуют */
    M.inv.parts = Object.assign({ key: 0, map: 0 }, (s.inv && s.inv.parts) || {});
    M.sea = s.sea || null;           /* этап 5: корсар; в старых сейвах появится сам */
    if (M.inv.vaultOpen && typeof insertVaultNode === 'function') insertVaultNode(M);
    const key = n => n.x + ',' + n.y;
    M.nodes.forEach(n => {
      if (n.kind === 'chest' && s.opened && s.opened[key(n)]) n.opened = true;
      if ((n.kind === 'isle' || n.kind === 'boss') && s.done && s.done[key(n)]) n.done = true;
    });
    return M;
  } catch (err) { return null; }
}

function mapForget(){
  try { localStorage.removeItem(MAP_KEY_SAVE); } catch (err) {}
}

/* ---------------- Скрытая лагуна (новая локация за КЛЮЧ 3/3) ----------------
   Узел-остров с крупным трофеем (лут в map_battle.js). Ставим
   у правого нижнего края; если там кто-то стоит — сдвигаем
   влево, пока вода не освободится. Позиция детерминирована:
   после загрузки сейва узел встаёт на то же место. */
function insertVaultNode(M){
  if (M.nodes.some(n => n.vault)) return;
  const free = (x, y) => !(x > 700 && y > 400) &&          /* не под кнопкой «Кости» */
    !M.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 84);
  let best = null;
  outer:                                            /* от правого низа — влево, рядами вверх */
  for (let y = MAP_H - 60; y >= 60 && !best; y -= 46){
    for (let x = MAP_W - 70; x >= 70; x -= 74){
      if (free(x, y)){ best = [x, y]; break; }
    }
  }
  if (!best){                                       /* запасной: самое дальнее от всех место */
    let bd = -1;
    for (let x = 70; x <= MAP_W - 70; x += 37)
      for (let y = 60; y <= MAP_H - 60; y += 46){
        let d = 1e9;
        for (const n of M.nodes) d = Math.min(d, Math.hypot(n.x - x, n.y - y));
        if (d > bd){ bd = d; best = [x, y]; }
      }
  }
  M.nodes.push({ kind: 'isle', vault: true, x: best[0], y: best[1],
                 name: 'Скрытая лагуна', cells: 2, field: 'hard', lvl: 3, done: false });
}
