use std::path::{Path, PathBuf};

use super::layout;

pub fn root_marker_path(root: &Path) -> PathBuf {
    root.join(layout::MAINTENANCE_DIR)
        .join(layout::ROOT_MARKER_FILE)
}

fn legacy_root_marker_path(root: &Path) -> PathBuf {
    root.join(layout::ROOT_MARKER_FILE)
}

pub fn has_root_marker(root: &Path) -> bool {
    root_marker_path(root).is_file() || legacy_root_marker_path(root).is_file()
}

// メンテナンス用ディレクトリ配下のマーカーを用意する。旧配置があれば移す。
pub fn ensure_root_marker(root: &Path) -> Result<(), String> {
    let marker = root_marker_path(root);
    if marker.is_file() {
        return Ok(());
    }

    if let Some(parent) = marker.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            format!(
                "failed to create maintenance directory {}: {error}",
                parent.display()
            )
        })?;
    }

    let legacy = legacy_root_marker_path(root);
    if legacy.is_file() {
        std::fs::copy(&legacy, &marker).map_err(|error| {
            format!(
                "failed to migrate portable root marker to {}: {error}",
                marker.display()
            )
        })?;
        return Ok(());
    }

    std::fs::write(&marker, "").map_err(|error| {
        format!(
            "failed to create portable root marker {}: {error}",
            marker.display()
        )
    })
}
