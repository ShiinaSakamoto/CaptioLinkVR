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
const versionUnchanged = previousVersion === newVersion;

fs.mkdirSync(releasesDir, { recursive: true });
const notesPath = path.join(releasesDir, `v${newVersion}.md`);
const notesExist = fs.existsSync(notesPath);

if (versionUnchanged && notesExist) {
  console.error(`Version is already ${newVersion}, and ${path.relative(root, notesPath)} already exists.`);
  process.exit(1);
}

if (versionUnchanged) {
  console.log(`Version is already ${newVersion}. Creating missing release notes only.`);
} else {
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log(`Updated package.json: ${previousVersion} → ${newVersion}`);

  execFileSync(process.execPath, [path.join(__dirname, "sync-version.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
}

if (notesExist) {
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

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function resolveMainRef() {
  for (const ref of ["origin/main", "main"]) {
    const ok = git(["rev-parse", "--verify", ref]);
    if (ok) return ref;
  }
  return "";
}

function parseCommitSubjects(output) {
  if (!output) return [];
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isMergeCommit(ref) {
  // マージコミットは親が2つ以上
  const parents = git(["rev-list", "--parents", "-n", "1", ref]);
  if (!parents) return false;
  return parents.split(/\s+/).length > 2;
}

/**
 * 前回 main への反映時点から、今の作業ブランチ先端までのコミットを集める。
 * develop など main 以外で bump → あとで main へマージしてリリース、の流れを想定。
 */
function collectCommitDraft(_fromVersion) {
  const mainRef = resolveMainRef();
  if (!mainRef) {
    return parseCommitSubjects(git(["log", "--no-merges", "--pretty=format:%s", "HEAD"]));
  }

  const mainTip = git(["rev-parse", mainRef]);
  if (!mainTip) return [];

  // 1) main にまだ入っていない作業ブランチ側のコミット（これからマージする分）
  const unmerged = parseCommitSubjects(
    git(["log", "--no-merges", `${mainTip}..HEAD`, "--pretty=format:%s"]),
  );
  if (unmerged.length > 0) {
    console.log(
      `Release notes draft from ${mainRef}..HEAD (${unmerged.length} commits, not yet on main)`,
    );
    return unmerged;
  }

  // 2) すでに main へマージ済みなら、直前の main マージで取り込まれたコミット
  //    （マージ直後に bump してリリースする想定）
  if (isMergeCommit(mainTip)) {
    const mergedIn = parseCommitSubjects(
      git(["log", "--no-merges", `${mainTip}^1..${mainTip}^2`, "--pretty=format:%s"]),
    );
    if (mergedIn.length > 0) {
      console.log(
        `Release notes draft from last merge into ${mainRef} (${mergedIn.length} commits)`,
      );
      return mergedIn;
    }
  }

  // 3) 直近の main マージが先端でない場合のフォールバック
  const lastMerge = git([
    "log",
    "--first-parent",
    "--merges",
    "-n",
    "1",
    mainRef,
    "--pretty=format:%H",
  ]);
  if (lastMerge) {
    const sinceLastMerge = parseCommitSubjects(
      git(["log", "--no-merges", `${lastMerge}..HEAD`, "--pretty=format:%s"]),
    );
    if (sinceLastMerge.length > 0) {
      console.log(
        `Release notes draft from ${lastMerge.slice(0, 7)}..HEAD (${sinceLastMerge.length} commits)`,
      );
      return sinceLastMerge;
    }

    const mergedIn = parseCommitSubjects(
      git(["log", "--no-merges", `${lastMerge}^1..${lastMerge}^2`, "--pretty=format:%s"]),
    );
    if (mergedIn.length > 0) {
      console.log(
        `Release notes draft from last merge ${lastMerge.slice(0, 7)} (${mergedIn.length} commits)`,
      );
      return mergedIn;
    }
  }

  return [];
}
