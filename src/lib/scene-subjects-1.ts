/* ============================================================
   ВЕКТОРНЫЕ ИЛЛЮСТРАЦИИ — ЧАСТЬ 1
   Транспорт, стройка и космос.
   Каждая сцена рисуется путями (paths) с контурами:
   картинка видна всегда, без внешних файлов и эмодзи.
   ============================================================ */

import type { PuzzlePalette } from './puzzle-data';
import type { Ctx2D } from './scene-painter';
import { circle, ellipse, fillRoundRect, paint, groundShadow } from './scene-painter';

export type SubjectPainter = (ctx: Ctx2D, s: number, pal: PuzzlePalette, seed: number) => void;

const LINE = (pal: PuzzlePalette) => pal.outline;
const LW = (s: number, k = 0.006) => Math.max(1.5, s * k);

/* Трафарет «колесо со спицами» */
function wheel(ctx: Ctx2D, s: number, x: number, y: number, r: number, rim: string, hub: string, outline: string): void {
  ctx.save();
  circle(ctx, x, y, r);
  paint(ctx, rim, outline, LW(s, 0.005));
  circle(ctx, x, y, r * 0.45);
  paint(ctx, hub, outline, LW(s, 0.004));
  ctx.strokeStyle = outline;
  ctx.lineWidth = LW(s, 0.0035);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.lineTo(x - Math.cos(a) * r * 0.9, y - Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/* Трафарет «окно с рамой» */
function windowPane(ctx: Ctx2D, s: number, x: number, y: number, w: number, h: number, frame: string, glass: string, outline: string): void {
  ctx.save();
  fillRoundRect(ctx, x, y, w, h, s * 0.008);
  paint(ctx, glass, outline, LW(s, 0.004));
  ctx.strokeStyle = frame;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

/* Трафарет «клуб дыма» */
function smokePuff(ctx: Ctx2D, s: number, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  circle(ctx, x, y, r);
  ctx.fill();
  circle(ctx, x + r * 0.7, y - r * 0.35, r * 0.8);
  ctx.fill();
  circle(ctx, x - r * 0.7, y - r * 0.2, r * 0.7);
  ctx.fill();
  ctx.restore();
}

/* ---------- 🚂 Паровозик ---------- */

const steamLocomotive: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const railY = s * 0.84;
  groundShadow(ctx, s * 0.5, railY + s * 0.035, s * 0.34);

  // Кузов
  ctx.save();
  fillRoundRect(ctx, s * 0.18, s * 0.5, s * 0.34, s * 0.24, s * 0.02);
  paint(ctx, '#3f9e5f', out, LW(s, 0.007));
  // Полосы на котле
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.2, s * 0.56);
  ctx.lineTo(s * 0.5, s * 0.56);
  ctx.stroke();
  ctx.restore();

  // Кабина
  fillRoundRect(ctx, s * 0.5, s * 0.38, s * 0.2, s * 0.36, s * 0.02);
  paint(ctx, '#2e8b57', out, LW(s, 0.007));
  windowPane(ctx, s, s * 0.55, s * 0.44, s * 0.1, s * 0.1, '#ffd43b', '#bde0fe', out);

  // Труба
  ctx.beginPath();
  ctx.moveTo(s * 0.27, s * 0.5);
  ctx.lineTo(s * 0.3, s * 0.36);
  ctx.lineTo(s * 0.38, s * 0.36);
  ctx.lineTo(s * 0.41, s * 0.5);
  ctx.closePath();
  paint(ctx, '#d64545', out, LW(s, 0.006));
  fillRoundRect(ctx, s * 0.26, s * 0.34, s * 0.16, s * 0.05, s * 0.01);
  paint(ctx, '#c03030', out, LW(s, 0.005));

  // Дым
  smokePuff(ctx, s, s * 0.36, s * 0.26, s * 0.045);
  smokePuff(ctx, s, s * 0.3, s * 0.17, s * 0.055);
  smokePuff(ctx, s, s * 0.24, s * 0.09, s * 0.06);

  // Колёса
  wheel(ctx, s, s * 0.26, s * 0.77, s * 0.055, '#d64545', '#ffd43b', out);
  wheel(ctx, s, s * 0.42, s * 0.77, s * 0.055, '#d64545', '#ffd43b', out);
  wheel(ctx, s, s * 0.62, s * 0.77, s * 0.055, '#d64545', '#ffd43b', out);

  // Сцепка и фара
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.006);
  ctx.beginPath();
  ctx.moveTo(s * 0.7, s * 0.72);
  ctx.lineTo(s * 0.76, s * 0.72);
  ctx.stroke();
  circle(ctx, s * 0.2, s * 0.6, s * 0.022);
  paint(ctx, '#ffd43b', out, LW(s, 0.004));
};

