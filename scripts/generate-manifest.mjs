import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs";
import path from "node:path";

const [zipPathArg, versionArg, downloadUrlArg, outputPathArg] = process.argv.slice(2);

if (!zipPathArg || !versionArg || !downloadUrlArg) {
  console.error(
    "Usage: node scripts/generate-manifest.mjs <zipPath> <version> <downloadUrl> [outputPath]",
  );
  process.exit(1);
}

const zipPath = path.resolve(zipPathArg);
const outputPath = path.resolve(outputPathArg ?? path.join(path.dirname(zipPath), "manifest.json"));
const zipSize = fs.statSync(zipPath).size;
const sha256 = await hashFile(zipPath);

const manifest = {
  version: versionArg,
  url: downloadUrlArg,
  sha256,
  size: zipSize,
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`manifest.json created: ${outputPath}`);

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
