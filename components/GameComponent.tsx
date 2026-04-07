'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CATEGORIES,
  getAllLocations,
  type CategoryId,
  type Category,
  DEFAULT_CATEGORY_IDS,
} from '../data/themes';
import animeWords from '../data/animeWords.json';
import moviesWords from '../data/moviesWords.json';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GamePhase =
  | 'setup'
  | 'categories'
  | 'passing'
  | 'reveal'
  | 'playing'
  | 'settings';

interface GameSettings {
  playersCount: number;
  timerMinutes: number;
  selectedCategories: CategoryId[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const vibrate = (pattern: number | number[]): void => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T,>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const LS_CUSTOM_KEY = 'spy_custom_locations';
const LS_SETTINGS_KEY = 'spy_settings';

const loadFromLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveToLS = (key: string, value: unknown): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const animeWordPool: string[] = [
  ...animeWords.animeWords.characters,
  ...animeWords.animeWords.items,
  ...animeWords.animeWords.misc,
];

const moviesWordPool: string[] = [
  ...moviesWords.moviesWords.characters,
  ...moviesWords.moviesWords.locations,
  ...moviesWords.moviesWords.plots,
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -30, scale: 0.97, transition: { duration: 0.25, ease: 'easeIn' } },
};

const flipVariants = {
  initial: { rotateY: 90, opacity: 0 },
  animate: { rotateY: 0,  opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { rotateY: -90, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface CyberButtonProps {
  onClick?: () => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'danger' | 'success' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CyberButton: React.FC<CyberButtonProps> = ({
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  size = 'md',
}) => {
  const sizeClasses: Record<string, string> = {
    sm:  'px-4 py-2 text-sm',
    md:  'px-6 py-3 text-base',
    lg:  'px-8 py-4 text-lg',
    xl:  'px-10 py-5 text-xl',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-gradient-to-r from-deep-purple to-neon-blue text-white border border-neon-blue/30 shadow-neon-blue hover:shadow-neon-purple',
    danger:  'bg-gradient-to-r from-red-900 to-cyber-pink text-white border border-cyber-pink/30 shadow-neon-pink',
    success: 'bg-gradient-to-r from-acid-dim to-neon-blue text-black font-bold border border-acid-green/40 shadow-neon-green',
    ghost:   'bg-glass-white text-white border border-glass-border backdrop-blur-cyber',
    outline: 'bg-transparent text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/10',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={() => { if (!disabled) { vibrate(30); onClick?.(); } }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
      className={`
        relative rounded-glass font-mono font-semibold tracking-widest uppercase
        transition-all duration-200 select-none touch-none
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Scanline overlay */}
      <span
        className="absolute inset-0 rounded-glass overflow-hidden pointer-events-none opacity-20"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// Glass Card
const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'pink' | 'none';
}> = ({ children, className = '', glowColor = 'none' }) => {
  const glowMap: Record<string, string> = {
    blue:   'shadow-neon-blue border-neon-blue/20',
    purple: 'shadow-neon-purple border-deep-purple/30',
    green:  'shadow-neon-green border-acid-green/20',
    pink:   'shadow-neon-pink border-cyber-pink/20',
    none:   'shadow-glass border-glass-border',
  };

  return (
    <div
      className={`
        rounded-glass border backdrop-blur-cyber
        bg-gradient-to-br from-white/[0.07] to-white/[0.02]
        ${glowMap[glowColor]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Neon Divider
const NeonDivider: React.FC<{ color?: string }> = ({ color = '#00D4FF' }) => (
  <div
    className="w-full h-px my-4"
    style={{
      background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
      boxShadow: `0 0 8px ${color}`,
    }}
  />
);

// Scanline effect overlay (decorative)
const ScanlineOverlay: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
    style={{
      background:
        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GameComponent(): JSX.Element {
  // ── Persisted settings ──────────────────────────────────────────────────
  const [settings, setSettings] = useState<GameSettings>(() =>
    loadFromLS<GameSettings>(LS_SETTINGS_KEY, {
      playersCount: 5,
      timerMinutes: 8,
      selectedCategories: DEFAULT_CATEGORY_IDS.slice(0, 4) as CategoryId[],
    })
  );

  const [customLocations, setCustomLocations] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_CUSTOM_KEY, [])
  );

  // ── Game state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [spyIndices, setSpyIndices] = useState<Set<number>>(new Set());
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [isRoleVisible, setIsRoleVisible] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const [customInput, setCustomInput] = useState<string>('');
  const [showLocationList, setShowLocationList] = useState<boolean>(false);
  const [timerWarning, setTimerWarning] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist settings ────────────────────────────────────────────────────
  useEffect(() => {
    saveToLS(LS_SETTINGS_KEY, settings);
  }, [settings]);

  // ── Timer logic ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning || timerSeconds <= 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (timerSeconds === 0 && isTimerRunning) {
        setIsTimerRunning(false);
        vibrate([300, 100, 300, 100, 600]);
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimerSeconds((prev) => {
        const next = prev - 1;
        if (next <= 30 && !timerWarning) {
          setTimerWarning(true);
          vibrate([50]);
        }
        if (next % 60 === 0 && next > 0) vibrate(30);
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timerSeconds, timerWarning]);

  // ── Game logic ──────────────────────────────────────────────────────────

  const startGame = useCallback((): void => {
    vibrate([50, 40, 100]);

    const includeAnimeWords = settings.selectedCategories.includes('anime');
    const includeMoviesWords = settings.selectedCategories.includes('movies');
    const selectedBaseCategories = settings.selectedCategories.filter(
      (id) => id !== 'anime' && id !== 'movies'
    );

    const allLocations: string[] = [
      ...getAllLocations(selectedBaseCategories),
      ...(includeAnimeWords ? animeWordPool : []),
      ...(includeMoviesWords ? moviesWordPool : []),
      ...customLocations,
    ];

    if (allLocations.length === 0) return;

    const location = pickRandom(allLocations);
    const spyCount = settings.playersCount >= 7 ? 2 : 1;

    const indices = new Set<number>();
    while (indices.size < spyCount) {
      indices.add(randomInt(0, settings.playersCount - 1));
    }

    setCurrentLocation(location);
    setSpyIndices(indices);
    setCurrentPlayer(0);
    setTimerSeconds(settings.timerMinutes * 60);
    setIsTimerRunning(false);
    setIsRoleVisible(false);
    setTimerWarning(false);
    setShowLocationList(false);
    setPhase('passing');
  }, [settings, customLocations]);

  const goToReveal = useCallback((): void => {
    vibrate(40);
    setIsRoleVisible(false);
    setPhase('reveal');
  }, []);

  const handleRevealDone = useCallback((): void => {
    vibrate(30);
    setIsRoleVisible(false);
    const nextPlayer = currentPlayer + 1;
    if (nextPlayer < settings.playersCount) {
      setCurrentPlayer(nextPlayer);
      setPhase('passing');
    } else {
      setIsTimerRunning(true);
      setPhase('playing');
    }
  }, [currentPlayer, settings.playersCount]);

  const handleRevealPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>): void => {
      e.preventDefault();
      vibrate([30, 20, 60]);
      setIsRoleVisible(true);
    },
    []
  );

  const handleRevealPointerUp = useCallback(
    (_e: ReactPointerEvent<HTMLButtonElement>): void => {
      setIsRoleVisible(false);
    },
    []
  );

  const toggleTimer = useCallback((): void => {
    vibrate(30);
    setIsTimerRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback((): void => {
    vibrate([30, 30]);
    setIsTimerRunning(false);
    setTimerSeconds(settings.timerMinutes * 60);
    setTimerWarning(false);
  }, [settings.timerMinutes]);

  const addCustomLocation = useCallback((): void => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const updated = [...customLocations, trimmed];
    setCustomLocations(updated);
    saveToLS(LS_CUSTOM_KEY, updated);
    setCustomInput('');
    vibrate([20, 10, 20]);
  }, [customInput, customLocations]);

  const removeCustomLocation = useCallback(
    (index: number): void => {
      const updated = customLocations.filter((_, i) => i !== index);
      setCustomLocations(updated);
      saveToLS(LS_CUSTOM_KEY, updated);
      vibrate(20);
    },
    [customLocations]
  );

  const toggleCategory = useCallback(
    (id: CategoryId): void => {
      vibrate(20);
      setSettings((prev) => ({
        ...prev,
        selectedCategories: prev.selectedCategories.includes(id)
          ? prev.selectedCategories.filter((c) => c !== id)
          : [...prev.selectedCategories, id],
      }));
    },
    []
  );

  const isSpy = (playerIndex: number): boolean => spyIndices.has(playerIndex);

  // ── All possible locations for spy reference ─────────────────────────────
  const includeAnimeWords = settings.selectedCategories.includes('anime');
  const includeMoviesWords = settings.selectedCategories.includes('movies');
  const selectedBaseCategories = settings.selectedCategories.filter(
    (id) => id !== 'anime' && id !== 'movies'
  );
  const allGameLocations = [
    ...getAllLocations(selectedBaseCategories),
    ...(includeAnimeWords ? animeWordPool : []),
    ...(includeMoviesWords ? moviesWordPool : []),
    ...customLocations,
  ].sort();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Setup Screen
  // ─────────────────────────────────────────────────────────────────────────

  const renderSetup = (): JSX.Element => (
    <motion.div
      key="setup"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-screen p-6 gap-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="pt-8 text-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl font-cyber font-black tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #00D4FF, #6B00FF, #39FF14)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.4))',
          }}
        >
          SPY
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3 }}
          className="text-xs tracking-[0.4em] text-neon-blue/60 mt-1 font-mono"
        >
          ULTIMATE EDITION
        </motion.p>
      </div>

      <NeonDivider />

      {/* Player Count */}
      <GlassCard className="p-5" glowColor="blue">
        <p className="text-xs tracking-widest text-neon-blue/70 mb-4 font-mono uppercase">
          👥 Number of Players
        </p>
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({
                ...prev,
                playersCount: Math.max(3, prev.playersCount - 1),
              }));
            }}
            className="w-14 h-14 rounded-full border border-neon-blue/30 text-neon-blue text-2xl font-bold flex items-center justify-center bg-neon-blue/5 hover:bg-neon-blue/10 active:bg-neon-blue/20"
          >
            −
          </motion.button>

          <div className="text-center flex-1">
            <span
              className="text-6xl font-cyber font-black"
              style={{
                color: '#00D4FF',
                textShadow: '0 0 20px rgba(0,212,255,0.6)',
              }}
            >
              {settings.playersCount}
            </span>
            <p className="text-xs text-white/30 mt-1 font-mono">
              {settings.playersCount >= 7 ? '2 spies' : '1 spy'}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({
                ...prev,
                playersCount: Math.min(12, prev.playersCount + 1),
              }));
            }}
            className="w-14 h-14 rounded-full border border-neon-blue/30 text-neon-blue text-2xl font-bold flex items-center justify-center bg-neon-blue/5 hover:bg-neon-blue/10 active:bg-neon-blue/20"
          >
            +
          </motion.button>
        </div>
      </GlassCard>

