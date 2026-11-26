"use client";

import { motion } from "framer-motion";

interface SettingsScreenProps {
  playersCount: number;
  playerNames: readonly string[];
  customLocations: readonly string[];
  customInput: string;
  onPlayerNameChange: (index: number, value: string) => void;
  onCustomInputChange: (value: string) => void;
  onAddCustomLocation: () => void;
  onRemoveCustomLocation: (index: number) => void;
  onBack: () => void;
}

export default function SettingsScreen({
  playersCount,
  playerNames,
  customLocations,
  customInput,
  onPlayerNameChange,
  onCustomInputChange,
  onAddCustomLocation,
  onRemoveCustomLocation,
  onBack,
}: SettingsScreenProps): JSX.Element {
  return (
    <motion.main
      key="settings"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.2 }}
      className="min-h-[100dvh] space-y-5 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-white"
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Назад в главное меню"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl"
        >
          ←
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8A93]">
            Параметры игры
          </p>
          <h1 className="text-[26px] font-black tracking-tight">Настройки</h1>
        </div>
      </header>

      <section className="rounded-[24px] border border-[#FF525E]/15 bg-[#1B1519] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Имена игроков</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Необязательно: оставь поле пустым для стандартного имени.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/60">
            {playersCount}
          </span>
        </div>
        <div className="grid max-h-[350px] gap-3 overflow-y-auto pr-1">
          {Array.from({ length: playersCount }, (_, index) => (
            <label key={index} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-xs font-bold text-[#FF9399]">
                {index + 1}
              </span>
              <span className="sr-only">Имя игрока {index + 1}</span>
              <input
                type="text"
                value={playerNames[index] ?? ""}
                placeholder={`Игрок ${index + 1}`}
                maxLength={15}
                onChange={(event) => onPlayerNameChange(index, event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-[14px] border border-white/10 bg-white/[0.055] px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#FF525E]/60"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-base font-bold">Свои слова</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Добавь места, персонажей или шутки своей компании — они участвуют в случайном выборе.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (customInput.trim()) onAddCustomLocation();
          }}
        >
          <label htmlFor="spy-custom-word" className="sr-only">Новое слово</label>
          <input
            id="spy-custom-word"
            type="text"
            value={customInput}
            maxLength={50}
            placeholder="Например, Кофейня"
            onChange={(event) => onCustomInputChange(event.target.value)}
            className="h-12 min-w-0 flex-1 rounded-[14px] border border-white/10 bg-white/[0.055] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#FF525E]/60"
          />
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="h-12 rounded-[14px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-4 text-sm font-bold text-white disabled:opacity-35"
          >
            Добавить
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {customLocations.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-white/10 px-4 py-5 text-center text-xs text-white/40">
              Своих слов пока нет
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-white/50">
                Добавлено: {customLocations.length}
              </p>
              <div className="max-h-[250px] space-y-2 overflow-y-auto">
                {customLocations.map((word, index) => (
                  <div
                    key={index}
                    className="flex min-h-[48px] items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.045] px-3"
                  >
                    <span className="min-w-0 flex-1 break-words text-sm text-white/80">{word}</span>
                    <button
                      type="button"
                      aria-label={`Удалить слово ${word}`}
                      onClick={() => onRemoveCustomLocation(index)}
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-lg text-[#FF8C92]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-base font-bold">Данные и конфиденциальность</h2>
        <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-white/55">
          <p>SPY работает без аккаунта и не требует интернета для игры.</p>
          <p>Имена игроков, свои слова и настройки сохраняются локально на устройстве.</p>
          <p>В текущей версии нет рекламных и аналитических SDK.</p>
        </div>
        <a
          href="https://spy-privacy-quantum.netlify.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center text-[13px] font-semibold text-[#FF9299] underline underline-offset-4"
        >
          Политика конфиденциальности ↗
        </a>
      </section>

      <button
        type="button"
        onClick={onBack}
        className="min-h-[56px] w-full rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-5 text-sm font-black uppercase tracking-[0.05em] text-white shadow-[0_10px_30px_rgba(232,52,73,.2)]"
      >
        Сохранить и вернуться →
      </button>
      <p className="text-center text-[11px] text-white/35">
        Изменения сохраняются автоматически.
      </p>
    </motion.main>
  );
}
