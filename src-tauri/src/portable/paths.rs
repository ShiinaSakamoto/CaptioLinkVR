use std::path::{Path, PathBuf};

use super::layout;

// ポータブル版のルートを解決する。launcher が渡す環境変数を最優先する。
pub fn portable_root() -> Result<PathBuf, String> {
    if let Ok(root) = std::env::var(layout::ROOT_ENV) {
        let path = PathBuf::from(root);
        if path.is_dir() {
            return Ok(path);
        }
        return Err(format!(
            "{} does not point to a directory: {}",
            layout::ROOT_ENV,
            path.display()
        ));
    }

    let exe_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve current exe path: {error}"))?;
    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| "failed to resolve current exe directory".to_string())?;

    if exe_dir.ends_with(layout::RESOURCE_DIR) {
        return exe_dir
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "failed to resolve portable root from resource directory".to_string());
    }

    if exe_dir.join(layout::RESOURCE_DIR).is_dir() {
        return Ok(exe_dir.to_path_buf());
    }

    Ok(exe_dir.to_path_buf())
}

pub fn resource_dir() -> Result<PathBuf, String> {
    Ok(portable_root()?.join(layout::RESOURCE_DIR))
}

pub fn settings_path() -> Result<PathBuf, String> {
    Ok(portable_root()?.join(layout::SETTINGS_FILE))
}

pub fn apply_exe_path() -> Result<PathBuf, String> {
    let root = portable_root()?;
    let maintenance_dir = root.join(layout::MAINTENANCE_DIR);

    let primary = maintenance_dir.join(layout::APPLY_EXE);
    if primary.is_file() {
        return Ok(primary);
    }

    let legacy = maintenance_dir.join(layout::LEGACY_APPLY_EXE);
    if legacy.is_file() {
        return Ok(legacy);
    }

    Err(format!(
        "update helper executable was not found in {} (expected {} or {})",
        maintenance_dir.display(),
        layout::APPLY_EXE,
        layout::LEGACY_APPLY_EXE
    ))
}

pub fn launcher_exe_path() -> Result<PathBuf, String> {
    let root = portable_root()?;
    let launcher = root.join(layout::LAUNCHER_EXE);
    if launcher.is_file() {
        return Ok(launcher);
    }

    let fallback = root.join(layout::APP_EXE);
    if fallback.is_file() {
        return Ok(fallback);
    }

    Err(format!(
        "launcher executable was not found in {}",
        root.display()
    ))
}
