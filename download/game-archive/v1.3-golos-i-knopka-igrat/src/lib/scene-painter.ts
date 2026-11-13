/* ============================================================
   ДВИЖОК ФОНОВЫХ СЦЕН
   Рисует фон каждой картинки: небо, солнце, облака, холмы,
   звёзды, город, море. Работает по "зерну" (seed), поэтому
   каждая сцена всегда выглядит одинаково — деталь за деталью.
   ============================================================ */

import type { PuzzlePalette } from './puzzle-data';
import { paletteForScene } from './puzzle-data';

export type Ctx2D = CanvasRenderingContext2D;

/* ---------- Зернируемый генератор случайности ---------- */

export function makeRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function seedFromText(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 2147483647;
  return h;
}

/* ---------- Примитивы ---------- */

export function fillRoundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function strokeRoundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  fillRoundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function circle(ctx: Ctx2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export function ellipse(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.closePath();
}

/* Заполнить текущую фигуру цветом и обвести контуром */
export function paint(ctx: Ctx2D, fill: string | null, stroke?: string, lw?: number): void {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw ?? 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/* Мягкая тень-овал под предметом */
export function groundShadow(ctx: Ctx2D, x: number, y: number, w: number, color = 'rgba(0,0,0,0.14)'): void {
  ctx.save();
  ctx.fillStyle = color;
  ellipse(ctx, x, y, w, w * 0.22);
  ctx.fill();
  ctx.restore();
}

/* ---------- Небо и космос ---------- */

export function drawSky(ctx: Ctx2D, s: number, pal: PuzzlePalette): void {
  const g = ctx.createLinearGradient(0, 0, s * 0.2, s);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

export function drawSpaceBg(ctx: Ctx2D, s: number, rng: () => number): void {
  const g = ctx.createRadialGradient(s * 0.5, s * 0.42, s * 0.1, s * 0.5, s * 0.5, s * 0.75);
  g.addColorStop(0, '#31427e');
  g.addColorStop(1, '#171c3f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const neb = ctx.createRadialGradient(s * 0.72, s * 0.24, 0, s * 0.72, s * 0.24, s * 0.34);
  neb.addColorStop(0, 'rgba(150,110,220,0.35)');
  neb.addColorStop(1, 'rgba(150,110,220,0)');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, s, s);
  const neb2 = ctx.createRadialGradient(s * 0.2, s * 0.7, 0, s * 0.2, s * 0.7, s * 0.3);
  neb2.addColorStop(0, 'rgba(80,160,220,0.25)');
  neb2.addColorStop(1, 'rgba(80,160,220,0)');
  ctx.fillStyle = neb2;
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 70; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const r = (0.004 + rng() * 0.01) * s;
    ctx.fillStyle = rng() > 0.85 ? 'rgba(255,230,150,0.95)' : 'rgba(255,255,255,0.85)';
    circle(ctx, x, y, r);
    ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const x = rng() * s;
    const y = rng() * s * 0.8;
    const r = s * 0.016;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = s * 0.004;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
  }
}

/* ---------- Солнце и облака ---------- */

export function drawSun(ctx: Ctx2D, s: number, pal: PuzzlePalette, x = 0.82, y = 0.15, r = 0.075): void {
  const cx = s * x;
  const cy = s * y;
  const cr = s * r;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,200,60,0.85)';
  ctx.lineWidth = s * 0.011;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * cr * 1.35, cy + Math.sin(a) * cr * 1.35);
    ctx.lineTo(cx + Math.cos(a) * cr * 1.8, cy + Math.sin(a) * cr * 1.8);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.2, cx, cy, cr);
  g.addColorStop(0, '#fff3bf');
  g.addColorStop(1, pal.sun);
  ctx.fillStyle = g;
  circle(ctx, cx, cy, cr);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,145,20,0.5)';
  ctx.lineWidth = s * 0.004;
  ctx.stroke();
  ctx.restore();
}

export function drawMoonGlow(ctx: Ctx2D, s: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,244,214,0.9)';
  circle(ctx, s * 0.8, s * 0.14, s * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  circle(ctx, s * 0.8 - s * 0.018, s * 0.14 - s * 0.01, s * 0.042);
  ctx.fill();
  ctx.restore();
}