/* ---------- 🚄 Скоростной поезд ---------- */

const speedTrain: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const railY = s * 0.84;
  groundShadow(ctx, s * 0.5, railY + s * 0.035, s * 0.4);

  // Линии движения
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = LW(s, 0.006);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const y = s * (0.52 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(s * 0.02, y);
    ctx.lineTo(s * 0.12 - i * s * 0.02, y);
    ctx.stroke();
  }
  ctx.restore();

  // Обтекаемый корпус
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.7);
  ctx.quadraticCurveTo(s * 0.16, s * 0.52, s * 0.34, s * 0.5);
  ctx.lineTo(s * 0.66, s * 0.5);
  ctx.quadraticCurveTo(s * 0.86, s * 0.5, s * 0.9, s * 0.62);
  ctx.quadraticCurveTo(s * 0.92, s * 0.68, s * 0.88, s * 0.7);
  ctx.closePath();
  paint(ctx, '#f8f9fa', out, LW(s, 0.007));
  ctx.restore();

  // Синяя полоса
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.17, s * 0.64);
  ctx.lineTo(s * 0.88, s * 0.64);
  ctx.lineTo(s * 0.88, s * 0.7);
  ctx.lineTo(s * 0.16, s * 0.7);
  ctx.closePath();
  paint(ctx, '#1c7ed6', out, LW(s, 0.004));
  ctx.restore();

  // Окна
  for (let i = 0; i < 4; i++) {
    fillRoundRect(ctx, s * (0.24 + i * 0.12), s * 0.53, s * 0.08, s * 0.07, s * 0.012);
    paint(ctx, '#a5d8ff', out, LW(s, 0.003));
  }
  // Лобовое стекло
  ctx.beginPath();
  ctx.moveTo(s * 0.76, s * 0.52);
  ctx.quadraticCurveTo(s * 0.84, s * 0.53, s * 0.87, s * 0.6);
  ctx.lineTo(s * 0.76, s * 0.6);
  ctx.closePath();
  paint(ctx, '#a5d8ff', out, LW(s, 0.003));

  // Фара
  circle(ctx, s * 0.89, s * 0.66, s * 0.018);
  paint(ctx, '#ffd43b', out, LW(s, 0.003));

  // Юбка-пантограф снизу
  ctx.fillStyle = '#495057';
  fillRoundRect(ctx, s * 0.2, s * 0.75, s * 0.66, s * 0.045, s * 0.015);
  paint(ctx, '#495057', out, LW(s, 0.004));
};

/* ---------- 🚃 Грузовой поезд ---------- */

const cargoTrain: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const railY = s * 0.84;
  groundShadow(ctx, s * 0.5, railY + s * 0.035, s * 0.44);

  // Локомотив
  fillRoundRect(ctx, s * 0.06, s * 0.48, s * 0.22, s * 0.26, s * 0.015);
  paint(ctx, '#49607a', out, LW(s, 0.007));
  fillRoundRect(ctx, s * 0.06, s * 0.4, s * 0.12, s * 0.1, s * 0.01);
  paint(ctx, '#3b4d63', out, LW(s, 0.006));
  ctx.beginPath();
  ctx.moveTo(s * 0.09, s * 0.4);
  ctx.lineTo(s * 0.12, s * 0.31);
  ctx.lineTo(s * 0.18, s * 0.31);
  ctx.lineTo(s * 0.21, s * 0.4);
  ctx.closePath();
  paint(ctx, '#2f3e50', out, LW(s, 0.005));
  smokePuff(ctx, s, s * 0.15, s * 0.24, s * 0.04);
  smokePuff(ctx, s, s * 0.1, s * 0.16, s * 0.05);

  // Вагон 1 с брёвнами
  fillRoundRect(ctx, s * 0.33, s * 0.52, s * 0.26, s * 0.22, s * 0.01);
  paint(ctx, '#b0653a', out, LW(s, 0.006));
  for (let i = 0; i < 3; i++) {
    circle(ctx, s * (0.37 + i * 0.09), s * 0.49, s * 0.035);
    paint(ctx, '#8a5a33', out, LW(s, 0.004));
  }
  // Вагон 2 с ящиками
  fillRoundRect(ctx, s * 0.64, s * 0.52, s * 0.26, s * 0.22, s * 0.01);
  paint(ctx, '#c07a3e', out, LW(s, 0.006));
  fillRoundRect(ctx, s * 0.67, s * 0.44, s * 0.09, s * 0.08, s * 0.005);
  paint(ctx, '#d9a05b', out, LW(s, 0.004));
  fillRoundRect(ctx, s * 0.78, s * 0.44, s * 0.09, s * 0.08, s * 0.005);
  paint(ctx, '#d9a05b', out, LW(s, 0.004));

  // Сцепки
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.28, s * 0.7); ctx.lineTo(s * 0.33, s * 0.7);
  ctx.moveTo(s * 0.59, s * 0.7); ctx.lineTo(s * 0.64, s * 0.7);
  ctx.stroke();

  // Колёса
  for (const wx of [0.11, 0.19, 0.38, 0.5, 0.69, 0.81]) {
    wheel(ctx, s, s * wx, s * 0.78, s * 0.04, '#343a40', '#adb5bd', out);
  }
};

