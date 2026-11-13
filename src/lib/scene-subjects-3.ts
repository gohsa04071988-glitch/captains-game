/* ============================================================
   ВЕКТОРНЫЕ ИЛЛЮСТРАЦИИ — ЧАСТЬ 3
   Гоночные машины: формула, ралли-джип, картинг.
   Каждая сцена рисуется путями (paths) с контурами:
   картинка видна всегда, без внешних файлов и эмодзи.
   ============================================================ */

import type { PuzzlePalette } from './puzzle-data';
import type { Ctx2D } from './scene-painter';
import { circle, ellipse, fillRoundRect, paint, groundShadow } from './scene-painter';

export type SubjectPainter = (ctx: Ctx2D, s: number, pal: PuzzlePalette, seed: number) => void;

const LINE = (pal: PuzzlePalette) => pal.outline;
const LW = (s: number, k = 0.006) => Math.max(1.5, s * k);

/* Трафарет «гоночное колесо»: тёмная резина, цветной диск */
function raceWheel(ctx: Ctx2D, s: number, x: number, y: number, r: number, rim: string, outline: string): void {
  ctx.save();
  circle(ctx, x, y, r);
  paint(ctx, '#2b2f36', outline, LW(s, 0.005));
  circle(ctx, x, y, r * 0.52);
  paint(ctx, rim, outline, LW(s, 0.004));
  circle(ctx, x, y, r * 0.18);
  paint(ctx, '#f1f3f5', outline, LW(s, 0.003));
  // Болтики на диске
  ctx.fillStyle = outline;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.6;
    circle(ctx, x + Math.cos(a) * r * 0.33, y + Math.sin(a) * r * 0.33, r * 0.055);
    ctx.fill();
  }
  ctx.restore();
}

/* Трафарет «шлем пилота» */
function helmet(ctx: Ctx2D, s: number, x: number, y: number, r: number, col: string, outline: string): void {
  ctx.save();
  circle(ctx, x, y, r);
  paint(ctx, col, outline, LW(s, 0.004));
  // Козырёк-визор
  ctx.beginPath();
  ctx.moveTo(x + r * 0.1, y - r * 0.42);
  ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.38, x + r * 0.92, y + r * 0.12);
  ctx.quadraticCurveTo(x + r * 0.5, y + r * 0.3, x + r * 0.1, y + r * 0.2);
  ctx.closePath();
  paint(ctx, '#74c0fc', outline, LW(s, 0.003));
  // Блик на визоре
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = LW(s, 0.0028);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.35, y - r * 0.22);
  ctx.lineTo(x + r * 0.62, y - r * 0.05);
  ctx.stroke();
  // Полоска сверху
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, Math.PI * 1.15, Math.PI * 1.75);
  ctx.stroke();
  ctx.restore();
}

/* Трафарет «пыльный клуб» (для ралли) */
function dustPuff(ctx: Ctx2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(196,154,108,0.75)';
  circle(ctx, x, y, r);
  ctx.fill();
  circle(ctx, x + r * 0.75, y - r * 0.3, r * 0.72);
  ctx.fill();
  circle(ctx, x - r * 0.72, y - r * 0.18, r * 0.62);
  ctx.fill();
  ctx.restore();
}

/* Трафарет «линии скорости» позади машины */
function speedLines(ctx: Ctx2D, s: number, y: number, len: number, count = 3): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = LW(s, 0.006);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const yy = y + i * s * 0.045;
    ctx.beginPath();
    ctx.moveTo(s * 0.02, yy);
    ctx.lineTo(s * 0.02 + len - i * s * 0.02, yy);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- 🏎️ Формула-1 ---------- */

