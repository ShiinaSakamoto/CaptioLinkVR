//! SteamVR の起動判定。

use crate::platform::process;

// 参照実装はvrmonitorだけを見るが、環境によってはvrserver/vrcompositorが先に見える。
pub fn is_steamvr_running() -> bool {
    process::any_running(steamvr_process_names())
}

#[cfg(target_os = "windows")]
fn steamvr_process_names() -> &'static [&'static str] {
    &[
        "vrmonitor.exe",
        "vrserver.exe",
        "vrcompositor.exe",
        "vrdashboard.exe",
    ]
}

#[cfg(not(target_os = "windows"))]
fn steamvr_process_names() -> &'static [&'static str] {
    &["vrmonitor", "vrserver", "vrcompositor", "vrdashboard"]
}
