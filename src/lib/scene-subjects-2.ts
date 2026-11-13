/* ============================================================
   ВЕКТОРНЫЕ ИЛЛЮСТРАЦИИ — ЧАСТЬ 2
   Природа, животные, динозавры и море.
   Все герои нарисованы путями с контурами — чётко и ярко.
   ============================================================ */

import type { PuzzlePalette } from './puzzle-data';
import type { Ctx2D } from './scene-painter';
import { circle, ellipse, fillRoundRect, paint, groundShadow, drawFlower } from './scene-painter';

export type SubjectPainter = (ctx: Ctx2D, s: number, pal: PuzzlePalette, seed: number) => void;

const LINE = (pal: PuzzlePalette) => pal.outline;
const LW = (s: number, k = 0.006) => Math.max(1.5, s * k);

/* Глаз с бликом */
function eye(ctx: Ctx2D, s: number, x: number, y: number, r: number): void {
  circle(ctx, x, y, r);
  paint(ctx, '#212529', null);
  circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.3);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/* Улыбка-дуга */
function smile(ctx: Ctx2D, s: number, x: number, y: number, r: number, lw = 0.004): void {
  ctx.strokeStyle = '#212529';
  ctx.lineWidth = Math.max(1.5, s * lw);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

/* ---------- 🌍 Планета Земля ---------- */

const planetEarth: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.5;
  const cy = s * 0.48;
  const r = s * 0.26;

  // Атмосфера
  ctx.save();
  ctx.globalAlpha = 0.35;
  circle(ctx, cx, cy, r * 1.14);
  ctx.fillStyle = '#74c0fc';
  ctx.fill();
  ctx.restore();

  // Океан
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.3, cx, cy, r);
  g.addColorStop(0, '#74c0fc');
  g.addColorStop(1, '#1971c2');
  ctx.fillStyle = g;
  circle(ctx, cx, cy, r);
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.007);
  ctx.stroke();

  // Континенты
  ctx.save();
  circle(ctx, cx, cy, r);
  ctx.clip();
  ctx.fillStyle = '#69db7c';
  ctx.strokeStyle = 'rgba(40,110,60,0.5)';
  ctx.lineWidth = LW(s, 0.004);
  ellipse(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.38, r * 0.24, -0.5);
  ctx.fill(); ctx.stroke();
  ellipse(ctx, cx + r * 0.42, cy + r * 0.05, r * 0.3, r * 0.38, 0.4);
  ctx.fill(); ctx.stroke();
  ellipse(ctx, cx - r * 0.2, cy + r * 0.55, r * 0.34, r * 0.2, 0.2);
  ctx.fill(); ctx.stroke();
  ellipse(ctx, cx + r * 0.15, cy - r * 0.65, r * 0.22, r * 0.12, 0.1);
  ctx.fill(); ctx.stroke();
  // Облака
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#fff';
  ellipse(ctx, cx + r * 0.1, cy - r * 0.2, r * 0.26, r * 0.08, -0.2);
  ctx.fill();
  ellipse(ctx, cx - r * 0.45, cy + r * 0.15, r * 0.2, r * 0.07, 0.3);
  ctx.fill();
  ctx.restore();

  // Блик
  ctx.save();
  ctx.globalAlpha = 0.5;
  ellipse(ctx, cx - r * 0.4, cy - r * 0.45, r * 0.16, r * 0.09, -0.7);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
};

/* ---------- 🌋 Вулкан ---------- */

