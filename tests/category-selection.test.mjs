import test from "node:test";
import assert from "node:assert/strict";
import { restoreSelectedCategories } from "../data/categorySelection.ts";

const allowed = new Set(["places", "food", "anime"]);
const defaults = ["places", "food"];

test("initial game uses defaults only when category settings are missing", () => {
  assert.deepEqual(restoreSelectedCategories(undefined, defaults, allowed), defaults);
  assert.deepEqual(restoreSelectedCategories(null, defaults, allowed), defaults);
});

test("intentionally clearing all categories persists after restart", () => {
  assert.deepEqual(restoreSelectedCategories([], defaults, allowed), []);
});

test("unknown packs are removed and selected packs keep original order", () => {
  assert.deepEqual(
    restoreSelectedCategories(["anime", "unknown", "food", "anime"], defaults, allowed),
    ["anime", "food"],
  );
});
