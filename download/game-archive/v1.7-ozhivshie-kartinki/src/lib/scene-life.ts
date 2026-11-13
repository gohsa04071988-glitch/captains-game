/* ============================================================
   ОЖИВШИЕ КАРТИНКИ (v1.7)
   Поверх собранной картинки каждый кадр дорисовывается движение:
   лучи солнца вращаются, облако плывёт, звёзды мерцают, пузырьки
   поднимаются, бабочки летают. Картинка та же — просто живая.

   ВАЖНО: все эффекты «приклеены» к местам, которые известны из
   scene-painter.ts (позиции солнц совпадают с drawSun каждой
   сцены, звёзды в космосе повторяются тем же зерном — поэтому
   мерцание ложится ровно на нарисованные звёздочки).
   ============================================================ */

import { paintFullScene, type Ctx2D } from './jigsaw-engine';
import { drawCloud, circle, makeRng, seedFromText } from './scene-painter';

type Effect = (ctx: Ctx2D, s: number, t: number) => void;

/* Позиции солнц — точно как в SCENE_BACKGROUNDS (drawSun) */
interface SunPos { x: number; y: number; r: number }

const SUNS: Record<string, SunPos> = {
  'steam-locomotive': { x: 0.82, y: 0.15, r: 0.075 },
  'speed-train':      { x: 0.15, y: 0.14, r: 0.06 },
  'cargo-train':      { x: 0.8,  y: 0.14, r: 0.07 },
  'house-build':      { x: 0.82, y: 0.15, r: 0.075 },
  'crane-blocks':     { x: 0.82, y: 0.15, r: 0.075 },
  excavator:          { x: 0.16, y: 0.15, r: 0.06 },
  mountains:          { x: 0.18, y: 0.14, r: 0.06 },
  bear:               { x: 0.16, y: 0.13, r: 0.06 },
  bunny:              { x: 0.8,  y: 0.13, r: 0.065 },
  diplodocus:         { x: 0.2,  y: 0.12, r: 0.06 },
  trex:               { x: 0.2,  y: 0.12, r: 0.06 },
  triceratops:        { x: 0.2,  y: 0.12, r: 0.06 },
  sailboat:           { x: 0.82, y: 0.12, r: 0.065 },
  'formula-car':      { x: 0.84, y: 0.11, r: 0.06 },
  kart:               { x: 0.84, y: 0.11, r: 0.06 },
  'rally-car':        { x: 0.8,  y: 0.12, r: 0.055 },
};

/* ----- Лучи солнца медленно вращаются и «дышат» ----- */
function paintSunRays(ctx: Ctx2D, s: number, sun: SunPos, t: number): void {
  const cx = s * sun.x;
  const cy = s * sun.y;
  const cr = s * sun.r;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.25);
  ctx.strokeStyle = 'rgba(255, 214, 90, 0.55)';
  ctx.lineWidth = Math.max(1.5, s * 0.008);
  ctx.lineCap = 'round';
  const len = 1.62 + 0.14 * Math.sin(t * 1.6);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * cr * 1.4, Math.sin(a) * cr * 1.4);
    ctx.lineTo(Math.cos(a) * cr * len, Math.sin(a) * cr * len);
    ctx.stroke();
  }
  ctx.restore();
  // Мягкий ореол, пульсирующий вместе с лучами
  ctx.save();
  ctx.globalAlpha = 0.14 + 0.07 * Math.sin(t * 1.6);
  ctx.fillStyle = '#ffe066';
  circle(ctx, cx, cy, cr * 1.3);
  ctx.fill();
  ctx.restore();
}

/* ----- Облако медленно плывёт через небо и уходит за край ----- */
function makeDriftingCloud(yFrac: number, kFrac: number, speedFrac: number, alpha: number): Effect {
  return (ctx, s, t) => {
    const k = s * kFrac;
    const span = s + k * 4.2;
    const x = -k * 3.6 + ((t * s * speedFrac) % span);
    drawCloud(ctx, s, x, s * yFrac, k, alpha);
  };
}

/* ----- Мерцающие звёзды (космос) -----
   Звёздочки повторяются с тем же зерном, что в drawSpaceBg:
   70 звёзд по 4 вызова зерна (x, y, размер, «золотая?»),
   потом 5 блёсток по 2 вызова. Мерцает каждая четвёртая. */
