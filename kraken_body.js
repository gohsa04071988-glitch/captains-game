'use strict';
/* ============================================================
   КАПИТАНЫ ОСТРОВОВ — kraken_body.js
   ТЕЛО КРАКЕНА: купол, глаза, клюв, брови, раны, щупальца
   (кривые Безье), вспышка при попадании, пена и частицы.
   Только рисование (R3, R4): состояние B объявлено в
   kraken_boss.js — этот файл его не копирует (R5, R7).
   Отрезано от kraken_render.js по паспорту v2.1 (R10).
   ============================================================ */

/* ============================================================
   🐙 КРАКЕН — купол, глаза, клюв, щупальца (по проверенному демо)
   ============================================================ */
const WOUNDS = [[-.48, -.82], [.34, -1.02], [.06, -.5], [-.26, -.22], [.6, -.34],
                [-.72, .02], [.78, .06], [.16, .08], [-.02, -1.18]];

function bezier(P, u){
  if (P.length === 3){
    const a = 1 - u;
    return [a * a * P[0][0] + 2 * a * u * P[1][0] + u * u * P[2][0],
            a * a * P[0][1] + 2 * a * u * P[1][1] + u * u * P[2][1]];
  }
  const a = 1 - u;
  return [a * a * a * P[0][0] + 3 * a * a * u * P[1][0] + 3 * a * u * u * P[2][0] + u * u * u * P[3][0],
          a * a * a * P[0][1] + 3 * a * a * u * P[1][1] + 3 * a * u * u * P[2][1] + u * u * u * P[3][1]];
}

function bezierD(P, u){
  if (P.length === 3)
    return [2 * (1 - u) * (P[1][0] - P[0][0]) + 2 * u * (P[2][0] - P[1][0]),
            2 * (1 - u) * (P[1][1] - P[0][1]) + 2 * u * (P[2][1] - P[1][1])];
  const a = 1 - u;
  return [3 * a * a * (P[1][0] - P[0][0]) + 6 * a * u * (P[2][0] - P[1][0]) + 3 * u * u * (P[3][0] - P[2][0]),
          3 * a * a * (P[1][1] - P[0][1]) + 6 * a * u * (P[2][1] - P[1][1]) + 3 * u * u * (P[3][1] - P[2][1])];
}

