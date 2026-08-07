pub mod frame;
mod font_path;
pub mod metrics;
mod ruby;
pub mod settings;

#[cfg(target_os = "windows")]
mod windows_gdi;

use frame::OverlayFrame;
use settings::RenderSettings;

// 字幕文字列と設定からRGBAフレームを生成する入口。
pub fn render_subtitle_frame(
    text: &str,
    settings: &RenderSettings,
) -> Result<OverlayFrame, String> {
    if text.is_empty() {
        return Ok(OverlayFrame::transparent_1px());
    }

    #[cfg(target_os = "windows")]
    {
        return windows_gdi::render_subtitle_frame(text, settings);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = settings;
        Err("Rust-side subtitle rendering is currently implemented for Windows only".to_string())
    }
}
