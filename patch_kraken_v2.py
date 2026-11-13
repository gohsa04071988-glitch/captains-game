import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    print("1. Уменьшаю корабли для поля 10x10...")
    # Уменьшаем масштаб отрисовки кораблей
    html = html.replace("ctx.translate(cx,cy);ctx.rotate(horiz?0:Math.PI/2);",
                        "ctx.translate(cx,cy);ctx.scale(0.82,0.82);ctx.rotate(horiz?0:Math.PI/2);")

    print("2. Добавляю кнопку авто-переворота доски...")
    # Добавляем кнопку в интерфейс
    html = html.replace('<button class="btn ghost sm" id="btnLeave">← В меню</button>',
                        '<button class="btn ghost sm" id="btnLeave">← В меню</button>\n<button class="btn ghost sm" id="btnFlip">🔄 Перевернуть</button>')
    
    # Логика переворота
    flip_js = """
    setTimeout(() => {
        const flipBtn = document.getElementById('btnFlip');
        if(flipBtn) {
            flipBtn.onclick = () => {
                const wrap = document.getElementById('enemyWrap');
                if(wrap.style.transform === 'rotate(180deg)') {
                    wrap.style.transform = 'rotate(0deg)';
                } else {
                    wrap.style.transform = 'rotate(180deg)';
                }
            };
        }
    }, 1000);
    """
    html = html.replace("/* --- запуск --- */", flip_js + "\n/* --- запуск --- */")

    print("3. Оживляю Кракена (движение и атаки)...")
    # Перехватываем ход бота, если выбран режим Кракена
    old_bot = "function maybeBot(){"
    new_bot = """
    function maybeBot(){
        if (App.mode === 'kraken' && App.m && App.m.turn === 1 && App.m.phase === 'battle') {
            App.busy = true; renderBattle();
            setTimeout(() => {
                const n = App.m.n;
                // 1. Кракен ныряет и меняет позицию
                let nr = Math.floor(Math.random() * (n - 3)) + 1;
                let nc = Math.floor(Math.random() * (n - 3)) + 1;
                let newCells = [];
                for(let i=0; i<3; i++) for(let j=0; j<3; j++) newCells.push([nr+i, nc+j]);
                App.m.ships[1][0].cells = newCells;
                
                const eb = App.boards.enemy;
                if(eb) eb.addEffect({kind:'splash', r: nr+1, c: nc+1, color:'#b98cff'}); // Всплеск

                // 2. Выбираем тип атаки
                const attacks = [
                    {name:'⚓ Якорь', cells:1},
                    {name:'🛢️ Бочка', cells:4},
                    {name:'🚢 Обломки', cells:2}
                ];
                let atk = attacks[Math.floor(Math.random() * attacks.length)];
                
                // Бьем по игроку
                let tr = Math.floor(Math.random() * n);
                let tc = Math.floor(Math.random() * n);
                
                // Наносим урон (для простоты бьем в рандомную клетку)
                try {
                    App.m.fire(1, tr, tc);
                    const ob = App.boards.own;
                    if(ob) ob.addEffect({kind:'splash', r: tr, c: tc, color:'#ff5d73'});
                } catch(e) {}

                toast('Кракен атакует: ' + atk.name + '!', 'bad');
                Sound.play('hit');

                setTimeout(() => {
                    App.busy = false;
                    renderBattle();
                }, 1500);

            }, 800);
            return; // Блокируем обычный ход бота
        }
    """
    html = html.replace(old_bot, new_bot)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ ГОТОВО! Кракен теперь двигается, бросает якоря и корабли.")

if __name__ == "__main__":
    patch()