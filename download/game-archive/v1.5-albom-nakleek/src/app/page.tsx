'use client';

/* ============================================================
   МИР ПО КУСОЧКАМ — главная страница
   Экраны: выбор мира -> список пазлов -> игра.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import {
  type DifficultyLevel, type PuzzleDef, type ThemeDef,
} from '@/lib/puzzle-data';
import { DIFFICULTIES } from '@/lib/puzzle-data';
import PuzzleBoard from '@/components/game/PuzzleBoard';
import { HomeScreen, PuzzleListScreen, AlbumScreen } from '@/components/game/MenuScreens';
import {
  loadSettings, saveSettings, setSoundMuted, setVoiceMuted,
  playSound, stopSpeaking, unlockAudio, savePuzzleResult, loadSession,
} from '@/lib/game-services';

type Screen =
  | { kind: 'home' }
  | { kind: 'list'; theme: ThemeDef }
  | { kind: 'game'; theme: ThemeDef; puzzle: PuzzleDef; difficulty: DifficultyLevel }
  | { kind: 'album' };

export default function Page() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [muted, setMuted] = useState(false);
  const [hydrationKey, setHydrationKey] = useState(0);

  /* Настройки звука сохраняются между визитами */
  useEffect(() => {
    const s = loadSettings();
    // Разовое чтение localStorage при монтировании
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(s.muted);
    setSoundMuted(s.muted);
    setVoiceMuted(s.muted);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      setVoiceMuted(next);
      saveSettings({ ...loadSettings(), muted: next });
      if (!next) playSound('button');
      return next;
    });
  }, []);

  /* ----- Переходы между экранами ----- */
  const openTheme = useCallback((theme: ThemeDef) => {
    setScreen({ kind: 'list', theme });
  }, []);

  /* Если у пазла есть незаконченная сессия — открываем на её сложности,
     иначе начинаем с самой простой (6 кусочков) */
  const startPuzzle = useCallback((theme: ThemeDef, puzzle: PuzzleDef, pieces?: number) => {
    unlockAudio();
    let diff = DIFFICULTIES[0];
    if (pieces) {
      diff = DIFFICULTIES.find((d) => d.pieces === pieces) ?? diff;
    } else {
      const s = loadSession(puzzle.id);
      if (s && s.snapped > 0) diff = DIFFICULTIES.find((d) => d.pieces === s.pieces) ?? diff;
    }
    setScreen({ kind: 'game', theme, puzzle, difficulty: diff });
  }, []);

  const backToHome = useCallback(() => {
    stopSpeaking();
    setScreen({ kind: 'home' });
    setHydrationKey((k) => k + 1);
  }, []);

  const backToList = useCallback(() => {
    stopSpeaking();
    setScreen((s) => (s.kind === 'game' ? { kind: 'list', theme: s.theme } : { kind: 'home' }));
    setHydrationKey((k) => k + 1);
  }, []);

  const changeDifficulty = useCallback((difficulty: DifficultyLevel) => {
    setScreen((s) => (s.kind === 'game' ? { ...s, difficulty } : s));
  }, []);

  const handleComplete = useCallback((pieces: number) => {
    setScreen((s) => {
      if (s.kind === 'game') {
        savePuzzleResult(s.puzzle.id, pieces);
      }
      return s;
    });
  }, []);

  return (
    /* На игровом экране нижний отступ убираем: уравнение подгонки поля
       резервирует ровно 28px «воздуха» — иначе на телефоне появляется
       пустой скролл под подносом */
    <main
      className={`kid-app flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden ${
        screen.kind === 'game' ? 'pb-0' : 'pb-10'
      }`}
    >
      {/* Плавающие облачка-украшения */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="deco-cloud left-[4%] top-[8%]">☁️</div>
        <div className="deco-cloud left-[84%] top-[14%]">☁️</div>
        <div className="deco-cloud left-[70%] top-[4%]">🎈</div>
        <div className="deco-cloud left-[10%] top-[70%]">🌈</div>
        <div className="deco-cloud left-[88%] top-[68%]">⭐</div>
        <div className="deco-cloud left-[6%] top-[40%]">🍃</div>
        <div className="deco-cloud left-[92%] top-[36%]">🦋</div>
      </div>

      <div className={`relative z-10 flex w-full flex-col items-center px-3 ${screen.kind === 'game' ? 'pb-0' : 'pb-10'}`}>
        {screen.kind === 'home' && (
          <HomeScreen
            onOpenTheme={openTheme}
            onResume={(t, p, pieces) => startPuzzle(t, p, pieces)}
            onPlay={(t, p, pieces) => startPuzzle(t, p, pieces)}
            onOpenAlbum={() => setScreen({ kind: 'album' })}
          />
        )}

        {screen.kind === 'album' && (
          <AlbumScreen key={`album-${hydrationKey}`} onBack={backToHome} />
        )}

        {screen.kind === 'list' && (
          <PuzzleListScreen
            key={`${screen.theme.id}-${hydrationKey}`}
            theme={screen.theme}
            onBack={backToHome}
            onStart={(p) => startPuzzle(screen.theme, p)}
          />
        )}

        {screen.kind === 'game' && (
          <div className="flex w-full flex-col items-center">
            <PuzzleBoard
              key={`${screen.puzzle.id}-${screen.difficulty.pieces}-${hydrationKey}`}
              theme={screen.theme}
              puzzle={screen.puzzle}
              difficulty={screen.difficulty}
              muted={muted}
              onExit={backToList}
              onDifficulty={changeDifficulty}
              onToggleMute={toggleMute}
              onComplete={handleComplete}
              onOpenAlbum={() => { setScreen({ kind: 'album' }); setHydrationKey((k) => k + 1); }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
