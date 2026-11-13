# -*- coding: utf-8 -*-
"""Собирает полный zip исходников игры «Мир по кусочкам» (v1.9) в download/.

Внутри архива — одна папка mir-po-kusochkam-v1.9/ со всем нужным для
восстановления игры: исходники, публичные файлы, паспорт игры, конфиги.
"""
import os
import zipfile
from datetime import date

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "download", "mir-po-kusochkam-v1.9.zip")
TOP = "mir-po-kusochkam-v1.9"

# Что кладём в архив: (путь в проекте, путь внутри архива)
ENTRIES = [
    ("src", "src"),
    ("public", "public"),
    ("docs/game-passport.dsl", "docs/game-passport.dsl"),
    ("package.json", "package.json"),
    ("bun.lock", "bun.lock"),
    ("next.config.ts", "next.config.ts"),
    ("tsconfig.json", "tsconfig.json"),
    ("tailwind.config.ts", "tailwind.config.ts"),
    ("postcss.config.mjs", "postcss.config.mjs"),
    ("components.json", "components.json"),
    ("eslint.config.mjs", "eslint.config.mjs"),
    ("prisma/schema.prisma", "prisma/schema.prisma"),
]

README = """МИР ПО КУСОЧКАМ — копия исходников, версия 1.9
Дата сборки копии: {d}

ЧТО ЭТО ТАКОЕ
  Это полная страховочная копия игры: весь код, картинки (они рисуются
  кодом), иконки, настройки и паспорт игры. Игра хранит прогресс у каждого
  игрока на его устройстве, поэтому база данных ей не нужна.

ЗАЧЕМ ОН
  Если что-то случится с проектом, по этому архиву игра восстанавливается
  целиком. Достаточно передать архив нейросети и попросить развернуть.
  Описание устройства игры — в файле docs/game-passport.dsl (читается
  и человеком, и нейросетью).

ВАЖНО ДЛЯ ИГРЫ ЭТОТ АРХИВ НЕ НУЖЕН
  Играть можно по обычной ссылке в браузере. Игра ставится на главный
  экран телефона/планшета/ноутбука как приложение и работает без
  интернета (версия 1.9 — полный офлайн).

СОСТАВ ПАПКИ
  src/       — код игры (экраны, пазлы, миры, звуки, альбом, родители)
  public/    — иконки, manifest, service worker (офлайн)
  docs/      — паспорт игры
  остальные файлы — настройки проекта (нужны, чтобы игра собиралась)
""".format(d=date.today().strftime("%d.%m.%Y"))


def main():
    count = 0
    total = 0
    if os.path.exists(OUT):
        os.remove(OUT)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr(TOP + "/README-что-это.txt", README)
        for src_rel, dst_rel in ENTRIES:
            src = os.path.join(ROOT, src_rel)
            if not os.path.exists(src):
                raise SystemExit("НЕ НАЙДЕНО: " + src_rel)
            if os.path.isfile(src):
                z.write(src, TOP + "/" + dst_rel)
                count += 1
                total += os.path.getsize(src)
            else:
                for dirpath, _dirnames, filenames in os.walk(src):
                    for fn in sorted(filenames):
                        full = os.path.join(dirpath, fn)
                        rel = os.path.relpath(full, ROOT)
                        z.write(full, TOP + "/" + rel)
                        count += 1
                        total += os.path.getsize(full)
    zsize = os.path.getsize(OUT)
    print("Файлов в архиве: {}".format(count))
    print("Исходный размер: {:.1f} КБ".format(total / 1024.0))
    print("Размер zip:      {:.1f} МБ".format(zsize / 1024.0 / 1024.0))
    print("Путь:            {}".format(OUT))
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
        bad = z.testzip()
    print("Проверка целостности: {}".format("ОШИБКА " + str(bad) if bad else "ок"))
    print("Всего записей: {}".format(len(names)))
    for n in names[:8]:
        print("  ", n)
    print("   ...")


if __name__ == "__main__":
    main()
