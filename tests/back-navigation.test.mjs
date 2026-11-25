import assert from "node:assert/strict";
import test from "node:test";
import { getAndroidBackAction } from "../data/backNavigation.ts";

test("Android Back hides a visible secret role before any navigation", () => {
  assert.equal(getAndroidBackAction("reveal", true), "hide-role");
});

test("Android Back never returns to a previous secret-role card", () => {
  assert.equal(getAndroidBackAction("reveal", false), "setup");
  assert.equal(getAndroidBackAction("starter", false), "setup");
});

test("Android Back returns secondary screens to setup and exits only at root", () => {
  for (const phase of ["categories", "playing", "settings", "results"]) {
    assert.equal(getAndroidBackAction(phase, false), "setup");
  }
  assert.equal(getAndroidBackAction("setup", false), "exit");
});