const formulaCar: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const roadY = s * 0.82;
  speedLines(ctx, s, s * 0.44, s * 0.14);
  groundShadow(ctx, s * 0.5, roadY + s * 0.03, s * 0.38);

  // Заднее антикрыло
  ctx.save();
  fillRoundRect(ctx, s * 0.14, s * 0.4, s * 0.16, s * 0.045, s * 0.008);
  paint(ctx, '#1c2b4a', out, LW(s, 0.005));
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.005);
  ctx.beginPath();
  ctx.moveTo(s * 0.19, s * 0.445);
  ctx.lineTo(s * 0.19, s * 0.62);
  ctx.moveTo(s * 0.26, s * 0.445);
  ctx.lineTo(s * 0.26, s * 0.62);
  ctx.stroke();
  ctx.restore();

  // Корпус: низкий клин от носа к мотору
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.88, s * 0.66);          // нос
  ctx.quadraticCurveTo(s * 0.72, s * 0.6, s * 0.58, s * 0.6);
  ctx.lineTo(s * 0.56, s * 0.52);          // стойка к воздухозаборнику
  ctx.quadraticCurveTo(s * 0.52, s * 0.47, s * 0.44, s * 0.5);
  ctx.quadraticCurveTo(s * 0.3, s * 0.54, s * 0.22, s * 0.62); // спина к крылу
  ctx.lineTo(s * 0.16, s * 0.68);
  ctx.lineTo(s * 0.2, s * 0.72);
  ctx.lineTo(s * 0.84, s * 0.72);          // днище
  ctx.closePath();
  paint(ctx, '#e03131', out, LW(s, 0.007));
  ctx.restore();

  // Белая полоса вдоль корпуса
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.86, s * 0.685);
  ctx.lineTo(s * 0.2, s * 0.685);
  ctx.lineTo(s * 0.2, s * 0.72);
  ctx.lineTo(s * 0.84, s * 0.72);
  ctx.closePath();
  paint(ctx, '#ffffff', out, LW(s, 0.004));
  ctx.restore();

  // Воздухозаборник над пилотом
  ctx.beginPath();
  ctx.moveTo(s * 0.44, s * 0.5);
  ctx.lineTo(s * 0.56, s * 0.52);
  ctx.lineTo(s * 0.54, s * 0.58);
  ctx.lineTo(s * 0.46, s * 0.56);
  ctx.closePath();
  paint(ctx, '#1c2b4a', out, LW(s, 0.004));

  // Шлем пилота в кокпите
  helmet(ctx, s, s * 0.41, s * 0.53, s * 0.05, '#ffd43b', out);

  // Переднее антикрыло
  fillRoundRect(ctx, s * 0.8, s * 0.72, s * 0.17, s * 0.035, s * 0.006);
  paint(ctx, '#1c2b4a', out, LW(s, 0.004));
  // Нос-конус
  ctx.beginPath();
  ctx.moveTo(s * 0.84, s * 0.66);
  ctx.quadraticCurveTo(s * 0.92, s * 0.64, s * 0.94, s * 0.7);
  ctx.lineTo(s * 0.84, s * 0.72);
  ctx.closePath();
  paint(ctx, '#e03131', out, LW(s, 0.004));

  // Белый круг с номером
  circle(ctx, s * 0.63, s * 0.645, s * 0.038);
  paint(ctx, '#ffffff', out, LW(s, 0.004));
  circle(ctx, s * 0.63, s * 0.645, s * 0.021);
  paint(ctx, '#e03131', null);

  // Колёса: заднее больше
  raceWheel(ctx, s, s * 0.3, s * 0.74, s * 0.075, '#1c2b4a', out);
  raceWheel(ctx, s, s * 0.76, s * 0.75, s * 0.06, '#1c2b4a', out);

  // Искра из выхлопа
  ctx.save();
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.17, s * 0.7);
  ctx.lineTo(s * 0.1, s * 0.73);
  ctx.moveTo(s * 0.15, s * 0.68);
  ctx.lineTo(s * 0.09, s * 0.69);
  ctx.stroke();
  ctx.restore();
};

/* ---------- 🚙 Ралли-джип ---------- */