/* ---------- 🏠 Стройка дома ---------- */

const houseBuild: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.5, s * 0.84, s * 0.3);

  // Стены из кирпичей
  ctx.save();
  fillRoundRect(ctx, s * 0.3, s * 0.44, s * 0.4, s * 0.36, s * 0.008);
  paint(ctx, '#e8965a', out, LW(s, 0.007));
  ctx.strokeStyle = 'rgba(120,60,30,0.4)';
  ctx.lineWidth = LW(s, 0.003);
  for (let row = 1; row < 5; row++) {
    const y = s * (0.44 + row * 0.072);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, y);
    ctx.lineTo(s * 0.7, y);
    ctx.stroke();
    const shift = row % 2 === 0 ? 0 : s * 0.05;
    for (let bx = 0.375; bx < 0.7; bx += 0.1) {
      ctx.beginPath();
      ctx.moveTo(s * (bx + shift / s), y - s * 0.072);
      ctx.lineTo(s * (bx + shift / s), y);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Крыша
  ctx.beginPath();
  ctx.moveTo(s * 0.26, s * 0.44);
  ctx.lineTo(s * 0.5, s * 0.26);
  ctx.lineTo(s * 0.74, s * 0.44);
  ctx.closePath();
  paint(ctx, '#c92a2a', out, LW(s, 0.007));
  // Труба
  fillRoundRect(ctx, s * 0.6, s * 0.28, s * 0.06, s * 0.1, s * 0.005);
  paint(ctx, '#a65427', out, LW(s, 0.005));

  // Окно и дверь
  windowPane(ctx, s, s * 0.36, s * 0.52, s * 0.11, s * 0.11, '#fff4e0', '#bde0fe', out);
  fillRoundRect(ctx, s * 0.55, s * 0.6, s * 0.1, s * 0.2, s * 0.03);
  paint(ctx, '#8a5a33', out, LW(s, 0.005));
  circle(ctx, s * 0.63, s * 0.71, s * 0.008);
  paint(ctx, '#ffd43b', null);

  // Кусты и ведро
  circle(ctx, s * 0.24, s * 0.82, s * 0.045);
  paint(ctx, '#3fae63', out, LW(s, 0.004));
  circle(ctx, s * 0.29, s * 0.83, s * 0.038);
  paint(ctx, '#57c15c', out, LW(s, 0.004));
  ctx.beginPath();
  ctx.moveTo(s * 0.78, s * 0.78);
  ctx.lineTo(s * 0.84, s * 0.78);
  ctx.lineTo(s * 0.83, s * 0.84);
  ctx.lineTo(s * 0.79, s * 0.84);
  ctx.closePath();
  paint(ctx, '#495057', out, LW(s, 0.004));
};

/* ---------- 🚜 Экскаватор ---------- */

