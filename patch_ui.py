import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        print("ОШИБКА: index.html не найден.")
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Меняем дизайн карточки на роскошный
    old_panel = """<div class="panel" id="histCardPanel" style="margin-top: 15px; display: none; border: 1px solid var(--amber);">
      <div class="pin">
        <h3 class="hsec" id="histTitle" style="color: var(--amber)">Локация</h3>
        <p class="lead" id="histText" style="font-size: 14px;"></p>
      </div>
    </div>"""

    new_panel = """<div class="panel" id="histCardPanel" style="margin-top: 15px; display: none; background: linear-gradient(135deg, rgba(226,169,63,0.15), rgba(5,26,38,0.95)); border: 2px solid var(--amber); box-shadow: 0 0 20px rgba(226,169,63,0.3); border-radius: 16px; overflow: hidden; position: relative;">
      <div style="position: absolute; top:0; left:0; width: 100%; height: 4px; background: linear-gradient(90deg, transparent, var(--amber), transparent);"></div>
      <div class="pin" style="display: flex; gap: 15px; align-items: center; padding: 18px;">
        <div id="histIcon" style="font-size: 45px; line-height: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));">⚓</div>
        <div style="flex: 1;">
          <h3 class="hsec" id="histTitle" style="color: var(--amber); margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1.5px; font-size: 16px;">Локация</h3>
          <p class="lead" id="histText" style="font-size: 14.5px; font-style: italic; color: var(--warm); margin: 0; line-height: 1.5;"></p>
        </div>
      </div>
    </div>"""
    
    html = html.replace(old_panel, new_panel)

    # 2. Добавляем динамические иконки при выборе карты
    old_logic = """document.getElementById('histTitle').innerText = MODES[App.mode].name + ' (' + MODES[App.mode].label + ')';
            document.getElementById('histText').innerText = MODES[App.mode].card;"""
    
    new_logic = """const icons = {trafalgar: '⚔️', sinop: '🌊', caribbean: '🏴‍☠️'};
            document.getElementById('histIcon').innerText = icons[App.mode] || '⚓';
            document.getElementById('histTitle').innerText = MODES[App.mode].name + ' (' + MODES[App.mode].label + ')';
            document.getElementById('histText').innerText = MODES[App.mode].card;"""
        
    html = html.replace(old_logic, new_logic)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

    print("✅ ДИЗАЙН КАРТОЧЕК ОБНОВЛЕН! Теперь они выглядят как артефакты.")

if __name__ == "__main__":
    patch()