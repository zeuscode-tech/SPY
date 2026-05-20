"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  CATEGORIES,
  getAllLocations,
  type CategoryId,
  type Category,
  DEFAULT_CATEGORY_IDS,
} from "../data/themes";
import {
  WORD_DESCRIPTIONS,
  getCategoryDescription,
} from "../data/wordDescriptions";
import animeWords from "../data/animeWords.json";
import moviesWords from "../data/moviesWords.json";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GamePhase =
  | "setup"
  | "categories"
  | "reveal"
  | "starter"
  | "playing"
  | "settings"
  | "results";

type GameMode = "classic" | "different-word";


interface GameSettings {
  playersCount: number;
  spyCount: number;
  timerMinutes: number;
  gameMode: GameMode;
  selectedCategories: SelectableCategoryId[];
  playerNames: string[];
}

type ExtraCategoryId = "anime" | "movies";
type SelectableCategoryId = CategoryId | ExtraCategoryId;
type ParsedLocation = { word: string; description: string; raw: string };
type FingerTouch = { id: number; x: number; y: number; color: string };

const isBaseCategoryId = (id: SelectableCategoryId): id is CategoryId =>
  id !== "anime" && id !== "movies";

const getThemeDescription = (word: string): string | null => {
  const normalizedWord = word.trim().toLowerCase();
  for (const category of CATEGORIES) {
    for (const entry of category.locations) {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex <= 0) continue;
      const entryWord = entry.slice(0, separatorIndex).trim().toLowerCase();
      const entryDescription = entry.slice(separatorIndex + 1).trim();
      if (entryWord === normalizedWord && entryDescription) return entryDescription;
    }
  }
  return null;
};

const getLocationHint = (location: string, customLocations: string[]): string => {
  const themeDescription = getThemeDescription(location);
  if (themeDescription) return themeDescription;
  if (WORD_DESCRIPTIONS[location]) return WORD_DESCRIPTIONS[location];
  if (customLocations.includes(location)) return "пользовательское слово";
  if (animeWordPool.includes(location)) return "слово из аниме-тематики";
  if (moviesWordPool.includes(location)) return "слово из кино-тематики";
  const category = CATEGORIES.find((c) => c.locations.includes(location));
  return category ? getCategoryDescription(category.id) : "игровое слово";
};

const parseLocation = (rawLocation: string, customLocations: string[]): ParsedLocation => {
  const separatorIndex = rawLocation.indexOf(":");
  if (separatorIndex > 0) {
    const word = rawLocation.slice(0, separatorIndex).trim();
    const description = rawLocation.slice(separatorIndex + 1).trim();
    if (word && description) return { word, description, raw: rawLocation };
  }
  const word = rawLocation.trim();
  return { word, description: getLocationHint(word, customLocations), raw: rawLocation };
};

const getDefaultSpyCount = (playersCount: number): number =>
  playersCount >= 7 ? 2 : 1;

const clampSpyCount = (spyCount: number, playersCount: number): number =>
  Math.max(1, Math.min(spyCount, Math.max(1, playersCount - 1)));

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const vibrate = (pattern: number | number[]): void => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

const randomInt = (min: number, max: number): number =>
  (() => {
    const range = max - min + 1;
    if (range <= 1) return min;
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
      const maxUint = 0xffffffff;
      const limit = maxUint - (maxUint % range);
      let value = 0;
      do {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        value = buf[0];
      } while (value >= limit);
      return min + (value % range);
    }
    return Math.floor(Math.random() * range) + min;
  })();

const pickRandom = <T,>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const playSound = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1): void => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};

const playTick = () => playSound(600, "sine", 0.05, 0.03);
const playUrgentTick = () => playSound(1000, "triangle", 0.1, 0.05);
const playRevealSound = () => playSound(400, "sine", 0.2, 0.05);

const LS_CUSTOM_KEY = "spy_custom_locations";
const LS_SETTINGS_KEY = "spy_settings";
const LS_SPY_HISTORY_KEY = "spy_spy_history";
const LS_WORD_HISTORY_KEY = "spy_word_history";
const LS_CATEGORY_HISTORY_KEY = "spy_category_history";
const SPY_HISTORY_LIMIT = 80;
const WORD_HISTORY_LIMIT = 2500;
const CATEGORY_HISTORY_LIMIT = 120;

const loadFromLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveToLS = (key: string, value: unknown): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const pickBalancedSpies = (playersCount: number, spyCount: number): Set<number> => {
  const targetSpyCount = Math.max(1, Math.min(spyCount, Math.max(1, playersCount - 1)));
  const history = loadFromLS<number[]>(LS_SPY_HISTORY_KEY, []);
  const chosen: number[] = [];
  while (chosen.length < targetSpyCount) {
    const candidates = Array.from({ length: playersCount }, (_, i) => i).filter(
      (i) => !chosen.includes(i),
    );
    candidates.sort((a, b) => history.lastIndexOf(a) - history.lastIndexOf(b));
    const poolSize = Math.max(1, Math.min(candidates.length, targetSpyCount + 2));
    const weightedPool = candidates.slice(0, poolSize);
    chosen.push(pickRandom(weightedPool));
  }
  const nextHistory = [...history, ...chosen].slice(-SPY_HISTORY_LIMIT);
  saveToLS(LS_SPY_HISTORY_KEY, nextHistory);
  return new Set(chosen);
};

const pickBalancedWord = <T extends { word: string }>(pool: T[]): T => {
  if (pool.length === 0) return pool[0];
  const history = loadFromLS<string[]>(LS_WORD_HISTORY_KEY, []);
  const historySet = new Set(history.map((word) => word.toLowerCase()));
  const unseenCandidates = pool.filter((item) => !historySet.has(item.word.toLowerCase()));

  const candidates =
    unseenCandidates.length > 0
      ? unseenCandidates
      : [...pool].sort((a, b) => {
          const idxA = history.lastIndexOf(a.word);
          const idxB = history.lastIndexOf(b.word);
          return idxA - idxB;
        });

  const oldestSeenIndex =
    unseenCandidates.length > 0 ? -1 : history.lastIndexOf(candidates[0].word);
  const fairPool =
    unseenCandidates.length > 0
      ? candidates
      : candidates.filter((item) => history.lastIndexOf(item.word) === oldestSeenIndex);
  const chosen = pickRandom(fairPool.length > 0 ? fairPool : candidates);

  const nextHistory = [...history, chosen.word].slice(-WORD_HISTORY_LIMIT);
  saveToLS(LS_WORD_HISTORY_KEY, nextHistory);
  return chosen;
};

