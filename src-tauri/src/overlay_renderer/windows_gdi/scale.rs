use super::super::settings::RenderSettings;

// 参照実装は 3840 幅を使用。2048 だと長い行が板の端で見切れ、FOV に余裕があっても止まる。
pub(super) const OPENVR_RAW_MAX_TEXTURE_SIZE: u32 = 4096;

pub(super) fn max_texture_dimension(value: u32) -> u32 {
    value.clamp(1, OPENVR_RAW_MAX_TEXTURE_SIZE)
}

pub(super) fn render_scale(settings: &RenderSettings) -> f32 {
    super::super::metrics::effective_render_scale(settings)
}

pub(super) fn effective_font_size(settings: &RenderSettings, scale: f32) -> u32 {
    let percent = settings.font_size_percent.clamp(10, 300) as f32 / 100.0;
    ((settings.font_size.max(1) as f32) * percent * scale)
        .round()
        .max(1.0) as u32
}

pub(super) fn calc_ruby_font_size(font_size: u32) -> u32 {
    ((font_size as f32) * 0.42).round().max(12.0) as u32
}

/// 本文行送り（ルビ帯を含まない）。
pub(super) fn calc_body_line_height(font_size: u32) -> u32 {
    ((font_size as f32) * 1.24).round() as u32
}

pub(super) fn scale_u32(value: u32, scale: f32) -> u32 {
    if value == 0 {
        return 0;
    }
    ((value as f32) * scale).round().max(1.0) as u32
}

pub(super) fn scale_i32(value: i32, scale: f32) -> i32 {
    ((value as f32) * scale).round() as i32
}

pub(super) fn clamp_i32(value: i32, min: i32, max: i32) -> i32 {
    if min > max {
        return value;
    }
    max.min(min.max(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_texture_dimension_clamps_to_openvr_limit() {
        assert_eq!(max_texture_dimension(0), 1);
        assert_eq!(max_texture_dimension(8192), OPENVR_RAW_MAX_TEXTURE_SIZE);
        assert_eq!(max_texture_dimension(2048), 2048);
    }

    #[test]
    fn effective_font_size_applies_percent_and_scale() {
        let settings = RenderSettings {
            font_size: 96,
            font_size_percent: 150,
            ..RenderSettings::default()
        };
        assert_eq!(effective_font_size(&settings, 1.0), 144);
        assert_eq!(effective_font_size(&settings, 0.5), 72);
    }

    #[test]
    fn effective_font_size_percent_is_clamped_between_10_and_300() {
        let low = RenderSettings {
            font_size: 96,
            font_size_percent: 1,
            ..RenderSettings::default()
        };
        let high = RenderSettings {
            font_size: 96,
            font_size_percent: 999,
            ..RenderSettings::default()
        };
        assert_eq!(effective_font_size(&low, 1.0), (96.0_f32 * 0.10).round() as u32);
        assert_eq!(effective_font_size(&high, 1.0), (96.0_f32 * 3.0).round() as u32);
    }

    #[test]
    fn calc_ruby_font_size_has_a_12px_floor() {
        assert_eq!(calc_ruby_font_size(0), 12);
        assert_eq!(calc_ruby_font_size(100), 42);
    }

    #[test]
    fn calc_body_line_height_matches_font_ratio() {
        assert_eq!(calc_body_line_height(100), 124);
    }

    #[test]
    fn scale_u32_preserves_zero_and_has_a_1px_floor_otherwise() {
        assert_eq!(scale_u32(0, 2.0), 0);
        assert_eq!(scale_u32(1, 0.01), 1);
        assert_eq!(scale_u32(10, 2.0), 20);
    }

    #[test]
    fn scale_i32_rounds_without_a_floor() {
        assert_eq!(scale_i32(-10, 2.0), -20);
        assert_eq!(scale_i32(0, 2.0), 0);
    }

    #[test]
    fn clamp_i32_clamps_within_range_and_passes_through_when_inverted() {
        assert_eq!(clamp_i32(5, 0, 10), 5);
        assert_eq!(clamp_i32(-5, 0, 10), 0);
        assert_eq!(clamp_i32(50, 0, 10), 10);
        // min > max は不正な呼び出しだが、パニックさせず素通りさせる。
        assert_eq!(clamp_i32(5, 10, 0), 5);
    }
}
