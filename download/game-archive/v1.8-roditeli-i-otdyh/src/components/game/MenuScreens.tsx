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
import { paintFullScene, downloadScenePng } from '@/lib/jigsaw-engine';
import { paintLivingScene } from '@/lib/scene-life';
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

/* ---------- Ожившая картинка (v1.7) ----------
   Та же картинка, что рисуется в пазле, но каждый кадр
   поверх дорисовывается движение: лучи, облака, звёзды,
   пузырьки, бабочки. Кадры считаем ~30 раз в секунду —
   для маленького холста это совсем недорого */
export function LivingScene({ sceneId, size, className }: { sceneId: string; size: number; className?: string }) {
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
    let raf = 0;
    let last = -1000;
    const t0 = performance.now();
    const loop = (now: number) => {
      if (now - last > 33) {
        last = now;
        paintLivingScene(ctx, size, sceneId, (now - t0) / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sceneId, size]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size }}
      aria-label={`Ожившая картинка: ${sceneId}`}
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
  onOpenAlbum: () => void;
  onOpenParents: () => void;
  muted: boolean;
  music: boolean;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export function HomeScreen({ onOpenTheme, onResume, onPlay, onOpenAlbum, onOpenParents, muted, music, onToggleMute, onToggleMusic }: HomeScreenProps) {
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
  /* v1.5: наклейки — по одной за каждую собранную сложность каждого пазла */
  const stickers = Object.values(progress).reduce((sum, p) => sum + p.levelsDone.length, 0);
  const TOTAL_STICKERS = TOTAL_PUZZLES * 4;

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

      {/* v1.6: кнопки звука и музыки — видно ещё до входа в игру */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="kid-btn !min-h-0 !px-4 !py-1.5 !text-lg"
          aria-label="Звук"
          title="Звук вкл/выкл"
          onClick={() => { unlockAudio(); onToggleMute(); }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          className="kid-btn !min-h-0 !px-4 !py-1.5 !text-lg"
          aria-label="Музыка"
          title="Музыка вкл/выкл"
          onClick={() => { unlockAudio(); onToggleMusic(); }}
        >
          <span style={{ opacity: music ? 1 : 0.35 }}>🎵</span>
        </button>
      </div>

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

      {/* Кнопка «Альбом»: листать собранные наклейки (v1.5) */}
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-md ring-2 ring-amber-300 transition-transform active:scale-95"
        onClick={() => { unlockAudio(); playSound('button'); onOpenAlbum(); }}
      >
        <span className="text-3xl">📔</span>
        <span className="flex flex-1 flex-col">
          <span className="text-base font-extrabold text-slate-700">Мой альбом наклеек</span>
          <span className="text-xs font-bold text-amber-600">
            наклеек: {stickers} из {TOTAL_STICKERS} · собирай новые!
          </span>
        </span>
        <span className="text-2xl">→</span>
      </button>

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

      {/* v1.8: вход в родительскую панель — маленькая тихая ссылка,
          ребёнку не мешает, родители найдут её внизу */}
      <button
        type="button"
        className="mx-auto -mt-2 block text-[11px] font-semibold text-slate-300 underline decoration-dotted transition-colors hover:text-slate-400"
        onClick={() => { playSound('button'); onOpenParents(); }}
      >
        Для родителей
      </button>
      <p className="pb-2 text-center text-[10px] font-semibold text-slate-300">
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

/* ---------- Оверлей отдыха (v1.8) ----------
   Показывается, когда время игры достигает лимита из родительской
   панели. Никаких таймеров на экране: просто мягкая подсказка,
   а фон за минуту плавно темнеет (анимация break-dim) — глазам
   естественно захочется отдохнуть. */

export function BreakOverlay({ onDone, onBonus }: { onDone: () => void; onBonus: () => void }) {
  return (
    <div className="fixed inset-0 z-[4000]">
      {/* Экран потихоньку затухает (0 -> 0.93 за минуту) */}
      <div className="break-dim absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="float-slow text-7xl">🌞</div>
        <h2 className="text-3xl font-black text-amber-300 drop-shadow-md">Пора отдохнуть!</h2>
        <p className="max-w-md text-lg font-bold leading-relaxed text-amber-100">
          Потяни ручки, похлопай глазками,<br />глубоко вдохни — и продолжим приключение
        </p>
        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            className="kid-btn kid-btn-primary !px-8 !py-3 !text-lg"
            onClick={onDone}
          >
            Мы отдохнули — играем!
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-slate-300 underline decoration-dotted hover:text-slate-200"
            onClick={onBonus}
          >
            Ещё 5 минут (для родителей)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Родительская панель (v1.8) ----------
   Вход по простому примеру (двузначные числа) — малыш сам не
   зайдёт, а родителю это секунда. Внутри: статистика, настройки
   (звук, музыка, напоминание об отдыхе), сохранение картинок
   собранных пазлов и сброс прогресса. */

interface ParentsScreenProps {
  onBack: () => void;
  muted: boolean;
  music: boolean;
  breakMin: number;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onBreakMin: (min: number) => void;
}

const ALL_PUZZLES: PuzzleDef[] = THEMES.flatMap((t) => t.puzzles);

function makeGateQuestion(): { a: number; b: number } {
  return {
    a: 12 + Math.floor(Math.random() * 20),
    b: 11 + Math.floor(Math.random() * 18),
  };
}

const BREAK_CHOICES = [0, 15, 20, 30];

export function ParentsScreen({ onBack, muted, music, breakMin, onToggleMute, onToggleMusic, onBreakMin }: ParentsScreenProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [gate, setGate] = useState(() => makeGateQuestion());
  const [answer, setAnswer] = useState('');
  const [gateError, setGateError] = useState(false);
  const [progress, setProgress] = useState<Record<string, PuzzleProgress>>({});

  useEffect(() => {
    // Разовое чтение внешнего хранилища при открытии панели
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  /* --- Вопрос-проверка --- */
  if (!unlocked) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 pt-14">
        <div className="w-full rounded-3xl bg-white/95 p-6 text-center shadow-lg ring-2 ring-slate-200">
          <div className="text-4xl">🔐</div>
          <h2 className="mt-2 text-lg font-black text-slate-700">Раздел для родителей</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Сколько будет {gate.a} + {gate.b}?
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setGateError(false); }}
            className={`mt-3 w-32 rounded-xl border-2 px-3 py-2 text-center text-xl font-black outline-none ${
              gateError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
            }`}
            placeholder="?"
            aria-label="Ответ на вопрос"
          />
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="kid-btn kid-btn-primary"
              onClick={() => {
                if (Number(answer) === gate.a + gate.b) {
                  playSound('button');
                  setUnlocked(true);
                } else {
                  setGateError(true);
                  setGate(makeGateQuestion());
                  setAnswer('');
                }
              }}
            >
              Войти
            </button>
            <button type="button" className="kid-btn" onClick={onBack}>
              Назад
            </button>
          </div>
          {gateError && (
            <p className="mt-2 text-xs font-bold text-red-500">
              Не сходится. Попробуйте ещё раз
            </p>
          )}
        </div>
      </div>
    );
  }

  /* --- Панель --- */
  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const stickers = Object.values(progress).reduce((s, p) => s + p.levelsDone.length, 0);
  const completedIds = Object.keys(progress).filter((id) => progress[id].completed);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 pb-10">
      <div className="flex w-full items-center justify-between">
        <button type="button" className="kid-btn" onClick={() => { playSound('button'); onBack(); }}>
          ← Меню
        </button>
        <div className="flex items-center gap-2 text-xl font-black text-slate-600">
          <span className="text-3xl">👪</span> Родителям
        </div>
        <div className="w-20" />
      </div>

      <p className="rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
        Пазлов собрано: <span className="text-emerald-600">{completedCount}</span> из {TOTAL_PUZZLES}
        {' · '}Наклеек: <span className="text-amber-600">{stickers}</span> из {TOTAL_PUZZLES * 4}
      </p>

      {/* Как идёт игра */}
      <section className="w-full rounded-2xl bg-white/80 p-3 shadow-md">
        <h3 className="px-1 pb-2 text-base font-extrabold text-slate-700">Как идёт игра</h3>
        <div className="flex flex-col gap-1.5">
          {THEMES.map((t) => {
            const done = t.puzzles.filter((p) => progress[p.id]?.completed).length;
            const st = t.puzzles.reduce((s, p) => s + (progress[p.id]?.levelsDone.length ?? 0), 0);
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm shadow-sm">
                <span className="text-xl">{t.icon}</span>
                <span className="flex-1 font-extrabold" style={{ color: t.color }}>{t.name}</span>
                <span className="font-bold text-slate-500">пазлов {done}/{t.puzzles.length}</span>
                <span className="font-bold text-amber-600">наклеек {st}/{t.puzzles.length * 4}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Настройки */}
      <section className="w-full rounded-2xl bg-white/80 p-3 shadow-md">
        <h3 className="px-1 pb-2 text-base font-extrabold text-slate-700">Настройки</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-extrabold text-slate-600">Звук и голос</span>
            <button
              type="button"
              className={`kid-btn !min-h-0 !px-3 !py-1 !text-xs ${muted ? 'kid-btn-danger' : ''}`}
              onClick={() => { onToggleMute(); }}
            >
              {muted ? 'Выключен 🔇' : 'Включён 🔊'}
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-extrabold text-slate-600">Фоновая музыка</span>
            <button
              type="button"
              className={`kid-btn !min-h-0 !px-3 !py-1 !text-xs ${music ? '' : ''}`}
              onClick={() => { onToggleMusic(); }}
            >
              <span style={{ opacity: music ? 1 : 0.45 }}>{music ? 'Играет 🎵' : 'Тихо 🎵'}</span>
            </button>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-slate-600">Напоминание об отдыхе</span>
              <div className="flex gap-1">
                {BREAK_CHOICES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`min-h-9 min-w-12 rounded-lg px-2 py-1 text-xs font-black transition-all ${
                      breakMin === m
                        ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                    onClick={() => { playSound('button'); onBreakMin(m); }}
                  >
                    {m === 0 ? 'Выкл' : `${m} мин`}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-400">
              {breakMin > 0
                ? `После ${breakMin} минут игры появится подсказка «пора отдохнуть», и экран начнёт плавно затухать. Ребёнок жмёт «Мы отдохнули» — и играет дальше.`
                : 'Напоминание выключено.'}
            </p>
          </div>
        </div>
      </section>

      {/* Сохранить картинки */}
      <section className="w-full rounded-2xl bg-white/80 p-3 shadow-md">
        <h3 className="px-1 pb-2 text-base font-extrabold text-slate-700">Сохранить картинку на телефон</h3>
        {completedIds.length === 0 ? (
          <p className="px-1 text-xs font-semibold text-slate-400">
            Пока ничего не собрано — как только ребёнок соберёт пазл, картинку можно будет скачать
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {completedIds.map((id) => {
              const def = ALL_PUZZLES.find((p) => p.id === id);
              if (!def) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-xs font-extrabold text-slate-600 shadow-sm transition-transform active:scale-95"
                  onClick={() => { playSound('button'); downloadScenePng(def.sceneId, def.name); }}
                >
                  <span className="text-lg">{def.icon}</span>
                  <span className="flex-1">{def.name}</span>
                  <span className="text-slate-400">⬇</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Сброс прогресса */}
      <ResetZone />
    </div>
  );
}

/* ---------- Альбом наклеек (v1.5) ----------
   Наклейка = пазл, собранный на одной из сложностей (6/12/24/48).
   Данные берутся прямо из прогресса — ничего нового не сохраняем.
   Неоткрытые пазлы видны силуэтом с замком: хочется собрать! */

interface AlbumScreenProps {
  onBack: () => void;
}

const ALBUM_LEVELS = [6, 12, 24, 48];

export function AlbumScreen({ onBack }: AlbumScreenProps) {
  const [progress, setProgress] = useState<Record<string, PuzzleProgress>>({});

  useEffect(() => {
    // Разовое чтение внешнего хранилища при открытии альбома
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  const stickers = Object.values(progress).reduce((s, p) => s + p.levelsDone.length, 0);
  const totalStickers = TOTAL_PUZZLES * ALBUM_LEVELS.length;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 pb-8">
      <div className="flex w-full items-center justify-between">
        <button type="button" className="kid-btn" onClick={() => { playSound('button'); onBack(); }}>
          ← Меню
        </button>
        <div className="flex items-center gap-2 text-xl font-black text-amber-600">
          <span className="text-3xl">📔</span> Мой альбом
        </div>
        <div className="w-20" />
      </div>
      <p className="-mt-1 rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
        Наклеек: <span className="text-amber-600">{stickers}</span> из {totalStickers}
      </p>
      {stickers === 0 && (
        <p className="text-xs font-semibold text-slate-400">
          Собери первый пазл — и здесь появится наклейка!
        </p>
      )}

      {THEMES.map((theme) => {
        const earned = theme.puzzles.reduce(
          (s, p) => s + (progress[p.id]?.levelsDone.length ?? 0), 0,
        );
        return (
          <section key={theme.id} className="w-full rounded-2xl bg-white/80 p-3 shadow-md">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="flex items-center gap-2 text-base font-extrabold" style={{ color: theme.color }}>
                <span className="text-2xl">{theme.icon}</span> {theme.name}
              </span>
              <span className="text-xs font-bold text-slate-400">{earned}/{theme.puzzles.length * ALBUM_LEVELS.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {theme.puzzles.map((puzzle) => {
                const levels = progress[puzzle.id]?.levelsDone ?? [];
                const any = levels.length > 0;
                return (
                  <div key={puzzle.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
                    <div
                      className={`relative shrink-0 overflow-hidden rounded-xl shadow-sm ring-2 ring-white ${
                        any ? '' : 'opacity-25 grayscale'
                      }`}
                    >
                      <ScenePreview sceneId={puzzle.sceneId} size={56} className="block" />
                      {!any && (
                        <span className="absolute inset-0 flex items-center justify-center text-xl">🔒</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <span className="flex items-center gap-1.5 text-sm font-extrabold text-slate-700">
                        <span className="text-lg">{puzzle.icon}</span> {puzzle.name}
                      </span>
                      <span className="mt-1 flex gap-1.5" aria-label="Наклейки за сложности">
                        {ALBUM_LEVELS.map((lv) => {
                          const got = levels.includes(lv);
                          return (
                            <span
                              key={lv}
                              className={`flex h-6 w-9 items-center justify-center rounded-lg text-[11px] font-black ${
                                got
                                  ? 'bg-gradient-to-b from-amber-300 to-amber-400 text-white shadow-sm ring-1 ring-amber-400'
                                  : 'border-2 border-dashed border-slate-200 text-slate-300'
                              }`}
                            >
                              {got ? `${lv}★` : '?'}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                    {any && (
                      <button
                        type="button"
                        aria-label={`История: ${puzzle.name}`}
                        className="kid-btn !px-2.5 !py-1.5 !text-base"
                        onClick={() => { unlockAudio(); playSound('button'); speak(puzzle.story); }}
                      >
                        🔊
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="pb-2 text-center text-[10px] font-semibold text-slate-300">
        Наклейки не теряются — прогресс хранится в этом устройстве
      </p>
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
