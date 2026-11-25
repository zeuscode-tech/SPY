#!/usr/bin/env node
// Android WebView smoke test for SPY 2.0. Requires an already installed and
// running *debug* APK. Uses the WebView's local DevTools socket via ADB.
// Deliberately does not touch any signing keys or production app accounts.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { normalizeUiText, uiTextIncludes } from "./smoke-text.mjs";

const PACKAGE = "com.quantumLimited.SPY";
const ARTIFACTS = "smoke-artifacts";
mkdirSync(ARTIFACTS, { recursive: true });
const log = [];
const failures = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function adb(...args) {
  const proc = spawnSync("adb", args, { encoding: "utf8", timeout: 30000 });
  if (proc.error || proc.status !== 0) {
    throw Error(`adb ${args.join(" ")} failed: ${proc.error || proc.stderr}`);
  }
  return proc.stdout.trim();
}
function screenshot(name) {
  const proc = spawnSync("adb", ["exec-out", "screencap", "-p"], {
    maxBuffer: 12 * 1024 * 1024, timeout: 30000,
  });
  if (proc.status === 0 && proc.stdout?.length > 500) {
    writeFileSync(`${ARTIFACTS}/${name}.png`, proc.stdout);
  }
}
function result(name, passed, detail = "") {
  log.push({ name, status: passed ? "PASS" : "FAIL", detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!passed) failures.push(name);
}
function note(name, detail) {
  log.push({ name, status: "NOT_TESTED", detail });
  console.log(`NOT_TESTED ${name}: ${detail}`);
}

async function cdpConnection() {
  const pid = adb("shell", "pidof", PACKAGE).split(/\s+/)[0];
  assert.match(pid, /^\d+$/, "SPY process is not running");
  const expectedSocket = `webview_devtools_remote_${pid}`;
  let socket;
  let sockets = [];
  for (let i = 0; i < 40; i++) {
    const unixSockets = adb("shell", "cat", "/proc/net/unix");
    sockets = [...unixSockets.matchAll(/@?(webview_devtools_remote_\d+)/g)]
      .map((match) => match[1]);
    socket = sockets.find((candidate) => candidate === expectedSocket);
    if (socket) break;
    await sleep(500);
  }
  if (!socket) {
    throw Error(
      `SPY WebView debugging socket ${expectedSocket} missing; found: ${sockets.join(", ") || "none"}`,
    );
  }
  console.log(`Using SPY WebView socket ${socket} for pid ${pid}`);
  try { adb("forward", "--remove", "tcp:9222"); } catch { /* no stale forward */ }
  adb("forward", "tcp:9222", `localabstract:${socket}`);

  let targets = [];
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json", { signal: AbortSignal.timeout(4000) });
      if (res.ok) targets = await res.json();
    } catch { /* still starting */ }
    if (targets.some((item) => item.webSocketDebuggerUrl && item.type === "page")) break;
    await sleep(400);
  }
  const page = targets.find((item) => item.webSocketDebuggerUrl && item.type === "page");
  if (!page) throw Error("No WebView DevTools page target");
  console.log(`Using WebView page ${page.title || "(untitled)"} at ${page.url || "(no URL)"}`);
  const url = page.webSocketDebuggerUrl.replace("localhost:9222", "127.0.0.1:9222");
  const socketWs = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socketWs.addEventListener("open", resolve, { once: true });
    socketWs.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socketWs.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject, timeout } = pending.get(data.id);
      clearTimeout(timeout);
      pending.delete(data.id);
      data.error ? reject(Error(JSON.stringify(data.error))) : resolve(data.result);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(Error(`DevTools ${method} timed out`));
      }, 15000);
      pending.set(id, { resolve, reject, timeout });
      socketWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Runtime.enable");
  await send("Page.enable");
  async function evaluate(expression) {
    const response = await send("Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (response.exceptionDetails) {
      throw Error("WebView JS exception: " + JSON.stringify(response.exceptionDetails).slice(0, 1000));
    }
    return response.result?.value;
  }
  return { evaluate, send, close: () => socketWs.close() };
}

