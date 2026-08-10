//! メインウィンドウの設計サイズ（テキスト拡大前の基準値）。
//!
//! `tauri.conf.json` の `app.windows[0]` と必ず揃えること。
//! conf は表示スケール（DPI）向けの論理ピクセル、ここはそれに加えて
//! アクセシビリティのテキストサイズを掛ける前の基準になる。

/// メインウィンドウの設計上の幅・高さ・最小サイズ（論理 px、テキスト倍率 1.0 時）。
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DesignSize {
    pub width: f64,
    pub height: f64,
    pub min_width: f64,
    pub min_height: f64,
}

/// `tauri.conf.json` の main ウィンドウ設定と同期する基準サイズ。
pub const MAIN_WINDOW_DESIGN: DesignSize = DesignSize {
    width: 1020.0,
    height: 860.0,
    min_width: 920.0,
    min_height: 640.0,
};

/// メイン WebviewWindow の label（conf の `label` と一致させる）。
pub const MAIN_WINDOW_LABEL: &str = "main";

impl DesignSize {
    /// テキスト倍率を掛けた論理サイズを返す。
    pub fn scaled(self, text_scale: f64) -> Self {
        let factor = text_scale.max(1.0);
        Self {
            width: self.width * factor,
            height: self.height * factor,
            min_width: self.min_width * factor,
            min_height: self.min_height * factor,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scaled_keeps_identity_at_100_percent() {
        assert_eq!(MAIN_WINDOW_DESIGN.scaled(1.0), MAIN_WINDOW_DESIGN);
    }

    #[test]
    fn scaled_grows_with_text_factor() {
        let scaled = MAIN_WINDOW_DESIGN.scaled(1.59);
        assert!((scaled.width - 1020.0 * 1.59).abs() < 0.01);
        assert!((scaled.min_height - 640.0 * 1.59).abs() < 0.01);
    }

    #[test]
    fn scaled_does_not_shrink_below_design() {
        // 不正値でも 1.0 未満には落とさない（縮小はしない）。
        let scaled = MAIN_WINDOW_DESIGN.scaled(0.5);
        assert_eq!(scaled, MAIN_WINDOW_DESIGN);
    }
}
