import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        print("ОШИБКА: index.html не найден.")
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    if "MODES['kraken']" in html:
        print("ВНИМАНИЕ: Кракен уже добавлен в этот файл!")
        return

    print("1. Добавляю режим Босса (Кракен)...")
    kraken_mode = """
    MODES['kraken'] = { id:'kraken', name:'Битва с Кракеном', n:10, fleet:[4,3,2,2], islands:[[1,1],[8,8],[1,8],[8,1]], recon:3, label:'10 × 10 · БОСС', desc:'Сразись с гигантским монстром.', color:'#1a0b2e' };
    """
    html = html.replace("const SHIPNAME={4:'Флагман',3:'Крейсер',2:'Катер'};", "const SHIPNAME={4:'Флагман',3:'Крейсер',2:'Катер'};\n" + kraken_mode)

    print("2. Добавляю полоску здоровья Босса...")
    boss_hp_ui = """
    <div id="bossHpContainer" style="display:none; margin-bottom:15px; background:rgba(255,77,94,0.1); padding:10px; border-radius:12px; border:1px solid var(--danger);">
        <div style="color:var(--danger); font-weight:900; margin-bottom:5px; display:flex; justify-content:space-between;">
            <span>🐙 Здоровье Кракена</span>
            <span id="bossHpText">9 / 9</span>
        </div>
        <div class="bar"><i id="bossHpBar" style="width:100%; background:var(--danger);"></i></div>
    </div>
    """
    html = html.replace('<div class="banner" id="banner">', boss_hp_ui + '\n<div class="banner" id="banner">')

    print("3. Учу игру создавать Кракена...")
    old_bot_setup = "if(App.opp==='bot'){ App.m.setFleet(1,randomFleet(App.m.n,App.m.islands,App.m.fleetSizes));App.m.markReady(1); enterCards(); }"
    new_bot_setup = """
    if(App.opp==='bot'){
        if(App.mode === 'kraken') {
            // Кракен занимает 3x3 в центре поля
            App.m.ships[1] = [{cells: [[4,4],[4,5],[4,6],[5,4],[5,5],[5,6],[6,4],[6,5],[6,6]], hits: []}];
            App.m.ready[1] = true;
            App.m.chooseCards(1, ['radar','shield','torpedo']);
            enterCards();
        } else {
            App.m.setFleet(1,randomFleet(App.m.n,App.m.islands,App.m.fleetSizes));
            App.m.markReady(1);
            enterCards();
        }
    }
    """
    html = html.replace(old_bot_setup, new_bot_setup)

    print("4. Подключаю отображение здоровья...")
    old_render = "const eb=App.boards.enemy,ob=App.boards.own;"
    new_render = """
    const bossWrap = document.getElementById('bossHpContainer');
    if(bossWrap) {
        if(App.mode === 'kraken' && App.m.ships[1]) {
            bossWrap.style.display = 'block';
            const kraken = App.m.ships[1].find(s => s.cells.length === 9);
            const hits = kraken ? kraken.hits.length : 0;
            const hpLeft = 9 - hits;
            document.getElementById('bossHpText').innerText = hpLeft + ' / 9';
            document.getElementById('bossHpBar').style.width = (hpLeft/9)*100 + '%';
            if(hpLeft <= 0) document.getElementById('bossHpText').innerText = 'МЁРТВ';
        } else {
            bossWrap.style.display = 'none';
        }
    }
    const eb=App.boards.enemy,ob=App.boards.own;
    """
    html = html.replace(old_render, new_render)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ ГОТОВО! Кракен добавлен. Проверь игру локально.")

if __name__ == "__main__":
    patch()