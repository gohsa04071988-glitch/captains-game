# Подготовка иконки «Капитаны островов»: кроп внутрь синего поля,
# докраска белых уголков цветом океана, сохранение 512/192.
from PIL import Image
import os

RAW = '/tmp/icon-raw.png'
OUT512 = 'public/captains-icon-512.png'
OUT192 = 'public/captains-icon-192.png'

img = Image.open(RAW).convert('RGB')
S = img.size[0]
m = 70  # отступ: внутрь синего квадрата, чтобы ушла белая рамка
img = img.crop((m, m, S - m, S - m)).resize((1024, 1024), Image.LANCZOS)
px = img.load()


def is_white(p):
    return p[0] > 235 and p[1] > 235 and p[2] > 235


def is_dark(p):
    return p[0] < 90 and p[1] < 95 and p[2] < 110


def is_good(p):
    # настоящий цвет океана: синий, не белый и не тёмный контур
    return not is_white(p) and not is_dark(p) and p[2] > 170 and p[0] < 215


# 1) ищем белые И тёмные пиксели в четырёх угловых областях 150x150
marks = []
R = 150
for x in range(1024):
    for y in range(1024):
        near_corner = (x < R or x >= 1024 - R) and (y < R or y >= 1024 - R)
        if near_corner and (is_white(px[x, y]) or is_dark(px[x, y])):
            marks.append((x, y))
print('плохих пикселей в углах:', len(marks))

# 2) каждый закрашиваем ближайшим настоящим синим (по исходной карте)
orig = {p: px[p] for p in marks}
for x, y in marks:
    found = None
    for d in range(1, 220):
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 1024 and 0 <= ny < 1024:
                key = (nx, ny)
                if key in orig:
                    continue
                p = px[nx, ny]
                if is_good(p):
                    found = p
                    break
        if found:
            break
    px[x, y] = found or (41, 171, 226)

# 3) сохраняем
img.save('/tmp/icon-final.png')
q = img.quantize(colors=256)
q.save(OUT512, 'PNG', optimize=True)
q.resize((192, 192), Image.LANCZOS).save(OUT192, 'PNG', optimize=True)
print('512:', os.path.getsize(OUT512) // 1024, 'КБ; 192:',
      os.path.getsize(OUT192) // 1024, 'КБ')
print('углы:', px[5, 5], px[1018, 5], px[5, 1018], px[1018, 1018])
