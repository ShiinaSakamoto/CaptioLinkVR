use std::path::Path;

use super::{layout, marker};

/// ポータブル ZIP 配布として更新可能か検証する。
pub fn validate_portable_distribution(root: &Path) -> Result<(), String> {
    if !marker::has_root_marker(root) {
        return Err(format!(
            "portable distribution marker was not found under {} (expected {}/{})",
            root.display(),
            layout::MAINTENANCE_DIR,
            layout::ROOT_MARKER_FILE
        ));
    }

    let launcher = root.join(layout::LAUNCHER_EXE);
    if !launcher.is_file() {
        return Err(format!(
            "portable launcher was not found: {} (auto-update requires the ZIP distribution launched via {})",
            launcher.display(),
            layout::LAUNCHER_EXE
        ));
    }

    let resource_dir = root.join(layout::RESOURCE_DIR);
    let app_exe = resource_dir.join(layout::APP_EXE);
    if !app_exe.is_file() {
        return Err(format!(
            "application executable was not found: {}",
            app_exe.display()
        ));
    }

    Ok(())
}