const volcano: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.5, s * 0.86, s * 0.32);

  // Гора
  ctx.beginPath();
  ctx.moveTo(s * 0.2, s * 0.84);
  ctx.lineTo(s * 0.42, s * 0.34);
  ctx.lineTo(s * 0.58, s * 0.34);
  ctx.lineTo(s * 0.8, s * 0.84);
  ctx.closePath();
  paint(ctx, '#6e4a3a', out, LW(s, 0.007));

  // Кратер и лава на вершине
  ctx.beginPath();
  ctx.moveTo(s * 0.42, s * 0.34);
  ctx.quadraticCurveTo(s * 0.5, s * 0.3, s * 0.58, s * 0.34);
  ctx.lineTo(s * 0.56, s * 0.4);
  ctx.quadraticCurveTo(s * 0.5, s * 0.37, s * 0.44, s * 0.4);
  ctx.closePath();
  paint(ctx, '#ff6b35', out, LW(s, 0.005));

  // Поток лавы
  ctx.beginPath();
  ctx.moveTo(s * 0.47, s * 0.38);
  ctx.quadraticCurveTo(s * 0.52, s * 0.55, s * 0.58, s * 0.82);
  ctx.lineTo(s * 0.64, s * 0.83);
  ctx.quadraticCurveTo(s * 0.56, s * 0.55, s * 0.53, s * 0.38);
  ctx.closePath();
  paint(ctx, '#ff922b', null);

  // Искры
  circle(ctx, s * 0.44, s * 0.28, s * 0.012);
  paint(ctx, '#ffa94d', null);
  circle(ctx, s * 0.57, s * 0.25, s * 0.01);
  paint(ctx, '#ffd43b', null);

  // Дым
  ctx.save();
  ctx.fillStyle = 'rgba(90,80,80,0.75)';
  circle(ctx, s * 0.46, s * 0.24, s * 0.045);
  ctx.fill();
  circle(ctx, s * 0.52, s * 0.17, s * 0.055);
  ctx.fill();
  circle(ctx, s * 0.45, s * 0.11, s * 0.06);
  ctx.fill();
  ctx.restore();

  // Камни у подножия
  ellipse(ctx, s * 0.26, s * 0.845, s * 0.03, s * 0.02);
  paint(ctx, '#846355', out, LW(s, 0.004));
  ellipse(ctx, s * 0.76, s * 0.85, s * 0.035, s * 0.022);
  paint(ctx, '#846355', out, LW(s, 0.004));
};

/* ---------- 🏔️ Горы ---------- */

const mountains: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);

  // Главная гора
  ctx.beginPath();
  ctx.moveTo(s * 0.18, s * 0.82);
  ctx.lineTo(s * 0.44, s * 0.22);
  ctx.lineTo(s * 0.5, s * 0.3);
  ctx.lineTo(s * 0.56, s * 0.2);
  ctx.lineTo(s * 0.84, s * 0.82);
  ctx.closePath();
  paint(ctx, '#7d93b5', out, LW(s, 0.007));

  // Снежные вершины
  ctx.beginPath();
  ctx.moveTo(s * 0.385, s * 0.36);
  ctx.lineTo(s * 0.44, s * 0.22);
  ctx.lineTo(s * 0.47, s * 0.28);
  ctx.lineTo(s * 0.5, s * 0.245);
  ctx.lineTo(s * 0.525, s * 0.3);
  ctx.lineTo(s * 0.56, s * 0.2);
  ctx.lineTo(s * 0.615, s * 0.38);
  ctx.quadraticCurveTo(s * 0.55, s * 0.32, s * 0.5, s * 0.38);
  ctx.quadraticCurveTo(s * 0.44, s * 0.31, s * 0.385, s * 0.36);
  ctx.closePath();
  paint(ctx, '#ffffff', out, LW(s, 0.005));

  // Скальные грани
  ctx.strokeStyle = 'rgba(50,60,90,0.35)';
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.4);
  ctx.lineTo(s * 0.46, s * 0.55);
  ctx.lineTo(s * 0.51, s * 0.68);
  ctx.moveTo(s * 0.58, s * 0.42);
  ctx.lineTo(s * 0.62, s * 0.6);
  ctx.stroke();

  // Лес у подножия
  for (const [tx, th] of [[0.24, 0.1], [0.32, 0.13], [0.68, 0.12], [0.78, 0.09]] as const) {
    ctx.beginPath();
    ctx.moveTo(s * (tx - 0.035), s * 0.84);
    ctx.lineTo(s * tx, s * (0.84 - th));
    ctx.lineTo(s * (tx + 0.035), s * 0.84);
    ctx.closePath();
    paint(ctx, '#2e7d4f', out, LW(s, 0.004));
  }
};

/* ---------- 🐻 Мишка ---------- */

