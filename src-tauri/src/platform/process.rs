use std::path::Path;
use std::process::Command;

/// 親プロセスと同じセッションで子プロセスを起動する（ランチャー再起動用）。
pub fn spawn_child(
    executable: &Path,
    env_vars: &[(&str, &str)],
    working_dir: &Path,
) -> Result<(), String> {
    if !executable.is_file() {
        return Err(format!(
            "executable was not found: {}",
            executable.display()
        ));
    }

    if !working_dir.is_dir() {
        return Err(format!(
            "working directory was not found: {}",
            working_dir.display()
        ));
    }

    let mut command = Command::new(executable);
    command.current_dir(working_dir);
    for (key, value) in env_vars {
        command.env(key, value);
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        use crate::platform::windows::motw;

        motw::remove_zone_identifier(executable);
        // 子プロセス起動時にコンソールウィンドウを開かない（CREATE_NO_WINDOW）。
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("failed to spawn {}: {error}", executable.display()))
}

/// 候補のいずれかが実行中かを判定する。プロセス名は大文字小文字を区別しない。
/// スナップショットは1回だけ取り、候補ごとに取り直さない。
#[cfg(target_os = "windows")]
pub fn any_running(process_names: &[&str]) -> bool {
    use crate::platform::windows::process_list;

    process_list::running_process_names().any(|running| {
        process_names
            .iter()
            .any(|candidate| running.eq_ignore_ascii_case(candidate))
    })
}

/// 候補のいずれかが実行中かを判定する。pgrep が無い環境では常に false になる。
#[cfg(not(target_os = "windows"))]
pub fn any_running(process_names: &[&str]) -> bool {
    process_names.iter().any(|process_name| {
        Command::new("pgrep")
            .args(["-x", process_name])
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
    })
}
