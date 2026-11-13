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
  buildBoard, hitTest, makeRng, seedFromText, scatterTrayPositions,
  trayOverlapLimit,
  type JigsawBoard, type JigsawPiece,
} from '@/lib/jigsaw-engine';
import {
  playSound, speak, stopSpeaking, unlockAudio, buzz,
  launchConfetti, burstStars,
  loadSession, saveSession, clearSession, loadProgress,
} from '@/lib/game-services';
import { ScenePreview, LivingScene } from '@/components/game/MenuScreens';

interface PieceState {
  piece: JigsawPiece;
  el: HTMLCanvasElement;
  x: number;
  y: number;
  z: number;
  snapped: boolean;
}

/* Какие пазлы уже озвучены в этом визите (общий для всех полей) */
const spokenTasks = new Set<string>();

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
  music: boolean;
  onExit: () => void;
  onDifficulty: (d: DifficultyLevel) => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onComplete: (pieces: number) => void;
  onOpenAlbum: () => void;
}

export default function PuzzleBoard({
  theme, puzzle, difficulty, muted, music,
  onExit, onDifficulty, onToggleMute, onToggleMusic, onComplete, onOpenAlbum,
}: PuzzleBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<PieceState[]>([]);
  const dragRef = useRef<DragInfo | null>(null);
  const zTopRef = useRef(100);
  const boardRef = useRef<JigsawBoard | null>(null);
  const difficultyRef = useRef(difficulty);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const [boardPx, setBoardPx] = useState(0);
  const [snapped, setSnapped] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [won, setWon] = useState(false);
  const [ready, setReady] = useState(false);
  /* v1.5: наклейка-альбом — если эта сложность собрана впервые,
     на победном экране показываем «Новая наклейка!» */
  const [newSticker, setNewSticker] = useState(false);

  /* Высота подноса = ровно одна деталь с ушками плюс воздух.
     Доля высоты детали от размера поля: 1/rows + ушки (0.64 * min).
     Так поднос сам растёт для крупных деталей (6 кусочков) и
     остаётся узким для мелких (48) — детали всегда В полке,
     а не поверх картинки. Считается в рендере — это чистая
     функция от размера поля и сложности */
  const pieceFactor = 1 / difficulty.rows
    + 0.64 * Math.min(1 / difficulty.cols, 1 / difficulty.rows);
  const wantedTray = boardPx > 0
    ? Math.max(110, Math.round(boardPx * pieceFactor) + 16)
    : 140;

  /* Высота всей игровой зоны: поле + поднос с деталями снизу */
  const areaH = boardPx + wantedTray;

  /* ----- Размер поля подстраивается под экран -----
     Поле занимает верх, снизу полоса-поднос с деталями.
     Поле + поднос (одна деталь) + шапка должны влезать в экран
     целиком, чтобы ребёнок видел и картинку, и детали сразу. */
  useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const area = areaRef.current;
      const w = wrap?.clientWidth ?? 360;
      const h = window.innerHeight;
      // Шапка над полем измеряется по факту: кнопки могут
      // переноситься на вторую строку на узких экранах
      const chrome = area && wrap
        ? area.getBoundingClientRect().top - wrap.getBoundingClientRect().top
        : 210;
      // Решаем уравнение: chrome + поле + поднос(поле) = экран.
      // Резерв 44px = 16 (воздух в подносе) + 16 (рамка вокруг зоны)
      // + 8 (поля обёртки) + 4 (запас на округления) — иначе на
      // телефоне снизу вылезает пустой скролл
      const rows = difficultyRef.current.rows;
      const cols = difficultyRef.current.cols;
      const factor = 1 / rows + 0.64 * Math.min(1 / cols, 1 / rows);
      const px = Math.max(240, Math.min(w - 8, (h - chrome - 44) / (1 + factor), 640));
      setBoardPx(Math.floor(px));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [difficulty]);

  /* ----- Сборка доски при смене пазла/сложности ----- */
  useEffect(() => {
    if (boardPx < 100 || !areaRef.current) return;
    const area = areaRef.current;
    area.innerHTML = '';

    /* Поднос уже посчитан в рендере (wantedTray), здесь только
       используем его: fullH — высота поля вместе с полкой */
    const fullH = boardPx + wantedTray;

    const board: JigsawBoard = buildBoard({
      cols: difficulty.cols,
      rows: difficulty.rows,
      boardPx,
      sceneId: puzzle.sceneId,
      seed: `${puzzle.id}-${difficulty.pieces}`,
    });
    boardRef.current = board;

    // Рамка поля — отдельный слой под подсказкой и деталями
    const frame = document.createElement('div');
    frame.className = 'kid-board';
    frame.style.position = 'absolute';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = `${boardPx}px`;
    frame.style.height = `${boardPx}px`;
    frame.style.borderRadius = '18px';
    area.appendChild(frame);

    // Полоса-поднос: сюда ребёнок складывает детали
    const tray = document.createElement('div');
    tray.className = 'pz-tray';
    tray.style.position = 'absolute';
    tray.style.left = '0';
    tray.style.top = `${boardPx + 6}px`;
    tray.style.width = `${boardPx}px`;
    tray.style.height = `${Math.max(wantedTray - 12, 40)}px`;
    tray.style.borderRadius = '16px';
    area.appendChild(tray);

    // Подсказка — бледная картинка на поле
    const hint = board.sceneCanvas;
    hint.style.position = 'absolute';
    hint.style.left = '0';
    hint.style.top = '0';
    hint.style.width = `${boardPx}px`;
    hint.style.height = `${boardPx}px`;
    hint.style.opacity = showHint ? '0.24' : '0';
    hint.style.transition = 'opacity 0.3s ease';
    hint.style.pointerEvents = 'none';
    hint.style.borderRadius = '18px';
    area.appendChild(hint);
    hintRef.current = hint;

    // Рассыпаем детали В ПОДНОС под полем. Если есть сохранённая
    // сессия — восстанавливаем: позиции и прилипшие кусочки вернутся.
    const rng = makeRng(seedFromText(`${puzzle.id}-${difficulty.pieces}-lay`) ^ 0x77aa);
    const positions = scatterTrayPositions(
      board.pieceW, board.pieceH, board.margin, board.pieces.length,
      boardPx, fullH, boardPx, rng,
    );
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
        // Деталь лежала где-то в зоне игры — возвращаем её в ту же
        // зону: 't' в поднос, 'b' на поле (старые сессии без зоны — на поле)
        const lo = -piece.margin;
        const hiX = boardPx - piece.w + piece.margin;
        x = Math.max(lo, Math.min(st.nx * boardPx, hiX));
        if (st.z === 't') {
          const loY = boardPx - trayOverlapLimit(piece.h);
          const hiY = fullH - piece.h + piece.margin;
          y = Math.max(loY, Math.min(boardPx + st.ny * wantedTray, hiY));
        } else {
          const hiY = fullH - piece.h + piece.margin;
          y = Math.max(lo, Math.min(st.ny * boardPx, hiY));
        }
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
    // Сброс состояния игры после пересборки деталей в DOM.
    // Синхронная установка здесь безопасна: эффект привязан к сборке поля
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapped(restoredSnapped);
    setWon(false);
    setReady(true);

    return () => {
      area.innerHTML = '';
      piecesRef.current = [];
      setReady(false);
    };
  }, [boardPx, wantedTray, puzzle.id, difficulty]);

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
      // Зона хранения: 't' — поднос (ny от 0..1 внутри полки),
      // 'b' — поле. Так при смене экрана деталь остаётся в своей зоне
      const inTray = p.y >= boardPx - trayOverlapLimit(p.piece.h);
      const z = inTray ? 't' : 'b';
      const nx = p.x / boardPx;
      const ny = inTray
        ? (p.y - boardPx) / Math.max(wantedTray, 1)
        : p.y / boardPx;
      return { i, nx, ny, s: p.snapped, z };
    });
    saveSession({
      puzzleId: puzzle.id,
      pieces: difficulty.pieces,
      snapped: sn,
      total,
      updatedAt: Date.now(),
      piecesState,
    });
  }, [boardPx, wantedTray, puzzle.id, difficulty.pieces]);

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
    const maxY = boardPx + wantedTray - drag.ps.piece.h + m;
    drag.ps.x = Math.max(-m, Math.min(e.clientX - rect.left - drag.offX, maxX));
    drag.ps.y = Math.max(-m, Math.min(e.clientY - rect.top - drag.offY, maxY));
    drag.ps.el.style.left = `${drag.ps.x}px`;
    drag.ps.el.style.top = `${drag.ps.y}px`;
  }, [boardPx, wantedTray]);

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
        /* v1.5: наклейка. Считаем «впервые ли собрана эта сложность»
           ДО записи результата (onComplete сработает позже, в эффекте
           победы). Здесь — обработчик события, setState уместен */
        const done = loadProgress()[puzzle.id]?.levelsDone ?? [];
        setNewSticker(!done.includes(difficulty.pieces));
        setTimeout(() => setWon(true), 350);
      }
    } else {
      playSound('drop');
    }
    persistSession();
  }, [boardPx, persistSession, puzzle.id, difficulty.pieces]);

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

  /* ----- Задание вслух при входе в пазл -----
     Говорим один раз на пазл за визит: смена сложности и
     «Перемешать» не повторяют озвучку, а выход и новый вход — да */
  useEffect(() => {
    if (spokenTasks.has(puzzle.id)) return;
    spokenTasks.add(puzzle.id);
    const t = setTimeout(() => speak(puzzle.instruction), 600);
    return () => clearTimeout(t);
  }, [puzzle.id]);

  /* ----- Пересобрать (кнопка) ----- */
  const reshuffle = () => {
    playSound('whoosh');
    const area = areaRef.current;
    if (!area || piecesRef.current.length === 0) return;
    const first = piecesRef.current[0].piece;
    const rng = makeRng((seedFromText(puzzle.id) + Date.now()) >>> 1);
    const positions = scatterTrayPositions(
      boardPx / difficulty.cols, boardPx / difficulty.rows, first.margin,
      piecesRef.current.length, boardPx, boardPx + wantedTray, boardPx, rng,
    );
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
    setNewSticker(false);
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
        {/* v1.6: фоновая музыка — отдельная кнопка, чтобы можно было
            оставить звуки-подсказки, но убрать мелодию */}
        <button onClick={onToggleMusic} className="kid-btn" type="button" aria-label="Музыка" title="Музыка">
          <span style={{ opacity: music ? 1 : 0.35 }}>🎵</span>
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

      {/* Игровое поле + поднос с деталями под ним */}
      <div className="relative m-1" style={{ width: boardPx + 16, height: areaH + 16 }}>
        <div
          ref={areaRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          className="relative overflow-hidden rounded-[18px]"
          style={{ width: boardPx, height: areaH, touchAction: 'none' }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-white/60">
            <div className="animate-bounce text-4xl">🧩</div>
          </div>
        )}

        {/* Победа! — только над полем, поднос не трогаем */}
        {won && (
          <div
            className="absolute left-0 top-0 z-[2000] flex items-center justify-center rounded-[18px] bg-slate-900/45 p-4 backdrop-blur-sm"
            style={{ width: boardPx, height: boardPx }}
          >
            <div className="kid-win-card w-full max-w-sm text-center">
              {/* v1.7: собранная картинка оживает */}
              <div className="relative mx-auto w-fit overflow-hidden rounded-2xl shadow-md ring-4 ring-white">
                <LivingScene sceneId={puzzle.sceneId} size={132} className="block" />
                <div className="bounce-slow absolute right-1.5 top-1.5 text-3xl">🎉</div>
              </div>
              <h2 className="mt-2 text-2xl font-black text-amber-500">Ура! Пазл собран!</h2>
              {newSticker && (
                <div className="sticker-new mt-2 flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-2 ring-2 ring-amber-300">
                  <span className="relative inline-flex overflow-hidden rounded-xl shadow-md ring-2 ring-white">
                    <ScenePreview sceneId={puzzle.sceneId} size={48} className="block" />
                  </span>
                  <span className="text-[13px] font-black leading-tight text-amber-700">
                    Новая наклейка!<br />
                    <span className="text-[11px] font-bold text-amber-600">
                      {puzzle.name} · {difficulty.pieces} кусочков
                    </span>
                  </span>
                </div>
              )}
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
                  className="kid-btn kid-btn-primary w-full"
                  onClick={() => { stopSpeaking(); playSound('button'); onOpenAlbum(); }}
                >
                  📔 Посмотреть альбом
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
