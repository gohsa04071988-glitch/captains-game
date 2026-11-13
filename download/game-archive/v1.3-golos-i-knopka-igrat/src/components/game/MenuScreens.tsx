'use client';

/* ============================================================
   ЭКРАНЫ МЕНЮ
   1) Главная: заголовок, статистика, сетка миров
   2) Список пазлов мира: живые мини-превью картинок,
      галочки за собранные пазлы
   Мини-превью рисуются тем же кодом, что и игровые картинки —
   превью всегда совпадает с тем, что ребёнок будет собирать.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  THEMES, TOTAL_PUZZLES, GAME_TITLE, GAME_SLOGAN, GAME_MOTTO, APP_VERSION,
  DIFFICULTIES, type PuzzleDef, type ThemeDef,
} from '@/lib/puzzle-data';
import { paintFullScene } from '@/lib/jigsaw-engine';
import { paletteForScene } from '@/lib/puzzle-data';
import {
  playSound, speak, unlockAudio, loadProgress,
  resetProgress, getLatestSession, type PuzzleProgress, type PuzzleSession,
} from '@/lib/game-services';

/* ---------- Живое мини-превью сцены ---------- */

export function ScenePreview({ sceneId, size, className }: { sceneId: string; size: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    paintFullScene(ctx, size, sceneId);
  }, [sceneId, size]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size }}
      aria-label={`Превью: ${sceneId}`}
    />
  );
}

/* ---------- Шапка ---------- */

function HomeHeader({ completed }: { completed: number }) {
  return (
    <header className="flex flex-col items-center gap-1 pt-6 text-center">
      <div className="float-slow text-5xl">🧩</div>
      <h1 className="kid-title text-3xl sm:text-4xl">{GAME_TITLE}</h1>
      <p className="text-sm font-bold tracking-[0.25em] text-emerald-600">{GAME_SLOGAN}</p>
      <p className="text-xs italic text-slate-500">{GAME_MOTTO}</p>
      <div className="mt-2 rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
        Собрано пазлов: <span className="text-emerald-600">{completed}</span> из {TOTAL_PUZZLES}
      </div>
    </header>
  );
}

/* ---------- Главная: выбор мира ---------- */

interface HomeScreenProps {
  onOpenTheme: (theme: ThemeDef) => void;
  onResume: (theme: ThemeDef, puzzle: PuzzleDef, pieces: number) => void;
  onPlay: (theme: ThemeDef, puzzle: PuzzleDef, pieces?: number) => void;
}

