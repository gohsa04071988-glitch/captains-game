#!/usr/bin/env python3
# Патч captains.html: новый рендер кораблей + shieldCells + купола щита
import io, sys

P = '/home/z/my-project/public/captains.html'
src = io.open(P, encoding='utf-8').read()
new_code = io.open('/home/z/my-project/scripts/new_ship_code.txt', encoding='utf-8').read()

def must_replace(s, old, new, tag):
    if old not in s:
        print('FAIL: marker not found:', tag); sys.exit(1)
    if s.count(old) != 1:
        print('FAIL: marker not unique:', tag, s.count(old)); sys.exit(1)
    return s.replace(old, new)

# 1) Замена блока hullPath + ship на новый ship + shieldDome
start = src.find(' hullPath(x,y,w,h,horiz){const ctx=this.ctx')
end_marker = ' mark(r,c,res,incoming){'
end = src.find(end_marker, start)
if start < 0 or end < 0:
    print('FAIL: ship block bounds'); sys.exit(1)
src = src[:start] + new_code + src[end:]

# 2) Конструктор BoardView: поле shieldCells
src = must_replace(src,
    "this.preview=null;this.previewBad=false;this.torpedoPath=null;this.dim=false;this.effects=[];this.shake=0;",
    "this.preview=null;this.previewBad=false;this.torpedoPath=null;this.dim=false;this.effects=[];this.shake=0;this.shieldCells=null;",
    'ctor shieldCells')

# 3) draw(): купола щита после чужих отметок
src = must_replace(src,
    "for(const k in this.enemyShots){const p=U(k);this.mark(p[0],p[1],this.enemyShots[k],true);}",
    "for(const k in this.enemyShots){const p=U(k);this.mark(p[0],p[1],this.enemyShots[k],true);}\n"
    "  if(this.shieldCells&&this.shieldCells.size)for(const k of this.shieldCells){const p=U(k);this.shieldDome(p[0],p[1]);}",
    'draw domes')

io.open(P, 'w', encoding='utf-8').write(src)
print('OK: ship patched, hullPath removed:', 'hullPath' not in src)