export function drawCloud(ctx: Ctx2D, s: number, x: number, y: number, k: number, alpha = 0.92): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  circle(ctx, x, y, k);
  ctx.fill();
  circle(ctx, x + k * 1.1, y - k * 0.45, k * 1.2);
  ctx.fill();
  circle(ctx, x + k * 2.3, y, k * 0.9);
  ctx.fill();
  ctx.fillRect(x - k * 0.4, y, k * 3.3, k * 0.9);
  ctx.restore();
}

/* ---------- Холмы, земля, горы ---------- */

export function drawHillBand(
  ctx: Ctx2D, s: number, base: number, amp: number, color: string,
  rng: () => number, waves = 3,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.lineTo(0, s * base);
  for (let w = 0; w < waves; w++) {
    const x0 = (s * w) / waves;
    const x1 = (s * (w + 1)) / waves;
    const peak = s * (base - amp - rng() * amp * 0.6);
    ctx.quadraticCurveTo((x0 + x1) / 2, peak, x1, s * base);
  }
  ctx.lineTo(s, s);
  ctx.closePath();
  ctx.fill();
}

export function drawGround(ctx: Ctx2D, s: number, pal: PuzzlePalette, from = 0.82): void {
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, s * from, s, s * (1 - from) + 1);
  ctx.strokeStyle = pal.outlineSoft;
  ctx.lineWidth = s * 0.004;
  ctx.beginPath();
  ctx.moveTo(0, s * from);
  ctx.lineTo(s, s * from);
  ctx.stroke();
}

export function drawSnowMountain(
  ctx: Ctx2D, s: number, x: number, base: number, w: number, h: number,
  body: string, snow: string, outline: string,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w * 0.08, base - h);
  ctx.lineTo(x, base - h * 1.06);
  ctx.lineTo(x + w * 0.1, base - h);
  ctx.lineTo(x + w / 2, base);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = s * 0.005;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.3, base - h * 0.62);
  ctx.lineTo(x - w * 0.08, base - h);
  ctx.lineTo(x, base - h * 1.06);
  ctx.lineTo(x + w * 0.1, base - h);
  ctx.lineTo(x + w * 0.32, base - h * 0.6);
  ctx.quadraticCurveTo(x + w * 0.12, base - h * 0.68, x + w * 0.02, base - h * 0.6);
  ctx.quadraticCurveTo(x - w * 0.12, base - h * 0.7, x - w * 0.3, base - h * 0.62);
  ctx.closePath();
  ctx.fillStyle = snow;
  ctx.fill();
  ctx.restore();
}

/* ---------- Цветы, трава, деревья ---------- */

export function drawFlower(ctx: Ctx2D, s: number, x: number, y: number, petal: string, r = 0.013): void {
  const fr = s * r;
  ctx.fillStyle = petal;
  for (let p = 0; p < 5; p++) {
    const a = (p * Math.PI * 2) / 5;
    circle(ctx, x + Math.cos(a) * fr, y + Math.sin(a) * fr, fr * 0.75);
    ctx.fill();
  }
  ctx.fillStyle = '#fde047';
  circle(ctx, x, y, fr * 0.55);
  ctx.fill();
}

export function drawGrassTuft(ctx: Ctx2D, s: number, x: number, y: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.006;
  ctx.lineCap = 'round';
  for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx * h * 0.4, y - h * 0.6, x + dx * h * 0.8, y - h);
    ctx.stroke();
  }
}

export function drawTree(ctx: Ctx2D, s: number, x: number, base: number, h: number, outline: string): void {
  const trunkW = h * 0.13;
  ctx.fillStyle = '#8a5a33';
  ctx.strokeStyle = outline;
  ctx.lineWidth = s * 0.004;
  ctx.beginPath();
  ctx.rect(x - trunkW / 2, base - h * 0.4, trunkW, h * 0.4);
  ctx.fill();
  ctx.stroke();
  const crown = ['#57c15c', '#3fae63', '#2e9050'];
  for (let i = 0; i < 3; i++) {
    const cy = base - h * (0.55 + i * 0.22);
    const cr = h * (0.3 - i * 0.06);
    ctx.fillStyle = crown[i];
    circle(ctx, x, cy, cr);
    ctx.fill();
    ctx.stroke();
  }
}

