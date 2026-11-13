/* ============================================================
   МИР ПО КУСОЧКАМ — данные пазлов
   8 миров · 24 пазла · истории · инструкции для озвучки
   15 пазлов из второй версии + Гонки (3) + Космос (3) + Море (3)
   ============================================================ */

export interface PuzzlePalette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  ground: string;
  outline: string;
  outlineSoft: string;
}

export interface PuzzleDef {
  id: string;
  sceneId: string;
  name: string;
  icon: string;
  bg: string;
  instruction: string;
  story: string;
  fact: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  colorSoft: string;
  bg: string;
  puzzles: PuzzleDef[];
}

/* ---------- Общие палитры ---------- */

const PAL_DAY: PuzzlePalette = {
  skyTop: '#aee9f7',
  skyBottom: '#fdf3d8',
  sun: '#ffd43b',
  hillFar: '#9be3a8',
  hillMid: '#63cf7d',
  hillNear: '#3fae63',
  ground: '#8ed36a',
  outline: 'rgba(45,52,54,0.55)',
  outlineSoft: 'rgba(45,52,54,0.30)',
};

const PAL_WARM: PuzzlePalette = {
  skyTop: '#ffe3b3',
  skyBottom: '#ffd0c2',
  sun: '#ff9f43',
  hillFar: '#d4a5a5',
  hillMid: '#c38d9d',
  hillNear: '#9d6b7b',
  ground: '#e2b98f',
  outline: 'rgba(74,35,35,0.55)',
  outlineSoft: 'rgba(74,35,35,0.30)',
};

const PAL_JUNGLE: PuzzlePalette = {
  skyTop: '#c9f2d0',
  skyBottom: '#f4ffd6',
  sun: '#ffe066',
  hillFar: '#7cc98f',
  hillMid: '#4fae70',
  hillNear: '#2e8b57',
  ground: '#67b26f',
  outline: 'rgba(26,61,46,0.55)',
  outlineSoft: 'rgba(26,61,46,0.30)',
};

const PAL_SPACE: PuzzlePalette = {
  skyTop: '#1b2a5e',
  skyBottom: '#3c2a6e',
  sun: '#fff3bf',
  hillFar: '#4b3f8f',
  hillMid: '#5d4fa8',
  hillNear: '#6f5ec0',
  ground: '#b9a7e8',
  outline: 'rgba(10,10,40,0.60)',
  outlineSoft: 'rgba(10,10,40,0.35)',
};

const PAL_SEA: PuzzlePalette = {
  skyTop: '#7fd8f7',
  skyBottom: '#c9f2fb',
  sun: '#ffe066',
  hillFar: '#4bc0d9',
  hillMid: '#2fa8c7',
  hillNear: '#1f8fae',
  ground: '#f7e8b5',
  outline: 'rgba(10,60,80,0.55)',
  outlineSoft: 'rgba(10,60,80,0.30)',
};

const PAL_SNOW: PuzzlePalette = {
  skyTop: '#cfe8ff',
  skyBottom: '#f2f9ff',
  sun: '#ffd43b',
  hillFar: '#e8f1fb',
  hillMid: '#c9d9ec',
  hillNear: '#a9bed6',
  ground: '#ffffff',
  outline: 'rgba(40,60,90,0.50)',
  outlineSoft: 'rgba(40,60,90,0.28)',
};

const PAL_CITY: PuzzlePalette = {
  skyTop: '#bfe3f2',
  skyBottom: '#fdf0d5',
  sun: '#ffb84d',
  hillFar: '#b8c4d4',
  hillMid: '#93a5bc',
  hillNear: '#6f8399',
  ground: '#c9b391',
  outline: 'rgba(50,45,35,0.55)',
  outlineSoft: 'rgba(50,45,35,0.30)',
};

/* ---------- ПАЗЛЫ ---------- */