const rallyCar: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const roadY = s * 0.84;
  groundShadow(ctx, s * 0.5, roadY + s * 0.035, s * 0.4);

  // Пыль из-под колёс
  dustPuff(ctx, s * 0.1, s * 0.76, s * 0.05);
  dustPuff(ctx, s * 0.05, s * 0.82, s * 0.065);

  // Кузов-хэтчбек
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.72);               // задний бампер
  ctx.lineTo(s * 0.16, s * 0.58);
  ctx.quadraticCurveTo(s * 0.17, s * 0.52, s * 0.24, s * 0.5); // задняя стойка
  ctx.lineTo(s * 0.3, s * 0.38);                // крыша сзади
  ctx.lineTo(s * 0.56, s * 0.36);               // крыша спереди
  ctx.quadraticCurveTo(s * 0.64, s * 0.37, s * 0.68, s * 0.46); // лобовое
  ctx.lineTo(s * 0.8, s * 0.5);                 // капот
  ctx.quadraticCurveTo(s * 0.86, s * 0.53, s * 0.86, s * 0.6);
  ctx.lineTo(s * 0.86, s * 0.72);               // передний бампер
  ctx.closePath();
  paint(ctx, '#1971c2', out, LW(s, 0.007));
  ctx.restore();

  // Наклейка-молния на боку
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.34, s * 0.62);
  ctx.lineTo(s * 0.44, s * 0.62);
  ctx.lineTo(s * 0.39, s * 0.68);
  ctx.lineTo(s * 0.47, s * 0.68);
  ctx.lineTo(s * 0.33, s * 0.78);
  ctx.lineTo(s * 0.38, s * 0.69);
  ctx.lineTo(s * 0.31, s * 0.69);
  ctx.closePath();
  paint(ctx, '#ffd43b', out, LW(s, 0.003));
  ctx.restore();

  // Окна
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.31, s * 0.395);
  ctx.lineTo(s * 0.545, s * 0.38);
  ctx.lineTo(s * 0.615, s * 0.465);
  ctx.lineTo(s * 0.29, s * 0.49);
  ctx.closePath();
  paint(ctx, '#a5d8ff', out, LW(s, 0.004));
  // Стойка двери
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.44, s * 0.388);
  ctx.lineTo(s * 0.45, s * 0.487);
  ctx.stroke();
  ctx.restore();

  // Люстра на крыше
  ctx.save();
  fillRoundRect(ctx, s * 0.32, s * 0.33, s * 0.2, s * 0.03, s * 0.006);
  paint(ctx, '#343a40', out, LW(s, 0.003));
  for (let i = 0; i < 3; i++) {
    fillRoundRect(ctx, s * (0.335 + i * 0.062), s * 0.3, s * 0.045, s * 0.032, s * 0.005);
    paint(ctx, '#ffe066', out, LW(s, 0.003));
  }
  ctx.restore();

  // Запаска на задней двери
  circle(ctx, s * 0.21, s * 0.6, s * 0.045);
  paint(ctx, '#495057', out, LW(s, 0.004));
  circle(ctx, s * 0.21, s * 0.6, s * 0.02);
  paint(ctx, '#ced4da', out, LW(s, 0.003));

  // Фары и стоп-сигнал
  fillRoundRect(ctx, s * 0.82, s * 0.55, s * 0.045, s * 0.028, s * 0.005);
  paint(ctx, '#ffe066', out, LW(s, 0.003));
  fillRoundRect(ctx, s * 0.155, s * 0.6, s * 0.02, s * 0.03, s * 0.004);
  paint(ctx, '#fa5252', out, LW(s, 0.003));

  // Брызги грязи на арках
  ctx.save();
  ctx.fillStyle = 'rgba(140,100,66,0.8)';
  ellipse(ctx, s * 0.32, s * 0.74, s * 0.045, s * 0.022);
  ctx.fill();
  ellipse(ctx, s * 0.72, s * 0.74, s * 0.05, s * 0.022);
  ctx.fill();
  ctx.restore();

  // Колёса с грязью
  raceWheel(ctx, s, s * 0.32, s * 0.75, s * 0.07, '#fa5252', out);
  raceWheel(ctx, s, s * 0.72, s * 0.75, s * 0.07, '#fa5252', out);
};

/* ---------- 🏁 Картинг ---------- */

