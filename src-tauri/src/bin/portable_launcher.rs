// ポータブル版の起動用ランチャー。コンソールを出さずに本体 exe を起動する。
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

use std::env;

use captiolink_vr_lib::platform::process;
use captiolink_vr_lib::platform::windows::{message_box, motw};
use captiolink_vr_lib::portable::{layout, maintenance, marker};

fn main() {
    if let Err(error) = launch_app() {
        message_box::show_error("CaptioLinkVR", &error);
        std::process::exit(1);
    }
}

fn launch_app() -> Result<(), String> {
    let launcher_path =
        env::current_exe().map_err(|error| format!("Failed to locate launcher: {error}"))?;
    let base_dir = launcher_path
        .parent()
        .ok_or_else(|| "Failed to locate launcher directory".to_string())?;
    let resource_dir = base_dir.join(layout::RESOURCE_DIR);
    let app_exe = resource_dir.join(layout::APP_EXE);

    if !app_exe.exists() {
        return Err(format!(
            "Application executable was not found: {}",
            app_exe.display()
        ));
    }
    marker::ensure_root_marker(base_dir)?;
    maintenance::finalize_pending_apply_binary(base_dir)?;
    motw::unblock_portable_executables(base_dir);

    let root_env = base_dir.to_string_lossy();
    process::spawn_child(
        &app_exe,
        &[(layout::ROOT_ENV, root_env.as_ref())],
        &resource_dir,
    )
    .map_err(|error| format!("Failed to start application: {error}"))?;

    Ok(())
}
