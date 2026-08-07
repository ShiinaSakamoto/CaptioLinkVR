use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::overlay_renderer::settings::{PlaybackSettings, RenderSettings};
use crate::portable::paths;

// exe横に保存するアプリ設定。キー名はフロントエンドのAtomに合わせる。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub render_settings: RenderSettings,
    pub playback_settings: PlaybackSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            render_settings: RenderSettings::default(),
            playback_settings: PlaybackSettings::default(),
        }
    }
}

// ポータブル版の root に settings.json を置き、更新時に上書きされないようにする。
pub fn settings_path() -> Result<PathBuf, String> {
    paths::settings_path()
}

pub fn load_settings() -> Result<AppSettings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let raw = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", path.display()))
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path()?;
    let raw = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("failed to serialize settings: {error}"))?;
    fs::write(&path, raw).map_err(|error| format!("failed to write {}: {error}", path.display()))
}