const kart: SubjectPainter = (ctx, s, pal) => {
  const out = LINE(pal);
  const roadY = s * 0.82;
  groundShadow(ctx, s * 0.5, roadY + s * 0.03, s * 0.32);
  speedLines(ctx, s, s * 0.6, s * 0.1);

  // Труба шасси
  ctx.save();
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = LW(s, 0.014);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.24, s * 0.7);
  ctx.lineTo(s * 0.78, s * 0.7);
  ctx.stroke();
  ctx.restore();

  // Задний бампер с шариками защиты
  fillRoundRect(ctx, s * 0.14, s * 0.62, s * 0.05, s * 0.12, s * 0.01);
  paint(ctx, '#ffd43b', out, LW(s, 0.005));
  ctx.beginPath();
  ctx.moveTo(s * 0.19, s * 0.66);
  ctx.lineTo(s * 0.24, s * 0.68);
  ctx.moveTo(s * 0.19, s * 0.7);
  ctx.lineTo(s * 0.24, s * 0.7);
  ctx.moveTo(s * 0.19, s * 0.74);
  ctx.lineTo(s * 0.24, s * 0.71);
  ctx.stroke();

  // Сиденье и гонщик
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s * 0.34, s * 0.68);
  ctx.lineTo(s * 0.32, s * 0.52);
  ctx.quadraticCurveTo(s * 0.32, s * 0.48, s * 0.38, s * 0.48);
  ctx.lineTo(s * 0.42, s * 0.5);
  ctx.lineTo(s * 0.42, s * 0.68);
  ctx.closePath();
  paint(ctx, '#e8590c', out, LW(s, 0.005));
  ctx.restore();
  // Тело в комбинезоне
  fillRoundRect(ctx, s * 0.4, s * 0.42, s * 0.14, s * 0.18, s * 0.02);
  paint(ctx, '#1c7ed6', out, LW(s, 0.005));
  helmet(ctx, s, s * 0.49, s * 0.37, s * 0.055, '#f783ac', out);
  // Руки к рулю
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.012);
  ctx.beginPath();
  ctx.moveTo(s * 0.48, s * 0.46);
  ctx.lineTo(s * 0.58, s * 0.5);
  ctx.stroke();

  // Руль
  ctx.save();
  ctx.strokeStyle = '#343a40';
  ctx.lineWidth = LW(s, 0.01);
  ctx.beginPath();
  ctx.arc(s * 0.6, s * 0.5, s * 0.035, Math.PI * 1.1, Math.PI * 2.1);
  ctx.stroke();
  ctx.restore();

  // Передний обтекатель
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.56);
  ctx.quadraticCurveTo(s * 0.84, s * 0.54, s * 0.88, s * 0.64);
  ctx.quadraticCurveTo(s * 0.84, s * 0.7, s * 0.62, s * 0.68);
  ctx.closePath();
  paint(ctx, '#e8590c', out, LW(s, 0.006));
  // Номер на обтекателе
  circle(ctx, s * 0.76, s * 0.615, s * 0.028);
  paint(ctx, '#ffffff', out, LW(s, 0.003));
  circle(ctx, s * 0.76, s * 0.615, s * 0.014);
  paint(ctx, '#e8590c', null);

  // Шарики защиты спереди
  circle(ctx, s * 0.88, s * 0.62, s * 0.02);
  paint(ctx, '#ffd43b', out, LW(s, 0.003));
  circle(ctx, s * 0.9, s * 0.66, s * 0.02);
  paint(ctx, '#ffd43b', out, LW(s, 0.003));
  circle(ctx, s * 0.88, s * 0.7, s * 0.02);
  paint(ctx, '#ffd43b', out, LW(s, 0.003));

  // Колёса: задняя пара чуть больше
  raceWheel(ctx, s, s * 0.27, s * 0.74, s * 0.06, '#ffd43b', out);
  raceWheel(ctx, s, s * 0.74, s * 0.74, s * 0.05, '#ffd43b', out);

  // Клетчатый флажок рядом
  ctx.save();
  ctx.strokeStyle = out;
  ctx.lineWidth = LW(s, 0.004);
  ctx.beginPath();
  ctx.moveTo(s * 0.93, s * 0.72);
  ctx.lineTo(s * 0.93, s * 0.52);
  ctx.stroke();
  const cq = s * 0.016;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#212529' : '#f8f9fa';
      ctx.fillRect(s * 0.93 + c * cq, s * 0.52 + r * cq, cq, cq);
    }
  }
  ctx.restore();
};

export const SCENE_SUBJECTS_3: Record<string, SubjectPainter> = {
  'formula-car': formulaCar,
  'rally-car': rallyCar,
  kart: kart,
};
