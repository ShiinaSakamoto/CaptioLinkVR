use std::path::PathBuf;

use crate::portable::paths;

pub const SUBTITLE_FONT_FILE: &str = "NotoSansJP-Regular.ttf";
pub const SUBTITLE_FONT_FACE: &str = "Noto Sans JP";
pub const FONTS_DIR: &str = "fonts";

/// 同梱字幕フォント（Noto Sans JP）のファイルパスを解決する。
pub fn resolve_subtitle_font_path() -> Result<PathBuf, String> {
    let file_name = SUBTITLE_FONT_FILE;
    let candidates = [
        resolve_portable_font_path(file_name),
        resolve_exe_relative_font_path(file_name),
        resolve_workspace_font_path(file_name),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    Err(format!(
        "bundled subtitle font was not found: {FONTS_DIR}/{file_name}"
    ))
}

fn resolve_portable_font_path(file_name: &str) -> Option<PathBuf> {
    let resource = paths::resource_dir().ok()?;
    Some(resource.join(FONTS_DIR).join(file_name))
}

fn resolve_exe_relative_font_path(file_name: &str) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    Some(dir.join(FONTS_DIR).join(file_name))
}

fn resolve_workspace_font_path(file_name: &str) -> Option<PathBuf> {
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fonts");
    if workspace.is_dir() {
        Some(workspace.join(file_name))
    } else {
        None
    }
}
