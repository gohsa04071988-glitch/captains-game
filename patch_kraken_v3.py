import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    print("1. Делаю Кракена видимым...")
    # Принудительно показываем корабли Кракена на поле
    old_render = "const eb=App.boards.enemy,ob=App.boards.own;"
    new_render = """
    const eb=App.boards.enemy,ob=App.boards.own;
    if (App.mode === 'kraken' && App.m.ships[1] && eb) {
        eb.ships = App.m.ships[1]; // Кракен всегда виден!
    }
    """
    html = html.replace(old_render, new_render)

    print("2. Вживляю логику движения и атак...")
    # Полностью переписываем ход бота для режима Кракена
    old_bot = "function maybeBot(){"
    new_bot = """
    function maybeBot(){
        if (App.mode === 'kraken' && App.m && App.m.turn === 1 && App.m.phase === 'battle') {
            App.busy = true; renderBattle();
            
            setTimeout(() => {
                const n = App.m.n;
                
                // 1. Кракен ныряет и меняет позицию
                let nr = Math.floor(Math.random() * (n - 3));
                let nc = Math.floor(Math.random() * (n - 3));
                let newCells = [];
                for(let i=0; i<3; i++) for(let j=0; j<3; j++) newCells.push([nr+i, nc+j]);
                App.m.ships[1][0].cells = newCells;
                
                // Эффект всплеска при погружении
                const eb = App.boards.enemy;
                if(eb) eb.addEffect({kind:'splash', r: nr+1, c: nc+1, color:'#b98cff'});
                Sound.play('plop');

                // 2. Выбираем тип атаки
                let attacks = [
                    {name:'⚓ Якорь', icon:'⚓'}, 
                    {name:'🛢️ Бочка', icon:'🛢️'}, 
                    {name:'🚢 Обломки', icon:'🚢'}
                ];
                let atk = attacks[Math.floor(Math.random() * attacks.length)];
                
                // Бьем по случайной клетке игрока
                let tr = Math.floor(Math.random() * n);
                let tc = Math.floor(Math.random() * n);
                
                // Наносим урон напрямую (чтобы игра не зависла)
                let myShip = App.m.ships[0].find(s => s.cells.some(p => p[0]===tr && p[1]===tc));
                if (myShip) myShip.hits.push([tr, tc]);

                // Визуал атаки
                const ob = App.boards.own;
                if(ob) ob.addEffect({kind:'splash', r: tr, c: tc, color:'#ff5d73'});
                
                toast('Кракен бросает ' + atk.name + '!', 'bad');
                Sound.play('hit');

                // Возвращаем ход игроку
                App.m.turn = 0;
                if(App.m.round) App.m.round++;
                
                setTimeout(() => {
                    App.busy = false;
                    renderBattle();
                    // Проверка на проигрыш
                    if(App.m.allDead(0)) { App.m.winner = 1; App.m.phase = 'finished'; finish(); }
                }, 1200);

            }, 1000);
            return; // Блокируем стандартный ход
        }
    }
    """
    html = html.replace(old_bot, new_bot)

    print("3. Добавляю кнопку переворота доски...")
    # Добавляем кнопку в интерфейс
    old_leave = '<button class="btn ghost sm" id="btnLeave">← В меню</button>'
    new_leave = """<button class="btn ghost sm" id="btnLeave">← В меню</button>
    <button class="btn ghost sm" id="btnFlip" style="margin-top:10px;">🔄 Перевернуть</button>"""
    html = html.replace(old_leave, new_leave)
    
    # Скрипт для кнопки
    flip_js = """
    setTimeout(() => {
        const flipBtn = document.getElementById('btnFlip');
        if(flipBtn) {
            flipBtn.onclick = () => {
                const wrap = document.getElementById('enemyWrap');
                if(wrap) {
                    if(wrap.style.transform === 'rotate(180deg)') {
                        wrap.style.transform = 'rotate(0deg)';
                    } else {
                        wrap.style.transform = 'rotate(180deg)';
                    }
                }
            };
        }
    }, 1000);
    """
    html = html.replace("/* --- запуск --- */", flip_js + "\n/* --- запуск --- */")

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ ГОТОВО! Кракен теперь виден, двигается и атакует.")

if __name__ == "__main__":
    patch()