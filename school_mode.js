'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — school_mode.js  (v2.2)
   ШКОЛА ЮНГИ — режим-обучение: три коротких урока простыми
   словами (морской бой, поход по карте, бой с другом).
   Экран строится скриптом по образцу лобби дуэли (net_link.js),
   index.html и style.css не трогаем (R9/R11).
   Урок: список шагов, кнопки «Дальше/Назад», галочка за урок.
   Все три урока → диплом юнги + запись в судовой журнал
   (cpt-hall-v1, переживает сброс похода). Сейв школы —
   cpt-school-v1. Подключать ПОСЛЕДНИМ в index.html.
   ============================================================ */

const SCHOOL_KEY = 'cpt-school-v1';
let school = null;

function schoolLoad(){
  if (school) return school;
  try {
    school = JSON.parse(localStorage.getItem(SCHOOL_KEY) || '{}') || {};
  } catch (err) { school = {}; }
  if (typeof school !== 'object') school = {};
  school.done = school.done || {};
  return school;
}

function schoolSave(){
  try { localStorage.setItem(SCHOOL_KEY, JSON.stringify(schoolLoad())); }
  catch (err) { /* приватный режим — школа без сохранения */ }
}

function schoolAllDone(){
  const s = schoolLoad();
  return LESSONS.every(l => s.done[l.id]);
}

const ICON_SCHOOL = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 8 h13 l4 4 v28 l-4 -4 H10 Z" fill="rgba(245,196,81,.16)"/><path d="M38 8 H27 l-4 4 v28 l4 -4 h11 Z" fill="rgba(73,216,207,.14)"/><path d="M15 16 h5 M15 21 h5 M28 16 h5 M28 21 h5"/><path d="M24 27 v8"/><path d="M20.5 30 h7"/><path d="M18 34 a6.5 6.5 0 0 0 12 0"/></svg>';

/* ---------------- уроки: один шаг = одна мысль ---------------- */
const LESSONS = [
  {
    id: 'l1', title: 'Урок 1 · Морской бой',
    steps: [
      'Расставь флот. Внизу написано, какой корабль ставишь сейчас: нажми на свою доску — корабль встанет. «Повернуть» крутит корабль, «⚓ Авто» расставит весь флот сам.',
      'Выбери 3 карточки капитана — это твоё секретное оружие. Подсказка на каждой карточке объясняет, что она делает.',
      'Выстрел: доска повернётся к противнику — нажми клетку на ЧУЖОЙ доске. Огонь и обломки — попадание, просто всплеск — промазал.',
      'Честное правило: ОДИН выстрел — ОДИН ход. Даже если попал! Дальше стреляет противник.',
      'Острова: на них корабль не поставишь, а снаряд в остров — промах с брызгами. Иногда остров спасает корабль от выстрела.'
    ]
  },
  {
    id: 'l2', title: 'Урок 2 · Поход по карте',
    steps: [
      'Корабль плывёт сам: клик по морю — курс. В родном порту открывается лавка: чини флот и покупай карточки за золото.',
      'Кости: кинул — корабль швыряет куда попало, и наступает новый день. Так считается время похода.',
      'Острова: подплыви и высадись — там бой с ботом. Победа зачищает остров и приносит золото и трофеи.',
      'Сундуки: медный, серебряный и золотой. Внутри золото, карточки и обрывки карт. Ищи их на отмелях.',
      'Гнёзда боссов: собери 3 обрывка карты — откроется гнездо Кракена. Падь Левиафана — после 5 островов и победы над Кракеном. Трофей у боссов — редкая карточка.',
      'Судовой журнал: кнопка сверху карты. Медали и записи за каждый день сохраняются, даже если начать поход заново.'
    ]
  },
  {
    id: 'l3', title: 'Урок 3 · Бой с другом',
    steps: [
      'Каждый на своём устройстве: телефон, планшет или ноутбук. Сидеть рядом не нужно — нужен только код боя.',
      'Интернет нужен у ОБОИХ капитанов — и только для этого режима. Все остальные играют и без сети.',
      'Создай бой: нажми «Создать бой» — игра назовёт код, например ШТОРМ-1234. Передай его другу — продиктуй или напиши.',
      'Друг входит: он выбирает «Бой с другом», вводит код и жмёт «Войти». Когда оба на связи — море начнётся само.',
      'Флоты секретные: ты НЕ видишь чужие корабли — стреляешь наугад, как в настоящем морском бою. Противник сам сообщит, куда попало.',
      'Обрыв связи — не беда: появится надпись «СОЕДИНЕНИЕ ПОТЕРЯНО», кнопка «Заново» начнёт новый бой, когда друг вернётся.'
    ]
  }
];