const bear: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.5;
  groundShadow(ctx, cx, s * 0.86, s * 0.24);

  const fur = '#a97142';
  const furLight = '#c9925e';

  // Тело
  ellipse(ctx, cx, s * 0.68, s * 0.21, s * 0.18);
  paint(ctx, fur, out, LW(s, 0.007));

  // Уши
  circle(ctx, cx - s * 0.14, s * 0.33, s * 0.055);
  paint(ctx, fur, out, LW(s, 0.006));
  circle(ctx, cx + s * 0.14, s * 0.33, s * 0.055);
  paint(ctx, fur, out, LW(s, 0.006));
  circle(ctx, cx - s * 0.14, s * 0.33, s * 0.028);
  paint(ctx, furLight, null);
  circle(ctx, cx + s * 0.14, s * 0.33, s * 0.028);
  paint(ctx, furLight, null);

  // Голова
  circle(ctx, cx, s * 0.44, s * 0.155);
  paint(ctx, fur, out, LW(s, 0.007));

  // Морда
  ellipse(ctx, cx, s * 0.49, s * 0.085, s * 0.065);
  paint(ctx, furLight, null);
  ellipse(ctx, cx, s * 0.462, s * 0.028, s * 0.02);
  paint(ctx, '#5c3a21', null);
  smile(ctx, s, cx, s * 0.49, s * 0.035);

  // Глаза
  eye(ctx, s, cx - s * 0.055, s * 0.41, s * 0.016);
  eye(ctx, s, cx + s * 0.055, s * 0.41, s * 0.016);

  // Живот
  ellipse(ctx, cx, s * 0.7, s * 0.13, s * 0.115);
  paint(ctx, furLight, null);

  // Лапы
  ellipse(ctx, cx - s * 0.16, s * 0.82, s * 0.055, s * 0.04, 0.3);
  paint(ctx, furLight, out, LW(s, 0.005));
  ellipse(ctx, cx + s * 0.16, s * 0.82, s * 0.055, s * 0.04, -0.3);
  paint(ctx, furLight, out, LW(s, 0.005));

  // Бочонок мёда
  fillRoundRect(ctx, s * 0.72, s * 0.72, s * 0.11, s * 0.12, s * 0.015);
  paint(ctx, '#e8a94e', out, LW(s, 0.005));
  fillRoundRect(ctx, s * 0.72, s * 0.755, s * 0.11, s * 0.028, s * 0.005);
  paint(ctx, '#c98a3e', out, LW(s, 0.004));
  ctx.fillStyle = '#ffe066';
  ellipse(ctx, s * 0.775, s * 0.72, s * 0.052, s * 0.014);
  ctx.fill();
};

/* ---------- 🐰 Зайка ---------- */

const bunny: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.48;
  groundShadow(ctx, cx, s * 0.86, s * 0.22);

  const fur = '#f1f3f5';
  const furPink = '#fcc2d7';

  // Уши
  ellipse(ctx, cx - s * 0.08, s * 0.24, s * 0.035, s * 0.13, 0.12);
  paint(ctx, fur, out, LW(s, 0.006));
  ellipse(ctx, cx + s * 0.06, s * 0.23, s * 0.035, s * 0.135, -0.1);
  paint(ctx, fur, out, LW(s, 0.006));
  ellipse(ctx, cx - s * 0.08, s * 0.26, s * 0.018, s * 0.09, 0.12);
  paint(ctx, furPink, null);
  ellipse(ctx, cx + s * 0.06, s * 0.25, s * 0.018, s * 0.09, -0.1);
  paint(ctx, furPink, null);

  // Голова
  circle(ctx, cx, s * 0.44, s * 0.13);
  paint(ctx, fur, out, LW(s, 0.007));

  // Тело
  ellipse(ctx, cx, s * 0.7, s * 0.16, s * 0.15);
  paint(ctx, fur, out, LW(s, 0.007));
  ellipse(ctx, cx, s * 0.72, s * 0.1, s * 0.1);
  paint(ctx, '#fdeef2', null);

  // Хвост
  circle(ctx, cx + s * 0.17, s * 0.73, s * 0.045);
  paint(ctx, '#fff', out, LW(s, 0.005));

  // Морда
  eye(ctx, s, cx - s * 0.05, s * 0.42, s * 0.014);
  eye(ctx, s, cx + s * 0.05, s * 0.42, s * 0.014);
  ctx.fillStyle = '#ff8fab';
  ellipse(ctx, cx, s * 0.475, s * 0.018, s * 0.013);
  ctx.fill();
  smile(ctx, s, cx, s * 0.485, s * 0.028);
  // Усики
  ctx.strokeStyle = 'rgba(60,50,50,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.0022);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.03, s * 0.485);
  ctx.lineTo(cx - s * 0.09, s * 0.47);
  ctx.moveTo(cx - s * 0.03, s * 0.495);
  ctx.lineTo(cx - s * 0.09, s * 0.51);
  ctx.moveTo(cx + s * 0.03, s * 0.485);
  ctx.lineTo(cx + s * 0.09, s * 0.47);
  ctx.moveTo(cx + s * 0.03, s * 0.495);
  ctx.lineTo(cx + s * 0.09, s * 0.51);
  ctx.stroke();

  // Морковка рядом
  ctx.save();
  ctx.translate(s * 0.78, s * 0.78);
  ctx.rotate(0.6);
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, 0);
  ctx.lineTo(s * 0.02, 0);
  ctx.lineTo(0, s * 0.12);
  ctx.closePath();
  paint(ctx, '#ff922b', out, LW(s, 0.004));
  ctx.strokeStyle = 'rgba(180,90,20,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.002);
  ctx.beginPath();
  ctx.moveTo(-s * 0.012, s * 0.03);
  ctx.lineTo(s * 0.012, s * 0.03);
  ctx.moveTo(-s * 0.009, s * 0.06);
  ctx.lineTo(s * 0.009, s * 0.06);
  ctx.stroke();
  ctx.strokeStyle = '#2f9e44';
  ctx.lineWidth = Math.max(1.5, s * 0.005);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * 0.03, -s * 0.04);
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.03, -s * 0.04);
  ctx.stroke();
  ctx.restore();

  // Цветочки на лужайке
  drawFlower(ctx, s, s * 0.16, s * 0.88, '#f472b6');
  drawFlower(ctx, s, s * 0.85, s * 0.92, '#facc15');
};

