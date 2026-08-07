import { execSync } from "node:child_process";
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const targetVersion = packageJson.version;
const isManualRun = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";

if (!isManualRun && !packageVersionChangedInPush(targetVersion)) {
  console.log(
    "Skip release: package.json version was not changed in this push.",
  );
  process.exit(1);
}

if (tagExistsForVersion(targetVersion)) {
  console.log(`Skip release: tag v${targetVersion} already exists.`);
  process.exit(1);
}

console.log(`Release required for v${targetVersion}.`);
process.exit(0);

function packageVersionChangedInPush(currentVersion) {
  const before = process.env.GITHUB_EVENT_BEFORE;
  if (!before || /^0+$/.test(before)) {
    // 初回 push などは従来どおり公開判定へ進める
    return true;
  }

  try {
    const previousJson = execSync(`git show ${before}:package.json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const previousVersion = JSON.parse(previousJson).version;
    return previousVersion !== currentVersion;
  } catch {
    // 取得できない場合は安全側で公開判定へ進める
    return true;
  }
}

function tagExistsForVersion(version) {
  const tag = `v${version}`;

  if (gitTagExists(tag)) {
    return true;
  }

  // checkout でタグが取れていない場合の保険（private repo でも checkout 済みなら認証済み）
  return gitRemoteTagExists(tag);
}

function gitTagExists(tag) {
  try {
    execSync(`git rev-parse --verify "${tag}^{commit}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function gitRemoteTagExists(tag) {
  try {
    const output = execSync(`git ls-remote --tags origin "refs/tags/${tag}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}
