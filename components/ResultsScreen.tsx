"use client";

import { motion } from "framer-motion";

interface ResultsScreenProps {
  location: string;
  spyWord: string;
  differentWordMode: boolean;
  spyNames: readonly string[];
  playersCount: number;
  onReplay: () => void;
  onMenu: () => void;
}

export default function ResultsScreen({
  location,
  spyWord,
  differentWordMode,
  spyNames,
  playersCount,
  onReplay,
  onMenu,
}: ResultsScreenProps): JSX.Element {
  return (
    <motion.main
      key="results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24 }}
      className="flex min-h-[100dvh] flex-col gap-5 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 text-white"
    >
      <header className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#FF525E]/25 bg-[#FF525E]/10 text-4xl"
        >
          🕵️
        </motion.div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF9399]">
          Итоги партии
        </p>
        <h1 className="mt-2 text-[32px] font-black leading-tight tracking-tight">
          Раунд <span className="text-[#FF6972]">завершён</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-white/50">
          Секреты раскрыты. Сравните ответы и начинайте следующую партию.
        </p>
      </header>

      <section className="relative isolate overflow-hidden rounded-[25px] border border-[#FF525E]/30 bg-gradient-to-b from-[#27171D] to-[#171217] p-6 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[#FF525E]/15 blur-[55px]"
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-white/45">
            Секретное слово
          </p>
          <h2 className="mt-4 break-words text-[31px] font-black leading-tight text-[#FF9991]">
            {location}
          </h2>
          {differentWordMode && spyWord && (
            <div className="mt-5 rounded-[17px] border border-white/10 bg-white/[0.055] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
                Слово шпиона
              </p>
              <p className="mt-2 break-words text-lg font-bold text-white/90">{spyWord}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[25px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Кто был шпионом?</h2>
          <span className="rounded-full border border-[#FF525E]/25 bg-[#FF525E]/10 px-3 py-1.5 text-xs font-bold text-[#FF929A]">
            {spyNames.length} {spyNames.length === 1 ? "шпион" : "шпиона"}
          </span>
        </div>
        <div className="space-y-2">
          {spyNames.map((name, index) => (
            <motion.div
              key={`${name}-${index}`}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex min-h-[55px] items-center gap-3 rounded-[16px] border border-[#FF525E]/20 bg-[#FF525E]/[0.075] px-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF525E]/20 text-lg">?</span>
              <span className="min-w-0 flex-1 break-words text-sm font-bold">{name}</span>
              <span className="text-[11px] font-semibold uppercase text-[#FF858E]">Шпион</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-white/35">
          Всего участвовало: {playersCount} игроков
        </p>
      </section>

      <div className="mt-auto space-y-3 pt-3">
        <button
          type="button"
          onClick={onReplay}
          className="flex min-h-[58px] w-full items-center justify-between rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_10px_30px_rgba(232,52,73,.28)]"
        >
          Играть ещё <span aria-hidden="true" className="text-xl">↻</span>
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="min-h-[52px] w-full rounded-[18px] border border-white/10 bg-white/[0.055] text-sm font-semibold text-white/80"
        >
          В главное меню
        </button>
      </div>
    </motion.main>
  );
}
