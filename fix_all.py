import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Находим сломанную функцию бота и полностью ее перезаписываем
    start_idx = html.find("function maybeBot(){")
    end_str = "},800+Math.random()*500);}"
    end_idx = html.find(end_str, start_idx)
    
    if start_idx != -1 and end_idx != -1:
        end_idx += len(end_str)
        
        clean_bot = """function maybeBot(){
     if(App.mode==='kraken' && App.m && App.m.turn===1 && App.m.phase==='battle'){
         App.busy=true; renderBattle();
         setTimeout(()=>{
             const n=App.m.n;
             let nr=Math.floor(Math.random()*(n-3)) + 1;
             let nc=Math.floor(Math.random()*(n-3)) + 1;
             let newCells=[];
             for(let i=0;i<3;i++) for(let j=0;j<3;j++) newCells.push([nr+i, nc+j]);
             if(App.m.ships[1][0]) App.m.ships[1][0].cells = newCells;
             
             const eb=App.boards.enemy;
             if(eb) eb.addEffect({kind:'splash', r: nr+1, c: nc+1, color:'#b98cff'});
             Sound.play('plop');
             
             let atks=[{name:'⚓ Якорь'},{name:'🛢️ Бочка'},{name:'🚢 Обломки'}];
             let atk=atks[Math.floor(Math.random()*atks.length)];
             
             let tr=Math.floor(Math.random()*n), tc=Math.floor(Math.random()*n);
             let myShip=App.m.ships[0].find(s=>s.cells.some(p=>p[0]===tr && p[1]===tc));
             if(myShip) myShip.hits.push([tr,tc]);
             
             const ob=App.boards.own;
             if(ob) ob.addEffect({kind:'splash', r: tr, c: tc, color:'#ff5d73'});
             toast('Кракен бросает ' + atk.name + '!', 'bad'); Sound.play('hit');
             
             App.m.turn=0; if(App.m.round) App.m.round++;
             setTimeout(()=>{
                 App.busy=false; renderBattle();
                 if(App.m.allDead(0)){ App.m.winner=1; App.m.phase='finished'; finish(); }
             }, 1200);
         }, 800);
         return;
     }
     
     if(App.opp!=='bot'||!App.m||App.m.phase!=='battle'||App.m.turn!==1)return;
     App.busy=true;renderBattle();
     setTimeout(()=>{
      if(!App.m||App.m.phase!=='battle'||App.m.turn!==1){App.busy=false;renderBattle();return;}
      const v=App.m.viewFor(1);let act=App.bot.plan(v);
      if(act.kind==='pass'){const s=App.bot.chooseShot(v);
       if(s)act={kind:'fire',r:s[0],c:s[1]};
       else{const sc=App.bot.shieldCell(v);act=sc?{kind:'shield',r:sc[0],c:sc[1]}:null;}}
      if(!act){App.busy=false;renderBattle();return;}
      App.busy=false;applyAction(1,act);
     },800+Math.random()*500);}"""
        
        html = html[:start_idx] + clean_bot + html[end_idx:]
        print("1. Логика бота восстановлена (без ошибок).")

    # 2. Восстанавливаем карточки в меню (делаем Кракена красным)
    target = """b.innerHTML='<div class="mck">✓</div><div class="mct">'+(id==='simple'?'🏝':'🌊')+' '+m.name+'</div><div class="mcs">'+m.label+'</div><div class="mcd">'+m.desc+'</div>';"""
    if target in html:
        replacement = """if (id === 'kraken') {
              b.style.border = '2px solid var(--danger)';
              b.style.background = 'linear-gradient(160deg, rgba(255,77,94,0.25), rgba(6,42,61,0.9))';
              b.style.boxShadow = App.mode===id ? '0 0 25px var(--danger)' : '0 0 15px rgba(255,77,94,0.4)';
              b.innerHTML = '<div class="mck">✓</div><div class="mct" style="color:var(--danger); font-weight:900; font-size:18px;">🐙 БОСС: КРАКЕН</div><div class="mcs" style="color:#ff8b9c;">'+m.label+'</div><div class="mcd">'+m.desc+'</div>';
          } else {
              b.innerHTML='<div class="mck">✓</div><div class="mct">'+(id==='simple'?'🏝':'🌊')+' '+m.name+'</div><div class="mcs">'+m.label+'</div><div class="mcd">'+m.desc+'</div>';
          }"""
        html = html.replace(target, replacement)
        print("2. Меню восстановлено, Кракен красный.")

    # 3. Кракен всегда виден
    old_render = "const eb=App.boards.enemy,ob=App.boards.own;"
    if old_render in html:
        new_render = """
    const eb=App.boards.enemy,ob=App.boards.own;
    if (App.mode === 'kraken' && App.m.ships[1] && eb) {
        eb.ships = App.m.ships[1];
    }
    """
        html = html.replace(old_render, new_render)
        print("3. Кракен сделан видимым.")

    with open(file, "w", encoding="utf-8") as f:
        f.write(html)
    print("✅ ГОТОВО! Все ошибки исправлены, Кракен на месте.")

if __name__ == "__main__":
    patch()