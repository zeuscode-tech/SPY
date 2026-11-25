"use client";

import { motion, AnimatePresence, type PanInfo } from "framer-motion";

export type SwipeExit = { x: number; y: number; rotate: number };
export type SwipeOffset = { x: number; y: number };

interface RoleRevealScreenProps {
  playerName: string;
  playerIndex: number;
  playersCount: number;
  isSpy: boolean;
  disguisedSpyMode: boolean;
  word: string;
  wordHint: string;
  otherSpiesNote: string;
  isRoleVisible: boolean;
  hasViewedRole: boolean;
  isCardLeaving: boolean;
  cardExit: SwipeExit;
  panOffset: SwipeOffset;
  onFlip: () => void;
  onPan: (info: PanInfo) => void;
  onPanEnd: (info: PanInfo) => void;
  onNext: () => void;
}

export default function RoleRevealScreen({
  playerName,
  playerIndex,
  playersCount,
  isSpy,
  disguisedSpyMode,
  word,
  wordHint,
  otherSpiesNote,
  isRoleVisible,
  hasViewedRole,
  isCardLeaving,
  cardExit,
  panOffset,
  onFlip,
  onPan,
  onPanEnd,
  onNext,
}: RoleRevealScreenProps): JSX.Element {
  const showExplicitSpy = isSpy && !disguisedSpyMode;
  const canPass = hasViewedRole && !isRoleVisible && !isCardLeaving;

  return (
    <motion.main
      key="reveal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-[100dvh] flex-col items-center gap-5 overflow-x-hidden px-5 pb-8 pt-8 text-center text-white"
    >
      <div className="w-full max-w-sm text-left">
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
          <span className="text-[#FF8B92]">Секретная карта</span>
          <span className="text-white/50">{playerIndex + 1} / {playersCount}</span>
        </div>
        <div className="flex gap-1.5" aria-label={"Игрок " + (playerIndex + 1) + " из " + playersCount}>
          {Array.from({ length: playersCount }, (_, index) => (
            <span
              key={index}
              className={"h-1.5 flex-1 rounded-full " +
                (index <= playerIndex ? "bg-[#FF525E]" : "bg-white/10")}
            />
          ))}
        </div>
      </div>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Передай телефон игроку</p>
        <h1 className="max-w-xs break-words text-2xl font-black tracking-tight">{playerName}</h1>
        <p className="text-[13px] text-white/50">Посмотри роль так, чтобы другие не увидели.</p>
      </header>

      <div className="relative w-full max-w-[316px]" style={{ perspective: 1200 }}>
        {playerIndex < playersCount - 1 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 translate-y-3 scale-[0.96] rounded-[28px] border border-white/10 bg-[#191519]" />
        )}
        <motion.div
          onPan={(_, info) => { if (!isCardLeaving) onPan(info); }}
          onPanEnd={(_, info) => { if (!isCardLeaving) onPanEnd(info); }}
          animate={isCardLeaving
            ? { ...cardExit, opacity: 0 }
            : { x: panOffset.x, y: panOffset.y, rotate: panOffset.x / 16, opacity: 1 }}
          transition={isCardLeaving || (panOffset.x === 0 && panOffset.y === 0)
            ? { duration: 0.25, ease: "easeOut" }
            : { duration: 0 }}
          className="relative"
        >
          <button
            type="button"
            onClick={onFlip}
            onContextMenu={(event) => event.preventDefault()}
            disabled={isCardLeaving}
            aria-label={isRoleVisible ? "Скрыть секретную роль" : "Открыть секретную роль"}
            aria-pressed={isRoleVisible}
            className="relative block aspect-[3/4] w-full select-none rounded-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8585]"
            style={{ touchAction: "none", WebkitUserSelect: "none", perspective: 1200 }}
          >
            <motion.div
              animate={{ rotateY: isRoleVisible ? 180 : 0 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-full rounded-[28px]"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-[28px] border border-[#FF525E]/30 bg-[#1B1319] px-5 py-7 shadow-[0_18px_55px_rgba(0,0,0,0.5)]"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">SPY / CLASSIFIED</span>
                <div className="relative flex h-48 w-48 items-center justify-center">
                  <div aria-hidden="true" className="absolute inset-0 rounded-full border border-[#FF525E]/25" />
                  <div aria-hidden="true" className="absolute inset-5 rounded-full border border-[#FF525E]/15" />
                  <div aria-hidden="true" className="absolute inset-10 rounded-full border border-[#FF525E]/30" />
                  <span className="text-[94px] font-black leading-none text-[#FF5C67] drop-shadow-[0_4px_28px_rgba(255,82,94,0.28)]">?</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Твоя роль скрыта</p>
                  <p className="mt-2 text-xs text-white/50">Нажми, чтобы открыть</p>
                </div>
              </div>

              <div
                className={"absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border p-7 shadow-[0_18px_55px_rgba(0,0,0,0.5)] " +
                  (showExplicitSpy
                    ? "border-[#FF525E]/65 bg-[#261016]"
                    : "border-[#FF7A59]/45 bg-[#1C1619]")}
                style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <span className="absolute top-7 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Только для тебя</span>
                <AnimatePresence mode="wait">
                  {showExplicitSpy ? (
                    <motion.div key="spy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="text-5xl">🕵️</div>
                      <h2 className="text-3xl font-black uppercase tracking-wider text-[#FF6C74]">Ты шпион</h2>
                      <p className="text-[13px] leading-relaxed text-white/75">Не знаешь слово. Слушай других и не выдавай себя.</p>
                      <p className="text-xs leading-relaxed text-[#FF9A9F]">{otherSpiesNote}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                        {isSpy ? "Твоё секретное слово" : "Слово раунда"}
                      </p>
                      <h2 className="break-words text-[25px] font-black leading-tight text-[#FF9A84]">{word}</h2>
                      <p className="max-h-32 overflow-y-auto break-words text-xs leading-relaxed text-white/65">{wordHint}</p>
                      {isSpy && <p className="text-xs leading-relaxed text-[#FF9A9F]">{otherSpiesNote}</p>}
                      {!isSpy && <span className="inline-block rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/50">Мирный игрок</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="absolute bottom-7 text-[11px] text-white/40">Нажми, чтобы скрыть</p>
              </div>
            </motion.div>
          </button>
        </motion.div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <p className="text-xs leading-relaxed text-white/45">
          {isRoleVisible
            ? "Запомни роль и закрой карточку перед передачей телефона."
            : hasViewedRole
              ? "Роль скрыта. Теперь можно передать телефон дальше."
              : "Открой карточку, посмотри свою роль и снова закрой её."}
        </p>
        <button
          type="button"
          onClick={isRoleVisible ? onFlip : onNext}
          disabled={isCardLeaving || (!isRoleVisible && !canPass)}
          className="flex min-h-[54px] w-full items-center justify-center rounded-[17px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-5 text-sm font-black uppercase tracking-[0.05em] transition-transform active:scale-[0.98] disabled:opacity-35"
        >
          {isRoleVisible
            ? "Скрыть роль"
            : playerIndex === playersCount - 1 ? "Перейти к игре →" : "Следующий игрок →"}
        </button>
        {canPass && <p className="text-[11px] text-white/35">Можно также свайпнуть карточку в сторону.</p>}
      </div>
    </motion.main>
  );
}