export function HomeScreen({ onOpenTheme, onResume, onPlay }: HomeScreenProps) {
  const [progress, setProgress] = useState<Record<string, PuzzleProgress>>({});
  const [lastSession, setLastSession] = useState<PuzzleSession | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Разовое чтение внешнего хранилища (localStorage) после монтирования:
    // во время рендера читать нельзя — SSR и клиент разошлись бы
    setProgress(loadProgress());
    setLastSession(getLatestSession());
  }, []);

  /* Проверка обновлений: сервер отдаёт актуальную версию, сравниваем
     с запомненной. Новая — показываем плашку «Появилось обновление!» */
  useEffect(() => {
    const stored = localStorage.getItem('mkpz:lastVersion');
    fetch('/api/version')
      .then((r) => r.json())
      .then((data: { version?: string }) => {
        const v = data.version ?? '';
        if (!v) return;
        if (stored && stored !== v) {
          setUpdateReady(true);
        } else {
          localStorage.setItem('mkpz:lastVersion', v);
        }
      })
      .catch(() => { /* нет сети — просто играем */ });
  }, []);

  const applyUpdate = () => {
    localStorage.setItem('mkpz:lastVersion', APP_VERSION);
    window.location.reload();
  };

  /* Незаконченный пазл для кнопки «Продолжить» (вычисление лёгкое:
     8 миров × 3 пазла, без мемоизации) */
  const resume = (() => {
    const s = lastSession;
    if (!s || s.snapped <= 0) return null;
    for (const t of THEMES) {
      const p = t.puzzles.find((pz) => pz.id === s.puzzleId);
      if (p && DIFFICULTIES.some((d) => d.pieces === s.pieces)) {
        return { session: s, theme: t, puzzle: p };
      }
    }
    return null;
  })();

  /* Случайный пазл для кнопки «Играть»: сначала вовсе несобранные
     (сложность 6, или та, где осталась сессия), потом пазлы,
     где собраны не все сложности. Если собрано всё — любой пазл
     на любой сложности. Вычисление лёгкое (24 пазла) */
  const quick = (() => {
    const fresh: Array<{ theme: ThemeDef; puzzle: PuzzleDef; pieces?: number }> = [];
    const nextLevel: Array<{ theme: ThemeDef; puzzle: PuzzleDef; pieces: number }> = [];
    for (const t of THEMES) {
      for (const p of t.puzzles) {
        const pr = progress[p.id];
        if (!pr?.completed) fresh.push({ theme: t, puzzle: p });
        else {
          const next = DIFFICULTIES.find((d) => !pr.levelsDone.includes(d.pieces));
          if (next) nextLevel.push({ theme: t, puzzle: p, pieces: next.pieces });
        }
      }
    }
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    if (fresh.length > 0) return { target: pick(fresh), remaining: fresh.length };
    if (nextLevel.length > 0) return { target: pick(nextLevel), remaining: 0 };
    const all: Array<{ theme: ThemeDef; puzzle: PuzzleDef; pieces?: number }> = [];
    for (const t of THEMES) for (const p of t.puzzles) all.push({ theme: t, puzzle: p });
    const any = pick(all);
    const diff = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    return { target: { ...any, pieces: diff.pieces }, remaining: 0 };
  })();

  const completed = Object.values(progress).filter((p) => p.completed).length;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5">
      <HomeHeader completed={completed} />

      {updateReady && (
        <div className="flex w-full items-center justify-between gap-2 rounded-2xl bg-amber-100 px-4 py-2 shadow-md">
          <span className="text-sm font-extrabold text-amber-800">
            🆕 Появилось обновление игры!
          </span>
          <button
            type="button"
            className="kid-btn kid-btn-primary !px-3 !py-1.5 !text-xs"
            onClick={applyUpdate}
          >
            Обновить
          </button>
        </div>
      )}

      {/* Большая кнопка «Играть»: случайный несобранный пазл */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 shadow-lg ring-2 ring-emerald-300/60 transition-transform active:scale-95"
        onClick={() => {
          unlockAudio(); playSound('button');
          onPlay(quick.target.theme, quick.target.puzzle, quick.target.pieces);
        }}
      >
        <span className="text-2xl">🎲</span>
        <span className="text-lg font-black text-white">Играть!</span>
        <span className="text-xs font-bold text-white/85">
          {quick.remaining > 0 ? `несобранных пазлов: ${quick.remaining}` : 'всё собрано — играем снова!'}
        </span>
      </button>

      {resume && (
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-md ring-2 ring-amber-300 transition-transform active:scale-95"
          onClick={() => { unlockAudio(); playSound('button'); onResume(resume.theme, resume.puzzle, resume.session.pieces); }}
        >
          <span className="relative shrink-0 overflow-hidden rounded-xl shadow">
            <ScenePreview sceneId={resume.puzzle.sceneId} size={56} className="block" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="flex items-center gap-2 text-base font-extrabold text-slate-700">
              ▶ Продолжить: {resume.puzzle.name}
            </span>
            <span className="text-xs font-bold text-amber-600">
              собрано {resume.session.snapped} из {resume.session.total} · не потеряй свои кусочки!
            </span>
          </span>
          <span className="text-3xl">▶️</span>
        </button>
      )}

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const done = theme.puzzles.filter((p) => progress[p.id]?.completed).length;
          return (
            <button
              key={theme.id}
              type="button"
              className="theme-card group relative overflow-hidden"
              style={{ ['--theme-color' as string]: theme.color }}
              onClick={() => { unlockAudio(); playSound('button'); onOpenTheme(theme); }}
              onPointerEnter={() => playSound('star')}
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: theme.color }}
              />
              <span className="block text-5xl transition-transform duration-200 group-hover:scale-110">
                {theme.icon}
              </span>
              <span className="mt-1 block text-lg font-extrabold text-slate-700">{theme.name}</span>
              <span className="mt-0.5 block text-xs font-bold" style={{ color: theme.color }}>
                {theme.puzzles.length} пазла · {done}/{theme.puzzles.length} ✅
              </span>
            </button>
          );
        })}
      </div>

      <p className="pb-4 text-center text-xs text-slate-400">
        Совет для родителей: включите звук — игра читает задания вслух
      </p>
      <p className="-mt-3 pb-4 text-center text-[10px] font-semibold text-slate-300">
        Мир по кусочкам · v{APP_VERSION}
      </p>
    </div>
  );
}

