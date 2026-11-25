"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { CategoryId } from "../data/themes";

type CategorySelectionId = CategoryId | "anime" | "movies";
export type CategoryItem = {
  id: CategorySelectionId;
  name: string;
  emoji: string;
  locations: string[];
};

interface CategoryScreenProps {
  categories: readonly CategoryItem[];
  selectedCategoryIds: readonly CategorySelectionId[];
  onToggle: (id: CategorySelectionId) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onBack: () => void;
}

export default function CategoryScreen({
  categories,
  selectedCategoryIds,
  onToggle,
  onSelectAll,
  onClear,
  onBack,
}: CategoryScreenProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("ru");
    return categories.filter((item) =>
      (!selectedOnly || selectedSet.has(item.id)) &&
      (!text || item.name.toLocaleLowerCase("ru").includes(text)),
    );
  }, [categories, query, selectedOnly, selectedSet]);

  const wordCount = categories
    .filter((item) => selectedSet.has(item.id))
    .reduce((total, item) => total + item.locations.length, 0);

  return (
    <motion.main
      key="categories"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      className="relative min-h-[100dvh] px-5 pb-32 pt-8 text-white"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад к настройке игры"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl"
        >
          ←
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8C94]">
            Настройка игры
          </p>
          <h1 className="text-2xl font-black tracking-tight">Категории</h1>
        </div>
        <div className="rounded-xl border border-[#FF525E]/30 bg-[#FF525E]/10 px-3 py-2 text-xs font-bold text-[#FF969C]">
          {selectedSet.size}/{categories.length}
        </div>
      </header>

      <section className="mb-5 rounded-[22px] border border-[#FF525E]/20 bg-gradient-to-br from-[#211319] to-[#151115] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">Твой набор</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black tabular-nums">{selectedSet.size}</span>
          <span className="text-xs text-white/55">тем · {wordCount} слов</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          Выбранные темы будут использоваться в следующем раунде.
        </p>
      </section>

      <label htmlFor="spy-category-search" className="sr-only">
        Поиск категорий
      </label>
      <div className="mb-4 flex items-center rounded-2xl border border-white/10 bg-white/[0.045] px-4">
        <span aria-hidden="true" className="mr-3 text-white/45">⌕</span>
        <input
          id="spy-category-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти категорию"
          className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedOnly(false)}
          aria-pressed={!selectedOnly}
          className={"rounded-xl border px-4 py-2.5 text-xs font-semibold " +
            (!selectedOnly
              ? "border-[#FF525E]/55 bg-[#FF525E]/15 text-[#FF9A9F]"
              : "border-white/10 bg-white/[0.045] text-white/60")}
        >
          Все
        </button>
        <button
          type="button"
          onClick={() => setSelectedOnly(true)}
          aria-pressed={selectedOnly}
          className={"rounded-xl border px-4 py-2.5 text-xs font-semibold " +
            (selectedOnly
              ? "border-[#FF525E]/55 bg-[#FF525E]/15 text-[#FF9A9F]"
              : "border-white/10 bg-white/[0.045] text-white/60")}
        >
          Выбранные ({selectedSet.size})
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onSelectAll} className="px-1 py-2 text-xs font-semibold text-[#FF8B92]">
          Все +
        </button>
        <button type="button" onClick={onClear} className="px-1 py-2 text-xs text-white/55">
          Сбросить
        </button>
      </div>

      <div role="group" aria-label="Выбор категорий" className="grid grid-cols-2 gap-3">
        {filtered.map((item) => {
          const selected = selectedSet.has(item.id);
          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={selected}
              onClick={() => onToggle(item.id)}
              className={"relative flex min-h-[134px] flex-col items-start rounded-[20px] border p-4 text-left transition-colors active:scale-[0.98] " +
                (selected
                  ? "border-[#FF525E]/55 bg-[#FF525E]/[0.12]"
                  : "border-white/10 bg-white/[0.045]")}
            >
              <span
                aria-hidden="true"
                className={"absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] " +
                  (selected
                    ? "border-[#FF525E] bg-[#FF525E] text-white"
                    : "border-white/25 text-transparent")}
              >
                ✓
              </span>
              <span aria-hidden="true" className="mb-auto text-[30px]">{item.emoji}</span>
              <span className="mt-3 text-[13px] font-bold leading-tight">{item.name}</span>
              <span className="mt-1 text-[11px] text-white/45">{item.locations.length} слов</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div role="status" className="mt-10 rounded-2xl border border-white/10 p-6 text-center">
          <p className="font-semibold">Ничего не найдено</p>
          <p className="mt-1 text-xs text-white/50">Попробуй изменить запрос или фильтр.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setSelectedOnly(false); }}
            className="mt-4 text-sm font-semibold text-[#FF969C]"
          >
            Показать все категории
          </button>
        </div>
      )}

      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-7"
        style={{ background: "linear-gradient(to top, #0C0C10 62%, rgba(12,12,16,0))" }}>
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto mx-auto flex min-h-[56px] w-full max-w-lg items-center justify-center rounded-[18px] bg-gradient-to-r from-[#E83449] to-[#FF7A59] px-5 text-sm font-black uppercase tracking-[0.08em] shadow-[0_10px_30px_rgba(232,52,73,0.28)]"
        >
          Готово · {selectedSet.size} выбрано
        </button>
      </footer>
    </motion.main>
  );
}
