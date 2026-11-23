import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATEGORIES, DEFAULT_CATEGORY_IDS, getAllLocations } from "../data/themes.ts";

const readPack = (file) => JSON.parse(
  readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"),
);

test("all 21 category IDs are unique and selectable", () => {
  assert.equal(CATEGORIES.length, 21);
  const ids = CATEGORIES.map((category) => category.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(new Set(DEFAULT_CATEGORY_IDS), new Set(ids));
});

test("every category contains meaningful unique words", () => {
  for (const category of CATEGORIES) {
    assert.ok(category.name.trim().length > 0, `Missing name: ${category.id}`);
    assert.ok(category.locations.length >= 20, `Too few words: ${category.id}`);
    const words = category.locations.map((raw) => raw.split(":")[0].trim().toLowerCase());
    assert.ok(words.every(Boolean), `Blank word in ${category.id}`);
    assert.equal(new Set(words).size, words.length, `Duplicate words in ${category.id}`);
  }
});

test("getAllLocations returns only selected packs", () => {
  const selected = ["places", "animals"];
  const actual = getAllLocations(selected);
  const expectedCount = CATEGORIES.filter((c) => selected.includes(c.id))
    .reduce((total, category) => total + category.locations.length, 0);
  assert.equal(actual.length, expectedCount);
});

test("anime and movies special packs have content", () => {
  const anime = readPack("animeWords.json").animeWords;
  const movies = readPack("moviesWords.json").moviesWords;
  assert.ok(Object.values(anime).flat().length >= 100);
  assert.ok(Object.values(movies).flat().length >= 100);
});
