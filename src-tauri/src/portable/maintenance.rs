//! 実行中のメンテナンス用 exe を直接上書きできない問題を、pending ファイルで回避する。

use std::env;
use std::fs;
use std::path::Path;

use super::layout;

pub fn finalize_pending_apply_binary(root: &Path) -> Result<(), String> {
    let maintenance_dir = root.join(layout::MAINTENANCE_DIR);
    let pending = maintenance_dir.join(layout::APPLY_PENDING_EXE);
    if !pending.is_file() {
        return Ok(());
    }

    let destination = maintenance_dir.join(layout::APPLY_EXE);
    if is_current_executable(&destination) {
        return Ok(());
    }

    remove_when_unlocked(&destination)?;

    fs::rename(&pending, &destination).map_err(|error| {
        format!(
            "failed to activate pending apply helper {}: {error}",
            pending.display()
        )
    })?;

    let legacy = maintenance_dir.join(layout::LEGACY_APPLY_EXE);
    if legacy.is_file() {
        let _ = fs::remove_file(legacy);
    }

    Ok(())
}

fn remove_when_unlocked(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Ok(());
    }

    for attempt in 0..25 {
        match fs::remove_file(path) {
            Ok(()) => return Ok(()),
            Err(error) if is_file_locked_error(&error) && attempt < 24 => {
                std::thread::sleep(std::time::Duration::from_millis(200));
            }
            Err(error) => {
                return Err(format!(
                    "failed to remove apply helper {}: {error}",
                    path.display()
                ));
            }
        }
    }

    Err(format!(
        "timed out waiting for apply helper to exit: {}",
        path.display()
    ))
}

pub fn stage_pending_apply_binary(source: &Path, maintenance_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(maintenance_dir).map_err(|error| {
        format!(
            "failed to create maintenance directory {}: {error}",
            maintenance_dir.display()
        )
    })?;

    let pending = maintenance_dir.join(layout::APPLY_PENDING_EXE);
    fs::copy(source, &pending).map_err(|error| {
        format!(
            "failed to stage pending apply helper {}: {error}",
            pending.display()
        )
    })?;
    Ok(())
}

pub fn remove_pending_apply_binary(maintenance_dir: &Path) -> Result<(), String> {
    let pending = maintenance_dir.join(layout::APPLY_PENDING_EXE);
    if pending.is_file() {
        fs::remove_file(&pending).map_err(|error| {
            format!(
                "failed to remove pending apply helper {}: {error}",
                pending.display()
            )
        })?;
    }
    Ok(())
}

pub fn is_current_executable(path: &Path) -> bool {
    let Ok(current) = env::current_exe() else {
        return false;
    };

    match (fs::canonicalize(&current), fs::canonicalize(path)) {
        (Ok(current), Ok(path)) => current == path,
        _ => current == path,
    }
}

pub fn is_file_locked_error(error: &std::io::Error) -> bool {
    #[cfg(target_os = "windows")]
    {
        return error.raw_os_error() == Some(32);
    }

    #[cfg(not(target_os = "windows"))]
    {
        error.kind() == std::io::ErrorKind::PermissionDenied
    }
}