/* ---------- 🐱 Котик ---------- */

const cat: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.46;
  groundShadow(ctx, cx, s * 0.87, s * 0.24);

  const fur = '#f59f00';
  const furLight = '#ffe066';

  // Хвост
  ctx.save();
  ctx.strokeStyle = fur;
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.13, s * 0.8);
  ctx.quadraticCurveTo(cx + s * 0.28, s * 0.78, cx + s * 0.26, s * 0.62);
  ctx.stroke();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.13, s * 0.8);
  ctx.quadraticCurveTo(cx + s * 0.28, s * 0.78, cx + s * 0.26, s * 0.62);
  ctx.stroke();
  ctx.restore();

  // Тело
  ellipse(ctx, cx, s * 0.74, s * 0.17, s * 0.14);
  paint(ctx, fur, out, LW(s, 0.007));
  ellipse(ctx, cx, s * 0.78, s * 0.1, s * 0.08);
  paint(ctx, furLight, null);

  // Уши
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, s * 0.36);
  ctx.lineTo(cx - s * 0.14, s * 0.24);
  ctx.lineTo(cx - s * 0.04, s * 0.31);
  ctx.closePath();
  paint(ctx, fur, out, LW(s, 0.005));
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.12, s * 0.36);
  ctx.lineTo(cx + s * 0.14, s * 0.24);
  ctx.lineTo(cx + s * 0.04, s * 0.31);
  ctx.closePath();
  paint(ctx, fur, out, LW(s, 0.005));
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.105, s * 0.33);
  ctx.lineTo(cx - s * 0.115, s * 0.265);
  ctx.lineTo(cx - s * 0.065, s * 0.31);
  ctx.closePath();
  paint(ctx, furPinkHelper(), null);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.105, s * 0.33);
  ctx.lineTo(cx + s * 0.115, s * 0.265);
  ctx.lineTo(cx + s * 0.065, s * 0.31);
  ctx.closePath();
  paint(ctx, furPinkHelper(), null);

  // Голова
  circle(ctx, cx, s * 0.42, s * 0.125);
  paint(ctx, fur, out, LW(s, 0.007));

  // Полоски
  ctx.strokeStyle = 'rgba(180,110,0,0.6)';
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.03, s * 0.305);
  ctx.lineTo(cx - s * 0.03, s * 0.345);
  ctx.moveTo(cx, s * 0.298);
  ctx.lineTo(cx, s * 0.34);
  ctx.moveTo(cx + s * 0.03, s * 0.305);
  ctx.lineTo(cx + s * 0.03, s * 0.345);
  ctx.stroke();

  // Морда
  eye(ctx, s, cx - s * 0.048, s * 0.41, s * 0.015);
  eye(ctx, s, cx + s * 0.048, s * 0.41, s * 0.015);
  ctx.fillStyle = '#e8590c';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.014, s * 0.46);
  ctx.lineTo(cx + s * 0.014, s * 0.46);
  ctx.lineTo(cx, s * 0.482);
  ctx.closePath();
  ctx.fill();
  smile(ctx, s, cx, s * 0.475, s * 0.026);
  // Усики
  ctx.strokeStyle = 'rgba(90,60,20,0.6)';
  ctx.lineWidth = Math.max(1, s * 0.0022);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.035, s * 0.465);
  ctx.lineTo(cx - s * 0.1, s * 0.445);
  ctx.moveTo(cx - s * 0.035, s * 0.48);
  ctx.lineTo(cx - s * 0.1, s * 0.49);
  ctx.moveTo(cx + s * 0.035, s * 0.465);
  ctx.lineTo(cx + s * 0.1, s * 0.445);
  ctx.moveTo(cx + s * 0.035, s * 0.48);
  ctx.lineTo(cx + s * 0.1, s * 0.49);
  ctx.stroke();

  // Клубок ниток
  const bx = s * 0.76;
  const by = s * 0.79;
  circle(ctx, bx, by, s * 0.07);
  paint(ctx, '#e64980', out, LW(s, 0.006));
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = LW(s, 0.0035);
  ctx.beginPath();
  ctx.arc(bx, by, s * 0.05, 0.5, 2.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by, s * 0.032, 2.8, 5.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + s * 0.06, by + s * 0.04);
  ctx.quadraticCurveTo(bx + s * 0.12, by + s * 0.08, bx + s * 0.08, by + s * 0.13);
  ctx.stroke();
};

