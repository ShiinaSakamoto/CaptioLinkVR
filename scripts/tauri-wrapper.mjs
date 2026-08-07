import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const tauriBin = path.join(root, "node_modules", ".bin", isWindows ? "tauri.cmd" : "tauri");
const syncVersionScript = path.join(root, "scripts", "sync-version.mjs");
const args = process.argv.slice(2);
const command = args[0];
const shouldSyncVersion = command === "build" || command === "dev";

if (shouldSyncVersion) {
  const syncResult = spawnSync("node", [syncVersionScript], {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
  });

  if (syncResult.status !== 0) {
    process.exit(syncResult.status ?? 1);
  }
}

if ((command === "build" || command === "dev") && !args.includes("--features") && !args.includes("-f")) {
  args.push("--features", "steamvr-overlay");
}

const tauriResult = spawnSync(tauriBin, args, {
  cwd: root,
  stdio: "inherit",
  shell: isWindows,
});

if (tauriResult.status !== 0) {
  process.exit(tauriResult.status ?? 1);
}

if (args[0] === "build") {
  const packageScript = path.join(root, "scripts", "package-portable.ps1");
  const packageResult = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", packageScript],
    {
      cwd: root,
      stdio: "inherit",
      shell: isWindows,
    },
  );

  if (packageResult.status !== 0) {
    process.exit(packageResult.status ?? 1);
  }
}
