use serde::{Deserialize, Serialize};

pub const MANIFEST_FILE_NAME: &str = "manifest.json";
pub const USER_AGENT_APP: &str = "CaptioLinkVR";
pub const USER_AGENT_APPLY: &str = "CaptiolinkVRApply";

/// 更新パッケージの取得を許可するホスト。
/// ダウンロード先URLは manifest.json 由来なので、万一書き換えられた場合に
/// 任意のサーバーから実行ファイルを取得しないよう配布元を限定する。
const ALLOWED_DOWNLOAD_HOSTS: &[&str] = &[
    "github.com",
    "objects.githubusercontent.com",
    "release-assets.githubusercontent.com",
];

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManifest {
    pub version: String,
    pub url: String,
    pub sha256: String,
    #[serde(default)]
    pub size: Option<u64>,
}

/// 最新リリースの更新パッケージ情報と、UI 表示用のリリースノート。
#[derive(Debug, Clone)]
pub struct LatestUpdate {
    pub manifest: UpdateManifest,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct GithubRelease {
    tag_name: String,
    #[serde(default)]
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
struct GithubAsset {
    name: String,
    // GitHub REST API は snake_case（browser_download_url）。camelCase 変換しない。
    browser_download_url: String,
}

pub fn is_http_success(status: u16) -> bool {
    (200..300).contains(&status)
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    compare_versions(current, latest) == std::cmp::Ordering::Less
}

fn compare_versions(left: &str, right: &str) -> std::cmp::Ordering {
    let left_parts = parse_version(left);
    let right_parts = parse_version(right);
    left_parts.cmp(&right_parts)
}

fn parse_version(value: &str) -> Vec<u64> {
    let trimmed = value.trim().trim_start_matches('v');
    let core = trimmed.split(['-', '+']).next().unwrap_or(trimmed);
    core.split('.')
        .map(|part| part.parse::<u64>().unwrap_or(0))
        .collect()
}

/// 公開リポジトリの最新リリースから manifest.json とリリースノートを取得する。
/// 公開リポジトリのため認証は不要（未認証のGitHub APIはIPあたり60回/時の制限がある）。
///
/// リリースがまだ公開されていない場合はエラーではなく `Ok(None)` を返す。
/// 公開直後でリリース0件のときに、起動ごとエラー表示になるのを避けるため。
pub fn fetch_latest_manifest(owner: &str, repo: &str) -> Result<Option<LatestUpdate>, String> {
    let owner = owner.trim();
    let repo = repo.trim();
    if owner.is_empty() {
        return Err("GitHub owner is not configured".to_string());
    }
    if repo.is_empty() {
        return Err("GitHub repository is not configured".to_string());
    }

    let url = format!("https://api.github.com/repos/{owner}/{repo}/releases/latest");
    let Some(response) = github_api_get_optional(&url)? else {
        return Ok(None);
    };

    let release: GithubRelease = response
        .into_json()
        .map_err(|error| format!("failed to parse GitHub release response: {error}"))?;

    let manifest_asset = release
        .assets
        .iter()
        .find(|asset| asset.name == MANIFEST_FILE_NAME)
        .ok_or_else(|| format!("{MANIFEST_FILE_NAME} asset was not found in the latest release"))?;

    // 公開リリースのアセットは browser_download_url から認証なしで取得できる。
    // APIのアセットエンドポイントと違いレート制限の対象にもならない。
    let manifest_url = validate_download_url(&manifest_asset.browser_download_url)?;
    let response = http_get(&manifest_url, USER_AGENT_APP)
        .map_err(|error| format!("failed to download {MANIFEST_FILE_NAME}: {error}"))?;

    if !is_http_success(response.status()) {
        return Err(format!(
            "{MANIFEST_FILE_NAME} download returned unexpected status: {}",
            response.status()
        ));
    }

    let mut manifest: UpdateManifest = response
        .into_json()
        .map_err(|error| format!("failed to parse {MANIFEST_FILE_NAME}: {error}"))?;

    if manifest.version.trim().is_empty() {
        manifest.version = release.tag_name.trim_start_matches('v').to_string();
    }

    // 更新候補としてUIへ返す前に配布元を検証し、不正なURLの manifest は弾く。
    validate_download_url(&manifest.url)?;

    Ok(Some(LatestUpdate {
        manifest,
        notes: normalize_release_notes(release.body.as_deref()),
    }))
}

fn normalize_release_notes(body: Option<&str>) -> Option<String> {
    let trimmed = body?.trim();
    if trimmed.is_empty() {
        return None;
    }

    // bump テンプレの HTML コメントを落としてから表示する
    let without_comments = strip_html_comments(trimmed);
    let cleaned = without_comments
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string();

    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

fn strip_html_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut rest = input;
    while let Some(start) = rest.find("<!--") {
        out.push_str(&rest[..start]);
        match rest[start + 4..].find("-->") {
            Some(end) => {
                rest = &rest[start + 4 + end + 3..];
            }
            None => {
                // 閉じが無ければ残りは捨てる（コメント開始以降を表示しない）
                return out;
            }
        }
    }
    out.push_str(rest);
    out
}

/// 更新パッケージ本体を取得する。配布元ホストを検証してから要求する。
pub fn download_release_package(url: &str, user_agent: &str) -> Result<ureq::Response, String> {
    let validated = validate_download_url(url)?;
    http_get(&validated, user_agent)
        .map_err(|error| format!("failed to download update package: {error}"))
}

/// 更新パッケージURLがHTTPSかつGitHubのリリース配布ホストであることを検証する。
pub fn validate_download_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    let rest = trimmed
        .strip_prefix("https://")
        .ok_or_else(|| format!("update URL must use https: {trimmed}"))?;

    let authority = rest.split(['/', '?', '#']).next().unwrap_or_default();
    // user@host 形式では @ より後ろが実際のホストになるため、末尾側を採用する
    let host = authority.rsplit('@').next().unwrap_or_default();
    let host = host.split(':').next().unwrap_or_default();

    if !ALLOWED_DOWNLOAD_HOSTS
        .iter()
        .any(|allowed| host.eq_ignore_ascii_case(allowed))
    {
        return Err(format!("update URL host is not allowed: {host}"));
    }

    Ok(trimmed.to_string())
}

/// GitHub API を叩く。404（リリース未公開）だけは `Ok(None)` として扱う。
fn github_api_get_optional(url: &str) -> Result<Option<ureq::Response>, String> {
    match ureq::get(url)
        .set("User-Agent", USER_AGENT_APP)
        .set("Accept", "application/vnd.github+json")
        .set("X-GitHub-Api-Version", "2022-11-28")
        .call()
    {
        Ok(response) => Ok(Some(response)),
        Err(ureq::Error::Status(404, _)) => Ok(None),
        Err(ureq::Error::Status(status, _)) => Err(describe_api_status(status)),
        Err(error) => Err(format!("failed to reach GitHub: {error}")),
    }
}

fn http_get(url: &str, user_agent: &str) -> Result<ureq::Response, String> {
    match ureq::get(url).set("User-Agent", user_agent).call() {
        Ok(response) => Ok(response),
        Err(ureq::Error::Status(status, _)) => {
            Err(format!("download returned unexpected status: {status}"))
        }
        Err(error) => Err(format!("{url}: {error}")),
    }
}

/// 未認証アクセスで起きやすい失敗を、原因が分かるメッセージに変換する。
fn describe_api_status(status: u16) -> String {
    match status {
        403 | 429 => "GitHub API rate limit reached (unauthenticated access is limited per IP address). Please retry later.".to_string(),
        _ => format!("GitHub API returned unexpected status: {status}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_github_release_download_urls() {
        for url in [
            "https://github.com/owner/repo/releases/download/v1.0.0/app.zip",
            "https://objects.githubusercontent.com/some/path/app.zip",
            "https://release-assets.githubusercontent.com/some/path/app.zip",
        ] {
            assert!(validate_download_url(url).is_ok(), "should accept {url}");
        }
    }

    #[test]
    fn rejects_non_https_urls() {
        assert!(validate_download_url("http://github.com/owner/repo/app.zip").is_err());
        assert!(validate_download_url("file:///C:/app.zip").is_err());
    }

    #[test]
    fn rejects_unknown_hosts() {
        assert!(validate_download_url("https://example.com/app.zip").is_err());
        // 許可ホストを接頭辞に含むだけの別ドメインを弾く
        assert!(validate_download_url("https://github.com.example.com/app.zip").is_err());
    }

    #[test]
    fn rejects_userinfo_host_spoofing() {
        // https://github.com@evil.example.com/ の実際のホストは evil.example.com
        assert!(validate_download_url("https://github.com@evil.example.com/app.zip").is_err());
    }

    #[test]
    fn detects_newer_versions() {
        assert!(is_newer_version("0.1.7", "0.1.8"));
        assert!(is_newer_version("0.1.7", "v0.2.0"));
        assert!(!is_newer_version("0.1.7", "0.1.7"));
        assert!(!is_newer_version("0.2.0", "0.1.9"));
    }

    #[test]
    fn parses_github_release_asset_snake_case_fields() {
        let release: GithubRelease = serde_json::from_str(
            r###"{
              "tag_name": "v0.2.2",
              "body": "## Changes\n\n- improve subtitle wrap\n",
              "assets": [
                {
                  "name": "manifest.json",
                  "browser_download_url": "https://github.com/owner/repo/releases/download/v0.2.2/manifest.json"
                }
              ]
            }"###,
        )
        .expect("GitHub release JSON should deserialize");

        assert_eq!(release.tag_name, "v0.2.2");
        assert_eq!(
            release.body.as_deref(),
            Some("## Changes\n\n- improve subtitle wrap\n")
        );
        assert_eq!(release.assets[0].name, "manifest.json");
        assert!(release.assets[0]
            .browser_download_url
            .ends_with("/manifest.json"));
    }

    #[test]
    fn normalizes_blank_release_notes_to_none() {
        assert_eq!(normalize_release_notes(None), None);
        assert_eq!(normalize_release_notes(Some("")), None);
        assert_eq!(normalize_release_notes(Some("  \n  ")), None);
        assert_eq!(
            normalize_release_notes(Some("  - fix overlay\n")),
            Some("- fix overlay".to_string())
        );
        assert_eq!(
            normalize_release_notes(Some("## 変更内容\n\n- fix\n\n<!-- edit before push -->\n")),
            Some("## 変更内容\n\n- fix".to_string())
        );
    }
}