function furPinkHelper(): string {
  return '#fcc2d7';
}

/* ---------- 🦕 Диплодок ---------- */

const diplodocus: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.5, s * 0.85, s * 0.34);

  const skin = '#63b86a';
  const skinLight = '#8fd99a';

  // Хвост
  ctx.save();
  ctx.strokeStyle = skin;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.62);
  ctx.quadraticCurveTo(s * 0.8, s * 0.66, s * 0.92, s * 0.52);
  ctx.stroke();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.585);
  ctx.quadraticCurveTo(s * 0.8, s * 0.625, s * 0.925, s * 0.49);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.655);
  ctx.quadraticCurveTo(s * 0.8, s * 0.7, s * 0.915, s * 0.555);
  ctx.stroke();
  ctx.restore();

  // Тело
  ellipse(ctx, s * 0.45, s * 0.63, s * 0.19, s * 0.115);
  paint(ctx, skin, out, LW(s, 0.007));

  // Шея
  ctx.save();
  ctx.strokeStyle = skin;
  ctx.lineWidth = s * 0.075;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.33, s * 0.6);
  ctx.quadraticCurveTo(s * 0.22, s * 0.42, s * 0.28, s * 0.26);
  ctx.stroke();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.295, s * 0.615);
  ctx.quadraticCurveTo(s * 0.185, s * 0.42, s * 0.245, s * 0.255);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.365, s * 0.59);
  ctx.quadraticCurveTo(s * 0.255, s * 0.42, s * 0.315, s * 0.268);
  ctx.stroke();
  ctx.restore();

  // Голова
  ellipse(ctx, s * 0.31, s * 0.235, s * 0.055, s * 0.032, -0.35);
  paint(ctx, skin, out, LW(s, 0.005));
  eye(ctx, s, s * 0.33, s * 0.225, s * 0.011);
  smile(ctx, s, s * 0.285, s * 0.245, s * 0.016, 0.003);

  // Ноги
  for (const [lx, ly] of [[0.36, 0.74], [0.52, 0.74]] as const) {
    fillRoundRect(ctx, s * lx, s * ly, s * 0.06, s * 0.09, s * 0.02);
    paint(ctx, skin, out, LW(s, 0.005));
  }

  // Пятна на спине
  ctx.save();
  ellipse(ctx, s * 0.45, s * 0.63, s * 0.19, s * 0.115);
  ctx.clip();
  ctx.fillStyle = skinLight;
  for (let i = 0; i < 6; i++) {
    circle(ctx, s * (0.33 + i * 0.05), s * (0.56 + (i % 2) * 0.03), s * 0.016);
    ctx.fill();
  }
  ctx.restore();
};

/* ---------- 🦖 Тираннозавр ---------- */

