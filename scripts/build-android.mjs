import { spawnSync } from "node:child_process";
import { join } from "node:path";

const mode = process.argv[2];
const tasks = { apk: "assembleDebug", aab: "bundleRelease" };
if (!tasks[mode]) {
  console.error("Usage: node scripts/build-android.mjs apk|aab");
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error);
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [join("scripts", "build-capacitor.mjs")]);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
run(npx, ["cap", "sync", "android"]);
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(gradle, [tasks[mode]], { cwd: join(process.cwd(), "android") });
