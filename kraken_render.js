'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — kraken_render.js  (v2.1)
   ОТРИСОВКА БОССА: море, флот, метки выстрелов, радар, щит,
   эффекты и сам Кракен (щупальца, купол, глаза, клюв).
   window.BossRender(t) каждый кадр зовётся из masterFrame
   в game_core.js (R4): только читает состояние и рисует.

   Состояние B, канвасы bgP/bgK и g объявлены в kraken_boss.js —
   этот файл их не копирует (R5, R7).
   Подключается ПОСЛЕ kraken_boss.js.
   ============================================================ */
function shakeOf(S){
  const dt = nowMs() - S.shakeT0;
  if (S.shakeT0 && dt < 320){
    const k = (1 - dt / 320) * 5;
    return [(Math.random() - .5) * k, (Math.random() - .5) * k];
  }
  return [0, 0];
}

function drawSeaBoss(g, pad, c1, c2, t){
  const grad = g.createLinearGradient(0, pad, 0, pad + BSZ);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.fillRect(pad, pad, BSZ, BSZ);

  g.fillStyle = 'rgba(255,255,255,.045)';
  for (let i = 0; i < 14; i++){
    const xx = pad + ((i * 97 + t * 14) % BSZ);
    const yy = pad + ((i * 61 + t * 9) % BSZ);
    g.beginPath(); g.arc(xx, yy, 1.6, 0, 7); g.fill();
  }

  for (let r = 0; r < BN; r++)
    for (let c = 0; c < BN; c++)
      if ((r + c) % 2){
        g.fillStyle = 'rgba(255,255,255,.022)';
        g.fillRect(pad + c * BC, pad + r * BC, BC, BC);
      }

  g.strokeStyle = 'rgba(150,180,220,.22)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= BN; i++){
    g.moveTo(pad + i * BC + .5, pad);
    g.lineTo(pad + i * BC + .5, pad + BSZ);
    g.moveTo(pad, pad + i * BC + .5);
    g.lineTo(pad + BSZ, pad + i * BC + .5);
  }
  g.stroke();
  g.strokeStyle = 'rgba(170,200,240,.5)';
  g.lineWidth = 1.6;
  g.strokeRect(pad + .8, pad + .8, BSZ - 1.6, BSZ - 1.6);
}

function drawLabels(g, pad, col){
  g.font = 'bold 11px "Segoe UI",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col;
  const L = 'АБВГДЕЖЗИК';
  for (let i = 0; i < BN; i++){
    g.fillText(L[i], pad + i * BC + BC / 2, pad / 2 + 1);
    g.fillText(String(i + 1), pad / 2, pad + i * BC + BC / 2 + 1);
  }
}

function drawFleet(g, S, pad){
  for (const s of S.pShips){
    const hor = s.cells.length < 2 ? true : s.cells[0][0] === s.cells[1][0];
    const rs = s.cells.map(p => p[0]), cs = s.cells.map(p => p[1]);
    const x = pad + Math.min(...cs) * BC, y = pad + Math.min(...rs) * BC;
    const w = (hor ? s.cells.length : 1) * BC, h = (hor ? 1 : s.cells.length) * BC;
    const m = 4;
    const grad = g.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#a37b4e');
    grad.addColorStop(1, '#5c3f26');
    g.fillStyle = grad;
    roundRect(g, x + m, y + m, w - 2 * m, h - 2 * m, 7);
    g.fill();
    g.strokeStyle = '#2e1c10'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(60,36,18,.6)'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < (hor ? s.cells.length : 1); i++){
      g.moveTo(x + i * BC + m, y + m + 2);
      g.lineTo(x + i * BC + m, y + h - m - 2);
    }
    for (let i = 1; i < (hor ? 1 : s.cells.length); i++){
      g.moveTo(x + m + 2, y + i * BC + m);
      g.lineTo(x + w - m - 2, y + i * BC + m);
    }
    g.stroke();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let r = 0; r < BN; r++)
    for (let c = 0; c < BN; c++)
      if (S.pShot[r][c] === 2){
        const x = pad + c * BC, y = pad + r * BC;
        g.fillStyle = 'rgba(15,8,4,.8)';
        g.fillRect(x + 3, y + 3, BC - 6, BC - 6);
        g.font = Math.floor(BC * .55) + 'px serif';
        g.fillText('🔥', x + BC / 2, y + BC / 2 + 1);
      }
}

