use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionPresetSummary {
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionCatalog {
    pub entries: Vec<CaptionPresetSummary>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionCredits {
    #[serde(default)]
    pub supervisor: Vec<String>,
    #[serde(default)]
    pub editor: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionUsage {
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub start_timing: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionRecommendedPlayback {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub countdown_seconds: Option<u32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionLinks {
    #[serde(default)]
    pub demo_video: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionPresetMeta {
    /// フォルダ名が正本。JSON に無くてもリクエストの preset_id で埋める。
    #[serde(default)]
    pub id: String,
    pub display_name: String,
    #[serde(default)]
    pub world_name: String,
    #[serde(default)]
    pub world_url: String,
    #[serde(default)]
    pub credits: CaptionCredits,
    #[serde(default)]
    pub usage: CaptionUsage,
    #[serde(default)]
    pub recommended_playback: Option<CaptionRecommendedPlayback>,
    /// 字幕が正しく動くことを確認した日（YYYY-MM-DD）。未設定可。
    #[serde(default)]
    pub verified_at: String,
    #[serde(default)]
    pub links: CaptionLinks,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptionPresetSubtitle {
    pub id: String,
    pub display_name: String,
    pub file_name: String,
    pub content: String,
}
