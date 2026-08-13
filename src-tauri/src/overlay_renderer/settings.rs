use serde::{Deserialize, Serialize};

// Rust側のRGBA生成に必要な見た目設定。JSのrenderSettingsと同じcamelCaseで受け取る。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct RenderSettings {
    pub show_desktop_preview: bool,
    pub auto_texture_size: bool,
    pub width: u32,
    pub height: u32,
    pub max_texture_width: u32,
    pub max_texture_height: u32,
    pub render_scale: f32,
    pub overlay_max_fps: u32,
    pub overlay_prepare_ms: u32,
    pub overlay_width_meters: f32,
    pub font_size: u32,
    pub font_size_percent: u32,
    /// 最大テクスチャ本文幅に対する折り返し幅（%）。低いほど早く折り返し、オーバーレイ横幅の膨張を抑える。
    pub wrap_width_percent: u32,
    pub ruby_enabled: bool,
    pub ruby_distance: u32,
    pub vrchat_chatbox_enabled: bool,
    pub vrchat_chatbox_host: String,
    pub vrchat_chatbox_port: u16,
    pub text_color: String,
    pub text_opacity_percent: u32,
    pub background_enabled: bool,
    pub background_color: String,
    pub background_opacity_percent: u32,
    pub background_padding: u32,
    pub outline_enabled: bool,
    pub outline_color: String,
    pub outline_width: u32,
    pub shadow_enabled: bool,
    pub shadow_color: String,
    pub shadow_blur: u32,
    pub position_x: f32,
    pub position_y: f32,
    pub position_z: f32,
    pub rotation_x: f32,
    pub rotation_y: f32,
    pub rotation_z: f32,
    pub text_offset_x: i32,
    pub text_offset_y: i32,
    pub theme: String,
}

impl Default for RenderSettings {
    fn default() -> Self {
        Self {
            show_desktop_preview: true,
            auto_texture_size: true,
            width: 1024,
            height: 256,
            max_texture_width: 4096,
            max_texture_height: 4096,
            render_scale: 1.0,
            overlay_max_fps: 30,
            overlay_prepare_ms: 900,
            overlay_width_meters: 1.45,
            font_size: 53,
            font_size_percent: 100,
            wrap_width_percent: 80,
            ruby_enabled: true,
            ruby_distance: 6,
            vrchat_chatbox_enabled: false,
            vrchat_chatbox_host: "127.0.0.1".to_string(),
            vrchat_chatbox_port: 9000,
            text_color: "#ffffff".to_string(),
            text_opacity_percent: 100,
            background_enabled: true,
            background_color: "#000000".to_string(),
            background_opacity_percent: 90,
            background_padding: 22,
            outline_enabled: false,
            outline_color: "#000000".to_string(),
            outline_width: 8,
            shadow_enabled: false,
            shadow_color: "#000000".to_string(),
            shadow_blur: 0,
            position_x: 0.0,
            position_y: -0.3,
            position_z: -1.2,
            rotation_x: -8.0,
            rotation_y: 0.0,
            rotation_z: 0.0,
            text_offset_x: 0,
            text_offset_y: 0,
            theme: "live".to_string(),
        }
    }
}

// フロントエンドから送られる再生設定。settings.jsonにまとめて保存する。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PlaybackSettings {
    pub mode: String,
    pub countdown_seconds: u32,
    pub target_time: String,
}

impl Default for PlaybackSettings {
    fn default() -> Self {
        Self {
            mode: "countdown".to_string(),
            countdown_seconds: 10,
            target_time: "23:00".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // JS側の既定値（defaultRenderSettings.js）と対になっている。片方だけ変えない。
    #[test]
    fn render_settings_default_matches_js_store_defaults() {
        let settings = RenderSettings::default();
        assert_eq!(settings.width, 1024);
        assert_eq!(settings.height, 256);
        assert_eq!(settings.max_texture_width, 4096);
        assert_eq!(settings.max_texture_height, 4096);
        assert_eq!(settings.font_size, 53);
        assert_eq!(settings.font_size_percent, 100);
        assert_eq!(settings.wrap_width_percent, 80);
        assert_eq!(settings.text_opacity_percent, 100);
        assert_eq!(settings.background_opacity_percent, 90);
        assert_eq!(settings.ruby_distance, 6);
        assert_eq!(settings.outline_enabled, false);
        assert_eq!(settings.shadow_enabled, false);
        assert_eq!(settings.shadow_blur, 0);
        assert_eq!(settings.background_enabled, true);
        assert_eq!(settings.position_y, -0.3);
        assert_eq!(settings.rotation_x, -8.0);
    }

    #[test]
    fn render_settings_serializes_with_camel_case_keys() {
        let json = serde_json::to_value(RenderSettings::default()).unwrap();
        assert!(json.get("textOpacityPercent").is_some());
        assert!(json.get("backgroundOpacityPercent").is_some());
        assert!(json.get("fontSizePercent").is_some());
        assert!(json.get("wrapWidthPercent").is_some());
        assert!(json.get("text_opacity_percent").is_none());
    }

    #[test]
    fn render_settings_roundtrips_through_json() {
        let mut original = RenderSettings::default();
        original.text_opacity_percent = 42;
        original.text_color = "#123456".to_string();

        let json = serde_json::to_string(&original).unwrap();
        let restored: RenderSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.text_opacity_percent, 42);
        assert_eq!(restored.text_color, "#123456");
    }

    #[test]
    fn render_settings_missing_fields_fall_back_to_defaults() {
        // #[serde(default)] により、旧バージョンの保存ファイル（新フィールド欠落）でも読み込める。
        let restored: RenderSettings = serde_json::from_str("{}").unwrap();
        assert_eq!(restored.text_opacity_percent, RenderSettings::default().text_opacity_percent);
        assert_eq!(restored.wrap_width_percent, RenderSettings::default().wrap_width_percent);
    }

    #[test]
    fn playback_settings_default_matches_js_store_defaults() {
        let settings = PlaybackSettings::default();
        assert_eq!(settings.mode, "countdown");
        assert_eq!(settings.countdown_seconds, 10);
        assert_eq!(settings.target_time, "23:00");
    }
}
