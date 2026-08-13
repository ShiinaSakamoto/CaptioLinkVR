use std::fs;
use std::path::Path;

use tauri::AppHandle;

use super::layout;
use super::paths::{self, captions_root};
use super::types::{
    CaptionCatalog, CaptionPresetMeta, CaptionPresetStartTrigger, CaptionPresetSubtitle,
    CaptionPresetSummary,
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

/// プリセットフォルダの start_trigger.png を読む。無ければ Ok(None)。
pub fn read_preset_start_trigger(
    app: &AppHandle,
    preset_id: &str,
) -> Result<Option<CaptionPresetStartTrigger>, String> {
    let root = captions_root(app)?;
    let preset_dir = paths::preset_dir(&root, preset_id)?;
    let image_path = preset_dir.join(layout::START_TRIGGER_FILE);
    if !image_path.is_file() {
        return Ok(None);
    }

    let bytes = fs::read(&image_path)
        .map_err(|error| format!("failed to read {}: {error}", image_path.display()))?;
    let data_url = format!("data:image/png;base64,{}", encode_base64(&bytes));

    Ok(Some(CaptionPresetStartTrigger {
        id: preset_id.to_string(),
        file_name: layout::START_TRIGGER_FILE.to_string(),
        data_url,
    }))
}

fn encode_base64(data: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    let mut index = 0;
    while index + 3 <= data.len() {
        let n = (u32::from(data[index]) << 16)
            | (u32::from(data[index + 1]) << 8)
            | u32::from(data[index + 2]);
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(TABLE[((n >> 6) & 63) as usize] as char);
        out.push(TABLE[(n & 63) as usize] as char);
        index += 3;
    }
    match data.len() - index {
        1 => {
            let n = u32::from(data[index]) << 16;
            out.push(TABLE[((n >> 18) & 63) as usize] as char);
            out.push(TABLE[((n >> 12) & 63) as usize] as char);
            out.push('=');
            out.push('=');
        }
        2 => {
            let n = (u32::from(data[index]) << 16) | (u32::from(data[index + 1]) << 8);
            out.push(TABLE[((n >> 18) & 63) as usize] as char);
            out.push(TABLE[((n >> 12) & 63) as usize] as char);
            out.push(TABLE[((n >> 6) & 63) as usize] as char);
            out.push('=');
        }
        _ => {}
    }
    out
}

fn load_catalog(root: &Path) -> Result<CaptionCatalog, String> {
    let catalog_path = root.join(layout::CATALOG_FILE);
    let raw = fs::read_to_string(&catalog_path)
        .map_err(|error| format!("failed to read {}: {error}", catalog_path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", catalog_path.display()))
}

#[cfg(test)]
mod tests {
    use super::encode_base64;

    #[test]
    fn encode_base64_matches_common_vectors() {
        assert_eq!(encode_base64(b""), "");
        assert_eq!(encode_base64(b"f"), "Zg==");
        assert_eq!(encode_base64(b"fo"), "Zm8=");
        assert_eq!(encode_base64(b"foo"), "Zm9v");
        assert_eq!(encode_base64(b"foobar"), "Zm9vYmFy");
    }
}