const excavator: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  groundShadow(ctx, s * 0.52, s * 0.86, s * 0.36);

  // Гусеницы
  fillRoundRect(ctx, s * 0.22, s * 0.74, s * 0.34, s * 0.1, s * 0.05);
  paint(ctx, '#495057', out, LW(s, 0.006));
  for (const wx of [0.28, 0.39, 0.5]) {
    circle(ctx, s * wx, s * 0.79, s * 0.028);
    paint(ctx, '#6c757d', out, LW(s, 0.003));
  }

  // Кабина и корпус
  fillRoundRect(ctx, s * 0.24, s * 0.56, s * 0.3, s * 0.18, s * 0.02);
  paint(ctx, '#fcc419', out, LW(s, 0.006));
  fillRoundRect(ctx, s * 0.42, s * 0.44, s * 0.14, s * 0.14, s * 0.015);
  paint(ctx, '#fab005', out, LW(s, 0.005));
  windowPane(ctx, s, s * 0.445, s * 0.465, s * 0.09, s * 0.08, '#e9ecef', '#a5d8ff', out);

  // Стрела
  ctx.save();
  ctx.strokeStyle = '#fab005';
  ctx.lineWidth = s * 0.028;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.54, s * 0.5);
  ctx.lineTo(s * 0.72, s * 0.34);
  ctx.stroke();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.54, s * 0.5);
  ctx.lineTo(s * 0.72, s * 0.34);
  ctx.stroke();
  ctx.restore();

  // Ковш
  ctx.beginPath();
  ctx.moveTo(s * 0.72, s * 0.34);
  ctx.lineTo(s * 0.8, s * 0.52);
  ctx.lineTo(s * 0.86, s * 0.62);
  ctx.quadraticCurveTo(s * 0.78, s * 0.68, s * 0.74, s * 0.6);
  ctx.closePath();
  paint(ctx, '#fd7e14', out, LW(s, 0.006));
  // Зубья
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.74, s * 0.6);
  ctx.lineTo(s * 0.755, s * 0.65);
  ctx.moveTo(s * 0.79, s * 0.635);
  ctx.lineTo(s * 0.8, s * 0.675);
  ctx.stroke();

  // Гидроцилиндр
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(s * 0.46, s * 0.52);
  ctx.lineTo(s * 0.66, s * 0.42);
  ctx.stroke();

  // Куча земли
  ctx.beginPath();
  ctx.moveTo(s * 0.72, s * 0.84);
  ctx.quadraticCurveTo(s * 0.85, s * 0.7, s * 0.98, s * 0.84);
  ctx.closePath();
  paint(ctx, '#b08954', out, LW(s, 0.005));
};

/* ---------- 🏗️ Кран и блоки ---------- */

const craneBlocks: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);

  // Башня
  fillRoundRect(ctx, s * 0.3, s * 0.2, s * 0.07, s * 0.6, s * 0.008);
  paint(ctx, '#f76707', out, LW(s, 0.006));
  // Решётка башни
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = LW(s, 0.003);
  for (let y = 0.24; y < 0.78; y += 0.06) {
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * y);
    ctx.lineTo(s * 0.37, s * (y + 0.03));
    ctx.moveTo(s * 0.37, s * y);
    ctx.lineTo(s * 0.3, s * (y + 0.03));
    ctx.stroke();
  }

  // Стрела
  fillRoundRect(ctx, s * 0.16, s * 0.16, s * 0.62, s * 0.05, s * 0.008);
  paint(ctx, '#f76707', out, LW(s, 0.006));
  // Противовес
  fillRoundRect(ctx, s * 0.16, s * 0.21, s * 0.09, s * 0.08, s * 0.005);
  paint(ctx, '#495057', out, LW(s, 0.005));
  // Кабина крана
  fillRoundRect(ctx, s * 0.37, s * 0.21, s * 0.07, s * 0.07, s * 0.008);
  paint(ctx, '#ffd43b', out, LW(s, 0.004));

  // Тросы и крюк
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.66, s * 0.21);
  ctx.lineTo(s * 0.66, s * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.66, s * 0.45, s * 0.02, Math.PI * 0.2, Math.PI * 1.3);
  ctx.stroke();

  // Блок на тросу
  fillRoundRect(ctx, s * 0.615, s * 0.48, s * 0.09, s * 0.09, s * 0.005);
  paint(ctx, '#4dabf7', out, LW(s, 0.005));

  // Штабель блоков на земле
  const blocks: Array<[number, number, string]> = [
    [0.74, 0.74, '#4dabf7'], [0.83, 0.74, '#69db7c'],
    [0.785, 0.66, '#ffa8a8'], [0.785, 0.58, '#ffd43b'],
  ];
  for (const [bx, by, col] of blocks) {
    fillRoundRect(ctx, s * bx, s * by, s * 0.09, s * 0.08, s * 0.005);
    paint(ctx, col, out, LW(s, 0.005));
  }

  groundShadow(ctx, s * 0.55, s * 0.845, s * 0.42);
};