/* Мир 1: Поезд — все 3 пазла из второй версии */
const TRAIN_PUZZLES: PuzzleDef[] = [
  {
    id: 'train-steam',
    sceneId: 'steam-locomotive',
    name: 'Паровозик',
    icon: '🚂',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    instruction: 'Собери паровозик! Поставь детали на свои места.',
    story: 'Пых-пых! Старый добрый паровозик снова едет по рельсам. Он везёт пассажиров к морю и весь путь весело трубит в гудок: ту-ту!',
    fact: 'Паровоз едет за счёт пара: вода в котле закипает, и пар толкает колёса вперёд!',
  },
  {
    id: 'train-fast',
    sceneId: 'speed-train',
    name: 'Скоростной поезд',
    icon: '🚄',
    bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    instruction: 'Собери скоростной поезд! Найди место для всех деталей.',
    story: 'Ух, быстрее ветра! Скоростной поезд мчится между горами. Пассажиры смотрят в окно, а за окном мелькают поля и тоннели!',
    fact: 'Самый быстрый поезд в мире разгоняется быстрее гоночного автомобиля — до 600 километров в час!',
  },
  {
    id: 'train-cargo',
    sceneId: 'cargo-train',
    name: 'Грузовой поезд',
    icon: '🚃',
    bg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    instruction: 'Собери грузовой поезд! Поставь тяжёлые вагоны.',
    story: 'Тяжело! Грузовой поезд везёт брёвна и ящики через всю страну. Много вагонов — много работы, но мощный локомотив справится!',
    fact: 'Самый длинный грузовой поезд тянул за собой 682 вагона — почти как маленький город!',
  },
];

/* Мир 2: Гонки — НОВЫЙ (по просьбе игрока: разные гоночные машины) */
const RACE_PUZZLES: PuzzleDef[] = [
  {
    id: 'race-formula',
    sceneId: 'formula-car',
    name: 'Формула',
    icon: '🏎️',
    bg: 'linear-gradient(135deg, #ffe066 0%, #ff922b 100%)',
    instruction: 'Собери гоночную формулу! Она самая быстрая.',
    story: 'Вжжух! Красный болид сходит с места, только мигнул зелёный свет! Ветер свистит в шлеме пилота, мотор поёт на всю трассу — а на финише уже машет клетчатый флаг!',
    fact: 'Болид Формулы-1 разгоняется до 350 километров в час — быстрее, чем гепард!',
  },
  {
    id: 'race-rally',
    sceneId: 'rally-car',
    name: 'Ралли-джип',
    icon: '🚙',
    bg: 'linear-gradient(135deg, #d8f5a2 0%, #82c91e 100%)',
    instruction: 'Собери ралли-джип! Он летит по грязной дороге.',
    story: 'Бр-р-р! Синий джип прыгает на кочках, обгоняет всех на повороте и летит через трамплин! Из-под колёс летят брызги грязи, а люстра на крыше освещает путь!',
    fact: 'В ралли машину ведут двое: пилот рулит, а штурман читает карту вслух!',
  },
  {
    id: 'race-kart',
    sceneId: 'kart',
    name: 'Картинг',
    icon: '🏁',
    bg: 'linear-gradient(135deg, #a5d8ff 0%, #ffe066 100%)',
    instruction: 'Собери картинг! Маленькая, а шустрая!',
    story: 'Вжик-вжик! Маленький карт юрко ныряет в повороты — все большие машины остались позади! Пилот в розовом шлеме смеётся: гонка — это весело!',
    fact: 'Все великие гонщики начинали с карта — маленькой машины для больших побед!',
  },
];

/* Мир 3: Стройка — все 3 пазла из второй версии */
const CONSTRUCTION_PUZZLES: PuzzleDef[] = [
  {
    id: 'build-house',
    sceneId: 'house-build',
    name: 'Стройка дома',
    icon: '🏠',
    bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    instruction: 'Построй дом! Поставь стены и крышу.',
    story: 'Тук-тук, стук-стук! Дом почти готов: стены стоят, крыша красная, окошко блестит. Скоро сюда переедет весёлая семья!',
    fact: 'Краны на стройке выше десяти слонов, поставленных друг на друга!',
  },
  {
    id: 'build-excavator',
    sceneId: 'excavator',
    name: 'Экскаватор',
    icon: '🚜',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    instruction: 'Собери экскаватор! Он копает землю.',
    story: 'Р-р-р! Жёлтый экскаватор копает большой котлован. Черпак зачерпнул полную землю — и сразу выгрузил в кузов грузовика!',
    fact: 'Один экскаватор за день копает столько земли, сколько тысяча человек лопатами!',
  },
  {
    id: 'build-crane',
    sceneId: 'crane-blocks',
    name: 'Кран и блоки',
    icon: '🏗️',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    instruction: 'Поставь кран и подними блоки на высоту.',
    story: 'Вжжжух! Подъёмный кран поднимает блоки на самый верх небоскрёба. Аккуратно, не спеша — и новый этаж готов!',
    fact: 'Строительный кран сам растёт вместе с домом — строители добавляют ему новые секции!',
  },
];

