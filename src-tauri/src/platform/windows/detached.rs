use std::path::Path;

#[cfg(not(target_os = "windows"))]
use std::process::Command;

/// 親プロセスと同じ権限で、別プロセスとして実行ファイルを起動する。
pub fn spawn_detached_executable(
    executable: &Path,
    args: &[&str],
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

    #[cfg(target_os = "windows")]
    {
        return spawn_detached_executable_windows(executable, args, working_dir);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut command = Command::new(executable);
        command.args(args).current_dir(working_dir);
        command
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("failed to spawn {}: {error}", executable.display()))
    }
}

#[cfg(target_os = "windows")]
fn spawn_detached_executable_windows(
    executable: &Path,
    args: &[&str],
    working_dir: &Path,
) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;

    super::motw::remove_zone_identifier(executable);

    type Hwnd = *mut core::ffi::c_void;

    #[link(name = "shell32")]
    extern "system" {
        fn ShellExecuteW(
            hwnd: Hwnd,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show_cmd: i32,
        ) -> *mut core::ffi::c_void;
    }

    const SW_HIDE: i32 = 0;

    fn wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    fn quote_windows_arg(value: &str) -> String {
        if value.contains(' ') || value.contains('\t') || value.contains('"') {
            format!("\"{}\"", value.replace('"', "\\\""))
        } else {
            value.to_string()
        }
    }

    let parameters = args
        .iter()
        .map(|arg| quote_windows_arg(arg))
        .collect::<Vec<_>>()
        .join(" ");

    let operation = wide(OsStr::new("open"));
    let file = wide(executable.as_os_str());
    let parameters = wide(OsStr::new(&parameters));
    let directory = wide(working_dir.as_os_str());

    let result = unsafe {
        ShellExecuteW(
            ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            if parameters.len() <= 1 {
                ptr::null()
            } else {
                parameters.as_ptr()
            },
            directory.as_ptr(),
            SW_HIDE,
        )
    };

    let code = result as isize;
    if code > 32 {
        return Ok(());
    }

    Err(format!(
        "ShellExecuteW failed for {} (code {code}: {})",
        executable.display(),
        describe_shell_execute_error(code)
    ))
}

#[cfg(target_os = "windows")]
fn describe_shell_execute_error(code: isize) -> &'static str {
    match code {
        0 => "out of memory or resources",
        2 => "file not found",
        3 => "path not found",
        5 => "access denied",
        8 => "out of memory",
        26 => "sharing violation",
        27 => "filename association incomplete or invalid",
        28 => "DDE transaction timed out",
        29 => "DDE transaction failed",
        30 => "DDE transaction busy",
        31 => "no association for file extension",
        32 => "dynamic-link library not found",
        _ => "unknown error",
    }
}
