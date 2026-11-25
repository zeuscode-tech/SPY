export function normalizeUiText(value) {
  return String(value ?? "").toLocaleLowerCase("ru").replace(/\s+/g, " ").trim();
}

export function uiTextIncludes(value, needle) {
  return normalizeUiText(value).includes(normalizeUiText(needle));
}
