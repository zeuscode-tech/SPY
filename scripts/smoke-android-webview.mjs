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
  let networkDisabled = false;
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
    const waitForValue = async (expression, description, timeout = 10000) => {
      for (let i = 0; i < timeout / 250; i++) {
        try {
          if (await evaluate(expression)) return true;
        } catch { /* navigation can briefly replace the execution context */ }
        await sleep(250);
      }
      throw Error(description);
    };
    const button = async (needle, by = "text") => evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const candidates = buttons.map((b) => {
        const value = ${by === "aria" ? 'b.getAttribute("aria-label") || ""' : '(b.innerText || b.textContent || "").trim()'};
        return { button: b, value: value.toLocaleLowerCase("ru").replace(/\\s+/g, " ").trim() };
      });
      const needle = ${JSON.stringify(normalizeUiText(needle))};
      const match = candidates.find((item) => item.value === needle || item.value.startsWith(needle + " "))
        || candidates.find((item) => item.value.includes(needle));
      const found = match?.button;
      if (!found || found.disabled) return false;
      found.click(); return true;
    })()`);
    const click = async (needle, by = "text", timeout = 10000) => {
      for (let i = 0; i < timeout / 250; i++) {
        try {
          if (await button(needle, by)) {
            await sleep(500);
            return;
          }
        } catch { /* screen transition can briefly replace the execution context */ }
        await sleep(250);
      }
      throw Error(`Button absent/disabled: ${needle}`);
    };

    adb("shell", "svc", "wifi", "disable");
    adb("shell", "svc", "data", "disable");
    networkDisabled = true;
    await cdp.send("Page.reload", { ignoreCache: true });
    await sleep(1000);
    await waitFor("Найди");
    result("Offline WebView reload reaches SPY setup", true, "Wi-Fi and mobile data disabled by ADB");
    result("Debug app opens into SPY 2.0 setup", true);
    screenshot("01-setup");

    await click("Открыть настройки", "aria");
    await waitFor("Настройки");
    const nameEntered = await evaluate(`(() => {
      const input = document.querySelector('input[placeholder="Игрок 1"]');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "Алиса");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    assert.ok(nameEntered, "Player-name input missing in settings");
    await waitForValue(
      `document.querySelector('input[placeholder="Игрок 1"]')?.value === "Алиса"`,
      "Player name did not update",
    );
    await click("Сохранить и вернуться");
    await waitFor("Найди");
    await cdp.send("Page.reload", { ignoreCache: true });
    await sleep(1000);
    await waitFor("Найди");
    await click("Открыть настройки", "aria");
    await waitFor("Настройки");
    await waitForValue(
      `document.querySelector('input[placeholder="Игрок 1"]')?.value === "Алиса"`,
      "Player name did not persist after reload",
    );
    await click("Сохранить и вернуться");
    await waitFor("Найди");
    result("Settings save player name locally and persist offline", true);

    await click("Изменить");
    await waitFor("Твой набор");
    screenshot("02-categories");
    result("Category selector opens", true);

    await click("Сбросить");
    const cleared = await evaluate('document.body.innerText.includes("0/23")');
    assert.ok(cleared, "All 23 categories should be cleared");
    await click("Готово");
    await waitFor("Начать игру");
    await waitForValue(`(() => {
      const b = Array.from(document.querySelectorAll("button"))
        .find((x) => x.innerText.toLocaleLowerCase("ru").trim().startsWith("начать игру"));
      return Boolean(b?.disabled);
    })()`, "Start must be disabled with no selected categories");
    result("Empty selection blocks starting a game", true);

    await cdp.send("Page.reload", { ignoreCache: true });
    await sleep(1000);
    await waitFor("Найди");
    await waitForValue(`(() => {
      const b = Array.from(document.querySelectorAll("button"))
        .find((x) => x.innerText.toLocaleLowerCase("ru").trim().startsWith("начать игру"));
      return Boolean(b?.disabled);
    })()`, "Empty selection lost on WebView reload");
    result("Empty category selection persists on reload", true);

    await click("Изменить");
    await click("Все +");
    await click("Готово");
    await waitFor("Начать игру");
    await click("Начать игру");
    await waitFor("Секретная карта");
    await waitFor("Алиса");
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

    await click("Сбросить таймер", "aria");
    await waitFor("Сбросить таймер?");
    await click("Подтвердить");
    await waitForValue(`(() => {
      const timer = document.querySelector('[role="timer"]');
      return timer?.getAttribute("aria-label") === "Осталось 8 минут 0 секунд"
        && document.body.innerText.toLocaleLowerCase("ru").includes("таймер на паузе");
    })()`, "Timer did not reset to 8:00 and pause");
    result("Timer reset returns to configured duration and pauses", true);

    await click("Продолжить");
    await waitFor("Обсуждение идёт");
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

    await click("Открыть секретную роль", "aria");
    await waitFor("Только для тебя");
    adb("shell", "input", "keyevent", "KEYCODE_BACK");
    await waitForValue(`(() => {
      const card = document.querySelector('button[aria-label="Открыть секретную роль"]');
      return card?.getAttribute("aria-pressed") === "false";
    })()`, "Android Back did not hide the visible secret role");
    result("Android Back hides a visible secret role", true);
    screenshot("09-back-hides-role");

    adb("shell", "input", "keyevent", "KEYCODE_BACK");
    await waitFor("Найди");
    const activity = adb("shell", "dumpsys", "activity", "activities");
    const resumed = /mResumedActivity|topResumedActivity/.test(activity)
      ? activity.split("\n").filter((line) => /mResumedActivity|topResumedActivity/.test(line)).slice(-2).join("; ")
      : "Resumed activity not found in dump";
    assert.ok(resumed.includes(PACKAGE), `Android Back exited SPY: ${resumed}`);
    result("Android Back returns to setup without revealing another role", true, resumed.slice(0,220));
    screenshot("10-back-setup");

    await click("Другое слово");
    await click("Начать игру");
    await waitFor("Секретная карта");
    const differentWords = new Set();
    for (let i = 0; i < 5; i++) {
      await click("Открыть секретную роль", "aria");
      await waitFor("Только для тебя");
      const word = await evaluate(`document.querySelector('button[aria-pressed="true"] h2')?.innerText || ""`);
      assert.ok(word, `Different-word role ${i + 1} has no word`);
      differentWords.add(normalizeUiText(word));
      await click("Скрыть роль");
      await sleep(600);
      await click(i === 4 ? "Перейти к игре" : "Следующий игрок");
      if (i !== 4) await waitFor("Секретная карта");
    }
    assert.equal(differentWords.size, 2, "Different-word mode must assign exactly two distinct words");
    result("Different-word mode gives five players exactly two distinct role words", true);

    await waitFor("Кто");
    const contactsAdded = await evaluate(`(() => {
      const field = document.querySelector('[aria-label="Поле случайного выбора начинающего игрока"]');
      if (!field) return false;
      field.setPointerCapture = () => {};
      const rect = field.getBoundingClientRect();
      const points = [[.2,.3],[.4,.4],[.6,.3],[.3,.7],[.7,.7]];
      points.forEach(([x, y], index) => field.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: index + 1,
        pointerType: "touch",
        isPrimary: index === 0,
        clientX: rect.left + rect.width * x,
        clientY: rect.top + rect.height * y,
      })));
      return true;
    })()`);
    assert.ok(contactsAdded, "Starter multi-contact field missing");
    await waitFor("5 из 5 точек");
    await waitFor("Выбран игрок под красной точкой", 9000);
    result("Starter selection completes with five WebView pointer contacts", true);
    screenshot("11-starter-selected");
    await click("Начать игру");
    await waitFor("Игра идёт");
    result("Selected starter reaches discussion timer", true);

    note("Physical simultaneous multi-touch hardware", "WebView pointer logic passed; simultaneous hardware contacts require a manual device run");
  } catch (error) {
    console.error("Smoke failed:", error);
    result("Smoke execution", false, String(error));
    screenshot("failure");
  } finally {
    if (networkDisabled) {
      try { adb("shell", "svc", "wifi", "enable"); } catch {}
      try { adb("shell", "svc", "data", "enable"); } catch {}
    }
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