const pickBalancedCategory = <T extends { id: string }>(pools: T[]): T => {
  if (pools.length === 0) return pools[0];
  const history = loadFromLS<string[]>(LS_CATEGORY_HISTORY_KEY, []);
  const lastCategoryId = history[history.length - 1];
  const recentHistory = history.slice(-Math.max(6, pools.length * 2));
  const playablePools =
    pools.length > 1 ? pools.filter((pool) => pool.id !== lastCategoryId) : pools;

  const scoredPools = playablePools.map((pool) => {
    const recentCount = recentHistory.filter((id) => id === pool.id).length;
    const lastSeenIndex = history.lastIndexOf(pool.id);
    return { pool, recentCount, lastSeenIndex };
  });
  const lowestRecentCount = Math.min(...scoredPools.map((item) => item.recentCount));
  const leastUsedPools = scoredPools.filter((item) => item.recentCount === lowestRecentCount);
  const oldestSeenIndex = Math.min(...leastUsedPools.map((item) => item.lastSeenIndex));
  const fairPool = leastUsedPools
    .filter((item) => item.lastSeenIndex === oldestSeenIndex)
    .map((item) => item.pool);
  const chosen = pickRandom(fairPool.length > 0 ? fairPool : playablePools);
  const nextHistory = [...history, chosen.id].slice(-CATEGORY_HISTORY_LIMIT);
  saveToLS(LS_CATEGORY_HISTORY_KEY, nextHistory);
  return chosen;
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatSpyCount = (n: number): string => {
  if (n === 1) return "1 шпион";
  if (n >= 2 && n <= 4) return `${n} шпиона`;
  return `${n} шпионов`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    opacity: 0, y: -30, scale: 0.97,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

const flipVariants = {
  initial: { rotateY: 90, opacity: 0 },
  animate: {
    rotateY: 0, opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    rotateY: -90, opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
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

interface PillButtonProps {
  onClick?: () => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "success" | "ghost" | "outline";
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const PillButton: React.FC<PillButtonProps> = ({
  onClick, onPointerDown, onPointerUp, onPointerLeave,
  children, variant = "primary", className = "", disabled = false, size = "md",
}) => {
  const sizeClasses: Record<string, string> = {
    sm: "px-5 py-2.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    xl: "px-10 py-5 text-lg",
  };

  const getStyle = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return { background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" };
      case "danger":
        return { background: "linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)" };
      case "success":
        return { background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" };
      case "outline":
        return { borderColor: "#D946EF" };
      default:
        return {};
    }
  };

  const getClass = (): string => {
    switch (variant) {
      case "primary":
        return "text-white font-bold shadow-[0_4px_24px_rgba(139,92,246,0.4)]";
      case "danger":
        return "text-white font-bold shadow-[0_4px_20px_rgba(255,59,48,0.4)]";
      case "success":
        return "text-white font-bold shadow-[0_4px_20px_rgba(17,153,142,0.4)]";
      case "ghost":
        return "backdrop-blur-[14px] border border-white/[0.10] text-white bg-white/[0.07]";
      case "outline":
        return "bg-transparent border text-[#D946EF]";
      default:
        return "";
    }
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={() => { if (!disabled) { vibrate(30); onClick?.(); } }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
      style={getStyle()}
      className={`
        rounded-full font-sans font-semibold tracking-wide uppercase
        transition-all duration-200 select-none touch-none
        ${sizeClasses[size]}
        ${getClass()}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}> = ({ children, className = "", glow = false }) => (
  <div
    className={`rounded-[20px] border backdrop-blur-[20px] ${className}`}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
      borderColor: glow ? "rgba(217,70,239,0.22)" : "rgba(255,255,255,0.07)",
      boxShadow: glow
        ? "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px rgba(139,92,246,0.05)"
        : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
    }}
  >
    {children}
  </div>
);

const CoralDivider: React.FC = () => (
  <div
    className="w-full h-px my-4"
    style={{
      background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.55) 50%, transparent 100%)",
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GameComponent(): JSX.Element {
  // ── Persisted settings ──────────────────────────────────────────────────
  const [settings, setSettings] = useState<GameSettings>(() => {
    const loaded = loadFromLS<Partial<GameSettings>>(LS_SETTINGS_KEY, {});
    const playersCount =
      typeof loaded.playersCount === "number"
        ? Math.min(12, Math.max(3, loaded.playersCount))
        : 5;
    const loadedCategories =
      loaded.selectedCategories && loaded.selectedCategories.length > 0
        ? loaded.selectedCategories
        : (DEFAULT_CATEGORY_IDS.slice(0, 4) as SelectableCategoryId[]);
    const availableCategoryIds = new Set<SelectableCategoryId>([
      ...DEFAULT_CATEGORY_IDS,
      "anime",
      "movies",
    ]);
    const selectedCategories = loadedCategories.filter((id) => availableCategoryIds.has(id));
    return {
      playersCount,
      spyCount: clampSpyCount(
        typeof loaded.spyCount === "number"
          ? loaded.spyCount
          : getDefaultSpyCount(playersCount),
        playersCount,
      ),
      gameMode:
        loaded.gameMode === "different-word"
          ? "different-word"
          : "classic",

      timerMinutes:
        typeof loaded.timerMinutes === "number"
          ? Math.min(12, Math.max(3, loaded.timerMinutes))
          : 8,
      selectedCategories:
        selectedCategories.length > 0
          ? selectedCategories
          : (DEFAULT_CATEGORY_IDS.slice(0, 4) as SelectableCategoryId[]),
      playerNames: Array.isArray(loaded.playerNames) ? loaded.playerNames : [],
    };
  });

  const [customLocations, setCustomLocations] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_CUSTOM_KEY, []),
  );

  // ── Game state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [spyIndices, setSpyIndices] = useState<Set<number>>(new Set());

  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [currentLocationHint, setCurrentLocationHint] = useState<string>("");
  const [spyWord, setSpyWord] = useState<string>("");
  const [spyWordHint, setSpyWordHint] = useState<string>("");
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [isRoleVisible, setIsRoleVisible] = useState<boolean>(false);
  const [isCardLeaving, setIsCardLeaving] = useState<boolean>(false);
  const [cardExit, setCardExit] = useState({ x: 360, y: -28, rotate: 12 });
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const [customInput, setCustomInput] = useState<string>("");
  const [showLocationList, setShowLocationList] = useState<boolean>(false);
  const [timerWarning, setTimerWarning] = useState<boolean>(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [fingerTouches, setFingerTouches] = useState<FingerTouch[]>([]);
  const [starterIndex, setStarterIndex] = useState<number | null>(null);
  const [isPickingStarter, setIsPickingStarter] = useState<boolean>(false);
  const [starterCountdown, setStarterCountdown] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardSwipeHandledRef = useRef<boolean>(false);
  const activeFingerIdsRef = useRef<Map<number, number>>(new Map());
  const starterTimerRef = useRef<number | null>(null);

  const fingerTouchesRef = useRef<FingerTouch[]>([]);
  useEffect(() => {
    fingerTouchesRef.current = fingerTouches;
  }, [fingerTouches]);

  // ── Persist settings ────────────────────────────────────────────────────
  useEffect(() => {
    saveToLS(LS_SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => () => {
    if (starterTimerRef.current) clearInterval(starterTimerRef.current);
  }, []);

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
          playUrgentTick();
        } else if (next > 0) {
          playTick();
        }
        if (next === 0) {
          setPhase("results");
        }
        if (next % 60 === 0 && next > 0) vibrate(30);
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTimerRunning, timerSeconds, timerWarning]);

  // ── Game logic ──────────────────────────────────────────────────────────

  const startGame = useCallback((): void => {
    vibrate([50, 40, 100]);
    const includeAnimeWords = settings.selectedCategories.includes("anime");
    const includeMoviesWords = settings.selectedCategories.includes("movies");
    const selectedBaseCategories = settings.selectedCategories.filter(isBaseCategoryId);
    const categoryPools = [
      ...selectedBaseCategories.map((categoryId) => ({
        id: categoryId,
        locations: getAllLocations([categoryId]),
      })),
      ...(includeAnimeWords ? [{ id: "anime", locations: animeWordPool }] : []),
      ...(includeMoviesWords ? [{ id: "movies", locations: moviesWordPool }] : []),
      ...(customLocations.length > 0 ? [{ id: "custom", locations: customLocations }] : []),
    ]
      .map((pool) => {
        const uniqueLocationsMap = new Map<string, ParsedLocation>();
        pool.locations.forEach((entry) => {
          const parsed = parseLocation(entry, customLocations);
          if (!uniqueLocationsMap.has(parsed.word.toLowerCase())) {
            uniqueLocationsMap.set(parsed.word.toLowerCase(), parsed);
          }
        });
        return { id: pool.id, locations: Array.from(uniqueLocationsMap.values()) };
      })
      .filter((pool) => pool.locations.length > 0);

    if (categoryPools.length === 0) return;
    const chosenCategoryPool = pickBalancedCategory(categoryPools);
    const location = pickBalancedWord(chosenCategoryPool.locations);

    const uniqueAllLocationsMap = new Map<string, ParsedLocation>();
    categoryPools.forEach((pool) => {
      pool.locations.forEach((entry) => {
        if (!uniqueAllLocationsMap.has(entry.word.toLowerCase())) {
          uniqueAllLocationsMap.set(entry.word.toLowerCase(), entry);
        }
      });
    });
    const allLocations = Array.from(uniqueAllLocationsMap.values());

    const indices = pickBalancedSpies(settings.playersCount, settings.spyCount);
    const alternateSpyWordPool = allLocations.filter((entry) => entry.word !== location.word);
    const selectedSpyWord =
      settings.gameMode === "different-word" && alternateSpyWordPool.length > 0
        ? pickBalancedWord(alternateSpyWordPool)
        : null;

    setCurrentLocation(location.word);
    setCurrentLocationHint(location.description);
    setSpyWord(selectedSpyWord ? selectedSpyWord.word : "");
    setSpyWordHint(selectedSpyWord ? selectedSpyWord.description : "");
    setSpyIndices(indices);

    setCurrentPlayer(0);

    setTimerSeconds(settings.timerMinutes * 60);
    setIsTimerRunning(false);
    setIsRoleVisible(false);
    setIsCardLeaving(false);
    setCardExit({ x: 360, y: -28, rotate: 12 });
    setTimerWarning(false);
    setShowLocationList(false);
    setFingerTouches([]);
    setStarterIndex(null);
    setStarterCountdown(null);
    setIsPickingStarter(false);
    activeFingerIdsRef.current.clear();
    if (starterTimerRef.current) {
      clearInterval(starterTimerRef.current);
      starterTimerRef.current = null;
    }
    setPhase("reveal");
  }, [settings, customLocations]);

  const handleRevealDone = useCallback((info?: PanInfo): void => {
    if (isCardLeaving) return;
    vibrate(30);
    const rawX = info?.offset.x ?? 360;
    const rawY = info?.offset.y ?? -28;
    const distance = Math.max(1, Math.hypot(rawX, rawY));
    const exitDistance = 600;
    
    setCardExit({
      x: (rawX / distance) * exitDistance,
      y: (rawY / distance) * exitDistance,
      rotate: Math.max(-24, Math.min(24, rawX / 10 || 12)),
    });
    setIsCardLeaving(true);
    
    // Hide role info immediately
    setIsRoleVisible(false);

    const nextPlayer = currentPlayer + 1;
    
    // Clear pan offset for the next player
    setTimeout(() => {
      setPanOffset({ x: 0, y: 0 });
    }, 100);

    window.setTimeout(() => {
      setIsCardLeaving(false);
      setCardExit({ x: 360, y: -28, rotate: 12 });
      cardSwipeHandledRef.current = false;
      
      if (nextPlayer < settings.playersCount) {
        setCurrentPlayer(nextPlayer);
      } else {
        setPhase("starter");
      }
    }, 300);
  }, [currentPlayer, isCardLeaving, settings.playersCount]);

  const flipRoleCard = useCallback((): void => {
    if (isCardLeaving) return;
    if (cardSwipeHandledRef.current) return;
    vibrate([30, 20, 60]);
    if (!isRoleVisible) playRevealSound();
    setIsRoleVisible((prev) => !prev);
  }, [isCardLeaving, isRoleVisible]);

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
    setCustomInput("");
    vibrate([20, 10, 20]);
  }, [customInput, customLocations]);

  const removeCustomLocation = useCallback(
    (index: number): void => {
      const updated = customLocations.filter((_, i) => i !== index);
      setCustomLocations(updated);
      saveToLS(LS_CUSTOM_KEY, updated);
      vibrate(20);
    },
    [customLocations],
  );

  const toggleCategory = useCallback((id: SelectableCategoryId): void => {
    vibrate(20);
    setSettings((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(id)
        ? prev.selectedCategories.filter((c) => c !== id)
        : [...prev.selectedCategories, id],
    }));
  }, []);

  const isSpy = (playerIndex: number): boolean => spyIndices.has(playerIndex);
  const getPlayerName = (index: number): string => settings.playerNames[index] || `Игрок ${index + 1}`;

  const allGameLocations = useMemo(() => {
    const includeAnimeWords = settings.selectedCategories.includes("anime");
    const includeMoviesWords = settings.selectedCategories.includes("movies");
    const selectedBaseCategories = settings.selectedCategories.filter(isBaseCategoryId);
    return [
      ...getAllLocations(selectedBaseCategories),
      ...(includeAnimeWords ? animeWordPool : []),
      ...(includeMoviesWords ? moviesWordPool : []),
      ...customLocations,
    ]
      .map((entry) => parseLocation(entry, customLocations))
      .sort((a, b) => a.word.localeCompare(b.word, "ru"));
  }, [settings.selectedCategories, customLocations]);

  const startPlaying = useCallback((): void => {
    vibrate([30, 30, 80]);
    setTimerSeconds(settings.timerMinutes * 60);
    setIsTimerRunning(true);
    setPhase("playing");
  }, [settings.timerMinutes]);

  const clearStarterPicker = useCallback((): void => {
    if (isPickingStarter) return;
    if (starterTimerRef.current) {
      clearInterval(starterTimerRef.current);
      starterTimerRef.current = null;
    }
    activeFingerIdsRef.current.clear();
    setFingerTouches([]);
    setStarterIndex(null);
    setStarterCountdown(null);
  }, [isPickingStarter]);

  const upsertFingerTouch = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (isPickingStarter || starterIndex !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = 48;
    const colors = ["#D946EF", "#22D3EE", "#F59E0B", "#10B981", "#F43F5E", "#8B5CF6", "#84CC16", "#06B6D4"];
    setFingerTouches((prev) => {
      if (prev.length >= settings.playersCount) return prev;
      const touchId = Date.now() + event.pointerId + randomInt(1, 9999);
      activeFingerIdsRef.current.set(event.pointerId, touchId);
      const nextTouch = {
        id: touchId,
        x: clamp(event.clientX - rect.left, radius, rect.width - radius),
        y: clamp(event.clientY - rect.top, radius, rect.height - radius),
        color: colors[prev.length % colors.length],
      };
      return [...prev, nextTouch];
    });
  }, [isPickingStarter, settings.playersCount, starterIndex]);

  const moveFingerTouch = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (isPickingStarter || starterIndex !== null) return;
    const touchId = activeFingerIdsRef.current.get(event.pointerId);
    if (!touchId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = 48;
    setFingerTouches((prev) =>
      prev.map((touch) =>
        touch.id === touchId
          ? {
              ...touch,
              x: clamp(event.clientX - rect.left, radius, rect.width - radius),
              y: clamp(event.clientY - rect.top, radius, rect.height - radius),
            }
          : touch,
      ),
    );
  }, [isPickingStarter, starterIndex]);

  const removeFingerTouch = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (starterIndex !== null) return; // Freeze circles after selection is complete!
    const touchId = activeFingerIdsRef.current.get(event.pointerId);
    if (touchId) {
      activeFingerIdsRef.current.delete(event.pointerId);
      setFingerTouches((prev) => prev.filter((t) => t.id !== touchId));

      // If we were picking a starter and a finger was lifted, cancel the countdown!
      if (isPickingStarter || starterTimerRef.current) {
        if (starterTimerRef.current) {
          clearInterval(starterTimerRef.current);
          starterTimerRef.current = null;
        }
        setIsPickingStarter(false);
        setStarterCountdown(null);
        setStarterIndex(null);
      }
    }
  }, [isPickingStarter, starterIndex]);

  const pickStarter = useCallback((): void => {
    if (fingerTouchesRef.current.length < 2 || isPickingStarter) return;
    if (starterTimerRef.current) clearInterval(starterTimerRef.current);
    setIsPickingStarter(true);
    setStarterIndex(null);
    setStarterCountdown(5);
    vibrate(30);

    let count = 5;
    starterTimerRef.current = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        setStarterCountdown(count);
        playTick();
        vibrate(18);
        return;
      }

      if (starterTimerRef.current) {
        clearInterval(starterTimerRef.current);
        starterTimerRef.current = null;
      }
      const winner = randomInt(0, fingerTouchesRef.current.length - 1);
      setStarterCountdown(null);
      setStarterIndex(winner);
      setIsPickingStarter(false);
      vibrate([80, 40, 180]);
      playRevealSound();
    }, 1000);
  }, [isPickingStarter]);

  // Auto-start picker when all fingers are placed
  useEffect(() => {
    if (
      phase === "starter" &&
      fingerTouches.length > 0 &&
      fingerTouches.length === settings.playersCount &&
      !isPickingStarter &&
      starterIndex === null
    ) {
      const delayTimer = setTimeout(() => {
        pickStarter();
      }, 500); // 500ms delay to make sure fingers are settled
      return () => clearTimeout(delayTimer);
    }
  }, [fingerTouches.length, settings.playersCount, isPickingStarter, starterIndex, phase, pickStarter]);


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
      className="flex flex-col min-h-screen p-6 gap-5 overflow-y-auto"
    >
      {/* Header */}
      <div className="pt-10 pb-2 text-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl font-cyber font-black tracking-widest"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #EC4899, #D946EF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 28px rgba(139,92,246,0.35))",
          }}
        >
          SPY
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 0.3 }}
          className="text-[10px] tracking-[0.5em] text-white/40 mt-1 font-sans uppercase"
        >
          УЛЬТИМАТИВНОЕ ИЗДАНИЕ
        </motion.p>
      </div>

      <CoralDivider />

      {/* Player Count */}
      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">
          👥 Количество игроков
        </p>
        <div className="flex items-center justify-between gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => {
                const nextPlayers = Math.max(3, prev.playersCount - 1);
                return {
                  ...prev,
                  playersCount: nextPlayers,
                  spyCount: clampSpyCount(prev.spyCount, nextPlayers),
                };
              });
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white select-none"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            −
          </motion.button>

          <div className="text-center flex-1">
            <span
              className="text-6xl font-cyber font-black"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {settings.playersCount}
            </span>
            <p className="text-xs text-white/30 mt-1 font-sans">
              {formatSpyCount(settings.spyCount)}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => {
                const nextPlayers = Math.min(50, prev.playersCount + 1);
                return {
                  ...prev,
                  playersCount: nextPlayers,
                  spyCount: clampSpyCount(prev.spyCount, nextPlayers),
                };
              });
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white select-none"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            +
          </motion.button>
        </div>
      </GlassCard>

      {/* Spy Count */}
      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">
          🕵️ Количество шпионов
        </p>
        <div className="flex items-center justify-between gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({ ...prev, spyCount: Math.max(1, prev.spyCount - 1) }));
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white select-none"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            −
          </motion.button>

          <div className="text-center flex-1">
            <span
              className="text-6xl font-cyber font-black"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {settings.spyCount}
            </span>
            <p className="text-xs text-white/30 mt-1 font-sans">
              max {Math.max(1, settings.playersCount - 1)}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({
                ...prev,
                spyCount: Math.min(prev.spyCount + 1, Math.max(1, prev.playersCount - 1)),
              }));
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white select-none"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            +
          </motion.button>
        </div>
      </GlassCard>

      {/* Timer */}
      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">
          ⏱️ Таймер (минуты)
        </p>
        <div className="flex gap-2 flex-wrap">
          {[3, 5, 7, 8, 10, 12].map((m) => {
            const selected = settings.timerMinutes === m;
            return (
              <motion.button
                key={m}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  vibrate(20);
                  setSettings((prev) => ({ ...prev, timerMinutes: m }));
                }}
                className={`
                  flex-1 min-w-[3rem] h-11 rounded-full font-sans font-bold text-sm
                  border transition-all duration-200 select-none
                  ${selected ? "text-white" : "bg-white/[0.04] border-white/[0.07] text-white/40"}
                `}
                style={
                  selected
                    ? {
                        background: "rgba(217,70,239,0.12)",
                        borderColor: "#D946EF",
                        boxShadow: "inset 0 0 16px rgba(217,70,239,0.12), 0 0 0 1px rgba(217,70,239,0.35)",
                      }
                    : {}
                }
              >
                {m}м
              </motion.button>
            );
          })}
        </div>
      </GlassCard>

      {/* Game Mode */}
      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">
          🎭 Режим игры
        </p>
        <div className="flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({ ...prev, gameMode: "classic" }));
            }}
            className="rounded-[14px] border p-3 text-left transition-all duration-200"
            style={
              settings.gameMode === "classic"
                ? { borderColor: "rgba(217,70,239,0.45)", background: "rgba(217,70,239,0.09)" }
                : { borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }
            }
          >
            <div className="text-sm font-sans font-bold text-white leading-tight">
              Классический Шпион
            </div>
            <div className="text-[10px] text-white/40 mt-1.5 font-sans leading-relaxed">
              Шпион видит роль и не знает слово
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              vibrate(20);
              setSettings((prev) => ({ ...prev, gameMode: "different-word" }));
            }}
            className="rounded-[14px] border p-3 text-left transition-all duration-200"
            style={
              settings.gameMode === "different-word"
                ? { borderColor: "rgba(217,70,239,0.45)", background: "rgba(217,70,239,0.09)" }
                : { borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }
            }
          >
            <div className="text-sm font-sans font-bold text-white leading-tight">
              Другое Слово
            </div>
            <div className="text-[10px] text-white/40 mt-1.5 font-sans leading-relaxed">
              Шпион получает другое слово и выглядит как все
            </div>
          </motion.button>
        </div>

      </GlassCard>

      {/* Categories Preview */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-widest text-white/45 font-sans uppercase">
            🗂️ Категории ({settings.selectedCategories.length})
          </p>
          <PillButton variant="outline" size="sm" onClick={() => setPhase("categories")}>
            Редактировать
          </PillButton>
        </div>
        {settings.selectedCategories.length === 0 ? (
          <span className="text-xs text-red-400/70 font-sans">
            ⚠️ Выберите хотя бы одну категорию
          </span>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.filter((c) => settings.selectedCategories.includes(c.id)).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 p-3 rounded-[14px] backdrop-blur-[10px]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-lg leading-none">{c.emoji}</span>
                <span
                  className="text-xs font-sans font-medium leading-tight"
                  style={{ color: "rgba(255,230,220,0.80)" }}
                >
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pb-8">
        <PillButton
          variant="primary"
          size="xl"
          onClick={startGame}
          disabled={settings.selectedCategories.length === 0}
          className="w-full"
        >
          ▶ Начать игру
        </PillButton>

        <div className="flex gap-3">
          <PillButton
            variant="ghost"
            size="md"
            onClick={() => setPhase("settings")}
            className="flex-1"
          >
            ⚙ Настройки
          </PillButton>
          <PillButton
            variant="ghost"
            size="md"
            onClick={() => setPhase("categories")}
            className="flex-1"
          >
            🗂 Категории
          </PillButton>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Category Selector
  // ─────────────────────────────────────────────────────────────────────────

  const renderCategories = (): JSX.Element => {
    return (
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
          onClick={() => { vibrate(20); setPhase("setup"); }}
          className="text-[#D946EF]/70 text-2xl"
        >
          ←
        </button>
        <h2
          className="text-xl font-cyber font-bold tracking-widest"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Категории
        </h2>
      </div>

      <p className="text-xs text-white/40 font-sans">
        Нажмите для выбора. Выбрано: {settings.selectedCategories.length}/{CATEGORIES.length}
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
                className="w-full p-4 rounded-[18px] border text-left transition-all duration-300 backdrop-blur-[20px]"
                style={{
                  background: selected
                    ? "linear-gradient(135deg, rgba(139,92,246,0.09) 0%, rgba(217,70,239,0.03) 100%)"
                    : "rgba(255,255,255,0.02)",
                  borderColor: selected
                    ? "rgba(217,70,239,0.3)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: selected ? "0 0 20px rgba(139,92,246,0.06)" : "none",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <div>
                      <p className={`font-sans font-bold text-sm ${selected ? "text-white" : "text-white/50"}`}>
                        {cat.name}
                      </p>
                      <p className="text-xs text-white/25 font-sans">
                        {cat.locations.length} слов
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    style={{
                      borderColor: selected ? "#D946EF" : "rgba(255,255,255,0.2)",
                      background: selected ? "linear-gradient(135deg, #8B5CF6, #EC4899)" : "transparent",
                    }}
                  >
                    {selected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Pass the Phone
  // ─────────────────────────────────────────────────────────────────────────

  // RENDER: Role Reveal
  // ─────────────────────────────────────────────────────────────────────────

  const renderReveal = (): JSX.Element => {
    const spy = isSpy(currentPlayer);
    const disguisedSpyMode = settings.gameMode === "different-word";
    const visibleWord = spy && disguisedSpyMode ? spyWord : currentLocation;
    const visibleWordHint = spy && disguisedSpyMode ? spyWordHint : currentLocationHint;

    const otherSpyPlayers = Array.from(spyIndices)
      .filter((index) => index !== currentPlayer)
      .map((index) => getPlayerName(index))
      .sort();

    const otherSpiesNote =
      otherSpyPlayers.length === 0
        ? "Ты единственный шпион"
        : otherSpyPlayers.length === 1
        ? `Еще шпион: ${otherSpyPlayers[0]}`
        : `Еще шпионы: ${otherSpyPlayers.join(", ")}`;

    const showExplicitSpyRole = spy && !disguisedSpyMode;
    const doneVariant: PillButtonProps["variant"] = showExplicitSpyRole ? "danger" : "success";
    const cardAccent = showExplicitSpyRole ? "#FF3B30" : "#D946EF";
    const cardGlow = showExplicitSpyRole
      ? "rgba(255,59,48,0.28)"
      : "rgba(139,92,246,0.24)";

    return (
      <motion.div
        key="reveal"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center justify-center min-h-screen p-8 gap-7 text-center touch-none overflow-hidden"
        onPan={(_, info) => {
          if (isCardLeaving) return;
          setPanOffset({ x: info.offset.x, y: info.offset.y });
        }}
        onPanEnd={(_, info) => {
          if (isCardLeaving) return;
          const distance = Math.hypot(info.offset.x, info.offset.y);
          const velocity = Math.hypot(info.velocity.x, info.velocity.y);
          if (distance > 85 || velocity > 600) {
            handleRevealDone(info);
          } else {
            setPanOffset({ x: 0, y: 0 });
          }
        }}
      >
        <div className="space-y-1">
          <p className="text-xs tracking-[0.4em] text-white/30 font-sans uppercase">
            {getPlayerName(currentPlayer)}
          </p>
          <h3 className="text-lg font-sans text-white/60">Карта роли</h3>
        </div>

        <motion.div className="relative w-[20rem] max-w-[calc(100vw-3rem)] h-[28rem]">
          {currentPlayer + 1 < settings.playersCount && (
            <>
              <div
                className="absolute inset-0 rounded-[30px] border border-white/[0.08]"
                style={{
                  transform: "translateY(18px) scale(0.94) rotate(-3deg)",
                  background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  boxShadow: "0 18px 44px rgba(0,0,0,0.38)",
                }}
              />
              <div
                className="absolute inset-0 rounded-[30px] border border-white/[0.10]"
                style={{
                  transform: "translateY(9px) scale(0.97) rotate(2deg)",
                  background: "linear-gradient(145deg, rgba(217,70,239,0.10), rgba(255,255,255,0.025))",
                  boxShadow: "0 16px 42px rgba(0,0,0,0.42)",
                }}
              />
            </>
          )}

          <AnimatePresence>
            {isRoleVisible && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.06, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-2 rounded-[32px] blur-2xl"
                style={{ background: cardGlow }}
              />
            )}
          </AnimatePresence>

          <motion.button
            key={`role-card-${currentPlayer}`}
            type="button"
            onClick={flipRoleCard}
            onContextMenu={(e) => e.preventDefault()}
            whileTap={{ scale: 0.98 }}
            animate={isCardLeaving ? { ...cardExit, opacity: 0 } : { x: panOffset.x, y: panOffset.y, rotate: panOffset.x / 14, opacity: 1 }}
            transition={isCardLeaving || (panOffset.x === 0 && panOffset.y === 0) 
              ? { duration: 0.3, ease: "easeOut" } 
              : { duration: 0 }}
            className="relative w-full h-full select-none touch-manipulation"
            style={{ perspective: "1200px", userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}
          >
            <motion.div
              animate={{ rotateY: isRoleVisible ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full h-full rounded-[30px] border flex flex-col items-center justify-center gap-4 overflow-hidden backdrop-blur-[20px]"
              style={{
                transformStyle: "preserve-3d",
                borderColor: isRoleVisible ? cardAccent : "rgba(255,255,255,0.14)",
                background: isRoleVisible
                  ? showExplicitSpyRole
                    ? "linear-gradient(145deg, rgba(255,59,48,0.18), rgba(20,8,10,0.94))"
                    : "linear-gradient(145deg, rgba(139,92,246,0.18), rgba(10,10,14,0.94))"
                  : "linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03)), radial-gradient(circle at 50% 0%, rgba(217,70,239,0.18), transparent 55%)",
                boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 ${isRoleVisible ? "42px" : "18px"} ${isRoleVisible ? cardGlow : "rgba(217,70,239,0.12)"}, inset 0 1px 0 rgba(255,255,255,0.12)`,
              }}
            >
              {!isRoleVisible && (
                <>
                  <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 20%, rgba(236,72,153,0.24), transparent 34%), radial-gradient(circle at 50% 82%, rgba(34,211,238,0.14), transparent 32%)" }} />
                  <div className="absolute inset-[16px] rounded-[24px] border border-[#D946EF]/25" />
                  <div className="absolute inset-[30px] rounded-[19px] border border-white/[0.08]" />
                  <div className="absolute inset-[48px] rounded-[16px] border border-[#22D3EE]/10" />
                  <div className="absolute h-56 w-56 rounded-full border border-[#D946EF]/25" />
                  <div className="absolute h-40 w-40 rounded-full border border-white/[0.08]" />
                  <div className="absolute h-24 w-24 rotate-45 rounded-[18px] border border-[#F0ABFC]/35 bg-white/[0.03]" />
                  <div className="absolute h-14 w-14 rotate-45 rounded-[12px]" style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.42), rgba(34,211,238,0.18))", boxShadow: "0 0 34px rgba(217,70,239,0.34)" }} />
                  <div className="absolute inset-x-10 top-24 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.62), transparent)" }} />
                  <div className="absolute inset-x-10 bottom-24 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.38), transparent)" }} />
                  <div className="absolute left-9 top-16 h-2 w-2 rounded-full bg-[#F0ABFC]/70 shadow-[0_0_18px_rgba(240,171,252,0.7)]" />
                  <div className="absolute right-9 bottom-16 h-2 w-2 rounded-full bg-[#22D3EE]/60 shadow-[0_0_18px_rgba(34,211,238,0.6)]" />
                </>
              )}

              <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[10px] tracking-[0.28em] uppercase text-white/35">
                <span>КАРТА</span>
                <span>{currentPlayer + 1}/{settings.playersCount}</span>
              </div>

              <AnimatePresence mode="wait">
                {isRoleVisible ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.6, filter: "blur(15px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-3"
                    style={{ rotateY: 180 }}
                  >
                    {showExplicitSpyRole ? (
                      <>
                        <span className="text-5xl">?</span>
                        <span className="text-3xl font-cyber font-black tracking-widest" style={{ color: "#FF3B30", textShadow: "0 0 20px rgba(255,59,48,0.8)" }}>ШПИОН</span>
                        <span className="text-xs font-sans text-red-400/70 max-w-[190px] text-center">Маскируйся. Угадай слово.</span>
                        <span className="text-[11px] leading-relaxed font-sans text-red-400/80 max-w-[220px] text-center">{otherSpiesNote}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col items-center gap-1 max-w-[220px]">
                          <span className="text-lg font-cyber font-bold tracking-wide text-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            {visibleWord}
                          </span>
                          <span className="text-[11px] leading-relaxed font-sans text-white/65 text-center">({visibleWordHint})</span>
                        </div>
                        {!disguisedSpyMode && <span className="text-xs font-sans text-[#D946EF]/70">Ты не шпион</span>}
                        {spy && <span className="text-[11px] leading-relaxed font-sans text-red-400/80 max-w-[220px] text-center">{otherSpiesNote}</span>}
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                    <span className="text-6xl opacity-85 relative z-10">?</span>
                    <span className="text-sm font-sans text-white/60 tracking-widest uppercase relative z-10">Карта игрока</span>
                    <span className="text-3xl font-cyber font-black" style={{ color: "#D946EF", textShadow: "0 0 24px rgba(217,70,239,0.55)" }}>
                      {currentPlayer + 1}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="absolute bottom-5 text-[10px] tracking-[0.24em] uppercase text-white/30">
                {isRoleVisible ? "Свайпни карту" : "Нажми, чтобы открыть"}
              </span>
            </motion.div>
          </motion.button>
        </motion.div>

        <p className="text-xs text-white/25 font-sans max-w-xs">
          Нажми на карту, посмотри роль и свайпни карту в любую сторону. Следующая карта появится сверху.
        </p>
      </motion.div>
    );
  };

  // RENDER: Starter Picker
  // ─────────────────────────────────────────────────────────────────────────

  const renderStarterPicker = (): JSX.Element => (
    <motion.div
      key="starter"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-screen p-6 gap-5 overflow-hidden"
    >
      <div className="pt-8 text-center space-y-2">
        <h2
          className="text-3xl font-cyber font-black tracking-widest"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Кто начинает?
        </h2>
        <p className="text-xs text-white/40 font-sans leading-relaxed max-w-xs mx-auto">
          Все кладут пальцы на экран. Максимум точек: {settings.playersCount}.
        </p>
      </div>

      <div
        onPointerDown={upsertFingerTouch}
        onPointerMove={moveFingerTouch}
        onPointerUp={removeFingerTouch}
        onPointerCancel={removeFingerTouch}
        className="relative flex-1 min-h-[24rem] rounded-[28px] border border-white/[0.08] overflow-hidden touch-none select-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(16,185,129,0.12), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.35), 0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }} />

        {fingerTouches.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30 font-sans">
            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center text-4xl">
              ☝
            </div>
            <span className="text-xs tracking-[0.24em] uppercase">Коснитесь экрана</span>
          </div>
        )}

        {fingerTouches.length >= settings.playersCount && starterIndex === null && !isPickingStarter && (
          <div className="absolute left-4 right-4 top-4 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-center text-[10px] tracking-[0.2em] uppercase text-emerald-200 font-sans">
            Все игроки на поле
          </div>
        )}

        {starterCountdown !== null && (
          <motion.div
            key={starterCountdown}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="w-32 h-32 rounded-full border border-white/20 bg-black/45 backdrop-blur-[10px] flex items-center justify-center">
              <span className="text-6xl font-cyber font-black text-white" style={{ textShadow: "0 0 28px rgba(16,185,129,0.85)" }}>
                {starterCountdown}
              </span>
            </div>
          </motion.div>
        )}

        {fingerTouches.map((touch, index) => {
          const winner = starterIndex === index;
          return (
            <motion.div
              key={touch.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              animate={{
                left: touch.x,
                top: touch.y,
                scale: winner ? 1.38 : isPickingStarter ? 1.04 : 1,
              }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center border"
                style={{
                  borderColor: winner ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                  background: winner
                    ? "radial-gradient(circle, #FF3B30 0%, rgba(255,59,48,0.82) 42%, rgba(80,0,0,0.7) 74%)"
                    : "radial-gradient(circle, #34D399 0%, rgba(16,185,129,0.82) 42%, rgba(0,54,36,0.7) 74%)",
                  boxShadow: winner
                    ? "0 0 45px rgba(255,59,48,0.95), 0 0 115px rgba(255,59,48,0.55)"
                    : "0 0 30px rgba(16,185,129,0.75), 0 0 80px rgba(16,185,129,0.34)",
                }}
              >
                <span className="text-2xl font-cyber font-black text-white">
                  {winner ? "!" : ""}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-3 pb-6">
        {starterIndex !== null ? (
          <GlassCard className="p-4" glow>
            <p className="text-[10px] tracking-widest text-white/35 font-sans uppercase mb-2">
              Первый ход
            </p>
            <p className="text-lg font-sans font-bold text-white">
              Начинает игрок под светящейся точкой
            </p>
          </GlassCard>
        ) : (
          <p className="text-xs text-white/35 text-center font-sans">
            Точек: {fingerTouches.length}/{settings.playersCount}. После запуска идет отсчет 5 секунд.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <PillButton
            variant="primary"
            size="lg"
            onClick={pickStarter}
            disabled={fingerTouches.length < 2 || isPickingStarter || starterIndex !== null}
            className="flex-1"
          >
            {isPickingStarter ? "Отсчет..." : "Запустить"}
          </PillButton>
          <PillButton
            variant="ghost"
            size="lg"
            onClick={starterIndex === null ? clearStarterPicker : startPlaying}
            disabled={isPickingStarter}
            className="flex-1"
          >
            {starterIndex === null ? "Сброс" : "Начать игру"}
          </PillButton>
        </div>
        <PillButton
          variant="outline"
          size="md"
          onClick={startPlaying}
          disabled={isPickingStarter}
          className="w-full"
        >
          Пропустить выбор
        </PillButton>
      </div>
    </motion.div>
  );

  // RENDER: Playing Screen
  // ─────────────────────────────────────────────────────────────────────────

  const renderPlaying = (): JSX.Element => {
    const progress = timerSeconds / (settings.timerMinutes * 60);
    const circumference = 2 * Math.PI * 90;
    const strokeDash = circumference * progress;
    const isUrgent = timerSeconds <= 30;
    const isEnded = timerSeconds === 0;
    const timerColor = isUrgent ? "#FF3B30" : "#D946EF";

    return (
      <motion.div
        key="playing"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col min-h-screen p-6 gap-5 overflow-y-auto"
      >
        <div className="flex items-center justify-between pt-6">
          <h2 className="text-xl font-cyber font-bold tracking-widest" style={{ background: isUrgent ? "linear-gradient(135deg, #FF3B30, #FF6B6B)" : "linear-gradient(135deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {isEnded ? "⚠ ВРЕМЯ ВЫШЛО" : "▶ ИГРА ИДЁТ"}
          </h2>
          <PillButton variant="ghost" size="sm" onClick={() => { vibrate([20, 20]); setIsTimerRunning(false); setPhase("setup"); }}>✕ Выйти</PillButton>
        </div>

        <div className="flex justify-center py-4">
          <div className="relative w-52 h-52">
            <svg width="208" height="208" viewBox="0 0 208 208" className="-rotate-90">
              <circle cx="104" cy="104" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="104" cy="104" r="90" fill="none" stroke={isEnded ? "#333" : timerColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - strokeDash} style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s", filter: `drop-shadow(0 0 8px ${timerColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span animate={isUrgent && isTimerRunning ? { scale: [1, 1.05, 1], color: ["#FF3B30", "#FF6B6B", "#FF3B30"] } : {}} transition={{ duration: 1, repeat: Infinity }} className="text-5xl font-cyber font-black" style={{ color: timerColor, textShadow: `0 0 20px ${timerColor}99` }}>
                {formatTime(timerSeconds)}
              </motion.span>
              <span className="text-xs text-white/30 font-sans mt-1 tracking-widest uppercase">{isEnded ? "Голосуйте" : isTimerRunning ? "Идёт" : "Пауза"}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <PillButton variant={isTimerRunning ? "danger" : "success"} size="md" onClick={toggleTimer} className="flex-1">{isTimerRunning ? "⏸ Пауза" : "▶ Продолжить"}</PillButton>
          <PillButton variant="ghost" size="md" onClick={resetTimer}>↺ Сброс</PillButton>
        </div>

        <CoralDivider />

        <GlassCard className="p-4" glow={showLocationList}>
          <button className="w-full flex items-center justify-between" onClick={() => { vibrate(20); setShowLocationList((prev) => !prev); }}>
            <span className="font-sans text-sm text-[#D946EF]/80 tracking-widest uppercase">🗺️ Возможные места ({allGameLocations.length})</span>
            <motion.span animate={{ rotate: showLocationList ? 180 : 0 }} className="text-[#D946EF]/60 text-lg">▾</motion.span>
          </button>
          <AnimatePresence>
            {showLocationList && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-4 grid grid-cols-2 gap-2">
                  {allGameLocations.map((loc) => (
                    <div key={loc.raw} className="text-xs px-2.5 py-2 rounded-[10px] font-sans border border-white/[0.05] bg-white/[0.02]">
                      <div style={{ color: "#D946EF", opacity: 0.8 }}>{loc.word}</div>
                      <div className="text-[10px] leading-relaxed text-white/40 mt-1">({loc.description})</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-sans text-white/60">🕵️ Кол-во шпионов</span>
            <span className="text-2xl font-cyber font-black" style={{ color: "#FF3B30", textShadow: "0 0 10px rgba(255,59,48,0.5)" }}>{spyIndices.size}</span>
          </div>
          <p className="text-xs text-white/25 font-sans mt-1">{settings.playersCount} игроков · {settings.timerMinutes} мин</p>
        </GlassCard>
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
        <button onClick={() => { vibrate(20); setPhase("setup"); }} className="text-[#D946EF]/70 text-2xl">←</button>
        <h2 className="text-xl font-cyber font-bold tracking-widest" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Настройки</h2>
      </div>

      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">👤 Имена игроков</p>
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
          {Array.from({ length: settings.playersCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-cyber text-white/30 w-4">{i + 1}</span>
              <input
                type="text"
                value={settings.playerNames[i] || "Неизвестно"}
                onChange={(e) => {
                  const newNames = [...settings.playerNames];
                  newNames[i] = e.target.value;
                  setSettings((prev) => ({ ...prev, playerNames: newNames }));
                }}
                placeholder={`Игрок ${i + 1}`}
                className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-[10px] px-3 py-2 text-sm font-sans text-white placeholder-white/20 focus:outline-none focus:border-[#D946EF]/40 transition-all"
                maxLength={15}
              />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-4 font-sans uppercase">➕ Свои слова</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustomLocation(); }}
            placeholder="напр. Кофейня на углу"
            className="flex-1 bg-white/[0.05] border border-white/[0.09] rounded-[12px] px-4 py-3 text-sm font-sans text-white placeholder-white/25 focus:outline-none transition-all duration-200"
            maxLength={50}
          />
          <PillButton variant="primary" size="sm" onClick={addCustomLocation}>Добавить</PillButton>
        </div>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {customLocations.length === 0 ? (
            <p className="text-xs text-white/20 font-sans text-center py-4">Своих слов пока нет</p>
          ) : (
            customLocations.map((loc, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-3 rounded-[10px] bg-white/[0.03] border border-white/[0.05]">
                <span className="text-sm font-sans text-white/70">{loc}</span>
                <button onClick={() => removeCustomLocation(i)} className="text-red-400/60 hover:text-red-400 text-lg ml-2 px-2">✕</button>
              </motion.div>
            ))
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <p className="text-[10px] tracking-widest text-white/45 mb-3 font-sans uppercase">Privacy</p>
        <div className="space-y-2 text-xs leading-relaxed text-white/45 font-sans">
          <p>Spy Ultimate works offline and does not require an account.</p>
          <p>Player names, custom words, settings, and recent word history are saved only on this device.</p>
          <p>The app does not send gameplay data to a server and does not use ads or analytics SDKs.</p>
          <p>Privacy policy: <a href="https://spy-privacy-quantum.netlify.app" target="_blank" rel="noopener noreferrer" className="text-secondary underline decoration-secondary/30">spy-privacy-quantum.netlify.app</a></p>
        </div>
      </GlassCard>

      <div className="pb-8">
        <PillButton variant="primary" size="lg" onClick={() => setPhase("setup")} className="w-full">← В главное меню</PillButton>
      </div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Results Screen
  // ─────────────────────────────────────────────────────────────────────────

  const renderResults = (): JSX.Element => {
    const spies = Array.from(spyIndices).map((idx) => getPlayerName(idx));
    return (
      <motion.div
        key="results"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 text-center"
      >
        <div className="space-y-2">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-7xl mb-4">🏁</motion.div>
          <h2 className="text-4xl font-cyber font-black tracking-widest text-[#D946EF]">ИГРА ОКОНЧЕНА</h2>
          <p className="text-white/40 font-sans uppercase tracking-[0.2em] text-xs">Время вышло или шпион раскрыт</p>
        </div>
        <GlassCard className="w-full p-6 space-y-6">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Локация была</p>
            <p className="text-2xl font-cyber font-bold text-white tracking-tight">{currentLocation}</p>
          </div>
          <CoralDivider />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">{spies.length === 1 ? "Шпион" : "Шпионы"}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {spies.map((name, i) => (
                <span key={i} className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold">{name}</span>
              ))}
            </div>
          </div>
        </GlassCard>
        <div className="w-full space-y-3">
          <PillButton variant="primary" size="xl" className="w-full" onClick={() => setPhase("setup")}>В меню</PillButton>
          <PillButton variant="ghost" size="lg" className="w-full" onClick={startGame}>Играть снова ↺</PillButton>
        </div>
      </motion.div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#0C0C10" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-15%] left-[-10%] w-[65vw] h-[65vw] rounded-full"
          style={{ background: "radial-gradient(circle, #3730A3 0%, transparent 70%)", filter: "blur(70px)", opacity: 0.13 }}
        />
        <motion.div
          animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 1.2, 1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-15%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle, #5B21B6 0%, transparent 70%)", filter: "blur(80px)", opacity: 0.10 }}
        />
        <motion.div
          animate={{ x: [0, 20, -40, 0], y: [0, 30, 20, 0], opacity: [0.18, 0.12, 0.18] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[45%] right-[5%] w-[35vw] h-[35vw] rounded-full"
          style={{ background: "radial-gradient(circle, #1E1B4B 0%, transparent 70%)", filter: "blur(50px)", opacity: 0.18 }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {phase === "setup"      && renderSetup()}
          {phase === "categories" && renderCategories()}
          {phase === "reveal"     && renderReveal()}
          {phase === "starter"    && renderStarterPicker()}
          {phase === "playing"    && renderPlaying()}
          {phase === "settings"   && renderSettings()}
          {phase === "results"    && renderResults()}
        </AnimatePresence>
      </div>
    </div>
  );
}

