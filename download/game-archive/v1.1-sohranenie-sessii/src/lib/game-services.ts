/* ============================================================
   ИГРОВЫЕ СЕРВИСЫ
   1) Звуки — синтезируются WebAudio на лету (никаких файлов,
      ничего не может "не загрузиться")
   2) Голос — speechSynthesis, русские фразы
   3) Прогресс — localStorage (собранные пазлы сохраняются)
   4) Конфетти — DOM-частицы
   ============================================================ */

/* ---------- ЗВУКИ ---------- */

type SoundName =
  | 'pick'      // взяли деталь
  | 'drop'      // отпустили мимо
  | 'snap'      // деталь встала на место
  | 'win'       // пазл собран
  | 'button'    // нажатие кнопки
  | 'whoosh'    // рассыпание
  | 'star';     // звёздочка-бонус

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let soundMuted = false;

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

export function unlockAudio(): void {
  ensureAudio();
}

export function setSoundMuted(muted: boolean): void {
  soundMuted = muted;
}

/* Один тон с огибающей */
function tone(
  freq: number, dur: number, type: OscillatorType, vol: number,
  delay = 0, slideTo?: number,
): void {
  const ac = ensureAudio();
  if (!ac || !masterGain || soundMuted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/* Короткий шум (для "вжух") */
function noise(dur: number, vol: number, delay = 0, hp = 600): void {
  const ac = ensureAudio();
  if (!ac || !masterGain || soundMuted) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start(t0);
}

export function playSound(name: SoundName): void {
  if (soundMuted) return;
  switch (name) {
    case 'pick':
      tone(660, 0.09, 'triangle', 0.18, 0, 880);
      break;
    case 'drop':
      tone(330, 0.1, 'triangle', 0.12, 0, 220);
      break;
    case 'snap':
      tone(880, 0.07, 'square', 0.1);
      tone(1320, 0.12, 'triangle', 0.2, 0.05);
      tone(1760, 0.14, 'sine', 0.16, 0.09);
      break;
    case 'win': {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.12));
      tone(1567.98, 0.5, 'sine', 0.25, 0.62);
      tone(2093, 0.6, 'sine', 0.18, 0.7);
      break;
    }
    case 'button':
      tone(520, 0.06, 'sine', 0.12, 0, 700);
      break;
    case 'whoosh':
      noise(0.35, 0.22, 0, 900);
      break;
    case 'star':
      tone(1567.98, 0.1, 'sine', 0.15, 0, 2093);
      tone(2093, 0.16, 'sine', 0.12, 0.08);
      break;
  }
}

/* Фоновая музыка: простая нежная мелодия на петле */
let musicTimer: ReturnType<typeof setInterval> | null = null;
const MELODY = [
  392, 0, 523.25, 0, 587.33, 0, 523.25, 0,
  440, 0, 523.25, 0, 659.25, 0, 0, 0,
  392, 0, 523.25, 0, 587.33, 0, 659.25, 0,
  587.33, 0, 523.25, 0, 493.88, 0, 0, 0,
];
let melodyStep = 0;

export function startMusic(): void {
  if (musicTimer || typeof window === 'undefined') return;
  ensureAudio();
  musicTimer = setInterval(() => {
    const f = MELODY[melodyStep % MELODY.length];
    if (f > 0 && !soundMuted) tone(f, 0.5, 'sine', 0.045);
    melodyStep++;
  }, 340);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function isMusicPlaying(): boolean {
  return musicTimer !== null;
}

/* ---------- ГОЛОС ---------- */

let voiceMuted = false;

export function setVoiceMuted(muted: boolean): void {
  voiceMuted = muted;
  if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text: string, rate = 0.95): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || voiceMuted) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = rate;
    u.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const ru = voices.find((v) => v.lang?.toLowerCase().startsWith('ru'));
    if (ru) u.voice = ru;
    window.speechSynthesis.speak(u);
  } catch {
    /* голос недоступен — не страшно */
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/* ---------- ПРОГРЕСС ---------- */

export interface PuzzleProgress {
  completed: boolean;
  levelsDone: number[];
}

export interface GameSettings {
  muted: boolean;
  music: boolean;
  hint: boolean;
}

const PROGRESS_KEY = 'mkpz:progress:v1';
const SETTINGS_KEY = 'mkpz:settings:v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function loadProgress(): Record<string, PuzzleProgress> {
  if (typeof localStorage === 'undefined') return {};
  return safeParse<Record<string, PuzzleProgress>>(localStorage.getItem(PROGRESS_KEY), {});
}

export function savePuzzleResult(puzzleId: string, pieces: number): void {
  if (typeof localStorage === 'undefined') return;
  const all = loadProgress();
  const cur: PuzzleProgress = all[puzzleId] ?? { completed: false, levelsDone: [] };
  cur.completed = true;
  if (!cur.levelsDone.includes(pieces)) cur.levelsDone.push(pieces);
  all[puzzleId] = cur;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    /* хранилище недоступно */
  }
}

