//! メインウィンドウのレイアウト調整。
//!
//! Tauri は表示 DPI の論理ピクセルは扱うが、Windows の「テキストサイズ」
//! （Accessibility TextScaleFactor）は扱わない。WebView2 だけ中身が拡大されるため、
//! 起動時にウィンドウサイズ／min を同じ倍率で広げる。

mod apply;
mod design;
mod text_scale;

use std::time::Duration;

use tauri::App;

use apply::apply_main_from_handle;

pub use design::{DesignSize, MAIN_WINDOW_DESIGN, MAIN_WINDOW_LABEL};
pub use text_scale::current_factor as text_scale_factor;

/// 起動時にテキスト倍率へ合わせてサイズ／min を適用する。
pub fn bootstrap(app: &App) {
    let handle = app.handle().clone();

    // 即時適用（conf の初期値のあとで上書きする）。
    apply_main_from_handle(&handle);

    // WebView2 初期化でサイズが戻ることがあるため、短時間で数回押し直す。
    schedule_deferred_reapply(handle);
}

fn schedule_deferred_reapply(handle: tauri::AppHandle) {
    // WebView 準備の段階差を拾うための遅延。
    const DELAYS_MS: [u64; 3] = [120, 450, 1200];

    for delay_ms in DELAYS_MS {
        let handle = handle.clone();
        std::thread::Builder::new()
            .name(format!("window-layout-reapply-{delay_ms}"))
            .spawn(move || {
                std::thread::sleep(Duration::from_millis(delay_ms));
                let app = handle.clone();
                let app_for_apply = app.clone();
                let _ = app.run_on_main_thread(move || {
                    apply_main_from_handle(&app_for_apply);
                });
            })
            .ok();
    }
}
