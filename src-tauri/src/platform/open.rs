/// http/https URL を既定ブラウザで開く。
pub fn open_external_url(url: &str) -> Result<(), String> {
    let url = url.trim();
    validate_http_url(url)?;

    #[cfg(target_os = "windows")]
    {
        return open_url_windows(url);
    }

    #[cfg(target_os = "macos")]
    {
        return open_url_command("open", url);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return open_url_command("xdg-open", url);
    }
}

fn validate_http_url(url: &str) -> Result<(), String> {
    if url.starts_with("https://") || url.starts_with("http://") {
        Ok(())
    } else {
        Err("only http and https URLs can be opened".to_string())
    }
}

#[cfg(target_os = "windows")]
fn open_url_windows(url: &str) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;

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

    const SW_SHOWNORMAL: i32 = 1;

    fn wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(Some(0)).collect()
    }

    let operation = wide(OsStr::new("open"));
    let file = wide(OsStr::new(url));
    let result = unsafe {
        ShellExecuteW(
            ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            ptr::null(),
            ptr::null(),
            SW_SHOWNORMAL,
        )
    };

    let code = result as isize;
    if code > 32 {
        return Ok(());
    }

    Err(format!("failed to open URL in browser (code {code})"))
}

#[cfg(not(target_os = "windows"))]
fn open_url_command(command: &str, url: &str) -> Result<(), String> {
    use std::process::Command;

    let status = Command::new(command)
        .arg(url)
        .status()
        .map_err(|error| format!("failed to launch {command}: {error}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("failed to open URL with {command}"))
    }
}

#[cfg(test)]
mod tests {
    use super::validate_http_url;

    #[test]
    fn validate_http_url_accepts_https() {
        assert!(validate_http_url("https://example.com").is_ok());
    }

    #[test]
    fn validate_http_url_rejects_other_schemes() {
        assert!(validate_http_url("file:///tmp/test").is_err());
        assert!(validate_http_url("javascript:alert(1)").is_err());
    }
}
