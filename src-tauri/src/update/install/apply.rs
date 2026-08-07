//! 展開済みパッケージを実インストール先へ反映する。
//! resource ディレクトリは差し替え前にバックアップし、失敗時は元へ戻す。

use std::fs;
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
use crate::platform::windows::motw;
use crate::portable::{layout, maintenance};

use super::guard::{assert_safe_runtime_paths, remove_dir_all_guarded};
use super::log::append_update_log;

pub fn apply_update(root: &Path, extracted_root: &Path) -> Result<(), String> {
    assert_safe_runtime_paths(root)?;
    let package_root = find_package_root(extracted_root)?;
    let resource_source = package_root.join(layout::RESOURCE_DIR);
    if !resource_source.is_dir() {
        return Err(format!(
            "update package does not contain {}/ directory",
            layout::RESOURCE_DIR
        ));
    }

    let resource_target = root.join(layout::RESOURCE_DIR);
    let backup_target = root.join(layout::RESOURCE_BACKUP_DIR);
    let allowed = vec![
        root.join(layout::UPDATE_STAGING_DIR),
        root.join(layout::RESOURCE_BACKUP_DIR),
        root.join(layout::RESOURCE_DIR),
    ];

    if backup_target.exists() {
        remove_dir_all_guarded(&backup_target, root, &allowed)?;
    }
    if resource_target.exists() {
        fs::rename(&resource_target, &backup_target)
            .map_err(|error| format!("failed to back up existing resource directory: {error}"))?;
    }

    let replace_result = (|| {
        copy_dir_all(&resource_source, &resource_target)?;
        copy_optional_file(&package_root, root, layout::LAUNCHER_EXE)?;
        copy_optional_apply_exe(&package_root, root)?;
        Ok::<(), String>(())
    })();

    if let Err(error) = replace_result {
        let _ = remove_dir_all_guarded(&resource_target, root, &allowed);
        if backup_target.exists() {
            if resource_target.exists() {
                let _ = remove_dir_all_guarded(&resource_target, root, &allowed);
            }
            let _ = fs::rename(&backup_target, &resource_target);
        }
        return Err(error);
    }

    let _ = remove_dir_all_guarded(&backup_target, root, &allowed);
    #[cfg(target_os = "windows")]
    motw::unblock_portable_executables(root);
    Ok(())
}

// ZIPが1階層のフォルダで包まれている場合があるため、resource を持つ階層を探す。
fn find_package_root(extracted_root: &Path) -> Result<PathBuf, String> {
    if extracted_root.join(layout::RESOURCE_DIR).is_dir() {
        return Ok(extracted_root.to_path_buf());
    }

    let entries = fs::read_dir(extracted_root)
        .map_err(|error| format!("failed to inspect extracted update package: {error}"))?;
    for entry in entries {
        let entry = entry.map_err(|error| format!("failed to read extracted entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() && path.join(layout::RESOURCE_DIR).is_dir() {
            return Ok(path);
        }
    }

    Err("could not locate portable package root in update zip".to_string())
}

fn copy_optional_file(package_root: &Path, root: &Path, file_name: &str) -> Result<(), String> {
    let source = package_root.join(file_name);
    if !source.is_file() {
        return Ok(());
    }
    let destination = root.join(file_name);
    fs::copy(&source, &destination)
        .map_err(|error| format!("failed to update {}: {error}", destination.display()))?;
    Ok(())
}

// 旧名の実行ファイルしか無いパッケージからも更新できるようにする。
fn copy_optional_apply_exe(package_root: &Path, root: &Path) -> Result<(), String> {
    let maintenance_dir = package_root.join(layout::MAINTENANCE_DIR);
    let source = maintenance_dir.join(layout::APPLY_EXE);
    if !source.is_file() {
        let legacy = maintenance_dir.join(layout::LEGACY_APPLY_EXE);
        if legacy.is_file() {
            return copy_apply_binary(&legacy, root);
        }
        return Ok(());
    }
    copy_apply_binary(&source, root)
}

// 自分自身を更新しているときは上書きできないため、次回起動時へ持ち越す。
fn copy_apply_binary(source: &Path, root: &Path) -> Result<(), String> {
    let destination_dir = root.join(layout::MAINTENANCE_DIR);
    let destination = destination_dir.join(layout::APPLY_EXE);

    if maintenance::is_current_executable(&destination) {
        append_update_log(root, "Staging apply helper update for next launch.")?;
        return maintenance::stage_pending_apply_binary(source, &destination_dir);
    }

    match fs::copy(source, &destination) {
        Ok(_) => {
            let _ = maintenance::remove_pending_apply_binary(&destination_dir);
            Ok(())
        }
        Err(error) if maintenance::is_file_locked_error(&error) => {
            append_update_log(root, "Staging apply helper update for next launch.")?;
            maintenance::stage_pending_apply_binary(source, &destination_dir)
        }
        Err(error) => Err(format!("failed to update apply helper executable: {error}")),
    }
}

fn copy_dir_all(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| {
        format!(
            "failed to create directory {}: {error}",
            destination.display()
        )
    })?;

    for entry in fs::read_dir(source)
        .map_err(|error| format!("failed to read directory {}: {error}", source.display()))?
    {
        let entry = entry.map_err(|error| format!("failed to read directory entry: {error}"))?;
        let src_path = entry.path();
        let dest_path = destination.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_all(&src_path, &dest_path)?;
        } else {
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent).map_err(|error| {
                    format!(
                        "failed to create parent directory {}: {error}",
                        parent.display()
                    )
                })?;
            }
            fs::copy(&src_path, &dest_path).map_err(|error| {
                format!(
                    "failed to copy {} to {}: {error}",
                    src_path.display(),
                    dest_path.display()
                )
            })?;
        }
    }

    Ok(())
}