function drawPlayerMarks(g, S, pad){
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let r = 0; r < BN; r++)
    for (let c = 0; c < BN; c++){
      if (S.pShot[r][c] !== 1) continue;
      const x = pad + c * BC + BC / 2, y = pad + r * BC + BC / 2;
      g.strokeStyle = 'rgba(170,210,255,.85)'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.stroke();
      g.fillStyle = 'rgba(170,210,255,.9)';
      g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
    }
}

function drawKrakenMarks(g, S, pad){
  for (let r = 0; r < BN; r++)
    for (let c = 0; c < BN; c++){
      if (!S.kShot[r][c]) continue;
      const x = pad + c * BC + BC / 2, y = pad + r * BC + BC / 2;
      if (S.kShot[r][c] === 2){
        const rg = g.createRadialGradient(x, y, 1, x, y, 10);
        rg.addColorStop(0, 'rgba(255,60,90,.9)');
        rg.addColorStop(1, 'rgba(120,10,40,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill();
        g.fillStyle = '#5e0d20';
        g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
      } else {
        g.strokeStyle = 'rgba(170,210,255,.8)'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke();
        g.fillStyle = 'rgba(170,210,255,.85)';
        g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
      }
    }
}

function drawRadar(g, S, pad, t){
  if (nowMs() >= S.radarT) return;
  const k = S.kraken;
  const left = pad + k.col * BC, top = pad + k.row * BC;
  const a = .45 + .3 * Math.sin(t * 6);
  g.strokeStyle = 'rgba(255,215,90,' + a + ')';
  g.lineWidth = 2.5;
  g.setLineDash([7, 5]);
  g.strokeRect(left + 1, top + 1, BC * 3 - 2, BC * 3 - 2);
  g.setLineDash([]);
  const rp = (t % 1.4) / 1.4;
  const cx = left + BC * 1.5, cy = top + BC * 1.5;
  g.strokeStyle = 'rgba(255,215,90,' + (1 - rp) * .6 + ')';
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(cx, cy, 6 + rp * 40, 0, 7); g.stroke();
  g.font = '14px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('📡', left + BC * 1.5, top - 2);
}

function drawShield(g, S, pad){
  if (!S.shield) return;
  const x = pad + S.shield[1] * BC, y = pad + S.shield[0] * BC;
  const a = .35 + .2 * Math.sin(nowMs() / 300);
  g.fillStyle = 'rgba(80,220,255,' + a + ')';
  roundRect(g, x + 2, y + 2, BC - 4, BC - 4, 6);
  g.fill();
  g.strokeStyle = 'rgba(120,235,255,.9)'; g.lineWidth = 1.5; g.stroke();
  g.font = '15px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('🛡', x + BC / 2, y + BC / 2 + 1);
}

function drawHoverBoss(g, S, pad, t){
  if (!S.hover || S.phase !== 'player') return;
  const c = Math.floor((S.hover.x - pad) / BC);
  const r = Math.floor((S.hover.y - pad) / BC);
  if (!inB(r, BN) || !inB(c, BN)) return;
  if (S.cardMode === 'torpedo'){
    g.fillStyle = 'rgba(255,215,90,.18)';
    for (let i = 0; i < BN; i++){
      const rr = S.torpDir === 'row' ? r : i;
      const cc = S.torpDir === 'row' ? i : c;
      g.fillRect(pad + cc * BC, pad + rr * BC, BC, BC);
    }
    return;
  }
  const x = pad + c * BC + BC / 2, y = pad + r * BC + BC / 2;
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
  g.beginPath();
  g.moveTo(x - 13, y); g.lineTo(x - 5, y);
  g.moveTo(x + 5, y);  g.lineTo(x + 13, y);
  g.moveTo(x, y - 13); g.lineTo(x, y - 5);
  g.moveTo(x, y + 5);  g.lineTo(x, y + 13);
  g.stroke();
}

function drawFxList(g, list, pad){
  const t = nowMs();
  for (let i = list.length - 1; i >= 0; i--){
    const f = list[i];
    const age = t - f.t0;
    if (age > f.dur + 200){ list.splice(i, 1); continue; }
    if (age < 0) continue;
    const u = age / f.dur;
    const x = pad + f.c * BC + BC / 2, y = pad + f.r * BC + BC / 2;
    if (f.type === 'drop'){
      g.font = '20px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = Math.min(1, u * 3);
      g.fillText(f.emoji, x, y - (1 - u) * 54);
      g.globalAlpha = 1;
    } else if (f.type === 'boom'){
      g.strokeStyle = 'rgba(255,150,40,' + (1 - u) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 4 + u * 20, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,220,90,' + (1 - u) + ')';
      for (let s = 0; s < 6; s++){
        const a = s * 1.05 + u * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * (6 + u * 16), y + Math.sin(a) * (6 + u * 16), 2.2, 0, 7);
        g.fill();
      }
    } else if (f.type === 'splash'){
      g.strokeStyle = 'rgba(170,215,255,' + (1 - u) + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 3 + u * 13, 0, 7); g.stroke();
      g.fillStyle = 'rgba(170,215,255,' + (1 - u) + ')';
      g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
    } else if (f.type === 'ink'){
      const rg = g.createRadialGradient(x, y, 1, x, y, 12 + u * 6);
      rg.addColorStop(0, 'rgba(255,60,90,' + (1 - u) + ')');
      rg.addColorStop(1, 'rgba(90,10,40,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(x, y, 12 + u * 6, 0, 7); g.fill();
    } else if (f.type === 'block'){
      /* щит сработал: поглотил удар и разбился — осколки разлетаются */
      for (let s2 = 0; s2 < 8; s2++){
        const a = s2 * .785 + .35;
        const d1 = 5 + u * 22;
        g.strokeStyle = 'rgba(120,235,255,' + (1 - u) + ')';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
        g.lineTo(x + Math.cos(a) * (d1 + 5), y + Math.sin(a) * (d1 + 5));
        g.stroke();
      }
      g.strokeStyle = 'rgba(90,230,255,' + (1 - u) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 6 + u * 18, 0, 7); g.stroke();
      g.font = '16px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = 1 - u;
      g.fillText('🛡', x, y - 12);
      g.globalAlpha = 1;
    }
  }
}