/* Мир 3: Земля — все 3 пазла из второй версии */
const EARTH_PUZZLES: PuzzleDef[] = [
  {
    id: 'earth-planet',
    sceneId: 'planet-earth',
    name: 'Планета',
    icon: '🌍',
    bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    instruction: 'Собери планету Земля!',
    story: 'Вот она — наша Земля! Голубые океаны, зелёные леса, белые облака. Наш дом летит в космосе и кружится вокруг солнца.',
    fact: 'Земля — единственная известная планета, где живут коты, собаки, деревья... и ты!',
  },
  {
    id: 'earth-volcano',
    sceneId: 'volcano',
    name: 'Вулкан',
    icon: '🌋',
    bg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    instruction: 'Собери вулкан! Он проснулся.',
    story: 'Гром! Вулкан проснулся и пускает дым. Из жерла течёт тёплая оранжевая лава, а вокруг всё светится от заката.',
    fact: 'Лава — это расплавленный камень. Когда она остывает, становится твёрдой, как чёрный хлеб!',
  },
  {
    id: 'earth-mountains',
    sceneId: 'mountains',
    name: 'Горы',
    icon: '🏔️',
    bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    instruction: 'Собери горы! Высокие вершины и снег.',
    story: 'Высоко-высоко! Горы упираются вершинами в облака. На макушках лежит снег, а внизу шумит зелёный лес.',
    fact: 'Самая высокая гора — Эверест. На её вершину поместилось бы семь Эйфелевых башен, поставленных одна на другую!',
  },
];

/* Мир 4: Животные — все 3 пазла из второй версии */
const ANIMALS_PUZZLES: PuzzleDef[] = [
  {
    id: 'animal-bear',
    sceneId: 'bear',
    name: 'Мишка',
    icon: '🐻',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    instruction: 'Собери мишку! Поставь голову и лапы.',
    story: 'Мишка проснулся в лесу и потянулся. Он нашёл сладкую малину и теперь сидит на пенёчке, угощается и машет тебе лапой!',
    fact: 'Медведь зимой спит в берлоге до самой весны — вот это сладкий сон!',
  },
  {
    id: 'animal-bunny',
    sceneId: 'bunny',
    name: 'Зайка',
    icon: '🐰',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    instruction: 'Собери зайку! У него длинные ушки.',
    story: 'Прыг-скок! Зайка скачет по лужайке между ромашками. Ушки слышат всё вокруг, а носик нюхает сладкую морковку!',
    fact: 'У зайца глаза смотрят в разные стороны: он видит почти всё вокруг себя, даже не поворачивая головы!',
  },
  {
    id: 'animal-cat',
    sceneId: 'cat',
    name: 'Котик',
    icon: '🐱',
    bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    instruction: 'Собери котика! Поставь его и клубок.',
    story: 'Мур-мур-мур! Котик играет с клубком ниток: толкнёт лапкой — и клубок покатился! Потом потянется и снова мурлычет.',
    fact: 'Коты мурлычат не только от радости, но и когда успокаиваются — как песенка себе!',
  },
];

/* Мир 5: Динозавры — все 3 пазла из второй версии */
const DINOS_PUZZLES: PuzzleDef[] = [
  {
    id: 'dino-diplodocus',
    sceneId: 'diplodocus',
    name: 'Диплодок',
    icon: '🦕',
    bg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    instruction: 'Собери диплодока! У него длинная шея.',
    story: 'Диплодок — добрый великан! Он достаёт листья с самых высоких деревьев своим длинным-предлинным хвостом-шеей и жуёт не спеша.',
    fact: 'Диплодок был длиннее автобуса — почти 25 метров от носа до кончика хвоста!',
  },
  {
    id: 'dino-trex',
    sceneId: 'trex',
    name: 'Тираннозавр',
    icon: '🦖',
    bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    instruction: 'Собери тираннозавра! Он самый сильный.',
    story: 'Р-р-р! Тираннозавр — царь динозавров. Большие зубы, крепкие лапы и громкий рык на весь лес. Но сегодня он просто гуляет!',
    fact: 'Зубы тираннозавра были размером с банан — самый большой зуб среди всех хищников на суше!',
  },
  {
    id: 'dino-triceratops',
    sceneId: 'triceratops',
    name: 'Трицератопс',
    icon: '🦕',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    instruction: 'Собери трицератопса! У него три рога.',
    story: 'Трицератопс щиплет траву, как огромный носорог. Три рога и большой воротник защищают его от всех, кто придёт слишком близко!',
    fact: 'Воротник трицератопса менял цвет, когда он радовался — как светофор настроения!',
  },
];