/* ---------------- экран школы (DOM строится скриптом) ---------------- */
let schoolLesson = -1;                       /* открытый урок (-1 — список) */
let schoolStep = 0;                          /* шаг внутри урока */

function schoolOpen(){
  let sc = $('screen-school');
  if (!sc){
    sc = document.createElement('section');
    sc.id = 'screen-school';
    sc.className = 'screen';
    sc.innerHTML = '<div class="menu-card" id="school-card"></div>';
    document.body.appendChild(sc);
  }
  schoolLesson = -1;
  schoolRenderList();
  showScreen('school');
}

function schoolRenderList(){
  const s = schoolLoad();
  const card = $('school-card');
  let html = '<h2 class="duel-title">ШКОЛА ЮНГИ</h2>' +
    '<p class="duel-help">Три коротких урока — и ты капитан. Читай шаг за шагом, ' +
    'в любой момент можно вернуться в меню.</p>';
  html += '<div class="school-list">';
  for (let i = 0; i < LESSONS.length; i++){
    const l = LESSONS[i];
    html += '<button type="button" class="school-lesson' + (s.done[l.id] ? ' school-done' : '') +
            '" data-i="' + i + '">' +
            '<span class="school-check">' + (s.done[l.id] ? '✓' : '·') + '</span>' +
            '<span class="school-lesson-name">' + l.title + '</span>' +
            '<span class="school-lesson-count">шагов: ' + l.steps.length + '</span></button>';
  }
  html += '</div>';
  if (schoolAllDone()){
    html += '<div class="school-diploma">⚓ Диплом юнги выдан! Теперь ты знаешь все морские науки. ⚓</div>';
  }
  html += '<button id="school-back" type="button" class="btn-small">← В меню</button>';
  card.innerHTML = html;
  card.querySelectorAll('.school-lesson').forEach(b => {
    b.addEventListener('click', () => {
      schoolLesson = Number(b.dataset.i);
      schoolStep = 0;
      schoolRenderStep();
    });
  });
  $('school-back').addEventListener('click', () => showScreen('menu'));
}

function schoolRenderStep(){
  const card = $('school-card');
  const l = LESSONS[schoolLesson];
  const last = schoolStep >= l.steps.length - 1;
  let html = '<h2 class="duel-title">' + l.title + '</h2>' +
    '<div class="school-step-num">Шаг ' + (schoolStep + 1) + ' из ' + l.steps.length + '</div>' +
    '<p class="school-step-text">' + l.steps[schoolStep] + '</p>' +
    '<div class="school-dots">';
  for (let i = 0; i < l.steps.length; i++){
    html += '<span class="school-dot' + (i === schoolStep ? ' school-dot-cur' : '') +
            (i <= schoolStep ? ' school-dot-pass' : '') + '"></span>';
  }
  html += '</div>';
  html += '<div class="school-btns">' +
    '<button id="school-prev" type="button" class="btn-small"' + (schoolStep === 0 ? ' disabled' : '') + '>← Назад</button>' +
    (last
      ? '<button id="school-finish" type="button" class="btn-gold">Урок пройден!</button>'
      : '<button id="school-next" type="button" class="btn-gold">Дальше →</button>') +
    '</div>' +
    '<button id="school-tolist" type="button" class="btn-small">← Все уроки</button>';
  card.innerHTML = html;
  $('school-prev').addEventListener('click', () => {
    if (schoolStep > 0){ schoolStep--; schoolRenderStep(); }
  });
  const nextBtn = last ? $('school-finish') : $('school-next');
  nextBtn.addEventListener('click', () => {
    if (last) schoolFinishLesson();
    else { schoolStep++; schoolRenderStep(); }
  });
  $('school-tolist').addEventListener('click', () => { schoolLesson = -1; schoolRenderList(); });
}