const trex: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.52, s * 0.86, s * 0.28);

  const skin = '#e8794a';
  const belly = '#f8b48a';

  // Хвост
  ctx.beginPath();
  ctx.moveTo(s * 0.55, s * 0.6);
  ctx.quadraticCurveTo(s * 0.78, s * 0.56, s * 0.9, s * 0.42);
  ctx.quadraticCurveTo(s * 0.82, s * 0.64, s * 0.6, s * 0.72);
  ctx.closePath();
  paint(ctx, skin, out, LW(s, 0.007));

  // Тело
  ellipse(ctx, s * 0.46, s * 0.62, s * 0.15, s * 0.13, -0.15);
  paint(ctx, skin, out, LW(s, 0.007));
  ellipse(ctx, s * 0.44, s * 0.66, s * 0.09, s * 0.08, -0.15);
  paint(ctx, belly, null);

  // Задняя нога
  fillRoundRect(ctx, s * 0.48, s * 0.68, s * 0.09, s * 0.12, s * 0.025);
  paint(ctx, skin, out, LW(s, 0.006));
  ellipse(ctx, s * 0.545, s * 0.815, s * 0.06, s * 0.028);
  paint(ctx, skin, out, LW(s, 0.005));

  // Передняя нога
  fillRoundRect(ctx, s * 0.35, s * 0.7, s * 0.07, s * 0.1, s * 0.02);
  paint(ctx, skin, out, LW(s, 0.006));
  ellipse(ctx, s * 0.385, s * 0.81, s * 0.05, s * 0.025);
  paint(ctx, skin, out, LW(s, 0.005));

  // Руки маленькие
  ctx.strokeStyle = skin;
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.36, s * 0.52);
  ctx.lineTo(s * 0.3, s * 0.56);
  ctx.stroke();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.36, s * 0.52);
  ctx.lineTo(s * 0.3, s * 0.56);
  ctx.stroke();

  // Голова
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.24, s * 0.4);
  ctx.quadraticCurveTo(s * 0.24, s * 0.3, s * 0.34, s * 0.29);
  ctx.quadraticCurveTo(s * 0.45, s * 0.285, s * 0.46, s * 0.36);
  ctx.quadraticCurveTo(s * 0.47, s * 0.44, s * 0.4, s * 0.47);
  ctx.quadraticCurveTo(s * 0.3, s * 0.49, s * 0.24, s * 0.4);
  ctx.closePath();
  paint(ctx, skin, out, LW(s, 0.007));
  ctx.restore();

  // Челюсть и зубы
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.4);
  ctx.quadraticCurveTo(s * 0.32, s * 0.44, s * 0.4, s * 0.45);
  ctx.lineTo(s * 0.4, s * 0.5);
  ctx.quadraticCurveTo(s * 0.3, s * 0.5, s * 0.25, s * 0.44);
  ctx.closePath();
  paint(ctx, '#c4572e', out, LW(s, 0.005));
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    const tx = s * (0.27 + i * 0.033);
    ctx.beginPath();
    ctx.moveTo(tx, s * 0.435);
    ctx.lineTo(tx + s * 0.012, s * 0.435);
    ctx.lineTo(tx + s * 0.006, s * 0.462);
    ctx.closePath();
    ctx.fill();
  }

  // Глаз и бровь
  eye(ctx, s, s * 0.36, s * 0.35, s * 0.013);
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.32, s * 0.315);
  ctx.lineTo(s * 0.395, s * 0.305);
  ctx.stroke();
};

/* ---------- 🦕 Трицератопс ---------- */

const triceratops: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.52, s * 0.85, s * 0.3);

  const skin = '#8f9fe0';
  const belly = '#c3cdf2';

  // Хвост
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.62);
  ctx.quadraticCurveTo(s * 0.78, s * 0.6, s * 0.9, s * 0.48);
  ctx.quadraticCurveTo(s * 0.8, s * 0.68, s * 0.6, s * 0.72);
  ctx.closePath();
  paint(ctx, skin, out, LW(s, 0.006));

  // Тело
  ellipse(ctx, s * 0.46, s * 0.63, s * 0.17, s * 0.12);
  paint(ctx, skin, out, LW(s, 0.007));
  ellipse(ctx, s * 0.45, s * 0.67, s * 0.11, s * 0.07);
  paint(ctx, belly, null);

  // Ноги
  for (const [lx, lw2] of [[0.33, 0.075], [0.5, 0.075]] as const) {
    fillRoundRect(ctx, s * lx, s * 0.69, s * lw2, s * 0.12, s * 0.02);
    paint(ctx, skin, out, LW(s, 0.005));
  }

  // Воротник-защита
  ellipse(ctx, s * 0.28, s * 0.46, s * 0.1, s * 0.13, -0.3);
  paint(ctx, '#6c7cc9', out, LW(s, 0.006));

  // Голова
  ellipse(ctx, s * 0.27, s * 0.5, s * 0.085, s * 0.06, -0.25);
  paint(ctx, skin, out, LW(s, 0.006));

  // Рога: два больших + один на носу
  ctx.beginPath();
  ctx.moveTo(s * 0.23, s * 0.44);
  ctx.lineTo(s * 0.17, s * 0.34);
  ctx.lineTo(s * 0.26, s * 0.41);
  ctx.closePath();
  paint(ctx, '#f1e5c8', out, LW(s, 0.004));
  ctx.beginPath();
  ctx.moveTo(s * 0.3, s * 0.42);
  ctx.lineTo(s * 0.28, s * 0.3);
  ctx.lineTo(s * 0.335, s * 0.4);
  ctx.closePath();
  paint(ctx, '#f1e5c8', out, LW(s, 0.004));
  ctx.beginPath();
  ctx.moveTo(s * 0.2, s * 0.5);
  ctx.lineTo(s * 0.15, s * 0.5);
  ctx.lineTo(s * 0.205, s * 0.535);
  ctx.closePath();
  paint(ctx, '#f1e5c8', out, LW(s, 0.004));

  // Глаз
  eye(ctx, s, s * 0.27, s * 0.48, s * 0.012);
  // Рот
  ctx.strokeStyle = '#212529';
  ctx.lineWidth = Math.max(1.5, s * 0.0035);
  ctx.beginPath();
  ctx.arc(s * 0.22, s * 0.535, s * 0.02, Math.PI * 0.1, Math.PI * 0.8);
  ctx.stroke();
};

