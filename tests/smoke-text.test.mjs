import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUiText, uiTextIncludes } from "../scripts/smoke-text.mjs";

test("Android smoke text matching ignores CSS-style casing and whitespace", () => {
  assert.equal(uiTextIncludes("  НАЙДИ\n  ШПИОНА ", "Найди шпиона"), true);
  assert.equal(normalizeUiText("НАЧАТЬ ИГРУ"), "начать игру");
});
