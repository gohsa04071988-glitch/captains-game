import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        print("ОШИБКА: index.html не найден в этой папке.")
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    if "HIST_MODES" in html:
        print("ВНИМАНИЕ: Исторические локации уже добавлены!")
        return

    print("1. Добавляю исторические данные и цвета...")
    hist_data = """
    const HIST_MODES = {
      trafalgar: {id:'trafalgar', name:'Трафальгар', n:8, fleet:[4,3,2,2], islands:[[1,1],[1,6],[6,1],[6,6]], recon:3, label:'8 × 8 · 1805', desc:'Англия против Франции и Испании.', card:'21 октября 1805 года. Британский флот под командованием адмирала Нельсона разбил объединенный франко-испанский флот. Штормовое море, деревянные парусники.', color:'#142b40'},
      sinop: {id:'sinop', name:'Синоп', n:6, fleet:[3,2,2], islands:[[2,2],[3,3]], recon:2, label:'6 × 6 · 1853', desc:'Россия против Турции.', card:'30 ноября 1853 года. Черноморский флот под командованием адмирала Нахимова уничтожил турецкую эскадру в Синопской бухте. Туманное утро, парусники.', color:'#1e3a47'},
      caribbean: {id:'caribbean', name:'Карибы', n:8, fleet:[4,3,2,2], islands:[[2,2],[5,5],[2,5]], recon:3, label:'8 × 8 · XVII век', desc:'Золотой век пиратства.', card:'XVII век. Битвы за испанское золото. Бирюзовая вода, рифы, пальмы и флибустьеры.', color:'#0b5e70'}
    };
    Object.assign(MODES, HIST_MODES);
    """
    html = html.replace("const SHIPNAME={4:'Флагман',3:'Крейсер',2:'Катер'};", "const SHIPNAME={4:'Флагман',3:'Крейсер',2:'Катер'};\n" + hist_data)

    print("2. Учу движок рисовать воду разного цвета...")
    html = html.replace("this.n=o.n;this.islands=o.islands||[];this.cell=o.cell||52;this.pad=14;",
                        "this.n=o.n;this.islands=o.islands||[];this.cell=o.cell||52;this.pad=14;this.waterColor=o.waterColor;")

    html = html.replace("const g=ctx.createLinearGradient(0,0,S,S);g.addColorStop(0,BP.w1);g.addColorStop(1,BP.w2);",
                        "const g=ctx.createLinearGradient(0,0,S,S);g.addColorStop(0,this.waterColor||BP.w1);g.addColorStop(1,BP.w2);")

    html = html.replace("App.boards.setup=new BoardView($('setupCanvas'),{n:App.m.n,islands:App.m.islands,cell:fitCell(App.m.n),",
                        "App.boards.setup=new BoardView($('setupCanvas'),{n:App.m.n,islands:App.m.islands,cell:fitCell(App.m.n),waterColor:MODES[App.mode]?.color,")
    html = html.replace("App.boards.enemy=new BoardView($('enemyCanvas'),{n:n,islands:App.m.islands,cell:cell,",
                        "App.boards.enemy=new BoardView($('enemyCanvas'),{n:n,islands:App.m.islands,cell:cell,waterColor:MODES[App.mode]?.color,")
    html = html.replace("App.boards.own=new BoardView($('ownCanvas'),{n:n,islands:App.m.islands,cell:cell,onCell:ownClick});",
                        "App.boards.own=new BoardView($('ownCanvas'),{n:n,islands:App.m.islands,cell:cell,onCell:ownClick,waterColor:MODES[App.mode]?.color});")

    print("3. Добавляю карточку с историей в меню...")
    card_html = """
    <div class="panel" id="histCardPanel" style="margin-top: 15px; display: none; border: 1px solid var(--amber);">
      <div class="pin">
        <h3 class="hsec" id="histTitle" style="color: var(--amber)">Локация</h3>
        <p class="lead" id="histText" style="font-size: 14px;"></p>
      </div>
    </div>
    """
    html = html.replace('<div class="row">\n        <div class="grow"><input class="txt" id="menuName1"',
                        card_html + '\n      <div class="row">\n        <div class="grow"><input class="txt" id="menuName1"')

    render_logic = """
    const isHist = MODES[App.mode].card !== undefined;
    const histPanel = document.getElementById('histCardPanel');
    if (histPanel) {
        if (isHist) {
            histPanel.style.display = 'block';
            document.getElementById('histTitle').innerText = MODES[App.mode].name + ' (' + MODES[App.mode].label + ')';
            document.getElementById('histText').innerText = MODES[App.mode].card;
        } else {
            histPanel.style.display = 'none';
        }
    }
    """
    html = html.replace("const strip=$('rulesStrip');strip.innerHTML='';",
                        render_logic + "\n    const strip=$('rulesStrip');strip.innerHTML='';")

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ ГОТОВО! Исторические локации добавлены в index.html")

if __name__ == "__main__":
    patch()