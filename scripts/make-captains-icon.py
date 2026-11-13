# Новая иконка «Капитанов островов»: море, остров с пальмой, кораблик под парусом.
# Рисуем с 4-кратным запасом (2048), уменьшаем до 512 и 192.
from PIL import Image, ImageDraw, ImageFilter
import math

S = 2048
img = Image.new('RGB', (S, S), '#03151f')
d = ImageDraw.Draw(img)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# --- фон: вертикальный градиент моря, как в игре ---
top, mid, bot = (16, 100, 130), (7, 64, 90), (3, 21, 31)
for y in range(S):
    t = y / S
    c = lerp(top, mid, t / .42) if t < .42 else lerp(mid, bot, (t - .42) / .58)
    d.line([(0, y), (S, y)], fill=c)

# --- мягкое пятно света сверху справа ---
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([S * .42, -S * .35, S * 1.45, S * .62], fill=(127, 230, 224, 90))
glow = glow.filter(ImageFilter.GaussianBlur(180))
img = Image.alpha_composite(img.convert('RGBA'), glow)
d = ImageDraw.Draw(img)

# --- волны ---
for i, (yy, al) in enumerate([(.30, 46), (.52, 36), (.74, 26)]):
    pts = []
    for x in range(0, S + 1, 16):
        y = S * yy + math.sin(x * .006 + i * 1.9) * S * .022
        pts.append((x, y))
    d.line(pts, fill=(255, 255, 255, al), width=int(S * .012), joint='curve')

def ell_poly(cx, cy, rx, ry, ang, n=28):
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        x = math.cos(a) * rx
        y = math.sin(a) * ry
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang),
                    cy + x * math.sin(ang) + y * math.cos(ang)))
    return pts

def quad(p0, p1, p2, n=32):
    return [( (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t*t * p2[0],
              (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t*t * p2[1]) for t in [i/n for i in range(n+1)]]

# --- остров (внизу слева, как на поле игры) ---
icx, icy = S * .40, S * .72
sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(sh)
sd.ellipse([icx - S * .26, icy - S * .16 + S * .03, icx + S * .26, icy + S * .16 + S * .03],
           fill=(8, 40, 56, 90))
img = Image.alpha_composite(img, sh); d = ImageDraw.Draw(img)
d.polygon(ell_poly(icx, icy, S * .27, S * .19, 0), fill='#f6e3b6', outline=None)
d.polygon(ell_poly(icx - S * .04, icy - S * .03, S * .18, S * .11, 0), fill='#f9ecc9')
d.polygon(ell_poly(icx, icy, S * .27, S * .19, 0), outline=(150, 110, 50, 120))

# --- пальма ---
tx, ty = icx - S * .02, icy - S * .02
topx, topy = tx + S * .015, ty - S * .30
trunk = quad((tx, ty), (tx + S * .03, ty - S * .16), (topx, topy))
for i in range(len(trunk) - 1):
    w = S * .028 * (1 - i / len(trunk) * .4)
    d.line([trunk[i], trunk[i + 1]], fill='#8a5a2b', width=int(w * 2))
for i in range(6):
    a = -math.pi / 2 + (i - 2.5) * .52
    fx = topx + math.cos(a) * S * .085
    fy = topy + math.sin(a) * S * .055
    d.polygon(ell_poly(fx, fy, S * .105, S * .030, a), fill='#2f8f5b' if i % 2 == 0 else '#247a4c')

# --- кораблик (справа) ---
scx, scy = S * .70, S * .56
w_, h_ = S * .30, S * .10
# тень на воде
sh2 = Image.new('RGBA', (S, S), (0, 0, 0, 0))
s2 = ImageDraw.Draw(sh2)
s2.ellipse([scx - w_ * .6, scy + h_ * .35, scx + w_ * .6, scy + h_ * .75], fill=(6, 30, 44, 110))
img = Image.alpha_composite(img, sh2); d = ImageDraw.Draw(img)
# корпус: корма слева скруглена, нос справа заострён
r = h_ * .42
hull = quad((scx - w_ / 2 + r * .4, scy - h_ / 2), (scx + w_ / 2 - r, scy - h_ / 2), (scx + w_ / 2, scy))
hull += quad((scx + w_ / 2, scy), (scx + w_ / 2 - r, scy + h_ / 2), (scx - w_ / 2 + r * .4, scy + h_ / 2))
d.polygon(hull, fill='#2f6f8f')
d.line(hull + [hull[0]], fill='#e9f6fb', width=int(S * .008))
d.polygon([(scx - w_ * .40, scy), (scx + w_ * .34, scy), (scx + w_ * .28, scy + h_ * .26),
           (scx - w_ * .34, scy + h_ * .26)], fill='#e9f6fb')
d.rectangle([scx - w_ * .12, scy - h_ * .34, scx + w_ * .10, scy + h_ * .02], fill='#ffc247')
# мачта и парус
mx = scx - w_ * .02
d.line([(mx, scy - h_ * .34), (mx, scy - h_ * 1.05)], fill='#8a5a2b', width=int(S * .014))
sail = quad((mx, scy - h_ * 1.02), (mx + S * .145, scy - h_ * .62), (mx, scy - h_ * .38))
d.polygon(sail, fill='#f4fbff', outline=(120, 170, 195, 160))
# вымпел
d.polygon([(mx, scy - h_ * 1.05), (mx + S * .055, scy - h_ * .97), (mx, scy - h_ * .92)], fill='#ff5d73')

# --- виньетка по краям, чтобы центр иконки читался ---
vig = Image.new('L', (S, S), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse([S * .06, S * .06, S * .94, S * .94], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(120))
dark = Image.new('RGBA', (S, S), (2, 14, 22, 130))
img = Image.composite(img, Image.alpha_composite(img, dark), vig)

out = img.convert('RGB')

# --- круглая форма: прозрачные углы, гладкий край (суперсэмпл 4x) ---
mask = Image.new('L', (S * 4, S * 4), 0)
md = ImageDraw.Draw(mask)
md.ellipse([0, 0, S * 4, S * 4], fill=255)
mask = mask.resize((S, S), Image.LANCZOS)
out = out.convert('RGBA')
out.putalpha(mask)

rgba512 = out.resize((512, 512), Image.LANCZOS)
rgba512.save('/home/z/my-project/public/captains-icon-512.png', optimize=True)
out.resize((192, 192), Image.LANCZOS).save('/home/z/my-project/public/captains-icon-192.png', optimize=True)

# квадратная непрозрачная версия под webmanifest/maskable (Android сам скругляет)
sq = img.convert('RGB')
sq.resize((512, 512), Image.LANCZOS).save('/home/z/my-project/public/captains-icon-maskable-512.png', optimize=True)
import os
print('512:', os.path.getsize('/home/z/my-project/public/captains-icon-512.png') // 1024, 'КБ;  192:',
      os.path.getsize('/home/z/my-project/public/captains-icon-192.png') // 1024, 'КБ')