export function drawPalm(ctx: Ctx2D, s: number, x: number, base: number, h: number, outline: string): void {
  ctx.save();
  ctx.strokeStyle = '#9c6b3f';
  ctx.lineWidth = h * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + h * 0.12, base - h * 0.5, x + h * 0.04, base - h * 0.85);
  ctx.stroke();
  const topX = x + h * 0.04;
  const topY = base - h * 0.85;
  ctx.fillStyle = '#3fae63';
  ctx.strokeStyle = outline;
  ctx.lineWidth = s * 0.004;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * h * 0.28, topY + Math.sin(a) * h * 0.3 - h * 0.1,
      topX + Math.cos(a) * h * 0.42, topY + Math.sin(a) * h * 0.34,
    );
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * h * 0.24, topY + Math.sin(a) * h * 0.22 + h * 0.05,
      topX, topY,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Город ---------- */

export function drawCitySkyline(ctx: Ctx2D, s: number, base: number, rng: () => number, color: string): void {
  let x = 0;
  while (x < s) {
    const w = s * (0.07 + rng() * 0.09);
    const h = s * (0.08 + rng() * 0.16);
    ctx.fillStyle = color;
    ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = 'rgba(255,240,180,0.75)';
    for (let wy = base - h + s * 0.015; wy < base - s * 0.015; wy += s * 0.035) {
      for (let wx = x + s * 0.012; wx < x + w - s * 0.02; wx += s * 0.03) {
        ctx.fillRect(wx, wy, s * 0.014, s * 0.018);
      }
    }
    x += w + s * 0.015;
  }
}

/* ---------- Море ---------- */

export function drawSeaWater(ctx: Ctx2D, s: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, '#8fe3f7');
  g.addColorStop(0.5, '#4bc0d9');
  g.addColorStop(1, '#1f8fae');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const bx = s * (0.1 + i * 0.25);
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + s * 0.1, 0);
    ctx.lineTo(bx + s * 0.26, s);
    ctx.lineTo(bx + s * 0.06, s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawBubbles(ctx: Ctx2D, s: number, rng: () => number, n = 16): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = s * 0.003;
  for (let i = 0; i < n; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const r = s * (0.006 + rng() * 0.014);
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSeaweed(ctx: Ctx2D, s: number, x: number, base: number, h: number, sway: number): void {
  ctx.save();
  ctx.strokeStyle = '#2e9e6b';
  ctx.lineWidth = s * 0.012;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * s * 0.012, base);
    ctx.quadraticCurveTo(x + i * s * 0.012 + sway * s * 0.03, base - h * 0.5, x + i * s * 0.02 + sway * s * 0.05, base - h);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Рельсы ---------- */

export function drawRails(ctx: Ctx2D, s: number, y: number): void {
  ctx.save();
  ctx.strokeStyle = '#7a6a55';
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(s, y);
  ctx.stroke();
  ctx.strokeStyle = '#5f5346';
  ctx.lineWidth = s * 0.02;
  for (let x = s * 0.04; x < s; x += s * 0.09) {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.022);
    ctx.lineTo(x + s * 0.02, y + s * 0.022);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Фоны сцен ---------- */

export interface SceneContext {
  ctx: Ctx2D;
  s: number;
  sceneId: string;
  rng: () => number;
  pal: PuzzlePalette;
  outline: string;
  outlineSoft: string;
}

export type SceneBgPainter = (c: SceneContext) => void;

export const SCENE_BACKGROUNDS: Record<string, SceneBgPainter> = {
  'steam-locomotive': (c) => paintCountryside(c, 0.78),
  'speed-train': (c) => paintMountainPass(c),
  'cargo-train': (c) => paintWarmPrairie(c),
  'house-build': (c) => paintCityOutskirts(c),
  excavator: (c) => paintDirtSite(c),
  'crane-blocks': (c) => paintCityOutskirts(c),
  'planet-earth': (c) => paintSpaceLite(c),
  volcano: (c) => paintVolcanoLand(c),
  mountains: (c) => paintAlpineLand(c),
  bear: (c) => paintForestClearing(c),
  bunny: (c) => paintFlowerMeadow(c),
  cat: (c) => paintCozyRoom(c),
  diplodocus: (c) => paintJungle(c),
  trex: (c) => paintJungle(c),
  triceratops: (c) => paintJungle(c),
  rocket: (c) => paintSpaceBg(c),
  'saturn-planets': (c) => paintSpaceBg(c),
  'moon-rover': (c) => paintMoonSurface(c),
  clownfish: (c) => paintUnderwater(c),
  sailboat: (c) => paintOpenSea(c),
  octopus: (c) => paintUnderwater(c),
  'formula-car': (c) => paintRaceTrack(c, true),
  kart: (c) => paintRaceTrack(c, false),
  'rally-car': (c) => paintDirtRoad(c),
};

function paintCountryside(c: SceneContext, horizon: number): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal);
  drawCloud(ctx, s, s * 0.18, s * 0.14, s * 0.035);
  drawCloud(ctx, s, s * 0.52, s * 0.2, s * 0.028, 0.8);
  drawHillBand(ctx, s, horizon - 0.1, 0.05, pal.hillFar, rng, 2);
  drawHillBand(ctx, s, horizon - 0.03, 0.04, pal.hillMid, rng, 3);
  drawGround(ctx, s, pal, horizon);
  drawRails(ctx, s, s * (horizon + 0.07));
}

function paintMountainPass(c: SceneContext): void {
  const { ctx, s, rng, pal, outline } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.15, 0.14, 0.06);
  drawSnowMountain(ctx, s, s * 0.25, s * 0.72, s * 0.5, s * 0.5, '#a9bed6', '#ffffff', outline);
  drawSnowMountain(ctx, s, s * 0.75, s * 0.74, s * 0.55, s * 0.42, '#c3d2e4', '#ffffff', outline);
  drawHillBand(ctx, s, 0.78, 0.03, pal.hillMid, rng, 3);
  drawGround(ctx, s, pal, 0.85);
  drawRails(ctx, s, s * 0.9);
}