/* ---------- 🐠 Рыбка ---------- */

const clownfish: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.5;
  const cy = s * 0.48;

  // Хвост
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.17, cy);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.27, cy);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.1);
  ctx.closePath();
  paint(ctx, '#ff922b', out, LW(s, 0.006));

  // Тело
  ellipse(ctx, cx, cy, s * 0.19, s * 0.13);
  paint(ctx, '#ff922b', out, LW(s, 0.007));

  // Белые полосы
  ctx.save();
  ellipse(ctx, cx, cy, s * 0.19, s * 0.13);
  ctx.clip();
  for (const [px, pw] of [[-0.1, 0.045], [0.02, 0.05], [0.13, 0.04]] as const) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, cx + s * px, cy, s * pw, s * 0.135, 0.06);
    ctx.fill();
    ctx.strokeStyle = out;
    ctx.lineWidth = LW(s, 0.004);
    ctx.stroke();
  }
  ctx.restore();

  // Верхний плавник
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.02, cy - s * 0.125);
  ctx.quadraticCurveTo(cx + s * 0.02, cy - s * 0.2, cx + s * 0.08, cy - s * 0.12);
  ctx.closePath();
  paint(ctx, '#ff922b', out, LW(s, 0.005));

  // Нижний плавник
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.02, cy + s * 0.125);
  ctx.quadraticCurveTo(cx + s * 0.02, cy + s * 0.19, cx + s * 0.08, cy + s * 0.12);
  ctx.closePath();
  paint(ctx, '#ff922b', out, LW(s, 0.005));

  // Глаз
  eye(ctx, s, cx - s * 0.115, cy - s * 0.03, s * 0.02);
  smile(ctx, s, cx - s * 0.14, cy + s * 0.02, s * 0.018, 0.003);

  // Пузырьки
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = LW(s, 0.003);
  for (const [bx, by, br] of [[0.22, 0.28, 0.012], [0.18, 0.2, 0.009], [0.24, 0.14, 0.007]] as const) {
    circle(ctx, s * bx, s * by, s * br);
    ctx.stroke();
  }
};

/* ---------- ⛵ Кораблик ---------- */

const sailboat: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const hullTop = s * 0.66;

  // Корпус
  ctx.beginPath();
  ctx.moveTo(s * 0.28, hullTop);
  ctx.lineTo(s * 0.74, hullTop);
  ctx.lineTo(s * 0.66, s * 0.78);
  ctx.quadraticCurveTo(s * 0.51, s * 0.81, s * 0.36, s * 0.78);
  ctx.closePath();
  paint(ctx, '#d64545', out, LW(s, 0.007));
  // Полоса на корпусе
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.28, hullTop);
  ctx.lineTo(s * 0.74, hullTop);
  ctx.lineTo(s * 0.72, hullTop + s * 0.03);
  ctx.lineTo(s * 0.3, hullTop + s * 0.03);
  ctx.closePath();
  paint(ctx, '#fff', out, LW(s, 0.003));
  ctx.restore();

  // Мачта
  ctx.strokeStyle = '#8a5a33';
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.moveTo(s * 0.51, hullTop);
  ctx.lineTo(s * 0.51, s * 0.24);
  ctx.stroke();

  // Большой парус
  ctx.beginPath();
  ctx.moveTo(s * 0.53, s * 0.26);
  ctx.quadraticCurveTo(s * 0.72, s * 0.42, s * 0.53, s * 0.62);
  ctx.closePath();
  paint(ctx, '#ffffff', out, LW(s, 0.006));
  // Красная полоса на парусе
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.53, s * 0.26);
  ctx.quadraticCurveTo(s * 0.72, s * 0.42, s * 0.53, s * 0.62);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#fa5252';
  ctx.fillRect(s * 0.5, s * 0.4, s * 0.3, s * 0.05);
  ctx.restore();

  // Малый парус
  ctx.beginPath();
  ctx.moveTo(s * 0.49, s * 0.32);
  ctx.quadraticCurveTo(s * 0.36, s * 0.45, s * 0.49, s * 0.58);
  ctx.closePath();
  paint(ctx, '#74c0fc', out, LW(s, 0.006));

  // Флажок
  ctx.beginPath();
  ctx.moveTo(s * 0.51, s * 0.24);
  ctx.lineTo(s * 0.6, s * 0.28);
  ctx.lineTo(s * 0.51, s * 0.32);
  ctx.closePath();
  paint(ctx, '#fa5252', out, LW(s, 0.004));

  // Иллюминаторы
  circle(ctx, s * 0.42, s * 0.715, s * 0.014);
  paint(ctx, '#ffe066', out, LW(s, 0.003));
  circle(ctx, s * 0.5, s * 0.715, s * 0.014);
  paint(ctx, '#ffe066', out, LW(s, 0.003));
  circle(ctx, s * 0.58, s * 0.715, s * 0.014);
  paint(ctx, '#ffe066', out, LW(s, 0.003));
};