/* ---------- Список пазлов мира ---------- */

interface PuzzleListProps {
  theme: ThemeDef;
  onBack: () => void;
  onStart: (puzzle: PuzzleDef) => void;
}

export function PuzzleListScreen({ theme, onBack, onStart }: PuzzleListProps) {
  const [progress, setProgress] = useState<Record<string, PuzzleProgress>>({});

  useEffect(() => {
    // Разовое чтение внешнего хранилища при смене мира
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, [theme]);

  const subtitle = useMemo(() => {
    const phrases: Record<string, string> = {
      train: 'Паровозики и поезда',
      race: 'Быстрые машины и ралли',
      construction: 'Строим и копаем',
      earth: 'Наша планета',
      animals: 'Лесные друзья',
      dinos: 'Доисторические гиганты',
      space: 'Звёзды и планеты',
      sea: 'Подводный мир',
    };
    return phrases[theme.id] ?? '';
  }, [theme]);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 pb-8">
      <div className="flex w-full items-center justify-between">
        <button type="button" className="kid-btn" onClick={() => { playSound('button'); onBack(); }}>
          ← Миры
        </button>
        <div className="flex items-center gap-2 text-xl font-black" style={{ color: theme.color }}>
          <span className="text-3xl">{theme.icon}</span> {theme.name}
        </div>
        <div className="w-20" />
      </div>
      <p className="-mt-2 text-sm font-semibold text-slate-500">{subtitle}</p>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {theme.puzzles.map((puzzle) => {
          const done = progress[puzzle.id]?.completed;
          const levels = progress[puzzle.id]?.levelsDone ?? [];
          return (
            <button
              key={puzzle.id}
              type="button"
              className="puzzle-card"
              onClick={() => { unlockAudio(); playSound('button'); onStart(puzzle); }}
              onPointerEnter={() => playSound('star')}
            >
              <div className="relative shrink-0 overflow-hidden rounded-2xl shadow-md">
                <ScenePreview sceneId={puzzle.sceneId} size={96} className="block" />
                {done && (
                  <div className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm text-white shadow">
                    ✓
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="flex items-center gap-2 text-lg font-extrabold text-slate-700">
                  <span className="text-2xl">{puzzle.icon}</span> {puzzle.name}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
                  {puzzle.instruction}
                </span>
                <span className="mt-1.5 flex gap-1" aria-label="Сложности, которые ты собрал">
                  {[6, 12, 24, 48].map((lv) => (
                    <span
                      key={lv}
                      className={`flex h-5 w-7 items-center justify-center rounded-md text-[10px] font-black ${
                        levels.includes(lv)
                          ? 'bg-amber-400 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {lv}
                    </span>
                  ))}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Родительская зона */}
      <ResetZone />
    </div>
  );
}

/* ---------- Сброс прогресса (для родителей) ---------- */

function ResetZone() {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="mt-2 text-[11px] text-slate-300 underline decoration-dotted hover:text-slate-400"
        onClick={() => setConfirming(true)}
      >
        Сбросить прогресс
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 shadow">
      <span className="text-xs font-semibold text-slate-600">
        {cleared ? 'Готово, прогресс очищен!' : 'Точно сбросить все галочки?'}
      </span>
      {!cleared && (
        <>
          <button
            type="button"
            className="kid-btn kid-btn-danger !px-3 !py-1 !text-xs"
            onClick={() => { resetProgress(); setCleared(true); setTimeout(() => { setCleared(false); setConfirming(false); }, 900); }}
          >
            Да
          </button>
          <button
            type="button"
            className="kid-btn !px-3 !py-1 !text-xs"
            onClick={() => setConfirming(false)}
          >
            Нет
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Приветственная речь при первом входе ---------- */

export function useWelcomeVoice(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => speak('Привет! Выбирай мир и собирай пазлы!'), 800);
    return () => clearTimeout(t);
  }, [enabled]);
}

/* Мини-информация о пазле перед стартом */
export function PuzzleIntro({ puzzle }: { puzzle: PuzzleDef }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
      <span className="text-lg">{puzzle.icon}</span>
      {paletteForScene(puzzle.sceneId) ? 'Готов к сборке' : 'Загрузка...'}
    </div>
  );
}