function paintWarmPrairie(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.8, 0.14, 0.07);
  drawCloud(ctx, s, s * 0.3, s * 0.16, s * 0.03, 0.85);
  drawHillBand(ctx, s, 0.74, 0.05, '#e8b87f', rng, 2);
  drawHillBand(ctx, s, 0.82, 0.04, '#dba86e', rng, 3);
  drawGround(ctx, s, pal, 0.86);
  drawRails(ctx, s, s * 0.91);
}

function paintCityOutskirts(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal);
  drawCloud(ctx, s, s * 0.24, s * 0.13, s * 0.03, 0.85);
  drawCitySkyline(ctx, s, s * 0.62, rng, pal.hillMid);
  drawHillBand(ctx, s, 0.66, 0.02, pal.hillFar, rng, 3);
  drawGround(ctx, s, pal, 0.72);
}

function paintDirtSite(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.16, 0.15, 0.06);
  drawCloud(ctx, s, s * 0.6, s * 0.14, s * 0.028, 0.8);
  drawHillBand(ctx, s, 0.7, 0.03, pal.hillFar, rng, 2);
  drawGround(ctx, s, pal, 0.74);
  ctx.fillStyle = '#b08954';
  ellipse(ctx, s * 0.2, s * 0.88, s * 0.13, s * 0.055);
  ctx.fill();
  ctx.fillStyle = '#9a7644';
  ellipse(ctx, s * 0.82, s * 0.9, s * 0.1, s * 0.045);
  ctx.fill();
}

function paintSpaceLite(c: SceneContext): void {
  drawSpaceBg(c.ctx, c.s, c.rng);
}

function paintVolcanoLand(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  const g = ctx.createLinearGradient(0, s * 0.3, 0, s);
  g.addColorStop(0, 'rgba(255,150,80,0.35)');
  g.addColorStop(1, 'rgba(255,80,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  drawHillBand(ctx, s, 0.78, 0.04, '#b06a5a', rng, 2);
  drawGround(ctx, s, { ...pal, ground: '#8c5f50' }, 0.84);
}

function paintAlpineLand(c: SceneContext): void {
  const { ctx, s, rng, pal, outline } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.18, 0.14, 0.06);
  drawSnowMountain(ctx, s, s * 0.3, s * 0.66, s * 0.55, s * 0.52, '#7d93b5', '#ffffff', outline);
  drawSnowMountain(ctx, s, s * 0.78, s * 0.7, s * 0.5, s * 0.6, '#93a9c9', '#ffffff', outline);
  drawHillBand(ctx, s, 0.76, 0.03, '#6da58f', rng, 3);
  drawGround(ctx, s, pal, 0.84);
}

