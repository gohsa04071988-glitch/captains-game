'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — game_fx.js
   ЭФФЕКТЫ КЛАССИЧЕСКОГО БОЯ: метки выстрелов, радар, щит,
   торпеда со стрелками, летящий снаряд (полёт и его свист),
   взрывы и брызги. Только рисование и звук полёта (R4):
   состояние меняют game_battle.js и game_cards.js.
   Отрезано от game_core.js (v2.4, R10).
   ============================================================ */

/* метка радара: золотой глаз пульсирует */
function drawRadarC(g, S, PAD, CELL, t){
  const pulse = .5 + .5 * Math.sin(t * 3.4);
  for (const key of S.radarMarks){
    const parts = key.split(',');
    const x = PAD + (+parts[1]) * CELL + CELL / 2;
    const y = PAD + (+parts[0]) * CELL + CELL / 2;
    g.strokeStyle = 'rgba(226,168,66,' + (.5 + .35 * pulse) + ')';
    g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, 8.5 + pulse * 1.6, 0, 7); g.stroke();
    g.fillStyle = 'rgba(122,82,20,.95)';
    g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,244,214,.95)';
    g.beginPath(); g.arc(x - 1, y - 1, 1.1, 0, 7); g.fill();
  }
}

/* значок поднятого щита над своим полем */
function drawShieldC(g, S, PAD, CELL, t){
  if (!S.shieldOn) return;
  const pulse = .7 + .3 * Math.sin(t * 4);
  g.save();
  g.globalAlpha = pulse;
  g.font = Math.floor(CELL * .6) + 'px serif';
  g.textAlign = 'right'; g.textBaseline = 'top';
  g.fillText('🛡', PAD + S.N * CELL - 4, PAD + 4);
  g.restore();
}

/* торпеда: рупор над водой → крупные стрелки → ход по линии */
function drawTorpC(g, S, PAD, CELL, t){
  const u = CELL / 54;
  if (S.torp && S.cardMode === 'torpedo'){
    const x = PAD + S.torp[1] * CELL + CELL / 2;
    const y = PAD + S.torp[0] * CELL + CELL / 2;
    const bob = Math.sin(t * 3.1) * 1.5 * u;

    /* круги на воде вокруг всплывшей торпеды */
    const rp = (t * .9) % 1;
    g.strokeStyle = 'rgba(255,255,255,' + (.55 * (1 - rp)).toFixed(3) + ')';
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(x, y, (5 + rp * 13) * u, 0, 7); g.stroke();

    /* сама торпеда: рубка с перископом */
    g.fillStyle = '#2c3a44';
    g.beginPath(); g.ellipse(x, y + bob * .3, 8 * u, 5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#3d5260';
    roundRect(g, x - 3 * u, y - 6.5 * u + bob * .3, 6 * u, 5 * u, 1.5 * u); g.fill();
    g.strokeStyle = '#2c3a44'; g.lineWidth = 1.6 * u; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 1.5 * u, y - 6.5 * u + bob * .3);
    g.lineTo(x + 2.6 * u, y - 11.5 * u + bob * .3);
    g.stroke();
    g.fillStyle = '#9fe8ff';
    g.beginPath(); g.arc(x + 2.9 * u, y - 11.5 * u + bob * .3, 1.2 * u, 0, 7); g.fill();

    /* РУПОР над водой: раструб и разбегающиеся дужки звука */
    g.save();
    g.translate(x, y - 21 * u + Math.sin(t * 2.6) * 1.8 * u);
    g.fillStyle = '#e8a41c';
    g.strokeStyle = '#7a4c08'; g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-6 * u, -3.2 * u); g.lineTo(.5 * u, -3.2 * u); g.lineTo(6.5 * u, -7.5 * u);
    g.lineTo(6.5 * u, 7.5 * u); g.lineTo(.5 * u, 3.2 * u); g.lineTo(-6 * u, 3.2 * u);
    g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < 3; i++){
      const aw = (t * 1.8 + i * .33) % 1;
      g.strokeStyle = 'rgba(232,164,28,' + (.85 * (1 - aw)).toFixed(3) + ')';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(8.5 * u, 0, (2.5 + aw * 6) * u, -.9, .9);
      g.stroke();
    }
    g.restore();

    /* крупные стрелки: после рупора, маршируют по своим линиям */
    if (S.torpSurf && performance.now() - S.torpSurf > 950){
      const march = (t * 1.5) % 1;
      for (const [dr, dc] of torpArrowsC()){
        for (let i = 1; i <= 3; i++){
          const rr = S.torp[0] + dr * i, cc = S.torp[1] + dc * i;
          if (!inB(rr, S.N) || !inB(cc, S.N) || S.isleSet.has(rr + ',' + cc)) break;
          drawChevronC(g,
            PAD + cc * CELL + CELL / 2 - dc * (march - .5) * CELL,
            PAD + rr * CELL + CELL / 2 - dr * (march - .5) * CELL,
            dr, dc, CELL * .3, .9 - i * .2, t);
        }
      }
    }
  }
  if (S.torpAnim){
    const a = S.torpAnim;
    const x = PAD + a.c * CELL + CELL / 2, y = PAD + a.r * CELL + CELL / 2;
    const ang = a.dc === 1 ? 0 : a.dc === -1 ? Math.PI : a.dr === -1 ? -Math.PI / 2 : Math.PI / 2;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = '#31424e';
    roundRect(g, -14 * u, -4.4 * u, 26 * u, 8.8 * u, 4.4 * u); g.fill();
    g.fillStyle = '#8c2f24';
    g.beginPath();
    g.moveTo(-13 * u, -4.4 * u); g.lineTo(-18 * u, -7 * u);
    g.lineTo(-18 * u, 7 * u); g.lineTo(-13 * u, 4.4 * u);
    g.closePath(); g.fill();
    g.fillStyle = '#c9d6de';
    g.beginPath(); g.arc(8.5 * u, 0, 2 * u, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++){
      g.beginPath();
      g.arc((-19 - i * 4.5) * u, Math.sin(t * 9 + i * 1.7) * 1.7 * u, 1.4 * u, 0, 7);
      g.stroke();
    }
    g.restore();
  }
}

