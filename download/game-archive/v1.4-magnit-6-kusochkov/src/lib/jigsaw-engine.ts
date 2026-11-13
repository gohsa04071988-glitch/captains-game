/* ============================================================
   ДВИЖОК ДЖИГСО-ДЕТАЛЕЙ
   Каждая общая грань генерируется ОДИН раз, поэтому ушко одной
   детали точно совпадает с выемкой соседней.
   Деталь рисуется так: вырезаем форму -> вставляем кусок
   картинки -> обводим тёмным контуром внутри и светлым снаружи.
   Благодаря этому контур детали виден даже на белом участке
   картинки (фикс бага "белых деталей без контуров").
   ============================================================ */

import { paintBackground, makeRng, seedFromText, type Ctx2D } from './scene-painter';
import { paletteForScene } from './puzzle-data';
import { SCENE_SUBJECTS_1 } from './scene-subjects-1';
import { SCENE_SUBJECTS_2 } from './scene-subjects-2';
import { SCENE_SUBJECTS_3 } from './scene-subjects-3';

/* Реэкспорт для компонентов игры */
export { makeRng, seedFromText } from './scene-painter';

export const SUBJECTS: Record<string, (ctx: Ctx2D, s: number, pal: import('./puzzle-data').PuzzlePalette, seed: number) => void> = {
  ...SCENE_SUBJECTS_1,
  ...SCENE_SUBJECTS_2,
  ...SCENE_SUBJECTS_3,
};

/* ---------- Полная картинка сцены: фон + герой ---------- */

export function paintFullScene(ctx: Ctx2D, s: number, sceneId: string): void {
  const pal = paintBackground(ctx, s, sceneId);
  const subject = SUBJECTS[sceneId];
  if (subject) {
    const rngSeed = seedFromText(sceneId) ^ 0x1234;
    subject(ctx, s, pal, rngSeed);
  }
  // Лёгкая виньетка для глубины
  const vg = ctx.createRadialGradient(s / 2, s / 2, s * 0.55, s / 2, s / 2, s * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, s, s);
}

export function renderSceneToCanvas(boardPx: number, sceneId: string, dpr: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.round(boardPx * dpr);
  cv.height = Math.round(boardPx * dpr);
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    paintFullScene(ctx, boardPx, sceneId);
  }
  return cv;
}

/* ---------- Форма грани (нормализованная, длина 1) ---------- */

/* u — вдоль грани, v — поперёк. Точки идут тройками для кривых Безье. */
function makeEdge(rng: () => number): number[][] {
  const j = 0.04;
  const flip = rng() > 0.5 ? 1 : -1;
  const a = rng() * 2 * j - j;
  const b = rng() * 2 * j - j;
  const c = rng() * 2 * j - j;
  const d = rng() * 2 * j - j;
  const e = rng() * 2 * j - j;
  const t = 0.09 + rng() * 0.02; // размер ушка
  const pts: number[][] = [
    [0, 0],
    [0.2, a],
    [0.5 + b + d, -t + c],
    [0.5 - t + b, t + c],
    [0.5 - 2 * t + b - d, 3 * t + c],
    [0.5 + 2 * t + b - d, 3 * t + c],
    [0.5 + t + b, t + c],
    [0.5 + b + d, -t + c],
    [0.8, e],
    [1, 0],
  ];
  return pts.map(([u, v]) => [u, v * flip]);
}

/* ---------- Геометрия детали ---------- */

function edgeToPoints(edge: number[][], sx: number, sy: number, ex: number, ey: number, scale: number): number[][] {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  return edge.map(([u, v]) => [sx + dx * u + nx * v * scale, sy + dy * u + ny * v * scale]);
}

function appendEdge(d: string, pts: number[][], reverse: boolean): string {
  const p = reverse ? pts.slice().reverse() : pts;
  const f = (q: number[]) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
  for (let i = 1; i < p.length; i += 3) d += `C ${f(p[i])}, ${f(p[i + 1])}, ${f(p[i + 2])} `;
  return d;
}

export interface EdgeGrid {
  hEdges: (number[][] | null)[][];
  vEdges: (number[][] | null)[][];
}