function paintForestClearing(c: SceneContext): void {
  const { ctx, s, rng, pal, outline } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.16, 0.13, 0.06);
  drawCloud(ctx, s, s * 0.55, s * 0.12, s * 0.026, 0.85);
  drawTree(ctx, s, s * 0.12, s * 0.68, s * 0.42, outline);
  drawTree(ctx, s, s * 0.88, s * 0.66, s * 0.34, outline);
  drawHillBand(ctx, s, 0.72, 0.03, pal.hillMid, rng, 2);
  drawGround(ctx, s, pal, 0.8);
}

function paintFlowerMeadow(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.8, 0.13, 0.065);
  drawCloud(ctx, s, s * 0.22, s * 0.15, s * 0.03);
  drawHillBand(ctx, s, 0.7, 0.04, pal.hillFar, rng, 2);
  drawGround(ctx, s, pal, 0.78);
  const petals = ['#f472b6', '#facc15', '#ffffff', '#a78bfa', '#fb923c'];
  for (let i = 0; i < 12; i++) {
    drawFlower(ctx, s, rng() * s, s * (0.84 + rng() * 0.12), petals[i % petals.length]);
  }
  drawGrassTuft(ctx, s, s * 0.12, s * 0.95, s * 0.05, '#2f9e44');
  drawGrassTuft(ctx, s, s * 0.86, s * 0.97, s * 0.06, '#2f9e44');
}

function paintCozyRoom(c: SceneContext): void {
  const { ctx, s, pal } = c;
  ctx.fillStyle = '#fde8d7';
  ctx.fillRect(0, 0, s, s * 0.78);
  ctx.fillStyle = '#d9a06b';
  ctx.fillRect(0, s * 0.78, s, s * 0.22);
  ctx.strokeStyle = 'rgba(120,70,30,0.25)';
  ctx.lineWidth = s * 0.003;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, s * (0.78 + i * 0.045));
    ctx.lineTo(s, s * (0.78 + i * 0.045));
    ctx.stroke();
  }
  ctx.fillStyle = pal.skyTop;
  ctx.strokeStyle = '#8a5a33';
  ctx.lineWidth = s * 0.012;
  strokeRoundRect(ctx, s * 0.06, s * 0.08, s * 0.24, s * 0.3, s * 0.015);
  strokeRoundRect(ctx, s * 0.66, s * 0.08, s * 0.24, s * 0.3, s * 0.015);
  ctx.fillStyle = pal.sun;
  circle(ctx, s * 0.18, s * 0.2, s * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,73,128,0.35)';
  ellipse(ctx, s * 0.5, s * 0.9, s * 0.3, s * 0.07);
  ctx.fill();
}

function paintJungle(c: SceneContext): void {
  const { ctx, s, rng, pal, outline } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.2, 0.12, 0.06);
  ctx.fillStyle = '#8f7a8f';
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.72);
  ctx.lineTo(s * 0.75, s * 0.4);
  ctx.lineTo(s * 0.9, s * 0.72);
  ctx.closePath();
  ctx.fill();
  drawCloud(ctx, s, s * 0.78, s * 0.3, s * 0.03, 0.7);
  drawPalm(ctx, s, s * 0.12, s * 0.78, s * 0.5, outline);
  drawPalm(ctx, s, s * 0.9, s * 0.8, s * 0.42, outline);
  drawGround(ctx, s, pal, 0.8);
  drawGrassTuft(ctx, s, s * 0.3, s * 0.96, s * 0.07, '#2e8b57');
  drawGrassTuft(ctx, s, s * 0.72, s * 0.98, s * 0.06, '#2e8b57');
}

function paintSpaceBg(c: SceneContext): void {
  drawSpaceBg(c.ctx, c.s, c.rng);
}

