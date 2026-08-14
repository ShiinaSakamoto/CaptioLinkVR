use tauri::AppHandle;

use super::catalog;
use super::types::{
    CaptionPresetMeta, CaptionPresetStartTriggerAssets, CaptionPresetSubtitle, CaptionPresetSummary,
};

#[tauri::command]
pub fn list_caption_presets(app: AppHandle) -> Result<Vec<CaptionPresetSummary>, String> {
    catalog::list_presets(&app)
}

#[tauri::command]
pub fn get_caption_preset_meta(
    app: AppHandle,
    preset_id: String,
) -> Result<CaptionPresetMeta, String> {
    catalog::load_preset_meta(&app, &preset_id)
}

#[tauri::command]
pub fn read_caption_preset_subtitle(
    app: AppHandle,
    preset_id: String,
) -> Result<CaptionPresetSubtitle, String> {
    catalog::read_preset_subtitle(&app, &preset_id)
}

#[tauri::command]
pub fn read_caption_preset_start_trigger(
    app: AppHandle,
    preset_id: String,
) -> Result<CaptionPresetStartTriggerAssets, String> {
    catalog::read_preset_start_trigger(&app, &preset_id)
}
