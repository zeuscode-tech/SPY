"use client";

import { motion } from "framer-motion";

type GameMode = "classic" | "different-word";

export interface SetupCategory {
  id: string;
  name: string;
  emoji: string;
  locations: string[];
}

interface SetupScreenProps {
  playersCount: number;
  spyCount: number;
  timerMinutes: number;
  gameMode: GameMode;
  selectedCategoryIds: readonly string[];
  categories: readonly SetupCategory[];
  onPlayersChange: (count: number) => void;
  onSpyCountChange: (count: number) => void;
  onTimerChange: (minutes: number) => void;
  onModeChange: (mode: GameMode) => void;
  onOpenCategories: () => void;
  onOpenSettings: () => void;
  onStart: () => void;
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={"Уменьшить: " + label}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.07] text-2xl text-white disabled:opacity-25"
        >
          −
        </button>
        <span aria-live="polite" className="min-w-8 text-center text-[32px] font-black tabular-nums tracking-tight">
          {value}
        </span>
        <button
          type="button"
          aria-label={"Увеличить: " + label}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] border border-[#FF525E]/30 bg-[#FF525E]/15 text-2xl text-[#FF7A59] disabled:opacity-25"
        >
          +
        </button>
      </div>
    </div>
  );
}

const TIMER_OPTIONS = [3, 5, 7, 8, 10, 12] as const;
const MODES: { id: GameMode; title: string; description: string; icon: string }[] = [
  {
    id: "classic",
    title: "Классика",
    description: "Шпион не знает слово",
    icon: "🕵️",
  },
  {
    id: "different-word",
    title: "Другое слово",
    description: "Шпиону дадут другое слово",
    icon: "🎭",
  },
];

