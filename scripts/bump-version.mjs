import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const releasesDir = path.join(root, "releases");

const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const usage = () => {
  console.error("Usage: npm run bump-version -- <new-version>");
  console.error("Example: npm run bump-version -- 0.2.6");
  process.exit(1);
};

const newVersion = process.argv[2]?.trim();
if (!newVersion || !VERSION_RE.test(newVersion)) {
  usage();
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const previousVersion = packageJson.version;
if (previousVersion === newVersion) {
  console.error(`Version is already ${newVersion}.`);
  process.exit(1);
}

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
console.log(`Updated package.json: ${previousVersion} → ${newVersion}`);

execFileSync(process.execPath, [path.join(__dirname, "sync-version.mjs")], {
  cwd: root,
  stdio: "inherit",
});

fs.mkdirSync(releasesDir, { recursive: true });
const notesPath = path.join(releasesDir, `v${newVersion}.md`);
if (fs.existsSync(notesPath)) {
  console.log(`Release notes already exist (left unchanged): ${path.relative(root, notesPath)}`);
} else {
  const commitLines = collectCommitDraft(previousVersion);
  const draftBullets =
    commitLines.length > 0
      ? commitLines.map((line) => `- ${line}`).join("\n")
      : "- （ここに変更内容を書いてください）";

  const content = `# CaptioLinkVR v${newVersion}

## 変更内容

${draftBullets}

<!-- 上の下書きを編集してから main へ push してください。GitHub Release の本文になります。 -->
`;

  fs.writeFileSync(notesPath, content, "utf8");
  console.log(`Created release notes draft: ${path.relative(root, notesPath)}`);
}

console.log("\nNext: edit the release notes, then commit and push to main.");

function collectCommitDraft(fromVersion) {
  const ranges = [`v${fromVersion}..HEAD`, `${fromVersion}..HEAD`];
  for (const range of ranges) {
    try {
      const output = execFileSync("git", ["log", range, "--pretty=format:%s"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (output) {
        return output
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 30);
      }
    } catch {
      // タグが無い場合などは次の候補へ
    }
  }

  try {
    const output = execFileSync("git", ["log", "-n", "15", "--pretty=format:%s"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return [];
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