/* Мир 6: Космос — НОВЫЙ (был в списке первой версии) */
const SPACE_PUZZLES: PuzzleDef[] = [
  {
    id: 'space-rocket',
    sceneId: 'rocket',
    name: 'Ракета',
    icon: '🚀',
    bg: 'linear-gradient(135deg, #1b2a5e 0%, #3c2a6e 100%)',
    instruction: 'Собери ракету! Полетим к звёздам.',
    story: 'Три... два... один... Пуск! Ракета вылетает в тёмно-синий космос среди звёзд. Позади огненный хвост, впереди — другие миры!',
    fact: 'Чтобы улететь в космос, ракета разгоняется быстрее звука — почти 8 километров за секунду!',
  },
  {
    id: 'space-planets',
    sceneId: 'saturn-planets',
    name: 'Планеты',
    icon: '🪐',
    bg: 'linear-gradient(135deg, #241a4f 0%, #4a2b6b 100%)',
    instruction: 'Собери планеты! Сатурн с кольцами.',
    story: 'Сатурн носит кольцо из льда и камней, Марс красный как клубника, а рядом светится маленькая голубая планета. Космос — большой красочный дом!',
    fact: 'У Сатурна столько лун, что хватит на всю ладошку пальцев — и ещё двадцать сверху!',
  },
  {
    id: 'space-rover',
    sceneId: 'moon-rover',
    name: 'Луноход',
    icon: '🛰️',
    bg: 'linear-gradient(135deg, #2a2a4a 0%, #55507a 100%)',
    instruction: 'Собери луноход! Он едет по Луне.',
    story: 'Тишина... Луноход медленно едет по серой лунной пыли, рассматривает камни и отправляет фотографии на Землю. Здесь шаги звучат как прыжки!',
    fact: 'На Луне всё весит в шесть раз меньше: если ты там прыгнешь — улетишь выше, чем с батута!',
  },
];

/* Мир 7: Море — НОВЫЙ (бонус) */
const SEA_PUZZLES: PuzzleDef[] = [
  {
    id: 'sea-fish',
    sceneId: 'clownfish',
    name: 'Рыбка',
    icon: '🐠',
    bg: 'linear-gradient(135deg, #7fd8f7 0%, #c9f2fb 100%)',
    instruction: 'Собери рыбку! Она плавает среди кораллов.',
    story: 'Буль-буль! Полосатая рыбка ныряет между кораллами и пускает пузырики. Рядом качается зелёная травка и светит солнце сквозь воду.',
    fact: 'Рыбы спят с открытыми глазами — им мешают веки, точнее их отсутствие!',
  },
  {
    id: 'sea-boat',
    sceneId: 'sailboat',
    name: 'Кораблик',
    icon: '⛵',
    bg: 'linear-gradient(135deg, #aee9f7 0%, #fef9d7 100%)',
    instruction: 'Собери кораблик! Он плывёт по волнам.',
    story: 'Белый кораблик с красным флажком плывёт по синим волнам. Ветер надувает паруса, а чайки кружат над мачтой!',
    fact: 'Парусник едет без бензина — его всю дорогу толкает сам ветер!',
  },
  {
    id: 'sea-octopus',
    sceneId: 'octopus',
    name: 'Осьминог',
    icon: '🐙',
    bg: 'linear-gradient(135deg, #c9b6f7 0%, #bde4f4 100%)',
    instruction: 'Собери осьминога! У него восемь щупалец.',
    story: 'Привет от осьминога! Он фиолетовый, весёлый, и у него восемь ножек — сразу всеми машет тебе: пока-пока! А ещё он умеет менять цвет.',
    fact: 'У осьминога три сердца и голубая кровь — настоящий морской волшебник!',
  },
];

/* ---------- МИРЫ ---------- */