/* ============================================================
   КАДР БОССА (вызывается из masterFrame в game_core.js)
   ============================================================ */
window.BossRender = function(t){
  const S = B;
  if (!S) return;
  const k = S.kraken;
  if (k.flash > 0) k.flash = Math.max(0, k.flash - .045);

  /* левый канвас — флот игрока */
  g = bgP;
  g.clearRect(0, 0, BSZ + BPAD * 2, BSZ + BPAD * 2);
  g.save();
  const sh1 = shakeOf(S);
  g.translate(sh1[0], sh1[1]);
  drawSeaBoss(g, BPAD, '#12395e', '#0a2038', t);
  drawLabels(g, BPAD, '#7fb7e0');
  drawFleet(g, S, BPAD);
  drawPlayerMarks(g, S, BPAD);
  drawShield(g, S, BPAD);
  drawFxList(g, S.fxP, BPAD);
  g.restore();

  /* правый канвас — море Кракена */
  g = bgK;
  g.clearRect(0, 0, BSZ + BPAD * 2, BSZ + BPAD * 2);
  g.save();
  const sh2 = shakeOf(S);
  g.translate(sh2[0], sh2[1]);
  drawSeaBoss(g, BPAD, '#2a1650', '#170b2e', t);
  drawLabels(g, BPAD, '#c9a6f0');
  drawRadar(g, S, BPAD, t);
  drawKrakenMarks(g, S, BPAD);
  if (k.mode !== 'under'){
    let kx = k.col + 1.5, ky = k.row + 1.5;
    if (k.mode === 'glide' && k.gFrom){       // видный заплыв: скольжение по следу
      const gu = Math.min(1, (nowMs() - k.t0) / k.gDur);
      kx = k.gFrom[0] + (k.gTo[0] - k.gFrom[0]) * gu;
      ky = k.gFrom[1] + (k.gTo[1] - k.gFrom[1]) * gu;
    }
    g.save();
    g.beginPath();
    g.rect(BPAD - 1, BPAD - 1, BSZ + 2, BSZ + 2);
    g.clip();
    drawKraken(g, BPAD + kx * BC, BPAD + ky * BC, t, k);
    g.restore();
  }
  drawHoverBoss(g, S, BPAD, t);
  drawFxList(g, S.fxK, BPAD);
  g.restore();
};