/* большая стрелка-шеврон: куда пойдёт торпеда */
function drawChevronC(g, x, y, dr, dc, s, alpha, t){
  const ang = dc === 1 ? 0 : dc === -1 ? Math.PI : dr === -1 ? -Math.PI / 2 : Math.PI / 2;
  g.save();
  g.translate(x, y); g.rotate(ang);
  g.globalAlpha = Math.max(.15, alpha * (.78 + .22 * Math.sin(t * 6)));
  g.fillStyle = '#e8a41c';
  g.strokeStyle = '#7a4c08'; g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(s * .55, 0);
  g.lineTo(-s * .25, -s * .52);
  g.lineTo(-s * .02, 0);
  g.lineTo(-s * .25, s * .52);
  g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

function drawMarksC(g, marks, PAD, CELL){
  for (let r = 0; r < marks.length; r++)
    for (let c = 0; c < marks.length; c++){
      if (!marks[r][c]) continue;
      const x = PAD + c * CELL + CELL / 2, y = PAD + r * CELL + CELL / 2;
      if (marks[r][c] === 1){
        g.strokeStyle = 'rgba(18,86,116,.8)'; g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.stroke();
        g.fillStyle = 'rgba(18,86,116,.85)';
        g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
      } else {
        g.save(); g.translate(x, y);
        for (let i = 0; i < 8; i++){
          g.rotate(Math.PI / 4);
          g.fillStyle = i % 2 ? '#ff9b2e' : '#ffd23c';
          g.beginPath();
          g.moveTo(0, -9); g.lineTo(3.2, -3); g.lineTo(-3.2, -3);
          g.closePath(); g.fill();
        }
        g.fillStyle = '#8a1d10';
        g.beginPath(); g.arc(0, 0, 3.4, 0, 7); g.fill();
        g.restore();
      }
    }
}

function drawCrossC(g, cell, PAD, CELL){
  const x = PAD + cell[1] * CELL + CELL / 2, y = PAD + cell[0] * CELL + CELL / 2;
  g.strokeStyle = 'rgba(18,86,116,.6)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(x, y, 10, 0, 7); g.stroke();
  g.beginPath();
  g.moveTo(x - 15, y); g.lineTo(x - 6, y);
  g.moveTo(x + 6, y);  g.lineTo(x + 15, y);
  g.moveTo(x, y - 15); g.lineTo(x, y - 6);
  g.moveTo(x, y + 6);  g.lineTo(x, y + 15);
  g.stroke();
}

function drawPlacePreview(g, S, PAD, CELL, t){
  if (!S.hoverP) return;
  const len = S.queue[S.qi];
  if (len === undefined) return;
  const [r, c] = S.hoverP;
  const ok = canPlaceC(S.pGridC, r, c, len, S.hor);
  g.fillStyle = ok ? 'rgba(90,220,140,.4)' : 'rgba(255,80,90,.4)';
  g.strokeStyle = ok ? 'rgba(120,255,170,.9)' : 'rgba(255,120,120,.9)';
  g.lineWidth = 1.5;
  for (let i = 0; i < len; i++){
    const rr = S.hor ? r : r + i, cc = S.hor ? c + i : c;
    if (!inB(rr, S.N) || !inB(cc, S.N)) continue;
    const x = PAD + cc * CELL, y = PAD + rr * CELL;
    g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    g.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
  }
  /* призрак живого корабля — видно, как он встанет на воду */
  if (ok) drawShipSpriteC(g, PAD + c * CELL, PAD + r * CELL,
                          (S.hor ? len : 1) * CELL, (S.hor ? 1 : len) * CELL,
                          S.hor, len, CELL, { t, ghost: true });
}

/* свист летящего ядра: чем дальше летит снаряд, тем дольше и
   ниже свист — выстрел в упор и залп через всё море звучат
   по-разному (живая дуэль 2026-11-22: звук полёта — по
   расстоянию). Тон плавно падает к месту падения, громкость
   тихая — под грохотом выстрела. */
function shellWhistleC(dur, dist){
  const ac = audioC();
  if (!ac) return;
  try {
    const o = ac.createOscillator(), gn = ac.createGain();
    const t0 = ac.currentTime, D = Math.max(.15, dur / 1000);
    o.type = 'sine';
    o.frequency.setValueAtTime(Math.max(540, 1060 - dist * 54), t0);
    o.frequency.exponentialRampToValueAtTime(230, t0 + D);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.linearRampToValueAtTime(.034, t0 + .05);
    gn.gain.setValueAtTime(.034, t0 + Math.max(.07, D - .08));
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
    o.connect(gn); gn.connect(ac.destination);
    o.start(t0); o.stop(t0 + D + .05);
  } catch (err){ /* без звука тоже играем */ }
}

/* летящий снаряд — КОМЕТА: чугунное ядро в горячем ореоле,
   позади — пунктирная траектория и клубы дыма, которые по мере
   старения растут и тают (u — прогресс полёта 0..1) */
function drawShellC(g, f, PAD, CELL, u){
  const x0 = PAD + f.fc * CELL + CELL / 2, y0 = PAD + f.fr * CELL + CELL / 2;
  const x1 = PAD + f.c * CELL + CELL / 2,  y1 = PAD + f.r * CELL + CELL / 2;
  const arc = CELL * (0.5 + Math.abs(f.c - f.fc) * 0.05);
  const pt = s => ({ x: x0 + (x1 - x0) * s,
                     y: y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * arc });
  const px = pt(u).x, py = pt(u).y;

  if (u < .3){                                  /* вспышка у борта */
    const fu = u / .3, rr = CELL * (0.7 + fu * 1.3);
    const rg = g.createRadialGradient(x0, y0, 1, x0, y0, rr);
    rg.addColorStop(0, 'rgba(255,225,150,' + .8 * (1 - fu) + ')');
    rg.addColorStop(1, 'rgba(255,130,40,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x0, y0, rr, 0, 7); g.fill();
  }

  /* пунктирный хвост: траектория позади ядра, ближе к голове
     гуще и темнее — читается на светлой воде всех трёх карт */
  if (u > .04){
    g.save();
    g.setLineDash([CELL * .15, CELL * .13]);
    g.lineCap = 'round';
    for (let part = 0; part < 3; part++){
      const a0 = u * part / 3, a1 = u * (part + 1) / 3;
      if (a1 - a0 < .015) continue;
      g.strokeStyle =
        'rgba(24,88,120,' + (.13 + .24 * (part + 1) / 3).toFixed(3) + ')';
      g.lineWidth = 1.4 + .4 * part;
      g.beginPath();
      for (let i = 0; i <= 7; i++){
        const p = pt(a0 + (a1 - a0) * i / 7);
        if (!i) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
      }
      g.stroke();
    }
    g.restore();
  }

  /* дым кометы: клубы позади ядра — дальние старше: шире, бледнее
     и чуть снесены в сторону, как будто их отгоняет ветер */
  for (let k = 7; k >= 1; k--){
    const tu = u - k * .06;
    if (tu <= 0) continue;
    const age = k / 7;
    const p = pt(tu);
    const sx = p.x + Math.sin(tu * 19) * CELL * .12 * age;
    const sy = p.y - CELL * .06 * age;
    const rr = CELL * (.22 + .45 * age);
    const al = .48 * (1 - age) + .10;
    const rg = g.createRadialGradient(sx, sy, rr * .12, sx, sy, rr);
    rg.addColorStop(0, 'rgba(252,252,254,' + al.toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(238,240,246,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill();
  }

  /* горячий ореол головы — свечение, как у кометы */
  const gr = CELL * .5;
  const gl = g.createRadialGradient(px, py, 1, px, py, gr);
  gl.addColorStop(0, 'rgba(255,195,115,.45)');
  gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl;
  g.beginPath(); g.arc(px, py, gr, 0, 7); g.fill();

  const R = CELL * 0.2;                         /* само ядро */
  const bg = g.createRadialGradient(px - R * .35, py - R * .4, R * .15, px, py, R);
  bg.addColorStop(0, '#585860'); bg.addColorStop(.55, '#26262c'); bg.addColorStop(1, '#0f0f14');
  g.fillStyle = bg;
  g.beginPath(); g.arc(px, py, R, 0, 7); g.fill();
  const dx = Math.sign(x1 - x0) || 1;           /* раскалённый нос по ходу */
  const hg = g.createRadialGradient(px + dx * R * .5, py, 1, px + dx * R * .5, py, R * .85);
  hg.addColorStop(0, 'rgba(255,185,105,.7)'); hg.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = hg;
  g.beginPath(); g.arc(px + dx * R * .5, py, R * .85, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.8)';
  g.beginPath(); g.arc(px - R * .35, py - R * .4, R * .16, 0, 7); g.fill();
}

function drawFxC(g, S, board, PAD, CELL, t){
  for (let i = S.fx.length - 1; i >= 0; i--){
    const f = S.fx[i];
    if (f.board !== board) continue;
    const dur = f.dur || 620;
    const age = t * 1000 - f.t0;
    if (age > dur){ S.fx.splice(i, 1); continue; }
    if (age < 0) continue;                /* эффект ещё не наступил */
    const u = age / dur;
    const x = PAD + f.c * CELL + CELL / 2, y = PAD + f.r * CELL + CELL / 2;
    if (f.type === 'shell'){ drawShellC(g, f, PAD, CELL, u); continue; }
    if (f.type === 'boom'){
      g.strokeStyle = 'rgba(255,150,40,' + (1 - u) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 4 + u * 20, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,220,90,' + (1 - u) + ')';
      for (let s = 0; s < 6; s++){
        const a = s * 1.05 + u * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * (6 + u * 16), y + Math.sin(a) * (6 + u * 16), 2.2, 0, 7);
        g.fill();
      }
    } else if (f.type === 'shield'){
      g.strokeStyle = 'rgba(64,170,220,' + (1 - u) + ')'; g.lineWidth = 3.5;
      g.beginPath(); g.arc(x, y, 6 + u * 22, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(170,225,250,' + (1 - u) + ')'; g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, y, 10 + u * 27, 0, 7); g.stroke();
    } else if (f.type === 'ping'){
      g.strokeStyle = 'rgba(226,168,66,' + (1 - u) + ')'; g.lineWidth = 2.4;
      g.beginPath(); g.arc(x, y, 4 + u * 19, 0, 7); g.stroke();
    } else if (f.type === 'repair'){
      g.strokeStyle = 'rgba(80,200,120,' + (1 - u) + ')'; g.lineWidth = 2.4;
      g.beginPath(); g.arc(x, y, 4 + u * 19, 0, 7); g.stroke();
    } else if (f.type === 'ring'){
      g.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 3 + u * 16, 0, 7); g.stroke();
    } else {
      /* брызги: белая пена на светлой воде */
      g.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 3 + u * 13, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(120,190,220,' + (1 - u) + ')'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(x, y, 6 + u * 17, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,' + (1 - u) + ')';
      g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
    }
  }
}