export function generateEdges(cols: number, rows: number, rng: () => number): EdgeGrid {
  const hEdges: (number[][] | null)[][] = [];
  const vEdges: (number[][] | null)[][] = [];
  for (let r = 0; r <= rows; r++) {
    hEdges[r] = [];
    for (let c = 0; c < cols; c++) hEdges[r][c] = r === 0 || r === rows ? null : makeEdge(rng);
  }
  for (let c = 0; c <= cols; c++) {
    vEdges[c] = [];
    for (let r = 0; r < rows; r++) vEdges[c][r] = c === 0 || c === cols ? null : makeEdge(rng);
  }
  return { hEdges, vEdges };
}

export function getJigsawPath(
  edges: EdgeGrid, col: number, row: number,
  w: number, h: number, m: number,
): string {
  const { hEdges, vEdges } = edges;
  const s = Math.min(w, h);
  const x0 = m, y0 = m, x1 = m + w, y1 = m + h;
  let d = `M ${x0} ${y0} `;

  const top = hEdges[row][col];
  d = top ? appendEdge(d, edgeToPoints(top, x0, y0, x1, y0, s), false) : d + `L ${x1} ${y0} `;

  const right = vEdges[col + 1][row];
  d = right ? appendEdge(d, edgeToPoints(right, x1, y0, x1, y1, s), false) : d + `L ${x1} ${y1} `;

  const bottom = hEdges[row + 1][col];
  d = bottom ? appendEdge(d, edgeToPoints(bottom, x0, y1, x1, y1, s), true) : d + `L ${x0} ${y1} `;

  const left = vEdges[col][row];
  d = left ? appendEdge(d, edgeToPoints(left, x0, y0, x0, y1, s), true) : d + `L ${x0} ${y0} `;

  return d + 'Z';
}

/* ---------- Сборка доски ---------- */

export interface JigsawPiece {
  col: number;
  row: number;
  path: Path2D;
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  targetX: number;
  targetY: number;
  margin: number;
}

export interface JigsawBoard {
  cols: number;
  rows: number;
  pieceW: number;
  pieceH: number;
  margin: number;
  boardPx: number;
  sceneCanvas: HTMLCanvasElement;
  pieces: JigsawPiece[];
  snapTolerance: number;
}

export interface BuildBoardOptions {
  cols: number;
  rows: number;
  boardPx: number;
  sceneId: string;
  seed: string;
  dpr?: number;
}

export function buildBoard(opts: BuildBoardOptions): JigsawBoard {
  const dpr = Math.min(opts.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1), 2);
  const { cols, rows, boardPx, sceneId } = opts;

  const pieceW = boardPx / cols;
  const pieceH = boardPx / rows;
  const margin = Math.min(pieceW, pieceH) * 0.32;

  const sceneCanvas = renderSceneToCanvas(boardPx, sceneId, dpr);
  const scale = sceneCanvas.width / boardPx;

  const rng = makeRng(seedFromText(opts.seed) ^ 0xbead5);
  const edges = generateEdges(cols, rows, rng);

  const pieces: JigsawPiece[] = [];
  const W = pieceW + margin * 2;
  const H = pieceH + margin * 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pathStr = getJigsawPath(edges, c, r, pieceW, pieceH, margin);
      const path = new Path2D(pathStr);

      const cv = document.createElement('canvas');
      cv.width = Math.ceil(W * dpr);
      cv.height = Math.ceil(H * dpr);
      // CSS-размер обязателен: иначе на экранах с dpr>1 деталь
      // отрисуется в dpr раз крупнее своего места
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);

        // 1) Кусок картинки внутри формы детали
        ctx.save();
        ctx.clip(path);
        const srcX = (c * pieceW - margin) * scale;
        const srcY = (r * pieceH - margin) * scale;
        ctx.drawImage(sceneCanvas, srcX, srcY, W * scale, H * scale, 0, 0, W, H);
        ctx.restore();

        // 2) Тёмный контур внутри (виден на любом цвете картинки)
        ctx.save();
        ctx.clip(path);
        ctx.lineWidth = Math.max(3, Math.min(pieceW, pieceH) * 0.055);
        ctx.strokeStyle = 'rgba(20,24,28,0.32)';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        ctx.restore();

        // 3) Светлая окантовка снаружи
        ctx.lineWidth = Math.max(1.5, Math.min(pieceW, pieceH) * 0.02);
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.lineJoin = 'round';
        ctx.stroke(path);

        // 4) Мягкая тень под ушками для объёма
        ctx.save();
        ctx.clip(path);
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = Math.max(2, Math.min(pieceW, pieceH) * 0.03);
        ctx.translate(-1.5, -1.5);
        ctx.stroke(path);
        ctx.restore();
      }

      pieces.push({
        col: c,
        row: r,
        path,
        canvas: cv,
        w: W,
        h: H,
        targetX: c * pieceW - margin,
        targetY: r * pieceH - margin,
        margin,
      });
    }
  }

  return {
    cols,
    rows,
    pieceW,
    pieceH,
    margin,
    boardPx,
    sceneCanvas,
    pieces,
    snapTolerance: buildSnapTolerance(cols, rows, pieceW, pieceH),
  };
}

