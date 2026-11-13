'use client';

/* ============================================================
   ИГРОВОЕ ПОЛЕ
   Детали можно таскать пальцем или мышкой, они прилипают
   к своему месту с мягким звуком и искрами. После сборки —
   конфетти, история пазла и голосовое поздравление.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DifficultyLevel, PuzzleDef, ThemeDef } from '@/lib/puzzle-data';
import { DIFFICULTIES } from '@/lib/puzzle-data';
import {
  buildBoard, hitTest, makeRng, seedFromText, scatterPositions,
  type JigsawBoard, type JigsawPiece,
} from '@/lib/jigsaw-engine';
import {
  playSound, speak, stopSpeaking, unlockAudio, buzz,
  launchConfetti, burstStars,
  loadSession, saveSession, clearSession,
} from '@/lib/game-services';

interface PieceState {
  piece: JigsawPiece;
  el: HTMLCanvasElement;
  x: number;
  y: number;
  z: number;
  snapped: boolean;
}

interface DragInfo {
  ps: PieceState;
  offX: number;
  offY: number;
  id: number;
}

interface PuzzleBoardProps {
  theme: ThemeDef;
  puzzle: PuzzleDef;
  difficulty: DifficultyLevel;
  muted: boolean;
  onExit: () => void;
  onDifficulty: (d: DifficultyLevel) => void;
  onToggleMute: () => void;
  onComplete: (pieces: number) => void;
}

export default function PuzzleBoard({
  theme, puzzle, difficulty, muted,
  onExit, onDifficulty, onToggleMute, onComplete,
}: PuzzleBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<PieceState[]>([]);
  const dragRef = useRef<DragInfo | null>(null);
  const zTopRef = useRef(100);
  const boardRef = useRef<JigsawBoard | null>(null);

  const [boardPx, setBoardPx] = useState(0);
  const [snapped, setSnapped] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [won, setWon] = useState(false);
  const [ready, setReady] = useState(false);

  /* ----- Размер поля подстраивается под экран ----- */
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? 360;
      const h = window.innerHeight;
      const px = Math.max(240, Math.min(w - 8, h - 240, 640));
      setBoardPx(Math.floor(px));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  /* ----- Сборка доски при смене пазла/сложности ----- */
  useEffect(() => {
    if (boardPx < 100 || !areaRef.current) return;
    const area = areaRef.current;
    area.innerHTML = '';

    const board: JigsawBoard = buildBoard({
      cols: difficulty.cols,
      rows: difficulty.rows,
      boardPx,
      sceneId: puzzle.sceneId,
      seed: `${puzzle.id}-${difficulty.pieces}`,
    });
    boardRef.current = board;

    // Подсказка — бледная картинка на поле
    const hint = board.sceneCanvas;
    hint.style.position = 'absolute';
    hint.style.inset = '0';
    hint.style.width = `${boardPx}px`;
    hint.style.height = `${boardPx}px`;
    hint.style.opacity = showHint ? '0.24' : '0';
    hint.style.transition = 'opacity 0.3s ease';
    hint.style.pointerEvents = 'none';
    hint.style.borderRadius = '18px';
    area.appendChild(hint);
    hintRef.current = hint;

    // Рассыпаем детали. Если есть сохранённая сессия — восстанавливаем
    // её: позиции деталей и прилипшие кусочки вернутся на свои места.
    const rng = makeRng(seedFromText(`${puzzle.id}-${difficulty.pieces}-lay`) ^ 0x77aa);
    const positions = scatterPositions(board, boardPx, boardPx, rng);
    const saved = loadSession(puzzle.id);
    const resumable = !!saved
      && saved.pieces === difficulty.pieces
      && saved.piecesState?.length === board.pieces.length;
    let restoredSnapped = 0;

    piecesRef.current = board.pieces.map((piece, i) => {
      const el = piece.canvas;
      el.style.position = 'absolute';
      el.style.willChange = 'left, top';
      el.className = 'pz-piece';
      const st = resumable ? saved!.piecesState[i] : undefined;
      let x: number;
      let y: number;
      let z: number;
      let isSnapped = false;
      if (st?.s) {
        // Деталь уже стояла на своём месте
        x = piece.targetX;
        y = piece.targetY;
        z = 1;
        isSnapped = true;
        el.classList.add('pz-snapped');
        restoredSnapped += 1;
      } else if (st) {
        // Деталь лежала где-то на поле — ставим туда же,
        // позиции в сессии хранятся в долях поля (0..1)
        const lo = -piece.margin;
        const hiX = boardPx - piece.w + piece.margin;
        const hiY = boardPx - piece.h + piece.margin;
        x = Math.max(lo, Math.min(st.nx * boardPx, hiX));
        y = Math.max(lo, Math.min(st.ny * boardPx, hiY));
        z = 10 + i;
      } else {
        x = positions[i].x;
        y = positions[i].y;
        z = 10 + Math.floor(rng() * 90);
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.zIndex = String(z);
      area.appendChild(el);
      return { piece, el, x, y, z, snapped: isSnapped };
    });

    zTopRef.current = 100;
    // Сброс состояния игры после пересборки деталей в DOM
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapped(restoredSnapped);
    setWon(false);
    setReady(true);

    return () => {
      area.innerHTML = '';
      piecesRef.current = [];
      setReady(false);
    };
  }, [boardPx, puzzle.id, difficulty.pieces]);

  /* ----- Показ/скрытие подсказки ----- */
  useEffect(() => {
    if (hintRef.current) hintRef.current.style.opacity = showHint ? '0.24' : '0';
  }, [showHint]);

  /* ----- Сохранение сессии сборки (после каждого хода) ----- */
  const persistSession = useCallback(() => {
    const total = piecesRef.current.length;
    if (!total || boardPx < 100) return;
    let sn = 0;
    const piecesState = piecesRef.current.map((p, i) => {
      if (p.snapped) sn += 1;
      return { i, nx: p.x / boardPx, ny: p.y / boardPx, s: p.snapped };
    });
    saveSession({
      puzzleId: puzzle.id,
      pieces: difficulty.pieces,
      snapped: sn,
      total,
      updatedAt: Date.now(),
      piecesState,
    });
  }, [boardPx, puzzle.id, difficulty.pieces]);

  /* ----- Поиск верхней детали под пальцем ----- */
  const pickPiece = useCallback((x: number, y: number): PieceState | null => {
    const list = piecesRef.current
      .filter((p) => !p.snapped)
      .sort((a, b) => b.z - a.z);
    for (const p of list) {
      if (hitTest(p.piece, x - p.x, y - p.y)) return p;
    }
    return null;
  }, []);

  /* ----- Перетаскивание ----- */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!areaRef.current || won) return;
    unlockAudio();
    const rect = areaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ps = pickPiece(x, y);
    if (!ps) return;
    e.preventDefault();
    dragRef.current = { ps, offX: x - ps.x, offY: y - ps.y, id: e.pointerId };
    zTopRef.current += 1;
    ps.z = zTopRef.current;
    ps.el.style.zIndex = String(ps.z);
    ps.el.classList.add('pz-dragging');
    // setPointerCapture может бросить исключение для синтетических
    // или уже завершившихся указателей — это не ломает перетаскивание
    try {
      areaRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* без захвата перемещения всё равно работают */
    }
    playSound('pick');
  }, [pickPiece, won]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.id || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const m = drag.ps.piece.margin;
    const maxX = boardPx - drag.ps.piece.w + m;
    const maxY = boardPx - drag.ps.piece.h + m;
    drag.ps.x = Math.max(-m, Math.min(e.clientX - rect.left - drag.offX, maxX));
    drag.ps.y = Math.max(-m, Math.min(e.clientY - rect.top - drag.offY, maxY));
    drag.ps.el.style.left = `${drag.ps.x}px`;
    drag.ps.el.style.top = `${drag.ps.y}px`;
  }, [boardPx]);

  const finishDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.id) return;
    dragRef.current = null;
    const ps = drag.ps;
    ps.el.classList.remove('pz-dragging');
    if (areaRef.current?.hasPointerCapture(e.pointerId)) {
      areaRef.current.releasePointerCapture(e.pointerId);
    }

    const tol = boardRef.current
      ? Math.max(24, Math.min(boardRef.current.snapTolerance, boardPx * 0.3))
      : 30;
    const dist = Math.hypot(ps.x - ps.piece.targetX, ps.y - ps.piece.targetY);
    if (dist < tol) {
      ps.x = ps.piece.targetX;
      ps.y = ps.piece.targetY;
      ps.el.style.left = `${ps.x}px`;
      ps.el.style.top = `${ps.y}px`;
      ps.snapped = true;
      ps.z = 1;
      ps.el.style.zIndex = '1';
      ps.el.classList.add('pz-snapped');
      playSound('snap');
      buzz(28);
      if (areaRef.current) {
        const cx = ps.x + ps.piece.w / 2;
        const cy = ps.y + ps.piece.h / 2;
        burstStars(areaRef.current.parentElement ?? areaRef.current, cx, cy);
      }
      const next = piecesRef.current.filter((p) => p.snapped).length;
      setSnapped(next);
      if (next === piecesRef.current.length) {
        setTimeout(() => setWon(true), 350);
      }
    } else {
      playSound('drop');
    }
    persistSession();
  }, [boardPx, persistSession]);

  /* ----- Победа ----- */
  useEffect(() => {
    if (!won || !wrapRef.current) return;
    playSound('win');
    launchConfetti(wrapRef.current, 110);
    clearSession(puzzle.id); // пазл собран — сессия больше не нужна
    const phrase = `Молодец! Ты собрал пазл ${puzzle.name}! ${puzzle.story}`;
    setTimeout(() => speak(phrase), 450);
    onComplete(difficulty.pieces);
  }, [won]);

  useEffect(() => () => stopSpeaking(), []);

  /* ----- Пересобрать (кнопка) ----- */
  const reshuffle = () => {
    playSound('whoosh');
    const area = areaRef.current;
    if (!area || piecesRef.current.length === 0) return;
    const first = piecesRef.current[0].piece;
    const pseudoBoard = {
      margin: first.margin,
      pieceW: boardPx / difficulty.cols,
      pieceH: boardPx / difficulty.rows,
      pieces: piecesRef.current.map((p) => p.piece),
    } as unknown as JigsawBoard;
    const rng = makeRng((seedFromText(puzzle.id) + Date.now()) >>> 1);
    const positions = scatterPositions(pseudoBoard, boardPx, boardPx, rng);
    piecesRef.current.forEach((p, i) => {
      p.x = positions[i].x;
      p.y = positions[i].y;
      p.snapped = false;
      p.z = 10 + i;
      p.el.classList.remove('pz-snapped');
      p.el.style.zIndex = String(p.z);
      p.el.style.left = `${p.x}px`;
      p.el.style.top = `${p.y}px`;
    });
    setSnapped(0);
    setWon(false);
    stopSpeaking();
    persistSession();
  };

  const total = difficulty.pieces;
  const progress = total > 0 ? Math.round((snapped / total) * 100) : 0;

  return (
    <div ref={wrapRef} className="relative flex w-full max-w-2xl flex-col items-center gap-3 select-none">
      {/* Верхняя панель */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <button onClick={onExit} className="kid-btn kid-btn-danger" type="button">
          ← Меню
        </button>
        <div className="kid-diff">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.pieces}
              type="button"
              onClick={() => { playSound('button'); onDifficulty(d); }}
              className={`kid-diff-btn ${d.pieces === difficulty.pieces ? 'kid-diff-active' : ''}`}
              title={`${d.pieces} кусочков — ${d.hint}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button onClick={() => { playSound('button'); setShowHint((v) => !v); }} className="kid-btn" type="button">
          {showHint ? '🙈 Скрыть образец' : '👀 Показать образец'}
        </button>
        <button onClick={onToggleMute} className="kid-btn" type="button" aria-label="Звук">
          {muted ? '🔇' : '🔊'}
        </button>
        <button onClick={reshuffle} className="kid-btn" type="button">
          🌪️ Перемешать
        </button>
      </div>

      {/* Название и прогресс */}
      <div className="flex w-full items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-base font-extrabold text-slate-700">
          <span className="text-2xl">{theme.icon}</span>
          <span>{puzzle.name}</span>
        </div>
        <div className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-slate-600 shadow-sm">
          Собрано {snapped} / {total}
        </div>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Игровое поле */}
      <div className="relative m-1" style={{ width: boardPx + 16, height: boardPx + 16 }}>
        <div
          ref={areaRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          className="kid-board relative overflow-hidden rounded-[18px]"
          style={{ width: boardPx, height: boardPx, touchAction: 'none' }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-white/60">
            <div className="animate-bounce text-4xl">🧩</div>
          </div>
        )}

        {/* Победа! */}
        {won && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center rounded-[18px] bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="kid-win-card w-full max-w-sm text-center">
              <div className="bounce-slow text-6xl">🎉</div>
              <h2 className="mt-2 text-2xl font-black text-amber-500">Ура! Пазл собран!</h2>
              <p className="mt-2 text-[15px] leading-snug text-slate-700">{puzzle.story}</p>
              <p className="mt-2 rounded-xl bg-amber-100/80 px-3 py-2 text-[13px] font-semibold text-amber-800">
                💡 {puzzle.fact}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="kid-btn kid-btn-primary w-full"
                  onClick={() => { playSound('button'); speak(puzzle.story); }}
                >
                  🔉 Послушать ещё раз
                </button>
                <button
                  type="button"
                  className="kid-btn kid-btn-primary w-full"
                  onClick={() => { stopSpeaking(); reshuffle(); }}
                >
                  🔁 Собрать ещё раз
                </button>
                <button
                  type="button"
                  className="kid-btn kid-btn-ghost w-full"
                  onClick={() => { stopSpeaking(); onExit(); }}
                >
                  ← Выбрать новый пазл
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
