//! メインウィンドウのサイズ／min 制約ガード。
//!
//! 一部環境では tauri.conf の width/height/min が効かず、
//! 起動時もリサイズ時も min 未満まで縮められることがある。
//! 論理ピクセルで min を再適用し、下回ったら押し戻す。

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{LogicalSize, Manager, Window, WindowEvent};

/// tauri.conf.json の windows[0] と揃えること。
const DEFAULT_WIDTH: f64 = 1020.0;
const DEFAULT_HEIGHT: f64 = 860.0;
const MIN_WIDTH: f64 = 920.0;
const MIN_HEIGHT: f64 = 640.0;
const SIZE_EPSILON: f64 = 0.5;

/// set_size 自身が起こす Resized での再入を避ける。
static ENFORCING: AtomicBool = AtomicBool::new(false);

fn is_below_min(width: f64, height: f64) -> bool {
    width + SIZE_EPSILON < MIN_WIDTH || height + SIZE_EPSILON < MIN_HEIGHT
}

fn read_logical_size(window: &Window) -> Option<(f64, f64)> {
    let scale = window.scale_factor().ok()?;
    let physical = window.inner_size().ok()?;
    let logical = physical.to_logical::<f64>(scale);
    Some((logical.width, logical.height))
}

fn apply_min_constraint(window: &Window) {
    let _ = window.set_min_size(Some(LogicalSize::new(MIN_WIDTH, MIN_HEIGHT)));
}

fn clamp_to_min_size(window: &Window, width: f64, height: f64) {
    let _ = window.set_size(LogicalSize::new(width.max(MIN_WIDTH), height.max(MIN_HEIGHT)));
}

/// 起動時: min を張り直し、既定サイズへ揃える（ウィンドウ状態は保存しない前提）。
pub fn bootstrap_main_window(app: &tauri::App) {
    if let Some(window) = app.get_webview_window("main") {
        if !ENFORCING.swap(true, Ordering::SeqCst) {
            let _ = window.set_min_size(Some(LogicalSize::new(MIN_WIDTH, MIN_HEIGHT)));
            let _ = window.set_size(LogicalSize::new(DEFAULT_WIDTH, DEFAULT_HEIGHT));
            ENFORCING.store(false, Ordering::SeqCst);
        }
    }

    // WebView2 初期化後にサイズが上書きされる環境向けに、遅延でも再適用する。
    let handle = app.handle().clone();
    for delay_ms in [50_u64, 250, 1000] {
        let handle = handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(delay_ms));
            let handle_for_closure = handle.clone();
            let _ = handle.run_on_main_thread(move || {
                let Some(window) = handle_for_closure.get_webview_window("main") else {
                    return;
                };
                let _ = window.set_min_size(Some(LogicalSize::new(MIN_WIDTH, MIN_HEIGHT)));
                let Ok(scale) = window.scale_factor() else {
                    return;
                };
                let Ok(physical) = window.inner_size() else {
                    return;
                };
                let logical = physical.to_logical::<f64>(scale);
                if is_below_min(logical.width, logical.height) {
                    let _ = window.set_size(LogicalSize::new(DEFAULT_WIDTH, DEFAULT_HEIGHT));
                }
            });
        });
    }
}

/// リサイズ／DPI 変更時: min を再適用し、下回っていたらクランプする。
pub fn on_main_window_event(window: &Window, event: &WindowEvent) {
    if window.label() != "main" {
        return;
    }
    match event {
        WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
            if ENFORCING.swap(true, Ordering::SeqCst) {
                return;
            }
            apply_min_constraint(window);
            if let Some((width, height)) = read_logical_size(window) {
                if is_below_min(width, height) {
                    clamp_to_min_size(window, width, height);
                }
            }
            ENFORCING.store(false, Ordering::SeqCst);
        }
        _ => {}
    }
}