/* ---------- Магнит (допуск прилипания) ----------
 * v1.2: 28% меньшей стороны детали, минимум 22px.
 * v1.4: на 6 кусочках (3×2) магнит крупнее — 40% меньшей стороны:
 * малышам 3–5 лет проще попасть деталькой рядом с местом.
 * Сложности 12/24/48 не тронуты — там по-прежнему 28%. */
export function buildSnapTolerance(cols: number, rows: number, pieceW: number, pieceH: number): number {
  const ratio = cols * rows === 6 ? 0.4 : 0.28;
  return Math.max(22, Math.min(pieceW, pieceH) * ratio);
}

/* ---------- Проверка попадания пальца в деталь ---------- */

const hitCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const hitCtx: CanvasRenderingContext2D | null = hitCanvas ? hitCanvas.getContext('2d') : null;

export function hitTest(piece: JigsawPiece, localX: number, localY: number): boolean {
  if (!hitCtx) return false;
  return hitCtx.isPointInPath(piece.path, localX, localY);
}

/* ---------- Рассыпание деталей по полю ---------- */

export function scatterPositions(
  board: JigsawBoard, areaW: number, areaH: number, rng: () => number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const m = board.margin;
  const maxX = Math.max(areaW - board.pieceW - m * 2, 10);
  const maxY = Math.max(areaH - board.pieceH - m * 2, 10);
  const used: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < board.pieces.length; i++) {
    let x = 0;
    let y = 0;
    let ok = false;
    for (let attempt = 0; attempt < 24 && !ok; attempt++) {
      x = -m + rng() * maxX;
      y = -m + rng() * maxY;
      ok = true;
      const minDist = Math.min(board.pieceW, board.pieceH) * 0.55;
      for (const u of used) {
        if (Math.hypot(u.x - x, u.y - y) < minDist) {
          ok = false;
          break;
        }
      }
    }
    used.push({ x, y });
    positions.push({ x, y });
  }
  return positions;
}

/* ---------- Поднос: насколько деталь может заходить на поле ----------
   Совсем без захода полка выглядит пустой, но и закрывать картинку
   нельзя. Договорились так: максимум 40px или четверть детали —
   у больших деталей это только ушки, у мелких — пара пикселей. */
export function trayOverlapLimit(pieceFullH: number): number {
  return Math.min(pieceFullH * 0.25, 40);
}

/* ---------- Рассыпание деталей в поднос (под полем) ----------
   Детали кладутся в полосу ПОД полем, поле остаётся чистым. */
export function scatterTrayPositions(
  pieceW: number, pieceH: number, margin: number, count: number,
  areaW: number, areaH: number, boardPx: number, rng: () => number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const w = pieceW + margin * 2;
  const h = pieceH + margin * 2;
  const loX = -margin;
  const hiX = Math.max(areaW - w + margin, loX + 10);
  // Малый заход на нижний край поля: поднос выглядит полнее,
  // а поле всё равно читается (см. trayOverlapLimit)
  const loY = Math.max(boardPx - trayOverlapLimit(h), 0);
  const hiY = Math.max(areaH - h + margin, loY + 10);
  const used: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let ok = false;
    for (let attempt = 0; attempt < 30 && !ok; attempt++) {
      x = loX + rng() * (hiX - loX);
      y = loY + rng() * (hiY - loY);
      ok = true;
      const minDist = Math.min(pieceW, pieceH) * 0.5;
      for (const u of used) {
        if (Math.hypot(u.x - x, u.y - y) < minDist) {
          ok = false;
          break;
        }
      }
    }
    used.push({ x, y });
    positions.push({ x, y });
  }
  return positions;
}

/* ---------- Прогресс сборки ---------- */

export function snappedCount(pieces: Array<{ snapped: boolean }>): number {
  return pieces.reduce((n, p) => (p.snapped ? n + 1 : n), 0);
}
