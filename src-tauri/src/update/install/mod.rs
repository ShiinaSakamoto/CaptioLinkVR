//! 更新の適用フロー。取得・検証・展開・反映を各モジュールへ委ね、ここでは順序と後片付けだけを持つ。

mod apply;
mod archive;
mod download;
mod guard;
mod log;

use std::fs;
use std::path::{Path, PathBuf};

use crate::platform::process;
use crate::portable::{layout, paths};
use crate::update::job::UpdateJob;

use log::append_update_log;

pub fn run_update_job(job: &UpdateJob) -> Result<(), String> {
    let root = guard::ensure_safe_root(&job.root_dir)?;
    append_update_log(&root, "Updater started.")?;
    let staging_root = root.join(layout::UPDATE_STAGING_DIR);
    let zip_path = staging_root.join("download.zip");
    let extract_root = staging_root.join("extracted");
    let allowed = allowed_staging_targets(&root);

    if staging_root.exists() {
        guard::remove_dir_all_guarded(&staging_root, &root, &allowed)?;
    }
    fs::create_dir_all(&staging_root)
        .map_err(|error| format!("failed to create staging directory: {error}"))?;

    let result = (|| {
        append_update_log(&root, "Downloading update package.")?;
        download::download_file(&job.manifest.url, &zip_path, job.manifest.size)?;
        append_update_log(&root, "Verifying sha256.")?;
        download::verify_file_hash(&zip_path, &job.manifest.sha256)?;
        if extract_root.exists() {
            guard::remove_dir_all_guarded(&extract_root, &root, &allowed)?;
        }
        fs::create_dir_all(&extract_root)
            .map_err(|error| format!("failed to create extract directory: {error}"))?;
        append_update_log(&root, "Extracting update package.")?;
        archive::extract_zip(&zip_path, &extract_root)?;
        append_update_log(&root, "Applying update package.")?;
        apply::apply_update(&root, &extract_root)?;
        append_update_log(&root, "Update applied successfully.")?;
        Ok(())
    })();

    // 成否にかかわらず作業ディレクトリは残さない。
    let _ = guard::remove_dir_all_guarded(&staging_root, &root, &allowed);
    if let Err(error) = &result {
        let _ = append_update_log(&root, &format!("Update failed: {error}"));
    }
    result
}

fn allowed_staging_targets(root: &Path) -> Vec<PathBuf> {
    vec![root.join(layout::UPDATE_STAGING_DIR)]
}

pub fn relaunch_app() -> Result<(), String> {
    let launcher = paths::launcher_exe_path()?;
    let working_dir = launcher
        .parent()
        .ok_or_else(|| "failed to resolve launcher directory".to_string())?;
    process::spawn_child(&launcher, &[], working_dir)
        .map_err(|error| format!("failed to relaunch CaptioLinkVR: {error}"))
}