/* ---------- 🐙 Осьминог ---------- */

const octopus: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const cx = s * 0.5;
  const cy = s * 0.4;

  const skin = '#9775fa';
  const skinLight = '#d0bfff';

  // Щупальца
  ctx.save();
  ctx.strokeStyle = skin;
  ctx.lineCap = 'round';
  const arms: Array<[number, number, number]> = [
    [-0.19, 0.82, -0.05], [-0.11, 0.86, -0.02],
    [-0.03, 0.88, 0.02], [0.05, 0.86, 0.05],
    [0.13, 0.82, 0.03], [0.2, 0.76, 0.08],
  ];
  for (const [ax, ay, curl] of arms) {
    ctx.lineWidth = s * 0.035;
    ctx.strokeStyle = skin;
    ctx.beginPath();
    ctx.moveTo(cx + ax * s * 0.8, s * 0.56);
    ctx.quadraticCurveTo(cx + ax * s * 0.9, s * 0.7, cx + (ax + curl) * s * 1.1, ay * s * 0.98);
    ctx.stroke();
    ctx.strokeStyle = out;
    ctx.lineWidth = LW(s, 0.004);
    ctx.beginPath();
    ctx.moveTo(cx + ax * s * 0.8 - s * 0.017, s * 0.565);
    ctx.quadraticCurveTo(cx + ax * s * 0.9 - s * 0.017, s * 0.7, cx + (ax + curl) * s * 1.1 - s * 0.017, ay * s * 0.98);
    ctx.stroke();
  }
  ctx.restore();

  // Голова
  ellipse(ctx, cx, cy, s * 0.17, s * 0.15);
  paint(ctx, skin, out, LW(s, 0.007));

  // Пятна
  circle(ctx, cx - s * 0.09, cy - s * 0.06, s * 0.018);
  paint(ctx, skinLight, null);
  circle(ctx, cx + s * 0.07, cy - s * 0.09, s * 0.014);
  paint(ctx, skinLight, null);
  circle(ctx, cx + s * 0.11, cy + s * 0.01, s * 0.012);
  paint(ctx, skinLight, null);

  // Глаза
  eye(ctx, s, cx - s * 0.055, cy + s * 0.01, s * 0.022);
  eye(ctx, s, cx + s * 0.055, cy + s * 0.01, s * 0.022);

  // Улыбка
  smile(ctx, s, cx, cy + s * 0.05, s * 0.045, 0.005);
  // Щёчки
  ctx.fillStyle = 'rgba(255,150,180,0.5)';
  circle(ctx, cx - s * 0.1, cy + s * 0.05, s * 0.02);
  ctx.fill();
  circle(ctx, cx + s * 0.1, cy + s * 0.05, s * 0.02);
  ctx.fill();
};

export const SCENE_SUBJECTS_2: Record<string, SubjectPainter> = {
  'planet-earth': planetEarth,
  volcano: volcano,
  mountains: mountains,
  bear: bear,
  bunny: bunny,
  cat: cat,
  diplodocus: diplodocus,
  trex: trex,
  triceratops: triceratops,
  clownfish: clownfish,
  sailboat: sailboat,
  octopus: octopus,
};
