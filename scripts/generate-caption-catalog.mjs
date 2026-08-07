import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTextIfChanged } from "./write-text-if-changed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const captionsDir = path.join(root, "captions");
const catalogPath = path.join(captionsDir, "catalog.json");
const subtitleFileName = "subtitle.ass";
const metaFileName = "meta.json";

const entries = [];

for (const entry of fs.readdirSync(captionsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const presetId = entry.name;
  const presetDir = path.join(captionsDir, presetId);
  const metaPath = path.join(presetDir, metaFileName);
  const subtitlePath = path.join(presetDir, subtitleFileName);

  if (!fs.existsSync(metaPath)) {
    console.warn(`skip ${presetId}: ${metaFileName} was not found`);
    continue;
  }
  if (!fs.existsSync(subtitlePath)) {
    console.warn(`skip ${presetId}: ${subtitleFileName} was not found`);
    continue;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const displayName = String(meta.displayName ?? "").trim();
  if (!displayName) {
    throw new Error(`${metaPath} is missing displayName`);
  }

  entries.push({
    id: presetId,
    displayName,
  });
}

entries.sort((left, right) => left.displayName.localeCompare(right.displayName, "ja"));

const catalog = { entries };
const catalogChanged = writeTextIfChanged(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
if (catalogChanged) {
  console.log(`caption catalog generated: ${catalogPath} (${entries.length} entries)`);
} else {
  console.log(`caption catalog unchanged: ${catalogPath} (${entries.length} entries)`);
}