export const THEMES: ThemeDef[] = [
  {
    id: 'train',
    name: 'Поезд',
    icon: '🚂',
    color: '#e8590c',
    colorSoft: '#ffe8cc',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    puzzles: TRAIN_PUZZLES,
  },
  {
    id: 'race',
    name: 'Гонки',
    icon: '🏎️',
    color: '#e03131',
    colorSoft: '#ffe3e3',
    bg: 'linear-gradient(135deg, #ffe066 0%, #ff922b 100%)',
    puzzles: RACE_PUZZLES,
  },
  {
    id: 'construction',
    name: 'Стройка',
    icon: '🚜',
    color: '#f08c00',
    colorSoft: '#fff3bf',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    puzzles: CONSTRUCTION_PUZZLES,
  },
  {
    id: 'earth',
    name: 'Земля',
    icon: '🌍',
    color: '#2f9e44',
    colorSoft: '#d3f9d8',
    bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    puzzles: EARTH_PUZZLES,
  },
  {
    id: 'animals',
    name: 'Животные',
    icon: '🐶',
    color: '#e64980',
    colorSoft: '#ffdeeb',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
    puzzles: ANIMALS_PUZZLES,
  },
  {
    id: 'dinos',
    name: 'Динозавры',
    icon: '🦕',
    color: '#5f3dc4',
    colorSoft: '#e5dbff',
    bg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    puzzles: DINOS_PUZZLES,
  },
  {
    id: 'space',
    name: 'Космос',
    icon: '🚀',
    color: '#6741d9',
    colorSoft: '#ddebf8',
    bg: 'linear-gradient(135deg, #1b2a5e 0%, #3c2a6e 100%)',
    puzzles: SPACE_PUZZLES,
  },
  {
    id: 'sea',
    name: 'Море',
    icon: '🐙',
    color: '#0c8599',
    colorSoft: '#c5f6fa',
    bg: 'linear-gradient(135deg, #7fd8f7 0%, #c9f2fb 100%)',
    puzzles: SEA_PUZZLES,
  },
];

/* ---------- Уровни сложности ---------- */

export interface DifficultyLevel {
  pieces: number;
  cols: number;
  rows: number;
  label: string;
  hint: string;
}

export const DIFFICULTIES: DifficultyLevel[] = [
  { pieces: 6, cols: 3, rows: 2, label: '6', hint: 'Начинаем' },
  { pieces: 12, cols: 4, rows: 3, label: '12', hint: 'Умею' },
  { pieces: 24, cols: 6, rows: 4, label: '24', hint: 'Мастер' },
  { pieces: 48, cols: 8, rows: 6, label: '48', hint: 'Эксперт' },
];

/* ---------- Поиск ---------- */

export function findTheme(themeId: string): ThemeDef | undefined {
  return THEMES.find((t) => t.id === themeId);
}

export function findPuzzle(themeId: string, puzzleId: string): { theme: ThemeDef; puzzle: PuzzleDef; index: number } | undefined {
  const theme = findTheme(themeId);
  if (!theme) return undefined;
  const index = theme.puzzles.findIndex((p) => p.id === puzzleId);
  if (index < 0) return undefined;
  return { theme, puzzle: theme.puzzles[index], index };
}

export function paletteForScene(sceneId: string): PuzzlePalette {
  if (sceneId === 'rocket' || sceneId === 'saturn-planets' || sceneId === 'moon-rover') return PAL_SPACE;
  if (sceneId === 'clownfish' || sceneId === 'octopus') return PAL_SEA;
  if (sceneId === 'sailboat') return PAL_DAY;
  if (sceneId === 'mountains') return PAL_SNOW;
  if (sceneId === 'house-build' || sceneId === 'crane-blocks' || sceneId === 'excavator') return PAL_CITY;
  if (sceneId === 'volcano') return PAL_WARM;
  if (sceneId === 'diplodocus' || sceneId === 'trex' || sceneId === 'triceratops') return PAL_JUNGLE;
  if (sceneId === 'bear' || sceneId === 'bunny' || sceneId === 'cat') return PAL_DAY;
  if (sceneId === 'planet-earth') return PAL_DAY;
  if (sceneId === 'cargo-train') return PAL_WARM;
  if (sceneId === 'formula-car') return PAL_WARM;
  if (sceneId === 'rally-car') return PAL_JUNGLE;
  if (sceneId === 'kart') return PAL_DAY;
  return PAL_DAY;
}

export const TOTAL_PUZZLES = THEMES.reduce((sum, t) => sum + t.puzzles.length, 0);

export const GAME_TITLE = 'Мир по кусочкам';
export const GAME_SLOGAN = 'Собирай · Исследуй · Удивляйся';
export const GAME_MOTTO = 'Каждый кусочек — маленькое открытие';

/* Версия игры. Меняется при каждом обновлении — по ней игроки
   видят плашку «Появилось обновление!» на главном экране. */
export const APP_VERSION = '1.6';
