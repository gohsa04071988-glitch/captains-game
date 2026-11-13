# -*- coding: utf-8 -*-
"""Иконки приложения «Капитаны островов»: якорь на морском фоне.
Рисуются примитивами PIL (без внешних картинок), 1024 → 192/512."""
from PIL import Image, ImageDraw

DEEP = (4, 27, 40)      # тёмное море
SEA = (14, 104, 130)    # светлое море
SAND = (244, 223, 174)  # якорь — песочный
AMBER = (255, 194, 71)  # акцент
SIZE = 1024
RAD = 200               # радиус скругления квадрата


def base_image():
    """Квадрат с вертикальным градиентом моря и скруглёнными углами."""
    img = Image.new('RGB', (SIZE, SIZE), DEEP)
    d = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / SIZE
        c = tuple(int(DEEP[i] + (SEA[i] - DEEP[i]) * t) for i in range(3))
        d.line([(0, y), (SIZE, y)], fill=c)
    # маска со скруглёнными углами
    mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE, SIZE], RAD, fill=255)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def anchor(img):
    d = ImageDraw.Draw(img)
    cx = SIZE // 2
    lw = 46                      # толщина линий
    ring_c = (cx, 250)           # центр кольца
    ring_r = 62
    stem_top = ring_c[1] + ring_r
    stem_bot = 770
    bar_y = 400                  # перекладина
    bar_w = 170
    col = SAND

    # кольцо
    d.ellipse([ring_c[0] - ring_r, ring_c[1] - ring_r,
               ring_c[0] + ring_r, ring_c[1] + ring_r],
              outline=col, width=lw)
    # стержень
    d.line([(cx, stem_top), (cx, stem_bot)], fill=col, width=lw)
    # перекладина
    d.line([(cx - bar_w, bar_y), (cx + bar_w, bar_y)], fill=col, width=lw)
    # круглые концы перекладины
    for x in (cx - bar_w, cx + bar_w):
        d.ellipse([x - lw // 2, bar_y - lw // 2,
                   x + lw // 2, bar_y + lw // 2], fill=col)
    # рога: дуга снизу
    arm_r = 210
    bbox = [cx - arm_r, stem_bot - arm_r, cx + arm_r, stem_bot + arm_r]
    d.arc(bbox, start=0, end=180, fill=col, width=lw)
    # «лапки» на концах дуги
    for sx in (cx - arm_r, cx + arm_r):
        d.ellipse([sx - lw // 2 - 6, stem_bot - lw // 2 - 6,
                   sx + lw // 2 + 6, stem_bot + lw // 2 + 6], fill=col)
    # кольцо крепления верёвки внизу стержня
    d.ellipse([cx - 30, stem_bot - 30, cx + 30, stem_bot + 30], fill=AMBER)
    return img


def wave_accent(img):
    """Лёгкая волна-акцент снизу."""
    import math
    d = ImageDraw.Draw(img, 'RGBA')
    for i, (dy, alpha) in enumerate([(90, 60), (140, 40)]):
        pts = []
        for x in range(0, SIZE + 8, 8):
            y = 880 + dy - i * 30 + int(26 * math.sin(x / 44))
            pts.append((x, y))
        d.line(pts, fill=(127, 230, 224, alpha), width=18, joint='curve')
    return img


def main():
    img = anchor(base_image())
    img = wave_accent(img)
    for size, name in ((512, 'captains-icon-512.png'),
                       (192, 'captains-icon-192.png')):
        img.resize((size, size), Image.LANCZOS).save(
            '/home/z/my-project/public/' + name)
        print('OK', name)


if __name__ == '__main__':
    main()
