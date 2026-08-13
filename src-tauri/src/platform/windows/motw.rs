//! Windows の Mark of the Web (Zone.Identifier) を除去する。
//! ブラウザ経由でダウンロードした ZIP を展開した exe が、
//! 「発行元を確認できません」ダイアログを出すのを防ぐ。

use std::path::Path;

use crate::portable::layout;

/// ファイルに付いている Zone.Identifier を削除する。存在しなければ何もしない。
pub fn remove_zone_identifier(path: &Path) {
    #[cfg(target_os = "windows")]
    remove_zone_identifier_windows(path);

    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
}

/// ポータブル配布で起動に使う exe から MOTW を除去する。
pub fn unblock_portable_executables(root: &Path) {
    let candidates = [
        root.join(layout::LAUNCHER_EXE),
        root.join(layout::MAINTENANCE_DIR).join(layout::APPLY_EXE),
        root.join(layout::MAINTENANCE_DIR)
            .join(layout::LEGACY_APPLY_EXE),
        root.join(layout::MAINTENANCE_DIR)
            .join(layout::APPLY_PENDING_EXE),
        root.join(layout::RESOURCE_DIR).join(layout::APP_EXE),
    ];

    for path in candidates {
        if path.is_file() {
            remove_zone_identifier(&path);
        }
    }
}

#[cfg(target_os = "windows")]
fn remove_zone_identifier_windows(path: &Path) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let Some(path_str) = path.to_str() else {
        return;
    };

    let ads_path = format!("{path_str}:Zone.Identifier");
    let wide: Vec<u16> = OsStr::new(&ads_path).encode_wide().chain(Some(0)).collect();

    unsafe {
        #[link(name = "kernel32")]
        extern "system" {
            fn DeleteFileW(lpFileName: *const u16) -> i32;
        }

        // 存在しない場合も含め、失敗は無視する。
        let _ = DeleteFileW(wide.as_ptr());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unblock_portable_executables_does_not_panic_on_missing_paths() {
        let temp = std::env::temp_dir().join("captiolinkvr-motw-test");
        let _ = std::fs::remove_dir_all(&temp);
        std::fs::create_dir_all(&temp).expect("temp dir should be created");
        unblock_portable_executables(&temp);
        let _ = std::fs::remove_dir_all(&temp);
    }
}
