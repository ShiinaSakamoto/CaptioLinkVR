use serde::Serialize;
use tauri::AppHandle;

use super::launch;
use super::manifest::{fetch_latest_manifest, is_newer_version, UpdateManifest};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    current_version: String,
    url: String,
    sha256: String,
    size: Option<u64>,
    notes: Option<String>,
}

/// ビルド時に package.json から埋め込んだ現在バージョンを返す。
#[tauri::command]
pub fn get_app_version() -> String {
    env!("APP_VERSION").to_string()
}

/// 起動時に1回だけ呼ぶ想定。新しい manifest があれば概要を返す。
#[tauri::command]
pub fn check_for_updates() -> Result<Option<UpdateInfo>, String> {
    let owner = env!("GITHUB_OWNER");
    let repo = env!("GITHUB_REPO");
    let current_version = env!("APP_VERSION").to_string();

    if owner.trim().is_empty() {
        return Ok(None);
    }

    // リリースが未公開ならエラーにせず「更新なし」として扱う。
    let Some(latest) = fetch_latest_manifest(owner, repo)? else {
        return Ok(None);
    };

    if !is_newer_version(&current_version, &latest.manifest.version) {
        return Ok(None);
    }

    Ok(Some(UpdateInfo {
        version: latest.manifest.version,
        current_version,
        url: latest.manifest.url,
        sha256: latest.manifest.sha256,
        size: latest.manifest.size,
        notes: latest.notes,
    }))
}

/// 更新ジョブを書き出してメンテナンス用ヘルパーを起動し、本体は終了する。
#[tauri::command]
pub fn start_update(app: AppHandle, manifest: UpdateManifest) -> Result<(), String> {
    launch::start(app, manifest)
}
