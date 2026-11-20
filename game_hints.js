'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_hints.js  (v2.2)
   ОДНОРАЗОВЫЕ ПОДСКАЗКИ-НЕВИДИМКИ.
   Любой модуль зовёт CPT.hint(id, текст) — плашка появляется
   снизу экрана, каждая подсказка показывается ОДИН раз за всё
   время (сейв cpt-hints-v1). Подсказки складываются в очередь:
   на экране видна одна, следующая ждёт своей очереди.
   Плашка сама уплывает через 9 секунд или по кнопке «Понятно».
   style.css не трогаем (R9) — стили инжектятся ниже.
   Подключать СРАЗУ ПОСЛЕ game_core.js: хуки в других модулях
   зовут CPT.hint уже во время игры, порядок ниже не важен.
   ============================================================ */

const HINT_KEY = 'cpt-hints-v1';
let hintSeen = {};
try {
  hintSeen = JSON.parse(localStorage.getItem(HINT_KEY) || '{}') || {};
} catch (err) { hintSeen = {}; }             /* битый сейв — подсказки начнутся заново */

let hintEl = null;                           /* плашка на экране */
let hintTimer = null;                        /* таймер самоуплывания */
let hintQueue = [];                          /* очередь: [id, текст] */

function hintBuild(){
  const d = document.createElement('div');
  d.id = 'cpt-hint';
  d.setAttribute('role', 'status');
  d.innerHTML = '<div class="cpt-hint-text"></div>' +
                '<button type="button" class="cpt-hint-ok">Понятно</button>';
  document.body.appendChild(d);
  d.querySelector('.cpt-hint-ok').addEventListener('click', hintHide);
  return d;
}

function hintHide(){
  if (hintTimer){ clearTimeout(hintTimer); hintTimer = null; }
  if (hintEl) hintEl.classList.remove('show');
  setTimeout(hintNext, 350);                 /* даём доиграть анимацию ухода */
}

function hintNext(){
  if (!hintQueue.length) return;
  const item = hintQueue.shift();
  if (hintSeen[item[0]]) { hintNext(); return; }   /* уже показывали — дальше */
  hintSeen[item[0]] = 1;
  try { localStorage.setItem(HINT_KEY, JSON.stringify(hintSeen)); } catch (err) {}
  if (!hintEl) hintEl = hintBuild();
  hintEl.querySelector('.cpt-hint-text').textContent = item[1];
  hintEl.classList.add('show');
  hintTimer = setTimeout(hintHide, 9000);
}

/* публичный вход: CPT.hint('id', 'текст') */
CPT.hint = function(id, text){
  if (!id || !text || hintSeen[id]) return;
  if (hintQueue.some(q => q[0] === id)) return;
  if (hintQueue.length >= 3) return;         /* больше трёх подряд не копим */
  hintQueue.push([id, text]);
  if (!hintEl || !hintEl.classList.contains('show')) hintNext();
};

/* ---------------- стили плашки (style.css заморожен, R9) ---------------- */
(function hintStyle(){
  const st = document.createElement('style');
  st.textContent = [
    '#cpt-hint{ position:fixed; left:50%; bottom:16px; transform:translate(-50%,16px);',
      'max-width:min(92vw,560px); display:flex; gap:14px; align-items:center;',
      'background:#fff8e8; color:#4a3117; border:2px solid #f0cd77; border-radius:16px;',
      'box-shadow:0 10px 26px rgba(28,53,80,.25); padding:12px 16px; z-index:9999;',
      'opacity:0; pointer-events:none; transition:opacity .3s, transform .3s; }',
    '#cpt-hint.show{ opacity:1; transform:translate(-50%,0); pointer-events:auto; }',
    '#cpt-hint .cpt-hint-text{ font-size:14.5px; line-height:1.45; font-weight:600; }',
    '#cpt-hint .cpt-hint-ok{ font-family:inherit; cursor:pointer; flex:none;',
      'background:#f0cd77; border:none; border-radius:10px; padding:8px 14px;',
      'font-size:13px; font-weight:800; color:#4a3117; }'
  ].join('\n');
  document.head.appendChild(st);
})();
