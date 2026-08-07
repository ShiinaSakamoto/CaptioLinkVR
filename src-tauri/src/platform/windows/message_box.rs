/// Windows のエラーダイアログを表示する。
#[cfg(target_os = "windows")]
pub fn show_error(caption: &str, message: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    type Hwnd = *mut core::ffi::c_void;
    type Pcwstr = *const u16;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(hwnd: Hwnd, text: Pcwstr, caption: Pcwstr, typ: u32) -> i32;
    }

    const MB_ICONERROR: u32 = 0x00000010;

    fn wide(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }

    let text = wide(message);
    let caption = wide(caption);
    unsafe {
        MessageBoxW(
            core::ptr::null_mut(),
            text.as_ptr(),
            caption.as_ptr(),
            MB_ICONERROR,
        );
    }
}

#[cfg(not(target_os = "windows"))]
pub fn show_error(_caption: &str, message: &str) {
    eprintln!("{message}");
}