export function countCompleted(): number {
  return Object.values(loadProgress()).filter((p) => p.completed).length;
}

export function loadSettings(): GameSettings {
  if (typeof localStorage === 'undefined') return { muted: false, music: true, hint: true };
  return safeParse<GameSettings>(localStorage.getItem(SETTINGS_KEY), { muted: false, music: true, hint: true });
}

export function saveSettings(s: GameSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* хранилище недоступно */
  }
}

export function resetProgress(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* хранилище недоступно */
  }
}

/* ---------- СЕССИЯ СБОРКИ (незаконченный пазл) ----------
   Позиции деталей пишутся в долях поля (0..1), поэтому после
   поворота экрана или изменения размера окна они пересчитываются
   без потери прогресса. Хранятся только последние 6 сессий. */

export interface SessionPiece {
  i: number;   // индекс детали
  nx: number;  // x в долях поля (0..1)
  ny: number;  // y в долях поля (0..1)
  s: boolean;  // прилипла на своё место
}

export interface PuzzleSession {
  puzzleId: string;
  pieces: number;      // размер сложности (6/12/24/48)
  snapped: number;     // сколько уже стоит на местах
  total: number;       // всего деталей
  updatedAt: number;   // время последнего хода
  piecesState: SessionPiece[];
}

const SESSION_KEY = 'mkpz:session:v1';
const SESSIONS_KEPT = 6;

function readSessions(): Record<string, PuzzleSession> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PuzzleSession>) : {};
  } catch {
    return {};
  }
}

export function saveSession(session: PuzzleSession): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const all = readSessions();
    all[session.puzzleId] = session;
    const kept = Object.values(all)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, SESSIONS_KEPT);
    const trimmed: Record<string, PuzzleSession> = {};
    for (const s of kept) trimmed[s.puzzleId] = s;
    localStorage.setItem(SESSION_KEY, JSON.stringify(trimmed));
  } catch {
    /* хранилище недоступно */
  }
}

export function loadSession(puzzleId: string): PuzzleSession | null {
  return readSessions()[puzzleId] ?? null;
}

export function clearSession(puzzleId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const all = readSessions();
    if (all[puzzleId]) {
      delete all[puzzleId];
      localStorage.setItem(SESSION_KEY, JSON.stringify(all));
    }
  } catch {
    /* хранилище недоступно */
  }
}

export function getLatestSession(): PuzzleSession | null {
  const list = Object.values(readSessions());
  if (list.length === 0) return null;
  return list.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/* ---------- КОНФЕТТИ ---------- */

const CONFETTI_COLORS = [
  '#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc',
  '#ffa94d', '#f783ac', '#38d9a9', '#ffffff',
];

export function launchConfetti(container: HTMLElement, count = 90): void {
  const w = container.clientWidth;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('div');
    const size = 6 + Math.random() * 8;
    bit.style.position = 'absolute';
    bit.style.left = `${Math.random() * w}px`;
    bit.style.top = `${-20 - Math.random() * 60}px`;
    bit.style.width = `${size}px`;
    bit.style.height = `${size * (Math.random() > 0.5 ? 1 : 0.45)}px`;
    bit.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    bit.style.borderRadius = Math.random() > 0.6 ? '50%' : '2px';
    bit.style.pointerEvents = 'none';
    bit.style.zIndex = '3000';
    const drift = (Math.random() - 0.5) * 140;
    const dur = 1.6 + Math.random() * 1.6;
    const delay = Math.random() * 0.5;
    const spin = (Math.random() - 0.5) * 720;
    bit.style.setProperty('--cx', `${drift}px`);
    bit.style.setProperty('--rot', `${spin}deg`);
    bit.style.animation = `confetti-fall ${dur}s ${delay}s cubic-bezier(0.3,0.6,0.6,1) forwards`;
    container.appendChild(bit);
    setTimeout(() => bit.remove(), (dur + delay) * 1000 + 200);
  }
}

/* Звёздочки-искры при прилипании детали */
export function burstStars(container: HTMLElement, x: number, y: number): void {
  for (let i = 0; i < 7; i++) {
    const star = document.createElement('div');
    star.textContent = '✦';
    star.style.position = 'absolute';
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.fontSize = `${10 + Math.random() * 12}px`;
    star.style.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    star.style.pointerEvents = 'none';
    star.style.zIndex = '2500';
    const ang = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
    const dist = 24 + Math.random() * 30;
    star.style.setProperty('--sx', `${Math.cos(ang) * dist}px`);
    star.style.setProperty('--sy', `${Math.sin(ang) * dist}px`);
    star.style.animation = 'star-burst 0.6s ease-out forwards';
    container.appendChild(star);
    setTimeout(() => star.remove(), 900);
  }
}

/* ---------- Вибрация (на телефонах) ---------- */

export function buzz(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* не поддерживается */
    }
  }
}
