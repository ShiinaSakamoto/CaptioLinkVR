pub mod captions;
pub mod overlay_renderer;
pub mod platform;
pub mod portable;
pub mod settings;
pub mod steamvr_overlay;
pub mod update;
pub mod vrchat_osc;
pub mod window_layout;

use overlay_renderer::{
    metrics::frame_width_meters, render_subtitle_frame, settings::RenderSettings,
};
#[cfg(target_os = "windows")]
use platform::windows::motw;
use platform::commands::open_external_url;
use portable::paths;
use settings::{load_settings, save_settings, AppSettings};
use std::sync::Mutex;
use steamvr_overlay::{is_steamvr_running, OverlayConfig, OverlayRuntime};
use tauri::{State};
use captions::{get_caption_preset_meta, list_caption_presets, read_caption_preset_subtitle};
use update::{check_for_updates, get_app_version, start_update};
use vrchat_osc::send_chatbox_message;

#[tauri::command]
fn initialize_overlay(
    state: State<'_, Mutex<OverlayRuntime>>,
    width: u32,
    height: u32,
    width_meters: f32,
    position_x: f32,
    position_y: f32,
    position_z: f32,
    rotation_x: f32,
    rotation_y: f32,
    rotation_z: f32,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "overlay state lock failed".to_string())?
        .initialize(OverlayConfig {
            width,
            height,
            width_meters,
            position_x,
            position_y,
            position_z,
            rotation_x,
            rotation_y,
            rotation_z,
        })
        .map_err(|error| error.to_string())
}

// 表示サイズは submit_overlay_text_frame 側が決める。
#[tauri::command]
fn update_overlay_layout(
    state: State<'_, Mutex<OverlayRuntime>>,
    width: u32,
    height: u32,
    width_meters: f32,
    position_x: f32,
    position_y: f32,
    position_z: f32,
    rotation_x: f32,
    rotation_y: f32,
    rotation_z: f32,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "overlay state lock failed".to_string())?
        .update_config(OverlayConfig {
            width,
            height,
            width_meters,
            position_x,
            position_y,
            position_z,
            rotation_x,
            rotation_y,
            rotation_z,
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_overlay_visible(
    state: State<'_, Mutex<OverlayRuntime>>,
    visible: bool,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "overlay state lock failed".to_string())?
        .set_visible(visible)
        .map_err(|error| error.to_string())
}

// JS は本文と描画設定だけ送り、RGBA 生成は Rust 側。
#[tauri::command]
fn submit_overlay_text_frame(
    state: State<'_, Mutex<OverlayRuntime>>,
    text: String,
    settings: RenderSettings,
    sequence: u64,
    allow_full_restart: Option<bool>,
) -> Result<(), String> {
    let frame = render_subtitle_frame(&text, &settings)?;
    state
        .lock()
        .map_err(|_| "overlay state lock failed".to_string())?
        .submit_frame(
            &frame.pixels,
            frame.width,
            frame.height,
            frame_width_meters(&settings, frame.width),
            sequence,
            allow_full_restart.unwrap_or(true),
        )
        .map_err(|error| error.to_string())
}

/// 予防的な OpenVR 再起動。閾値未満なら何もしない（force 時は除く）。
#[tauri::command]
fn proactive_restart_overlay(
    state: State<'_, Mutex<OverlayRuntime>>,
    force: bool,
    min_frames: u64,
) -> Result<bool, String> {
    state
        .lock()
        .map_err(|_| "overlay state lock failed".to_string())?
        .proactive_restart(force, min_frames)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn load_app_settings() -> Result<AppSettings, String> {
    load_settings()
}

// 高頻度変更は JS 側で間引く。ここはそのまま保存する。
#[tauri::command]
fn save_app_settings(settings: AppSettings) -> Result<(), String> {
    save_settings(&settings)
}

// UI の低頻度ポーリング用。
#[tauri::command]
fn check_steamvr_running() -> bool {
    is_steamvr_running()
}

#[tauri::command]
fn send_vrchat_chatbox_message(text: String, host: String, port: u16) -> Result<(), String> {
    send_chatbox_message(&text, &host, port)
}


pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Ok(root) = paths::portable_root() {
                motw::unblock_portable_executables(&root);
            }
            // テキストサイズに合わせて窓サイズ／min を広げる（Tauri 標準外）。
            window_layout::bootstrap(app);
            Ok(())
        })
        .manage(Mutex::new(OverlayRuntime::default()))
        .invoke_handler(tauri::generate_handler![
            initialize_overlay,
            update_overlay_layout,
            set_overlay_visible,
            submit_overlay_text_frame,
            proactive_restart_overlay,
            load_app_settings,
            save_app_settings,
            check_steamvr_running,
            send_vrchat_chatbox_message,
            get_app_version,
            check_for_updates,
            start_update,
            list_caption_presets,
            get_caption_preset_meta,
            read_caption_preset_subtitle,
            open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run CaptioLinkVR");
}