function schoolFinishLesson(){
  const s = schoolLoad();
  const l = LESSONS[schoolLesson];
  s.done[l.id] = 1;
  schoolSave();
  if (schoolAllDone() && !s.journal){
    s.journal = 1;
    schoolSave();
    if (typeof CPT.hall === 'object' && CPT.hall && typeof CPT.hall.event === 'function'){
      CPT.hall.event('Юнга окончил школу морской науки — дипломом зачислен во флот');
    }
  }
  schoolLesson = -1;
  schoolRenderList();
}

/* ---------------- режим в главном меню ---------------- */
CPT.mode({
  id: 'school',
  name: 'ШКОЛА ЮНГИ',
  desc: '3 коротких урока',
  row: 'duo',
  icon: ICON_SCHOOL,
  start: function(){ schoolOpen(); }
});

/* приглашение новичка: один раз, если школа ещё не пройдена */
setTimeout(() => {
  const s = schoolLoad();
  if (LESSONS.every(l => s.done[l.id])) return;
  if (CPT.hint) CPT.hint('s-invite',
    'Новенький на палубе? Загляни в «Школу юнги» — три коротких урока, как играть.');
}, 1500);

/* ---------------- стили школы (style.css заморожен, R9) ---------------- */
(function schoolStyle(){
  const st = document.createElement('style');
  st.textContent = [
    '.school-list{ display:flex; flex-direction:column; gap:10px; margin:6px 0 14px; width:100%; max-width:430px; }',
    '.school-lesson{ display:flex; align-items:center; gap:12px; cursor:pointer;',
      'font-family:inherit; text-align:left; background:#f2fbff; border:2px solid #bfe0ef;',
      'border-radius:14px; padding:12px 16px; font-size:15px; font-weight:700; color:#1c3550; }',
    '.school-lesson:hover{ border-color:var(--sea,#31a3c9); }',
    '.school-lesson.school-done{ background:#eefaf1; border-color:#bde6cb; }',
    '.school-check{ flex:none; width:26px; height:26px; border-radius:50%; display:flex;',
      'align-items:center; justify-content:center; font-weight:900;',
      'background:#e8f4fa; color:#5f8299; }',
    '.school-done .school-check{ background:#2f9e63; color:#fff; }',
    '.school-lesson-name{ flex:1; }',
    '.school-lesson-count{ font-size:12px; font-weight:600; color:#5f8299; }',
    '.school-diploma{ margin:4px 0 12px; padding:12px 16px; border-radius:14px;',
      'background:#fff5d8; border:2.5px dashed #f0cd77; font-weight:800; color:#7a5a17;',
      'font-size:14.5px; line-height:1.4; }',
    '.school-step-num{ font-size:12.5px; font-weight:800; letter-spacing:1.5px;',
      'text-transform:uppercase; color:#b3541e; margin-bottom:6px; }',
    '.school-step-text{ font-size:16.5px; line-height:1.55; color:#1c3550;',
      'max-width:440px; margin:0 auto 14px; }',
    '.school-dots{ display:flex; gap:6px; justify-content:center; margin-bottom:14px; }',
    '.school-dot{ width:9px; height:9px; border-radius:50%; background:#cfe6f2; }',
    '.school-dot-pass{ background:#9fd2e8; }',
    '.school-dot-cur{ background:#f0cd77; }',
    '.school-btns{ display:flex; gap:10px; justify-content:center; margin-bottom:12px; }'
  ].join('\n');
  document.head.appendChild(st);
})();