function makeSpaceTwinkle(sceneId: string, maxYFrac: number): Effect {
  return (ctx, s, t) => {
    const rng = makeRng(seedFromText(sceneId) ^ 0x5f3a);
    for (let i = 0; i < 70; i++) {
      const x = rng() * s;
      const y = rng() * s;
      const r = (0.004 + rng() * 0.01) * s;
      const gold = rng() > 0.85;
      if (i % 4 !== 0) continue;
      if (y > s * maxYFrac) continue;
      const a = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.7));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = gold ? '#ffe9a8' : '#ffffff';
      circle(ctx, x, y, r * 1.6);
      ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) { rng(); rng(); } // блёстки фона — не трогаем
  };
}

/* ----- Падающая звезда раз в ~4 секунды ----- */
function paintShootingStar(ctx: Ctx2D, s: number, t: number): void {
  const p = (t % 4.2) / 1.1;
  if (p >= 1) return;
  const x0 = s * 0.72; const y0 = s * 0.08;
  const x1 = s * 0.3;  const y1 = s * 0.34;
  const x = x0 + (x1 - x0) * p;
  const y = y0 + (y1 - y0) * p;
  ctx.save();
  ctx.globalAlpha = 0.85 * Math.sin(Math.PI * p);
  const grad = ctx.createLinearGradient(x, y, x + s * 0.09, y - s * 0.06);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = Math.max(1.5, s * 0.006);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.09, y - s * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x, y, Math.max(1.2, s * 0.007));
  ctx.fill();
  ctx.restore();
}

/* ----- Пузырьки поднимаются со дна (подводный мир) ----- */
function paintBubbles(ctx: Ctx2D, s: number, t: number): void {
  for (let i = 0; i < 6; i++) {
    const speed = 0.05 + (i % 3) * 0.012;
    const ph = (t * speed + i * 0.23) % 1.2;
    const bx = s * (0.1 + ((i * 0.173) % 0.84)) + Math.sin(t * 1.3 + i) * s * 0.008;
    const by = s * (1.06 - ph);
    const br = Math.max(1.4, s * (0.006 + ((i * 0.011) % 0.012)));
    const fade = ph < 1 ? 1 : (1.2 - ph) / 0.2;
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1, s * 0.0025);
    circle(ctx, bx, by, br);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/* ----- Белые гребешки бегут по волнам (море) ----- */
function paintCrests(ctx: Ctx2D, s: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const speed = 0.035 + i * 0.012;
    const ph = (t * speed + i * 0.33) % 1.3;
    const x = s * (ph * 1.15 - 0.1);
    const y = s * (0.72 + i * 0.07);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.007);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, y);
    ctx.quadraticCurveTo(x, y - s * 0.018, x + s * 0.05, y);
    ctx.stroke();
    ctx.restore();
  }
}

/* ----- Бабочки летают (джунгли, лес, поляна) ----- */
const BUTTERFLY_COLORS = ['#f783ac', '#ffd43b', '#74c0fc'];

function paintButterflies(ctx: Ctx2D, s: number, t: number): void {
  for (let i = 0; i < 2; i++) {
    const ph = i * 2.4;
    const x = s * (0.28 + 0.3 * Math.sin(t * 0.21 + ph) + 0.06 * Math.sin(t * 0.9 + ph));
    const y = s * (0.38 + 0.16 * Math.sin(t * 0.16 + ph * 1.7) + 0.04 * Math.cos(t * 1.1 + ph));
    const flap = Math.max(0.25, Math.abs(Math.sin(t * 7 + ph)));
    const size = s * 0.016;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.5 + ph) * 0.4);
    ctx.fillStyle = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length];
    // Крылья машут: сжимаем их по горизонтали
    ctx.save();
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.ellipse(-size * 0.7, -size * 0.2, size * 0.75, size * 0.45, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.7, -size * 0.2, size * 0.75, size * 0.45, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.16, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ----- Искры над вулканом поднимаются и гаснут ----- */
function paintEmbers(ctx: Ctx2D, s: number, t: number): void {
  for (let i = 0; i < 6; i++) {
    const speed = 0.045 + (i % 3) * 0.01;
    const ph = (t * speed + i * 0.19) % 1.1;
    const y = s * (0.92 - ph * 0.8);
    const x = s * (0.2 + ((i * 0.137) % 0.6)) + Math.sin(t * 1.4 + i) * s * 0.012;
    const r = Math.max(1.2, s * (0.004 + ((i * 0.003) % 0.004)));
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.75 * (1 - ph / 1.05));
    ctx.fillStyle = i % 2 ? '#ff922b' : '#ffa94d';
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.restore();
  }
}

