"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WordEntry {
  word: string;
  description: string;
  raw: string;
}

interface PlayingScreenProps {
  timerSeconds: number;
  timerMinutes: number;
  isTimerRunning: boolean;
  playersCount: number;
  spiesCount: number;
  words: readonly WordEntry[];
  wordsExpanded: boolean;
  onToggleWords: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onFinishRound: () => void;
  onExit: () => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remaining = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

export default function PlayingScreen({
  timerSeconds,
  timerMinutes,
  isTimerRunning,
  playersCount,
  spiesCount,
  words,
  wordsExpanded,
  onToggleWords,
  onToggleTimer,
  onResetTimer,
  onFinishRound,
  onExit,
}: PlayingScreenProps): JSX.Element {
  const [wordQuery, setWordQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<"finish" | "exit" | "reset" | null>(null);

  const fraction = Math.min(1, Math.max(0, timerSeconds / (timerMinutes * 60)));
  const remainingUrgent = timerSeconds <= 30;
  const circumference = 2 * Math.PI * 92;
  const visibleWords = useMemo(() => {
    const query = wordQuery.trim().toLocaleLowerCase("ru");
    return words.filter((entry) => !query || entry.word.toLocaleLowerCase("ru").includes(query));
  }, [wordQuery, words]);
  const shownWords = visibleWords.slice(0, 60);

  const confirm = (): void => {
    if (confirmAction === "finish") onFinishRound();
    if (confirmAction === "exit") onExit();
    if (confirmAction === "reset") onResetTimer();
    setConfirmAction(null);
  };

  return (
    <motion.main
      key="playing"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.22 }}
      className="min-h-[100dvh] space-y-5 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-white"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF9198]">
            SPY / Раунд
          </p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight">Игра идёт</h1>
        </div>
        <button
          type="button"
          onClick={() => setConfirmAction("exit")}
          className="min-h-11 rounded-[15px] border border-white/10 bg-white/[0.05] px-4 text-xs font-semibold text-white/70"
        >
          В меню
        </button>
      </header>

