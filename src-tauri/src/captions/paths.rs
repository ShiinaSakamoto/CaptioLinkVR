use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::portable::paths;

use super::layout;

/// 同梱字幕プリセットのルートディレクトリを解決する。
///
/// debug ではワークスペースの `captions/` を優先する。
/// Tauri の resource コピーは削除ファイルを残すことがあり、
/// 無いはずの画像が target 側に残って誤表示されるのを防ぐ。
pub fn captions_root(app: &AppHandle) -> Result<PathBuf, String> {
    let candidates = caption_root_candidates(app);

    for candidate in candidates.into_iter().flatten() {
        if candidate.join(layout::CATALOG_FILE).is_file() {
            return Ok(candidate);
        }
    }

    Err("caption presets directory was not found".to_string())
}

fn caption_root_candidates(app: &AppHandle) -> [Option<PathBuf>; 3] {
    if cfg!(debug_assertions) {
        [
            resolve_workspace_captions_dir(),
            resolve_resource_captions_dir(),
            resolve_tauri_resource_captions_dir(app),
        ]
    } else {
        [
            resolve_resource_captions_dir(),
            resolve_tauri_resource_captions_dir(app),
            resolve_workspace_captions_dir(),
        ]
    }
}

pub fn preset_dir(root: &Path, preset_id: &str) -> Result<PathBuf, String> {
    validate_preset_id(preset_id)?;
    let dir = root.join(preset_id);
    let metadata = dir
        .metadata()
        .map_err(|_| format!("caption preset was not found: {preset_id}"))?;
    if !metadata.is_dir() {
        return Err(format!(
            "caption preset path is not a directory: {preset_id}"
        ));
    }
    Ok(dir)
}

pub fn validate_preset_id(preset_id: &str) -> Result<(), String> {
    if preset_id.is_empty() {
        return Err("caption preset id is empty".to_string());
    }
    if preset_id == "." || preset_id == ".." {
        return Err(format!("invalid caption preset id: {preset_id}"));
    }
    if preset_id.contains('/') || preset_id.contains('\\') {
        return Err(format!("invalid caption preset id: {preset_id}"));
    }
    Ok(())
}

fn resolve_resource_captions_dir() -> Option<PathBuf> {
    let resource = paths::resource_dir().ok()?;
    Some(resource.join(layout::CAPTIONS_DIR))
}

fn resolve_tauri_resource_captions_dir(app: &AppHandle) -> Option<PathBuf> {
    let resource = app.path().resource_dir().ok()?;
    Some(resource.join(layout::CAPTIONS_DIR))
}

fn resolve_workspace_captions_dir() -> Option<PathBuf> {
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../captions");
    if workspace.is_dir() {
        Some(workspace)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::validate_preset_id;

    #[test]
    fn validate_preset_id_accepts_folder_name() {
        assert!(validate_preset_id("shiro_four_seasons").is_ok());
        assert!(validate_preset_id("yorutouge").is_ok());
    }

    #[test]
    fn validate_preset_id_rejects_traversal() {
        assert!(validate_preset_id("../escape").is_err());
        assert!(validate_preset_id("").is_err());
    }
}
