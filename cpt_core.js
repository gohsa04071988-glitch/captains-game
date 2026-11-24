'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — cpt_core.js
   КАРКАС-РЕЕСТР. v2.2.2: вынесен из index.html (правка P4 —
   «index.html только каркас, inline <script> запрещён»).
   v2.2.3: + губернатор кадра — на слабых телефонах, где полный
   кадр двух досок не успевает за 16 мс, игра сама переходит на
   30 fps и обратно (дуэль 2026-11-21: «тормозило»).
   v2.2.4: только версия — сами правки в дуэли (ремонт-клетка,
   свист полёта).
   v2.2.5: меню v3 «пляжная витрина» — режимы с row:'duo' попадают
   во второй ряд (#duo-list, Школа+Поход); кнопка «📓 Журнал» в углу
   открывает исторические справки (lore) по желанию, а не постоянно.
   Модули регистрируются сами, каркас их только собирает:
     CPT.mode({...})   — кнопка режима в главном меню
     CPT.lore({...})   — историческая справка в меню
     CPT.painter(fn)   — художник в общий игровой кадр
   Новый режим = новый js-файл с одной регистрацией.
   Сам index.html при добавлении режимов НЕ переписывается.
   ============================================================ */

window.CPT = {
  version: '2.2.5',
  _modes: [], _lore: [], _painters: [], _sel: null,

  mode: function(def){ this._modes.push(def); },
  lore: function(def){ this._lore.push(def); },
  painter: function(fn){ this._painters.push(fn); },

  buildMenu: function(){
    var ml = document.getElementById('modes-list');
    var dl = document.getElementById('duo-list');
    if (ml){
      ml.innerHTML = '';
      if (dl) dl.innerHTML = '';
      for (var i = 0; i < this._modes.length; i++){
        var m = this._modes[i];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mode-btn' + (m.cls ? ' ' + m.cls : '') +
                      (this._sel === m.id ? ' selected' : '');
        b.dataset.mode = m.id;
        b.innerHTML =
          '<span class="mode-icon">' + (m.icon || '') + '</span>' +
          '<span class="mode-text"><span class="mode-name">' + m.name + '</span>' +
          '<span class="mode-desc">' + m.desc + '</span></span>';
        b.addEventListener('click', function(){
          document.querySelectorAll('.mode-btn').forEach(function(x){
            x.classList.remove('selected');
          });
          this.classList.add('selected');
          CPT._sel = this.dataset.mode;
          document.getElementById('btn-start').disabled = false;
        });
        /* row:'duo' — второй ряд витрины (Школа, Поход по карте);
           контейнера нет или режим без row — общий боевой ряд */
        ((m.row === 'duo' && dl) ? dl : ml).appendChild(b);
      }
    }
    var jb = document.getElementById('btn-journal');
    if (jb && !jb.dataset.bound){
      jb.dataset.bound = '1';
      jb.addEventListener('click', function(){
        var row = document.getElementById('lore-row');
        var box = document.getElementById('lore-box');
        if (!row) return;
        var opening = row.classList.contains('hidden');
        row.classList.toggle('hidden', !opening);
        jb.classList.toggle('open', opening);
        if (!opening && box) box.classList.add('hidden');
        if (opening && row.scrollIntoView){
          try { row.scrollIntoView({ behavior:'smooth', block:'nearest' }); } catch (e){}
        }
      });
    }
    var lr = document.getElementById('lore-row');
    if (lr){
      lr.innerHTML = '';
      for (var j = 0; j < this._lore.length; j++){
        var l = this._lore[j];
        var lb = document.createElement('button');
        lb.type = 'button';
        lb.className = 'lore-btn';
        lb.textContent = l.title;
        (function(def){
          lb.addEventListener('click', function(){
            var box = document.getElementById('lore-box');
            box.textContent = def.text;
            box.classList.remove('hidden');
          });
        })(l);
        lr.appendChild(lb);
      }
    }
    var vt = document.getElementById('ver-tag');
    if (vt) vt.textContent = 'v' + this.version;
  }
};

/* --- КЭШ-ПАМЯТЬ (v2.3.2, быстрый старт): cpt-sw.js держит копии
   файлов игры в телефоне — меню со второго захода открывается
   мгновенно, на мобильном интернете игра больше не «думает».
   Регистрация после load: не конкурирует со стартом игры.
   Чужие и старые Worker'ы (captains-sw.js прошлых версий)
   снимаем, наш cpt-sw.js не трогаем. --- */
(function(){
  if (!('serviceWorker' in navigator)) return;
  var OURS = 'cpt-sw.js';
  navigator.serviceWorker.getRegistrations().then(function(rs){
    rs.forEach(function(r){
      var url = (r.active && r.active.scriptURL) || (r.installing && r.installing.scriptURL) || '';
      if (url.indexOf(OURS) === -1) r.unregister();
    });
  }).catch(function(){});
  window.addEventListener('load', function(){
    navigator.serviceWorker.register(OURS).catch(function(){});
  });
})();

/* --- ДИАГНОСТИКА (правка P6, v2.2.2): счётчик навешанных
   слушателей. Ничего не меняет в поведении — только считает
   все addEventListener на странице. Приёмка «вход-выход ×10»
   в песочнице сравнивает CPT.stats.binds() до и после: числа
   совпадают — повторных навешиваний нет. --- */
(function(){
  let binds = 0;
  const orig = EventTarget.prototype.addEventListener;
  if (orig){
    EventTarget.prototype.addEventListener = function(ev, fn, opts){
      binds++;
      return orig.call(this, ev, fn, opts);
    };
  }
  CPT.stats = { binds: function(){ return binds; } };
})();

/* --- ГУБЕРНАНТКА КАДРА (v2.2.3): на слабом телефоне полный кадр
   из двух досок не успевает за 16 мс — игра мычит и греет батарею.
   Замеряем фактическую стоимость кадра; если две секунды подряд
   не хватает — рисуем 30 fps (детская пошаговая игра этого не
   чувствует, а телефон выдыхает). Стало легко — возвращаем 60.
   ВАЖНО: orig(masterFrame) сам продолжает цепочку rAF изнутри,
   поэтому после его вызова кадр ставит ОН; мы ставим кадр только
   когда orig пропущен (иначе цепочка удваивалась и вешала игру). --- */
(function(){
  window.addEventListener('load', function(){
    if (typeof window.masterFrame !== 'function') return;
    const orig = window.masterFrame;
    let cost = 8, lastAt = 0, heavy = 0, easy = 0, capped = false;
    window.masterFrame = function(t){
      if (capped && t - lastAt < 31){
        requestAnimationFrame(window.masterFrame);   /* orig не звали — цепочка на нас */
        return;
      }
      const t0 = performance.now();
      orig(t);                                       /* orig сам вызовет rAF */
      lastAt = t;
      cost = cost * .93 + (performance.now() - t0) * .07;
      if (cost > 13){ heavy++; easy = 0; }
      else { easy++; if (easy > 30) heavy = 0; }
      if (!capped && heavy > 120) capped = true;
      if (capped && easy > 420 && cost < 6) capped = false;
    };
  });
})();

window.addEventListener('load', function(){ CPT.buildMenu(); });
