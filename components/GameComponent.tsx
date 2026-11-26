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
import { App } from "@capacitor/app";
import {
  CATEGORIES,
  getAllLocations,
  type CategoryId,
  DEFAULT_CATEGORY_IDS,
} from "../data/themes";
import {
  WORD_DESCRIPTIONS,
  getCategoryDescription,
} from "../data/wordDescriptions";
import animeWords from "../data/animeWords.json";
import moviesWords from "../data/moviesWords.json";
import SetupScreen from "./SetupScreen";
import CategoryScreen from "./CategoryScreen";
import RoleRevealScreen from "./RoleRevealScreen";
import StarterScreen from "./StarterScreen";
import PlayingScreen from "./PlayingScreen";
import ResultsScreen from "./ResultsScreen";
import SettingsScreen from "./SettingsScreen";
import { restoreSelectedCategories } from "../data/categorySelection";
import {
  getAndroidBackAction,
  type GamePhase,
} from "../data/backNavigation";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// Special packs already existed in game logic but were not selectable in the UI.
const EXTRA_CATEGORIES = [
  { id: "anime" as const, name: "Аниме", emoji: "🍥", locations: animeWordPool },
  { id: "movies" as const, name: "Кино — спецнабор", emoji: "🎬", locations: moviesWordPool },
];

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
    const availableCategoryIds = new Set<SelectableCategoryId>([
      ...DEFAULT_CATEGORY_IDS,
      "anime",
      "movies",
    ]);
    const selectedCategories = restoreSelectedCategories<SelectableCategoryId>(
      loaded.selectedCategories,
      DEFAULT_CATEGORY_IDS.slice(0, 4),
      availableCategoryIds,
    );
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
      selectedCategories,
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
  const [hasViewedRole, setHasViewedRole] = useState<boolean>(false);
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
  const phaseRef = useRef<GamePhase>(phase);
  const roleVisibleRef = useRef<boolean>(isRoleVisible);
  useEffect(() => {
    fingerTouchesRef.current = fingerTouches;
  }, [fingerTouches]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    roleVisibleRef.current = isRoleVisible;
  }, [isRoleVisible]);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    void App.addListener("backButton", () => {
      const action = getAndroidBackAction(phaseRef.current, roleVisibleRef.current);
      if (action === "exit") {
        void App.exitApp();
        return;
      }
      if (action === "hide-role") {
        setIsRoleVisible(false);
        return;
      }

      setIsRoleVisible(false);
      setIsTimerRunning(false);
      setPhase("setup");
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    });

    return () => {
      disposed = true;
      void removeListener?.();
    };
  }, []);

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
    setHasViewedRole(false);
    setPanOffset({ x: 0, y: 0 });
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
    if (isCardLeaving || !hasViewedRole || isRoleVisible || cardSwipeHandledRef.current) return;
    cardSwipeHandledRef.current = true;
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
      setHasViewedRole(false);
      setCardExit({ x: 360, y: -28, rotate: 12 });
      cardSwipeHandledRef.current = false;
      
      if (nextPlayer < settings.playersCount) {
        setCurrentPlayer(nextPlayer);
      } else {
        setPhase("starter");
      }
    }, 300);
  }, [currentPlayer, isCardLeaving, isRoleVisible, hasViewedRole, settings.playersCount]);

  const flipRoleCard = useCallback((): void => {
    if (isCardLeaving) return;
    if (cardSwipeHandledRef.current) return;
    vibrate([30, 20, 60]);
    if (!isRoleVisible) {
      playRevealSound();
      setHasViewedRole(true);
    }
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
    const colors = ["#FF525E", "#FFC857", "#F59E0B", "#10B981", "#F43F5E", "#E83449", "#84CC16", "#06B6D4"];
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
    <SetupScreen
      key="setup"
      playersCount={settings.playersCount}
      spyCount={settings.spyCount}
      timerMinutes={settings.timerMinutes}
      gameMode={settings.gameMode}
      selectedCategoryIds={settings.selectedCategories}
      categories={[...CATEGORIES, ...EXTRA_CATEGORIES]}
      onPlayersChange={(count) => {
        vibrate(20);
        setSettings((prev) => {
          const playersCount = Math.max(3, Math.min(12, count));
          return {
            ...prev,
            playersCount,
            spyCount: clampSpyCount(prev.spyCount, playersCount),
          };
        });
      }}
      onSpyCountChange={(count) => {
        vibrate(20);
        setSettings((prev) => ({
          ...prev,
          spyCount: clampSpyCount(count, prev.playersCount),
        }));
      }}
      onTimerChange={(minutes) => {
        vibrate(20);
        setSettings((prev) => ({ ...prev, timerMinutes: minutes }));
      }}
      onModeChange={(gameMode) => {
        vibrate(20);
        setSettings((prev) => ({ ...prev, gameMode }));
      }}
      onOpenCategories={() => setPhase("categories")}
      onOpenSettings={() => setPhase("settings")}
      onStart={startGame}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Category Selector
  // ─────────────────────────────────────────────────────────────────────────

  const renderCategories = (): JSX.Element => (
    <CategoryScreen
      key="categories"
      categories={[...CATEGORIES, ...EXTRA_CATEGORIES]}
      selectedCategoryIds={settings.selectedCategories}
      onToggle={toggleCategory}
      onSelectAll={() => {
        vibrate(20);
        setSettings((prev) => ({
          ...prev,
          selectedCategories: [...CATEGORIES, ...EXTRA_CATEGORIES].map((category) => category.id),
        }));
      }}
      onClear={() => {
        vibrate(20);
        setSettings((prev) => ({ ...prev, selectedCategories: [] }));
      }}
      onBack={() => setPhase("setup")}
    />
  );

  // ── Secret-card presentation / reveal ──────────────────────────────────
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
          ? `Ещё шпион: ${otherSpyPlayers[0]}`
          : `Ещё шпионы: ${otherSpyPlayers.join(", ")}`;

    return (
      <RoleRevealScreen
        key={`reveal-${currentPlayer}`}
        playerName={getPlayerName(currentPlayer)}
        playerIndex={currentPlayer}
        playersCount={settings.playersCount}
        isSpy={spy}
        disguisedSpyMode={disguisedSpyMode}
        word={visibleWord}
        wordHint={visibleWordHint}
        otherSpiesNote={otherSpiesNote}
        isRoleVisible={isRoleVisible}
        hasViewedRole={hasViewedRole}
        isCardLeaving={isCardLeaving}
        cardExit={cardExit}
        panOffset={panOffset}
        onFlip={flipRoleCard}
        onPan={(info) => {
          if (!hasViewedRole || isRoleVisible || isCardLeaving) return;
          setPanOffset({ x: info.offset.x, y: info.offset.y });
        }}
        onPanEnd={(info) => {
          if (!hasViewedRole || isRoleVisible || isCardLeaving) return;
          const distance = Math.hypot(info.offset.x, info.offset.y);
          const velocity = Math.hypot(info.velocity.x, info.velocity.y);
          if (distance > 85 || velocity > 600) {
            handleRevealDone(info);
          } else {
            setPanOffset({ x: 0, y: 0 });
          }
        }}
        onNext={() => handleRevealDone()}
      />
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Starter Picker
  // ─────────────────────────────────────────────────────────────────────────

  const renderStarterPicker = (): JSX.Element => (
    <StarterScreen
      key="starter"
      playersCount={settings.playersCount}
      touches={fingerTouches}
      isPicking={isPickingStarter}
      countdown={starterCountdown}
      winnerIndex={starterIndex}
      onPointerDown={upsertFingerTouch}
      onPointerMove={moveFingerTouch}
      onPointerUp={removeFingerTouch}
      onPick={pickStarter}
      onReset={clearStarterPicker}
      onStart={startPlaying}
    />
  );

  // ── Discussion timer and possible-word list ─────────────────────────────
  const renderPlaying = (): JSX.Element => (
    <PlayingScreen
      key="playing"
      timerSeconds={timerSeconds}
      timerMinutes={settings.timerMinutes}
      isTimerRunning={isTimerRunning}
      playersCount={settings.playersCount}
      spiesCount={spyIndices.size}
      words={allGameLocations}
      wordsExpanded={showLocationList}
      onToggleWords={() => {
        vibrate(20);
        setShowLocationList((prev) => !prev);
      }}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onFinishRound={() => {
        vibrate(30);
        setIsTimerRunning(false);
        setPhase("results");
      }}
      onExit={() => {
        vibrate(30);
        setIsTimerRunning(false);
        setPhase("setup");
      }}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Settings
  // ─────────────────────────────────────────────────────────────────────────

  const renderSettings = (): JSX.Element => (
    <SettingsScreen
      key="settings"
      playersCount={settings.playersCount}
      playerNames={settings.playerNames}
      customLocations={customLocations}
      customInput={customInput}
      onPlayerNameChange={(index, value) => {
        setSettings((prev) => {
          const playerNames = [...prev.playerNames];
          playerNames[index] = value;
          return { ...prev, playerNames };
        });
      }}
      onCustomInputChange={setCustomInput}
      onAddCustomLocation={addCustomLocation}
      onRemoveCustomLocation={removeCustomLocation}
      onBack={() => setPhase("setup")}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Results Screen
  // ─────────────────────────────────────────────────────────────────────────

  const renderResults = (): JSX.Element => (
    <ResultsScreen
      key="results"
      location={currentLocation}
      spyWord={spyWord}
      differentWordMode={settings.gameMode === "different-word"}
      spyNames={Array.from(spyIndices).map((idx) => getPlayerName(idx))}
      playersCount={settings.playersCount}
      onReplay={startGame}
      onMenu={() => setPhase("setup")}
    />
  );

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
          style={{ background: "radial-gradient(circle, #7F1D2D 0%, transparent 70%)", filter: "blur(70px)", opacity: 0.13 }}
        />
        <motion.div
          animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 1.2, 1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-15%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle, #9F1239 0%, transparent 70%)", filter: "blur(80px)", opacity: 0.10 }}
        />
        <motion.div
          animate={{ x: [0, 20, -40, 0], y: [0, 30, 20, 0], opacity: [0.18, 0.12, 0.18] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[45%] right-[5%] w-[35vw] h-[35vw] rounded-full"
          style={{ background: "radial-gradient(circle, #3F1119 0%, transparent 70%)", filter: "blur(50px)", opacity: 0.18 }}
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