async function main() {
  let cdp;
  try {
    screenshot("00-launch");
    cdp = await cdpConnection();
    const { evaluate } = cdp;
    const bodyText = () => evaluate("document.body.innerText");
    const waitFor = async (text, timeout = 10000) => {
      for (let i = 0; i < timeout / 250; i++) {
        const body = await bodyText();
        if (uiTextIncludes(body, text)) return true;
        await sleep(250);
      }
      const preview = normalizeUiText(await bodyText()).slice(0, 500);
      throw Error(
        `Could not see ${JSON.stringify(text)} in SPY WebView; body preview: ${JSON.stringify(preview)}`,
      );
    };
    const button = async (needle, by = "text") => evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const found = buttons.find((b) => {
        const value = ${by === "aria" ? 'b.getAttribute("aria-label") || ""' : '(b.innerText || b.textContent || "").trim()'};
        return value.toLocaleLowerCase("ru").includes(${JSON.stringify(normalizeUiText(needle))});
      });
      if (!found || found.disabled) return false;
      found.click(); return true;
    })()`);
    const click = async (needle, by = "text") => {
      assert.equal(await button(needle, by), true, `Button absent/disabled: ${needle}`);
      await sleep(500);
    };

    await waitFor("Найди");
    result("Debug app opens into SPY 2.0 setup", true);
    screenshot("01-setup");

    await click("Изменить");
    await waitFor("Твой набор");
    screenshot("02-categories");
    result("Category selector opens", true);

    await click("Сбросить");
    const cleared = await evaluate('document.body.innerText.includes("0/23")');
    assert.ok(cleared, "All 23 categories should be cleared");
    await click("Готово");
    const startDisabled = await evaluate(`(() => {
      const b = Array.from(document.querySelectorAll("button"))
        .find((x) => x.innerText.toLocaleLowerCase("ru").includes("начать игру"));
      return Boolean(b?.disabled);
    })()`);
    assert.ok(startDisabled, "Start must be disabled with no selected categories");
    result("Empty selection blocks starting a game", true);

    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor("Найди");
    const stillEmpty = await evaluate(`(() => {
      const b = Array.from(document.querySelectorAll("button"))
        .find((x) => x.innerText.toLocaleLowerCase("ru").includes("начать игру"));
      return Boolean(b?.disabled);
    })()`);
    assert.ok(stillEmpty, "Empty selection lost on WebView reload");
    result("Empty category selection persists on reload", true);

    await click("Изменить");
    await click("Все +");
    await click("Готово");
    await click("Начать игру");
    await waitFor("Секретная карта");
    screenshot("03-role-hidden");

    for (let i = 0; i < 5; i++) {
      await click("Открыть секретную роль", "aria");
      await waitFor("Только для тебя");
      screenshot(`04-role-visible-${i + 1}`);
      await click("Скрыть роль");
      await sleep(600);
      await click(i === 4 ? "Перейти к игре" : "Следующий игрок");
      if (i !== 4) await waitFor("Секретная карта");
    }
    result("Five sequential hidden/revealed/private role handoffs", true);

    await waitFor("Кто");
    screenshot("05-starter");
    await click("Пропустить");
    await waitFor("Игра идёт");
    screenshot("06-timer");
    result("Starter skip reaches discussion timer", true);

    await click("Пауза");
    await waitFor("Таймер на паузе");
    await click("Продолжить");
    await waitFor("Обсуждение идёт");
    result("Timer pause/resume", true);

    await click("Завершить раунд досрочно");
    await waitFor("Завершить раунд?");
    await click("Подтвердить");
    await waitFor("Раунд");
    const finished = await evaluate(
      'document.body.innerText.toLocaleLowerCase("ru").includes("кто был шпионом?")',
    );
    assert.ok(finished, "Results must reveal spies");
    screenshot("07-results");
    result("Early finish and results", true);

    await click("Играть ещё");
    await waitFor("Секретная карта");
    result("Replay starts new round", true);
    screenshot("08-replay");

    // Known open Android Back issue: record without treating it as a new regression.
    adb("shell", "input", "keyevent", "KEYCODE_BACK");
    await sleep(800);
    const activity = adb("shell", "dumpsys", "activity", "activities");
    const resumed = /mResumedActivity|topResumedActivity/.test(activity)
      ? activity.split("\n").filter((line) => /mResumedActivity|topResumedActivity/.test(line)).slice(-2).join("; ")
      : "Resumed activity not found in dump";
    note("Android Back navigation", `Known QA-002; after Back: ${resumed.slice(0,220)}`);
    note("Multi-touch and background timer", "Require manual Android interaction; not asserted by CDP smoke");
  } catch (error) {
    console.error("Smoke failed:", error);
    result("Smoke execution", false, String(error));
    screenshot("failure");
  } finally {
    try {
      const proc = spawnSync("adb", ["logcat", "-d", "-v", "brief", "-t", "3000"], {
        encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: 25000,
      });
      if (proc.status === 0) writeFileSync(`${ARTIFACTS}/logcat.txt`, proc.stdout);
    } catch {}
    writeFileSync(`${ARTIFACTS}/report.json`, JSON.stringify({
      suite: "SPY 2.0 Android WebView smoke", timestamp: new Date().toISOString(),
      results: log, failures,
    }, null, 2));
    cdp?.close();
  }
  if (failures.length) process.exitCode = 1;
}

main();
