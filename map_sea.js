'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_sea.js
   ЭТАП 5 (блок 3 — море, решение Егора «все по очереди»):
   СОБЫТИЯ В МОРЕ. Каждый переход (корабль получил курс) даёт
   ~20% шанс встречи в пути: на середине пути до цели срабатывает
   одна из шести историй — от простого «попутного ветра» до
   бочки с монетами, обрывка карты в бутылке и ремонта от
   проходящих мастеров. Награды сразу в трюм и в сейв.
   События НЕ показываются: на броске костей (это и так
   событие), на слишком коротких перегонах и по второму разу
   за один переход. Если map_sea.js потерян — море просто
   молчит, переход работает как раньше.
   Отрисовки нет: событие говорит рупором mapToast.
   Реестр: CPT.sea = { tick }.
   Порядок подключения: после map_shop.js, перед map_rogue.js.
   ============================================================ */

const SEA_CHANCE = 0.2;              /* шанс события на переход */

function seaGold(g){
  if (!M || !M.inv) return 0;
  M.inv.gold += g;
  mapUpdateCargo();
  mapSave(M);
  return g;
}

const SEA_EVENTS = [
  { w: 3, text: function(){
      return 'Попутный ветер наполнил паруса — идём как по маслу.';
  } },
  { w: 3, text: function(){
      return 'Китообразные идут рядом с килем. Добрый знак, капитан!';
  } },
  { w: 2, text: function(){
      return 'Стая летучих рыб пронеслась над волнами.';
  } },
  { w: 3, text: function(){
      return 'Бочка на волнах: внутри ' + seaGold(8 + Math.floor(Math.random() * 8)) + ' монет!';
  } },
  { w: 2, text: function(){
      return 'Ржавый подсумок с казной: +' + seaGold(15 + Math.floor(Math.random() * 11)) + ' монет.';
  } },
  { w: 2, text: function(){
      if (!M || !M.inv || !M.inv.parts) return 'Бутылка с запиской: «держись восточнее рифов». Забавная.';
      if (M.inv.parts.map >= 3){
        return 'Бутылка с обрывком, но карта уже целая: продали в трюм — +' +
          seaGold(20 + Math.floor(Math.random() * 11)) + ' монет.';
      }
      M.inv.parts.map++;
      mapUpdateCargo();
      mapSave(M);
      return 'Бутылка с обрывком карты: +1 обрывок (' + Math.min(3, M.inv.parts.map) + '/3)!';
  } },
  { w: 1, text: function(){
      if (!M || !M.inv) return 'Мимо шёл баркас мастеров. Помахали друг другу.';
      M.inv.repair++;
      mapUpdateCargo();
      mapSave(M);
      return 'Мастера на проходившем баркасе заделали пробоину: ремонт +1.';
  } }
];

const SEA_WEIGHTS = SEA_EVENTS.reduce((s, e) => s + e.w, 0);

function seaPick(){
  let r = Math.random() * SEA_WEIGHTS;
  for (const e of SEA_EVENTS){
    r -= e.w;
    if (r < 0) return e;
  }
  return SEA_EVENTS[0];
}

let seaPlan = null;                  /* { goal, total, armed, done } */

function seaTick(){
  if (typeof activeScreen === 'undefined' || activeScreen !== 'map' || !M || !M.ship) return;
  const sh = M.ship;
  if (!sh.goal){ seaPlan = null; return; }
  if (M.diceBoost || (CPT.mapDice && CPT.mapDice.busy())){ seaPlan = null; return; }
  if (!seaPlan || seaPlan.goal !== sh.goal){
    const total = Math.hypot(sh.tx - sh.x, sh.ty - sh.y);
    seaPlan = { goal: sh.goal, total: total,
                armed: total > 90 && Math.random() < SEA_CHANCE, done: false };
  }
  if (seaPlan.done || !seaPlan.armed) return;
  const rem = Math.hypot(sh.tx - sh.x, sh.ty - sh.y);
  if (rem < seaPlan.total * 0.45){
    seaPlan.done = true;
    const e = seaPick();
    pingC();
    mapToast(e.text());
  }
}

CPT.painter(seaTick);
CPT.sea = { tick: seaTick };
