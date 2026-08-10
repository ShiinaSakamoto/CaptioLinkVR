//! 設計サイズ × テキスト倍率をウィンドウへ適用する。

use tauri::{LogicalSize, Manager, WebviewWindow};

use super::design::{DesignSize, MAIN_WINDOW_DESIGN, MAIN_WINDOW_LABEL};
use super::text_scale;

/// 作業領域に収まるよう論理サイズを上限で抑える。
///
/// テキスト倍率が大きいと設計サイズがモニタより大きくなり得るため、
/// min も同じ上限で落とさないとリサイズ不能になる。
fn clamp_to_work_area(window: &WebviewWindow, size: DesignSize) -> DesignSize {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return size;
    };

    let scale = monitor.scale_factor();
    if scale <= 0.0 {
        return size;
    }

    // 作業領域（タスクバー除く）があればそれを、なければモニタ全体を上限にする。
    let work = monitor.work_area();
    let (phys_w, phys_h) = (work.size.width, work.size.height);
    let max_width = f64::from(phys_w) / scale;
    let max_height = f64::from(phys_h) / scale;

    // 枠や余白分を少し残す。
    let max_width = (max_width * 0.98).max(1.0);
    let max_height = (max_height * 0.98).max(1.0);

    DesignSize {
        width: size.width.min(max_width),
        height: size.height.min(max_height),
        min_width: size.min_width.min(max_width),
        min_height: size.min_height.min(max_height),
    }
}

/// 指定ウィンドウへ、設計サイズ × テキスト倍率を適用する。
pub fn apply_to_window(window: &WebviewWindow, design: DesignSize, text_scale: f64) {
    let target = clamp_to_work_area(window, design.scaled(text_scale));

    let _ = window.set_min_size(Some(LogicalSize::new(target.min_width, target.min_height)));
    let _ = window.set_size(LogicalSize::new(target.width, target.height));
}

/// アプリハンドルから main ウィンドウを探し、現在のテキスト倍率で適用する。
pub fn apply_main_from_handle(handle: &tauri::AppHandle) {
    let Some(window) = handle.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };
    apply_to_window(&window, MAIN_WINDOW_DESIGN, text_scale::current_factor());
}