      <section className="relative isolate overflow-hidden rounded-[26px] border border-[#FF525E]/20 bg-[#191317] px-4 pb-7 pt-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-[#FF525E]/10 blur-[65px]" />
        <div className="relative mb-4 flex items-center justify-center gap-2 text-xs font-semibold text-white/65">
          <span className={"h-2 w-2 rounded-full " +
            (isTimerRunning ? "bg-emerald-400" : "bg-amber-400")} />
          {isTimerRunning ? "Обсуждение идёт" : "Таймер на паузе"}
        </div>
        <div className="relative mx-auto h-[236px] w-[236px] max-w-full">
          <svg viewBox="0 0 236 236" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="118" cy="118" r="92" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="118"
              cy="118"
              r="92"
              fill="none"
              stroke={remainingUrgent ? "#FF3B30" : "#FF6972"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              style={{ transition: "stroke-dashoffset 0.75s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              animate={remainingUrgent && isTimerRunning ? { scale: [1, 1.035, 1] } : { scale: 1 }}
              transition={{ duration: 0.9, repeat: remainingUrgent && isTimerRunning ? Infinity : 0 }}
              role="timer"
              aria-label={`Осталось ${Math.floor(timerSeconds / 60)} минут ${timerSeconds % 60} секунд`}
              className={"text-[51px] font-black tabular-nums tracking-[-0.04em] " +
                (remainingUrgent ? "text-[#FF5D65]" : "text-white")}
            >
              {formatTime(timerSeconds)}
            </motion.span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {isTimerRunning ? "Осталось" : "Пауза"}
            </span>
          </div>
        </div>
        {remainingUrgent && (
          <p className="mt-3 text-center text-[12px] font-semibold text-[#FF9295]">
            Последние 30 секунд!
          </p>
        )}
      </section>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button
          type="button"
          onClick={onToggleTimer}
          className={"min-h-[58px] rounded-[18px] px-5 text-sm font-black uppercase tracking-[0.04em] " +
            (isTimerRunning
              ? "border border-[#FF525E]/40 bg-[#FF525E]/15 text-[#FF9C9F]"
              : "bg-gradient-to-r from-[#E83449] to-[#FF7A59] text-white")}
        >
          {isTimerRunning ? "Ⅱ Пауза" : "▶ Продолжить"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("reset")}
          aria-label="Сбросить таймер"
          className="min-h-[58px] min-w-[64px] rounded-[18px] border border-white/10 bg-white/[0.06] text-2xl text-white/75"
        >
          ↺
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3" aria-label="Параметры партии">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
          <span className="text-[11px] text-white/45">Игроков</span>
          <p className="mt-1 text-2xl font-black">{playersCount}</p>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
          <span className="text-[11px] text-white/45">Шпионов</span>
          <p className="mt-1 text-2xl font-black text-[#FF8088]">{spiesCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.035]">
        <button
          type="button"
          onClick={onToggleWords}
          aria-expanded={wordsExpanded}
          aria-controls="spy-possible-words"
          className="flex min-h-[58px] w-full items-center justify-between gap-3 px-4 text-left"
        >
          <div>
            <p className="text-sm font-bold">Возможные слова</p>
            <p className="mt-1 text-[11px] text-white/45">{words.length} вариантов в выбранных темах</p>
          </div>
          <span className="text-xl text-[#FF858D]">{wordsExpanded ? "⌃" : "⌄"}</span>
        </button>
        <AnimatePresence initial={false}>
          {wordsExpanded && (
            <motion.div
              id="spy-possible-words"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/10 px-4 pb-4 pt-3">
                <label className="sr-only" htmlFor="spy-word-filter">Поиск слова</label>
                <input
                  id="spy-word-filter"
                  type="search"
                  value={wordQuery}
                  onChange={(event) => setWordQuery(event.target.value)}
                  placeholder="Поиск по словам"
                  className="mb-3 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-white/35"
                />
                <div className="grid max-h-[310px] grid-cols-2 gap-2 overflow-y-auto">
                  {shownWords.map((entry, index) => (
                    <div key={`${entry.raw}-${index}`} className="rounded-xl border border-white/[0.07] bg-[#1A161A] p-3">
                      <p className="break-words text-xs font-bold text-[#FF9C9F]">{entry.word}</p>
                      <p className="mt-1 break-words text-[10px] leading-relaxed text-white/45">{entry.description}</p>
                    </div>
                  ))}
                </div>
                {visibleWords.length === 0 && (
                  <p role="status" className="py-4 text-center text-xs text-white/45">Ничего не найдено</p>
                )}
                {visibleWords.length > shownWords.length && (
                  <p className="mt-3 text-center text-xs text-white/45">
                    Показаны первые {shownWords.length} из {visibleWords.length}. Уточни поиск.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <button
        type="button"
        onClick={() => setConfirmAction("finish")}
        className="min-h-[54px] w-full rounded-[18px] border border-[#FF525E]/35 bg-[#FF525E]/10 px-5 text-sm font-bold text-[#FFA1A6]"
      >
        Завершить раунд досрочно
      </button>

      <AnimatePresence>
        {confirmAction !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="spy-confirm-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-[24px] border border-white/15 bg-[#21181D] p-6 text-center">
              <h2 id="spy-confirm-title" className="text-xl font-black">
                {confirmAction === "finish"
                  ? "Завершить раунд?"
                  : confirmAction === "exit"
                    ? "Выйти в меню?"
                    : "Сбросить таймер?"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                {confirmAction === "finish"
                  ? "Откроются слово раунда и имена шпионов."
                  : confirmAction === "exit"
                    ? "Текущая партия будет закрыта."
                    : "Таймер вернётся к установленному времени и остановится."}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setConfirmAction(null)}
                  className="min-h-[50px] rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold">
                  Отмена
                </button>
                <button type="button" onClick={confirm}
                  className="min-h-[50px] rounded-2xl bg-gradient-to-r from-[#E83449] to-[#FF7A59] text-sm font-bold">
                  Подтвердить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
