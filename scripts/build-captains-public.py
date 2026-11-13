# -*- coding: utf-8 -*-
"""Сборка public/captains.html для публикации.
Берём готовый standalone-файл download/captains.html и добавляем:
  1) ссылку на manifest (установка на главный экран);
  2) регистрацию service worker (работа без интернета).
Регистрация только по http(s): при открытии файла с ноутбука (file://)
эти строки безвредны и игра остаётся самодостаточной.
"""
import re

SRC = '/home/z/my-project/download/captains.html'
DST = '/home/z/my-project/public/captains.html'

html = open(SRC, encoding='utf-8').read()

inject = (
    '<link rel="manifest" href="/captains.webmanifest">\n'
    '<script>\n'
    'try{if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)){\n'
    ' window.addEventListener("load",function(){\n'
    '  navigator.serviceWorker.register("/captains-sw.js",{scope:"/captains.html"}).catch(function(){});\n'
    ' });}}catch(e){}\n'
    '</script>\n'
)

assert '<link rel="icon"' in html, 'нет ссылки на иконку в исходнике'
assert 'captains-sw.js' not in html, 'уже собран'
assert '<link rel="manifest"' not in html, 'manifest уже есть'

html = html.replace('<link rel="icon"', inject + '<link rel="icon"', 1)

open(DST, 'w', encoding='utf-8').write(html)
print('OK', DST, len(html), 'символов')