/* ----- Тёплые пылинки в луче света (комната кота) ----- */
function paintMotes(ctx: Ctx2D, s: number, t: number): void {
  for (let i = 0; i < 5; i++) {
    const speed = 0.03 + (i % 3) * 0.008;
    const ph = (t * speed + i * 0.21) % 1.1;
    const y = s * (0.95 - ph * 0.85);
    const x = s * (0.12 + ((i * 0.21) % 0.76)) + Math.sin(t * 0.8 + i * 2) * s * 0.014;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.45 * (1 - ph / 1.1));
    ctx.fillStyle = '#ffd8a8';
    circle(ctx, x, y, Math.max(1.2, s * 0.005));
    ctx.fill();
    ctx.restore();
  }
}

/* ----- Таблица эффектов по сценам ----- */

const EFFECTS: Record<string, Effect[]> = {};

/* Небесные сцены: лучи + плывущее облако (у каждой свои высота
   и скорость, чтобы облака не двигались синхронно) */
const CLOUD_SETUP: Record<string, [number, number, number, number]> = {
  // y, k, скорость, прозрачность
  'steam-locomotive': [0.09, 0.024, 0.016, 0.78],
  'speed-train':      [0.07, 0.022, 0.019, 0.75],
  'cargo-train':      [0.1,  0.026, 0.014, 0.8],
  'house-build':      [0.08, 0.024, 0.017, 0.75],
  'crane-blocks':     [0.11, 0.021, 0.02,  0.72],
  excavator:          [0.09, 0.025, 0.015, 0.78],
  mountains:          [0.07, 0.023, 0.018, 0.75],
  bear:               [0.08, 0.024, 0.016, 0.8],
  bunny:              [0.1,  0.026, 0.019, 0.78],
  diplodocus:         [0.09, 0.022, 0.018, 0.72],
  trex:               [0.12, 0.02,  0.021, 0.7],
  triceratops:        [0.07, 0.025, 0.014, 0.75],
  'formula-car':      [0.08, 0.026, 0.022, 0.78],
  kart:               [0.11, 0.022, 0.017, 0.75],
  'rally-car':        [0.09, 0.024, 0.02,  0.78],
  sailboat:           [0.08, 0.025, 0.018, 0.8],
};

for (const [id, sun] of Object.entries(SUNS)) {
  const list: Effect[] = [
    (ctx, s, t) => paintSunRays(ctx, s, sun, t),
  ];
  const cloud = CLOUD_SETUP[id];
  if (cloud) {
    list.push(makeDriftingCloud(cloud[0], cloud[1], cloud[2], cloud[3]));
  }
  EFFECTS[id] = list;
}

/* Джунгли, лес и поляна: добавляем бабочек */
for (const id of ['diplodocus', 'trex', 'triceratops', 'bear', 'bunny']) {
  EFFECTS[id].push((ctx, s, t) => paintButterflies(ctx, s, t));
}

/* Море: бегущие гребешки */
EFFECTS.sailboat.push((ctx, s, t) => paintCrests(ctx, s, t));

/* Космос: мерцание звёзд + падающая звезда.
   У лунохода мерцают только звёзды над поверхностью (выше 0.66) */
EFFECTS.rocket = [
  makeSpaceTwinkle('rocket', 0.95),
  (ctx, s, t) => paintShootingStar(ctx, s, t),
];
EFFECTS['saturn-planets'] = [
  makeSpaceTwinkle('saturn-planets', 0.95),
  (ctx, s, t) => paintShootingStar(ctx, s, t),
];
EFFECTS['planet-earth'] = [
  makeSpaceTwinkle('planet-earth', 0.95),
  (ctx, s, t) => paintShootingStar(ctx, s, t),
];
EFFECTS['moon-rover'] = [
  makeSpaceTwinkle('moon-rover', 0.66),
  (ctx, s, t) => paintShootingStar(ctx, s, t),
];

/* Подводный мир: пузырьки */
EFFECTS.clownfish = [(ctx, s, t) => paintBubbles(ctx, s, t)];
EFFECTS.octopus = [(ctx, s, t) => paintBubbles(ctx, s, t)];

/* Вулкан: искры (солнца на этой сцене нет) */
EFFECTS.volcano = [(ctx, s, t) => paintEmbers(ctx, s, t)];

/* Комната кота: тёплые пылинки */
EFFECTS.cat = [(ctx, s, t) => paintMotes(ctx, s, t)];

/* Нарисовать кадр ожившей картинки: сначала обычная сцена,
   поверх — эффекты, привязанные к времени t (секунды) */
export function paintLivingScene(ctx: Ctx2D, s: number, sceneId: string, t: number): void {
  paintFullScene(ctx, s, sceneId);
  const list = EFFECTS[sceneId];
  if (!list) return;
  for (const f of list) f(ctx, s, t);
}