/* ---------- 🚀 Ракета ---------- */

const rocket: SubjectPainter = (ctx, s, pal) => {
  const out = 'rgba(255,255,255,0.65)';
  const cx = s * 0.5;

  // Корпус
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, s * 0.72);
  ctx.quadraticCurveTo(cx - s * 0.1, s * 0.45, cx - s * 0.055, s * 0.32);
  ctx.quadraticCurveTo(cx, s * 0.2, cx + s * 0.055, s * 0.32);
  ctx.quadraticCurveTo(cx + s * 0.1, s * 0.45, cx + s * 0.09, s * 0.72);
  ctx.closePath();
  paint(ctx, '#f1f3f5', out, LW(s, 0.007));
  ctx.restore();

  // Нос
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.055, s * 0.32);
  ctx.quadraticCurveTo(cx, s * 0.2, cx + s * 0.055, s * 0.32);
  ctx.quadraticCurveTo(cx, s * 0.36, cx - s * 0.055, s * 0.32);
  ctx.closePath();
  paint(ctx, '#fa5252', out, LW(s, 0.006));

  // Иллюминатор
  circle(ctx, cx, s * 0.45, s * 0.045);
  paint(ctx, '#74c0fc', out, LW(s, 0.006));
  circle(ctx, cx - s * 0.015, s * 0.435, s * 0.014);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();

  // Стабилизаторы
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.085, s * 0.58);
  ctx.lineTo(cx - s * 0.17, s * 0.76);
  ctx.lineTo(cx - s * 0.085, s * 0.72);
  ctx.closePath();
  paint(ctx, '#fa5252', out, LW(s, 0.006));
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.085, s * 0.58);
  ctx.lineTo(cx + s * 0.17, s * 0.76);
  ctx.lineTo(cx + s * 0.085, s * 0.72);
  ctx.closePath();
  paint(ctx, '#fa5252', out, LW(s, 0.006));

  // Сопло
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.06, s * 0.72);
  ctx.lineTo(cx + s * 0.06, s * 0.72);
  ctx.lineTo(cx + s * 0.075, s * 0.77);
  ctx.lineTo(cx - s * 0.075, s * 0.77);
  ctx.closePath();
  paint(ctx, '#495057', out, LW(s, 0.006));

  // Пламя
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.05, s * 0.78);
  ctx.quadraticCurveTo(cx, s * 0.95, cx + s * 0.05, s * 0.78);
  ctx.closePath();
  paint(ctx, '#ff922b', null);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.028, s * 0.78);
  ctx.quadraticCurveTo(cx, s * 0.89, cx + s * 0.028, s * 0.78);
  ctx.closePath();
  paint(ctx, '#ffe066', null);
};

/* ---------- 🪐 Планеты ---------- */

const saturnPlanets: SubjectPainter = (ctx, s, pal) => {
  const out = 'rgba(255,255,255,0.55)';

  // Сатурн
  const sx = s * 0.44;
  const sy = s * 0.48;
  const sr = s * 0.17;
  // Кольца (задняя часть)
  ctx.save();
  ctx.rotate(-0.35);
  ctx.translate(sx, sy);
  ctx.strokeStyle = '#e3b97a';
  ctx.lineWidth = s * 0.05;
  ellipse(ctx, 0, 0, sr * 1.7, sr * 0.5);
  ctx.stroke();
  ctx.restore();
  // Шар
  ctx.save();
  const g = ctx.createRadialGradient(sx - sr * 0.4, sy - sr * 0.4, sr * 0.2, sx, sy, sr);
  g.addColorStop(0, '#ffe8b6');
  g.addColorStop(1, '#e8a94e');
  ctx.fillStyle = g;
  circle(ctx, sx, sy, sr);
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.006);
  ctx.stroke();
  // Полосы
  ctx.save();
  circle(ctx, sx, sy, sr);
  ctx.clip();
  ctx.strokeStyle = 'rgba(200,140,60,0.5)';
  ctx.lineWidth = s * 0.018;
  ctx.beginPath();
  ctx.moveTo(sx - sr, sy - sr * 0.3);
  ctx.lineTo(sx + sr, sy - sr * 0.3);
  ctx.moveTo(sx - sr, sy + sr * 0.25);
  ctx.lineTo(sx + sr, sy + sr * 0.25);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Кольца (передняя часть)
  ctx.save();
  ctx.rotate(-0.35);
  ctx.translate(sx, sy);
  ctx.strokeStyle = '#f3c98a';
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  ctx.ellipse(0, 0, sr * 1.55, sr * 0.42, 0, Math.PI * 0.02, Math.PI * 0.98);
  ctx.stroke();
  ctx.restore();

  // Марс
  circle(ctx, s * 0.8, s * 0.24, s * 0.07);
  paint(ctx, '#e8590c', out, LW(s, 0.005));
  circle(ctx, s * 0.77, s * 0.22, s * 0.018);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // Маленькая голубая планета
  circle(ctx, s * 0.82, s * 0.74, s * 0.05);
  paint(ctx, '#4dabf7', out, LW(s, 0.004));
  ctx.fillStyle = '#69db7c';
  ellipse(ctx, s * 0.8, s * 0.73, s * 0.02, s * 0.012, 0.5);
  ctx.fill();
  ellipse(ctx, s * 0.85, s * 0.76, s * 0.016, s * 0.009, -0.4);
  ctx.fill();

  // Комета
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = LW(s, 0.004);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.18);
  ctx.lineTo(s * 0.26, s * 0.26);
  ctx.stroke();
  circle(ctx, s * 0.27, s * 0.265, s * 0.014);
  paint(ctx, '#fff3bf', null);
};