function drawKraken(g, cx, cy, t, k){
  const s = BC;
  let p = Math.min(1, (nowMs() - k.t0) / (k.mode === 'dead' ? 1500 : 800));
  let alpha = 1, dy = 0;
  if (k.mode === 'rise'){ dy = (1 - p) * 1.6 * s; alpha = Math.min(1, p * 1.7); }
  if (k.mode === 'dive'){ dy = p * 1.6 * s;     alpha = 1 - p * .92; }
  if (k.mode === 'dead'){ dy = p * 2.4 * s;     alpha = 1 - p; }
  if (k.mode === 'under') return;

  g.save();
  g.translate(cx, cy + dy + Math.sin(t * 1.8) * 2.5);
  g.globalAlpha = alpha;

  /* зона поражения 3x3 (пунктир) */
  g.strokeStyle = 'rgba(255,90,110,' + (.22 + .12 * Math.sin(t * 3)) + ')';
  g.lineWidth = 1.5; g.setLineDash([5, 4]);
  g.strokeRect(-1.5 * s, -1.5 * s, 3 * s, 3 * s);
  g.setLineDash([]);

  /* щупальца: контур по кривой Безье туда-обратно со смещением по нормали */
  const tent = [
    { pts: [[-.5, 0], [-1.18, .62], [-.92, 1.38]],      w: .32 },
    { pts: [[ .5, 0], [ 1.18, .62], [ .92, 1.38]],      w: .32 },
    { pts: [[-.68, -.12], [-1.42, .34], [-1.18, 1.18]], w: .26 },
    { pts: [[ .68, -.12], [ 1.42, .34], [ 1.18, 1.18]], w: .26 },
    { pts: [[-.74, -.38], [-1.5, -.82], [-1.4, -1.66], [-.78, -1.32]], w: .24, front: 1 },
    { pts: [[ .74, -.38], [ 1.5, -.82], [ 1.4, -1.66], [ .78, -1.32]], w: .24, front: 1 },
    { pts: [[-.2, .1], [-.9, .75], [-.55, 1.45]],  w: .4, front: 1 },
    { pts: [[ .2, .1], [ .9, .75], [ .55, 1.45]],  w: .4, front: 1 },
    { pts: [[-.42, .05], [-1.25, .8], [-.98, 1.5]], w: .3, front: 1 },
    { pts: [[ .42, .05], [ 1.25, .8], [ .98, 1.5]], w: .3, front: 1 }
  ];
  const drawTent = (tn, i) => {
    const P = tn.pts.map((pt, kk) => [
      pt[0] * s + Math.sin(t * 1.5 + i * .9 + kk * 1.3) * s * .07,
      pt[1] * s + Math.cos(t * 1.2 + i * 1.4 + kk) * s * .05
    ]);
    const steps = 22, L = [], R = [];
    for (let q = 0; q <= steps; q++){
      const u = q / steps;
      const pt = bezier(P, u), d = bezierD(P, u);
      const len = Math.hypot(d[0], d[1]) || 1;
      const nx = -d[1] / len, ny = d[0] / len;
      const w0 = tn.w * s * (1 - u * .85);
      L.push([pt[0] + nx * w0, pt[1] + ny * w0]);
      R.push([pt[0] - nx * w0, pt[1] - ny * w0]);
    }
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    L.forEach(pt => g.lineTo(pt[0], pt[1]));
    R.reverse().forEach(pt => g.lineTo(pt[0], pt[1]));
    g.closePath();
    const tg = g.createLinearGradient(0, -1.4 * s, 0, 1.5 * s);
    tg.addColorStop(0, '#5b3287'); tg.addColorStop(1, '#221040');
    g.fillStyle = tg; g.fill();
    g.strokeStyle = 'rgba(20,8,36,.8)'; g.lineWidth = 1; g.stroke();
    for (let q = 4; q <= steps - 2; q += 3){
      const u = q / steps;
      const pt = bezier(P, u), d = bezierD(P, u);
      const len = Math.hypot(d[0], d[1]) || 1;
      const nx = d[1] / len, ny = -d[0] / len;
      const off = tn.w * s * (1 - u * .85) * .55;
      const rr = Math.max(1.8, s * .1 * (1 - u));
      g.fillStyle = q % 2 ? '#f0a3ab' : '#d4737f';
      g.beginPath();
      g.arc(pt[0] + nx * off, pt[1] + ny * off, rr, 0, 7);
      g.fill();
    }
  };
  tent.forEach((tn, i) => { if (!tn.front) drawTent(tn, i); });

  /* широкая мантия: задний пласт + боковые лопасти */
  const hg2 = g.createLinearGradient(0, -1.4 * s, 0, .5 * s);
  hg2.addColorStop(0, '#6d3d9e'); hg2.addColorStop(1, '#241040');
  g.fillStyle = hg2;
  g.beginPath(); g.ellipse(0, -.48 * s, 1.1 * s, .55 * s, 0, 0, 7); g.fill();
  for (const side of [-1, 1]){
    g.beginPath();
    g.ellipse(side * .76 * s, -.3 * s, .34 * s, .44 * s, side * .35, 0, 7);
    g.fill();
  }

  /* купол головы */
  const hg = g.createLinearGradient(0, -1.5 * s, 0, .4 * s);
  hg.addColorStop(0, '#9a5fc9'); hg.addColorStop(.45, '#5b2f8a'); hg.addColorStop(1, '#301549');
  g.fillStyle = hg;
  g.beginPath(); g.ellipse(0, -.66 * s, .98 * s, .62 * s, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(24,10,40,.9)'; g.lineWidth = 1.4; g.stroke();

  /* бугры-наросты */
  g.fillStyle = 'rgba(30,12,52,.55)';
  [[-.46, -1.0, .13], [.4, -1.06, .11], [-.06, -1.18, .09], [.62, -.78, .1], [-.74, -.66, .09]]
    .forEach(([wx, wy, wr]) => {
      g.beginPath(); g.ellipse(wx * s, wy * s, wr * s, wr * s * .75, 0, 0, 7); g.fill();
    });
  g.fillStyle = 'rgba(255,255,255,.14)';
  g.beginPath(); g.ellipse(-.32 * s, -.98 * s, .38 * s, .16 * s, -.35, 0, 7); g.fill();

  /* раны — по числу потерянных HP */
  const nw = KHP_MAX - k.hp;
  for (let i = 0; i < nw && i < WOUNDS.length; i++){
    const [wx, wy] = WOUNDS[i];
    const wg = g.createRadialGradient(wx * s, wy * s, 1, wx * s, wy * s, s * .17);
    wg.addColorStop(0, 'rgba(255,60,80,.95)'); wg.addColorStop(1, 'rgba(140,10,30,0)');
    g.fillStyle = wg;
    g.beginPath(); g.arc(wx * s, wy * s, s * .17, 0, 7); g.fill();
    g.fillStyle = '#a3122a';
    g.beginPath(); g.arc(wx * s, wy * s, s * .06, 0, 7); g.fill();
  }

  /* сердитые брови: внутренний край опущен */
  for (const side of [-1, 1]){
    g.fillStyle = '#180826';
    g.beginPath();
    g.ellipse(side * .42 * s, -.66 * s, .3 * s, .11 * s, -side * .45, 0, 7);
    g.fill();
  }
  g.fillStyle = '#180826';
  g.beginPath(); g.ellipse(0, -.6 * s, .08 * s, .14 * s, 0, 0, 7); g.fill();

  /* глаза: горящие оранжевые со щелевидным зрачком */
  const blink = (t % 4.6) < .14 ? .1 : 1;
  for (const side of [-1, 1]){
    const ex = side * .42 * s, ey = -.5 * s;
    const glow = g.createRadialGradient(ex, ey, 1, ex, ey, .32 * s);
    glow.addColorStop(0, 'rgba(255,140,25,.7)'); glow.addColorStop(1, 'rgba(255,140,25,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(ex, ey, .32 * s, 0, 7); g.fill();
    g.save(); g.translate(ex, ey); g.scale(1, blink);
    const eg = g.createRadialGradient(0, 0, 1, 0, 0, .2 * s);
    eg.addColorStop(0, '#ffe08a'); eg.addColorStop(.55, '#ffab2e'); eg.addColorStop(1, '#e2570f');
    g.fillStyle = eg;
    g.beginPath(); g.ellipse(0, 0, .2 * s, .16 * s, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a0d14'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#0d0208';
    g.beginPath();
    g.moveTo(0, -.13 * s);
    g.quadraticCurveTo(.055 * s, 0, 0, .13 * s);
    g.quadraticCurveTo(-.055 * s, 0, 0, -.13 * s);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(-.06 * s, -.05 * s, .025 * s, 0, 7); g.fill();
    g.restore();
  }

  /* передние щупальца — поверх головы */
  tent.forEach((tn, i) => { if (tn.front) drawTent(tn, i); });

  /* клюв с зубами */
  const open = .5 + .5 * Math.sin(t * .9);
  const my = .38 * s, mo = .08 * open;
  g.fillStyle = '#150726';
  g.beginPath(); g.ellipse(0, my, .28 * s, (.12 + .08 * open) * s, 0, 0, 7); g.fill();
  g.fillStyle = '#07020d';
  g.beginPath(); g.ellipse(0, my, .18 * s, (.06 + .05 * open) * s, 0, 0, 7); g.fill();
  g.fillStyle = '#efe6da';
  for (let i = -2; i <= 2; i++){
    g.beginPath();
    g.moveTo(i * .12 * s - .045 * s, (my - mo * s) - .055 * s);
    g.lineTo(i * .12 * s,          (my - mo * s) + .045 * s);
    g.lineTo(i * .12 * s + .045 * s, (my - mo * s) - .055 * s);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(i * .12 * s - .045 * s, (my + mo * s) + .055 * s);
    g.lineTo(i * .12 * s,          (my + mo * s) - .045 * s);
    g.lineTo(i * .12 * s + .045 * s, (my + mo * s) + .055 * s);
    g.closePath(); g.fill();
  }

  /* вспышка при попадании */
  if (k.flash > 0){
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,120,90,' + (k.flash * .55) + ')';
    g.beginPath(); g.ellipse(0, -.5 * s, 1.05 * s, 1.35 * s, 0, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  /* пена и круги на воде */
  g.fillStyle = 'rgba(220,205,255,.28)';
  for (let i = 0; i < 7; i++){
    const a = t * 2 + i * 2.2;
    g.beginPath();
    g.arc(Math.sin(a) * 1.15 * s, 1.3 * s + Math.cos(a * .7) * .06 * s, 3 + 2 * Math.sin(a * 1.3), 0, 7);
    g.fill();
  }
  g.strokeStyle = 'rgba(220,205,255,.35)'; g.lineWidth = 1.5;
  const rp = (t % 1.6) / 1.6;
  g.beginPath(); g.ellipse(0, 1.32 * s, (.4 + rp * 1.1) * s, (.13 + rp * .3) * s, 0, 0, 7); g.stroke();

  /* частицы: брызги при всплытии, чернила при погружении */
  if (k.mode === 'rise' || k.mode === 'dive' || k.mode === 'dead'){
    const n = 14;
    for (let i = 0; i < n; i++){
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const dist = (k.mode === 'rise' ? p : 1 - p) * 1.5 * s;
      const bx2 = Math.cos(a) * dist * 1.15, by2 = 1.2 * s + Math.sin(a) * dist;
      const ink = k.mode !== 'rise';
      g.fillStyle = ink ? 'rgba(22,8,38,' + (.7 * (1 - p)) + ')'
                        : 'rgba(230,220,255,' + (.8 * (1 - p)) + ')';
      g.beginPath(); g.arc(bx2, by2, (ink ? 4.5 : 2.5) * (1 - p * .5), 0, 7); g.fill();
    }
  }
  g.restore();
}
