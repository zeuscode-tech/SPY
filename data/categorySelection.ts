/**
 * Restores category selections without treating an intentionally empty list
 * as missing settings. Invalid/removed IDs are discarded.
 */
export function restoreSelectedCategories<T extends string>(
  saved: unknown,
  defaults: readonly T[],
  allowed: ReadonlySet<T>,
): T[] {
  if (!Array.isArray(saved)) return defaults.filter((id) => allowed.has(id));
  return [...new Set(saved.filter((id): id is T => typeof id === "string" && allowed.has(id as T)))];
}