/* ---------- 🛰️ Луноход ---------- */

const moonRover: SubjectPainter = (ctx, s, pal) => {
  const out = 'rgba(30,30,60,0.6)';
  groundShadow(ctx, s * 0.5, s * 0.82, s * 0.26, 'rgba(40,40,60,0.3)');

  // Рама
  fillRoundRect(ctx, s * 0.3, s * 0.6, s * 0.36, s * 0.12, s * 0.02);
  paint(ctx, '#b9a7e8', out, LW(s, 0.006));

  // Солнечная панель
  fillRoundRect(ctx, s * 0.26, s * 0.5, s * 0.42, s * 0.09, s * 0.008);
  paint(ctx, '#3b5bdb', out, LW(s, 0.006));
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = LW(s, 0.003);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.26 + i * 0.105), s * 0.5);
    ctx.lineTo(s * (0.26 + i * 0.105), s * 0.59);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(s * 0.26, s * 0.545);
  ctx.lineTo(s * 0.68, s * 0.545);
  ctx.stroke();

  // Антенна-тарелка
  ctx.save();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.42, s * 0.5);
  ctx.lineTo(s * 0.42, s * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#e9ecef';
  ellipse(ctx, s * 0.42, s * 0.37, s * 0.055, s * 0.02, -0.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Камера
  fillRoundRect(ctx, s * 0.55, s * 0.52, s * 0.07, s * 0.06, s * 0.006);
  paint(ctx, '#495057', out, LW(s, 0.004));
  circle(ctx, s * 0.585, s * 0.55, s * 0.014);
  paint(ctx, '#74c0fc', out, LW(s, 0.003));

  // Колёса
  const wheelsX = [0.32, 0.48, 0.64];
  for (const wx of wheelsX) {
    circle(ctx, s * wx, s * 0.75, s * 0.055);
    paint(ctx, '#6c757d', out, LW(s, 0.005));
    circle(ctx, s * wx, s * 0.75, s * 0.02);
    paint(ctx, '#adb5bd', out, LW(s, 0.003));
    // Протектор
    ctx.strokeStyle = out;
    ctx.lineWidth = LW(s, 0.003);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(s * wx + Math.cos(a) * s * 0.03, s * 0.75 + Math.sin(a) * s * 0.03);
      ctx.lineTo(s * wx + Math.cos(a) * s * 0.05, s * 0.75 + Math.sin(a) * s * 0.05);
      ctx.stroke();
    }
  }

  // Флажок
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.72, s * 0.72);
  ctx.lineTo(s * 0.72, s * 0.58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.72, s * 0.58);
  ctx.lineTo(s * 0.8, s * 0.615);
  ctx.lineTo(s * 0.72, s * 0.65);
  ctx.closePath();
  paint(ctx, '#fa5252', out, LW(s, 0.004));
};

export const SCENE_SUBJECTS_1: Record<string, SubjectPainter> = {
  'steam-locomotive': steamLocomotive,
  'speed-train': speedTrain,
  'cargo-train': cargoTrain,
  'house-build': houseBuild,
  excavator: excavator,
  'crane-blocks': craneBlocks,
  rocket: rocket,
  'saturn-planets': saturnPlanets,
  'moon-rover': moonRover,
};