      {/* Timer */}
      <GlassCard className="p-5" glowColor="purple">
        <p className="text-xs tracking-widest text-purple-glow/70 mb-4 font-mono uppercase">
          ⏱️ Timer (minutes)
        </p>
        <div className="flex gap-3 flex-wrap">
          {[3, 5, 7, 8, 10, 12].map((m) => (
            <motion.button
              key={m}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                vibrate(20);
                setSettings((prev) => ({ ...prev, timerMinutes: m }));
              }}
              className={`
                flex-1 min-w-[3.5rem] h-12 rounded-lg font-mono font-bold text-sm
                border transition-all duration-200
                ${
                  settings.timerMinutes === m
                    ? 'bg-deep-purple/80 border-purple-glow text-white shadow-neon-purple'
                    : 'bg-white/5 border-white/10 text-white/50'
                }
              `}
            >
              {m}m
            </motion.button>
          ))}
        </div>
      </GlassCard>

      {/* Selected Categories Preview */}
      <GlassCard className="p-5" glowColor="green">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-widest text-acid-green/70 font-mono uppercase">
            🗂️ Categories ({settings.selectedCategories.length})
          </p>
          <CyberButton
            variant="outline"
            size="sm"
            onClick={() => setPhase('categories')}
          >
            Edit
          </CyberButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) =>
            settings.selectedCategories.includes(c.id)
          ).map((c) => (
            <span
              key={c.id}
              className="text-xs px-2.5 py-1 rounded-full bg-acid-green/10 border border-acid-green/20 text-acid-green/80 font-mono"
            >
              {c.emoji} {c.name}
            </span>
          ))}
          {settings.selectedCategories.length === 0 && (
            <span className="text-xs text-red-400/70 font-mono">
              ⚠️ Select at least one category
            </span>
          )}
        </div>
      </GlassCard>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pb-8">
        <CyberButton
          variant="primary"
          size="xl"
          onClick={startGame}
          disabled={settings.selectedCategories.length === 0}
          className="w-full"
        >
          ▶ Start Game
        </CyberButton>

        <div className="flex gap-3">
          <CyberButton
            variant="ghost"
            size="md"
            onClick={() => setPhase('settings')}
            className="flex-1"
          >
            ⚙ Settings
          </CyberButton>
          <CyberButton
            variant="ghost"
            size="md"
            onClick={() => setPhase('categories')}
            className="flex-1"
          >
            🗂 Categories
          </CyberButton>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Category Selector
  // ─────────────────────────────────────────────────────────────────────────

  const renderCategories = (): JSX.Element => (
    <motion.div
      key="categories"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-screen p-6 gap-4 overflow-y-auto"
    >
      <div className="flex items-center gap-4 pt-6">
        <button
          onClick={() => { vibrate(20); setPhase('setup'); }}
          className="text-neon-blue/70 text-2xl"
        >
          ←
        </button>
        <h2
          className="text-xl font-cyber font-bold tracking-widest"
          style={{ color: '#00D4FF', textShadow: '0 0 10px rgba(0,212,255,0.5)' }}
        >
          Categories
        </h2>
      </div>

      <p className="text-xs text-white/40 font-mono">
        Tap to toggle. Selected: {settings.selectedCategories.length}/{CATEGORIES.length}
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3 pb-8"
      >
        {CATEGORIES.map((cat: Category) => {
          const selected = settings.selectedCategories.includes(cat.id);
          return (
            <motion.div key={cat.id} variants={staggerItem}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleCategory(cat.id)}
                className={`
                  w-full p-4 rounded-glass border text-left
                  transition-all duration-300 backdrop-blur-cyber
                  ${
                    selected
                      ? 'border-neon-blue/40 bg-gradient-to-r from-white/[0.08] to-white/[0.02] shadow-neon-blue'
                      : 'border-white/5 bg-white/[0.02]'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <p className={`font-mono font-bold text-sm ${selected ? 'text-white' : 'text-white/50'}`}>
                        {cat.name}
                      </p>
                      <p className="text-xs text-white/25 font-mono">
                        {cat.locations.length} locations
                      </p>
                    </div>
                  </div>
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      transition-all duration-200
                      ${selected ? 'border-neon-blue bg-neon-blue' : 'border-white/20'}
                    `}
                  >
                    {selected && (
                      <span className="text-black text-xs font-bold">✓</span>
                    )}
                  </div>
                </div>

                {/* Location preview */}
                {selected && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {cat.locations.slice(0, 4).map((loc) => (
                      <span
                        key={loc}
                        className="text-xs px-2 py-0.5 rounded-full bg-neon-blue/10 text-neon-blue/60 font-mono"
                      >
                        {loc}
                      </span>
                    ))}
                    {cat.locations.length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30 font-mono">
                        +{cat.locations.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Pass the Phone
  // ─────────────────────────────────────────────────────────────────────────

  const renderPassing = (): JSX.Element => (
    <motion.div
      key={`passing-${currentPlayer}`}
      variants={flipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 text-center"
    >
      {/* Progress dots */}
      <div className="flex gap-2">
        {Array.from({ length: settings.playersCount }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < currentPlayer
                ? 'w-6 bg-acid-green'
                : i === currentPlayer
                ? 'w-8 bg-neon-blue shadow-neon-blue'
                : 'w-3 bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-8xl"
      >
        📱
      </motion.div>

      {/* Text */}
      <div className="space-y-2">
        <p className="text-sm tracking-[0.3em] text-white/40 font-mono uppercase">
          Pass the phone to
        </p>
        <h2
          className="text-5xl font-cyber font-black tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #00D4FF, #6B00FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 15px rgba(0,212,255,0.5))',
          }}
        >
          Player {currentPlayer + 1}
        </h2>
        <p className="text-white/30 font-mono text-sm">
          {settings.playersCount - currentPlayer - 1 > 0
            ? `${settings.playersCount - currentPlayer - 1} players remaining`
            : 'Last player'}
        </p>
      </div>

      <NeonDivider />

      <div className="w-full flex flex-col gap-3">
        <CyberButton
          variant="primary"
          size="xl"
          onClick={goToReveal}
          className="w-full"
        >
          I'm Ready →
        </CyberButton>
      </div>

      <p className="text-xs text-white/20 font-mono text-center max-w-xs">
        Make sure no other players can see the screen
      </p>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Role Reveal
  // ─────────────────────────────────────────────────────────────────────────

  const renderReveal = (): JSX.Element => {
    const spy = isSpy(currentPlayer);

    return (
      <motion.div
        key={`reveal-${currentPlayer}`}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 text-center"
      >
        <div className="space-y-1">
          <p className="text-xs tracking-[0.4em] text-white/30 font-mono uppercase">
            Player {currentPlayer + 1} of {settings.playersCount}
          </p>
          <h3 className="text-lg font-mono text-white/60">Your Role</h3>
        </div>

        {/* Hold to reveal */}
        <motion.div className="relative">
          {/* Glow ring when revealed */}
          <AnimatePresence>
            {isRoleVisible && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`absolute inset-0 rounded-full blur-2xl ${
                  spy ? 'bg-cyber-pink/30' : 'bg-neon-blue/25'
                }`}
              />
            )}
          </AnimatePresence>

          <motion.button
            onPointerDown={handleRevealPointerDown}
            onPointerUp={handleRevealPointerUp}
            onPointerLeave={handleRevealPointerUp}
            onContextMenu={(e) => e.preventDefault()}
            whileTap={{ scale: 0.97 }}
            className={`
              relative w-64 h-64 rounded-full border-2
              flex flex-col items-center justify-center gap-4
              select-none touch-none
              backdrop-blur-cyber transition-all duration-300
              ${
                isRoleVisible
                  ? spy
                    ? 'border-cyber-pink bg-cyber-pink/10 shadow-neon-pink'
                    : 'border-neon-blue bg-neon-blue/10 shadow-neon-blue'
                  : 'border-white/20 bg-white/5'
              }
            `}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <AnimatePresence mode="wait">
              {isRoleVisible ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, scale: 0.6, filter: 'blur(15px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-3"
                >
                  {spy ? (
                    <>
                      <span className="text-5xl">🕵️</span>
                      <span
                        className="text-3xl font-cyber font-black tracking-widest"
                        style={{
                          color: '#FF006E',
                          textShadow: '0 0 20px rgba(255,0,110,0.8)',
                        }}
                      >
                        SPY
                      </span>
                      <span className="text-xs font-mono text-cyber-pink/70 max-w-[180px] text-center">
                        Blend in. Find the location.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl">📍</span>
                      <span
                        className="text-lg font-cyber font-bold tracking-wide"
                        style={{
                          color: '#00D4FF',
                          textShadow: '0 0 15px rgba(0,212,255,0.7)',
                        }}
                      >
                        {currentLocation}
                      </span>
                      <span className="text-xs font-mono text-neon-blue/60">
                        You are NOT the spy
                      </span>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <span className="text-4xl opacity-60">🔒</span>
                  <span className="text-sm font-mono text-white/50 tracking-widest">
                    HOLD TO REVEAL
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        <p className="text-xs text-white/25 font-mono max-w-xs">
          Press and hold the circle to see your role. Release to hide it.
        </p>

        <CyberButton
          variant={spy ? 'danger' : 'success'}
          size="lg"
          onClick={handleRevealDone}
          className="w-full max-w-xs"
        >
          Done ✓
        </CyberButton>
      </motion.div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Playing Screen (Timer + Locations)
  // ─────────────────────────────────────────────────────────────────────────

  const renderPlaying = (): JSX.Element => {
    const progress = timerSeconds / (settings.timerMinutes * 60);
    const circumference = 2 * Math.PI * 90;
    const strokeDash = circumference * progress;
    const isUrgent = timerSeconds <= 30;
    const isEnded = timerSeconds === 0;

    return (
      <motion.div
        key="playing"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col min-h-screen p-6 gap-5 overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pt-6">
          <h2
            className="text-xl font-cyber font-bold tracking-widest"
            style={{ color: isUrgent ? '#FF006E' : '#00D4FF' }}
          >
            {isEnded ? '⚠ TIME\'S UP' : '▶ IN PLAY'}
          </h2>
          <CyberButton
            variant="ghost"
            size="sm"
            onClick={() => {
              vibrate([20, 20]);
              setIsTimerRunning(false);
              setPhase('setup');
            }}
          >
            ✕ End
          </CyberButton>
        </div>

        {/* Timer Circle */}
        <div className="flex justify-center py-4">
          <div className="relative w-52 h-52">
            <svg width="208" height="208" viewBox="0 0 208 208" className="-rotate-90">
              {/* BG ring */}
              <circle
                cx="104" cy="104" r="90"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              {/* Progress ring */}
              <circle
                cx="104" cy="104" r="90"
                fill="none"
                stroke={isUrgent ? '#FF006E' : isEnded ? '#333' : '#00D4FF'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - strokeDash}
                style={{
                  transition: 'stroke-dashoffset 1s linear, stroke 0.5s',
                  filter: `drop-shadow(0 0 8px ${isUrgent ? '#FF006E' : '#00D4FF'})`,
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                animate={
                  isUrgent && isTimerRunning
                    ? { scale: [1, 1.05, 1], color: ['#FF006E', '#FF4500', '#FF006E'] }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
                className="text-5xl font-cyber font-black"
                style={{
                  color: isUrgent ? '#FF006E' : '#00D4FF',
                  textShadow: `0 0 20px ${isUrgent ? 'rgba(255,0,110,0.7)' : 'rgba(0,212,255,0.6)'}`,
                }}
              >
                {formatTime(timerSeconds)}
              </motion.span>
              <span className="text-xs text-white/30 font-mono mt-1 tracking-widest">
                {isEnded ? 'VOTE NOW' : isTimerRunning ? 'RUNNING' : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex gap-3">
          <CyberButton
            variant={isTimerRunning ? 'danger' : 'success'}
            size="md"
            onClick={toggleTimer}
            className="flex-1"
          >
            {isTimerRunning ? '⏸ Pause' : '▶ Resume'}
          </CyberButton>
          <CyberButton variant="ghost" size="md" onClick={resetTimer}>
            ↺ Reset
          </CyberButton>
        </div>

        <NeonDivider />

        {/* Location list toggle (for spy reference) */}
        <GlassCard className="p-4" glowColor={showLocationList ? 'green' : 'none'}>
          <button
            className="w-full flex items-center justify-between"
            onClick={() => {
              vibrate(20);
              setShowLocationList((prev) => !prev);
            }}
          >
            <span className="font-mono text-sm text-acid-green/80 tracking-widest uppercase">
              🗺️ Possible Locations ({allGameLocations.length})
            </span>
            <motion.span
              animate={{ rotate: showLocationList ? 180 : 0 }}
              className="text-acid-green/60 text-lg"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {showLocationList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 grid grid-cols-2 gap-2">
                  {allGameLocations.map((loc) => (
                    <div
                      key={loc}
                      className={`
                        text-xs px-2.5 py-2 rounded-lg font-mono
                        border transition-colors
                        border-white/5 bg-white/[0.02] text-white/50
                      `}
                    >
                      {loc}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Spy count info */}
        <GlassCard className="p-4" glowColor="purple">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-purple-glow/80">
              🕵️ Spy count
            </span>
            <span
              className="text-2xl font-cyber font-black"
              style={{ color: '#FF006E', textShadow: '0 0 10px rgba(255,0,110,0.5)' }}
            >
              {spyIndices.size}
            </span>
          </div>
          <p className="text-xs text-white/25 font-mono mt-1">
            {settings.playersCount} players · {settings.timerMinutes} min game
          </p>
        </GlassCard>

        <div className="pb-8" />
      </motion.div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Settings
  // ─────────────────────────────────────────────────────────────────────────

  const renderSettings = (): JSX.Element => (
    <motion.div
      key="settings"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-screen p-6 gap-5 overflow-y-auto"
    >
      <div className="flex items-center gap-4 pt-6">
        <button
          onClick={() => { vibrate(20); setPhase('setup'); }}
          className="text-neon-blue/70 text-2xl"
        >
          ←
        </button>
        <h2
          className="text-xl font-cyber font-bold tracking-widest"
          style={{ color: '#00D4FF', textShadow: '0 0 10px rgba(0,212,255,0.5)' }}
        >
          Settings
        </h2>
      </div>

      {/* Custom Locations */}
      <GlassCard className="p-5" glowColor="blue">
        <p className="text-xs tracking-widest text-neon-blue/70 mb-4 font-mono uppercase">
          ➕ Add Custom Locations
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomLocation();
            }}
            placeholder="e.g. Your City Coffee Shop"
            className={`
              flex-1 bg-white/5 border border-white/10 rounded-lg
              px-4 py-3 text-sm font-mono text-white placeholder-white/25
              focus:outline-none focus:border-neon-blue/50 focus:shadow-neon-blue
              transition-all duration-200
            `}
            maxLength={50}
          />
          <CyberButton variant="primary" size="sm" onClick={addCustomLocation}>
            Add
          </CyberButton>
        </div>

        {/* Custom list */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {customLocations.length === 0 ? (
            <p className="text-xs text-white/20 font-mono text-center py-4">
              No custom locations yet
            </p>
          ) : (
            customLocations.map((loc, i) => (
              <motion.div
                key={`${loc}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"
              >
                <span className="text-sm font-mono text-white/70">{loc}</span>
                <button
                  onClick={() => removeCustomLocation(i)}
                  className="text-red-400/60 hover:text-red-400 text-lg ml-2 px-2"
                >
                  ✕
                </button>
              </motion.div>
            ))
          )}
        </div>

        {customLocations.length > 0 && (
          <p className="text-xs text-acid-green/50 font-mono mt-2">
            ✓ {customLocations.length} custom location(s) saved to device
          </p>
        )}
      </GlassCard>

      {/* About */}
      <GlassCard className="p-5" glowColor="none">
        <p className="text-xs tracking-widest text-white/30 mb-3 font-mono uppercase">
          ℹ️ How to Play
        </p>
        <div className="space-y-2 text-xs text-white/40 font-mono leading-relaxed">
          <p>1. Set players and select categories.</p>
          <p>2. Each player gets a secret role — civilian or spy.</p>
          <p>3. Civilians know the location. The spy does not.</p>
          <p>4. Ask questions. Find the spy before time runs out.</p>
          <p>5. The spy wins by guessing the location correctly.</p>
        </div>
      </GlassCard>

      <div className="pb-8">
        <CyberButton
          variant="primary"
          size="lg"
          onClick={() => setPhase('setup')}
          className="w-full"
        >
          ← Back to Setup
        </CyberButton>
      </div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <ScanlineOverlay />

      {/* Background ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(107,0,255,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 80%, rgba(0,212,255,0.05) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 50%, rgba(57,255,20,0.03) 0%, transparent 70%)
          `,
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {phase === 'setup' && renderSetup()}
          {phase === 'categories' && renderCategories()}
          {phase === 'passing' && renderPassing()}
          {phase === 'reveal' && renderReveal()}
          {phase === 'playing' && renderPlaying()}
          {phase === 'settings' && renderSettings()}
        </AnimatePresence>
      </div>
    </div>
  );
}
