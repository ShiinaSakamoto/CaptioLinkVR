use tauri::AppHandle;

use crate::platform::windows::detached;
#[cfg(target_os = "windows")]
use crate::platform::windows::motw;
use crate::portable::{layout, paths, validation};
use crate::update::job;
use crate::update::manifest::UpdateManifest;

/// 更新ジョブを書き出し、メンテナンス用ヘルパーを起動して本体を終了する。
pub fn start(app: AppHandle, manifest: UpdateManifest) -> Result<(), String> {
    let root = paths::portable_root()
        .map_err(|error| format!("failed to resolve portable root: {error}"))?;

    validation::validate_portable_distribution(&root)?;

    let apply_exe = paths::apply_exe_path()?;
    let job_path = job::write_update_job(&root, manifest)?;

    #[cfg(target_os = "windows")]
    motw::remove_zone_identifier(&apply_exe);

    let job_arg = job_path.to_string_lossy().into_owned();
    detached::spawn_detached_executable(&apply_exe, &["--job", &job_arg], &root).map_err(
        |error| {
            format!(
                "failed to launch {} from {}: {error}",
                layout::APPLY_EXE,
                root.display()
            )
        },
    )?;

    app.exit(0);
    Ok(())
}