export default function SetupScreen({
  playersCount,
  spyCount,
  timerMinutes,
  gameMode,
  selectedCategoryIds,
  categories,
  onPlayersChange,
  onSpyCountChange,
  onTimerChange,
  onModeChange,
  onOpenCategories,
  onOpenSettings,
  onStart,
}: SetupScreenProps): JSX.Element {
  const selectedCategories = categories.filter((cat) => selectedCategoryIds.includes(cat.id));
  const canStart = selectedCategories.length > 0;

  return (
    <motion.main
      key="setup"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="relative flex min-h-[100dvh] w-full flex-col gap-5 overflow-y-auto px-5 pb-40 pt-8 text-white"
    >
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E83449] to-[#FF7A59] text-xl font-black shadow-[0_8px_24px_rgba(232,52,73,0.25)]">
            S
          </div>
          <div>
            <div className="text-xl font-black leading-tight tracking-[0.15em]">SPY</div>
            <div className="text-[10px] font-medium tracking-[0.15em] text-white/40">ИГРА ДЛЯ КОМПАНИИ</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Открыть настройки"
          onClick={onOpenSettings}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl text-white/80 active:scale-95"
        >
          ⚙
        </button>
      </header>

      <section className="relative isolate overflow-hidden rounded-[28px] border border-[#FF525E]/20 bg-[#181116] px-6 py-7 shadow-[0_18px_40px_rgba(0,0,0,0.23)]">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#E83449]/20 blur-[65px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -left-14 h-48 w-48 rounded-full bg-[#FF7A59]/10 blur-[60px]" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-7 h-44 w-44 rounded-full border border-[#FF525E]/20"
        >
          <div className="absolute inset-6 rounded-full border border-[#FF525E]/20" />
          <div className="absolute inset-12 rounded-full border border-[#FF525E]/30" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-[#FF525E]/20" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-[#FF525E]/20" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FF525E]/25 bg-[#FF525E]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF9A9F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF525E]" />
            OFFLINE PARTY GAME
          </span>
          <h1 className="mt-5 text-[38px] font-black uppercase leading-[1.05] tracking-[-0.035em]">
            Найди <span className="text-[#FF6E70]">шпиона</span>
          </h1>
          <p className="mt-3 max-w-[240px] text-[13px] leading-relaxed text-white/60">
            Настрой игроков, выбери категории и передавай телефон по кругу.
          </p>
          <div className="mt-5 flex items-center gap-4 text-[11px] font-semibold text-white/65">
            <span>👥 3–12 игроков</span>
            <span>◷ Быстрый старт</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="round-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="round-heading" className="text-base font-bold tracking-tight">
            Настройка раунда
          </h2>
          <span className="text-[11px] text-white/35">01 / 03</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Counter
            label="Игроков"
            value={playersCount}
            min={3}
            max={12}
            onChange={onPlayersChange}
          />
          <Counter
            label="Шпионов"
            value={spyCount}
            min={1}
            max={Math.max(1, playersCount - 1)}
            onChange={onSpyCountChange}
          />
        </div>
      </section>

      <section aria-labelledby="mode-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="mode-heading" className="text-base font-bold tracking-tight">Режим игры</h2>
          <span className="text-[11px] text-white/35">02 / 03</span>
        </div>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Режим игры">
          {MODES.map((mode) => {
            const active = mode.id === gameMode;
            return (
              <button
                type="button"
                key={mode.id}
                aria-pressed={active}
                onClick={() => onModeChange(mode.id)}
                className={
                  "min-h-[116px] rounded-[20px] border p-4 text-left transition-colors " +
                  (active
                    ? "border-[#FF525E]/60 bg-[#FF525E]/[0.13] shadow-[inset_0_0_0_1px_rgba(255,82,94,0.12)]"
                    : "border-white/10 bg-white/[0.035]")
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xl">{mode.icon}</span>
                  <span className={"flex h-5 w-5 items-center justify-center rounded-full border text-xs " +
                    (active ? "border-[#FF525E] bg-[#FF525E] text-white" : "border-white/25 text-transparent")}
                  >
                    ✓
                  </span>
                </div>
                <div className="text-[13px] font-bold leading-tight">{mode.title}</div>
                <div className="mt-1 text-[11px] leading-snug text-white/50">{mode.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="timer-heading" className="space-y-3">
        <h2 id="timer-heading" className="text-base font-bold tracking-tight">Время на обсуждение</h2>
        <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Таймер в минутах">
          {TIMER_OPTIONS.map((minutes) => {
            const active = timerMinutes === minutes;
            return (
              <button
                type="button"
                key={minutes}
                aria-label={minutes + " минут"}
                aria-pressed={active}
                onClick={() => onTimerChange(minutes)}
                className={
                  "h-11 rounded-xl border text-[13px] font-bold tabular-nums " +
                  (active
                    ? "border-[#FF525E]/70 bg-[#FF525E] text-white"
                    : "border-white/10 bg-white/[0.045] text-white/70")
                }
              >
                {minutes}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="category-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="category-heading" className="text-base font-bold tracking-tight">
            Категории <span className="font-medium text-white/40">({selectedCategories.length})</span>
          </h2>
          <span className="text-[11px] text-white/35">03 / 03</span>
        </div>
        <button
          type="button"
          onClick={onOpenCategories}
          className="w-full rounded-[20px] border border-white/10 bg-white/[0.035] p-4 text-left transition-colors active:bg-white/[0.07]"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold">Выбранные темы</span>
            <span className="text-[12px] font-semibold text-[#FF8585]">Изменить →</span>
          </div>
          {canStart ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCategories.slice(0, 4).map((cat) => (
                <span
                  key={cat.id}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-[11px] text-white/80"
                >
                  {cat.emoji} {cat.name}
                </span>
              ))}
              {selectedCategories.length > 4 && (
                <span className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-white/60">
                  +{selectedCategories.length - 4}
                </span>
              )}
            </div>
          ) : (
            <p role="status" className="mt-2 text-[12px] text-[#FF9A9F]">
              Выбери хотя бы одну категорию, чтобы начать игру.
            </p>
          )}
        </button>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8" style={{ background: "linear-gradient(to top, #0C0C10 58%, rgba(12,12,16,0))" }}>
        <div className="pointer-events-auto mx-auto max-w-lg">
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="flex min-h-[58px] w-full items-center justify-between rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-6 text-[15px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(232,52,73,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>Начать игру</span>
            <span aria-hidden="true" className="text-xl">→</span>
          </button>
          <p className="mt-2 text-center text-[11px] text-white/40">
            {playersCount} игроков · {spyCount} {spyCount === 1 ? "шпион" : "шпионов"} · {timerMinutes} мин
          </p>
        </div>
      </div>
    </motion.main>
  );
}
