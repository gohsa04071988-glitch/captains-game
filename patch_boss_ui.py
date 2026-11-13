import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        print("ОШИБКА: index.html не найден.")
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

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
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✅ ГОТОВО! Кнопка Кракена теперь красная.")
    else:
        print("ВНИМАНИЕ: Строка не найдена (возможно, уже изменена).")

if __name__ == "__main__":
    patch()