'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — map_shop.js
   ЭТАП 5 (блок 2 — сокровища, решение Егора «все по очереди»):
   МАГАЗИН КАРТОЧЕК В РОДНОМ ПОРТУ. Каждое прибытие в порт
   открывает лавку: шесть классических карточек за золото.
   Купленная карточка ложится в трюм (M.inv.cards) и входит в
   следующий бой сама — как трюмные (правила трат общие в
   map_battle.js, их магазин не касается). Дубликаты разрешены:
   карточки одноразовые. Золото добывается на островах, в
   сундуках (теперь с тирами), у боссов и в море — лавка даёт
   ему цель. Названия и описания — из CLASSIC_CARDS (game_cards.js).
   style.css не трогаем: панель на классах .overlay/.overlay-card
   из style.css, раскладка строк — своим <style> (прецедент —
   map_mode.js).
   Хук: переприсвоение mapArrive — тот же приём, что в
   map_story.js. Порт сначала ремонтирует флот (map_mode.js),
   потом лавка открывается. Если map_shop.js потерян — порт
   работает по-старому, без лавки.
   Реестр: CPT.shop = { open }.
   Порядок подключения: после map_hall.js, перед map_sea.js.
   ============================================================ */

const SHOP_ITEMS = [
  { key: 'radar',   price: 55 },
  { key: 'repair',  price: 60 },
  { key: 'shield',  price: 65 },
  { key: 'smoke',   price: 70 },
  { key: 'torpedo', price: 80 },
  { key: 'salvo',   price: 85 }
];
const SHOP_EMOJI = { radar: '📡', repair: '🔧', shield: '🛡', smoke: '💨', torpedo: '🚀', salvo: '💥' };

let shopBox = null;
function shopEnsure(){
  if (shopBox) return shopBox;
  const scr = $('screen-map');
  if (!scr) return null;
  const st = document.createElement('style');
  st.textContent =
    '.shop-row{display:flex;align-items:center;gap:10px;padding:8px 2px;' +
    'border-bottom:1px solid #e4eef4;font-size:14px;}' +
    '.shop-emoji{font-size:22px;width:30px;text-align:center;}' +
    '.shop-name{font-weight:800;color:#28506b;min-width:86px;}' +
    '.shop-desc{color:#5f8299;flex:1;font-size:13px;}' +
    '.shop-price{font-weight:800;color:#b0563a;white-space:nowrap;}' +
    '.shop-buy{padding:6px 14px;font-size:13px;}';
  document.head.appendChild(st);
  shopBox = document.createElement('div');
  shopBox.id = 'shop-overlay';
  shopBox.className = 'overlay hidden';
  shopBox.innerHTML =
    '<div class="overlay-card" style="max-width:540px;">' +
      '<div class="overlay-emoji">⚓</div>' +
      '<h2>Лавка порта</h2>' +
      '<div id="shop-gold" style="font-size:14px;font-weight:700;color:#b0563a;margin:2px 0 8px;"></div>' +
      '<div id="shop-list" style="max-height:300px;overflow:auto;text-align:left;margin:0 0 10px;"></div>' +
      '<div style="font-size:12px;color:#5f8299;margin-bottom:8px;">' +
        'Карточки трюма сами входят в следующий бой. Дубликаты разрешены — карточки тратятся.</div>' +
      '<div class="overlay-btns"><button id="shop-close" class="btn-gold">Закрыть</button></div>' +
    '</div>';
  scr.appendChild(shopBox);
  $('shop-close').addEventListener('click', () => shopBox.classList.add('hidden'));
  return shopBox;
}

function shopRender(){
  const gold = M && M.inv ? M.inv.gold : 0;
  $('shop-gold').textContent = '🪙 В казне: ' + gold + ' монет';
  const list = $('shop-list');
  list.innerHTML = '';
  for (const it of SHOP_ITEMS){
    const def = (typeof CLASSIC_CARDS !== 'undefined' && CLASSIC_CARDS[it.key]) || { name: it.key, desc: '' };
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML =
      '<span class="shop-emoji">' + (SHOP_EMOJI[it.key] || '🃏') + '</span>' +
      '<span class="shop-name">' + def.name + '</span>' +
      '<span class="shop-desc">' + def.desc + '</span>' +
      '<span class="shop-price">🪙 ' + it.price + '</span>';
    const btn = document.createElement('button');
    btn.className = 'btn-small gold shop-buy';
    btn.textContent = 'Купить';
    btn.disabled = gold < it.price;
    btn.addEventListener('click', () => shopBuy(it));
    row.appendChild(btn);
    list.appendChild(row);
  }
}

function shopBuy(it){
  if (!M || !M.inv) return;
  if (M.inv.gold < it.price) return;
  const def = (typeof CLASSIC_CARDS !== 'undefined' && CLASSIC_CARDS[it.key]) || { name: it.key };
  M.inv.gold -= it.price;
  M.inv.cards.push(def.name);
  pingC();
  mapUpdateCargo();
  mapSave(M);
  shopRender();
}

function shopOpen(){
  const box = shopEnsure();
  if (!box) return;
  shopRender();
  box.classList.remove('hidden');
}

/* порт: сначала ремонт флота (map_mode.js), потом лавка */
const _shopArrPrev = mapArrive;
mapArrive = function(g){
  if (g && g.kind === 'port'){
    _shopArrPrev(g);
    if (typeof activeScreen === 'undefined' || activeScreen !== 'map') return;
    shopOpen();
    return;
  }
  _shopArrPrev(g);
};

CPT.shop = { open: shopOpen };
