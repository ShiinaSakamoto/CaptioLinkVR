import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTextIfChanged } from "./write-text-if-changed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const tauriConfigPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

if (!version || typeof version !== "string") {
  throw new Error("package.json version is missing or invalid.");
}

const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
tauriConfig.version = version;
const tauriChanged = writeTextIfChanged(
  tauriConfigPath,
  `${JSON.stringify(tauriConfig, null, 2)}\n`,
);

let cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
if (!/^version = "/m.test(cargoToml)) {
  throw new Error("Cargo.toml version field was not found.");
}
cargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
const cargoChanged = writeTextIfChanged(cargoTomlPath, cargoToml);

if (tauriChanged || cargoChanged) {
  console.log(`Synced version ${version} to tauri.conf.json and Cargo.toml`);
} else {
  console.log(`Version ${version} already in sync`);
}
