#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Патч «БОСС: КРАКЕН» для игры «Капитаны островов» (мастер-версия GitHub v6b + исторические режимы).
Добавляет:
  1. Карточку «🐙 БОСС: КРАКЕН» в меню (красная рамка, тёмный фон), поле 10x10, тёмно-фиолетовая вода, без островов.
  2. Кракена: монстр 3x3, HP 9, всегда виден, HP-бар вверху экрана боя.
  3. Ход Кракена: погружение -> перемещение -> всплытие -> атака (якорь 1x1 / бочка 2x2 / обломки 1x3).
  4. UI: одна кнопка «🔄 Перевернуть доску» рядом с «В меню» (поворот Canvas на 180°), корабли меньше на ~18%.
Не трогает: Простой, Сложный, Исторические, Онлайн, Вдвоём.
"""
import sys

SRC = '/home/z/my-project/download/game-archive/captains-v6b-istoricheskie-2026-11-13.html'
OUTS = [
    '/home/z/my-project/public/captains.html',
    '/home/z/my-project/download/captains-kraken-v7.html',
    '/home/z/my-project/download/github-upload/index.html',
]

E = []
def rep(old, new):
    E.append((old, new))

# ============================ HTML ============================

# 1. Версия 6 -> 7
rep('<meta name="app-version" content="6">',
    '<meta name="app-version" content="7">')

# 2. id на сегмент вкладок (скрываем в режиме босса)
rep('<div class="seg"><button id="tabEnemy" class="on">Ищу противника</button><button id="tabOwn">Мой флот</button></div>',
    '<div class="seg" id="boardTabs"><button id="tabEnemy" class="on">Ищу противника</button><button id="tabOwn">Мой флот</button></div>')

# 3. HP-бар Кракена над баннером
rep('      <div class="banner" id="banner">Выбери клетку и подтверди выстрел</div>',
    '      <div class="krbar" id="krakenBar" hidden><span class="krem">🐙</span><div class="krhp"><i id="krakenHPFill" style="width:100%"></i></div><b id="krakenHPTxt">HP: 9/9</b></div>\n'
    '      <div class="banner" id="banner">Выбери клетку и подтверди выстрел</div>')

# 4. id на зону карт (скрываем в режиме босса — карт у босса нет)
rep('      <div class="handzone">\n        <div class="sbar"><div class="eyebrow">Твои карты</div>',
    '      <div class="handzone" id="handZone">\n        <div class="sbar"><div class="eyebrow">Твои карты</div>')

# 5. id на блок «Флот соперника» (в боссе заменён HP-баром)
rep('      <div class="stat"><div class="sh"><span>Флот соперника</span><span id="enemySunk">0 / 3</span></div>',
    '      <div class="stat" id="enemyStat"><div class="sh"><span>Флот соперника</span><span id="enemySunk">0 / 3</span></div>')

# 6. Одна кнопка «Перевернуть доску» рядом с «В меню»
rep('      <button class="btn ghost sm" id="btnLeave">← В меню</button>',
    '      <div class="row"><button class="btn ghost sm" id="btnFlip">🔄 Перевернуть доску</button><button class="btn ghost sm" id="btnLeave">← В меню</button></div>')

# 7. id на блок «Соперник» (скрываем для босса — он всегда компьютер)
rep('      <div class="stack" style="gap:8px">\n        <div class="eyebrow">Соперник</div>',
    '      <div class="stack" style="gap:8px" id="oppWrap">\n        <div class="eyebrow">Соперник</div>')

# 8. id на примечание в окне победы
rep('  <p class="note">Расстановка соперника открыта на поле — вкладка «Ищу противника».</p>',
    '  <p class="note" id="revealNote">Расстановка соперника открыта на поле — вкладка «Ищу противника».</p>')

# ============================ CSS ============================

rep('@media(max-width:620px){\n.hand{grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px}',
    '/* ===== БОСС: КРАКЕН ===== */\n'
    '.mcard.bossMode{border-color:var(--danger);background:linear-gradient(160deg,rgba(74,10,58,.94),rgba(24,4,38,.97));box-shadow:0 0 20px rgba(255,77,94,.22)}\n'
    '.mcard.bossMode:hover{border-color:#ff8b9c;transform:translateY(-3px)}\n'
    '.mcard.bossMode.sel{border-color:var(--danger);box-shadow:0 0 0 3px rgba(255,77,94,.32),0 0 28px rgba(255,77,94,.4)}\n'
    '.mcard.bossMode .mct{color:#ffb3c0;text-transform:uppercase;letter-spacing:.04em}\n'
    '.mcard.bossMode .mcs{color:#d795ab}\n'
    '.mcard.bossMode .mcd{color:#e9cdda}\n'
    '.krbar{display:flex;align-items:center;gap:11px;padding:10px 15px;border-radius:16px;margin-bottom:10px;background:linear-gradient(100deg,rgba(46,10,68,.93),rgba(18,6,40,.93));border:1px solid rgba(185,140,255,.55);box-shadow:0 0 18px rgba(112,40,180,.3)}\n'
    '.krbar .krem{font-size:23px;line-height:1;animation:bob 2.4s ease-in-out infinite}\n'
    '.krbar .krhp{flex:1;height:13px;border-radius:99px;background:rgba(3,21,31,.8);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.55)}\n'
    '.krbar .krhp i{display:block;height:100%;border-radius:99px;transition:width .5s cubic-bezier(.2,.9,.3,1);background:linear-gradient(90deg,#ff4d5e,#b34fd0 55%,#ff4fa3)}\n'
    '.krbar b{font-size:14px;font-weight:900;color:#ecd9ff;white-space:nowrap;font-variant-numeric:tabular-nums}\n'
    '@media(max-width:620px){\n.hand{grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px}')

# ============================ JS: ядро ============================

# 9b. Буквы координат до J (поле 10x10)
rep("const LET='ABCDEFGH';",
    "const LET='ABCDEFGHIJ';")

# 10. Режим «kraken» в MODES
rep(" hard:{id:'hard',name:'Сложный',n:8,fleet:[4,3,2,2],islands:[[2,2],[2,5],[5,2],[5,5]],recon:3,label:'8 × 8 · флот 4–3–2–2',desc:'Больше воды, радар 3×3, четыре острова.'}};",
    " hard:{id:'hard',name:'Сложный',n:8,fleet:[4,3,2,2],islands:[[2,2],[2,5],[5,2],[5,5]],recon:3,label:'8 × 8 · флот 4–3–2–2',desc:'Больше воды, радар 3×3, четыре острова.'},\n"
    " kraken:{id:'kraken',name:'Босс: Кракен',icon:'🐙',n:10,fleet:[4,3,3,2,2],islands:[],recon:2,boss:true,"
    "label:'10 × 10 · БОСС',desc:'Кракен 3×3 (HP 9) охотится в твоих водах: ныряет, всплывает и швыряет якорь, бочку и обломки. Потопи монстра!',"
    "color:'#241040',color2:'#3d1a63',grid:'rgba(205,175,255,.2)'}};")

# 11. Match: босс-состояние
rep("  this.events=[];this.seq=0;this.version=0;this.turn=0;this.winner=null;this.phase='setup';this.starter=0;this.round=1;}",
    "  this.events=[];this.seq=0;this.version=0;this.turn=0;this.winner=null;this.phase='setup';this.starter=0;this.round=1;\n"
    "  this.boss=!!m.boss;this.kraken=this.boss?{r:3,c:3,hp:9,max:9,hits:[],under:false}:null;}")

# 12. toJSON: сохраняем Кракена
rep("turn:this.turn,winner:this.winner,phase:this.phase,starter:this.starter,round:this.round};}",
    "turn:this.turn,winner:this.winner,phase:this.phase,starter:this.starter,round:this.round,"
    "kraken:this.kraken?{r:this.kraken.r,c:this.kraken.c,hp:this.kraken.hp,max:this.kraken.max,hits:this.kraken.hits}:null};}")

# 13. fromJSON: восстанавливаем Кракена
rep("  m.starter=o.starter;m.round=o.round;return m;}",
    "  m.starter=o.starter;m.round=o.round;\n"
    "  if(m.boss)m.kraken=o.kraken?{r:o.kraken.r,c:o.kraken.c,hp:o.kraken.hp,max:o.kraken.max,hits:o.kraken.hits||[],under:false}:null;return m;}")

# 14. _maybeStart: босс стартует без карт и без второго флота
rep(" _maybeStart(){const ok=this.ready[0]&&this.ready[1]&&this.cards[0].length===3&&this.cards[1].length===3;\n"
    "  if(ok&&this.phase!=='battle'&&this.phase!=='finished'){this.phase='battle';this.turn=this.starter;this._push('both',{t:'start',starter:this.starter});}\n"
    "  else if(this.phase==='setup'&&this.ships[0]&&this.ships[1])this.phase='cards';}",
    " _maybeStart(){const ok=this.boss?(this.ready[0]&&!!this.ships[0]):(this.ready[0]&&this.ready[1]&&this.cards[0].length===3&&this.cards[1].length===3);\n"
    "  if(ok&&this.phase!=='battle'&&this.phase!=='finished'){this.phase='battle';\n"
    "   if(this.boss){this.turn=0;const kp=this.krakenRelocate();if(kp){this.kraken.r=kp[0];this.kraken.c=kp[1];}}\n"
    "   else this.turn=this.starter;\n"
    "   this._push('both',{t:'start',starter:this.turn});}\n"
    "  else if(this.phase==='setup'&&this.ships[0]&&(this.boss||this.ships[1]))this.phase='cards';}")

# 15. fire -> fireBoss в режиме босса
rep(" fire(seat,r,c){this._pre(seat);",
    " fire(seat,r,c){if(this.boss)return this.fireBoss(seat,r,c);this._pre(seat);")

# 16. Новые методы Match: krakenCells, krakenRelocate, fireBoss, krakenAttack
rep(" viewFor(seat){const opp=1-seat;const myShots={},enemyShots={};",
    " krakenCells(r,c){const o=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)o.push([r+i,c+j]);return o;}\n"
    " krakenRelocate(){const kr=this.kraken;const bad=new Set(this.islandSet());\n"
    "  (this.ships[0]||[]).forEach(sh=>sh.cells.forEach(p=>bad.add(K(p[0],p[1]))));\n"
    "  const spots=[];\n"
    "  for(let r=0;r+2<this.n;r++)for(let c=0;c+2<this.n;c++){let ok=true;\n"
    "   for(let i=0;i<3&&ok;i++)for(let j=0;j<3;j++)if(bad.has(K(r+i,c+j))){ok=false;break;}\n"
    "   if(ok)spots.push([r,c]);}\n"
    "  if(!spots.length)return null;\n"
    "  const alt=spots.filter(s=>!(s[0]===kr.r&&s[1]===kr.c));\n"
    "  const pool=alt.length?alt:spots;\n"
    "  const np=pool[Math.floor(Math.random()*pool.length)];\n"
    "  const keep=[];\n"
    "  (kr.hits||[]).forEach(p=>{const kk=K(p[0],p[1]);\n"
    "   if(p[0]>=np[0]&&p[0]<np[0]+3&&p[1]>=np[1]&&p[1]<np[1]+3)keep.push(p);\n"
    "   else if(this.shots[0].get(kk)==='hit')this.shots[0].set(kk,'miss');});\n"
    "  kr.hits=keep;kr.r=np[0];kr.c=np[1];return np;}\n"
    " fireBoss(seat,r,c){this._pre(seat);\n"
    "  if(this.isIsland(r,c))throw new RuleError('island','По острову стрелять нельзя');\n"
    "  if(this.shots[seat].has(K(r,c)))throw new RuleError('repeat','Эта клетка уже проверена');\n"
    "  const kr=this.kraken;\n"
    "  const inKr=r>=kr.r&&r<kr.r+3&&c>=kr.c&&c<kr.c+3;\n"
    "  let res='miss',sunkCells=null;\n"
    "  if(inKr&&!kr.hits.some(p=>p[0]===r&&p[1]===c)){kr.hits.push([r,c]);kr.hp--;res=kr.hp<=0?'sunk':'hit';\n"
    "   if(kr.hp<=0)sunkCells=this.krakenCells(kr.r,kr.c);}\n"
    "  this.shots[seat].set(K(r,c),res);\n"
    "  this._push('both',{t:'fire',by:seat,cell:[r,c],res:res,sunkCells:sunkCells});this.version++;\n"
    "  if(kr.hp<=0){this.winner=seat;this.phase='finished';this._push('both',{t:'win',by:seat});}\n"
    "  else{if(this.turn===this.starter)this.round++;this.turn=1;}\n"
    "  return{res:res,sunkCells:sunkCells};}\n"
    " krakenAttack(){const kr=this.kraken;\n"
    "  const item=['anchor','barrel','wreck'][Math.floor(Math.random()*3)];\n"
    "  const alive=[...this.aliveCells(0)].map(U);\n"
    "  const pick=a=>a[Math.floor(Math.random()*a.length)];\n"
    "  const anywhere=()=>[Math.floor(Math.random()*this.n),Math.floor(Math.random()*this.n)];\n"
    "  let cells=[];\n"
    "  if(item==='anchor')cells=[alive.length?pick(alive):anywhere()];\n"
    "  else if(item==='barrel'){const t=alive.length?pick(alive):anywhere();\n"
    "   const r0=Math.max(0,Math.min(this.n-2,t[0]-(Math.random()<.5?0:1)));\n"
    "   const c0=Math.max(0,Math.min(this.n-2,t[1]-(Math.random()<.5?0:1)));\n"
    "   cells=[[r0,c0],[r0,c0+1],[r0+1,c0],[r0+1,c0+1]];}\n"
    "  else{const t=alive.length?pick(alive):anywhere();\n"
    "   const horiz=Math.random()<.5,back=Math.random()<.5?0:2;\n"
    "   for(let k=-back;k<3-back;k++){const rr2=t[0]+(horiz?0:k),cc2=t[1]+(horiz?k:0);\n"
    "    if(rr2>=0&&rr2<this.n&&cc2>=0&&cc2<this.n)cells.push([rr2,cc2]);}\n"
    "   if(!cells.length)cells=[t.slice()];}\n"
    "  const results=[];const seen=new Set();\n"
    "  for(const p of cells){const kk=K(p[0],p[1]);if(seen.has(kk))continue;seen.add(kk);\n"
    "   const res=this._damage(0,p[0],p[1]);\n"
    "   this.shots[1].set(kk,res==='repeat'?'hit':res);\n"
    "   let sunkCells=null;\n"
    "   if(res==='sunk'){const sh=this.ships[0].find(s=>s.cells.some(q=>q[0]===p[0]&&q[1]===p[1]));sunkCells=sh.cells.map(x=>x.slice());}\n"
    "   results.push({cell:[p[0],p[1]],res:res,sunkCells:sunkCells});}\n"
    "  this._push('both',{t:'krAttack',item:item,results:results});this.version++;\n"
    "  if(this.allDead(0)){this.winner=1;this.phase='finished';this._push('both',{t:'win',by:1});}\n"
    "  else{if(this.turn===this.starter)this.round++;this.turn=0;}\n"
    "  return{item:item,results:results};}\n"
    " viewFor(seat){const opp=1-seat;const myShots={},enemyShots={};")

# 17. viewFor: отдаём состояние Кракена
rep("  if(this.phase==='finished')v.reveal={enemyShips:this.ships[opp],enemyCards:this.cards[opp]};",
    "  if(this.boss&&this.kraken)v.kraken={r:this.kraken.r,c:this.kraken.c,hp:this.kraken.hp,max:this.kraken.max,hits:this.kraken.hits.slice()};\n"
    "  if(this.phase==='finished')v.reveal={enemyShips:this.ships[opp],enemyCards:this.cards[opp]};")

# ============================ JS: отрисовка ============================

# 18. BoardView: цвета воды/сетки + флип + кракен-поля
rep("  this.n=o.n;this.islands=o.islands||[];this.cell=o.cell||52;this.pad=14;this.waterColor=o.waterColor;",
    "  this.n=o.n;this.islands=o.islands||[];this.cell=o.cell||52;this.pad=14;this.waterColor=o.waterColor;this.waterColor2=o.waterColor2;this.gridColor=o.gridColor;this.flip=o.flip||false;")
rep("  this.preview=null;this.previewBad=false;this.torpedoPath=null;this.dim=false;this.effects=[];this.shake=0;this.shieldCells=null;",
    "  this.preview=null;this.previewBad=false;this.torpedoPath=null;this.dim=false;this.effects=[];this.shake=0;this.shieldCells=null;this.kraken=null;this.krakenGone=false;")

# 19. Вода: второй цвет градиента
rep("  const g=ctx.createLinearGradient(0,0,S,S);g.addColorStop(0,this.waterColor||BP.w1);g.addColorStop(1,BP.w2);",
    "  const g=ctx.createLinearGradient(0,0,S,S);g.addColorStop(0,this.waterColor||BP.w1);g.addColorStop(1,this.waterColor2||BP.w2);")

# 20. Цвет сетки
rep("  ctx.strokeStyle=BP.grid;ctx.lineWidth=1;",
    "  ctx.strokeStyle=this.gridColor||BP.grid;ctx.lineWidth=1;")

# 21. Рисуем Кракена поверх кораблей (до меток выстрелов)
rep("  if(this.ships)for(const sh of this.ships)this.ship(sh);",
    "  if(this.ships)for(const sh of this.ships)this.ship(sh);\n"
    "  if(this.kraken&&!this.krakenGone)this.krakenDraw();")

# 22. Поворот Canvas на 180° (контент поля)
rep("  ctx.save();\n  if(this.shake>0){ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake*=.85;if(this.shake<.6)this.shake=0;}",
    "  ctx.save();\n  if(this.shake>0){ctx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake*=.85;if(this.shake<.6)this.shake=0;}\n"
    "  ctx.save();\n  if(this.flip){ctx.translate(S/2,S/2);ctx.rotate(Math.PI);ctx.translate(-S/2,-S/2);}")

# 23. Координаты — поверх, без переворота (зеркалим позиции при флипе)
rep("  if(CFG.coords){ctx.fillStyle='rgba(11,60,80,.5)';ctx.font='700 '+Math.max(8,C*.17)+'px Nunito,system-ui,sans-serif';\n"
    "   ctx.textAlign='center';ctx.textBaseline='middle';\n"
    "   for(let i=0;i<this.n;i++){const q=this.xy(0,i);ctx.fillText(LET[i],q[0]+C/2,P*.55);\n"
    "    const q2=this.xy(i,0);ctx.fillText(String(i+1),P*.5,q2[1]+C/2);}}\n"
    "  ctx.restore();}",
    "  ctx.restore();\n"
    "  if(CFG.coords){ctx.fillStyle='rgba(11,60,80,.5)';ctx.font='700 '+Math.max(8,C*.17)+'px Nunito,system-ui,sans-serif';\n"
    "   ctx.textAlign='center';ctx.textBaseline='middle';\n"
    "   for(let i=0;i<this.n;i++){const ci=this.flip?this.n-1-i:i,ri=this.flip?this.n-1-i:i;\n"
    "    const q=this.xy(0,ci);ctx.fillText(LET[i],q[0]+C/2,P*.55);\n"
    "    const q2=this.xy(ri,0);ctx.fillText(String(i+1),P*.5,q2[1]+C/2);}}\n"
    "  ctx.restore();}")

# 24. pos(): обратное преобразование координат при флипе
rep("  if(rr<0||rr>=this.n||c<0||c>=this.n)return null;return{r:rr,c:c};}",
    "  if(rr<0||rr>=this.n||c<0||c>=this.n)return null;return this.flip?{r:this.n-1-rr,c:this.n-1-c}:{r:rr,c:c};}")

# 25. Корабли меньше на ~18%
rep("  const len=cells.length,L=len*C,W=C,ins=C*.12;",
    "  const len=cells.length,SC=.82,L=len*C*SC,W=C*SC,ins=C*.12;")
rep("  cells.forEach((p,i)=>{const xi=-L/2+C*(i+.5);",
    "  cells.forEach((p,i)=>{const xi=-L/2+L*(i+.5)/len;")
rep("   const i0=cells.findIndex(p=>hits.has(K(p[0],p[1]))),hx0=i0>=0?-L/2+C*(i0+.5):0;",
    "   const i0=cells.findIndex(p=>hits.has(K(p[0],p[1]))),hx0=i0>=0?-L/2+L*(i0+.5)/len:0;")

# 26. Метод krakenDraw — сам монстр
rep(" mark(r,c,res,incoming){const ctx=this.ctx,C=this.cell,q=this.center(r,c),x=q[0],y=q[1];",
    " krakenDraw(){const kr=this.kraken;if(!kr||kr.under)return;\n"
    "  const ctx=this.ctx,C=this.cell,t=this._t,q=this.xy(kr.r,kr.c),S3=C*3;\n"
    "  const cx=q[0]+S3/2,cy=q[1]+S3/2;\n"
    "  ctx.save();ctx.translate(cx,cy+Math.sin(t*.04)*C*.035);\n"
    "  ctx.fillStyle='rgba(20,4,40,.25)';ctx.beginPath();ctx.ellipse(0,C*.35,S3*.44,S3*.2,0,0,6.2832);ctx.fill();\n"
    "  ctx.strokeStyle='#4b1f7a';ctx.lineWidth=C*.17;ctx.lineCap='round';\n"
    "  for(let i=0;i<8;i++){const a=i/8*6.2832+.35;const wob=Math.sin(t*.055+i*1.9)*C*.3;\n"
    "   const R0=S3*.3,R1=S3*.46+wob;\n"
    "   ctx.beginPath();ctx.moveTo(Math.cos(a)*R0,Math.sin(a)*R0);\n"
    "   ctx.quadraticCurveTo(Math.cos(a+.4)*S3*.42,Math.sin(a+.4)*S3*.42,Math.cos(a)*R1,Math.sin(a)*R1);ctx.stroke();\n"
    "   ctx.fillStyle='#7a3fb8';ctx.beginPath();ctx.arc(Math.cos(a)*R1,Math.sin(a)*R1,C*.085,0,6.2832);ctx.fill();}\n"
    "  const g=ctx.createRadialGradient(-C*.35,-C*.45,C*.15,0,0,S3*.5);\n"
    "  g.addColorStop(0,'#9a5fe0');g.addColorStop(.55,'#6a2fae');g.addColorStop(1,'#3a1560');\n"
    "  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,S3*.33,S3*.29,0,0,6.2832);ctx.fill();\n"
    "  ctx.strokeStyle='rgba(216,180,255,.65)';ctx.lineWidth=2;ctx.stroke();\n"
    "  ctx.fillStyle='rgba(255,255,255,.14)';\n"
    "  ctx.beginPath();ctx.ellipse(-C*.25,-C*.62,C*.16,C*.1,-.4,0,6.2832);ctx.fill();\n"
    "  ctx.beginPath();ctx.ellipse(C*.2,-C*.68,C*.13,C*.08,.3,0,6.2832);ctx.fill();\n"
    "  for(const p of kr.hits){const di=p[0]-kr.r,dj=p[1]-kr.c;if(di<0||di>2||dj<0||dj>2)continue;\n"
    "   const wx=-S3/2+C*(dj+.5),wy=-S3/2+C*(di+.5);\n"
    "   ctx.fillStyle='rgba(26,4,48,.6)';ctx.beginPath();ctx.arc(wx,wy,C*.26,0,6.2832);ctx.fill();\n"
    "   ctx.strokeStyle='#ff9a4d';ctx.lineWidth=Math.max(1.4,C*.03);\n"
    "   ctx.beginPath();ctx.moveTo(wx-C*.12,wy-C*.12);ctx.lineTo(wx+C*.12,wy+C*.12);\n"
    "   ctx.moveTo(wx+C*.12,wy-C*.12);ctx.lineTo(wx-C*.12,wy+C*.12);ctx.stroke();}\n"
    "  const look=Math.sin(t*.021)*C*.045;\n"
    "  [-1,1].forEach(s=>{ctx.fillStyle='#f4ecff';ctx.beginPath();ctx.ellipse(s*C*.34,-C*.05,C*.155,C*.185,0,0,6.2832);ctx.fill();\n"
    "   ctx.fillStyle='#22063d';ctx.beginPath();ctx.arc(s*C*.34+look,C*.01,C*.075,0,6.2832);ctx.fill();\n"
    "   ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*C*.34+look-C*.03,-C*.03,C*.024,0,6.2832);ctx.fill();});\n"
    "  ctx.strokeStyle='#2a0a4a';ctx.lineWidth=C*.055;ctx.lineCap='round';\n"
    "  ctx.beginPath();ctx.moveTo(-C*.52,-C*.3);ctx.lineTo(-C*.16,-C*.16);\n"
    "  ctx.moveTo(C*.52,-C*.3);ctx.lineTo(C*.16,-C*.16);ctx.stroke();\n"
    "  ctx.lineWidth=C*.05;\n"
    "  ctx.beginPath();ctx.arc(0,C*.22,C*.14,.15*Math.PI,.85*Math.PI);ctx.stroke();\n"
    "  ctx.restore();}\n"
    " mark(r,c,res,incoming){const ctx=this.ctx,C=this.cell,q=this.center(r,c),x=q[0],y=q[1];")

# 27. Эффекты: погружение, всплытие, бросок предмета, гибель босса
rep(" effect(e){const ctx=this.ctx,C=this.cell,age=this._t-e.t0;",
    " effect(e){const ctx=this.ctx,C=this.cell,age=this._t-e.t0;\n"
    "  if(e.kind==='krDive'){const life=50;if(age>life)return false;const p=age/life,q=this.center(e.r,e.c);\n"
    "   ctx.save();\n"
    "   for(let i=0;i<3;i++){const pp=Math.min(1,Math.max(0,p*1.3-i*.18));if(pp<=0||pp>=1)continue;\n"
    "    ctx.globalAlpha=(1-pp)*.75;ctx.strokeStyle='#c9a6ff';ctx.lineWidth=2.4*(1-pp)+.6;\n"
    "    ctx.beginPath();ctx.arc(q[0],q[1],C*(.3+pp*2.1),0,6.2832);ctx.stroke();}\n"
    "   if(CFG.fx)for(let i=0;i<7;i++){const pp=(p*1.4+i*.09)%1;const a=i*2.4+this._t*.05;\n"
    "    ctx.globalAlpha=(1-pp)*.8;ctx.fillStyle='#b98cff';\n"
    "    ctx.beginPath();ctx.arc(q[0]+Math.cos(a)*C*.5*(1-pp*2),q[1]+Math.sin(a)*C*.4*(1-pp*2)-pp*C*1.4,2.4*(1-pp)+.5,0,6.2832);ctx.fill();}\n"
    "   ctx.restore();return true;}\n"
    "  if(e.kind==='krRise'){const life=50;if(age>life)return false;const p=age/life,q=this.center(e.r,e.c);\n"
    "   ctx.save();\n"
    "   for(let i=0;i<3;i++){const pp=Math.min(1,Math.max(0,p*1.3-i*.18));if(pp<=0)continue;\n"
    "    ctx.globalAlpha=(1-pp)*.7;ctx.strokeStyle='#e0ccff';ctx.lineWidth=2.6*(1-pp)+.6;\n"
    "    ctx.beginPath();ctx.arc(q[0],q[1],C*(.25+pp*2.3),0,6.2832);ctx.stroke();}\n"
    "   if(CFG.fx)for(let i=0;i<10;i++){const a=i/10*6.2832;const d=C*(.4+p*1.9);\n"
    "    ctx.globalAlpha=(1-p)*.85;ctx.fillStyle='#d5b8ff';\n"
    "    ctx.beginPath();ctx.arc(q[0]+Math.cos(a)*d,q[1]+Math.sin(a)*d-p*8,2.6*(1-p)+.6,0,6.2832);ctx.fill();}\n"
    "   ctx.restore();return true;}\n"
    "  if(e.kind==='krThrow'){const life=24;if(age>life)return false;const p=age/life;\n"
    "   const x=e.from[0]+(e.to[0]-e.from[0])*p,y=e.from[1]+(e.to[1]-e.from[1])*p-Math.sin(p*Math.PI)*C*1.3;\n"
    "   ctx.save();ctx.globalAlpha=.95;ctx.font=Math.round(C*.72)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';\n"
    "   ctx.translate(x,y);ctx.rotate(Math.sin(p*Math.PI*2)*.35);ctx.fillText(e.glyph,0,0);\n"
    "   ctx.restore();return true;}\n"
    "  if(e.kind==='krBoom'){const life=54;if(age>life)return false;const p=age/life;\n"
    "   ctx.save();\n"
    "   for(const c of e.cells){const q=this.center(c[0],c[1]);\n"
    "    ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle='#c9a6ff';ctx.lineWidth=3*(1-p)+1;\n"
    "    ctx.beginPath();ctx.arc(q[0],q[1],C*(.2+p*.9),0,6.2832);ctx.stroke();\n"
    "    ctx.globalAlpha=(1-p)*.5;ctx.fillStyle='#8a4bcf';\n"
    "    ctx.beginPath();ctx.arc(q[0],q[1],C*.4*(1-p),0,6.2832);ctx.fill();}\n"
    "   ctx.restore();return true;}\n")

# ============================ JS: приложение ============================

# 28. App: состояние флипа
rep("setup:{ships:[],sel:0,dir:'h',drag:null},pick:[],boards:{},busy:false,over:false};",
    "setup:{ships:[],sel:0,dir:'h',drag:null},pick:[],boards:{},busy:false,over:false,flip:false};")

# 29. renderMenu: класс босс-карточки + иконка из режима
rep("  const b=document.createElement('button');b.className='mcard'+(App.mode===id?' sel':'');b.type='button';",
    "  const b=document.createElement('button');b.className='mcard'+(m.boss?' bossMode':'')+(App.mode===id?' sel':'');b.type='button';")
rep("  b.innerHTML='<div class=\"mck\">✓</div><div class=\"mct\">'+(id==='simple'?'🏝':'🌊')+' '+m.name+'</div><div class=\"mcs\">'+m.label+'</div><div class=\"mcd\">'+m.desc+'</div>';",
    "  b.innerHTML='<div class=\"mck\">✓</div><div class=\"mct\">'+(m.icon||(id==='simple'?'🏝':'🌊'))+' '+m.name+'</div><div class=\"mcs\">'+m.label+'</div><div class=\"mcd\">'+m.desc+'</div>';")

# 30. renderMenu: босс — без выбора соперника
rep(" $('name2Wrap').hidden=App.opp!=='local';",
    " $('name2Wrap').hidden=App.opp!=='local';\n"
    " const ow=$('oppWrap');if(ow)ow.hidden=!!(MODES[App.mode]&&MODES[App.mode].boss);")

# 31. newMatch: соперник «Кракен», без Bot, первый ход игрока
rep("function newMatch(starter){\n"
    " App.names=[($('menuName1').value||'Капитан 1').trim().slice(0,14),\n"
    "            App.opp==='bot'?'Компьютер':($('menuName2').value||'Капитан 2').trim().slice(0,14)];\n"
    " App.m=new Match(App.mode,App.names);\n"
    " App.m.starter=starter==null?(Math.random()<.5?0:1):starter;\n"
    " App.bot=App.opp==='bot'?new Bot(App.level,App.m.n,App.m.islands,App.m.fleetSizes):null;",
    "function newMatch(starter){\n"
    " if(App.mode==='kraken')App.opp='bot';\n"
    " App.names=[($('menuName1').value||'Капитан 1').trim().slice(0,14),\n"
    "            App.mode==='kraken'?'🐙 Кракен':(App.opp==='bot'?'Компьютер':($('menuName2').value||'Капитан 2').trim().slice(0,14))];\n"
    " App.m=new Match(App.mode,App.names);\n"
    " App.m.starter=starter==null?(Math.random()<.5?0:1):starter;\n"
    " if(App.m.boss)App.m.starter=0;\n"
    " App.bot=(App.opp==='bot'&&!App.m.boss)?new Bot(App.level,App.m.n,App.m.islands,App.m.fleetSizes):null;")

# 32. Доска расстановки: цвета босса
rep(" App.boards.setup=new BoardView($('setupCanvas'),{n:App.m.n,islands:App.m.islands,cell:fitCell(App.m.n),waterColor:MODES[App.mode]?.color,",
    " App.boards.setup=new BoardView($('setupCanvas'),{n:App.m.n,islands:App.m.islands,cell:fitCell(App.m.n),waterColor:MODES[App.mode]?.color,waterColor2:MODES[App.mode]?.color2,gridColor:MODES[App.mode]?.grid,")

# 33. Готов -> бой сразу (без выбора карт) в боссе
rep(" Sound.play('shield');\n"
    " if(App.opp==='bot'){\n"
    "  App.m.setFleet(1,randomFleet(App.m.n,App.m.islands,App.m.fleetSizes));App.m.markReady(1);\n"
    "  enterCards();",
    " Sound.play('shield');\n"
    " if(App.m.boss){enterBattle();}\n"
    " else if(App.opp==='bot'){\n"
    "  App.m.setFleet(1,randomFleet(App.m.n,App.m.islands,App.m.fleetSizes));App.m.markReady(1);\n"
    "  enterCards();")

# 34. enterBattle: вкладка «Мой флот», заголовок босса
rep("function enterBattle(){\n"
    " App.viewSeat=App.opp==='bot'?0:App.m.turn;\n"
    " App.tab='enemy';App.aim=null;App.card=null;App.busy=false;\n"
    " $('banner').className='banner';$('banner').textContent='Выбери клетку и подтверди выстрел';",
    "function enterBattle(){\n"
    " App.viewSeat=App.opp==='bot'?0:App.m.turn;\n"
    " App.tab=App.m.boss?'own':'enemy';App.aim=null;App.card=null;App.busy=false;\n"
    " $('banner').className='banner';$('banner').textContent=App.m.boss?'🐙 Кракен в твоих водах! Выбери клетку чудовища и подтверди выстрел':'Выбери клетку и подтверди выстрел';")

# 35. Боевые доски: цвета босса, флип, стрельба по своему полю в боссе
rep(" App.boards.enemy=new BoardView($('enemyCanvas'),{n:n,islands:App.m.islands,cell:cell,waterColor:MODES[App.mode]?.color,\n"
    "  onCell:battleClick,onHover:()=>{},onFrame:updateZoom});\n"
    " App.boards.own=new BoardView($('ownCanvas'),{n:n,islands:App.m.islands,cell:cell,onCell:ownClick,waterColor:MODES[App.mode]?.color});",
    " App.boards.enemy=new BoardView($('enemyCanvas'),{n:n,islands:App.m.islands,cell:cell,waterColor:MODES[App.mode]?.color,waterColor2:MODES[App.mode]?.color2,gridColor:MODES[App.mode]?.grid,flip:App.flip,\n"
    "  onCell:battleClick,onHover:()=>{},onFrame:updateZoom});\n"
    " App.boards.own=new BoardView($('ownCanvas'),{n:n,islands:App.m.islands,cell:cell,onCell:App.m.boss?battleClick:ownClick,waterColor:MODES[App.mode]?.color,waterColor2:MODES[App.mode]?.color2,gridColor:MODES[App.mode]?.grid,flip:App.flip});")

# 36. battleClick: в боссе стреляем по своей доске (Кракен в наших водах)
rep(" if(App.tab!=='enemy')return;",
    " if(!App.m.boss&&App.tab!=='enemy')return;")

# 37. renderBattle: HP-бар, скрытие вкладок/карт/флота соперника, подпись режима
rep(" $('modeChip').lastElementChild.textContent=(App.opp==='bot'?'Компьютер · '+({easy:'лёгкий',normal:'средний',hard:'сложный'})[App.level]:(App.opp==='online'?'Сеть':'Дуэль вдвоём'));",
    " $('modeChip').lastElementChild.textContent=(App.m.boss?'🐙 Босс: Кракен':(App.opp==='bot'?'Компьютер · '+({easy:'лёгкий',normal:'средний',hard:'сложный'})[App.level]:(App.opp==='online'?'Сеть':'Дуэль вдвоём')));\n"
    " if(m.boss)App.tab='own';\n"
    " $('boardTabs').hidden=!!m.boss;$('handZone').hidden=!!m.boss;$('enemyStat').hidden=!!m.boss;\n"
    " const kb=$('krakenBar');\n"
    " if(m.boss&&m.kraken){kb.hidden=false;\n"
    "  $('krakenHPFill').style.width=Math.max(0,Math.round(m.kraken.hp/m.kraken.max*100))+'%';\n"
    "  $('krakenHPTxt').textContent='HP: '+Math.max(0,m.kraken.hp)+'/'+m.kraken.max;}\n"
    " else kb.hidden=true;")

# 38. renderBattle: своё поле в боссе — выстрелы игрока (без меток на теле Кракена) + отрисовка монстра
rep(" if(ob){ob.ships=v.me.ships;ob.shots={};ob.enemyShots=v.enemyShots;ob.aim=null;\n"
    "  ob.shieldCells=new Set(v.me.shields||[]);\n"
    "  ob.aim=(App.tab==='own'&&App.card==='shield'&&App.aim)?App.aim:null;}",
    " if(ob){ob.ships=v.me.ships;\n"
    "  if(m.boss){const flt={};for(const kk in v.myShots){\n"
    "   if(v.kraken&&v.kraken.hits.some(p=>K(p[0],p[1])===kk))continue;flt[kk]=v.myShots[kk];}ob.shots=flt;}\n"
    "  else ob.shots={};\n"
    "  ob.enemyShots=v.enemyShots;\n"
    "  ob.shieldCells=new Set(v.me.shields||[]);\n"
    "  ob.kraken=(m.boss&&v.kraken)?{r:v.kraken.r,c:v.kraken.c,hits:new Set(v.kraken.hits.map(p=>K(p[0],p[1])))}:null;\n"
    "  ob.aim=((m.boss||(App.tab==='own'&&App.card==='shield'))&&App.aim)?App.aim:null;}")

# 39. renderAim: прицел на своём поле в боссе
rep(" const visible=mine&&(App.aim||need)&&(App.tab==='enemy'||need);",
    " const visible=mine&&(App.aim||need)&&(App.tab==='enemy'||need||(App.m&&App.m.boss));")

# 40. updateZoom: лупа с учётом босса и флипа
rep("function updateZoom(){\n"
    " const bv=App.boards.enemy,z=$('zoom');\n"
    " if(!bv||!App.aim||z.hidden)return;\n"
    " const ctx=z.getContext('2d'),Z=72,C=bv.cell,P=bv.pad;\n"
    " ctx.clearRect(0,0,Z,Z);ctx.fillStyle='#9fe2ee';ctx.fillRect(0,0,Z,Z);\n"
    " const sx=(P+App.aim.c*C-C)*bv.dpr,sy=(P+App.aim.r*C-C)*bv.dpr,s=C*3*bv.dpr;",
    "function updateZoom(){\n"
    " const bv=(App.m&&App.m.boss)?App.boards.own:App.boards.enemy,z=$('zoom');\n"
    " if(!bv||!App.aim||z.hidden)return;\n"
    " const ctx=z.getContext('2d'),Z=72,C=bv.cell,P=bv.pad;\n"
    " ctx.clearRect(0,0,Z,Z);ctx.fillStyle='#9fe2ee';ctx.fillRect(0,0,Z,Z);\n"
    " const ar=bv.flip?bv.n-1-App.aim.r:App.aim.r,ac=bv.flip?bv.n-1-App.aim.c:App.aim.c;\n"
    " const sx=(P+ac*C-C)*bv.dpr,sy=(P+ar*C-C)*bv.dpr,s=C*3*bv.dpr;")

# 41. playEffects: эффекты в боссе идут на своём поле; гибель Кракена — krBoom
rep("function playEffects(seat,kind,act,out){\n"
    " const bv=boardFor(seat);if(!bv)return 400;",
    "function playEffects(seat,kind,act,out){\n"
    " const boss=App.m&&App.m.boss;const bv=boss?App.boards.own:boardFor(seat);if(!bv)return 400;")
rep("   if(out.sunkCells)bv.addEffect({kind:'sink',cells:out.sunkCells});},260);",
    "   if(out.sunkCells)bv.addEffect({kind:boss?'krBoom':'sink',cells:out.sunkCells});},260);")

# 42. showResult: тексты для босса
rep("function showResult(seat,kind,act,out){\n"
    " const mine=seat===App.viewSeat;const who=mine?'Ты':'Соперник';",
    "function showResult(seat,kind,act,out){\n"
    " const mine=seat===App.viewSeat;const who=mine?'Ты':'Соперник';\n"
    " if(App.m&&App.m.boss&&kind==='fire'){\n"
    "  const map={miss:['','💧 '+who+': мимо — '+coord(act.r,act.c)],\n"
    "   hit:['hit','⚡ '+who+': ранил Кракена — '+coord(act.r,act.c)],\n"
    "   sunk:['sunk','🏆 '+who+': КРАКЕН ПОВЕРЖЕН!'],\n"
    "   blocked:['blocked','🛡 Щит погасил попадание — '+coord(act.r,act.c)]};\n"
    "  const r=map[out.res]||map.miss;banner(r[0],r[1]);return;}")

# 43. Журнал: атака Кракена
rep("  else if(e.t==='torpedo'){cls=mine?'me':'foe';\n"
    "   txt=(mine?'Твоя':'Чужая')+' торпеда: <b>'+e.hits.length+'</b> поражений';}",
    "  else if(e.t==='torpedo'){cls=mine?'me':'foe';\n"
    "   txt=(mine?'Твоя':'Чужая')+' торпеда: <b>'+e.hits.length+'</b> поражений';}\n"
    "  else if(e.t==='krAttack'){cls='foe';\n"
    "   const nm={anchor:'Якорь ⚓',barrel:'Бочку 🛢',wreck:'Обломки 🚢'}[e.item]||e.item;\n"
    "   const hits=(e.results||[]).filter(r2=>r2.res==='hit'||r2.res==='sunk').length;\n"
    "   txt='🐙 Кракен бросил <b>'+nm+'</b> — поражений: <b>'+hits+'</b>';}")

# 44. maybeBot: босс вместо бота
rep(" if(App.opp!=='bot'||!App.m||App.m.phase!=='battle'||App.m.turn!==1)return;\n"
    " App.busy=true;renderBattle();",
    " if(App.opp!=='bot'||!App.m||App.m.phase!=='battle'||App.m.turn!==1)return;\n"
    " if(App.m.boss){krakenTurn();return;}\n"
    " App.busy=true;renderBattle();")

# 45. krakenTurn: погружение -> перемещение -> всплытие -> атака
rep("  if(!act){App.busy=false;renderBattle();return;}\n"
    "  App.busy=false;applyAction(1,act);\n"
    " },800+Math.random()*500);}",
    "  if(!act){App.busy=false;renderBattle();return;}\n"
    "  App.busy=false;applyAction(1,act);\n"
    " },800+Math.random()*500);}\n"
    "function krakenTurn(){\n"
    " const m=App.m;if(!m||!m.boss||m.phase!=='battle'||m.turn!==1)return;\n"
    " App.busy=true;renderBattle();\n"
    " const bv=App.boards.own,kr=m.kraken;\n"
    " setTimeout(()=>{\n"
    "  if(!App.m||App.m.phase!=='battle'){App.busy=false;renderBattle();return;}\n"
    "  banner('recon','🐙 Кракен погружается…');Sound.play('splash');\n"
    "  if(bv){bv.addEffect({kind:'krDive',r:kr.r+1,c:kr.c+1});bv.krakenGone=true;renderBattle();}\n"
    "  setTimeout(()=>{\n"
    "   if(!App.m||App.m.phase!=='battle'){App.busy=false;renderBattle();return;}\n"
    "   m.krakenRelocate();\n"
    "   if(bv){bv.krakenGone=false;bv.addEffect({kind:'krRise',r:kr.r+1,c:kr.c+1});}\n"
    "   Sound.play('kraken');banner('recon','🌊 Кракен всплыл в новом месте!');\n"
    "   saveGame();renderBattle();\n"
    "   setTimeout(()=>{\n"
    "    if(!App.m||App.m.phase!=='battle'){App.busy=false;renderBattle();return;}\n"
    "    const out=m.krakenAttack();saveGame();\n"
    "    const gl={anchor:'⚓',barrel:'🛢',wreck:'🚢'}[out.item]||'⚓';\n"
    "    const nm={anchor:'ЯКОРЬ',barrel:'БОЧКУ',wreck:'ОБЛОМКИ'}[out.item]||out.item;\n"
    "    banner('hit','🐙 Кракен швыряет '+nm+'!');\n"
    "    if(bv){const from=bv.center(kr.r+1,kr.c+1);\n"
    "     out.results.forEach((h,i)=>{setTimeout(()=>{\n"
    "      bv.addEffect({kind:'krThrow',from:from,to:bv.center(h.cell[0],h.cell[1]),glyph:gl});\n"
    "      setTimeout(()=>{\n"
    "       bv.addEffect({kind:'splash',r:h.cell[0],c:h.cell[1],color:(h.res==='miss')?'#ffffff':'#ff9aa8'});\n"
    "       if(h.res==='sunk'&&h.sunkCells)bv.addEffect({kind:'sink',cells:h.sunkCells});\n"
    "       if(h.res!=='miss')bv.shake=Math.max(bv.shake,h.res==='sunk'?12:8);\n"
    "       Sound.play(h.res==='miss'?'splash':h.res==='sunk'?'sunk':'hit');},430);},500*i+280);});}\n"
    "    renderBattle();\n"
    "    const wait=500*out.results.length+280+430+900;\n"
    "    setTimeout(()=>{\n"
    "     App.busy=false;\n"
    "     if(!App.m){renderBattle();return;}\n"
    "     if(App.m.phase==='finished'){finish();return;}\n"
    "     const hits=(out.results||[]).filter(r3=>r3.res==='hit'||r3.res==='sunk').length;\n"
    "     banner(hits?'hit':'',hits?('💥 Кракен нанёс повреждений: '+hits+' — твой ход!'):'💧 Кракен промахнулся — твой ход!');\n"
    "     renderBattle();\n"
    "    },wait);\n"
    "   },1050);\n"
    "  },1150);\n"
    " },750);}")

# 46. finish: примечание в окне победы
rep("function finish(){\n"
    " App.over=true;try{localStorage.removeItem('ci:save');}catch(e){}\n"
    " const v=App.m.viewFor(App.viewSeat);",
    "function finish(){\n"
    " App.over=true;try{localStorage.removeItem('ci:save');}catch(e){}\n"
    " const v=App.m.viewFor(App.viewSeat);\n"
    " const rn=$('revealNote');if(rn)rn.textContent=App.m.boss?'🐙 Поверженный Кракен остаётся виден на твоём поле.':'Расстановка соперника открыта на поле — вкладка «Ищу противника».';")

# 46b. finish: подзаголовок итога для босса
rep(" $('overSub').textContent=win?'Весь чужой флот на дне. Чистая работа, капитан.':'Флот потоплен, но море большое. Реванш — и начинающий поменяется.';",
    " $('overSub').textContent=win?'Весь чужой флот на дне. Чистая работа, капитан.':'Флот потоплен, но море большое. Реванш — и начинающий поменяется.';\n"
    " if(App.m.boss)$('overSub').textContent=win?'Чудовище повержено — твои воды снова чисты!':'Кракен утащил твой флот на дно. Реванш — и начинающий поменяется.';")

# 47. Кнопка «Перевернуть доску»
rep("$('btnLeave').onclick=()=>{toMenu();};",
    "$('btnLeave').onclick=()=>{toMenu();};\n"
    "$('btnFlip').onclick=()=>{App.flip=!App.flip;Sound.play('click');\n"
    " for(const k in App.boards)if(App.boards[k])App.boards[k].flip=App.flip;\n"
    " toast(App.flip?'🔄 Доска перевёрнута':'Доска возвращена, как была','good');};")

# 48. Продолжение партии: без Bot в боссе
rep(" App.bot=App.opp==='bot'?new Bot(App.level,App.m.n,App.m.islands,App.m.fleetSizes):null;\n"
    " if(App.bot)App.m.shots[1].forEach((v,k)=>App.bot.tried.add(k));",
    " App.bot=(App.opp==='bot'&&!App.m.boss)?new Bot(App.level,App.m.n,App.m.islands,App.m.fleetSizes):null;\n"
    " if(App.bot)App.m.shots[1].forEach((v,k)=>App.bot.tried.add(k));")

# 49. Звук Кракена
rep("  stealth:()=>{noise(.5,.1,1400);tone(1400,.4,'sine',.06,0,300);},",
    "  stealth:()=>{noise(.5,.1,1400);tone(1400,.4,'sine',.06,0,300);},\n"
    "  kraken:()=>{tone(72,.9,'sawtooth',.2,0,38);noise(.8,.12,110);tone(48,1.1,'sine',.16,.1,30);},")

# ============================ применение ============================

def main():
    s = open(SRC, encoding='utf-8').read()
    for i, (old, new) in enumerate(E, 1):
        cnt = s.count(old)
        if cnt != 1:
            print('FAIL: правка #%d найдена %d раз(а). Начало якоря: %r' % (i, cnt, old[:100]))
            sys.exit(1)
        s = s.replace(old, new)
    for p in OUTS:
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            f.write(s)
    print('OK: применено правок: %d; размер файла: %d байт' % (len(E), len(s.encode("utf-8"))))
    for p in OUTS:
        print('  ->', p)

if __name__ == '__main__':
    main()
