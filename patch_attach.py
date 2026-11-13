import os

def patch():
    file = "index.html"
    if not os.path.exists(file):
        print("ОШИБКА: index.html не найден.")
        return

    with open(file, "r", encoding="utf-8") as f:
        html = f.read()

    # Находим кнопку "В бой" и меняем ее поведение
    old_btn = "$('btnStart').onclick=()=>{Sound.unlock();Sound.play('click');newMatch(null);};"
    
    new_btn = """$('btnStart').onclick=()=>{
        Sound.unlock(); Sound.play('click');
        if (App.mode === 'kraken') {
            // Создаем полноэкранное окно с игрой Кракена
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.inset = '0';
            wrapper.style.zIndex = '9999';
            
            const iframe = document.createElement('iframe');
            iframe.src = 'kraken.html';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.background = '#0c0716';
            
            const closeBtn = document.createElement('button');
            closeBtn.innerText = '✖ Закрыть бой';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '15px';
            closeBtn.style.right = '15px';
            closeBtn.style.zIndex = '10000';
            closeBtn.style.padding = '10px 15px';
            closeBtn.style.background = '#ff4d5e';
            closeBtn.style.color = '#fff';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '8px';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontFamily = 'sans-serif';
            
            closeBtn.onclick = () => wrapper.remove();
            
            wrapper.appendChild(iframe);
            wrapper.appendChild(closeBtn);
            document.body.appendChild(wrapper);
            return;
        }
        newMatch(null);
    };"""

    if old_btn in html:
        html = html.replace(old_btn, new_btn)
        with open(file, "w", encoding="utf-8") as f:
            f.write(html)
        print("✅ ГОТОВО! Кракен прикреплен к кнопке 'В бой'.")
    else:
        # Если предыдущие патчи уже изменили эту кнопку, пробуем найти вариацию
        if "newMatch(null);" in html:
            print("ВНИМАНИЕ: Кнопка 'В бой' уже была изменена ранее. Ищем альтернативный вариант...")
            # Простая замена для существующей логики
            html = html.replace("if (App.mode === 'kraken') {", "if (false) {") # Отключаем старые кривые попытки
            html = html.replace("Sound.unlock(); Sound.play('click');\n            newMatch(null);", new_btn.split("if (App.mode === 'kraken')")[0] + "if (App.mode === 'kraken')" + new_btn.split("if (App.mode === 'kraken')")[1])
            with open(file, "w", encoding="utf-8") as f:
                f.write(html)
            print("✅ ГОТОВО! Скрипт адаптирован под текущий код.")
        else:
            print("ОШИБКА: Не удалось найти кнопку 'В бой' в коде.")

if __name__ == "__main__":
    patch()