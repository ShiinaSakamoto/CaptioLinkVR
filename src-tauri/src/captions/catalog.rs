use std::fs;
use std::path::Path;

use tauri::AppHandle;

use super::layout;
use super::paths::{self, captions_root};
use super::types::{
    CaptionCatalog, CaptionPresetMeta, CaptionPresetSubtitle, CaptionPresetSummary,
};

pub fn list_presets(app: &AppHandle) -> Result<Vec<CaptionPresetSummary>, String> {
    let root = captions_root(app)?;
    let catalog = load_catalog(&root)?;
    Ok(catalog.entries)
}

pub fn load_preset_meta(app: &AppHandle, preset_id: &str) -> Result<CaptionPresetMeta, String> {
    let root = captions_root(app)?;
    let preset_dir = paths::preset_dir(&root, preset_id)?;
    let meta_path = preset_dir.join(layout::META_FILE);
    let raw = fs::read_to_string(&meta_path)
        .map_err(|error| format!("failed to read {}: {error}", meta_path.display()))?;
    let mut meta: CaptionPresetMeta = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", meta_path.display()))?;
    meta.id = preset_id.to_string();
    Ok(meta)
}

pub fn read_preset_subtitle(
    app: &AppHandle,
    preset_id: &str,
) -> Result<CaptionPresetSubtitle, String> {
    let meta = load_preset_meta(app, preset_id)?;
    let root = captions_root(app)?;
    let preset_dir = paths::preset_dir(&root, preset_id)?;
    let subtitle_path = preset_dir.join(layout::SUBTITLE_FILE);
    if !subtitle_path.is_file() {
        return Err(format!(
            "subtitle file was not found: {}",
            subtitle_path.display()
        ));
    }

    let content = fs::read_to_string(&subtitle_path)
        .map_err(|error| format!("failed to read {}: {error}", subtitle_path.display()))?;

    Ok(CaptionPresetSubtitle {
        id: meta.id,
        display_name: meta.display_name,
        file_name: layout::SUBTITLE_FILE.to_string(),
        content,
    })
}

fn load_catalog(root: &Path) -> Result<CaptionCatalog, String> {
    let catalog_path = root.join(layout::CATALOG_FILE);
    let raw = fs::read_to_string(&catalog_path)
        .map_err(|error| format!("failed to read {}: {error}", catalog_path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", catalog_path.display()))
}