function paintMoonSurface(c: SceneContext): void {
  const { ctx, s, rng } = c;
  drawSpaceBg(ctx, s, rng);
  const g = ctx.createLinearGradient(0, s * 0.72, 0, s);
  g.addColorStop(0, '#cfc9c0');
  g.addColorStop(1, '#a8a199');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.8);
  ctx.quadraticCurveTo(s * 0.5, s * 0.74, s, s * 0.81);
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(90,85,80,0.4)';
  for (let i = 0; i < 6; i++) {
    const x = rng() * s;
    const y = s * (0.84 + rng() * 0.13);
    const r = s * (0.015 + rng() * 0.025);
    ellipse(ctx, x, y, r, r * 0.4);
    ctx.fill();
  }
}

function paintUnderwater(c: SceneContext): void {
  const { ctx, s, rng } = c;
  drawSeaWater(ctx, s);
  drawBubbles(ctx, s, rng);
  ctx.fillStyle = '#f0dfae';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.88);
  ctx.quadraticCurveTo(s * 0.3, s * 0.84, s * 0.55, s * 0.89);
  ctx.quadraticCurveTo(s * 0.8, s * 0.93, s, s * 0.88);
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fill();
  const corals: Array<[number, string]> = [[0.12, '#f28cae'], [0.85, '#ffa94d'], [0.55, '#b197fc']];
  for (const [cx, col] of corals) {
    ctx.strokeStyle = col;
    ctx.lineWidth = s * 0.014;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(s * cx, s * 0.9);
      ctx.quadraticCurveTo(s * cx + i * s * 0.012, s * 0.82, s * cx + i * s * 0.028, s * 0.76);
      ctx.stroke();
    }
  }
  drawSeaweed(ctx, s, s * 0.3, s * 0.9, s * 0.12, 1);
  drawSeaweed(ctx, s, s * 0.72, s * 0.92, s * 0.1, -1);
}

function paintOpenSea(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.82, 0.12, 0.065);
  drawCloud(ctx, s, s * 0.2, s * 0.14, s * 0.028, 0.85);
  // Волны
  const g = ctx.createLinearGradient(0, s * 0.62, 0, s);
  g.addColorStop(0, '#3b9dd4');
  g.addColorStop(1, '#1f6fa8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.68);
  for (let x = 0; x <= s; x += s * 0.125) {
    ctx.quadraticCurveTo(x + s * 0.0625, s * 0.65, x + s * 0.125, s * 0.68);
  }
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fill();
  // Белые гребешки
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = s * 0.006;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const wx = rng() * s;
    const wy = s * (0.74 + rng() * 0.2);
    ctx.beginPath();
    ctx.moveTo(wx - s * 0.04, wy);
    ctx.quadraticCurveTo(wx, wy - s * 0.02, wx + s * 0.04, wy);
    ctx.stroke();
  }
}

/* Гоночная трасса: асфальт, поребрики, стартовая шашечка */
function paintRaceTrack(c: SceneContext, isFormula: boolean): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.84, 0.11, 0.06);
  drawCloud(ctx, s, s * 0.16, s * 0.13, s * 0.03);
  drawCloud(ctx, s, s * 0.6, s * 0.2, s * 0.024, 0.8);

  // Трибуны вдали (для формулы)
  if (isFormula) {
    ctx.save();
    fillRoundRect(ctx, s * 0.04, s * 0.38, s * 0.92, s * 0.1, s * 0.012);
    paint(ctx, '#dbe4ff', pal.outlineSoft, s * 0.004);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = ['#fa5252', '#ffd43b', '#4dabf7', '#69db7c'][i % 4];
      ctx.fillRect(s * (0.06 + i * 0.075), s * 0.4, s * 0.05, s * 0.035);
    }
    ctx.restore();
  } else {
    drawHillBand(ctx, s, 0.44, 0.045, pal.hillFar, rng, 2);
  }

  // Трава до и после трассы
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, s * 0.5, s, s * 0.12);
  ctx.fillRect(0, s * 0.92, s, s * 0.08);

  // Асфальт
  const road = ctx.createLinearGradient(0, s * 0.62, 0, s * 0.92);
  road.addColorStop(0, '#868e96');
  road.addColorStop(1, '#5c6167');
  ctx.fillStyle = road;
  ctx.fillRect(0, s * 0.62, s, s * 0.3);

  // Белая пунктирная разметка
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(s * (0.05 + i * 0.2), s * 0.755, s * 0.09, s * 0.012);
  }

  // Красно-белый поребрик по верхнему краю
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#fa5252' : '#f8f9fa';
    ctx.fillRect(s * (i * 0.1), s * 0.6, s * 0.1, s * 0.025);
  }

  // Стартовая шашечка
  const cq = s * 0.022;
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 16; col++) {
      ctx.fillStyle = (r + col) % 2 === 0 ? '#212529' : '#f8f9fa';
      ctx.fillRect(s * 0.68 + col * cq, s * 0.86 + r * cq, cq, cq);
    }
  }

  // Светофор для формулы
  if (isFormula) {
    ctx.save();
    ctx.fillStyle = '#343a40';
    fillRoundRect(ctx, s * 0.45, s * 0.52, s * 0.1, s * 0.05, s * 0.008);
    ctx.fillStyle = '#2f9e44';
    circle(ctx, s * 0.478, s * 0.545, s * 0.012);
    ctx.fill();
    circle(ctx, s * 0.5, s * 0.545, s * 0.012);
    ctx.fill();
    circle(ctx, s * 0.522, s * 0.545, s * 0.012);
    ctx.fill();
    ctx.restore();
  }
}

