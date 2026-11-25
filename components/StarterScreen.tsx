"use client";

import { motion } from "framer-motion";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface StarterTouch {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface StarterScreenProps {
  playersCount: number;
  touches: readonly StarterTouch[];
  isPicking: boolean;
  countdown: number | null;
  winnerIndex: number | null;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPick: () => void;
  onReset: () => void;
  onStart: () => void;
}

export default function StarterScreen({
  playersCount,
  touches,
  isPicking,
  countdown,
  winnerIndex,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPick,
  onReset,
  onStart,
}: StarterScreenProps): JSX.Element {
  const selected = winnerIndex !== null;
  const canPick = touches.length >= 2 && !isPicking && !selected;

  return (
    <motion.main
      key="starter"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.22 }}
      className="flex min-h-[100dvh] flex-col gap-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-white"
    >
      <header className="space-y-2 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF9198]">
          Перед обсуждением
        </p>
        <h1 className="text-[30px] font-black leading-tight tracking-tight">
          Кто <span className="text-[#FF6B73]">начинает?</span>
        </h1>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-white/55">
          Положите два или больше пальцев на экран. Случайная точка станет первой.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[11px] font-medium text-white/65">
          <span className="h-2 w-2 rounded-full bg-[#FF636B]" />
          {touches.length} из {playersCount} точек
        </div>
      </header>

      <div
        role="group"
        aria-label="Поле случайного выбора начинающего игрока"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative isolate min-h-[340px] flex-1 select-none overflow-hidden rounded-[28px] border border-[#FF525E]/20 bg-[#171318]"
        style={{ touchAction: "none" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.24) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.24) 1px,transparent 1px)",
            backgroundSize: "35px 35px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FF525E]/10"
        >
          <div className="absolute inset-8 rounded-full border border-[#FF525E]/10" />
          <div className="absolute inset-16 rounded-full border border-[#FF525E]/10" />
        </div>

        {touches.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#FF525E]/30 bg-[#FF525E]/10 text-[36px]">
              ☝
            </span>
            <p className="text-[13px] font-semibold text-white/75">Коснитесь экрана</p>
            <p className="max-w-[220px] text-center text-xs leading-relaxed text-white/40">
              И удерживайте пальцы до завершения отсчёта
            </p>
          </div>
        )}

        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#FF525E]/40 bg-[#211318]/90 text-[58px] font-black text-[#FF8588] shadow-[0_0_60px_rgba(232,52,73,.25)] backdrop-blur-xl">
              {countdown}
            </div>
          </motion.div>
        )}

        {touches.map((touch, index) => {
          const winner = winnerIndex === index;
          const dimmed = selected && !winner;
          return (
            <motion.div
              key={touch.id}
              aria-hidden="true"
              animate={{
                left: touch.x,
                top: touch.y,
                scale: winner ? 1.27 : 1,
                opacity: dimmed ? 0.3 : 1,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 29 }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            >
              <div
                className={"flex h-[90px] w-[90px] items-center justify-center rounded-full border-2 text-[28px] font-black text-white " +
                  (winner
                    ? "border-[#FFE2D8] bg-[#FF525E] shadow-[0_0_36px_rgba(255,82,94,.8)]"
                    : "border-white/60 shadow-[0_0_25px_rgba(255,255,255,.12)]")}
                style={winner ? undefined : { background: touch.color }}
              >
                {winner ? "✓" : index + 1}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div aria-live="polite" className="min-h-[40px] text-center text-xs leading-relaxed text-white/55">
        {selected
          ? "Выбран игрок под красной точкой. Можно начинать обсуждение."
          : isPicking
            ? "Не убирайте пальцы — идёт случайный выбор."
            : touches.length >= 2
              ? "Готово. Нажмите «Выбрать» или дождитесь автоматического выбора при участии всех."
              : "Можно пропустить этот этап и сразу начать раунд."}
      </div>

      <div className="space-y-3">
        {selected ? (
          <button
            type="button"
            onClick={onStart}
            className="min-h-[58px] w-full rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(232,52,73,.28)]"
          >
            Начать игру →
          </button>
        ) : (
          <button
            type="button"
            onClick={onPick}
            disabled={!canPick}
            className="min-h-[58px] w-full rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] text-sm font-black uppercase tracking-[0.08em] text-white disabled:opacity-35"
          >
            {isPicking ? "Идёт отсчёт…" : "Выбрать начинающего"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onReset}
            disabled={isPicking || touches.length === 0}
            className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white/70 disabled:opacity-35"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={isPicking}
            className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white/75 disabled:opacity-35"
          >
            Пропустить →
          </button>
        </div>
      </div>
    </motion.main>
  );
}