/* Грязевая дорога для ралли */
function paintDirtRoad(c: SceneContext): void {
  const { ctx, s, rng, pal } = c;
  drawSky(ctx, s, pal);
  drawSun(ctx, s, pal, 0.8, 0.12, 0.055);
  drawCloud(ctx, s, s * 0.24, s * 0.15, s * 0.028);
  drawHillBand(ctx, s, 0.42, 0.05, pal.hillFar, rng, 2);
  drawHillBand(ctx, s, 0.5, 0.05, pal.hillMid, rng, 3);

  // Трава по краям
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, s * 0.56, s, s * 0.06);
  ctx.fillRect(0, s * 0.94, s, s * 0.06);

  // Грунтовая дорога
  const road = ctx.createLinearGradient(0, s * 0.62, 0, s * 0.94);
  road.addColorStop(0, '#c49a6c');
  road.addColorStop(1, '#a97e50');
  ctx.fillStyle = road;
  ctx.fillRect(0, s * 0.62, s, s * 0.32);

  // Колеи
  ctx.strokeStyle = 'rgba(120,84,50,0.55)';
  ctx.lineWidth = s * 0.018;
  ctx.lineCap = 'round';
  for (const ry of [0.7, 0.8, 0.88]) {
    ctx.beginPath();
    ctx.moveTo(0, s * ry);
    for (let x = 0; x <= s; x += s * 0.2) {
      ctx.quadraticCurveTo(x + s * 0.1, s * (ry + 0.012), x + s * 0.2, s * ry);
    }
    ctx.stroke();
  }

  // Камешки и кочки
  ctx.fillStyle = 'rgba(120,84,50,0.5)';
  for (let i = 0; i < 14; i++) {
    const x = rng() * s;
    const y = s * (0.64 + rng() * 0.26);
    ellipse(ctx, x, y, s * (0.006 + rng() * 0.012), s * (0.004 + rng() * 0.007));
    ctx.fill();
  }

  // Кусты на обочине
  for (const bx of [0.08, 0.9]) {
    ctx.fillStyle = pal.hillNear;
    circle(ctx, s * bx, s * 0.6, s * 0.03);
    ctx.fill();
    circle(ctx, s * (bx + 0.03), s * 0.61, s * 0.024);
    ctx.fill();
  }
}

/* Нарисовать фон сцены (без главного героя) */
export function paintBackground(ctx: Ctx2D, s: number, sceneId: string): PuzzlePalette {
  const pal = paletteForScene(sceneId);
  const rng = makeRng(seedFromText(sceneId) ^ 0x5f3a);
  const sc: SceneContext = {
    ctx, s, sceneId, rng, pal,
    outline: pal.outline,
    outlineSoft: pal.outlineSoft,
  };
  const painter = SCENE_BACKGROUNDS[sceneId];
  if (painter) painter(sc);
  else drawSky(ctx, s, pal);
  return pal;
}
